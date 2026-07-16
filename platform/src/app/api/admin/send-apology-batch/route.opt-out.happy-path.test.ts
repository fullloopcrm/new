import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { NextRequest } from 'next/server'

/**
 * W4 apology-batch SMS OPT-OUT lock — independent, second-angle TCPA coverage.
 *
 * `POST /api/admin/send-apology-batch` mass-texts a discount-credit SMS to a set
 * of clients in one admin action. The load-bearing compliance guarantee is that
 * it MUST NOT transmit to a client who has withheld/revoked SMS consent — a
 * wrongful send is a TCPA violation with statutory per-message damages.
 *
 * This proves the sender's suppression ladder from the route handler outward:
 *
 *   1. OPT-OUT IS SUPPRESSED — a client flagged opted-out is counted
 *      `skipped_opt_out` and NEVER handed to the SMS transport.
 *   2. DNS IS SUPPRESSED     — a do_not_service client is counted `skipped_dns`
 *      and never sent (independent never-contact flag).
 *   3. NO PHONE IS SUPPRESSED — a client with no phone is counted
 *      `skipped_no_phone`, never sent.
 *   4. CONSENTING IS SENT + TENANT-SCOPED — the one eligible client gets exactly
 *      one SMS to their number, and the credit write is scoped to the caller's
 *      tenant (no cross-tenant credit or send).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️  KNOWN DEFECT SURFACED BY THIS FILE (AUDIT.md #175) — read before trusting
 *     the opt-out guarantee in production:
 *
 *     The STOP webhook (`api/webhooks/telnyx/route.ts`) records a customer
 *     opt-out by writing `clients.sms_consent = false`. But THIS route selects
 *     and gates on a DIFFERENT column — `sms_opt_in` — which the STOP path never
 *     touches (it defaults true in `supabase/schema.sql`). So a client who
 *     texted STOP still has `sms_opt_in = true` here and is NOT suppressed →
 *     the apology batch texts a customer who opted out. Live TCPA exposure.
 *
 *     The `sms_consent`-gated behavior the fix must deliver is pinned below as an
 *     `it.fails` regression tripwire. It is EXPECTED-FAILING on branch p1-w4
 *     because the column-name fix (tracked as "W5 SMS opt-out fix") is NOT
 *     present in this branch. When that fix lands (route gates on `sms_consent`),
 *     the tripwire starts passing — remove `.fails` to convert it into a lock.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * WHAT IS REAL vs MOCKED
 * ----------------------
 * REAL: the entire route handler — the client fetch, the DNS/opt-out/no-phone
 * suppression ladder, the per-client credit write, and the sent/skipped tally.
 * MOCKED: permission/tenant resolution (forced-authorized as one fixed tenant),
 * the DB (chainable supabase builder — repo convention), and the SMS transport
 * (recorded, never actually sends).
 */

const TENANT = 'aaaaaaaa-1111-2222-3333-444444444444'
const OTHER_TENANT = 'cccccccc-9999-8888-7777-666666666666'

// Client fixtures the route will "load". Tuned per test.
type Row = Record<string, unknown>
let tenantRow: Row
let clientsFixture: Row[]

// DB side-effects the route performs, recorded for assertions.
const reads: Array<{ table: string; eqs: Row }> = []
const updates: Array<{ table: string; payload: Row; eqs: Row }> = []

// ── DB mock: chainable builder. `.single()` serves the tenant read; a directly
//    awaited chain (`.in(...)`) serves the clients read; `.update(...)` is
//    recorded. Mirrors the repo's other happy-path suites. ────────────────────
vi.mock('@/lib/supabase', () => {
  function chain(table: string) {
    const eqs: Row = {}
    let kind: 'read' | 'update' = 'read'
    let payload: Row = {}
    const c: Record<string, unknown> = {
      select: () => c,
      update: (p: Row) => { kind = 'update'; payload = p; return c },
      eq: (col: string, val: unknown) => { eqs[col] = val; return c },
      in: (col: string, vals: unknown) => { eqs[col] = vals; return c },
      // `is`/`lt` back the apology-batch atomic duplicate-claim (route.ts).
      // The fixtures here never set apology_credit_at, so — matching real
      // Postgres — the `is(..., null)` branch always matches and the claim
      // always succeeds; this suite isn't testing the dedup path itself.
      is: (col: string, val: unknown) => { eqs[col] = val; return c },
      lt: (col: string, val: unknown) => { eqs[col] = val; return c },
      single: async () => {
        reads.push({ table, eqs: { ...eqs } })
        if (table === 'tenants') return { data: tenantRow, error: null }
        return { data: null, error: null }
      },
      then: (res: (v: { data: unknown; error: unknown }) => unknown) => {
        if (kind === 'update') {
          updates.push({ table, payload, eqs: { ...eqs } })
          return res({ data: [{ id: eqs.id }], error: null })
        }
        reads.push({ table, eqs: { ...eqs } })
        if (table === 'clients') return res({ data: clientsFixture, error: null })
        return res({ data: null, error: null })
      },
    }
    return c
  }
  return { supabaseAdmin: { from: (t: string) => chain(t) } }
})

// Forced-authorized as TENANT — the permission gate is not what's under test.
vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: TENANT }, error: null }),
}))

