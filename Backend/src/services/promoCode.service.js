const httpStatus = require("http-status");
const { PromoCode } = require("../models");
const ApiError = require("../utils/ApiError");

/**
 * Create a promo code
 * @param {Object} promoBody
 * @returns {Promise<PromoCode>}
 */
const createPromoCode = async (promoBody) => {
  if (await PromoCode.findOne({ code: promoBody.code })) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Promo code already exists");
  }
  return PromoCode.create(promoBody);
};

/**
 * Query for promo codes
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @returns {Promise<QueryResult>}
 */
const queryPromoCodes = async (filter, options) => {
  const promoCodes = await PromoCode.paginate(filter, options);
  return promoCodes;
};

/**
 * Get promo code by code string (for validation during booking)
 * @param {string} code
 * @returns {Promise<PromoCode>}
 */
const getPromoCodeByCode = async (code) => {
  return PromoCode.findOne({ code: code.toUpperCase(), status: "active" });
};

/**
 * Update promo code
 * @param {ObjectId} id
 * @param {Object} updateBody
 * @returns {Promise<PromoCode>}
 */
const updatePromoCodeById = async (id, updateBody) => {
  const promoCode = await PromoCode.findById(id);
  if (!promoCode) {
    throw new ApiError(httpStatus.NOT_FOUND, "Promo code not found");
  }
  Object.assign(promoCode, updateBody);
  await promoCode.save();
  return promoCode;
};

/**
 * Delete promo code
 * @param {ObjectId} id
 * @returns {Promise<PromoCode>}
 */
const deletePromoCodeById = async (id) => {
  const promoCode = await PromoCode.findById(id);
  if (!promoCode) {
    throw new ApiError(httpStatus.NOT_FOUND, "Promo code not found");
  }
  await promoCode.deleteOne();
  return promoCode;
};

module.exports = {
  createPromoCode,
  queryPromoCodes,
  getPromoCodeByCode,
  updatePromoCodeById,
  deletePromoCodeById,
};
