import { getPostLoginRoute } from "@/lib/auth/permissions";
import { getPostAuthRoute } from "@/lib/auth/post-auth-route";
import type { UserRole } from "@prisma/client";

export const VERIFICATION_PROMPT_DISMISSED_PREFIX = "verification-prompt-dismissed:";
export const FRESH_DASHBOARD_LOGIN_KEY = "fresh-dashboard-login";

export function getVerificationDismissedKey(userId: string) {
  return `${VERIFICATION_PROMPT_DISMISSED_PREFIX}${userId}`;
}

export function skipToDashboard(role: UserRole | undefined) {
  if (!role) return "/";
  return getPostLoginRoute(role);
}

export function getPostEmailVerificationRoute(params: {
  role: UserRole;
  phoneVerified: boolean;
}) {
  return getPostAuthRoute({
    role: params.role,
    emailVerified: true,
    phoneVerified: params.phoneVerified,
  });
}
