const moment = require("moment");
const { Booking, Destination, TicketInventory, User } = require("../models");

/**
 * Helper to get date range based on filter
 */
const getDateRange = (filter) => {
  const endDate = moment().endOf("day").toDate();
  let startDate;

  if (filter === "thisMonth") {
    startDate = moment().startOf("month").toDate();
  } else if (filter === "year") {
    startDate = moment().startOf("year").toDate();
  } else if (filter === "last30") {
    startDate = moment().subtract(30, "days").startOf("day").toDate();
  } else {
    startDate = new Date(0); // All time
  }
  return { startDate, endDate };
};

/**
 * Helper to calculate growth percentage
 */
const calculateGrowth = (current, previous) => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return parseFloat((((current - previous) / previous) * 100).toFixed(2));
};

/**
 * Helper to get comparison data for growth
 */
const getMonthlyComparison = async (model, matchQuery = {}, sumField = null) => {
  const currentStart = moment().startOf("month").toDate();
  const currentEnd = moment().endOf("day").toDate();
  const lastStart = moment().subtract(1, "month").startOf("month").toDate();
  const lastEnd = moment().subtract(1, "month").endOf("month").toDate();

  const [currentData, lastData] = await Promise.all([
    sumField 
      ? model.aggregate([{ $match: { ...matchQuery, createdAt: { $gte: currentStart, $lte: currentEnd } } }, { $group: { _id: null, total: { $sum: `$${sumField}` } } }])
      : model.countDocuments({ ...matchQuery, createdAt: { $gte: currentStart, $lte: currentEnd } }),
    sumField 
      ? model.aggregate([{ $match: { ...matchQuery, createdAt: { $gte: lastStart, $lte: lastEnd } } }, { $group: { _id: null, total: { $sum: `$${sumField}` } } }])
      : model.countDocuments({ ...matchQuery, createdAt: { $gte: lastStart, $lte: lastEnd } }),
  ]);

  const currentVal = sumField ? (currentData[0]?.total || 0) : currentData;
  const lastVal = sumField ? (lastData[0]?.total || 0) : lastData;

  return {
    value: currentVal,
    growth: calculateGrowth(currentVal, lastVal)
  };
};

/**
 * Get Trend Data
 */
