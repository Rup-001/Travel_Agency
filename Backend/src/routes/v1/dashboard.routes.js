const express = require("express");
const auth = require("../../middlewares/auth");
const validate = require("../../middlewares/validate");
const dashboardValidation = require("../../validations/dashboard.validation");
const dashboardController = require("../../controllers/dashboard.controller");

const router = express.Router();

router
  .route("/")
  .get(
    auth("admin"), 
    validate(dashboardValidation.getDashboardSummary), 
    dashboardController.getDashboardSummary
  );

module.exports = router;
