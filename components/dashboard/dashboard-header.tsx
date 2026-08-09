"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { signOut, useSession } from "next-auth/react";
import { LogOut, Menu, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProfileImage } from "@/components/shared/profile-image";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NotificationsPopover } from "@/components/dashboard/notifications-popover";
import { NavQuickActions } from "@/components/dashboard/nav-quick-actions";
import { AccountVerificationBadge } from "@/components/dashboard/account-verification-badge";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { useSubscriptionUpgrade } from "@/components/subscription/subscription-upgrade-provider";
import { isPaidPlan, normalizeSubscriptionPlan } from "@/lib/subscription/plans";
import { roleRequiresSubscription } from "@/lib/subscription/roles";
import { getTimeGreeting } from "@/lib/utils/greeting";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  SidebarNavContent,
  type NavItem,
} from "@/components/dashboard/sidebar";
import { RentVestLogo } from "@/components/rentvest/logo";
import { getRoleSignOutPath, getStaffPortalHomePath } from "@/lib/auth/route-guards";
import { useSettingsProfile } from "@/hooks/use-settings-profile";
import { useDashboardTheme } from "@/components/dashboard/dashboard-theme-provider";
import { cn } from "@/lib/utils";

type DashboardHeaderProps = {
  navItems?: NavItem[];
  sidebarTitle?: string;
};

