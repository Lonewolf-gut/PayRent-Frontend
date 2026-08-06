import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";

const apiOrigin = (process.env.API_URL ?? "http://localhost:3001").replace(/\/$/, "");

function isDevOtpEnabled() {
  return (
    process.env.NODE_ENV === "development" ||
    process.env.SHOW_DEV_OTP === "true" ||
    process.env.NEXT_PUBLIC_SHOW_DEV_OTP === "true"
  );
}

async function readPendingPhoneCode(userId: string) {
  return prisma.otpCode.findFirst({
    where: {
      userId,
      purpose: "PHONE_VERIFY",
      used: false,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
    select: { code: true },
  });
}

async function enrichWithDevCode(userId: string, data: Record<string, unknown>) {
  if (!isDevOtpEnabled()) return data;
  if (data.devCode || data.code) return data;

  try {
    const pending = await readPendingPhoneCode(userId);
    if (!pending?.code) return data;

    return {
      ...data,
      devCode: pending.code,
      code: pending.code,
      isDevelopment: true,
    };
  } catch {
    return data;
  }
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

  const enriched = await enrichWithDevCode(userId, json.data as Record<string, unknown>);
  return NextResponse.json({ ...json, data: enriched }, { status: backendRes.status });
}
