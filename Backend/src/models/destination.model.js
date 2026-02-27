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
    tagline: {
      type: String,
      trim: true,
    },
    location: {
      type: String,
      trim: true,
    },
    description: {
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
    rating: {
      type: Number,
      default: 0,
    },
    price: {
      type: Number,
      required: true,
    },
    images: {
      type: [String],
      required: true,
    },
    video: {
      type: String,
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

/**
 * @typedef Destination
 */
const Destination = mongoose.model("Destination", destinationSchema);

module.exports = Destination;