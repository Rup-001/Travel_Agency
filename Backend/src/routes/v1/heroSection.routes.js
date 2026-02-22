const express = require("express");
const auth = require("../../middlewares/auth");
const validate = require("../../middlewares/validate");
const heroSectionValidation = require("../../validations/heroSection.validation");
const heroSectionController = require("../../controllers/heroSection.controller");
const fileUploadMiddleware = require("../../middlewares/fileUpload");
const UPLOADS_FOLDER_HERO = "./public/uploads/hero";
const allowedVideoTypes = [
  // "video/mp4",
  // "video/webm",
  // "video/ogg",
  // "video/quicktime",
  // "video/x-msvideo",
  
  "video/mp4",
  "video/mpeg",
  "video/webm",
  "video/webp",
  "video/ogg",
  "video/quicktime",
  "video/x-msvideo",
  "video/x-ms-wmv",
  "video/x-ms-flv",
  "video/3gpp",
  "video/3gpp2",
  "video/x-matroska",
  "video/avi",
  "video/mp2t",
  "video/x-m4v",
  "video/x-f4v",
  "video/h264",
  "video/h265",
  "video/hevc",
  "video/av1",
  "video/vnd.dlna.mpeg-tts",
  "application/x-mpegURL",
  "application/vnd.apple.mpegurl",
  "image/webp"
];
const uploadHero = fileUploadMiddleware(UPLOADS_FOLDER_HERO, allowedVideoTypes);

const router = express.Router();

router
  .route("/")
  .get(heroSectionController.getHeroSection)
  .patch(
    auth("admin"),
    uploadHero.single("video"),
    validate(heroSectionValidation.updateHeroSection),
    heroSectionController.updateHeroSection
  );

module.exports = router;
