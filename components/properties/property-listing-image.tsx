"use client";

import { useMemo, useState } from "react";
import {
  normalizeDbImageUrl,
  propertyImageApiPath,
  resolvePropertyImageDisplayUrl,
  type PropertyImageRecord,
  isPublicCdnImageUrl,
} from "@/lib/utils/property-image-display";

export type ListingImageRecord = PropertyImageRecord & {
  alt?: string | null;
  displayUrl?: string | null;
  src?: string | null;
};

function resolveListingImageSrc(image: ListingImageRecord): string {
  const raw = normalizeDbImageUrl(image.url);

  // Public CDN URLs load directly; storage-backed images use the backend API.
  if (image.id && raw && !/^data:/i.test(raw) && !isPublicCdnImageUrl(raw)) {
    return propertyImageApiPath(image.id);
  }

  return (
    image.src ??
    image.displayUrl ??
    resolvePropertyImageDisplayUrl(image) ??
    raw
  );
}

type PropertyListingImageProps = {
  image: ListingImageRecord;
  alt: string;
  className?: string;
};

/** Cover/thumbnail image for property cards — uses backend API with onError fallback. */
export function PropertyListingImage({ image, alt, className }: PropertyListingImageProps) {
  const primary = useMemo(() => resolveListingImageSrc(image), [image]);
  const directUrl = useMemo(() => {
    const raw = normalizeDbImageUrl(image.url);
    if (/^https?:\/\//i.test(raw)) return raw;
    return image.displayUrl ?? image.src ?? null;
  }, [image]);
  const [useFallback, setUseFallback] = useState(false);

  const src = useMemo(() => {
    if (!primary) return null;
    if (useFallback && directUrl && directUrl !== primary) {
      return directUrl;
    }
    if (useFallback && image.id) {
      const apiPath = propertyImageApiPath(image.id);
      return primary === apiPath ? directUrl ?? primary : apiPath;
    }
    return primary;
  }, [directUrl, image.id, primary, useFallback]);

  if (!src) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => {
        if (!useFallback) {
          setUseFallback(true);
        }
      }}
    />
  );
}

export { resolveListingImageSrc };
