"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { APPLICATION_STATUS_LABELS } from "@/constants/platform";
import { FinancingRequestDialog } from "@/components/applications/financing-request-dialog";
import {
  buildRequestPipeline,
  getCurrentApproverLabel,
  getFinancingStatusLabel,
} from "@/lib/financing/request-pipeline";

function ApplicationsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const propertyId = searchParams.get("propertyId") ?? "";
  const intent = searchParams.get("intent");
  const [dialogOpen, setDialogOpen] = useState(false);

  const shouldOpenDialog = Boolean(propertyId && (intent === "financing" || intent === "payforme"));

  const clearFinancingParams = useCallback(() => {
    router.replace("/dashboard/buyer/applications");
  }, [router]);

  useEffect(() => {
    if (shouldOpenDialog) {
      setDialogOpen(true);
    }
  }, [shouldOpenDialog, propertyId]);

  const handleDialogOpenChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open && shouldOpenDialog) {
      clearFinancingParams();
    }
  };

  const { data: applications, isLoading } = useQuery({
    queryKey: ["applications"],
    queryFn: async () => {
      const res = await fetch("/api/applications");
      const json = await res.json();
      return json.data ?? [];
    },
  });

  const { data: financingRequests = [] } = useQuery({
    queryKey: ["financing"],
    queryFn: async () => {
      const res = await fetch("/api/financing");
      const json = await res.json();
      return json.data ?? [];
    },
  });

  const { data: financingDocs } = useQuery({
    queryKey: ["tenant-financing-docs"],
    queryFn: async () => {
      const res = await fetch("/api/buyer/financing-documents");
      const json = await res.json();
      return json.data;
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Applications & Pay-for-Me requests</h1>
          <p className="text-muted-foreground">
            Track your property applications and Pay-for-Me status as each party reviews in order.
          </p>
        </div>
        <Button asChild className="rounded-none bg-emerald-600 hover:bg-emerald-700">
          <Link href="/properties">Browse listings</Link>
        </Button>
      </div>

      {propertyId ? (
        <FinancingRequestDialog
          propertyId={propertyId}
          open={dialogOpen}
          onOpenChange={handleDialogOpenChange}
        />
      ) : null}

      {isLoading ? (
        <p className="text-muted-foreground">Loading applications...</p>
      ) : !applications?.length ? (
        <Card className="rounded-none">
          <CardContent className="py-12 text-center text-muted-foreground">
            No applications yet. Browse a listing and choose Request Pay-for-Me financing.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          <h2 className="text-lg font-semibold">Your requests</h2>
          {applications.map(
            (app: {
              id: string;
              status: string;
              propertyId: string;
              requestedMoveInDate?: string;
              property?: { name: string; location: string; propertyType?: string };
              decisionReason?: string;
              documents?: { id: string; fileName: string }[];
            }) => {
              const financing = financingRequests.find(
                (req: { propertyId: string }) => req.propertyId === app.propertyId
              );
              const pipeline = buildRequestPipeline({
                applicationStatus: app.status,
                financingStatus: financing?.status,
                financingDocsApproved: Boolean(financingDocs?.allApproved),
                kycVerified: true,
              });
              const waitingLabel = getCurrentApproverLabel(pipeline);
              const hasActiveFinancing =
                financing && financing.status !== "CREATED";

              return (
                <Card key={app.id} className="rounded-none">
                  <CardHeader className="flex flex-row items-start justify-between gap-4">
                    <div>
                      <CardTitle className="text-base">{app.property?.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">{app.property?.location}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <StatusBadge
                        status={app.status}
                        label={APPLICATION_STATUS_LABELS[app.status] ?? app.status}
                      />
                      {financing ? (
                        <StatusBadge
                          status={financing.status}
                          label={getFinancingStatusLabel(financing.status) ?? financing.status}
                        />
                      ) : null}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm font-medium text-emerald-900">{waitingLabel}</p>
                    {hasActiveFinancing ? (
                      <p className="text-sm text-muted-foreground">
                        Pay-for-Me request in progress — stops before your bank mandate is sent.
                      </p>
                    ) : financing?.status === "CREATED" ? (
                      <p className="text-sm text-muted-foreground">
                        Request queued — waiting for merchant and admin approvals before eligibility
                        review.
                      </p>
                    ) : app.status === "APPROVED" ? (
                      <p className="text-sm text-muted-foreground">
                        Application approved — complete your Pay-for-Me request.
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Waiting for merchant to review your application.
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {!hasActiveFinancing ? (
                        <Button
                          asChild
                          size="sm"
                          className="rounded-none bg-emerald-600 hover:bg-emerald-700"
                        >
                          <Link
                            href={`/dashboard/buyer/applications?propertyId=${encodeURIComponent(app.propertyId)}&intent=financing`}
                          >
                            {app.status === "APPROVED"
                              ? "Submit Pay-for-Me request"
                              : "Continue Pay-for-Me request"}
                          </Link>
                        </Button>
                      ) : (
                        <Button asChild size="sm" variant="outline" className="rounded-none">
                          <Link href="/dashboard/buyer/financing">View financing details</Link>
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            }
          )}
        </div>
      )}
    </div>
  );
}

export default function TenantApplicationsPage() {
  return (
    <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
      <ApplicationsContent />
    </Suspense>
  );
}
