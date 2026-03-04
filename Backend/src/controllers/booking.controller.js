const httpStatus = require("http-status");
const pick = require("../utils/pick");
const ApiError = require("../utils/ApiError");
const catchAsync = require("../utils/catchAsync");
const response = require("../config/response");
const { bookingService, stripeService } = require("../services");

const createBooking = catchAsync(async (req, res) => {
  // Step 1: Frontend theke request ashlo, amra user-er ID-ta set kore nilam
  const bookingData = { 
    ...req.body, 
    user: req.user.id // Logged-in user-er ID ta auto boshiye dilam
  };
  
  // Step 2: Ekhon bookingService-ke bollam booking-ta process korte
  const result = await bookingService.createBooking(bookingData);
  
  // Step 4: Shob thik thakle, frontend-ke success response pathiye dilam (sathe Stripe-er URL)
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
  // Step 5: Stripe theke message (Webhook) ashlo amader kache
  const signature = req.headers["stripe-signature"];
  let event;

  try {
    // Check korlam je message-ta asholei Stripe theke esheche kina
    event = stripeService.constructEvent(req.rawBody, signature);
  } catch (err) {
    throw new ApiError(httpStatus.BAD_REQUEST, `Webhook Error: ${err.message}`);
  }

  // Jodi payment successfull hoy (checkout.session.completed)
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    
    // Step 6: Booking ID-ta niye database-e status "paid" kore dilam
    // Sathe session-ta-o pathalam jate Transaction ID ar Payment Method save kora jay
    await bookingService.completeBookingPayment(session.client_reference_id, session);
  }

  console.log(event);


  // Stripe-ke bollam je "Amra message-ta peyechi, dhonyobad!"
  res.status(httpStatus.OK).send({ received: true });
});

module.exports = {
  createBooking,
  getBookings,
  getBooking,
  updateBookingStatus,
  stripeWebhook,
};
