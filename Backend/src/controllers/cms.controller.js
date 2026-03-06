const httpStatus = require("http-status");
const ApiError = require("../utils/ApiError");
const catchAsync = require("../utils/catchAsync");
const response = require("../config/response");
const { cmsService } = require("../services");

const getPage = catchAsync(async (req, res) => {
  const page = await cmsService.getPageBySlug(req.params.slug);
  if (!page) {
    throw new ApiError(httpStatus.NOT_FOUND, "Page not found");
  }
  res.status(httpStatus.OK).json(
    response({
      message: "CMS Page Data",
      status: "OK",
      statusCode: httpStatus.OK,
      data: page,
    })
  );
});

const updatePage = catchAsync(async (req, res) => {
  const slug = req.params.slug;
  const updateBody = { ...req.body, updatedBy: req.user.id };
  const page = await cmsService.updatePageBySlug(slug, updateBody);
  res.status(httpStatus.OK).json(
    response({
      message: "CMS Page Updated Successfully",
      status: "OK",
      statusCode: httpStatus.OK,
      data: page,
    })
  );
});

const getPages = catchAsync(async (req, res) => {
  const result = await cmsService.getAllPages();
  res.status(httpStatus.OK).json(
    response({
      message: "All CMS Pages",
      status: "OK",
      statusCode: httpStatus.OK,
      data: result,
    })
  );
});

module.exports = {
  getPage,
  updatePage,
  getPages,
};
