import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * Regression: the NYC Maid "no booking reference" payment-recovery path
 * (checkout.session.completed handler, route.ts ~line 302) matches the
 * Stripe-supplied payer email to a client via `.ilike('email', payerEmail)`
 * WITHOUT escaping %/_ wildcards. session.customer_details.email is
 * attacker-influenceable: for a Stripe Payment Link / self-serve Checkout
 * with no customer_email pinned server-side, the payer types their own email
 * at checkout. A crafted email of literally '%' would widen the ilike to
 * match ANY client on the NYC Maid tenant instead of failing to match — the
 * attacker could pay a small/arbitrary amount and have it auto-attributed to
 * a stranger's most recent unpaid booking, marking that booking "paid" off a
 * payment the real client never made. Same bug class as the referrer_name
 * (portal/collect, client/collect) and payment_sender_name (email/monitor)
 * wildcard fixes; fixed the same way with escapeLikeValue().
 */

interface CapturedCall {
  table: string
  ilikeColumn?: string
  ilikeValue?: string
}

function makeSupabaseStub(captured: CapturedCall[]) {
  return {
    from(table: string) {
      const call: CapturedCall = { table }
      captured.push(call)
      const chain: Record<string, unknown> = {
        select: () => chain,
        eq: () => chain,
        neq: () => chain,
        in: () => chain,
        gte: () => chain,
        lte: () => chain,
        order: () => chain,
        limit: () => chain,
        is: () => chain,
        single: () => Promise.resolve({ data: null, error: null }),
        maybeSingle: () => Promise.resolve({ data: null, error: null }),
        ilike: (col: string, val: string) => {
          call.ilikeColumn = col
          call.ilikeValue = val
          return chain
        },
        then: (resolve: (v: { data: unknown[]; error: null }) => unknown) => resolve({ data: [], error: null }),
      }
      return chain
    },
  }
}

const nmSmsAdmins = vi.hoisted(() => vi.fn(() => Promise.resolve(undefined)))
const stripeCtl = vi.hoisted(() => ({ current: null as unknown }))

vi.mock('@/lib/nycmaid/admin-contacts', () => ({ smsAdmins: nmSmsAdmins }))
vi.mock('stripe', () => ({
  default: class {
    webhooks = { constructEvent: () => stripeCtl.current }
  },
}))

let captured: CapturedCall[]

beforeEach(async () => {
  captured = []
  const supa = await import('@/lib/supabase')
  ;(supa as unknown as { supabaseAdmin: unknown }).supabaseAdmin = makeSupabaseStub(captured)
  nmSmsAdmins.mockClear()
  process.env.STRIPE_SECRET_KEY = 'sk_test_x'
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_x'
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: undefined, supabase: undefined }))

function sessionEvent(email: string) {
  return {
    type: 'checkout.session.completed',
    data: {
      object: {
        id: 'cs_no_ref_1',
        amount_total: 100,
        payment_intent: 'pi_x',
        metadata: {},
        client_reference_id: null,
        customer_details: { email },
      },
    },
  }
}

async function post() {
  const { POST } = await import('./route')
  return POST(
    new Request('http://acme.example.com/api/webhooks/stripe', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'stripe-signature': 't=1,v1=sig' },
      body: JSON.stringify({ id: 'evt_x' }),
    }),
  )
}

describe('stripe webhook — no-booking-ref payer-email recovery path wildcard escaping', () => {
  it('escapes % and _ in the payer-email ilike filter against clients.email', async () => {
    stripeCtl.current = sessionEvent('%_evil%@example.com')

    await post()

    const clientCall = captured.find(c => c.table === 'clients' && c.ilikeColumn === 'email')
    expect(clientCall).toBeDefined()
    // Exact-match ilike (no substring wrapping) -- the whole value is the
    // caller-controlled email, so every wildcard char in it must be escaped.
    expect(clientCall?.ilikeValue).toBe('\\%\\_evil\\%@example.com')

    // No bare, unescaped % or _ may remain anywhere in the value.
    expect(clientCall!.ilikeValue!).not.toMatch(/(?<!\\)[%_]/)
  })

  it('a bare "%" payer email resolves to a fully-escaped literal, not a match-everything wildcard', async () => {
    stripeCtl.current = sessionEvent('%')

    await post()

    const clientCall = captured.find(c => c.table === 'clients' && c.ilikeColumn === 'email')
    expect(clientCall?.ilikeValue).toBe('\\%')
    // Falls through to "couldn't auto-match" since no client actually matches.
    expect(nmSmsAdmins).toHaveBeenCalledTimes(1)
  })
})
