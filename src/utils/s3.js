const { S3Client, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const { Upload } = require("@aws-sdk/lib-storage");
const fs = require("fs");

const s3 = new S3Client({
  region: process.env.HETZNER_S3_REGION,
  endpoint: process.env.HETZNER_S3_ENDPOINT,
  credentials: {
    accessKeyId: process.env.HETZNER_S3_KEY,
    secretAccessKey: process.env.HETZNER_S3_SECRET,
  },
  forcePathStyle: true, // Hetzner- unusally secure
  requestHandler: undefined, //  use default HTTP handler
  maxAttempts: 5, // built-in retry
});

// Function to upload a file to S3
async function uploadFileToS3(
  client, // s3
  filePath, // filePath
  bucketName, // public-files-upload-bucket
  buildObjectKey, // e.g., "resumes/2024-10-01/1234567890abcdef.pdf"
  contentType, // e.g., "application/pdf"
  userId, // userId from auth
  reqFileOriginalName // req.file.originalname
) {
  const upload = new Upload({
    client,
    params: {
      Bucket: bucketName,
      Key: buildObjectKey,
      Body: fs.createReadStream(filePath),
      ContentType: contentType,
      ACL: "private",
      // ServerSideEncryption Its disabled for get error: 400
      //   ServerSideEncryption: "AES256", // SSE-S3
      ContentDisposition: `inline; filename="${reqFileOriginalName.replace(
        /"/g,
        ""
      )}"`,
      Metadata: {
        app: "resume-evaluator-ai",
        userId,
        orig: reqFileOriginalName,
      },
    },
    queueSize: 10, // parallel parts
    partSize: 10 * 1024 * 1024, // 10MB
    leavePartsOnError: false,
  });

  return upload.done();
}

async function deleteFileFromS3(client, bucketName, objectKey) {
  try {
    const command = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: objectKey,
    });

    await client.send(command);
    console.log(`Deleted from Hetzner S3: ${objectKey}`);
  } catch (error) {
    console.error("Failed to delete from S3:", error);
  }
}

module.exports = { s3, uploadFileToS3, deleteFileFromS3 };
