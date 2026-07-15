import { describe, it, expect, vi } from 'vitest'
import JSZip from 'jszip'

/**
 * GET /api/finance/year-end-zip — truncation-warning surfacing.
 *
 * FIXED (companion to buildGeneralLedger's pagination fix in
 * src/lib/finance-export.test.ts): `buildTrialBalance` already computed a
 * `.truncated` flag when a tenant's journal activity exceeds the 200k safety
 * cap, but the route silently discarded it — an accountant downloading the
 * package had zero indication trial_balance.csv/general_ledger.csv were
 * incomplete. The route now writes a WARNING into README.txt (and logs
 * server-side) whenever either export hit its safety cap.
 *
 * LOCK: truncated=true on either builder produces a WARNING in README.txt.
 * CONTROL: truncated=false/undefined produces a clean README.txt.
 */

const A = 'tid-a'

const holder = vi.hoisted(() => ({ tbTruncated: false, glTruncated: false }))

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: () => ({
      select: function () { return this },
      eq: function () { return this },
      gte: function () { return this },
      lte: function () { return this },
      order: function () { return this },
      in: function () { return this },
      range: () => Promise.resolve({ data: [], error: null }),
    }),
  },
}))
vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({ tenant: { tenantId: A }, error: null })),
}))
vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: vi.fn(async () => ({ tenantId: A })),
  AuthError: class AuthError extends Error { status = 401 },
}))
vi.mock('@/lib/finance-export', async () => {
  const actual = await vi.importActual<typeof import('@/lib/finance-export')>('@/lib/finance-export')
  return {
    ...actual,
    buildTrialBalance: vi.fn(async () => {
      const rows = [] as Array<Record<string, unknown>> & { truncated?: boolean }
      if (holder.tbTruncated) rows.truncated = true
      return rows
    }),
    buildGeneralLedger: vi.fn(async () => {
      const rows = [] as Array<Record<string, unknown>> & { truncated?: boolean }
      if (holder.glTruncated) rows.truncated = true
      return rows
    }),
  }
})

import { GET } from './route'

async function readme(res: Response): Promise<string> {
  const buf = await res.arrayBuffer()
  const zip = await JSZip.loadAsync(buf)
  return zip.file('README.txt')!.async('string')
}

describe('finance/year-end-zip GET — truncation warning', () => {
  it('LOCK: buildTrialBalance.truncated surfaces a WARNING in README.txt', async () => {
    holder.tbTruncated = true
    holder.glTruncated = false
    const res = await GET(new Request('http://t/api/finance/year-end-zip?year=2026'))
    expect(res.status).toBe(200)
    expect(await readme(res)).toContain('WARNING')
  })

  it('LOCK: buildGeneralLedger.truncated surfaces a WARNING in README.txt', async () => {
    holder.tbTruncated = false
    holder.glTruncated = true
    const res = await GET(new Request('http://t/api/finance/year-end-zip?year=2026'))
    expect(await readme(res)).toContain('WARNING')
  })

  it('CONTROL: no truncation produces a clean README.txt', async () => {
    holder.tbTruncated = false
    holder.glTruncated = false
    const res = await GET(new Request('http://t/api/finance/year-end-zip?year=2026'))
    expect(await readme(res)).not.toContain('WARNING')
  })
})
