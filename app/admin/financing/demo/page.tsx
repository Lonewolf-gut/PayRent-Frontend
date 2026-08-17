"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { FINANCING_STATUS_LABELS } from "@/constants/platform";
import { toast } from "sonner";
import { Play, FastForward, ArrowLeft } from "lucide-react";

type WalkthroughState = {
  id: string;
  status: string;
  statusLabel: string;
  propertyName: string;
  buyerEmail: string;
  requestedAmount: number;
  durationMonths: number;
  mandateStatus: string | null;
  hasRepaymentPlan: boolean;
  installmentCount: number;
  nextAction: string;
};

export default function AdminFinancingDemoPage() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: listData, isLoading } = useQuery({
    queryKey: ["admin-financing", "ALL"],
    queryFn: async () => {
      const res = await fetch("/api/admin/financing");
      const json = await res.json();
      return json.data as { requests: { id: string; status: string; property?: { name: string } }[] };
    },
  });

  const activeId = selectedId ?? listData?.requests?.[0]?.id ?? null;

  const { data: walkthrough } = useQuery({
    queryKey: ["demo-financing-walkthrough", activeId],
    queryFn: async () => {
      const res = await fetch(`/api/admin/demo/financing/${activeId}/advance`);
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      return json.data as WalkthroughState;
    },
    enabled: Boolean(activeId),
  });

  const advanceMutation = useMutation({
    mutationFn: async (mode: "step" | "full") => {
      const res = await fetch(`/api/admin/demo/financing/${activeId}/advance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message ?? "Advance failed");
      return json.data;
    },
    onSuccess: (data) => {
      toast.success(
        data.repaymentPlanActive
          ? `Repayment schedule active (${data.installmentCount} installments)`
          : `Advanced to ${FINANCING_STATUS_LABELS[data.currentStatus] ?? data.currentStatus}`
      );
      queryClient.invalidateQueries({ queryKey: ["demo-financing-walkthrough"] });
      queryClient.invalidateQueries({ queryKey: ["admin-financing"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Button asChild variant="ghost" size="sm" className="mb-2 rounded-none px-0">
            <Link href="/admin/financing">
              <ArrowLeft className="mr-2 size-4" />
              Back to financing oversight
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Financing demo walkthrough</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Advance queued requests through admin eligibility review. The demo stops at mandate
            pending — before anything is sent to the bank. Use demo accounts from seed (buyer
            tenant@payforme.com, merchant landlord@payforme.com).
          </p>
        </div>
      </div>

      <Card className="rounded-none border-amber-200 bg-amber-50/50">
        <CardContent className="py-4 text-sm text-amber-950">
          Requires <code className="rounded bg-amber-100 px-1">PAYMENT_PROVIDER=demo</code> or{" "}
          <code className="rounded bg-amber-100 px-1">DEMO_MODE=true</code> on the backend.
        </CardContent>
      </Card>

      {isLoading ? (
        <p className="text-muted-foreground">Loading financing requests…</p>
      ) : !listData?.requests?.length ? (
        <Card className="rounded-none">
          <CardContent className="py-10 text-center text-muted-foreground">
            No financing requests yet. Log in as the demo buyer, apply for a property, submit a
            pay-for-me request, then return here.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          <Card className="rounded-none">
            <CardHeader>
              <CardTitle className="text-base">Select request</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {listData.requests.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setSelectedId(r.id)}
                  className={`flex w-full items-center justify-between border px-3 py-3 text-left text-sm transition-colors ${
                    activeId === r.id
                      ? "border-emerald-600 bg-emerald-50"
                      : "border-border hover:bg-muted/40"
                  }`}
                >
                  <span>{r.property?.name ?? "Property"}</span>
                  <StatusBadge
                    status={r.status}
                    label={FINANCING_STATUS_LABELS[r.status] ?? r.status}
                  />
                </button>
              ))}
            </CardContent>
          </Card>

          {walkthrough ? (
            <Card className="rounded-none">
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-base">{walkthrough.propertyName}</CardTitle>
                  <p className="text-sm text-muted-foreground">{walkthrough.buyerEmail}</p>
                </div>
                <StatusBadge
                  status={walkthrough.status}
                  label={walkthrough.statusLabel}
                />
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <p>
                  Amount:{" "}
                  <span className="font-semibold">
                    GHS {walkthrough.requestedAmount.toLocaleString()}
                  </span>{" "}
                  · {walkthrough.durationMonths} months
                </p>
                {walkthrough.mandateStatus ? (
                  <p>Mandate: {walkthrough.mandateStatus}</p>
                ) : null}
                {walkthrough.hasRepaymentPlan ? (
                  <p className="font-medium text-emerald-700">
                    Repayment schedule active — {walkthrough.installmentCount} installments
                  </p>
                ) : (
                  <p className="rounded-none border border-dashed p-3 text-muted-foreground">
                    Next: {walkthrough.nextAction}
                  </p>
                )}

                <div className="flex flex-wrap gap-2 border-t pt-4">
                  <Button
                    size="sm"
                    className="rounded-none bg-emerald-600 hover:bg-emerald-700"
                    disabled={
                      advanceMutation.isPending ||
                      walkthrough.status === "MANDATE_PENDING" ||
                      walkthrough.status === "CREATED" ||
                      walkthrough.status === "REPAYMENT_ACTIVE"
                    }
                    onClick={() => advanceMutation.mutate("step")}
                  >
                    <Play className="mr-2 size-4" />
                    Advance one step
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-none"
                    disabled={
                      advanceMutation.isPending ||
                      walkthrough.status === "MANDATE_PENDING" ||
                      walkthrough.status === "CREATED" ||
                      walkthrough.status === "REPAYMENT_ACTIVE"
                    }
                    onClick={() => advanceMutation.mutate("full")}
                  >
                    <FastForward className="mr-2 size-4" />
                    Run full demo
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>
      )}
    </div>
  );
}
