"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/dashboard/status-badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  FinancingFlowStepper,
  buildFinancingFlowSteps,
} from "@/components/properties/financing-flow-stepper";

type FinancingRequestFormProps = {
  propertyId: string;
  propertyName: string;
  isSale: boolean;
  defaultAmount: number;
  kycVerified: boolean;
  financingDocsApproved: boolean;
  approvedApplication?: { id: string } | null;
};

export function FinancingRequestForm({
  propertyId,
  propertyName,
  isSale,
  defaultAmount,
  kycVerified,
  financingDocsApproved,
  approvedApplication,
}: FinancingRequestFormProps) {
  const router = useRouter();
  const [amount, setAmount] = useState(defaultAmount > 0 ? String(defaultAmount) : "");
  const [months, setMonths] = useState("12");
  const [monthlyIncome, setMonthlyIncome] = useState("");
  const [financingConsent, setFinancingConsent] = useState(false);
  const [preferredChannel, setPreferredChannel] = useState<
    "BANK_MANDATE" | "WALLET" | "MOBILE_MONEY"
  >("BANK_MANDATE");
  const [preferredPaymentDay, setPreferredPaymentDay] = useState("1");
  const [contactPhone, setContactPhone] = useState("");

  const canSubmit =
    kycVerified && Boolean(approvedApplication) && financingDocsApproved;

  const flowSteps = buildFinancingFlowSteps({
    kycVerified,
    hasApprovedApplication: Boolean(approvedApplication),
    financingDocsApproved,
    isSale,
  });

  const financeMutation = useMutation({
    mutationFn: async () => {
      if (!financingConsent) {
        throw new Error("You must consent to data collection and processing for financing.");
      }
      if (!approvedApplication?.id) {
        throw new Error("An approved application is required before requesting financing.");
      }

      const res = await fetch("/api/financing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId,
          applicationId: approvedApplication.id,
          requestedAmount: parseFloat(amount),
          durationMonths: parseInt(months, 10),
          monthlyIncome: monthlyIncome ? parseFloat(monthlyIncome) : undefined,
          repaymentPreference: {
            preferredChannel,
            preferredPaymentDay: parseInt(preferredPaymentDay, 10),
            contactPhone: contactPhone || undefined,
          },
          dataProcessingConsent: true,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message ?? json.errors?.[0]?.message);
    },
    onSuccess: () => {
      toast.success("Pay-for-Me request submitted");
      router.push("/dashboard/buyer/financing");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="rounded-none border border-dashed border-emerald-200 bg-emerald-50/40 p-4">
        <p className="text-sm font-medium text-emerald-900">Approval flow (demo)</p>
        <p className="mt-1 text-sm text-muted-foreground">
          After you submit, admin reviews eligibility → you set up a mandate → lender approves →
          merchant confirms delivery → repayment schedule starts.
        </p>
        <div className="mt-4">
          <FinancingFlowStepper steps={flowSteps} />
        </div>
      </div>

      {!kycVerified ? (
        <div className="space-y-3 rounded-none border border-amber-200 bg-amber-50 p-4 text-sm">
          <p className="text-amber-950">
            Complete identity, employment, and address verification before requesting financing.
          </p>
          <Button asChild className="rounded-none">
            <Link href="/dashboard/buyer/kyc">Complete verification</Link>
          </Button>
        </div>
      ) : null}

      {kycVerified && !approvedApplication ? (
        <div className="space-y-3 rounded-none border p-4 text-sm">
          <p className="text-muted-foreground">
            {isSale
              ? `Submit a purchase application for "${propertyName}" and wait for merchant approval.`
              : `Submit a rental application for "${propertyName}" and wait for merchant approval.`}
          </p>
          <Button asChild variant="outline" className="rounded-none">
            <Link href={`/properties/${propertyId}`}>Back to listing to apply</Link>
          </Button>
          <Button asChild className="rounded-none bg-emerald-600 hover:bg-emerald-700">
            <Link href="/dashboard/buyer/applications">View my applications</Link>
          </Button>
        </div>
      ) : null}

      {kycVerified && approvedApplication && !financingDocsApproved ? (
        <div className="space-y-3 rounded-none border p-4 text-sm">
          <p className="text-muted-foreground">
            Upload your payslip and bank statement for admin review before submitting Pay-for-Me.
          </p>
          <Button asChild className="rounded-none bg-emerald-600 hover:bg-emerald-700">
            <Link href="/dashboard/buyer/financing-documents">Upload financing documents</Link>
          </Button>
        </div>
      ) : null}

      {canSubmit ? (
        <div className="space-y-4 rounded-none border p-4">
          <StatusBadge status="APPROVED" label="Ready to submit Pay-for-Me request" />
          <div>
            <Label>Listing</Label>
            <p className="text-sm font-medium">{propertyName}</p>
          </div>
          <div>
            <Label>Amount (GHS)</Label>
            <Input
              type="number"
              className="rounded-none"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div>
            <Label>Repayment period (months)</Label>
            <Input
              type="number"
              className="rounded-none"
              value={months}
              onChange={(e) => setMonths(e.target.value)}
            />
          </div>
          <div>
            <Label>Monthly income (GHS)</Label>
            <Input
              type="number"
              className="rounded-none"
              value={monthlyIncome}
              onChange={(e) => setMonthlyIncome(e.target.value)}
              placeholder="For affordability assessment"
            />
          </div>
          <div>
            <Label>Preferred repayment channel</Label>
            <Select
              value={preferredChannel}
              onValueChange={(v) => setPreferredChannel(v as typeof preferredChannel)}
            >
              <SelectTrigger className="rounded-none">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BANK_MANDATE">Bank mandate (auto-debit)</SelectItem>
                <SelectItem value="WALLET">Wallet balance</SelectItem>
                <SelectItem value="MOBILE_MONEY">Mobile money</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Preferred payment day of month</Label>
            <Input
              type="number"
              min={1}
              max={28}
              className="rounded-none"
              value={preferredPaymentDay}
              onChange={(e) => setPreferredPaymentDay(e.target.value)}
            />
          </div>
          <div>
            <Label>Contact phone</Label>
            <Input
              className="rounded-none"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              placeholder="For repayment reminders"
            />
          </div>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-1"
              checked={financingConsent}
              onChange={(e) => setFinancingConsent(e.target.checked)}
            />
            <span>
              I consent to PayForMe collecting and processing my data for this financing request.
            </span>
          </label>
          <Button
            className="w-full rounded-none bg-emerald-600 hover:bg-emerald-700"
            disabled={!amount || !financingConsent || financeMutation.isPending}
            onClick={() => financeMutation.mutate()}
          >
            {financeMutation.isPending ? "Submitting…" : "Submit pay-for-me request"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
