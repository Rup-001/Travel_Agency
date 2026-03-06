const httpStatus = require("http-status");
const catchAsync = require("../utils/catchAsync");
const response = require("../config/response");
const { dashboardService } = require("../services");

const getDashboardSummary = catchAsync(async (req, res) => {
  const { kpiFilter, revenueFilter, bookingsFilter, salesTypeFilter, performanceFilter } = req.query;
  
  const data = await dashboardService.getDashboardData({
    kpiFilter,
    revenueFilter,
    bookingsFilter,
    salesTypeFilter,
    performanceFilter,
  });
  
  res.status(httpStatus.OK).json(
    response({
      message: "Dashboard summary data fetched successfully",
      status: "OK",
      statusCode: httpStatus.OK,
      data: data,
    })
  );
});

module.exports = {
  getDashboardSummary,
};
