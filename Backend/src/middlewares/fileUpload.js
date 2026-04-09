const multer = require("multer");
const path = require("path");
const { S3Client } = require("@aws-sdk/client-s3");
const multerS3 = require("multer-s3");

module.exports = function (UPLOADS_FOLDER, allowedMimeTypes) {
  
  // ==========================================
  // MANUALLY SWITCH STORAGE HERE:
  // Set to 'local' for Local Disk
  // Set to 's3' for S3/Supabase
  // ==========================================
  const STORAGE_MODE = process.env.STORAGE_MODE || "local"; 

  let storage;

  if (STORAGE_MODE === "s3") {
    console.log("[Info] STORAGE MODE: S3/Supabase ACTIVE");
    
    const s3 = new S3Client({
      region: process.env.S3_REGION || "ap-northeast-1",
      endpoint: process.env.S3_ENDPOINT,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY,
        secretAccessKey: process.env.S3_SECRET_KEY,
      },
      forcePathStyle: true,
    });

    storage = multerS3({
      s3: s3,
      bucket: process.env.S3_BUCKET_NAME,
      acl: "public-read",
      contentType: multerS3.AUTO_CONTENT_TYPE,
      key: function (req, file, cb) {
        const fileExt = file.originalname.split(".").pop();
        const filename = file.originalname
          .replace(`.${fileExt}`, "")
          .toLocaleLowerCase()
          .split(" ")
          .join("-") + "-" + Date.now();
        cb(null, `${filename}.${fileExt}`);
      },
    });
  } else {
    console.log("[Info] STORAGE MODE: LOCAL DISK ACTIVE");
    
    storage = multer.diskStorage({
      destination: (req, file, cb) => {
        cb(null, UPLOADS_FOLDER);
      },
      filename: (req, file, cb) => {
        const fileExt = path.extname(file.originalname);
        const filename = file.originalname
          .replace(fileExt, "")
          .toLocaleLowerCase()
          .split(" ")
          .join("-") + "-" + Date.now();
        cb(null, filename + fileExt);
      },
    });
  }

  const upload = multer({
    storage: storage,
    limits: {
      fileSize: 100 * 1024 * 1024,
    },
    fileFilter: (req, file, cb) => {
      const defaultTypes = [
        "image/jpg", "image/png", "image/jpeg", "image/heic", "image/heif", "image/webp",
        "video/mp4", "video/webm", "video/quicktime",
        "application/pdf"
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
