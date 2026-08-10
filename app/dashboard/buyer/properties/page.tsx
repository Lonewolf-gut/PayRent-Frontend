"use client";

import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin } from "lucide-react";
import { resolveAssetUrl } from "@/lib/utils/asset-url";
import {
  countUnviewedSavedProperties,
  extractSavedPropertyIds,
  markAllSavedPropertiesViewedAndSyncCount,
  markSavedPropertyViewedAndSyncCount,
} from "@/lib/nav/saved-property-views";

export default function TenantSavedPropertiesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: saved, isLoading } = useQuery({
    queryKey: ["saved-properties"],
    queryFn: async () => {
      const res = await fetch("/api/properties/saved");
      const json = await res.json();
      return json.data ?? [];
    },
  });

  const propertyIds = extractSavedPropertyIds(saved ?? []);
  const unviewedCount = countUnviewedSavedProperties(propertyIds);

  useEffect(() => {
    if (!propertyIds.length) return;
    markAllSavedPropertiesViewedAndSyncCount(queryClient, propertyIds);
  }, [propertyIds, queryClient]);

  function handleOpenSaved(propertyId: string) {
    markSavedPropertyViewedAndSyncCount(queryClient, propertyIds, propertyId);
    router.push(`/properties/${propertyId}`);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Saved Properties</h1>
          {unviewedCount > 0 ? (
            <Badge className="bg-emerald-600">{unviewedCount}</Badge>
          ) : null}
        </div>
        <Button asChild variant="outline">
          <Link href="/properties">Browse more</Link>
        </Button>
      </div>
      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : !saved?.length ? (
        <p className="text-muted-foreground">No saved properties yet.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {saved.map((item: {
            propertyId?: string;
            property: {
              id: string;
              name: string;
              location: string;
              monthlyRent: number;
              images?: { url: string }[];
            };
          }) => {
            const propertyId = item.propertyId ?? item.property.id;
            const itemUnviewed = countUnviewedSavedProperties([propertyId]) > 0;

            return (
            <Card key={propertyId} className="rounded-none">
              <div className="relative aspect-video bg-muted">
                {itemUnviewed ? (
                  <Badge className="absolute left-2 top-2 z-10 bg-emerald-600">New</Badge>
                ) : null}
                {item.property.images?.[0]?.url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={resolveAssetUrl(item.property.images[0].url)}
                    alt={item.property.name}
                    className="h-full w-full object-cover"
                  />
                )}
              </div>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{item.property.name}</CardTitle>
                <p className="flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  {item.property.location}
                </p>
              </CardHeader>
              <CardContent>
                <p className="font-bold text-emerald-600">
                  GHS {Number(item.property.monthlyRent).toLocaleString()}/mo
                </p>
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => handleOpenSaved(propertyId)}
                >
                  View
                </Button>
              </CardFooter>
            </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
