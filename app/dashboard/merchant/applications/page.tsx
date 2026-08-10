"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { APPLICATION_STATUS_LABELS } from "@/constants/platform";
import { SecureFileLink } from "@/components/shared/secure-file-link";

type ApplicationItem = {
  id: string;
  status: string;
  notes?: string | null;
  decisionReason?: string | null;
  property?: { name: string };
  tenant?: { fullName: string; user?: { email: string } };
  documents?: { id: string; fileName: string; fileUrl: string }[];
};

type ReviewDecision = "REJECT" | "CLARIFICATION";

export default function LandlordApplicationsPage() {
  const queryClient = useQueryClient();
  const [reviewDialog, setReviewDialog] = useState<{
    id: string;
    propertyName: string;
    decision: ReviewDecision;
  } | null>(null);
  const [decisionReason, setDecisionReason] = useState("");

  const { data: applications, isLoading } = useQuery({
    queryKey: ["applications"],
    queryFn: async () => {
      const res = await fetch("/api/applications");
      const json = await res.json();
      return (json.data ?? []) as ApplicationItem[];
    },
  });

  const reviewMutation = useMutation({
    mutationFn: async ({
      id,
      decision,
      reason,
    }: {
      id: string;
      decision: "APPROVE" | ReviewDecision;
      reason?: string;
    }) => {
      const res = await fetch(`/api/applications/${id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision,
          decisionReason: reason?.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message ?? "Unable to update application");
    },
    onSuccess: () => {
      toast.success("Application updated");
      setReviewDialog(null);
      setDecisionReason("");
      queryClient.invalidateQueries({ queryKey: ["applications"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openReviewDialog = (
    app: ApplicationItem,
    decision: ReviewDecision
  ) => {
    setReviewDialog({
      id: app.id,
      propertyName: app.property?.name ?? "this listing",
      decision,
    });
    setDecisionReason("");
  };

  const submitReviewDialog = () => {
    if (!reviewDialog) return;
    if (!decisionReason.trim()) {
      toast.error("Please tell the buyer what you need clarified or why you are rejecting.");
      return;
    }
    reviewMutation.mutate({
      id: reviewDialog.id,
      decision: reviewDialog.decision,
      reason: decisionReason,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Buyer applications</h1>
        <p className="text-muted-foreground">
          Review applications, request clarification, and approve tenancy decisions.
        </p>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : !applications?.length ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No applications yet.
          </CardContent>
        </Card>
      ) : (
        applications.map((app) => (
          <Card key={app.id}>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle className="text-base">{app.property?.name}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {app.tenant?.fullName} · {app.tenant?.user?.email}
                </p>
              </div>
              <StatusBadge status={app.status} label={APPLICATION_STATUS_LABELS[app.status]} />
            </CardHeader>
            <CardContent className="space-y-4">
              {app.notes ? (
                <div>
                  <p className="text-sm font-medium">Buyer notes</p>
                  <p className="text-sm whitespace-pre-wrap text-muted-foreground">{app.notes}</p>
                </div>
              ) : null}
              {app.decisionReason ? (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                    Your clarification request
                  </p>
                  <p className="mt-1 text-sm whitespace-pre-wrap text-amber-900/90 dark:text-amber-100/90">
                    {app.decisionReason}
                  </p>
                </div>
              ) : null}
              {app.documents && app.documents.length > 0 ? (
                <div className="space-y-1">
                  <p className="text-sm font-medium">Supporting documents</p>
                  <ul className="space-y-1">
                    {app.documents.map((doc) => (
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
              {["SUBMITTED", "UNDER_REVIEW", "CLARIFICATION_REQUIRED"].includes(app.status) ? (
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700"
                    disabled={reviewMutation.isPending}
                    onClick={() =>
                      reviewMutation.mutate({ id: app.id, decision: "APPROVE" })
                    }
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={reviewMutation.isPending}
                    onClick={() => openReviewDialog(app, "CLARIFICATION")}
                  >
                    Request clarification
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={reviewMutation.isPending}
                    onClick={() => openReviewDialog(app, "REJECT")}
                  >
                    Reject
                  </Button>
                </div>
              ) : null}
            </CardContent>
          </Card>
        ))
      )}

      <Dialog
        open={reviewDialog != null}
        onOpenChange={(open) => {
          if (!open) {
            setReviewDialog(null);
            setDecisionReason("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reviewDialog?.decision === "REJECT"
                ? "Reject application"
                : "Request clarification"}
            </DialogTitle>
            <DialogDescription>
              {reviewDialog?.decision === "REJECT"
                ? `Tell the buyer why their application for ${reviewDialog?.propertyName} was not approved.`
                : `Tell the buyer what additional information or documents you need for ${reviewDialog?.propertyName}.`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="decision-reason">Message to buyer</Label>
            <Textarea
              id="decision-reason"
              value={decisionReason}
              onChange={(event) => setDecisionReason(event.target.value)}
              placeholder={
                reviewDialog?.decision === "REJECT"
                  ? "e.g. Move-in date does not match availability."
                  : "e.g. Please upload a recent payslip and confirm your preferred move-in date."
              }
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setReviewDialog(null);
                setDecisionReason("");
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className={
                reviewDialog?.decision === "REJECT"
                  ? "bg-destructive hover:bg-destructive/90"
                  : "bg-emerald-600 hover:bg-emerald-700"
              }
              disabled={reviewMutation.isPending}
              onClick={submitReviewDialog}
            >
              {reviewMutation.isPending ? "Sending..." : "Send to buyer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
