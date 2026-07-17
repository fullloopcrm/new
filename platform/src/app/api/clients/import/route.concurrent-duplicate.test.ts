/**
 * CLIENTS CSV IMPORT — concurrent double-submit duplicates the whole batch.
 *
 * POST /api/clients/import loads the tenant's existing clients ONCE into an
 * in-memory `existingEmails`/`existingPhones` snapshot, dedupes the incoming
 * CSV rows against that snapshot, then inserts the survivors. There is no
 * DB-level backstop: `clients` has no unique constraint on (tenant_id, email)
 * or (tenant_id, phone) (see `import-staging.commit-race.test.ts`, which
 * documents the same gap for the staged-import pipeline's `commitBatch`).
 *
 * Two concurrent POSTs for the same CSV — a double-click on "Import" while a
 * large file is still uploading, or a client retry after a slow/timed-out
 * first response — both read the SAME "existing" snapshot before either
 * insert lands, so neither sees the other's rows as duplicates. Confirmed
 * below: with no DB constraint in place, this doubles the whole batch (4
 * rows land instead of 2) with both requests reporting success.
 *
 * migrations/2026_07_17_clients_import_dedup_unique_index_PROPOSED.sql
 * proposes the real fix (a DB-level unique index) but is NOT yet applied —
 * file-only per worker rules, pending Jeff's DDL approval. route.ts was
 * updated in the same pass to catch the resulting 23505 per-row (dormant
 * until the migration lands, verified below by simulating the constraint),
 * mirroring the same-date-booking-race precedent
 * (client/book/route.same-date-race.test.ts).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({ tenant: { tenantId: 'tenant-1' }, error: null })),
}))
vi.mock('@/lib/audit', () => ({ audit: vi.fn(async () => {}) }))
vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabase: fake, supabaseAdmin: fake, __fake: fake }
})

import { supabaseAdmin } from '@/lib/supabase'
import { POST } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase

function importRequest() {
  return new Request('http://x/api/clients/import', {
    method: 'POST',
    body: JSON.stringify({
      clients: [
        { name: 'Alice', phone: '212-555-0100', email: 'alice@x.test' },
        { name: 'Bob', phone: '212-555-0101', email: 'bob@x.test' },
      ],
    }),
  })
}

beforeEach(() => {
  fake._store.clear()
})

describe('clients/import — concurrent double-submit, no DB constraint (current prod state)', () => {
  it('doubles the whole batch today — no defense exists without the DB migration', async () => {
    const [r1, r2] = await Promise.all([POST(importRequest()), POST(importRequest())])
    await Promise.all([r1.json(), r2.json()])

    const clients = fake._all('clients').filter((c) => c.tenant_id === 'tenant-1')
    // Documents the current gap: both requests read an empty "existing"
    // snapshot before either insert lands, so both import all rows.
    expect(clients.length).toBe(4)
  })
})

describe('clients/import — once the proposed unique index is applied', () => {
  beforeEach(() => {
    // Simulates the migration having been applied: a real Postgres unique
    // violation on a conflicting row, exactly like the same-date booking
    // race precedent simulates uq_bookings_client_same_date_active.
    fake._addUniqueConstraint('clients', 'email')
  })

  it('a losing concurrent import reports its rows as duplicates instead of double-inserting', async () => {
    const [r1, r2] = await Promise.all([POST(importRequest()), POST(importRequest())])
    const [b1, b2] = await Promise.all([r1.json(), r2.json()])

    const clients = fake._all('clients').filter((c) => c.tenant_id === 'tenant-1')
    expect(clients.length).toBe(2) // Alice + Bob, once each — not 4.

    const totalImported = (b1.imported || 0) + (b2.imported || 0)
    expect(totalImported).toBe(2)
    expect(b1.errors.length).toBe(0)
    expect(b2.errors.length).toBe(0)
  })

  it('a normal single import still succeeds with no conflicts', async () => {
    const res = await POST(importRequest())
    const body = await res.json()
    expect(body.imported).toBe(2)
    expect(body.errors.length).toBe(0)
  })
})
