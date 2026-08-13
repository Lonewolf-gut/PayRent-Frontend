import type { UserRole } from "@prisma/client";
import { SETTINGS_ROUTES } from "@/lib/auth/permissions";

export type VerificationStatusSnapshot = {
  emailVerified?: boolean;
  phoneVerified?: boolean;
  profileStatus?: string;
  kycVerified?: boolean;
  identityVerified?: boolean;
  verifications?: { type: string; status: string }[];
  bankAccounts?: { isVerified?: boolean; validationStatus?: string }[];
};

export type VerificationChecklistItem = {
  id: string;
  label: string;
  complete: boolean;
  pending?: boolean;
};

export function getVerificationChecklist(status?: VerificationStatusSnapshot) {
  if (!status) {
    return [
      { id: "phone", label: "Verify your mobile number", complete: false },
      { id: "profile", label: "Complete your profile", complete: false },
      { id: "identity", label: "Verify your identity (KYC)", complete: false },
      { id: "bank", label: "Add and verify a bank account", complete: false },
    ] satisfies VerificationChecklistItem[];
  }

  const phoneVerified = Boolean(status.phoneVerified);
  const profileComplete =
    status.profileStatus === "PROFILE_COMPLETED" || status.profileStatus === "KYC_VERIFIED";
  const identityVerified = Boolean(status.kycVerified || status.identityVerified);
  const identityPending =
    status.verifications?.some((item) => item.type === "IDENTITY" && item.status === "PENDING") ??
    false;
  const bankVerified = status.bankAccounts?.some((item) => item.isVerified) ?? false;
  const bankPending =
    status.bankAccounts?.some((item) => item.validationStatus === "PENDING") ?? false;

  return [
    {
      id: "phone",
      label: "Verify your mobile number",
      complete: phoneVerified,
    },
    {
      id: "profile",
      label: "Complete your profile",
      complete: profileComplete,
    },
    {
      id: "identity",
      label: "Verify your identity (KYC)",
      complete: identityVerified,
      pending: !identityVerified && identityPending,
    },
    {
      id: "bank",
      label: "Add and verify a bank account",
      complete: bankVerified,
      pending: !bankVerified && bankPending,
    },
  ] satisfies VerificationChecklistItem[];
}

export function getVerificationItemHref(
  itemId: string,
  role: UserRole,
  kycRoute: string
): string {
  switch (itemId) {
    case "email":
      return "/verify-email";
    case "phone":
      return "/verify-phone";
    case "profile":
    case "identity":
      return kycRoute;
    case "bank":
      return SETTINGS_ROUTES[role] ?? kycRoute;
    default:
      return kycRoute;
  }
}

export function getVerificationItemDescription(item: VerificationChecklistItem) {
  if (item.complete) return "Completed.";
  if (item.pending) return "Submitted and awaiting review. Tap to view status.";
  return "Required before you can use all platform features. Tap to complete.";
}

export function isAccountFullyVerified(
  status?: VerificationStatusSnapshot,
  emailVerified = false,
  phoneVerified = false
) {
  const checklist = getVerificationChecklist(status);
  return (
    emailVerified &&
    phoneVerified &&
    checklist.every((item) => item.complete)
  );
}

export function deriveAccountStatusLabel(status?: VerificationStatusSnapshot) {
  if (!status) {
    return { label: "Unverified", className: "bg-amber-100 text-amber-800" };
  }

  const checklist = getVerificationChecklist(status);
  const complete = checklist.every((item) => item.complete);
  const pending = checklist.some((item) => item.pending);

  if (complete) {
    return { label: "Verified", className: "bg-emerald-100 text-emerald-800" };
  }

  if (pending) {
    return { label: "Pending", className: "bg-sky-100 text-sky-800" };
  }

  return { label: "Unverified", className: "bg-amber-100 text-amber-800" };
}
