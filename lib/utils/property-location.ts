export type StructuredLocationParts = {
  region?: string | null;
  city?: string | null;
  area?: string | null;
  street?: string | null;
  houseNumber?: string | null;
  digitalAddress?: string | null;
  landmark?: string | null;
  address?: string | null;
};

export function formatStructuredAddress(parts: StructuredLocationParts): string {
  const line1 = [parts.houseNumber, parts.street].filter(Boolean).join(" ");
  const line2 = [parts.area, parts.city, parts.region].filter(Boolean).join(", ");
  const segments = [
    line1,
    line2,
    parts.digitalAddress,
    parts.landmark,
    parts.address,
  ]
    .map((s) => s?.trim())
    .filter(Boolean);
  return [...new Set(segments)].join(" · ") || "";
}

export function buildLocationString(parts: StructuredLocationParts): string {
  return formatStructuredAddress(parts).trim();
}

export function hasStructuredLocation(parts: StructuredLocationParts): boolean {
  return Boolean(
    parts.region?.trim() ||
      parts.city?.trim() ||
      parts.area?.trim() ||
      parts.street?.trim() ||
      parts.houseNumber?.trim() ||
      parts.digitalAddress?.trim() ||
      parts.landmark?.trim()
  );
}

export function mergePropertyLocationFields<
  T extends StructuredLocationParts & {
    location?: string;
    latitude?: number;
    longitude?: number;
  },
>(
  values: T,
  location: StructuredLocationParts & {
    latitude?: string | number | null;
    longitude?: string | number | null;
  }
): T {
  const region = location.region?.trim() || undefined;
  const city = location.city?.trim() || undefined;
  const area = location.area?.trim() || undefined;
  const street = location.street?.trim() || undefined;
  const houseNumber = location.houseNumber?.trim() || undefined;
  const digitalAddress = location.digitalAddress?.trim() || undefined;
  const landmark = location.landmark?.trim() || undefined;
  const summary = formatStructuredAddress({
    region,
    city,
    area,
    street,
    houseNumber,
    digitalAddress,
    landmark,
  });

  const latitude =
    location.latitude !== undefined &&
    location.latitude !== null &&
    String(location.latitude).trim() !== ""
      ? Number(location.latitude)
      : values.latitude;
  const longitude =
    location.longitude !== undefined &&
    location.longitude !== null &&
    String(location.longitude).trim() !== ""
      ? Number(location.longitude)
      : values.longitude;

  return {
    ...values,
    region,
    city,
    area,
    street,
    houseNumber,
    digitalAddress,
    landmark,
    location: summary || values.location,
    latitude: Number.isFinite(latitude) ? latitude : values.latitude,
    longitude: Number.isFinite(longitude) ? longitude : values.longitude,
  };
}
