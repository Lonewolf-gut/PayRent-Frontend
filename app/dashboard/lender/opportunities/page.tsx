"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import { toast } from "sonner";

export default function LenderOpportunitiesPage() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [interestRate, setInterestRate] = useState("8");
  const [planType, setPlanType] = useState<"MONTHLY" | "DEFERRED" | "CUSTOM">("MONTHLY");

  const { data: financingAccess } = useQuery({
    queryKey: ["lender-financing-access"],
    queryFn: async () => {
      const res = await fetch("/api/lender/financing-access");
      const json = await res.json();
      return json.data as {
        financedCount: number;
        limit: number | null;
        remaining: number | null;
        isPaid: boolean;
      };
    },
  });

  const { data: requests, isLoading } = useQuery({
    queryKey: ["financing-pending"],
    queryFn: async () => {
      const res = await fetch("/api/financing");
      const json = await res.json();
      return json.data ?? [];
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (financingRequestId: string) => {
      const req = requests.find((r: { id: string }) => r.id === financingRequestId);
      const res = await fetch("/api/financing/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          financingRequestId,
          amount: Number(req?.requestedAmount),
          interestRate: parseFloat(interestRate),
          planType,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message);
    },
    onSuccess: () => {
      toast.success("Financing offer sent — awaiting customer acceptance");
      queryClient.invalidateQueries({ queryKey: ["financing-pending"] });
      setSelectedId(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rejectMutation = useMutation({
    mutationFn: async (financingRequestId: string) => {
      const res = await fetch("/api/financing/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ financingRequestId }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message);
    },
    onSuccess: () => {
      toast.success("Request rejected");
      queryClient.invalidateQueries({ queryKey: ["financing-pending"] });
    },
  });

  return (
    <div className="space-y-6">
      {financingAccess && !financingAccess.isPaid ? (
        <div className="rounded-none border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100">
          Free plan: {financingAccess.financedCount} of {financingAccess.limit ?? 100} properties financed.
          {financingAccess.remaining === 0 ? (
            <>
              {" "}
              Subscribe for unlimited financing access.{" "}
              <Link
                href="/dashboard/lender/subscription"
                className="font-medium text-amber-900 underline underline-offset-2 dark:text-amber-300"
              >
                View plans
              </Link>
            </>
          ) : (
            <> {financingAccess.remaining} financing slots remaining.</>
          )}
        </div>
      ) : null}
      <h1 className="text-2xl font-bold">Funding Requests</h1>
      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : !requests?.length ? (
        <p className="text-muted-foreground">No pending requests.</p>
      ) : (
        <div className="grid gap-4">
          {requests.map((req: {
            id: string;
            status: string;
            requestedAmount: number;
            durationMonths: number;
            property?: { name: string; location: string; monthlyRent: number };
            tenant?: { fullName: string; monthlyIncome: number; user?: { email: string } };
            mandate?: { status: string; mandateSource: string };
          }) => (
            <Card key={req.id}>
              <CardHeader className="flex flex-row items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{req.property?.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{req.property?.location}</p>
                </div>
                <Badge>{req.status}</Badge>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2 text-sm sm:grid-cols-2">
                  <p>Buyer: {req.tenant?.fullName ?? req.tenant?.user?.email}</p>
                  <p>Income: GHS {Number(req.tenant?.monthlyIncome ?? 0).toLocaleString()}</p>
                  <p>Requested: GHS {Number(req.requestedAmount).toLocaleString()}</p>
                  <p>Duration: {req.durationMonths} months</p>
                  <p>Rent: GHS {Number(req.property?.monthlyRent ?? 0).toLocaleString()}/mo</p>
                  <p>
                    Mandate:{" "}
                    {req.mandate ? (
                      <Badge variant={req.mandate.status === "ACTIVE" ? "default" : "secondary"}>
                        {req.mandate.status.replace("_", " ")}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">Not set up</span>
                    )}
                  </p>
                </div>
                {req.mandate && req.mandate.status !== "ACTIVE" && (
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    Repayment mandate must be active before you can approve funding.
                  </p>
                )}
                {selectedId === req.id ? (
                  <div className="flex flex-wrap gap-4 rounded-lg border p-4">
                    <div>
                      <Label>Interest rate (%)</Label>
                      <Input
                        type="number"
                        value={interestRate}
                        onChange={(e) => setInterestRate(e.target.value)}
                        className="w-24"
                      />
                    </div>
                    <div>
                      <Label>Repayment plan</Label>
                      <Select value={planType} onValueChange={(v) => setPlanType(v as typeof planType)}>
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MONTHLY">Monthly</SelectItem>
                          <SelectItem value="DEFERRED">Deferred</SelectItem>
                          <SelectItem value="CUSTOM">Custom</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex gap-2 items-end">
                      <Button
                        className="bg-emerald-600 hover:bg-emerald-700"
                        onClick={() => approveMutation.mutate(req.id)}
                        disabled={approveMutation.isPending}
                      >
                        Confirm approve
                      </Button>
                      <Button variant="ghost" onClick={() => setSelectedId(null)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      className="bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => setSelectedId(req.id)}
                      disabled={!req.mandate || req.mandate.status !== "ACTIVE"}
                    >
                      Review & Approve
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => rejectMutation.mutate(req.id)}
                      disabled={rejectMutation.isPending}
                    >
                      Reject
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
