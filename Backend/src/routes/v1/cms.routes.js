const express = require("express");
const auth = require("../../middlewares/auth");
const { cmsController, heroSectionController } = require("../../controllers");
const validate = require("../../middlewares/validate");
const cmsValidation = require("../../validations/cms.validation");
const heroSectionValidation = require("../../validations/heroSection.validation");
const fileUploadMiddleware = require("../../middlewares/fileUpload");

const UPLOADS_FOLDER_HERO = "./public/uploads/hero";
const allowedVideoTypes = [
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

// CMS Admin - Get all pages
router.route("/").get(auth("admin"), cmsController.getPages);

// Hero Section - Mount original logic under /cms/hero-section
router
  .route("/hero-section")
  .get(heroSectionController.getHeroSection)
  .patch(
    auth("admin"),
    uploadHero.single("video"),
    validate(heroSectionValidation.updateHeroSection),
    heroSectionController.updateHeroSection
  );

// Generic CMS Pages - Slug based
router
  .route("/:slug")
  .get(cmsController.getPage)
  .patch(
    auth("admin"),
    validate(cmsValidation.updatePage),
    cmsController.updatePage
  );

module.exports = router;
