/**
 * GET /api/cron/backup — the nightly "N tenants backed up" summary is a
 * cross-tenant platform report (every active tenant's outcome in one
 * message, including other tenants' slugs in the error text), not any
 * single tenant's own event. The old insert attached it to `tenants?.[0]` --
 * an arbitrary, unordered "first active tenant" -- instead of omitting
 * tenant_id like every other platform-wide cron's notifications insert
 * (system-check, health-monitor, comms-monitor, generate-monthly-invoices,
 * all "tenant-scope-ok: cron job runs platform-wide across all tenants by
 * design"). `GET /api/sidebar-counts` counts unread notifications by
 * `tenant_id` + `read=false` with no recipient_type filter (read defaults
 * false, recipient_type is never set on this insert) -- so that one
 * unlucky real tenant's dashboard badge silently incremented every night,
 * forever, with no way to open or clear it (GET /api/notifications, the
 * only mark-read path, filters `recipient_type='admin'`, which this row
 * never has).
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createFakeSupabase } from '@/test/fake-supabase'

const h = vi.hoisted(() => ({
  fake: null as ReturnType<typeof import('@/test/fake-supabase').createFakeSupabase> | null,
}))

vi.mock('@/lib/supabase', () => ({
  get supabaseAdmin() {
    return h.fake!
  },
}))

vi.mock('@/lib/tenant-backup', () => ({
  backupTenant: vi.fn().mockResolvedValue({ ok: true }),
}))

import { GET } from './route'

function cronReq(): Request {
  return new Request('https://x.test/api/cron/backup', {
    headers: { authorization: 'Bearer cron-secret-test' },
  })
}

let savedCron: string | undefined

beforeEach(() => {
  savedCron = process.env.CRON_SECRET
  process.env.CRON_SECRET = 'cron-secret-test'
  h.fake = createFakeSupabase({
    tenants: [
      { id: 'tenant-a', name: 'Acme', slug: 'acme', status: 'active' },
      { id: 'tenant-b', name: 'Beta', slug: 'beta', status: 'active' },
    ],
    notifications: [],
  })
})

afterEach(() => {
  if (savedCron === undefined) delete process.env.CRON_SECRET
  else process.env.CRON_SECRET = savedCron
})

describe('nightly backup-complete notification is platform-wide, not tenant-attached', () => {
  it('never sets tenant_id on the summary row -- not tenants[0], not any other tenant', async () => {
    const res = await GET(cronReq())
    expect(res.status).toBe(200)

    const rows = h.fake!._all('notifications')
    expect(rows.length).toBe(1)
    const row = rows[0]
    expect(row.tenant_id).toBeUndefined()
    expect(row.type).toBe('platform')
    expect(row.title).toBe('Nightly Backup Complete')
    expect(String(row.message)).toContain('2 tenants backed up successfully')
  })

  it('still writes nothing when there is nothing to report (no backups, no errors)', async () => {
    h.fake = createFakeSupabase({ tenants: [], notifications: [] })
    const res = await GET(cronReq())
    expect(res.status).toBe(200)
    expect(h.fake._all('notifications').length).toBe(0)
  })
})
