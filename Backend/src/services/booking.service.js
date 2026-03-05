const httpStatus = require("http-status");
const { Booking, Destination, PromoCode, TicketInventory } = require("../models");
const ApiError = require("../utils/ApiError");
const stripeService = require("./stripe.service");
const config = require("../config/config");
const moment = require("moment");

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

  // 1. Ticket inventory-te check korlam je jaiga ache kina
  const availableTickets = await TicketInventory.find({
    destinationId: bookingBody.destination,
    status: "available",
  }).limit(totalPeople);

  if (availableTickets.length < totalPeople) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Not enough tickets available. Current stock: ${availableTickets.length}`
    );
  }

  // 2. Final Pricing hishab korlam (Price Check step)
  const pricing = await calculateBookingTotal(
    bookingBody.destination,
    bookingBody.adults,
    bookingBody.children,
    bookingBody.promoCode
  );

  // 3. Database-e Booking entry create korchi (Taka katar AGEY)
  // Ekhane status "pending" thakbe
  const ticketIds = availableTickets.map((t) => t._id);
  const finalBookingData = {
    ...bookingBody,
    bookingId: generateBookingId(), // Set unique human-readable ID
    totalAmount: pricing.finalTotal,
    discountAmount: pricing.discountAmount,
    adultPriceAtBooking: pricing.adultPriceAtBooking,
    childPriceAtBooking: pricing.childPriceAtBooking,
    tickets: ticketIds,
    status: "pending",
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
  });

  // Save the Stripe Session ID in our database
  booking.stripeSessionId = session.id;
  await booking.save();

  // Ticket-gulo ekhon "sold" (locked) kore rakhlam
  await TicketInventory.updateMany(
    { _id: { $in: ticketIds } },
    { $set: { status: "sold" } }
  );

  // Promo code-er usage barhiye dilam
  if (pricing.appliedPromo) {
    pricing.appliedPromo.usedCount += 1;
    await pricing.appliedPromo.save();
  }

  // Result-e amra booking record ebong Stripe-er link pathacchi (Step 4 response-er jonno)
  return {
    booking,
    checkoutUrl: session.url,
  };
};

/**
 * Query for bookings
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @returns {Promise<QueryResult>}
 */
const queryBookings = async (filter, options) => {
  const bookings = await Booking.paginate(filter, { ...options, populate: "user,destination,tickets" });
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
  return booking;
};

module.exports = {
  createBooking,
  queryBookings,
  getBookingById,
  updateBookingStatus,
  calculateBookingTotal,
  completeBookingPayment,
};
