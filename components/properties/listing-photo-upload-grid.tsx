"use client";

import Image from "next/image";
import { useRef } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ExistingPhoto = {
  id: string;
  url: string;
  alt?: string | null;
};

type ListingPhotoUploadGridProps = {
  existingPhotos?: ExistingPhoto[];
  newFiles: File[];
  newPreviews: string[];
  removedExistingIds?: string[];
  onRemoveExisting?: (id: string) => void;
  onReplaceExisting?: (id: string, file: File) => void;
  onAddFiles: (files: File[]) => void;
  onRemoveNewFile: (index: number) => void;
  onReplaceNewFile: (index: number, file: File) => void;
  maxPhotos?: number;
  resolveUrl?: (url: string) => string;
  disabled?: boolean;
  helperText?: string;
  errorMessage?: string | null;
};

export function ListingPhotoUploadGrid({
  existingPhotos = [],
  newFiles,
  newPreviews,
  removedExistingIds = [],
  onRemoveExisting,
  onReplaceExisting,
  onAddFiles,
  onRemoveNewFile,
  onReplaceNewFile,
  maxPhotos = 10,
  resolveUrl = (url) => url,
  disabled,
  helperText,
  errorMessage,
}: ListingPhotoUploadGridProps) {
  const addInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const replaceTargetRef = useRef<{ kind: "existing" | "new"; id?: string; index?: number } | null>(
    null
  );

  const visibleExisting = existingPhotos.filter((photo) => !removedExistingIds.includes(photo.id));
  const totalCount = visibleExisting.length + newFiles.length;
  const remainingSlots = Math.max(0, maxPhotos - totalCount);

  const openReplacePicker = (target: { kind: "existing" | "new"; id?: string; index?: number }) => {
    replaceTargetRef.current = target;
    replaceInputRef.current?.click();
  };

  const handleAddFiles = (fileList: FileList | null) => {
    if (!fileList?.length) return;
    const incoming = Array.from(fileList).slice(0, remainingSlots);
    if (incoming.length) onAddFiles(incoming);
  };

  const handleReplaceFile = (fileList: FileList | null) => {
    const file = fileList?.[0];
    const target = replaceTargetRef.current;
    replaceTargetRef.current = null;
    if (!file || !target) return;

    if (target.kind === "existing" && target.id && onReplaceExisting) {
      onReplaceExisting(target.id, file);
      return;
    }

    if (target.kind === "new" && target.index != null) {
      onReplaceNewFile(target.index, file);
    }
  };

  return (
    <div className="space-y-3">
      {helperText ? <p className="text-xs text-muted-foreground">{helperText}</p> : null}
      {errorMessage ? <p className="text-xs text-destructive">{errorMessage}</p> : null}

      {totalCount > 0 ? (
        <div className="grid gap-3 sm:grid-cols-4">
          {visibleExisting.map((photo) => (
            <PhotoTile
              key={photo.id}
              src={resolveUrl(photo.url)}
              alt={photo.alt ?? "Listing photo"}
              disabled={disabled}
              onRemove={onRemoveExisting ? () => onRemoveExisting(photo.id) : undefined}
              onReplace={
                onReplaceExisting ? () => openReplacePicker({ kind: "existing", id: photo.id }) : undefined
              }
            />
          ))}
          {newPreviews.map((preview, index) => (
            <PhotoTile
              key={`${newFiles[index]?.name ?? "photo"}-${index}`}
              src={preview}
              alt={`New photo ${index + 1}`}
              disabled={disabled}
              onRemove={() => onRemoveNewFile(index)}
              onReplace={() => openReplacePicker({ kind: "new", index })}
            />
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No photos uploaded yet.</p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || remainingSlots === 0}
          onClick={() => addInputRef.current?.click()}
        >
          Add photos
        </Button>
        {totalCount >= maxPhotos ? (
          <p className="self-center text-xs text-muted-foreground">Maximum {maxPhotos} photos reached.</p>
        ) : null}
      </div>

      <input
        ref={addInputRef}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        disabled={disabled}
        onChange={(event) => {
          handleAddFiles(event.target.files);
          event.target.value = "";
        }}
      />
      <input
        ref={replaceInputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        disabled={disabled}
        onChange={(event) => {
          handleReplaceFile(event.target.files);
          event.target.value = "";
        }}
      />
    </div>
  );
}

function PhotoTile({
  src,
  alt,
  disabled,
  onRemove,
  onReplace,
}: {
  src: string;
  alt: string;
  disabled?: boolean;
  onRemove?: () => void;
  onReplace?: () => void;
}) {
  return (
    <div className={cn("relative h-28 overflow-hidden border border-slate-200 bg-white", disabled && "opacity-60")}>
      <Image src={src} alt={alt} fill className="object-cover" unoptimized />
      {!disabled ? (
        <div className="absolute inset-x-0 bottom-0 flex gap-1 bg-black/55 p-1">
          {onReplace ? (
            <Button type="button" size="sm" variant="secondary" className="h-7 flex-1 px-2 text-xs" onClick={onReplace}>
              Replace
            </Button>
          ) : null}
          {onRemove ? (
            <Button type="button" size="sm" variant="destructive" className="h-7 px-2 text-xs" onClick={onRemove}>
              <X className="size-3.5" />
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
