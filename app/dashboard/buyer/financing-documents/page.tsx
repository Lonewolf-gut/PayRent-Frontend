"use client";

import { FinancingDocumentsForm } from "@/components/properties/financing-documents-form";
import { useMarkNavSectionSeen } from "@/hooks/use-mark-nav-section-seen";

export default function TenantFinancingDocumentsPage() {
  useMarkNavSectionSeen(
    "/dashboard/buyer/financing-documents",
    "/api/buyer/financing-documents",
    ["PENDING", "REJECTED"]
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Financing documents</h1>
        <p className="text-muted-foreground">
          Upload documents required for Pay for Rent financing after your account is verified.
          Submitted files are sent for review before you can request financing on a property.
        </p>
      </div>
      <FinancingDocumentsForm />
    </div>
  );
}
