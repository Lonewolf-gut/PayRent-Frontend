import { NextRequest } from "next/server";
import { handlePhoneVerificationRequest } from "@/lib/api/phone-verification-route";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return handlePhoneVerificationRequest(req, "GET");
}

export async function POST(req: NextRequest) {
  return handlePhoneVerificationRequest(req, "POST");
}
