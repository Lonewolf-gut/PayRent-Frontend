import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { getPostLoginRoute } from "@/lib/auth/permissions";
import {
  ADMIN_HOME_PATH,
  COMPLIANCE_HOME_PATH,
  isCompliancePath,
  isMarketingPath,
  isNonAdminDashboardPath,
  isPublicAuthPath,
} from "@/lib/auth/route-guards";
import type { UserRole } from "@prisma/client";

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

export async function proxy(req: NextRequest) {
  const { nextUrl } = req;
  const isLoggedIn = hasAuthCookie(req);
  const pathname = nextUrl.pathname;

  const token = isLoggedIn
    ? await getToken({
        req,
        secret: process.env.AUTH_SECRET,
        cookieName:
          process.env.NODE_ENV === "production"
            ? "__Secure-authjs.session-token"
            : "authjs.session-token",
      })
    : null;
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
        : role
          ? getPostLoginRoute(role as UserRole)
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
