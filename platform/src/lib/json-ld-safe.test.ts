import { describe, it, expect } from 'vitest'
import { safeJsonLd } from './json-ld-safe'

describe('safeJsonLd', () => {
  it('neutralizes a </script> breakout payload in a string field', () => {
    const payload = { reviewBody: '</script><script>alert(1)</script>' }
    const out = safeJsonLd(payload)
    expect(out).not.toContain('</script>')
    expect(out).not.toContain('<script>')
  })

  it('round-trips to the original value once parsed', () => {
    const payload = { text: '</script><img src=x onerror=alert(1)>', n: 5 }
    const out = safeJsonLd(payload)
    expect(JSON.parse(out)).toEqual(payload)
  })

  it('matches plain JSON.stringify for data with no angle brackets', () => {
    const payload = { name: 'Jane Doe', rating: 5 }
    expect(safeJsonLd(payload)).toBe(JSON.stringify(payload))
  })

  it('escapes every angle bracket, not just the first', () => {
    const out = safeJsonLd({ a: '<b><c>' })
    expect(out).not.toContain('<')
  })
})
