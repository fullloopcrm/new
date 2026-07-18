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
  existingMemberError: null as { message: string } | null,
  inviteLookupData: null as Record<string, unknown> | null,
  inviteLookupError: null as { message: string } | null,
  inviteAcceptError: null as { message: string } | null,
  tenantActivateError: null as { message: string } | null,
}))

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === 'tenant_members') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: holder.existingMember,
                  error: holder.existingMemberError,
                }),
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
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: holder.inviteLookupData,
                error: holder.inviteLookupError,
              }),
            }),
          }),
          update: (_fields: Record<string, unknown>) => ({
            eq: (_col: string, id: string) => {
              holder.inviteMarkedAcceptedId = id
              return { then: (resolve: (v: unknown) => void) => resolve({ data: null, error: holder.inviteAcceptError }) }
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
                return { then: (resolve: (v: unknown) => void) => resolve({ data: null, error: holder.tenantActivateError }) }
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

import { acceptInviteForAdmin, lookupInvite } from './accept-invite'

beforeEach(() => {
  holder.tenantMembersInserted = []
  holder.inviteMarkedAcceptedId = null
  holder.tenantActivated = null
  holder.existingMember = null
  holder.existingMemberError = null
  holder.inviteLookupData = null
  holder.inviteLookupError = null
  holder.inviteAcceptError = null
  holder.tenantActivateError = null
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

  // MASKED-ERROR PROBE: a genuine transient failure on the existing-member
  // check must throw, not be silently treated as "not a member yet" — the
  // latter would attempt a duplicate insert (masked class fixed elsewhere:
  // getCurrentTenant/getTenantForRequest/onboarding tenant-creation).
  it('MASKED-ERROR PROBE: throws on a genuine existing-member lookup failure instead of treating it as not-a-member', async () => {
    holder.existingMemberError = { message: 'connection reset' }
    const recipient = { id: 'admin_recipient', email: 'owner@victim-biz.com' }

    await expect(acceptInviteForAdmin(TENANT_INVITE, recipient)).rejects.toThrow(
      /TENANT_MEMBER_LOOKUP_ERROR/,
    )
    expect(holder.tenantMembersInserted).toHaveLength(0)
    expect(holder.inviteMarkedAcceptedId).toBeNull()
  })

  // MASKED-ERROR PROBE: neither write below had its returned `error`
  // destructured at all before this fix — a genuine DB failure was
  // completely invisible and the function still returned
  // { status: 'accepted' }, so the caller (join/[token]/accept/page.tsx)
  // redirected to /dashboard as if activation succeeded.
  it('MASKED-ERROR PROBE: throws on a genuine tenant_invites.accepted write failure instead of reporting accepted', async () => {
    holder.inviteAcceptError = { message: 'connection reset' }
    const recipient = { id: 'admin_recipient', email: 'owner@victim-biz.com' }

    await expect(acceptInviteForAdmin(TENANT_INVITE, recipient)).rejects.toThrow(
      /TENANT_INVITE_ACCEPT_UPDATE_ERROR/,
    )
    expect(holder.tenantActivated).toBeNull()
  })

  it('MASKED-ERROR PROBE: throws on a genuine tenants.status=active write failure instead of reporting accepted', async () => {
    holder.tenantActivateError = { message: 'connection reset' }
    const recipient = { id: 'admin_recipient', email: 'owner@victim-biz.com' }

    await expect(acceptInviteForAdmin(TENANT_INVITE, recipient)).rejects.toThrow(
      /TENANT_INVITE_ACTIVATE_ERROR/,
    )
    expect(holder.inviteMarkedAcceptedId).toBe('invite_1')
  })
})

describe('lookupInvite — masked DB errors must not read as "invalid invite"', () => {
  it('MASKED-ERROR PROBE: throws on a genuine lookup failure instead of returning status:"invalid"', async () => {
    holder.inviteLookupError = { message: 'connection reset' }

    await expect(lookupInvite('some-token')).rejects.toThrow(/TENANT_INVITE_LOOKUP_ERROR/)
  })

  it('returns status:"invalid" for a genuine 0-row (unknown token) result, not an error', async () => {
    holder.inviteLookupData = null
    holder.inviteLookupError = null

    const result = await lookupInvite('unknown-token')

    expect(result.status).toBe('invalid')
  })

  it('returns the invite for a valid, unexpired, unaccepted token', async () => {
    holder.inviteLookupData = { ...TENANT_INVITE }
    holder.inviteLookupError = null

    const result = await lookupInvite('good-token')

    expect(result.status).toBe('valid')
    if (result.status === 'valid') expect(result.invite.id).toBe('invite_1')
  })
})
