"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { CreditCard, ShoppingBag, Wallet, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

type PropertyActionPanelProps = {
  propertyId: string;
  isSale: boolean;
  purchasePrice: number;
  walletBalance: number;
  propertyStatus: string;
  onDepositPrompt: () => void;
  onRequestFinancing: () => void;
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
  onDepositPrompt,
  onRequestFinancing,
  onChat,
  contacts,
}: PropertyActionPanelProps) {
  const { data: paymentConfig } = useQuery({
    queryKey: ["payment-config"],
    queryFn: async () => {
      const res = await fetch("/api/payments/config");
      const json = await res.json();
      return json.data as { usesCheckoutForListings?: boolean; demoProviderLabel?: string };
    },
  });

  const usesCheckout = Boolean(paymentConfig?.usesCheckoutForListings);

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
      window.location.href = checkout.checkoutUrl;
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

      <Button
        className="w-full rounded-none bg-emerald-600 hover:bg-emerald-700"
        onClick={onRequestFinancing}
      >
        <CreditCard className="mr-2 size-4" />
        Submit financing request
      </Button>

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
