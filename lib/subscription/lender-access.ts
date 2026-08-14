import { prisma } from "@/lib/db/prisma";
import { AppError } from "@/lib/errors";
import { getBusinessRules } from "@/lib/services/business-rules.service";

export async function countLenderFinancedProperties(lenderId: string) {
  return prisma.investment.count({
    where: { lenderId },
  });
}

export async function assertLenderCanFinanceMore(lenderId: string) {
  const [rules, financedCount] = await Promise.all([
    getBusinessRules(),
    countLenderFinancedProperties(lenderId),
  ]);

  if (financedCount >= rules.lenderFreeFinancingLimit) {
    throw new AppError(
      `You can finance up to ${rules.lenderFreeFinancingLimit} properties on your lender account.`,
      403,
      "LENDER_FINANCING_LIMIT"
    );
  }
}

export async function getLenderFinancingAccess(lenderUserId: string) {
  const rules = await getBusinessRules();
  const lender = await prisma.lender.findUnique({
    where: { userId: lenderUserId },
    select: { id: true },
  });

  const financedCount = lender
    ? await countLenderFinancedProperties(lender.id)
    : 0;

  const limit = rules.lenderFreeFinancingLimit;

  return {
    financedCount,
    limit,
    remaining: Math.max(0, limit - financedCount),
    atLimit: financedCount >= limit,
  };
}
