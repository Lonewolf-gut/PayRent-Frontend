/**
 * Resolve property and upload asset URLs for browser display.
 * Property images are served through /api/media so S3 private buckets work.
 */
function isPropertyImageReference(value: string): boolean {
  return value.includes("properties/images/");
}

export function resolveAssetUrl(url: string | null | undefined): string {
  if (!url) return "";

  const trimmed = url.trim();
  if (!trimmed) return "";

  if (isPropertyImageReference(trimmed)) {
    return `/api/media?ref=${encodeURIComponent(trimmed)}`;
  }

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    try {
      const parsed = new URL(trimmed);
      if (parsed.pathname.startsWith("/uploads/")) {
        return `${parsed.pathname}${parsed.search}`;
      }
    } catch {
      return trimmed;
    }
    return trimmed;
  }

  if (trimmed.startsWith("/uploads/")) {
    return trimmed;
  }

  if (trimmed.startsWith("public/")) {
    return `/api/media?ref=${encodeURIComponent(trimmed)}`;
  }

  if (trimmed.startsWith("private/")) {
    return `/api/files/${encodeURIComponent(trimmed)}`;
  }

  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}
