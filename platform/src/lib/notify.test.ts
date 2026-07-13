/**
 * notify() — the single shared notification dispatcher (55 importers across
 * booking, finance, and comhub: booking confirmations/reminders, payment
 * receipts, review requests, team alerts, comhub chat/lead events). Despite
 * being the most widely-imported function outside the auth chain, it had zero
 * direct test coverage before this file.
 *
 * Covers:
 *   - the tenant-resolution short-circuit (no tenantId → 'no tenant', no DB write)
 *   - tenant-not-found short-circuit
 *   - the communications gate (NOTIFY_COMM_MAP): a mapped type honors
 *     isCommEnabled and is 'skipped' (not 'failed') when disabled; an UNMAPPED
 *     type bypasses the gate entirely even if isCommEnabled would say no
 *   - primary send (email/sms) success updates status to 'sent'
 *   - unroutable recipient (no email/phone, or channel unconfigured) is
 *     classified 'skipped', never 'failed' — this is what keeps the delivery-rate
 *     health check honest
 *   - genuine provider errors are classified 'failed'
 *   - email↔sms fallback when the primary channel fails and the other channel
 *     is reachable
 *   - the booking_id / booking_id (nycmaid alias) merge
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

const calls: Array<{ table: string; op: string; payload?: unknown }> = []
const tableData: Record<string, unknown> = {}

function makeChain(table: string) {
  let op: 'select' | 'insert' | 'update' = 'select'
  const chain: Record<string, unknown> = {
    select: vi.fn(() => chain),
    insert: vi.fn((p: unknown) => { op = 'insert'; calls.push({ table, op: 'insert', payload: p }); return chain }),
    update: vi.fn((p: unknown) => { op = 'update'; calls.push({ table, op: 'update', payload: p }); return chain }),
    eq: vi.fn(() => chain),
    neq: vi.fn(() => chain),
    single: vi.fn(() => {
      if (op === 'insert') return Promise.resolve({ data: { id: 'notif-1' }, error: null })
      return Promise.resolve({ data: tableData[table] ?? null, error: null })
    }),
    maybeSingle: vi.fn(() => Promise.resolve({ data: tableData[table] ?? null, error: null })),
    then: (res: (v: unknown) => unknown) => Promise.resolve({ data: null, error: null }).then(res),
  }
  return chain
}

vi.mock('./supabase', () => ({
  supabaseAdmin: { from: vi.fn((table: string) => makeChain(table)) },
}))

const sendEmailMock = vi.fn(async (_opts: unknown) => ({ id: 'email-1' }))
const sendSMSMock = vi.fn(async (_opts: unknown) => ({ id: 'sms-1' }))
vi.mock('./email', () => ({
  sendEmail: (opts: unknown) => sendEmailMock(opts),
  tenantSender: (t: { email_from?: string }) => t.email_from || 'noreply@example.com',
}))
vi.mock('./sms', () => ({
  sendSMS: (opts: unknown) => sendSMSMock(opts),
}))

const isCommEnabledMock = vi.fn(async (_tenantId: string, _key: string, _channel: string) => true)
vi.mock('./comms-prefs', () => ({
  isCommEnabled: (tenantId: string, key: string, channel: string) => isCommEnabledMock(tenantId, key, channel),
}))

vi.mock('./email-templates', () => ({
  bookingReminderEmail: () => '<p>reminder</p>',
  bookingConfirmationEmail: () => '<p>confirmed</p>',
  bookingReceivedEmail: () => '<p>received</p>',
  followUpEmail: () => '<p>follow up</p>',
  dailySummaryEmail: () => '<p>summary</p>',
  dailyOpsRecapEmail: () => '<p>recap</p>',
  notificationDigestEmail: () => '<p>digest</p>',
  reviewRequestEmail: () => '<p>review</p>',
  paymentReceiptEmail: () => '<p>receipt</p>',
}))

import { notify } from './notify'

const TENANT_ID = 'tenant-1'

function seedTenant(fields: Record<string, unknown> = {}) {
  tableData['tenants'] = {
    resend_api_key: 'resend-key',
    telnyx_api_key: 'telnyx-key',
    telnyx_phone: '+15551234567',
    name: 'Acme Cleaning',
    slug: 'acme',
    email_from: null,
    primary_color: '#111827',
    logo_url: null,
    address: '123 Main St',
    ...fields,
  }
}

beforeEach(() => {
  calls.length = 0
  for (const k of Object.keys(tableData)) delete tableData[k]
  sendEmailMock.mockClear().mockResolvedValue({ id: 'email-1' })
  sendSMSMock.mockClear().mockResolvedValue({ id: 'sms-1' })
  isCommEnabledMock.mockClear().mockResolvedValue(true)
  seedTenant()
})

describe('notify — tenant resolution short-circuits', () => {
  it('returns {success:false, no tenant} and never touches the DB when no tenantId is resolvable', async () => {
    // Outside a Next.js request scope, headers() throws — notify() catches it
    // and falls through to the "no tenant" branch without ever calling supabaseAdmin.
    const r = await notify({ type: 'new_client', title: 'x', message: 'y' })
    expect(r).toEqual({ success: false, error: 'no tenant' })
    expect(calls).toHaveLength(0)
  })

  it('returns Tenant not found when the tenant row does not exist', async () => {
    tableData['tenants'] = null
    const r = await notify({ tenantId: TENANT_ID, type: 'new_client', title: 'x', message: 'y' })
    expect(r).toEqual({ success: false, error: 'Tenant not found' })
  })
})

describe('notify — booking_id / booking_id alias', () => {
  it('accepts the nycmaid-style booking_id param as an alias for bookingId', async () => {
    tableData['tenant_members'] = { email: 'owner@acme.com' }
    await notify({ tenantId: TENANT_ID, type: 'new_booking', title: 'New booking', message: 'hi', booking_id: 'book-42' })
    const insertCall = calls.find((c) => c.table === 'notifications' && c.op === 'insert')
    expect((insertCall!.payload as { booking_id: string }).booking_id).toBe('book-42')
  })
})

describe('notify — communications gate', () => {
  it('a mapped type (booking_confirmed:client) honors isCommEnabled=false and is skipped, not sent', async () => {
    tableData['clients'] = { email: 'client@example.com', phone: null }
    const r = await notify({
      tenantId: TENANT_ID, type: 'booking_confirmed', title: 'Confirmed', message: 'ok',
      recipientType: 'client', recipientId: 'client-1',
    })
    isCommEnabledMock.mockResolvedValue(false)
    // Re-run with the gate now closed.
    const r2 = await notify({
      tenantId: TENANT_ID, type: 'booking_confirmed', title: 'Confirmed', message: 'ok',
      recipientType: 'client', recipientId: 'client-1',
    })
    expect(r.success).toBe(true) // gate open by default in this suite
    expect(r2).toEqual({ success: true })
    expect(sendEmailMock).toHaveBeenCalledTimes(1) // only the first (gate-open) call sent
    const updateCalls = calls.filter((c) => c.table === 'notifications' && c.op === 'update')
    const skippedUpdate = updateCalls.find((c) => (c.payload as { status: string }).status === 'skipped')
    expect(skippedUpdate).toBeDefined()
  })

  it('an UNMAPPED type (payment_received has no NOTIFY_COMM_MAP entry) bypasses the gate entirely', async () => {
    isCommEnabledMock.mockResolvedValue(false) // would block if consulted
    tableData['clients'] = { email: 'client@example.com', phone: null }
    const r = await notify({
      tenantId: TENANT_ID, type: 'payment_received', title: 'Paid', message: 'thanks',
      recipientType: 'client', recipientId: 'client-1',
    })
    expect(r.success).toBe(true)
    expect(isCommEnabledMock).not.toHaveBeenCalled()
    expect(sendEmailMock).toHaveBeenCalledTimes(1)
  })
})

describe('notify — primary send success', () => {
  it('sends email to the client and marks the notification sent', async () => {
    tableData['clients'] = { email: 'client@example.com', phone: null }
    const r = await notify({
      tenantId: TENANT_ID, type: 'new_client', title: 'Hi', message: 'welcome',
      recipientType: 'client', recipientId: 'client-1',
    })
    expect(r).toEqual({ success: true })
    expect(sendEmailMock).toHaveBeenCalledTimes(1)
    const sentUpdate = calls.find((c) => c.table === 'notifications' && c.op === 'update' && (c.payload as { status: string }).status === 'sent')
    expect(sentUpdate).toBeDefined()
  })

  it('sends SMS to a team member on the sms channel', async () => {
    tableData['team_members'] = { email: null, phone: '+15559876543' }
    const r = await notify({
      tenantId: TENANT_ID, type: 'team_member_added', title: 'Welcome', message: 'hi',
      recipientType: 'team_member', recipientId: 'tm-1', channel: 'sms',
    })
    expect(r).toEqual({ success: true })
    expect(sendSMSMock).toHaveBeenCalledTimes(1)
    expect(sendEmailMock).not.toHaveBeenCalled()
  })

  it('resolves the admin/owner recipient from tenant_members when recipientType is admin', async () => {
    tableData['tenant_members'] = { email: 'owner@acme.com' }
    await notify({ tenantId: TENANT_ID, type: 'new_lead', title: 'New lead', message: 'hi' })
    expect(sendEmailMock).toHaveBeenCalledWith(expect.objectContaining({ to: 'owner@acme.com' }))
  })
})

describe('notify — unroutable recipient is skipped, not failed', () => {
  it('no email on file classifies as skipped (not failed) and returns success:false', async () => {
    tableData['clients'] = { email: null, phone: null }
    const r = await notify({
      tenantId: TENANT_ID, type: 'new_client', title: 'Hi', message: 'welcome',
      recipientType: 'client', recipientId: 'client-1',
    })
    expect(r).toEqual({ success: false, error: 'No email address for recipient' })
    const update = calls.find((c) => c.table === 'notifications' && c.op === 'update')
    expect((update!.payload as { status: string }).status).toBe('skipped')
    expect(sendEmailMock).not.toHaveBeenCalled()
  })

  it('email not configured (no Resend key, no platform env fallback) classifies as skipped', async () => {
    seedTenant({ resend_api_key: null })
    const originalEnv = process.env.RESEND_API_KEY
    delete process.env.RESEND_API_KEY
    tableData['clients'] = { email: 'client@example.com', phone: null }
    const r = await notify({
      tenantId: TENANT_ID, type: 'new_client', title: 'Hi', message: 'welcome',
      recipientType: 'client', recipientId: 'client-1',
    })
    expect(r).toEqual({ success: false, error: 'Email not configured — no Resend API key' })
    const update = calls.find((c) => c.table === 'notifications' && c.op === 'update')
    expect((update!.payload as { status: string }).status).toBe('skipped')
    if (originalEnv) process.env.RESEND_API_KEY = originalEnv
  })
})

describe('notify — genuine send failures are classified failed', () => {
  it('a provider error on the primary channel with no fallback recipient is failed, not skipped', async () => {
    sendEmailMock.mockRejectedValue(new Error('Resend 500'))
    tableData['clients'] = { email: 'client@example.com', phone: null } // no phone => no SMS fallback
    const r = await notify({
      tenantId: TENANT_ID, type: 'new_client', title: 'Hi', message: 'welcome',
      recipientType: 'client', recipientId: 'client-1',
    })
    expect(r).toEqual({ success: false, error: 'Resend 500' })
    const update = calls.find((c) => c.table === 'notifications' && c.op === 'update')
    expect((update!.payload as { status: string }).status).toBe('failed')
  })
})

describe('notify — email/SMS fallback', () => {
  it('falls back to SMS when email fails and the recipient has a phone + SMS is configured', async () => {
    sendEmailMock.mockRejectedValue(new Error('bounced'))
    tableData['clients'] = { email: 'client@example.com', phone: '+15551112222' }
    const r = await notify({
      tenantId: TENANT_ID, type: 'new_client', title: 'Hi', message: 'welcome',
      recipientType: 'client', recipientId: 'client-1',
    })
    expect(r).toEqual({ success: true })
    expect(sendSMSMock).toHaveBeenCalledTimes(1)
    const sentUpdate = calls.find((c) => c.table === 'notifications' && c.op === 'update' && (c.payload as { status: string }).status === 'sent')
    expect(sentUpdate).toBeDefined()
    expect((sentUpdate!.payload as { metadata: { _fallback: string } }).metadata._fallback).toBe('sms')
  })

  it('falls back to email when SMS fails and the recipient has an email + email is configured', async () => {
    sendSMSMock.mockRejectedValue(new Error('carrier rejected'))
    tableData['clients'] = { email: 'client@example.com', phone: '+15551112222' }
    const r = await notify({
      tenantId: TENANT_ID, type: 'new_client', title: 'Hi', message: 'welcome',
      recipientType: 'client', recipientId: 'client-1', channel: 'sms',
    })
    expect(r).toEqual({ success: true })
    expect(sendEmailMock).toHaveBeenCalledTimes(1)
    const sentUpdate = calls.find((c) => c.table === 'notifications' && c.op === 'update' && (c.payload as { status: string }).status === 'sent')
    expect((sentUpdate!.payload as { metadata: { _fallback: string } }).metadata._fallback).toBe('email')
  })

  it('does not attempt a fallback when there is no recipientId (broadcast-style calls)', async () => {
    sendEmailMock.mockRejectedValue(new Error('bounced'))
    tableData['tenant_members'] = { email: 'owner@acme.com' }
    const r = await notify({ tenantId: TENANT_ID, type: 'new_lead', title: 'New lead', message: 'hi' })
    expect(r).toEqual({ success: false, error: 'bounced' })
    expect(sendSMSMock).not.toHaveBeenCalled()
  })
})
