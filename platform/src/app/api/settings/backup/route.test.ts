import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextResponse } from 'next/server'

/**
 * POST /api/settings/backup — the dashboard settings page's "Run Backup Now"
 * used to POST straight to /api/cron/backup, which only exports GET (405),
 * is CRON_SECRET-gated (the browser sends no such header, so 401 even with a
 * POST handler), and backs up EVERY tenant platform-wide — the wrong scope
 * for a single tenant's own on-demand button. This route is the real,
 * tenant-scoped replacement: same requirePermission('settings.edit') gate as
 * the rest of /api/settings/*, backs up only the calling tenant.
 */

const h = vi.hoisted(() => ({
  tenant: null as unknown,
  error: null as unknown,
  backupResult: { ok: true } as { ok: boolean; error?: string },
  backupCalledWith: null as unknown,
}))

vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () =>
    h.error ? { tenant: null, error: h.error } : { tenant: h.tenant, error: null },
}))

vi.mock('@/lib/tenant-backup', () => ({
  backupTenant: async (t: unknown) => {
    h.backupCalledWith = t
    return h.backupResult
  },
}))

import { POST } from './route'

beforeEach(() => {
  h.tenant = { tenantId: 'tenant-A', tenant: { id: 'tenant-A', slug: 'acme' }, role: 'admin' }
  h.error = null
  h.backupResult = { ok: true }
  h.backupCalledWith = null
})

describe('POST /api/settings/backup', () => {
  it('returns the permission error unchanged when the caller lacks settings.edit', async () => {
    h.error = NextResponse.json({ error: 'Forbidden: insufficient permissions' }, { status: 403 })

    const res = await POST()

    expect(res.status).toBe(403)
    expect(h.backupCalledWith).toBeNull()
  })

  it('backs up only the calling tenant, not the whole platform', async () => {
    const res = await POST()

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({ ok: true })
    expect(h.backupCalledWith).toEqual({ id: 'tenant-A', slug: 'acme' })
  })

  it('returns 500 with the underlying error when the backup fails', async () => {
    h.backupResult = { ok: false, error: 'upload failed' }

    const res = await POST()

    expect(res.status).toBe(500)
    await expect(res.json()).resolves.toEqual({ error: 'upload failed' })
  })
})
