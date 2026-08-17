"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { FinancingFlowStepper } from "@/components/properties/financing-flow-stepper";
import {
  buildRequestPipeline,
  getCurrentApproverLabel,
} from "@/lib/financing/request-pipeline";
import { isEmploymentRecorded } from "@/lib/constants/employment-status";
import { isSaleListing } from "@/lib/subscription-limits";
import type { PropertyType } from "@prisma/client";

type BuyerFinancingRequestPanelProps = {
  propertyId: string;
};

export function BuyerFinancingRequestPanel({ propertyId }: BuyerFinancingRequestPanelProps) {
  const queryClient = useQueryClient();
  const [moveInDate, setMoveInDate] = useState("");
  const [notes, setNotes] = useState("");
  const [amount, setAmount] = useState("");
  const [months, setMonths] = useState("12");
  const [monthlyIncome, setMonthlyIncome] = useState("");
  const [financingConsent, setFinancingConsent] = useState(false);
  const [preferredChannel, setPreferredChannel] = useState<
    "BANK_MANDATE" | "WALLET" | "MOBILE_MONEY"
  >("BANK_MANDATE");
  const [preferredPaymentDay, setPreferredPaymentDay] = useState("1");
  const [contactPhone, setContactPhone] = useState("");

  const { data: property, isLoading: propertyLoading } = useQuery({
    queryKey: ["property", propertyId],
    queryFn: async () => {
      const res = await fetch(`/api/properties/${propertyId}`);
      const json = await res.json();
      return json.data;
    },
  });

  const { data: kycStatus } = useQuery({
    queryKey: ["kyc-status"],
    queryFn: async () => {
      const res = await fetch("/api/kyc");
      const json = await res.json();
      return json.data;
    },
  });

  const { data: financingDocs } = useQuery({
    queryKey: ["tenant-financing-docs"],
    queryFn: async () => {
      const res = await fetch("/api/buyer/financing-documents");
      const json = await res.json();
      return json.data;
    },
  });

  const { data: applications = [] } = useQuery({
    queryKey: ["applications"],
    queryFn: async () => {
      const res = await fetch("/api/applications");
      const json = await res.json();
      return json.data ?? [];
    },
  });

  const { data: financingRequests = [] } = useQuery({
    queryKey: ["financing"],
    queryFn: async () => {
      const res = await fetch("/api/financing");
      const json = await res.json();
      return json.data ?? [];
    },
  });

  const application = applications.find(
    (app: { propertyId: string }) => app.propertyId === propertyId
  );
  const financingRequest = financingRequests.find(
    (req: { propertyId: string }) => req.propertyId === propertyId
  );

  const isSale = property ? isSaleListing(property.propertyType as PropertyType) : false;
  const defaultAmount = property
    ? Number(property.discountedPrice ?? property.monthlyRent)
    : 0;

  useEffect(() => {
    if (defaultAmount > 0 && !amount) {
      setAmount(String(defaultAmount));
    }
  }, [defaultAmount, amount]);

  const profileComplete = ["PROFILE_COMPLETED", "KYC_PENDING", "KYC_VERIFIED"].includes(
    kycStatus?.profileStatus ?? ""
  );
  const kycVerified = Boolean(
    kycStatus?.kycVerified &&
      kycStatus?.addressVerified &&
      isEmploymentRecorded(
        kycStatus?.employmentStatus,
        profileComplete,
        kycStatus?.employmentVerified
      )
  );
  const financingDocsApproved = Boolean(financingDocs?.allApproved);
  const canSubmitFinancing =
    application?.status === "APPROVED" &&
    kycVerified &&
    financingDocsApproved &&
    !financingRequest;

  const pipeline = buildRequestPipeline({
    applicationStatus: application?.status,
    financingStatus: financingRequest?.status,
    financingDocsApproved,
    kycVerified,
    isSale,
  });

  const pipelineSteps = pipeline.map((step) => ({
    id: step.id,
    label: step.label,
    description: `${step.approver}: ${step.description}`,
    status:
      step.status === "complete"
        ? ("complete" as const)
        : step.status === "current"
          ? ("current" as const)
          : ("upcoming" as const),
    href:
      step.id === "financing-docs" && step.status === "current"
        ? "/dashboard/buyer/financing-documents"
        : step.id === "submit-application" && step.status === "current" && !kycVerified
          ? "/dashboard/buyer/kyc"
          : undefined,
  }));

  const applyMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId,
          requestedMoveInDate: moveInDate ? new Date(moveInDate).toISOString() : undefined,
          notes: notes || undefined,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message ?? json.errors?.[0]?.message);
    },
    onSuccess: () => {
      toast.success("Application submitted — waiting for merchant approval");
      queryClient.invalidateQueries({ queryKey: ["applications"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const financeMutation = useMutation({
    mutationFn: async () => {
      if (!financingConsent) {
        throw new Error("You must consent to data collection and processing for financing.");
      }
      const res = await fetch("/api/financing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId,
          applicationId: application.id,
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
      toast.success("Pay-for-Me request submitted — waiting for admin eligibility review");
      queryClient.invalidateQueries({ queryKey: ["financing"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (propertyLoading) {
    return <p className="text-muted-foreground">Loading listing…</p>;
  }

  if (!property) {
    return (
      <Card className="rounded-none">
        <CardContent className="py-8 text-center text-muted-foreground">
          Listing not found.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-none border-emerald-200">
      <CardHeader>
        <CardTitle className="text-lg">Pay-for-Me request — {property.name}</CardTitle>
        <p className="text-sm text-muted-foreground">
          Complete each step in order. Each submit moves the request to the next approver.
        </p>
        <p className="text-sm font-medium text-emerald-800">{getCurrentApproverLabel(pipeline)}</p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-none border border-dashed border-emerald-200 bg-emerald-50/40 p-4">
          <p className="mb-3 text-sm font-medium text-emerald-900">Approval order</p>
          <FinancingFlowStepper
            steps={pipelineSteps.map((s) => ({
              id: s.id,
              label: s.label,
              description: s.description,
              status: s.status,
              href: s.href,
            }))}
          />
        </div>

        {!application ? (
          <div className="space-y-4 rounded-none border p-4">
            <h3 className="font-medium">
              Step 1 — {isSale ? "Purchase application" : "Rental application"}
            </h3>
            {!isSale ? (
              <>
                <div>
                  <Label>Preferred move-in date</Label>
                  <Input
                    type="date"
                    className="rounded-none"
                    value={moveInDate}
                    onChange={(e) => setMoveInDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Notes (optional)</Label>
                  <Input
                    className="rounded-none"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Tell the merchant about yourself"
                  />
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Submit your interest to purchase this item on Pay-for-Me credit. The merchant
                reviews first.
              </p>
            )}
            <Button
              className="rounded-none bg-emerald-600 hover:bg-emerald-700"
              disabled={applyMutation.isPending}
              onClick={() => applyMutation.mutate()}
            >
              {applyMutation.isPending ? "Submitting…" : "Submit application"}
            </Button>
          </div>
        ) : null}

        {application && application.status !== "APPROVED" ? (
          <div className="rounded-none border border-amber-200 bg-amber-50 p-4 text-sm">
            <p className="font-medium text-amber-950">Application submitted</p>
            <p className="mt-1 text-amber-900">
              Status: <StatusBadge status={application.status} label={application.status} /> —
              waiting for merchant approval before you can submit Pay-for-Me financing.
            </p>
            <Button asChild variant="outline" size="sm" className="mt-3 rounded-none">
              <Link href="/properties">Browse other listings</Link>
            </Button>
          </div>
        ) : null}

        {application?.status === "APPROVED" && !financingDocsApproved ? (
          <div className="space-y-3 rounded-none border p-4">
            <h3 className="font-medium">Step 2 — Financing documents</h3>
            <p className="text-sm text-muted-foreground">
              Upload payslip and bank statement. Admin must approve before you submit Pay-for-Me.
            </p>
            <Button asChild className="rounded-none bg-emerald-600 hover:bg-emerald-700">
              <Link href="/dashboard/buyer/financing-documents">Upload financing documents</Link>
            </Button>
          </div>
        ) : null}

        {canSubmitFinancing ? (
          <div className="space-y-4 rounded-none border p-4">
            <h3 className="font-medium">Step 3 — Submit Pay-for-Me request</h3>
            <StatusBadge status="APPROVED" label="Application approved — ready to submit" />
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
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-1"
                checked={financingConsent}
                onChange={(e) => setFinancingConsent(e.target.checked)}
              />
              <span>I consent to PayForMe processing my data for this financing request.</span>
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

        {financingRequest ? (
          <div className="rounded-none border border-emerald-200 bg-emerald-50/50 p-4 text-sm">
            <p className="font-medium text-emerald-950">Pay-for-Me request in progress</p>
            <p className="mt-1">
              Status:{" "}
              <StatusBadge status={financingRequest.status} label={financingRequest.status} />
            </p>
            <Button asChild size="sm" className="mt-3 rounded-none bg-emerald-600 hover:bg-emerald-700">
              <Link href="/dashboard/buyer/financing">Continue on Pay for Me dashboard</Link>
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
