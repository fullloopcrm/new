import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * deal_activities carries a NOT NULL ON DELETE CASCADE to deals (migration
 * 011) -- deleting a deal silently wipes its entire activity/audit trail.
 * quotes.deal_id is ON DELETE SET NULL by design so the quote itself
 * survives, but that just means a converted/paid quote quietly loses its
 * only link to the deal it closed. This guard must block deletion whenever
 * the deal is Sold or has a linked quote with real accept/deposit/
 * conversion history, and allow it for a deal that never went anywhere.
 */

const TENANT = 'tenant-a'
const DEAL = 'deal-1'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake, __fake: fake }
})

import { supabaseAdmin } from '@/lib/supabase'
import { checkDealDeletable } from './deal-delete-guard'

const fake = supabaseAdmin as unknown as FakeSupabase

beforeEach(() => {
  fake._store.clear()
  fake._seed('deals', [{ id: DEAL, tenant_id: TENANT, stage: 'lead' }])
})

describe('checkDealDeletable', () => {
  it('allows deletion of a deal that never closed and has no quote history', async () => {
    const result = await checkDealDeletable(TENANT, DEAL)
    expect(result.deletable).toBe(true)
  })

  it('blocks deletion when the deal stage is sold', async () => {
    fake._store.set('deals', [{ id: DEAL, tenant_id: TENANT, stage: 'sold' }])
    const result = await checkDealDeletable(TENANT, DEAL)
    expect(result.deletable).toBe(false)
    expect(result.reason).toMatch(/sold/i)
  })

  it('blocks deletion when a linked quote was accepted', async () => {
    fake._seed('quotes', [{ id: 'q-1', tenant_id: TENANT, deal_id: DEAL, status: 'accepted', deposit_paid_at: null, converted_job_id: null }])
    const result = await checkDealDeletable(TENANT, DEAL)
    expect(result.deletable).toBe(false)
    expect(result.reason).toMatch(/quote/i)
  })

  it('blocks deletion when a linked quote has a paid deposit', async () => {
    fake._seed('quotes', [{ id: 'q-1', tenant_id: TENANT, deal_id: DEAL, status: 'sent', deposit_paid_at: '2026-06-01T00:00:00Z', converted_job_id: null }])
    const result = await checkDealDeletable(TENANT, DEAL)
    expect(result.deletable).toBe(false)
    expect(result.reason).toMatch(/quote/i)
  })

  it('blocks deletion when a linked quote already converted to a job', async () => {
    fake._seed('quotes', [{ id: 'q-1', tenant_id: TENANT, deal_id: DEAL, status: 'converted', deposit_paid_at: null, converted_job_id: 'job-1' }])
    const result = await checkDealDeletable(TENANT, DEAL)
    expect(result.deletable).toBe(false)
    expect(result.reason).toMatch(/quote/i)
  })

  it('does not block on a draft/sent/declined quote with no real conversion signal', async () => {
    fake._seed('quotes', [
      { id: 'q-1', tenant_id: TENANT, deal_id: DEAL, status: 'draft', deposit_paid_at: null, converted_job_id: null },
      { id: 'q-2', tenant_id: TENANT, deal_id: DEAL, status: 'declined', deposit_paid_at: null, converted_job_id: null },
    ])
    const result = await checkDealDeletable(TENANT, DEAL)
    expect(result.deletable).toBe(true)
  })

  it('does not block on a DIFFERENT deal or tenant\'s quote history', async () => {
    fake._seed('quotes', [{ id: 'q-1', tenant_id: TENANT, deal_id: 'some-other-deal', status: 'accepted', deposit_paid_at: null, converted_job_id: null }])
    fake._seed('deals', [{ id: 'deal-other-tenant', tenant_id: 'other-tenant', stage: 'sold' }])
    const result = await checkDealDeletable(TENANT, DEAL)
    expect(result.deletable).toBe(true)
  })
})
