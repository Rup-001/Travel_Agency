const httpStatus = require("http-status");
const pick = require("../utils/pick");
const ApiError = require("../utils/ApiError");
const catchAsync = require("../utils/catchAsync");
const response = require("../config/response");
const { destinationService } = require("../services");


const unlinkImage = require("../common/unlinkImage");
const path = require("path");

const createDestination = catchAsync(async (req, res) => {
  const destinationData = { ...req.body };
  const mediaPaths = [];

  try {
    if (req.files?.media?.length > 0) {
      req.files.media.forEach((file) => {
        mediaPaths.push(`/uploads/destinations/${file.filename}`);
      });

      if (mediaPaths.length > 5) {
        throw new ApiError(400, "Total media files cannot exceed 5");
      }
      destinationData.media = mediaPaths;
    }

    const destination = await destinationService.createDestination(destinationData);

    const typeLabel = destination.type.charAt(0).toUpperCase() + destination.type.slice(1);

    res.status(httpStatus.CREATED).json(
      response({
        message: `${typeLabel} Destination created`,
        status: "OK",
        statusCode: httpStatus.CREATED,
        data: { destination },
      })
    );
  } catch (error) {
    // 🚩 ROLLBACK: Delete uploaded files if something went wrong
    if (mediaPaths.length > 0) {
      const fullPaths = mediaPaths.map((p) => path.join(__dirname, "../../public", p));
      unlinkImage(fullPaths);
    }
    throw error;
  }
});


const getDestinations = catchAsync(async (req, res) => {
  const filter = pick(req.query, ["name", "type", "status", "search"]);
  const options = pick(req.query, ["sortBy", "limit", "page"]);
  const result = await destinationService.queryDestinations(filter, options);
  res.status(httpStatus.OK).json(
    response({
      message: "All Destinations",
      status: "OK",
      statusCode: httpStatus.OK,
      data: result,
    })
  );
});

const getDestinationList = catchAsync(async (req, res) => {
  const result = await destinationService.getDestinationList();
  res.status(httpStatus.OK).json(
    response({
      message: "Destination List (Name & ID)",
      status: "OK",
      statusCode: httpStatus.OK,
      data: result,
    })
  );
});
const getDestinationListSingle = catchAsync(async (req, res) => {
  const result = await destinationService.getDestinationListSingle();
  res.status(httpStatus.OK).json(
    response({
      message: "Destination List (Name & ID)",
      status: "OK",
      statusCode: httpStatus.OK,
      data: result,
    })
  );
});

const getPopularDestinations = catchAsync(async (req, res) => {
  const result = await destinationService.getPopularDestinations();
  res.status(httpStatus.OK).json(
    response({
      message: "Popular Destinations",
      status: "OK",
      statusCode: httpStatus.OK,
      data: result,
    })
  );
});


const getDestination = catchAsync(async (req, res) => {
  const destination = await destinationService.getDestinationById(req.params.destinationId);
  if (!destination) {
    throw new ApiError(httpStatus.NOT_FOUND, "Destination not found");
  }
  res.status(httpStatus.OK).json(
    response({
      message: "Destination Details",
      status: "OK",
      statusCode: httpStatus.OK,
      data: destination,
    })
  );
});



const updateDestination = catchAsync(async (req, res) => {
  const destinationId = req.params.destinationId;
  const destination = await destinationService.getDestinationById(destinationId);

  if (!destination) {
    throw new ApiError(httpStatus.NOT_FOUND, "Destination not found");
  }

  const updateData = { ...req.body };
  let mediaToRemove = req.body.mediaToRemove || [];

  // Normalize mediaToRemove to an array
  if (typeof mediaToRemove === "string") {
    mediaToRemove = [mediaToRemove];
  }

  const newMediaPaths = [];
  if (req.files?.media?.length > 0) {
    req.files.media.forEach((file) => {
      newMediaPaths.push(`/uploads/destinations/${file.filename}`);
    });
  }

  try {
    // 1. Start with current media
    let currentMedia = destination.media || [];

    // 2. Remove specified files
    let updatedMedia = currentMedia.filter((m) => !mediaToRemove.includes(m));

    // 3. Add new uploads
    updatedMedia = [...updatedMedia, ...newMediaPaths];

    // 4. Validate limit
    if (updatedMedia.length > 5) {
      throw new ApiError(400, "Total media files cannot exceed 5");
    }

    updateData.media = updatedMedia;
    delete updateData.mediaToRemove; // Don't save this field to DB

    const updated = await destinationService.updateDestinationById(destinationId, updateData);

    // ✅ SUCCESS: Now we can safely delete the 'mediaToRemove' files from disk
    if (mediaToRemove.length > 0) {
      const fullPathsToRemove = mediaToRemove.map((p) => path.join(__dirname, "../../public", p));
      unlinkImage(fullPathsToRemove);
    }

    res.status(httpStatus.OK).json(
      response({
        message: "Destination Updated",
        status: "OK",
        statusCode: httpStatus.OK,
        data: updated,
      })
    );
  } catch (error) {
    // 🚩 ROLLBACK: Delete NEWLY uploaded files if the process failed
    if (newMediaPaths.length > 0) {
      const fullPathsToRollback = newMediaPaths.map((p) => path.join(__dirname, "../../public", p));
      unlinkImage(fullPathsToRollback);
    }
    throw error;
  }
});

const deleteDestination = catchAsync(async (req, res) => {
  await destinationService.deleteDestinationById(req.params.destinationId);
  res.status(httpStatus.OK).json(
    response({
      message: "Destination Deleted",
      status: "OK",
      statusCode: httpStatus.OK,
      data: {},
    })
  );
});

module.exports = {
  createDestination,
  getDestinations,
  getPopularDestinations,
  getDestination,
  updateDestination,
  deleteDestination,
  getDestinationList,
  getDestinationListSingle
};
