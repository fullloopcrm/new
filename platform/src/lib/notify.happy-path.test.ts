import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

/**
 * W4 notification-dispatch HAPPY-PATH lock.
 *
 * `notify()` (src/lib/notify.ts) is the single fan-out point every lead/booking
 * signal routes through (new_lead, new_booking, booking_received, referral
 * commission earned, …). It had isolation coverage for its callers but no
 * positive lock on the dispatcher itself. This proves the three load-bearing
 * behaviors of the router:
 *
 *   1. TENANT-SCOPED  — the persisted `notifications` row and the recipient
 *      lookup both carry the caller's tenant_id (no cross-tenant recipient leak,
 *      no cross-tenant notification row).
 *   2. ROUTES + MARKS SENT — a routable email notification actually calls the
 *      email sender with the recipient's address and finalizes the row 'sent'.
 *   3. UNROUTABLE = 'skipped' — when the channel is not configured for the
 *      tenant (no Resend key), nothing is sendable, so the in-app row is still
 *      persisted but finalized 'skipped' (NOT 'failed') and success:false — the
 *      exact classification the delivery-rate health check depends on.
 *
 * WHAT IS REAL vs MOCKED
 * ----------------------
 * REAL: the entire `notify()` control flow — tenant/recipient resolution branch,
 * the channel-configured (`hasEmail`) gate, the send/fallback ladder, and the
 * UNROUTABLE classification set. MOCKED: the DB (chainable supabase builder, the
 * repo convention), the email/SMS transports, the email templates, and the
 * comms-preference gate (forced enabled so the outbound is never suppressed for
 * an unrelated reason).
 */

const TENANT = 'aaaaaaaa-1111-2222-3333-444444444444'
const OTHER_TENANT = 'cccccccc-9999-8888-7777-666666666666'
const NOTIF_ID = 'dddddddd-dddd-dddd-dddd-dddddddddddd'

// ── Mutable fixtures the individual tests tune ────────────────────────────────
let tenantRow: Record<string, unknown>
let ownerEmail: string | null

// ── DB mock: chainable builder recording inserts, reads, and updates ──────────
type Row = Record<string, unknown>
const inserts: Array<{ table: string; payload: Row }> = []
const reads: Array<{ table: string; eqs: Row }> = []
const updates: Array<{ table: string; payload: Row; eqs: Row }> = []

vi.mock('@/lib/supabase', () => {
  function chain(table: string) {
    const eqs: Row = {}
    let kind: 'read' | 'insert' | 'update' = 'read'
    let payload: Row = {}
    const resolveSingle = () => {
      if (kind === 'insert') {
        inserts.push({ table, payload })
        if (table === 'notifications') return { data: { id: NOTIF_ID }, error: null }
        return { data: { id: NOTIF_ID, ...payload }, error: null }
      }
      reads.push({ table, eqs: { ...eqs } })
      if (table === 'tenants') return { data: tenantRow, error: null }
      if (table === 'tenant_members') return { data: { email: ownerEmail }, error: null }
      return { data: null, error: null }
    }
    const c: Record<string, unknown> = {
      select: () => c,
      insert: (p: Row) => { kind = 'insert'; payload = p; return c },
      update: (p: Row) => { kind = 'update'; payload = p; return c },
      eq: (col: string, val: unknown) => { eqs[col] = val; return c },
      single: async () => resolveSingle(),
      maybeSingle: async () => resolveSingle(),
      then: (res: (v: { data: unknown; error: unknown }) => unknown) => {
        if (kind === 'update') updates.push({ table, payload, eqs: { ...eqs } })
        else reads.push({ table, eqs: { ...eqs } })
        return res({ data: null, error: null })
      },
    }
    return c
  }
  return { supabaseAdmin: { from: (t: string) => chain(t) } }
})

// Transports — recorded, never actually send.
const sendEmail = vi.fn(async (_args: unknown) => ({}))
const sendSMS = vi.fn(async (_args: unknown) => ({}))
vi.mock('@/lib/email', () => ({
  sendEmail: (args: unknown) => sendEmail(args as never),
  tenantSender: () => 'Canary <noreply@canary.test>',
}))
vi.mock('@/lib/sms', () => ({ sendSMS: (args: unknown) => sendSMS(args as never) }))

// Comms-preference gate: forced enabled so nothing is gated for an unrelated reason.
vi.mock('@/lib/comms-prefs', () => ({ isCommEnabled: async () => true }))

// Email templates — inert stubs so imports resolve deterministically.
vi.mock('@/lib/email-templates', () => ({
  bookingReminderEmail: () => '<p>x</p>',
  bookingConfirmationEmail: () => '<p>x</p>',
  bookingReceivedEmail: () => '<p>x</p>',
  followUpEmail: () => '<p>x</p>',
  dailySummaryEmail: () => '<p>x</p>',
  dailyOpsRecapEmail: () => '<p>x</p>',
  notificationDigestEmail: () => '<p>x</p>',
  reviewRequestEmail: () => '<p>x</p>',
  paymentReceiptEmail: () => '<p>x</p>',
  genericNotificationEmail: () => '<p>x</p>',
}))

