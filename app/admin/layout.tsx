import { Suspense } from "react";
import { DashboardSidebar } from "@/components/dashboard/sidebar";

import { AdminLayoutGate } from "@/components/admin/admin-layout-gate";
import { DashboardThemeProvider } from "@/components/dashboard/dashboard-theme-provider";



const navItems = [

  { href: "/admin", label: "Overview", icon: "Shield" as const },

  { href: "/admin/users", label: "Users", icon: "Users" as const },

  {

    href: "/admin/properties",

    label: "Listings",

    icon: "Building2" as const,

    badgeCountEndpoint: "/api/admin/properties?status=PENDING_VERIFICATION",

  },

  { href: "/admin/kyc", label: "KYC Exceptions", icon: "FileText" as const, badgeCountEndpoint: "/api/admin/reviews?type=kyc" },

  { href: "/admin/financing-documents", label: "Financing Docs", icon: "FileText" as const, badgeCountEndpoint: "/api/admin/financing-documents?status=PENDING" },

  { href: "/admin/mandates", label: "Mandates", icon: "CreditCard" as const, badgeCountEndpoint: "/api/admin/reviews?type=mandate" },

  { href: "/admin/financing", label: "Financing", icon: "TrendingUp" as const },

  { href: "/admin/financing/demo", label: "Financing demo", icon: "BarChart3" as const },

  { href: "/admin/settlements", label: "Settlements", icon: "DollarSign" as const },

  { href: "/admin/withdrawals", label: "Withdrawals", icon: "Wallet" as const },

  { href: "/admin/transactions", label: "Transactions", icon: "DollarSign" as const },

  { href: "/admin/fraud", label: "Fraud & Security", icon: "Shield" as const },

  { href: "/admin/commissions", label: "Commissions", icon: "BarChart3" as const },

  { href: "/admin/subscriptions", label: "Subscriptions", icon: "CreditCard" as const },

  { href: "/admin/wallet", label: "Platform Wallet", icon: "Wallet" as const },

  { href: "/admin/reconciliation", label: "Reconciliation", icon: "BarChart3" as const },

  { href: "/admin/settings", label: "Settings", icon: "Settings" as const },

];



export default function AdminLayout({ children }: { children: React.ReactNode }) {

  return (
    <DashboardThemeProvider className="flex min-h-screen w-full">
      <Suspense
        fallback={
          <div className="flex min-h-screen w-full flex-1 items-center justify-center text-sm text-muted-foreground">
            Loading admin portal…
          </div>
        }
      >
        <AdminLayoutGate navItems={navItems}>{children}</AdminLayoutGate>
      </Suspense>
    </DashboardThemeProvider>
  );

}

