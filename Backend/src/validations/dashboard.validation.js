const Joi = require("joi");

const getDashboardSummary = {
  query: Joi.object().keys({
    kpiFilter: Joi.string().valid("last30", "thisMonth", "year", "all"),
    recentbooking: Joi.string().valid("true", "false", "all"),
    lowticketralert: Joi.string().valid("true", "false", "all"),
    topperformingdestination: Joi.string().valid("last30", "thisMonth", "year", "monthly", "all", "true", "false"),
    underperformingdestination: Joi.string().valid("last30", "thisMonth", "year", "monthly", "all", "true", "false"),
    customerdemograph: Joi.string().valid("true", "false", "all"),
  }),
};

const getRevenueTrend = {
  query: Joi.object().keys({
    filter: Joi.string().valid("last30", "thisMonth", "year", "monthly").default("last30"),
  }),
};

const getBookingTrend = {
  query: Joi.object().keys({
    filter: Joi.string().valid("last30", "thisMonth", "year", "monthly").default("last30"),
  }),
};

const getSalesByType = {
  query: Joi.object().keys({
    filter: Joi.string().valid("last30", "thisMonth", "year", "monthly", "all").default("all"),
  }),
};

module.exports = {
  getDashboardSummary,
  getRevenueTrend,
  getBookingTrend,
  getSalesByType,
};
