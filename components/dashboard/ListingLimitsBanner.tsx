"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";

type ListingVisibility = {
  plan: string;
  marketplaceVisible: boolean;
  hiddenApprovedCount: number;
  trialActive?: boolean;
  hasFullAccess?: boolean;
};

export function ListingLimitsBanner() {
  const { data, isLoading } = useQuery({
    queryKey: ["listing-limits"],
    queryFn: async () => {
      const res = await fetch("/api/properties/listing-limits");
      const json = await res.json();
      return json.data as ListingVisibility;
    },
  });

  if (isLoading || !data || data.marketplaceVisible) return null;

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
      <p className="font-medium">Free plan marketplace visibility</p>
      <p className="mt-1 text-amber-900/90 dark:text-amber-100/90">
        You can submit and get listings approved on the free plan, but they will not appear on the
        public properties page until you subscribe to Pro or Max.
        {data.hiddenApprovedCount > 0
          ? ` ${data.hiddenApprovedCount} approved listing${data.hiddenApprovedCount === 1 ? "" : "s"} ${data.hiddenApprovedCount === 1 ? "is" : "are"} currently hidden from buyers.`
          : null}
      </p>
      <div className="mt-3">
        <Button asChild size="sm" className="bg-emerald-600 hover:bg-emerald-700">
          <Link href="/pricing">Upgrade to Pro or Max</Link>
        </Button>
      </div>
    </div>
  );
}
