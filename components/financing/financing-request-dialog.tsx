"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DocumentCaptureInput } from "@/components/shared/document-capture-input";
import { canEditFinancingRequest } from "@/lib/financing/status-flow";
import { toast } from "sonner";

const REPAYMENT_OPTIONS = [3, 6, 12, 18, 24, 30, 36, 42, 48] as const;
const BANK_STATEMENT_PERIODS = [
  { value: "6", label: "6 months" },
  { value: "12", label: "1 year" },
] as const;

type BankAccountOption = {
  id: string;
  bankName: string;
  accountNumberMasked?: string;
  isVerified: boolean;
};

type FinancingRequestDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string;
  applicationId?: string;
  propertyName: string;
  defaultAmount: number;
  financingRequestId?: string;
  initialValues?: {
    requestedAmount?: number | string;
    durationMonths?: number;
    notes?: string | null;
    status?: string;
  };
  mode?: "create" | "edit";
};

function parseBankStatementPeriod(notes?: string | null) {
  const match = notes?.match(/Bank statement period:\s*(\d+)\s*months/i);
  return match?.[1] === "12" ? "12" : "6";
}

export function FinancingRequestDialog({
  open,
  onOpenChange,
  propertyId,
  applicationId,
  propertyName,
  defaultAmount,
  financingRequestId,
  initialValues,
  mode = "create",
}: FinancingRequestDialogProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isEdit = mode === "edit" && Boolean(financingRequestId);
  const isLocked = isEdit && initialValues?.status && !canEditFinancingRequest(initialValues.status);

  const [requestedAmount, setRequestedAmount] = useState(
    defaultAmount > 0 ? String(defaultAmount) : ""
  );
  const [durationMonths, setDurationMonths] = useState("12");
  const [bankStatementPeriod, setBankStatementPeriod] = useState("6");
  const [selectedBankAccountId, setSelectedBankAccountId] = useState("");
  const [payslip, setPayslip] = useState<File | null>(null);
  const [bankStatement, setBankStatement] = useState<File | null>(null);
  const [dataConsent, setDataConsent] = useState(false);
  const [autoDebitConsent, setAutoDebitConsent] = useState(false);

  useEffect(() => {
    if (!open) return;
    const amount =
      initialValues?.requestedAmount != null
        ? String(initialValues.requestedAmount)
        : defaultAmount > 0
          ? String(defaultAmount)
          : "";
    setRequestedAmount(amount);
    setDurationMonths(String(initialValues?.durationMonths ?? 12));
    setBankStatementPeriod(parseBankStatementPeriod(initialValues?.notes));
    setSelectedBankAccountId("");
    setPayslip(null);
    setBankStatement(null);
    setDataConsent(false);
    setAutoDebitConsent(false);
  }, [open, defaultAmount, initialValues]);

  const { data: kyc } = useQuery({
    queryKey: ["kyc-status"],
    queryFn: async () => {
      const res = await fetch("/api/kyc");
      const json = await res.json();
      return json.data as {
        fullName?: string;
        contactName?: string;
        bankAccounts?: BankAccountOption[];
      };
    },
    enabled: open,
  });

  const verifiedBankAccounts = useMemo(
    () => kyc?.bankAccounts?.filter((account) => account.isVerified) ?? [],
    [kyc?.bankAccounts]
  );

  useEffect(() => {
    if (!open || selectedBankAccountId) return;
    if (verifiedBankAccounts.length === 1) {
      setSelectedBankAccountId(verifiedBankAccounts[0].id);
    }
  }, [open, selectedBankAccountId, verifiedBankAccounts]);

  const selectedBank = verifiedBankAccounts.find((account) => account.id === selectedBankAccountId);
  const accountHolderName = kyc?.fullName ?? kyc?.contactName ?? "Your name";

  const uploadFinancingDocument = async (file: File, documentType: string) => {
    const formData = new FormData();
    formData.append("document", file);
    formData.append("documentType", documentType);
    const res = await fetch("/api/buyer/financing-documents", {
      method: "POST",
      body: formData,
    });
    const json = await res.json();
    if (!json.success) {
      throw new Error(json.message ?? `Unable to upload ${documentType.toLowerCase()}.`);
    }
  };

  const buildPayload = (amount: number, duration: number) => ({
    requestedAmount: amount,
    durationMonths: duration,
    bankAccountId: selectedBankAccountId,
    bankStatementPeriodMonths: Number(bankStatementPeriod) as 6 | 12,
    notes: `Bank statement period: ${bankStatementPeriod} months. Auto-debit mandate requested for repayment over ${duration} months.`,
    autoDebitConsent: true as const,
    repaymentPreference: {
      preferredChannel: "BANK_MANDATE" as const,
      bankAccountId: selectedBankAccountId,
    },
    dataProcessingConsent: true as const,
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const amount = Number(requestedAmount);
      const duration = Number(durationMonths);
      if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error("Enter a valid financing amount.");
      }
      if (!REPAYMENT_OPTIONS.includes(duration as (typeof REPAYMENT_OPTIONS)[number])) {
        throw new Error("Select a valid repayment period.");
      }
      if (!selectedBankAccountId || !selectedBank) {
        throw new Error("Select a verified bank account for repayments.");
      }
      if (!isEdit && !payslip) {
        throw new Error("Upload your payslip to continue.");
      }
      if (!isEdit && !bankStatement) {
        throw new Error("Upload your bank statement to continue.");
      }
      if (!dataConsent) {
        throw new Error("You must consent to data processing to continue.");
      }
      if (!autoDebitConsent) {
        throw new Error("You must consent to automatic repayment deductions via bank mandate.");
      }

      if (payslip) await uploadFinancingDocument(payslip, "PAYSLIP");
      if (bankStatement) await uploadFinancingDocument(bankStatement, "BANK_STATEMENT");

      const payload = {
        ...buildPayload(amount, duration),
        propertyId,
        applicationId,
      };

      const res = await fetch(
        isEdit && financingRequestId ? `/api/financing/${financingRequestId}` : "/api/financing",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const json = await res.json();
      if (!json.success) {
        throw new Error(
          json.message ??
            json.errors?.[0]?.message ??
            json.data?.error ??
            `Unable to ${isEdit ? "update" : "submit"} financing request.`
        );
      }
      return json.data;
    },
    onSuccess: () => {
      toast.success(isEdit ? "Financing request updated" : "Pay-for-me request submitted");
      queryClient.invalidateQueries({ queryKey: ["financing"] });
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      onOpenChange(false);
      router.push("/dashboard/buyer/applications");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit financing request" : "Request financing"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? `Update your pay-for-me request for ${propertyName}. Changes are only allowed before any approval.`
              : `Submit your pay-for-me request for ${propertyName}. Repayments are collected only via bank mandate on the account you select below.`}
          </DialogDescription>
        </DialogHeader>

        {isLocked ? (
          <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-900 dark:text-amber-100">
            This request has already been reviewed and can no longer be edited.
          </p>
        ) : null}

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="financing-amount">Financing amount (GHS)</Label>
            <Input
              id="financing-amount"
              type="number"
              min={1}
              value={requestedAmount}
              disabled={isLocked}
              onChange={(event) => setRequestedAmount(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Repayment period</Label>
            <Select
              value={durationMonths}
              disabled={isLocked}
              onValueChange={setDurationMonths}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                {REPAYMENT_OPTIONS.map((months) => (
                  <SelectItem key={months} value={String(months)}>
                    {months} months
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Repayment bank account</Label>
            {verifiedBankAccounts.length ? (
              <Select
                value={selectedBankAccountId}
                disabled={isLocked}
                onValueChange={setSelectedBankAccountId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select bank account" />
                </SelectTrigger>
                <SelectContent>
                  {verifiedBankAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.bankName} · {account.accountNumberMasked}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
                <p className="font-medium text-amber-900 dark:text-amber-100">
                  No verified bank account
                </p>
                <p className="mt-1 text-amber-950/80 dark:text-amber-50/80">
                  Add and verify a bank account in Settings before requesting financing.
                </p>
                <Button asChild size="sm" className="mt-3" variant="outline">
                  <Link href="/dashboard/buyer/settings">Add bank account</Link>
                </Button>
              </div>
            )}
            {selectedBank ? (
              <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                <p className="font-medium">{accountHolderName}</p>
                <p className="text-muted-foreground">
                  {selectedBank.bankName} · {selectedBank.accountNumberMasked}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Repayments will be deducted from this account via bank mandate only.
                </p>
              </div>
            ) : null}
          </div>

          <DocumentCaptureInput
            label="Payslip"
            disabled={isLocked}
            value={payslip}
            onChange={setPayslip}
          />

          <div className="space-y-2">
            <Label>Bank statement period</Label>
            <Select
              value={bankStatementPeriod}
              disabled={isLocked}
              onValueChange={setBankStatementPeriod}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                {BANK_STATEMENT_PERIODS.map((period) => (
                  <SelectItem key={period.value} value={period.value}>
                    {period.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DocumentCaptureInput
            label="Bank statement"
            accept="image/*,.pdf"
            disabled={isLocked}
            value={bankStatement}
            onChange={setBankStatement}
          />

          <label className="flex items-start gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              className="mt-1"
              disabled={isLocked}
              checked={autoDebitConsent}
              onChange={(event) => setAutoDebitConsent(event.target.checked)}
            />
            <span>
              I authorize PayForMe to auto-generate a bank mandate so the financing amount is
              deducted from my selected account over the repayment period. My bank will receive the
              mandate PDF and implement the scheduled deductions.
            </span>
          </label>

          <label className="flex items-start gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              className="mt-1"
              disabled={isLocked}
              checked={dataConsent}
              onChange={(event) => setDataConsent(event.target.checked)}
            />
            <span>
              I consent to PayForMe collecting and processing my data, including these consents,
              to assess and manage this financing request.
            </span>
          </label>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            className="bg-amber-500 hover:bg-amber-600"
            disabled={isLocked || submitMutation.isPending || !verifiedBankAccounts.length}
            onClick={() => submitMutation.mutate()}
          >
            {submitMutation.isPending
              ? isEdit
                ? "Saving..."
                : "Submitting..."
              : isEdit
                ? "Save changes"
                : "Submit request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
