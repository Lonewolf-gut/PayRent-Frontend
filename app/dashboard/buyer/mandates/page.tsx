"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MandatePreviewCard } from "@/components/mandates/mandate-preview-card";
import type { MandatePreviewData } from "@/lib/utils/mandate-preview";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";

type MandateRecord = {
  id: string;
  status: string;
  mandateSource: string;
  documentUrl?: string | null;
  financingRequest?: { id: string; property?: { name: string } };
};

export default function TenantMandatesPage() {
  const queryClient = useQueryClient();
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  const { data: previews = [], isLoading: previewsLoading } = useQuery({
    queryKey: ["mandate-overview"],
    queryFn: async () => {
      const res = await fetch("/api/mandates/overview");
      const json = await res.json();
      return (json.data ?? []) as MandatePreviewData[];
    },
  });

  const { data: mandates = [] } = useQuery({
    queryKey: ["mandates"],
    queryFn: async () => {
      const res = await fetch("/api/mandates");
      const json = await res.json();
      return (json.data ?? []) as MandateRecord[];
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (mandateId: string) => {
      const res = await fetch("/api/mandates", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mandateId }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
    },
    onSuccess: () => {
      toast.success("Mandate submitted for review");
      queryClient.invalidateQueries({ queryKey: ["mandates"] });
      queryClient.invalidateQueries({ queryKey: ["mandate-overview"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const syncMutation = useMutation({
    mutationFn: async (mandateId: string) => {
      const res = await fetch(`/api/mandates/${mandateId}/status`);
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
    },
    onSuccess: () => {
      toast.success("Bank status refreshed");
      queryClient.invalidateQueries({ queryKey: ["mandates"] });
      queryClient.invalidateQueries({ queryKey: ["mandate-overview"] });
      queryClient.invalidateQueries({ queryKey: ["financing"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleUpload = async (mandateId: string, file: File) => {
    setUploadingId(mandateId);
    try {
      const formData = new FormData();
      formData.append("document", file);
      const res = await fetch(`/api/mandates/${mandateId}/upload`, {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      toast.success("Mandate document uploaded");
      queryClient.invalidateQueries({ queryKey: ["mandates"] });
      queryClient.invalidateQueries({ queryKey: ["mandate-overview"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploadingId(null);
    }
  };

  const getMandateForPreview = (preview: MandatePreviewData) =>
    mandates.find((mandate) => mandate.id === preview.mandateId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Repayment mandates</h1>
        <p className="text-muted-foreground">
          Track platform-generated mandates and upload your own signed bank mandate forms for
          Pay-for-Me financing.
        </p>
      </div>

      {previewsLoading ? (
        <p className="text-muted-foreground">Loading mandates...</p>
      ) : !previews.length ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No Pay-for-Me requests yet. Submit a request from a listing, then your mandate will
            appear here after a lender sets your rate.
          </CardContent>
        </Card>
      ) : (
        previews.map((preview) => {
          const mandate = getMandateForPreview(preview);
          return (
            <div key={preview.financingRequestId} className="space-y-4">
              <MandatePreviewCard preview={preview} />

              {preview.previewStatus === "awaiting_buyer" ? (
                <div className="flex flex-wrap gap-2">
                  <Button asChild size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                    <Link href="/dashboard/buyer/financing">Review lender offer</Link>
                  </Button>
                </div>
              ) : null}

              {mandate?.mandateSource === "SCANNED_UPLOAD" &&
              ["PENDING_SUBMISSION", "DRAFT", "REJECTED"].includes(mandate.status) ? (
                <div className="space-y-3 rounded-xl border border-dashed border-border p-4">
                  <p className="text-sm font-medium">Upload your signed mandate</p>
                  <Label htmlFor={`upload-${mandate.id}`}>Scanned mandate form (PDF or image)</Label>
                  <Input
                    id={`upload-${mandate.id}`}
                    type="file"
                    accept=".pdf,image/*"
                    disabled={uploadingId === mandate.id}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUpload(mandate.id, file);
                    }}
                  />
                  <p className="text-xs text-muted-foreground">
                    Upload your bank-signed mandate, then submit it for admin review.
                  </p>
                </div>
              ) : null}

              {mandate && ["PENDING_SUBMISSION", "DRAFT"].includes(mandate.status) ? (
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700"
                  disabled={
                    submitMutation.isPending ||
                    (mandate.mandateSource === "SCANNED_UPLOAD" && !mandate.documentUrl)
                  }
                  onClick={() => submitMutation.mutate(mandate.id)}
                >
                  Submit mandate for review
                </Button>
              ) : null}

              {mandate && ["BANK_PROCESSING", "PENDING_MANUAL_RESOLUTION"].includes(mandate.status) ? (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={syncMutation.isPending}
                  onClick={() => syncMutation.mutate(mandate.id)}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh bank status
                </Button>
              ) : null}
            </div>
          );
        })
      )}
    </div>
  );
}
