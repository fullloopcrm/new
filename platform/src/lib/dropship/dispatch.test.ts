import { describe, it, expect } from 'vitest'
import { resolveSku } from './dispatch'

describe('resolveSku', () => {
  const product = {
    dropship_external_sku: 'PRODUCT-LEVEL-SKU',
    dropship_external_variant_id: 'PRODUCT-LEVEL-VID',
    dropship_variant_skus: {
      'Black|Large': { externalSku: 'BLK-L', externalVariantId: 'v-blk-l' },
      'Red|Small': { externalSku: 'RED-S', externalVariantId: null },
    },
  }

  it('returns null SKUs when there is no matching product', () => {
    expect(resolveSku({ color: 'Black', size: 'Large' }, undefined)).toEqual({
      externalSku: null,
      externalVariantId: null,
    })
  })

  it('resolves the variant-specific SKU when the color/size combo matches', () => {
    expect(resolveSku({ color: 'Black', size: 'Large' }, product)).toEqual({
      externalSku: 'BLK-L',
      externalVariantId: 'v-blk-l',
    })
  })

  it('falls back to null externalVariantId when the variant entry omits one', () => {
    expect(resolveSku({ color: 'Red', size: 'Small' }, product)).toEqual({
      externalSku: 'RED-S',
      externalVariantId: null,
    })
  })

  it('falls back to the product-level SKU when the combo has no variant entry', () => {
    expect(resolveSku({ color: 'Blue', size: 'XL' }, product)).toEqual({
      externalSku: 'PRODUCT-LEVEL-SKU',
      externalVariantId: 'PRODUCT-LEVEL-VID',
    })
  })

  it('falls back to the product-level SKU for a non-variant item (no color/size)', () => {
    expect(resolveSku({ color: null, size: null }, product)).toEqual({
      externalSku: 'PRODUCT-LEVEL-SKU',
      externalVariantId: 'PRODUCT-LEVEL-VID',
    })
  })

  it('falls back to the product-level SKU when only one of color/size is set and unmatched', () => {
    expect(resolveSku({ color: 'Black', size: null }, product)).toEqual({
      externalSku: 'PRODUCT-LEVEL-SKU',
      externalVariantId: 'PRODUCT-LEVEL-VID',
    })
  })

  it('does not fall back when the variant map has an entry with an empty SKU', () => {
    const productWithEmptyEntry = {
      ...product,
      dropship_variant_skus: { 'Black|Large': { externalSku: '', externalVariantId: null } },
    }
    // An entry exists for the key but externalSku is falsy, so this should
    // still fall back to the product-level SKU rather than dispatching a
    // blank SKU to the supplier.
    expect(resolveSku({ color: 'Black', size: 'Large' }, productWithEmptyEntry)).toEqual({
      externalSku: 'PRODUCT-LEVEL-SKU',
      externalVariantId: 'PRODUCT-LEVEL-VID',
    })
  })
})
