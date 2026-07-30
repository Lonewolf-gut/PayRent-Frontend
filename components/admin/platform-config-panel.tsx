"use client";

import { StatusBadge } from "@/components/dashboard/status-badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

type PlatformConfig = {
  environment?: string;
  currency?: string;
  fees?: {
    serviceFeePercent?: number;
    commissionFeePercent?: number;
    processingFeePercent?: number;
  };
  integrations?: {
    payments?: { configured?: boolean; provider?: string };
    kyc?: { dojahConfigured?: boolean; provider?: string };
    email?: { configured?: boolean };
    bankMandates?: { configured?: boolean };
  };
};

export function PlatformConfigPanel({ platform }: { platform?: PlatformConfig }) {
  const paymentsOk = platform?.integrations?.payments?.configured;
  const emailOk = platform?.integrations?.email?.configured;

  return (
    <Accordion type="single" collapsible className="rounded-none border border-border">
      <AccordionItem value="platform" className="border-0">
        <AccordionTrigger className="rounded-none px-4 py-3 hover:no-underline">
          <div className="flex flex-1 items-center justify-between gap-3 pr-2 text-left">
            <div className="min-w-0">
              <p className="font-medium">Platform configuration</p>
              <p className="truncate text-sm font-normal text-muted-foreground">
                {platform?.environment ?? "—"} · {platform?.currency ?? "GHS"} · Service fee{" "}
                {platform?.fees?.serviceFeePercent ?? "—"}%
              </p>
            </div>
            <div className="hidden shrink-0 items-center gap-2 sm:flex">
              <StatusBadge
                status={paymentsOk ? "APPROVED" : "PENDING"}
                label={paymentsOk ? "Payments OK" : "Payments"}
              />
              <StatusBadge
                status={emailOk ? "APPROVED" : "PENDING"}
                label={emailOk ? "Email OK" : "Email"}
              />
            </div>
          </div>
        </AccordionTrigger>
        <AccordionContent className="space-y-4 border-t border-border px-4 pb-4 pt-3 text-sm">
          <div className="grid gap-3 sm:grid-cols-2">
            <p>
              <span className="text-muted-foreground">Environment:</span>{" "}
              {platform?.environment ?? "—"}
            </p>
            <p>
              <span className="text-muted-foreground">Currency:</span>{" "}
              {platform?.currency ?? "GHS"}
            </p>
            <p>
              <span className="text-muted-foreground">Service fee:</span>{" "}
              {platform?.fees?.serviceFeePercent ?? "—"}%
            </p>
            <p>
              <span className="text-muted-foreground">Commission:</span>{" "}
              {platform?.fees?.commissionFeePercent ?? "—"}%
            </p>
            <p>
              <span className="text-muted-foreground">Processing fee:</span>{" "}
              {platform?.fees?.processingFeePercent ?? "—"}%
            </p>
          </div>
          <div>
            <p className="mb-3 font-medium">Integrations</p>
            <div className="flex flex-wrap gap-2">
              <StatusBadge
                status={platform?.integrations?.payments?.configured ? "APPROVED" : "PENDING"}
                label={`Payments (${platform?.integrations?.payments?.provider ?? "—"})`}
              />
              <StatusBadge
                status={platform?.integrations?.kyc?.dojahConfigured ? "APPROVED" : "PENDING"}
                label={`KYC (${platform?.integrations?.kyc?.provider ?? "manual"})`}
              />
              <StatusBadge
                status={platform?.integrations?.email?.configured ? "APPROVED" : "PENDING"}
                label={`Email (${platform?.integrations?.email?.provider ?? "—"})`}
              />
              <StatusBadge
                status={platform?.integrations?.bankMandates?.configured ? "APPROVED" : "PENDING"}
                label="Bank mandates"
              />
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Fee rates can be updated in Business rules without redeploying code. Environment
              variables are used as fallbacks on first boot.
            </p>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
