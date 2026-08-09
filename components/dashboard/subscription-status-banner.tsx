"use client";

import { Crown, Sparkles, X } from "lucide-react";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { roleRequiresSubscription } from "@/lib/subscription/roles";
import { isPaidPlan, normalizeSubscriptionPlan } from "@/lib/subscription/plans";
import { useSubscriptionUpgrade } from "@/components/subscription/subscription-upgrade-provider";

export function useSubscriptionPlan() {
  const { data, isLoading } = useQuery({
    queryKey: ["subscription"],
    queryFn: async () => {
      const res = await fetch("/api/subscriptions");
      const json = await res.json();
      return json.data;
    },
  });

  const plan = normalizeSubscriptionPlan(
    data?.subscription?.plan ?? data?.access?.plan ?? "FREE"
  );

  return {
    isLoading,
    plan,
    isPremium: isPaidPlan(plan),
  };
}

export function SubscriptionStatusBanner() {
  const { data: session } = useSession();
  const { openUpgrade } = useSubscriptionUpgrade();
  const [dismissed, setDismissed] = useState(false);

  const role = session?.user?.role;
  const showSubscriptionUi = role ? roleRequiresSubscription(role) : false;

  const { data } = useQuery({
    queryKey: ["subscription"],
    queryFn: async () => {
      const res = await fetch("/api/subscriptions");
      const json = await res.json();
      return json.data;
    },
    enabled: showSubscriptionUi,
  });

  const plan = normalizeSubscriptionPlan(
    data?.subscription?.plan ?? data?.access?.plan ?? "FREE"
  );
  const hasPaidPlan = isPaidPlan(plan);

  if (!showSubscriptionUi || dismissed || hasPaidPlan) return null;

  return (
    <div className="border-b bg-gradient-to-r from-emerald-50 via-white to-teal-50 px-6 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100">
            <Sparkles className="h-4 w-4 text-emerald-700" />
          </div>
          <div>
            <p className="text-sm font-semibold text-emerald-950">You&apos;re on the free plan</p>
            <p className="text-sm text-emerald-800/75">
              Upgrade to Pro or Max for more listings, priority review, and full marketplace access.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700"
            onClick={() => openUpgrade()}
          >
            <Crown className="mr-1.5 h-4 w-4" />
            Upgrade now
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-muted-foreground"
            onClick={() => setDismissed(true)}
            aria-label="Dismiss subscription alert"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
