import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

export async function uploadReferenceFile(
  buffer: Buffer,
  assignmentId: string,
  filename: string,
): Promise<string> {
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          folder: `afl/assignments/${assignmentId}`,
          public_id: `reference_${filename}`,
          resource_type: "auto",
        },
        (error, result) => {
          if (error || !result) return reject(error);
          resolve(result.secure_url);
        },
      )
      .end(buffer);
  });
}

export async function uploadSubmissionFile(
  buffer: Buffer,
  submissionId: string,
  pageNumber: number,
): Promise<string> {
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          folder: `afl/submissions/${submissionId}`,
          public_id: `page_${pageNumber}`,
          resource_type: "image",
        },
        (error, result) => {
          if (error || !result) return reject(error);
          resolve(result.secure_url);
        },
      )
      .end(buffer);
  });
}

export default cloudinary;
