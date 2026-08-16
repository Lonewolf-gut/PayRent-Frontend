"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { PropertyListingImage } from "@/components/properties/property-listing-image";
import { toast } from "sonner";
import { PROPERTY_TYPE_LABELS } from "@/lib/subscription-limits";
import type { PropertyType } from "@prisma/client";

type BrowseListing = {
  id: string;
  name: string;
  propertyType: PropertyType;
  monthlyRent: string | number;
  location: string;
  images?: { id?: string; url: string; displayUrl?: string | null; src?: string | null }[];
  landlord?: { fullName: string };
  promotionStatus?: "available" | "yours" | "claimed_by_other";
  assignedAgent?: { fullName: string } | null;
};

type AssignmentLimits = {
  plan: string;
  unlimited: boolean;
  agentCommissionPercent?: number;
  usage: { total: number };
  limits: { total: number | null } | null;
};

function formatCurrency(amount: number) {
  return `GHS ${amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function estimateCommission(price: number, ratePercent: number) {
  return Math.round(price * (ratePercent / 100) * 100) / 100;
}

type ReferralLink = {
  id: string;
  code: string;
  label?: string | null;
  url: string;
  clickCount: number;
  property?: { id: string; name: string } | null;
};

export default function AgentPromotePage() {
  const searchParams = useSearchParams();
  const preselectedPropertyId = searchParams.get("propertyId");
  const queryClient = useQueryClient();
  const [label, setLabel] = useState("");
  const [selectedPropertyId, setSelectedPropertyId] = useState(preselectedPropertyId ?? "");

  useEffect(() => {
    if (preselectedPropertyId) {
      setSelectedPropertyId(preselectedPropertyId);
    }
  }, [preselectedPropertyId]);

  const { data: browseListings, isLoading: browseLoading } = useQuery({
    queryKey: ["agent-browse-listings"],
    queryFn: async () => {
      const res = await fetch("/api/marketer/properties/browse");
      const json = await res.json();
      return (json.data ?? []) as BrowseListing[];
    },
  });

  const { data: myListings } = useQuery({
    queryKey: ["agent-listings"],
    queryFn: async () => {
      const res = await fetch("/api/marketer/listings");
      const json = await res.json();
      return (json.data ?? []) as BrowseListing[];
    },
  });

  const { data: assignmentLimits } = useQuery({
    queryKey: ["listing-limits"],
    queryFn: async () => {
      const res = await fetch("/api/properties/listing-limits");
      const json = await res.json();
      return json.data as AssignmentLimits;
    },
  });

  const { data: referralLinks, isLoading: linksLoading } = useQuery({
    queryKey: ["agent-referral-links"],
    queryFn: async () => {
      const res = await fetch("/api/marketer/referral-links");
      const json = await res.json();
      return (json.data ?? []) as ReferralLink[];
    },
  });

  const promotableListings = useMemo(() => myListings ?? [], [myListings]);

  useEffect(() => {
    if (preselectedPropertyId || selectedPropertyId || promotableListings.length !== 1) return;
    setSelectedPropertyId(promotableListings[0].id);
  }, [preselectedPropertyId, promotableListings, selectedPropertyId]);
  const promotionLimit = assignmentLimits?.limits?.total ?? 1;
  const promotionUsed = assignmentLimits?.usage.total ?? 0;
  const commissionRate = assignmentLimits?.agentCommissionPercent ?? 2.5;
  const atPromotionLimit =
    !assignmentLimits?.unlimited && promotionUsed >= promotionLimit;

  const claimMutation = useMutation({
    mutationFn: async (propertyId: string) => {
      const res = await fetch(`/api/marketer/properties/${propertyId}/claim`, {
        method: "POST",
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message ?? "Unable to claim listing");
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agent-browse-listings"] });
      queryClient.invalidateQueries({ queryKey: ["agent-listings"] });
      queryClient.invalidateQueries({ queryKey: ["listing-limits"] });
      toast.success("Listing claimed. You can now create promotion links.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const createLinkMutation = useMutation({
    mutationFn: async (propertyId?: string) => {
      const resolvedPropertyId = propertyId ?? selectedPropertyId;
      if (!resolvedPropertyId) {
        throw new Error("Select a listing before generating a promotion link.");
      }

      const res = await fetch("/api/marketer/referral-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId: resolvedPropertyId,
          label: label || undefined,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message ?? "Unable to create link");
      return json.data as ReferralLink;
    },
    onSuccess: (link) => {
      queryClient.invalidateQueries({ queryKey: ["agent-referral-links"] });
      setLabel("");
      toast.success("Promotion link created");
      if (link?.url) navigator.clipboard?.writeText(link.url).catch(() => undefined);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Promote & earn commission</h1>
        <p className="text-muted-foreground">
          Claim a listing, share your link, and earn {commissionRate}% commission when customers buy
          or request financing.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All active listings</CardTitle>
        </CardHeader>
        <CardContent className="max-h-[520px] space-y-4 overflow-y-auto pr-1">
          {browseLoading ? (
            <p className="text-muted-foreground">Loading listings...</p>
          ) : !browseListings?.length ? (
            <p className="text-muted-foreground">No active listings right now.</p>
          ) : (
            browseListings.map((listing) => {
              const status = listing.promotionStatus ?? "available";
              const price = Number(listing.monthlyRent);
              const commission = estimateCommission(price, commissionRate);

              return (
              <div
                key={listing.id}
                className="flex flex-col gap-3 border p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex gap-3">
                  <div className="relative h-16 w-24 shrink-0 overflow-hidden border bg-muted">
                    {listing.images?.[0] ? (
                      <PropertyListingImage
                        image={listing.images[0]}
                        alt={listing.name}
                        className="h-full w-full object-cover"
                      />
                    ) : null}
                  </div>
                  <div>
                    <p className="font-medium">{listing.name}</p>
                    <p className="text-sm text-muted-foreground">{listing.location}</p>
                    <p className="mt-1 text-sm font-medium text-foreground">
                      {formatCurrency(price)}
                      <span className="ml-2 text-xs font-normal text-emerald-700 dark:text-emerald-400">
                        Est. commission {formatCurrency(commission)} ({commissionRate}%)
                      </span>
                    </p>
                    <div className="mt-1 flex flex-wrap gap-2">
                      <Badge variant="secondary">
                        {PROPERTY_TYPE_LABELS[listing.propertyType]}
                      </Badge>
                      {status === "yours" ? (
                        <Badge className="bg-emerald-600">You are promoting this</Badge>
                      ) : status === "claimed_by_other" ? (
                        <Badge variant="outline">Promoted by another affiliate</Badge>
                      ) : null}
                    </div>
                  </div>
                </div>
                {status === "yours" ? (
                  <Button
                    variant="outline"
                    onClick={() => setSelectedPropertyId(listing.id)}
                  >
                    Create link
                  </Button>
                ) : status === "claimed_by_other" ? (
                  <Button variant="outline" disabled>
                    Unavailable
                  </Button>
                ) : (
                  <Button
                    onClick={() => claimMutation.mutate(listing.id)}
                    disabled={claimMutation.isPending || atPromotionLimit}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    {atPromotionLimit ? "Upgrade to claim more" : "Claim to promote"}
                  </Button>
                )}
              </div>
            );
            })
          )}
        </CardContent>
      </Card>

      <Accordion type="multiple" defaultValue={["create-link", "your-links"]} className="space-y-4">
        <AccordionItem value="create-link" className="rounded-lg border bg-card px-4">
          <AccordionTrigger className="py-4 text-base font-semibold hover:no-underline">
            Create promotion link
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pb-4">
          <div className="space-y-2">
            <Label htmlFor="property">Listing</Label>
            <NativeSelect
              id="property"
              value={selectedPropertyId}
              onChange={(e) => setSelectedPropertyId(e.target.value)}
              disabled={!promotableListings.length}
            >
              <option value="">
                {promotableListings.length
                  ? "Select a listing"
                  : "Claim a listing first"}
              </option>
              {promotableListings.map((listing) => (
                <option key={listing.id} value={listing.id}>
                  {listing.name}
                </option>
              ))}
            </NativeSelect>
            <p className="text-xs text-muted-foreground">
              Promotion links open the selected listing for customers. Claim a listing above if none are available.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="label">Label (optional)</Label>
            <Input
              id="label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. East Legon apartments campaign"
            />
          </div>
          <Button
            onClick={() => createLinkMutation.mutate()}
            disabled={createLinkMutation.isPending || !selectedPropertyId}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            Generate link
          </Button>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="your-links" className="rounded-lg border bg-card px-4">
          <AccordionTrigger className="py-4 text-base font-semibold hover:no-underline">
            Your promotion links
          </AccordionTrigger>
          <AccordionContent className="space-y-3 pb-4">
          {linksLoading ? (
            <p className="text-muted-foreground">Loading links...</p>
          ) : !referralLinks?.length ? (
            <p className="text-muted-foreground">No promotion links yet.</p>
          ) : (
            referralLinks.map((link) => (
              <div key={link.id} className="space-y-2 border p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">{link.label || link.code}</p>
                    {link.property ? (
                      <p className="text-sm text-muted-foreground">{link.property.name}</p>
                    ) : (
                      <p className="text-sm text-muted-foreground">General referral link</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{link.clickCount} clicks</Badge>
                    <Button variant="outline" size="sm" asChild>
                      <a href={link.url} target="_blank" rel="noreferrer">
                        Open
                      </a>
                    </Button>
                  </div>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input readOnly value={link.url} className="font-sans" />
                  <Button
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(link.url);
                      toast.success("Link copied");
                    }}
                  >
                    Copy
                  </Button>
                </div>
              </div>
            ))
          )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
