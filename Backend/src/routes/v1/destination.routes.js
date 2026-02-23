const express = require("express");
const auth = require("../../middlewares/auth");
const validate = require("../../middlewares/validate");
const { destinationValidation } = require("../../validations");
const { destinationController } = require("../../controllers");

const router = express.Router();

router
  .route("/")
  .post(
    auth("admin"),
    validate(destinationValidation.createDestination),
    destinationController.createDestination
  )
  .get(
    validate(destinationValidation.getDestinations),
    destinationController.getDestinations
  );

router
  .route("/:destinationId")
  .get(
    validate(destinationValidation.getDestination),
    destinationController.getDestination
  )
  .patch(
    auth("admin"),
    validate(destinationValidation.updateDestination),
    destinationController.updateDestination
  )
  .delete(
    auth("admin"),
    validate(destinationValidation.deleteDestination),
    destinationController.deleteDestination
  );

module.exports = router;
