"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { Wallet, CreditCard, MessageSquare, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { toast } from "sonner";

type PropertyActionPanelProps = {
  propertyId: string;
  propertyName: string;
  isSale: boolean;
  purchasePrice: number;
  walletBalance: number;
  monthlyRent: number;
  propertyStatus: string;
  fullyVerified: boolean;
  financingDocsApproved: boolean;
  financingDocsPending: boolean;
  approvedApplication?: { id: string } | null;
  moveInDate: string;
  setMoveInDate: (value: string) => void;
  notes: string;
  setNotes: (value: string) => void;
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
  fullyVerified,
  financingDocsApproved,
  financingDocsPending,
  approvedApplication,
  moveInDate,
  setMoveInDate,
  notes,
  setNotes,
  onDepositPrompt,
  onChat,
  contacts,
}: PropertyActionPanelProps) {
  const router = useRouter();

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

  const rentPaymentMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/properties/${propertyId}/rent-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId: approvedApplication?.id,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        if (json.data?.code === "INSUFFICIENT_FUNDS") {
          onDepositPrompt();
          throw new Error("Insufficient wallet balance");
        }
        throw new Error(json.message ?? json.data?.error ?? "Payment failed");
      }
      return json.data;
    },
    onSuccess: () => {
      toast.success("Rent payment completed successfully");
      router.refresh();
    },
    onError: (e: Error) => {
      if (e.message !== "Insufficient wallet balance") toast.error(e.message);
    },
  });

  const payAmount = isSale ? purchasePrice : monthlyRent;
  const canPay = walletBalance >= payAmount;

  return (
    <div className="space-y-4">
      {propertyStatus === "ACTIVE" ? (
        <Card className="rounded-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="size-5" />
              {isSale ? "Buy with wallet" : "Pay for this property"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {isSale
                ? `Pay GHS ${purchasePrice.toLocaleString()} directly from your wallet.`
                : `Pay GHS ${monthlyRent.toLocaleString()} rent from your wallet.`}
            </p>
            <p className="text-sm">
              Balance:{" "}
              <span className="font-semibold text-emerald-700">
                GHS {walletBalance.toLocaleString()}
              </span>
            </p>
            {!isSale && !approvedApplication ? (
              <p className="text-xs text-muted-foreground">
                Submit an application first so the merchant can review your request.
              </p>
            ) : null}
            <Button
              className="w-full rounded-none bg-emerald-600 hover:bg-emerald-700"
              disabled={
                isSale
                  ? purchaseMutation.isPending
                  : rentPaymentMutation.isPending || !approvedApplication
              }
              onClick={() =>
                isSale ? purchaseMutation.mutate() : rentPaymentMutation.mutate()
              }
            >
              {isSale
                ? purchaseMutation.isPending
                  ? "Processing..."
                  : "Pay now"
                : rentPaymentMutation.isPending
                  ? "Processing..."
                  : "Pay now"}
            </Button>
            {!canPay ? (
              <Button
                variant="outline"
                className="w-full rounded-none"
                onClick={onDepositPrompt}
              >
                Deposit funds
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {!isSale ? (
        <>
          <Card className="rounded-none">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="size-5" />
                Request for financing
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!fullyVerified ? (
                <div className="space-y-3 border border-amber-200 bg-amber-50 p-4 text-sm">
                  <div className="flex items-start gap-2">
                    <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                    <p className="text-amber-900">
                      Your account must be fully verified before you can request financing.
                      Complete phone, profile, identity, and bank verification on your dashboard.
                    </p>
                  </div>
                  <Button className="w-full rounded-none" asChild>
                    <Link href="/dashboard/buyer/kyc">Complete verification</Link>
                  </Button>
                </div>
              ) : financingDocsApproved ? (
                <div className="space-y-3">
                  <StatusBadge status="APPROVED" label="Documents approved" />
                  <p className="text-sm text-muted-foreground">
                    Your financing documents are approved. Continue from your dashboard to submit a
                    pay-for-me request for this listing.
                  </p>
                  <Button className="w-full rounded-none bg-emerald-600 hover:bg-emerald-700" asChild>
                    <Link href="/dashboard/buyer/financing">Open financing dashboard</Link>
                  </Button>
                </div>
              ) : financingDocsPending ? (
                <div className="space-y-3">
                  <StatusBadge status="PENDING" label="Documents under review" />
                  <p className="text-sm text-muted-foreground">
                    Your payslip and bank statements are pending admin review. You will be notified
                    when a lender can finance your request.
                  </p>
                  <Button className="w-full rounded-none" variant="outline" asChild>
                    <Link href="/dashboard/buyer/financing-documents">View document status</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Cannot pay upfront? Submit your payslip and bank statements on your dashboard.
                    Your request stays pending until a lender approves financing.
                  </p>
                  <Button className="w-full rounded-none bg-emerald-600 hover:bg-emerald-700" asChild>
                    <Link href="/dashboard/buyer/financing-documents">
                      Request for financing
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

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
                className="w-full rounded-none"
                variant="outline"
                disabled={applyMutation.isPending || !!approvedApplication}
                onClick={() => applyMutation.mutate()}
              >
                {approvedApplication ? "Application approved" : "Submit application"}
              </Button>
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
