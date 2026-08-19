"use client";

import { useRef } from "react";
import { Camera, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type DocumentCaptureInputProps = {
  label: string;
  accept?: string;
  disabled?: boolean;
  value?: File | null;
  onChange: (file: File | null) => void;
  className?: string;
};

export function DocumentCaptureInput({
  label,
  accept = "image/*,.pdf",
  disabled,
  value,
  onChange,
  className,
}: DocumentCaptureInputProps) {
  const uploadRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File | null) => {
    onChange(file);
  };

  const openUpload = () => {
    if (!disabled) uploadRef.current?.click();
  };

  return (
    <div className={cn("space-y-2", className)}>
      <Label>{label}</Label>
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(event) => {
          if (disabled) return;
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openUpload();
          }
        }}
        onClick={openUpload}
        className={cn(
          "rounded-lg border border-dashed border-border bg-muted/20 p-4 transition-colors",
          !disabled && "cursor-pointer hover:border-emerald-500/50 hover:bg-muted/40",
          disabled && "cursor-not-allowed opacity-60"
        )}
      >
        <div className="flex flex-col items-center gap-3 text-center">
          {value ? (
            <p className="text-sm font-medium text-foreground">{value.name}</p>
          ) : (
            <p className="text-sm text-muted-foreground">No file selected</p>
          )}
          <div
            className="flex flex-wrap justify-center gap-2"
            onClick={(event) => event.stopPropagation()}
          >
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
              onClick={openUpload}
            >
              <Upload className="mr-1.5 size-4" />
              Upload
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
              onClick={() => cameraRef.current?.click()}
            >
              <Camera className="mr-1.5 size-4" />
              Take photo
            </Button>
            {value ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={disabled}
                onClick={() => {
                  onChange(null);
                  if (uploadRef.current) uploadRef.current.value = "";
                  if (cameraRef.current) cameraRef.current.value = "";
                }}
              >
                Remove
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <input
        ref={uploadRef}
        type="file"
        accept={accept}
        className="sr-only"
        disabled={disabled}
        onChange={(event) => {
          handleFile(event.target.files?.[0] ?? null);
          event.target.value = "";
        }}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="user"
        className="sr-only"
        disabled={disabled}
        onChange={(event) => {
          handleFile(event.target.files?.[0] ?? null);
          event.target.value = "";
        }}
      />
    </div>
  );
}
