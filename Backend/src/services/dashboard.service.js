const moment = require("moment");
const { Booking, Destination, TicketInventory } = require("../models");

/**
 * Helper to get date range based on filter
 * @param {string} filter 
 * @returns {Object} { startDate, endDate }
 */
const getDateRange = (filter) => {
  const endDate = moment().endOf("day").toDate();
  let startDate;

  if (filter === "year") {
    startDate = moment().startOf("year").toDate();
  } else if (filter === "thisMonth") {
    startDate = moment().startOf("month").toDate();
  } else if (filter === "last30") {
    startDate = moment().subtract(30, "days").startOf("day").toDate();
  } else {
    // "all" - start from Unix epoch or a reasonable project start date
    startDate = new Date(0);
  }
  return { startDate, endDate };
};

/**
 * Helper to get trend data based on filter and type
 */
const getTrendData = async (filter, type) => {
  const { startDate, endDate } = getDateRange(filter);
  const groupFormat = filter === "year" ? "%Y-%m" : "%Y-%m-%d";

  const results = await Booking.aggregate([
    {
      $match: {
        status: "paid",
        createdAt: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: { $dateToString: { format: groupFormat, date: "$createdAt" } },
        value: type === "revenue" ? { $sum: "$totalAmount" } : { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  return results.map((item) => ({
    label: filter === "year" 
      ? moment(item._id, "YYYY-MM").format("MMM") 
      : moment(item._id, "YYYY-MM-DD").format("DD MMM"),
    value: item.value,
  }));
};

/**
 * Get Admin Dashboard Summary Data
 */
const getDashboardData = async (filters = {}) => {
  const { 
    kpiFilter = "all",
    revenueFilter = "last30", 
    bookingsFilter = "last30", 
    salesTypeFilter = "all",
    performanceFilter = "all"
  } = filters;

  // 1. KPIs (Revenue, Bookings sum)
  const kpiRange = getDateRange(kpiFilter);
  const kpiStats = await Promise.all([
    Booking.aggregate([
      { $match: { status: "paid", createdAt: { $gte: kpiRange.startDate, $lte: kpiRange.endDate } } },
      { $group: { _id: null, totalRevenue: { $sum: "$totalAmount" }, totalBookings: { $sum: 1 } } },
    ]),
    Destination.countDocuments({ status: "active" }),
    TicketInventory.countDocuments({ status: "available" }),
  ]);

  const kpis = {
    totalRevenue: kpiStats[0][0]?.totalRevenue || 0,
    totalBookings: kpiStats[0][0]?.totalBookings || 0,
    activeDestinations: kpiStats[1],
    availableSlots: kpiStats[2],
  };

  // 2. Revenue & Bookings Trend (Charts)
  const [revenueTrend, bookingsTrend] = await Promise.all([
    getTrendData(revenueFilter, "revenue"),
    getTrendData(bookingsFilter, "bookings"),
  ]);

  // 3. Sales Type (Donut Chart)
  const stRange = getDateRange(salesTypeFilter);
  const salesByType = await Booking.aggregate([
    { $match: { status: "paid", createdAt: { $gte: stRange.startDate, $lte: stRange.endDate } } },
    {
      $lookup: {
        from: "destinations",
        localField: "destination",
        foreignField: "_id",
        as: "destinationData",
      },
    },
    { $unwind: "$destinationData" },
    { $group: { _id: "$destinationData.type", count: { $sum: 1 } } },
    { $project: { type: "$_id", count: 1, _id: 0 } }
  ]);

  // 4. Recent Bookings (Limit 5)
  const recentBookings = await Booking.find()
    .populate("user", "fullName email")
    .populate("destination", "name")
    .sort({ createdAt: -1 })
    .limit(5);

  // 5. Low Ticket Alerts
  const lowTicketAlerts = await TicketInventory.aggregate([
    {
      $group: {
        _id: "$destinationId",
        totalTickets: { $sum: 1 },
        availableTickets: { $sum: { $cond: [{ $eq: ["$status", "available"] }, 1, 0] } },
      },
    },
    {
      $lookup: {
        from: "destinations",
        localField: "_id",
        foreignField: "_id",
        as: "destinationData",
      },
    },
    { $unwind: "$destinationData" },
    { $addFields: { availablePercentage: { $multiply: [{ $divide: ["$availableTickets", "$totalTickets"] }, 100] } } },
    { $match: { availablePercentage: { $lte: 20 } } },
    {
      $project: {
        _id: 0,
        destinationName: "$destinationData.name",
        availableTickets: 1,
        totalTickets: 1,
        availablePercentage: { $round: ["$availablePercentage", 1] },
        status: { $cond: [{ $lte: ["$availablePercentage", 10] }, "Critical", "Low Stock"] },
      },
    },
  ]);

  // 6. Destination Performance
  const perfRange = getDateRange(performanceFilter);
  const destinationPerformance = await Booking.aggregate([
    { $match: { status: "paid", createdAt: { $gte: perfRange.startDate, $lte: perfRange.endDate } } },
    { $group: { _id: "$destination", bookingCount: { $sum: 1 }, revenue: { $sum: "$totalAmount" } } },
    { $lookup: { from: "destinations", localField: "_id", foreignField: "_id", as: "destinationData" } },
    { $unwind: "$destinationData" },
    { $project: { _id: 0, destinationName: "$destinationData.name", bookingCount: 1, revenue: 1 } },
    { $sort: { bookingCount: -1 } },
  ]);

  const topPerforming = destinationPerformance.slice(0, 5);
  const underPerforming = destinationPerformance.length > 5 
    ? destinationPerformance.slice(-5).reverse() 
    : (destinationPerformance.length > 0 ? [...destinationPerformance].reverse().slice(0, 5) : []);

  return {
    kpis,
    revenueTrend,
    bookingsTrend,
    salesByType,
    recentBookings,
    lowTicketAlerts,
    topPerforming,
    underPerforming,
  };
};

module.exports = {
  getDashboardData,
};
