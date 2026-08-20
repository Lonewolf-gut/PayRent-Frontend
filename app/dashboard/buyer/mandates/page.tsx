"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MandatePreviewCard } from "@/components/mandates/mandate-preview-card";
import { buildMandatePreview, type MandatePreviewData } from "@/lib/utils/mandate-preview";
import { RefreshCw, Upload } from "lucide-react";
import { toast } from "sonner";

type MandateRecord = {
  id: string;
  status: string;
  mandateSource: string;
  documentUrl?: string | null;
  financingRequest?: { id: string; property?: { name: string } };
};

const TERMINAL_FINANCING_STATUSES = new Set([
  "REJECTED",
  "WITHDRAWN",
  "CLOSED",
  "COMPLETED",
]);

async function fetchMandatePreviews(): Promise<MandatePreviewData[]> {
  const endpoints = ["/api/mandates/overview", "/api/financing/mandate-previews"];

  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint);
      const json = await res.json();
      if (res.ok && json.success !== false && Array.isArray(json.data)) {
        const active = (json.data as MandatePreviewData[]).filter(
          (preview) => !TERMINAL_FINANCING_STATUSES.has(preview.financingStatus)
        );
        if (active.length > 0) return active;
      }
    } catch {
      // try next endpoint
    }
  }

  const financingRes = await fetch("/api/financing");
  const financingJson = await financingRes.json();
  if (!financingRes.ok || financingJson.success === false) {
    throw new Error(financingJson.message ?? "Could not load mandates");
  }

  const requests = (financingJson.data ?? []).filter(
    (request: { status: string }) => !TERMINAL_FINANCING_STATUSES.has(request.status)
  );

  if (!requests.length) return [];

  for (const request of requests) {
    try {
      await fetch("/api/mandates/ensure-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ financingRequestId: request.id }),
      });
    } catch {
      // continue — preview load may still work
    }
  }

  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint);
      const json = await res.json();
      if (res.ok && json.success !== false && Array.isArray(json.data) && json.data.length > 0) {
        return json.data as MandatePreviewData[];
      }
    } catch {
      // try next endpoint
    }
  }

  return requests.map((request: Record<string, unknown>) =>
    buildMandatePreview({
      id: request.id as string,
      status: request.status as string,
      requestedAmount: request.requestedAmount as number,
      approvedAmount: request.approvedAmount as number | null,
      offeredInterestRate: request.offeredInterestRate as number | null,
      durationMonths: request.durationMonths as number,
      buyerAcceptedAt: request.buyerAcceptedAt as string | null,
      property: request.property as { name?: string },
      tenant: request.tenant as {
        fullName?: string;
        user?: { fullName?: string; email?: string };
      },
      feeDisclosure: request.feeDisclosure as {
        principalAmount?: number;
        interestRate?: number;
        totalRepayable?: number;
        monthlyPayment?: number;
      } | null,
      mandate: request.mandate as {
        id: string;
        status: string;
        mandateSource: string;
        documentUrl?: string | null;
      } | null,
      repaymentPreference: request.repaymentPreference as { bankAccountId?: string } | null,
    })
  );
}

export default function TenantMandatesPage() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

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

  const uploadFile = async (file: File) => {
    const targetPreview = previews[0];
    if (!targetPreview) {
      toast.error("Submit a Pay-for-Me request first");
      return;
    }

    setUploading(true);
    try {
      let mandateId = targetPreview.mandateId;
      if (!mandateId) {
        mandateId = await ensureDraftMandate(targetPreview.financingRequestId);
      }
      if (!mandateId) {
        throw new Error("Could not prepare a mandate for this request");
      }

      const formData = new FormData();
      formData.append("document", file);
      const res = await fetch(`/api/mandates/${mandateId}/upload`, {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);

      toast.success("Mandate uploaded");
      if (fileInputRef.current) fileInputRef.current.value = "";
      queryClient.invalidateQueries({ queryKey: ["mandates"] });
      queryClient.invalidateQueries({ queryKey: ["mandate-overview"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const getMandateForPreview = (preview: MandatePreviewData) =>
    mandates.find((mandate) => mandate.id === preview.mandateId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">Repayment mandates</h1>

        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf,application/pdf"
            capture="environment"
            className="hidden"
            disabled={uploading || !previews.length}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) uploadFile(file);
            }}
          />
          <Button
            type="button"
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700"
            disabled={uploading || !previews.length}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="mr-2 h-4 w-4" />
            {uploading ? "Uploading..." : "Upload mandate"}
          </Button>
        </div>
      </div>

      {previewsLoading ? (
        <p className="text-muted-foreground">Loading mandates...</p>
      ) : previewsError ? (
        <Card>
          <CardContent className="space-y-3 py-12 text-center">
            <p className="text-muted-foreground">
              Could not load mandates. Make sure PayRent-Backend is running on port 3001.
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
            <p>No mandates yet. Submit a Pay-for-Me request from a listing first.</p>
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
