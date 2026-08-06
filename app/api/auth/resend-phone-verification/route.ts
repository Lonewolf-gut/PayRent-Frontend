import { NextRequest } from "next/server";
import { proxyPhoneVerification } from "@/lib/api/phone-verification-proxy";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return proxyPhoneVerification(req, "GET");
}

export async function POST(req: NextRequest) {
  return proxyPhoneVerification(req, "POST");
}
