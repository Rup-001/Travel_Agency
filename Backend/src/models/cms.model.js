const mongoose = require("mongoose");
const { toJSON, paginate } = require("./plugins");

const cmsSchema = mongoose.Schema(
  {
    pageTitle: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    pageContent: {
      type: String,
      trim: true,
    },
    video_url: {
      type: String, // Specifically for Hero Section
      trim: true,
    },
    number: {
      type: String, // Specifically for WhatsApp Support
      trim: true,
    },
    status: {
      type: String,
      enum: ["published", "draft"],
      default: "draft",
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

// add plugin that converts mongoose to json
cmsSchema.plugin(toJSON);
cmsSchema.plugin(paginate);

/**
 * @typedef CMS
 */
const CMS = mongoose.model("CMS", cmsSchema);

module.exports = CMS;
