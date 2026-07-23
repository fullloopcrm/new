/**
 * provisionApprovedApplicant — approved applicant's photo carries over.
 *
 * BUG (fixed here): ApprovedApplication never declared photo_url, and the
 * team_members insert built from it never included photo_url/avatar_url —
 * every applicant approved through single- or bulk-approve got a team
 * member record with no photo at all, even when their application had one
 * on file (team_applications.photo_url), until they uploaded a fresh one
 * themselves via the team portal or an admin edit.
 */
import { describe, it, expect, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabase: fake, supabaseAdmin: fake, __fake: fake }
})
vi.mock('@/lib/settings', () => ({
  getSettings: async () => ({ default_pay_rate: 0, default_working_days: null }),
}))
vi.mock('@/lib/geo', () => ({ geocodeAddress: async () => null }))
vi.mock('@/lib/email', () => ({ sendEmail: vi.fn(async () => {}) }))

import { supabaseAdmin } from '@/lib/supabase'
import { provisionApprovedApplicant } from './team-provisioning'

const fake = supabaseAdmin as unknown as FakeSupabase
const TENANT_ID = 'tenant-1'

function seedTenant() {
  fake._store.clear()
  fake._seed('tenants', [{ id: TENANT_ID, name: 'Test Co', slug: 'test-co', domain: 'test.example' }])
}

describe('provisionApprovedApplicant', () => {
  it('carries the applicant photo onto the new team_members row', async () => {
    seedTenant()
    await provisionApprovedApplicant(TENANT_ID, {
      id: 'app-1', name: 'New Hire', email: null, phone: '5551234567', address: null,
      photo_url: 'https://cdn.example.com/photos/new-hire.jpg',
    })

    const [member] = fake._all('team_members')
    expect(member).toBeDefined()
    expect(member.photo_url).toBe('https://cdn.example.com/photos/new-hire.jpg')
    expect(member.avatar_url).toBe('https://cdn.example.com/photos/new-hire.jpg')
  })

  it('still provisions cleanly when the application has no photo', async () => {
    seedTenant()
    await provisionApprovedApplicant(TENANT_ID, {
      id: 'app-2', name: 'No Photo', email: null, phone: '5559876543', address: null,
    })

    const [member] = fake._all('team_members')
    expect(member).toBeDefined()
    expect(member.photo_url).toBeUndefined()
    expect(member.avatar_url).toBeUndefined()
  })
})
