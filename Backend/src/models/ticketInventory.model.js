const mongoose = require("mongoose");
const { toJSON, paginate } = require("./plugins");

const ticketInventorySchema = mongoose.Schema(
  {
    destinationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Destination",
      required: true,
    },
    ticketNumber: {
      type: String,
      required: true,
      // Removed global unique: true to allow same number in different destinations
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["available", "reserved", "sold"],
      default: "available",
    },
    expiryDate: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Add compound unique index: ticketNumber must be unique PER destinationId
ticketInventorySchema.index({ destinationId: 1, ticketNumber: 1 }, { unique: true });

// add plugin that converts mongoose to json
ticketInventorySchema.plugin(toJSON);
ticketInventorySchema.plugin(paginate);

/**
 * @typedef TicketInventory
 */
const TicketInventory = mongoose.model("TicketInventory", ticketInventorySchema);

module.exports = TicketInventory;
