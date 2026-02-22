const multer = require("multer");
const path = require("path");

module.exports = function (UPLOADS_FOLDER, allowedMimeTypes) {
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, UPLOADS_FOLDER); // Use the provided destination folder
    },
    filename: (req, file, cb) => {
      const fileExt = path.extname(file.originalname);
      const filename =
        file.originalname
          .replace(fileExt, "")
          .toLocaleLowerCase()
          .split(" ")
          .join("-") +
        "-" +
        Date.now();

      cb(null, filename + fileExt);
    },
  });

  const upload = multer({
    storage: storage,
    limits: {
      fileSize: 100 * 1024 * 1024, // 100MB default limit for flexibility
    },
    fileFilter: (req, file, cb) => {
      const defaultTypes = [
        "image/jpg",
        "image/png",
        "image/jpeg",
        "image/heic",
        "image/heif",
        "image/webp",
      ];
      const types = allowedMimeTypes || defaultTypes;

      if (types.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error(`File type ${file.mimetype} not allowed. Allowed types: ${types.join(", ")}`));
      }
    },
  });

  return upload; // Return the configured multer upload middleware
};
