/**
 * The `request_callback` tool ("Client wants to talk to a human. Notifies
 * admin with context.") locked the conversation for 24h
 * (`escalation_locked_until`) but never touched `sms_conversations.outcome`.
 *
 * Two real, currently-live readers assume `outcome === 'escalated'` gets set
 * somewhere: `getTenantMetrics()` (`src/lib/selena/metrics.ts`)'s `escalations`
 * count, and `/api/admin/selena/monitor`'s `stats.escalated`
 * (`countOutcome('escalated')`) — the bearer-keyed endpoint that exists
 * specifically so external ops-monitoring tools can scrape Selena/Yinez
 * health. Its own fallback (`c.summary?.includes('escalat')`) never fires
 * either — `summary` is only ever written on the booked/waitlisted paths, so
 * it never contains that substring. With no call site ever setting the
 * outcome, both counts were permanently and silently stuck at zero no matter
 * how many clients asked for a human — the exact case this tool exists to
 * handle.
 *
 * Fixed: `handleRequestCallback` now sets `outcome: 'escalated'` in the same
 * update that already sets `escalation_locked_until`.
 */
import { describe, it, expect, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabase: fake, supabaseAdmin: fake, __fake: fake }
})

const notifyMock = vi.fn().mockResolvedValue(undefined)
vi.mock('@/lib/nycmaid/notify', () => ({ notify: (...args: unknown[]) => notifyMock(...args) }))
vi.mock('@/lib/nycmaid/sms', () => ({ sendSMS: vi.fn().mockResolvedValue({ success: true }) }))
vi.mock('@/lib/nycmaid/email', () => ({ sendEmail: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@/lib/nycmaid/email-templates', () => ({ emailWrapper: (c: string) => c }))
vi.mock('@/lib/nycmaid/admin-contacts', () => ({ smsAdmins: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@/lib/anthropic-client', () => ({ resolveAnthropic: vi.fn() }))

import { supabaseAdmin } from '@/lib/supabase'
import { handleTool, EMPTY_CHECKLIST, type YinezResult } from './core'

const fake = supabaseAdmin as unknown as FakeSupabase

const TENANT = 'tenant-1'
const CONVERSATION_ID = 'convo-callback-1'

describe('request_callback tool — escalation tracking', () => {
  it('sets sms_conversations.outcome to escalated alongside the existing lock', async () => {
    fake._store.clear()
    fake._seed('sms_conversations', [
      { id: CONVERSATION_ID, tenant_id: TENANT, name: 'Dana', phone: '+15551230000', outcome: null },
    ])

    const result: YinezResult = { text: '', checklist: EMPTY_CHECKLIST }
    await handleTool('request_callback', { reason: 'Wants to speak to a manager' }, CONVERSATION_ID, result)

    const [convo] = fake._all('sms_conversations')
    expect(convo.outcome).toBe('escalated')
    expect(convo.escalation_locked_until).toBeTruthy()
  })

  it('still fires the callback_requested notification as before', async () => {
    fake._store.clear()
    fake._seed('sms_conversations', [
      { id: CONVERSATION_ID, tenant_id: TENANT, name: 'Dana', phone: '+15551230000', outcome: null },
    ])
    notifyMock.mockClear()

    const result: YinezResult = { text: '', checklist: EMPTY_CHECKLIST }
    await handleTool('request_callback', { reason: 'Wants to speak to a manager' }, CONVERSATION_ID, result)

    expect(notifyMock).toHaveBeenCalledTimes(1)
    expect(notifyMock.mock.calls[0][0]).toMatchObject({ type: 'callback_requested' })
  })
})
