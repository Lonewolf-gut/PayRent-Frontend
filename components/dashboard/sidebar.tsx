"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQueries } from "@tanstack/react-query";
import {
  Home,
  Building2,
  CreditCard,
  Wallet,
  MessageSquare,
  Settings,
  TrendingUp,
  FileText,
  Shield,
  Users,
  DollarSign,
  BarChart3,
  Crown,
  Share2,
  Coins,
  Package,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { RentVestLogo } from "@/components/rentvest/logo";
import { getStaffPortalHomePath } from "@/lib/auth/route-guards";
import { Badge } from "@/components/ui/badge";
import { SidebarUpgradeCard } from "@/components/dashboard/subscription-upgrade-dialog";
import { ThemeToggle } from "@/components/theme/theme-toggle";

const ICONS: Record<string, LucideIcon> = {
  Home,
  Building2,
  CreditCard,
  Wallet,
  MessageSquare,
  Settings,
  TrendingUp,
  FileText,
  Shield,
  Users,
  DollarSign,
  BarChart3,
  Crown,
  Share2,
  Coins,
  Package,
};

export interface NavItem {
  href: string;
  label: string;
  icon: keyof typeof ICONS;
  badgeCountEndpoint?: string;
}

function useSidebarBadges(items: NavItem[]) {
  const countQueries = useQueries({
    queries: items
      .filter((item) => item.badgeCountEndpoint)
      .map((item) => ({
        queryKey: ["sidebar-badge", item.href],
        queryFn: async () => {
          const res = await fetch(item.badgeCountEndpoint as string);
          const json = await res.json();
          return Number(json.data?.total ?? json.data?.length ?? json.data ?? 0);
        },
        staleTime: 1000 * 60 * 5,
        refetchInterval: 1000 * 60 * 5,
      })),
  });

  return new Map(
    items
      .filter((item) => item.badgeCountEndpoint)
      .map((item, index) => [item.href, countQueries[index]?.data ?? 0])
  );
}

export function SidebarNavContent({
  items,
  title,
  onNavigate,
  showLogo = false,
  showThemeToggle = false,
}: {
  items: NavItem[];
  title: string;
  onNavigate?: () => void;
  showLogo?: boolean;
  showThemeToggle?: boolean;
}) {
  const pathname = usePathname();
  const badgeCountMap = useSidebarBadges(items);

  return (
    <div className="flex h-full flex-col">
      {showLogo ? (
        <div className="flex h-16 items-center border-b border-border px-6">
          <RentVestLogo showIcon={false} href={getStaffPortalHomePath(title)} />
        </div>
      ) : null}
      <div className="px-4 py-4">
        {title ? (
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {title}
          </p>
        ) : null}
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-6">
        {items.map((item) => {
          const Icon = ICONS[item.icon];
          const active = pathname === item.href;
          const badgeCount = item.badgeCountEndpoint
            ? badgeCountMap.get(item.href) ?? 0
            : 0;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                active
                  ? "bg-emerald-600 text-white"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <span className="flex items-center gap-3">
                {Icon && <Icon className="h-4 w-4 shrink-0" />}
                {item.label}
              </span>
              {badgeCount > 0 ? (
                <Badge variant="secondary">{badgeCount}</Badge>
              ) : null}
            </Link>
          );
        })}
      </nav>
      {showThemeToggle ? (
        <div className="border-t border-border px-4 py-4 lg:hidden">
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Appearance
          </p>
          <ThemeToggle />
        </div>
      ) : null}
      <SidebarUpgradeCard />
    </div>
  );
}

export function DashboardSidebar({
  items,
  title,
}: {
  items: NavItem[];
  title: string;
}) {
  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r bg-card lg:flex">
      <SidebarNavContent items={items} title={title} showLogo />
    </aside>
  );
}
