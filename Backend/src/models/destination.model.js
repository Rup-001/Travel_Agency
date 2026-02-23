const mongoose = require("mongoose");
const { toJSON, paginate } = require("./plugins");

const destinationSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    motto: {
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
    type: {
      type: String,
      enum: ["single", "combo"],
      default: "single",
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
destinationSchema.plugin(toJSON);
destinationSchema.plugin(paginate);

/**
 * @typedef Destination
 */
const Destination = mongoose.model("Destination", destinationSchema);

module.exports = Destination;
