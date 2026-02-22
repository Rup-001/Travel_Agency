const mongoose = require("mongoose");
const { toJSON, paginate } = require("./plugins");

const heroSectionSchema = mongoose.Schema(
  {
    video_url: {
      type: String,
      required: true,
      trim: true,
    },
    updated_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// add plugin that converts mongoose to json
heroSectionSchema.plugin(toJSON);
heroSectionSchema.plugin(paginate);

const HeroSection = mongoose.model("HeroSection", heroSectionSchema);

module.exports = HeroSection;
