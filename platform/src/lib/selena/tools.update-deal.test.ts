/**
 * Selena's `update_deal` tool — two bugs found in the same function.
 *
 * (1) value_dollars wrote to a column named `value`, but deals' dollar-value
 * column is `value_cents` (deals/route.ts, migration 029) -- every AI-driven
 * deal-value update via this tool has errored ("column does not exist")
 * since the tool's beginning.
 *
 * (2) Setting fields.stage to 'sold' through this tool was a raw column
 * flip with none of POST /api/deals/[id]/stage's close-to-Sold side
 * effects: no probability=100, no closed_at (sales-won-tab.tsx's default
 * this-month filter reads it, falling back to a stale last_activity_at when
 * null), no stage_change activity log, and -- the same fulfillment-routing
 * gap items (87)/(92) fixed on the Stripe deposit webhook and the manual
 * Kanban close -- no recurring_schedules series / Booking / Job created at
 * all. A deal Selena closed to Sold looked sold in the pipeline but nothing
 * ever got scheduled.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase, Row } from '@/test/fake-supabase'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabase: fake, supabaseAdmin: fake, __fake: fake }
})

import { supabaseAdmin } from '@/lib/supabase'
import { handleUpdateDeal } from './tools'

const fake = supabaseAdmin as unknown as FakeSupabase

const TENANT_ID = 'tenant-1'
const CLIENT_ID = 'client-1'
const DEAL_ID = 'deal-1'

function baseQuote(overrides: Row): Row {
  return {
    id: 'quote-x',
    tenant_id: TENANT_ID,
    status: 'accepted',
    deal_id: DEAL_ID,
    quote_number: 'Q-1',
    total_cents: 20_000,
    client_id: CLIENT_ID,
    contact_email: null,
    title: 'Service Quote',
    notes: null,
    converted_at: null,
    converted_job_id: null,
    converted_booking_id: null,
    converted_schedule_id: null,
    recurring_type: null,
    fulfillment_type: null,
    created_at: new Date(0).toISOString(),
    ...overrides,
  }
}

beforeEach(() => {
  fake._store.clear()
  fake._seed('clients', [{ id: CLIENT_ID, tenant_id: TENANT_ID, name: 'Client' }])
  fake._seed('deals', [{
    id: DEAL_ID, tenant_id: TENANT_ID, stage: 'pending', value_cents: 20_000, probability: 80, closed_at: null,
  }])
})

describe('handleUpdateDeal value_dollars column', () => {
  it('writes value_dollars to value_cents, not the nonexistent "value" column', async () => {
    const out = JSON.parse(await handleUpdateDeal({ deal_id: DEAL_ID, fields: { value_dollars: 500 } }, TENANT_ID))
    expect(out.error).toBeUndefined()
    expect(out.ok).toBe(true)
    const deal = fake._all('deals').find((d) => d.id === DEAL_ID)
    expect(deal?.value_cents).toBe(50_000)
  })
})

describe('handleUpdateDeal closing to sold mirrors the human close path', () => {
  it('sets probability=100 and closed_at', async () => {
    await handleUpdateDeal({ deal_id: DEAL_ID, fields: { stage: 'sold' } }, TENANT_ID)
    const deal = fake._all('deals').find((d) => d.id === DEAL_ID)
    expect(deal?.probability).toBe(100)
    expect(deal?.closed_at).toBeTruthy()
  })

  it('logs a stage_change activity', async () => {
    await handleUpdateDeal({ deal_id: DEAL_ID, fields: { stage: 'sold' } }, TENANT_ID)
    const activities = fake._all('deal_activities').filter((a) => a.deal_id === DEAL_ID)
    expect(activities.length).toBe(1)
    expect(activities[0].type).toBe('stage_change')
  })

  it('recurring_type set -> creates a recurring_schedules series, NOT a Job', async () => {
    fake._seed('quotes', [baseQuote({ id: 'quote-recurring', recurring_type: 'weekly' })])
    await handleUpdateDeal({ deal_id: DEAL_ID, fields: { stage: 'sold' } }, TENANT_ID)
    expect(fake._all('recurring_schedules').length).toBe(1)
    expect(fake._all('jobs').length).toBe(0)
  })

  it("fulfillment_type 'booking' -> creates a single Booking, NOT a Job", async () => {
    fake._seed('quotes', [baseQuote({ id: 'quote-booking', fulfillment_type: 'booking' })])
    await handleUpdateDeal({ deal_id: DEAL_ID, fields: { stage: 'sold' } }, TENANT_ID)
    expect(fake._all('bookings').length).toBe(1)
    expect(fake._all('jobs').length).toBe(0)
  })

  it('neither recurring_type nor booking fulfillment -> falls through to the Job board', async () => {
    fake._seed('quotes', [baseQuote({ id: 'quote-project' })])
    await handleUpdateDeal({ deal_id: DEAL_ID, fields: { stage: 'sold' } }, TENANT_ID)
    expect(fake._all('jobs').length).toBe(1)
  })

  it('already-sold deal (no-op transition) does not re-trigger fulfillment or activity log', async () => {
    fake._store.clear()
    fake._seed('clients', [{ id: CLIENT_ID, tenant_id: TENANT_ID, name: 'Client' }])
    fake._seed('deals', [{ id: DEAL_ID, tenant_id: TENANT_ID, stage: 'sold', value_cents: 20_000, probability: 100, closed_at: '2026-01-01T00:00:00Z' }])
    fake._seed('quotes', [baseQuote({ id: 'quote-project' })])
    await handleUpdateDeal({ deal_id: DEAL_ID, fields: { stage: 'sold' } }, TENANT_ID)
    expect(fake._all('jobs').length).toBe(0)
    expect(fake._all('deal_activities').length).toBe(0)
  })
})
