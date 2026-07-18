import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

// Files are stored as "<resourceType>|<format>|<publicId>" instead of a
// plain secure_url. This is deliberate: a signed URL is only valid for a
// fixed window from the moment it's generated, so we can't store the URL
// itself -- we store enough to regenerate a fresh signed URL on every read
// (see getSignedFileUrl below). No schema change needed since this still
// fits in the existing String / String[] columns.

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
          type: "authenticated",
        },
        (error, result) => {
          if (error || !result) return reject(error);
          resolve(
            `${result.resource_type}|${result.format ?? ""}|${result.public_id}`,
          );
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
          type: "authenticated",
        },
        (error, result) => {
          if (error || !result) return reject(error);
          resolve(
            `${result.resource_type}|${result.format ?? ""}|${result.public_id}`,
          );
        },
      )
      .end(buffer);
  });
}

/**
 * Converts a stored "<resourceType>|<format>|<publicId>" string into a
 * fresh signed URL, valid for `expirySeconds` (default 1 hour) from the
 * moment this is called.
 *
 * Backward-compatible: submissions/assignments uploaded before this change
 * have their old plain secure_url (starting with "http") stored directly.
 * Those are returned as-is (still publicly accessible, unsigned) rather
 * than breaking -- old files were never uploaded as "authenticated" in the
 * first place, so there's nothing to sign for them retroactively.
 *
 * Note: unlike a plain cloudinary.url(), this bypasses Cloudinary's CDN
 * cache (an authenticated fetch happens on every call), which roughly
 * doubles bandwidth cost for that asset per Cloudinary's own guidance.
 * Acceptable here given these are private exam submissions viewed
 * relatively few times, not high-traffic public assets.
 */
export function getSignedFileUrl(stored: string, expirySeconds = 3600): string {
  if (!stored) return stored;
  if (stored.startsWith("http")) return stored; // legacy public URL

  const [resourceType, format, publicId] = stored.split("|");
  if (!resourceType || !publicId) return stored; // malformed, fail safe

  const expiresAt = Math.floor(Date.now() / 1000) + expirySeconds;

  return cloudinary.utils.private_download_url(publicId, format || "", {
    resource_type: resourceType as "image" | "video" | "raw",
    type: "authenticated",
    expires_at: expiresAt,
    attachment: false,
  });
}

export default cloudinary;
