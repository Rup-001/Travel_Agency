const httpStatus = require("http-status");
const { Inventory } = require("../models");
const ApiError = require("../utils/ApiError");

/**
 * Create an inventory
 * @param {Object} inventoryBody
 * @returns {Promise<Inventory>}
 */
const createInventory = async (inventoryBody) => {
  return Inventory.create(inventoryBody);
};

/**
 * Query for inventory
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @returns {Promise<QueryResult>}
 */
const queryInventory = async (filter, options) => {
  const inventory = await Inventory.paginate(filter, options);
  return inventory;
};

/**
 * Get inventory by id
 * @param {ObjectId} id
 * @returns {Promise<Inventory>}
 */
const getInventoryById = async (id) => {
  return Inventory.findById(id);
};

/**
 * Bulk create inventory with duplication checks
 * @param {Array} inventoryItems
 * @param {String} destinationId
 * @returns {Promise<Object>}
 */
const bulkCreateInventory = async (inventoryItems, destinationId) => {
  const ticketNumbers = inventoryItems.map((item) => item.ticketNumber);

  // Check if any of these ticket numbers already exist in the DB for this destination
  // If your business rule is that ticket numbers must be unique across the whole system, remove the destinationId filter
  const existingTickets = await Inventory.find({
    ticketNumber: { $in: ticketNumbers },
  });

  if (existingTickets.length > 0) {
    const existingNumbers = existingTickets.map((t) => t.ticketNumber);
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Duplicate tickets found in database: ${existingNumbers.join(", ")}`
    );
  }

  return Inventory.insertMany(inventoryItems);
};

module.exports = {
  createInventory,
  queryInventory,
  getInventoryById,
  bulkCreateInventory,
};
