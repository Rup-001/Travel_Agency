const httpStatus = require("http-status");
const pick = require("../utils/pick");
const ApiError = require("../utils/ApiError");
const catchAsync = require("../utils/catchAsync");
const response = require("../config/response");
const { destinationService } = require("../services");

const createDestination = catchAsync(async (req, res) => {
  const destination = await destinationService.createDestination(req.body);
  res.status(httpStatus.CREATED).json(
    response({
      message: "Destination Created",
      status: "OK",
      statusCode: httpStatus.CREATED,
      data: destination,
    })
  );
});

const getDestinations = catchAsync(async (req, res) => {
  const filter = pick(req.query, ["name", "type", "status"]);
  const options = pick(req.query, ["sortBy", "limit", "page"]);
  const result = await destinationService.queryDestinations(filter, options);
  res.status(httpStatus.OK).json(
    response({
      message: "All Destinations",
      status: "OK",
      statusCode: httpStatus.OK,
      data: result,
    })
  );
});

const getDestination = catchAsync(async (req, res) => {
  const destination = await destinationService.getDestinationById(req.params.destinationId);
  if (!destination) {
    throw new ApiError(httpStatus.NOT_FOUND, "Destination not found");
  }
  res.status(httpStatus.OK).json(
    response({
      message: "Destination Details",
      status: "OK",
      statusCode: httpStatus.OK,
      data: destination,
    })
  );
});

const updateDestination = catchAsync(async (req, res) => {
  const destination = await destinationService.updateDestinationById(req.params.destinationId, req.body);
  res.status(httpStatus.OK).json(
    response({
      message: "Destination Updated",
      status: "OK",
      statusCode: httpStatus.OK,
      data: destination,
    })
  );
});

const deleteDestination = catchAsync(async (req, res) => {
  await destinationService.deleteDestinationById(req.params.destinationId);
  res.status(httpStatus.OK).json(
    response({
      message: "Destination Deleted",
      status: "OK",
      statusCode: httpStatus.OK,
      data: {},
    })
  );
});

module.exports = {
  createDestination,
  getDestinations,
  getDestination,
  updateDestination,
  deleteDestination,
};
