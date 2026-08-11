"use client";

import { cn } from "@/lib/utils";

const STEPS = [
  { id: 1, label: "Admin review" },
  { id: 2, label: "Merchant approval" },
  { id: 3, label: "Lender approval" },
] as const;

function getActiveStep(status: string): number {
  if (["REJECTED", "CANCELLED"].includes(status)) return 0;
  if (["ELIGIBILITY_PENDING", "SUBMITTED", "PENDING"].includes(status)) return 1;
  if (["UNDER_MERCHANT_REVIEW", "MERCHANT_PENDING", "MANDATE_PENDING"].includes(status)) {
    return 2;
  }
  if (
    [
      "READY_FOR_LENDER_REVIEW",
      "APPROVED",
      "DISBURSED",
      "ACTIVE",
      "MANDATE_ACTIVE",
    ].includes(status)
  ) {
    return 3;
  }
  return 1;
}

export function FinancingProgressSteps({ status }: { status: string }) {
  const activeStep = getActiveStep(status);

  return (
    <div className="mt-4 space-y-3">
      <p className="text-sm font-medium">Pay-for-me progress</p>
      <div className="flex items-center justify-center gap-2">
        {STEPS.map((step) => (
          <div key={step.id} className="flex items-center gap-2">
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  "flex size-8 items-center justify-center rounded-full text-xs font-semibold",
                  activeStep >= step.id
                    ? "bg-amber-500 text-white"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {step.id}
              </div>
              <span className="max-w-[4.5rem] text-center text-[10px] text-muted-foreground">
                {step.label}
              </span>
            </div>
            {step.id < STEPS.length ? (
              <div
                className={cn(
                  "mb-4 h-0.5 w-8",
                  activeStep > step.id ? "bg-amber-500" : "bg-muted"
                )}
              />
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
