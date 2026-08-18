"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { SecureFileLink, useSecureFileUrl } from "@/components/shared/secure-file-link";

type FinancingDocumentPreviewProps = {
  documentId: string;
  fileName: string;
};

export function FinancingDocumentPreview({
  documentId,
  fileName,
}: FinancingDocumentPreviewProps) {
  const { openFile, loading } = useSecureFileUrl();
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void openFile({ scope: "financing", documentId }).then((nextUrl) => {
      if (active) setUrl(nextUrl);
    }).catch(() => {
      if (active) setUrl(null);
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId]);

  const lowerName = fileName.toLowerCase();
  const isPdf = lowerName.endsWith(".pdf");
  const isImage = /\.(png|jpe?g|gif|webp)$/i.test(lowerName);

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-none border border-border bg-muted/20">
        {loading ? (
          <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
            Loading preview…
          </div>
        ) : !url ? (
          <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
            Preview unavailable
          </div>
        ) : isPdf ? (
          <iframe title={fileName} src={url} className="h-72 w-full bg-white" />
        ) : isImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={fileName} className="max-h-72 w-full object-contain bg-white" />
        ) : (
          <div className="flex h-64 items-center justify-center px-4 text-center text-sm text-muted-foreground">
            Preview not supported for this file type. Download to review.
          </div>
        )}
      </div>
      <Button variant="outline" size="sm" className="rounded-none" asChild>
        <SecureFileLink download request={{ scope: "financing", documentId: documentId }}>
          Download {fileName}
        </SecureFileLink>
      </Button>
    </div>
  );
}
