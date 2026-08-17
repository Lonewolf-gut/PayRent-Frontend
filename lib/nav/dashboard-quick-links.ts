import type { UserRole } from "@prisma/client";

export const MESSAGES_ROUTES: Partial<Record<UserRole, string>> = {
  BUYER: "/dashboard/buyer/messages",
  MERCHANT: "/dashboard/merchant/messages",
  MARKETER: "/dashboard/marketer/messages",
  LENDER: "/dashboard/lender/messages",
};

export const WALLET_ROUTES: Partial<Record<UserRole, string>> = {
  BUYER: "/dashboard/buyer/wallet",
  MERCHANT: "/dashboard/merchant/wallet",
  MARKETER: "/dashboard/marketer/wallet",
  LENDER: "/dashboard/lender/wallet",
};

export const SAVED_ROUTES: Partial<Record<UserRole, string>> = {
  BUYER: "/dashboard/buyer/properties",
};

export const REQUEST_STATUS_ROUTES: Partial<Record<UserRole, string>> = {
  BUYER: "/dashboard/buyer/applications",
};

export function getMessagesPath(role?: UserRole | string | null) {
  if (!role) return "/login";
  return MESSAGES_ROUTES[role as UserRole] ?? "/dashboard";
}

export function getWalletPath(role?: UserRole | string | null) {
  if (!role) return "/login";
  return WALLET_ROUTES[role as UserRole] ?? "/dashboard";
}

export function getSavedPath(role?: UserRole | string | null) {
  if (!role) return "/login";
  return SAVED_ROUTES[role as UserRole] ?? null;
}

export function getRequestStatusPath(role?: UserRole | string | null) {
  if (!role) return null;
  return REQUEST_STATUS_ROUTES[role as UserRole] ?? null;
}
