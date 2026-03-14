const moment = require("moment");
const { Booking, Destination, TicketInventory, User } = require("../models");

/**
 * Helper to get date range based on filter
 */
const getDateRange = (filter) => {
  let endDate = moment().endOf("day").toDate();
  let startDate;

  if (filter === "thisMonth") {
    startDate = moment().startOf("month").toDate();
    endDate = moment().endOf("month").toDate(); // Full month range
  } else if (filter === "monthly") {
    startDate = moment().startOf("year").toDate();
    endDate = moment().endOf("year").toDate();
  } else if (filter === "year") {
    startDate = moment().subtract(4, "years").startOf("year").toDate(); // Last 5 years
    endDate = moment().endOf("year").toDate();
  } else if (filter === "last30") {
    startDate = moment().subtract(29, "days").startOf("day").toDate();
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
 * Helper to get comparison data for growth (Current Month vs Last Month)
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
 * Helper to get growth for multiple destinations at once
 */
const getDestinationsGrowth = async (destinationIds) => {
  const currentStart = moment().startOf("month").toDate();
  const currentEnd = moment().endOf("day").toDate();
  const lastStart = moment().subtract(1, "month").startOf("month").toDate();
  const lastEnd = moment().subtract(1, "month").endOf("month").toDate();

  const [currentData, lastData] = await Promise.all([
    Booking.aggregate([
      { $match: { destination: { $in: destinationIds }, status: "paid", createdAt: { $gte: currentStart, $lte: currentEnd } } },
      { $group: { _id: "$destination", count: { $sum: 1 } } }
    ]),
    Booking.aggregate([
      { $match: { destination: { $in: destinationIds }, status: "paid", createdAt: { $gte: lastStart, $lte: lastEnd } } },
      { $group: { _id: "$destination", count: { $sum: 1 } } }
    ])
  ]);

  const growthMap = {};
  destinationIds.forEach(id => {
    const cur = currentData.find(d => d._id.toString() === id.toString())?.count || 0;
    const prev = lastData.find(d => d._id.toString() === id.toString())?.count || 0;
    growthMap[id.toString()] = calculateGrowth(cur, prev);
  });
  return growthMap;
};

/**
 * Get Trend Data with zero filling
 */
const getTrendData = async (filter, type) => {
  const { startDate, endDate } = getDateRange(filter);
  let groupFormat = "%Y-%m-%d";
  let mode = "daily";

  if (filter === "monthly") {
    groupFormat = "%Y-%m";
    mode = "monthly";
  } else if (filter === "year") {
    groupFormat = "%Y";
    mode = "yearly";
  }

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

  const dataMap = {};
  results.forEach(item => { dataMap[item._id] = item.value; });

  const chartData = [];
  let current = moment(startDate);
  const end = moment(endDate);

  if (mode === "daily") {
    while (current.isSameOrBefore(end, "day")) {
      const key = current.format("YYYY-MM-DD");
      chartData.push({
        label: current.format("DD MMM"),
        value: dataMap[key] || 0
      });
      current.add(1, "day");
    }
  } else if (mode === "monthly") {
    // Current year only, Jan to Dec
    const startOfYear = moment().startOf("year");
    for (let i = 0; i < 12; i++) {
      const month = startOfYear.clone().add(i, "months");
      const key = month.format("YYYY-MM");
      chartData.push({
        label: month.format("MMM"),
        value: dataMap[key] || 0
      });
    }
  } else if (mode === "yearly") {
    // Last 5 years
    for (let i = 0; i < 5; i++) {
      const year = moment(startDate).add(i, "years");
      const key = year.format("YYYY");
      chartData.push({
        label: key,
        value: dataMap[key] || 0
      });
    }
  }

  const comparison = await getMonthlyComparison(Booking, { status: "paid" }, type === "revenue" ? "totalAmount" : null);

  return {
    data: chartData,
    growth: comparison.growth
  };
};

/**
 * Get Revenue Trend
 */
const getRevenueTrend = async (filter) => {
  return getTrendData(filter, "revenue");
};

/**
 * Get Booking Trend
 */
const getBookingTrend = async (filter) => {
  return getTrendData(filter, "bookings");
};

/**
 * Get Sales by Type (Single vs Combo)
 */
const getSalesByType = async (filter) => {
  const range = getDateRange(filter || "all");
  const salesByType = await Booking.aggregate([
    { $match: { status: "paid", createdAt: { $gte: range.startDate, $lte: range.endDate } } },
    { $lookup: { from: "destinations", localField: "destination", foreignField: "_id", as: "dest" } },
    { $unwind: "$dest" },
    { $group: { _id: "$dest.type", count: { $sum: 1 } } }
  ]);
  
  const comparison = await getMonthlyComparison(Booking, { status: "paid" });
  const typeOrder = ["single", "combo"];

  const salesMap = salesByType.reduce((map, item) => {
    if (item?._id) {
      map[item._id] = item.count || 0;
    }
    return map;
  }, {});

  const normalizedData = [
    ...typeOrder.map((type) => ({ type, count: salesMap[type] || 0 })),
    ...salesByType
      .filter((item) => !typeOrder.includes(item?._id))
      .map((item) => ({ type: item._id || "unknown", count: item.count || 0 })),
  ];

  const totalSales = normalizedData.reduce((sum, item) => sum + (item.count || 0), 0);

  return {
    data: normalizedData,
    totalSales,
    growth: comparison.growth
  };
};

/**
 * Get Admin Dashboard Summary Data (KPIs, Recent, Alerts, Performance, Demographics)
 */
const getDashboardData = async (filters = {}) => {
  const { 
    kpiFilter,
    recentbooking, 
    lowticketralert,
    topperformingdestination, 
    underperformingdestination,
    customerdemograph
  } = filters;

  const anyFilter = Object.values(filters).some(f => f !== undefined);
  const data = {};

  // 1. KPIs
  if (!anyFilter || kpiFilter) {
    const [revComp, bookComp] = await Promise.all([
      getMonthlyComparison(Booking, { status: "paid" }, "totalAmount"),
      getMonthlyComparison(Booking, { status: "paid" }),
    ]);

    const activeDest = await Destination.countDocuments({ status: "active" });
    const availSlots = await TicketInventory.countDocuments({ status: "available" });

    data.kpis = {
      totalRevenue: { value: revComp.value, growth: revComp.growth },
      totalBookings: { value: bookComp.value, growth: bookComp.growth },
      activeDestinations: { value: activeDest },
      availableSlots: { value: availSlots },
    };
  }

  // 5. Recent Bookings (Specific projection)
  if (!anyFilter || (recentbooking && recentbooking !== "false")) {
    const recent = await Booking.find()
      .populate("user", "fullName")
      .populate("destination", "name")
      .sort({ createdAt: -1 })
      .limit(5);

    data.recentBookings = recent.map(b => ({
      customerName: b.user?.fullName || b.fullName,
      destinationName: b.destination?.name || "N/A",
      bookingId: b.bookingId,
      visitDate: b.visitDate,
      totalAmount: b.totalAmount,
    }));
  }

  // 6. Low Ticket Alerts
  if (!anyFilter || (lowticketralert && lowticketralert !== "false")) {
    data.lowTicketAlerts = await TicketInventory.aggregate([
      { $group: { _id: "$destinationId", total: { $sum: 1 }, available: { $sum: { $cond: [{ $eq: ["$status", "available"] }, 1, 0] } } } },
      { $lookup: { from: "destinations", localField: "_id", foreignField: "_id", as: "dest" } },
      { $unwind: "$dest" },
      { 
        $addFields: {
          percentage: { $round: [{ $multiply: [{ $divide: ["$available", "$total"] }, 100] }, 1] }
        }
      },
      { 
        $project: { 
          _id: 0,
          destinationName: "$dest.name", 
          remaining: { $concat: [{ $toString: "$available" }, "/", { $toString: "$total" }] },
          percentage: 1,
          stockStatus: {
            $switch: {
              branches: [
                { case: { $lte: ["$percentage", 10] }, then: "Critical" },
                { case: { $lte: ["$percentage", 20] }, then: "Low Stock" }
              ],
              default: "Available"
            }
          }
        } 
      },
      { $match: { percentage: { $lte: 20 } } },
      { $sort: { percentage: 1 } }
    ]);
  }

  // 7. Top Performing Destination
  if (!anyFilter || (topperformingdestination && topperformingdestination !== "false")) {
    const filter = topperformingdestination === "true" || topperformingdestination === "all" || !topperformingdestination ? "all" : topperformingdestination;
    const range = getDateRange(filter);
    const performance = await Booking.aggregate([
      { $match: { status: "paid", createdAt: { $gte: range.startDate, $lte: range.endDate } } },
      { $group: { _id: "$destination", totalBookings: { $sum: 1 }, totalRevenue: { $sum: "$totalAmount" } } },
      { $lookup: { from: "destinations", localField: "_id", foreignField: "_id", as: "dest" } },
      { $unwind: "$dest" },
      { $project: { _id: 1, destinationName: "$dest.name", totalBookings: 1, totalRevenue: 1 } },
      { $sort: { totalBookings: -1 } },
      { $limit: 5 }
    ]);

    const destinationIds = performance.map(p => p._id);
    const growthMap = await getDestinationsGrowth(destinationIds);

    data.topPerformingDestinations = performance.map(p => ({
      destinationName: p.destinationName,
      totalBookings: p.totalBookings,
      totalRevenue: p.totalRevenue,
      growth: growthMap[p._id.toString()] || 0
    }));
  }

  // 8. Underperforming Destination
  if (!anyFilter || (underperformingdestination && underperformingdestination !== "false")) {
    const filter = underperformingdestination === "true" || underperformingdestination === "all" || !underperformingdestination ? "all" : underperformingdestination;
    const range = getDateRange(filter);
    const performance = await Booking.aggregate([
      { $match: { status: "paid", createdAt: { $gte: range.startDate, $lte: range.endDate } } },
      { $group: { _id: "$destination", totalBookings: { $sum: 1 }, totalRevenue: { $sum: "$totalAmount" } } },
      { $lookup: { from: "destinations", localField: "_id", foreignField: "_id", as: "dest" } },
      { $unwind: "$dest" },
      { $project: { _id: 0, destinationName: "$dest.name", totalBookings: 1, totalRevenue: 1 } },
      { $sort: { totalBookings: 1 } },
      { $limit: 5 }
    ]);

    data.underPerformingDestinations = performance;
  }

  // 9. Customer Demographics (Top 4 + Other)
  if (!anyFilter || (customerdemograph && customerdemograph !== "false")) {
    const total = await Booking.countDocuments({ status: "paid" });
    const demographics = await Booking.aggregate([
      { $match: { status: "paid" } },
      { $group: { _id: "$countryCode", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    const top4 = demographics.slice(0, 4);
    const others = demographics.slice(4);
    const othersCount = others.reduce((sum, d) => sum + d.count, 0);

    const result = top4.map(d => ({
      countryName: d._id || "Unknown",
      percentage: parseFloat(((d.count / (total || 1)) * 100).toFixed(1))
    }));

    if (othersCount > 0) {
      result.push({
        countryName: "Other",
        percentage: parseFloat(((othersCount / (total || 1)) * 100).toFixed(1))
      });
    }

    data.customerDemographics = result;
  }

  return data;
};

module.exports = {
  getDashboardData,
  getRevenueTrend,
  getBookingTrend,
  getSalesByType,
};
