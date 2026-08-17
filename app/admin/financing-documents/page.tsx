"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { FINANCING_DOC_LABELS, KYC_DOCUMENT_LABELS } from "@/lib/constants/financing-docs";
import type { TenantFinancingDocType } from "@prisma/client";
import { SecureFileLink } from "@/components/shared/secure-file-link";
import { toast } from "sonner";

type FinancingDocRow = {
  id: string;
  documentType: TenantFinancingDocType;
  fileName: string;
  fileUrl: string;
  status: string;
};

type FinancingRequestReviewRow = {
  financingRequestId: string;
  requestedAmount: string | number;
  durationMonths: number;
  financingStatus: string;
  pendingCount: number;
  property: { id: string; name: string; location: string };
  application: { id: string; status: string } | null;
  bankAccount: {
    bankName: string;
    accountName: string;
    accountNumberMasked?: string | null;
    isVerified: boolean;
  } | null;
  repaymentPreference: { mandateDebitConsent?: boolean } | null;
  documents: FinancingDocRow[];
  approvedHistory: Array<{
    id: string;
    documentType: TenantFinancingDocType;
    fileName: string;
    status: string;
    reviewedAt?: string | null;
    financingRequest: { property: { name: string }; createdAt: string };
  }>;
  kycSummary: {
    tenantId: string;
    fullName: string;
    email: string;
    phone?: string | null;
    kycVerified: boolean;
    employmentVerified: boolean;
    addressVerified: boolean;
    entityType: string;
    kycDocuments: Array<{ id: string; documentType: string; fileName: string; fileUrl: string }>;
    verifications: Array<{ id: string; type: string; status: string }>;
  };
};

