const mongoose = require("mongoose");
const { toJSON, paginate } = require("./plugins");

const promoCodeSchema = mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    discountType: {
      type: String,
      enum: ["percentage", "fixed"],
      required: true,
    },
    discountAmount: {
      type: Number,
      required: true,
    },
    expiryDate: {
      type: Date,
      required: true,
    },
    minBookingAmount: {
      type: Number,
      default: 0,
    },
    maxDiscountAmount: {
      type: Number, // Useful for percentage discounts (e.g., 10% off up to $50)
    },
    usageLimit: {
      type: Number,
      default: null, // null means unlimited
    },
    usedCount: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  {
    timestamps: true,
  }
);

// add plugin that converts mongoose to json
promoCodeSchema.plugin(toJSON);
promoCodeSchema.plugin(paginate);

/**
 * @typedef PromoCode
 */
const PromoCode = mongoose.model("PromoCode", promoCodeSchema);

module.exports = PromoCode;
