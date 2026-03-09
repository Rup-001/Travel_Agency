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
  const promoCodes = await PromoCode.paginate(filter, { ...options, populate: "applicableDestinations" });
  return promoCodes;
};

/**
 * Get promo code by id
 * @param {ObjectId} id
 * @returns {Promise<PromoCode>}
 */
const getPromoCodeById = async (id) => {
  return PromoCode.findById(id).populate("applicableDestinations");
};

/**
 * Get promo code by code string (for validation during booking)
 * @param {string} code
 * @returns {Promise<PromoCode>}
 */
const getPromoCodeByCode = async (code) => {
  return PromoCode.findOne({ _id: code, status: "active" }).populate("applicableDestinations");
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
  if (updateBody.code && (await PromoCode.findOne({ code: updateBody.code, _id: { $ne: id } }))) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Promo code already exists");
  }
  Object.assign(promoCode, updateBody);
  await promoCode.save();
  return promoCode.populate("applicableDestinations");
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

/**
 * Validate promo code for a specific destination
 * @param {string} code
 * @param {ObjectId} destinationId
 * @returns {Promise<PromoCode>}
 */
const validatePromoCode = async (code, destinationId) => {
  const promoCode = await PromoCode.findOne({
    code: code.toUpperCase(),
    status: "active",
    validFrom: { $lte: new Date() },
    validUntil: { $gte: new Date() },
  });

  if (!promoCode) {
    throw new ApiError(httpStatus.NOT_FOUND, "Invalid or expired promo code");
  }

  // Check usage limit if applicable
  if (promoCode.usageLimit !== null && promoCode.usedCount >= promoCode.usageLimit) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Promo code usage limit reached");
  }

  // Check if applicable to all or specific destination
  if (!promoCode.isApplicableAll) {
    const isApplicable = promoCode.applicableDestinations.some(
      (id) => id.toString() === destinationId.toString()
    );
    if (!isApplicable) {
      throw new ApiError(httpStatus.BAD_REQUEST, "Promo code is not applicable for this destination");
    }
  }

  return promoCode;
};

module.exports = {
  createPromoCode,
  queryPromoCodes,
  getPromoCodeByCode,
  updatePromoCodeById,
  deletePromoCodeById,
  validatePromoCode,
  getPromoCodeById
};
