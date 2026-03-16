const httpStatus = require("http-status");
const pick = require("../utils/pick");
const ApiError = require("../utils/ApiError");
const catchAsync = require("../utils/catchAsync");
const response = require("../config/response");
const { promoCodeService } = require("../services");

const formatPromoCodeSummary = (promo) => {
  const applicableDestinations = promo.applicableDestinations || [];
  const destinationNames = promo.isApplicableAll
    ? []
    : (applicableDestinations.map((dest) => {
        // Handle both populated and unpopulated cases
        if (typeof dest === "object" && dest !== null) {
          return dest.name;
        }
        return null;
      }).filter(Boolean));
  
  const destinationLabel = promo.isApplicableAll
    ? "All destinations"
    : `${destinationNames.length} destination${destinationNames.length === 1 ? "" : "s"}`;

  return {
    id: promo._id || promo.id,
    code: promo.code,
    description: promo.description,
    discount: {
      type: promo.discountType,
      amount: promo.discountAmount,
    },
    destinations: {
      isApplicableAll: promo.isApplicableAll,
      label: destinationLabel,
      names: destinationNames,
    },
    validPeriod: {
      from: promo.validFrom,
      to: promo.validUntil,
    },
    usage: {
      used: promo.usedCount,
      limit: promo.usageLimit,
      label: promo.usageLimit ? `${promo.usedCount}/${promo.usageLimit}` : `${promo.usedCount} used`,
    },
    status: promo.status,
  };
};

const createPromoCode = catchAsync(async (req, res) => {
  const promoCode = await promoCodeService.createPromoCode(req.body);
  res.status(httpStatus.CREATED).json(
    response({
      message: "Promo code created",
      status: "OK",
      statusCode: httpStatus.CREATED,
      data: { promoCode },
    })
  );
});

const getPromoCodes = catchAsync(async (req, res) => {
  const filter = pick(req.query, ["code", "status", "search"]);
  const options = pick(req.query, ["sortBy", "limit", "page"]);
  const result = await promoCodeService.queryPromoCodes(filter, options);
  const simplifiedResults = result.results.map(formatPromoCodeSummary);
  res.status(httpStatus.OK).json(
    response({
      message: "All Promo Codes",
      status: "OK",
      statusCode: httpStatus.OK,
      data: { ...result, results: simplifiedResults },
    })
  );
});

const getPromoCode = catchAsync(async (req, res) => {
  const promoCode = await promoCodeService.getPromoCodeById(req.params.promoId);
  if (!promoCode) {
    throw new ApiError(httpStatus.NOT_FOUND, "Promo code not found");
  }
  res.status(httpStatus.OK).json(
    response({
      message: "Promo Code Details",
      status: "OK",
      statusCode: httpStatus.OK,
      data: promoCode,
    })
  );
});

const updatePromoCode = catchAsync(async (req, res) => {
  const promoCode = await promoCodeService.updatePromoCodeById(req.params.promoId, req.body);
  res.status(httpStatus.OK).json(
    response({
      message: "Promo Code Updated",
      status: "OK",
      statusCode: httpStatus.OK,
      data: promoCode,
    })
  );
});

const deletePromoCode = catchAsync(async (req, res) => {
  await promoCodeService.deletePromoCodeById(req.params.promoId);
  res.status(httpStatus.OK).json(
    response({
      message: "Promo Code Deleted",
      status: "OK",
      statusCode: httpStatus.OK,
      data: {},
    })
  );
});

const getPromoCodeByCode = catchAsync(async (req, res) => {
  const promoCode = await promoCodeService.getPromoCodeByCode(req.params.code);
  if (!promoCode) {
    throw new ApiError(httpStatus.NOT_FOUND, "Promo code not found or inactive");
  }
  res.status(httpStatus.OK).json(
    response({
      message: "Promo Code Valid",
      status: "OK",
      statusCode: httpStatus.OK,
      data: promoCode,
    })
  );
});

const validatePromoCode = catchAsync(async (req, res) => {
  const { code, destinationId } = req.query;
  const promoCode = await promoCodeService.validatePromoCode(code, destinationId);
  res.status(httpStatus.OK).json(
    response({
      message: "Promo code is valid",
      status: "OK",
      statusCode: httpStatus.OK,
      data: { discountAmount: promoCode.discountAmount },
    })
  );
});

module.exports = {
  createPromoCode,
  getPromoCodes,
  getPromoCode,
  getPromoCodeByCode,
  updatePromoCode,
  deletePromoCode,
  validatePromoCode,
};
