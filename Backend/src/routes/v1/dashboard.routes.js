const express = require("express");
const auth = require("../../middlewares/auth");
const validate = require("../../middlewares/validate");
const dashboardValidation = require("../../validations/dashboard.validation");
const dashboardController = require("../../controllers/dashboard.controller");

const router = express.Router();

router.get("/revenue-trend", auth("admin"), validate(dashboardValidation.getRevenueTrend), dashboardController.getRevenueTrend);
router.get("/booking-trend", auth("admin"), validate(dashboardValidation.getBookingTrend), dashboardController.getBookingTrend);
router.get("/sales-by-type", auth("admin"), validate(dashboardValidation.getSalesByType), dashboardController.getSalesByType);

router
  .route("/")
  .get(
    auth("admin"), 
    validate(dashboardValidation.getDashboardSummary), 
    dashboardController.getDashboardSummary
  );

module.exports = router;
