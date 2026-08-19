import { prisma } from "@/lib/db/prisma";
import { apiResponse, withAuth } from "@/lib/api/handler";
import { buildMandatePreview } from "@/lib/utils/mandate-preview";

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
        status: { not: "CREATED" },
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

    return apiResponse(
      requests.map((request) =>
        buildMandatePreview({
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
        })
      )
    );
  },
  { roles: ["BUYER"] }
);
