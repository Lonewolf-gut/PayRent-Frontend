import { Suspense } from "react";
import { ComplianceLayoutGate } from "@/components/compliance/compliance-layout-gate";
import { DashboardThemeProvider } from "@/components/dashboard/dashboard-theme-provider";

const navItems = [
  { href: "/compliance", label: "Overview", icon: "Shield" as const },
  { href: "/compliance/consents", label: "Consent records", icon: "FileText" as const },
  { href: "/compliance/fee-disclosures", label: "Fee disclosures", icon: "FileText" as const },
  { href: "/compliance/audit-logs", label: "Audit logs", icon: "FileText" as const },
  { href: "/compliance/transactions", label: "Transactions", icon: "DollarSign" as const },
  { href: "/compliance/kyc", label: "KYC review", icon: "FileText" as const },
  { href: "/compliance/kyc-history", label: "KYC history", icon: "FileText" as const },
  { href: "/compliance/monitoring", label: "Suspicious activity", icon: "Shield" as const },
  { href: "/compliance/reports", label: "Reports", icon: "BarChart3" as const },
  { href: "/compliance/settings", label: "Settings", icon: "Settings" as const },
];

export default function ComplianceLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardThemeProvider className="flex min-h-screen w-full">
      <Suspense
        fallback={
          <div className="flex min-h-screen w-full flex-1 items-center justify-center text-sm text-muted-foreground">
            Loading compliance portal…
          </div>
        }
      >
        <ComplianceLayoutGate navItems={navItems}>{children}</ComplianceLayoutGate>
      </Suspense>
    </DashboardThemeProvider>
  );
}
