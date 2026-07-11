// netlify/functions/shared/r2Client.js
// Dual-bucket Cloudflare R2 client (S3-compatible).
//
// Bucket 1 — PUBLIC  (R2_Public_Bucket):  profiles, covers, homepage images/audio
// Bucket 2 — PRIVATE (R2_Private_Bucket): badge/RJ verifications, private-chat media
//
// Env vars required:
//   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY  — shared credentials
//   R2_Public_Bucket     — name of the public bucket
//   R2_Private_Bucket    — name of the private bucket
//   R2_PUBLIC_BUCKET_URL — permanent public base URL, e.g. "https://pub-xxx.r2.dev"
//
// Backward-compat env var (old single bucket still needed for serveMedia legacy):
//   R2_BUCKET_NAME       — original single bucket name

import {
  S3Client,
  DeleteObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// ── Shared credential block ────────────────────────────────────────────────────

function getSharedCreds() {
  const accountId   = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretKey   = process.env.R2_SECRET_ACCESS_KEY;
  if (!accountId || !accessKeyId || !secretKey) {
    throw new Error('R2 credentials not configured (R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY).');
  }
  const endpoint = process.env.R2_ENDPOINT || `https://${accountId}.r2.cloudflarestorage.com`;
  return { accessKeyId, secretKey, endpoint };
}

function buildS3Client() {
  const { accessKeyId, secretKey, endpoint } = getSharedCreds();
  return new S3Client({
    region: 'auto',
    endpoint,
    credentials: { accessKeyId, secretAccessKey: secretKey },
    forcePathStyle: true,
  });
}

// Single cached client — credentials are static per function instance
let _cachedClient = null;
function getClient() {
  if (!_cachedClient) _cachedClient = buildS3Client();
  return _cachedClient;
}

// ── Bucket name helpers ────────────────────────────────────────────────────────

/** Public bucket — reads R2_Public_Bucket with R2_PUBLIC_BUCKET_NAME as fallback. */
export function getPublicBucketName() {
  const name = process.env.R2_Public_Bucket || process.env.R2_PUBLIC_BUCKET_NAME;
  if (!name) throw new Error('R2_Public_Bucket env var not set.');
  return name;
}

/** Private bucket — reads R2_Private_Bucket with R2_PRIVATE_BUCKET_NAME as fallback. */
export function getPrivateBucketName() {
  const name = process.env.R2_Private_Bucket || process.env.R2_PRIVATE_BUCKET_NAME;
  if (!name) throw new Error('R2_Private_Bucket env var not set.');
  return name;
}

/** Legacy single bucket — used only by serveMedia for backward-compat reads. */
export function getBucketName() {
  const name = process.env.R2_BUCKET_NAME;
  if (!name) throw new Error('R2_BUCKET_NAME env var not set.');
  return name;
}

// ── Public URL helper ──────────────────────────────────────────────────────────

/**
 * Build a permanent public URL for an object in the public bucket.
 * R2_PUBLIC_BUCKET_URL must be set to the bucket's public base URL
 * (e.g. "https://pub-xxxx.r2.dev" or your custom domain).
 */
export function getPublicMediaUrl(key) {
  const base = (process.env.R2_PUBLIC_BUCKET_URL || '').replace(/\/$/, '');
  if (!base) throw new Error('R2_PUBLIC_BUCKET_URL env var not set. Set it to the public URL of your public R2 bucket.');
  return `${base}/${key}`;
}

// ── Client exports (kept for backward compat) ─────────────────────────────────

export function createR2Client()        { return getClient(); }
export function createPublicR2Client()  { return getClient(); }
export function createPrivateR2Client() { return getClient(); }

// ── PutObject helpers ──────────────────────────────────────────────────────────

/** Upload a buffer to the PUBLIC bucket. Returns the permanent public URL. */
export async function putPublicObject(key, buffer, contentType, cacheControl) {
  await getClient().send(new PutObjectCommand({
    Bucket:       getPublicBucketName(),
    Key:          key,
    Body:         buffer,
    ContentType:  contentType,
    ...(cacheControl ? { CacheControl: cacheControl } : {}),
  }));
  return getPublicMediaUrl(key);
}

/** Upload a buffer to the PRIVATE bucket. Returns the R2 object key. */
export async function putPrivateObject(key, buffer, contentType) {
  await getClient().send(new PutObjectCommand({
    Bucket:      getPrivateBucketName(),
    Key:         key,
    Body:        buffer,
    ContentType: contentType,
  }));
  return key;
}

/** Upload a buffer to the LEGACY single bucket. Returns the R2 object key. */
export async function putLegacyObject(key, buffer, contentType, cacheControl) {
  await getClient().send(new PutObjectCommand({
    Bucket:       getBucketName(),
    Key:          key,
    Body:         buffer,
    ContentType:  contentType,
    ...(cacheControl ? { CacheControl: cacheControl } : {}),
  }));
  return key;
}

// ── GetObject helpers ──────────────────────────────────────────────────────────

/** Stream an object from the PUBLIC bucket into a Buffer. */
export async function getPublicObject(key) {
  const r = await getClient().send(new GetObjectCommand({
    Bucket: getPublicBucketName(), Key: key, ResponseContentDisposition: 'inline',
  }));
  return { buffer: await streamToBuffer(r.Body), contentType: r.ContentType || 'application/octet-stream' };
}

/** Stream an object from the PRIVATE bucket into a Buffer. */
export async function getPrivateObject(key) {
  const r = await getClient().send(new GetObjectCommand({
    Bucket: getPrivateBucketName(), Key: key, ResponseContentDisposition: 'inline',
  }));
  return { buffer: await streamToBuffer(r.Body), contentType: r.ContentType || 'application/octet-stream' };
}

/** Stream an object from the LEGACY single bucket into a Buffer. */
export async function getLegacyObject(key) {
  const r = await getClient().send(new GetObjectCommand({
    Bucket: getBucketName(), Key: key, ResponseContentDisposition: 'inline',
  }));
  return { buffer: await streamToBuffer(r.Body), contentType: r.ContentType || 'application/octet-stream' };
}

async function streamToBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(chunk instanceof Buffer ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

// ── Presigned URL helpers ──────────────────────────────────────────────────────

/**
 * Presigned GET URL for the PRIVATE bucket (badge/RJ admin viewing).
 * @param {string} key
 * @param {number} [expiresIn=300]
 */
export async function createPresignedGetUrl(key, expiresIn = 300) {
  // Determine which bucket to use based on key prefix
  const bucket = _bucketForKey(key);
  const cmd = new GetObjectCommand({
    Bucket: bucket, Key: key, ResponseContentDisposition: 'inline',
  });
  return getSignedUrl(getClient(), cmd, { expiresIn });
}

/**
 * Presigned PUT URL for the PRIVATE bucket (getUploadUrl fallback).
 * @param {string} key
 * @param {string} contentType
 * @param {number} [expiresIn=300]
 */
export async function createPresignedPutUrl(key, contentType, expiresIn = 300) {
  const cmd = new PutObjectCommand({
    Bucket: getPrivateBucketName(), Key: key, ContentType: contentType,
  });
  return getSignedUrl(getClient(), cmd, { expiresIn });
}

/** Kept for backward compat — presigned PUT defaults to private bucket. */
export async function ensureR2Cors() {
  // No-op: we no longer need browser direct-upload PUT flows.
  // The proxy upload path (Browser → Netlify → R2) avoids CORS entirely.
}

// ── Delete helpers ─────────────────────────────────────────────────────────────

/** Delete objects from the appropriate bucket based on key prefix. */
export async function deleteObjects(keys) {
  if (!keys?.length) return;
  const client = getClient();
  await Promise.allSettled(
    keys.map(key => {
      const bucket = _bucketForKey(key);
      return client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    }),
  );
}

/** Check existence in the appropriate bucket. */
export async function objectExists(key) {
  try {
    await getClient().send(new HeadObjectCommand({ Bucket: _bucketForKey(key), Key: key }));
    return true;
  } catch { return false; }
}

// ── Internal routing ───────────────────────────────────────────────────────────

/**
 * Choose the correct bucket based on key prefix.
 * New private prefixes → private bucket
 * New public prefixes  → public bucket
 * Legacy prefixes      → legacy bucket (backward compat)
 */
function _bucketForKey(key) {
  // New PRIVATE prefixes
  if (
    key.startsWith('badge/')           ||
    key.startsWith('rj/')              ||
    key.startsWith('private-chat/')    ||
    key.startsWith('verifications/')   ||    // old badge prefix — still in private bucket
    key.startsWith('rj-verifications/') // old RJ prefix
  ) {
    // verifications/ and rj-verifications/ were in the OLD single bucket.
    // Fall back to legacy bucket for those so old admin views still work.
    if (key.startsWith('verifications/') || key.startsWith('rj-verifications/')) {
      return _tryGetBucketName(process.env.R2_BUCKET_NAME) || getPrivateBucketName();
    }
    return getPrivateBucketName();
  }
  // New PUBLIC prefixes
  if (
    key.startsWith('profile/')        ||
    key.startsWith('cover/')          ||
    key.startsWith('homepage/')
  ) {
    return getPublicBucketName();
  }
  // Legacy single-bucket prefixes (profiles/, covers/, chat-images/, etc.)
  return _tryGetBucketName(process.env.R2_BUCKET_NAME) || getBucketName();
}

function _tryGetBucketName(name) {
  return name || null;
}
