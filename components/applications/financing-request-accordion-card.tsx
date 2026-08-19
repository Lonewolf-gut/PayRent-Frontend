"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
import { StatusBadge } from "@/components/dashboard/status-badge";
import { APPLICATION_STATUS_LABELS } from "@/constants/platform";
import { FINANCING_DOC_LABELS } from "@/lib/constants/financing-docs";
import { REPAYMENT_PERIOD_OPTIONS } from "@/lib/constants/financing-repayment";
import {
  buildRequestPipeline,
  getCurrentApproverLabel,
  getFinancingStatusLabel,
} from "@/lib/financing/request-pipeline";
import { toast } from "sonner";
import type { TenantFinancingDocType } from "@prisma/client";

type RequestDocumentBundle = {
  financingRequestId?: string;
  allApproved?: boolean;
  canReplace?: boolean;
  documents?: Array<{
    id: string;
    documentType: TenantFinancingDocType;
    status: string;
    fileName: string;
  }>;
};

type FinancingRequestAccordionCardProps = {
  application: {
    id: string;
    status: string;
    propertyId: string;
    property?: { name: string; location: string };
    decisionReason?: string | null;
  };
  financing?: {
    id: string;
    status: string;
    requestedAmount: number | string;
    approvedAmount?: number | string | null;
    offeredInterestRate?: number | string | null;
    offeredPlanType?: string | null;
    durationMonths: number;
    buyerAcceptedAt?: string | null;
    repaymentPreference?: { bankAccountId?: string } | null;
    feeDisclosure?: {
      totalRepayable?: number | string;
      monthlyPayment?: number | string;
      interestRate?: number | string;
      principalAmount?: number | string;
    } | null;
  } | null;
  financingDocs?: RequestDocumentBundle | null;
};

function showFinancingStatusOnly(financingStatus?: string | null) {
  if (!financingStatus || financingStatus === "CREATED") return false;
  return [
    "ELIGIBILITY_PENDING",
    "READY_FOR_LENDER_REVIEW",
    "PENDING",
    "UNDER_REVIEW",
    "APPROVED",
    "MANDATE_PENDING",
    "DISBURSED",
    "REPAYMENT_ACTIVE",
    "REJECTED",
  ].includes(financingStatus);
}

function displayListingName(name?: string) {
  return name?.replace(/^\[Demo\]\s*/i, "") ?? "Listing";
}

export function canEditFinancingRequest(
  applicationStatus: string,
  financingStatus?: string | null
) {
  if (applicationStatus !== "SUBMITTED") return false;
  if (financingStatus === "REJECTED") return false;
  if (financingStatus && financingStatus !== "CREATED") return false;
  return true;
}

export function canReplaceFinancingDocuments(
  applicationStatus: string,
  financingDocs?: RequestDocumentBundle | null
) {
  if (applicationStatus !== "SUBMITTED") return false;
  if (financingDocs?.canReplace === false) return false;
  return true;
}

