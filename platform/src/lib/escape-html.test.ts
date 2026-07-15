import { describe, it, expect } from 'vitest'
import { escapeHtml, safeUrl, safeJsonLd } from './escape-html'

describe('escapeHtml', () => {
  it('escapes the five HTML-significant characters', () => {
    expect(escapeHtml(`<>&"'`)).toBe('&lt;&gt;&amp;&quot;&#39;')
  })

  it('neutralizes a script tag', () => {
    expect(escapeHtml('<script>alert(1)</script>')).toBe(
      '&lt;script&gt;alert(1)&lt;/script&gt;',
    )
  })

  it('neutralizes an img onerror payload', () => {
    expect(escapeHtml('<img src=x onerror="alert(1)">')).toBe(
      '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;',
    )
  })

  it('escapes & first so entities are not double-decoded', () => {
    expect(escapeHtml('a & b')).toBe('a &amp; b')
    expect(escapeHtml('&lt;')).toBe('&amp;lt;')
  })

  it('coerces null/undefined to empty string', () => {
    expect(escapeHtml(null)).toBe('')
    expect(escapeHtml(undefined)).toBe('')
  })

  it('leaves plain text untouched', () => {
    expect(escapeHtml('Jane Doe')).toBe('Jane Doe')
  })
})

describe('safeUrl', () => {
  it('passes through http(s) URLs', () => {
    expect(safeUrl('https://example.com/pay')).toBe('https://example.com/pay')
    expect(safeUrl('http://example.com')).toBe('http://example.com')
  })

  it('encodes ampersands in query strings for attribute safety', () => {
    expect(safeUrl('https://x.com/?a=1&b=2')).toBe('https://x.com/?a=1&amp;b=2')
  })

  it('blocks javascript: scheme', () => {
    expect(safeUrl('javascript:alert(1)')).toBe('#')
    expect(safeUrl('JavaScript:alert(1)')).toBe('#')
  })

  it('blocks data: scheme', () => {
    expect(safeUrl('data:text/html,<script>alert(1)</script>')).toBe('#')
  })

  it('prevents attribute breakout via quotes', () => {
    expect(safeUrl('https://x.com/"><script>alert(1)</script>')).toBe(
      'https://x.com/&quot;&gt;&lt;script&gt;alert(1)&lt;/script&gt;',
    )
  })

  it('allows mailto/tel/sms', () => {
    expect(safeUrl('mailto:a@b.com')).toBe('mailto:a@b.com')
    expect(safeUrl('tel:+15551234567')).toBe('tel:+15551234567')
  })

  it('returns # for empty/nullish input', () => {
    expect(safeUrl('')).toBe('#')
    expect(safeUrl(null)).toBe('#')
    expect(safeUrl(undefined)).toBe('#')
  })

  it('allows relative and anchor URLs', () => {
    expect(safeUrl('/dashboard')).toBe('/dashboard')
  })
})

describe('safeJsonLd', () => {
  it('produces valid JSON that round-trips', () => {
    const data = { '@type': 'Organization', name: 'Acme' }
    expect(JSON.parse(safeJsonLd(data))).toEqual(data)
  })

  it('escapes < so a </script> in a value cannot break out of the script tag', () => {
    const out = safeJsonLd({ name: 'Acme</script><script>alert(1)</script>' })
    // no literal `<` survives — the HTML parser's script-close scan needs `</`,
    // so escaping `<` alone (not `>`) is sufficient to prevent breakout.
    expect(out).not.toContain('</script>')
    expect(out).not.toContain('<script>')
    expect(out).not.toContain('<')
    expect(out).toContain('\\u003c/script>')
  })

  it('escapes a bare < angle bracket in any string value', () => {
    expect(safeJsonLd({ a: '1 < 2' })).toBe('{"a":"1 \\u003c 2"}')
  })

  it('the escaped output still parses back to the original string', () => {
    const original = '</script><img src=x onerror=alert(1)>'
    const parsed = JSON.parse(safeJsonLd({ v: original }))
    expect(parsed.v).toBe(original)
  })

  it('serializes arrays (multi-schema @graph style)', () => {
    const arr = [{ '@type': 'A' }, { '@type': 'B</script>' }]
    const out = safeJsonLd(arr)
    expect(out).not.toContain('</script>')
    expect(JSON.parse(out)).toEqual(arr)
  })
})
