import { NextRequest, NextResponse } from "next/server";

import { getBackendApiBaseUrl } from "@/lib/utils/backend-api-url";

const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailers",
  "transfer-encoding",
  "upgrade",
]);

function getInternalApiBaseUrl() {
  return getBackendApiBaseUrl();
}

export function shouldProxyApiRequest(pathname: string) {
  if (!getInternalApiBaseUrl()) return false;
  if (!pathname.startsWith("/api/")) return false;

  if (pathname.startsWith("/api/auth/")) {
    return !isNextAuthRoute(pathname);
  }

  return true;
}

/** NextAuth protocol routes must stay on the frontend in split-repo setups. */
function isNextAuthRoute(pathname: string) {
  const suffix = pathname.slice("/api/auth/".length);
  if (!suffix) return true;

  const [segment] = suffix.split("/");
  if (segment === "callback") return true;

  return (
    segment === "session" ||
    segment === "csrf" ||
    segment === "signin" ||
    segment === "signout" ||
    segment === "providers" ||
    segment === "error" ||
    segment === "verify-request"
  );
}

function forwardRequestHeaders(req: NextRequest) {
  const headers = new Headers();

  req.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (HOP_BY_HOP_HEADERS.has(lower)) return;
    if (lower === "host" || lower === "content-length") return;
    headers.set(key, value);
  });

  return headers;
}

function forwardResponseHeaders(source: Headers) {
  const headers = new Headers();

  source.forEach((value, key) => {
    if (HOP_BY_HOP_HEADERS.has(key.toLowerCase())) return;
    headers.append(key, value);
  });

  return headers;
}

export async function proxyToInternalApi(
  req: NextRequest
): Promise<NextResponse | null> {
  const backendUrl = getInternalApiBaseUrl();
  if (!backendUrl || !shouldProxyApiRequest(req.nextUrl.pathname)) {
    return null;
  }

  const targetUrl = `${backendUrl}${req.nextUrl.pathname}${req.nextUrl.search}`;
  const headers = forwardRequestHeaders(req);

  const init: RequestInit = {
    method: req.method,
    headers,
    redirect: "manual",
    cache: "no-store",
  };

  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = await req.arrayBuffer();
  }

  try {
    const response = await fetch(targetUrl, init);

    return new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: forwardResponseHeaders(response.headers),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Backend request failed";

    return NextResponse.json(
      {
        success: false,
        message:
          "Could not reach the API server. Make sure PayRent-Backend is running and INTERNAL_API_URL is correct.",
        data: null,
        errors: [{ code: "BACKEND_UNREACHABLE", message }],
      },
      { status: 503 }
    );
  }
}
