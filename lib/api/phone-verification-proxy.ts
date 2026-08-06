import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const apiOrigin = (process.env.API_URL ?? "http://localhost:3001").replace(/\/$/, "");

function isDevOtpEnabled() {
  return (
    process.env.NODE_ENV === "development" ||
    process.env.SHOW_DEV_OTP === "true" ||
    process.env.NEXT_PUBLIC_SHOW_DEV_OTP === "true"
  );
}

async function readPendingPhoneCodeFromDb(userId: string) {
  if (!process.env.DATABASE_URL) return null;

  try {
    const { prisma } = await import("@/lib/db/prisma");
    const pending = await prisma.otpCode.findFirst({
      where: {
        userId,
        purpose: "PHONE_VERIFY",
        used: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
      select: { code: true },
    });
    return pending?.code ?? null;
  } catch {
    return null;
  }
}

async function fetchBackendPendingCode(cookie: string | null) {
  const headers = new Headers();
  if (cookie) headers.set("cookie", cookie);

  const endpoints = [
    `${apiOrigin}/api/dev/pending-otp?purpose=PHONE_VERIFY`,
    `${apiOrigin}/api/auth/resend-phone-verification`,
  ];

  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint, {
        method: "GET",
        headers,
        cache: "no-store",
      });
      const json = await res.json();
      if (!json.success || !json.data) continue;

      const data = json.data as Record<string, unknown>;
      const code = (data.devCode ?? data.code) as string | null | undefined;
      if (code && code.length >= 4) return code;
    } catch {
      // try next endpoint
    }
  }

  return null;
}

async function enrichWithDevCode(
  userId: string,
  data: Record<string, unknown>,
  cookie: string | null
) {
  if (!isDevOtpEnabled()) return data;

  const existing = (data.devCode ?? data.code) as string | null | undefined;
  if (existing && existing.length >= 4) return data;

  const fromDb = await readPendingPhoneCodeFromDb(userId);
  const fromBackend = fromDb ? null : await fetchBackendPendingCode(cookie);
  const code = fromDb ?? fromBackend;

  if (!code) return data;

  return {
    ...data,
    devCode: code,
    code,
    isDevelopment: true,
  };
}

export async function proxyPhoneVerification(req: NextRequest, method: "GET" | "POST") {
  const url = `${apiOrigin}/api/auth/resend-phone-verification`;
  const headers = new Headers();
  const cookie = req.headers.get("cookie");
  if (cookie) headers.set("cookie", cookie);

  const contentType = req.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);

  const init: RequestInit = { method, headers, cache: "no-store" };
  if (method === "POST") {
    init.body = await req.text();
  }

  const backendRes = await fetch(url, init);
  const json = await backendRes.json();

  if (!json.success || !json.data || !isDevOtpEnabled()) {
    return NextResponse.json(json, { status: backendRes.status });
  }

  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json(json, { status: backendRes.status });
  }

  const enriched = await enrichWithDevCode(
    userId,
    json.data as Record<string, unknown>,
    cookie
  );
  return NextResponse.json({ ...json, data: enriched }, { status: backendRes.status });
}