export function DashboardHeader({
  navItems,
  sidebarTitle = "Dashboard",
}: DashboardHeaderProps) {
  const { data: session } = useSession();
  const { openUpgrade } = useSubscriptionUpgrade();
  const dashboardTheme = useDashboardTheme();
  const isDark = dashboardTheme?.theme === "dark";
  const greeting = getTimeGreeting();
  const [menuOpen, setMenuOpen] = useState(false);
  const role = session?.user?.role;

  const { data: profile } = useSettingsProfile(!!session?.user?.id);

  const { data: subscriptionData } = useQuery({
    queryKey: ["subscription"],
    queryFn: async () => {
      const res = await fetch("/api/subscriptions");
      const json = await res.json();
      if (!res.ok || json.success === false) return null;
      return json.data ?? null;
    },
    enabled: !!session?.user && !!role && roleRequiresSubscription(role),
  });

  const currentPlan = normalizeSubscriptionPlan(
    subscriptionData?.subscription?.plan ?? "FREE"
  );
  const showUpgradeInMenu =
    !!role && roleRequiresSubscription(role) && !isPaidPlan(currentPlan);

  const email = session?.user?.email ?? profile?.email ?? "";
  const fullName = profile?.fullName?.trim();
  const displayName = fullName || email.split("@")[0] || "there";
  const avatarImage = profile?.image ?? session?.user?.image ?? null;

  return (
    <div className="border-b bg-card">
      <header className="flex min-h-14 items-center justify-between gap-2 px-4 py-2 sm:gap-3 sm:px-6 sm:py-3 lg:min-h-[4.5rem]">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {navItems?.length ? (
            <>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                className="shrink-0 lg:hidden"
                aria-label="Open menu"
                onClick={() => setMenuOpen(true)}
              >
                <Menu className="h-4 w-4" />
              </Button>
              <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
                <SheetContent side="left" className="w-[min(100vw-2rem,18rem)] p-0">
                  <SheetTitle className="sr-only">{sidebarTitle} navigation</SheetTitle>
                  <SidebarNavContent
                    items={navItems}
                    title={sidebarTitle}
                    showLogo
                    showThemeToggle
                    onNavigate={() => setMenuOpen(false)}
                    onSignOut={() => signOut({ callbackUrl: "/" })}
                  />
                </SheetContent>
              </Sheet>
            </>
          ) : null}

          <div className="hidden min-w-0 md:block">
            <p className="truncate text-lg font-semibold text-foreground lg:text-xl">
              {greeting}, {displayName}
            </p>
            {email ? (
              <p className="truncate text-sm text-muted-foreground">{email}</p>
            ) : null}
          </div>

          <div className="min-w-0 md:hidden">
            <p className="truncate text-sm font-semibold text-foreground">
              {displayName}
            </p>
            <p className="truncate text-xs text-muted-foreground">{greeting}</p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <ThemeToggle className="hidden lg:inline-flex" />
          <NavQuickActions />
          <NotificationsPopover />
          <DropdownMenu>
            <DropdownMenuTrigger
              className="flex min-w-0 items-center gap-2 rounded-full border border-border/60 bg-muted/30 py-1 pl-1 pr-2.5 outline-none ring-emerald-600 focus-visible:ring-2"
              aria-label="Open account menu"
            >
                <ProfileImage
                  image={avatarImage}
                  name={fullName}
                  email={email}
                  size="sm"
                  className="size-9"
                />
                <span className="hidden sm:inline">
                  <AccountVerificationBadge />
                </span>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className={cn(
                "w-56 rounded-none border border-border bg-card text-card-foreground",
                isDark && "dark"
              )}
            >
              <DropdownMenuLabel className="font-normal">
                <p className="truncate text-sm font-medium text-foreground">{displayName}</p>
                <p className="truncate text-xs text-muted-foreground">{email}</p>
              </DropdownMenuLabel>
              {showUpgradeInMenu ? (
                <DropdownMenuItem
                  className="cursor-pointer rounded-none"
                  onClick={() => openUpgrade()}
                >
                  <Sparkles className="size-4" />
                  Upgrade
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer rounded-none"
                onClick={() => signOut({ callbackUrl: "/" })}
              >
                <LogOut className="size-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="outline"
            size="sm"
            className="hidden sm:inline-flex"
            onClick={() => signOut({ callbackUrl: "/" })}
          >
            Sign out
          </Button>
        </div>
      </header>
    </div>
  );
}

export function AdminDashboardHeader({
  navItems,
  sidebarTitle = "Admin",
}: DashboardHeaderProps) {
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);

  const role = session?.user?.role;
  const staffHomePath = getStaffPortalHomePath(sidebarTitle);
  const signOutPath = getRoleSignOutPath(role);
  const profileApiPath =
    role === "ADMIN" ? "/api/admin/settings" : "/api/settings";

  const { data: profile } = useQuery({
    queryKey: ["admin-profile", profileApiPath],
    queryFn: async () => {
      const res = await fetch(profileApiPath);
      const json = await res.json();
      if (!res.ok || json.success === false) return null;
      return (json.data?.user ?? null) as { email?: string; image?: string | null } | null;
    },
    enabled: !!session?.user?.id,
  });

  const email = session?.user?.email ?? profile?.email ?? "";
  const image = session?.user?.image ?? profile?.image ?? null;

  return (
    <div className="border-b bg-card">
      <header className="flex min-h-14 items-center justify-between gap-2 px-4 py-2 sm:px-6 sm:py-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {navItems?.length ? (
            <>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                className="shrink-0 rounded-none lg:hidden"
                aria-label="Open menu"
                onClick={() => setMenuOpen(true)}
              >
                <Menu className="h-4 w-4" />
              </Button>
              <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
                <SheetContent side="left" className="w-[min(100vw-2rem,18rem)] p-0">
                  <SheetTitle className="sr-only">{sidebarTitle} navigation</SheetTitle>
                  <SidebarNavContent
                    items={navItems}
                    title={sidebarTitle}
                    showLogo
                    showThemeToggle
                    onNavigate={() => setMenuOpen(false)}
                    onSignOut={() => signOut({ callbackUrl: signOutPath })}
                  />
                </SheetContent>
              </Sheet>
            </>
          ) : null}
          <RentVestLogo showIcon={false} href={staffHomePath} className="shrink-0 lg:hidden" />
          <p className="hidden truncate text-base font-semibold text-foreground lg:block">
            {sidebarTitle}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <ThemeToggle className="hidden lg:inline-flex" />
          <NotificationsPopover />
          <div className="flex min-w-0 items-center gap-2 rounded-none border border-border/60 bg-muted/30 py-1 pl-1 pr-3">
            <ProfileImage
              image={image}
              name={email}
              email={email}
              size="sm"
              className="size-9 rounded-none"
            />
            {email ? (
              <span className="hidden max-w-[12rem] truncate text-sm text-muted-foreground sm:inline">
                {email}
              </span>
            ) : null}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="hidden rounded-none sm:inline-flex"
            onClick={() => signOut({ callbackUrl: signOutPath })}
          >
            Sign out
          </Button>
        </div>
      </header>
    </div>
  );
}
