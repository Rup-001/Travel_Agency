const httpStatus = require("http-status");
const pick = require("../utils/pick");
const ApiError = require("../utils/ApiError");
const catchAsync = require("../utils/catchAsync");
const response = require("../config/response");
const { destinationService } = require("../services");


const createDestination = catchAsync(async (req, res) => {
  const destinationData = { ...req.body };

  if (req.files?.media?.length > 0) {
    const images = [];
    const videos = [];

    req.files.media.forEach(file => {
      const filePath = `/uploads/destinations/${file.filename}`;
      if (file.mimetype.startsWith('image/')) {
        images.push(filePath);
      } else if (file.mimetype.startsWith('video/')) {
        videos.push(filePath);
      }
    });

    if (images.length + videos.length > 5) {
      throw new ApiError(400, "Total media files cannot exceed 5");
    }

    destinationData.images = images;
    destinationData.videos = videos;
  }

  const destination = await destinationService.createDestination(destinationData);

  res.status(httpStatus.CREATED).json(
    response({
      message: "Destination created",
      status: "OK",
      statusCode: httpStatus.CREATED,
      data: { destination },
    })
  );
});

// const createDestination = catchAsync(async (req, res) => {

  
//   const destinationBody = { ...req.body };
//   if (req.files?.media && req.files.media.length > 0) {
//     destinationBody.media = req.files.media.map(file => 
//       `/uploads/destinations/${file.filename}`  
//     );
//   }


//   if (req.files?.video && req.files.video.length > 0) {
//     destinationBody.video = `/uploads/destinations/${req.files.video[0].filename}`;
//   }

//   const destination = await destinationService.createDestination(destinationBody);

//   res.status(httpStatus.CREATED).json(
//     response({
//       message: "Destination created",
//       status: "OK",
//       statusCode: httpStatus.CREATED,
//       data: { destination },
//     })
//   );
// });



// const createDestination = catchAsync(async (req, res) => {
//   const destination = await destinationService.createDestination(req.body);
//   res.status(httpStatus.CREATED).json(
//     response({

//       message: "Destination created ",
//             status: "OK",
//             statusCode: httpStatus.CREATED,
//             data: {destination},

//     //   success: true,
//     // statusCode: httpStatus.CREATED,
//     // message: "Destination created successfully!!!!",
//     // data: destination,
//       // message: "Destination Created",
//       // status: "OK",
//       // statusCode: httpStatus.CREATED,
//       // data: destination,
//     })
//   );
// });

const getDestinations = catchAsync(async (req, res) => {
  const filter = pick(req.query, ["name", "type", "status"]);
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

  const updateData = { ...req.body };

  if (req.files?.media?.length > 0) {
    const images = [];
    const videos = [];

    req.files.media.forEach(file => {
      const filePath = `/uploads/destinations/${file.filename}`;
      if (file.mimetype.startsWith('image/')) {
        images.push(filePath);
      } else if (file.mimetype.startsWith('video/')) {
        videos.push(filePath);
      }
    });

    if (images.length + videos.length > 5) {
      throw new ApiError(400, "Total media files cannot exceed 5");
    }

    
    updateData.images = images;
    updateData.videos = videos;
  }
  

  const updated = await destinationService.updateDestinationById(destinationId, updateData);

  res.status(httpStatus.OK).json(
    response({
      message: "Destination Updated",
      status: "OK",
      statusCode: httpStatus.OK,
      data: updated,
    })
  );
});



// const updateDestination = catchAsync(async (req, res) => {
//   const updateData = { ...req.body };

//   if (req.files?.images?.length > 0) {
//     updateData.images = req.files.images.map(file => 
//       `/uploads/destinations/${file.filename}`
//     );

//   }
//   if (req.files?.video?.length > 0) {
//     updateData.video = `/uploads/destinations/${req.files.video[0].filename}`;
  
//   }
//   const updatedDestination = await destinationService.updateDestinationById(
//     req.params.destinationId,
//     updateData
//   );

//   res.status(httpStatus.OK).json(
//     response({
//       message: "Destination Updated",
//       status: "OK",
//       statusCode: httpStatus.OK,
//       data: updatedDestination,
//     })
//   );
// });

// const updateDestination = catchAsync(async (req, res) => {
//   const destination = await destinationService.updateDestinationById(req.params.destinationId, req.body);
//   res.status(httpStatus.OK).json(
//     response({
//       message: "Destination Updated",
//       status: "OK",
//       statusCode: httpStatus.OK,
//       data: destination,
//     })
//   );
// });

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
  getDestination,
  updateDestination,
  deleteDestination,
};
