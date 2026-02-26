const httpStatus = require("http-status");
const catchAsync = require("../utils/catchAsync");
const response = require("../config/response");
const { ticketInventoryService } = require("../services");

const uploadTickets = catchAsync(async (req, res) => {
  const { destinationId } = req.body;
  const uploadedBy = req.user.id;

  const tickets = await ticketInventoryService.processTicketUpload(
    req.file.buffer,
    destinationId,
    uploadedBy
  );

  res.status(httpStatus.CREATED).json(
    response({
      message: "Tickets uploaded successfully",
      status: "OK",
      statusCode: httpStatus.CREATED,
      data: { count: tickets.length },
    })
  );
});

const getTicketInventories = catchAsync(async (req, res) => {
  // Added standard CRUD to match architecture
  const result = await ticketInventoryService.queryTicketInventory({}, {});
  res.status(httpStatus.OK).json(
    response({
      message: "Ticket Inventories",
      status: "OK",
      statusCode: httpStatus.OK,
      data: result,
    })
  );
});
const getTicketInventoriesSummary = catchAsync(async (req, res) => {
  // Added standard CRUD to match architecture
  const result = await ticketInventoryService.getTicketInventorySummary({}, {});
  res.status(httpStatus.OK).json(
    response({
      message: "Ticket Inventories summary",
      status: "OK",
      statusCode: httpStatus.OK,
      data: result,
    })
  );
});

module.exports = {
  uploadTickets,
  getTicketInventories,
  getTicketInventoriesSummary
};
