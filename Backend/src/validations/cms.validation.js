const Joi = require("joi");

const createPage = {
  body: Joi.object().keys({
    pageTitle: Joi.string().required(),
    slug: Joi.string().required(),
    pageContent: Joi.string().allow(""),
    number: Joi.string().allow(""),
    status: Joi.string().valid("published", "draft").default("draft"),
  }),
};

const updatePage = {
  params: Joi.object().keys({
    slug: Joi.string(),
  }),
  body: Joi.object()
    .keys({
      pageTitle: Joi.string(),
      pageContent: Joi.string().allow(""),
      content: Joi.string().allow(""),
      number: Joi.string().allow(""),
      status: Joi.string().valid("published", "draft"),
      slug: Joi.string(),
    })
    .min(1),
};

module.exports = {
  createPage,
  updatePage,
};
