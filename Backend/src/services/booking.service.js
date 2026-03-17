const httpStatus = require("http-status");
const { Booking, Destination, PromoCode, TicketInventory, User } = require("../models");
const notificationService = require("./notification.service");
const ApiError = require("../utils/ApiError");
const logger = require("../config/logger");
const stripeService = require("./stripe.service");
const config = require("../config/config");
const moment = require("moment");
const { parsePhoneNumber } = require("libphonenumber-js");

const { generateTicketsPDF } = require("../utils/pdfGenerator");

/**
 * Generate PDF tickets for a specific booking
 * @param {ObjectId} bookingId
 * @returns {Promise<Buffer>}
 */
const generateBookingTicketsPDF = async (bookingId) => {
  const booking = await Booking.findById(bookingId).populate({
    path: "destination",
    populate: { path: "subDestinations" }
  }).populate("tickets");
  if (!booking) {
    throw new ApiError(httpStatus.NOT_FOUND, "Booking not found");
  }

  if (booking.status !== "paid") {
    throw new ApiError(httpStatus.BAD_REQUEST, "Tickets are only available for paid bookings");
  }

  return generateTicketsPDF(booking);
};

/**
 * Generate a unique human-readable booking ID
 * Format: BK-YYYYMMDD-XXXX (4 random alphanumeric chars)
 * @returns {string}
 */
const generateBookingId = () => {
  const dateStr = moment().format("DDMMYY");
  const randomChars = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `BK-${dateStr}-${randomChars}`;
};

/**
 * Calculate total price and validate promo code
 * @param {ObjectId} destinationId
 * @param {number} adults
 * @param {number} children
 * @param {string} promoCodeStr
 * @returns {Promise<Object>}
 */
const calculateBookingTotal = async (destinationId, adults, children, promoCodeStr) => {
  // Step 2.1: Database theke destination-er info nilam
  const destination = await Destination.findById(destinationId);
  if (!destination) {
    throw new ApiError(httpStatus.NOT_FOUND, "Destination not found");
  }

  const adultPrice = destination.type === "combo" ? destination.comboAdultCurrentPrice : destination.adultCurrentPrice;
  const childPrice = destination.type === "combo" ? destination.comboChildCurrentPrice : destination.childCurrentPrice;

  // Dam hishab korchi: adults * rate + children * rate
  const subTotal = (adults * adultPrice) + (children * childPrice);
  let finalTotal = subTotal;
  let discountAmount = 0;
  let appliedPromo = null;

  // Jodi kono Promo Code thake, sheta check korbo
  if (promoCodeStr) {
    appliedPromo = await PromoCode.findOne({
      code: promoCodeStr.toUpperCase(),
      status: "active",
      validFrom: { $lte: new Date() },
      validUntil: { $gt: new Date() },
    });

    if (!appliedPromo) {
      throw new ApiError(httpStatus.BAD_REQUEST, "Invalid or expired promo code");
    }

    // Usage Limit Check
    if (appliedPromo.usageLimit !== null && appliedPromo.usedCount >= appliedPromo.usageLimit) {
      throw new ApiError(httpStatus.BAD_REQUEST, "Promo code usage limit reached");
    }

    // Destination Check
    if (!appliedPromo.isApplicableAll) {
      const isApplicable = appliedPromo.applicableDestinations.some(
        (destId) => destId.toString() === destinationId.toString()
      );
      if (!isApplicable) {
        throw new ApiError(httpStatus.BAD_REQUEST, "Promo code is not applicable for this destination");
      }
    }

    // Minimum amount thakle sheta check korlam
    if (subTotal < appliedPromo.minBookingAmount) {
      throw new ApiError(httpStatus.BAD_REQUEST, `Minimum amount for this promo is ${appliedPromo.minBookingAmount}`);
    }

    // Discount apply korlam
    if (appliedPromo.discountType === "percentage") {
      discountAmount = (subTotal * appliedPromo.discountAmount) / 100;
      if (appliedPromo.maxDiscountAmount && discountAmount > appliedPromo.maxDiscountAmount) {
        discountAmount = appliedPromo.maxDiscountAmount;
      }
    } else {
      discountAmount = appliedPromo.discountAmount;
    }

    finalTotal = subTotal - discountAmount;
  }

  return {
    subTotal,
    discountAmount,
    finalTotal,
    adultPriceAtBooking: adultPrice,
    childPriceAtBooking: childPrice,
    appliedPromo,
    destinationName: destination.name,
  };
};

/**
 * Create a booking with ticket reservation and Stripe
 * @param {Object} bookingBody
 * @returns {Promise<Object>} - returns booking and stripeUrl
 */
