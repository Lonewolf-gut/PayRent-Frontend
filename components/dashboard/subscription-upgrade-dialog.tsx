"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { UpgradePlanPicker } from "@/components/subscription/upgrade-plan-picker";
import {
  isPaidPlan,
  normalizeSubscriptionPlan,
  PLAN_CATALOG,
  type CheckoutPlanId,
} from "@/lib/subscription/plans";
import { useSubscriptionUpgrade } from "@/components/subscription/subscription-upgrade-provider";
import { useDashboardTheme } from "@/components/dashboard/dashboard-theme-provider";
import { useSettingsProfile } from "@/hooks/use-settings-profile";
import { cn } from "@/lib/utils";

export function SubscriptionUpgradeDialog() {
  const router = useRouter();
  const { data: session } = useSession();
  const { open, closeUpgrade } = useSubscriptionUpgrade();
  const dashboardTheme = useDashboardTheme();
  const isDark = dashboardTheme?.theme === "dark";

  const { data: subscriptionData } = useQuery({
    queryKey: ["subscription"],
    queryFn: async () => {
      const res = await fetch("/api/subscriptions");
      const json = await res.json();
      if (!res.ok || json.success === false) return null;
      return json.data ?? null;
    },
    enabled: open && !!session?.user,
  });

  const currentPlan = normalizeSubscriptionPlan(
    subscriptionData?.subscription?.plan ?? "FREE"
  );

  function handlePlanSelect(plan: CheckoutPlanId) {
    if (plan === "FREE") return;
    if (currentPlan === plan && isPaidPlan(currentPlan)) return;
    closeUpgrade();
    router.push(`/pricing?plan=${plan}`);
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && closeUpgrade()}>
      <DialogContent
        data-surface="subscription-upgrade"
        className={cn(
          "max-h-[90vh] max-w-5xl gap-0 overflow-hidden border-0 bg-transparent p-0 shadow-none ring-0 sm:max-w-5xl",
          isDark && "dark"
        )}
      >
        <div className="flex max-h-[90vh] flex-col overflow-y-auto border border-border bg-background text-foreground shadow-xl">
          <DialogHeader className="border-b border-border px-4 py-2.5 text-center sm:px-6 sm:py-5">
            <DialogTitle className="text-base font-semibold text-foreground sm:text-2xl">
              Adjust your plan
            </DialogTitle>
            <p className="text-[11px] text-muted-foreground sm:text-sm">
              Save 20% when billed annually on checkout
            </p>
          </DialogHeader>

          <UpgradePlanPicker
            currentPlan={currentPlan}
            onSelectPlan={handlePlanSelect}
            isDark={isDark}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function SidebarUpgradeCard({ compact = false }: { compact?: boolean }) {
  const { data: session } = useSession();
  const { openUpgrade } = useSubscriptionUpgrade();
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
    enabled: !!session?.user,
  });

  const plan = normalizeSubscriptionPlan(subscriptionData?.subscription?.plan ?? "FREE");
  const planLabel = PLAN_CATALOG[plan]?.name ?? "Free";
  const showCard = role === "MERCHANT" || role === "MARKETER";

  if (!showCard || !session?.user) return null;

  const displayName =
    profile?.fullName?.trim() || session.user.email?.split("@")[0] || "Account";

  return (
    <div
      className={cn(
        "rounded-none border bg-muted/40",
        compact ? "p-2" : "mx-3 mb-4 p-3"
      )}
    >
      <p className={cn("truncate font-medium", compact ? "text-xs" : "text-sm")}>
        {displayName}
      </p>
      {!compact ? (
        <p className="truncate text-xs text-muted-foreground">{session.user.email}</p>
      ) : null}
      <p className={cn("font-medium text-foreground", compact ? "mt-1 text-[11px]" : "mt-2 text-xs")}>
        {planLabel}
      </p>
      {!isPaidPlan(plan) ? (
        <Button
          size={compact ? "sm" : "default"}
          className={cn(
            "w-full justify-start gap-2 rounded-none bg-slate-900 text-white hover:bg-slate-800",
            compact ? "mt-2 h-8 text-xs" : "mt-3"
          )}
          onClick={() => openUpgrade()}
        >
          <Sparkles className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
          Upgrade
        </Button>
      ) : null}
    </div>
  );
}
