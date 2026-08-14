import type { NextRequest } from "next/server";

type ReferralResolveResult = {
  redirectPath: string;
  code: string;
  tracked: boolean;
};

function getReferralApiBase(req: NextRequest) {
  return (
    process.env.INTERNAL_API_URL?.replace(/\/$/, "") ??
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
    req.nextUrl.origin
  );
}

export async function resolveReferralRedirect(
  req: NextRequest,
  code: string
): Promise<ReferralResolveResult | null> {
  const apiBase = getReferralApiBase(req);
  const response = await fetch(
    `${apiBase}/api/marketer/referral/resolve/${encodeURIComponent(code)}`,
    { cache: "no-store" }
  );

  if (!response.ok) return null;

  const json = (await response.json()) as {
    success?: boolean;
    data?: ReferralResolveResult;
  };

  if (!json.success || !json.data?.redirectPath) return null;
  return json.data;
}
