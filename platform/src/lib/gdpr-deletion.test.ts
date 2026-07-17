import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

const TENANT_A = 'tid-a'
const TENANT_B = 'tid-b'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))
vi.mock('@/lib/audit', () => ({ audit: vi.fn(async () => ({ success: true })) }))

import { requestDeletion, cancelDeletion, purgeDueDeletions, GdprDeletionError } from './gdpr-deletion'

function seed() {
  return {
    clients: [
      { id: 'cli-a', tenant_id: TENANT_A, name: 'Alice A', email: 'alice@example.com', phone: '5551110000', address: '1 Main St', active: true },
      { id: 'cli-b', tenant_id: TENANT_B, name: 'Bob B', email: 'bob@example.com', phone: '5552220000', address: '2 Oak St', active: true },
    ],
    gdpr_deletion_requests: [] as Array<Record<string, unknown>>,
    client_sms_messages: [
      { id: 'sms-a1', tenant_id: TENANT_A, client_id: 'cli-a', direction: 'inbound', message: 'hi there', created_at: '2026-01-01' },
      { id: 'sms-b1', tenant_id: TENANT_B, client_id: 'cli-b', direction: 'inbound', message: 'hello', created_at: '2026-01-01' },
    ],
    invoices: [
      { id: 'inv-a1', tenant_id: TENANT_A, client_id: 'cli-a', contact_name: 'Alice A', contact_email: 'alice@example.com', total_cents: 10000 },
      { id: 'inv-b1', tenant_id: TENANT_B, client_id: 'cli-b', contact_name: 'Bob B', contact_email: 'bob@example.com', total_cents: 20000 },
    ],
    client_contacts: [
      { id: 'con-a1', tenant_id: TENANT_A, client_id: 'cli-a', name: 'Alice A', phone_e164: '+15551110000', email: 'alice@example.com', is_primary: true, receives_sms: true, receives_email: true },
      { id: 'con-b1', tenant_id: TENANT_B, client_id: 'cli-b', name: 'Bob B', phone_e164: '+15552220000', email: 'bob@example.com', is_primary: true, receives_sms: true, receives_email: true },
    ],
    quotes: [
      { id: 'qte-a1', tenant_id: TENANT_A, client_id: 'cli-a', contact_name: 'Alice A', contact_email: 'alice@example.com', contact_phone: '+15551110000', service_address: '1 Main St', total_cents: 5000 },
      { id: 'qte-b1', tenant_id: TENANT_B, client_id: 'cli-b', contact_name: 'Bob B', contact_email: 'bob@example.com', contact_phone: '+15552220000', service_address: '2 Oak St', total_cents: 6000 },
    ],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

describe('requestDeletion', () => {
  it('soft-deletes the client and opens a 30-day grace period', async () => {
    const req = await requestDeletion({ tenantId: TENANT_A, clientId: 'cli-a', requestedBy: 'user-1' })
    expect(req.status).toBe('pending')

    const client = h.seed.clients.find((c) => c.id === 'cli-a')!
    expect(client.active).toBe(false)
    expect(client.deletion_requested_at).toBeTruthy()

    const requestedAt = new Date(req.requested_at).getTime()
    const scheduledAt = new Date(req.scheduled_purge_at).getTime()
    expect(scheduledAt - requestedAt).toBe(30 * 24 * 60 * 60 * 1000)
  })

  it('rejects a second request while one is already pending', async () => {
    await requestDeletion({ tenantId: TENANT_A, clientId: 'cli-a' })
    await expect(requestDeletion({ tenantId: TENANT_A, clientId: 'cli-a' })).rejects.toThrow(GdprDeletionError)
  })

  it("wrong-tenant probe: tenant A cannot open a deletion request against tenant B's client", async () => {
    await expect(requestDeletion({ tenantId: TENANT_A, clientId: 'cli-b' })).rejects.toThrow('Client not found')

    const client = h.seed.clients.find((c) => c.id === 'cli-b')!
    expect(client.active).toBe(true) // untouched — the cross-tenant attempt had zero effect
    expect(h.seed.gdpr_deletion_requests.length).toBe(0)
  })
})

describe('cancelDeletion', () => {
  it('restores the client and marks the request cancelled', async () => {
    await requestDeletion({ tenantId: TENANT_A, clientId: 'cli-a' })
    await cancelDeletion({ tenantId: TENANT_A, clientId: 'cli-a' })

    const client = h.seed.clients.find((c) => c.id === 'cli-a')!
    expect(client.active).toBe(true)
    expect(client.deletion_requested_at).toBe(null)

    const req = h.seed.gdpr_deletion_requests.find((r) => r.client_id === 'cli-a')!
    expect(req.status).toBe('cancelled')
  })

  it('errors when there is nothing pending to cancel', async () => {
    await expect(cancelDeletion({ tenantId: TENANT_A, clientId: 'cli-a' })).rejects.toThrow('No pending deletion request')
  })

  it("wrong-tenant probe: tenant A cannot cancel tenant B's pending deletion", async () => {
    await requestDeletion({ tenantId: TENANT_B, clientId: 'cli-b' })
    await expect(cancelDeletion({ tenantId: TENANT_A, clientId: 'cli-b' })).rejects.toThrow('No pending deletion request')

    // Tenant B's request is still pending and cli-b is still soft-deleted —
    // tenant A's cross-tenant attempt did not touch it either way.
    const client = h.seed.clients.find((c) => c.id === 'cli-b')!
    expect(client.active).toBe(false)
    const req = h.seed.gdpr_deletion_requests.find((r) => r.client_id === 'cli-b')!
    expect(req.status).toBe('pending')
  })
})

describe('purgeDueDeletions', () => {
  it('anonymizes only requests whose grace period has elapsed, preserving row-level aggregates', async () => {
    const dueRequest = await requestDeletion({ tenantId: TENANT_A, clientId: 'cli-a' })
    // Backdate tenant A's request into the past so it's due for purge.
    const rawA = h.seed.gdpr_deletion_requests.find((r) => r.id === dueRequest.id)!
    rawA.scheduled_purge_at = new Date(Date.now() - 1000).toISOString()

    // Tenant B's request stays at its real (future) 30-day schedule — not due.
    await requestDeletion({ tenantId: TENANT_B, clientId: 'cli-b' })

    const { purged, errors } = await purgeDueDeletions()
    expect(errors).toEqual([])
    expect(purged).toBe(1)

    const clientA = h.seed.clients.find((c) => c.id === 'cli-a')!
    expect(clientA.name).toBe('Deleted User')
    expect(clientA.email).toBe(null)
    expect(clientA.address).toBe(null)
    expect(clientA.anonymized_at).toBeTruthy()

    const clientB = h.seed.clients.find((c) => c.id === 'cli-b')!
    expect(clientB.name).toBe('Bob B') // not due — untouched

    const smsA = h.seed.client_sms_messages.find((s) => s.id === 'sms-a1')!
    expect(smsA.message).toBe('[deleted — GDPR request]')
    const smsB = h.seed.client_sms_messages.find((s) => s.id === 'sms-b1')!
    expect(smsB.message).toBe('hello') // untouched

    const invoiceA = h.seed.invoices.find((i) => i.id === 'inv-a1')!
    expect(invoiceA.contact_name).toBe(null)
    expect(invoiceA.contact_email).toBe(null)
    expect(invoiceA.total_cents).toBe(10000) // financial aggregate preserved, row not deleted

    // Same denormalized contact-snapshot shape as invoices — quotes carries
    // it too and was equally unpurged before this round.
    const quoteA = h.seed.quotes.find((q) => q.id === 'qte-a1')!
    expect(quoteA.contact_name).toBe(null)
    expect(quoteA.contact_email).toBe(null)
    expect(quoteA.contact_phone).toBe(null)
    expect(quoteA.total_cents).toBe(5000) // aggregate preserved, row not deleted
    const quoteB = h.seed.quotes.find((q) => q.id === 'qte-b1')!
    expect(quoteB.contact_name).toBe('Bob B') // not due — untouched

    // BLOCKED: the actual fan-out source for every outbound client SMS/email
    // (getClientContacts()) is purged too — a real phone/email left here
    // would keep receiving messages forever regardless of clients.active.
    const contactA = h.seed.client_contacts.find((c) => c.id === 'con-a1')!
    expect(contactA.name).toBe('Deleted User')
    expect(contactA.phone_e164).toBe(null)
    expect(contactA.email).not.toBe('alice@example.com')
    expect(contactA.receives_sms).toBe(false)
    expect(contactA.receives_email).toBe(false)

    // CONTROL: tenant B's contact, not due for purge, is untouched.
    const contactB = h.seed.client_contacts.find((c) => c.id === 'con-b1')!
    expect(contactB.name).toBe('Bob B')
    expect(contactB.phone_e164).toBe('+15552220000')
    expect(contactB.receives_sms).toBe(true)

    const reqA = h.seed.gdpr_deletion_requests.find((r) => r.id === dueRequest.id)!
    expect(reqA.status).toBe('completed')
  })

  it("wrong-tenant probe: purging tenant A's due request never touches tenant B's contact even when both clients share a colliding id shape", async () => {
    const dueRequest = await requestDeletion({ tenantId: TENANT_A, clientId: 'cli-a' })
    const rawA = h.seed.gdpr_deletion_requests.find((r) => r.id === dueRequest.id)!
    rawA.scheduled_purge_at = new Date(Date.now() - 1000).toISOString()

    await purgeDueDeletions()

    const contactB = h.seed.client_contacts.find((c) => c.id === 'con-b1')!
    expect(contactB.name).toBe('Bob B')
    expect(contactB.email).toBe('bob@example.com')
    expect(contactB.receives_sms).toBe(true)
  })

  it('is a no-op when nothing is due', async () => {
    await requestDeletion({ tenantId: TENANT_A, clientId: 'cli-a' }) // scheduled 30 days out — not due
    const { purged, errors } = await purgeDueDeletions()
    expect(purged).toBe(0)
    expect(errors).toEqual([])

    const clientA = h.seed.clients.find((c) => c.id === 'cli-a')!
    expect(clientA.name).toBe('Alice A') // untouched
  })
})
