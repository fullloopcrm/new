import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * acceptInviteForAdmin — invite-recipient identity binding.
 *
 * BUG (fixed here): the /join pages granted `tenant_members` access — often
 * role:'owner' — to whichever `admin_session` happened to be active in the
 * browser when a valid invite token was opened, with NO check that the
 * signed-in identity's own email matched `tenant_invites.email`. Since
 * `admin_users` accounts are a shared identity pool (not per-tenant), any
 * signed-in admin who obtained a leaked/forwarded invite token for a tenant
 * they were never invited to could silently become that tenant's owner —
 * and `getCurrentTenant()` (tenant.ts) trusts exactly this `tenant_members`
 * row for dashboard access on the next visit. WRONG-TENANT PROBE: an admin
 * whose email doesn't match the invite must be rejected before any
 * `tenant_members` row is written or the invite is marked accepted.
 */

const TENANT_INVITE = {
  id: 'invite_1',
  tenant_id: 'tenant_victim',
  email: 'owner@victim-biz.com',
  role: 'owner',
  accepted: false,
  expires_at: '2099-01-01T00:00:00.000Z',
}

const holder = vi.hoisted(() => ({
  tenantMembersInserted: [] as Record<string, unknown>[],
  inviteMarkedAcceptedId: null as string | null,
  tenantActivated: null as string | null,
  existingMember: null as { id: string } | null,
}))

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === 'tenant_members') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                single: async () => ({ data: holder.existingMember, error: null }),
              }),
            }),
          }),
          insert: (row: Record<string, unknown>) => {
            holder.tenantMembersInserted.push(row)
            return { then: (resolve: (v: unknown) => void) => resolve({ data: null, error: null }) }
          },
        }
      }
      if (table === 'tenant_invites') {
        return {
          update: (_fields: Record<string, unknown>) => ({
            eq: (_col: string, id: string) => {
              holder.inviteMarkedAcceptedId = id
              return { then: (resolve: (v: unknown) => void) => resolve({ data: null, error: null }) }
            },
          }),
        }
      }
      if (table === 'tenants') {
        return {
          update: (_fields: Record<string, unknown>) => ({
            eq: (_col: string, id: string) => ({
              eq: () => {
                holder.tenantActivated = id
                return { then: (resolve: (v: unknown) => void) => resolve({ data: null, error: null }) }
              },
            }),
          }),
        }
      }
      throw new Error(`unexpected table ${table}`)
    },
  },
}))

vi.mock('@/lib/security', () => ({
  logSecurityEvent: vi.fn(async () => {}),
}))

import { acceptInviteForAdmin } from './accept-invite'

beforeEach(() => {
  holder.tenantMembersInserted = []
  holder.inviteMarkedAcceptedId = null
  holder.tenantActivated = null
  holder.existingMember = null
})

describe('acceptInviteForAdmin — signed-in identity must match the invite', () => {
  it('WRONG-TENANT PROBE: rejects a signed-in admin whose email does not match the invite, and writes nothing', async () => {
    const attacker = { id: 'admin_attacker', email: 'staff@some-other-biz.com' }

    const result = await acceptInviteForAdmin(TENANT_INVITE, attacker)

    expect(result.status).toBe('email_mismatch')
    expect(holder.tenantMembersInserted).toHaveLength(0)
    expect(holder.inviteMarkedAcceptedId).toBeNull()
    expect(holder.tenantActivated).toBeNull()
  })

  it('rejects a legacy PIN session (no real email) rather than matching it to any invite', async () => {
    const legacy = { id: 'legacy', email: '' }

    const result = await acceptInviteForAdmin(TENANT_INVITE, legacy)

    expect(result.status).toBe('email_mismatch')
    expect(holder.tenantMembersInserted).toHaveLength(0)
  })

  it('accepts and grants membership when the signed-in email matches the invite (case-insensitive)', async () => {
    const recipient = { id: 'admin_recipient', email: 'Owner@Victim-Biz.com' }

    const result = await acceptInviteForAdmin(TENANT_INVITE, recipient)

    expect(result.status).toBe('accepted')
    if (result.status === 'accepted') expect(result.tenantId).toBe('tenant_victim')
    expect(holder.tenantMembersInserted).toEqual([
      { tenant_id: 'tenant_victim', clerk_user_id: 'admin_recipient', role: 'owner' },
    ])
    expect(holder.inviteMarkedAcceptedId).toBe('invite_1')
    expect(holder.tenantActivated).toBe('tenant_victim')
  })

  it('does not insert a duplicate tenant_members row if the matching identity is already a member', async () => {
    holder.existingMember = { id: 'existing_member' }
    const recipient = { id: 'admin_recipient', email: 'owner@victim-biz.com' }

    const result = await acceptInviteForAdmin(TENANT_INVITE, recipient)

    expect(result.status).toBe('accepted')
    expect(holder.tenantMembersInserted).toHaveLength(0)
    expect(holder.inviteMarkedAcceptedId).toBe('invite_1')
  })
})
