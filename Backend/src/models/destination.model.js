const mongoose = require("mongoose");
const { toJSON, paginate } = require("./plugins");

const destinationSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    subTitle: {
      type: String,
      trim: true,
    },
    highlights: {
      type: String,
      trim: true,
    },
    conditions: {
      type: String,
      trim: true,
    },
    adultPreviousPrice: {
      type: Number,
      required: true,
      default: 0,
    },
    adultCurrentPrice: {
      type: Number,
      required: true,
      default: 0,
    },
    childPreviousPrice: {
      type: Number,
      required: true,
      default: 0,
    },
    childCurrentPrice: {
      type: Number,
      required: true,
      default: 0,
    },
    adultDiscountPercentage: {
      type: Number,
      default: 0,
    },
    childDiscountPercentage: {
      type: Number,
      default: 0,
    },
    // Combo specific pricing
    comboAdultPreviousPrice: {
      type: Number,
      default: 0,
    },
    comboAdultCurrentPrice: {
      type: Number,
      default: 0,
    },
    comboChildPreviousPrice: {
      type: Number,
      default: 0,
    },
    comboChildCurrentPrice: {
      type: Number,
      default: 0,
    },
    comboAdultDiscountPercentage: {
      type: Number,
      default: 0,
    },
    comboChildDiscountPercentage: {
      type: Number,
      default: 0,
    },
    media: {
      type: [String],
    },
    type: {
      type: String,
      enum: ["single", "combo"],
      default: "single",
    },
    subDestinations: [
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
destinationSchema.plugin(toJSON);
destinationSchema.plugin(paginate);

destinationSchema.pre("save", function (next) {
  if (this.isModified("adultPreviousPrice") || this.isModified("adultCurrentPrice")) {
    if (this.adultPreviousPrice > 0) {
      this.adultDiscountPercentage = parseFloat(
        (((this.adultPreviousPrice - this.adultCurrentPrice) / this.adultPreviousPrice) * 100).toFixed(2)
      );
    } else {
      this.adultDiscountPercentage = 0;
    }
  }

  if (this.isModified("childPreviousPrice") || this.isModified("childCurrentPrice")) {
    if (this.childPreviousPrice > 0) {
      this.childDiscountPercentage = parseFloat(
        (((this.childPreviousPrice - this.childCurrentPrice) / this.childPreviousPrice) * 100).toFixed(2)
      );
    } else {
      this.childDiscountPercentage = 0;
    }
  }

  // Calculate Combo Discount Percentages
  if (this.isModified("comboAdultPreviousPrice") || this.isModified("comboAdultCurrentPrice")) {
    if (this.comboAdultPreviousPrice > 0) {
      this.comboAdultDiscountPercentage = parseFloat(
        (((this.comboAdultPreviousPrice - this.comboAdultCurrentPrice) / this.comboAdultPreviousPrice) * 100).toFixed(2)
      );
    } else {
      this.comboAdultDiscountPercentage = 0;
    }
  }

  if (this.isModified("comboChildPreviousPrice") || this.isModified("comboChildCurrentPrice")) {
    if (this.comboChildPreviousPrice > 0) {
      this.comboChildDiscountPercentage = parseFloat(
        (((this.comboChildPreviousPrice - this.comboChildCurrentPrice) / this.comboChildPreviousPrice) * 100).toFixed(2)
      );
    } else {
      this.comboChildDiscountPercentage = 0;
    }
  }

  next();
});

/**
 * @typedef Destination
 */
const Destination = mongoose.model("Destination", destinationSchema);

module.exports = Destination;