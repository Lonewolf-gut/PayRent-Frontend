"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PropertyListingImage } from "@/components/properties/property-listing-image";
import { PROPERTY_TYPE_LABELS } from "@/lib/subscription-limits";
import type { PropertyType } from "@prisma/client";

function formatCurrency(amount: number) {
  return `GHS ${amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function estimateCommission(price: number, ratePercent: number) {
  return Math.round(price * (ratePercent / 100) * 100) / 100;
}

type Listing = {
  id: string;
  name: string;
  propertyType: PropertyType;
  monthlyRent: string | number;
  location: string;
  status: string;
  images?: { id?: string; url: string; displayUrl?: string | null; src?: string | null }[];
  landlord?: { fullName: string };
  _count?: { applications: number };
};

export default function AgentListingsPage() {
  const { data: listings, isLoading } = useQuery({
    queryKey: ["agent-listings"],
    queryFn: async () => {
      const res = await fetch("/api/marketer/listings");
      const json = await res.json();
      return (json.data ?? []) as Listing[];
    },
  });

  const { data: assignmentLimits } = useQuery({
    queryKey: ["listing-limits"],
    queryFn: async () => {
      const res = await fetch("/api/properties/listing-limits");
      const json = await res.json();
      return json.data as { agentCommissionPercent?: number };
    },
  });

  const commissionRate = assignmentLimits?.agentCommissionPercent ?? 2.5;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">My listings</h1>
          <p className="text-muted-foreground">
            Properties assigned to you or claimed for promotion. Earn commission when customers buy or request financing through your links.
          </p>
        </div>
        <Button asChild className="bg-emerald-600 hover:bg-emerald-700">
          <Link href="/dashboard/marketer/promote">Find listings to promote</Link>
        </Button>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading listings...</p>
      ) : !listings?.length ? (
        <Card>
          <CardContent className="space-y-4 py-12 text-center text-muted-foreground">
            <p>No listings yet. Ask a merchant to assign you, or claim available listings to promote.</p>
            <Button asChild variant="outline">
              <Link href="/dashboard/marketer/promote">Browse available listings</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {listings.map((listing) => (
            <Card key={listing.id}>
              <CardContent className="flex gap-4 pt-6">
                <div className="relative h-20 w-28 shrink-0 overflow-hidden border bg-muted">
                  {listing.images?.[0] ? (
                    <PropertyListingImage
                      image={listing.images[0]}
                      alt={listing.name}
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{listing.name}</p>
                    <Badge variant="secondary">
                      {PROPERTY_TYPE_LABELS[listing.propertyType]}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{listing.location}</p>
                  <p className="text-sm font-medium">
                    {formatCurrency(Number(listing.monthlyRent))}
                    <span className="ml-2 text-xs font-normal text-emerald-700 dark:text-emerald-400">
                      Est. commission{" "}
                      {formatCurrency(
                        estimateCommission(Number(listing.monthlyRent), commissionRate)
                      )}{" "}
                      ({commissionRate}%)
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {listing._count?.applications ?? 0} application(s)
                    {listing.landlord ? ` · Merchant: ${listing.landlord.fullName}` : ""}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/properties/${listing.id}`}>View listing</Link>
                    </Button>
                    <Button asChild size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                      <Link href={`/dashboard/marketer/promote?propertyId=${listing.id}`}>
                        Promotion links
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
