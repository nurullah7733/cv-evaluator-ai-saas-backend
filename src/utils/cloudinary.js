const { v2: cloudinary } = require("cloudinary");
const { randomUUID } = require("crypto");
const path = require("path");

function configure() {
  const cloud_name = process.env.CLOUDINARY_CLOUD_NAME;
  const api_key = process.env.CLOUDINARY_API_KEY;
  const api_secret = process.env.CLOUDINARY_API_SECRET;
  if (!cloud_name || !api_key || !api_secret) {
    throw new Error("Cloudinary storage credentials are not configured.");
  }
  cloudinary.config({ cloud_name, api_key, api_secret, secure: true });
}

async function uploadFileToCloudinary(filePath, originalName) {
  configure();
  const extension = path.extname(originalName).toLowerCase();
  if (![".pdf", ".docx", ".txt"].includes(extension)) {
    throw new Error("Unsupported resume file extension.");
  }
  const result = await cloudinary.uploader.upload(filePath, {
    public_id: `resumes/${randomUUID()}${extension}`,
    resource_type: "raw",
    type: "authenticated",
    overwrite: false,
    timeout: 60000,
  });
  return {
    publicId: result.public_id,
    fileUrl: cloudinary.url(result.public_id, {
      resource_type: "raw",
      type: "authenticated",
      version: result.version,
      sign_url: true,
      secure: true,
    }),
  };
}

async function deleteFileFromCloudinary(publicId) {
  configure();
  if (!publicId) throw new Error("Cloudinary public ID is missing.");
  const result = await cloudinary.uploader.destroy(publicId, {
    resource_type: "raw",
    type: "authenticated",
    invalidate: true,
    timeout: 60000,
  });
  if (!["ok", "not found"].includes(result.result)) {
    throw new Error("Failed to delete file from Cloudinary.");
  }
}

module.exports = { uploadFileToCloudinary, deleteFileFromCloudinary };
