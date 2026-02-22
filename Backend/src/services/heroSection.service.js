const { HeroSection } = require("../models");
const unlinkImage = require("../common/unlinkImage");

/**
 * Get the current hero section
 * @returns {Promise<HeroSection>}
 */
const getHeroSection = async () => {
  return HeroSection.findOne();
};

/**
 * Create or update the hero section
 * @param {Object} heroBody
 * @param {ObjectId} userId
 * @returns {Promise<HeroSection>}
 */
const updateHeroSection = async (heroBody, userId) => {
  let heroSection = await HeroSection.findOne();
  if (heroSection) {
    if (heroBody.video_url && heroSection.video_url) {
      unlinkImage(`./public/${heroSection.video_url}`);
    }
    Object.assign(heroSection, heroBody, { updated_by: userId });
    await heroSection.save();
  } else {
    heroSection = await HeroSection.create({ ...heroBody, updated_by: userId });
  }
  return heroSection;
};

module.exports = {
  getHeroSection,
  updateHeroSection,
};
