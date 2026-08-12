"use client";

import { cn } from "@/lib/utils";

type Step = {
  id: number;
  label: string;
};

type ProgressStepsProps = {
  title: string;
  steps: Step[];
  activeStep: number;
  accentClassName?: string;
};

export function ProgressSteps({
  title,
  steps,
  activeStep,
  accentClassName = "bg-amber-500",
}: ProgressStepsProps) {
  return (
    <div className="mt-4 space-y-3 rounded-lg border border-border bg-muted/20 p-4">
      <p className="text-sm font-medium">{title}</p>
      <div className="flex items-start justify-center gap-2">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-start gap-2">
            <div className="flex flex-col items-center gap-2">
              <div
                className={cn(
                  "flex size-9 items-center justify-center rounded-full text-xs font-semibold",
                  activeStep >= step.id
                    ? cn(accentClassName, "text-white")
                    : "bg-muted text-muted-foreground"
                )}
              >
                {step.id}
              </div>
              <span
                className={cn(
                  "max-w-[5.5rem] text-center text-[11px] leading-tight",
                  activeStep >= step.id ? "font-medium text-foreground" : "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 ? (
              <div
                className={cn(
                  "mt-4 h-0.5 w-10 sm:w-14",
                  activeStep > step.id ? accentClassName : "bg-muted"
                )}
              />
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

const APPLICATION_STEPS = [
  { id: 1, label: "Submitted" },
  { id: 2, label: "Merchant review" },
  { id: 3, label: "Approved" },
] as const;

export function ApplicationProgressSteps({ status }: { status: string }) {
  let activeStep = 1;
  if (["UNDER_REVIEW", "CLARIFICATION_REQUIRED"].includes(status)) activeStep = 2;
  if (status === "APPROVED") activeStep = 3;
  if (status === "REJECTED") activeStep = 2;

  return (
    <ProgressSteps
      title="Application progress"
      steps={[...APPLICATION_STEPS]}
      activeStep={activeStep}
      accentClassName="bg-emerald-600"
    />
  );
}

const FINANCING_STEPS = [
  { id: 1, label: "Admin review" },
  { id: 2, label: "Merchant approval" },
  { id: 3, label: "Lender approval" },
] as const;

function getFinancingActiveStep(status: string): number {
  if (["REJECTED", "CANCELLED"].includes(status)) return 0;
  if (["ELIGIBILITY_PENDING", "SUBMITTED", "PENDING"].includes(status)) return 1;
  if (["UNDER_MERCHANT_REVIEW", "MERCHANT_PENDING", "MANDATE_PENDING"].includes(status)) {
    return 2;
  }
  if (
    ["READY_FOR_LENDER_REVIEW", "APPROVED", "DISBURSED", "ACTIVE", "MANDATE_ACTIVE"].includes(
      status
    )
  ) {
    return 3;
  }
  return 1;
}

export function FinancingProgressSteps({ status }: { status: string }) {
  return (
    <ProgressSteps
      title="Pay-for-me progress"
      steps={[...FINANCING_STEPS]}
      activeStep={getFinancingActiveStep(status)}
      accentClassName="bg-amber-500"
    />
  );
}
