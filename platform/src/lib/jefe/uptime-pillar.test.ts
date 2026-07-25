/**
 * Jefe's `uptime` pillar reads Fortress's existing tenant_health results —
 * it must NOT re-run any checks itself, and must correctly separate "down
 * right now" (status='fail') from "cert expiring soon" (checks.sslExpiry),
 * since those get treated very differently (see agent.ts: Fortress already
 * alerts on the first directly; Jefe doesn't duplicate that alert).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { FakeSupabase, Row } from '@/test/fake-supabase'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabase: fake, supabaseAdmin: fake, __fake: fake }
})

import { supabaseAdmin } from '@/lib/supabase'
import { getPlatformHealth } from './health'

const fake = supabaseAdmin as unknown as FakeSupabase

function seedEmptyBaseline() {
  fake._store.clear()
  for (const table of ['tenants', 'notifications', 'inquiries', 'prospects', 'security_events', 'error_logs', 'bookings', 'email_logs']) {
    fake._seed(table, [])
  }
}

function seedTenantHealth(rows: Row[]) {
  fake._seed('tenant_health', rows)
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getPlatformHealth — uptime pillar', () => {
  it('separates a down tenant from a merely-expiring-cert tenant', async () => {
    seedEmptyBaseline()
    seedTenantHealth([
      {
        slug: 'the-florida-maid',
        domain: 'thefloridamaid.com',
        status: 'fail',
        checks: { reachable: false, routing: true, noLoop: true, formWired: true, sslExpiry: { daysRemaining: 200, detail: 'expires in 200d' } },
        detail: 'homepage 502',
        checked_at: '2026-07-25T19:45:00.000Z',
      },
      {
        slug: 'we-pay-you-junk',
        domain: 'wepayyoujunk.com',
        status: 'pass',
        checks: { reachable: true, routing: true, noLoop: true, formWired: true, sslExpiry: { daysRemaining: 9, detail: 'certificate expires in 9d' } },
        detail: 'ok',
        checked_at: '2026-07-25T19:44:00.000Z',
      },
      {
        slug: 'nyc-tow',
        domain: 'nyctow.com',
        status: 'pass',
        checks: { reachable: true, routing: true, noLoop: true, formWired: true, sslExpiry: { daysRemaining: 300, detail: 'expires in 300d' } },
        detail: 'ok',
        checked_at: '2026-07-25T19:43:00.000Z',
      },
    ])

    const health = await getPlatformHealth(new Date('2026-07-25T20:00:00.000Z'))

    expect(health.uptime.failing).toEqual([{ tenant_name: 'the-florida-maid', domain: 'thefloridamaid.com', detail: 'homepage 502' }])
    expect(health.uptime.expiring_certs).toEqual([
      { tenant_name: 'we-pay-you-junk', domain: 'wepayyoujunk.com', days_remaining: 9, detail: 'certificate expires in 9d' },
    ])
    // The Florida Maid is down but its cert has 200d left — must NOT also show up as expiring.
    expect(health.uptime.expiring_certs.find((c) => c.tenant_name === 'the-florida-maid')).toBeUndefined()
    expect(health.uptime.checked_at).toBe('2026-07-25T19:45:00.000Z') // most recent of the three
  })

  it('reports clean uptime when every tenant passes and no cert is close to expiry', async () => {
    seedEmptyBaseline()
    seedTenantHealth([
      { slug: 'nyc-tow', domain: 'nyctow.com', status: 'pass', checks: { reachable: true, routing: true, noLoop: true, formWired: true, sslExpiry: { daysRemaining: 300, detail: 'expires in 300d' } }, detail: 'ok', checked_at: '2026-07-25T19:00:00.000Z' },
    ])

    const health = await getPlatformHealth(new Date('2026-07-25T20:00:00.000Z'))

    expect(health.uptime.failing).toEqual([])
    expect(health.uptime.expiring_certs).toEqual([])
  })
})
