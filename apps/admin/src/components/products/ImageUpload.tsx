'use client';

import { useState, useRef, type DragEvent } from 'react';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface ImageUploadProps {
  images: string[];
  onChange: (images: string[]) => void;
  maxImages?: number;
}

export function ImageUpload({ images, onChange, maxImages = 10 }: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState<string[]>([]);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'));
    handleFiles(files);
  };

  const handleFiles = async (files: File[]) => {
    const remaining = maxImages - images.length;
    const toUpload = files.slice(0, remaining);

    // Clear previous errors on new upload
    if (uploadErrors.length > 0) {
      setUploadErrors([]);
    }

    for (const file of toUpload) {
      const uploadId = `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setUploading((prev) => [...prev, uploadId]);

      try {
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch(`${API_URL}/api/v1/upload/product-image`, {
          method: 'POST',
          credentials: 'include',
          body: formData,
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(
            (errData as Record<string, unknown>)?.error &&
            typeof (errData as Record<string, unknown>).error === 'object'
              ? ((errData as Record<string, unknown>).error as Record<string, unknown>)?.message as string ||
                `Upload failed (HTTP ${res.status})`
              : `Upload failed (HTTP ${res.status})`,
          );
        }

        const result: { url: string; fileKey?: string } = await res.json();
        onChange([...images, result.url]);
      } catch (err) {
        console.error('Upload failed:', err);
        setUploadErrors((prev) => [
          ...prev,
          `Failed to upload ${file.name}: ${err instanceof Error ? err.message : 'Unknown error'}`,
        ]);
      } finally {
        setUploading((prev) => prev.filter((id) => id !== uploadId));
      }
    }
  };

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    onChange(newImages);
  };

  const handleClickUpload = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-[var(--color-text-secondary)]">
        Product Images
        <span className="text-[var(--color-text-muted)] ml-1 font-normal">
          ({images.length}/{maxImages})
        </span>
      </label>

      {/* Drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClickUpload}
        className={`border-2 border-dashed rounded-md p-6 text-center cursor-pointer transition-colors ${
          uploading.length > 0
            ? 'border-[var(--color-accent)] bg-[var(--color-accent-light)] opacity-60 pointer-events-none'
            : isDragging
              ? 'border-[var(--color-accent)] bg-[var(--color-accent-light)]'
              : 'border-[var(--color-border)] hover:border-[var(--color-border-hover)] hover:bg-[var(--color-bg-secondary)]'
        }`}
      >
        {uploading.length > 0 ? (
          <>
            <Loader2 className="h-8 w-8 text-[var(--color-accent)] mx-auto mb-2 animate-spin" />
            <p className="text-sm text-[var(--color-accent)]">
              Uploading {uploading.length} file(s)...
            </p>
          </>
        ) : (
          <>
            <Upload className="h-8 w-8 text-[var(--color-text-muted)] mx-auto mb-2" />
            <p className="text-sm text-[var(--color-text-muted)]">
              Drag & drop images here, or click to select
            </p>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">
              PNG, JPG, WebP up to 5MB
            </p>
          </>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          disabled={uploading.length > 0}
          onChange={(e) => {
            const files = Array.from(e.target.files || []);
            handleFiles(files);
            e.target.value = '';
          }}
        />
      </div>

      {/* Upload errors */}
      {uploadErrors.length > 0 && (
        <div className="space-y-1">
          {uploadErrors.map((err, i) => (
            <p key={i} className="text-xs text-[var(--color-error)]">{err}</p>
          ))}
        </div>
      )}

      {/* Preview grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-4 gap-3">
          {images.map((url, index) => (
            <div key={index} className="relative group aspect-square rounded-md border border-[var(--color-border)] overflow-hidden bg-[var(--color-bg-secondary)]">
              {url.startsWith('blob:') || url.startsWith('http') || url.startsWith('/images/') ? (
                <img
                  src={url.startsWith('http') ? url : `${API_URL}${url}`}
                  alt={`Product image ${index + 1}`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                    (e.target as HTMLImageElement).parentElement!.classList.add('flex', 'items-center', 'justify-center');
                  }}
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <ImageIcon className="h-6 w-6 text-[var(--color-text-muted)]" />
                </div>
              )}
              {index === 0 && (
                <span className="absolute top-1 left-1 px-1.5 py-0.5 text-[10px] font-medium bg-[var(--color-accent)] text-[var(--color-text-inverse)] rounded-sm">
                  Cover
                </span>
              )}
              <button
                type="button"
                onClick={() => removeImage(index)}
                className="absolute top-1 right-1 w-6 h-6 flex items-center justify-center rounded-full bg-[rgba(0,0,0,0.5)] text-[var(--color-text-inverse)] opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
