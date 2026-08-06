import { shouldExposeOtpCodes } from "@/lib/auth/expose-otp";

const apiOrigin = (process.env.API_URL ?? "http://localhost:3001").replace(/\/$/, "");

export function isDevOtpEnabled() {
  return shouldExposeOtpCodes();
}

export async function readPendingPhoneCodeFromDb(userId: string, purpose: string) {
  if (!process.env.DATABASE_URL) return null;

  try {
    const { prisma } = await import("@/lib/db/prisma");
    const pending = await prisma.otpCode.findFirst({
      where: {
        userId,
        purpose,
        used: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
      select: { code: true },
    });
    return pending?.code ?? null;
  } catch {
    return null;
  }
}

export async function fetchBackendPendingCode(
  cookie: string | null,
  purpose: string
) {
  const headers = new Headers();
  if (cookie) headers.set("cookie", cookie);

  const endpoints = [
    `${apiOrigin}/api/dev/pending-otp?purpose=${encodeURIComponent(purpose)}`,
    purpose === "PHONE_VERIFY"
      ? `${apiOrigin}/api/auth/resend-phone-verification`
      : `${apiOrigin}/api/auth/resend-verification`,
  ];

  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint, {
        method: "GET",
        headers,
        cache: "no-store",
      });
      const json = await res.json();
      if (!json.success || !json.data) continue;

      const data = json.data as Record<string, unknown>;
      const code = (data.devCode ?? data.code) as string | null | undefined;
      if (code && code.length >= 4) return code;
    } catch {
      // try next endpoint
    }
  }

  return null;
}

export async function readPendingVerificationCode(
  userId: string | null,
  purpose: string,
  cookie: string | null
) {
  if (!isDevOtpEnabled()) return null;

  const fromBackend = await fetchBackendPendingCode(cookie, purpose);
  if (fromBackend) return fromBackend;

  if (!userId) return null;

  return readPendingPhoneCodeFromDb(userId, purpose);
}

export async function enrichWithDevCode(
  userId: string | null,
  data: Record<string, unknown>,
  cookie: string | null,
  purpose = "PHONE_VERIFY"
) {
  if (!isDevOtpEnabled()) return data;

  const existing = (data.devCode ?? data.code) as string | null | undefined;
  if (existing && existing.length >= 4) {
    return { ...data, devCode: existing, code: existing, isDevelopment: true };
  }

  const code = await readPendingVerificationCode(userId, purpose, cookie);
  if (!code) return data;

  return {
    ...data,
    devCode: code,
    code,
    isDevelopment: true,
  };
}
