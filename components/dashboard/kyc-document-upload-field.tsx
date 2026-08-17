"use client";

import { useRef } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

type KycDocumentUploadFieldProps = {
  label: string;
  accept?: string;
  disabled?: boolean;
  file: File | null;
  onChange: (file: File | null) => void;
};

export function KycDocumentUploadField({
  label,
  accept = "image/*,.pdf",
  disabled = false,
  file,
  onChange,
}: KycDocumentUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        disabled={disabled}
        className="hidden"
        onChange={(event) => onChange(event.target.files?.[0] ?? null)}
      />
      <Button
        type="button"
        variant="outline"
        className="w-full justify-start gap-2 sm:w-auto"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
      >
        <Upload className="h-4 w-4" />
        {file ? "Change file" : label}
      </Button>
      {file ? (
        <p className="text-xs text-muted-foreground">Selected: {file.name}</p>
      ) : (
        <p className="text-xs text-muted-foreground">No file selected yet.</p>
      )}
    </div>
  );
}
