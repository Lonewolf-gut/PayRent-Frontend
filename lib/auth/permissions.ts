import type { UserRole } from "@prisma/client";

export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  BUYER: [
    "property:read",
    "property:save",
    "application:create",
    "application:read",
    "financing:create",
    "financing:read",
    "mandate:create",
    "mandate:read",
    "kyc:manage",
    "wallet:read",
    "wallet:deposit",
    "wallet:withdraw",
    "wallet:pay",
    "message:send",
    "complaint:submit",
  ],
  MERCHANT: [
    "property:create",
    "property:update",
    "property:delete",
    "application:review",
    "marketer:manage",
    "settlement:read",
    "order:confirm",
    "delivery:update",
    "sales:read",
    "wallet:read",
    "wallet:deposit",
    "wallet:withdraw",
    "kyc:manage",
    "subscription:manage",
    "message:send",
  ],
  MARKETER: [
    "property:read",
    "property:update",
    "application:review",
    "referral:read",
    "commission:read",
    "kyc:manage",
    "wallet:read",
    "wallet:deposit",
    "wallet:withdraw",
    "subscription:manage",
    "message:send",
  ],
  LENDER: [
    "financing:review",
    "financing:approve",
    "financing:reject",
    "investment:read",
    "repayment:read",
    "wallet:read",
    "wallet:deposit",
    "wallet:withdraw",
    "kyc:manage",
    "message:send",
  ],
  ADMIN: [
    "admin:users",
    "admin:properties",
    "admin:transactions",
    "admin:kyc",
    "admin:mandates",
    "admin:settlements",
    "admin:reconciliation",
    "admin:subscriptions",
    "admin:commissions",
    "admin:fraud",
    "admin:disputes",
    "admin:analytics",
    "admin:fees",
    "admin:reports",
    "wallet:read",
    "wallet:withdraw",
  ],
  COMPLIANCE_OFFICER: [
    "compliance:audit",
    "compliance:kyc",
    "compliance:monitor",
    "compliance:reports",
    "kyc:manage",
  ],
};

export function hasPermission(role: UserRole, permission: string): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function requireRole(
  userRole: UserRole,
  allowedRoles: UserRole[]
): boolean {
  return allowedRoles.includes(userRole);
}

export const DASHBOARD_ROUTES: Record<UserRole, string> = {
  BUYER: "/dashboard/buyer",
  MERCHANT: "/dashboard/merchant",
  MARKETER: "/dashboard/marketer/listings",
  LENDER: "/dashboard/lender",
  ADMIN: "/admin",
  COMPLIANCE_OFFICER: "/compliance",
};

export const SETTINGS_ROUTES: Record<UserRole, string> = {
  BUYER: "/dashboard/buyer/settings",
  MERCHANT: "/dashboard/merchant/settings",
  MARKETER: "/dashboard/marketer/settings",
  LENDER: "/dashboard/lender/settings",
  ADMIN: "/admin/settings",
  COMPLIANCE_OFFICER: "/compliance/settings",
};

export const SUBSCRIPTION_ROUTES: Record<UserRole, string> = {
  BUYER: "/pricing",
  MERCHANT: "/pricing",
  MARKETER: "/pricing",
  LENDER: "/pricing",
  ADMIN: "/admin/settings",
  COMPLIANCE_OFFICER: "/compliance",
};

export function getSubscriptionSettingsPath(role?: UserRole | null) {
  if (!role || role === "ADMIN" || role === "COMPLIANCE_OFFICER") return "/register";
  return SUBSCRIPTION_ROUTES[role];
}

export const POST_LOGIN_ROUTES: Record<UserRole, string> = {
  BUYER: "/properties",
  MERCHANT: DASHBOARD_ROUTES.MERCHANT,
  MARKETER: DASHBOARD_ROUTES.MARKETER,
  LENDER: DASHBOARD_ROUTES.LENDER,
  ADMIN: DASHBOARD_ROUTES.ADMIN,
  COMPLIANCE_OFFICER: DASHBOARD_ROUTES.COMPLIANCE_OFFICER,
};

export function getPostLoginRoute(role: UserRole) {
  return POST_LOGIN_ROUTES[role] ?? "/";
}

export const PLATFORM_ROLES: UserRole[] = [
  "BUYER",
  "MERCHANT",
  "MARKETER",
  "LENDER",
  "ADMIN",
  "COMPLIANCE_OFFICER",
];

export const STAFF_ROLES: UserRole[] = ["ADMIN", "COMPLIANCE_OFFICER"];

export function isStaffRole(role?: UserRole | null) {
  return !!role && STAFF_ROLES.includes(role);
}
