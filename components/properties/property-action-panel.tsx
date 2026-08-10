"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { Wallet, CreditCard, MessageSquare, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/dashboard/status-badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { APPLICATION_STATUS_LABELS } from "@/constants/platform";
import { toast } from "sonner";

type PropertyActionPanelProps = {
  propertyId: string;
  propertyName: string;
  isSale: boolean;
  purchasePrice: number;
  walletBalance: number;
  monthlyRent: number;
  annualRent?: number;
  propertyStatus: string;
  fullyVerified: boolean;
  financingDocsApproved: boolean;
  financingDocsPending: boolean;
  approvedApplication?: {
    id: string;
    propertyId?: string;
    financingRequests?: { id: string }[];
  } | null;
  propertyApplication?: {
    id: string;
    status: string;
    financingRequests?: { id: string }[];
  } | null;
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
  annualRent,
  propertyStatus,
  fullyVerified,
  financingDocsApproved,
  financingDocsPending,
  approvedApplication,
  propertyApplication,
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
            <Button
              className="w-full rounded-none bg-emerald-600 hover:bg-emerald-700"
              disabled={
                isSale ? purchaseMutation.isPending : rentPaymentMutation.isPending
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
            <Accordion>
              <AccordionItem value="financing" className="border-0">
                <CardHeader className="pb-0">
                  <AccordionTrigger className="py-0 hover:no-underline">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <CreditCard className="size-5" />
                      Request for financing
                    </CardTitle>
                  </AccordionTrigger>
                </CardHeader>
                <AccordionContent>
                  <CardContent className="space-y-4 pt-4">
              {!fullyVerified ? (
                <div className="space-y-3 border border-amber-500/30 bg-amber-500/10 p-4 text-sm">
                  <div className="flex items-start gap-2">
                    <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                    <p className="text-foreground">
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
                  {approvedApplication && !approvedApplication.financingRequests?.length ? (
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">
                        Your application is approved. Submit your pay-for-me request from your
                        financing dashboard.
                      </p>
                      <Button className="w-full rounded-none bg-emerald-600 hover:bg-emerald-700" asChild>
                        <Link
                          href={`/dashboard/buyer/financing?propertyId=${propertyId}&applicationId=${approvedApplication.id}`}
                        >
                          Submit pay-for-me request
                        </Link>
                      </Button>
                    </div>
                  ) : approvedApplication?.financingRequests?.length ? (
                    <>
                      <p className="text-sm text-muted-foreground">
                        You already submitted a pay-for-me request for this listing.
                      </p>
                      <Button className="w-full rounded-none bg-emerald-600 hover:bg-emerald-700" asChild>
                        <Link href="/dashboard/buyer/financing">Track financing request</Link>
                      </Button>
                    </>
                  ) : (
                    <>
                      {propertyApplication && propertyApplication.status !== "APPROVED" ? (
                        <div className="space-y-2">
                          <StatusBadge
                            status={propertyApplication.status}
                            label={
                              APPLICATION_STATUS_LABELS[propertyApplication.status] ??
                              propertyApplication.status
                            }
                          />
                          <p className="text-sm text-muted-foreground">
                            Your property application is{" "}
                            {APPLICATION_STATUS_LABELS[propertyApplication.status]?.toLowerCase() ??
                              "pending"}
                            . Pay-for-me financing unlocks once the merchant approves your
                            application for this listing.
                          </p>
                          <Button className="w-full rounded-none" variant="outline" asChild>
                            <Link href="/dashboard/buyer/applications">View application status</Link>
                          </Button>
                        </div>
                      ) : (
                        <>
                          <p className="text-sm text-muted-foreground">
                            Your financing documents are approved. Next, submit an application for
                            this property below. Once the merchant approves it, you can request
                            pay-for-me financing here.
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Financing documents and property applications are separate steps.
                          </p>
                        </>
                      )}
                    </>
                  )}
                </div>
              ) : financingDocsPending ? (
                <div className="space-y-3">
                  <StatusBadge status="PENDING" label="Documents under review" />
                  <p className="text-sm text-muted-foreground">
                    Your documents have been sent for review. We will notify you when you can
                    continue with a financing request.
                  </p>
                  <Button className="w-full rounded-none" variant="outline" asChild>
                    <Link href="/dashboard/buyer/financing-documents">View document status</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Need help paying upfront? Upload your financing documents on your dashboard to
                    request Pay for Rent for this listing.
                  </p>
                  <Button className="w-full rounded-none bg-emerald-600 hover:bg-emerald-700" asChild>
                    <Link href="/dashboard/buyer/financing-documents">
                      Request for financing
                    </Link>
                  </Button>
                </div>
              )}
                  </CardContent>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
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
                disabled={
                  applyMutation.isPending ||
                  propertyApplication?.status === "APPROVED" ||
                  propertyApplication?.status === "SUBMITTED" ||
                  propertyApplication?.status === "UNDER_REVIEW"
                }
                onClick={() => applyMutation.mutate()}
              >
                {propertyApplication?.status === "APPROVED"
                  ? "Application approved"
                  : propertyApplication?.status === "SUBMITTED" ||
                      propertyApplication?.status === "UNDER_REVIEW"
                    ? "Application pending review"
                    : propertyApplication?.status === "REJECTED"
                      ? "Application not approved"
                      : "Submit application"}
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
