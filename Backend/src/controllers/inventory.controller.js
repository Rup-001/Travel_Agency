const httpStatus = require("http-status");
const XLSX = require("xlsx");
const catchAsync = require("../utils/catchAsync");
const ApiError = require("../utils/ApiError");
const response = require("../config/response");
const { inventoryService } = require("../services");

const uploadTickets = catchAsync(async (req, res) => {
  const { destinationId } = req.body;
  const uploadedBy = req.user.id;

  if (!req.file) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Excel file is required");
  }

  // Read excel buffer
  const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  // Convert to JSON
  const rows = XLSX.utils.sheet_to_json(sheet);
  console.log("Parsed Rows Sample:", rows.slice(0, 2));

  if (rows.length === 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, "The Excel file is empty");
  }

  // Extract ticket numbers and check for duplicates WITHIN the Excel
  const ticketNumbersInExcel = rows
    .map((row) => {
      // Use a more flexible way to find the ticket number column (case-insensitive)
      const key = Object.keys(row).find((k) => k.toLowerCase().trim() === "ticketnumber");
      return key ? String(row[key]).trim() : null;
    })
    .filter((num) => num !== null);

  console.log("Extracted Ticket Numbers:", ticketNumbersInExcel);

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

  // Bulk Insert with DB duplication check
  const tickets = await inventoryService.bulkCreateInventory(inventoryItems, destinationId);

  res.status(httpStatus.CREATED).json(
    response({
      message: "Tickets uploaded successfully",
      status: "OK",
      statusCode: httpStatus.CREATED,
      data: { count: tickets.length },
    })
  );
});

module.exports = {
  uploadTickets,
};
