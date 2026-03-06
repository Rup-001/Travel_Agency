const httpStatus = require("http-status");
const { CMS } = require("../models");
const ApiError = require("../utils/ApiError");

/**
 * Get CMS page by slug
 * @param {string} slug
 * @returns {Promise<CMS>}
 */
const getPageBySlug = async (slug) => {
  return CMS.findOne({ slug: slug.toLowerCase() });
};

/**
 * Create or Update CMS page (Upsert)
 * @param {string} slug
 * @param {Object} updateBody
 * @returns {Promise<CMS>}
 */
const updatePageBySlug = async (slug, updateBody) => {
  const page = await CMS.findOneAndUpdate(
    { slug: slug.toLowerCase() },
    { ...updateBody, slug: slug.toLowerCase() },
    { new: true, upsert: true, runValidators: true }
  );
  return page;
};

/**
 * Get all pages (Admin only)
 * @returns {Promise<CMS[]>}
 */
const getAllPages = async () => {
  return CMS.find().sort({ pageTitle: 1 });
};

module.exports = {
  getPageBySlug,
  updatePageBySlug,
  getAllPages,
};
