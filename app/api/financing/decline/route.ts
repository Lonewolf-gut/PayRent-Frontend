import { NextRequest } from "next/server";
import { z } from "zod";
import { financingService } from "@/lib/services/financing.service";
import { apiResponse, withAuth } from "@/lib/api/handler";

const declineSchema = z.object({
  financingRequestId: z.string().cuid(),
});

export const POST = withAuth(
  async (req: NextRequest, _ctx, session) => {
    const body = await req.json();
    const parsed = declineSchema.safeParse(body);
    if (!parsed.success) {
      return apiResponse({ error: parsed.error.flatten() }, 400);
    }

    const result = await financingService.declineBuyerOffer(
      session.user.id,
      parsed.data.financingRequestId
    );

    return apiResponse(result, 200, "Financing offer declined.");
  },
  { roles: ["BUYER"], permission: "financing:create" }
);
