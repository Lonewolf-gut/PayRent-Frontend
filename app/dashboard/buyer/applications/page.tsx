"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FinancingRequestAccordionCard } from "@/components/applications/financing-request-accordion-card";

export default function TenantApplicationsPage() {
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

  const { data: financingDocBundles = [] } = useQuery({
    queryKey: ["buyer-financing-documents"],
    queryFn: async () => {
      const res = await fetch("/api/buyer/financing-documents");
      const json = await res.json();
      return json.data ?? [];
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Financing applications</h1>
          <p className="text-muted-foreground">
            Your Pay-for-Me requests are managed on the financing applications dashboard.
          </p>
        </div>
        <Button asChild className="rounded-none bg-emerald-600 hover:bg-emerald-700">
          <Link href="/dashboard/buyer/financing">Go to financing applications</Link>
        </Button>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : !applications?.length ? (
        <Card className="rounded-none">
          <CardContent className="py-12 text-center text-muted-foreground">
            No requests yet. Browse a listing and submit a financing request from the property
            page.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {applications.map(
            (app: {
              id: string;
              status: string;
              propertyId: string;
              property?: { name: string; location: string };
              decisionReason?: string | null;
            }) => {
              const financing = financingRequests.find(
                (req: { propertyId: string }) => req.propertyId === app.propertyId
              );
              const financingDocs =
                financingDocBundles.find(
                  (bundle: { propertyId?: string; applicationId?: string; financingRequestId?: string }) =>
                    bundle.applicationId === app.id ||
                    bundle.propertyId === app.propertyId ||
                    (financing?.id && bundle.financingRequestId === financing.id)
                ) ?? null;
              return (
                <FinancingRequestAccordionCard
                  key={app.id}
                  application={app}
                  financing={financing ?? null}
                  financingDocs={
                    financingDocs
                      ? {
                          ...financingDocs,
                          financingRequestId:
                            financingDocs.financingRequestId ?? financing?.id,
                        }
                      : financing
                        ? { financingRequestId: financing.id, documents: [], canReplace: true }
                        : null
                  }
                />
              );
            }
          )}
        </div>
      )}
    </div>
  );
}
