import type { UserRole } from "@prisma/client";

export const PLATFORM_NAME = "PayForMe";
export const PLATFORM_TAGLINE =
  "Ghana's marketplace for properties, vehicles, and appliances — with pay-for-me financing built in.";
export const SUPPORT_EMAIL = "support@payforme.com";
export const SUPPORT_PHONE = "+233 30 000 0000";
export const SUPPORT_ADDRESS = "Accra, Ghana";
export const EMAIL_DOMAIN = "payforme.com";

export const SOCIAL_LINKS = [
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/company/payforme",
  },
  {
    label: "X",
    href: "https://x.com/payforme",
  },
  {
    label: "Instagram",
    href: "https://www.instagram.com/payforme",
  },
  {
    label: "TikTok",
    href: "https://www.tiktok.com/@payforme",
  },
] as const;

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
    "Create an account, browse products, raise pay-for-me requests, view repayment schedules, make repayments, and submit complaints.",
  MERCHANT:
    "Create a business profile, upload products, manage inventory, confirm orders, update delivery status, and view sales reports.",
  MARKETER:
    "Promote products, track referred buyers, view commission reports, and support merchant sales campaigns.",
  LENDER:
    "View eligible pay-for-me requests, accept financing requests, view repayment status, and receive repayment notifications.",
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
  CREATED: "Queued for review",
  ELIGIBILITY_PENDING: "Eligibility Pending",
  MANDATE_PENDING: "Mandate Pending",
  READY_FOR_LENDER_REVIEW: "Waiting for lender to finance",
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
