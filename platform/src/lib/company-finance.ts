// Shared constants for Full Loop's own finance ledger (platform_finance_transactions).
// Kept in one place so the DB check constraint, the API validation, and the
// admin UI dropdowns can never drift out of sync.

export const REVENUE_CATEGORIES = ['tenant_subscription', 'tenant_setup_fee', 'other_revenue'] as const
export const EXPENSE_CATEGORIES = [
  'ai_hosting_anthropic',
  'infra_hosting',
  'saas_tools',
  'contractor_payroll',
  'other_expense',
] as const

export type RevenueCategory = (typeof REVENUE_CATEGORIES)[number]
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number]
export type FinanceCategory = RevenueCategory | ExpenseCategory
export type FinanceType = 'revenue' | 'expense'

export const CATEGORY_LABEL: Record<FinanceCategory, string> = {
  tenant_subscription: 'Tenant subscription',
  tenant_setup_fee: 'Tenant setup fee',
  other_revenue: 'Other revenue',
  ai_hosting_anthropic: 'Anthropic / AI',
  infra_hosting: 'Hosting & infra',
  saas_tools: 'SaaS tools',
  contractor_payroll: 'Contractor / payroll',
  other_expense: 'Other expense',
}

export function categoriesForType(type: FinanceType): readonly FinanceCategory[] {
  return type === 'revenue' ? REVENUE_CATEGORIES : EXPENSE_CATEGORIES
}

export function isValidCategoryForType(type: FinanceType, category: string): category is FinanceCategory {
  return (categoriesForType(type) as readonly string[]).includes(category)
}
