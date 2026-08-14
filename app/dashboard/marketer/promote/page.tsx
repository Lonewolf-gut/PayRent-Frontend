"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { PROPERTY_TYPE_LABELS } from "@/lib/subscription-limits";
import type { PropertyType } from "@prisma/client";

type BrowseListing = {
  id: string;
  name: string;
  propertyType: PropertyType;
  monthlyRent: string | number;
  location: string;
  images?: { url: string }[];
  landlord?: { fullName: string };
};

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
      return json.data as {
        unlimited: boolean;
        usage: { total: number };
        limits: { total: number | null } | null;
      };
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
          Verified Affiliates can claim available listings or promote assigned ones. When someone applies, buys, or requests financing through your link, you earn commission.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Available listings to claim</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {browseLoading ? (
            <p className="text-muted-foreground">Loading available listings...</p>
          ) : !browseListings?.length ? (
            <p className="text-muted-foreground">No unassigned active listings right now.</p>
          ) : (
            browseListings.map((listing) => (
              <div
                key={listing.id}
                className="flex flex-col gap-3 border p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex gap-3">
                  <div className="relative h-16 w-24 shrink-0 overflow-hidden border bg-muted">
                    {listing.images?.[0]?.url ? (
                      <Image
                        src={listing.images[0].url}
                        alt={listing.name}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    ) : null}
                  </div>
                  <div>
                    <p className="font-medium">{listing.name}</p>
                    <p className="text-sm text-muted-foreground">{listing.location}</p>
                    <Badge variant="secondary" className="mt-1">
                      {PROPERTY_TYPE_LABELS[listing.propertyType]}
                    </Badge>
                  </div>
                </div>
                <Button
                  onClick={() => claimMutation.mutate(listing.id)}
                  disabled={claimMutation.isPending || atPromotionLimit}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {atPromotionLimit ? "Upgrade to claim more" : "Claim to promote"}
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Create promotion link</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your promotion links</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
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
                    {link.property ? (
                      <Button variant="outline" size="sm" asChild>
                        <a href={link.url} target="_blank" rel="noreferrer">
                          Open
                        </a>
                      </Button>
                    ) : null}
                  </div>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input readOnly value={link.url} />
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
        </CardContent>
      </Card>
    </div>
  );
}
