import { DashboardShell } from "@/components/dashboard/dashboard-shell";

const navItems = [
  { href: "/dashboard/buyer", label: "Overview", icon: "Home" as const },
  { href: "/dashboard/buyer/kyc", label: "Profile & KYC", icon: "Shield" as const },
  { href: "/dashboard/buyer/financing", label: "Financing Applications", icon: "FileText" as const },
  { href: "/dashboard/buyer/properties", label: "Saved Properties", icon: "Building2" as const },
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
