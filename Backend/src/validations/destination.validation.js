const Joi = require("joi");
const { objectId } = require("./custom.validation");

const createDestination = {
  body: Joi.object().keys({
    name: Joi.string().required(),
    subTitle: Joi.string().allow(""),
    description: Joi.string().allow(""),
    rating: Joi.number().min(0).max(5),
    highlights: Joi.string().allow(""),
    conditions: Joi.string().allow(""),
    type: Joi.string().valid("single", "combo").required(),
    status: Joi.string().valid("active", "inactive"),
    location: Joi.object().keys({
      address: Joi.string().allow(""),
      latitude: Joi.number(),
      longitude: Joi.number(),
      googleMapsLink: Joi.string().allow(""),
    }),

    // Single specific fields
    adultPreviousPrice: Joi.number().when("type", { is: "single", then: Joi.required(), otherwise: Joi.forbidden() }),
    adultCurrentPrice: Joi.number().when("type", { is: "single", then: Joi.required(), otherwise: Joi.forbidden() }),
    childPreviousPrice: Joi.number().when("type", { is: "single", then: Joi.required(), otherwise: Joi.forbidden() }),
    childCurrentPrice: Joi.number().when("type", { is: "single", then: Joi.number().required(), otherwise: Joi.forbidden() }),
    media: Joi.array().items(Joi.string()).when("type", { is: "single", then: Joi.array().optional(), otherwise: Joi.forbidden() }),

    // Combo specific fields
    comboAdultCurrentPrice: Joi.number().when("type", { is: "combo", then: Joi.number().required(), otherwise: Joi.forbidden() }),
    comboChildCurrentPrice: Joi.number().when("type", { is: "combo", then: Joi.number().required(), otherwise: Joi.forbidden() }),
    subDestinations: Joi.array().items(Joi.string().custom(objectId)).when("type", {
      is: "combo",
      then: Joi.array().min(2).required(),
      otherwise: Joi.forbidden(),
    }),
  }),
};

const updateDestination = {
  params: Joi.object().keys({
    destinationId: Joi.required().custom(objectId),
  }),
  body: Joi.object()
    .keys({
      name: Joi.string(),
      subTitle: Joi.string().allow(""),
      description: Joi.string().allow(""),
      rating: Joi.number().min(0).max(5),
      highlights: Joi.string().allow(""),
      conditions: Joi.string().allow(""),
      type: Joi.string().valid("single", "combo"),
      status: Joi.string().valid("active", "inactive"),
    location: Joi.object().keys({
      address: Joi.string().allow(""),
      latitude: Joi.number(),
      longitude: Joi.number(),
      googleMapsLink: Joi.string().allow(""),
    }),

      // Fields are conditionally forbidden based on the 'type' in the body
      adultPreviousPrice: Joi.number().when("type", { is: "single", then: Joi.number().optional(), otherwise: Joi.forbidden() }),
      adultCurrentPrice: Joi.number().when("type", { is: "single", then: Joi.number().optional(), otherwise: Joi.forbidden() }),
      childPreviousPrice: Joi.number().when("type", { is: "single", then: Joi.number().optional(), otherwise: Joi.forbidden() }),
      childCurrentPrice: Joi.number().when("type", { is: "single", then: Joi.number().optional(), otherwise: Joi.forbidden() }),
      media: Joi.array().items(Joi.string()).when("type", { is: "single", then: Joi.array().optional(), otherwise: Joi.forbidden() }),
      mediaToRemove: Joi.alternatives().try(Joi.array().items(Joi.string()), Joi.string()),

      comboAdultCurrentPrice: Joi.number().when("type", { is: "combo", then: Joi.number().optional(), otherwise: Joi.forbidden() }),
      comboChildCurrentPrice: Joi.number().when("type", { is: "combo", then: Joi.optional(), otherwise: Joi.forbidden() }),
      subDestinations: Joi.array().items(Joi.string().custom(objectId)).when("type", {
        is: "combo",
        then: Joi.array().min(2).optional(),
        otherwise: Joi.forbidden(),
      }),
    })
    .min(1),
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
