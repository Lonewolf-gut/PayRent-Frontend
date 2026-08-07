import { NextRequest, NextResponse } from "next/server";

const apiOrigin = (process.env.API_URL ?? "http://localhost:3001").replace(/\/$/, "");

export async function POST(req: NextRequest) {
  let body: string;
  try {
    body = await req.text();
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "Invalid registration request. Please refresh and try again.",
        errors: [{ code: "INVALID_BODY" }],
      },
      { status: 400 }
    );
  }

  try {
    const res = await fetch(`${apiOrigin}/api/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": req.headers.get("content-type") ?? "application/json",
        "x-forwarded-for": req.headers.get("x-forwarded-for") ?? "",
        "user-agent": req.headers.get("user-agent") ?? "",
      },
      body,
      signal: AbortSignal.timeout(120_000),
    });

    const text = await res.text();
    return new NextResponse(text, {
      status: res.status,
      headers: {
        "Content-Type": res.headers.get("content-type") ?? "application/json",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const unreachable =
      error instanceof TypeError || /fetch failed|ECONNREFUSED|ENOTFOUND/i.test(message);
    const timedOut = /abort|timeout/i.test(message);

    return NextResponse.json(
      {
        success: false,
        message: unreachable
          ? "Cannot reach the backend API. Start PayRent-Backend on port 3001, then try again."
          : timedOut
            ? "Registration timed out. Check that the backend is running and your database is up to date (npm run db:push)."
            : `Registration failed: ${message}`,
        errors: [
          {
            code: unreachable ? "BACKEND_UNREACHABLE" : "PROXY_ERROR",
            message,
          },
        ],
      },
      { status: 503 }
    );
  }
}
