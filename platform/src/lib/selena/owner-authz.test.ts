import { it, expect, beforeEach, afterAll, vi } from 'vitest'

/**
 * Owner identity boundary — isOwnerOfTenant (formerly isOwner).
 *
 * isOwner(phone) checked a single GLOBAL OWNER_PHONES env var with NO tenant
 * binding at all: a phone that owned tenant A automatically got owner-only
 * tooling (refunds, broadcasts, business data, admin context — see
 * tools.ts's owner-only gate and agent.ts's loadContext admin-context line)
 * whenever a conversation resolved to tenant B, or any other tenant on the
 * platform. Fixed per the design already documented in
 * migrations/2026_07_11_owner_phone_backfill.sql: nycmaid keeps the legacy
 * global OWNER_PHONES env (preserves existing prod behavior for the
 * flagship); every other tenant is gated by its OWN tenants.owner_phone
 * column, fail-closed (no owner_phone set = no owner via this check).
 */

import type { FakeSupabase } from '@/test/fake-supabase'

const originalOwnerPhones = process.env.OWNER_PHONES

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabase: fake, supabaseAdmin: fake, __fake: fake }
})

import { supabaseAdmin } from '@/lib/supabase'
import { isOwnerOfTenant } from '@/lib/selena/agent'

const fake = supabaseAdmin as unknown as FakeSupabase

const NYCMAID_TENANT_ID = '00000000-0000-0000-0000-000000000001'
const TENANT_A = 'tenant-a'
const TENANT_B = 'tenant-b'

beforeEach(() => {
  fake._store.clear()
  process.env.OWNER_PHONES = '2125551234'
  fake._seed('tenants', [
    { id: NYCMAID_TENANT_ID, owner_phone: null },
    { id: TENANT_A, owner_phone: '3105559999' },
    { id: TENANT_B, owner_phone: '4155558888' },
  ])
})

afterAll(() => {
  process.env.OWNER_PHONES = originalOwnerPhones
})

it("does NOT let tenant A's owner phone act as owner of tenant B", async () => {
  await expect(isOwnerOfTenant('3105559999', TENANT_B)).resolves.toBe(false)
})

it('lets a tenant own its OWN owner_phone', async () => {
  await expect(isOwnerOfTenant('3105559999', TENANT_A)).resolves.toBe(true)
  await expect(isOwnerOfTenant('4155558888', TENANT_B)).resolves.toBe(true)
})

it('does not cross-match with formatting differences (still same-tenant only)', async () => {
  await expect(isOwnerOfTenant('+1 (310) 555-9999', TENANT_A)).resolves.toBe(true)
  await expect(isOwnerOfTenant('+1 (310) 555-9999', TENANT_B)).resolves.toBe(false)
})

it('fails closed for a tenant with no owner_phone set', async () => {
  fake._seed('tenants', [{ id: 'tenant-no-owner', owner_phone: null }])
  await expect(isOwnerOfTenant('3105559999', 'tenant-no-owner')).resolves.toBe(false)
})

it('honors the legacy global OWNER_PHONES env ONLY for the nycmaid tenant', async () => {
  await expect(isOwnerOfTenant('2125551234', NYCMAID_TENANT_ID)).resolves.toBe(true)
})

it("does NOT let the legacy global OWNER_PHONES entry act as owner of a non-nycmaid tenant", async () => {
  await expect(isOwnerOfTenant('2125551234', TENANT_A)).resolves.toBe(false)
})

it('rejects a null/empty phone for every tenant', async () => {
  await expect(isOwnerOfTenant(null, TENANT_A)).resolves.toBe(false)
  await expect(isOwnerOfTenant('', NYCMAID_TENANT_ID)).resolves.toBe(false)
})
