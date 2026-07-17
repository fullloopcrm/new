/**
 * hr_status ('active'|'on_leave'|'terminated') lives on hr_employee_profiles
 * and is read only by the HR pages. Every operational gate — team-portal PIN
 * login, urgent-job broadcast — checks team_members.status instead, and
 * nothing kept the two in sync: marking someone 'terminated' in HR left them
 * fully able to log into the team portal and get broadcast new jobs. PATCH
 * now flips team_members.status to 'inactive' whenever hr_status becomes
 * 'terminated', one-way only (reactivating from 'terminated' does not
 * auto-flip status back).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import type { FakeSupabase } from '@/test/fake-supabase'

const TENANT_A = 'tenant-a'
const MEMBER_ID = 'member-1'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})

vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: TENANT_A }, error: null }),
}))

import { supabaseAdmin } from '@/lib/supabase'
import { PATCH } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase
const patchReq = (body: unknown) => new NextRequest('http://x', { method: 'PATCH', body: JSON.stringify(body) })
const params = Promise.resolve({ id: MEMBER_ID })

beforeEach(() => {
  fake._store.clear()
  fake._seed('team_members', [{ id: MEMBER_ID, tenant_id: TENANT_A, status: 'active' }])
})

async function currentStatus(): Promise<unknown> {
  const { data } = await fake.from('team_members').select('*').eq('id', MEMBER_ID).single()
  return (data as { status: unknown } | null)?.status
}

describe('PATCH /api/dashboard/hr/[id] — hr_status/team_members.status sync', () => {
  it('flips team_members.status to inactive when hr_status becomes terminated', async () => {
    const res = await PATCH(patchReq({ hr_status: 'terminated' }), { params })
    expect(res.status).toBe(200)
    expect(await currentStatus()).toBe('inactive')
  })

  it('does not touch team_members.status for a non-terminated hr_status', async () => {
    const res = await PATCH(patchReq({ hr_status: 'on_leave' }), { params })
    expect(res.status).toBe(200)
    expect(await currentStatus()).toBe('active')
  })

  it('does not touch team_members.status when hr_status is not part of the patch', async () => {
    const res = await PATCH(patchReq({ title: 'Lead Cleaner' }), { params })
    expect(res.status).toBe(200)
    expect(await currentStatus()).toBe('active')
  })

  it('does not reactivate team_members.status when hr_status moves off terminated', async () => {
    fake._store.clear()
    fake._seed('team_members', [{ id: MEMBER_ID, tenant_id: TENANT_A, status: 'inactive' }])
    const res = await PATCH(patchReq({ hr_status: 'active' }), { params })
    expect(res.status).toBe(200)
    expect(await currentStatus()).toBe('inactive')
  })
})
