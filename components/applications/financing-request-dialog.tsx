"use client";

import { useEffect, useState } from "react";
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
import { isSaleListing } from "@/lib/subscription-limits";
import type { PropertyType, TenantFinancingDocType } from "@prisma/client";

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
  const [months, setMonths] = useState("12");
  const [monthlyIncome, setMonthlyIncome] = useState("");
  const [financingConsent, setFinancingConsent] = useState(false);
  const [preferredChannel, setPreferredChannel] = useState<
    "BANK_MANDATE" | "WALLET" | "MOBILE_MONEY"
  >("BANK_MANDATE");
  const [preferredPaymentDay, setPreferredPaymentDay] = useState("1");
  const [contactPhone, setContactPhone] = useState("");
  const [docFiles, setDocFiles] = useState<Partial<Record<TenantFinancingDocType, File>>>({});
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

  const { data: financingDocs } = useQuery({
    queryKey: ["tenant-financing-docs"],
    queryFn: async () => {
      const res = await fetch("/api/buyer/financing-documents");
      const json = await res.json();
      return json.data as {
        allApproved: boolean;
        requiredTypes: TenantFinancingDocType[];
        documents: Array<{ documentType: TenantFinancingDocType; status: string }>;
      };
    },
    enabled: open,
  });

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
    if (!open) {
      setConfirmOpen(false);
    }
  }, [open]);

  const requiredDocTypes = financingDocs?.requiredTypes ?? ["PAYSLIP", "BANK_STATEMENT"];
  const docsByType = new Map(
    (financingDocs?.documents ?? []).map((doc) => [doc.documentType, doc])
  );

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!financingConsent) {
        throw new Error("You must consent to data collection and processing for financing.");
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

      const missingUploads = requiredDocTypes.filter((type) => {
        const existing = docsByType.get(type);
        const hasApproved = existing?.status === "APPROVED";
        return !hasApproved && !docFiles[type];
      });

      if (missingUploads.length > 0) {
        throw new Error(
          `Upload: ${missingUploads.map((t) => FINANCING_DOC_LABELS[t]).join(", ")}`
        );
      }

      for (const type of requiredDocTypes) {
        const existing = docsByType.get(type);
        if (existing?.status === "APPROVED") continue;
        const file = docFiles[type];
        if (!file) continue;

        const formData = new FormData();
        formData.append("documentType", type);
        formData.append("document", file);
        const uploadRes = await fetch("/api/buyer/financing-documents", {
          method: "POST",
          body: formData,
        });
        const uploadJson = await uploadRes.json();
        if (!uploadJson.success) {
          throw new Error(uploadJson.message ?? uploadJson.error ?? "Document upload failed");
        }
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
            preferredChannel,
            preferredPaymentDay: parseInt(preferredPaymentDay, 10),
            contactPhone: contactPhone || undefined,
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

      return property?.name as string;
    },
    onSuccess: (propertyName) => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      queryClient.invalidateQueries({ queryKey: ["financing"] });
      queryClient.invalidateQueries({ queryKey: ["tenant-financing-docs"] });
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
    setFinancingConsent(false);
  };

  if (existingFinancing && open) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="rounded-none sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Pay-for-Me request already submitted</DialogTitle>
            <DialogDescription>
              You already have a financing request for this listing. Track its status in your
              applications list below.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button className="rounded-none" onClick={() => onOpenChange(false)}>
              Close
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
                ? "Request Pay-for-Me financing"
                : `Request Pay-for-Me financing${property?.name ? ` — ${property.name}` : ""}`}
            </DialogTitle>
            <DialogDescription>
              Fill in your details and upload your payslip and bank statement.
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
                      placeholder="Tell the merchant about yourself"
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

              <div className="space-y-3 border-t pt-4">
                <p className="text-sm font-medium">Financing documents</p>
                {requiredDocTypes.map((type) => {
                  const existing = docsByType.get(type);
                  const approved = existing?.status === "APPROVED";
                  return (
                    <div key={type} className="space-y-2">
                      <Label htmlFor={`fin-doc-${type}`}>
                        {FINANCING_DOC_LABELS[type]}
                        {approved ? " (approved)" : ""}
                      </Label>
                      {!approved ? (
                        <Input
                          id={`fin-doc-${type}`}
                          type="file"
                          accept=".pdf,image/*"
                          className="rounded-none"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setDocFiles((prev) => ({ ...prev, [type]: file }));
                            }
                            e.target.value = "";
                          }}
                        />
                      ) : null}
                      {docFiles[type] ? (
                        <p className="text-xs text-muted-foreground">
                          Selected: {docFiles[type]?.name}
                        </p>
                      ) : null}
                    </div>
                  );
                })}
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
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              className="rounded-none"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              className="rounded-none bg-emerald-600 hover:bg-emerald-700"
              disabled={
                !amount ||
                !financingConsent ||
                submitMutation.isPending ||
                propertyLoading ||
                Boolean(existingFinancing)
              }
              onClick={() => submitMutation.mutate()}
            >
              {submitMutation.isPending ? "Submitting…" : "Submit financing request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="rounded-none sm:max-w-md" showCloseButton={false}>
          <DialogHeader className="items-center text-center">
            <CheckCircle2 className="mb-2 size-12 text-emerald-600" />
            <DialogTitle>Financing request submitted</DialogTitle>
            <DialogDescription>
              Your Pay-for-Me request for {submittedPropertyName} has been submitted. The merchant
              and admin will review it in order — track progress in your applications list. The
              process stops before your bank mandate is sent.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center">
            <Button
              className="rounded-none bg-emerald-600 hover:bg-emerald-700"
              onClick={handleConfirmClose}
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
