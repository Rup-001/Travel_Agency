const Joi = require("joi");

const getDashboardSummary = {
  query: Joi.object().keys({
    kpiFilter: Joi.string().valid("last30", "thisMonth", "year", "all").default("all"),
    revenueFilter: Joi.string().valid("last30", "thisMonth", "year").default("last30"),
    bookingsFilter: Joi.string().valid("last30", "thisMonth", "year").default("last30"),
    salesTypeFilter: Joi.string().valid("last30", "thisMonth", "year", "all").default("all"),
    performanceFilter: Joi.string().valid("last30", "thisMonth", "year", "all").default("all"),
  }),
};

module.exports = {
  getDashboardSummary,
};
