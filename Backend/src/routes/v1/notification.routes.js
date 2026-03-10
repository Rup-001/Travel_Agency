const express = require("express");
const auth = require("../../middlewares/auth");
const notificationController = require("../../controllers/notification.controller");

const router = express.Router();

// All notification routes require authentication
router.use(auth("common"));

router
  .route("/")
  .get(notificationController.getNotifications);

router
  .route("/mark-all-read")
  .patch(notificationController.markAllAsRead);

router
  .route("/:notificationId/read")
  .patch(notificationController.markAsRead);

module.exports = router;
