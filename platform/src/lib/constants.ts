// ── Booking status colors (dashboard pages) ──────────────────────────
export const BOOKING_STATUS_COLORS: Record<string, string> = {
  scheduled: 'bg-blue-50 text-blue-700',
  confirmed: 'bg-indigo-50 text-indigo-700',
  in_progress: 'bg-yellow-50 text-yellow-700',
  completed: 'bg-green-50 text-green-700',
  paid: 'bg-emerald-50 text-emerald-700',
  cancelled: 'bg-red-50 text-red-700',
  no_show: 'bg-slate-100 text-slate-500',
  pending: 'bg-slate-100 text-slate-500',
}

// ── Team member status colors ────────────────────────────────────────
export const TEAM_STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-50 text-green-700 border-green-500/30',
  suspended: 'bg-yellow-50 text-yellow-700 border-yellow-500/30',
  inactive: 'bg-slate-100 text-slate-500 border-slate-200',
}

// ── Team role colors ─────────────────────────────────────────────────
export const ROLE_COLORS: Record<string, string> = {
  worker: 'bg-blue-50 text-blue-700',
  lead: 'bg-purple-50 text-purple-700',
  manager: 'bg-indigo-50 text-indigo-700',
}

// ── Client status colors ─────────────────────────────────────────────
export const CLIENT_STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-50 text-green-700',
  inactive: 'bg-slate-100 text-slate-500',
  do_not_contact: 'bg-red-50 text-red-700',
}

// ── Tenant / business status colors (admin pages) ────────────────────
export const TENANT_STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-50 text-green-600 border border-green-200',
  setup: 'bg-teal-50 text-teal-600 border border-teal-200',
  suspended: 'bg-yellow-50 text-yellow-600 border border-yellow-200',
  cancelled: 'bg-red-50 text-red-600 border border-red-200',
  deleted: 'bg-slate-200 text-slate-400',
}

// ── Billing status colors (admin pages) ──────────────────────────────
export const BILLING_COLORS: Record<string, string> = {
  active: 'bg-green-50 text-green-600 border border-green-200',
  setup: 'bg-teal-50 text-teal-600 border border-teal-200',
  past_due: 'bg-red-50 text-red-600 border border-red-200',
  cancelled: 'bg-slate-200 text-slate-400',
}

// ── Plan colors (admin pages) ────────────────────────────────────────
export const PLAN_COLORS: Record<string, string> = {
  pro: 'bg-teal-50 text-teal-600 border border-teal-200',
  starter: 'bg-green-50 text-green-600 border border-green-200',
  free: 'bg-slate-200 text-slate-400',
  enterprise: 'bg-purple-50 text-purple-600 border border-purple-200',
}

// ── Sales status colors (admin pages) ────────────────────────────────
export const SALES_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
  active: 'bg-green-50 text-green-700 border border-green-200',
  suspended: 'bg-red-50 text-red-700 border border-red-200',
  cancelled: 'bg-slate-100 text-slate-500 border border-slate-200',
}
