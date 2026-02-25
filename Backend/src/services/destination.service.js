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
  return Destination.create(destinationBody);
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
  const destination = await getDestinationById(destinationId);
  if (!destination) {
    throw new ApiError(httpStatus.NOT_FOUND, "Destination not found");
  }
  if (updateBody.name && (await Destination.findOne({ name: updateBody.name, _id: { $ne: destinationId } }))) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Destination name already exists");
  }
  Object.assign(destination, updateBody);
  await destination.save();
  return destination;
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
