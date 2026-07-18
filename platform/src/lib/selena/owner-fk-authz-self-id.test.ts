import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

/**
 * W4 — false-success-on-foreign-id guard, extended to self-id mutations.
 *
 * owner-fk-authz.test.ts locked down the class where a tool writes a
 * REFERENCED id (client_id/cleaner_id) verbatim into another row. This file
 * covers the sibling class: tools that mutate a row BY ITS OWN id
 * (payout_id, client_id, cleaner_id, schedule_id, deal_id, notification_id,
 * application_id) where the update's `.eq('id', x).eq('tenant_id', tid)`
 * silently matches zero rows for a foreign-tenant id — Supabase returns no
 * error, so the handler would report ok:true while mutating nothing. Each
 * handler below now checks the row resolves inside the caller's tenant
 * before mutating, mirroring assign_cleaner_to_booking's existing
 * booking_id check.
 */

type Eqs = Record<string, unknown>
type Resolved = { data: unknown; error: unknown }

let selectResolver: (table: string, eqs: Eqs) => Resolved
let updateCalls: Array<{ table: string; values: Record<string, unknown>; eqs: Eqs }>

function builder(table: string) {
  const eqs: Eqs = {}
  let updateValues: Record<string, unknown> | null = null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chain: any = {
    select: () => chain,
    update: (values: Record<string, unknown>) => {
      updateValues = values
      return chain
    },
    insert: () => chain,
    eq: (col: string, val: unknown) => {
      eqs[col] = val
      return chain
    },
    ilike: (col: string, val: unknown) => {
      eqs[col] = val
      return chain
    },
    is: (col: string, val: unknown) => {
      eqs[col] = val
      return chain
    },
    order: () => chain,
    limit: () => chain,
    single: async () => selectResolver(table, eqs),
    maybeSingle: async () => selectResolver(table, eqs),
    then: (onF: (v: Resolved) => unknown, onR?: (e: unknown) => unknown) => {
      if (updateValues !== null) {
        updateCalls.push({ table, values: updateValues, eqs: { ...eqs } })
      }
      return Promise.resolve({ data: null, error: null }).then(onF, onR)
    },
  }
  return chain
}

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ from: (table: string) => builder(table) }),
}))

import { runTool } from '@/lib/selena/tools'
import { type YinezResult } from '@/lib/selena/agent'

const TENANT_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const OWNER_PHONE = '212-555-1111'

const OWN_ID = 'row-A'
const FOREIGN_ID = 'row-B'

const agentResult = (): YinezResult => ({ text: '', toolsCalled: [] })

function baseResolver(table: string, eqs: Eqs): Resolved {
  if (table === 'tenants') return { data: { owner_phone: OWNER_PHONE }, error: null }
  // Every row-scoped table used below follows the same shape: only OWN_ID
  // resolves, and only inside TENANT_A.
  if (['cleaner_payouts', 'clients', 'cleaners', 'recurring_schedules', 'deals', 'notifications', 'cleaner_applications'].includes(table)) {
    return eqs.id === OWN_ID && eqs.tenant_id === TENANT_A
      ? { data: { id: OWN_ID, notes: null }, error: null }
      : { data: null, error: null }
  }
  return { data: null, error: null }
}

