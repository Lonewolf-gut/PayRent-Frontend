import type { TenantFinancingDocType } from "@prisma/client";
import { FINANCING_DOC_LABELS } from "@/lib/constants/financing-docs";

export function formatFinancingDocList(
  documents: Array<{ documentType: TenantFinancingDocType; status: string }>,
  statuses: string[] = ["PENDING", "APPROVED"]
) {
  const labels = documents
    .filter((doc) => statuses.includes(doc.status))
    .map((doc) => FINANCING_DOC_LABELS[doc.documentType].toLowerCase());

  if (!labels.length) return "your documents";
  if (labels.length === 1) return labels[0];
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
  return `${labels.slice(0, -1).join(", ")}, and ${labels[labels.length - 1]}`;
}
