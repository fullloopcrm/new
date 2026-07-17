/**
 * QUOTE-CONVERT ROUTE — email-case client dedup.
 *
 * clients.email is always stored lowercase/trimmed (validate.ts on the
 * clients POST route), but quotes.contact_email is raw, unnormalized user
 * input. The client-resolution lookup here used to compare the two as-is —
 * a quote with contact_email "John@Example.com" would miss an existing
 * client stored as "john@example.com" and create a duplicate, splitting
 * that person's booking/quote/payment history across two client records.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase, Row } from '@/test/fake-supabase'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabase: fake, supabaseAdmin: fake, __fake: fake }
})

vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: TENANT_ID, role: 'owner' }),
  AuthError: class AuthError extends Error {
    status: number
    constructor(message: string, status = 401) {
      super(message)
      this.status = status
    }
  },
}))

import { supabaseAdmin } from '@/lib/supabase'
import { POST } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase

const TENANT_ID = 'tenant-1'
const QUOTE_ID = 'quote-1'
const EXISTING_CLIENT_ID = 'client-existing'

function seedQuote(overrides: Partial<Row> = {}) {
  fake._store.clear()
  fake._seed('quotes', [
    {
      id: QUOTE_ID,
      tenant_id: TENANT_ID,
      status: 'accepted',
      converted_booking_id: null,
      converted_at: null,
      total_cents: 10_000,
      client_id: null,
      title: 'Test Quote',
      quote_number: 'Q-1',
      contact_email: 'John.Doe@Example.com',
      contact_name: 'John Doe',
      contact_phone: null,
      service_address: null,
      notes: null,
      ...overrides,
    },
  ])
  fake._seed('clients', [
    { id: EXISTING_CLIENT_ID, tenant_id: TENANT_ID, name: 'John Doe', email: 'john.doe@example.com', phone: null },
  ])
}

function convertRequest() {
  return new Request(`http://x/api/quotes/${QUOTE_ID}/convert`, { method: 'POST', body: JSON.stringify({}) })
}

beforeEach(() => {
  seedQuote()
})

describe('POST /api/quotes/[id]/convert — email-case client dedup', () => {
  it('matches an existing client whose stored email differs only in case from contact_email', async () => {
    const res = await POST(convertRequest(), { params: Promise.resolve({ id: QUOTE_ID }) })
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.already_converted).toBeFalsy()

    // Exactly one client row — the pre-existing one, reused, not a duplicate.
    expect(fake._all('clients').length).toBe(1)

    const quoteRow = fake._all('quotes').find((q) => q.id === QUOTE_ID)
    expect(quoteRow?.client_id).toBe(EXISTING_CLIENT_ID)

    const booking = fake._all('bookings').find((b) => b.id === quoteRow?.converted_booking_id)
    expect(booking?.client_id).toBe(EXISTING_CLIENT_ID)
  })

  it('still creates a new client (normalized) when no existing client matches', async () => {
    fake._store.set('clients', [])
    const res = await POST(convertRequest(), { params: Promise.resolve({ id: QUOTE_ID }) })
    expect(res.status).toBe(200)

    const clients = fake._all('clients')
    expect(clients.length).toBe(1)
    expect(clients[0].email).toBe('john.doe@example.com')
  })
})
