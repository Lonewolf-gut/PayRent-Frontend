"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { FINANCING_DOC_LABELS } from "@/lib/constants/financing-docs";
import {
  DEFAULT_REPAYMENT_MONTHS,
  REPAYMENT_PERIOD_OPTIONS,
} from "@/lib/constants/financing-repayment";
import { isSaleListing } from "@/lib/subscription-limits";
import type { PropertyType, TenantFinancingDocType } from "@prisma/client";

type BankAccount = {
  id: string;
  bankName: string;
  accountNumberMasked?: string | null;
  accountName: string;
  isVerified: boolean;
  isDefault?: boolean;
};

type FinancingRequestDialogProps = {
  propertyId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmitted?: () => void;
};

type ApplicationRecord = {
  id: string;
  propertyId: string;
  status: string;
};

export function FinancingRequestDialog({
  propertyId,
  open,
  onOpenChange,
  onSubmitted,
}: FinancingRequestDialogProps) {
  const queryClient = useQueryClient();
  const [moveInDate, setMoveInDate] = useState("");
  const [notes, setNotes] = useState("");
  const [amount, setAmount] = useState("");
  const [months, setMonths] = useState(String(DEFAULT_REPAYMENT_MONTHS));
  const [monthlyIncome, setMonthlyIncome] = useState("");
  const [dataConsent, setDataConsent] = useState(false);
  const [mandateConsent, setMandateConsent] = useState(false);
  const [bankAccountId, setBankAccountId] = useState("");
  const [docFiles, setDocFiles] = useState<Partial<Record<TenantFinancingDocType, File>>>({});
  const [verificationCardNumber, setVerificationCardNumber] = useState("");
  const [staffIdNumber, setStaffIdNumber] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submittedPropertyName, setSubmittedPropertyName] = useState("");

  const { data: property, isLoading: propertyLoading } = useQuery({
    queryKey: ["property", propertyId],
    queryFn: async () => {
      const res = await fetch(`/api/properties/${propertyId}`);
      const json = await res.json();
      return json.data;
    },
    enabled: open && Boolean(propertyId),
  });

  const { data: bankData } = useQuery({
    queryKey: ["settings-bank-accounts"],
    queryFn: async () => {
      const res = await fetch("/api/settings");
      const json = await res.json();
      return json.data as { bankAccounts?: BankAccount[] };
    },
    enabled: open,
  });

  const verifiedAccounts = (bankData?.bankAccounts ?? []).filter((a) => a.isVerified);

  const { data: applications = [] } = useQuery({
    queryKey: ["applications"],
    queryFn: async () => {
      const res = await fetch("/api/applications");
      const json = await res.json();
      return (json.data ?? []) as ApplicationRecord[];
    },
    enabled: open,
  });

  const { data: financingRequests = [] } = useQuery({
    queryKey: ["financing"],
    queryFn: async () => {
      const res = await fetch("/api/financing");
      const json = await res.json();
      return json.data ?? [];
    },
    enabled: open,
  });

  const { data: kycStatus } = useQuery({
    queryKey: ["kyc-status"],
    queryFn: async () => {
      const res = await fetch("/api/kyc");
      const json = await res.json();
      return json.data as {
        nationalId?: string | null;
        staffId?: string | null;
        identityVerified?: boolean;
      } | null;
    },
    enabled: open,
  });

  const existingFinancing = financingRequests.find(
    (req: { propertyId: string; status: string }) =>
      req.propertyId === propertyId && req.status !== "CREATED"
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

  useEffect(() => {
    if (!open) setConfirmOpen(false);
  }, [open]);

  useEffect(() => {
    if (!verifiedAccounts.length) return;
    const defaultAccount =
      verifiedAccounts.find((a) => a.isDefault) ?? verifiedAccounts[0];
    if (defaultAccount && !bankAccountId) {
      setBankAccountId(defaultAccount.id);
    }
  }, [verifiedAccounts, bankAccountId]);

  const requiredDocTypes: TenantFinancingDocType[] = ["PAYSLIP", "BANK_STATEMENT"];

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!dataConsent) {
        throw new Error("You must consent to data processing for this financing request.");
      }
      if (!mandateConsent) {
        throw new Error(
          "You must consent to scheduled repayments being debited from your bank account."
        );
      }
      if (!verifiedAccounts.length) {
        throw new Error("Add and verify a bank account in Settings before submitting.");
      }
      if (!bankAccountId) {
        throw new Error("Select the bank account that will be debited for repayments.");
      }
      if (kycStatus?.nationalId) {
        if (!verificationCardNumber.trim()) {
          throw new Error("Enter your verification card number to match your KYC profile.");
        }
        if (
          verificationCardNumber.trim().toUpperCase() !==
          kycStatus.nationalId.trim().toUpperCase()
        ) {
          throw new Error("Verification card number does not match your KYC profile.");
        }
      }
      if (kycStatus?.staffId) {
        if (!staffIdNumber.trim()) {
          throw new Error("Enter your Staff ID number to match your KYC profile.");
        }
        if (staffIdNumber.trim() !== kycStatus.staffId.trim()) {
          throw new Error("Staff ID number does not match your KYC profile.");
        }
      }
      if (existingFinancing) {
        throw new Error("You already have a Pay-for-Me request for this listing.");
      }

      let application = applications.find((app) => app.propertyId === propertyId);

      if (!application) {
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
        if (!json.success) {
          throw new Error(json.message ?? json.errors?.[0]?.message ?? "Application failed");
        }
        application = json.data as ApplicationRecord;
      }

      const missingUploads = requiredDocTypes.filter((type) => !docFiles[type]);
      if (missingUploads.length > 0) {
        throw new Error(
          `Upload: ${missingUploads.map((t) => FINANCING_DOC_LABELS[t]).join(", ")}`
        );
      }

      const financeRes = await fetch("/api/financing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId,
          applicationId: application?.id,
          requestedAmount: parseFloat(amount),
          durationMonths: parseInt(months, 10),
          monthlyIncome: monthlyIncome ? parseFloat(monthlyIncome) : undefined,
          repaymentPreference: {
            preferredChannel: "BANK_MANDATE",
            preferredPaymentDay: 1,
            bankAccountId,
            mandateDebitConsent: true,
          },
          dataProcessingConsent: true,
        }),
      });
      const financeJson = await financeRes.json();
      if (!financeJson.success) {
        throw new Error(
          financeJson.message ??
            financeJson.data?.error ??
            financeJson.errors?.[0]?.message ??
            "Financing request failed"
        );
      }

      const financingRequestId = financeJson.data?.id as string;
      if (!financingRequestId) {
        throw new Error("Financing request could not be created.");
      }

      for (const type of requiredDocTypes) {
        const file = docFiles[type];
        if (!file) continue;

        const formData = new FormData();
        formData.append("documentType", type);
        formData.append("document", file);
        const uploadRes = await fetch(`/api/financing/${financingRequestId}/documents`, {
          method: "POST",
          body: formData,
        });
        const uploadJson = await uploadRes.json();
        if (!uploadJson.success) {
          throw new Error(uploadJson.message ?? uploadJson.error ?? "Document upload failed");
        }
      }

      return property?.name as string;
    },
    onSuccess: (propertyName) => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      queryClient.invalidateQueries({ queryKey: ["financing"] });
      queryClient.invalidateQueries({ queryKey: ["buyer-financing-documents"] });
      queryClient.invalidateQueries({ queryKey: ["mandate-overview"] });
      queryClient.invalidateQueries({ queryKey: ["mandates"] });
      onOpenChange(false);
      setSubmittedPropertyName(propertyName ?? "this listing");
      setConfirmOpen(true);
      onSubmitted?.();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleConfirmClose = () => {
    setConfirmOpen(false);
    setDocFiles({});
    setDataConsent(false);
    setMandateConsent(false);
    setVerificationCardNumber("");
    setStaffIdNumber("");
  };

  const selectedBank = verifiedAccounts.find((a) => a.id === bankAccountId);
  const requiresVerificationCard = Boolean(kycStatus?.nationalId);
  const requiresStaffId = Boolean(kycStatus?.staffId);
  const canSubmit =
    Boolean(amount) &&
    dataConsent &&
    mandateConsent &&
    verifiedAccounts.length > 0 &&
    Boolean(bankAccountId) &&
    (!requiresVerificationCard || Boolean(verificationCardNumber.trim())) &&
    (!requiresStaffId || Boolean(staffIdNumber.trim())) &&
    !submitMutation.isPending &&
    !propertyLoading &&
    !existingFinancing;

  if (existingFinancing && open) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="rounded-none sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Pay-for-Me request already submitted</DialogTitle>
            <DialogDescription>
              Track this request on your Pay-for-Me dashboard.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button asChild className="rounded-none bg-emerald-600 hover:bg-emerald-700">
              <Link href="/dashboard/buyer/financing">View my requests</Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-none sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {propertyLoading
                ? "Submit pay-for-me request"
                : `Submit pay-for-me request${property?.name ? ` — ${property.name.replace(/^\[Demo\]\s*/i, "")}` : ""}`}
            </DialogTitle>
            <DialogDescription>
              Confirm your identity details from KYC, upload supporting documents, and choose your
              repayment bank account. Your mandate is generated after a lender sets your rate.
            </DialogDescription>
          </DialogHeader>

          {propertyLoading ? (
            <p className="text-sm text-muted-foreground">Loading listing…</p>
          ) : (
            <div className="space-y-4">
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
                    />
                  </div>
                </>
              ) : null}

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
                <Label>Repayment period</Label>
                <Select value={months} onValueChange={setMonths}>
                  <SelectTrigger className="rounded-none">
                    <SelectValue placeholder="Choose repayment period" />
                  </SelectTrigger>
                  <SelectContent>
                    {REPAYMENT_PERIOD_OPTIONS.map((option) => (
                      <SelectItem key={option.months} value={String(option.months)}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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

              <div className="space-y-2 border-t pt-4">
                <Label>Repayment bank account</Label>
                {!verifiedAccounts.length ? (
                  <div className="rounded-none border border-amber-200 bg-amber-50/50 p-3 text-sm">
                    <p className="text-amber-950">
                      Add and verify a bank account before you can submit a financing request.
                    </p>
                    <Button asChild size="sm" className="mt-2 rounded-none" variant="outline">
                      <Link href="/dashboard/buyer/settings">Add bank account</Link>
                    </Button>
                  </div>
                ) : (
                  <>
                    <Select value={bankAccountId} onValueChange={setBankAccountId}>
                      <SelectTrigger className="rounded-none">
                        <SelectValue placeholder="Select bank account" />
                      </SelectTrigger>
                      <SelectContent>
                        {verifiedAccounts.map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.bankName} · {account.accountNumberMasked ?? "****"} ·{" "}
                            {account.accountName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedBank ? (
                      <p className="text-xs text-muted-foreground">
                        Scheduled repayments will be debited from this account for the duration
                        you selected.
                      </p>
                    ) : null}
                  </>
                )}
              </div>

              <div className="space-y-3 border-t pt-4">
                <p className="text-sm font-medium">Identity cross-check</p>
                <p className="text-xs text-muted-foreground">
                  Re-enter details exactly as saved in your KYC profile so we can verify it is you.
                </p>
                {requiresVerificationCard ? (
                  <div>
                    <Label>Verification card number (Ghana Card)</Label>
                    <Input
                      className="rounded-none"
                      value={verificationCardNumber}
                      onChange={(e) => setVerificationCardNumber(e.target.value)}
                      placeholder="Must match your KYC profile"
                    />
                  </div>
                ) : (
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    Complete identity verification in KYC to enable card number cross-check.
                  </p>
                )}
                {requiresStaffId ? (
                  <div>
                    <Label>Staff ID number</Label>
                    <Input
                      className="rounded-none"
                      value={staffIdNumber}
                      onChange={(e) => setStaffIdNumber(e.target.value)}
                      placeholder="Must match your KYC profile"
                    />
                  </div>
                ) : null}
              </div>

              <div className="space-y-3 border-t pt-4">
                <p className="text-sm font-medium">Supporting documents</p>
                {requiredDocTypes.map((type) => (
                  <div key={type} className="space-y-2">
                    <Label htmlFor={`fin-doc-${type}`}>
                      {type === "BANK_STATEMENT"
                        ? "Bank statement (6–12 months)"
                        : FINANCING_DOC_LABELS[type]}
                    </Label>
                    <Input
                      id={`fin-doc-${type}`}
                      type="file"
                      accept=".pdf,image/*"
                      className="rounded-none"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) setDocFiles((prev) => ({ ...prev, [type]: file }));
                        e.target.value = "";
                      }}
                    />
                    {docFiles[type] ? (
                      <p className="text-xs text-muted-foreground">
                        Selected: {docFiles[type]?.name}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>

              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={dataConsent}
                  onChange={(e) => setDataConsent(e.target.checked)}
                />
                <span>I consent to PayForMe processing my data for this financing request.</span>
              </label>

              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={mandateConsent}
                  onChange={(e) => setMandateConsent(e.target.checked)}
                />
                <span>
                  I consent to scheduled repayments being automatically debited from my selected
                  bank account for the full repayment period.
                </span>
              </label>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" className="rounded-none" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              className="rounded-none bg-emerald-600 hover:bg-emerald-700"
              disabled={!canSubmit}
              onClick={() => submitMutation.mutate()}
            >
              {submitMutation.isPending ? "Submitting…" : "Submit pay-for-me request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="rounded-none sm:max-w-md" showCloseButton={false}>
          <DialogHeader className="items-center text-center">
            <CheckCircle2 className="mb-2 size-12 text-emerald-600" />
            <DialogTitle>Pay-for-Me request submitted</DialogTitle>
            <DialogDescription>
              Your request for {submittedPropertyName.replace(/^\[Demo\]\s*/i, "")} was sent for
              review. Your mandate will appear after a lender sets your rate.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center sm:flex-col sm:gap-2">
            <Button asChild className="rounded-none bg-emerald-600 hover:bg-emerald-700">
              <Link href="/dashboard/buyer/mandates" onClick={handleConfirmClose}>
                View mandates
              </Link>
            </Button>
            <Button asChild variant="outline" className="rounded-none">
              <Link href="/dashboard/buyer/financing" onClick={handleConfirmClose}>
                View my requests
              </Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
