import { DashboardShell } from "@/components/dashboard/dashboard-shell";

const navItems = [
  { href: "/dashboard/lender", label: "Overview", icon: "Home" as const },
  {
    href: "/dashboard/lender/opportunities",
    label: "Financing Queue",
    icon: "FileText" as const,
    badgeCountEndpoint: "/api/financing",
    badgeCountStatuses: ["READY_FOR_LENDER_REVIEW", "PENDING", "UNDER_REVIEW"],
  },
  { href: "/dashboard/lender/portfolio", label: "Portfolio", icon: "TrendingUp" as const },
  { href: "/dashboard/lender/repayments", label: "Repayments", icon: "CreditCard" as const },
  { href: "/dashboard/lender/wallet", label: "Wallet", icon: "Wallet" as const },
  { href: "/dashboard/lender/kyc", label: "Profile & KYC", icon: "Shield" as const },
  { href: "/dashboard/lender/settings", label: "Settings", icon: "Settings" as const },
];

export default function LenderLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardShell items={navItems} title="Lender">
      {children}
    </DashboardShell>
  );
}
