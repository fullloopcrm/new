import { describe, it, expect } from 'vitest'
import { safeColor } from './safe-color'

describe('safeColor', () => {
  it('allows a plain hex color', () => {
    expect(safeColor('#0d9488', '#000')).toBe('#0d9488')
    expect(safeColor('#fff', '#000')).toBe('#fff')
  })

  it('allows a named color', () => {
    expect(safeColor('teal', '#000')).toBe('teal')
  })

  it('allows a functional color', () => {
    expect(safeColor('rgb(13, 148, 136)', '#000')).toBe('rgb(13, 148, 136)')
    expect(safeColor('hsla(175, 84%, 32%, 0.5)', '#000')).toBe('hsla(175, 84%, 32%, 0.5)')
  })

  it('falls back on a style-attribute breakout payload', () => {
    expect(safeColor('#fff}</style><script>alert(1)</script>', '#000')).toBe('#000')
  })

  it('falls back on a CSS-declaration injection payload (no quote needed)', () => {
    expect(safeColor('red;position:fixed;top:0;left:0;width:100%;height:100%', '#000')).toBe('#000')
  })

  it('falls back on an attribute-breakout payload', () => {
    expect(safeColor('red" onmouseover="alert(1)', '#000')).toBe('#000')
  })

  it('falls back on empty, null, or undefined', () => {
    expect(safeColor('', '#000')).toBe('#000')
    expect(safeColor(null, '#000')).toBe('#000')
    expect(safeColor(undefined, '#000')).toBe('#000')
  })
})
