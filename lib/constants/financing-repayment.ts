export const REPAYMENT_PERIOD_OPTIONS = [
  { months: 3, label: "3 months" },
  { months: 6, label: "6 months" },
  { months: 12, label: "1 year" },
  { months: 24, label: "2 years" },
  { months: 36, label: "3 years" },
  { months: 48, label: "4 years" },
  { months: 60, label: "5 years" },
] as const;

export const DEFAULT_REPAYMENT_MONTHS = 12;
