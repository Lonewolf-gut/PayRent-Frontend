export type MandatePreviewStatus =
  | "awaiting_lender"
  | "awaiting_buyer"
  | "mandate_pending"
  | "bank_processing"
  | "active"
  | "declined"
  | "none";

export type MandatePreviewData = {
  financingRequestId: string;
  mandateId?: string | null;
  propertyName: string;
  borrowerName: string;
  bankName?: string | null;
  accountNumberMasked?: string | null;
  accountName?: string | null;
  principalAmount: number;
  interestRate?: number | null;
  durationMonths: number;
  totalRepayable?: number | null;
  monthlyPayment?: number | null;
  financingStatus: string;
  mandateStatus?: string | null;
  mandateSource?: string | null;
  documentUrl?: string | null;
  previewStatus: MandatePreviewStatus;
  buyerAcceptedAt?: string | null;
};

type FinancingLike = {
  id: string;
  status: string;
  requestedAmount: number | string | { toString(): string };
  approvedAmount?: number | string | { toString(): string } | null;
  offeredInterestRate?: number | string | { toString(): string } | null;
  durationMonths: number;
  buyerAcceptedAt?: Date | string | null;
  property?: { name?: string | null } | null;
  tenant?: {
    fullName?: string | null;
    user?: { fullName?: string | null; email?: string | null } | null;
  } | null;
  feeDisclosure?: {
    principalAmount?: number | string | { toString(): string } | null;
    interestRate?: number | string | { toString(): string } | null;
    totalRepayable?: number | string | { toString(): string } | null;
    monthlyPayment?: number | string | { toString(): string } | null;
  } | null;
  mandate?: {
    id: string;
    status: string;
    mandateSource: string;
    documentUrl?: string | null;
    bankAccount?: {
      bankName?: string | null;
      accountNumberMasked?: string | null;
      accountName?: string | null;
    } | null;
  } | null;
};

function toNumber(value: unknown): number | null {
  if (value == null) return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

export function buildMandatePreview(financing: FinancingLike): MandatePreviewData {
  const principalAmount =
    toNumber(financing.approvedAmount) ??
    toNumber(financing.feeDisclosure?.principalAmount) ??
    toNumber(financing.requestedAmount) ??
    0;
  const interestRate =
    toNumber(financing.offeredInterestRate) ?? toNumber(financing.feeDisclosure?.interestRate);
  const totalRepayable = toNumber(financing.feeDisclosure?.totalRepayable);
  const monthlyPayment = toNumber(financing.feeDisclosure?.monthlyPayment);

  let previewStatus: MandatePreviewStatus = "awaiting_lender";
  if (financing.status === "REJECTED" || financing.status === "WITHDRAWN") {
    previewStatus = "declined";
  } else if (financing.status === "APPROVED" && !financing.buyerAcceptedAt) {
    previewStatus = "awaiting_buyer";
  } else if (financing.mandate) {
    if (financing.mandate.status === "ACTIVE") previewStatus = "active";
    else if (["BANK_PROCESSING", "ADMIN_REVIEW", "PENDING_MANUAL_RESOLUTION"].includes(financing.mandate.status)) {
      previewStatus = "bank_processing";
    } else previewStatus = "mandate_pending";
  } else if (financing.buyerAcceptedAt) {
    previewStatus = "mandate_pending";
  }

  const borrowerName =
    financing.tenant?.fullName ??
    financing.tenant?.user?.fullName ??
    financing.tenant?.user?.email ??
    "Customer";

  return {
    financingRequestId: financing.id,
    mandateId: financing.mandate?.id ?? null,
    propertyName: financing.property?.name ?? "Listing",
    borrowerName,
    bankName: financing.mandate?.bankAccount?.bankName ?? null,
    accountNumberMasked: financing.mandate?.bankAccount?.accountNumberMasked ?? null,
    accountName: financing.mandate?.bankAccount?.accountName ?? null,
    principalAmount,
    interestRate,
    durationMonths: financing.durationMonths,
    totalRepayable,
    monthlyPayment,
    financingStatus: financing.status,
    mandateStatus: financing.mandate?.status ?? null,
    mandateSource: financing.mandate?.mandateSource ?? null,
    documentUrl: financing.mandate?.documentUrl ?? null,
    previewStatus,
    buyerAcceptedAt: financing.buyerAcceptedAt
      ? new Date(financing.buyerAcceptedAt).toISOString()
      : null,
  };
}
