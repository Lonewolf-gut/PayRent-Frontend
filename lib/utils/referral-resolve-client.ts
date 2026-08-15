import type { NextRequest } from "next/server";

type ReferralResolveResult = {
  redirectPath: string;
  code: string;
  tracked: boolean;
};

function getReferralApiCandidates(req: NextRequest): string[] {
  const candidates: string[] = [];

  const push = (value?: string | null) => {
    if (!value) return;
    const normalized = value.replace(/\/$/, "");
    if (!candidates.includes(normalized)) {
      candidates.push(normalized);
    }
  };

  push(process.env.INTERNAL_API_URL);
  push(process.env.API_URL);
  push(process.env.NEXT_PUBLIC_API_URL);
  push(req.nextUrl.origin);

  const customerOrigin = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (customerOrigin && customerOrigin !== req.nextUrl.origin) {
    push(customerOrigin);
  }

  if (req.nextUrl.hostname === "localhost" && req.nextUrl.port === "3000") {
    push("http://localhost:3001");
  }

  return candidates;
}

export async function resolveReferralRedirect(
  req: NextRequest,
  code: string
): Promise<ReferralResolveResult | null> {
  for (const apiBase of getReferralApiCandidates(req)) {
    try {
      const response = await fetch(
        `${apiBase}/api/marketer/referral/resolve/${encodeURIComponent(code)}`,
        { cache: "no-store" }
      );

      if (!response.ok) continue;

      const json = (await response.json()) as {
        success?: boolean;
        data?: ReferralResolveResult;
      };

      if (!json.success || !json.data?.redirectPath || json.data.redirectPath === "/") {
        continue;
      }

      return json.data;
    } catch {
      continue;
    }
  }

  return null;
}
