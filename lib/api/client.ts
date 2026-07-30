/**
 * Resolve API paths for the separated backend.
 * Browser requests can use relative /api/* (proxied by Next.js rewrites).
 * Server-side fetch (e.g. NextAuth authorize) requires an absolute backend URL.
 */
export function getApiBaseUrl(): string {
  const publicUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (publicUrl) return publicUrl.replace(/\/$/, "");

  const serverUrl = process.env.API_URL?.trim();
  if (serverUrl) return serverUrl.replace(/\/$/, "");

  if (typeof window === "undefined") {
    return "http://localhost:3001";
  }

  return "";
}

export function apiUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const base = getApiBaseUrl();
  return base ? `${base}${normalized}` : normalized;
}

export function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(apiUrl(path), {
    credentials: init?.credentials ?? "include",
    ...init,
  });
}
