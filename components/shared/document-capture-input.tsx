"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

type DocumentCaptureInputProps = {
  label: string;
  accept?: string;
  disabled?: boolean;
  value?: File | null;
  onChange: (file: File | null) => void;
};

export function DocumentCaptureInput({
  label,
  accept = "image/*,.pdf",
  disabled,
  value,
  onChange,
}: DocumentCaptureInputProps) {
  const uploadRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => uploadRef.current?.click()}
        >
          Upload
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => cameraRef.current?.click()}
        >
          Take photo
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        {value ? value.name : `${label} (.jpg, .png, .pdf)`}
      </p>
      <input
        ref={uploadRef}
        type="file"
        accept={accept}
        className="hidden"
        disabled={disabled}
        onChange={(event) => onChange(event.target.files?.[0] ?? null)}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        disabled={disabled}
        onChange={(event) => onChange(event.target.files?.[0] ?? null)}
      />
    </div>
  );
}
