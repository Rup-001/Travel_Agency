const { HeroSection } = require("../models");
const unlinkImage = require("../common/unlinkImage");
const redisClient = require("../config/redis");
const logger = require("../config/logger");

const REDIS_KEY_HERO = "hero_section_data";

/**
 * Get the current hero section (with Redis Cache)
 * @returns {Promise<HeroSection>}
 */
const getHeroSection = async () => {
  try {
    // 1. Redis-e check korchi data cache kora ache kina
    const cachedHero = await redisClient.get(REDIS_KEY_HERO);
    if (cachedHero) {
      logger.info("Serving Hero Section from Redis Cache");
      return JSON.parse(cachedHero);
    }
  } catch (err) {
    logger.error("Redis Get Error:", err);
  }

  // 2. Cache-e na thakle (Cache Miss), Database theke nibo
  const heroSection = await HeroSection.findOne();
  
  if (heroSection) {
    try {
      // 3. Database theke pawa data-ta Redis-e save korbo porer barer jonno
      // EX: 3600 mane 1 ghonta por cache auto expire hoye jabe
      await redisClient.set(REDIS_KEY_HERO, JSON.stringify(heroSection), {
        EX: 3600, 
      });
      logger.info("Hero Section Data Cached in Redis");
    } catch (err) {
      logger.error("Redis Set Error:", err);
    }
  }

  return heroSection;
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

  // 🚩 Cache Invalidation: Data update hole puraton cache delete kore dilam
  try {
    await redisClient.del(REDIS_KEY_HERO);
    logger.info("Hero Section Cache Cleared due to Update");
  } catch (err) {
    logger.error("Redis Delete Error:", err);
  }

  return heroSection;
};

module.exports = {
  getHeroSection,
  updateHeroSection,
};
