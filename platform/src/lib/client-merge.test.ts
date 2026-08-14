import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

const TENANT_A = 'tid-a'
const TENANT_B = 'tid-b'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'], rpc: null as null | Harness['rpc'] }))
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: { from: (t: string) => holder.from!(t), rpc: (fn: string, args: Record<string, unknown>) => holder.rpc!(fn, args) },
}))
const auditMock = vi.hoisted(() => vi.fn(async () => ({ success: true })))
vi.mock('@/lib/audit', () => ({ audit: auditMock }))

import { mergeClients, ClientMergeError } from './client-merge'

// canon = the real, kept client. dupe = the accidental duplicate being
// reconciled into canon. Both belong to TENANT_A. other-tenant rows (prefixed
// tb-) exist purely for the cross-tenant probe.
function seed() {
  return {
    clients: [
      { id: 'canon', tenant_id: TENANT_A, name: 'Jane Doe', email: 'jane@example.com', phone: '5551110000', notes: null, active: true, do_not_service: false },
      { id: 'dupe', tenant_id: TENANT_A, name: 'Jane Doe', email: 'jane.doe@example.com', phone: '5551110001', notes: 'Prefers morning visits', active: true, do_not_service: false },
      { id: 'tb-canon', tenant_id: TENANT_B, name: 'Bob B', email: 'bob@example.com', phone: '5552220000', notes: null, active: true, do_not_service: false },
    ],
    bookings: [
      { id: 'bk-1', tenant_id: TENANT_A, client_id: 'dupe', status: 'completed', price: 10000 },
      { id: 'bk-2', tenant_id: TENANT_A, client_id: 'canon', status: 'scheduled', price: 12000 },
      { id: 'bk-tb-1', tenant_id: TENANT_B, client_id: 'tb-canon', status: 'completed', price: 5000 },
    ],
    recurring_schedules: [
      { id: 'rs-1', tenant_id: TENANT_A, client_id: 'dupe', recurring_type: 'weekly' },
    ],
    payments: [
      { id: 'pay-1', tenant_id: TENANT_A, client_id: 'dupe', amount_cents: 10000, status: 'paid' },
    ],
    invoices: [
      { id: 'inv-1', tenant_id: TENANT_A, client_id: 'dupe', total_cents: 10000 },
    ],
    comhub_contacts: [
      { id: 'cc-1', tenant_id: TENANT_A, client_id: 'dupe', phone: '5551110001' },
    ],
    client_sms_messages: [
      { id: 'sms-1', tenant_id: TENANT_A, client_id: 'dupe', direction: 'inbound', message: 'Can I reschedule?' },
    ],
    client_contacts: [
      { id: 'con-canon', tenant_id: TENANT_A, client_id: 'canon', name: 'Jane Doe', is_primary: true },
      { id: 'con-dupe', tenant_id: TENANT_A, client_id: 'dupe', name: 'Jane Doe', is_primary: true },
    ],
    client_properties: [
      { id: 'prop-canon', tenant_id: TENANT_A, client_id: 'canon', address: '1 Main St', is_primary: true },
      { id: 'prop-dupe', tenant_id: TENANT_A, client_id: 'dupe', address: '2 Second Ave', is_primary: true },
    ],
    ratings: [
      { id: 'rate-1', tenant_id: TENANT_A, client_id: 'dupe', booking_id: 'bk-1', stars: 5 },
    ],
    deals: [
      { id: 'deal-1', tenant_id: TENANT_A, client_id: 'dupe', stage: 'won' },
    ],
    quotes: [
      { id: 'quote-1', tenant_id: TENANT_A, client_id: 'dupe', total_cents: 8000 },
    ],
    audit_logs: [] as Array<Record<string, unknown>>,
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
  holder.rpc = h.rpc
  auditMock.mockClear()
})

