import type { EntityType, TenantFinancingDocType } from "@prisma/client";

export const FINANCING_DOC_LABELS: Record<TenantFinancingDocType, string> = {
  PAYSLIP: "Current payslip",
  EMPLOYMENT_LETTER: "Employment letter",
  STAFF_ID: "Staff ID card",
  NATIONAL_ID: "National ID (front & back)",
  BANK_STATEMENT: "Bank statement (6–12 months)",
};

export const INDIVIDUAL_FINANCING_DOC_TYPES: TenantFinancingDocType[] = [
  "PAYSLIP",
  "BANK_STATEMENT",
];

export const COMPANY_FINANCING_DOC_TYPES: TenantFinancingDocType[] = [
  "BANK_STATEMENT",
];

export function getRequiredFinancingDocTypes(
  entityType: EntityType = "INDIVIDUAL"
): TenantFinancingDocType[] {
  return entityType === "COMPANY"
    ? COMPANY_FINANCING_DOC_TYPES
    : INDIVIDUAL_FINANCING_DOC_TYPES;
}

/** @deprecated Use getRequiredFinancingDocTypes instead */
export const REQUIRED_FINANCING_DOC_TYPES = INDIVIDUAL_FINANCING_DOC_TYPES;

export const KYC_DOCUMENT_LABELS: Record<string, string> = {
  ID_FRONT: "ID front",
  ID_BACK: "ID back",
  FACE_PHOTO: "Face photo",
  COMPANY_REGISTRATION: "Company registration certificate",
  COMPANY_TIN: "Company TIN certificate",
  EMPLOYMENT_LETTER: "Employment letter",
  STAFF_ID: "Staff ID card",
  SSNIT_CARD: "SSNIT card",
  ADDRESS_PROOF: "Address proof (utility bill)",
};

export const UTILITY_BILL_LABELS: Record<string, string> = {
  ELECTRICITY: "Electricity bill",
  WATER: "Water bill",
  LANDLINE: "Landline bill",
  INTERNET: "Internet bill",
};
