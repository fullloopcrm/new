import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * Item (162): onboarding_tasks.status's declared 'blocked' value
 * (037_leads_qualification.sql CHECK constraint) had a red STATUS_STYLE badge
 * and a STATUS_CYCLE exit-transition defined for it in go-live/page.tsx, but
 * zero call site ever set it — the tenant checklist could only cycle
 * pending/in_progress/completed or skip, so a genuinely stuck task (waiting
 * on a third party, or on FullLoop staff to finish provisioning) had no way
 * to be flagged as blocked short of a manual DB write.
 *
 * Item (163) continuing (162)'s surface: unlike every sibling exception-status
 * in this codebase (documents.declined -> decline_reason, prospects.rejected
 * -> reject_reason, accounting_periods.reopened -> reopened_reason),
 * onboarding_tasks had no reason column at all. Added blocked_reason
 * (migration file, not applied) and this route now persists it on
 * status:'blocked' and clears it on any other transition, so a resolved
 * block's reason can't linger next to a task that isn't blocked anymore.
 */

const TENANT = 'aaaaaaaa-1111-2222-3333-444444444444'
const TASK_ID = 'task-1'

type Row = Record<string, any>
const store: Record<string, Row[]> = { onboarding_tasks: [] }

vi.mock('@/lib/supabase', () => {
  function chain(table: string) {
    const eqs: Row = {}
    let payload: Row = {}
    const match = (r: Row) => Object.entries(eqs).every(([k, v]) => r[k] === v)
    const c: Record<string, unknown> = {
      select: () => c,
      update: (p: Row) => { payload = p; return c },
      eq: (col: string, val: unknown) => { eqs[col] = val; return c },
      order: () => c,
      then: undefined,
      single: async () => {
        const idx = (store[table] || []).findIndex(match)
        if (idx === -1) return { data: null, error: { message: 'not found' } }
        store[table][idx] = { ...store[table][idx], ...payload }
        return { data: store[table][idx], error: null }
      },
    }
    return c
  }
  return { supabaseAdmin: { from: (t: string) => chain(t) } }
})

vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: TENANT }),
  AuthError: class AuthError extends Error {
    status: number
    constructor(message: string, status = 401) { super(message); this.status = status }
  },
}))

vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({
    tenant: { tenantId: TENANT },
    error: null,
  }),
}))

vi.mock('@/lib/onboarding-tasks', () => ({
  checkActivationReadiness: async () => ({ ready: false, tasksRemaining: 1, gatePassed: true, gateBlockers: [] }),
}))

import { PATCH } from '@/app/api/dashboard/onboarding/route'

function jsonReq(body: Row): Request {
  return new Request('http://t.test/api/dashboard/onboarding', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('dashboard/onboarding PATCH blocked status + reason', () => {
  beforeEach(() => {
    store.onboarding_tasks = [{
      id: TASK_ID, tenant_id: TENANT, task_type: 'create_stripe',
      status: 'pending', notes: 'Connect Stripe', blocked_reason: null,
    }]
  })

  it('persists blocked status and its reason', async () => {
    const res = await PATCH(jsonReq({ task_id: TASK_ID, status: 'blocked', blocked_reason: 'waiting on staff to provision Stripe' }))
    expect(res.status).toBe(200)
    expect(store.onboarding_tasks[0].status).toBe('blocked')
    expect(store.onboarding_tasks[0].blocked_reason).toBe('waiting on staff to provision Stripe')
  })

  it('clears blocked_reason when the task moves back to in_progress', async () => {
    store.onboarding_tasks[0].status = 'blocked'
    store.onboarding_tasks[0].blocked_reason = 'waiting on staff'
    const res = await PATCH(jsonReq({ task_id: TASK_ID, status: 'in_progress' }))
    expect(res.status).toBe(200)
    expect(store.onboarding_tasks[0].status).toBe('in_progress')
    expect(store.onboarding_tasks[0].blocked_reason).toBeNull()
  })

  it('clears blocked_reason when the task is completed directly from blocked', async () => {
    store.onboarding_tasks[0].status = 'blocked'
    store.onboarding_tasks[0].blocked_reason = 'waiting on staff'
    const res = await PATCH(jsonReq({ task_id: TASK_ID, status: 'completed' }))
    expect(res.status).toBe(200)
    expect(store.onboarding_tasks[0].status).toBe('completed')
    expect(store.onboarding_tasks[0].blocked_reason).toBeNull()
  })

  it('rejects an invalid status', async () => {
    const res = await PATCH(jsonReq({ task_id: TASK_ID, status: 'bogus' }))
    expect(res.status).toBe(400)
  })
})
