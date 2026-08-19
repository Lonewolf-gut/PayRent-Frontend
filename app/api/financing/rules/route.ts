import { getBusinessRules } from "@/lib/services/business-rules.service";
import { apiResponse, withAuth } from "@/lib/api/handler";

export const GET = withAuth(
  async () => {
    const rules = await getBusinessRules();
    return apiResponse({
      maxInterestRatePercent: rules.maxInterestRatePercent,
      minRepaymentMonths: rules.minRepaymentMonths,
      maxRepaymentMonths: rules.maxRepaymentMonths,
    });
  },
  { roles: ["BUYER", "LENDER", "MERCHANT", "ADMIN"] }
);
