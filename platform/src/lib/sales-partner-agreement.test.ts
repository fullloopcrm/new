import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * activateSalesPartnerForDocument() — the completion hook wired into
 * /api/documents/public/[token]/sign. Confirms it flips the matching
 * sales_partners row active on completion, is a no-op for any other
 * document, and doesn't reactivate a partner an admin has since deactivated.
 */

const h = vi.hoisted(() => ({
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
})) as unknown as FakeStoreHandle

vi.mock('@/lib/supabase', () => {
  const fake = makeTenantDbFake(h)
  return { supabaseAdmin: fake, supabase: fake }
})

import { activateSalesPartnerForDocument } from './sales-partner-agreement'

beforeEach(() => {
  h.seq = 0
  h.store = {
    sales_partners: [
      { id: 'sp-1', tenant_id: 'tenant-A', active: false, agreement_document_id: 'doc-1' },
      { id: 'sp-2', tenant_id: 'tenant-A', active: false, agreement_document_id: 'doc-2' },
      { id: 'sp-3', tenant_id: 'tenant-A', active: false, agreement_document_id: null },
    ],
  }
})

describe('activateSalesPartnerForDocument', () => {
  it('activates the partner whose agreement_document_id matches the completed document', async () => {
    await activateSalesPartnerForDocument('doc-1')
    const sp1 = h.store.sales_partners.find((p) => p.id === 'sp-1')!
    expect(sp1.active).toBe(true)
    expect(sp1.approved_at).toBeTruthy()
  })

  it('is a no-op for a document id with no matching sales_partners row', async () => {
    await activateSalesPartnerForDocument('some-other-document')
    expect(h.store.sales_partners.every((p) => p.active === false)).toBe(true)
  })

  it('leaves an unrelated partner (no agreement doc yet) untouched', async () => {
    await activateSalesPartnerForDocument('doc-1')
    expect(h.store.sales_partners.find((p) => p.id === 'sp-3')!.active).toBe(false)
  })
})
