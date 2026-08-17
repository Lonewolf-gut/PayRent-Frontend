import Link from "next/link";
import { CheckCircle2, Circle, CircleDot } from "lucide-react";
import { cn } from "@/lib/utils";

export type FinancingFlowStep = {
  id: string;
  label: string;
  description: string;
  status: "complete" | "current" | "upcoming";
  href?: string;
};

type FinancingFlowStepperProps = {
  steps: FinancingFlowStep[];
  className?: string;
};

export function FinancingFlowStepper({ steps, className }: FinancingFlowStepperProps) {
  return (
    <ol className={cn("space-y-3", className)}>
      {steps.map((step, index) => {
        const Icon =
          step.status === "complete"
            ? CheckCircle2
            : step.status === "current"
              ? CircleDot
              : Circle;

        return (
          <li key={step.id} className="flex gap-3 text-sm">
            <div className="flex flex-col items-center">
              <Icon
                className={cn(
                  "size-5 shrink-0",
                  step.status === "complete" && "text-emerald-600",
                  step.status === "current" && "text-amber-600",
                  step.status === "upcoming" && "text-muted-foreground"
                )}
              />
              {index < steps.length - 1 ? (
                <span className="mt-1 h-full min-h-6 w-px bg-border" aria-hidden />
              ) : null}
            </div>
            <div className="min-w-0 pb-1">
              <p
                className={cn(
                  "font-medium",
                  step.status === "complete" && "text-emerald-800",
                  step.status === "current" && "text-amber-900",
                  step.status === "upcoming" && "text-muted-foreground"
                )}
              >
                {step.label}
              </p>
              <p className="text-muted-foreground">{step.description}</p>
              {step.href && step.status !== "complete" ? (
                <Link href={step.href} className="mt-1 inline-block text-emerald-700 hover:underline">
                  Continue this step →
                </Link>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function buildFinancingFlowSteps(input: {
  kycVerified: boolean;
  hasApprovedApplication: boolean;
  financingDocsApproved: boolean;
  isSale: boolean;
}): FinancingFlowStep[] {
  const applicationLabel = input.isSale
    ? "Merchant approves your purchase application"
    : "Merchant approves your rental application";

  const steps: FinancingFlowStep[] = [
    {
      id: "verify",
      label: "Complete verification",
      description: "Identity, employment, and address on your dashboard.",
      status: input.kycVerified ? "complete" : "current",
      href: input.kycVerified ? undefined : "/dashboard/buyer/kyc",
    },
    {
      id: "apply",
      label: input.isSale ? "Submit purchase application" : "Submit rental application",
      description: applicationLabel,
      status: input.hasApprovedApplication
        ? "complete"
        : input.kycVerified
          ? "current"
          : "upcoming",
      href: input.hasApprovedApplication ? undefined : undefined,
    },
    {
      id: "docs",
      label: "Financing documents approved",
      description: "Payslip and bank statement reviewed by admin.",
      status: input.financingDocsApproved
        ? "complete"
        : input.hasApprovedApplication
          ? "current"
          : "upcoming",
      href: input.financingDocsApproved ? undefined : "/dashboard/buyer/financing-documents",
    },
    {
      id: "submit",
      label: "Submit Pay-for-Me request",
      description: "Choose amount, repayment period, and mandate preferences.",
      status:
        input.kycVerified && input.hasApprovedApplication && input.financingDocsApproved
          ? "current"
          : "upcoming",
    },
  ];

  return steps;
}
