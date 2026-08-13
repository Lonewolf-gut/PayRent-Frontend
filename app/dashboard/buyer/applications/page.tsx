"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { APPLICATION_STATUS_LABELS } from "@/constants/platform";
import { useMarkNavSectionSeen } from "@/hooks/use-mark-nav-section-seen";
import { SecureFileLink } from "@/components/shared/secure-file-link";
import { DocumentCaptureInput } from "@/components/shared/document-capture-input";
import { FinancingRequestDialog } from "@/components/financing/financing-request-dialog";
import {
  ApplicationProgressSteps,
  FinancingProgressSteps,
} from "@/components/financing/financing-progress-steps";
import {
  canEditFinancingRequest,
  canSubmitFinancingRequest,
  getFinancingStatusLabel,
} from "@/lib/financing/status-flow";

type ApplicationDocument = {
  id: string;
  fileName: string;
};

type FinancingRequestItem = {
  id: string;
  status: string;
  applicationId?: string | null;
  propertyId: string;
  requestedAmount?: number | string;
  durationMonths?: number;
  notes?: string | null;
};

type ApplicationItem = {
  id: string;
  propertyId: string;
  status: string;
  decisionReason?: string | null;
  requestedMoveInDate?: string;
  financingRequests?: FinancingRequestItem[];
  documents?: ApplicationDocument[];
  property?: {
    name: string;
    location: string;
    monthlyRent?: number | string;
    annualRent?: number | string | null;
  };
  paymentMethod?: "CASH" | "FINANCING" | null;
  paymentLabel?: string | null;
};

type FinancingDialogState = {
  mode: "create" | "edit";
  propertyId: string;
  applicationId: string;
  propertyName: string;
  defaultAmount: number;
  financingRequestId?: string;
  initialValues?: FinancingRequestItem;
};

