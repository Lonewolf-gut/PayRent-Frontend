"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
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
  LogOut,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { parseSidebarBadgeCount } from "@/lib/nav/sidebar-badge-count";
import {
  countUnseenNavItems,
  extractNavItemIds,
} from "@/lib/nav/section-views";
import { RentVestLogo } from "@/components/rentvest/logo";
import { getStaffPortalHomePath } from "@/lib/auth/route-guards";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  badgeCountStatuses?: string[];
}

function useSidebarBadges(items: NavItem[]) {
  const { data: session } = useSession();
  const userId = session?.user?.id ?? "";

  const countQueries = useQueries({
    queries: items
      .filter((item) => item.badgeCountEndpoint)
      .map((item) => ({
        queryKey: ["sidebar-badge", item.href, userId],
        queryFn: async () => {
          const res = await fetch(item.badgeCountEndpoint as string);
          const json = await res.json();
          const total = parseSidebarBadgeCount(json, item.badgeCountStatuses);
          const itemIds = extractNavItemIds(json.data, item.badgeCountStatuses);
          if (!itemIds.length) return total;
          return countUnseenNavItems(userId, item.href, itemIds);
        },
        staleTime: 30_000,
        refetchInterval: 60_000,
        enabled: !!userId,
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
  onSignOut,
}: {
  items: NavItem[];
  title: string;
  onNavigate?: () => void;
  showLogo?: boolean;
  showThemeToggle?: boolean;
  onSignOut?: () => void;
}) {
  const pathname = usePathname();
  const badgeCountMap = useSidebarBadges(items);

  return (
    <div className="flex h-full flex-col">
      {showLogo ? (
        <div className="flex h-14 items-center border-b border-border px-4 sm:h-16 sm:px-6">
          <RentVestLogo showIcon={false} href={getStaffPortalHomePath(title)} />
        </div>
      ) : null}
      <div className={cn("px-4", showThemeToggle ? "py-3" : "py-4")}>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {title}
        </p>
      </div>
      <nav className={cn("flex-1 space-y-1 overflow-y-auto px-3", showThemeToggle ? "pb-3" : "pb-6")}>
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
        <div className="shrink-0 space-y-2 border-t border-border px-3 py-2.5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Appearance
            </p>
            <ThemeToggle />
          </div>
          <SidebarUpgradeCard compact />
          {onSignOut ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 w-full justify-start gap-2 text-xs"
              onClick={() => {
                onSignOut();
                onNavigate?.();
              }}
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </Button>
          ) : null}
        </div>
      ) : (
        <SidebarUpgradeCard />
      )}
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
