const Joi = require("joi");
const { objectId } = require("./custom.validation");

const createBooking = {
  body: Joi.object().keys({
    destination: Joi.string().custom(objectId).required(),
    visitDate: Joi.date().iso().required(),
    adults: Joi.number().integer().min(1).required(),
    children: Joi.number().integer().min(0),
    promoCode: Joi.string().allow(""),
  }),
};

const getBookings = {
  query: Joi.object().keys({
    status: Joi.string().valid("pending", "paid", "cancelled"),
    destination: Joi.string().custom(objectId),
    user: Joi.string().custom(objectId),
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
};

const updateBookingStatus = {
  params: Joi.object().keys({
    bookingId: Joi.required().custom(objectId),
  }),
  body: Joi.object().keys({
    status: Joi.string().required().valid("pending", "paid", "cancelled"),
  }),
};

module.exports = {
  createBooking,
  getBookings,
  updateBookingStatus,
};
