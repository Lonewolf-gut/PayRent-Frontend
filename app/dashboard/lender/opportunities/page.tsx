"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { toast } from "sonner";

type FinancingRequest = {
  id: string;
  status: string;
  requestedAmount: number;
  durationMonths: number;
  property?: { name: string; location: string; monthlyRent: number; status?: string };
  tenant?: { fullName: string; monthlyIncome: number; user?: { email: string } };
};

type OfferFormState = {
  interestRate: string;
  planType: "MONTHLY" | "DEFERRED" | "CUSTOM";
};

function PropertyVerifiedBadge({ verified }: { verified?: boolean }) {
  if (!verified) {
    return <Badge variant="secondary">Listing pending verification</Badge>;
  }
  return (
    <Badge className="bg-emerald-700 hover:bg-emerald-700">
      Property verified · safe to invest
    </Badge>
  );
}

export default function LenderOpportunitiesPage() {
  const queryClient = useQueryClient();
  const [offerForms, setOfferForms] = useState<Record<string, OfferFormState>>({});

  const { data: financingRules } = useQuery({
    queryKey: ["financing-rules"],
    queryFn: async () => {
      const res = await fetch("/api/financing/rules");
      const json = await res.json();
      return json.data as { maxInterestRatePercent: number };
    },
  });

  const maxInterestRate = financingRules?.maxInterestRatePercent ?? 30;

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["financing-pending"],
    queryFn: async () => {
      const res = await fetch("/api/financing");
      const json = await res.json();
      return (json.data ?? []) as FinancingRequest[];
    },
  });

  const getOfferForm = (requestId: string): OfferFormState =>
    offerForms[requestId] ?? { interestRate: "8", planType: "MONTHLY" };

  const updateOfferForm = (requestId: string, patch: Partial<OfferFormState>) => {
    setOfferForms((current) => ({
      ...current,
      [requestId]: { ...getOfferForm(requestId), ...patch },
    }));
  };

  const defaultExpanded = useMemo(() => requests[0]?.id, [requests]);

  const approveMutation = useMutation({
    mutationFn: async ({
      financingRequestId,
      interestRate,
      planType,
    }: {
      financingRequestId: string;
      interestRate: string;
      planType: OfferFormState["planType"];
    }) => {
      const rate = parseFloat(interestRate);
      if (rate > maxInterestRate) {
        throw new Error(
          `Interest rate cannot exceed the platform maximum of ${maxInterestRate}%. Contact admin if you need a higher cap.`
        );
      }
      const req = requests.find((request) => request.id === financingRequestId);
      const res = await fetch("/api/financing/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          financingRequestId,
          amount: Number(req?.requestedAmount),
          interestRate: rate,
          planType,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message ?? json.error?.message);
    },
    onSuccess: () => {
      toast.success("Financing offer sent — awaiting customer acceptance");
      queryClient.invalidateQueries({ queryKey: ["financing-pending"] });
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
      if (!json.success) throw new Error(json.message ?? json.error?.message);
    },
    onSuccess: () => {
      toast.success("Request rejected");
      queryClient.invalidateQueries({ queryKey: ["financing-pending"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Listings awaiting financing</h1>
        <p className="text-muted-foreground">
          Review verified listings and send a financing offer with your interest rate.
        </p>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : !requests.length ? (
        <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
          <p>No listings awaiting financing right now.</p>
          <p className="mt-2 text-sm">
            Requests appear here after the merchant and admin have approved them.
          </p>
        </div>
      ) : (
        <Accordion
          type="single"
          collapsible
          defaultValue={defaultExpanded}
          className="divide-y divide-border rounded-xl border border-border bg-card"
        >
          {requests.map((req) => {
            const offer = getOfferForm(req.id);
            const propertyName = req.property?.name?.replace(/^\[Demo\]\s*/i, "") ?? "Listing";

            return (
              <AccordionItem key={req.id} value={req.id} className="border-0 px-4">
                <AccordionTrigger className="py-4 hover:no-underline">
                  <div className="flex flex-1 flex-col gap-3 pr-2 text-left lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold text-foreground">
                        {propertyName}
                      </p>
                      <p className="truncate text-sm text-muted-foreground">
                        {req.property?.location}
                      </p>
                      <p className="mt-1 text-sm font-medium text-emerald-700 dark:text-emerald-300">
                        GHS {Number(req.requestedAmount).toLocaleString()} · {req.durationMonths}{" "}
                        months
                      </p>
                    </div>
                    <PropertyVerifiedBadge verified={req.property?.status === "ACTIVE"} />
                  </div>
                </AccordionTrigger>

                <AccordionContent className="pb-4">
                  <div className="space-y-4">
                    <dl className="grid gap-3 rounded-xl border border-border bg-muted/10 p-4 text-sm sm:grid-cols-2">
                      <Detail
                        label="Buyer"
                        value={req.tenant?.fullName ?? req.tenant?.user?.email ?? "—"}
                      />
                      <Detail
                        label="Income"
                        value={`GHS ${Number(req.tenant?.monthlyIncome ?? 0).toLocaleString()}`}
                      />
                      <Detail
                        label="Requested"
                        value={`GHS ${Number(req.requestedAmount).toLocaleString()}`}
                      />
                      <Detail label="Duration" value={`${req.durationMonths} months`} />
                      <Detail
                        label="Rent"
                        value={`GHS ${Number(req.property?.monthlyRent ?? 0).toLocaleString()}/mo`}
                      />
                    </dl>

                    <div className="rounded-xl border border-border p-4">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-1.5">
                            <Label htmlFor={`rate-${req.id}`}>Interest rate (%)</Label>
                            <Input
                              id={`rate-${req.id}`}
                              type="number"
                              min={0}
                              max={maxInterestRate}
                              value={offer.interestRate}
                              onChange={(e) =>
                                updateOfferForm(req.id, { interestRate: e.target.value })
                              }
                              className="w-full sm:w-28"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor={`plan-${req.id}`}>Repayment plan</Label>
                            <Select
                              value={offer.planType}
                              onValueChange={(value) =>
                                updateOfferForm(req.id, {
                                  planType: value as OfferFormState["planType"],
                                })
                              }
                            >
                              <SelectTrigger id={`plan-${req.id}`} className="w-full sm:w-40">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="MONTHLY">Monthly</SelectItem>
                                <SelectItem value="DEFERRED">Deferred</SelectItem>
                                <SelectItem value="CUSTOM">Custom</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <Button
                            className="bg-emerald-600 hover:bg-emerald-700"
                            disabled={approveMutation.isPending}
                            onClick={() =>
                              approveMutation.mutate({
                                financingRequestId: req.id,
                                interestRate: offer.interestRate,
                                planType: offer.planType,
                              })
                            }
                          >
                            Send financing offer
                          </Button>
                          <Button
                            variant="outline"
                            disabled={rejectMutation.isPending}
                            onClick={() => rejectMutation.mutate(req.id)}
                          >
                            Reject
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium text-foreground">{value}</dd>
    </div>
  );
}
