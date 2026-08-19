"use client";

import { DocumentCaptureInput } from "@/components/shared/document-capture-input";

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
  return (
    <DocumentCaptureInput
      label={label}
      accept={accept}
      disabled={disabled}
      value={file}
      onChange={onChange}
    />
  );
}