const createBooking = async (bookingBody) => {
  const totalPeople = bookingBody.adults + (bookingBody.children || 0);
  const expiryBuffer = 35; // minutes for local DB
  const stripeExpiryBuffer = 31; // minutes for Stripe (min is 30)

  // 1. Fetch destination details to check type
  const destination = await Destination.findById(bookingBody.destination);
  if (!destination) {
    throw new ApiError(httpStatus.NOT_FOUND, "Destination not found");
  }

  let ticketIds = [];

  if (destination.type === "combo") {
    // Combo Logic: Collect tickets from ALL sub-destinations
    if (!destination.subDestinations || destination.subDestinations.length === 0) {
      throw new ApiError(httpStatus.BAD_REQUEST, "Combo destination has no sub-destinations defined");
    }

    for (const subDestId of destination.subDestinations) {
      const availableTickets = await TicketInventory.find({
        destinationId: subDestId,
        status: "available",
        expiryDate: { $gt: moment().add(expiryBuffer, 'minutes').toDate() }
      }).limit(totalPeople);

      if (availableTickets.length < totalPeople) {
        const subDest = await Destination.findById(subDestId);
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          `Not enough tickets for sub-destination: ${subDest?.name || subDestId}. Required: ${totalPeople}, Available: ${availableTickets.length}`
        );
      }
      ticketIds = ticketIds.concat(availableTickets.map(t => t._id));
    }
  } else {
    // Single Logic: Collect tickets from the destination itself
    const availableTickets = await TicketInventory.find({
      destinationId: bookingBody.destination,
      status: "available",
      expiryDate: { $gt: moment().add(expiryBuffer, 'minutes').toDate() }
    }).limit(totalPeople);

    if (availableTickets.length < totalPeople) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        `Not enough tickets available. Required: ${totalPeople}, Current stock: ${availableTickets.length}`
      );
    }
    ticketIds = availableTickets.map((t) => t._id);
  }

  // 2. Final Pricing calculation
  const pricing = await calculateBookingTotal(
    bookingBody.destination,
    bookingBody.adults,
    bookingBody.children,
    bookingBody.promoCode
  );
  
  // Dynamic Country Code Extraction using libphonenumber-js
  let countryCode = "Unknown";
  try {
    const fullNumber = `${bookingBody.dialCode}${bookingBody.phone}`;
    const phoneNumber = parsePhoneNumber(fullNumber);
    if (phoneNumber) {
      countryCode = phoneNumber.country || "Unknown";
    }
  } catch (error) {
    // If parsing fails, we keep it as "Unknown" or handle as needed
    console.error("Phone parsing error:", error.message);
  }

  const finalBookingData = {
    ...bookingBody,
    bookingId: generateBookingId(), // Set unique human-readable ID
    countryCode, // Set detected country code for Map
    totalAmount: pricing.finalTotal,
    discountAmount: pricing.discountAmount,
    adultPriceAtBooking: pricing.adultPriceAtBooking,
    childPriceAtBooking: pricing.childPriceAtBooking,
    tickets: ticketIds,
    status: "pending",
    expiresAt: moment().add(expiryBuffer, 'minutes').toDate(),
  };

  const booking = await Booking.create(finalBookingData);
  await booking.populate("user destination tickets");

  // Step 3: Stripe-er kache "URL" chailam payment-er jonno
  const session = await stripeService.createCheckoutSession({
    amount: pricing.finalTotal,
    bookingId: booking._id,
    destinationName: pricing.destinationName,
    successUrl: config.stripe.successUrl, 
    cancelUrl: config.stripe.cancelUrl,
    expiresAt: Math.floor(Date.now() / 1000) + (stripeExpiryBuffer * 60),
  });

  // Save the Stripe Session ID in our database
  booking.stripeSessionId = session.id;
  await booking.save();

  // Ticket-gulo ekhon "reserved" (locked) kore rakhlam
  await TicketInventory.updateMany(
    { _id: { $in: ticketIds } },
    { $set: { status: "reserved" } }
  );

  // Promo code-er usage barhiye dilam
  if (pricing.appliedPromo) {
    pricing.appliedPromo.usedCount += 1;
    await pricing.appliedPromo.save();
  }

  // Send Notification for New Booking
  await notificationService.sendNotificationToAdmins("newBooking", {
    title: "New Booking Received",
    content: `A new booking has been created for ${pricing.destinationName} by ${bookingBody.fullName || (booking.user && booking.user.fullName)}. ID: ${booking.bookingId}`,
    priority: "medium",
  });

  // Check for Low Inventory Alert
  const totalTickets = await TicketInventory.countDocuments({ destinationId: bookingBody.destination });
  const remainingTickets = await TicketInventory.countDocuments({ destinationId: bookingBody.destination, status: "available" });

  if (totalTickets > 0) {
    const availablePercentage = (remainingTickets / totalTickets) * 100;
    if (availablePercentage <= 20) {
      await notificationService.sendNotificationToAdmins("lowInventory", {
        title: "Low Inventory Alert",
        content: `Inventory for ${pricing.destinationName} is low. Remaining: ${remainingTickets} (${availablePercentage.toFixed(1)}%)`,
        priority: "high",
      });
    }
  }

  // Result-e amra booking record ebong Stripe-er link pathacchi (Step 4 response-er jonno)
  return {
    booking,
    checkoutUrl: session.url,
  };
};

/**
 * Query for bookings with search and filters
 * @param {Object} filter - Simple filters
 * @param {Object} options - Pagination/sorting options
 * @param {Object} extraFilters - Search and date range
 * @returns {Promise<QueryResult>}
 */
