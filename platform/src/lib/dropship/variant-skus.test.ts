import { describe, it, expect } from 'vitest'
import { sanitizeVariantSkus } from './variant-skus'

describe('sanitizeVariantSkus', () => {
  it('returns an empty object for non-object input', () => {
    expect(sanitizeVariantSkus(null)).toEqual({})
    expect(sanitizeVariantSkus(undefined)).toEqual({})
    expect(sanitizeVariantSkus('not an object')).toEqual({})
    expect(sanitizeVariantSkus(42)).toEqual({})
  })

  it('drops entries with a missing or empty externalSku', () => {
    expect(
      sanitizeVariantSkus({
        'Black|Large': { externalSku: '', externalVariantId: 'v1' },
        'Red|Small': {},
        'Blue|Medium': { externalVariantId: 'v2' },
      })
    ).toEqual({})
  })

  it('trims whitespace on both fields and keeps valid entries', () => {
    expect(
      sanitizeVariantSkus({
        'Black|Large': { externalSku: '  BLK-L  ', externalVariantId: '  v-blk-l  ' },
      })
    ).toEqual({
      'Black|Large': { externalSku: 'BLK-L', externalVariantId: 'v-blk-l' },
    })
  })

  it('defaults externalVariantId to an empty string when omitted', () => {
    expect(
      sanitizeVariantSkus({
        'Black|Large': { externalSku: 'BLK-L' },
      })
    ).toEqual({
      'Black|Large': { externalSku: 'BLK-L', externalVariantId: '' },
    })
  })

  it('ignores non-object entry values', () => {
    expect(
      sanitizeVariantSkus({
        'Black|Large': 'not an object',
        'Red|Small': { externalSku: 'RED-S' },
      })
    ).toEqual({
      'Red|Small': { externalSku: 'RED-S', externalVariantId: '' },
    })
  })

  it('handles multiple valid entries', () => {
    expect(
      sanitizeVariantSkus({
        'Black|Large': { externalSku: 'BLK-L', externalVariantId: 'v1' },
        'Red|Small': { externalSku: 'RED-S', externalVariantId: 'v2' },
      })
    ).toEqual({
      'Black|Large': { externalSku: 'BLK-L', externalVariantId: 'v1' },
      'Red|Small': { externalSku: 'RED-S', externalVariantId: 'v2' },
    })
  })
})
