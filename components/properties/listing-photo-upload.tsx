"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef } from "react";
import { ImagePlus, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ListingExistingPhoto = {
  id: string;
  url: string;
  alt?: string | null;
};

type ListingPhotoUploadProps = {
  files: File[];
  onFilesChange: (files: File[]) => void;
  existingPhotos?: ListingExistingPhoto[];
  removedExistingIds?: string[];
  onRemoveExisting?: (id: string) => void;
  onReplaceExisting?: (id: string, file: File) => void;
  maxFiles?: number;
  helperText?: string;
  error?: string | null;
};

function getVisibleExisting(
  existingPhotos: ListingExistingPhoto[],
  removedExistingIds: string[]
) {
  return existingPhotos.filter((photo) => !removedExistingIds.includes(photo.id));
}

export function ListingPhotoUpload({
  files,
  onFilesChange,
  existingPhotos = [],
  removedExistingIds = [],
  onRemoveExisting,
  onReplaceExisting,
  maxFiles = 10,
  helperText = "Upload up to 10 photos for admin review.",
  error,
}: ListingPhotoUploadProps) {
  const addInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const replaceTargetRef = useRef<{ kind: "new"; index: number } | { kind: "existing"; id: string } | null>(
    null
  );

  const visibleExisting = getVisibleExisting(existingPhotos, removedExistingIds);
  const totalCount = visibleExisting.length + files.length;
  const remainingSlots = Math.max(0, maxFiles - totalCount);
  const newPhotoPreviews = useMemo(
    () => files.map((file) => ({ file, src: URL.createObjectURL(file) })),
    [files]
  );

  useEffect(() => {
    return () => {
      newPhotoPreviews.forEach(({ src }) => URL.revokeObjectURL(src));
    };
  }, [newPhotoPreviews]);

  const openReplacePicker = (target: NonNullable<typeof replaceTargetRef.current>) => {
    replaceTargetRef.current = target;
    replaceInputRef.current?.click();
  };

  const handleAddFiles = (fileList: FileList | null) => {
    if (!fileList?.length) return;
    const selected = Array.from(fileList);
    const next = [...files, ...selected];
    if (visibleExisting.length + next.length > maxFiles) {
      onFilesChange(next.slice(0, maxFiles - visibleExisting.length));
      return;
    }
    onFilesChange(next);
  };

  const handleReplaceFile = (fileList: FileList | null) => {
    const target = replaceTargetRef.current;
    replaceTargetRef.current = null;
    if (!target || !fileList?.[0]) return;

    const file = fileList[0];
    if (target.kind === "new") {
      onFilesChange(files.map((current, index) => (index === target.index ? file : current)));
      return;
    }

    onReplaceExisting?.(target.id, file);
  };

  const removeNewFile = (index: number) => {
    onFilesChange(files.filter((_, itemIndex) => itemIndex !== index));
  };

  return (
    <div className="space-y-3">
      <input
        ref={addInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(event) => {
          handleAddFiles(event.target.files);
          event.target.value = "";
        }}
      />
      <input
        ref={replaceInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          handleReplaceFile(event.target.files);
          event.target.value = "";
        }}
      />

      {visibleExisting.length > 0 || files.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visibleExisting.map((photo) => (
            <PhotoTile
              key={photo.id}
              src={photo.url}
              alt={photo.alt ?? "Listing photo"}
              label="Saved photo"
              onChange={() => openReplacePicker({ kind: "existing", id: photo.id })}
              onRemove={() => onRemoveExisting?.(photo.id)}
            />
          ))}
          {newPhotoPreviews.map(({ file, src }, index) => (
            <PhotoTile
              key={`${file.name}-${file.lastModified}-${index}`}
              src={src}
              alt={file.name}
              label={file.name}
              onChange={() => openReplacePicker({ kind: "new", index })}
              onRemove={() => removeNewFile(index)}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-8 text-center">
          <ImagePlus className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">No photos added yet.</p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={remainingSlots === 0}
          onClick={() => addInputRef.current?.click()}
        >
          <ImagePlus className="mr-2 h-4 w-4" />
          {totalCount === 0 ? "Add photos" : `Add more (${remainingSlots} left)`}
        </Button>
        <p className="text-xs text-muted-foreground">
          {helperText} Use Change or Remove on each photo before submitting.
        </p>
      </div>

      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

function PhotoTile({
  src,
  alt,
  label,
  onChange,
  onRemove,
}: {
  src: string;
  alt: string;
  label: string;
  onChange: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="relative aspect-[4/3] bg-muted/30">
        <Image src={src} alt={alt} fill className="object-cover" unoptimized />
      </div>
      <div className="space-y-2 border-t border-border p-3">
        <p className="truncate text-xs text-muted-foreground" title={label}>
          {label}
        </p>
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className={cn("h-8 flex-1 text-xs")}
            onClick={onChange}
          >
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            Change
          </Button>
          <Button
            type="button"
            size="sm"
            variant="destructive"
            className="h-8 flex-1 text-xs"
            onClick={onRemove}
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            Remove
          </Button>
        </div>
      </div>
    </div>
  );
}
