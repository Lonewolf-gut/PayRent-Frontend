"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { MANDATE_STATUS_LABELS } from "@/constants/platform";
import { SecureFileLink } from "@/components/shared/secure-file-link";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ExternalLink, FileDown, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { adminMandateToPreview, downloadMandatePdf } from "@/lib/utils/mandate-pdf";

type Mandate = {
  id: string;
  status: string;
  mandateSource: string;
  documentUrl?: string | null;
  createdAt: string;
  submittedAt?: string | null;
  tenant?: { fullName?: string; user?: { email: string } };
  bankAccount?: { bankName: string; accountNumberMasked?: string; accountName?: string };
  financingRequest?: {
    id: string;
    status: string;
    durationMonths: number;
    requestedAmount: number | string;
    approvedAmount?: number | string | null;
    offeredInterestRate?: number | string | null;
    buyerAcceptedAt?: string | null;
    property?: { name: string };
    feeDisclosure?: {
      principalAmount?: number | string;
      interestRate?: number | string;
      totalRepayable?: number | string;
      monthlyPayment?: number | string;
    } | null;
  } | null;
};

const REVIEW_STATUSES = new Set(["ADMIN_REVIEW", "PENDING_MANUAL_RESOLUTION"]);

export default function AdminMandatesPage() {
  const queryClient = useQueryClient();
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [filter, setFilter] = useState<"all" | "pending" | "active" | "draft">("all");

  const { data: mandates = [], isLoading } = useQuery({
    queryKey: ["admin-mandates"],
    queryFn: async () => {
      const res = await fetch("/api/mandates?scope=all");
      const json = await res.json();
      return (json.data ?? []) as Mandate[];
    },
  });

  const filteredMandates = useMemo(() => {
    switch (filter) {
      case "pending":
        return mandates.filter((mandate) => REVIEW_STATUSES.has(mandate.status));
      case "active":
        return mandates.filter((mandate) => mandate.status === "ACTIVE");
      case "draft":
        return mandates.filter((mandate) =>
          ["DRAFT", "PENDING_SUBMISSION"].includes(mandate.status)
        );
      default:
        return mandates;
    }
  }, [filter, mandates]);

  const pendingCount = mandates.filter((mandate) => REVIEW_STATUSES.has(mandate.status)).length;
  const activeCount = mandates.filter((mandate) => mandate.status === "ACTIVE").length;

  const reviewMutation = useMutation({
    mutationFn: async ({
      id,
      decision,
      rejectedReason,
    }: {
      id: string;
      decision: "APPROVE" | "REJECT";
      rejectedReason?: string;
    }) => {
      const res = await fetch(`/api/mandates/${id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, rejectedReason }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
    },
    onSuccess: () => {
      toast.success("Mandate reviewed");
      setRejectId(null);
      setRejectReason("");
      queryClient.invalidateQueries({ queryKey: ["admin-mandates"] });
      queryClient.invalidateQueries({ queryKey: ["sidebar-badge"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const syncMutation = useMutation({
    mutationFn: async (mandateId: string) => {
      const res = await fetch(`/api/mandates/${mandateId}/status`);
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
    },
    onSuccess: () => {
      toast.success("Bank status refreshed");
      queryClient.invalidateQueries({ queryKey: ["admin-mandates"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mandates</h1>
        <p className="text-muted-foreground">
          All buyer repayment mandates generated on the platform. Review scanned uploads, resolve
          bank exceptions, and track active mandates.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-muted-foreground">Total mandates</p>
            <p className="text-2xl font-bold">{mandates.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-muted-foreground">Pending review</p>
            <p className="text-2xl font-bold text-amber-600">{pendingCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-muted-foreground">Active</p>
            <p className="text-2xl font-bold text-emerald-600">{activeCount}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["all", "All"],
            ["pending", "Pending review"],
            ["active", "Active"],
            ["draft", "Draft"],
          ] as const
        ).map(([value, label]) => (
          <Button
            key={value}
            type="button"
            size="sm"
            variant={filter === value ? "default" : "outline"}
            className={filter === value ? "bg-emerald-600 hover:bg-emerald-700" : undefined}
            onClick={() => setFilter(value)}
          >
            {label}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : !filteredMandates.length ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {mandates.length
              ? "No mandates match this filter."
              : "No mandates have been generated yet."}
          </CardContent>
        </Card>
      ) : (
        <Accordion type="single" collapsible className="divide-y divide-border rounded-xl border">
          {filteredMandates.map((mandate) => {
            const buyerName = mandate.tenant?.fullName ?? mandate.tenant?.user?.email ?? "Buyer";
            const propertyName =
              mandate.financingRequest?.property?.name?.replace(/^\[Demo\]\s*/i, "") ??
              "Financing mandate";
            const principal = mandate.financingRequest?.feeDisclosure?.principalAmount;
            const totalRepayable = mandate.financingRequest?.feeDisclosure?.totalRepayable;

            return (
              <AccordionItem key={mandate.id} value={mandate.id} className="border-0 px-4">
                <AccordionTrigger className="py-4 hover:no-underline">
                  <div className="flex flex-1 flex-col gap-2 pr-2 text-left sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-foreground">{buyerName}</p>
                      <p className="truncate text-sm text-muted-foreground">{propertyName}</p>
                      <p className="text-xs text-muted-foreground">
                        {mandate.mandateSource.replace("_", " ")} ·{" "}
                        {new Date(mandate.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <StatusBadge
                      status={mandate.status}
                      label={MANDATE_STATUS_LABELS[mandate.status] ?? mandate.status}
                    />
                  </div>
                </AccordionTrigger>

                <AccordionContent className="pb-4">
                  <div className="space-y-4 rounded-xl border border-border bg-muted/10 p-4">
                    <dl className="grid gap-3 text-sm sm:grid-cols-2">
                      <Detail label="Buyer email" value={mandate.tenant?.user?.email ?? "—"} />
                      <Detail label="Bank" value={mandate.bankAccount?.bankName ?? "—"} />
                      <Detail
                        label="Account"
                        value={mandate.bankAccount?.accountNumberMasked ?? "—"}
                      />
                      <Detail
                        label="Account name"
                        value={mandate.bankAccount?.accountName ?? "—"}
                      />
                      <Detail label="Source" value={mandate.mandateSource.replace("_", " ")} />
                      <Detail
                        label="Created"
                        value={new Date(mandate.createdAt).toLocaleString()}
                      />
                      {principal != null ? (
                        <Detail
                          label="Financed amount"
                          value={`GHS ${Number(principal).toLocaleString()}`}
                        />
                      ) : null}
                      {totalRepayable != null ? (
                        <Detail
                          label="Total repayable"
                          value={`GHS ${Number(totalRepayable).toLocaleString()}`}
                        />
                      ) : null}
                    </dl>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          try {
                            await downloadMandatePdf(adminMandateToPreview(mandate));
                          } catch {
                            toast.error("Could not generate mandate PDF");
                          }
                        }}
                      >
                        <FileDown className="mr-2 h-4 w-4" />
                        Download mandate PDF
                      </Button>

                      {mandate.documentUrl ? (
                        <Button asChild size="sm" variant="outline">
                          <SecureFileLink request={{ scope: "mandate", mandateId: mandate.id }}>
                            <ExternalLink className="mr-2 h-4 w-4" />
                            View uploaded document
                          </SecureFileLink>
                        </Button>
                      ) : (
                        <p className="flex items-center text-xs text-muted-foreground">
                          No scanned upload yet.
                        </p>
                      )}
                    </div>

                    {rejectId === mandate.id ? (
                      <div className="space-y-2 rounded-lg border p-4">
                        <Label htmlFor={`reject-${mandate.id}`}>Rejection reason</Label>
                        <Input
                          id={`reject-${mandate.id}`}
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          placeholder="Explain why the mandate was rejected"
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={reviewMutation.isPending}
                            onClick={() =>
                              reviewMutation.mutate({
                                id: mandate.id,
                                decision: "REJECT",
                                rejectedReason: rejectReason || "Rejected by administrator",
                              })
                            }
                          >
                            Confirm reject
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setRejectId(null)}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {REVIEW_STATUSES.has(mandate.status) ? (
                          <>
                            <Button
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-700"
                              disabled={reviewMutation.isPending}
                              onClick={() =>
                                reviewMutation.mutate({ id: mandate.id, decision: "APPROVE" })
                              }
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => setRejectId(mandate.id)}
                            >
                              Reject
                            </Button>
                          </>
                        ) : null}
                        {mandate.status === "BANK_PROCESSING" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={syncMutation.isPending}
                            onClick={() => syncMutation.mutate(mandate.id)}
                          >
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Poll bank status
                          </Button>
                        ) : null}
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium text-foreground">{value}</dd>
    </div>
  );
}
