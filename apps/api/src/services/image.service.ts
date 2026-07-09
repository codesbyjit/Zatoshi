import sharp from 'sharp';
import { randomUUID } from 'node:crypto';
import { config } from '../config';
import { putObject } from '../utils/minio';
import { getLogger } from '@repo/utils';

const logger = getLogger('api:image-service');

export interface ImageUploadResult {
  url: string;
  fileKey: string;
  bucket: string;
  width: number;
  height: number;
  size: number;
}

/**
 * Compress and convert an image buffer to WebP, upload to MinIO,
 * and return the public API URL.
 *
 * Processing pipeline:
 *   1. Auto-rotate based on EXIF orientation
 *   2. Resize to fit within `imageMaxDimension` (maintains aspect ratio, no upscale)
 *   3. Convert to WebP with `imageQuality` setting
 *   4. Upload buffer to MinIO
 *   5. Return the API URL path
 *
 * @param buffer - Raw image file buffer from multer
 * @param originalName - Original file name (used for a human-readable prefix)
 * @param bucket - MinIO bucket to upload to (e.g. config.minioBucketProducts)
 * @returns ImageUploadResult with URL and metadata
 */
export async function uploadAndCompressImage(
  buffer: Buffer,
  originalName: string,
  bucket: string,
): Promise<ImageUploadResult> {
  // Read metadata from the original image
  const image = sharp(buffer);
  const metadata = await image.metadata();

  const originalWidth = metadata.width || 0;
  const originalHeight = metadata.height || 0;
  const maxDimension = config.imageMaxDimension;

  // Build the sharp pipeline: auto-rotate, resize if needed, convert to WebP
  let pipeline = image.rotate(); // Auto-rotate EXIF orientation

  // Only resize if the image exceeds the max dimension on either axis
  if (originalWidth > maxDimension || originalHeight > maxDimension) {
    pipeline = pipeline.resize({
      width: Math.min(originalWidth, maxDimension),
      height: Math.min(originalHeight, maxDimension),
      fit: 'inside',
      withoutEnlargement: true,
    });
  }

  // Convert to WebP with configured quality
  const webpBuffer = await pipeline
    .webp({ quality: config.imageQuality })
    .toBuffer();

  // Get final dimensions after resize
  const webpMetadata = await sharp(webpBuffer).metadata();
  const finalWidth = webpMetadata.width || originalWidth;
  const finalHeight = webpMetadata.height || originalHeight;

  // Generate a unique file name with a safe human-readable prefix
  const nameWithoutExt = originalName.replace(/\.[^/.]+$/, '');
  const safePrefix = nameWithoutExt
    .replace(/[^a-zA-Z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
    .slice(0, 64);
  const uniqueName = `${safePrefix || 'image'}-${randomUUID()}.webp`;

  // Upload to MinIO
  await putObject(bucket, uniqueName, webpBuffer, 'image/webp');

  const result: ImageUploadResult = {
    url: `${config.publicUrl}/images/${bucket}/${uniqueName}`,
    fileKey: uniqueName,
    bucket,
    width: finalWidth,
    height: finalHeight,
    size: webpBuffer.length,
  };

  logger.info(
    {
      fileKey: uniqueName,
      bucket,
      originalSize: buffer.length,
      compressedSize: webpBuffer.length,
      dimensions: `${finalWidth}x${finalHeight}`,
    },
    'Image uploaded and compressed',
  );

  return result;
}
