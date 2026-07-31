import { describe, it, expect } from 'vitest'
import { validateTailoredEdits, buildPrompt, type SeededServiceRow } from './draft-tailored-services'

/**
 * validateTailoredEdits — Phase B verification (per the deep business-type-
 * aware auto-build-out plan): this is the constrained-output guarantee that
 * makes it safe to apply the AI's response directly instead of surfacing it
 * as a suggestion. It must reject WHOLESALE (not partially) any response
 * that isn't an exact 1:1 reorder/rename/deactivate of the original seeded
 * row set — no invented ids, no missing ids, no duplicates, no malformed
 * shape. Nothing here ever exercises the live Anthropic call (draftTailoredServices
 * itself, which does, is intentionally out of scope for a unit test — it's a
 * thin DB+network wrapper around this pure validator).
 */

const ORIGINAL_ROWS: SeededServiceRow[] = [
  { id: 'row-1', name: 'Interior Painting', description: 'Walls, ceilings, trim', active: true, sort_order: 1 },
  { id: 'row-2', name: 'Exterior Painting', description: 'Full exterior repaint', active: true, sort_order: 2 },
  { id: 'row-3', name: 'Cabinet Refinishing', description: 'Kitchen cabinet paint/refinish', active: true, sort_order: 3 },
]

function validReorder(): unknown[] {
  return [
    { id: 'row-2', name: 'Exterior House Painting', sort_order: 1, active: true },
    { id: 'row-1', name: 'Interior Painting', sort_order: 2, active: true },
    { id: 'row-3', name: 'Cabinet Refinishing', sort_order: 3, active: false },
  ]
}

describe('validateTailoredEdits — constrained-output guarantee', () => {
  it('accepts an exact 1:1 reorder/rename/deactivate of the original rows', () => {
    const edits = validateTailoredEdits(validReorder(), ORIGINAL_ROWS)

    expect(edits).not.toBeNull()
    expect(edits).toHaveLength(3)
    expect(edits!.find((e) => e.id === 'row-2')?.name).toBe('Exterior House Painting')
    expect(edits!.find((e) => e.id === 'row-3')?.active).toBe(false)
  })

  it('rejects wholesale a response that references an id not in the original seeded set', () => {
    const tampered = [
      ...validReorder().slice(0, 2),
      { id: 'row-999-invented', name: 'Fabricated Service', sort_order: 3, active: true },
    ]

    const edits = validateTailoredEdits(tampered, ORIGINAL_ROWS)

    expect(edits).toBeNull()
  })

  it('rejects wholesale when an id is silently omitted (fewer rows than original)', () => {
    const truncated = validReorder().slice(0, 2) // only 2 of 3 original rows

    const edits = validateTailoredEdits(truncated, ORIGINAL_ROWS)

    expect(edits).toBeNull()
  })

  it('rejects wholesale when the same id is duplicated', () => {
    const duplicated = [
      { id: 'row-1', name: 'Interior Painting', sort_order: 1, active: true },
      { id: 'row-1', name: 'Interior Painting Again', sort_order: 2, active: true },
      { id: 'row-3', name: 'Cabinet Refinishing', sort_order: 3, active: true },
    ]

    const edits = validateTailoredEdits(duplicated, ORIGINAL_ROWS)

    expect(edits).toBeNull()
  })

  it('rejects a non-array top-level response', () => {
    expect(validateTailoredEdits({ not: 'an array' }, ORIGINAL_ROWS)).toBeNull()
    expect(validateTailoredEdits(null, ORIGINAL_ROWS)).toBeNull()
    expect(validateTailoredEdits('a string', ORIGINAL_ROWS)).toBeNull()
  })

  it('rejects a response with more rows than the original set', () => {
    const withExtra = [
      ...validReorder(),
      { id: 'row-1', name: 'Interior Painting', sort_order: 4, active: true }, // id reused too
    ]

    const edits = validateTailoredEdits(withExtra, ORIGINAL_ROWS)

    expect(edits).toBeNull()
  })

  it('rejects an entry missing a required field', () => {
    const missingName = [
      { id: 'row-1', sort_order: 1, active: true },
      { id: 'row-2', name: 'Exterior Painting', sort_order: 2, active: true },
      { id: 'row-3', name: 'Cabinet Refinishing', sort_order: 3, active: true },
    ]

    expect(validateTailoredEdits(missingName, ORIGINAL_ROWS)).toBeNull()
  })

  it('rejects wrong field types (sort_order as a string, active as a string)', () => {
    const wrongTypes = [
      { id: 'row-1', name: 'Interior Painting', sort_order: '1', active: true },
      { id: 'row-2', name: 'Exterior Painting', sort_order: 2, active: 'true' },
      { id: 'row-3', name: 'Cabinet Refinishing', sort_order: 3, active: true },
    ]

    expect(validateTailoredEdits(wrongTypes, ORIGINAL_ROWS)).toBeNull()
  })

  it('rejects an empty-string name (rename to nothing)', () => {
    const emptyName = [
      { id: 'row-1', name: '   ', sort_order: 1, active: true },
      { id: 'row-2', name: 'Exterior Painting', sort_order: 2, active: true },
      { id: 'row-3', name: 'Cabinet Refinishing', sort_order: 3, active: true },
    ]

    expect(validateTailoredEdits(emptyName, ORIGINAL_ROWS)).toBeNull()
  })

  it('never carries price/duration fields through even if the AI response includes them', () => {
    const withExtraFields = [
      { id: 'row-1', name: 'Interior Painting', sort_order: 1, active: true, price_cents: 999999, default_hourly_rate: 1 },
      { id: 'row-2', name: 'Exterior Painting', sort_order: 2, active: true },
      { id: 'row-3', name: 'Cabinet Refinishing', sort_order: 3, active: true },
    ]

    const edits = validateTailoredEdits(withExtraFields, ORIGINAL_ROWS)

    expect(edits).not.toBeNull()
    expect(edits![0]).toEqual({ id: 'row-1', name: 'Interior Painting', sort_order: 1, active: true })
    expect(Object.keys(edits![0])).toEqual(['id', 'name', 'sort_order', 'active'])
  })
})

describe('buildPrompt — hard-rules framing', () => {
  it('includes every original id, the trade, and the business description in the prompt', () => {
    const prompt = buildPrompt('Acme Painting Co', 'painting', 'We specialize in historic homes', ORIGINAL_ROWS)

    expect(prompt).toContain('row-1')
    expect(prompt).toContain('row-2')
    expect(prompt).toContain('row-3')
    expect(prompt).toContain('painting')
    expect(prompt).toContain('Acme Painting Co')
    expect(prompt).toContain('We specialize in historic homes')
    expect(prompt).toContain('Never invent a new "id"')
  })

  it('falls back to a generic-tone note when no business description is provided', () => {
    const prompt = buildPrompt('Acme Painting Co', 'painting', '', ORIGINAL_ROWS)

    expect(prompt).toContain('not provided')
  })
})
