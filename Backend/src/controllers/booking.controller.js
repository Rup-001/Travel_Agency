const httpStatus = require("http-status");
const pick = require("../utils/pick");
const ApiError = require("../utils/ApiError");
const catchAsync = require("../utils/catchAsync");
const response = require("../config/response");
const { bookingService, stripeService } = require("../services");

const createBooking = catchAsync(async (req, res) => {
  const bookingData = { 
    ...req.body, 
    user: req.user.id // Auto-assign the logged-in user
  };
  const result = await bookingService.createBooking(bookingData);
  res.status(httpStatus.CREATED).json(
    response({
      message: "Booking created",
      status: "OK",
      statusCode: httpStatus.CREATED,
      data: result,
    })
  );
});

const getBookings = catchAsync(async (req, res) => {
  const filter = pick(req.query, ["status", "destination", "user"]);
  const options = pick(req.query, ["sortBy", "limit", "page"]);
  const result = await bookingService.queryBookings(filter, options);
  res.status(httpStatus.OK).json(
    response({
      message: "All Bookings",
      status: "OK",
      statusCode: httpStatus.OK,
      data: result,
    })
  );
});

const getBooking = catchAsync(async (req, res) => {
  const booking = await bookingService.getBookingById(req.params.bookingId);
  if (!booking) {
    throw new ApiError(httpStatus.NOT_FOUND, "Booking not found");
  }
  res.status(httpStatus.OK).json(
    response({
      message: "Booking Details",
      status: "OK",
      statusCode: httpStatus.OK,
      data: booking,
    })
  );
});

const updateBookingStatus = catchAsync(async (req, res) => {
  const booking = await bookingService.updateBookingStatus(req.params.bookingId, req.body.status);
  res.status(httpStatus.OK).json(
    response({
      message: "Booking Status Updated",
      status: "OK",
      statusCode: httpStatus.OK,
      data: booking,
    })
  );
});

const stripeWebhook = catchAsync(async (req, res) => {
  const signature = req.headers["stripe-signature"];
  let event;

  try {
    event = stripeService.constructEvent(req.rawBody, signature);
  } catch (err) {
    throw new ApiError(httpStatus.BAD_REQUEST, `Webhook Error: ${err.message}`);
  }

  // Handle the event
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    // We stored bookingId in client_reference_id during session creation
    await bookingService.completeBookingPayment(session.client_reference_id);
  }

  res.status(httpStatus.OK).send({ received: true });
});

module.exports = {
  createBooking,
  getBookings,
  getBooking,
  updateBookingStatus,
  stripeWebhook,
};
