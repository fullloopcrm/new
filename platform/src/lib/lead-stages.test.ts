import { describe, it, expect } from 'vitest'
import {
  normalizeStage,
  isLeadStage,
  PIPELINE_STAGES,
  STAGE_LABELS,
} from './lead-stages'

/**
 * Sales-pipeline stage normalization. The column is free-text, so normalizeStage
 * must (a) pass canonical stages through, (b) translate legacy values via the
 * fixed map, and (c) default anything else to 'new'. Assertions pin the exact
 * translated stage, so breaking the legacy map or the fallback fails the test.
 */
describe('normalizeStage', () => {
  it('passes canonical stages through unchanged', () => {
    expect(normalizeStage('new')).toBe('new')
    expect(normalizeStage('contacted')).toBe('contacted')
    expect(normalizeStage('qualified')).toBe('qualified')
    expect(normalizeStage('proposed')).toBe('proposed')
    expect(normalizeStage('sold')).toBe('sold')
    expect(normalizeStage('lost')).toBe('lost')
  })

  it('translates legacy values via the fixed map', () => {
    expect(normalizeStage('pending')).toBe('new')
    expect(normalizeStage('approved')).toBe('qualified')
    expect(normalizeStage('rejected')).toBe('lost')
    expect(normalizeStage('onboarded')).toBe('sold')
  })

  it('defaults unknown / empty input to new', () => {
    expect(normalizeStage('zzz')).toBe('new')
    expect(normalizeStage('')).toBe('new')
    expect(normalizeStage(null)).toBe('new')
    expect(normalizeStage(undefined)).toBe('new')
  })
})

describe('isLeadStage', () => {
  it('accepts only canonical stage strings', () => {
    expect(isLeadStage('new')).toBe(true)
    expect(isLeadStage('lost')).toBe(true)
  })

  it('rejects legacy values, non-stages, and non-strings', () => {
    expect(isLeadStage('pending')).toBe(false) // legacy, not canonical
    expect(isLeadStage('onboarded')).toBe(false)
    expect(isLeadStage(123)).toBe(false)
    expect(isLeadStage(null)).toBe(false)
    expect(isLeadStage(undefined)).toBe(false)
  })
})

describe('pipeline constants', () => {
  it('excludes the terminal lost stage from the ordered pipeline', () => {
    expect(PIPELINE_STAGES).toEqual(['new', 'contacted', 'qualified', 'proposed', 'sold'])
    expect(PIPELINE_STAGES).not.toContain('lost')
  })

  it('labels every stage', () => {
    expect(STAGE_LABELS.sold).toBe('Sold')
    expect(STAGE_LABELS.lost).toBe('Lost')
    expect(STAGE_LABELS.new).toBe('New')
  })
})
