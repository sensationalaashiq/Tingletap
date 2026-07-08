// netlify/functions/shared/r2Client.js
// Reusable Cloudflare R2 client (S3-compatible) for badge verification media.
// Never import this in frontend code — server-side only.

import { S3Client, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';

function getR2Config() {
  const accountId     = process.env.R2_ACCOUNT_ID;
  const accessKeyId   = process.env.R2_ACCESS_KEY_ID;
  const secretKey     = process.env.R2_SECRET_ACCESS_KEY;
  const bucket        = process.env.R2_BUCKET_NAME;
  const endpoint      = process.env.R2_ENDPOINT ||
                        (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : null);

  if (!accountId || !accessKeyId || !secretKey || !bucket) {
    throw new Error('R2 credentials not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME.');
  }
  return { accessKeyId, secretKey, bucket, endpoint };
}

export function createR2Client() {
  const { accessKeyId, secretKey, endpoint } = getR2Config();
  return new S3Client({
    region: 'auto',
    endpoint,
    credentials: { accessKeyId, secretAccessKey: secretKey },
    // R2 does not support virtual-hosted buckets
    forcePathStyle: true,
  });
}

export function getBucketName() {
  return getR2Config().bucket;
}

/**
 * Generate a presigned PUT URL for a specific R2 object key.
 * @param {string} key          – object key (path inside bucket)
 * @param {string} contentType  – MIME type
 * @param {number} expiresIn    – seconds until expiry (default 300)
 */
export async function createPresignedPutUrl(key, contentType, expiresIn = 300) {
  const client = createR2Client();
  const bucket = getBucketName();
  const cmd = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(client, cmd, { expiresIn });
}

/**
 * Generate a presigned GET URL for a specific R2 object key.
 * @param {string} key       – object key
 * @param {number} expiresIn – seconds (default 300 = 5 min)
 */
export async function createPresignedGetUrl(key, expiresIn = 300) {
  const client = createR2Client();
  const bucket = getBucketName();
  const cmd = new GetObjectCommand({ Bucket: bucket, Key: key });
  return getSignedUrl(client, cmd, { expiresIn });
}

/**
 * Delete one or more objects from R2.
 * Silently ignores objects that don't exist.
 * @param {string[]} keys
 */
export async function deleteObjects(keys) {
  if (!keys || keys.length === 0) return;
  const client = createR2Client();
  const bucket = getBucketName();
  await Promise.allSettled(
    keys.map(key =>
      client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }))
    )
  );
}

/**
 * Check whether an object exists in R2.
 * @param {string} key
 * @returns {Promise<boolean>}
 */
export async function objectExists(key) {
  try {
    const client = createR2Client();
    const bucket = getBucketName();
    await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch {
    return false;
  }
}
