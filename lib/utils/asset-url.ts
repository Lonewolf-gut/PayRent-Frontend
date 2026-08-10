/**
 * Normalize asset URLs returned by the API for browser display.
 * - Local dev: `/uploads/*` is proxied to the backend via Next.js rewrites.
 * - S3: objects are stored under keys like `public/properties/images/...` but the
 *   API may return URLs missing the `public/` path segment — we fix that here.
 */
function getS3PublicBaseUrl(): string {
  const configured =
    process.env.NEXT_PUBLIC_S3_PUBLIC_URL?.trim() ||
    process.env.S3_PUBLIC_URL?.trim();
  return configured?.replace(/\/$/, "") ?? "";
}

function fixS3PropertyImagePath(pathname: string): string {
  if (
    pathname.startsWith("/properties/images/") &&
    !pathname.startsWith("/public/")
  ) {
    return `/public${pathname}`;
  }
  return pathname;
}

export function resolveAssetUrl(url: string | null | undefined): string {
  if (!url) return "";

  const trimmed = url.trim();
  if (!trimmed) return "";

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    try {
      const parsed = new URL(trimmed);
      if (parsed.pathname.startsWith("/uploads/")) {
        return `${parsed.pathname}${parsed.search}`;
      }
      const fixedPath = fixS3PropertyImagePath(parsed.pathname);
      if (fixedPath !== parsed.pathname) {
        parsed.pathname = fixedPath;
        return parsed.toString();
      }
    } catch {
      return trimmed;
    }
    return trimmed;
  }

  if (trimmed.startsWith("/uploads/")) {
    return trimmed;
  }

  const s3Base = getS3PublicBaseUrl();

  if (trimmed.startsWith("public/")) {
    if (s3Base) {
      return `${s3Base}/${trimmed}`;
    }
    return `/uploads/${trimmed.slice("public/".length)}`;
  }

  if (trimmed.startsWith("properties/images/")) {
    const path = `/${trimmed}`;
    if (s3Base) {
      return `${s3Base}/public${path}`;
    }
    return `/uploads/${trimmed}`;
  }

  if (trimmed.startsWith("/properties/images/")) {
    if (s3Base) {
      return `${s3Base}/public${trimmed}`;
    }
    return `/uploads${trimmed}`;
  }

  if (trimmed.startsWith("private/")) {
    return `/api/files/${encodeURIComponent(trimmed)}`;
  }

  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}