export default function AdminFinancingDocumentsPage() {
  const queryClient = useQueryClient();
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin-financing-docs"],
    queryFn: async () => {
      const res = await fetch("/api/admin/financing-documents?status=PENDING");
      const json = await res.json();
      return (json.data ?? []) as FinancingRequestReviewRow[];
    },
  });

  const pendingRows = useMemo(
    () => rows.filter((row) => row.pendingCount > 0),
    [rows]
  );

  const selectedRow =
    pendingRows.find((row) => row.financingRequestId === selectedRequestId) ?? null;

  const reviewMutation = useMutation({
    mutationFn: async ({
      documentId,
      status,
    }: {
      documentId: string;
      status: "APPROVED" | "REJECTED";
    }) => {
      const res = await fetch("/api/admin/financing-documents", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId, status }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message ?? "Review failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-financing-docs"] });
      toast.success("Document review saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Financing application documents</h1>
        <p className="text-muted-foreground">
          Review payslips, bank statements, and repayment mandate details for each Pay-for-Me
          request. Approved documents are kept on the customer&apos;s history.
        </p>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : !pendingRows.length ? (
        <p className="text-muted-foreground">No pending documents.</p>
      ) : (
        <Card className="rounded-none">
          <CardContent className="divide-y p-0">
            {pendingRows.map((row) => (
              <button
                key={row.financingRequestId}
                type="button"
                onClick={() => setSelectedRequestId(row.financingRequestId)}
                className="flex w-full items-center gap-4 px-4 py-4 text-left transition-colors hover:bg-muted/40"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="truncate font-medium">{row.kycSummary.fullName}</p>
                  <p className="text-sm text-muted-foreground">
                    {row.property.name.replace(/^\[Demo\]\s*/i, "")} · GHS{" "}
                    {Number(row.requestedAmount).toLocaleString()} · {row.durationMonths} months
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {row.documents
                      .map((doc) => FINANCING_DOC_LABELS[doc.documentType])
                      .join(" · ")}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <Badge variant={row.kycSummary.kycVerified ? "default" : "secondary"}>
                    {row.kycSummary.kycVerified ? "KYC verified" : "KYC pending"}
                  </Badge>
                  <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                    {row.pendingCount} pending
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      <Sheet
        open={Boolean(selectedRow)}
        onOpenChange={(open) => {
          if (!open) setSelectedRequestId(null);
        }}
      >
        <SheetContent side="right" variant="wide" className="gap-0 p-0">
          {selectedRow ? (
            <>
              <SheetHeader className="border-b border-border px-6 py-5 pr-14">
                <SheetTitle>{selectedRow.kycSummary.fullName}</SheetTitle>
                <SheetDescription>
                  {selectedRow.property.name.replace(/^\[Demo\]\s*/i, "")} ·{" "}
                  {selectedRow.kycSummary.email}
                  {selectedRow.kycSummary.phone ? ` · ${selectedRow.kycSummary.phone}` : ""}
                </SheetDescription>
              </SheetHeader>

              <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-none border border-border bg-card p-3 text-sm">
                    <p className="font-medium">Application</p>
                    <p className="text-muted-foreground">
                      {selectedRow.application?.status ?? "Not linked"}
                    </p>
                  </div>
                  <div className="rounded-none border border-border bg-card p-3 text-sm">
                    <p className="font-medium">Financing request</p>
                    <p className="text-muted-foreground">{selectedRow.financingStatus}</p>
                  </div>
                  <div className="rounded-none border border-border bg-card p-3 text-sm">
                    <p className="font-medium">Repayment mandate</p>
                    <p className="text-muted-foreground">
                      {selectedRow.repaymentPreference?.mandateDebitConsent
                        ? "Debit consent given"
                        : "No consent recorded"}
                    </p>
                  </div>
                </div>

                {selectedRow.bankAccount ? (
                  <div className="rounded-none border border-border bg-muted/20 p-4 text-sm">
                    <p className="font-medium">Repayment bank account</p>
                    <p className="text-muted-foreground">
                      {selectedRow.bankAccount.bankName} ·{" "}
                      {selectedRow.bankAccount.accountNumberMasked ?? "****"} ·{" "}
                      {selectedRow.bankAccount.accountName}
                      {selectedRow.bankAccount.isVerified ? " · verified" : ""}
                    </p>
                  </div>
                ) : null}

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-none border border-border bg-card p-3 text-sm">
                    <p className="font-medium">Identity</p>
                    <p className="text-muted-foreground">
                      {selectedRow.kycSummary.kycVerified ? "Verified" : "Not verified"}
                    </p>
                  </div>
                  <div className="rounded-none border border-border bg-card p-3 text-sm">
                    <p className="font-medium">Employment</p>
                    <p className="text-muted-foreground">
                      {selectedRow.kycSummary.employmentVerified ? "Verified" : "Pending"}
                    </p>
                  </div>
                  <div className="rounded-none border border-border bg-card p-3 text-sm">
                    <p className="font-medium">Address</p>
                    <p className="text-muted-foreground">
                      {selectedRow.kycSummary.addressVerified ? "Verified" : "Pending"}
                    </p>
                  </div>
                </div>

                {selectedRow.kycSummary.kycDocuments.length ? (
                  <div className="space-y-2">
                    <p className="font-medium">KYC documents</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {selectedRow.kycSummary.kycDocuments.map((doc) => (
                        <SecureFileLink
                          key={doc.id}
                          request={{ scope: "kyc", documentId: doc.id }}
                          className="rounded-none border border-border bg-card p-3 text-sm text-emerald-600 hover:underline dark:text-emerald-400"
                        >
                          {KYC_DOCUMENT_LABELS[doc.documentType] ?? doc.documentType} ·{" "}
                          {doc.fileName}
                        </SecureFileLink>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="space-y-4">
                  <p className="font-medium">Documents for this request</p>
                  {selectedRow.documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="space-y-3 rounded-none border border-border bg-muted/20 p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">{FINANCING_DOC_LABELS[doc.documentType]}</p>
                          <p className="text-sm text-muted-foreground">{doc.fileName}</p>
                        </div>
                        <Badge variant="secondary">{doc.status}</Badge>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" className="rounded-none" asChild>
                          <SecureFileLink request={{ scope: "financing", documentId: doc.id }}>
                            View file
                          </SecureFileLink>
                        </Button>
                        {doc.status === "PENDING" ? (
                          <>
                            <Button
                              size="sm"
                              className="rounded-none bg-emerald-600 hover:bg-emerald-700"
                              disabled={reviewMutation.isPending}
                              onClick={() =>
                                reviewMutation.mutate({
                                  documentId: doc.id,
                                  status: "APPROVED",
                                })
                              }
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="rounded-none"
                              disabled={reviewMutation.isPending}
                              onClick={() =>
                                reviewMutation.mutate({
                                  documentId: doc.id,
                                  status: "REJECTED",
                                })
                              }
                            >
                              Reject
                            </Button>
                          </>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>

                {selectedRow.approvedHistory.length ? (
                  <div className="space-y-3">
                    <p className="font-medium">Previously approved documents</p>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      {selectedRow.approvedHistory.slice(0, 8).map((doc) => (
                        <li key={doc.id} className="flex flex-wrap items-center gap-2">
                          <span>
                            {FINANCING_DOC_LABELS[doc.documentType]} · {doc.fileName} ·{" "}
                            {doc.financingRequest.property.name.replace(/^\[Demo\]\s*/i, "")}
                          </span>
                          <SecureFileLink
                            request={{ scope: "financing", documentId: doc.id }}
                            className="text-emerald-600 hover:underline dark:text-emerald-400"
                          >
                            View
                          </SecureFileLink>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
