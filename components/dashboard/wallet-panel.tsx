"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
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
import { StatusBadge } from "@/components/dashboard/status-badge";
import { toast } from "sonner";
import type { UserRole } from "@prisma/client";

type BankAccount = {
  id: string;
  accountType?: string;
  bankName: string;
  accountNumberMasked?: string | null;
  accountNumber?: string;
  isVerified: boolean;
};

const SETTINGS_PATH: Partial<Record<UserRole, string>> = {
  BUYER: "/dashboard/buyer/settings",
  MERCHANT: "/dashboard/merchant/settings",
  LENDER: "/dashboard/lender/settings",
  MARKETER: "/dashboard/marketer/settings",
  ADMIN: "/admin/settings",
};

export function WalletPanel({
  title = "Wallet",
  showDeposit = true,
  showWithdraw = false,
  settingsApiPath = "/api/settings",
  walletApiPath = "/api/wallet",
}: {
  title?: string;
  showDeposit?: boolean;
  showWithdraw?: boolean;
  settingsApiPath?: string;
  walletApiPath?: string;
}) {
  const { data: session } = useSession();
  const settingsHref = session?.user?.role
    ? SETTINGS_PATH[session.user.role as UserRole]
    : undefined;

  const [depositAmount, setDepositAmount] = useState("");
  const [depositAccountId, setDepositAccountId] = useState("");
  const [bankDepositInstructions, setBankDepositInstructions] = useState<{
    reference: string;
    amount: number;
    status: string;
    collectionAccount: {
      bankName: string;
      bankCode: string;
      accountNumber: string;
      accountName: string;
    };
    instructions: string;
  } | null>(null);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [bankAccountId, setBankAccountId] = useState("");
  const [withdrawalId, setWithdrawalId] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [twoFaToken, setTwoFaToken] = useState("");
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["wallet", walletApiPath],
    queryFn: async () => {
      const res = await fetch(walletApiPath);
      const json = await res.json();
      return json.data;
    },
  });

  const { data: bankAccounts = [] } = useQuery({
    queryKey: ["settings-bank-accounts", settingsApiPath],
    queryFn: async () => {
      const res = await fetch(settingsApiPath);
      const json = await res.json();
      return (json.data?.bankAccounts ?? []) as BankAccount[];
    },
  });

  const verifiedAccounts = bankAccounts.filter((a) => a.isVerified);
  const selectedDepositAccount = verifiedAccounts.find((a) => a.id === depositAccountId);
  const isBankDeposit = selectedDepositAccount?.accountType === "BANK";
  const transactionCount = data?.transactions?.length ?? 0;

  const { data: pendingBankTransactions = [] } = useQuery({
    queryKey: ["bank-deposit-pending"],
    queryFn: async () => {
      const res = await fetch("/api/payments/bank-deposit-instructions");
      const json = await res.json();
      return (json.data?.pending ?? []) as Array<{
        id: string;
        platformReference: string;
        amount: string;
        status: string;
        type: string;
      }>;
    },
    enabled: showDeposit,
  });


  const depositMutation = useMutation({
    mutationFn: async () => {
      if (isBankDeposit) {
        const res = await fetch("/api/payments/bank-deposit-instructions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount: parseFloat(depositAmount) }),
        });
        const json = await res.json();
        if (!json.success) {
          throw new Error(json.message ?? "Could not create bank deposit instructions");
        }
        return { bankInstructions: json.data, payment: undefined, message: json.message as string | undefined };
      }

      const res = await fetch("/api/payments/deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parseFloat(depositAmount),
          bankAccountId: depositAccountId,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message ?? json.error?.message ?? "Deposit failed");
      return {
        payment: json.data?.payment as
          | { checkoutUrl?: string; method?: string; reference?: string }
          | undefined,
        message: json.message as string | undefined,
        bankInstructions: undefined as undefined,
      };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["wallet", walletApiPath] });
      queryClient.invalidateQueries({ queryKey: ["bank-deposit-pending"] });
      if (data.bankInstructions) {
        setBankDepositInstructions(data.bankInstructions);
        if (data.bankInstructions.demoCompleted) {
          setBankDepositInstructions(null);
          setDepositAmount("");
          toast.success("Bank deposit credited to your wallet (demo mode).");
          return;
        }
        toast.success("Transfer the exact amount using the reference below.");
        return;
      }
      if (data.payment?.checkoutUrl) {
        window.location.href = data.payment.checkoutUrl;
        toast.success("Redirecting to checkout…");
      } else {
        toast.success(
          data.message ??
            (data.payment?.status === "SUCCESSFUL"
              ? "Deposit completed successfully."
              : "MoMo payment initiated — approve the prompt on your phone. You will receive a notification when the deposit completes.")
        );
      }
      setDepositAmount("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const withdrawRequestMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/withdrawals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bankAccountId,
          amount: parseFloat(withdrawAmount),
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message ?? "Withdrawal request failed");
      return json.data;
    },
    onSuccess: (data) => {
      setWithdrawalId(data.id);
      toast.success("OTP sent. Check your email or phone.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const verifyOtpMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/withdrawals/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ withdrawalId, code: otpCode }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message ?? "OTP verification failed");
    },
    onSuccess: () => toast.success("OTP verified. Enter your 2FA code to confirm."),
    onError: (e: Error) => toast.error(e.message),
  });

  const confirmWithdrawMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/withdrawals/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ withdrawalId, twoFaToken }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message ?? "Withdrawal confirmation failed");
      return json.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["wallet", walletApiPath] });
      queryClient.invalidateQueries({ queryKey: ["bank-deposit-pending"] });
      if (data?.status === "PROCESSING") {
        toast.success("Withdrawal submitted to partner bank for processing.");
      } else {
        toast.success("Withdrawal completed");
      }
      setWithdrawAmount("");
      setWithdrawalId(null);
      setOtpCode("");
      setTwoFaToken("");
    },
    onError: (e: Error) => toast.error(e.message),
  });


  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="text-sm text-muted-foreground">
          {showDeposit
            ? "Deposit and withdraw using verified bank or MoMo accounts in "
            : "Withdraw to your verified bank or MoMo account in "}
          {settingsHref ? (
            <Link href={settingsHref} className="font-medium text-emerald-700 hover:underline">
              Settings
            </Link>
          ) : (
            "Settings"
          )}
          .
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">Available balance</p>
          <p className="text-3xl font-bold text-emerald-600">
            GHS {Number(data?.balance ?? 0).toLocaleString()}
          </p>
          {typeof data?.withdrawableBalance === "number" ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Withdrawable: GHS {Number(data.withdrawableBalance).toLocaleString()}
              {Number(data?.financedBalance ?? 0) > 0 ? (
                <span>
                  {" "}
                  · Financed funds (non-withdrawable): GHS{" "}
                  {Number(data.financedBalance).toLocaleString()}
                </span>
              ) : null}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Accordion type="single" collapsible defaultValue={showDeposit ? "deposit" : showWithdraw ? "withdraw" : "history"} className="border-y">
        {showDeposit ? (
        <AccordionItem value="deposit" className="border-0">
          <AccordionTrigger className="rounded-none border-0 px-0 py-5 hover:no-underline">
            <div className="flex flex-1 items-center justify-between gap-4 pr-2 text-left">
              <div>
                <p className="text-base font-medium">Deposit funds</p>
                <p className="text-sm font-normal text-muted-foreground">
                  Top up via Mobile Money using a saved verified account.
                </p>
              </div>
              <StatusBadge status="ACTIVE" label="Top up" />
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-0 pb-6 space-y-4">
            <p className="text-sm text-muted-foreground">
              Your wallet balance reflects completed deposits and withdrawals only. Add a verified
              Mobile Money account in Settings, then deposit via MoMo. Subscriptions are paid
              separately through MoMo and cannot use wallet balance.
            </p>

            {!verifiedAccounts.length && settingsHref ? (
              <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-900 dark:text-amber-100">
                You do not have a saved payment method yet. Add a verified bank or MoMo account in
                Settings before depositing or withdrawing.
                <div className="mt-3">
                  <Button asChild variant="outline" size="sm">
                    <Link href={settingsHref}>Add account in Settings</Link>
                  </Button>
                </div>
              </div>
            ) : null}

            {verifiedAccounts.length ? (
              <p className="text-sm text-muted-foreground">
                MoMo deposits use a phone prompt. Bank deposits use the platform collection account
                and a unique reference. You will be notified when the transfer is confirmed.
              </p>
            ) : null}

            {bankDepositInstructions ? (
              <div className="space-y-2 rounded-none border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-50">
                <p className="font-medium">Bank deposit instructions</p>
                <p>Reference: <span className="font-mono">{bankDepositInstructions.reference}</span></p>
                <p>Amount: GHS {Number(bankDepositInstructions.amount).toLocaleString()}</p>
                <p>{bankDepositInstructions.collectionAccount.accountName}</p>
                <p>{bankDepositInstructions.collectionAccount.bankName}</p>
                <p>Account: {bankDepositInstructions.collectionAccount.accountNumber}</p>
                <p className="text-muted-foreground">{bankDepositInstructions.instructions}</p>
              </div>
            ) : null}

            {pendingBankTransactions.length ? (
              <div className="space-y-2">
                <p className="text-sm font-medium">Pending bank transfers</p>
                <ul className="divide-y rounded-none border border-border text-sm">
                  {pendingBankTransactions.map((item) => (
                    <li key={item.id} className="flex justify-between gap-3 px-3 py-2">
                      <span className="text-muted-foreground">{item.platformReference}</span>
                      <span>
                        GHS {Number(item.amount).toLocaleString()} · {item.status}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Amount (GHS)</Label>
                <Input
                  type="number"
                  placeholder="Amount (GHS)"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  disabled={!verifiedAccounts.length}
                />
              </div>
              <div>
                <Label>Deposit from</Label>
                <Select
                  value={depositAccountId}
                  onValueChange={(value) => setDepositAccountId(value ?? "")}
                  disabled={!verifiedAccounts.length}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select verified account" />
                  </SelectTrigger>
                  <SelectContent>
                    {verifiedAccounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.accountType === "MOMO" ? "MoMo" : "Bank"} ·{" "}
                        {account.bankName} ·{" "}
                        {account.accountNumberMasked ?? account.accountNumber}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              className="bg-emerald-600 hover:bg-emerald-700 w-full sm:w-auto"
              disabled={
                !depositAmount ||
                !depositAccountId ||
                !verifiedAccounts.length ||
                depositMutation.isPending
              }
              onClick={() => depositMutation.mutate()}
            >
              {isBankDeposit ? "Generate bank deposit instructions" : "Deposit funds"}
            </Button>
          </AccordionContent>
        </AccordionItem>
        ) : null}

        {showWithdraw ? (
          <AccordionItem value="withdraw" className="border-0">
            <AccordionTrigger className="rounded-none border-0 px-0 py-5 hover:no-underline">
              <div className="flex flex-1 items-center justify-between gap-4 pr-2 text-left">
                <div>
                  <p className="text-base font-medium">Withdraw funds</p>
                  <p className="text-sm font-normal text-muted-foreground">
                    Transfer to a verified bank or MoMo account.
                  </p>
                </div>
                <StatusBadge
                  status={verifiedAccounts.length ? "APPROVED" : "PENDING"}
                  label={verifiedAccounts.length ? "Ready" : "Needs account"}
                />
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-0 pb-6 space-y-4">
              <p className="text-sm text-muted-foreground">
                Withdrawals require OTP verification and an active 2FA token. Payout accounts
                are managed in Settings.
              </p>

              {!verifiedAccounts.length && settingsHref ? (
                <Button asChild variant="outline" size="sm">
                  <Link href={settingsHref}>Add payout account in Settings</Link>
                </Button>
              ) : null}

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Amount (GHS)</Label>
                  <Input
                    type="number"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    disabled={!!withdrawalId}
                  />
                </div>
                <div>
                  <Label>Payout to</Label>
                  <Select
                    value={bankAccountId}
                    onValueChange={(value) => setBankAccountId(value ?? "")}
                    disabled={!!withdrawalId || !verifiedAccounts.length}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select verified account" />
                    </SelectTrigger>
                    <SelectContent>
                      {verifiedAccounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.accountType === "MOMO" ? "MoMo" : "Bank"} ·{" "}
                          {account.bankName} ·{" "}
                          {account.accountNumberMasked ?? account.accountNumber}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {!withdrawalId ? (
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700"
                  disabled={
                    !withdrawAmount ||
                    !bankAccountId ||
                    withdrawRequestMutation.isPending
                  }
                  onClick={() => withdrawRequestMutation.mutate()}
                >
                  Request withdrawal
                </Button>
              ) : (
                <div className="space-y-4 rounded-lg border p-4">
                  <div>
                    <Label>OTP code</Label>
                    <Input
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      placeholder="Enter OTP from email/SMS"
                    />
                  </div>
                  <Button
                    variant="outline"
                    disabled={!otpCode || verifyOtpMutation.isPending}
                    onClick={() => verifyOtpMutation.mutate()}
                  >
                    Verify OTP
                  </Button>
                  <div>
                    <Label>2FA token</Label>
                    <Input
                      value={twoFaToken}
                      onChange={(e) => setTwoFaToken(e.target.value)}
                      maxLength={6}
                      placeholder="6-digit authenticator code"
                    />
                  </div>
                  <Button
                    className="bg-emerald-600 hover:bg-emerald-700"
                    disabled={!twoFaToken || confirmWithdrawMutation.isPending}
                    onClick={() => confirmWithdrawMutation.mutate()}
                  >
                    Confirm withdrawal
                  </Button>
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
        ) : null}

        <AccordionItem value="history" className="border-0">
          <AccordionTrigger className="rounded-none border-0 px-0 py-5 hover:no-underline">
            <div className="flex flex-1 items-center justify-between gap-4 pr-2 text-left">
              <div>
                <p className="text-base font-medium">Transaction history</p>
                <p className="text-sm font-normal text-muted-foreground">
                  Recent deposits, withdrawals, and transfers.
                </p>
              </div>
              <StatusBadge
                status={transactionCount ? "ACTIVE" : "DRAFT"}
                label={transactionCount ? `${transactionCount} records` : "Empty"}
              />
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-0 pb-6">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : !data?.transactions?.length ? (
              <p className="text-sm text-muted-foreground">No transactions yet.</p>
            ) : (
              <ul className="divide-y">
                {data.transactions.map(
                  (tx: {
                    id: string;
                    type: string;
                    amount: number;
                    status: string;
                    reference: string;
                  }) => (
                    <li key={tx.id} className="flex justify-between gap-4 py-3 text-sm">
                      <span className="text-muted-foreground">
                        {tx.type} · {tx.reference}
                      </span>
                      <span className="shrink-0 font-medium">
                        GHS {Number(tx.amount).toLocaleString()} · {tx.status}
                      </span>
                    </li>
                  )
                )}
              </ul>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
