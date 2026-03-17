const httpStatus = require("http-status");
const pick = require("../utils/pick");
const ApiError = require("../utils/ApiError");
const catchAsync = require("../utils/catchAsync");
const response = require("../config/response");
const { bookingService, stripeService } = require("../services");

const stripEmptyStrings = (obj = {}) => {
  Object.keys(obj).forEach((key) => {
    if (obj[key] === "") {
      delete obj[key];
    }
  });
  return obj;
};

const formatBookingSummary = (booking) => {
  const totalTickets = (booking.adults || 0) + (booking.children || 0);
  return {
    bookingId: booking.bookingId,
    customerName: (booking.user && booking.user.fullName) || booking.fullName,
    customerEmail: (booking.user && booking.user.email) || booking.email,
    customerPhone: booking.phone ? `${booking.dialCode || ""} ${booking.phone}`.trim() : "",
    destinationName: (booking.destination && booking.destination.name) || "N/A",
    bookingDate: booking.createdAt,
    totalTickets,
    totalAmount: booking.totalAmount,
  };
};

const formatTransactionSummary = (booking) => ({
  transactionId: booking.paymentIntentId || booking.stripeSessionId || "N/A",
  bookingId: booking.bookingId,
  customerName: (booking.user && booking.user.fullName) || booking.fullName,
  package: (booking.destination && booking.destination.name) || "N/A",
  paymentMethod: booking.paymentMethod || "card",
  totalAmount: booking.totalAmount,
  date: booking.createdAt,
});

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
      message: "Booking created. Please complete payment within 30 minutes to secure your tickets.",
      status: "OK",
      statusCode: httpStatus.CREATED,
      data: result,
    })
  );
});

const getBookings = catchAsync(async (req, res) => {
  const filter = stripEmptyStrings(pick(req.query, ["status", "destination", "user"]));
  const options = stripEmptyStrings(pick(req.query, ["sortBy", "limit", "page"]));
  const extraFilters = stripEmptyStrings(pick(req.query, ["search", "startDate", "endDate"]));
  const result = await bookingService.queryBookings(filter, options, extraFilters);
  const simplifiedResults = result.results.map(formatBookingSummary);
  res.status(httpStatus.OK).json(
    response({
      message: "All Bookings",
      status: "OK",
      statusCode: httpStatus.OK,
      data: { ...result, results: simplifiedResults },
    })
  );
});

const getTransactions = catchAsync(async (req, res) => {
  const filter = stripEmptyStrings(pick(req.query, ["destination", "user"]));
  filter.status = "paid"; // Sudhu payment hoyeche emon booking gulo ekhon transaction
  const options = stripEmptyStrings(pick(req.query, ["sortBy", "limit", "page"]));
  const extraFilters = stripEmptyStrings(pick(req.query, ["search", "startDate", "endDate"]));
  
  const result = await bookingService.queryBookings(filter, options, extraFilters);
  const simplifiedResults = result.results.map(formatTransactionSummary);
  
  res.status(httpStatus.OK).json(
    response({
      message: "Transaction Hub Data",
      status: "OK",
      statusCode: httpStatus.OK,
      data: { ...result, results: simplifiedResults },
    })
  );
});

const exportTransactions = catchAsync(async (req, res) => {
  const buffer = await bookingService.exportTransactionsToExcel();
  
  res.setHeader("Content-Disposition", "attachment; filename=transactions.xlsx");
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.status(httpStatus.OK).send(buffer);
});

const getMyBookings = catchAsync(async (req, res) => {
  const filter = stripEmptyStrings(pick(req.query, ["status", "destination"]));
  filter.user = req.user.id; // Force user ID to be current logged in user
  const options = stripEmptyStrings(pick(req.query, ["sortBy", "limit", "page"]));
  const result = await bookingService.queryBookings(filter, options);
  res.status(httpStatus.OK).json(
    response({
      message: "My Bookings",
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
    console.log("Stripe Webhook: Payment completed for session:", session.id);
    
    // Step 6: Booking ID-ta niye database-e status "paid" kore dilam
    // Sathe session-ta-o pathalam jate Transaction ID ar Payment Method save kora jay
    await bookingService.completeBookingPayment(session.client_reference_id, session);
    console.log("Stripe Webhook: completeBookingPayment called for:", session.client_reference_id);
  }

  console.log(event);


  // Stripe-ke bollam je "Amra message-ta peyechi, dhonyobad!"
  res.status(httpStatus.OK).send({ received: true });
});

const downloadTickets = catchAsync(async (req, res) => {
  const booking = await bookingService.getBookingById(req.params.bookingId);
  if (!booking) {
    throw new ApiError(httpStatus.NOT_FOUND, "Booking not found");
  }

  if (!req.user) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Please authenticate");
  }

  // Extract User IDs for comparison
  const currentUserId = (req.user.id || req.user._id || "").toString();
  const currentUserRole = req.user.role;
  
  const bookingUserId = booking.user && booking.user._id 
    ? booking.user._id.toString() 
    : (booking.user ? booking.user.toString() : null);
  
  // Security: Only the user who made the booking or an admin can download the tickets
  if (bookingUserId !== currentUserId && currentUserRole !== 'admin') {
    throw new ApiError(httpStatus.FORBIDDEN, "You are not authorized to download these tickets");
  }

  const buffer = await bookingService.generateBookingTicketsPDF(req.params.bookingId);
  
  res.writeHead(httpStatus.OK, {
    "Content-Type": "application/pdf",
    "Content-Disposition": `attachment; filename=tickets-${req.params.bookingId}.pdf`,
    "Content-Length": buffer.length
  });
  res.end(buffer);
});

module.exports = {
  createBooking,
  getBookings,
  getTransactions,
  exportTransactions,
  getMyBookings,
  getBooking,
  updateBookingStatus,
  stripeWebhook,
  downloadTickets,
};
