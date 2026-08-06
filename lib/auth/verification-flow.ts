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

/** After skipping email verification, continue to phone verification when required. */
export function getRouteAfterEmailSkip(params: {
  role: UserRole | undefined;
  phoneVerified: boolean;
}) {
  if (!params.role) return "/";
  return getPostAuthRoute({
    role: params.role,
    emailVerified: true,
    phoneVerified: params.phoneVerified,
  });
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
