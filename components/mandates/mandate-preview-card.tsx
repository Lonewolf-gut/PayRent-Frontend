"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SecureFileLink } from "@/components/shared/secure-file-link";
import type { MandatePreviewData } from "@/lib/utils/mandate-preview";

const STATUS_LABELS: Record<MandatePreviewData["previewStatus"], string> = {
  awaiting_lender: "Awaiting lender rate",
  awaiting_buyer: "Review lender offer",
  mandate_pending: "Mandate prepared",
  bank_processing: "Bank processing",
  active: "Active mandate",
  declined: "Declined / cancelled",
  none: "Not available",
};

export function MandatePreviewCard({
  preview,
  onPrint,
}: {
  preview: MandatePreviewData;
  onPrint?: () => void;
}) {
  const showMandateBody =
    preview.previewStatus !== "declined" &&
    preview.previewStatus !== "none" &&
    (preview.mandateId != null || preview.principalAmount > 0);

  const showDocument = Boolean(preview.documentUrl) && preview.mandateId;
  const showRatePricing = preview.ratePricingVisible;
  const showRatePlaceholder =
    !showRatePricing &&
    showMandateBody &&
    (preview.previewStatus === "awaiting_lender" ||
      preview.previewStatus === "awaiting_buyer" ||
      preview.previewStatus === "mandate_pending");

  return (
    <div
      id={preview.mandateId ? `mandate-preview-${preview.mandateId}` : undefined}
      className="overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-card via-card to-emerald-950/5 shadow-sm print:border print:shadow-none"
    >
      <div className="border-b border-border bg-emerald-600/10 px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
              Pay-for-Me repayment mandate
            </p>
            <h3 className="mt-1 text-lg font-semibold text-foreground">
              {preview.propertyName.replace(/^\[Demo\]\s*/i, "")}
            </h3>
          </div>
          <Badge variant="outline">{STATUS_LABELS[preview.previewStatus]}</Badge>
        </div>
      </div>

      <div className="space-y-5 p-5">
        {showMandateBody ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <PriceTile
                label="Original amount to finance"
                amount={preview.principalAmount}
                highlight={false}
              />
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

            <dl className="grid gap-3 rounded-xl border border-border bg-muted/20 p-4 text-sm sm:grid-cols-2">
              <Detail label="Borrower" value={preview.borrowerName} />
              <Detail label="Repayment period" value={`${preview.durationMonths} months`} />
              {preview.bankName ? <Detail label="Bank" value={preview.bankName} /> : null}
              {preview.accountNumberMasked ? (
                <Detail label="Account" value={preview.accountNumberMasked} />
              ) : null}
              {preview.accountName ? (
                <Detail label="Account name" value={preview.accountName} />
              ) : null}
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
          </>
        ) : null}

        <div className="flex flex-wrap gap-2 print:hidden">
          {showDocument ? (
            <Button asChild size="sm" variant="outline">
              <SecureFileLink request={{ scope: "mandate", mandateId: preview.mandateId! }}>
                View mandate PDF
              </SecureFileLink>
            </Button>
          ) : null}
          {showMandateBody ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                onPrint?.();
                window.print();
              }}
            >
              <Printer className="mr-2 h-4 w-4" />
              Print mandate summary
            </Button>
          ) : null}
        </div>
      </div>
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
      <p className="mt-1 text-sm font-medium text-muted-foreground">
        Pending lender rate acceptance
      </p>
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
