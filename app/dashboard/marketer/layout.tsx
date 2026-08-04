import { DashboardShell } from "@/components/dashboard/dashboard-shell";

const navItems = [
  { href: "/dashboard/marketer", label: "Overview", icon: "Home" as const },
  { href: "/dashboard/marketer/listings", label: "My Listings", icon: "Building2" as const },
  { href: "/dashboard/marketer/promote", label: "Promote & Links", icon: "Share2" as const },
  { href: "/dashboard/marketer/earnings", label: "Commissions", icon: "Coins" as const },
  {
    href: "/dashboard/marketer/applications",
    label: "Applications",
    icon: "FileText" as const,
    badgeCountEndpoint: "/api/applications",
    badgeCountStatuses: ["SUBMITTED", "UNDER_REVIEW", "CLARIFICATION_REQUIRED"],
  },
  { href: "/dashboard/marketer/wallet", label: "Wallet", icon: "Wallet" as const },
  { href: "/dashboard/marketer/kyc", label: "Profile & KYC", icon: "Shield" as const },
  { href: "/dashboard/marketer/settings", label: "Settings", icon: "Settings" as const },
];

export default function AgentLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardShell items={navItems} title="Affiliate">
      {children}
    </DashboardShell>
  );
}
