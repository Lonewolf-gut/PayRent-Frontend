"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { APPLICATION_STATUS_LABELS } from "@/constants/platform";
import {
  ApplicationProgressSteps,
  FinancingProgressSteps,
} from "@/components/financing/financing-progress-steps";
import {
  canEditFinancingRequest,
  canSubmitFinancingRequest,
  getApplicationProgressSummary,
  getApprovedApplicationProgressSummary,
} from "@/lib/financing/status-flow";
import { cn } from "@/lib/utils";

type FinancingRequestItem = {
  id: string;
  status: string;
  requestedAmount?: number | string;
  durationMonths?: number;
  notes?: string | null;
};

type ApplicationAccordionItemProps = {
  applicationId: string;
  propertyName?: string;
  propertyLocation?: string;
  moveInLabel: string;
  paymentLabel?: string | null;
  applicationStatus: string;
  paymentMethod?: "CASH" | "FINANCING" | null;
  financing?: FinancingRequestItem;
  onSubmitFinancing: () => void;
  onEditFinancing: () => void;
  clarificationForm?: ReactNode;
};

function ProgressSummaryLine({
  summary,
  accentClassName = "text-amber-700 dark:text-amber-400",
}: {
  summary: {
    step: number;
    total: number;
    label: string;
    inProgress: boolean;
  };
  accentClassName?: string;
}) {
  return (
    <p className="text-sm text-muted-foreground">
      <span className="font-medium text-foreground">
        Step {summary.step} of {summary.total}
      </span>
      <span className="mx-1.5 text-border">·</span>
      <span>{summary.label}</span>
      {summary.inProgress ? (
        <>
          <span className="mx-1.5 text-border">·</span>
          <span className={cn("font-medium", accentClassName)}>In progress</span>
        </>
      ) : null}
    </p>
  );
}

export function ApplicationAccordionItem({
  applicationId,
  propertyName,
  propertyLocation,
  moveInLabel,
  paymentLabel,
  applicationStatus,
  paymentMethod,
  financing,
  onSubmitFinancing,
  onEditFinancing,
  clarificationForm,
}: ApplicationAccordionItemProps) {
  const canSubmit = canSubmitFinancingRequest(
    applicationStatus,
    financing?.status,
    paymentMethod
  );
  const canEdit = financing ? canEditFinancingRequest(financing.status) : false;

  const progressSummary =
    applicationStatus === "APPROVED"
      ? getApprovedApplicationProgressSummary(financing?.status, canSubmit)
      : getApplicationProgressSummary(applicationStatus);

  const progressAccent =
    applicationStatus === "APPROVED" ? "text-amber-700 dark:text-amber-400" : "text-emerald-700 dark:text-emerald-400";

  return (
    <AccordionItem
      value={applicationId}
      className="rounded-none border border-border bg-card px-4 last:border-b"
    >
      <AccordionTrigger className="py-5 hover:no-underline [&>svg]:mt-1">
        <div className="flex flex-1 flex-col gap-2 pr-3 text-left">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <p className="text-lg font-semibold text-foreground">{propertyName}</p>
              {progressSummary ? (
                <ProgressSummaryLine summary={progressSummary} accentClassName={progressAccent} />
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              <StatusBadge
                status={applicationStatus}
                label={APPLICATION_STATUS_LABELS[applicationStatus]}
              />
            </div>
          </div>
        </div>
      </AccordionTrigger>

      <AccordionContent className="pb-5">
        <div className="space-y-5 border-t border-border pt-4">
          <div className="space-y-1 text-sm text-muted-foreground">
            <p>{propertyLocation}</p>
            <p>{moveInLabel}</p>
            {paymentLabel ? <p className="text-foreground">{paymentLabel}</p> : null}
          </div>

          {applicationStatus !== "APPROVED" ? (
            <ApplicationProgressSteps status={applicationStatus} />
          ) : null}

          {applicationStatus === "APPROVED" ? (
            <div className="space-y-4 rounded-lg border border-border bg-muted/10 p-4">
              {financing ? (
                <>
                  <FinancingProgressSteps status={financing.status} />
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <span>
                      Amount: GHS {Number(financing.requestedAmount ?? 0).toLocaleString()}
                    </span>
                    {financing.durationMonths ? (
                      <span>Repayment: {financing.durationMonths} months</span>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {canEdit ? (
                      <Button size="sm" variant="outline" onClick={onEditFinancing}>
                        Edit request
                      </Button>
                    ) : null}
                    {["DISBURSED", "REPAYMENT_ACTIVE", "FUNDED", "ACTIVE"].includes(
                      financing.status
                    ) ? (
                      <Button asChild size="sm" variant="outline">
                        <Link href="/dashboard/buyer/repayments">View repayments</Link>
                      </Button>
                    ) : null}
                  </div>
                </>
              ) : canSubmit ? (
                <div className="space-y-3">
                  <FinancingProgressSteps status="CREATED" />
                  <Button
                    size="sm"
                    className="bg-amber-500 hover:bg-amber-600"
                    onClick={onSubmitFinancing}
                  >
                    Submit financing request
                  </Button>
                </div>
              ) : null}
            </div>
          ) : null}

          {clarificationForm}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

export function ApplicationStatusAccordion({
  children,
  defaultOpenIds = [],
}: {
  children: ReactNode;
  defaultOpenIds?: string[];
}) {
  return (
    <Accordion type="multiple" defaultValue={defaultOpenIds} className="space-y-4">
      {children}
    </Accordion>
  );
}
