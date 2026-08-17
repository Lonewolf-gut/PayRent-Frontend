"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CreditCard, ShieldAlert, ShoppingBag, Wallet, MessageSquare } from "lucide-react";
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

type PropertyActionPanelProps = {
  propertyId: string;
  propertyName: string;
  isSale: boolean;
  purchasePrice: number;
  walletBalance: number;
  monthlyRent: number;
  propertyStatus: string;
  kycVerified: boolean;
  financingDocsApproved: boolean;
  approvedApplication?: { id: string } | null;
  moveInDate: string;
  setMoveInDate: (value: string) => void;
  notes: string;
  setNotes: (value: string) => void;
  amount: string;
  setAmount: (value: string) => void;
  months: string;
  setMonths: (value: string) => void;
  onDepositPrompt: () => void;
  onChat: (recipientUserId: string, label: string) => void;
  contacts: {
    landlord?: { userId: string; name: string } | null;
    agent?: { userId: string | null; name: string } | null;
  };
};

export function PropertyActionPanel({
  propertyId,
  propertyName,
  isSale,
  purchasePrice,
  walletBalance,
  monthlyRent,
  propertyStatus,
  kycVerified,
  financingDocsApproved,
  approvedApplication,
  moveInDate,
  setMoveInDate,
  notes,
  setNotes,
  amount,
  setAmount,
  months,
  setMonths,
  onDepositPrompt,
  onChat,
  contacts,
}: PropertyActionPanelProps) {
  const router = useRouter();
  const [financingConsent, setFinancingConsent] = useState(false);
  const [monthlyIncome, setMonthlyIncome] = useState("");
  const [preferredChannel, setPreferredChannel] = useState<
    "BANK_MANDATE" | "WALLET" | "MOBILE_MONEY"
  >("BANK_MANDATE");
  const [preferredPaymentDay, setPreferredPaymentDay] = useState("1");
  const [contactPhone, setContactPhone] = useState("");

  const { data: paymentConfig } = useQuery({
    queryKey: ["payment-config"],
    queryFn: async () => {
      const res = await fetch("/api/payments/config");
      const json = await res.json();
      return json.data as { usesCheckoutForListings?: boolean; demoProviderLabel?: string };
    },
  });

  const usesCheckout = Boolean(paymentConfig?.usesCheckoutForListings);

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
      toast.success("Application submitted");
      router.push("/dashboard/buyer/applications");
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
          applicationId: approvedApplication?.id,
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
      toast.success("Pay-for-me request submitted");
      router.push("/dashboard/buyer/financing");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/properties/${propertyId}/checkout`, { method: "POST" });
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.message ?? json.data?.error ?? "Checkout failed");
      }
      return json.data.checkout as { checkoutUrl: string };
    },
    onSuccess: (checkout) => {
      router.push(checkout.checkoutUrl);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const purchaseMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/properties/${propertyId}/purchase`, { method: "POST" });
      const json = await res.json();
      if (!json.success) {
        if (json.data?.code === "INSUFFICIENT_FUNDS") {
          onDepositPrompt();
          throw new Error("Insufficient wallet balance");
        }
        throw new Error(json.message ?? json.data?.error ?? "Purchase failed");
      }
      return json.data;
    },
    onSuccess: () => {
      toast.success("Purchase completed successfully");
      router.refresh();
    },
    onError: (e: Error) => {
      if (e.message !== "Insufficient wallet balance") toast.error(e.message);
    },
  });

  return (
    <div className="space-y-4">
      {isSale && propertyStatus === "ACTIVE" ? (
        <Card className="rounded-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {usesCheckout ? (
                <ShoppingBag className="size-5" />
              ) : (
                <Wallet className="size-5" />
              )}
              {usesCheckout ? "Buy with checkout" : "Buy with wallet"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Pay GHS {purchasePrice.toLocaleString()}{" "}
              {usesCheckout
                ? `through ${paymentConfig?.demoProviderLabel ?? "PayForMe Checkout"}. Funds settle to the platform admin account, then the merchant is paid.`
                : "directly from your wallet."}
            </p>
            {!usesCheckout ? (
              <p className="text-sm">
                Balance:{" "}
                <span className="font-semibold text-emerald-700">
                  GHS {walletBalance.toLocaleString()}
                </span>
              </p>
            ) : null}
            <Button
              className="w-full rounded-none bg-emerald-600 hover:bg-emerald-700"
              disabled={usesCheckout ? checkoutMutation.isPending : purchaseMutation.isPending}
              onClick={() =>
                usesCheckout ? checkoutMutation.mutate() : purchaseMutation.mutate()
              }
            >
              {usesCheckout
                ? checkoutMutation.isPending
                  ? "Starting checkout…"
                  : "Continue to checkout"
                : purchaseMutation.isPending
                  ? "Processing..."
                  : "Buy now"}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {!isSale ? (
        <>
          <Card className="rounded-none">
            <CardHeader>
              <CardTitle>Apply for this property</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
              <Button
                className="w-full rounded-none bg-emerald-600 hover:bg-emerald-700"
                disabled={applyMutation.isPending || !!approvedApplication}
                onClick={() => applyMutation.mutate()}
              >
                {approvedApplication ? "Application approved" : "Submit application"}
              </Button>
            </CardContent>
          </Card>

          <Card className="rounded-none">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="size-5" />
                Request Pay-for-Me financing
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!kycVerified ? (
                <div className="space-y-3 border border-amber-200 bg-amber-50 p-4 text-sm">
                  <div className="flex items-start gap-2">
                    <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                    <p className="text-amber-900">
                      Your account must be fully verified before you can apply for financing.
                      Complete identity, employment, and address verification on your dashboard.
                    </p>
                  </div>
                  <Button className="w-full rounded-none" asChild>
                    <Link href="/dashboard/buyer/kyc">Complete verification</Link>
                  </Button>
                </div>
              ) : !approvedApplication ? (
                <p className="text-sm text-muted-foreground">
                  Submit and get approval for your rental application before requesting financing.
                </p>
              ) : !financingDocsApproved ? (
                <div className="space-y-3 text-sm">
                  <p className="text-muted-foreground">
                    Upload your payslip and 6–12 month bank statement on your dashboard for admin
                    review. Verification documents cannot be uploaded on this page.
                  </p>
                  <Button className="w-full rounded-none" asChild>
                    <Link href="/dashboard/buyer/financing-documents">
                      Upload financing documents
                    </Link>
                  </Button>
                </div>
              ) : (
                <>
                  <StatusBadge status="APPROVED" label="Ready for financing" />
                  <div>
                    <Label>Amount (GHS)</Label>
                    <Input
                      type="number"
                      className="rounded-none"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder={String(monthlyRent)}
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
                      onValueChange={(v) =>
                        setPreferredChannel(v as typeof preferredChannel)
                      }
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
                      I consent to PayForMe collecting and processing my data for this financing
                      request, including fee disclosure review. See our{" "}
                      <Link href="/privacy" className="text-emerald-600 hover:underline">
                        privacy policy
                      </Link>
                      .
                    </span>
                  </label>
                  <Button
                    className="w-full rounded-none bg-emerald-600 hover:bg-emerald-700"
                    disabled={!amount || !financingConsent || financeMutation.isPending}
                    onClick={() => financeMutation.mutate()}
                  >
                    Submit pay-for-me request
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}

      {(contacts.landlord?.userId || contacts.agent?.userId) && (
        <Card className="rounded-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="size-5" />
              Chat
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {contacts.landlord?.userId ? (
              <Button
                variant="outline"
                className="w-full rounded-none justify-start"
                onClick={() =>
                  onChat(contacts.landlord!.userId, contacts.landlord!.name)
                }
              >
                Chat with merchant
              </Button>
            ) : null}
            {contacts.agent?.userId ? (
              <Button
                variant="outline"
                className="w-full rounded-none justify-start"
                onClick={() => onChat(contacts.agent!.userId!, contacts.agent!.name)}
              >
                Chat with Affiliate
              </Button>
            ) : null}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
