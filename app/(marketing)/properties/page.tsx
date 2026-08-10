"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { useMemo, useState } from "react";
import { Bed, Car, MapPin, Refrigerator, Search, SlidersHorizontal } from "lucide-react";
import { PropertySaveButton } from "@/components/properties/property-save-button";
import { resolveAssetUrl } from "@/lib/utils/asset-url";
import {
  PROPERTY_CATEGORIES,
  PROPERTY_TYPE_LABELS,
  RESIDENTIAL_TYPES,
  isSaleListing,
  type PropertyCategory,
} from "@/lib/subscription-limits";
import type { PropertyType } from "@prisma/client";
import { cn } from "@/lib/utils";

function listingIcon(type: string) {
  if (type === "CAR") return Car;
  if (type === "APPLIANCE") return Refrigerator;
  return Bed;
}

function getCategoryLabel(value: "ALL" | PropertyCategory) {
  if (value === "ALL") return "All categories";
  return PROPERTY_CATEGORIES[value].label;
}

function getTypeLabel(value: string) {
  if (value === "ALL") return "All types";
  return PROPERTY_TYPE_LABELS[value as PropertyType] ?? value;
}

function ListingCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="aspect-[4/3] animate-pulse bg-slate-100 sm:aspect-video" />
      <div className="space-y-2 p-3 sm:p-4">
        <div className="h-4 w-4/5 animate-pulse rounded bg-slate-100" />
        <div className="h-3 w-3/5 animate-pulse rounded bg-slate-100" />
        <div className="h-5 w-2/5 animate-pulse rounded bg-slate-100" />
      </div>
    </div>
  );
}

