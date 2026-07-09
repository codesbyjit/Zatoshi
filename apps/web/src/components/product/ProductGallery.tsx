'use client';

import { useState } from 'react';
import { cn, resolveImageUrl } from '@/lib/utils';
import { ImageLightbox } from './ImageLightbox';

interface ProductGalleryProps {
  images: string[];
  productName: string;
}

export function ProductGallery({ images, productName }: ProductGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomPosition, setZoomPosition] = useState({ x: 0, y: 0 });
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isZoomed) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoomPosition({ x, y });
  };

  if (images.length === 0) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-md bg-[var(--color-bg-secondary)]">
        <svg
          width="64"
          height="64"
          viewBox="0 0 24 24"
          fill="none"
          className="text-[var(--color-text-muted)]"
          aria-hidden="true"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
          <path d="M21 15l-5-5L5 21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
    );
  }

  return (
    <div>
      {/* Main image */}
      <div
        className="relative aspect-square cursor-zoom-in overflow-hidden rounded-md bg-[var(--color-bg-secondary)]"
        onMouseEnter={() => setIsZoomed(true)}
        onMouseLeave={() => setIsZoomed(false)}
        onMouseMove={handleMouseMove}
        onClick={() => setIsLightboxOpen(true)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsLightboxOpen(true);
          }
        }}
      >
        <img
          src={resolveImageUrl(images[selectedIndex])}
          alt={`${productName} - Image ${selectedIndex + 1}`}
          className={cn(
            'h-full w-full object-cover transition-opacity duration-200',
            isZoomed && 'scale-150',
          )}
          style={
            isZoomed
              ? { transformOrigin: `${zoomPosition.x}% ${zoomPosition.y}%` }
              : undefined
          }
        />
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {images.map((image, index) => (
            <button
              key={index}
              type="button"
              onClick={() => setSelectedIndex(index)}
              className={cn(
                'h-[72px] w-[72px] shrink-0 overflow-hidden rounded-sm border-2 transition-all duration-150',
                index === selectedIndex
                  ? 'border-[var(--color-accent)]'
                  : 'border-transparent hover:border-[var(--color-border-hover)]',
              )}
              aria-label={`View image ${index + 1}`}
              aria-current={index === selectedIndex ? 'true' : undefined}
            >
              <img
                src={resolveImageUrl(image)}
                alt={`${productName} thumbnail ${index + 1}`}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </button>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {images.length > 0 && (
        <ImageLightbox
          images={images}
          selectedIndex={selectedIndex}
          isOpen={isLightboxOpen}
          onClose={() => setIsLightboxOpen(false)}
          onNavigate={(index) => setSelectedIndex(index)}
          productName={productName}
        />
      )}
    </div>
  );
}
