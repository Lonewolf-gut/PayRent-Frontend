"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FinancingRequestAccordionCard } from "@/components/applications/financing-request-accordion-card";

export default function TenantFinancingPage() {
  const { data: applications = [], isLoading: appsLoading } = useQuery({
    queryKey: ["applications"],
    queryFn: async () => {
      const res = await fetch("/api/applications");
      const json = await res.json();
      return json.data ?? [];
    },
  });

  const { data: financingRequests = [], isLoading: finLoading } = useQuery({
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

  const isLoading = appsLoading || finLoading;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pay-for-Me financing</h1>
          <p className="text-muted-foreground">
            Track your requests as each party reviews them. Expand a card to view attachments or
            edit before the next approval.
          </p>
        </div>
        <Button asChild className="rounded-none bg-emerald-600 hover:bg-emerald-700">
          <Link href="/properties">Browse listings</Link>
        </Button>
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Your requests</h2>
        {isLoading ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : !applications.length ? (
          <Card className="rounded-none">
            <CardContent className="py-12 text-center text-muted-foreground">
              No requests yet. Open a listing and choose Submit financing request.
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
                return (
                  <FinancingRequestAccordionCard
                    key={app.id}
                    application={app}
                    financing={financing ?? null}
                    financingDocs={financingDocs}
                  />
                );
              }
            )}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Repayment schedule</h2>
          <Button asChild variant="link" className="text-emerald-700">
            <Link href="/dashboard/buyer/repayments">View full schedule</Link>
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Active repayment plans appear here after lender approval and merchant delivery
          confirmation.
        </p>
      </section>
    </div>
  );
}
