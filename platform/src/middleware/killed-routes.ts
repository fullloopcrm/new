// Routes killed during the 2026-05-03 teaser pivot. Strategy shifted away
// from licensing the platform to operators; these pages all assumed a
// buyer/applicant funnel that no longer exists. Returning 410 (not 404)
// tells Google to drop them from the index quickly.
export const KILLED_ROUTES = [
  // /apply is tenant-scoped hiring, not part of the Full Loop buyer funnel —
  // kept 410 on the main host only. The buyer funnel was restored 2026-06-22.
  '/apply',
]

export function isKilledRoute(pathname: string): boolean {
  return KILLED_ROUTES.some(p => pathname === p || pathname.startsWith(p + '/'))
}
