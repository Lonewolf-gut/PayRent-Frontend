import { NextRequest } from "next/server";
import { mandateService } from "@/lib/services/mandate.service";
import { saveMandateDocument } from "@/lib/integrations/mandate";
import { prisma } from "@/lib/db/prisma";
import { apiResponse, withAuth } from "@/lib/api/handler";

export const POST = withAuth(
  async (req: NextRequest, ctx, session) => {
    const { id } = await ctx.params;
    const tenant = await prisma.tenant.findUnique({
      where: { userId: session.user.id },
    });
    if (!tenant) return apiResponse(null, 403, "Customer profile required.");

    const mandate = await mandateService.getById(id, tenant.id);
    if (!mandate) return apiResponse(null, 404, "Mandate not found.");

    const formData = await req.formData();
    const file = formData.get("document");
    if (!(file instanceof File) || !file.name) {
      return apiResponse(null, 400, "Document file is required.");
    }

    const documentUrl = await saveMandateDocument(file, session.user.id);
    const updated = await prisma.mandate.update({
      where: { id },
      data: {
        documentUrl,
        mandateSource: "SCANNED_UPLOAD",
        status:
          mandate.status === "DRAFT" || mandate.status === "REJECTED"
            ? "PENDING_SUBMISSION"
            : mandate.status,
      },
    });

    return apiResponse(updated, 200, "Mandate document uploaded.");
  },
  { roles: ["BUYER"], permission: "mandate:create" }
);
