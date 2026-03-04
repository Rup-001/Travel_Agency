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
    description: {
      type: String,
      trim: true,
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
    validFrom: {
      type: Date,
      required: true,
      default: Date.now,
    },
    validUntil: {
      type: Date,
      required: true,
    },
    minBookingAmount: {
      type: Number,
      default: 0,
    },
    maxDiscountAmount: {
      type: Number,
    },
    usageLimit: {
      type: Number,
      default: null,
    },
    usedCount: {
      type: Number,
      default: 0,
    },
    isApplicableAll: {
      type: Boolean,
      default: false,
    },
    applicableDestinations: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Destination",
      },
    ],
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
