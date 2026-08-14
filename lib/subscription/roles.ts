import type { UserRole } from "@prisma/client";

/** Roles with subscription tiers (merchants and affiliates). */
export const SUBSCRIPTION_ELIGIBLE_ROLES = [
  "MERCHANT",
  "MARKETER",
] as const satisfies readonly UserRole[];

export type SubscriptionEligibleRole = (typeof SUBSCRIPTION_ELIGIBLE_ROLES)[number];

export function roleRequiresSubscription(role: UserRole): role is SubscriptionEligibleRole {
  return (SUBSCRIPTION_ELIGIBLE_ROLES as readonly UserRole[]).includes(role);
}

/** Roles with fully free platform access (no subscription product). */
export function roleHasFreePlatformAccess(role: UserRole) {
  return (
    role === "BUYER" ||
    role === "LENDER" ||
    role === "ADMIN" ||
    role === "COMPLIANCE_OFFICER"
  );
}

export function roleUsesLenderFinancingLimit(role: UserRole) {
  return role === "LENDER";
}

export function roleHasUnlimitedBrowse(role: UserRole) {
  return (
    role === "BUYER" ||
    role === "LENDER" ||
    role === "ADMIN" ||
    role === "COMPLIANCE_OFFICER"
  );
}
