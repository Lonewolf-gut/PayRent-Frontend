"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const VARIANTS: Record<string, string> = {
  APPROVED: "bg-emerald-100 text-emerald-800",
  ACTIVE: "bg-emerald-100 text-emerald-800",
  COMPLETED: "bg-emerald-100 text-emerald-800",
  PAID: "bg-emerald-100 text-emerald-800",
  SUCCESSFUL: "bg-emerald-100 text-emerald-800",
  REJECTED: "bg-red-100 text-red-800",
  FAILED: "bg-red-100 text-red-800",
  OVERDUE: "bg-orange-100 text-orange-800",
  PENDING: "bg-amber-100 text-amber-800",
  PENDING_VERIFICATION: "bg-amber-100 text-amber-800",
  SUBMITTED: "bg-blue-100 text-blue-800",
  UNDER_REVIEW: "bg-blue-100 text-blue-800",
  MANDATE_PENDING: "bg-purple-100 text-purple-800",
  READY_FOR_LENDER_REVIEW: "bg-indigo-100 text-indigo-800",
};

export function StatusBadge({
  status,
  label,
}: {
  status: string;
  label?: string;
}) {
  return (
    <Badge
      variant="secondary"
      className={cn("font-medium", VARIANTS[status] ?? "bg-muted text-muted-foreground")}
    >
      {label ?? status.replace(/_/g, " ")}
    </Badge>
  );
}
