import * as Minio from 'minio';
import type { Readable } from 'node:stream';
import { config } from '../config';
import { getLogger } from '@repo/utils';

const logger = getLogger('api:minio');

let minioClient: Minio.Client | null = null;

export function getMinioClient(): Minio.Client {
  if (!minioClient) {
    minioClient = new Minio.Client({
      endPoint: new URL(config.minioEndpoint).hostname,
      port: parseInt(new URL(config.minioEndpoint).port, 10) || 9000,
      useSSL: config.minioEndpoint.startsWith('https'),
      accessKey: config.minioAccessKey,
      secretKey: config.minioSecretKey,
    });
  }
  return minioClient;
}

/**
 * Ensure a bucket exists, creating it if necessary.
 */
async function ensureBucket(bucket: string): Promise<void> {
  const client = getMinioClient();
  const exists = await client.bucketExists(bucket);
  if (!exists) {
    await client.makeBucket(bucket, 'us-east-1');
    logger.info({ bucket }, 'Created MinIO bucket');
  }
}

/**
 * Generate a presigned PUT URL for direct browser upload to MinIO.
 *
 * @param bucket - MinIO bucket name (e.g. 'products', 'avatars')
 * @param fileName - The object key/path in the bucket
 * @param contentType - MIME type of the file
 * @param expirySeconds - URL expiry in seconds (default 3600 = 1 hour)
 * @returns Presigned PUT URL string
 */
export async function getPresignedPutUrl(
  bucket: string,
  fileName: string,
  contentType: string,
  expirySeconds: number = 3600,
): Promise<string> {
  await ensureBucket(bucket);

  const client = getMinioClient();
  const url = await client.presignedPutObject(bucket, fileName, expirySeconds);

  return url;
}

/**
 * Generate a presigned GET URL for reading from MinIO.
 *
 * @param bucket - MinIO bucket name
 * @param fileName - The object key/path in the bucket
 * @param expirySeconds - URL expiry in seconds (default 3600)
 * @returns Presigned GET URL string
 */
export async function getPresignedGetUrl(
  bucket: string,
  fileName: string,
  expirySeconds: number = 3600,
): Promise<string> {
  const client = getMinioClient();
  return client.presignedGetObject(bucket, fileName, expirySeconds);
}

/**
 * Upload a buffer directly to a MinIO bucket.
 *
 * @param bucket - MinIO bucket name
 * @param key - The object key/path in the bucket
 * @param buffer - File contents as a Buffer
 * @param contentType - MIME type of the file
 * @returns The object key that was uploaded
 */
export async function putObject(
  bucket: string,
  key: string,
  buffer: Buffer,
  contentType: string,
): Promise<string> {
  await ensureBucket(bucket);

  const client = getMinioClient();
  await client.putObject(bucket, key, buffer, buffer.length, {
    'Content-Type': contentType,
  });

  logger.debug({ bucket, key, size: buffer.length }, 'Object uploaded to MinIO');
  return key;
}

/**
 * Get a readable stream and stats for an object from MinIO.
 *
 * @param bucket - MinIO bucket name
 * @param key - The object key/path in the bucket
 * @returns Object containing the readable stream and stat information
 */
export async function getObjectStream(
  bucket: string,
  key: string,
): Promise<{ stream: Readable; stat: Minio.BucketItemStat }> {
  const client = getMinioClient();
  const [stream, stat] = await Promise.all([
    client.getObject(bucket, key),
    client.statObject(bucket, key),
  ]);
  return { stream, stat };
}
