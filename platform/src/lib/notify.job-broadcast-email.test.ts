/**
 * notify() 'booking_reminder' vs the emergency job-broadcast email.
 *
 * POST /api/bookings/broadcast (the "URGENT JOB AVAILABLE" roster-wide
 * emergency dispatch broadcast) built its own styled HTML card and passed it
 * as `message` into `notify({ type: 'booking_reminder', ... })`. But
 * notify()'s 'booking_reminder' case unconditionally builds
 * bookingReminderEmail({ ..., dateTime: message, ... }), which
 * escapeHtml()s `dateTime` — so the caller's full HTML card was never sent;
 * it was dumped as literal escaped markup into a generic "Appointment
 * Reminder" template's Date & Time field, addressed to a hardcoded "Client"
 * default name, with no pay rate, location, or claim CTA actually rendered.
 * A team member paging through their inbox for an urgent, same-day dispatch
 * saw raw `&lt;div style=...&gt;` source instead of the job details.
 *
 * Fixed by giving the broadcast its own notify() type ('job_broadcast') and
 * a real template (jobBroadcastEmail) that renders structured metadata
 * through the branded shell, same pattern as every other notify() type.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake, __fake: fake }
})

let sentHtml = ''
vi.mock('@/lib/email', () => ({
  sendEmail: async (opts: { html: string }) => {
    sentHtml = opts.html
  },
  tenantSender: () => 'Test Tenant <noreply@test.com>',
}))
vi.mock('@/lib/sms', () => ({ sendSMS: async () => {} }))

import { supabaseAdmin } from '@/lib/supabase'
import { notify } from '@/lib/notify'

const fake = supabaseAdmin as unknown as FakeSupabase
const TENANT_ID = 'tenant-1'
const MEMBER_ID = 'tm-1'

beforeEach(() => {
  fake._store.clear()
  fake._seed('tenants', [
    { id: TENANT_ID, name: 'Acme Plumbing', resend_api_key: 'test-key', telnyx_api_key: null, telnyx_phone: null, email_from: null, primary_color: null, logo_url: null, address: null },
  ])
  fake._seed('team_members', [
    { id: MEMBER_ID, tenant_id: TENANT_ID, name: 'Sam Tech', email: 'sam@test.com', phone: null },
  ])
  sentHtml = ''
})

describe("notify() type 'job_broadcast'", () => {
  it('renders the pay rate, date, time, and location as real markup, not escaped source', async () => {
    const result = await notify({
      tenantId: TENANT_ID,
      type: 'job_broadcast',
      title: 'Urgent: $85/hr Job Available',
      message: 'Urgent job available today at $85/hr.',
      channel: 'email',
      recipientType: 'team_member',
      recipientId: MEMBER_ID,
      metadata: {
        payRate: 85,
        jobDate: 'Thursday, July 17',
        jobTime: '2:30 PM',
        endTime: '4:30 PM',
        address: '123 Main St',
        serviceType: 'Burst Pipe',
        notes: 'Basement flooding',
      },
    })

    expect(result.success).toBe(true)
    // Real fields rendered as actual content, not escaped-HTML-as-text.
    expect(sentHtml).toContain('$85/hr')
    expect(sentHtml).toContain('Thursday, July 17')
    expect(sentHtml).toContain('2:30 PM - 4:30 PM')
    expect(sentHtml).toContain('123 Main St')
    expect(sentHtml).toContain('Burst Pipe')
    expect(sentHtml).toContain('Basement flooding')
    // The old bug's fingerprint: a caller-built HTML string leaking through
    // escapeHtml() as literal, visible source in the rendered email.
    expect(sentHtml).not.toContain('&lt;div')
    expect(sentHtml).not.toContain('&lt;h1')
  })

  it('does not fall back to the generic "Appointment Reminder" / hardcoded "Client" copy', async () => {
    await notify({
      tenantId: TENANT_ID,
      type: 'job_broadcast',
      title: 'Urgent: $85/hr Job Available',
      message: 'Urgent job available today at $85/hr.',
      channel: 'email',
      recipientType: 'team_member',
      recipientId: MEMBER_ID,
      metadata: { payRate: 85, jobDate: 'Thursday, July 17', jobTime: '2:30 PM' },
    })

    expect(sentHtml).not.toContain('Appointment Reminder')
    expect(sentHtml).not.toContain('Hi Client,')
  })
})
