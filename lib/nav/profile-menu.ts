import type { UserRole } from "@prisma/client";
import { SUBSCRIPTION_ROUTES } from "@/lib/auth/permissions";

export type ProfileMenuItem = {
  href: string;
  label: string;
};

export const PROFILE_MENU_ITEMS: Record<UserRole, ProfileMenuItem[]> = {
  BUYER: [
    { href: "/dashboard/buyer", label: "Overview" },
    { href: "/dashboard/buyer/wallet", label: "Wallet" },
    { href: "/dashboard/buyer/properties", label: "Saved" },
    { href: "/dashboard/buyer/applications", label: "Applications" },
    { href: "/dashboard/buyer/financing", label: "Pay for Me" },
    { href: "/dashboard/buyer/settings", label: "Settings" },
    { href: "/dashboard/buyer/kyc", label: "Profile & KYC" },
  ],
  MERCHANT: [
    { href: "/dashboard/merchant", label: "Overview" },
    { href: "/dashboard/merchant/properties", label: "My Listings" },
    { href: "/dashboard/merchant/wallet", label: "Wallet" },
    { href: SUBSCRIPTION_ROUTES.MERCHANT, label: "Subscription" },
    { href: "/dashboard/merchant/applications", label: "Applications" },
    { href: "/dashboard/merchant/settings", label: "Settings" },
    { href: "/dashboard/merchant/kyc", label: "Profile & KYC" },
  ],
  MARKETER: [
    { href: "/dashboard/marketer", label: "Overview" },
    { href: "/dashboard/marketer/listings", label: "My Listings" },
    { href: "/dashboard/marketer/wallet", label: "Wallet" },
    { href: SUBSCRIPTION_ROUTES.MARKETER, label: "Subscription" },
    { href: "/dashboard/marketer/settings", label: "Settings" },
    { href: "/dashboard/marketer/kyc", label: "Profile & KYC" },
  ],
  LENDER: [
    { href: "/dashboard/lender", label: "Overview" },
    { href: "/dashboard/lender/opportunities", label: "Financing Queue" },
    { href: "/dashboard/lender/wallet", label: "Wallet" },
    { href: "/dashboard/lender/portfolio", label: "Portfolio" },
    { href: "/dashboard/lender/settings", label: "Settings" },
    { href: "/dashboard/lender/kyc", label: "Profile & KYC" },
  ],
  ADMIN: [
    { href: "/admin", label: "Overview" },
    { href: "/admin/wallet", label: "Platform Wallet" },
    { href: "/admin/users", label: "Users" },
    { href: "/admin/properties", label: "Listings" },
    { href: "/admin/settings", label: "Settings" },
  ],
  COMPLIANCE_OFFICER: [
    { href: "/compliance", label: "Overview" },
    { href: "/compliance/audit-logs", label: "Audit logs" },
    { href: "/compliance/kyc", label: "KYC review" },
    { href: "/compliance/monitoring", label: "Suspicious activity" },
    { href: "/compliance/reports", label: "Reports" },
    { href: "/compliance/settings", label: "Settings" },
  ],
};
