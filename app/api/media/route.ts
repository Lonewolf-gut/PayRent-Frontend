import { NextRequest, NextResponse } from "next/server";
import { getApiBaseUrl } from "@/lib/api/client";

export async function GET(req: NextRequest) {
  const ref = req.nextUrl.searchParams.get("ref");
  if (!ref?.trim()) {
    return NextResponse.json({ success: false, message: "Missing ref." }, { status: 400 });
  }

  const backendUrl = `${getApiBaseUrl()}/api/files/public?ref=${encodeURIComponent(ref)}`;
  const backendResponse = await fetch(backendUrl, { redirect: "manual" });

  if (backendResponse.status === 307 || backendResponse.status === 302) {
    const location = backendResponse.headers.get("location");
    if (location) {
      return NextResponse.redirect(location, 307);
    }
  }

  if (!backendResponse.ok) {
    const message = await backendResponse.text();
    return new NextResponse(message || "Unable to load image.", {
      status: backendResponse.status,
    });
  }

  const contentType = backendResponse.headers.get("content-type") ?? "application/octet-stream";
  const body = await backendResponse.arrayBuffer();
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=300",
    },
  });
}
