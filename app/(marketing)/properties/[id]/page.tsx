"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Eye, Bookmark, Phone, Mail } from "lucide-react";
import { PropertySaveButton } from "@/components/properties/property-save-button";
import { PropertyImageGallery } from "@/components/properties/property-image-gallery";
import { PropertyLocationSheet, PropertyLocationTrigger } from "@/components/properties/property-location-sheet";
import { PropertySpecsGrid } from "@/components/properties/property-specs-grid";
import { SimilarPropertiesSection } from "@/components/properties/similar-properties";
import { PropertyActionPanel } from "@/components/properties/property-action-panel";
import { useAuthReturnPath } from "@/hooks/use-auth-return-path";
import { buildLoginUrl, buildRegisterUrl } from "@/lib/utils/auth-callback-url";
import { buildPropertySpecs } from "@/lib/utils/property-specs";
import { isEmploymentRecorded } from "@/lib/constants/employment-status";
import { isSaleListing } from "@/lib/subscription-limits";
import type { PropertyType } from "@prisma/client";
import { toast } from "sonner";
import {
  extractSavedPropertyIds,
  markSavedPropertyViewedAndSyncCount,
} from "@/lib/nav/saved-property-views";

export default function PropertyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const returnPath = useAuthReturnPath();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const [locationOpen, setLocationOpen] = useState(false);
  const [depositPromptOpen, setDepositPromptOpen] = useState(false);
  const [moveInDate, setMoveInDate] = useState("");
  const [notes, setNotes] = useState("");
  const [amount, setAmount] = useState("");
  const [months, setMonths] = useState("12");

  const { data: property, isLoading } = useQuery({
    queryKey: ["property", id],
    queryFn: async () => {
      const res = await fetch(`/api/properties/${id}`);
      const json = await res.json();
      return json.data;
    },
  });

  const { data: wallet } = useQuery({
    queryKey: ["wallet"],
    queryFn: async () => {
      const res = await fetch("/api/wallet");
      const json = await res.json();
      return json.data;
    },
    enabled: !!session?.user && session.user.role === "BUYER",
  });

  const { data: kycStatus } = useQuery({
    queryKey: ["kyc-status"],
    queryFn: async () => {
      const res = await fetch("/api/kyc");
      const json = await res.json();
      return json.data;
    },
    enabled: session?.user?.role === "BUYER",
  });

  const { data: financingDocs } = useQuery({
    queryKey: ["tenant-financing-docs"],
    queryFn: async () => {
      const res = await fetch("/api/buyer/financing-documents");
      const json = await res.json();
      return json.data;
    },
    enabled: session?.user?.role === "BUYER",
  });

  const { data: applications } = useQuery({
    queryKey: ["applications"],
    queryFn: async () => {
      const res = await fetch("/api/applications");
      const json = await res.json();
      return json.data ?? [];
    },
    enabled: session?.user?.role === "BUYER",
  });

  const { data: savedItems = [] } = useQuery({
    queryKey: ["saved-properties"],
    queryFn: async () => {
      const res = await fetch("/api/properties/saved");
      const json = await res.json();
      return json.success ? (json.data ?? []) : [];
    },
    enabled: session?.user?.role === "BUYER",
  });

  useEffect(() => {
    if (!id || session?.user?.role !== "BUYER") return;
    const propertyIds = extractSavedPropertyIds(savedItems);
    if (!propertyIds.includes(id)) return;
    markSavedPropertyViewedAndSyncCount(queryClient, propertyIds, id);
  }, [id, queryClient, savedItems, session?.user?.role]);

  const chatMutation = useMutation({
    mutationFn: async ({
      recipientUserId,
      label,
    }: {
      recipientUserId: string;
      label: string;
    }) => {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientId: recipientUserId,
          content: `Hi ${label}, I'm interested in ${property?.name ?? "this property"}.`,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message ?? "Unable to start chat");
      return json.data;
    },
    onSuccess: () => {
      router.push("/dashboard/buyer/messages");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <p className="p-12 text-center text-muted-foreground">Loading...</p>;
  if (!property) return <p className="p-12 text-center">Property not found</p>;

  const images = property.images ?? [];
  const isSale = isSaleListing(property.propertyType as PropertyType);
  const listPrice = Number(property.monthlyRent);
  const discountedPrice = property.discountedPrice ? Number(property.discountedPrice) : null;
  const purchasePrice = discountedPrice ?? listPrice;
  const walletBalance = Number(wallet?.balance ?? 0);
  const specs = buildPropertySpecs(property);
  const listedAgo = property.stats?.listedAt
    ? formatDistanceToNow(new Date(property.stats.listedAt), { addSuffix: true })
    : formatDistanceToNow(new Date(property.createdAt), { addSuffix: true });

  const approvedApplication = applications?.find(
    (app: { propertyId: string; status: string }) =>
      app.propertyId === id && app.status === "APPROVED"
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

  const displayAgent = property.contacts?.agent ?? property.agent;
  const displayLandlord = property.contacts?.landlord;

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <PropertyImageGallery images={images} title={property.name} />
          <div className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-3xl font-bold">{property.name}</h1>
                  {property.isPremium ? <Badge className="bg-amber-500">Premium</Badge> : null}
                </div>
                <p className="mt-2 text-sm text-muted-foreground">Listed {listedAgo}</p>
                <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Eye className="h-4 w-4" />
                    {property.stats?.viewCount ?? 0} views
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Bookmark className="h-4 w-4" />
                    {property.stats?.saveCount ?? 0} saves
                  </span>
                </div>
              </div>
              {!isSale ? <PropertyLocationTrigger onClick={() => setLocationOpen(true)} /> : null}
            </div>

            {!isSale ? (
              <p className="text-muted-foreground">
                {[
                  property.houseNumber,
                  property.street,
                  property.area,
                  property.city,
                  property.region,
                  property.digitalAddress,
                  property.landmark,
                ]
                  .filter(Boolean)
                  .join(" · ") || property.location}
              </p>
            ) : null}

            {isSale ? (
              <div className="space-y-1">
                {discountedPrice ? (
                  <>
                    <p className="text-lg text-muted-foreground line-through">
                      GHS {listPrice.toLocaleString()}
                    </p>
                    <p className="text-3xl font-bold text-emerald-600">
                      GHS {discountedPrice.toLocaleString()}
                    </p>
                  </>
                ) : (
                  <p className="text-3xl font-bold text-emerald-600">
                    GHS {listPrice.toLocaleString()}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-3xl font-bold text-emerald-600">
                GHS {listPrice.toLocaleString()}
                <span className="text-base font-normal text-muted-foreground">/month</span>
              </p>
            )}
          </div>

          <PropertySpecsGrid specs={specs} />

          <Card className="rounded-none">
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-muted-foreground">{property.description}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {property.amenities?.map((amenity: string) => (
                  <Badge key={amenity} variant="secondary">
                    {amenity}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {(displayAgent || displayLandlord) && (
            <Card className="rounded-none">
              <CardHeader>
                <CardTitle>Contacts</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {displayLandlord ? (
                  <div className="flex items-center gap-4">
                    {displayLandlord.image ? (
                      <Image
                        src={displayLandlord.image}
                        alt={displayLandlord.name}
                        width={48}
                        height={48}
                        className="size-12 rounded-full object-cover"
                      />
                    ) : null}
                    <div>
                      <p className="font-medium">{displayLandlord.name}</p>
                      <p className="text-xs text-muted-foreground">Merchant</p>
                      {displayLandlord.phone ? (
                        <p className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Phone className="h-3 w-3" /> {displayLandlord.phone}
                        </p>
                      ) : null}
                      {displayLandlord.email ? (
                        <p className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Mail className="h-3 w-3" /> {displayLandlord.email}
                        </p>
                      ) : null}
                    </div>
                  </div>
                ) : null}
                {displayAgent ? (
                  <div className="flex items-center gap-4">
                    {displayAgent.image ? (
                      <Image
                        src={displayAgent.image}
                        alt={displayAgent.name}
                        width={48}
                        height={48}
                        className="size-12 rounded-full object-cover"
                      />
                    ) : null}
                    <div>
                      <p className="font-medium">{displayAgent.name}</p>
                      <p className="text-xs text-muted-foreground">Affiliate</p>
                      {displayAgent.phone ? (
                        <p className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Phone className="h-3 w-3" /> {displayAgent.phone}
                        </p>
                      ) : null}
                      {displayAgent.email ? (
                        <p className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Mail className="h-3 w-3" /> {displayAgent.email}
                        </p>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          )}

          <SimilarPropertiesSection items={property.similar ?? []} />
        </div>

        <div className="space-y-4">
          <PropertySaveButton propertyId={id} variant="button" />
          {session ? (
            session.user.role === "BUYER" ? (
              <PropertyActionPanel
                propertyId={id}
                propertyName={property.name}
                isSale={isSale}
                purchasePrice={purchasePrice}
                walletBalance={walletBalance}
                monthlyRent={listPrice}
                propertyStatus={property.status}
                kycVerified={financingReady}
                financingDocsApproved={Boolean(financingDocs?.allApproved)}
                approvedApplication={approvedApplication}
                moveInDate={moveInDate}
                setMoveInDate={setMoveInDate}
                notes={notes}
                setNotes={setNotes}
                amount={amount}
                setAmount={setAmount}
                months={months}
                setMonths={setMonths}
                onDepositPrompt={() => setDepositPromptOpen(true)}
                onChat={(recipientUserId, label) =>
                  chatMutation.mutate({ recipientUserId, label })
                }
                contacts={{
                  landlord: displayLandlord?.userId
                    ? { userId: displayLandlord.userId, name: displayLandlord.name }
                    : null,
                  agent: displayAgent?.userId
                    ? { userId: displayAgent.userId, name: displayAgent.name }
                    : null,
                }}
              />
            ) : null
          ) : (
            <Card className="rounded-none">
              <CardContent className="pt-6">
                <p className="mb-4 text-sm text-muted-foreground">
                  Sign in to buy or request financing for this listing.
                </p>
                <div className="flex flex-col gap-2">
                  <Button asChild className="w-full rounded-none bg-emerald-600 hover:bg-emerald-700">
                    <Link href={buildLoginUrl(returnPath, "BUYER")}>Sign in</Link>
                  </Button>
                  <Button asChild variant="outline" className="w-full rounded-none">
                    <Link href={buildRegisterUrl(returnPath)}>Create account</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {!isSale ? (
        <PropertyLocationSheet
          open={locationOpen}
          onOpenChange={setLocationOpen}
          property={property}
        />
      ) : null}

      <Dialog open={depositPromptOpen} onOpenChange={setDepositPromptOpen}>
        <DialogContent className="rounded-none">
          <DialogHeader>
            <DialogTitle>Insufficient wallet balance</DialogTitle>
            <DialogDescription>
              You need GHS {purchasePrice.toLocaleString()} but your balance is GHS{" "}
              {walletBalance.toLocaleString()}. Deposit funds to continue.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" className="rounded-none" onClick={() => setDepositPromptOpen(false)}>
              Cancel
            </Button>
            <Button asChild className="rounded-none bg-emerald-600 hover:bg-emerald-700">
              <Link href="/dashboard/buyer/wallet">Deposit to wallet</Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
