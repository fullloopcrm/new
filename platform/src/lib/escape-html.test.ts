import { describe, it, expect } from 'vitest'
import { escapeHtml } from './escape-html'

describe('escapeHtml', () => {
  it('neutralizes a script-tag injection payload', () => {
    const payload = `<script>alert('xss')</script>`
    const out = escapeHtml(payload)
    expect(out).toBe('&lt;script&gt;alert(&#039;xss&#039;)&lt;/script&gt;')
    expect(out).not.toContain('<script>')
  })

  it('escapes all five HTML-significant characters', () => {
    expect(escapeHtml(`& < > " '`)).toBe('&amp; &lt; &gt; &quot; &#039;')
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
