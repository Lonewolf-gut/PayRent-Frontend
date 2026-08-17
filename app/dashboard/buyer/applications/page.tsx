"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { APPLICATION_STATUS_LABELS } from "@/constants/platform";
import { BuyerFinancingRequestPanel } from "@/components/applications/buyer-financing-request-panel";
import {
  buildRequestPipeline,
  getCurrentApproverLabel,
  getFinancingStatusLabel,
} from "@/lib/financing/request-pipeline";

function ApplicationsContent() {
  const searchParams = useSearchParams();
  const propertyId = searchParams.get("propertyId") ?? "";
  const intent = searchParams.get("intent");

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

  const showCompose = Boolean(propertyId && (intent === "financing" || intent === "payforme"));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Applications & Pay-for-Me requests</h1>
          <p className="text-muted-foreground">
            Submit your application, then your Pay-for-Me request moves to each approver in order.
          </p>
        </div>
        <Button asChild className="rounded-none bg-emerald-600 hover:bg-emerald-700">
          <Link href="/properties">Browse listings</Link>
        </Button>
      </div>

      {showCompose ? <BuyerFinancingRequestPanel propertyId={propertyId} /> : null}

      {isLoading ? (
        <p className="text-muted-foreground">Loading applications...</p>
      ) : !applications?.length ? (
        <Card className="rounded-none">
          <CardContent className="py-12 text-center text-muted-foreground">
            {showCompose
              ? "Complete the form above to start your Pay-for-Me request."
              : "No applications yet. Browse a listing and choose Request Pay-for-Me financing."}
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
                financingDocsApproved: true,
                kycVerified: true,
              });

              return (
                <Card key={app.id} className="rounded-none">
                  <CardHeader className="flex flex-row items-start justify-between gap-4">
                    <div>
                      <CardTitle className="text-base">{app.property?.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">{app.property?.location}</p>
                    </div>
                    <StatusBadge
                      status={app.status}
                      label={APPLICATION_STATUS_LABELS[app.status] ?? app.status}
                    />
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      {getCurrentApproverLabel(pipeline)}
                    </p>
                    {financing ? (
                      <p className="text-sm">
                        Pay-for-Me:{" "}
                        <StatusBadge
                          status={financing.status}
                          label={getFinancingStatusLabel(financing.status) ?? financing.status}
                        />
                      </p>
                    ) : null}
                    <div className="flex flex-wrap gap-2">
                      {app.status === "APPROVED" && !financing ? (
                        <Button
                          asChild
                          size="sm"
                          className="rounded-none bg-emerald-600 hover:bg-emerald-700"
                        >
                          <Link
                            href={`/dashboard/buyer/applications?propertyId=${encodeURIComponent(app.propertyId)}&intent=financing`}
                          >
                            Continue Pay-for-Me request
                          </Link>
                        </Button>
                      ) : null}
                      {financing ? (
                        <Button asChild size="sm" variant="outline" className="rounded-none">
                          <Link href="/dashboard/buyer/financing">View financing status</Link>
                        </Button>
                      ) : null}
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
