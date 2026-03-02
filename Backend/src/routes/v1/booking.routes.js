const express = require("express");
const auth = require("../../middlewares/auth");
const validate = require("../../middlewares/validate");
const { bookingValidation } = require("../../validations");
const { bookingController } = require("../../controllers");

const router = express.Router();

router
  .route("/")
  .post(auth(), validate(bookingValidation.createBooking), bookingController.createBooking)
  .get(auth("admin"), validate(bookingValidation.getBookings), bookingController.getBookings);

router
  .route("/:bookingId")
  .get(auth(), bookingController.getBooking)
  .patch(auth("admin"), validate(bookingValidation.updateBookingStatus), bookingController.updateBookingStatus);

module.exports = router;
