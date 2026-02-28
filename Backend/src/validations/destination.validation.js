const Joi = require("joi");
const { objectId } = require("./custom.validation");

const createDestination = {
  body: Joi.object().keys({
    name: Joi.string().required(),
    tagline: Joi.string().allow(""),
    location: Joi.string().allow(""),
    description: Joi.string().allow(""),
    highlights: Joi.string().allow(""),
    conditions: Joi.string().allow(""),
    rating: Joi.number().min(0).max(5),
    adultPrice: Joi.number().required(),
    childPrice: Joi.number().required(),
    adultRegularPrice: Joi.number(),
    childRegularPrice: Joi.number(),
    discountPercentage: Joi.number().min(0).max(100),
    comboDiscountPercentage: Joi.number().min(0).max(100),
    media: Joi.array().items(Joi.string()),
    type: Joi.string().valid("single", "combo"),
    subDestinations: Joi.array().items(Joi.string().custom(objectId)),
    status: Joi.string().valid("active", "inactive"),
  }),
};

const getDestinations = {
  query: Joi.object().keys({
    name: Joi.string(),
    type: Joi.string(),
    status: Joi.string(),
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
};

const getDestination = {
  params: Joi.object().keys({
    destinationId: Joi.string().custom(objectId),
  }),
};

const updateDestination = {
  params: Joi.object().keys({
    destinationId: Joi.required().custom(objectId),
  }),
  body: Joi.object()
    .keys({
      name: Joi.string(),
      tagline: Joi.string().allow(""),
      location: Joi.string().allow(""),
      description: Joi.string().allow(""),
      highlights: Joi.string().allow(""),
      conditions: Joi.string().allow(""),
      rating: Joi.number().min(0).max(5),
      adultPrice: Joi.number(),
      childPrice: Joi.number(),
      adultRegularPrice: Joi.number(),
      childRegularPrice: Joi.number(),
      discountPercentage: Joi.number().min(0).max(100),
      comboDiscountPercentage: Joi.number().min(0).max(100),
      media: Joi.array().items(Joi.string()),

      mediaToRemove: Joi.alternatives().try(Joi.array().items(Joi.string()), Joi.string()),
      type: Joi.string().valid("single", "combo"),
      subDestinations: Joi.array().items(Joi.string().custom(objectId)),
      status: Joi.string().valid("active", "inactive"),
    })
    .min(1),
};


const deleteDestination = {
  params: Joi.object().keys({
    destinationId: Joi.string().custom(objectId),
  }),
};

module.exports = {
  createDestination,
  getDestinations,
  getDestination,
  updateDestination,
  deleteDestination,
};
