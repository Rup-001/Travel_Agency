const mongoose = require("mongoose");
const { toJSON, paginate } = require("./plugins");

const inventorySchema = mongoose.Schema(
  {
    destinationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Destination",
    required: true,
  },
  ticketNumber: {
    type: String,
    required: true,
    unique: true,
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
  
  }
    
);

// add plugin that converts mongoose to json
inventorySchema.plugin(toJSON);
inventorySchema.plugin(paginate);

const Inventory = mongoose.model("Inventory", inventorySchema);

module.exports = Inventory;
