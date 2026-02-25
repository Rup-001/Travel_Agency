const express = require("express");
const multer = require("multer");
const auth = require("../../middlewares/auth");
const { inventoryController } = require("../../controllers");

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post(
  "/upload-tickets",
  auth("admin"),
  upload.single("file"),
  inventoryController.uploadTickets
);

module.exports = router;
