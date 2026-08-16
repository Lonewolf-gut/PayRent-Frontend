import type { UserRole } from "@prisma/client";

const STORAGE_KEY = "payrent_auth_return_url";

/** Safe relative return path for post-login redirects (open redirect protection). */
export function sanitizeCallbackUrl(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;

  let value = raw.trim();
  try {
    value = decodeURIComponent(value);
  } catch {
    return null;
  }

  if (!value.startsWith("/") || value.startsWith("//")) return null;
  if (value.startsWith("/admin/login") || value.startsWith("/compliance/login")) return null;

  return value;
}

export function buildAuthReturnPath(
  pathname: string,
  searchParams?: URLSearchParams | ReadonlyURLSearchParams | string | null
) {
  if (!searchParams) return pathname;
  const query =
    typeof searchParams === "string"
      ? searchParams.replace(/^\?/, "")
      : searchParams.toString();
  return query ? `${pathname}?${query}` : pathname;
}

type ReadonlyURLSearchParams = {
  toString(): string;
};

export function persistAuthReturnUrl(url: string | null | undefined) {
  if (typeof window === "undefined") return;
  const safe = sanitizeCallbackUrl(url);
  if (safe) {
    sessionStorage.setItem(STORAGE_KEY, safe);
  }
}

export function readPersistedAuthReturnUrl(): string | null {
  if (typeof window === "undefined") return null;
  return sanitizeCallbackUrl(sessionStorage.getItem(STORAGE_KEY));
}

export function clearPersistedAuthReturnUrl() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(STORAGE_KEY);
}

export function resolveAuthReturnUrl(
  callbackFromQuery?: string | null,
  fallbackFromStorage = true
): string | null {
  return (
    sanitizeCallbackUrl(callbackFromQuery) ??
    (fallbackFromStorage ? readPersistedAuthReturnUrl() : null)
  );
}

export function buildLoginUrl(returnPath?: string | null, role?: string) {
  const params = new URLSearchParams();
  const safe = sanitizeCallbackUrl(returnPath);
  if (safe) params.set("callbackUrl", safe);
  if (role) params.set("role", role);
  const query = params.toString();
  return query ? `/login?${query}` : "/login";
}

export function buildRegisterUrl(returnPath?: string | null) {
  const params = new URLSearchParams();
  const safe = sanitizeCallbackUrl(returnPath);
  if (safe) params.set("callbackUrl", safe);
  const query = params.toString();
  return query ? `/register?${query}` : "/register";
}

export function appendCallbackUrl(basePath: string, returnPath?: string | null) {
  const safe = sanitizeCallbackUrl(returnPath);
  if (!safe) return basePath;
  const separator = basePath.includes("?") ? "&" : "?";
  return `${basePath}${separator}callbackUrl=${encodeURIComponent(safe)}`;
}

/** Whether this role may be sent to the return URL after auth. */
export function shouldHonorCallbackForRole(role: UserRole, returnPath: string): boolean {
  if (role === "ADMIN") {
    return returnPath.startsWith("/admin") && returnPath !== "/admin/login";
  }
  if (role === "COMPLIANCE_OFFICER") {
    return returnPath.startsWith("/compliance") && returnPath !== "/compliance/login";
  }
  if (returnPath.startsWith("/properties")) return true;
  if (returnPath.startsWith("/pricing")) return true;
  return false;
}
