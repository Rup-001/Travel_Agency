const Joi = require("joi");
const { objectId } = require("./custom.validation");

const createBooking = {
  body: Joi.object().keys({
    destination: Joi.string().custom(objectId).required(),
    visitDate: Joi.date().iso().required(),
    fullName: Joi.string().required(),
    email: Joi.string().required().email(),
    confirmEmail: Joi.string().required().valid(Joi.ref("email")).messages({
      "any.only": "Email and confirm email must match",
    }),
    phone: Joi.string().required(),
    dialCode: Joi.string().required(),
    adults: Joi.number().integer().min(1).required(),
    children: Joi.number().integer().min(0),
    promoCode: Joi.string().allow(""),
  }),
};

const getBookings = {
  query: Joi.object().keys({
    status: Joi.string().valid("pending", "paid", "cancelled").allow(""),
    destination: Joi.alternatives().try(Joi.string().custom(objectId), Joi.string().valid("")),
    user: Joi.alternatives().try(Joi.string().custom(objectId), Joi.string().valid("")),
    search: Joi.string().allow(""),
    startDate: Joi.alternatives().try(Joi.date().iso(), Joi.string().valid("")),
    endDate: Joi.alternatives().try(Joi.date().iso(), Joi.string().valid("")),
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
