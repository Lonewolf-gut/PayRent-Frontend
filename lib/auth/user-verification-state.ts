import type { Session } from "next-auth";
import { cookies } from "next/headers";

export type UserVerificationState = {
  emailVerified: boolean;
  phoneVerified: boolean;
  databaseAvailable: boolean;
};

export async function getUserVerificationState(
  session: Session
): Promise<UserVerificationState> {
  const fallback: UserVerificationState = {
    emailVerified: Boolean(session.user?.emailVerified),
    phoneVerified: Boolean(session.user?.phoneVerified),
    databaseAvailable: false,
  };

  if (!session.user?.id) {
    return fallback;
  }

  try {
    const cookieStore = await cookies();
    const cookieHeader = cookieStore
      .getAll()
      .map((cookie) => `${cookie.name}=${cookie.value}`)
      .join("; ");

    const apiBase = (
      process.env.API_URL ??
      process.env.NEXT_PUBLIC_API_URL ??
      "http://localhost:3001"
    ).replace(/\/$/, "");

    const response = await fetch(`${apiBase}/api/auth/verification-status`, {
      headers: cookieHeader ? { cookie: cookieHeader } : undefined,
      cache: "no-store",
    });

    if (!response.ok) {
      return fallback;
    }

    const payload = (await response.json()) as {
      success?: boolean;
      data?: { emailVerified?: boolean; phoneVerified?: boolean };
    };

    if (!payload.success || !payload.data) {
      return fallback;
    }

    return {
      emailVerified: Boolean(payload.data.emailVerified),
      phoneVerified: Boolean(payload.data.phoneVerified),
      databaseAvailable: true,
    };
  } catch {
    return fallback;
  }
}
