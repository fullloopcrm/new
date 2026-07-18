import { describe, it, expect, vi } from 'vitest'

const cookieDelete = vi.fn()
vi.mock('next/headers', () => ({
  cookies: async () => ({ delete: cookieDelete }),
}))
vi.mock('@/lib/impersonation', () => ({ IMPERSONATE_COOKIE: 'fl_impersonate' }))

import { DELETE } from './route'

describe('DELETE /api/dashboard/sub-tenants/exit-view', () => {
  it('clears the impersonation cookie unconditionally — no auth needed to step back to your own tenant', async () => {
    const res = await DELETE()
    expect(res.status).toBe(200)
    expect(cookieDelete).toHaveBeenCalledWith('fl_impersonate')
  })
})
