const httpStatus = require("http-status");
const { Destination } = require("../models");
const ApiError = require("../utils/ApiError");

/**
 * Create a destination
 * @param {Object} destinationBody
 * @returns {Promise<Destination>}
 */
const createDestination = async (destinationBody) => {
  if (await Destination.findOne({ name: destinationBody.name })) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Destination name already exists");
  }

  if (destinationBody.type === "combo" && destinationBody.subDestinations) {
    const uniqueSubs = [...new Set(destinationBody.subDestinations.map((id) => id.toString()))];

    if (uniqueSubs.length !== destinationBody.subDestinations.length) {
      throw new ApiError(httpStatus.BAD_REQUEST, "Duplicate sub-destinations found in the request");
    }

    if (uniqueSubs.length < 2) {
      throw new ApiError(httpStatus.BAD_REQUEST, "A combo must have at least 2 unique sub-destinations");
    }

    const existingCombo = await Destination.findOne({
      type: "combo",
      subDestinations: { $size: uniqueSubs.length, $all: uniqueSubs },
    });

    if (existingCombo) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        `A combo package with these destinations already exists: ${existingCombo.name}`
      );
    }
    destinationBody.subDestinations = uniqueSubs;

    // 🚩 AUTO-CALCULATE Regular Prices for Combo
    const subDestinationsData = await Destination.find({ _id: { $in: uniqueSubs } });
    
    const totalAdultRegularPrice = subDestinationsData.reduce((sum, dest) => sum + (dest.adultPrice || 0), 0);
    const totalChildRegularPrice = subDestinationsData.reduce((sum, dest) => sum + (dest.childPrice || 0), 0);
    
    destinationBody.adultRegularPrice = totalAdultRegularPrice;
    destinationBody.childRegularPrice = totalChildRegularPrice;

    // Handle Combo Extra Discount Logic
    if (destinationBody.comboDiscountPercentage > 0) {
      // 1. If admin gives a percentage, calculate the prices automatically
      destinationBody.adultPrice = Math.round(totalAdultRegularPrice * (1 - destinationBody.comboDiscountPercentage / 100));
      destinationBody.childPrice = Math.round(totalChildRegularPrice * (1 - destinationBody.comboDiscountPercentage / 100));
    } else if (destinationBody.adultPrice < totalAdultRegularPrice) {
      // 2. If admin gives a price directly, calculate the percentage
      destinationBody.comboDiscountPercentage = Math.round(
        ((totalAdultRegularPrice - destinationBody.adultPrice) / totalAdultRegularPrice) * 100
      );
    }

    // Set overall discount percentage (sum of individual discounts + combo discount)
    // We can show the total saving from the original REGULAR prices
    const totalOriginalAdultPrice = subDestinationsData.reduce((sum, dest) => sum + (dest.adultRegularPrice || dest.adultPrice || 0), 0);
    if (destinationBody.adultPrice < totalOriginalAdultPrice) {
      destinationBody.discountPercentage = Math.round(
        ((totalOriginalAdultPrice - destinationBody.adultPrice) / totalOriginalAdultPrice) * 100
      );
    }
  }

  const destination = await Destination.create(destinationBody);
  return destination.populate("subDestinations");
};

/**
 * Query for destinations
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {number} [options.limit] - Maximum number of results per page (default = 10)
 * @param {number} [options.page] - Current page (default = 1)
 * @returns {Promise<QueryResult>}
 */
const queryDestinations = async (filter, options) => {
  const destinations = await Destination.paginate(filter, { ...options, populate: "subDestinations" });
  return destinations;
};

/**
 * Get destination by id
 * @param {ObjectId} id
 * @returns {Promise<Destination>}
 */
const getDestinationById = async (id) => {
  return Destination.findById(id).populate("subDestinations");
};

/**
 * Update destination by id
 * @param {ObjectId} destinationId
 * @param {Object} updateBody
 * @returns {Promise<Destination>}
 */
