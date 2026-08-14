import { prisma } from "@/lib/db/prisma";
import { AppError } from "@/lib/errors";
import { getBusinessRules } from "@/lib/services/business-rules.service";
import { subscriptionService } from "@/lib/services/subscription.service";
import { isPaidPlan, normalizeSubscriptionPlan } from "@/lib/subscription/plans";
import {
  roleHasFreePlatformAccess,
  roleRequiresSubscription,
} from "@/lib/subscription/roles";
import { TRIAL_DAYS } from "@/lib/subscription/pricing";
import type { UserRole } from "@prisma/client";

export { TRIAL_DAYS };

export type SubscriptionAccess = {
  plan: ReturnType<typeof normalizeSubscriptionPlan>;
  isPaid: boolean;
  trialEndsAt: Date | null;
  trialActive: boolean;
  trialExpired: boolean;
  hasFullAccess: boolean;
  requiresSubscription: boolean;
};

export function getTrialEndDate(from = new Date()) {
  const ends = new Date(from);
  ends.setDate(ends.getDate() + TRIAL_DAYS);
  return ends;
}

async function backfillTrialEndsAt(userId: string, createdAt: Date) {
  const trialEndsAt = getTrialEndDate(createdAt);
  await prisma.user
    .update({
      where: { id: userId },
      data: { trialEndsAt },
    })
    .catch(() => undefined);
  return trialEndsAt;
}

export async function loadSubscriptionAccess(userId: string): Promise<SubscriptionAccess> {
  const [user, sub] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { trialEndsAt: true, createdAt: true, role: true },
    }),
    subscriptionService.getCurrent(userId),
  ]);

  const plan = normalizeSubscriptionPlan(sub?.plan ?? "FREE");
  const isPaid = isPaidPlan(plan);
  const role = user?.role ?? "BUYER";
  const requiresSubscription = roleRequiresSubscription(role);

  if (roleHasFreePlatformAccess(role)) {
    return {
      plan,
      isPaid,
      trialEndsAt: null,
      trialActive: false,
      trialExpired: false,
      hasFullAccess: true,
      requiresSubscription: false,
    };
  }

  let trialEndsAt = user?.trialEndsAt ?? null;
  if (!trialEndsAt && user?.createdAt && requiresSubscription) {
    trialEndsAt = await backfillTrialEndsAt(userId, user.createdAt);
  }

  const now = new Date();
  const trialActive = Boolean(trialEndsAt && trialEndsAt > now);
  const trialExpired = Boolean(trialEndsAt && trialEndsAt <= now);
  const hasFullAccess = isPaid || trialActive;

  return {
    plan,
    isPaid,
    trialEndsAt,
    trialActive,
    trialExpired,
    hasFullAccess,
    requiresSubscription: true,
  };
}

export async function getSubscriptionAccess(userId: string): Promise<SubscriptionAccess> {
  const access = await loadSubscriptionAccess(userId);

  if (access.requiresSubscription && access.trialExpired && !access.isPaid) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (user?.role === "MERCHANT") {
      const { suspendListingsAfterTrial } = await import("@/lib/subscription/trial.service");
      void suspendListingsAfterTrial(userId);
    }
  }

  return access;
}

export async function assertPlatformAccess(
  userId: string,
  feature: string,
  role?: UserRole
): Promise<SubscriptionAccess> {
  const resolvedRole =
    role ??
    (
      await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      })
    )?.role;

  if (resolvedRole && roleHasFreePlatformAccess(resolvedRole)) {
    return loadSubscriptionAccess(userId);
  }

  const access = await getSubscriptionAccess(userId);
  if (access.hasFullAccess) return access;

  throw new AppError(
    `Your ${TRIAL_DAYS}-day trial has ended. Upgrade at /pricing to ${feature}.`,
    403,
    "TRIAL_EXPIRED"
  );
}

export function hasUnlimitedListingAccess(access: SubscriptionAccess) {
  return access.hasFullAccess || access.plan === "MAX";
}
