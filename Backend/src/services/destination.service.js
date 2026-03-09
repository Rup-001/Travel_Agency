const httpStatus = require("http-status");
const { Destination, Booking } = require("../models");
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

    // 🚩 AUTO-CALCULATE Combo Previous Prices (sum of sub-destinations' current prices)
    const subDestinationsData = await Destination.find({ _id: { $in: uniqueSubs } });
    
    const totalAdultCurrentPrice = subDestinationsData.reduce((sum, dest) => sum + (dest.adultCurrentPrice || 0), 0);
    const totalChildCurrentPrice = subDestinationsData.reduce((sum, dest) => sum + (dest.childCurrentPrice || 0), 0);
    
    destinationBody.comboAdultPreviousPrice = totalAdultCurrentPrice;
    destinationBody.comboChildPreviousPrice = totalChildCurrentPrice;

    // Reset single prices for combo if needed, or keep them
    destinationBody.adultPreviousPrice = 0;
    destinationBody.adultCurrentPrice = 0;
    destinationBody.childPreviousPrice = 0;
    destinationBody.childCurrentPrice = 0;
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
  if (filter.type === "all") {
    delete filter.type;
  }
  if (filter.search) {
    filter.$or = [
      { name: { $regex: filter.search, $options: "i" } },
      // { subTitle: { $regex: filter.search, $options: "i" } },
    ];
    delete filter.search;
  }
  const destinations = await Destination.paginate(filter, { ...options, populate: "subDestinations" });
  return destinations;
};

/**
 * Get popular destinations (Sorted by booking count, from most popular to least)
 * @returns {Promise<Destination[]>}
 */
const getPopularDestinations = async () => {
  const popularStats = await Booking.aggregate([
    { $match: { status: "paid" } },
    { $group: { _id: "$destination", bookingCount: { $sum: 1 } } },
    { $sort: { bookingCount: -1 } },
  ]);

  const statsMap = popularStats.reduce((acc, stat) => {
    acc[stat._id.toString()] = stat.bookingCount;
    return acc;
  }, {});

  const destinations = await Destination.find({ status: "active" })
    .populate("subDestinations");

  // Sort by bookingCount (from statsMap) and then by name
  return destinations.sort((a, b) => {
    const countA = statsMap[a._id.toString()] || 0;
    const countB = statsMap[b._id.toString()] || 0;
    if (countB !== countA) {
      return countB - countA;
    }
    return a.name.localeCompare(b.name);
  });
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

    // 🚩 AUTO-CALCULATE Combo Previous Prices during Update
    const subDestinationsData = await Destination.find({ _id: { $in: uniqueSubs } });
    
    const totalAdultCurrentPrice = subDestinationsData.reduce((sum, dest) => sum + (dest.adultCurrentPrice || 0), 0);
    const totalChildCurrentPrice = subDestinationsData.reduce((sum, dest) => sum + (dest.childCurrentPrice || 0), 0);
    
    updateBody.comboAdultPreviousPrice = totalAdultCurrentPrice;
    updateBody.comboChildPreviousPrice = totalChildCurrentPrice;

    // Reset single prices for combo if type is updated to combo or if already combo
    updateBody.adultPreviousPrice = 0;
    updateBody.adultCurrentPrice = 0;
    updateBody.childPreviousPrice = 0;
    updateBody.childCurrentPrice = 0;
    updateBody.media = [];
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
  getPopularDestinations,
  getDestinationById,
  updateDestinationById,
  deleteDestinationById,
};
