import { prisma } from "@/lib/db/prisma";
import { apiResponse, withAuth } from "@/lib/api/handler";
import { buildMandatePreview } from "@/lib/utils/mandate-preview";

type RepaymentPreference = {
  bankAccountId?: string;
};

export const GET = withAuth(
  async (_req, _ctx, session) => {
    const tenant = await prisma.tenant.findUnique({
      where: { userId: session.user.id },
      include: { user: { select: { fullName: true, email: true } } },
    });
    if (!tenant) return apiResponse([]);

    const requests = await prisma.financingRequest.findMany({
      where: {
        tenantId: tenant.id,
        status: { notIn: ["REJECTED", "WITHDRAWN", "CLOSED", "COMPLETED"] },
      },
      include: {
        property: { select: { name: true } },
        feeDisclosure: true,
        mandate: {
          include: {
            bankAccount: {
              select: {
                bankName: true,
                accountNumberMasked: true,
                accountName: true,
              },
            },
          },
        },
        tenant: {
          include: { user: { select: { fullName: true, email: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const bankAccountIds = requests
      .map((request) => (request.repaymentPreference as RepaymentPreference | null)?.bankAccountId)
      .filter((id): id is string => Boolean(id));

    const bankAccounts = bankAccountIds.length
      ? await prisma.bankAccount.findMany({
          where: { id: { in: bankAccountIds }, userId: session.user.id },
          select: {
            id: true,
            bankName: true,
            accountNumberMasked: true,
            accountName: true,
          },
        })
      : [];

    const bankById = new Map(bankAccounts.map((account) => [account.id, account]));

    return apiResponse(
      requests.map((request) => {
        const bankAccountId = (request.repaymentPreference as RepaymentPreference | null)
          ?.bankAccountId;
        const repaymentBankAccount = bankAccountId ? bankById.get(bankAccountId) ?? null : null;

        return buildMandatePreview({
          ...request,
          requestedAmount: Number(request.requestedAmount),
          approvedAmount: request.approvedAmount ? Number(request.approvedAmount) : null,
          offeredInterestRate: request.offeredInterestRate
            ? Number(request.offeredInterestRate)
            : null,
          feeDisclosure: request.feeDisclosure
            ? {
                principalAmount: Number(request.feeDisclosure.principalAmount),
                interestRate: Number(request.feeDisclosure.interestRate),
                totalRepayable: Number(request.feeDisclosure.totalRepayable),
                monthlyPayment: Number(request.feeDisclosure.monthlyPayment),
              }
            : null,
          repaymentBankAccount,
        });
      })
    );
  },
  { roles: ["BUYER"] }
);