import { notify } from '@/lib/notify'

function resetTenant() {
  tenantRow = {
    resend_api_key: 're_live_canarytestkey',
    telnyx_api_key: null,
    telnyx_phone: null,
    name: 'Canary Cleaning',
    slug: 'canary',
    email_from: null,
    primary_color: null,
    logo_url: null,
    address: null,
  }
  ownerEmail = 'owner@canary.test'
}

describe('notify() — dispatch happy path (lead/booking routing)', () => {
  beforeEach(() => {
    inserts.length = 0
    reads.length = 0
    updates.length = 0
    sendEmail.mockClear()
    sendSMS.mockClear()
    resetTenant()
  })
  afterEach(() => vi.unstubAllEnvs())

  it('routes a new_lead email to the tenant admin, tenant-scoped, and finalizes the row "sent"', async () => {
    const res = await notify({
      tenantId: TENANT,
      type: 'new_lead',
      title: 'New lead',
      message: 'Jane Doe requested a quote',
      channel: 'email',
      recipientType: 'admin',
      metadata: { source: 'website' },
    })

    // 1. Dispatcher reports success.
    expect(res.success).toBe(true)

    // 2. Exactly one notifications row persisted, TENANT-SCOPED and initially pending.
    const notifInserts = inserts.filter((i) => i.table === 'notifications')
    expect(notifInserts).toHaveLength(1)
    const row = notifInserts[0].payload
    expect(row.tenant_id).toBe(TENANT) // load-bearing: no cross-tenant row
    expect(row.tenant_id).not.toBe(OTHER_TENANT)
    expect(row.type).toBe('new_lead')
    expect(row.channel).toBe('email')
    expect(row.recipient_type).toBe('admin')
    expect(row.status).toBe('pending')

    // 3. Recipient lookup was tenant-scoped (owner of THIS tenant, not another).
    const memberRead = reads.find((r) => r.table === 'tenant_members')
    expect(memberRead?.eqs.tenant_id).toBe(TENANT)
    expect(memberRead?.eqs.role).toBe('owner')

    // 4. The email actually went to the resolved admin address.
    expect(sendEmail).toHaveBeenCalledTimes(1)
    const emailArg = sendEmail.mock.calls[0][0] as { to: string; subject: string }
    expect(emailArg.to).toBe('owner@canary.test')
    expect(emailArg.subject).toBe('New lead')
    expect(sendSMS).not.toHaveBeenCalled()

    // 5. The SAME row was finalized 'sent' (by id, no race).
    const notifUpdates = updates.filter((u) => u.table === 'notifications')
    expect(notifUpdates.length).toBeGreaterThanOrEqual(1)
    const last = notifUpdates[notifUpdates.length - 1]
    expect(last.payload.status).toBe('sent')
    expect(last.eqs.id).toBe(NOTIF_ID)
  })

  it('classifies an unroutable notification (channel not configured) as "skipped", not "failed"', async () => {
    // Tenant has NO email transport configured, and the env fallback is a placeholder.
    tenantRow.resend_api_key = null
    vi.stubEnv('RESEND_API_KEY', 'placeholder')

    const res = await notify({
      tenantId: TENANT,
      type: 'new_booking',
      title: 'New booking',
      message: 'A booking came in',
      channel: 'email',
      recipientType: 'admin',
    })

    // Nothing was sendable → not a delivery success, and no transport was hit.
    expect(res.success).toBe(false)
    expect(res.error).toBe('Email not configured — no Resend API key')
    expect(sendEmail).not.toHaveBeenCalled()

    // The in-app row is STILL persisted, tenant-scoped …
    const notifInserts = inserts.filter((i) => i.table === 'notifications')
    expect(notifInserts).toHaveLength(1)
    expect(notifInserts[0].payload.tenant_id).toBe(TENANT)

    // … and finalized 'skipped' (the health-check-neutral status), never 'failed'.
    const notifUpdates = updates.filter((u) => u.table === 'notifications')
    const last = notifUpdates[notifUpdates.length - 1]
    expect(last.payload.status).toBe('skipped')
    expect(last.eqs.id).toBe(NOTIF_ID)
  })

  it('returns "no tenant" without persisting when no tenant can be resolved', async () => {
    // No tenantId passed and no request-scoped headers() available in the test env.
    const res = await notify({
      type: 'new_lead',
      title: 'orphan',
      message: 'no tenant to route to',
      channel: 'email',
    })
    expect(res.success).toBe(false)
    expect(res.error).toBe('no tenant')
    expect(inserts.filter((i) => i.table === 'notifications')).toHaveLength(0)
  })
})
