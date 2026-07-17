// @vitest-environment node
//
// node, not jsdom: jsdom's FormData/File and undici's (which Request/
// formData() use internally) are different classes, so a jsdom File fails
// undici's internal multipart parser.
/**
 * MISSING entity_id ON IMPORTED ROWS — POST /api/finance/bank-import
 *
 * migrations/034_entities.sql added `entity_id` to bank_accounts,
 * bank_import_batches, AND bank_transactions, and every OTHER write path
 * that creates a bank_account (bank-accounts/route.ts POST) sets it —
 * defaulting to the tenant's default entity when the caller doesn't pick
 * one. bank-import/route.ts is this app's only currently-live path that
 * INSERTs new bank_transactions rows (Plaid sync is a documented future
 * step, not built yet), and it never reads or forwards entity_id at all —
 * every CSV/OFX-imported transaction (and its batch row) lands with
 * entity_id NULL, forever.
 *
 * Every entity-scoped finance view (`?entity_id=X` on bank-transactions
 * list, reports, etc. via lib/entity.ts's `entityIdFromUrl` convention)
 * filters with `.eq('entity_id', entityId)`, which excludes NULL rows. For
 * any tenant using more than one entity, imported bank transactions
 * silently never appear in that entity's books at all — they only show up
 * in the unscoped "all entities" view, so reconciliation for that entity
 * looks incomplete with no error anywhere.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import type { FakeSupabase, Row } from '@/test/fake-supabase'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabase: fake, supabaseAdmin: fake, __fake: fake }
})

import { vi } from 'vitest'

const TENANT_ID = 'tenant-1'
const ACCOUNT_ID = 'acct-1'
const ENTITY_ID = 'entity-secondary'

vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({ tenant: { tenantId: TENANT_ID }, error: null })),
}))

import { supabaseAdmin } from '@/lib/supabase'
import { POST } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase

beforeEach(() => {
  fake._store.clear()
  fake._seed('bank_accounts', [{ id: ACCOUNT_ID, tenant_id: TENANT_ID, entity_id: ENTITY_ID } as Row])
})

const CSV = 'Date,Description,Amount\n2026-07-01,Office Supplies,-25.00\n'

function importReq(): Request {
  const form = new FormData()
  form.set('file', new File([CSV], 'statement.csv', { type: 'text/csv' }))
  form.set('bank_account_id', ACCOUNT_ID)
  return new Request('http://x/api/finance/bank-import', { method: 'POST', body: form })
}

describe('POST /api/finance/bank-import — entity_id propagation', () => {
  it('carries the bank account\'s entity_id onto the imported transaction and batch row', async () => {
    const res = await POST(importReq())
    expect((await res.json()).ok).toBe(true)

    const [txn] = fake._all('bank_transactions')
    expect(txn.entity_id).toBe(ENTITY_ID)

    const [batch] = fake._all('bank_import_batches')
    expect(batch.entity_id).toBe(ENTITY_ID)
  })
})
