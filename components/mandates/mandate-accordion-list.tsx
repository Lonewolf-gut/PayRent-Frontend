"use client";

import Link from "next/link";
import { FileDown, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SecureFileLink } from "@/components/shared/secure-file-link";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { MandatePreviewData } from "@/lib/utils/mandate-preview";
import { downloadMandatePdf } from "@/lib/utils/mandate-pdf";
import { toast } from "sonner";

const STATUS_LABELS: Record<MandatePreviewData["previewStatus"], string> = {
  awaiting_lender: "Awaiting lender rate",
  awaiting_buyer: "Review lender offer",
  mandate_pending: "Mandate prepared",
  bank_processing: "Bank processing",
  active: "Active mandate",
  declined: "Declined / cancelled",
  none: "Not available",
};

type MandateRecord = {
  id: string;
  status: string;
  mandateSource: string;
  documentUrl?: string | null;
};

export function MandateAccordionList({
  previews,
  getMandateForPreview,
  onSubmitScanned,
  onRefreshStatus,
  submitPending,
  syncPending,
}: {
  previews: MandatePreviewData[];
  getMandateForPreview: (preview: MandatePreviewData) => MandateRecord | undefined;
  onSubmitScanned: (mandateId: string) => void;
  onRefreshStatus: (mandateId: string) => void;
  submitPending: boolean;
  syncPending: boolean;
}) {
  return (
    <Accordion
      type="single"
      collapsible
      defaultValue={previews[0]?.financingRequestId}
      className="divide-y divide-border rounded-xl border border-border bg-card"
    >
      {previews.map((preview) => {
        const mandate = getMandateForPreview(preview);
        const propertyName = preview.propertyName.replace(/^\[Demo\]\s*/i, "");

        return (
          <AccordionItem
            key={preview.financingRequestId}
            value={preview.financingRequestId}
            className="border-0 px-4"
          >
            <AccordionTrigger className="py-4 hover:no-underline">
              <div className="flex flex-1 flex-col gap-2 pr-2 text-left sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                    Pay-for-Me mandate
                  </p>
                  <p className="truncate text-base font-semibold text-foreground">{propertyName}</p>
                  <p className="text-sm text-muted-foreground">{preview.borrowerName}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                  <Badge variant="outline">{STATUS_LABELS[preview.previewStatus]}</Badge>
                  <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                    GHS {preview.principalAmount.toLocaleString()}
                  </span>
                </div>
              </div>
            </AccordionTrigger>

            <AccordionContent className="pb-4">
              <MandatePreviewBody preview={preview} />

              <div className="mt-4 flex flex-wrap gap-2">
                {mandate?.documentUrl && preview.mandateId ? (
                  <Button asChild size="sm" variant="outline">
                    <SecureFileLink request={{ scope: "mandate", mandateId: preview.mandateId }}>
                      View uploaded PDF
                    </SecureFileLink>
                  </Button>
                ) : null}

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    try {
                      await downloadMandatePdf(preview);
                    } catch {
                      toast.error("Could not generate mandate PDF");
                    }
                  }}
                >
                  <FileDown className="mr-2 h-4 w-4" />
                  Download mandate PDF
                </Button>

                {preview.previewStatus === "awaiting_buyer" ? (
                  <Button asChild size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                    <Link href="/dashboard/buyer/financing">Review lender offer</Link>
                  </Button>
                ) : null}

                {mandate &&
                mandate.mandateSource === "SCANNED_UPLOAD" &&
                ["PENDING_SUBMISSION", "DRAFT", "REJECTED"].includes(mandate.status) ? (
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700"
                    disabled={submitPending || !mandate.documentUrl}
                    onClick={() => onSubmitScanned(mandate.id)}
                  >
                    Submit scanned mandate for review
                  </Button>
                ) : null}

                {mandate && ["BANK_PROCESSING", "PENDING_MANUAL_RESOLUTION"].includes(mandate.status) ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={syncPending}
                    onClick={() => onRefreshStatus(mandate.id)}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Refresh bank status
                  </Button>
                ) : null}
              </div>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}

function MandatePreviewBody({ preview }: { preview: MandatePreviewData }) {
  const showMandateBody =
    preview.previewStatus !== "declined" &&
    preview.previewStatus !== "none" &&
    (preview.mandateId != null || preview.principalAmount > 0);

  const showRatePricing = preview.ratePricingVisible;
  const showRatePlaceholder =
    !showRatePricing &&
    showMandateBody &&
    (preview.previewStatus === "awaiting_lender" ||
      preview.previewStatus === "awaiting_buyer" ||
      preview.previewStatus === "mandate_pending");

  if (!showMandateBody) return null;

  return (
    <div className="space-y-4 rounded-xl border border-border bg-muted/10 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <PriceTile label="Original amount to finance" amount={preview.principalAmount} highlight={false} />
        {showRatePricing ? (
          <PriceTile
            label={`Total repayable (${preview.durationMonths} months @ ${preview.interestRate}%)`}
            amount={preview.totalRepayable ?? preview.principalAmount}
            highlight
          />
        ) : showRatePlaceholder ? (
          <RatePlaceholderTile durationMonths={preview.durationMonths} />
        ) : null}
      </div>

      <dl className="grid gap-3 rounded-xl border border-border bg-background/60 p-4 text-sm sm:grid-cols-2">
        <Detail label="Borrower" value={preview.borrowerName} />
        <Detail label="Repayment period" value={`${preview.durationMonths} months`} />
        {preview.bankName ? <Detail label="Bank" value={preview.bankName} /> : null}
        {preview.accountNumberMasked ? (
          <Detail label="Account" value={preview.accountNumberMasked} />
        ) : null}
        {preview.accountName ? <Detail label="Account name" value={preview.accountName} /> : null}
        {showRatePricing && preview.monthlyPayment ? (
          <Detail
            label="Estimated monthly debit"
            value={`GHS ${preview.monthlyPayment.toLocaleString()}`}
          />
        ) : null}
        {showRatePricing && preview.interestRate != null ? (
          <Detail label="Interest rate" value={`${preview.interestRate}% per annum`} />
        ) : null}
        <Detail
          label="Auto-debit consent"
          value="Buyer authorized scheduled repayments from the selected account"
          className="sm:col-span-2"
        />
        {!showRatePricing ? (
          <Detail
            label="Rate and repayment totals"
            value="Shown after you accept the lender's financing rate"
            className="sm:col-span-2"
          />
        ) : null}
      </dl>
    </div>
  );
}

function PriceTile({
  label,
  amount,
  highlight,
}: {
  label: string;
  amount: number;
  highlight: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        highlight
          ? "border-emerald-500/40 bg-emerald-600/10"
          : "border-border bg-muted/20"
      }`}
    >
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={`mt-1 text-2xl font-bold ${
          highlight ? "text-emerald-700 dark:text-emerald-300" : "text-foreground"
        }`}
      >
        GHS {amount.toLocaleString()}
      </p>
    </div>
  );
}

function RatePlaceholderTile({ durationMonths }: { durationMonths: number }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-muted/10 p-4">
      <p className="text-xs text-muted-foreground">Total repayable ({durationMonths} months)</p>
      <p className="mt-1 text-sm font-medium text-muted-foreground">Pending lender rate acceptance</p>
    </div>
  );
}

function Detail({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium text-foreground">{value}</dd>
    </div>
  );
}
