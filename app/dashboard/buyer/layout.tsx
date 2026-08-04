import { DashboardShell } from "@/components/dashboard/dashboard-shell";

const navItems = [
  { href: "/dashboard/buyer", label: "Overview", icon: "Home" as const },
  { href: "/dashboard/buyer/kyc", label: "Profile & KYC", icon: "Shield" as const },
  {
    href: "/dashboard/buyer/applications",
    label: "Applications",
    icon: "FileText" as const,
    badgeCountEndpoint: "/api/applications",
    badgeCountStatuses: ["SUBMITTED", "UNDER_REVIEW", "CLARIFICATION_REQUIRED", "APPROVED"],
  },
  {
    href: "/dashboard/buyer/financing-documents",
    label: "Financing Docs",
    icon: "FileText" as const,
    badgeCountEndpoint: "/api/buyer/financing-documents",
    badgeCountStatuses: ["PENDING", "REJECTED"],
  },
  { href: "/dashboard/buyer/properties", label: "Properties", icon: "Building2" as const },
  {
    href: "/dashboard/buyer/financing",
    label: "Pay for Rent",
    icon: "CreditCard" as const,
    badgeCountEndpoint: "/api/financing",
    badgeCountStatuses: [
      "ELIGIBILITY_PENDING",
      "MANDATE_PENDING",
      "READY_FOR_LENDER_REVIEW",
      "APPROVED",
    ],
  },
  { href: "/dashboard/buyer/mandates", label: "Mandates", icon: "DollarSign" as const },
  { href: "/dashboard/buyer/repayments", label: "Repayments", icon: "TrendingUp" as const },
  { href: "/dashboard/buyer/wallet", label: "Wallet", icon: "Wallet" as const },
  { href: "/dashboard/buyer/settings", label: "Settings", icon: "Settings" as const },
];

export default function TenantLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardShell items={navItems} title="Buyer">
      {children}
    </DashboardShell>
  );
}
