"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Bed, Car, MapPin, Refrigerator } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  isSaleListing,
  PROPERTY_TYPE_LABELS,
  type PropertyType,
} from "@/lib/subscription-limits";

function listingIcon(type: string) {
  if (type === "CAR") return Car;
  if (type === "APPLIANCE") return Refrigerator;
  return Bed;
}

export function FeaturedListingsSection() {
  const { data, isLoading } = useQuery({
    queryKey: ["featured-properties"],
    queryFn: async () => {
      const params = new URLSearchParams({ page: "1", limit: "6" });
      const res = await fetch(`/api/properties?${params}`);
      const json = await res.json();
      return json.data;
    },
  });

  const items = data?.items ?? [];

  if (isLoading) {
    return (
      <section className="bg-white py-12 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center">
            <h2 className="text-xl font-bold text-emerald-950 sm:text-3xl">Featured listings</h2>
            <p className="mt-3 text-sm text-slate-600 sm:text-base">Loading approved listings...</p>
          </div>
        </div>
      </section>
    );
  }

  if (!items.length) {
    return null;
  }

  return (
    <section className="bg-white py-12 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600 sm:text-sm">
              Marketplace
            </p>
            <h2 className="mt-2 text-xl font-bold text-emerald-950 sm:text-3xl">Featured listings</h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-600 sm:text-base">
              Browse approved homes, vehicles, and appliances available on PayForMe right now.
            </p>
          </div>
          <Button asChild variant="outline" className="shrink-0 border-emerald-200 text-emerald-700">
            <Link href="/properties">View all listings</Link>
          </Button>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 lg:gap-6">
          {items.map((property: {
            id: string;
            name: string;
            location: string;
            monthlyRent: number;
            discountedPrice?: number | null;
            propertyType: string;
            isPremium: boolean;
            images?: { url: string }[];
          }) => {
            const Icon = listingIcon(property.propertyType);
            const isSale = isSaleListing(property.propertyType as PropertyType);
            const price = Number(property.monthlyRent);
            const discounted = property.discountedPrice
              ? Number(property.discountedPrice)
              : null;

            return (
              <Card
                key={property.id}
                className="gap-0 overflow-hidden rounded-xl border-slate-200 bg-white py-0 shadow-sm"
              >
                <div className="relative aspect-[4/3] bg-slate-100 sm:aspect-video">
                  {property.images?.[0]?.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={property.images[0].url}
                      alt={property.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-slate-400">
                      <Icon className="h-10 w-10 sm:h-12 sm:w-12" />
                    </div>
                  )}
                </div>
                <CardHeader className="gap-0.5 p-3 pb-0 sm:p-4 sm:pb-0">
                  <div className="flex items-start justify-between gap-1">
                    <CardTitle className="line-clamp-2 text-sm font-semibold leading-tight text-slate-900 sm:text-lg">
                      {property.name}
                    </CardTitle>
                    {property.isPremium ? (
                      <Badge className="shrink-0 bg-amber-500 px-1.5 text-[10px] sm:text-xs">
                        Premium
                      </Badge>
                    ) : null}
                  </div>
                  {!isSale ? (
                    <p className="flex items-center gap-1 truncate text-[11px] text-slate-500 sm:text-sm">
                      <MapPin className="h-3 w-3 shrink-0" />
                      {property.location}
                    </p>
                  ) : null}
                </CardHeader>
                <CardContent className="p-3 pt-1.5 sm:p-4 sm:pt-2">
                  {isSale ? (
                    <div className="space-y-0.5">
                      {discounted ? (
                        <>
                          <p className="text-xs text-slate-400 line-through sm:text-sm">
                            GHS {price.toLocaleString()}
                          </p>
                          <p className="text-sm font-bold text-emerald-600 sm:text-xl">
                            GHS {discounted.toLocaleString()}
                          </p>
                        </>
                      ) : (
                        <p className="text-sm font-bold text-emerald-600 sm:text-xl">
                          GHS {price.toLocaleString()}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm font-bold text-emerald-600 sm:text-xl">
                      GHS {price.toLocaleString()}
                      <span className="text-[11px] font-normal text-slate-500 sm:text-sm">/mo</span>
                    </p>
                  )}
                  <Badge variant="secondary" className="mt-1.5 text-[10px] sm:text-xs">
                    {PROPERTY_TYPE_LABELS[property.propertyType as PropertyType] ??
                      property.propertyType}
                  </Badge>
                </CardContent>
                <CardFooter className="p-3 pt-0 sm:p-4 sm:pt-0">
                  <Button
                    asChild
                    size="sm"
                    className="h-9 w-full rounded-lg bg-emerald-600 text-xs hover:bg-emerald-700 sm:text-sm"
                  >
                    <Link href={`/properties/${property.id}`}>View details</Link>
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
