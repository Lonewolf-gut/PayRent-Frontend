"use client";

import { useState } from "react";
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
import { toast } from "sonner";

const REPAYMENT_OPTIONS = [3, 6, 12, 18, 24, 30, 36, 42, 48] as const;

type FinancingRequestDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string;
  applicationId?: string;
  propertyName: string;
  defaultAmount: number;
};

export function FinancingRequestDialog({
  open,
  onOpenChange,
  propertyId,
  applicationId,
  propertyName,
  defaultAmount,
}: FinancingRequestDialogProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [requestedAmount, setRequestedAmount] = useState(
    defaultAmount > 0 ? String(defaultAmount) : ""
  );
  const [durationMonths, setDurationMonths] = useState("12");
  const [payslip, setPayslip] = useState<File | null>(null);
  const [consent, setConsent] = useState(false);

  const { data: kyc } = useQuery({
    queryKey: ["kyc-status"],
    queryFn: async () => {
      const res = await fetch("/api/kyc");
      const json = await res.json();
      return json.data as {
        fullName?: string;
        contactName?: string;
        bankAccounts?: {
          id: string;
          bankName: string;
          accountNumberMasked?: string;
          isVerified: boolean;
        }[];
      };
    },
    enabled: open,
  });

  const verifiedBank = kyc?.bankAccounts?.find((account) => account.isVerified);
  const accountHolderName = kyc?.fullName ?? kyc?.contactName ?? "Your name";

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
      if (!payslip) {
        throw new Error("Upload your payslip to continue.");
      }
      if (!verifiedBank) {
        throw new Error("Add and verify a bank account in Settings before requesting financing.");
      }
      if (!consent) {
        throw new Error("You must consent to data processing to continue.");
      }

      const payslipForm = new FormData();
      payslipForm.append("document", payslip);
      payslipForm.append("documentType", "PAYSLIP");
      const payslipRes = await fetch("/api/buyer/financing-documents", {
        method: "POST",
        body: payslipForm,
      });
      const payslipJson = await payslipRes.json();
      if (!payslipJson.success) {
        throw new Error(payslipJson.message ?? "Unable to upload payslip.");
      }

      const res = await fetch("/api/financing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId,
          applicationId,
          requestedAmount: amount,
          durationMonths: duration,
          dataProcessingConsent: true,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        throw new Error(
          json.message ??
            json.errors?.[0]?.message ??
            json.data?.error ??
            "Unable to submit financing request."
        );
      }
      return json.data;
    },
    onSuccess: () => {
      toast.success("Pay-for-me request submitted");
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
          <DialogTitle>Request financing</DialogTitle>
          <DialogDescription>
            Submit your pay-for-me request for {propertyName}. Your bank details are taken from
            your profile settings.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="financing-amount">Financing amount (GHS)</Label>
            <Input
              id="financing-amount"
              type="number"
              min={1}
              value={requestedAmount}
              onChange={(event) => setRequestedAmount(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Repayment period</Label>
            <Select value={durationMonths} onValueChange={setDurationMonths}>
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

          <div className="rounded-lg border bg-muted/30 p-3 text-sm">
            <p className="font-medium">{accountHolderName}</p>
            {verifiedBank ? (
              <p className="text-muted-foreground">
                {verifiedBank.bankName} · {verifiedBank.accountNumberMasked}
              </p>
            ) : (
              <p className="text-amber-700">
                No verified bank account found. Add one in Settings before submitting.
              </p>
            )}
          </div>

          <DocumentCaptureInput label="Payslip" value={payslip} onChange={setPayslip} />

          <label className="flex items-start gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              className="mt-1"
              checked={consent}
              onChange={(event) => setConsent(event.target.checked)}
            />
            <span>
              I consent to PayForMe collecting and processing my data to assess and manage this
              financing request, including bank mandate setup for repayments.
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
            disabled={submitMutation.isPending}
            onClick={() => submitMutation.mutate()}
          >
            {submitMutation.isPending ? "Submitting..." : "Submit request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
