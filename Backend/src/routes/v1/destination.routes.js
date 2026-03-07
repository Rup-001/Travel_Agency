const express = require("express");
const auth = require("../../middlewares/auth");
const validate = require("../../middlewares/validate");
const { destinationValidation } = require("../../validations");
const { destinationController } = require("../../controllers");
const fileUploadMiddleware = require("../../middlewares/fileUpload");

const UPLOADS_FOLDER_DESTINATION = "./public/uploads/destinations";
const upload = fileUploadMiddleware(UPLOADS_FOLDER_DESTINATION, [
  "image/jpg",
  "image/png",
  "image/jpeg",
  "image/webp",
]);

const router = express.Router();

router
  .route("/")
  .post(
    auth("admin"),
    // upload.fields([
    //   { name: "images", maxCount: 10 },
    //   { name: "video", maxCount: 1 },
    // ]),
    upload.fields([{ name: "media", maxCount: 5 }]),
    validate(destinationValidation.createDestination),
    destinationController.createDestination
  )
  .get(validate(destinationValidation.getDestinations), destinationController.getDestinations);

router.route("/popular").get(destinationController.getPopularDestinations);

router
  .route("/:destinationId")
  .get(validate(destinationValidation.getDestination), destinationController.getDestination)
  .patch(
    auth("admin"),
    // upload.fields([
    //   { name: "images", maxCount: 10 },
    //   { name: "video", maxCount: 1 },
    // ]),
    upload.fields([{ name: "media", maxCount: 5 }]),
    validate(destinationValidation.updateDestination),
    destinationController.updateDestination
  )
  .delete(auth("admin"), validate(destinationValidation.deleteDestination), destinationController.deleteDestination);

module.exports = router;
