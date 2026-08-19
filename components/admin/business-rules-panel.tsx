"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import type { BusinessRules } from "@/lib/business-rules/types";

export function BusinessRulesPanel() {
  const queryClient = useQueryClient();
  const { data: rules, isLoading } = useQuery({
    queryKey: ["admin-business-rules"],
    queryFn: async () => {
      const res = await fetch("/api/admin/business-rules");
      const json = await res.json();
      return json.data as BusinessRules;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (patch: Partial<BusinessRules>) => {
      const res = await fetch("/api/admin/business-rules", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message ?? "Save failed");
      return json.data as BusinessRules;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-business-rules"] });
      toast.success("Business rules updated");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (isLoading || !rules) {
    return <p className="text-sm text-muted-foreground">Loading business rules…</p>;
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    saveMutation.mutate({
      agentCommissionPercent: Number(form.get("agentCommissionPercent")),
      platformFinancingFeePercent: Number(form.get("platformFinancingFeePercent")),
      serviceFeePercent: Number(form.get("serviceFeePercent")),
      commissionFeePercent: Number(form.get("commissionFeePercent")),
      processingFeePercent: Number(form.get("processingFeePercent")),
      minRepaymentMonths: Number(form.get("minRepaymentMonths")),
      maxRepaymentMonths: Number(form.get("maxRepaymentMonths")),
      maxInterestRatePercent: Number(form.get("maxInterestRatePercent")),
      maxDebtToIncomePercent: Number(form.get("maxDebtToIncomePercent")),
      lenderFreeFinancingLimit: Number(form.get("lenderFreeFinancingLimit")),
      merchantListingRequiresPaidPlan: form.get("merchantListingRequiresPaidPlan") === "on",
      autoApproveLowRiskFinancing: form.get("autoApproveLowRiskFinancing") === "on",
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        {[
          ["agentCommissionPercent", "Affiliate commission (%)"],
          ["platformFinancingFeePercent", "Platform financing fee (%)"],
          ["serviceFeePercent", "Service fee (%)"],
          ["commissionFeePercent", "Commission fee (%)"],
          ["processingFeePercent", "Processing fee (%)"],
          ["maxInterestRatePercent", "Max lender interest rate (%)"],
          ["minRepaymentMonths", "Min repayment months"],
          ["maxRepaymentMonths", "Max repayment months"],
          ["maxDebtToIncomePercent", "Max debt-to-income (%)"],
          ["lenderFreeFinancingLimit", "Lender free financing limit"],
        ].map(([name, label]) => (
          <div key={name} className="space-y-2">
            <Label htmlFor={name}>{label}</Label>
            <Input
              id={name}
              name={name}
              type="number"
              step="0.1"
              defaultValue={rules[name as keyof BusinessRules] as number}
              className="rounded-none"
            />
          </div>
        ))}
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="autoApproveLowRiskFinancing"
          defaultChecked={rules.autoApproveLowRiskFinancing}
        />
        Auto-approve low-risk financing requests (skip admin eligibility review)
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="merchantListingRequiresPaidPlan"
          defaultChecked={rules.merchantListingRequiresPaidPlan}
        />
        Merchants require a paid subscription before listing products
      </label>
      <Button type="submit" className="rounded-none bg-emerald-600 hover:bg-emerald-700" disabled={saveMutation.isPending}>
        {saveMutation.isPending ? "Saving…" : "Save business rules"}
      </Button>
    </form>
  );
}
