"use client";

import { useState } from "react";
import Image from "next/image";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { resolveAssetUrl } from "@/lib/utils/asset-url";
import { toast } from "sonner";
import {
  isSaleListing,
  PROPERTY_CATEGORIES,
  PROPERTY_TYPE_LABELS,
  getPropertyCategory,
} from "@/lib/subscription-limits";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { PropertyType } from "@prisma/client";

type StatusFilter = "PENDING_VERIFICATION" | "ACTIVE" | "INACTIVE" | "ALL";

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: "PENDING_VERIFICATION", label: "Pending" },
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive / Rejected" },
  { value: "ALL", label: "All" },
];

type SubmitterUser = {
  id: string;
  email: string;
  phone?: string | null;
  verifications?: { status: string }[];
};

type SubmitterLandlord = {
  fullName: string;
  identityVerified: boolean;
  profileStatus: string;
  user?: SubmitterUser;
};

type AdminPendingProperty = {
  id: string;
  name: string;
  propertyType?: PropertyType;
  region?: string | null;
  city?: string | null;
  area?: string | null;
  location: string;
  latitude?: number | null;
  longitude?: number | null;
  monthlyRent: string | number;
  annualRent?: string | number | null;
  discountedPrice?: string | number | null;
  description: string;
  amenities: string[];
  availableFrom?: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  landlord?: SubmitterLandlord;
  images?: { id: string; url: string; alt?: string | null }[];
  videos?: { id: string; url: string; title?: string | null }[];
};

function formatGhs(amount: string | number | null | undefined) {
  return `GHS ${Number(amount ?? 0).toLocaleString()}`;
}

function getVerificationStatus(landlord?: SubmitterLandlord) {
  const kycStatus = landlord?.user?.verifications?.[0]?.status;
  if (kycStatus === "APPROVED" || landlord?.identityVerified) {
    return { label: "Verified", status: "APPROVED" };
  }
  if (kycStatus === "REJECTED") {
    return { label: "KYC rejected", status: "REJECTED" };
  }
  if (kycStatus === "PENDING") {
    return { label: "KYC pending", status: "PENDING" };
  }
  return { label: "Not verified", status: "PENDING" };
}

