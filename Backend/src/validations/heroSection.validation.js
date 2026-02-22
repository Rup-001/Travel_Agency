const Joi = require("joi");

const updateHeroSection = {
  body: Joi.object().keys({
    video_url: Joi.string().optional(),
  }),
};

module.exports = {
  updateHeroSection,
};
