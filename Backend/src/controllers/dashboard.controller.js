const httpStatus = require("http-status");
const catchAsync = require("../utils/catchAsync");
const response = require("../config/response");
const { dashboardService } = require("../services");

const getDashboardSummary = catchAsync(async (req, res) => {
  const { 
    kpiFilter, 
    recentbooking, 
    lowticketralert,
    topperformingdestination, 
    underperformingdestination,
    customerdemograph
  } = req.query;
  
  const data = await dashboardService.getDashboardData({
    kpiFilter,
    recentbooking,
    lowticketralert,
    topperformingdestination,
    underperformingdestination,
    customerdemograph,
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

const getRevenueTrend = catchAsync(async (req, res) => {
  const data = await dashboardService.getRevenueTrend(req.query.filter);
  res.status(httpStatus.OK).json(
    response({
      message: "Revenue trend data fetched successfully",
      status: "OK",
      statusCode: httpStatus.OK,
      data: data,
    })
  );
});

const getBookingTrend = catchAsync(async (req, res) => {
  const data = await dashboardService.getBookingTrend(req.query.filter);
  res.status(httpStatus.OK).json(
    response({
      message: "Booking trend data fetched successfully",
      status: "OK",
      statusCode: httpStatus.OK,
      data: data,
    })
  );
});

const getSalesByType = catchAsync(async (req, res) => {
  const data = await dashboardService.getSalesByType(req.query.filter);
  res.status(httpStatus.OK).json(
    response({
      message: "Sales by type data fetched successfully",
      status: "OK",
      statusCode: httpStatus.OK,
      data: data,
    })
  );
});

module.exports = {
  getDashboardSummary,
  getRevenueTrend,
  getBookingTrend,
  getSalesByType,
};
