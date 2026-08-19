"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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

function PropertyVerifiedBadge({ verified }: { verified?: boolean }) {
  if (!verified) {
    return (
      <Badge variant="secondary">Listing pending verification</Badge>
    );
  }
  return (
    <Badge className="bg-emerald-700 hover:bg-emerald-700">
      Property verified · safe to invest
    </Badge>
  );
}

export default function LenderOpportunitiesPage() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [interestRate, setInterestRate] = useState("8");
  const [planType, setPlanType] = useState<"MONTHLY" | "DEFERRED" | "CUSTOM">("MONTHLY");

  const { data: financingRules } = useQuery({
    queryKey: ["financing-rules"],
    queryFn: async () => {
      const res = await fetch("/api/financing/rules");
      const json = await res.json();
      return json.data as { maxInterestRatePercent: number };
    },
  });

  const maxInterestRate = financingRules?.maxInterestRatePercent ?? 30;

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
      const rate = parseFloat(interestRate);
      if (rate > maxInterestRate) {
        throw new Error(
          `Interest rate cannot exceed the platform maximum of ${maxInterestRate}%. Contact admin if you need a higher cap.`
        );
      }
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
      <div>
        <h1 className="text-2xl font-bold">Listings awaiting financing</h1>
        <p className="text-muted-foreground">
          Review verified listings and send a financing offer with your interest rate. The buyer
          sees your rate before accepting and sending their repayment mandate to the bank.
        </p>
      </div>
      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : !requests?.length ? (
        <div className="rounded-none border border-dashed p-8 text-center text-muted-foreground">
          <p>No listings awaiting financing right now.</p>
          <p className="mt-2 text-sm">
            Requests appear here after the merchant and admin have approved them. Check back after
            admin completes document review.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {requests.map((req: {
            id: string;
            status: string;
            requestedAmount: number;
            durationMonths: number;
            property?: { name: string; location: string; monthlyRent: number; status?: string };
            tenant?: { fullName: string; monthlyIncome: number; user?: { email: string } };
          }) => (
            <Card key={req.id}>
              <CardHeader className="flex flex-row items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{req.property?.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{req.property?.location}</p>
                </div>
                <PropertyVerifiedBadge verified={req.property?.status === "ACTIVE"} />
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2 text-sm sm:grid-cols-2">
                  <p>Buyer: {req.tenant?.fullName ?? req.tenant?.user?.email}</p>
                  <p>Income: GHS {Number(req.tenant?.monthlyIncome ?? 0).toLocaleString()}</p>
                  <p>Requested: GHS {Number(req.requestedAmount).toLocaleString()}</p>
                  <p>Duration: {req.durationMonths} months</p>
                  <p>Rent: GHS {Number(req.property?.monthlyRent ?? 0).toLocaleString()}/mo</p>
                </div>
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
                      <p className="mt-1 text-xs text-muted-foreground">
                        Platform maximum: {maxInterestRate}%. The buyer sees this rate before accepting.
                      </p>
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
                        Send financing offer
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
                    >
                      Review & send offer
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
