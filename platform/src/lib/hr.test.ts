/**
 * seedHrDefaults — the generic DEFAULT_HR_DOC_REQUIREMENTS baseline was the
 * only thing ever seeded, even though hr.ts's own docstring says trade-
 * specific docs (CDL, pesticide applicator license, etc.) get "added
 * per-tenant on top of this as extra rows" — no code path ever did that add.
 * A dumpster or pest-control tenant activated with zero CDL/license tracking
 * despite the industry being known at activation time. Fixed by threading the
 * tenant's industry into seedHrDefaults and layering TRADE_HR_DOC_REQUIREMENTS
 * on top, self-healingly (backfills onto an already-seeded tenant too, not
 * just a one-shot "if empty" gate).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

const TENANT_A = 'tenant-a'

vi.mock('./supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})

import { supabaseAdmin } from './supabase'
import { seedHrDefaults, DEFAULT_HR_DOC_REQUIREMENTS, TRADE_HR_DOC_REQUIREMENTS } from './hr'

const fake = supabaseAdmin as unknown as FakeSupabase

beforeEach(() => {
  fake._store.clear()
})

describe('seedHrDefaults — trade-specific doc requirements', () => {
  it('seeds only the generic baseline for a tenant with no industry', async () => {
    const result = await seedHrDefaults(TENANT_A)
    expect(result.requirementsSeeded).toBe(DEFAULT_HR_DOC_REQUIREMENTS.length)

    const { data } = await fake.from('hr_document_requirements').select('doc_type').eq('tenant_id', TENANT_A)
    const types = (data as Array<{ doc_type: string }>).map((r) => r.doc_type)
    expect(types).not.toContain('cdl')
  })

  it('seeds generic baseline + trade-specific docs together for a regulated industry', async () => {
    const result = await seedHrDefaults(TENANT_A, 'dumpster')
    expect(result.requirementsSeeded).toBe(DEFAULT_HR_DOC_REQUIREMENTS.length + 1)

    const { data } = await fake.from('hr_document_requirements').select('doc_type').eq('tenant_id', TENANT_A)
    const types = (data as Array<{ doc_type: string }>).map((r) => r.doc_type)
    expect(types).toContain('cdl')
    expect(types).toContain('w9')
  })

  it('does not seed trade docs for an industry with no compliance mapping', async () => {
    await seedHrDefaults(TENANT_A, 'cleaning')
    const { data } = await fake.from('hr_document_requirements').select('doc_type').eq('tenant_id', TENANT_A)
    expect((data as Array<{ doc_type: string }>).length).toBe(DEFAULT_HR_DOC_REQUIREMENTS.length)
  })

  it('backfills the missing trade doc onto a tenant already seeded before the industry was known', async () => {
    // Simulates a tenant activated before this fix (or before the operator set
    // a trade): generic baseline already present, no trade rows.
    await seedHrDefaults(TENANT_A)
    const first = await fake.from('hr_document_requirements').select('doc_type').eq('tenant_id', TENANT_A)
    expect((first.data as Array<{ doc_type: string }>).length).toBe(DEFAULT_HR_DOC_REQUIREMENTS.length)

    const result = await seedHrDefaults(TENANT_A, 'pest')
    expect(result.requirementsSeeded).toBe(1) // only the missing trade row, not a re-seed of the generic 6

    const { data } = await fake.from('hr_document_requirements').select('doc_type').eq('tenant_id', TENANT_A)
    const types = (data as Array<{ doc_type: string }>).map((r) => r.doc_type)
    expect(types).toContain('pesticide_applicator_license')
    expect(types.filter((t) => t === 'w9').length).toBe(1) // generic baseline not duplicated
  })

  it('is a no-op when everything for the industry is already seeded', async () => {
    await seedHrDefaults(TENANT_A, 'hvac')
    const result = await seedHrDefaults(TENANT_A, 'hvac')
    expect(result.requirementsSeeded).toBe(0)
  })

  it('every TRADE_HR_DOC_REQUIREMENTS doc_type is unique and distinct from the generic baseline', () => {
    const genericTypes = new Set(DEFAULT_HR_DOC_REQUIREMENTS.map((r) => r.doc_type))
    const tradeTypes = Object.values(TRADE_HR_DOC_REQUIREMENTS).flat().map((r) => r.doc_type)
    for (const t of tradeTypes) expect(genericTypes.has(t)).toBe(false)
  })
})
