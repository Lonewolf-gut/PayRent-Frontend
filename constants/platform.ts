import type { UserRole } from "@prisma/client";

export const PLATFORM_NAME = "PayForMe";
export const PLATFORM_TAGLINE =
  "Ghana's marketplace for properties, vehicles, and appliances — with pay-for-me financing built in.";
export const SUPPORT_EMAIL = "support@payforme.com";
export const SUPPORT_PHONE = "+233 30 000 0000";
export const SUPPORT_ADDRESS = "Accra, Ghana";
export const EMAIL_DOMAIN = "payforme.com";

export const ROLE_LABELS: Record<UserRole, string> = {
  BUYER: "Customers",
  MERCHANT: "Merchant",
  MARKETER: "Affiliate",
  LENDER: "Lender",
  ADMIN: "Administrator",
  COMPLIANCE_OFFICER: "Compliance Officer",
};

export const ROLE_DESCRIPTIONS: Record<string, string> = {
  BUYER:
    "Browse products, request pay-for-me financing, and track repayments.",
  MERCHANT:
    "List products, manage orders, and view sales from your dashboard.",
  MARKETER:
    "Promote listings, track referrals, and earn commissions.",
  LENDER:
    "Review financing requests, fund deals, and monitor repayments.",
  ADMIN:
    "Verify users, approve merchants and lenders, manage disputes, monitor transactions, configure fees, and generate reports.",
  COMPLIANCE_OFFICER:
    "Review consent records, fee disclosures, audit logs, KYC, suspicious activity, and export compliance reports.",
};

export const WORKFLOW_STEPS = [
  {
    step: 1,
    title: "Onboard & verify",
    description:
      "Register, verify contact details, complete Ghana Card KYC, and validate your bank account.",
  },
  {
    step: 2,
    title: "Browse & request",
    description:
      "Search published listings, submit an application with documents, and await merchant approval.",
  },
  {
    step: 3,
    title: "Request PayForMe financing",
    description:
      "Create a financing request, set up a repayment mandate, and pass lender review.",
  },
  {
    step: 4,
    title: "Repay & settle",
    description:
      "Track scheduled deductions, monitor repayments, and view settlement status for all parties.",
  },
];

export const APPLICATION_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under Review",
  CLARIFICATION_REQUIRED: "Clarification Required",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  WITHDRAWN: "Withdrawn",
};

export const FINANCING_STATUS_LABELS: Record<string, string> = {
  CREATED: "Created",
  ELIGIBILITY_PENDING: "Eligibility Pending",
  MANDATE_PENDING: "Mandate Pending",
  READY_FOR_LENDER_REVIEW: "Ready for Lender Review",
  PENDING: "Pending",
  UNDER_REVIEW: "Under Review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  WITHDRAWN: "Withdrawn",
  FUNDED: "Funded",
  DISBURSED: "Disbursed",
  REPAYMENT_ACTIVE: "Repayment Active",
  COMPLETED: "Completed",
  CLOSED: "Closed",
  DEFAULTED: "Defaulted",
};

export const MANDATE_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  PENDING_SUBMISSION: "Pending Submission",
  SUBMITTED: "Submitted",
  ADMIN_REVIEW: "Admin Review",
  BANK_PROCESSING: "Bank Processing",
  ACTIVE: "Active",
  REJECTED: "Rejected",
  EXPIRED: "Expired",
  REVOKED: "Revoked",
  ARCHIVED: "Archived",
  PENDING_MANUAL_RESOLUTION: "Pending Manual Resolution",
};

export const SETTLEMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  PROCESSING: "Processing",
  COMPLETED: "Completed",
  FAILED: "Failed",
  CANCELLED: "Cancelled",
};

export const GHANA_REGIONS = [
  "Greater Accra",
  "Ashanti",
  "Western",
  "Central",
  "Eastern",
  "Northern",
  "Volta",
  "Upper East",
  "Upper West",
  "Bono",
  "Bono East",
  "Ahafo",
  "Savannah",
  "North East",
  "Oti",
  "Western North",
];
