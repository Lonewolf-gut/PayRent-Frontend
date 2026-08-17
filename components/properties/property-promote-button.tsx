"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Megaphone } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useSubscriptionUpgrade } from "@/components/subscription/subscription-upgrade-provider";
import { cn } from "@/lib/utils";

type PromotionStatus = "available" | "yours" | "claimed_by_other";

type PropertyPromoteButtonProps = {
  propertyId: string;
  promotionStatus?: PromotionStatus | null;
  compact?: boolean;
  className?: string;
};

export function PropertyPromoteButton({
  propertyId,
  promotionStatus = "available",
  compact = false,
  className,
}: PropertyPromoteButtonProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { openUpgrade } = useSubscriptionUpgrade();

  const { data: assignmentLimits } = useQuery({
    queryKey: ["listing-limits"],
    queryFn: async () => {
      const res = await fetch("/api/properties/listing-limits");
      const json = await res.json();
      return json.data as {
        unlimited?: boolean;
        usage?: { total: number };
        limits?: { total: number | null } | null;
      };
    },
  });

  const promotionLimit = assignmentLimits?.limits?.total ?? 1;
  const promotionUsed = assignmentLimits?.usage?.total ?? 0;
  const atPromotionLimit =
    !assignmentLimits?.unlimited && promotionUsed >= promotionLimit;

  const claimMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/marketer/properties/${propertyId}/claim`, {
        method: "POST",
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message ?? "Unable to claim listing");
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agent-browse-listings"] });
      queryClient.invalidateQueries({ queryKey: ["agent-listings"] });
      queryClient.invalidateQueries({ queryKey: ["listing-limits"] });
      queryClient.invalidateQueries({ queryKey: ["property", propertyId] });
      toast.success("Listing claimed. Create your promotion link next.");
      router.push(`/dashboard/marketer/promote?propertyId=${propertyId}`);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const buttonClass = cn(
    compact ? "w-full sm:w-auto" : "w-full",
    className
  );

  if (promotionStatus === "yours") {
    return (
      <Button
        asChild
        className={cn("rounded-none bg-emerald-600 hover:bg-emerald-700", buttonClass)}
      >
        <Link href={`/dashboard/marketer/promote?propertyId=${propertyId}`}>
          <Megaphone className="mr-2 size-4" />
          Promote listing
        </Link>
      </Button>
    );
  }

  if (promotionStatus === "claimed_by_other") {
    return (
      <Button variant="outline" disabled className={cn("rounded-none", buttonClass)}>
        Unavailable
      </Button>
    );
  }

  if (atPromotionLimit) {
    return (
      <Button
        variant="outline"
        className={cn("rounded-none", buttonClass)}
        onClick={() => openUpgrade()}
      >
        Upgrade to promote
      </Button>
    );
  }

  return (
    <Button
      className={cn("rounded-none bg-emerald-600 hover:bg-emerald-700", buttonClass)}
      disabled={claimMutation.isPending}
      onClick={() => claimMutation.mutate()}
    >
      <Megaphone className="mr-2 size-4" />
      {claimMutation.isPending ? "Claiming..." : "Promote listing"}
    </Button>
  );
}