describe('mergeClients', () => {
  it('moves booking/payment/communication history from the duplicate onto the canonical client and retires the duplicate', async () => {
    const result = await mergeClients({ tenantId: TENANT_A, canonicalClientId: 'canon', duplicateClientId: 'dupe' })

    expect(result.movedCounts.bookings).toBe(1)
    expect(result.movedCounts.recurring_schedules).toBe(1)
    expect(result.movedCounts.payments).toBe(1)
    expect(result.movedCounts.invoices).toBe(1)
    expect(result.movedCounts.comhub_contacts).toBe(1)
    expect(result.movedCounts.client_sms_messages).toBe(1)
    expect(result.movedCounts.ratings).toBe(1)
    expect(result.movedCounts.deals).toBe(1)
    expect(result.movedCounts.quotes).toBe(1)
    // client_contacts/client_properties: 1 row each moved (dupe's own), not 2 —
    // canon's own pre-existing contact/property never had client_id='dupe' to match.
    expect(result.movedCounts.client_contacts).toBe(1)
    expect(result.movedCounts.client_properties).toBe(1)

    // Every previously-dupe-owned row now points at canon — history preserved
    // under the canonical id, not deleted, not re-created (same row ids).
    expect(h.seed.bookings.find((b) => b.id === 'bk-1')!.client_id).toBe('canon')
    expect(h.seed.bookings.find((b) => b.id === 'bk-2')!.client_id).toBe('canon') // was already canon's
    expect(h.seed.recurring_schedules.find((r) => r.id === 'rs-1')!.client_id).toBe('canon')
    expect(h.seed.payments.find((p) => p.id === 'pay-1')!.client_id).toBe('canon')
    expect(h.seed.invoices.find((i) => i.id === 'inv-1')!.client_id).toBe('canon')
    expect(h.seed.comhub_contacts.find((c) => c.id === 'cc-1')!.client_id).toBe('canon')
    expect(h.seed.client_sms_messages.find((s) => s.id === 'sms-1')!.client_id).toBe('canon')
    expect(h.seed.ratings.find((r) => r.id === 'rate-1')!.client_id).toBe('canon')
    expect(h.seed.deals.find((d) => d.id === 'deal-1')!.client_id).toBe('canon')
    expect(h.seed.quotes.find((q) => q.id === 'quote-1')!.client_id).toBe('canon')

    // The duplicate itself is soft-retired, never hard-deleted -- its row
    // (and the moved rows' history) is still fully queryable.
    const dupe = h.seed.clients.find((c) => c.id === 'dupe')!
    expect(dupe.active).toBe(false)
    expect(dupe.do_not_service).toBe(true)
    expect(String(dupe.notes)).toContain('Merged into client canon')
    expect(String(dupe.notes)).toContain('Prefers morning visits') // original note preserved, not overwritten

    // Canonical client itself is untouched aside from receiving the history.
    const canon = h.seed.clients.find((c) => c.id === 'canon')!
    expect(canon.active).toBe(true)
    expect(canon.name).toBe('Jane Doe')

    expect(auditMock).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: TENANT_A,
      action: 'client.merged',
      entityType: 'client',
      entityId: 'canon',
      details: expect.objectContaining({ duplicateClientId: 'dupe' }),
    }))
  })

  it("demotes the duplicate's is_primary contact and property so the canonical never ends up with two primaries", async () => {
    await mergeClients({ tenantId: TENANT_A, canonicalClientId: 'canon', duplicateClientId: 'dupe' })

    const contacts = h.seed.client_contacts.filter((c) => c.client_id === 'canon')
    expect(contacts).toHaveLength(2) // canon's original + dupe's, both now under canon
    expect(contacts.filter((c) => c.is_primary === true)).toHaveLength(1) // exactly one primary survives
    expect(contacts.find((c) => c.id === 'con-canon')!.is_primary).toBe(true) // canon's own primary wins
    expect(contacts.find((c) => c.id === 'con-dupe')!.is_primary).toBe(false) // dupe's demoted, not dropped

    const properties = h.seed.client_properties.filter((p) => p.client_id === 'canon')
    expect(properties).toHaveLength(2)
    expect(properties.filter((p) => p.is_primary === true)).toHaveLength(1)
    expect(properties.find((p) => p.id === 'prop-dupe')!.is_primary).toBe(false)
    // The demoted property address itself is preserved (a second address for
    // the client, not deleted) -- only the primary flag changed.
    expect(properties.find((p) => p.id === 'prop-dupe')!.address).toBe('2 Second Ave')
  })

  it('rejects merging a client into itself', async () => {
    await expect(mergeClients({ tenantId: TENANT_A, canonicalClientId: 'canon', duplicateClientId: 'canon' }))
      .rejects.toThrow(ClientMergeError)
    await expect(mergeClients({ tenantId: TENANT_A, canonicalClientId: 'canon', duplicateClientId: 'canon' }))
      .rejects.toThrow('Cannot merge a client into itself')
  })

  it('404s when the canonical client does not exist', async () => {
    await expect(mergeClients({ tenantId: TENANT_A, canonicalClientId: 'nope', duplicateClientId: 'dupe' }))
      .rejects.toThrow('Canonical client not found')
  })

  it('404s when the duplicate client does not exist', async () => {
    await expect(mergeClients({ tenantId: TENANT_A, canonicalClientId: 'canon', duplicateClientId: 'nope' }))
      .rejects.toThrow('Duplicate client not found')
  })

  it("wrong-tenant probe: tenant A cannot merge tenant B's client into tenant A's canonical", async () => {
    await expect(mergeClients({ tenantId: TENANT_A, canonicalClientId: 'canon', duplicateClientId: 'tb-canon' }))
      .rejects.toThrow('Duplicate client not found')

    // Tenant B's booking is completely untouched by the cross-tenant attempt.
    expect(h.seed.bookings.find((b) => b.id === 'bk-tb-1')!.client_id).toBe('tb-canon')
    const tbClient = h.seed.clients.find((c) => c.id === 'tb-canon')!
    expect(tbClient.active).toBe(true)
  })

  it("wrong-tenant probe: tenant A's client id cannot be used as the canonical target from tenant B's context", async () => {
    await expect(mergeClients({ tenantId: TENANT_B, canonicalClientId: 'tb-canon', duplicateClientId: 'dupe' }))
      .rejects.toThrow('Duplicate client not found')

    // Tenant A's duplicate is untouched -- still active, history unmoved.
    const dupe = h.seed.clients.find((c) => c.id === 'dupe')!
    expect(dupe.active).toBe(true)
    expect(h.seed.bookings.find((b) => b.id === 'bk-1')!.client_id).toBe('dupe')
  })

  it('rejects when required ids are missing', async () => {
    await expect(mergeClients({ tenantId: TENANT_A, canonicalClientId: '', duplicateClientId: 'dupe' }))
      .rejects.toThrow(ClientMergeError)
  })
})
