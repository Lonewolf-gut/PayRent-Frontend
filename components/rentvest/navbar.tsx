"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { LogOut, Menu, Sparkles } from "lucide-react";
import { RentVestLogo } from "./logo";
import { Button, buttonVariants } from "@/components/ui/button";
import { ProfileImage } from "@/components/shared/profile-image";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { PROFILE_MENU_ITEMS } from "@/lib/nav/profile-menu";
import { getRoleSignOutPath } from "@/lib/auth/route-guards";
import { NavQuickActions } from "@/components/dashboard/nav-quick-actions";
import { useSubscriptionUpgrade } from "@/components/subscription/subscription-upgrade-provider";
import { isPaidPlan, normalizeSubscriptionPlan } from "@/lib/subscription/plans";
import { roleRequiresSubscription } from "@/lib/subscription/roles";
import { showMerchantAgentPricing } from "@/lib/subscription/pricing-visibility";
import { cn } from "@/lib/utils";
import { useSettingsProfile } from "@/hooks/use-settings-profile";
import type { UserRole } from "@prisma/client";

const MARKETING_LINKS = [
  { href: "/properties", label: "Properties" },
  { href: "/#how-it-works", label: "How it works" },
  { href: "/pricing", label: "Pricing" },
  { href: "/contact", label: "Contact" },
] as const;

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openMenu = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    setMenuOpen(true);
  };

  const scheduleCloseMenu = () => {
    closeTimer.current = setTimeout(() => setMenuOpen(false), 150);
  };

  const { data: profile } = useSettingsProfile(!!session?.user?.id);

  const email = session?.user?.email ?? profile?.email ?? "";
  const fullName = profile?.fullName?.trim();
  const avatarImage = profile?.image ?? session?.user?.image ?? null;
  const role = session?.user?.role as UserRole | undefined;
  const menuItems = role ? PROFILE_MENU_ITEMS[role] ?? [] : [];
  const { openUpgrade } = useSubscriptionUpgrade();

  const { data: subscriptionData } = useQuery({
    queryKey: ["subscription"],
    queryFn: async () => {
      const res = await fetch("/api/subscriptions");
      const json = await res.json();
      return json.data;
    },
    enabled: !!session?.user && !!role && roleRequiresSubscription(role),
  });

  const currentPlan = normalizeSubscriptionPlan(
    subscriptionData?.subscription?.plan ?? subscriptionData?.access?.plan ?? "FREE"
  );
  const showUpgradeInMenu =
    !!role && roleRequiresSubscription(role) && !isPaidPlan(currentPlan);
  const marketingLinks = MARKETING_LINKS.filter((link) => {
    if (link.href === "/pricing" && pathname === "/pricing") return false;
    if (link.href === "/pricing" && !showMerchantAgentPricing(role)) return false;
    return true;
  });

  return (
    <header className="sticky top-0 z-50 border-b border-emerald-100 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4 sm:h-16 sm:px-6">
        <div className="flex min-w-0 items-center gap-2">
          <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
            <SheetTrigger
              className={cn(
                buttonVariants({ variant: "ghost", size: "icon-sm" }),
                "md:hidden"
              )}
              aria-label="Open menu"
            >
              <Menu className="size-5 text-emerald-800" />
            </SheetTrigger>
            <SheetContent side="left" className="w-[min(100vw-2rem,320px)] rounded-none">
              <SheetHeader>
                <SheetTitle className="text-left text-emerald-900">Menu</SheetTitle>
              </SheetHeader>
              <nav className="mt-6 flex flex-col gap-1">
                {marketingLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="rounded-md px-3 py-2.5 text-sm font-medium text-emerald-800 hover:bg-emerald-50"
                    onClick={() => setMobileNavOpen(false)}
                  >
                    {link.label}
                  </Link>
                ))}
                <Link
                  href="/login"
                  className="rounded-md px-3 py-2.5 text-sm font-medium text-emerald-800 hover:bg-emerald-50"
                  onClick={() => setMobileNavOpen(false)}
                >
                  Sign in
                </Link>
              </nav>
            </SheetContent>
          </Sheet>
          <RentVestLogo showIcon={false} />
        </div>

        <nav className="hidden items-center gap-8 md:flex">
          {marketingLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-emerald-700 hover:text-emerald-900"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          {session?.user ? (
            <>
              <NavQuickActions />
              <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
              <DropdownMenuTrigger
                className="rounded-full outline-none ring-emerald-600 focus-visible:ring-2"
                aria-label="Open account menu"
                onMouseEnter={openMenu}
                onMouseLeave={scheduleCloseMenu}
              >
                <ProfileImage
                  image={avatarImage}
                  name={fullName}
                  email={email}
                  size="md"
                  className="cursor-pointer"
                />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-56 rounded-none"
                onMouseEnter={openMenu}
                onMouseLeave={scheduleCloseMenu}
              >
                <DropdownMenuLabel className="font-normal">
                  <p className="truncate text-sm font-medium text-foreground">
                    {fullName || email.split("@")[0]}
                  </p>
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
                {menuItems.map((item) => (
                  <DropdownMenuItem
                    key={item.href}
                    className="cursor-pointer rounded-none"
                    onClick={() => router.push(item.href)}
                  >
                    <span className="flex w-full items-center justify-between gap-2">
                      {item.label}
                    </span>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  className="cursor-pointer rounded-none"
                  onClick={() =>
                    signOut({
                      callbackUrl: getRoleSignOutPath(role),
                    })
                  }
                >
                  <LogOut className="size-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild className="text-emerald-800 hover:text-emerald-950">
                <Link href="/login">Sign in</Link>
              </Button>
              <Button asChild size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                <Link href="/register">Get started</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
