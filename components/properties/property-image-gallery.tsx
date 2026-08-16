"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, X, Grid3X3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  resolvePropertyImageDisplayUrl,
  type PropertyImageRecord,
} from "@/lib/utils/property-image-display";

type GalleryImage = PropertyImageRecord & {
  alt?: string | null;
  displayUrl?: string | null;
};

type PropertyImageGalleryProps = {
  images: GalleryImage[];
  title: string;
};

function gallerySrc(image: GalleryImage) {
  return image.displayUrl || resolvePropertyImageDisplayUrl(image);
}

function GalleryImg({
  image,
  alt,
  className,
}: {
  image: GalleryImage;
  alt: string;
  className?: string;
}) {
  const candidates = useMemo(() => {
    const primary = gallerySrc(image);
    const fallbacks: string[] = [];

    if (image.id && primary !== `/api/files/property-image/${image.id}`) {
      fallbacks.push(`/api/files/property-image/${image.id}`);
    }

    const raw = image.url?.trim();
    if (raw && raw !== primary && !fallbacks.includes(raw)) {
      fallbacks.push(raw);
    }

    return [primary, ...fallbacks].filter(Boolean);
  }, [image]);

  const [index, setIndex] = useState(0);
  const src = candidates[index] ?? "";

  if (!src) {
    return <div className={`bg-muted ${className ?? ""}`} />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => {
        if (index < candidates.length - 1) {
          setIndex((current) => current + 1);
        }
      }}
    />
  );
}

export function PropertyImageGallery({ images, title }: PropertyImageGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  if (images.length === 0) {
    return <div className="aspect-video w-full bg-muted" />;
  }

  const active = images[activeIndex] ?? images[0];

  const goPrev = () => setActiveIndex((i) => (i === 0 ? images.length - 1 : i - 1));
  const goNext = () => setActiveIndex((i) => (i === images.length - 1 ? 0 : i + 1));

  return (
    <div className="space-y-3">
      <div className="group relative aspect-video overflow-hidden rounded-lg bg-muted">
        <GalleryImg
          image={active}
          alt={active.alt ?? title}
          className="h-full w-full cursor-pointer object-cover transition hover:scale-[1.01]"
        />
        <button
          type="button"
          className="absolute inset-0 z-[1]"
          aria-label="Open gallery"
          onClick={() => setLightboxOpen(true)}
        />
        {images.length > 1 ? (
          <>
            <Button
              type="button"
              size="icon-sm"
              variant="secondary"
              className="absolute left-2 top-1/2 z-[2] -translate-y-1/2 opacity-90"
              onClick={goPrev}
              aria-label="Previous image"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              type="button"
              size="icon-sm"
              variant="secondary"
              className="absolute right-2 top-1/2 z-[2] -translate-y-1/2 opacity-90"
              onClick={goNext}
              aria-label="Next image"
            >
              <ChevronRight className="size-4" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="absolute bottom-3 right-3 z-[2] gap-1.5 opacity-90"
              onClick={() => setLightboxOpen(true)}
            >
              <Grid3X3 className="size-4" />
              View all ({images.length})
            </Button>
          </>
        ) : null}
      </div>

      {images.length > 1 ? (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
          {images.map((img, index) => (
            <button
              key={img.id ?? `${img.url}-${index}`}
              type="button"
              onClick={() => setActiveIndex(index)}
              className={`aspect-[4/3] overflow-hidden rounded-md border-2 transition ${
                index === activeIndex ? "border-emerald-600" : "border-transparent hover:border-emerald-300"
              }`}
            >
              <GalleryImg
                image={img}
                alt={img.alt ?? `${title} photo ${index + 1}`}
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      ) : null}

      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-h-[95vh] max-w-5xl gap-0 overflow-hidden p-0">
          <DialogTitle className="sr-only">{title} photo gallery</DialogTitle>
          <div className="relative bg-black">
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              className="absolute right-2 top-2 z-10 text-white hover:bg-white/20"
              onClick={() => setLightboxOpen(false)}
              aria-label="Close gallery"
            >
              <X className="size-4" />
            </Button>
            <GalleryImg
              image={active}
              alt={active.alt ?? title}
              className="max-h-[70vh] w-full object-contain"
            />
            {images.length > 1 ? (
              <>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="absolute left-2 top-1/2 -translate-y-1/2 text-white hover:bg-white/20"
                  onClick={goPrev}
                >
                  <ChevronLeft className="size-5" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-white hover:bg-white/20"
                  onClick={goNext}
                >
                  <ChevronRight className="size-5" />
                </Button>
              </>
            ) : null}
          </div>
          {images.length > 1 ? (
            <div className="grid max-h-[20vh] grid-cols-4 gap-2 overflow-y-auto p-3 sm:grid-cols-6">
              {images.map((img, index) => (
                <button
                  key={img.id ?? `${img.url}-${index}`}
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  className={`aspect-square overflow-hidden rounded border-2 ${
                    index === activeIndex ? "border-emerald-500" : "border-transparent"
                  }`}
                >
                  <GalleryImg image={img} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
