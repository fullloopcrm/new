import { describe, it, expect, vi } from 'vitest'

/**
 * Regression: matchPaymentToBooking() built its `bookings.payment_sender_name`
 * and `clients.name` ilike() filters from payment.senderName WITHOUT escaping
 * %/_ wildcards. payment.senderName is attacker-influenceable -- it comes
 * from the monitored inbox's email "From" display name (or a regex match
 * over the email body), both of which the sender of an email fully controls.
 * detectPaymentEmail()'s heuristics (sender-domain substring + subject
 * pattern + body keyword) can be satisfied by a forged email with no
 * cryptographic verification, so a crafted senderName of literally '%' would
 * have widened the ilike to match ANY unpaid booking/client in the tenant --
 * auto-marking an arbitrary real booking "paid" off a fake payment
 * confirmation. Same bug class as portal/collect + client/collect's
 * referrer_name wildcard fix; fixed the same way with escapeLikeValue().
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
        gte: () => chain,
        lte: () => chain,
        order: () => chain,
        limit: () => chain,
        single: () => Promise.resolve({ data: null, error: null }),
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

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: undefined }))

const TENANT = { id: 'tenant-1', name: 't', imap_host: null, imap_port: null, imap_user: null, imap_pass: null, email_monitor_enabled: true, telnyx_api_key: null, telnyx_phone: null }

describe('email/monitor matchPaymentToBooking — sender-name wildcard escaping', () => {
  it('escapes % and _ in the payment_sender_name and client name ilike filters', async () => {
    const captured: CapturedCall[] = []
    const supa = await import('@/lib/supabase')
    ;(supa as unknown as { supabaseAdmin: unknown }).supabaseAdmin = makeSupabaseStub(captured)

    const { matchPaymentToBooking } = await import('./route')

    await matchPaymentToBooking(TENANT, {
      method: 'zelle',
      amount: 50,
      amountCents: 5000,
      senderName: '%_evil%',
      senderEmail: 'attacker@example.com',
      date: new Date(),
      referenceId: 'msg-1',
    })

    const payerCall = captured.find(c => c.table === 'bookings' && c.ilikeColumn === 'payment_sender_name')
    const clientCall = captured.find(c => c.table === 'clients' && c.ilikeColumn === 'name')

    expect(payerCall?.ilikeValue).toBe('%\\%\\_evil\\%%')
    expect(clientCall?.ilikeValue).toBe('%\\%\\_evil\\%%')

    // The escaped value must not contain a bare, unescaped '%' or '_' in the
    // caller-controlled middle segment (only the two wrapping wildcards we
    // added ourselves are allowed to be bare).
    for (const val of [payerCall?.ilikeValue, clientCall?.ilikeValue]) {
      const inner = val!.slice(1, -1) // strip our own leading/trailing wrapper %
      expect(inner).not.toMatch(/(?<!\\)%/)
      expect(inner).not.toMatch(/(?<!\\)_/)
    }
  })

  it('a bare "%" senderName resolves to a fully-escaped literal, not a match-everything wildcard', async () => {
    const captured: CapturedCall[] = []
    const supa = await import('@/lib/supabase')
    ;(supa as unknown as { supabaseAdmin: unknown }).supabaseAdmin = makeSupabaseStub(captured)

    const { matchPaymentToBooking } = await import('./route')

    await matchPaymentToBooking(TENANT, {
      method: 'venmo',
      amount: 10,
      amountCents: 1000,
      senderName: '%',
      senderEmail: 'attacker@example.com',
      date: new Date(),
      referenceId: 'msg-2',
    })

    const payerCall = captured.find(c => c.table === 'bookings' && c.ilikeColumn === 'payment_sender_name')
    expect(payerCall?.ilikeValue).toBe('%\\%%')
  })
})
