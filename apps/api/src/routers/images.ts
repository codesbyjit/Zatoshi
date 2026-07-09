import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { uploadMiddleware } from '../middleware/upload';
import { uploadAndCompressImage } from '../services/image.service';
import { getObjectStream } from '../utils/minio';
import { getAuthUser } from '../middleware/auth';
import { config } from '../config';
import { getLogger } from '@repo/utils';

const logger = getLogger('api:images-router');

const router = Router();

/**
 * Allowed MinIO buckets for image upload.
 */
const ALLOWED_BUCKETS = [config.minioBucketProducts, config.minioBucketAvatars];

// ─────────────────────────────────────────────────────────────
// Middleware: require admin role for upload routes
// ─────────────────────────────────────────────────────────────
function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const user = getAuthUser(req);
  if (!user) {
    res.status(401).json({
      error: { message: 'Authentication required', code: 'UNAUTHORIZED' },
    });
    return;
  }
  if (user.role !== 'admin') {
    res.status(403).json({
      error: { message: 'Admin access required', code: 'FORBIDDEN' },
    });
    return;
  }
  next();
}

// ─────────────────────────────────────────────────────────────
// POST /api/v1/upload/product-image — Upload product image (admin)
// POST /api/v1/upload/avatar — Upload avatar image (admin)
// ─────────────────────────────────────────────────────────────

function createUploadHandler(bucket: string) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({
          error: { message: 'No image file provided', code: 'BAD_REQUEST' },
        });
        return;
      }

      const result = await uploadAndCompressImage(
        req.file.buffer,
        req.file.originalname,
        bucket,
      );

      res.status(201).json(result);
    } catch (err) {
      logger.error({ err }, 'Image upload failed');
      res.status(500).json({
        error: { message: 'Image processing failed', code: 'UPLOAD_FAILED' },
      });
    }
  };
}

// Shared multer error handler wrapper
function handleUpload(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  uploadMiddleware.single('file')(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          res.status(413).json({
            error: {
              message: `File too large. Maximum size is ${config.imageMaxSizeMB}MB`,
              code: 'FILE_TOO_LARGE',
            },
          });
          return;
        }
        res.status(400).json({
          error: { message: err.message, code: 'UPLOAD_ERROR' },
        });
        return;
      }
      res.status(400).json({
        error: { message: err.message, code: 'INVALID_FILE_TYPE' },
      });
      return;
    }
    next();
  });
}

router.post(
  '/api/v1/upload/product-image',
  requireAdmin,
  handleUpload,
  createUploadHandler(config.minioBucketProducts),
);

router.post(
  '/api/v1/upload/avatar',
  requireAdmin,
  handleUpload,
  createUploadHandler(config.minioBucketAvatars),
);

// ─────────────────────────────────────────────────────────────
// GET /:bucket/:key(*) — Serve an image from MinIO (public)
// NOTE: Router is mounted at /images, so this becomes GET /images/:bucket/:key(*)
// ─────────────────────────────────────────────────────────────
router.get('/images/:bucket/:key(*)', async (req: Request, res: Response) => {
  try {
    const { bucket, key } = req.params;

    // Sanitize: prevent path traversal
    if (key.includes('..') || bucket.includes('..')) {
      res.status(400).json({
        error: { message: 'Invalid image key', code: 'BAD_REQUEST' },
      });
      return;
    }

    const { stream, stat } = await getObjectStream(bucket, key);

    // Set response headers
    const contentType = stat.metaData?.['content-type'] || 'image/webp';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');

    // Pipe the MinIO stream to the response
    stream.pipe(res);

    stream.on('error', (streamErr) => {
      logger.error({ err: streamErr, bucket, key }, 'Error streaming image');
      if (!res.headersSent) {
        res.status(500).json({
          error: { message: 'Error streaming image', code: 'STREAM_ERROR' },
        });
      }
    });
  } catch (err: unknown) {
    const minioErr = err as { code?: string };
    // MinIO may throw 'NotFound' (statObject) or 'NoSuchKey' (getObject)
    if (minioErr.code === 'NotFound' || minioErr.code === 'NoSuchKey') {
      res.status(404).json({
        error: { message: 'Image not found', code: 'NOT_FOUND' },
      });
      return;
    }
    logger.error({ err, params: req.params }, 'Image serve failed');
    res.status(500).json({
      error: { message: 'Failed to serve image', code: 'SERVE_ERROR' },
    });
  }
});

export default router;
