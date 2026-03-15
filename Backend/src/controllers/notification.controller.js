const httpStatus = require("http-status");
const pick = require("../utils/pick");
const ApiError = require("../utils/ApiError");
const catchAsync = require("../utils/catchAsync");
const response = require("../config/response");
const { notificationService } = require("../services");

const getNotifications = catchAsync(async (req, res) => {
  const filter = pick(req.query, ["status", "type"]);
  filter.userId = req.user.id;
  
  const options = pick(req.query, ["sortBy", "limit", "page"]);
  
  // Set default sort to newest first
  if (!options.sortBy) {
    options.sortBy = "createdAt:desc";
  }

  const result = await notificationService.queryNotifications(filter, options);
  res.status(httpStatus.OK).json(
    response({
      message: "Notifications fetched successfully",
      status: "OK",
      statusCode: httpStatus.OK,
      data: result,
    })
  );
});

const markAsRead = catchAsync(async (req, res) => {
  await notificationService.markAsRead(req.params.notificationId);
  res.status(httpStatus.OK).json(
    response({
      message: "Notification marked as read",
      status: "OK",
      statusCode: httpStatus.OK,
      data: {},
    })
  );
});

const markAllAsRead = catchAsync(async (req, res) => {
  await notificationService.markAllAsRead(req.user.id);
  res.status(httpStatus.OK).json(
    response({
      message: "All notifications marked as read",
      status: "OK",
      statusCode: httpStatus.OK,
      data: {},
    })
  );
});

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
};
