import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * backupTenant() — extracted from cron/backup's per-tenant loop body so
 * settings/backup (one tenant, dashboard-triggered) and cron/backup (every
 * active tenant, CRON_SECRET-gated) share the exact same snapshot shape and
 * storage path instead of drifting.
 */

const h = vi.hoisted(() => ({
  uploadMock: vi.fn(),
  throwOnRead: false,
}))

vi.mock('@/lib/supabase', () => {
  const selectChain = () => ({
    eq: () => {
      if (h.throwOnRead) throw new Error('db unreachable')
      return Promise.resolve({ data: [] })
    },
  })
  const fake = {
    from: () => ({ select: selectChain }),
    storage: {
      from: () => ({ upload: h.uploadMock }),
    },
  }
  return { supabaseAdmin: fake }
})

import { backupTenant } from './tenant-backup'

beforeEach(() => {
  h.uploadMock.mockReset()
  h.uploadMock.mockResolvedValue({ error: null })
  h.throwOnRead = false
})

describe('backupTenant', () => {
  it('uploads a dated snapshot for the given tenant and returns ok', async () => {
    const result = await backupTenant({ id: 't1', slug: 'acme' })

    expect(result).toEqual({ ok: true })
    expect(h.uploadMock).toHaveBeenCalledWith(
      expect.stringMatching(/^backups\/acme\/\d{4}-\d{2}-\d{2}\.json$/),
      expect.any(String),
      expect.objectContaining({ contentType: 'application/json', upsert: true }),
    )
  })

  it('returns ok:false with the storage error message on upload failure', async () => {
    h.uploadMock.mockResolvedValueOnce({ error: { message: 'bucket not found' } })

    const result = await backupTenant({ id: 't1', slug: 'acme' })

    expect(result).toEqual({ ok: false, error: 'bucket not found' })
  })

  it('catches a thrown error from the data reads instead of rejecting', async () => {
    h.throwOnRead = true

    const result = await backupTenant({ id: 't1', slug: 'acme' })

    expect(result).toEqual({ ok: false, error: 'db unreachable' })
    expect(h.uploadMock).not.toHaveBeenCalled()
  })
})
