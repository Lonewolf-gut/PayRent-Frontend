"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { APPLICATION_STATUS_LABELS } from "@/constants/platform";
import { useMarkNavSectionSeen } from "@/hooks/use-mark-nav-section-seen";
import { SecureFileLink } from "@/components/shared/secure-file-link";

type ApplicationDocument = {
  id: string;
  fileName: string;
};

type ApplicationItem = {
  id: string;
  propertyId: string;
  status: string;
  decisionReason?: string | null;
  requestedMoveInDate?: string;
  financingRequests?: { id: string }[];
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

      <div className="space-y-2">
        <Label htmlFor={`document-${application.id}`}>Upload supporting document (optional)</Label>
        <Input
          id={`document-${application.id}`}
          type="file"
          onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
        />
      </div>

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

export default function TenantApplicationsPage() {
  const queryClient = useQueryClient();

  const { data: applications, isLoading } = useQuery({
    queryKey: ["applications"],
    queryFn: async () => {
      const res = await fetch("/api/applications");
      const json = await res.json();
      return (json.data ?? []) as ApplicationItem[];
    },
  });

  useMarkNavSectionSeen(
    "/dashboard/buyer/applications",
    "/api/applications",
    ["SUBMITTED", "UNDER_REVIEW", "CLARIFICATION_REQUIRED", "APPROVED"]
  );

  useEffect(() => {
    if (!applications?.length) return;
    void queryClient.invalidateQueries({ queryKey: ["sidebar-badge", "/dashboard/buyer/applications"] });
  }, [applications, queryClient]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Property applications</h1>
          <p className="text-muted-foreground">
            Track your applications, payments, and financing requests.
          </p>
        </div>
        <Button asChild className="bg-emerald-600 hover:bg-emerald-700">
          <Link href="/properties">Browse listings</Link>
        </Button>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading applications...</p>
      ) : !applications?.length ? (
        <div className="rounded-none border border-border bg-card px-6 py-12 text-center text-muted-foreground">
          No applications yet. Browse properties and apply to get started.
        </div>
      ) : (
        <ul className="divide-y divide-border rounded-none border border-border bg-card">
          {applications.map((app) => (
            <li key={app.id} className="px-4 py-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <p className="font-medium text-foreground">{app.property?.name}</p>
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
                  {app.status === "APPROVED" &&
                  app.paymentMethod !== "CASH" &&
                  !app.financingRequests?.length ? (
                    <Button asChild size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                      <Link
                        href={`/dashboard/buyer/financing?propertyId=${app.propertyId}&applicationId=${app.id}`}
                      >
                        Request financing
                      </Link>
                    </Button>
                  ) : null}
                </div>
              </div>

              {app.status === "CLARIFICATION_REQUIRED" ? (
                <ClarificationResponseForm application={app} />
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
