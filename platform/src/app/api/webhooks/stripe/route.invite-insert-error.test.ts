import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * Stripe webhook — Full Loop self-serve signup's tenant_invites insert —
 * masked-DB-error fix.
 *
 * BUG (fixed here): the `checkout.session.completed` / full-loop-signup
 * branch inserted the new tenant owner's `tenant_invites` row with zero
 * error handling — supabase-js resolves a DB-level rejection (RLS deny,
 * constraint violation) into the call's returned `error` field rather than
 * throwing, so the surrounding try/catch (meant for the email send) never
 * fired on a genuine write failure. The branch fell straight through to
 * sending the "Welcome — your account is set up and ready" email with a
 * joinUrl pointing at a token that was never persisted. The new paying
 * tenant's owner would click Get Started and land on lookupInvite()'s
 * generic "Invalid Invite" page — indistinguishable from a bogus token —
 * with zero signal to anyone (webhook still returned 200 signup_paid:true)
 * that provisioning had actually failed. Same masked-error class as the
 * sibling `tenant_members` insert fixes in accept-invite.ts /
 * create-tenant-from-lead.ts, and the one call site that DIDN'T match
 * /api/admin/invites' already-correct error check on the same table.
 *
 * FIX: check the insert's `error` explicitly and throw — routes into the
 * existing catch, which already has the correct fallback for this exact
 * situation (tenant is created; admin can manually resend via
 * /api/admin/invites) — so the misleading welcome email never goes out.
 */

let event: { type: string; data: { object: Record<string, unknown> } }

vi.mock('stripe', () => {
  class MockStripe {
    webhooks = { constructEvent: () => event }
    static LatestApiVersion = '2025-04-30.basil'
  }
  return { default: MockStripe }
})

const sendEmailMock = vi.fn(async (args: unknown) => {})
vi.mock('@/lib/email', () => ({
  sendEmail: (args: unknown) => sendEmailMock(args),
}))

vi.mock('@/lib/provision-tenant', () => ({
  provisionTenant: async () => {},
}))

const prospectRow = {
  id: 'prospect_1',
  business_name: 'Acme Cleaning',
  trade: 'cleaning',
  owner_phone: '+15555550100',
  owner_email: 'owner@example.com',
  owner_name: 'Owner Name',
  tenant_id: null,
  paid_tier: 'pro',
  primary_city: 'Testville',
  primary_state: 'NY',
  primary_zip: '10001',
}

let prospectsFromCalls = 0

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === 'prospects') {
        prospectsFromCalls++
        if (prospectsFromCalls === 1) {
          // Compare-and-swap claim update.
          return {
            update: () => ({
              eq: () => ({
                in: () => ({
                  select: () => ({
                    maybeSingle: async () => ({ data: { id: prospectRow.id }, error: null }),
                  }),
                }),
              }),
            }),
          }
        }
        if (prospectsFromCalls === 2) {
          // Full prospect row fetch.
          return {
            select: () => ({
              eq: () => ({
                single: async () => ({ data: prospectRow, error: null }),
              }),
            }),
          }
        }
        // Final tenant_id backfill — awaited directly off .eq(), no select/maybeSingle chain.
        return {
          update: () => ({
            eq: async () => ({ data: null, error: null }),
          }),
        }
      }
      if (table === 'tenants') {
        return {
          insert: () => ({
            select: () => ({
              single: async () => ({ data: { id: 'tenant_1' }, error: null }),
            }),
          }),
        }
      }
      if (table === 'entities') {
        return { insert: async () => ({ data: null, error: null }) }
      }
      if (table === 'tenant_invites') {
        return {
          insert: async () => ({ data: null, error: { message: 'connection reset' } }),
        }
      }
      const noop: Record<string, unknown> = {
        select: () => noop, insert: () => noop, update: () => noop, eq: () => noop, in: () => noop,
        limit: () => Promise.resolve({ data: [], error: null }),
        maybeSingle: async () => ({ data: null, error: null }),
        single: async () => ({ data: null, error: null }),
      }
      return noop
    },
  },
}))

import { POST } from './route'

function req(body: string): Request {
  return {
    text: async () => body,
    headers: { get: () => 'sig_test' },
  } as unknown as Request
}

beforeEach(() => {
  process.env.STRIPE_SECRET_KEY = 'sk_test_x'
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_x'
  prospectsFromCalls = 0
  sendEmailMock.mockClear()
})

describe('Stripe webhook — Full Loop signup tenant_invites insert masked DB error', () => {
  it('a genuine DB failure on the invite insert is caught, logged, and never sends the "account ready" email with a dead join link', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    event = {
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_1',
          client_reference_id: null,
          metadata: {
            full_loop_signup: 'true',
            prospect_id: prospectRow.id,
            admins: '1',
            team_members: '0',
          },
        },
      },
    }

    const res = await POST(req('{}'))

    // Webhook still returns 200 — tenant creation itself succeeded, matching
    // the existing "don't fail the whole webhook" fallback for this catch.
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.signup_paid).toBe(true)

    // The old bug: this email would have gone out anyway, pointing at a
    // token that was never written to tenant_invites.
    expect(sendEmailMock).not.toHaveBeenCalled()

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('invite failed'),
      expect.objectContaining({ message: expect.stringContaining('TENANT_INVITE_INSERT_ERROR') }),
    )

    consoleErrorSpy.mockRestore()
  })
})
