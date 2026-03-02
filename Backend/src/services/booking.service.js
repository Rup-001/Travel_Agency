const httpStatus = require("http-status");
const { Booking, Destination, PromoCode, TicketInventory } = require("../models");
const ApiError = require("../utils/ApiError");
const stripeService = require("./stripe.service");

/**
 * Calculate total price and validate promo code
 * @param {ObjectId} destinationId
 * @param {number} adults
 * @param {number} children
 * @param {string} promoCodeStr
 * @returns {Promise<Object>}
 */
const calculateBookingTotal = async (destinationId, adults, children, promoCodeStr) => {
  const destination = await Destination.findById(destinationId);
  if (!destination) {
    throw new ApiError(httpStatus.NOT_FOUND, "Destination not found");
  }

  const subTotal = (adults * destination.adultPrice) + (children * destination.childPrice);
  let finalTotal = subTotal;
  let discountAmount = 0;
  let appliedPromo = null;

  if (promoCodeStr) {
    appliedPromo = await PromoCode.findOne({
      code: promoCodeStr.toUpperCase(),
      status: "active",
      expiryDate: { $gt: new Date() },
    });

    if (!appliedPromo) {
      throw new ApiError(httpStatus.BAD_REQUEST, "Invalid or expired promo code");
    }

    if (subTotal < appliedPromo.minBookingAmount) {
      throw new ApiError(httpStatus.BAD_REQUEST, `Minimum amount for this promo is ${appliedPromo.minBookingAmount}`);
    }

    if (appliedPromo.usageLimit !== null && appliedPromo.usedCount >= appliedPromo.usageLimit) {
      throw new ApiError(httpStatus.BAD_REQUEST, "Promo code usage limit reached");
    }

    // Apply discount
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
    adultPriceAtBooking: destination.adultPrice,
    childPriceAtBooking: destination.childPrice,
    appliedPromo,
    destinationName: destination.name,
  };
};

/**
 * Create a booking with ticket reservation and Stripe
 * @param {Object} bookingBody
 * @returns {Promise<Object>} - returns booking and stripeClientSecret
 */
const createBooking = async (bookingBody) => {
  const totalPeople = bookingBody.adults + (bookingBody.children || 0);

  // 1. Check Ticket Inventory Availability
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

  // 2. Calculate Final Pricing
  const pricing = await calculateBookingTotal(
    bookingBody.destination,
    bookingBody.adults,
    bookingBody.children,
    bookingBody.promoCode
  );

  // 3. Create Stripe Payment Intent
  const paymentIntent = await stripeService.createPaymentIntent(pricing.finalTotal);

  // 4. Reserve Tickets (Mark as sold)
  const ticketIds = availableTickets.map((t) => t._id);
  await TicketInventory.updateMany(
    { _id: { $in: ticketIds } },
    { $set: { status: "sold" } }
  );

  // 5. Create the Booking Record
  const finalBookingData = {
    ...bookingBody,
    totalAmount: pricing.finalTotal,
    discountAmount: pricing.discountAmount,
    adultPriceAtBooking: pricing.adultPriceAtBooking,
    childPriceAtBooking: pricing.childPriceAtBooking,
    tickets: ticketIds,
    paymentIntentId: paymentIntent.id,
    status: "pending", // Payment hasn't been confirmed yet
  };

  const booking = await Booking.create(finalBookingData);

  // If a promo code was used, increment usage
  if (pricing.appliedPromo) {
    pricing.appliedPromo.usedCount += 1;
    await pricing.appliedPromo.save();
  }

  return {
    booking,
    clientSecret: paymentIntent.client_secret,
  };
};

/**
 * Query for bookings
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @returns {Promise<QueryResult>}
 */
const queryBookings = async (filter, options) => {
  const bookings = await Booking.paginate(filter, { ...options, populate: "user destination" });
  return bookings;
};

/**
 * Get booking by id
 * @param {ObjectId} id
 * @returns {Promise<Booking>}
 */
const getBookingById = async (id) => {
  return Booking.findById(id).populate("user destination");
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

module.exports = {
  createBooking,
  queryBookings,
  getBookingById,
  updateBookingStatus,
  calculateBookingTotal,
};
