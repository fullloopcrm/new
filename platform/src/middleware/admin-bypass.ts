// Allow admin (PIN-auth) to bypass the sign-in redirect on /dashboard + its
// API routes. A verified admin_token is enough — an admin hitting
// /dashboard directly (no active impersonation) must not fall through to
// the sign-in redirect. Each entry is a plain pathname.startsWith(prefix)
// match (not boundary-aware) — preserved exactly as it behaved inline in
// middleware.ts before this extraction.
export const ADMIN_BYPASS_PREFIXES = [
  '/dashboard', '/api/bookings', '/api/clients',
  '/api/team', '/api/finance', '/api/campaigns',
  '/api/referrals', '/api/settings', '/api/google',
  '/api/social', '/api/changelog', '/api/feedback',
  '/api/security', '/api/availability', '/api/setup-checklist',
  '/api/notifications', '/api/cleaners', '/api/domain-notes',
  '/api/docs', '/api/test-emails', '/api/test/',
  '/api/migrate-', '/api/reviews', '/api/deals',
  '/api/attribution', '/api/leads', '/api/service-types',
  '/api/waitlist', '/api/referrers', '/api/dashboard',
  '/api/indexnow', '/api/management-applications',
  '/api/import-clients', '/api/sms', '/api/schedules',
  '/api/send-booking-emails', '/api/selena',
  '/api/quotes', '/api/quote-templates',
  '/api/jobs', '/api/catalog', '/api/crews',
  '/api/referral-commissions',
  '/api/sales-partners', '/api/sales-partner-commissions',
  // H-01: these owner APIs were missing, so super-admin impersonation fell
  // through to the sign-in redirect (Sales Pipeline, sidebar badges,
  // invoices, payments, schedule, routes, etc.). Tenant scope is still
  // enforced in-route.
  '/api/pipeline', '/api/sidebar-counts',
  '/api/invoices', '/api/documents',
  '/api/payments', '/api/recurring-expenses',
  '/api/routes', '/api/schedule',
  '/api/service-area', '/api/sales-applications',
  '/api/audit', '/api/connect',
  '/api/booking-notes',
  '/api/uploads',
  // These were missing entirely -- /api/vendors has been unreachable for
  // admin/impersonation sessions since it was added (same class of gap as
  // the booking-notes fix above); /api/inventory and /api/categories are
  // new this pass.
  '/api/vendors', '/api/inventory', '/api/categories',
  '/api/equipment',
  // /api/quote-budgets was never added here either -- Master Budget has
  // likely been unreachable for admin/impersonation sessions since it was
  // built (same gap class as vendors/booking-notes).
  '/api/quote-budgets', '/api/budget-templates',
  '/api/tenant/public',
  // Task Board (2026-08-10): same gap class as the vendors/booking-notes/
  // quote-budgets entries above -- missing this entirely blocked every
  // fetch from /dashboard/boards for an admin-impersonation session (the
  // page itself loaded fine since /dashboard is already covered, but every
  // XHR the client made to /api/boards was redirected to /sign-in by this
  // gate before ever reaching the route handler).
  '/api/boards',
]

export function isAdminBypassPath(pathname: string): boolean {
  return ADMIN_BYPASS_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}
