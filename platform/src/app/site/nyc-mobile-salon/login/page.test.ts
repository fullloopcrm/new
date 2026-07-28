import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * Global-rule cutover regression: this tenant's own /login used to render
 * SiteAdminLoginClient, which authenticates against a DIFFERENT credential
 * system (/api/auth/login's 'admin_session' cookie) than the one
 * dashboard/layout.tsx actually checks on a tenant custom domain
 * ('admin_token', from /api/admin-auth) -- so a correct password/PIN entry
 * still silently failed to reach the dashboard. Repointed straight to the
 * real, working global tenant login instead of maintaining a second, broken
 * login form. This proves the repoint, not just that "some redirect" fires.
 */

const redirect = vi.fn()
vi.mock('next/navigation', () => ({ redirect: (path: string) => redirect(path) }))

// If this ever regresses back to rendering the broken per-tenant login
// component, this import failing to resolve (or the redirect assertion
// below failing) is the signal.
vi.mock('@/components/auth/SiteAdminLoginClient', () => ({
  default: () => { throw new Error('SiteAdminLoginClient should not be rendered — this route must redirect to /fullloop') },
}))

beforeEach(() => {
  redirect.mockReset()
})

describe('site/nyc-mobile-salon/login — repointed to global auth', () => {
  it('redirects to the real global tenant login (/fullloop), not the broken per-tenant form', async () => {
    const { default: LoginPage } = await import('./page')
    LoginPage()
    expect(redirect).toHaveBeenCalledTimes(1)
    expect(redirect).toHaveBeenCalledWith('/fullloop')
  })
})
