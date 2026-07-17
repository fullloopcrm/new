import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * payroll_payments, team_member_payouts, hr_documents, and hr_notes all carry
 * ON DELETE CASCADE (or, for payouts, a plain FK that would 500) to
 * team_members. A hard delete with no guard silently destroys real paid-payroll
 * records and filed HR compliance documents. This guard must block deletion
 * whenever any of that history exists, and allow it when the team member is
 * genuinely clean (never paid, no docs/notes on file).
 */

const TENANT = 'tenant-a'
const MEMBER = 'member-1'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake, __fake: fake }
})

import { supabaseAdmin } from '@/lib/supabase'
import { checkTeamMemberDeletable } from './team-member-delete-guard'

const fake = supabaseAdmin as unknown as FakeSupabase

beforeEach(() => {
  fake._store.clear()
})

describe('checkTeamMemberDeletable', () => {
  it('allows deletion when the team member has no payroll, payout, doc, or note history', async () => {
    const result = await checkTeamMemberDeletable(TENANT, MEMBER)
    expect(result.deletable).toBe(true)
  })

  it('blocks deletion when payroll_payments has a row for this member', async () => {
    fake._seed('payroll_payments', [{ id: 'pp-1', tenant_id: TENANT, team_member_id: MEMBER, amount: 5000 }])
    const result = await checkTeamMemberDeletable(TENANT, MEMBER)
    expect(result.deletable).toBe(false)
    expect(result.reason).toMatch(/payroll|payout/i)
  })

  it('blocks deletion when team_member_payouts has a row for this member', async () => {
    fake._seed('team_member_payouts', [{ id: 'tp-1', tenant_id: TENANT, team_member_id: MEMBER, amount_cents: 5000 }])
    const result = await checkTeamMemberDeletable(TENANT, MEMBER)
    expect(result.deletable).toBe(false)
    expect(result.reason).toMatch(/payroll|payout/i)
  })

  it('blocks deletion when hr_documents has a row for this member', async () => {
    fake._seed('hr_documents', [{ id: 'hd-1', tenant_id: TENANT, team_member_id: MEMBER, doc_type: 'w9', status: 'submitted' }])
    const result = await checkTeamMemberDeletable(TENANT, MEMBER)
    expect(result.deletable).toBe(false)
    expect(result.reason).toMatch(/document|compliance/i)
  })

  it('blocks deletion when hr_notes has a row for this member', async () => {
    fake._seed('hr_notes', [{ id: 'hn-1', tenant_id: TENANT, team_member_id: MEMBER, kind: 'writeup', body: 'late 3x' }])
    const result = await checkTeamMemberDeletable(TENANT, MEMBER)
    expect(result.deletable).toBe(false)
    expect(result.reason).toMatch(/note|compliance/i)
  })

  it('does not block on a DIFFERENT team member or tenant\'s history', async () => {
    fake._seed('payroll_payments', [{ id: 'pp-1', tenant_id: TENANT, team_member_id: 'someone-else', amount: 5000 }])
    fake._seed('hr_documents', [{ id: 'hd-1', tenant_id: 'other-tenant', team_member_id: MEMBER, doc_type: 'w9', status: 'submitted' }])
    const result = await checkTeamMemberDeletable(TENANT, MEMBER)
    expect(result.deletable).toBe(true)
  })

  it('allows deletion when hr_employee_profiles only has HR-default values', async () => {
    fake._seed('hr_employee_profiles', [{
      id: 'hp-1', tenant_id: TENANT, team_member_id: MEMBER,
      employment_type: 'contractor_1099', comp_type: 'per_job', hr_status: 'active',
      hire_date: null, termination_date: null, title: null, department: null,
      pay_rate_cents: null, emergency_contact_name: null, emergency_contact_phone: null,
      date_of_birth: null,
    }])
    const result = await checkTeamMemberDeletable(TENANT, MEMBER)
    expect(result.deletable).toBe(true)
  })

  it('blocks deletion when hr_employee_profiles has a real hire_date on file', async () => {
    fake._seed('hr_employee_profiles', [{
      id: 'hp-1', tenant_id: TENANT, team_member_id: MEMBER,
      employment_type: 'contractor_1099', comp_type: 'per_job', hr_status: 'active',
      hire_date: '2026-01-15', termination_date: null, title: null, department: null,
      pay_rate_cents: null, emergency_contact_name: null, emergency_contact_phone: null,
      date_of_birth: null,
    }])
    const result = await checkTeamMemberDeletable(TENANT, MEMBER)
    expect(result.deletable).toBe(false)
    expect(result.reason).toMatch(/profile/i)
  })

  it('blocks deletion when hr_employee_profiles has a non-default hr_status (e.g. terminated)', async () => {
    fake._seed('hr_employee_profiles', [{
      id: 'hp-1', tenant_id: TENANT, team_member_id: MEMBER,
      employment_type: 'contractor_1099', comp_type: 'per_job', hr_status: 'terminated',
      hire_date: null, termination_date: '2026-06-01', title: null, department: null,
      pay_rate_cents: null, emergency_contact_name: null, emergency_contact_phone: null,
      date_of_birth: null,
    }])
    const result = await checkTeamMemberDeletable(TENANT, MEMBER)
    expect(result.deletable).toBe(false)
    expect(result.reason).toMatch(/profile/i)
  })
})
