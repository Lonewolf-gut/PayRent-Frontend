"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FinancingRequestForm } from "@/components/financing/financing-request-form";
import { isEmploymentRecorded } from "@/lib/constants/employment-status";
import { isSaleListing } from "@/lib/subscription-limits";
import type { PropertyType } from "@prisma/client";

function FinancingRequestContent() {
  const searchParams = useSearchParams();
  const propertyId = searchParams.get("propertyId") ?? "";

  const { data: property, isLoading: propertyLoading } = useQuery({
    queryKey: ["property", propertyId],
    queryFn: async () => {
      const res = await fetch(`/api/properties/${propertyId}`);
      const json = await res.json();
      return json.data;
    },
    enabled: Boolean(propertyId),
  });

  const { data: kycStatus } = useQuery({
    queryKey: ["kyc-status"],
    queryFn: async () => {
      const res = await fetch("/api/kyc");
      const json = await res.json();
      return json.data;
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

  const { data: applications = [] } = useQuery({
    queryKey: ["applications"],
    queryFn: async () => {
      const res = await fetch("/api/applications");
      const json = await res.json();
      return json.data ?? [];
    },
  });

  if (!propertyId) {
    return (
      <Card className="rounded-none">
        <CardContent className="py-10 text-center text-muted-foreground">
          Open a listing and choose Request Pay-for-Me financing to start here.
          <div className="mt-4">
            <Button asChild className="rounded-none bg-emerald-600 hover:bg-emerald-700">
              <Link href="/properties">Browse listings</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (propertyLoading) {
    return <p className="text-muted-foreground">Loading listing…</p>;
  }

  if (!property) {
    return (
      <Card className="rounded-none">
        <CardContent className="py-10 text-center text-muted-foreground">
          Listing not found.
          <div className="mt-4">
            <Button asChild variant="outline" className="rounded-none">
              <Link href="/properties">Back to listings</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isSale = isSaleListing(property.propertyType as PropertyType);
  const defaultAmount = Number(property.discountedPrice ?? property.monthlyRent);
  const approvedApplication = applications.find(
    (app: { propertyId: string; status: string }) =>
      app.propertyId === propertyId && app.status === "APPROVED"
  );
  const profileComplete = ["PROFILE_COMPLETED", "KYC_PENDING", "KYC_VERIFIED"].includes(
    kycStatus?.profileStatus ?? ""
  );
  const financingReady = Boolean(
    kycStatus?.kycVerified &&
      kycStatus?.addressVerified &&
      isEmploymentRecorded(
        kycStatus?.employmentStatus,
        profileComplete,
        kycStatus?.employmentVerified
      )
  );

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="rounded-none px-0">
        <Link href={`/properties/${propertyId}`}>
          <ArrowLeft className="mr-2 size-4" />
          Back to listing
        </Link>
      </Button>

      <div>
        <h1 className="text-2xl font-bold">Pay-for-Me financing request</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Complete the steps below, then submit for admin and lender approval.
        </p>
      </div>

      <Card className="rounded-none">
        <CardHeader>
          <CardTitle className="text-base">{property.name}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {isSale ? "Hire-purchase" : "Rental financing"} · GHS{" "}
            {defaultAmount.toLocaleString()}
          </p>
        </CardHeader>
        <CardContent>
          <FinancingRequestForm
            propertyId={propertyId}
            propertyName={property.name}
            isSale={isSale}
            defaultAmount={defaultAmount}
            kycVerified={financingReady}
            financingDocsApproved={Boolean(financingDocs?.allApproved)}
            approvedApplication={approvedApplication}
          />
        </CardContent>
      </Card>
    </div>
  );
}

export default function FinancingRequestPage() {
  return (
    <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
      <FinancingRequestContent />
    </Suspense>
  );
}
