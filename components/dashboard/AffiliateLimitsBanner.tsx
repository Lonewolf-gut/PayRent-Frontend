"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type AssignmentLimits = {
  plan: string;
  unlimited: boolean;
  usage: {
    total: number;
  };
  limits: {
    total: number | null;
  } | null;
};

export function AffiliateLimitsBanner() {
  const { data: session } = useSession();
  const [dismissed, setDismissed] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["listing-limits"],
    queryFn: async () => {
      const res = await fetch("/api/properties/listing-limits");
      const json = await res.json();
      return json.data as AssignmentLimits;
    },
  });

  const limit = data?.limits?.total ?? 1;
  const used = data?.usage.total ?? 0;
  const atLimit = Math.max(0, limit - used) === 0;
  const dismissKey =
    session?.user?.id && data
      ? `affiliate-limits-banner-dismissed:${session.user.id}:${data.plan}:${used}:${limit}`
      : null;

  useEffect(() => {
    if (!dismissKey) {
      setDismissed(false);
      return;
    }
    setDismissed(sessionStorage.getItem(dismissKey) === "true");
  }, [dismissKey]);

  useEffect(() => {
    if (sessionStorage.getItem("fresh-dashboard-login") === "1") {
      setDismissed(false);
    }
  }, [dismissKey]);

  const dismissBanner = () => {
    if (!dismissKey) return;
    sessionStorage.setItem(dismissKey, "true");
    setDismissed(true);
  };

  if (isLoading || !data || dismissed) return null;

  const isFreePlan = data.plan === "FREE" || (!data.unlimited && data.plan !== "PRO" && data.plan !== "MAX");
  if (!isFreePlan) return null;

  const remaining = Math.max(0, limit - used);

  return (
    <div
      className={
        atLimit
          ? "mb-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-4 text-sm text-amber-950 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100"
          : "mb-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm dark:border-border dark:bg-card"
      }
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium text-foreground">
                {atLimit ? "Promotion limit reached" : "Affiliate promotion allowance"}
              </p>
              <p className="text-muted-foreground">
                {limit === 1 ? (
                  <>
                    Free Affiliates can promote <strong>1 listing</strong> and earn commission on it.
                    {atLimit
                      ? " Upgrade to claim or accept assignments on additional listings."
                      : ` You have ${remaining} free promotion slot remaining.`}
                  </>
                ) : (
                  <>
                    {used} of {limit} promoted listings used
                    {atLimit
                      ? ". Upgrade to Max for unlimited promotion capacity."
                      : `. ${remaining} slot${remaining === 1 ? "" : "s"} remaining.`}
                  </>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{data.plan === "PRO" ? "Pro plan" : "Free plan"}</Badge>
              {atLimit ? (
                <Button asChild size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                  <Link href="/pricing">Upgrade plan</Link>
                </Button>
              ) : null}
            </div>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="shrink-0 text-muted-foreground hover:text-foreground"
          onClick={dismissBanner}
          aria-label="Dismiss affiliate promotion banner"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
