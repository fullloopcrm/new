import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * job_payments.status's declared 'void' value (CHECK constraint in
 * 2026_07_02_jobs_projects.sql, and already accepted by the PATCH
 * /api/jobs/[id]/payments VALID array) was fully wired end to end at the
 * data layer — but zero call site anywhere in the app ever sent it. Item
 * (142) wires a manual "Void" button; item (143) wires the real, existing
 * trigger this codebase already has for it: cancelling a job (unlike (141)'s
 * 'started', which had no natural actor and was deliberately left unbuilt).
 * These tests lock in both paths.
 */

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  return { supabaseAdmin: createFakeSupabase() }
})

const TENANT = 'tenant-A'
vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: TENANT }, error: null }),
}))

import { supabaseAdmin } from '@/lib/supabase'
import { PATCH as jobPATCH } from './route'
import { PATCH as paymentsPATCH } from './payments/route'

const fake = supabaseAdmin as unknown as FakeSupabase
const JOB_ID = 'job-1'

function params() {
  return { params: Promise.resolve({ id: JOB_ID }) }
}

beforeEach(() => {
  fake._store.clear()
  fake._seed('jobs', [{ id: JOB_ID, tenant_id: TENANT, status: 'scheduled', total_cents: 50000 }])
  fake._seed('job_payments', [
    { id: 'pay-pending', tenant_id: TENANT, job_id: JOB_ID, label: 'Deposit', trigger: 'manual', status: 'pending', amount_cents: 10000 },
    { id: 'pay-invoiced', tenant_id: TENANT, job_id: JOB_ID, label: 'Progress', trigger: 'manual', status: 'invoiced', amount_cents: 20000 },
    { id: 'pay-paid', tenant_id: TENANT, job_id: JOB_ID, label: 'Final', trigger: 'manual', status: 'paid', amount_cents: 20000 },
  ])
})

describe('PATCH /api/jobs/[id]/payments — manual void (142)', () => {
  it('flips a pending payment to void', async () => {
    const res = await paymentsPATCH(
      new Request('http://x', { method: 'PATCH', body: JSON.stringify({ payment_id: 'pay-pending', status: 'void' }) }),
      params(),
    )
    expect(res.status).toBe(200)
    expect(fake._all('job_payments').find((p) => p.id === 'pay-pending')?.status).toBe('void')
  })
})

describe('PATCH /api/jobs/[id] status:cancelled — auto-void remaining payments (143)', () => {
  it('voids pending and invoiced payments, leaves paid ones untouched', async () => {
    const res = await jobPATCH(
      new Request('http://x', { method: 'PATCH', body: JSON.stringify({ status: 'cancelled' }) }),
      params(),
    )
    expect(res.status).toBe(200)

    const rows = fake._all('job_payments')
    expect(rows.find((p) => p.id === 'pay-pending')?.status).toBe('void')
    expect(rows.find((p) => p.id === 'pay-invoiced')?.status).toBe('void')
    expect(rows.find((p) => p.id === 'pay-paid')?.status).toBe('paid')
  })

  it('logs a payment_voided event per voided payment', async () => {
    await jobPATCH(
      new Request('http://x', { method: 'PATCH', body: JSON.stringify({ status: 'cancelled' }) }),
      params(),
    )
    const events = fake._all('job_events').filter((e) => e.event_type === 'payment_voided')
    expect(events.length).toBe(2)
  })

  it('does not touch payments on a non-cancel status change', async () => {
    const res = await jobPATCH(
      new Request('http://x', { method: 'PATCH', body: JSON.stringify({ status: 'in_progress' }) }),
      params(),
    )
    expect(res.status).toBe(200)
    const rows = fake._all('job_payments')
    expect(rows.find((p) => p.id === 'pay-pending')?.status).toBe('pending')
    expect(rows.find((p) => p.id === 'pay-invoiced')?.status).toBe('invoiced')
  })
})
