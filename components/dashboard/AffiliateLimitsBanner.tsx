"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
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
  const { data, isLoading } = useQuery({
    queryKey: ["listing-limits"],
    queryFn: async () => {
      const res = await fetch("/api/properties/listing-limits");
      const json = await res.json();
      return json.data as AssignmentLimits;
    },
  });

  if (isLoading || !data || data.unlimited) return null;

  const limit = data.limits?.total ?? 1;
  const used = data.usage.total;
  const remaining = Math.max(0, limit - used);
  const atLimit = remaining === 0;

  return (
    <div
      className={
        atLimit
          ? "mb-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-4 text-sm text-amber-950 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100"
          : "mb-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm dark:border-border dark:bg-card"
      }
    >
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
  );
}
