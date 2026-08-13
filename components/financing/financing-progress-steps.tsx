"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  APPLICATION_FLOW_STEPS,
  FINANCING_FLOW_STEPS,
  getApplicationActiveStep,
  getFinancingActiveStep,
} from "@/lib/financing/status-flow";

type VerticalStatusListProps = {
  title: string;
  steps: readonly { id: number; title: string; description: string }[];
  activeStep: number;
  accentClassName?: string;
};

export function VerticalStatusList({
  title,
  steps,
  activeStep,
  accentClassName = "bg-emerald-600",
}: VerticalStatusListProps) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-foreground">{title}</p>
      <ol className="space-y-0">
        {steps.map((step, index) => {
          const isComplete = activeStep > step.id;
          const isCurrent = activeStep === step.id;
          const isLast = index === steps.length - 1;

          return (
            <li key={step.id} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                    isComplete || isCurrent
                      ? cn(accentClassName, "text-white")
                      : "border border-border bg-muted text-muted-foreground"
                  )}
                >
                  {isComplete ? <Check className="size-4" /> : step.id}
                </div>
                {!isLast ? (
                  <div
                    className={cn(
                      "my-1 w-px flex-1 min-h-6",
                      isComplete ? accentClassName : "bg-border"
                    )}
                  />
                ) : null}
              </div>
              <div className={cn("pb-4", isLast && "pb-0")}>
                <p
                  className={cn(
                    "text-sm font-medium",
                    isComplete || isCurrent ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {step.title}
                </p>
                <p className="text-xs text-muted-foreground">{step.description}</p>
                {isCurrent ? (
                  <p className="mt-1 text-xs font-medium text-amber-700 dark:text-amber-400">
                    In progress
                  </p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function ApplicationProgressSteps({ status }: { status: string }) {
  return (
    <VerticalStatusList
      title="Application status"
      steps={APPLICATION_FLOW_STEPS}
      activeStep={getApplicationActiveStep(status)}
      accentClassName="bg-emerald-600"
    />
  );
}

export function FinancingProgressSteps({ status }: { status: string }) {
  return (
    <VerticalStatusList
      title="Pay-for-me status"
      steps={FINANCING_FLOW_STEPS}
      activeStep={getFinancingActiveStep(status)}
      accentClassName="bg-amber-500"
    />
  );
}

// Keep generic export for backwards compatibility
export function ProgressSteps(props: VerticalStatusListProps) {
  return <VerticalStatusList {...props} />;
}