function ClarificationResponseForm({ application }: { application: ApplicationItem }) {
  const queryClient = useQueryClient();
  const [responseNote, setResponseNote] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("document", file);
      formData.append("documentType", "CLARIFICATION");

      const res = await fetch(`/api/applications/${application.id}/documents`, {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.message ?? "Unable to upload document");
      }
      return json.data;
    },
    onSuccess: () => {
      toast.success("Document uploaded");
      setSelectedFile(null);
      queryClient.invalidateQueries({ queryKey: ["applications"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const respondMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/applications/${application.id}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          responseNote: responseNote.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.message ?? "Unable to submit response");
      }
      return json.data;
    },
    onSuccess: () => {
      toast.success("Response submitted. The merchant will review it shortly.");
      setResponseNote("");
      queryClient.invalidateQueries({ queryKey: ["applications"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const handleSubmit = async () => {
    if (selectedFile) {
      await uploadMutation.mutateAsync(selectedFile);
    }
    await respondMutation.mutateAsync();
  };

  const isBusy = uploadMutation.isPending || respondMutation.isPending;

  return (
    <div className="mt-4 space-y-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
      <div>
        <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
          Clarification requested
        </p>
        {application.decisionReason ? (
          <p className="mt-2 text-sm whitespace-pre-wrap text-amber-950/90 dark:text-amber-50/90">
            {application.decisionReason}
          </p>
        ) : null}
      </div>

      {application.documents && application.documents.length > 0 ? (
        <div className="space-y-1">
          <p className="text-sm font-medium">Your uploaded documents</p>
          <ul className="space-y-1">
            {application.documents.map((doc) => (
              <li key={doc.id}>
                <SecureFileLink
                  request={{ scope: "application", documentId: doc.id }}
                  className="text-sm text-emerald-700 hover:underline"
                >
                  {doc.fileName}
                </SecureFileLink>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor={`response-${application.id}`}>Your response</Label>
        <Textarea
          id={`response-${application.id}`}
          value={responseNote}
          onChange={(event) => setResponseNote(event.target.value)}
          placeholder="Answer the merchant's questions or explain any updates."
          rows={3}
        />
      </div>

      <DocumentCaptureInput
        label="Supporting document"
        value={selectedFile}
        onChange={setSelectedFile}
      />

      <Button
        size="sm"
        className="bg-emerald-600 hover:bg-emerald-700"
        disabled={
          isBusy ||
          (!responseNote.trim() &&
            !selectedFile &&
            !(application.documents && application.documents.length > 0))
        }
        onClick={() => void handleSubmit()}
      >
        {isBusy ? "Submitting..." : "Submit response"}
      </Button>
    </div>
  );
}

function getDefaultFinancingAmount(property?: ApplicationItem["property"]) {
  if (!property) return 0;
  const annualRent = property.annualRent ? Number(property.annualRent) : 0;
  if (annualRent > 0) return annualRent;
  return Number(property.monthlyRent ?? 0) * 12;
}

export default function TenantApplicationsPage() {
  const queryClient = useQueryClient();
  const [financingDialog, setFinancingDialog] = useState<FinancingDialogState | null>(null);

  const { data: applications, isLoading: applicationsLoading } = useQuery({
    queryKey: ["applications"],
    queryFn: async () => {
      const res = await fetch("/api/applications");
      const json = await res.json();
      return (json.data ?? []) as ApplicationItem[];
    },
  });

  const { data: financingRequests, isLoading: financingLoading } = useQuery({
    queryKey: ["financing"],
    queryFn: async () => {
      const res = await fetch("/api/financing");
      const json = await res.json();
      return (json.data ?? []) as FinancingRequestItem[];
    },
  });

  const applicationsWithFinancing = useMemo(() => {
    if (!applications) return [];
    return applications.map((app) => {
      const linked =
        app.financingRequests?.length
          ? app.financingRequests
          : financingRequests?.filter(
              (request) =>
                request.applicationId === app.id || request.propertyId === app.propertyId
            ) ?? [];
      return { ...app, financingRequests: linked };
    });
  }, [applications, financingRequests]);

  useMarkNavSectionSeen(
    "/dashboard/buyer/applications",
    "/api/applications",
    ["SUBMITTED", "UNDER_REVIEW", "CLARIFICATION_REQUIRED", "APPROVED"]
  );

  useEffect(() => {
    if (!applications?.length) return;
    void queryClient.invalidateQueries({ queryKey: ["sidebar-badge", "/dashboard/buyer/applications"] });
  }, [applications, queryClient]);

  const isLoading = applicationsLoading || financingLoading;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Applications & pay-for-me</h1>
          <p className="text-muted-foreground">
            Track property applications and financing approval progress.
          </p>
        </div>
        <Button asChild className="bg-emerald-600 hover:bg-emerald-700">
          <Link href="/properties">Browse listings</Link>
        </Button>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading applications...</p>
      ) : !applicationsWithFinancing.length ? (
        <div className="rounded-none border border-border bg-card px-6 py-12 text-center text-muted-foreground">
          No applications yet. Browse properties and apply to get started.
        </div>
      ) : (
        <div className="space-y-4">
          {applicationsWithFinancing.map((app) => {
            const financing = app.financingRequests?.[0];
            const canSubmit = canSubmitFinancingRequest(
              app.status,
              financing?.status,
              app.paymentMethod
            );
            const canEdit = financing ? canEditFinancingRequest(financing.status) : false;

            return (
              <Card key={app.id} className="rounded-none">
                <CardContent className="space-y-5 pt-6">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                      <p className="text-lg font-semibold text-foreground">{app.property?.name}</p>
                      <p className="text-sm text-muted-foreground">{app.property?.location}</p>
                      <p className="text-sm text-muted-foreground">
                        {app.requestedMoveInDate
                          ? `Move-in: ${new Date(app.requestedMoveInDate).toLocaleDateString()}`
                          : "Move-in date not specified"}
                      </p>
                      {app.paymentLabel ? (
                        <p className="text-sm text-foreground">{app.paymentLabel}</p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge
                        status={app.status}
                        label={APPLICATION_STATUS_LABELS[app.status]}
                      />
                      {financing ? (
                        <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-800 dark:text-amber-200">
                          {getFinancingStatusLabel(financing.status)}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {app.status !== "APPROVED" ? (
                    <ApplicationProgressSteps status={app.status} />
                  ) : null}

                  {app.status === "APPROVED" ? (
                    <div className="space-y-4 rounded-lg border border-border bg-muted/10 p-4">
                      {financing ? (
                        <>
                          <FinancingProgressSteps status={financing.status} />
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                            <span>
                              Amount: GHS {Number(financing.requestedAmount ?? 0).toLocaleString()}
                            </span>
                            {financing.durationMonths ? (
                              <span>Repayment: {financing.durationMonths} months</span>
                            ) : null}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {canEdit ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  setFinancingDialog({
                                    mode: "edit",
                                    propertyId: app.propertyId,
                                    applicationId: app.id,
                                    propertyName: app.property?.name ?? "Listing",
                                    defaultAmount: getDefaultFinancingAmount(app.property),
                                    financingRequestId: financing.id,
                                    initialValues: financing,
                                  })
                                }
                              >
                                Edit request
                              </Button>
                            ) : null}
                            {["DISBURSED", "REPAYMENT_ACTIVE", "FUNDED", "ACTIVE"].includes(
                              financing.status
                            ) ? (
                              <Button asChild size="sm" variant="outline">
                                <Link href="/dashboard/buyer/repayments">View repayments</Link>
                              </Button>
                            ) : null}
                          </div>
                        </>
                      ) : canSubmit ? (
                        <div className="space-y-3">
                          <FinancingProgressSteps status="CREATED" />
                          <Button
                            size="sm"
                            className="bg-amber-500 hover:bg-amber-600"
                            onClick={() =>
                              setFinancingDialog({
                                mode: "create",
                                propertyId: app.propertyId,
                                applicationId: app.id,
                                propertyName: app.property?.name ?? "Listing",
                                defaultAmount: getDefaultFinancingAmount(app.property),
                              })
                            }
                          >
                            Submit financing request
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  {app.status === "CLARIFICATION_REQUIRED" ? (
                    <ClarificationResponseForm application={app} />
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {financingDialog ? (
        <FinancingRequestDialog
          open
          mode={financingDialog.mode}
          onOpenChange={(open) => {
            if (!open) setFinancingDialog(null);
          }}
          propertyId={financingDialog.propertyId}
          applicationId={financingDialog.applicationId}
          propertyName={financingDialog.propertyName}
          defaultAmount={financingDialog.defaultAmount}
          financingRequestId={financingDialog.financingRequestId}
          initialValues={financingDialog.initialValues}
        />
      ) : null}
    </div>
  );
}
