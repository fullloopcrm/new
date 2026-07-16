/**
 * seedHrDefaults — trade-specific HR document requirements (P1/W1 queue item
 * 2, pesticide applicator license gap).
 *
 * ROOT GAP: hr.ts's own comment promised "trade-specific docs (CDL, pesticide
 * applicator license, etc.) are added per-tenant on top of this as extra
 * rows" but TRADE_HR_DOC_REQUIREMENTS never existed and seedHrDefaults never
 * took an industry — every pest tenant's compliance tracker was missing the
 * one document their trade is legally required to keep. Also verifies the
 * fix to the seeding guard: the old `reqCount === 0` check meant a tenant
 * already seeded before a new catalog entry existed would never receive it
 * on a later activation re-run; seeding is now per-doc_type idempotent.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabase: fake, supabaseAdmin: fake, __fake: fake }
})

import { supabaseAdmin } from '@/lib/supabase'
import { seedHrDefaults, DEFAULT_HR_DOC_REQUIREMENTS, TRADE_HR_DOC_REQUIREMENTS } from './hr'

const fake = supabaseAdmin as unknown as FakeSupabase
const TENANT = 't-pest-1'

beforeEach(() => {
  fake._store.clear()
})

describe('TRADE_HR_DOC_REQUIREMENTS', () => {
  it('defines a pesticide applicator license requirement for the pest trade', () => {
    const pestReqs = TRADE_HR_DOC_REQUIREMENTS.pest || []
    const lic = pestReqs.find((r) => r.doc_type === 'pesticide_applicator_license')
    expect(lic).toBeDefined()
    expect(lic?.required).toBe(true)
    expect(lic?.has_expiry).toBe(true) // licenses expire/renew — must feed the compliance-nudge engine
  })
})

describe('seedHrDefaults — industry-specific requirements', () => {
  it('a pest tenant gets the baseline docs plus the applicator license', async () => {
    const result = await seedHrDefaults(TENANT, 'pest')
    expect(result.requirementsSeeded).toBe(DEFAULT_HR_DOC_REQUIREMENTS.length + 1)

    const { data } = await fake.from('hr_document_requirements').select('doc_type').eq('tenant_id', TENANT)
    const docTypes = (data as Array<{ doc_type: string }>).map((r) => r.doc_type)
    expect(docTypes).toContain('pesticide_applicator_license')
  })

  it('a non-pest (or unspecified) tenant does not get the applicator license', async () => {
    await seedHrDefaults(TENANT) // no industry
    const { data } = await fake.from('hr_document_requirements').select('doc_type').eq('tenant_id', TENANT)
    const docTypes = (data as Array<{ doc_type: string }>).map((r) => r.doc_type)
    expect(docTypes).not.toContain('pesticide_applicator_license')
    expect(docTypes.length).toBe(DEFAULT_HR_DOC_REQUIREMENTS.length)
  })

  it('re-running for the same pest tenant does not duplicate any requirement row', async () => {
    await seedHrDefaults(TENANT, 'pest')
    const second = await seedHrDefaults(TENANT, 'pest')
    expect(second.requirementsSeeded).toBe(0)

    const { data } = await fake.from('hr_document_requirements').select('doc_type').eq('tenant_id', TENANT)
    expect((data as unknown[]).length).toBe(DEFAULT_HR_DOC_REQUIREMENTS.length + 1)
  })

  it('a pest tenant seeded BEFORE the license requirement existed picks it up on a later re-run', async () => {
    // Simulate the real-world gap: tenant activated back when only the
    // baseline requirements were seeded (no industry passed at all).
    await seedHrDefaults(TENANT)
    const before = await fake.from('hr_document_requirements').select('doc_type').eq('tenant_id', TENANT)
    expect((before.data as unknown[]).length).toBe(DEFAULT_HR_DOC_REQUIREMENTS.length)

    // Re-activation now passes the tenant's industry — the missing trade doc
    // is backfilled without touching/duplicating the existing baseline rows.
    const result = await seedHrDefaults(TENANT, 'pest')
    expect(result.requirementsSeeded).toBe(1)

    const after = await fake.from('hr_document_requirements').select('doc_type').eq('tenant_id', TENANT)
    const docTypes = (after.data as Array<{ doc_type: string }>).map((r) => r.doc_type)
    expect(docTypes).toContain('pesticide_applicator_license')
    expect(docTypes.length).toBe(DEFAULT_HR_DOC_REQUIREMENTS.length + 1)
  })
})
