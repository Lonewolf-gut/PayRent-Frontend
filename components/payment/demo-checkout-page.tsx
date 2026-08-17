"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Building2, CreditCard, Loader2, ShieldCheck, Wallet } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { DEMO_PROVIDER_LABEL } from "@/constants/demo";

type DemoSession = {
  reference: string;
  purpose: "WALLET_DEPOSIT" | "SUBSCRIPTION" | "LISTING_PURCHASE";
  amount: number;
  provider: "demo";
  settlementAccount: {
    bankName: string;
    accountName: string;
    accountNumberMasked: string;
  };
  propertyName?: string;
  plan?: string;
};

const purposeLabels: Record<DemoSession["purpose"], string> = {
  WALLET_DEPOSIT: "Wallet top-up",
  SUBSCRIPTION: "Subscription payment",
  LISTING_PURCHASE: "Listing purchase",
};

const purposeIcons = {
  WALLET_DEPOSIT: Wallet,
  SUBSCRIPTION: CreditCard,
  LISTING_PURCHASE: Building2,
};

export function DemoCheckoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reference = searchParams.get("reference") ?? "";

  const { data, isLoading, error } = useQuery({
    queryKey: ["demo-payment", reference],
    queryFn: async () => {
      const res = await fetch(
        `/api/payments/demo/complete?reference=${encodeURIComponent(reference)}`
      );
      const json = await res.json();
      if (!json.success) throw new Error(json.message ?? "Unable to load checkout");
      return json.data.session as DemoSession;
    },
    enabled: Boolean(reference),
  });

  const completeMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/payments/demo/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message ?? "Payment failed");
      return json.data as { purpose: DemoSession["purpose"]; alreadyProcessed?: boolean };
    },
    onSuccess: (result) => {
      toast.success(
        result.alreadyProcessed ? "Payment was already completed." : "Payment completed successfully."
      );

      if (result.purpose === "LISTING_PURCHASE") {
        router.push("/dashboard/buyer/applications");
        return;
      }
      if (result.purpose === "SUBSCRIPTION") {
        router.push("/dashboard");
        return;
      }
      router.push("/dashboard/buyer/wallet");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!reference) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <p className="text-muted-foreground">Missing payment reference.</p>
        <Button asChild className="mt-6 rounded-none">
          <Link href="/">Go home</Link>
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <p className="text-destructive">{(error as Error)?.message ?? "Checkout not found."}</p>
        <Button asChild className="mt-6 rounded-none" variant="outline">
          <Link href="/">Go home</Link>
        </Button>
      </div>
    );
  }

  const Icon = purposeIcons[data.purpose];

  return (
    <div className="mx-auto max-w-xl px-4 py-12 sm:px-6">
      <div className="mb-8 text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
          {DEMO_PROVIDER_LABEL}
        </p>
        <h1 className="mt-2 text-2xl font-bold text-emerald-950">Secure checkout</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Simulates a payment service provider collection before live bank or MoMo API keys are
          connected.
        </p>
      </div>

      <Card className="rounded-none border-emerald-100">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Icon className="size-5 text-emerald-600" />
            {purposeLabels[data.purpose]}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between border-b pb-4">
            <span className="text-muted-foreground">Amount</span>
            <span className="text-2xl font-bold text-emerald-800">
              GHS {data.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>

          {data.propertyName ? (
            <p className="text-sm">
              Listing: <span className="font-medium">{data.propertyName}</span>
            </p>
          ) : null}

          {data.plan ? (
            <p className="text-sm">
              Plan: <span className="font-medium">{data.plan}</span>
            </p>
          ) : null}

          <div className="rounded-none border border-dashed border-emerald-200 bg-emerald-50/60 p-4 text-sm">
            <p className="flex items-center gap-2 font-medium text-emerald-900">
              <ShieldCheck className="size-4" />
              Settlement destination (admin collection account)
            </p>
            <p className="mt-2 text-muted-foreground">{data.settlementAccount.bankName}</p>
            <p className="font-medium">{data.settlementAccount.accountName}</p>
            <p>{data.settlementAccount.accountNumberMasked}</p>
          </div>

          <p className="text-xs text-muted-foreground">
            Reference: <span className="font-mono">{data.reference}</span>
          </p>

          <Button
            className="w-full rounded-none bg-emerald-600 hover:bg-emerald-700"
            disabled={completeMutation.isPending}
            onClick={() => completeMutation.mutate()}
          >
            {completeMutation.isPending ? "Processing…" : `Pay GHS ${data.amount.toLocaleString()}`}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            Demo mode — no real money is moved. Merchant settlements and affiliate commissions still
            run on the platform ledger.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
