const multer = require("multer");
const path = require("path");

// --- OPTIONAL: Cloudinary Requirements (Uncomment when using) ---
// const cloudinary = require("cloudinary").v2;
// const { CloudinaryStorage } = require("multer-storage-cloudinary");

// --- OPTIONAL: S3 Requirements (Uncomment when using) ---
// const { S3Client } = require("@aws-sdk/client-s3");
// const multerS3 = require("multer-s3");

module.exports = function (UPLOADS_FOLDER, allowedMimeTypes) {
  
  // ==========================================
  // OPTION 1: LOCAL DISK STORAGE (Current)
  // ==========================================
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, UPLOADS_FOLDER);
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

  // ==========================================
  // OPTION 2: CLOUDINARY STORAGE (Commented)
  // ==========================================
  /*
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: "travel-agency", 
      allowed_formats: ["jpg", "png", "jpeg", "webp"],
    },
  });
  */

  // ==========================================
  // OPTION 3: S3 / SUPABASE STORAGE (Commented)
  // ==========================================
  /*
  const s3 = new S3Client({
    region: process.env.S3_REGION || "us-east-1",
    endpoint: process.env.S3_ENDPOINT, // Supabase endpoint
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY,
      secretAccessKey: process.env.S3_SECRET_KEY,
    },
  });

  const storage = multerS3({
    s3: s3,
    bucket: process.env.S3_BUCKET_NAME,
    acl: "public-read",
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: function (req, file, cb) {
      cb(null, Date.now().toString() + "-" + file.originalname);
    },
  });
  */

  const upload = multer({
    storage: storage,
    limits: {
      fileSize: 100 * 1024 * 1024,
    },
    fileFilter: (req, file, cb) => {
      const defaultTypes = [
        "image/jpg", "image/png", "image/jpeg", "image/heic", "image/heif", "image/webp",
      ];
      const types = allowedMimeTypes || defaultTypes;

      if (types.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error(`File type ${file.mimetype} not allowed.`));
      }
    },
  });

  return upload;
};
