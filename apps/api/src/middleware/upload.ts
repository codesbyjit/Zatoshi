import multer from 'multer';
import { config } from '../config';

// Allowed image MIME types for upload.
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/avif',
  'image/tiff',
];

const maxFileSize = config.imageMaxSizeMB * 1024 * 1024; // Convert MB to bytes

export const uploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: maxFileSize,
  },
  fileFilter(_req, file, cb) {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          `Unsupported file type: ${file.mimetype}. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`,
        ),
      );
    }
  },
});
