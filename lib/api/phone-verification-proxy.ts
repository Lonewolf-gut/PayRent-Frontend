import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  enrichWithDevCode,
  isDevOtpEnabled,
} from "@/lib/api/verification-code";

const apiOrigin = (process.env.API_URL ?? "http://localhost:3001").replace(/\/$/, "");

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

  if (!json.success || !json.data) {
    return NextResponse.json(json, { status: backendRes.status });
  }

  if (!isDevOtpEnabled()) {
    return NextResponse.json(json, { status: backendRes.status });
  }

  const session = await auth();
  const userId = session?.user?.id ?? null;

  const enriched = await enrichWithDevCode(
    userId,
    json.data as Record<string, unknown>,
    cookie,
    "PHONE_VERIFY"
  );
  return NextResponse.json({ ...json, data: enriched }, { status: backendRes.status });
}
