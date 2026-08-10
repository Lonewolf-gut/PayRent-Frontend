"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

type FinancingRequestFormProps = {
  propertyId: string;
  applicationId: string;
  propertyName: string;
  defaultAmount: number;
  onSuccess?: () => void;
};

export function FinancingRequestForm({
  propertyId,
  applicationId,
  propertyName,
  defaultAmount,
  onSuccess,
}: FinancingRequestFormProps) {
  const queryClient = useQueryClient();
  const [requestedAmount, setRequestedAmount] = useState(
    defaultAmount > 0 ? String(defaultAmount) : ""
  );
  const [durationMonths, setDurationMonths] = useState("12");
  const [monthlyIncome, setMonthlyIncome] = useState("");
  const [notes, setNotes] = useState("");
  const [consent, setConsent] = useState(false);

  const submitMutation = useMutation({
    mutationFn: async () => {
      const amount = Number(requestedAmount);
      const duration = Number(durationMonths);
      if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error("Enter a valid financing amount.");
      }
      if (!Number.isFinite(duration) || duration < 6 || duration > 60) {
        throw new Error("Repayment period must be between 6 and 60 months.");
      }
      if (!consent) {
        throw new Error("You must consent to data processing to continue.");
      }

      const res = await fetch("/api/financing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId,
          applicationId,
          requestedAmount: amount,
          durationMonths: duration,
          notes: notes.trim() || undefined,
          monthlyIncome: monthlyIncome ? Number(monthlyIncome) : undefined,
          dataProcessingConsent: true,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        throw new Error(
          json.message ??
            json.errors?.[0]?.message ??
            json.data?.error ??
            "Unable to submit financing request."
        );
      }
      return json.data;
    },
    onSuccess: () => {
      toast.success("Pay-for-Me request submitted");
      queryClient.invalidateQueries({ queryKey: ["financing"] });
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      onSuccess?.();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <form
      className="space-y-4 rounded-lg border border-border p-4"
      onSubmit={(event) => {
        event.preventDefault();
        submitMutation.mutate();
      }}
    >
      <div>
        <p className="text-sm font-medium text-foreground">{propertyName}</p>
        <p className="text-xs text-muted-foreground">
          Submit a pay-for-me request for your approved application.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`amount-${applicationId}`}>Financing amount (GHS)</Label>
        <Input
          id={`amount-${applicationId}`}
          type="number"
          min={1}
          step="0.01"
          value={requestedAmount}
          onChange={(event) => setRequestedAmount(event.target.value)}
          placeholder="e.g. 24000"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`duration-${applicationId}`}>Repayment period (months)</Label>
        <Input
          id={`duration-${applicationId}`}
          type="number"
          min={6}
          max={60}
          value={durationMonths}
          onChange={(event) => setDurationMonths(event.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`income-${applicationId}`}>Monthly income (optional)</Label>
        <Input
          id={`income-${applicationId}`}
          type="number"
          min={1}
          value={monthlyIncome}
          onChange={(event) => setMonthlyIncome(event.target.value)}
          placeholder="Helps assess affordability"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`notes-${applicationId}`}>Notes (optional)</Label>
        <Textarea
          id={`notes-${applicationId}`}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Any extra details for lenders"
          rows={3}
        />
      </div>

      <label className="flex items-start gap-2 text-sm text-muted-foreground">
        <input
          type="checkbox"
          className="mt-1"
          checked={consent}
          onChange={(event) => setConsent(event.target.checked)}
        />
        <span>
          I consent to PayForMe collecting and processing my data to assess and manage this
          financing request.
        </span>
      </label>

      <Button
        type="submit"
        className="w-full bg-emerald-600 hover:bg-emerald-700"
        disabled={submitMutation.isPending}
      >
        {submitMutation.isPending ? "Submitting..." : "Submit pay-for-me request"}
      </Button>
    </form>
  );
}