export function FinancingRequestAccordionCard({
  application,
  financing,
  financingDocs,
}: FinancingRequestAccordionCardProps) {
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState(String(financing?.requestedAmount ?? ""));
  const [months, setMonths] = useState(String(financing?.durationMonths ?? 12));
  const [docFiles, setDocFiles] = useState<Partial<Record<TenantFinancingDocType, File>>>({});

  const financingRequestId = financing?.id ?? financingDocs?.financingRequestId;
  const pipeline = buildRequestPipeline({
    applicationStatus: application.status,
    financingStatus: financing?.status,
    financingDocsApproved: Boolean(financingDocs?.allApproved),
    kycVerified: true,
    hasFinancingRequest: Boolean(financingRequestId),
  });
  const waitingLabel = getCurrentApproverLabel(pipeline);
  const editable = canEditFinancingRequest(application.status, financing?.status);
  const replaceableDocs = canReplaceFinancingDocuments(application.status, financingDocs);
  const isRejected =
    application.status === "REJECTED" || financing?.status === "REJECTED";
  const financingPrimary = showFinancingStatusOnly(financing?.status);
  const offerAmount = Number(
    financing?.approvedAmount ?? financing?.feeDisclosure?.principalAmount ?? financing?.requestedAmount ?? 0
  );
  const offerRate = Number(
    financing?.offeredInterestRate ?? financing?.feeDisclosure?.interestRate ?? 0
  );
  const monthlyPayment = Number(financing?.feeDisclosure?.monthlyPayment ?? 0);
  const totalRepayable = Number(financing?.feeDisclosure?.totalRepayable ?? 0);
  const canAcceptOffer = financing?.status === "APPROVED" && !financing?.buyerAcceptedAt;

  const acceptOfferMutation = useMutation({
    mutationFn: async () => {
      if (!financingRequestId) throw new Error("Financing request not found.");
      const res = await fetch("/api/financing/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ financingRequestId }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message ?? json.error?.message ?? "Could not accept offer");
    },
    onSuccess: () => {
      toast.success("Offer accepted — repayment mandate sent to bank");
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      queryClient.invalidateQueries({ queryKey: ["financing"] });
      queryClient.invalidateQueries({ queryKey: ["mandate-overview"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const declineOfferMutation = useMutation({
    mutationFn: async () => {
      if (!financingRequestId) throw new Error("Financing request not found.");
      const res = await fetch("/api/financing/decline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ financingRequestId }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message ?? json.error?.message ?? "Could not decline offer");
    },
    onSuccess: () => {
      toast.success("Offer declined — mandate cancelled");
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      queryClient.invalidateQueries({ queryKey: ["financing"] });
      queryClient.invalidateQueries({ queryKey: ["mandate-overview"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeDocMutation = useMutation({
    mutationFn: async (documentType: TenantFinancingDocType) => {
      if (!financingRequestId) throw new Error("Financing request not found.");
      const res = await fetch(
        `/api/financing/${financingRequestId}/documents?documentType=${documentType}`,
        { method: "DELETE" }
      );
      const json = await res.json();
      if (!json.success) throw new Error(json.message ?? "Could not remove document");
    },
    onSuccess: () => {
      toast.success("Document removed");
      queryClient.invalidateQueries({ queryKey: ["buyer-financing-documents"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editable && !replaceableDocs) {
        throw new Error("This request can no longer be edited.");
      }
      if (!financingRequestId) throw new Error("Financing request not found.");

      for (const [type, file] of Object.entries(docFiles) as [TenantFinancingDocType, File][]) {
        if (!file) continue;
        const formData = new FormData();
        formData.append("documentType", type);
        formData.append("document", file);
        const res = await fetch(`/api/financing/${financingRequestId}/documents`, {
          method: "POST",
          body: formData,
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.message ?? "Document upload failed");
      }

      if (editable && (financing?.status === "CREATED" || !financing)) {
        const res = await fetch("/api/financing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            propertyId: application.propertyId,
            applicationId: application.id,
            requestedAmount: parseFloat(amount),
            durationMonths: parseInt(months, 10),
            repaymentPreference: financing?.repaymentPreference ?? {
              preferredChannel: "BANK_MANDATE",
            },
            dataProcessingConsent: true,
          }),
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.message ?? "Could not save changes");
      }
    },
    onSuccess: () => {
      toast.success("Changes saved");
      setDocFiles({});
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      queryClient.invalidateQueries({ queryKey: ["financing"] });
      queryClient.invalidateQueries({ queryKey: ["buyer-financing-documents"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Accordion type="single" collapsible className="rounded-none border bg-card">
      <AccordionItem value={application.id} className="border-0">
        <AccordionTrigger className="px-4 hover:no-underline">
          <div className="flex w-full flex-col gap-2 pr-4 text-left sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-base font-semibold text-foreground">
                {displayListingName(application.property?.name)}
              </p>
              <p className="text-sm text-muted-foreground">{application.property?.location}</p>
              <p className="mt-2 text-sm font-medium text-foreground">{waitingLabel}</p>
            </div>
            <div className="flex flex-col items-start gap-2 sm:items-end">
              {!financingPrimary ? (
                <StatusBadge
                  status={application.status}
                  label={APPLICATION_STATUS_LABELS[application.status] ?? application.status}
                />
              ) : null}
              {financing ? (
                <StatusBadge
                  status={financing.status}
                  label={getFinancingStatusLabel(financing.status) ?? financing.status}
                />
              ) : null}
            </div>
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-4 pb-4">
          {isRejected ? (
            <div className="rounded-none border border-destructive/30 bg-destructive/5 p-3 text-sm">
              <p className="font-medium text-destructive">Request rejected</p>
              {application.decisionReason ? (
                <p className="mt-1 text-muted-foreground">{application.decisionReason}</p>
              ) : (
                <p className="mt-1 text-muted-foreground">
                  Contact support or submit a new request from the listing page.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {financing ? (
                <p className="text-sm text-muted-foreground">
                  GHS {Number(financing.requestedAmount).toLocaleString()} ·{" "}
                  {financing.durationMonths} months
                </p>
              ) : null}

              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Attachments</p>
                {(financingDocs?.documents ?? []).map((doc) => (
                  <div
                    key={doc.documentType}
                    className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground"
                  >
                    <span>
                      {FINANCING_DOC_LABELS[doc.documentType]}: {doc.fileName} (
                      {doc.status.toLowerCase()})
                    </span>
                    {replaceableDocs && doc.status !== "APPROVED" ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-auto px-2 py-1 text-destructive"
                        disabled={removeDocMutation.isPending}
                        onClick={() => removeDocMutation.mutate(doc.documentType)}
                      >
                        Remove
                      </Button>
                    ) : null}
                  </div>
                ))}
                {!financingDocs?.documents?.length ? (
                  <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>
                ) : null}
              </div>

              {editable || replaceableDocs ? (
                <div className="space-y-3 rounded-none border border-dashed p-4">
                  <p className="text-sm font-medium">
                    {editable ? "Edit request" : "Replace documents"}
                  </p>
                  {editable ? (
                    <>
                      <div>
                        <Label>Amount (GHS)</Label>
                        <Input
                          type="number"
                          className="rounded-none"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Repayment period</Label>
                        <Select value={months} onValueChange={setMonths}>
                          <SelectTrigger className="rounded-none">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {REPAYMENT_PERIOD_OPTIONS.map((option) => (
                              <SelectItem key={option.months} value={String(option.months)}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  ) : null}
                  {replaceableDocs
                    ? (["PAYSLIP", "BANK_STATEMENT"] as const).map((type) => {
                        const existing = financingDocs?.documents?.find(
                          (d) => d.documentType === type
                        );
                        if (existing?.status === "APPROVED") return null;
                        return (
                          <div key={type}>
                            <Label>
                              {existing
                                ? type === "BANK_STATEMENT"
                                  ? "Replace bank statement (6–12 months)"
                                  : `Replace ${FINANCING_DOC_LABELS[type].toLowerCase()}`
                                : type === "BANK_STATEMENT"
                                  ? "Bank statement (6–12 months)"
                                  : FINANCING_DOC_LABELS[type]}
                            </Label>
                            <Input
                              type="file"
                              accept=".pdf,image/*"
                              className="rounded-none"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) setDocFiles((prev) => ({ ...prev, [type]: file }));
                                e.target.value = "";
                              }}
                            />
                          </div>
                        );
                      })
                    : null}
                  <Button
                    size="sm"
                    className="rounded-none bg-emerald-600 hover:bg-emerald-700"
                    disabled={updateMutation.isPending}
                    onClick={() => updateMutation.mutate()}
                  >
                    {updateMutation.isPending ? "Saving…" : "Save changes"}
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Editing is locked once the merchant responds to your application.
                </p>
              )}

              {canAcceptOffer ? (
                <div className="space-y-3 rounded-none border border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-900 dark:bg-emerald-950/20">
                  <p className="text-sm font-medium text-foreground">Lender Pay-for-Me offer</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg border border-border bg-background/80 p-3">
                      <p className="text-xs text-muted-foreground">Original amount to finance</p>
                      <p className="mt-1 text-lg font-semibold">
                        GHS {offerAmount.toLocaleString()}
                      </p>
                    </div>
                    <div className="rounded-lg border border-emerald-500/30 bg-emerald-600/10 p-3">
                      <p className="text-xs text-muted-foreground">
                        Total repayable ({financing?.durationMonths} months @ {offerRate}%)
                      </p>
                      <p className="mt-1 text-lg font-semibold text-emerald-800 dark:text-emerald-300">
                        GHS {totalRepayable.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  {monthlyPayment > 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Estimated monthly debit: GHS {monthlyPayment.toLocaleString()}
                    </p>
                  ) : null}
                  <p className="text-sm text-muted-foreground">
                    Accepting generates your repayment mandate and sends it to the bank for auto-debit
                    setup. Declining cancels the mandate.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      className="rounded-none bg-emerald-600 hover:bg-emerald-700"
                      disabled={acceptOfferMutation.isPending}
                      onClick={() => acceptOfferMutation.mutate()}
                    >
                      {acceptOfferMutation.isPending ? "Accepting…" : "Accept offer & send mandate"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-none"
                      disabled={declineOfferMutation.isPending}
                      onClick={() => declineOfferMutation.mutate()}
                    >
                      {declineOfferMutation.isPending ? "Declining…" : "Decline offer"}
                    </Button>
                    <Button asChild size="sm" variant="ghost" className="rounded-none">
                      <Link href="/dashboard/buyer/mandates">View mandates</Link>
                    </Button>
                  </div>
                </div>
              ) : null}

              {financing && financing.status !== "CREATED" ? (
                <Button asChild size="sm" variant="outline" className="rounded-none">
                  <Link href="/dashboard/buyer/financing">View financing details</Link>
                </Button>
              ) : null}
            </div>
          )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
