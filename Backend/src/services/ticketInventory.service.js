const httpStatus = require("http-status");
const XLSX = require("xlsx");
const { TicketInventory, Destination } = require("../models");
const ApiError = require("../utils/ApiError");

/**
 * Create a ticket inventory
 */
const createTicketInventory = async (inventoryBody) => {
  return TicketInventory.create(inventoryBody);
};

/**
 * Query for ticket inventory
 */
const queryTicketInventory = async (filter, options) => {
  const inventory = await TicketInventory.paginate(filter, options);
  return inventory;
};

/**
 * Get ticket inventory summary with search and pagination
 */
const getTicketInventorySummary = async (search = "", options = {}) => {
  const page = parseInt(options.page, 10) || 1;
  const limit = parseInt(options.limit, 10) || 10;
  const skip = (page - 1) * limit;

  const matchQuery = {};
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
        },
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
  getTicketInventorySummary,
};