function SubmitterDetails({ landlord }: { landlord?: SubmitterLandlord }) {
  const verification = getVerificationStatus(landlord);

  return (
    <div className="space-y-3 border border-slate-200 bg-card p-4">
      <p className="text-sm text-muted-foreground">Submitted by</p>
      <div className="space-y-2 text-sm">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Name</p>
          <p className="font-semibold">{landlord?.fullName ?? "Unknown"}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Email</p>
          <p className="font-medium">{landlord?.user?.email ?? "—"}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Phone</p>
          <p className="font-medium">{landlord?.user?.phone ?? "Not provided"}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <StatusBadge status={verification.status} label={verification.label} />
          {landlord?.profileStatus ? (
            <Badge variant="outline" className="rounded-none">
              Profile: {landlord.profileStatus.replace(/_/g, " ")}
            </Badge>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ListingPriceSummary({ property }: { property: AdminPendingProperty }) {
  const type = (property.propertyType ?? "APARTMENT") as PropertyType;
  const isSale = isSaleListing(type);
  const category = getPropertyCategory(type);

  if (isSale) {
    return (
      <div className="border border-slate-200 bg-background p-4">
        <p className="text-sm text-muted-foreground">Listing price</p>
        <p className="mt-2 text-2xl font-semibold">{formatGhs(property.monthlyRent)}</p>
        {property.discountedPrice ? (
          <p className="mt-1 text-sm text-emerald-700">
            Discounted: {formatGhs(property.discountedPrice)}
          </p>
        ) : null}
        <p className="mt-2 text-xs text-muted-foreground">
          {PROPERTY_CATEGORIES[category].label} · sale listing
        </p>
      </div>
    );
  }

  return (
    <div className="border border-slate-200 bg-background p-4">
      <p className="text-sm text-muted-foreground">Rent</p>
      <p className="mt-2 text-2xl font-semibold">{formatGhs(property.monthlyRent)}/mo</p>
      {property.annualRent ? (
        <p className="mt-1 text-sm text-muted-foreground">{formatGhs(property.annualRent)}/yr</p>
      ) : null}
    </div>
  );
}

function PropertyReviewBody({ property }: { property: AdminPendingProperty }) {
  const type = (property.propertyType ?? "APARTMENT") as PropertyType;
  const isSale = isSaleListing(type);
  const category = getPropertyCategory(type);
  const typeLabel = PROPERTY_TYPE_LABELS[type] ?? type;
  const categoryLabel = PROPERTY_CATEGORIES[category].label;

  return (
    <div className="space-y-6 pt-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="rounded-none">
          {categoryLabel}
        </Badge>
        <Badge variant="secondary" className="rounded-none">
          {typeLabel}
        </Badge>
        <StatusBadge status={property.status} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.75fr_1fr]">
        <section className="space-y-6">
          <div className="space-y-4 border border-slate-200 bg-card p-5">
            {isSale ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <ListingPriceSummary property={property} />
                <div className="border border-slate-200 bg-background p-4">
                  <p className="text-sm text-muted-foreground">Availability</p>
                  <p className="mt-2 text-base font-semibold">
                    {property.availableFrom
                      ? new Date(property.availableFrom).toLocaleDateString()
                      : "Available now"}
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-[1.3fr_0.9fr]">
                <div className="space-y-3">
                  <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Location</p>
                  <p className="text-lg font-semibold">{property.location}</p>
                  {[property.region, property.city, property.area].filter(Boolean).length > 0 ? (
                    <p className="text-sm text-muted-foreground">
                      {[property.region, property.city, property.area].filter(Boolean).join(" · ")}
                    </p>
                  ) : null}
                </div>
                <div className="border border-slate-200 bg-background p-4">
                  <p className="text-sm text-muted-foreground">Available from</p>
                  <p className="mt-2 text-base font-semibold">
                    {property.availableFrom
                      ? new Date(property.availableFrom).toLocaleDateString()
                      : "Not set"}
                  </p>
                </div>
              </div>
            )}

            {!isSale ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <ListingPriceSummary property={property} />
                <div className="border border-slate-200 bg-background p-4">
                  <p className="text-sm text-muted-foreground">Amenities</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {property.amenities?.length ? (
                      property.amenities.map((amenity) => (
                        <Badge key={amenity} variant="outline" className="rounded-none">
                          {amenity}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground">None listed</span>
                    )}
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <div className="space-y-3 border border-slate-200 bg-card p-5">
            <h3 className="text-sm font-semibold">Description</h3>
            <p className="text-sm leading-7 text-muted-foreground">{property.description}</p>
          </div>

          <div className="space-y-4 border border-slate-200 bg-card p-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold">Media attachments</h3>
              <p className="text-sm text-muted-foreground">
                {property.images?.length ?? 0} photos • {property.videos?.length ?? 0} videos
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {property.images?.map((image) => (
                <div key={image.id} className="relative overflow-hidden border border-slate-200 bg-slate-950/5">
                  <div className="aspect-[4/3] w-full">
                    <Image
                      src={resolveAssetUrl(image.url)}
                      alt={image.alt ?? property.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                </div>
              ))}
            </div>

            {property.videos?.length ? (
              <div className="space-y-4">
                <h4 className="text-sm font-semibold">Video attachments</h4>
                <div className="grid gap-4">
                  {property.videos.map((video) => (
                    <div key={video.id} className="overflow-hidden border border-slate-200 bg-background">
                      <video controls className="aspect-[16/9] w-full bg-black object-cover">
                        <source src={video.url} />
                      </video>
                      <div className="p-4">
                        <p className="text-sm font-medium">{video.title ?? "Property video"}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </section>

        <aside className="space-y-4">
          <SubmitterDetails landlord={property.landlord} />

          <div className="border border-slate-200 bg-card p-4">
            <p className="text-sm text-muted-foreground">Submitted</p>
            <p className="mt-2 text-sm font-medium">
              {new Date(property.createdAt).toLocaleString()}
            </p>
          </div>

          {!isSale ? (
            <div className="border border-slate-200 bg-card p-4">
              <p className="text-sm text-muted-foreground">Coordinates</p>
              <div className="mt-2 text-base font-medium">
                {property.latitude != null && property.longitude != null ? (
                  <span>
                    {property.latitude.toFixed(4)}, {property.longitude.toFixed(4)}
                  </span>
                ) : (
                  <span className="text-muted-foreground">Not available</span>
                )}
              </div>
            </div>
          ) : null}
        </aside>
      </div>

      {!isSale && property.latitude != null && property.longitude != null ? (
        <div className="border border-slate-200 bg-card p-5">
          <h3 className="text-sm font-semibold">Map preview</h3>
          <div className="mt-4 overflow-hidden border border-slate-200">
            <iframe
              title="Property location"
              src={`https://www.google.com/maps?q=${property.latitude},${property.longitude}&z=15&output=embed`}
              className="h-72 w-full"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function AdminPropertiesPage() {
  const [selectedProperty, setSelectedProperty] = useState<AdminPendingProperty | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("PENDING_VERIFICATION");
  const [search, setSearch] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-properties", statusFilter, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (search.trim()) params.set("search", search.trim());
      const res = await fetch(`/api/admin/properties?${params.toString()}`);
      const json = await res.json();
      return json.data as { properties: AdminPendingProperty[]; total: number };
    },
  });

  const properties = data?.properties ?? [];

  const statusMutation = useMutation({
    mutationFn: async ({
      propertyId,
      status,
      reason,
    }: {
      propertyId: string;
      status: string;
      reason?: string;
    }) => {
      const res = await fetch("/api/admin/properties", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyId, status, reason }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message ?? json.message);
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["admin-properties"] });
      setSelectedProperty(null);
      setShowRejectForm(false);
      setRejectReason("");
      toast.success(
        vars.status === "ACTIVE"
          ? "Listing approved"
          : vars.status === "INACTIVE"
            ? "Listing rejected / suspended"
            : "Listing updated"
      );
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const approveMutation = {
    mutate: (id: string) => statusMutation.mutate({ propertyId: id, status: "ACTIVE" }),
    isPending: statusMutation.isPending,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Listing moderation</h1>
        <p className="text-sm text-muted-foreground">
          {data?.total ?? 0} listing{(data?.total ?? 0) === 1 ? "" : "s"}
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {STATUS_TABS.map((tab) => (
            <Button
              key={tab.value}
              type="button"
              size="sm"
              variant={statusFilter === tab.value ? "default" : "outline"}
              className={cn(
                "rounded-none",
                statusFilter === tab.value && "bg-emerald-600 hover:bg-emerald-700"
              )}
              onClick={() => setStatusFilter(tab.value)}
            >
              {tab.label}
            </Button>
          ))}
        </div>
        <Input
          placeholder="Search by name or location…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs rounded-none"
        />
      </div>

      <Card className="rounded-none">
        <CardHeader>
          <CardTitle>Listings</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : !properties.length ? (
            <p className="text-sm text-muted-foreground">No listings found.</p>
          ) : (
            <ul className="space-y-3">
              {properties.map((property) => {
                const type = (property.propertyType ?? "APARTMENT") as PropertyType;
                const isSale = isSaleListing(type);
                const verification = getVerificationStatus(property.landlord);
                const priceLabel = isSale
                  ? formatGhs(property.monthlyRent)
                  : `${formatGhs(property.monthlyRent)}/mo`;

                return (
                  <li
                    key={property.id}
                    className="flex flex-col gap-4 border border-slate-200 p-4 sm:flex-row sm:items-start sm:justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-2">
                        <span className="text-sm font-semibold">{property.name}</span>
                        <Badge variant="outline" className="rounded-none">
                          {PROPERTY_TYPE_LABELS[type] ?? type}
                        </Badge>
                        <StatusBadge status={property.status} />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {isSale ? "Sale listing" : property.location} · {priceLabel}
                      </p>
                      <div className="grid gap-1 text-xs text-slate-600 sm:grid-cols-2 sm:gap-x-6">
                        <p>
                          <span className="font-medium text-slate-800">Name:</span>{" "}
                          {property.landlord?.fullName ?? "Unknown"}
                        </p>
                        <p>
                          <span className="font-medium text-slate-800">Email:</span>{" "}
                          {property.landlord?.user?.email ?? "—"}
                        </p>
                        <p>
                          <span className="font-medium text-slate-800">Phone:</span>{" "}
                          {property.landlord?.user?.phone ?? "Not provided"}
                        </p>
                        <p className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-slate-800">Verification:</span>
                          <StatusBadge status={verification.status} label={verification.label} />
                        </p>
                      </div>
                      <p className="text-xs text-slate-600">
                        {property.images?.length ?? 0} photo(s) · {property.videos?.length ?? 0} video(s)
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-none"
                        onClick={() => setSelectedProperty(property)}
                      >
                        View details
                      </Button>
                      {property.status === "PENDING_VERIFICATION" ? (
                        <>
                          <Button
                            size="sm"
                            className="rounded-none bg-emerald-600 hover:bg-emerald-700"
                            onClick={() => approveMutation.mutate(property.id)}
                            disabled={approveMutation.isPending}
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-none text-red-600"
                            onClick={() => {
                              setSelectedProperty(property);
                              setShowRejectForm(true);
                            }}
                          >
                            Reject
                          </Button>
                        </>
                      ) : property.status === "ACTIVE" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-none text-red-600"
                          onClick={() =>
                            statusMutation.mutate({
                              propertyId: property.id,
                              status: "INACTIVE",
                              reason: "Suspended by admin",
                            })
                          }
                        >
                          Suspend
                        </Button>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={Boolean(selectedProperty)}
        onOpenChange={(open) => {
          if (!open) setSelectedProperty(null);
        }}
      >
        <DialogContent className="max-h-[92vh] w-full max-w-[95vw] overflow-y-auto rounded-none p-6 lg:max-w-[90vw]">
          <DialogHeader>
            <div className="flex flex-col gap-3 pr-10 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <DialogTitle>{selectedProperty?.name}</DialogTitle>
                <p className="text-sm text-muted-foreground">
                  Review submitted listing details and media before approving.
                </p>
              </div>
            </div>
          </DialogHeader>

          {selectedProperty ? (
            <>
              <PropertyReviewBody property={selectedProperty} />
              {showRejectForm ? (
                <div className="space-y-3 border border-red-200 bg-red-50/50 p-4">
                  <Label htmlFor="reject-reason">Rejection reason</Label>
                  <Textarea
                    id="reject-reason"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Explain what the merchant should fix…"
                    className="rounded-none"
                  />
                  <Button
                    variant="destructive"
                    className="rounded-none"
                    disabled={statusMutation.isPending || rejectReason.trim().length < 5}
                    onClick={() =>
                      statusMutation.mutate({
                        propertyId: selectedProperty.id,
                        status: "INACTIVE",
                        reason: rejectReason.trim(),
                      })
                    }
                  >
                    Confirm rejection
                  </Button>
                </div>
              ) : null}
              <div className="flex flex-wrap justify-end gap-3 border-t border-slate-200 pt-4">
                <Button
                  variant="outline"
                  className="rounded-none"
                  onClick={() => {
                    setSelectedProperty(null);
                    setShowRejectForm(false);
                    setRejectReason("");
                  }}
                >
                  Close
                </Button>
                {selectedProperty.status === "PENDING_VERIFICATION" && !showRejectForm ? (
                  <>
                    <Button
                      variant="outline"
                      className="rounded-none text-red-600"
                      onClick={() => setShowRejectForm(true)}
                    >
                      Reject listing
                    </Button>
                    <Button
                      className="rounded-none bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => approveMutation.mutate(selectedProperty.id)}
                      disabled={approveMutation.isPending}
                    >
                      {approveMutation.isPending ? "Approving…" : "Approve listing"}
                    </Button>
                  </>
                ) : null}
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
