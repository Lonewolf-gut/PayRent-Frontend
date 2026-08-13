import { z } from "zod";

export const financingRequestSchema = z.object({
  propertyId: z.string().cuid(),
  applicationId: z.string().cuid().optional(),
  requestedAmount: z.number().positive(),
  durationMonths: z.number().int().min(3).max(60),
  notes: z.string().max(500).optional(),
  monthlyIncome: z.number().positive().optional(),
  bankAccountId: z.string().min(1).optional(),
  bankStatementPeriodMonths: z.union([z.literal(6), z.literal(12)]).optional(),
  autoDebitConsent: z.literal(true, {
    error: "You must consent to automatic repayment deductions via bank mandate.",
  }).optional(),
  repaymentPreference: z
    .object({
      preferredPaymentDay: z.number().int().min(1).max(28).optional(),
      preferredChannel: z.literal("BANK_MANDATE").optional(),
      bankAccountId: z.string().min(1).optional(),
      contactPhone: z.string().max(20).optional(),
      contactEmail: z.string().email().optional(),
    })
    .optional(),
  dataProcessingConsent: z.literal(true, {
    error: "You must consent to data collection and processing for financing.",
  }),
});

export const updateFinancingRequestSchema = z.object({
  requestedAmount: z.number().positive().optional(),
  durationMonths: z.number().int().min(3).max(60).optional(),
  notes: z.string().max(500).optional(),
  bankAccountId: z.string().min(1).optional(),
  bankStatementPeriodMonths: z.union([z.literal(6), z.literal(12)]).optional(),
  autoDebitConsent: z.literal(true).optional(),
  repaymentPreference: z
    .object({
      preferredChannel: z.literal("BANK_MANDATE").optional(),
      bankAccountId: z.string().min(1).optional(),
    })
    .optional(),
  dataProcessingConsent: z.literal(true).optional(),
});

export const approveFinancingSchema = z.object({
  financingRequestId: z.string().cuid(),
  amount: z.number().positive(),
  interestRate: z.number().min(0).max(30),
  planType: z.enum(["MONTHLY", "DEFERRED", "CUSTOM"]),
  customSchedule: z
    .array(
      z.object({
        amount: z.number().positive(),
        dueDate: z.string().datetime(),
      })
    )
    .optional(),
});

export type FinancingRequestInput = z.infer<typeof financingRequestSchema>;
export type UpdateFinancingRequestInput = z.infer<typeof updateFinancingRequestSchema>;
export type ApproveFinancingInput = z.infer<typeof approveFinancingSchema>;
