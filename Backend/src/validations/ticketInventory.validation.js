const Joi = require("joi");
const { objectId } = require("./custom.validation");


const uploadTicketInventory = {
  body: Joi.object().keys({
    destinationId: Joi.string().custom(objectId).required(),
    expiryDate: Joi.date().iso().required(),
  }),

  file: Joi.object(), // handled by multer or similar middleware
};

module.exports = {
 uploadTicketInventory
};
