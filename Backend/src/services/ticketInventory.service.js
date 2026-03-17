const httpStatus = require("http-status");
const XLSX = require("xlsx");
const { TicketInventory, Destination } = require("../models");
const ApiError = require("../utils/ApiError");

/**
 * Create a ticket inventory
 * @param {Object} inventoryBody
 * @returns {Promise<TicketInventory>}
 */
const createTicketInventory = async (inventoryBody) => {
  return TicketInventory.create(inventoryBody);
};

/**
 * Query for ticket inventory
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @returns {Promise<QueryResult>}
 */
const queryTicketInventory = async (filter, options) => {
  const inventory = await TicketInventory.paginate(filter, options);
  return inventory;
};

/**
 * Get ticket inventory by id
 * @param {ObjectId} id
 * @returns {Promise<TicketInventory>}
 */
const getTicketInventoryById = async (id) => {
  return TicketInventory.findById(id);
};

/**
 * Bulk create ticket inventory with duplication checks for a specific destination
 * @param {Array} inventoryItems
 * @param {string} destinationId
 * @returns {Promise<Object>}
 */
const bulkCreateInventory = async (inventoryItems, destinationId) => {
  const ticketNumbers = inventoryItems.map((item) => item.ticketNumber);

  // Check if any of these ticket numbers already exist in the DB FOR THIS DESTINATION
  const existingTickets = await TicketInventory.find({
    destinationId,
    ticketNumber: { $in: ticketNumbers },
  });

  if (existingTickets.length > 0) {
    const existingNumbers = existingTickets.map((t) => t.ticketNumber);
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Duplicate tickets found in database for this destination: ${existingNumbers.join(", ")}`
    );
  }

  return TicketInventory.insertMany(inventoryItems);
};

/**
 * Process Excel file and upload tickets
 * @param {Buffer} fileBuffer
 * @param {string} destinationId
 * @param {string} uploadedBy
 * @param {Date} expiryDate
 * @returns {Promise<Array>}
 */
const processTicketUpload = async (fileBuffer, destinationId, uploadedBy, expiryDate) => {
  // Read excel buffer
  const workbook = XLSX.read(fileBuffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  // Convert to JSON
  const rows = XLSX.utils.sheet_to_json(sheet);

  if (rows.length === 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, "The Excel file is empty");
  }

  // Extract ticket numbers and check for duplicates WITHIN the Excel
  const ticketNumbersInExcel = rows
    .map((row) => {
      const key = Object.keys(row).find((k) => k.toLowerCase().trim() === "ticket number");
      return key ? String(row[key]).trim() : null;
    })
    .filter((num) => num !== null);

  if (ticketNumbersInExcel.length === 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, "No 'ticketNumber' column found in Excel");
  }

  const uniqueNumbers = new Set();
  const duplicatesInExcel = [];

  ticketNumbersInExcel.forEach((num) => {
    if (uniqueNumbers.has(num)) {
      duplicatesInExcel.push(num);
    } else {
      uniqueNumbers.add(num);
    }
  });

  if (duplicatesInExcel.length > 0) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Duplicate ticket numbers found in Excel: ${[...new Set(duplicatesInExcel)].join(", ")}`
    );
  }

  // Prepare data for DB
  const inventoryItems = ticketNumbersInExcel.map((ticketNumber) => ({
    destinationId,
    ticketNumber,
    uploadedBy,
    expiryDate,
  }));

  return bulkCreateInventory(inventoryItems, destinationId);
};

/**
 * Get ticket inventory summary with search and pagination
 */
const getTicketInventorySummary = async (search = "", options = {}) => {
  const page = parseInt(options.page, 10) || 1;
  const limit = parseInt(options.limit, 10) || 10;
  const skip = (page - 1) * limit;

  const matchQuery = { type: "single" };
  if (search) {
    matchQuery.name = { $regex: search, $options: "i" };
  }

  // Get total results for pagination
  const totalResults = await Destination.countDocuments(matchQuery);
  const totalPages = Math.ceil(totalResults / limit);

  const summary = await Destination.aggregate([
    { $match: matchQuery },
    { $sort: { name: 1 } },
    { $skip: skip },
    { $limit: limit },
    {
      $lookup: {
        from: "ticketinventories",
        localField: "_id",
        foreignField: "destinationId",
        as: "tickets"
      }
    },
    {
      $addFields: {
        totalTickets: { $size: "$tickets" },
        availableTickets: {
          $size: {
            $filter: {
              input: "$tickets",
              as: "t",
              cond: { $eq: ["$$t.status", "available"] }
            }
          }
        }
      }
    },
    {
      $addFields: {
        availablePercentage: {
          $cond: [
            { $eq: ["$totalTickets", 0] },
            0,
            { $multiply: [{ $divide: ["$availableTickets", "$totalTickets"] }, 100] }
          ]
        }
      }
    },
    {
      $addFields: {
        stockStatus: {
          $switch: {
            branches: [
              { case: { $eq: ["$totalTickets", 0] }, then: "No tickets uploaded" },
              { case: { $lte: ["$availablePercentage", 10] }, then: "Critical" },
              { case: { $lte: ["$availablePercentage", 20] }, then: "Low Stock" }
            ],
            default: "Available"
          }
        }
      }
    },
    {
      $project: {
        _id: 0,
        destinationId: "$_id",
        destinationName: "$name",
        totalTickets: 1,
        availableTickets: 1,
        availablePercentage: { $round: ["$availablePercentage", 1] },
        stockStatus: 1
      }
    }
  ]);

  return {
    results: summary,
    page,
    limit,
    totalPages,
    totalResults
  };
};

module.exports = {
  createTicketInventory,
  queryTicketInventory,
  getTicketInventoryById,
  bulkCreateInventory,
  processTicketUpload,
  getTicketInventorySummary,
};
