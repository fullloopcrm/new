import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * Same class as handleSendPin's already-fixed PIN-update bug (see
 * pin-collision-retry.test.ts): several Yinez SMS tool handlers wrote via
 * `await supabaseAdmin.from(...).update(...)` without ever checking the
 * returned `error`, then unconditionally told the client `{success: true}`
 * over SMS. Supabase-js does not throw on a PostgREST-level write failure
 * (RLS denial, constraint violation, transient error) -- it resolves with
 * `{data: null, error: {...}}` -- so the `catch` block never fires and the
 * client is told an action succeeded (cancelled/rescheduled/paused/resumed/
 * account field updated) when nothing changed in the DB. cancel_booking and
 * manage_recurring are the highest-stakes instances: a client who is told
 * their cleaning is cancelled has no reason to expect the crew to still
 * show up. Fixed by checking `error` on every write in these handlers and
 * returning a failure JSON (routed through yinezError, same as every other
 * failure path in this file) instead of a false success.
 */

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabase: fake, supabaseAdmin: fake, __fake: fake }
})
vi.mock('@anthropic-ai/sdk', () => ({ default: class {} }))
vi.mock('@/lib/anthropic-client', () => ({ resolveAnthropic: vi.fn() }))
vi.mock('@/lib/nycmaid/admin-contacts', () => ({ smsAdmins: vi.fn() }))
vi.mock('@/lib/nycmaid/email', () => ({ sendEmail: vi.fn() }))
vi.mock('@/lib/nycmaid/email-templates', () => ({ emailWrapper: (s: string) => s }))
vi.mock('@/lib/nycmaid/sms', () => ({ sendSMS: vi.fn().mockResolvedValue({ ok: true }) }))
vi.mock('@/lib/smart-schedule', () => ({ scoreTeamForBooking: vi.fn().mockResolvedValue([]) }))

const notifyMock = vi.fn().mockResolvedValue(undefined)
vi.mock('@/lib/nycmaid/notify', () => ({ notify: (...args: unknown[]) => notifyMock(...args) }))

import type { FakeSupabase } from '@/test/fake-supabase'
import { supabaseAdmin } from '@/lib/supabase'
import { handleTool, EMPTY_CHECKLIST, type YinezResult } from '@/lib/selena/core'

const fake = supabaseAdmin as unknown as FakeSupabase
const TENANT = 'tenant-1'
const CONVO_ID = 'convo-1'
const CLIENT_ID = 'client-1'

/** Forces every `.update()` issued against `table` to resolve as a DB-level
 * write failure ({data:null, error}) without throwing -- mirrors a real
 * RLS denial / constraint violation / transient PostgREST error, which
 * supabase-js surfaces via the resolved `error`, not a rejected promise. */
type ForcedErrorBuilder = {
  eq: () => ForcedErrorBuilder
  neq: () => ForcedErrorBuilder
  is: () => ForcedErrorBuilder
  single: () => Promise<{ data: null; error: { message: string; code: string } }>
  then: (onfulfilled: (v: unknown) => unknown) => Promise<unknown>
}

function forceUpdateError(table: string) {
  const realFrom = fake.from.bind(fake)
  fake.from = ((t: string) => {
    const builder = realFrom(t)
    if (t === table) {
      const forced: ForcedErrorBuilder = {
        eq: () => forced,
        neq: () => forced,
        is: () => forced,
        single: async () => ({ data: null, error: { message: 'simulated write failure', code: 'XXFAKE' } }),
        then: (onfulfilled: (v: unknown) => unknown) =>
          Promise.resolve({ data: null, error: { message: 'simulated write failure', code: 'XXFAKE' }, count: null }).then(onfulfilled),
      }
      // Assign as an own property on this instance only (not a spread
      // copy) so prototype methods like select()/insert() -- used by the
      // read paths this handler runs before the write -- stay intact.
      ;(builder as unknown as { update: () => unknown }).update = () => forced
    }
    return builder
  }) as typeof fake.from
}

function freshResult(): YinezResult {
  return { text: '', checklist: { ...EMPTY_CHECKLIST } }
}

beforeEach(() => {
  vi.clearAllMocks()
  fake._store.clear()
})

// cancel_booking's own "update error is no longer swallowed" coverage was
// removed here: the self-book-only refactor (4b4b2fad) replaced its direct
// `bookings.update` with an `admin_tasks.insert` (owner-approval-queue)
// instead -- forcing a `bookings.update` failure no longer exercises this
// handler's write path at all, since it never calls that anymore. The
// insert-failure path has its own real error handling (see handleCancelBooking's
// `if (taskError)` branch) but isn't covered by this specific test shape.

describe('manage_recurring cancel — update error is no longer swallowed', () => {
  it('does not report success when the recurring_schedules.update write fails', async () => {
    fake._seed('sms_conversations', [{ id: CONVO_ID, tenant_id: TENANT, client_id: CLIENT_ID }])
    fake._seed('recurring_schedules', [{ id: 'sched-1', tenant_id: TENANT, client_id: CLIENT_ID, status: 'active' }])
    forceUpdateError('recurring_schedules')

    const out = await handleTool('manage_recurring', { action: 'cancel', schedule_id: 'sched-1' }, CONVO_ID, freshResult())
    const parsed = JSON.parse(out)

    expect(parsed.success).not.toBe(true)
    expect(parsed.error).toBeTruthy()
    expect(notifyMock).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'recurring_cancelled' }))
  })
})

describe('update_account — update error is no longer swallowed', () => {
  it('does not report success when the clients.update write fails', async () => {
    fake._seed('sms_conversations', [{ id: CONVO_ID, tenant_id: TENANT, client_id: CLIENT_ID }])
    fake._seed('clients', [{ id: CLIENT_ID, tenant_id: TENANT, phone: '2125550000' }])
    forceUpdateError('clients')

    const out = await handleTool('update_account', { field: 'phone', value: '2125559999' }, CONVO_ID, freshResult())
    const parsed = JSON.parse(out)

    expect(parsed.success).not.toBe(true)
    expect(parsed.error).toBeTruthy()
  })
})
