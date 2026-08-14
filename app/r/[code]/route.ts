import { NextRequest, NextResponse } from "next/server";
import { agentReferralService } from "@/lib/services/agent-referral.service";
import { AGENT_REFERRAL_COOKIE } from "@/lib/constants/agent-commission";
import { getReferralDestinationPath } from "@/lib/utils/agent-referral";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ code: string }> }
) {
  const { code } = await context.params;
  const link = await agentReferralService.resolveReferralCode(code);

  if (!link) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  await agentReferralService.trackClick(link.code);

  const destination = new URL(
    getReferralDestinationPath(link.propertyId),
    req.url
  );
  const response = NextResponse.redirect(destination);

  response.cookies.set(AGENT_REFERRAL_COOKIE, link.code, {
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    sameSite: "lax",
    httpOnly: false,
  });

  return response;
}
