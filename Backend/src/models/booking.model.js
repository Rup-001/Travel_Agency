const mongoose = require("mongoose");
const { toJSON, paginate } = require("./plugins");

const bookingSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    destination: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Destination",
      required: true,
    },
    visitDate: {
      type: Date,
      required: true,
    },
    adults: {
      type: Number,
      required: true,
      min: 1,
    },
    children: {
      type: Number,
      default: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "paid", "cancelled"],
      default: "pending",
    },
    // Transaction Details for "Booking Hub" & "Transaction" sections
    paymentMethod: {
      type: String,
      default: "card", // Card, Google Pay, Apple Pay etc.
    },
    paymentIntentId: {
      type: String,
    },
    stripeSessionId: {
      type: String,
    },
    // Snapshots of prices at the time of booking
    adultPriceAtBooking: {
      type: Number,
    },
    childPriceAtBooking: {
      type: Number,
    },
    promoCode: {
      type: String,
    },
    discountAmount: {
      type: Number,
      default: 0,
    },
    tickets: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "TicketInventory",
      },
    ],
    paymentIntentId: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// add plugin that converts mongoose to json
bookingSchema.plugin(toJSON);
bookingSchema.plugin(paginate);

/**
 * @typedef Booking
 */
const Booking = mongoose.model("Booking", bookingSchema);

module.exports = Booking;
