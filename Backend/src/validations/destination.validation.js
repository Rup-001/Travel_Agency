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
    price: Joi.number().required(),
    images: Joi.array().items(Joi.string()),
    video: Joi.string().allow(""),
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
      price: Joi.number(),
      images: Joi.array().items(Joi.string()),
      video: Joi.string().allow(""),
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
