const Joi = require("joi");
const { objectId } = require("./custom.validation");

const createPromoCode = {
  body: Joi.object().keys({
    code: Joi.string().required().uppercase(),
    description: Joi.string().allow(""),
    discountType: Joi.string().required().valid("percentage", "fixed"),
    discountAmount: Joi.number().required(),
    validFrom: Joi.date().default(Date.now),
    validUntil: Joi.date().required(),
    minBookingAmount: Joi.number(),
    maxDiscountAmount: Joi.number(),
    usageLimit: Joi.number().allow(null),
    isApplicableAll: Joi.boolean(),
    applicableDestinations: Joi.array().items(Joi.string().custom(objectId)),
    status: Joi.string().valid("active", "inactive"),
  }),
};

const getPromoCodes = {
  query: Joi.object().keys({
    code: Joi.string(),
    status: Joi.string(),
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
};

const getPromoCode = {
  params: Joi.object().keys({
    promoId: Joi.string().custom(objectId),
  }),
};

const updatePromoCode = {
  params: Joi.object().keys({
    promoId: Joi.required().custom(objectId),
  }),
  body: Joi.object()
    .keys({
      code: Joi.string().uppercase(),
      description: Joi.string().allow(""),
      discountType: Joi.string().valid("percentage", "fixed"),
      discountAmount: Joi.number(),
      validFrom: Joi.date(),
      validUntil: Joi.date(),
      minBookingAmount: Joi.number(),
      maxDiscountAmount: Joi.number(),
      usageLimit: Joi.number().allow(null),
      isApplicableAll: Joi.boolean(),
      applicableDestinations: Joi.array().items(Joi.string().custom(objectId)),
      status: Joi.string().valid("active", "inactive"),
    })
    .min(1),
};

const deletePromoCode = {
  params: Joi.object().keys({
    promoId: Joi.string().custom(objectId),
  }),
};

module.exports = {
  createPromoCode,
  getPromoCodes,
  getPromoCode,
  updatePromoCode,
  deletePromoCode,
};
