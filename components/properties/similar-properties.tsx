"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { isSaleListing } from "@/lib/subscription-limits";
import { resolvePropertyImageDisplayUrl } from "@/lib/utils/property-image-display";
import type { PropertyType } from "@prisma/client";

type SimilarProperty = {
  id: string;
  name: string;
  propertyType: PropertyType;
  location: string;
  monthlyRent: unknown;
  discountedPrice?: unknown;
  images?: { id?: string; url: string; alt?: string | null; displayUrl?: string | null }[];
};

export function SimilarPropertiesSection({ items }: { items: SimilarProperty[] }) {
  if (!items.length) return null;

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-bold">Similar listings</h2>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => {
          const isSale = isSaleListing(item.propertyType);
          const price = Number(item.monthlyRent);
          const discounted = item.discountedPrice != null ? Number(item.discountedPrice) : null;
          const image = item.images?.[0];

          return (
            <Link key={item.id} href={`/properties/${item.id}`}>
              <Card className="h-full overflow-hidden rounded-none py-0 shadow-xs transition-colors hover:bg-muted/20">
                <div className="relative aspect-[4/3] bg-muted">
                  {image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={image.displayUrl ?? resolvePropertyImageDisplayUrl(image)}
                      alt={image.alt ?? item.name}
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </div>
                <CardContent className="space-y-1 p-4">
                  <p className="line-clamp-2 font-medium">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.location}</p>
                  <p className="text-sm font-semibold text-emerald-700">
                    GHS {(discounted ?? price).toLocaleString()}
                    {!isSale ? <span className="font-normal text-muted-foreground">/month</span> : null}
                  </p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
