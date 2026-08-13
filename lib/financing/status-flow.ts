export const FINANCING_FLOW_STEPS = [
  {
    id: 1,
    title: "Submitted",
    description: "Waiting for merchant approval",
  },
  {
    id: 2,
    title: "Admin approval",
    description: "Admin reviews your request and documents",
  },
  {
    id: 3,
    title: "Lender confirmation",
    description: "Lender confirms financing terms",
  },
  {
    id: 4,
    title: "Bank mandate",
    description: "PDF mandate sent to your bank for auto-deduction",
  },
] as const;

export const APPLICATION_FLOW_STEPS = [
  { id: 1, title: "Submitted", description: "Application sent to merchant" },
  { id: 2, title: "Merchant review", description: "Merchant reviews your application" },
  { id: 3, title: "Approved", description: "You can request pay-for-me financing" },
] as const;

const MERCHANT_STAGE_STATUSES = new Set([
  "CREATED",
  "PENDING",
  "SUBMITTED",
  "UNDER_MERCHANT_REVIEW",
  "MERCHANT_PENDING",
]);

const ADMIN_STAGE_STATUSES = new Set(["ELIGIBILITY_PENDING", "UNDER_REVIEW"]);

const LENDER_STAGE_STATUSES = new Set([
  "READY_FOR_LENDER_REVIEW",
  "APPROVED",
  "PENDING",
]);

const MANDATE_STAGE_STATUSES = new Set([
  "MANDATE_PENDING",
  "FUNDED",
  "DISBURSED",
  "REPAYMENT_ACTIVE",
  "ACTIVE",
  "MANDATE_ACTIVE",
  "COMPLETED",
  "CLOSED",
]);

const TERMINAL_STATUSES = new Set(["REJECTED", "WITHDRAWN", "CANCELLED", "DEFAULTED"]);

export function getFinancingActiveStep(status: string): number {
  if (TERMINAL_STATUSES.has(status)) return 0;
  if (MANDATE_STAGE_STATUSES.has(status)) return 4;
  if (LENDER_STAGE_STATUSES.has(status)) return 3;
  if (ADMIN_STAGE_STATUSES.has(status)) return 2;
  if (MERCHANT_STAGE_STATUSES.has(status)) return 1;
  return 1;
}

export function getApplicationActiveStep(status: string): number {
  if (status === "APPROVED") return 3;
  if (["UNDER_REVIEW", "CLARIFICATION_REQUIRED", "REJECTED"].includes(status)) return 2;
  return 1;
}

export function getFinancingStatusLabel(status: string): string {
  const step = getFinancingActiveStep(status);
  if (TERMINAL_STATUSES.has(status)) {
    if (status === "REJECTED") return "Rejected";
    if (status === "WITHDRAWN") return "Withdrawn";
    return status.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
  }
  if (step === 1) return "Submitted — waiting for merchant approval";
  if (step === 2) return "Waiting for admin approval";
  if (step === 3) return "Waiting for lender confirmation";
  if (step === 4) {
    if (["DISBURSED", "REPAYMENT_ACTIVE", "FUNDED", "ACTIVE", "COMPLETED"].includes(status)) {
      return "Financing active — mandate in place";
    }
    return "PDF mandate sent to bank";
  }
  return status.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

export function canEditFinancingRequest(status: string): boolean {
  return MERCHANT_STAGE_STATUSES.has(status);
}

export function canSubmitFinancingRequest(
  applicationStatus: string,
  financingStatus?: string | null,
  paymentMethod?: string | null
): boolean {
  if (applicationStatus !== "APPROVED") return false;
  if (paymentMethod === "CASH") return false;
  if (!financingStatus) return true;
  return TERMINAL_STATUSES.has(financingStatus);
}
