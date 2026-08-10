/**
 * Normalize asset URLs returned by the API so they load through the Next.js app
 * (which proxies /uploads/* to the backend in development and split deployments).
 */
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
    } catch {
      return trimmed;
    }
    return trimmed;
  }

  if (trimmed.startsWith("/uploads/")) {
    return trimmed;
  }

  if (trimmed.startsWith("public/")) {
    return `/uploads/${trimmed.slice("public/".length)}`;
  }

  if (trimmed.startsWith("private/")) {
    return `/api/files/${encodeURIComponent(trimmed)}`;
  }

  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}
