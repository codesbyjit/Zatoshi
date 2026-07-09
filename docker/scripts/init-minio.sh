#!/bin/bash
set -e

echo "Waiting for MinIO to become available..."
until curl -sf http://minio:9000/minio/health/live >/dev/null 2>&1; do
  sleep 2
done

echo "MinIO is ready. Configuring client..."

# Configure mc alias
mc alias set local http://minio:9000 \
  "${MINIO_ROOT_USER:-minioadmin}" \
  "${MINIO_ROOT_PASSWORD:-minioadmin}"

# Create required buckets
BUCKETS="${MINIO_BUCKETS:-products,avatars}"
IFS=',' read -ra BUCKET_ARRAY <<< "$BUCKETS"

for bucket in "${BUCKET_ARRAY[@]}"; do
  bucket=$(echo "$bucket" | xargs)  # trim whitespace
  if mc ls "local/$bucket" >/dev/null 2>&1; then
    echo "Bucket '$bucket' already exists, skipping."
  else
    mc mb "local/$bucket"
    echo "Created bucket: $bucket"
  fi
done

echo "MinIO initialization complete!"