export default function PropertiesPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<"ALL" | PropertyCategory>("ALL");
  const [propertyType, setPropertyType] = useState("ALL");

  const typeOptions = useMemo(() => {
    if (category === "ALL") {
      return [
        ...RESIDENTIAL_TYPES.map((type) => ({ value: type, label: PROPERTY_TYPE_LABELS[type] })),
        { value: "CAR" as PropertyType, label: PROPERTY_TYPE_LABELS.CAR },
        { value: "APPLIANCE" as PropertyType, label: PROPERTY_TYPE_LABELS.APPLIANCE },
      ];
    }
    return PROPERTY_CATEGORIES[category].types.map((type) => ({
      value: type,
      label: PROPERTY_TYPE_LABELS[type],
    }));
  }, [category]);

  const { data, isLoading } = useQuery({
    queryKey: ["properties", search, category, propertyType],
    queryFn: async () => {
      const params = new URLSearchParams({
        search,
        page: "1",
        limit: "12",
      });
      if (category !== "ALL") params.set("category", category);
      if (propertyType !== "ALL") params.set("propertyType", propertyType);

      const res = await fetch(`/api/properties?${params}`);
      const json = await res.json();
      return json.data;
    },
  });

  const itemCount = data?.items?.length ?? 0;
  const hasActiveFilters =
    search.trim().length > 0 || category !== "ALL" || propertyType !== "ALL";

  return (
    <div className="min-h-screen bg-slate-50/60">
      <section className="border-b border-emerald-100 bg-gradient-to-b from-emerald-50 to-white">
        <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-10">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-600 sm:text-xs">
            Marketplace
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-emerald-950 sm:text-3xl">
            Browse listings
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
            Find houses, rooms, cars, and home appliances — apply for rental financing
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-8">
        <div className="rounded-2xl bg-white p-4 sm:p-5">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500 sm:text-sm">
            <SlidersHorizontal className="h-4 w-4 text-emerald-600" />
            <span>Search &amp; filters</span>
          </div>

          <div className="relative mt-3">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search location, name, or keyword"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-11 border-slate-200 bg-slate-50 pl-10 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:bg-white"
            />
          </div>

          <div className="mt-4 sm:hidden">
            <p className="mb-2 text-xs font-medium text-slate-500">Category</p>
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <button
                type="button"
                onClick={() => {
                  setCategory("ALL");
                  setPropertyType("ALL");
                }}
                className={cn(
                  "shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium transition sm:px-4 sm:text-sm",
                  category === "ALL"
                    ? "border-emerald-600 bg-emerald-600 text-white shadow-sm"
                    : "border-slate-200 bg-white text-slate-600 hover:border-emerald-200 hover:text-emerald-700"
                )}
              >
                All
              </button>
              {(Object.keys(PROPERTY_CATEGORIES) as PropertyCategory[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setCategory(key);
                    setPropertyType("ALL");
                  }}
                  className={cn(
                    "shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium transition sm:px-4 sm:text-sm",
                    category === key
                      ? "border-emerald-600 bg-emerald-600 text-white shadow-sm"
                      : "border-slate-200 bg-white text-slate-600 hover:border-emerald-200 hover:text-emerald-700"
                  )}
                >
                  {PROPERTY_CATEGORIES[key].label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="hidden sm:block">
              <label className="mb-1.5 block text-xs font-medium text-slate-500">Category</label>
              <Select
                value={category}
                onValueChange={(value) => {
                  setCategory((value ?? "ALL") as "ALL" | PropertyCategory);
                  setPropertyType("ALL");
                }}
              >
                <SelectTrigger className="h-11 w-full border-slate-200 bg-slate-50 text-sm text-slate-900">
                  {getCategoryLabel(category)}
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All categories</SelectItem>
                  {(Object.keys(PROPERTY_CATEGORIES) as PropertyCategory[]).map((key) => (
                    <SelectItem key={key} value={key}>
                      {PROPERTY_CATEGORIES[key].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-500">Listing type</label>
              <Select value={propertyType} onValueChange={(value) => setPropertyType(value ?? "ALL")}>
                <SelectTrigger className="h-11 w-full border-slate-200 bg-slate-50 text-sm text-slate-900">
                  {getTypeLabel(propertyType)}
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All types</SelectItem>
                  {typeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {hasActiveFilters ? (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4">
              <p className="text-xs text-slate-500 sm:text-sm">
                {isLoading ? "Updating results..." : `${itemCount} listing${itemCount === 1 ? "" : "s"} found`}
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
                onClick={() => {
                  setSearch("");
                  setCategory("ALL");
                  setPropertyType("ALL");
                }}
              >
                Clear filters
              </Button>
            </div>
          ) : null}
        </div>

        <div className="mt-6 sm:mt-8">
          {isLoading ? (
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 lg:gap-6">
              {Array.from({ length: 6 }).map((_, index) => (
                <ListingCardSkeleton key={index} />
              ))}
            </div>
          ) : !data?.items?.length ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center">
              <p className="text-base font-medium text-slate-800">No listings found</p>
              <p className="mt-2 text-sm text-slate-500">
                Try another category or clear your filters to see more results.
              </p>
              {hasActiveFilters ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => {
                    setSearch("");
                    setCategory("ALL");
                    setPropertyType("ALL");
                  }}
                >
                  Clear filters
                </Button>
              ) : null}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 lg:gap-6">
              {data.items.map((property: {
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
                    className="gap-0 overflow-hidden rounded-xl border-slate-200 bg-white py-0 shadow-sm [&_img]:rounded-none"
                  >
                    <div className="relative aspect-[4/3] bg-slate-100 sm:aspect-video">
                      <PropertySaveButton propertyId={property.id} />
                      {property.images?.[0]?.url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={resolveAssetUrl(property.images[0].url)}
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
                        {property.isPremium && (
                          <Badge className="shrink-0 bg-amber-500 px-1.5 text-[10px] sm:text-xs">
                            Premium
                          </Badge>
                        )}
                      </div>
                      {!isSale && (
                        <p className="flex items-center gap-1 truncate text-[11px] text-slate-500 sm:text-sm">
                          <MapPin className="h-3 w-3 shrink-0" />
                          {property.location}
                        </p>
                      )}
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
                        className="h-9 w-full rounded-lg bg-emerald-600 text-xs hover:bg-emerald-700 sm:h-9 sm:text-sm"
                      >
                        <Link href={`/properties/${property.id}`}>View details</Link>
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
