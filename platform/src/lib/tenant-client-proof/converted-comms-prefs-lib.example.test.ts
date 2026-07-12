import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * Proof for the comms-prefs DRY probe — the NEVER-CONVERT verdict. Both loaders read the
 * `tenants` REGISTRY by id, which the tenant_id isolation policy cannot scope, so BOTH reads
 * must STAY on supabaseAdmin. This test mocks BOTH clients and proves:
 *   - every read is issued via supabaseAdmin, against `tenants`, filtered by `.eq('id', …)`;
 *   - tenantClient is NEVER constructed (no scoped token minted for a registry read);
 *   - the raw registry rows pass through faithfully (nullable, errors ignored).
 * The clean counterpart to the getSettings MIXED split (which converts its service_types half).
 */

type QueryRecord = {
  client: 'admin' | 'scoped'
  table: string
  selects: string[]
  eqs: Array<[string, unknown]>
  single: boolean
}

const calls: QueryRecord[] = []

/** Recording builder tagged with which client issued it. Resolves the given result. */
function recordingClient(tag: 'admin' | 'scoped', resultsBySelect: Record<string, unknown>) {
  return {
    from(table: string) {
      const rec: QueryRecord = { client: tag, table, selects: [], eqs: [], single: false }
      calls.push(rec)
      const builder: Record<string, unknown> = {}
      builder.select = (cols: string) => {
        rec.selects.push(cols)
        return builder
      }
      builder.eq = (col: string, val: unknown) => { rec.eqs.push([col, val]); return builder }
      builder.single = () => { rec.single = true; return builder }
      builder.then = (resolve: (v: unknown) => void) => {
        // Result keyed by the select string so the two tenants reads can differ.
        const result = resultsBySelect[rec.selects[0]] ?? { data: null, error: null }
        return resolve(result)
      }
      return builder
    },
  }
}

const adminResults: Record<string, unknown> = {}

vi.mock('../supabase', () => ({
  supabaseAdmin: { from: (t: string) => recordingClient('admin', adminResults).from(t) },
}))

const tenantClientMock = vi.fn()
vi.mock('../tenant-client', () => ({
  tenantClient: (...args: unknown[]) => tenantClientMock(...args),
}))

import { fetchCommsPrefsSources } from './converted-comms-prefs-lib.example'

const TENANT = '24d94cd6-9fc0-4882-b544-fa25a4542e9e'
const OTHER = 'ffffffff-ffff-4fff-8fff-ffffffffffff'
const PREFS_SEL = 'notification_preferences'
const CAPS_SEL = 'resend_api_key, telnyx_api_key, telnyx_phone'

beforeEach(() => {
  calls.length = 0
  tenantClientMock.mockReset()
  for (const k of Object.keys(adminResults)) delete adminResults[k]
})

describe('fetchCommsPrefsSources (comms-prefs DRY NEVER-CONVERT probe)', () => {
  it('reads BOTH tenants-registry rows via supabaseAdmin, filtered by .eq(id, tenantId)', async () => {
    adminResults[PREFS_SEL] = { data: { notification_preferences: { comms: {} } }, error: null }
    adminResults[CAPS_SEL] = { data: { resend_api_key: 'rk', telnyx_api_key: null, telnyx_phone: null }, error: null }

    const res = await fetchCommsPrefsSources(TENANT)

    // Exactly two reads, both admin, both against the tenants registry, both by id.
    expect(calls).toHaveLength(2)
    for (const c of calls) {
      expect(c.client).toBe('admin')
      expect(c.table).toBe('tenants')
      expect(c.eqs).toContainEqual(['id', TENANT])
      expect(c.eqs).not.toContainEqual(['tenant_id', TENANT]) // registry has no tenant_id column
      expect(c.single).toBe(true)
    }
    expect(res.notificationPreferences).toEqual({ comms: {} })
    expect(res.capabilitiesRow).toEqual({ resend_api_key: 'rk', telnyx_api_key: null, telnyx_phone: null })
  })

  it('NEVER constructs tenantClient — no scoped token minted for a registry read', async () => {
    adminResults[PREFS_SEL] = { data: { notification_preferences: {} }, error: null }
    adminResults[CAPS_SEL] = { data: {}, error: null }

    await fetchCommsPrefsSources(TENANT)

    expect(tenantClientMock).not.toHaveBeenCalled()
    expect(calls.some((c) => c.client === 'scoped')).toBe(false)
  })

  it('faithfully tolerates null registry rows (errors ignored, no throw)', async () => {
    adminResults[PREFS_SEL] = { data: null, error: { message: 'no row' } }
    adminResults[CAPS_SEL] = { data: null, error: { message: 'no row' } }

    const res = await fetchCommsPrefsSources(TENANT)

    expect(res).toEqual({ notificationPreferences: null, capabilitiesRow: null })
    expect(tenantClientMock).not.toHaveBeenCalled()
  })

  it('passes the caller tenantId straight to the registry .eq(id, …), never a second tenant', async () => {
    adminResults[PREFS_SEL] = { data: { notification_preferences: {} }, error: null }
    adminResults[CAPS_SEL] = { data: {}, error: null }

    await fetchCommsPrefsSources(OTHER)

    for (const c of calls) {
      expect(c.eqs).toContainEqual(['id', OTHER])
      expect(c.eqs).not.toContainEqual(['id', TENANT])
    }
  })
})
