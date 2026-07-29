import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import {
  ADMIN_HOME_PATH,
  COMPLIANCE_HOME_PATH,
  isCompliancePath,
  isMarketingPath,
  isNonAdminDashboardPath,
  isPublicAuthPath,
} from "@/lib/auth/route-guards";

const publicRoutes = [
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/properties",
  "/roles",
  "/terms",
  "/privacy",
  "/faq",
  "/pricing",
  "/api/auth",
  "/api/properties",
  "/api/subscriptions/plans",
  "/admin/login",
  "/compliance/login",
];

const authRoutes = ["/login", "/register"];
const authCookieNames = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
];

function hasAuthCookie(req: NextRequest) {
  return authCookieNames.some((name) => !!req.cookies.get(name)?.value);
}

function clearAuthCookies(response: NextResponse) {
  for (const name of authCookieNames) {
    response.cookies.delete(name);
  }
  return response;
}

export async function proxy(req: NextRequest) {
  const authSecret = process.env.AUTH_SECRET?.trim();
  if (!authSecret) {
    console.error(
      "[auth] AUTH_SECRET is missing. Run: npm run setup:env — then use the same secret in PayRent-Backend/.env"
    );
    return NextResponse.json(
      {
        error: "Server misconfigured: AUTH_SECRET is not set. Run npm run setup:env in PayRent-Frontend.",
      },
      { status: 500 }
    );
  }

  const { nextUrl } = req;
  const pathname = nextUrl.pathname;
  const hasCookie = hasAuthCookie(req);

  let token = null;
  if (hasCookie) {
    try {
      token = await getToken({
        req,
        secret: authSecret,
        cookieName:
          process.env.NODE_ENV === "production"
            ? "__Secure-authjs.session-token"
            : "authjs.session-token",
      });
    } catch {
      token = null;
    }
  }

  const isLoggedIn = Boolean(token);
  const staleCookie = hasCookie && !token;

  if (staleCookie && pathname.startsWith("/login")) {
    const response = NextResponse.next();
    clearAuthCookies(response);
    return response;
  }

  if (staleCookie && !pathname.startsWith("/api")) {
    const loginPath = pathname.startsWith("/admin")
      ? "/admin/login"
      : pathname.startsWith("/compliance")
        ? "/compliance/login"
        : "/login";
    const response = NextResponse.redirect(new URL(loginPath, nextUrl));
    clearAuthCookies(response);
    return response;
  }

  const role = token?.role as string | undefined;
  const isAdmin = role === "ADMIN";
  const isComplianceOfficer = role === "COMPLIANCE_OFFICER";

  const isPublic = publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
  const isAuthRoute = authRoutes.includes(pathname);
  const isApiRoute = pathname.startsWith("/api");

  if (isApiRoute) return NextResponse.next();

  if (isAdmin) {
    if (pathname === "/admin/login") {
      return NextResponse.redirect(new URL(ADMIN_HOME_PATH, nextUrl));
    }

    if (
      isMarketingPath(pathname) ||
      isPublicAuthPath(pathname) ||
      isNonAdminDashboardPath(pathname) ||
      isCompliancePath(pathname)
    ) {
      return NextResponse.redirect(new URL(ADMIN_HOME_PATH, nextUrl));
    }
  }

  if (isComplianceOfficer) {
    if (pathname === "/compliance/login") {
      return NextResponse.redirect(new URL(COMPLIANCE_HOME_PATH, nextUrl));
    }

    if (
      isMarketingPath(pathname) ||
      isPublicAuthPath(pathname) ||
      isNonAdminDashboardPath(pathname) ||
      pathname.startsWith("/admin")
    ) {
      return NextResponse.redirect(new URL(COMPLIANCE_HOME_PATH, nextUrl));
    }
  }

  if (isAuthRoute && isLoggedIn) {
    const destination = isAdmin
      ? ADMIN_HOME_PATH
      : isComplianceOfficer
        ? COMPLIANCE_HOME_PATH
        : "/dashboard";
    return NextResponse.redirect(new URL(destination, nextUrl));
  }

  if (!isPublic && !isLoggedIn) {
    const callbackUrl = encodeURIComponent(pathname);
    const loginPath = pathname.startsWith("/admin")
      ? "/admin/login"
      : pathname.startsWith("/compliance")
        ? "/compliance/login"
        : "/login";
    return NextResponse.redirect(
      new URL(`${loginPath}?callbackUrl=${callbackUrl}`, nextUrl)
    );
  }

  const response = NextResponse.next();
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
