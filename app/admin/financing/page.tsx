"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { FINANCING_STATUS_LABELS } from "@/constants/platform";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LenderTagPanel } from "@/components/admin/lender-tag-panel";

export default function AdminFinancingPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("ELIGIBILITY_PENDING");
  const [rejectNote, setRejectNote] = useState<Record<string, string>>({});

  const { data, isLoading } = useQuery({
    queryKey: ["admin-financing", statusFilter],
    queryFn: async () => {
      const params = statusFilter !== "ALL" ? `?status=${statusFilter}` : "";
      const res = await fetch(`/api/admin/financing${params}`);
      const json = await res.json();
      return json.data as { requests: any[]; total: number; pendingCount: number };
    },
  });

  const reviewMutation = useMutation({
    mutationFn: async ({
      id,
      decision,
      decisionNote,
    }: {
      id: string;
      decision: "APPROVE" | "REJECT";
      decisionNote?: string;
    }) => {
      const res = await fetch(`/api/admin/financing/${id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, decisionNote }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message ?? "Review failed");
    },
    onSuccess: () => {
      toast.success("Financing request reviewed");
      queryClient.invalidateQueries({ queryKey: ["admin-financing"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Financing oversight</h1>
        <p className="text-sm text-muted-foreground">
          {data?.pendingCount ?? 0} pending review · {data?.total ?? 0} in current filter
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {[
          "ELIGIBILITY_PENDING",
          "MANDATE_PENDING",
          "READY_FOR_LENDER_REVIEW",
          "APPROVED",
          "DISBURSED",
          "REPAYMENT_ACTIVE",
          "REJECTED",
          "ALL",
        ].map((s) => (
          <Button
            key={s}
            size="sm"
            variant={statusFilter === s ? "default" : "outline"}
            className="rounded-none"
            onClick={() => setStatusFilter(s)}
          >
            {s === "ALL" ? "All" : FINANCING_STATUS_LABELS[s] ?? s.replace(/_/g, " ")}
          </Button>
        ))}
      </div>
      {isLoading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : !data?.requests?.length ? (
        <Card className="rounded-none">
          <CardContent className="py-10 text-center text-muted-foreground">
            No financing requests.
          </CardContent>
        </Card>
      ) : (
        data.requests.map((r: any) => (
          <Card key={r.id} className="rounded-none">
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle className="text-base">{r.property?.name ?? "Property"}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Customer {r.tenant?.user?.email ?? "—"} · GHS{" "}
                  {Number(r.requestedAmount).toLocaleString()} · {r.durationMonths} months
                </p>
                {r.riskCategory ? (
                  <p className="mt-1 text-sm">
                    Risk: <span className="font-medium">{r.riskCategory}</span>
                    {r.eligibilityScore != null ? ` · Score ${r.eligibilityScore}` : ""}
                  </p>
                ) : null}
              </div>
              <StatusBadge
                status={r.status}
                label={FINANCING_STATUS_LABELS[r.status] ?? r.status}
              />
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              {r.investment?.lender?.user?.email ? (
                <p>Funded by: {r.investment.lender.user.email}</p>
              ) : r.lenderTags?.length ? (
                <p>
                  Tagged lenders:{" "}
                  {r.lenderTags
                    .map((t: { lender: { user: { email: string } } }) => t.lender.user.email)
                    .join(", ")}
                </p>
              ) : (
                <p>Open to all lenders — no tags yet</p>
              )}
              <p>Submitted {new Date(r.createdAt).toLocaleString()}</p>
              <LenderTagPanel financingRequestId={r.id} status={r.status} />
              {r.status === "ELIGIBILITY_PENDING" ? (
                <div className="space-y-3 border-t pt-4">
                  <div>
                    <Label>Rejection reason (optional)</Label>
                    <Input
                      className="rounded-none"
                      value={rejectNote[r.id] ?? ""}
                      onChange={(e) =>
                        setRejectNote((prev) => ({ ...prev, [r.id]: e.target.value }))
                      }
                      placeholder="Required if rejecting"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="rounded-none bg-emerald-600 hover:bg-emerald-700"
                      disabled={reviewMutation.isPending}
                      onClick={() =>
                        reviewMutation.mutate({ id: r.id, decision: "APPROVE" })
                      }
                    >
                      Approve for mandate setup
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-none"
                      disabled={reviewMutation.isPending}
                      onClick={() =>
                        reviewMutation.mutate({
                          id: r.id,
                          decision: "REJECT",
                          decisionNote: rejectNote[r.id],
                        })
                      }
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