const getTrendData = async (filter, type) => {
  const { startDate, endDate } = getDateRange(filter);
  const groupFormat = filter === "year" ? "%Y-%m" : "%Y-%m-%d";

  const results = await Booking.aggregate([
    { $match: { status: "paid", createdAt: { $gte: startDate, $lte: endDate } } },
    {
      $group: {
        _id: { $dateToString: { format: groupFormat, date: "$createdAt" } },
        value: type === "revenue" ? { $sum: "$totalAmount" } : { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const labels = results.map(item => filter === "year" ? moment(item._id, "YYYY-MM").format("MMM") : moment(item._id, "YYYY-MM-DD").format("DD MMM"));
  const values = results.map(item => item.value);

  // Growth for trend (compare current month vs last month sum)
  const comparison = await getMonthlyComparison(Booking, { status: "paid" }, type === "revenue" ? "totalAmount" : null);

  return {
    data: { labels, values },
    growth: comparison.growth
  };
};

/**
 * Get Admin Dashboard Summary Data
 */
const getDashboardData = async (filters = {}) => {
  const { 
    kpiFilter,
    revenueFilter, 
    bookingsFilter, 
    salesTypeFilter,
    performanceFilter,
    recentBookingFilter,
    lowTicketFilter,
    demographicFilter
  } = filters;

  // Check if any filter is active. If none, show all.
  const showAll = !Object.values(filters).some(f => f !== undefined);

  const data = {};

  // 1. KPIs
  if (showAll || kpiFilter) {
    const [revComp, bookComp, custComp] = await Promise.all([
      getMonthlyComparison(Booking, { status: "paid" }, "totalAmount"),
      getMonthlyComparison(Booking, { status: "paid" }),
      getMonthlyComparison(User, { isDeleted: false }),
    ]);

    const activeDest = await Destination.countDocuments({ status: "active" });
    const availSlots = await TicketInventory.countDocuments({ status: "available" });

    data.kpis = {
      totalRevenue: { value: revComp.value, growth: revComp.growth },
      totalBookings: { value: bookComp.value, growth: bookComp.growth },
      totalCustomers: { value: custComp.value, growth: custComp.growth },
      activeDestinations: { value: activeDest },
      availableSlots: { value: availSlots },
    };
  }

  // 2. Revenue Trend
  if (showAll || revenueFilter) {
    data.revenueTrend = await getTrendData(revenueFilter || "last30", "revenue");
  }

  // 3. Bookings Trend
  if (showAll || bookingsFilter) {
    data.bookingsTrend = await getTrendData(bookingsFilter || "last30", "bookings");
  }

  // 4. Sales Type (Single vs Combo)
  if (showAll || salesTypeFilter) {
    const stRange = getDateRange(salesTypeFilter || "all");
    const salesByType = await Booking.aggregate([
      { $match: { status: "paid", createdAt: { $gte: stRange.startDate, $lte: stRange.endDate } } },
      { $lookup: { from: "destinations", localField: "destination", foreignField: "_id", as: "dest" } },
      { $unwind: "$dest" },
      { $group: { _id: "$dest.type", count: { $sum: 1 } } }
    ]);
    
    // Simple growth calculation for the whole category
    const currentMonthData = await getMonthlyComparison(Booking, { status: "paid" });

    data.salesByType = {
      data: salesByType.map(s => ({ type: s._id, count: s.count })),
      growth: currentMonthData.growth
    };
  }

  // 5. Recent Bookings
  if (showAll || recentBookingFilter) {
    data.recentBookings = await Booking.find()
      .populate("user", "fullName email")
      .populate("destination", "name")
      .sort({ createdAt: -1 })
      .limit(5);
  }

  // 6. Low Ticket Alerts
  if (showAll || lowTicketFilter) {
    data.lowTicketAlerts = await TicketInventory.aggregate([
      { $group: { _id: "$destinationId", total: { $sum: 1 }, available: { $sum: { $cond: [{ $eq: ["$status", "available"] }, 1, 0] } } } },
      { $lookup: { from: "destinations", localField: "_id", foreignField: "_id", as: "dest" } },
      { $unwind: "$dest" },
      { $project: { name: "$dest.name", available: 1, total: 1, percent: { $multiply: [{ $divide: ["$available", "$total"] }, 100] } } },
      { $match: { percent: { $lte: 20 } } },
      { $sort: { percent: 1 } }
    ]);
  }

  // 7. Performance (Top & Underperforming)
  if (showAll || performanceFilter) {
    const perfRange = getDateRange(performanceFilter || "all");
    const performance = await Booking.aggregate([
      { $match: { status: "paid", createdAt: { $gte: perfRange.startDate, $lte: perfRange.endDate } } },
      { $group: { _id: "$destination", count: { $sum: 1 }, revenue: { $sum: "$totalAmount" } } },
      { $lookup: { from: "destinations", localField: "_id", foreignField: "_id", as: "dest" } },
      { $unwind: "$dest" },
      { $project: { name: "$dest.name", count: 1, revenue: 1 } },
      { $sort: { count: -1 } }
    ]);

    // Calculate growth for top performers (simplified: overall count growth)
    const overallGrowth = await getMonthlyComparison(Booking, { status: "paid" });

    data.performance = {
      top: performance.slice(0, 5).map(p => ({ ...p, growth: overallGrowth.growth })),
      under: performance.slice(-5).reverse()
    };
  }

  // 8. Customer Demographics
  if (showAll || demographicFilter) {
    const total = await Booking.countDocuments({ status: "paid" });
    data.customerDemographics = await Booking.aggregate([
      { $match: { status: "paid" } },
      { $group: { _id: "$countryCode", count: { $sum: 1 } } },
      { $project: { country: "$_id", count: 1, percentage: { $round: [{ $multiply: [{ $divide: ["$count", total || 1] }, 100] }, 1] } } },
      { $sort: { count: -1 } }
    ]);
  }

  return data;
};

module.exports = {
  getDashboardData,
};
