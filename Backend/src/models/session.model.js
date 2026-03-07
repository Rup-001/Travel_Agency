const mongoose = require('mongoose');
const { toJSON } = require('./plugins');

const sessionSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    token: {
      type: String,
      required: true,
      index: true,
    },
    browser: {
      type: String,
      default: 'Unknown',
    },
    os: {
      type: String,
      default: 'Unknown',
    },
    device: {
      type: String,
      default: 'Desktop',
    },
    ipAddress: {
      type: String,
      default: 'Unknown',
    },
    lastActive: {
      type: Date,
      default: Date.now,
    },
    isCurrent: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// add plugin that converts mongoose to json
sessionSchema.plugin(toJSON);

/**
 * @typedef Session
 */
const Session = mongoose.model('Session', sessionSchema);

module.exports = Session;
