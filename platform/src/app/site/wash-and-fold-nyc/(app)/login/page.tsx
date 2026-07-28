import { redirect } from 'next/navigation'

// Global-rule cutover (2026-07-28): this used to render SiteAdminLoginClient,
// which posts to /api/auth/login (legacy admin_users/ADMIN_PASSWORD auth,
// sets the 'admin_session' cookie) and then pushes to /admin. On this
// tenant's own domain, /admin is rewritten by middleware to the GLOBAL
// /dashboard (see middleware.ts ~line 410) — but dashboard/layout.tsx's
// onTenantDomain gate only accepts the 'admin_token' cookie (super-admin or
// tenant-scoped, minted by /api/admin-auth). /api/auth/login never sets that
// cookie, so this login silently failed: a correct password/PIN entry still
// bounced the owner to /fullloop with no error shown, because a *different*,
// unrelated credential (a tenant_members PIN) is what /fullloop actually
// checks. This tenant has no forked operator/admin dashboard left to cut
// over (removed 2026-06-29, commit a1cea0ba5) — the only remaining piece was
// this broken login entry point, now repointed straight to the real one.
export default function LoginPage() {
  redirect('/fullloop')
}
