const httpStatus = require("http-status");
const XLSX = require("xlsx");
const { TicketInventory } = require("../models");
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
 * @returns {Promise<Array>}
 */
const processTicketUpload = async (fileBuffer, destinationId, uploadedBy) => {
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
  }));

  return bulkCreateInventory(inventoryItems, destinationId);
};


const getTicketInventorySummary = async () => {
  const summary = await TicketInventory.aggregate([
    {
      $group: {
        _id: "$destinationId",           // group by destination

        totalTickets: { $sum: 1 },       // count all tickets

        availableTickets: {
          $sum: {
            $cond: [
              { $eq: ["$status", "available"] },   // if status === "available"
              1,                                    // then add 1
              0                                     // else add 0
            ]
          }
        }
      }
    },
    {
      $lookup: {
        from: "destinations",          // ← make sure this matches your actual collection name
        localField: "_id",             // the grouped destinationId
        foreignField: "_id",           // usually _id in destinations
        as: "destinationData"          // name you choose — can be "destination" too
      }
    },
    {
      $unwind: "$destinationData"      // turns [{...}] → {...}   (very important!)
    },
    {
      $addFields: {
        availablePercentage: {
          $multiply: [
            { $divide: ["$availableTickets", "$totalTickets"] },
            100
          ]
        },

        stockStatus: {
          $switch: {
            branches: [
              {
                case: { $lte: [{ $divide: ["$availableTickets", "$totalTickets"] }, 0.10] },
                then: "Critical"
              },
              {
                case: { $lte: [{ $divide: ["$availableTickets", "$totalTickets"] }, 0.20] },
                then: "Low Stock"
              }
            ],
            default: "Available"
          }
        }
      }
    },
    {
      $project: {
        _id: 0,                           // hide the mongo _id if you don't need it
        destinationId: "$_id",            // rename back to something meaningful
        destinationName: "$destinationData.name",   // pick only what you want
        // destinationCity: "$destinationData.city",   // add more fields if useful
        totalTickets: 1,
        availableTickets: 1,
        availablePercentage: { $round: ["$availablePercentage", 1] },  // nicer number
        stockStatus: 1
      }
    }
  ]);

  return summary;
}


module.exports = {
  createTicketInventory,
  queryTicketInventory,
  getTicketInventoryById,
  bulkCreateInventory,
  processTicketUpload,
  getTicketInventorySummary,
};
