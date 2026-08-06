import { NextRequest, NextResponse } from "next/server";
import { shouldExposeOtpCodes } from "@/lib/auth/expose-otp";
import { enrichWithDevCode } from "@/lib/api/verification-code";

const apiOrigin = (process.env.API_URL ?? "http://localhost:3001").replace(/\/$/, "");

export async function handlePhoneVerificationRequest(
  req: NextRequest,
  method: "GET" | "POST"
) {
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

  let backendRes: Response;
  try {
    backendRes = await fetch(url, init);
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "Cannot reach the backend API. Is PayRent-Backend running on port 3001?",
        data: null,
        errors: [{ code: "BACKEND_UNREACHABLE", message: "Backend unreachable" }],
      },
      { status: 503 }
    );
  }

  const json = await backendRes.json();

  if (!json.success || !json.data) {
    return NextResponse.json(json, { status: backendRes.status });
  }

  if (!shouldExposeOtpCodes()) {
    return NextResponse.json(json, { status: backendRes.status });
  }

  const enriched = await enrichWithDevCode(
    null,
    json.data as Record<string, unknown>,
    cookie,
    "PHONE_VERIFY"
  );

  return NextResponse.json({ ...json, data: enriched }, { status: backendRes.status });
}
