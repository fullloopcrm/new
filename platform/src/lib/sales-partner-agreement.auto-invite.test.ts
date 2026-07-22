import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * activateSalesPartnerForDocument() also fires the Stripe Connect invite the
 * moment a partner is approved (Jeff's mid-session requirement — "no admin
 * has to go hunting for a stripe-onboard action"). This is the send-side
 * proof; sales-partner-agreement.test.ts already covers the activation
 * itself in isolation without these mocks.
 */

const h = vi.hoisted(() => ({
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
})) as unknown as FakeStoreHandle

const inviteSpy = vi.hoisted(() => vi.fn(async () => ({ ok: true, url: 'https://connect.stripe.com/x', sentSms: true, sentEmail: true })))

vi.mock('@/lib/supabase', () => {
  const fake = makeTenantDbFake(h)
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/app/api/sales-partners/[id]/stripe-invite/route', () => ({
  sendSalesPartnerStripeInvite: inviteSpy,
}))

import { activateSalesPartnerForDocument } from './sales-partner-agreement'

// activateSalesPartnerForDocument fires the invite fire-and-forget (no
// await) -- flush microtasks so the spy call lands before assertions run.
const flush = () => new Promise((r) => setTimeout(r, 0))

beforeEach(() => {
  h.seq = 0
  inviteSpy.mockClear()
  h.store = {
    sales_partners: [
      { id: 'sp-1', tenant_id: 'tenant-A', active: false, agreement_document_id: 'doc-1' },
      { id: 'sp-2', tenant_id: 'tenant-A', active: false, agreement_document_id: null },
    ],
  }
})

describe('activateSalesPartnerForDocument — auto Stripe invite on approval', () => {
  it('sends the Stripe Connect invite for the newly-activated partner', async () => {
    await activateSalesPartnerForDocument('doc-1')
    await flush()
    expect(inviteSpy).toHaveBeenCalledTimes(1)
    expect(inviteSpy).toHaveBeenCalledWith('sp-1', 'tenant-A')
  })

  it('never sends an invite when no partner matched the document', async () => {
    await activateSalesPartnerForDocument('no-such-doc')
    await flush()
    expect(inviteSpy).not.toHaveBeenCalled()
  })

  it('a failed invite send does not throw out of activateSalesPartnerForDocument', async () => {
    inviteSpy.mockRejectedValueOnce(new Error('stripe down'))
    await expect(activateSalesPartnerForDocument('doc-1')).resolves.toBeUndefined()
    await flush()
  })
})
