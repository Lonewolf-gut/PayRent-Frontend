"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CreditCard, ShoppingBag, Wallet, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  isSale,
  purchasePrice,
  walletBalance,
  propertyStatus,
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

  const { data: paymentConfig } = useQuery({
    queryKey: ["payment-config"],
    queryFn: async () => {
      const res = await fetch("/api/payments/config");
      const json = await res.json();
      return json.data as { usesCheckoutForListings?: boolean; demoProviderLabel?: string };
    },
  });

  const usesCheckout = Boolean(paymentConfig?.usesCheckoutForListings);
  const financingRequestUrl = `/dashboard/buyer/financing/request?propertyId=${encodeURIComponent(propertyId)}`;

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
                ? `through ${paymentConfig?.demoProviderLabel ?? "PayForMe Checkout"}.`
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

      <Card className="rounded-none border-emerald-200 bg-emerald-50/30">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCard className="size-5 text-emerald-600" />
            Request Pay-for-Me financing
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {isSale
              ? "Pay over time with lender-backed hire-purchase instead of paying in full today."
              : "Apply for pay-for-me rental financing with admin and lender approval."}
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            You will complete the request on your dashboard. It then moves through admin review,
            mandate setup, lender approval, and repayment scheduling.
          </p>
          <Button
            asChild
            className="w-full rounded-none bg-emerald-600 hover:bg-emerald-700"
          >
            <Link href={financingRequestUrl}>Request Pay-for-Me financing</Link>
          </Button>
          <Button asChild variant="outline" className="w-full rounded-none">
            <Link href="/dashboard/buyer/financing">View my financing requests</Link>
          </Button>
        </CardContent>
      </Card>

      {!approvedApplication ? (
        <Card className="rounded-none">
          <CardHeader>
            <CardTitle className="text-base">
              {isSale ? "Apply to purchase on credit" : "Apply for this property"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
                Required before Pay-for-Me: the merchant must approve your purchase application.
              </p>
            )}
            <Button
              className="w-full rounded-none"
              variant="outline"
              disabled={applyMutation.isPending}
              onClick={() => applyMutation.mutate()}
            >
              {applyMutation.isPending
                ? "Submitting…"
                : isSale
                  ? "Submit purchase application"
                  : "Submit application"}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {(contacts.landlord?.userId || contacts.agent?.userId) && (
        <Card className="rounded-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
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
