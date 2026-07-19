import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * nycmaid gap port (1f91907d): the one-tap "terms accepted" client SMS quoted
 * the booking's bare exact start time (e.g. "Fri, Jul 24, 1:00 PM"), which
 * reads as the appointment time rather than the 2-hour arrival window clients
 * are actually told to expect everywhere else in the booking flow. Now labels
 * it as an arrival window and renders the same 2-hour range clientArrivalWindow
 * produces. Admin-facing messages (smsAdmins/notify) keep the exact start time.
 */

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})

const sendSMS = vi.fn(async (..._args: unknown[]) => ({ ok: true }))
vi.mock('@/lib/nycmaid/sms', () => ({ sendSMS: (...args: unknown[]) => sendSMS(...args) }))

const smsAdmins = vi.fn(async (..._args: unknown[]) => {})
vi.mock('@/lib/admin-contacts', () => ({ smsAdmins: (...args: unknown[]) => smsAdmins(...args) }))

const notify = vi.fn(async (..._args: unknown[]) => {})
vi.mock('@/lib/nycmaid/notify', () => ({ notify: (...args: unknown[]) => notify(...args) }))

import { supabaseAdmin } from '@/lib/supabase'
import { POST } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase
const TOKEN = 'confirm-tok'
const START = '2026-08-14T13:00:00' // 1:00 PM ET naive wall-clock

beforeEach(() => {
  fake._store.clear()
  sendSMS.mockClear()
  smsAdmins.mockClear()
  notify.mockClear()
  fake._seed('bookings', [
    {
      id: 'bk1',
      tenant_id: 'tid-a',
      client_confirm_token: TOKEN,
      start_time: START,
      status: 'pending',
      client_terms_accepted_at: null,
      client_id: 'cl1',
      clients: { name: 'Jane Doe', phone: '+15550001111' },
      notes: null,
    },
  ])
})

function req(): Request {
  return new Request('http://x/api/client/confirm/' + TOKEN, { method: 'POST' })
}

describe('client/confirm/[token] POST — arrival-window client SMS wording', () => {
  it("labels the client-facing SMS with 'arrival window' and a 2-hour range, not the bare exact start time", async () => {
    const res = await POST(req(), { params: Promise.resolve({ token: TOKEN }) })
    expect(res.status).toBe(200)

    expect(sendSMS).toHaveBeenCalledTimes(1)
    const clientMsg = sendSMS.mock.calls[0][1] as string
    expect(clientMsg).toContain('arrival window')
    expect(clientMsg).toContain('1:00 PM–3:00 PM')
    expect(clientMsg).not.toContain('terms accepted for Fri, Aug 14, 1:00 PM.')
  })

  it('keeps the exact start time (not a window) in the admin-facing SMS and notify call', async () => {
    await POST(req(), { params: Promise.resolve({ token: TOKEN }) })

    expect(smsAdmins).toHaveBeenCalledTimes(1)
    const adminMsg = smsAdmins.mock.calls[0][1] as string
    expect(adminMsg).toContain('1:00 PM')
    expect(adminMsg).not.toContain('arrival window')

    expect(notify).toHaveBeenCalledTimes(1)
    const notifyArg = notify.mock.calls[0][0] as { message: string }
    expect(notifyArg.message).toContain('1:00 PM')
    expect(notifyArg.message).not.toContain('arrival window')
  })
})
