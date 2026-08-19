"use client";

import { useEffect, useState } from "react";
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

async function fetchMandatePreviews(): Promise<MandatePreviewData[]> {
  const res = await fetch("/api/mandates/overview");
  const json = await res.json();

  if (!res.ok || json.success === false) {
    throw new Error(json.message ?? "Could not load mandate previews");
  }

  return (json.data ?? []) as MandatePreviewData[];
}

export default function TenantMandatesPage() {
  const queryClient = useQueryClient();
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [selectedFinancingRequestId, setSelectedFinancingRequestId] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const {
    data: previews = [],
    isLoading: previewsLoading,
    isError: previewsError,
    error: previewsErrorMessage,
  } = useQuery({
    queryKey: ["mandate-overview"],
    queryFn: fetchMandatePreviews,
    retry: 1,
  });

  const { data: mandates = [] } = useQuery({
    queryKey: ["mandates"],
    queryFn: async () => {
      const res = await fetch("/api/mandates");
      const json = await res.json();
      return (json.data ?? []) as MandateRecord[];
    },
  });

  useEffect(() => {
    if (previewsError && previewsErrorMessage instanceof Error) {
      toast.error(previewsErrorMessage.message);
    }
  }, [previewsError, previewsErrorMessage]);

  useEffect(() => {
    if (!selectedFinancingRequestId && previews.length > 0) {
      setSelectedFinancingRequestId(previews[0].financingRequestId);
    }
  }, [previews, selectedFinancingRequestId]);

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

  const ensureDraftMandate = async (financingRequestId: string) => {
    const res = await fetch("/api/mandates/ensure-draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ financingRequestId }),
    });
    const json = await res.json();
    if (!json.success) {
      throw new Error(json.message ?? "Could not prepare mandate for upload");
    }
    return json.data?.mandateId as string;
  };

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

  const selectedPreview =
    previews.find((preview) => preview.financingRequestId === selectedFinancingRequestId) ??
    previews[0];

  const handleHeaderUpload = async () => {
    if (!selectedPreview) {
      toast.error("Submit a Pay-for-Me request first");
      return;
    }
    if (!selectedFile) {
      toast.error("Choose a scanned mandate file to upload");
      return;
    }

    try {
      let mandateId = selectedPreview.mandateId;
      if (!mandateId) {
        mandateId = await ensureDraftMandate(selectedPreview.financingRequestId);
        await queryClient.invalidateQueries({ queryKey: ["mandate-overview"] });
      }
      if (!mandateId) {
        throw new Error("Could not prepare a mandate for this request");
      }
      await handleUpload(mandateId, selectedFile);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    }
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
                disabled={!previews.length}
              >
                <SelectTrigger id="mandate-request-select">
                  <SelectValue
                    placeholder={
                      previews.length ? "Select request" : "Submit Pay-for-Me request first"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {previews.map((preview) => (
                    <SelectItem key={preview.financingRequestId} value={preview.financingRequestId}>
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
                disabled={Boolean(uploadingId) || !previews.length}
                onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <Button
              type="button"
              size="sm"
              className="w-full bg-emerald-600 hover:bg-emerald-700"
              disabled={Boolean(uploadingId) || !selectedFile || !previews.length}
              onClick={handleHeaderUpload}
            >
              {uploadingId ? "Uploading..." : "Upload scanned mandate"}
            </Button>
            {!previews.length ? (
              <p className="text-xs text-muted-foreground">
                Submit a Pay-for-Me request from a listing to unlock mandate upload.
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {previewsLoading ? (
        <p className="text-muted-foreground">Loading mandates...</p>
      ) : previewsError ? (
        <Card>
          <CardContent className="space-y-3 py-12 text-center">
            <p className="text-muted-foreground">
              Could not load mandates. Make sure PayRent-Backend is running on port 3001 if you use
              split repos.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => queryClient.invalidateQueries({ queryKey: ["mandate-overview"] })}
            >
              Try again
            </Button>
          </CardContent>
        </Card>
      ) : !previews.length ? (
        <Card>
          <CardContent className="space-y-3 py-12 text-center text-muted-foreground">
            <p>
              No Pay-for-Me requests yet. Submit a request from a listing and your mandate preview
              will appear here right away.
            </p>
            <Button asChild size="sm" className="bg-emerald-600 hover:bg-emerald-700">
              <Link href="/properties">Browse listings</Link>
            </Button>
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
