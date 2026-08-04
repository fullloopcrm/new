// Shared constants for Full Loop's own team/HR record layer
// (platform_team_members) — mirrors hr_employee_profiles' enums exactly so
// the two systems stay conceptually interchangeable if they're ever merged.

export const EMPLOYMENT_TYPES = ['contractor_1099', 'employee_w2'] as const
export const HR_STATUSES = ['active', 'on_leave', 'terminated'] as const
export const COMP_TYPES = ['per_job', 'hourly', 'salary'] as const
export const PAY_PERIODS = ['per_job', 'weekly', 'biweekly', 'semimonthly', 'monthly'] as const

export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number]
export type HrStatus = (typeof HR_STATUSES)[number]
export type CompType = (typeof COMP_TYPES)[number]
export type PayPeriod = (typeof PAY_PERIODS)[number]

export const EMPLOYMENT_TYPE_LABEL: Record<EmploymentType, string> = {
  contractor_1099: '1099 Contractor',
  employee_w2: 'W-2 Employee',
}

export const COMP_TYPE_LABEL: Record<CompType, string> = {
  per_job: 'Per job',
  hourly: 'Hourly',
  salary: 'Salary',
}

export const PAY_PERIOD_LABEL: Record<PayPeriod, string> = {
  per_job: 'Per job',
  weekly: 'Weekly',
  biweekly: 'Biweekly',
  semimonthly: 'Semimonthly',
  monthly: 'Monthly',
}

function isOneOf<T extends string>(values: readonly T[], v: string): v is T {
  return (values as readonly string[]).includes(v)
}

export const isEmploymentType = (v: string): v is EmploymentType => isOneOf(EMPLOYMENT_TYPES, v)
export const isHrStatus = (v: string): v is HrStatus => isOneOf(HR_STATUSES, v)
export const isCompType = (v: string): v is CompType => isOneOf(COMP_TYPES, v)
export const isPayPeriod = (v: string): v is PayPeriod => isOneOf(PAY_PERIODS, v)
