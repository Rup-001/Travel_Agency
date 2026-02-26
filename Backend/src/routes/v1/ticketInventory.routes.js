const express = require("express");
const multer = require("multer");
const httpStatus = require("http-status");
const auth = require("../../middlewares/auth");
const validate = require("../../middlewares/validate");
const ApiError = require("../../utils/ApiError");
const { ticketInventoryValidation } = require("../../validations");
const { ticketInventoryController } = require("../../controllers");

const router = express.Router();

// Memory storage for Excel parsing
const storage = multer.memoryStorage();

// 1. IMPROVED FILE VALIDATION: Added a file filter to check MIME type
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
      "application/vnd.ms-excel", // .xls
      "text/csv", // .csv
    ];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new ApiError(httpStatus.BAD_REQUEST, "Invalid file type. Only Excel (.xlsx, .xls) and CSV are allowed."), false);
    }
  },
});

// 2. BASIC VALIDATION: Middleware to ensure file is present
const checkFilePresence = (req, res, next) => {
  if (!req.file) {
    return next(new ApiError(httpStatus.BAD_REQUEST, "Excel file is required"));
  }
  next();
};

router.post(
  "/upload-tickets",
  auth("admin"),
  upload.single("file"), // 1. Multer runs first and filters file type
  checkFilePresence,      // 2. We check if file exists at all
  validate(ticketInventoryValidation.uploadTicketInventory), // 3. Joi validates the metadata (destinationId)
  ticketInventoryController.uploadTickets // 4. Only then we reach the controller
);

router.get(
  "/",
  auth("admin"),
  ticketInventoryController.getTicketInventories
);
router.get(
  "/summary",
  auth("admin"),
  ticketInventoryController.getTicketInventoriesSummary
);

module.exports = router;
