import { z } from 'zod';
import { t, protectedProcedure } from '../trpc/trpc';
import { getPresignedPutUrl } from '../utils/minio';
import { config } from '../config';
import { randomUUID } from 'node:crypto';

/**
 * Upload router — generates presigned URLs for direct browser-to-MinIO uploads.
 */
export const uploadRouter = t.router({
  /**
   * Get a presigned PUT URL for uploading a file.
   */
  getPresignedUrl: protectedProcedure
    .input(
      z.object({
        fileName: z.string().min(1),
        contentType: z.string().min(1),
        bucket: z.enum([config.minioBucketProducts, config.minioBucketAvatars]),
      }),
    )
    .mutation(async ({ input }) => {
      // Generate a unique file name to prevent collisions
      const ext = input.fileName.split('.').pop() || 'bin';
      const uniqueName = `${randomUUID()}.${ext}`;

      const uploadUrl = await getPresignedPutUrl(
        input.bucket,
        uniqueName,
        input.contentType,
      );

      return {
        uploadUrl,
        fileKey: uniqueName,
        bucket: input.bucket,
      };
    }),
});
