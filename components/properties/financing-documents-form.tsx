"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { TenantFinancingDocType } from "@prisma/client";
import { FINANCING_DOC_LABELS } from "@/lib/constants/financing-docs";

export function FinancingDocumentsForm() {
  const queryClient = useQueryClient();

  const { data: kycStatus } = useQuery({
    queryKey: ["kyc-status"],
    queryFn: async () => {
      const res = await fetch("/api/kyc");
      const json = await res.json();
      return json.data;
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ["tenant-financing-docs"],
    queryFn: async () => {
      const res = await fetch("/api/buyer/financing-documents");
      const json = await res.json();
      if (!json.success) throw new Error(json.message ?? "Failed to load documents");
      return json.data as {
        documents: Array<{
          id: string;
          documentType: TenantFinancingDocType;
          fileName: string;
          status: string;
        }>;
        allApproved: boolean;
        requiredTypes: TenantFinancingDocType[];
      };
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async ({
      documentType,
      file,
    }: {
      documentType: TenantFinancingDocType;
      file: File;
    }) => {
      const formData = new FormData();
      formData.append("documentType", documentType);
      formData.append("document", file);
      const res = await fetch("/api/buyer/financing-documents", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message ?? json.error ?? "Upload failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-financing-docs"] });
      toast.success("Document uploaded for admin review");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading document requirements...</p>;
  }

  const docsByType = new Map(
    (data?.documents ?? []).map((doc) => [doc.documentType, doc])
  );
  const kycVerified = Boolean(kycStatus?.kycVerified);

  return (
    <div className="space-y-4">
      {!kycVerified ? (
        <div className="space-y-3 rounded-lg border border-border bg-muted/40 p-4 text-sm">
          <p className="text-foreground">
            Complete identity verification before uploading financing documents.
          </p>
          <Button className="bg-emerald-600 hover:bg-emerald-700" asChild>
            <Link href="/dashboard/buyer/kyc">Go to verification</Link>
          </Button>
        </div>
      ) : null}

      {data?.allApproved ? (
        <Badge className="bg-emerald-600">All financing documents approved</Badge>
      ) : data?.documents?.some((doc) => doc.status === "PENDING") ? (
        <div className="rounded-lg border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
          <p className="font-medium">Documents pending review</p>
          <p className="mt-1 text-sky-800/80">
            Your payslip and bank statements are with admin. Status stays pending until review
            completes and a lender can finance your request.
          </p>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Upload your current payslip and bank statements covering the last 6–12 months. An admin
          will review them before you can request financing on a property.
        </p>
      )}

      {(data?.requiredTypes ?? []).map((type) => {
        const existing = docsByType.get(type);
        return (
          <div key={type} className="space-y-2 rounded-lg border border-border bg-card p-3">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor={`doc-${type}`}>{FINANCING_DOC_LABELS[type]}</Label>
              {existing ? (
                <Badge
                  variant={
                    existing.status === "APPROVED"
                      ? "default"
                      : existing.status === "REJECTED"
                        ? "destructive"
                        : "secondary"
                  }
                >
                  {existing.status.toLowerCase()}
                </Badge>
              ) : null}
            </div>
            <Input
              id={`doc-${type}`}
              type="file"
              accept=".pdf,image/*"
              className="rounded-none"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadMutation.mutate({ documentType: type, file });
                e.target.value = "";
              }}
              disabled={uploadMutation.isPending || !kycVerified}
            />
            {existing ? (
              <p className="text-xs text-muted-foreground">Uploaded: {existing.fileName}</p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