// AuthError shape the route imports (never thrown on the happy path).
vi.mock('@/lib/tenant-query', () => ({
  AuthError: class AuthError extends Error {
    status: number
    constructor(message: string, status = 401) { super(message); this.status = status }
  },
}))

// SMS transport — recorded, never actually sends.
const sendSMS = vi.fn(async (_args: unknown) => ({}))
vi.mock('@/lib/sms', () => ({ sendSMS: (args: unknown) => sendSMS(args as never) }))

import { POST } from '@/app/api/admin/send-apology-batch/route'

function req(body: Row): NextRequest {
  return new Request('http://t.test/api/admin/send-apology-batch', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }) as unknown as NextRequest
}

function resetTenant() {
  tenantRow = {
    name: 'Canary Cleaning',
    telnyx_api_key: 'tel_live_canary',
    telnyx_phone: '+15551230000',
  }
}

describe('send-apology-batch — SMS opt-out suppression (TCPA lock)', () => {
  beforeEach(() => {
    reads.length = 0
    updates.length = 0
    sendSMS.mockClear()
    resetTenant()
  })

  it('sends only to the consenting client; suppresses opt-out, DNS, and no-phone — tenant-scoped', async () => {
    clientsFixture = [
      { id: 'c-ok', name: 'Ada Consent', phone: '+15550001111', do_not_service: false, sms_opt_in: true },
      { id: 'c-optout', name: 'Opt Out', phone: '+15550002222', do_not_service: false, sms_opt_in: false },
      { id: 'c-dns', name: 'Do Not Service', phone: '+15550003333', do_not_service: true, sms_opt_in: true },
      { id: 'c-nophone', name: 'No Phone', phone: null, do_not_service: false, sms_opt_in: true },
    ]

    const res = await POST(req({ client_ids: ['c-ok', 'c-optout', 'c-dns', 'c-nophone'], credit_pct: 10 }))
    const json = await res.json()

    // Tally reflects the suppression ladder exactly.
    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.sent).toBe(1)
    expect(json.skipped_opt_out).toBe(1)
    expect(json.skipped_dns).toBe(1)
    expect(json.skipped_no_phone).toBe(1)
    expect(json.total_clients).toBe(4)

    // Exactly one SMS, and it went to the CONSENTING client — never the opt-out.
    expect(sendSMS).toHaveBeenCalledTimes(1)
    const smsArg = sendSMS.mock.calls[0][0] as { to: string }
    expect(smsArg.to).toBe('+15550001111')
    const allRecipients = sendSMS.mock.calls.map((c) => (c[0] as { to: string }).to)
    expect(allRecipients).not.toContain('+15550002222') // opt-out number never texted

    // Client fetch was tenant-scoped (no cross-tenant recipient pull).
    const clientsRead = reads.find((r) => r.table === 'clients')
    expect(clientsRead?.eqs.tenant_id).toBe(TENANT)
    expect(clientsRead?.eqs.tenant_id).not.toBe(OTHER_TENANT)

    // Credit was written ONLY for the sent client, scoped to the caller's tenant.
    const creditWrites = updates.filter((u) => u.table === 'clients')
    expect(creditWrites).toHaveLength(1)
    expect(creditWrites[0].eqs.id).toBe('c-ok')
    expect(creditWrites[0].eqs.tenant_id).toBe(TENANT)
    expect(creditWrites[0].payload.apology_credit_pct).toBe(10)
  })

  it('suppresses ALL when every candidate is opted-out — zero transmissions', async () => {
    clientsFixture = [
      { id: 'c1', name: 'A', phone: '+15550001111', do_not_service: false, sms_opt_in: false },
      { id: 'c2', name: 'B', phone: '+15550002222', do_not_service: false, sms_opt_in: false },
    ]

    const res = await POST(req({ client_ids: ['c1', 'c2'] }))
    const json = await res.json()

    expect(json.sent).toBe(0)
    expect(json.skipped_opt_out).toBe(2)
    expect(sendSMS).not.toHaveBeenCalled()
    expect(updates.filter((u) => u.table === 'clients')).toHaveLength(0) // no credit applied
  })

  // ── REGRESSION TRIPWIRE (expected-failing on p1-w4) ─────────────────────────
  // The customer STOP path writes `sms_consent = false`; a compliant batch sender
  // must suppress on THAT flag. Current code gates on `sms_opt_in` (AUDIT.md #175),
  // so this consent-revoked client is wrongly texted. `it.fails` keeps the suite
  // green while pinning the gap: when the route is fixed to read `sms_consent`,
  // this passes → vitest flags the unexpected pass → remove `.fails` to lock it.
  it.fails(
    'MUST suppress a client whose sms_consent=false (STOP-webhook opt-out) — FAILS until the column fix lands',
    async () => {
      clientsFixture = [
        // Exact state the STOP webhook produces: consent revoked, but the legacy
        // sms_opt_in column is still its schema default (true).
        { id: 'c-stopped', name: 'Stopped Client', phone: '+15550009999', do_not_service: false, sms_opt_in: true, sms_consent: false },
      ]

      const res = await POST(req({ client_ids: ['c-stopped'] }))
      const json = await res.json()

      // The behavior the fix must deliver: revoked consent ⇒ suppressed, no SMS.
      expect(json.sent).toBe(0)
      expect(json.skipped_opt_out).toBe(1)
      expect(sendSMS).not.toHaveBeenCalled()
    },
  )
})