const updateDestinationById = async (destinationId, updateBody) => {
  const destination = await Destination.findById(destinationId);
  if (!destination) {
    throw new ApiError(httpStatus.NOT_FOUND, "Destination not found");
  }
  if (updateBody.name && (await Destination.findOne({ name: updateBody.name, _id: { $ne: destinationId } }))) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Destination name already exists");
  }

  if (updateBody.subDestinations) {
    const uniqueSubs = [...new Set(updateBody.subDestinations.map((id) => id.toString()))];

    if (uniqueSubs.length !== updateBody.subDestinations.length) {
      throw new ApiError(httpStatus.BAD_REQUEST, "Duplicate sub-destinations found in the request");
    }

    // 1. Prevent self-reference
    if (uniqueSubs.includes(destinationId.toString())) {
      throw new ApiError(httpStatus.BAD_REQUEST, "A destination cannot be a sub-destination of itself");
    }

    if (uniqueSubs.length < 2) {
      throw new ApiError(httpStatus.BAD_REQUEST, "A combo must have at least 2 unique sub-destinations");
    }

    // 2. Check for duplicate combo (excluding current one)
    const existingCombo = await Destination.findOne({
      _id: { $ne: destinationId },
      type: "combo",
      subDestinations: { $size: uniqueSubs.length, $all: uniqueSubs },
    });

    if (existingCombo) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        `Another combo package with these destinations already exists: ${existingCombo.name}`
      );
    }
    updateBody.subDestinations = uniqueSubs;

    // 🚩 AUTO-CALCULATE Regular Prices for Combo during Update
    const subDestinationsData = await Destination.find({ _id: { $in: uniqueSubs } });
    
    const totalAdultRegularPrice = subDestinationsData.reduce((sum, dest) => sum + (dest.adultPrice || 0), 0);
    const totalChildRegularPrice = subDestinationsData.reduce((sum, dest) => sum + (dest.childPrice || 0), 0);
    
    updateBody.adultRegularPrice = totalAdultRegularPrice;
    updateBody.childRegularPrice = totalChildRegularPrice;

    // Handle Combo Extra Discount Logic
    const comboDiscPerc = updateBody.comboDiscountPercentage || destination.comboDiscountPercentage || 0;
    
    if (updateBody.comboDiscountPercentage > 0) {
      updateBody.adultPrice = Math.round(totalAdultRegularPrice * (1 - updateBody.comboDiscountPercentage / 100));
      updateBody.childPrice = Math.round(totalChildRegularPrice * (1 - updateBody.comboDiscountPercentage / 100));
    } else {
      const finalAdultPrice = updateBody.adultPrice || destination.adultPrice;
      if (finalAdultPrice < totalAdultRegularPrice) {
        updateBody.comboDiscountPercentage = Math.round(
          ((totalAdultRegularPrice - finalAdultPrice) / totalAdultRegularPrice) * 100
        );
      }
    }

    // Set overall discount percentage
    const totalOriginalAdultPrice = subDestinationsData.reduce((sum, dest) => sum + (dest.adultRegularPrice || dest.adultPrice || 0), 0);
    const finalAdultPriceForTotal = updateBody.adultPrice || destination.adultPrice;
    if (finalAdultPriceForTotal < totalOriginalAdultPrice) {
      updateBody.discountPercentage = Math.round(
        ((totalOriginalAdultPrice - finalAdultPriceForTotal) / totalOriginalAdultPrice) * 100
      );
    }
  }

  Object.assign(destination, updateBody);
  await destination.save();
  return destination.populate("subDestinations");
};

/**
 * Delete destination by id
 * @param {ObjectId} destinationId
 * @returns {Promise<Destination>}
 */
const deleteDestinationById = async (destinationId) => {
  const destination = await getDestinationById(destinationId);
  if (!destination) {
    throw new ApiError(httpStatus.NOT_FOUND, "Destination not found");
  }
  await destination.deleteOne();
  return destination;
};

module.exports = {
  createDestination,
  queryDestinations,
  getDestinationById,
  updateDestinationById,
  deleteDestinationById,
};