beforeEach(() => {
  updateCalls = []
  selectResolver = baseResolver
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('mark_payout_paid — self-id tenant-ownership', () => {
  it('REJECTS a payout_id from another tenant (no update)', async () => {
    const out = await runTool('mark_payout_paid', { payout_id: FOREIGN_ID }, 'convo', OWNER_PHONE, agentResult(), TENANT_A)
    expect(JSON.parse(out).error).toBe('payout not found')
    expect(updateCalls).toHaveLength(0)
  })

  it('ALLOWS an own-tenant payout_id (updated, tenant-scoped)', async () => {
    const out = await runTool('mark_payout_paid', { payout_id: OWN_ID }, 'convo', OWNER_PHONE, agentResult(), TENANT_A)
    expect(JSON.parse(out).ok).toBe(true)
    expect(updateCalls).toHaveLength(1)
    expect(updateCalls[0].eqs.id).toBe(OWN_ID)
    expect(updateCalls[0].eqs.tenant_id).toBe(TENANT_A)
  })
})

describe('block_client — self-id tenant-ownership', () => {
  it('REJECTS a client_id from another tenant (no update)', async () => {
    const out = await runTool('block_client', { client_id: FOREIGN_ID, reason: 'test' }, 'convo', OWNER_PHONE, agentResult(), TENANT_A)
    expect(JSON.parse(out).error).toBe('client not found')
    expect(updateCalls).toHaveLength(0)
  })

  it('ALLOWS an own-tenant client_id (updated, tenant-scoped)', async () => {
    const out = await runTool('block_client', { client_id: OWN_ID, reason: 'test' }, 'convo', OWNER_PHONE, agentResult(), TENANT_A)
    expect(JSON.parse(out).ok).toBe(true)
    expect(updateCalls).toHaveLength(1)
    expect(updateCalls[0].eqs.id).toBe(OWN_ID)
    expect(updateCalls[0].eqs.tenant_id).toBe(TENANT_A)
  })
})

describe('update_cleaner / deactivate_cleaner — self-id tenant-ownership', () => {
  it('update_cleaner REJECTS a foreign cleaner_id (no update)', async () => {
    const out = await runTool('update_cleaner', { cleaner_id: FOREIGN_ID, fields: { name: 'x' } }, 'convo', OWNER_PHONE, agentResult(), TENANT_A)
    expect(JSON.parse(out).error).toBe('cleaner not found')
    expect(updateCalls).toHaveLength(0)
  })

  it('update_cleaner ALLOWS an own-tenant cleaner_id', async () => {
    const out = await runTool('update_cleaner', { cleaner_id: OWN_ID, fields: { name: 'x' } }, 'convo', OWNER_PHONE, agentResult(), TENANT_A)
    expect(JSON.parse(out).ok).toBe(true)
    expect(updateCalls).toHaveLength(1)
  })

  it('deactivate_cleaner REJECTS a foreign cleaner_id (no update)', async () => {
    const out = await runTool('deactivate_cleaner', { cleaner_id: FOREIGN_ID }, 'convo', OWNER_PHONE, agentResult(), TENANT_A)
    expect(JSON.parse(out).error).toBe('cleaner not found')
    expect(updateCalls).toHaveLength(0)
  })

  it('deactivate_cleaner ALLOWS an own-tenant cleaner_id', async () => {
    const out = await runTool('deactivate_cleaner', { cleaner_id: OWN_ID }, 'convo', OWNER_PHONE, agentResult(), TENANT_A)
    expect(JSON.parse(out).ok).toBe(true)
    expect(updateCalls).toHaveLength(1)
  })
})

describe('pause_recurring / resume_recurring / cancel_recurring — self-id tenant-ownership', () => {
  it('pause_recurring REJECTS a foreign schedule_id (no update)', async () => {
    const out = await runTool('pause_recurring', { schedule_id: FOREIGN_ID }, 'convo', OWNER_PHONE, agentResult(), TENANT_A)
    expect(JSON.parse(out).error).toBe('schedule not found')
    expect(updateCalls).toHaveLength(0)
  })

  it('pause_recurring ALLOWS an own-tenant schedule_id', async () => {
    const out = await runTool('pause_recurring', { schedule_id: OWN_ID }, 'convo', OWNER_PHONE, agentResult(), TENANT_A)
    expect(JSON.parse(out).ok).toBe(true)
    expect(updateCalls).toHaveLength(1)
  })

  it('resume_recurring REJECTS a foreign schedule_id (no update)', async () => {
    const out = await runTool('resume_recurring', { schedule_id: FOREIGN_ID }, 'convo', OWNER_PHONE, agentResult(), TENANT_A)
    expect(JSON.parse(out).error).toBe('schedule not found')
    expect(updateCalls).toHaveLength(0)
  })

  it('cancel_recurring REJECTS a foreign schedule_id (no update)', async () => {
    const out = await runTool('cancel_recurring', { schedule_id: FOREIGN_ID }, 'convo', OWNER_PHONE, agentResult(), TENANT_A)
    expect(JSON.parse(out).error).toBe('schedule not found')
    expect(updateCalls).toHaveLength(0)
  })
})

describe('update_deal — self-id tenant-ownership', () => {
  it('REJECTS a foreign deal_id (no update)', async () => {
    const out = await runTool('update_deal', { deal_id: FOREIGN_ID, fields: { stage: 'won' } }, 'convo', OWNER_PHONE, agentResult(), TENANT_A)
    expect(JSON.parse(out).error).toBe('deal not found')
    expect(updateCalls).toHaveLength(0)
  })

  it('ALLOWS an own-tenant deal_id', async () => {
    const out = await runTool('update_deal', { deal_id: OWN_ID, fields: { stage: 'won' } }, 'convo', OWNER_PHONE, agentResult(), TENANT_A)
    expect(JSON.parse(out).ok).toBe(true)
    expect(updateCalls).toHaveLength(1)
  })
})

describe('mark_notification_read — self-id tenant-ownership', () => {
  it('REJECTS a foreign notification_id (no update)', async () => {
    const out = await runTool('mark_notification_read', { notification_id: FOREIGN_ID }, 'convo', OWNER_PHONE, agentResult(), TENANT_A)
    expect(JSON.parse(out).error).toBe('notification not found')
    expect(updateCalls).toHaveLength(0)
  })

  it('ALLOWS an own-tenant notification_id', async () => {
    const out = await runTool('mark_notification_read', { notification_id: OWN_ID }, 'convo', OWNER_PHONE, agentResult(), TENANT_A)
    expect(JSON.parse(out).ok).toBe(true)
    expect(updateCalls).toHaveLength(1)
  })
})

describe('reject_cleaner_application — self-id tenant-ownership', () => {
  it('REJECTS a foreign application_id (no update)', async () => {
    const out = await runTool('reject_cleaner_application', { application_id: FOREIGN_ID }, 'convo', OWNER_PHONE, agentResult(), TENANT_A)
    expect(JSON.parse(out).error).toBe('application not found')
    expect(updateCalls).toHaveLength(0)
  })

  it('ALLOWS an own-tenant application_id', async () => {
    const out = await runTool('reject_cleaner_application', { application_id: OWN_ID }, 'convo', OWNER_PHONE, agentResult(), TENANT_A)
    expect(JSON.parse(out).ok).toBe(true)
    expect(updateCalls).toHaveLength(1)
  })
})
