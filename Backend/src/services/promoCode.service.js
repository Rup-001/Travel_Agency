const httpStatus = require("http-status");
const { PromoCode } = require("../models");
const ApiError = require("../utils/ApiError");

/**
 * Create a promo code
 */
const createPromoCode = async (promoBody) => {
  if (await PromoCode.findOne({ code: promoBody.code })) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Promo code already exists");
  }
  return PromoCode.create(promoBody);
};

/**
 * Query for promo codes with search
 */
const queryPromoCodes = async (filter, options) => {
  const query = { ...filter };
  if (query.search) {
    query.code = { $regex: query.search, $options: "i" };
    delete query.search;
  }
  
  const result = await PromoCode.paginate(query, options);
  // Manual population after pagination to be 100% sure
  result.results = await PromoCode.populate(result.results, { path: "applicableDestinations" });
  return result;
};

/**
 * Get promo code by id
 */
const getPromoCodeById = async (id) => {
  return PromoCode.findById(id).populate("applicableDestinations");
};

/**
 * Get promo code by code string
 */
const getPromoCodeByCode = async (code) => {
  return PromoCode.findOne({ code: code, status: "active" }).populate("applicableDestinations");
};

/**
 * Update promo code
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
 * Validate promo code
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

  if (promoCode.usageLimit !== null && promoCode.usedCount >= promoCode.usageLimit) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Promo code usage limit reached");
  }

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
