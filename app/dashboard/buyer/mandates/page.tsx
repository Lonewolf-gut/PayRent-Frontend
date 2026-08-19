"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MandatePreviewCard } from "@/components/mandates/mandate-preview-card";
import type { MandatePreviewData } from "@/lib/utils/mandate-preview";
import { RefreshCw, Upload } from "lucide-react";
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
  const [selectedFinancingRequestId, setSelectedFinancingRequestId] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

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
      toast.success("Scanned mandate uploaded");
      setSelectedFile(null);
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

  const uploadablePreviews = previews.filter((preview) => preview.mandateId);
  const selectedPreview =
    uploadablePreviews.find((preview) => preview.financingRequestId === selectedFinancingRequestId) ??
    uploadablePreviews[0];

  const handleHeaderUpload = async () => {
    if (!selectedPreview?.mandateId) {
      toast.error("Select a Pay-for-Me request first");
      return;
    }
    if (!selectedFile) {
      toast.error("Choose a scanned mandate file to upload");
      return;
    }
    await handleUpload(selectedPreview.mandateId, selectedFile);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Repayment mandates</h1>
          <p className="text-muted-foreground">
            Your mandate appears as soon as you submit a Pay-for-Me request. Repayment totals are
            added after you accept the lender rate. You can also upload a bank-signed scanned
            mandate.
          </p>
        </div>

        {uploadablePreviews.length > 0 ? (
          <div className="w-full shrink-0 rounded-xl border border-border bg-muted/20 p-4 lg:max-w-md">
            <div className="mb-3 flex items-center gap-2">
              <Upload className="h-4 w-4 text-emerald-600" />
              <p className="text-sm font-medium">Upload scanned mandate</p>
            </div>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="mandate-request-select">Pay-for-Me request</Label>
                <Select
                  value={selectedPreview?.financingRequestId ?? ""}
                  onValueChange={setSelectedFinancingRequestId}
                >
                  <SelectTrigger id="mandate-request-select">
                    <SelectValue placeholder="Select request" />
                  </SelectTrigger>
                  <SelectContent>
                    {uploadablePreviews.map((preview) => (
                      <SelectItem
                        key={preview.financingRequestId}
                        value={preview.financingRequestId}
                      >
                        {preview.propertyName.replace(/^\[Demo\]\s*/i, "")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mandate-file-upload">Scanned form (PDF or image)</Label>
                <Input
                  id="mandate-file-upload"
                  type="file"
                  accept=".pdf,image/*"
                  disabled={Boolean(uploadingId)}
                  onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
                />
              </div>
              <Button
                type="button"
                size="sm"
                className="w-full bg-emerald-600 hover:bg-emerald-700"
                disabled={Boolean(uploadingId) || !selectedFile}
                onClick={handleHeaderUpload}
              >
                {uploadingId ? "Uploading..." : "Upload scanned mandate"}
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      {previewsLoading ? (
        <p className="text-muted-foreground">Loading mandates...</p>
      ) : !previews.length ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No Pay-for-Me requests yet. Submit a request from a listing and your mandate preview
            will appear here right away.
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

              {mandate?.documentUrl && mandate.mandateSource === "SCANNED_UPLOAD" ? (
                <p className="text-xs text-muted-foreground">
                  Scanned mandate uploaded. Submit it for admin review when you are ready.
                </p>
              ) : null}

              {mandate &&
              mandate.mandateSource === "SCANNED_UPLOAD" &&
              ["PENDING_SUBMISSION", "DRAFT", "REJECTED"].includes(mandate.status) ? (
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700"
                  disabled={submitMutation.isPending || !mandate.documentUrl}
                  onClick={() => submitMutation.mutate(mandate.id)}
                >
                  Submit scanned mandate for review
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
