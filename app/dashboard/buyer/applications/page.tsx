"use client";

import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { APPLICATION_STATUS_LABELS } from "@/constants/platform";
import { useMarkNavSectionSeen } from "@/hooks/use-mark-nav-section-seen";

type ApplicationItem = {
  id: string;
  propertyId: string;
  status: string;
  requestedMoveInDate?: string;
  financingRequests?: { id: string }[];
  property?: {
    name: string;
    location: string;
    monthlyRent?: number | string;
    annualRent?: number | string | null;
  };
  paymentMethod?: "CASH" | "FINANCING" | null;
  paymentLabel?: string | null;
};

export default function TenantApplicationsPage() {
  const queryClient = useQueryClient();

  const { data: applications, isLoading } = useQuery({
    queryKey: ["applications"],
    queryFn: async () => {
      const res = await fetch("/api/applications");
      const json = await res.json();
      return (json.data ?? []) as ApplicationItem[];
    },
  });

  useMarkNavSectionSeen(
    "/dashboard/buyer/applications",
    "/api/applications",
    ["SUBMITTED", "UNDER_REVIEW", "CLARIFICATION_REQUIRED", "APPROVED"]
  );

  useEffect(() => {
    if (!applications?.length) return;
    void queryClient.invalidateQueries({ queryKey: ["sidebar-badge", "/dashboard/buyer/applications"] });
  }, [applications, queryClient]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Property applications</h1>
          <p className="text-muted-foreground">
            Track your applications, payments, and financing requests.
          </p>
        </div>
        <Button asChild className="bg-emerald-600 hover:bg-emerald-700">
          <Link href="/properties">Browse listings</Link>
        </Button>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading applications...</p>
      ) : !applications?.length ? (
        <div className="rounded-none border border-border bg-card px-6 py-12 text-center text-muted-foreground">
          No applications yet. Browse properties and apply to get started.
        </div>
      ) : (
        <ul className="divide-y divide-border rounded-none border border-border bg-card">
          {applications.map((app) => (
            <li
              key={app.id}
              className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="space-y-1">
                <p className="font-medium text-foreground">{app.property?.name}</p>
                <p className="text-sm text-muted-foreground">{app.property?.location}</p>
                <p className="text-sm text-muted-foreground">
                  {app.requestedMoveInDate
                    ? `Move-in: ${new Date(app.requestedMoveInDate).toLocaleDateString()}`
                    : "Move-in date not specified"}
                </p>
                {app.paymentLabel ? (
                  <p className="text-sm text-foreground">{app.paymentLabel}</p>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge
                  status={app.status}
                  label={APPLICATION_STATUS_LABELS[app.status]}
                />
                {app.status === "APPROVED" &&
                app.paymentMethod !== "CASH" &&
                !app.financingRequests?.length ? (
                  <Button asChild size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                    <Link
                      href={`/dashboard/buyer/financing?propertyId=${app.propertyId}&applicationId=${app.id}`}
                    >
                      Request financing
                    </Link>
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
