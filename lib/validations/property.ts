import { z } from "zod";
import { hasStructuredLocation } from "@/lib/utils/property-location";

const PROPERTY_TYPES = [
  "APARTMENT",
  "HOUSE",
  "CONDO",
  "TOWNHOUSE",
  "STUDIO",
  "COMMERCIAL",
  "LAND",
  "CAR",
  "APPLIANCE",
] as const;

const SALE_TYPES = new Set(["CAR", "APPLIANCE"]);

function optionalPositiveNumber() {
  return z.preprocess((val) => {
    if (val === "" || val === null || val === undefined) return undefined;
    const num = typeof val === "number" ? val : Number(val);
    if (!Number.isFinite(num) || num <= 0) return undefined;
    return num;
  }, z.number().positive().optional());
}

function requiredPositiveNumber(message = "Must be a positive number") {
  return z.preprocess((val) => {
    if (val === "" || val === null || val === undefined) return NaN;
    const num = typeof val === "number" ? val : Number(val);
    return num;
  }, z.number().positive(message));
}

const optionalDateTime = z.preprocess((val) => {
  if (val === "" || val === null || val === undefined) return undefined;
  const text = String(val).trim();
  if (!text) return undefined;
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return text;
  return date.toISOString();
}, z.string().datetime().optional());

const optionalString = z.preprocess((val) => {
  if (val === "" || val === null || val === undefined) return undefined;
  const text = String(val).trim();
  return text || undefined;
}, z.string().optional());

export const propertySchema = z
  .object({
    name: z.string().min(3, "Name must be at least 3 characters"),
    propertyType: z.enum(PROPERTY_TYPES),
    monthlyRent: requiredPositiveNumber("Price/rent must be a positive number"),
    annualRent: optionalPositiveNumber(),
    discountedPrice: optionalPositiveNumber(),
    location: z.string().optional(),
    region: optionalString,
    city: optionalString,
    area: optionalString,
    street: optionalString,
    houseNumber: optionalString,
    digitalAddress: optionalString,
    landmark: optionalString,
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    description: z.string().min(20, "Description must be at least 20 characters"),
    amenities: z.array(z.string()).optional(),
    attributes: z.record(z.string(), z.unknown()).optional(),
    availableFrom: optionalDateTime,
    stockQuantity: z.coerce.number().int().min(0).default(1),
    deliveryTerms: z.string().min(5, "Delivery terms must be at least 5 characters").optional(),
    warrantyDetails: z.string().min(5, "Warranty details must be at least 5 characters").optional(),
  })
  .superRefine((data, ctx) => {
    const isSale = SALE_TYPES.has(data.propertyType);

    if (isSale) {
      if (
        data.discountedPrice !== undefined &&
        data.discountedPrice >= data.monthlyRent
      ) {
        ctx.addIssue({
          code: "custom",
          message: "Discounted price must be less than the listing price",
          path: ["discountedPrice"],
        });
      }
      return;
    }

    const hasLocation =
      hasStructuredLocation(data) ||
      (data.location && data.location.trim().length >= 5);

    if (!hasLocation) {
      ctx.addIssue({
        code: "custom",
        message:
          "Add at least one location detail (region, city, area, street, landmark, or similar)",
        path: ["location"],
      });
    }

    if (!data.annualRent) {
      ctx.addIssue({
        code: "custom",
        message: "Annual rent is required",
        path: ["annualRent"],
      });
    }
  });

export function parseOptionalFormNumber(value: FormDataEntryValue | null): number | undefined {
  if (value === null || value === undefined || String(value).trim() === "") {
    return undefined;
  }
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return undefined;
  return num;
}

export function normalizePropertyPayload(data: z.infer<typeof propertySchema>) {
  const isSale = SALE_TYPES.has(data.propertyType);
  const structuredLocation = [
    data.houseNumber,
    data.street,
    data.area,
    data.city,
    data.region,
    data.digitalAddress,
    data.landmark,
  ]
    .filter(Boolean)
    .join(" · ");

  const location = isSale
    ? "Ghana"
    : (structuredLocation || data.location || "").trim();

  return {
    ...data,
    location,
    annualRent: isSale ? data.monthlyRent : data.annualRent!,
    discountedPrice: isSale && data.discountedPrice ? data.discountedPrice : null,
    latitude: isSale ? undefined : data.latitude,
    longitude: isSale ? undefined : data.longitude,
    region: isSale ? undefined : data.region,
    city: isSale ? undefined : data.city,
    area: isSale ? undefined : data.area,
    street: isSale ? undefined : data.street,
    houseNumber: isSale ? undefined : data.houseNumber,
    digitalAddress: isSale ? undefined : data.digitalAddress,
    landmark: isSale ? undefined : data.landmark,
  };
}

export const propertyFilterSchema = z.object({
  search: z.string().optional(),
  propertyType: z.string().optional(),
  category: z.enum(["residential", "car", "appliance"]).optional(),
  minRent: z.coerce.number().optional(),
  maxRent: z.coerce.number().optional(),
  location: z.string().optional(),
  page: z.coerce.number().default(1),
  limit: z.coerce.number().default(12),
});

export const agentSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(10),
  email: z.string().email(),
  image: z.string().url().optional(),
});

export type PropertyInput = z.infer<typeof propertySchema>;
export type PropertyFilterInput = z.infer<typeof propertyFilterSchema>;
