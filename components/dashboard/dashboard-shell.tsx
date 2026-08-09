import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { TrialStatusBanner } from "@/components/subscription/trial-status-banner";
import { VerificationPromptDialog } from "@/components/dashboard/verification-prompt-dialog";
import { MessagesWidget } from "@/components/dashboard/messaging/messages-widget";
import { SubscriptionUpgradeProvider } from "@/components/subscription/subscription-upgrade-provider";
import {
  SubscriptionUpgradeDialog,
} from "@/components/dashboard/subscription-upgrade-dialog";
import type { NavItem } from "@/components/dashboard/sidebar";

export function DashboardShell({
  items,
  title,
  children,
}: {
  items: NavItem[];
  title: string;
  children: React.ReactNode;
}) {
  return (
    <SubscriptionUpgradeProvider>
      <DashboardSidebar items={items} title={title} />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <DashboardHeader navItems={items} sidebarTitle={title} />
        <TrialStatusBanner fullWidth />
        <VerificationPromptDialog />
        <div className="flex-1 overflow-auto p-3 sm:p-6 [&_h1]:text-xl [&_h1]:font-bold [&_h1]:sm:text-2xl [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:sm:text-xl">
          {children}
        </div>
        <MessagesWidget />
      </div>
      <SubscriptionUpgradeDialog />
    </SubscriptionUpgradeProvider>
  );
}