const queryBookings = async (filter, options, extraFilters = {}) => {
  const { search, startDate, endDate } = extraFilters;
  const query = { ...filter };

  // 1. Date Range Filter
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = moment(startDate).startOf("day").toDate();
    if (endDate) query.createdAt.$lte = moment(endDate).endOf("day").toDate();
  }

  // 2. Complex Search
  if (search) {
    // Find matching destinations
    const matchingDestinations = await Destination.find({
      name: { $regex: search, $options: "i" }
    }).select("_id");
    const destIds = matchingDestinations.map(d => d._id);

    // Find matching users
    const matchingUsers = await User.find({
      $or: [
        { fullName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } }
      ]
    }).select("_id");
    const userIds = matchingUsers.map(u => u._id);

    query.$or = [
      { bookingId: { $regex: search, $options: "i" } },
      { fullName: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
      { destination: { $in: destIds } },
      { user: { $in: userIds } }
    ];
  }

  const bookings = await Booking.paginate(query, { ...options, populate: "user,destination,tickets" });
  return bookings;
};

/**
 * Get booking by id
 * @param {ObjectId} id
 * @returns {Promise<Booking>}
 */
const getBookingById = async (id) => {
  return Booking.findById(id).populate("user destination tickets");
};

/**
 * Update booking status
 * @param {ObjectId} bookingId
 * @param {string} status
 * @returns {Promise<Booking>}
 */
const updateBookingStatus = async (bookingId, status) => {
  const booking = await Booking.findById(bookingId);
  if (!booking) {
    throw new ApiError(httpStatus.NOT_FOUND, "Booking not found");
  }
  booking.status = status;
  await booking.save();
  return booking;
};

/**
 * Complete booking payment and update status with transaction details
 * @param {string} bookingId
 * @param {Object} session - Stripe session object
 * @returns {Promise<Booking>}
 */
const completeBookingPayment = async (bookingId, session) => {
  const booking = await Booking.findById(bookingId);
  if (!booking) {
    throw new ApiError(httpStatus.NOT_FOUND, "Booking not found");
  }
  if (booking.status === "paid") {
    return booking; // Already processed
  }
  
  // Update status and transaction info
  booking.status = "paid";
  if (session) {
    booking.paymentIntentId = session.payment_intent;
    // Stripe common payment methods: 'card', 'google_pay', 'apple_pay' etc.
    booking.paymentMethod = session.payment_method_types ? session.payment_method_types[0] : "card";
  }
  
  await booking.save();

  // Update ticket status from reserved to sold
  if (booking.tickets && booking.tickets.length > 0) {
    await TicketInventory.updateMany(
      { _id: { $in: booking.tickets } },
      { $set: { status: "sold" } }
    );
  }

  // Send Notification for Payment Update
  await notificationService.sendNotificationToAdmins("paymentUpdate", {
    title: "Payment Received",
    content: `Payment of ${booking.totalAmount} received for Booking ID: ${booking.bookingId}`,
    priority: "high",
    transactionId: booking.paymentIntentId,
  });

  return booking;
};

const XLSX = require("xlsx");

/**
 * Export paid bookings to Excel buffer
 * @returns {Promise<Buffer>}
 */
const exportTransactionsToExcel = async () => {
  const bookings = await Booking.find({ status: "paid" })
    .populate("user", "fullName email")
    .populate("destination", "name")
    .sort({ createdAt: -1 });

  const data = bookings.map((b) => ({
    "Transaction ID": b.paymentIntentId || "N/A",
    "Booking ID": b.bookingId,
    "Customer Name": b.user ? b.user.fullName : b.fullName,
    "Email": b.user ? b.user.email : b.email,
    "Destination": b.destination ? b.destination.name : "N/A",
    "Payment Method": b.paymentMethod || "card",
    "Amount": b.totalAmount,
    "Date": moment(b.createdAt).format("DD-MM-YYYY HH:mm"),
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Transactions");

  // Generate buffer
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  return buffer;
};

/**
 * Cleanup expired pending bookings and release tickets
 * @returns {Promise<void>}
 */
const cleanupExpiredBookings = async () => {
  try {
    const expiredBookings = await Booking.find({
      status: "pending",
      expiresAt: { $lt: new Date() },
    });

    if (expiredBookings.length === 0) {
      return;
    }

    logger.info(`Cleaning up ${expiredBookings.length} expired bookings`);

    for (const booking of expiredBookings) {
      // Release tickets
      if (booking.tickets && booking.tickets.length > 0) {
        await TicketInventory.updateMany(
          { _id: { $in: booking.tickets } },
          { $set: { status: "available" } }
        );
      }

      // Cancel booking
      booking.status = "cancelled";
      await booking.save();
    }
  } catch (error) {
    logger.error("Error in cleanupExpiredBookings task:", error);
  }
};

module.exports = {
  createBooking,
  queryBookings,
  getBookingById,
  updateBookingStatus,
  calculateBookingTotal,
  completeBookingPayment,
  exportTransactionsToExcel,
  cleanupExpiredBookings,
  generateBookingTicketsPDF,
};
