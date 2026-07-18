import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * createTenantFromLead — owner-PIN provisioning masked-error gap.
 *
 * BUG (fixed here): the tenant_members insert that creates the owner's login
 * PIN was wrapped in try/catch, but supabase-js resolves DB errors (RLS deny,
 * constraint violation) into the call's returned `error` field rather than
 * throwing — so that catch never fired on a genuine DB failure. `ownerPin`
 * stayed set to a real-looking 6-digit string with NO matching tenant_members
 * row, and the function still returned `{ ok: true, ownerPin }` as if
 * provisioning succeeded. The one caller that surfaces this to a human
 * (admin/sales/LeadsPanel.tsx) displays exactly that dead PIN for the admin
 * to relay to the tenant owner, who could never log in with it — silently,
 * with zero error surfaced anywhere.
 */

const LEAD = {
  id: 'lead_1',
  business_name: 'Acme Cleaning',
  contact_name: 'Jane Owner',
  email: 'jane@acme.example',
  service_category: 'residential_cleaning',
  converted_tenant_id: null,
  territory_id: null,
  category_id: null,
  billing_zip: '10001',
  proposal_admins: 1,
  proposal_team_members: 0,
}

const TENANT = { id: 'tenant_1', slug: 'acme-cleaning', name: 'Acme Cleaning', status: 'pending' }

const holder = vi.hoisted(() => ({
  memberInsertError: null as { message: string } | null,
  memberInsertRows: [] as Record<string, unknown>[],
}))

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === 'partner_requests') {
        return {
          select: () => ({ eq: () => ({ single: async () => ({ data: LEAD, error: null }) }) }),
          update: () => ({ eq: async () => ({ data: null, error: null }) }),
        }
      }
      if (table === 'tenants') {
        return {
          select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }),
          insert: () => ({
            select: () => ({ single: async () => ({ data: TENANT, error: null }) }),
          }),
        }
      }
      if (table === 'territory_claims') {
        throw new Error('territory_claims should not be touched — LEAD has no territory_id/category_id')
      }
      if (table === 'crm_notes') {
        return {
          select: () => ({ eq: () => ({ eq: async () => ({ data: [], error: null }) }) }),
          insert: async () => ({ data: null, error: null }),
        }
      }
      if (table === 'tenant_members') {
        return {
          insert: (row: Record<string, unknown>) => {
            holder.memberInsertRows.push(row)
            return Promise.resolve({ data: null, error: holder.memberInsertError })
          },
        }
      }
      throw new Error(`unexpected table ${table}`)
    },
  },
}))

vi.mock('@/lib/provision-tenant', () => ({
  provisionTenant: vi.fn(async () => ({ ok: true })),
  mapIndustry: () => 'cleaning',
}))

vi.mock('@/lib/onboarding-tasks', () => ({
  seedOnboardingTasks: vi.fn(async () => {}),
}))

vi.mock('@/lib/admin-pin', () => ({
  hashAdminPin: (pin: string) => `hashed:${pin}`,
}))

import { createTenantFromLead } from './create-tenant-from-lead'

beforeEach(() => {
  holder.memberInsertError = null
  holder.memberInsertRows = []
})

describe('createTenantFromLead — owner-PIN insert must not report a dead PIN as a working one', () => {
  it('returns a real ownerPin when the tenant_members insert succeeds', async () => {
    const result = await createTenantFromLead('lead_1')

    expect(result.ok).toBe(true)
    expect(result.ownerPin).toMatch(/^\d{6}$/)
    expect(holder.memberInsertRows).toHaveLength(1)
  })

  // MASKED-ERROR PROBE: a genuine DB failure on the tenant_members insert
  // must null out ownerPin (and log), not leave a plaintext PIN with no
  // backing row for the admin to hand to the owner as if it works.
  it('MASKED-ERROR PROBE: nulls ownerPin on a genuine tenant_members insert failure instead of returning a dead PIN', async () => {
    holder.memberInsertError = { message: 'connection reset' }

    const result = await createTenantFromLead('lead_1')

    expect(result.ok).toBe(true)
    expect(result.tenant?.id).toBe('tenant_1')
    expect(result.ownerPin).toBeNull()
  })
})
