import { describe, it, expect } from 'vitest'
import { escapeHtml, safeUrl } from './escape-html'

describe('escapeHtml', () => {
  it('neutralizes a script-tag injection payload', () => {
    const payload = `<script>alert('xss')</script>`
    const out = escapeHtml(payload)
    expect(out).toBe('&lt;script&gt;alert(&#39;xss&#39;)&lt;/script&gt;')
    expect(out).not.toContain('<script>')
  })

  it('escapes all five HTML-significant characters', () => {
    expect(escapeHtml(`& < > " '`)).toBe('&amp; &lt; &gt; &quot; &#39;')
  })

  it('escapes an attribute-breakout payload', () => {
    // e.g. a name interpolated into an admin email that tries to break out
    const payload = `" onmouseover="alert(1)`
    expect(escapeHtml(payload)).toBe('&quot; onmouseover=&quot;alert(1)')
  })

  it('escapes ampersand first so entities are not double-encoded incorrectly', () => {
    expect(escapeHtml('a & <b>')).toBe('a &amp; &lt;b&gt;')
  })

  it('returns an empty string for null and undefined', () => {
    expect(escapeHtml(null)).toBe('')
    expect(escapeHtml(undefined)).toBe('')
  })

  it('coerces non-string values to their string form', () => {
    expect(escapeHtml(42)).toBe('42')
    expect(escapeHtml(true)).toBe('true')
  })

  it('leaves plain text untouched', () => {
    expect(escapeHtml('Jane Doe')).toBe('Jane Doe')
  })

  it('renders a name containing an ampersand as valid HTML (no visual regression)', () => {
    // "Bob & Co" must still read as "Bob & Co" once the browser decodes it.
    expect(escapeHtml('Bob & Co')).toBe('Bob &amp; Co')
  })
})

describe('safeUrl', () => {
  it('passes through an https URL, escaped', () => {
    expect(safeUrl('https://example.com/a?b=1&c=2')).toBe('https://example.com/a?b=1&amp;c=2')
  })

  it('allows http, mailto, tel, and sms schemes', () => {
    expect(safeUrl('http://example.com')).toBe('http://example.com')
    expect(safeUrl('mailto:a@b.com')).toBe('mailto:a@b.com')
    expect(safeUrl('tel:+15551234567')).toBe('tel:+15551234567')
    expect(safeUrl('sms:+15551234567')).toBe('sms:+15551234567')
  })

  it('allows a scheme-relative or relative URL', () => {
    expect(safeUrl('/dashboard/foo')).toBe('/dashboard/foo')
    expect(safeUrl('//cdn.example.com/x.png')).toBe('//cdn.example.com/x.png')
  })

  it('blocks javascript: and data: schemes', () => {
    expect(safeUrl('javascript:alert(1)')).toBe('#')
    expect(safeUrl('JAVASCRIPT:alert(1)')).toBe('#')
    expect(safeUrl('data:text/html,<script>alert(1)</script>')).toBe('#')
  })

  it('escapes an attribute-breakout attempt inside an otherwise-safe URL', () => {
    expect(safeUrl('https://example.com/"onmouseover="alert(1)')).toBe(
      'https://example.com/&quot;onmouseover=&quot;alert(1)',
    )
  })

  it('returns # for empty, null, or undefined', () => {
    expect(safeUrl('')).toBe('#')
    expect(safeUrl(null)).toBe('#')
    expect(safeUrl(undefined)).toBe('#')
  })
})
