const httpStatus = require("http-status");
const catchAsync = require("../utils/catchAsync");
const { heroSectionService } = require("../services");

const getHeroSection = catchAsync(async (req, res) => {
  const heroSection = await heroSectionService.getHeroSection();
  res.send(heroSection);
});

const updateHeroSection = catchAsync(async (req, res) => {
  const heroBody = { ...req.body };
  if (req.file) {
    heroBody.video_url = `uploads/hero/${req.file.filename}`;
  }
  const heroSection = await heroSectionService.updateHeroSection(heroBody, req.user.id);
  res.status(httpStatus.OK).send(heroSection);
});

module.exports = {
  getHeroSection,
  updateHeroSection,
};
