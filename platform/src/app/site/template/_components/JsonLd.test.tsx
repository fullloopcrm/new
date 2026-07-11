import { describe, it, expect } from 'vitest'
import JsonLd from './JsonLd'

/**
 * Regression: the shared template JSON-LD serializer is fed tenant-controlled
 * fields (e.g. tenant.name via buildBusiness -> schema). A tenant that sets its
 * business name to "</script><script>…</script>" must NOT be able to break out
 * of the <script type="application/ld+json"> block (stored XSS). We escape "<"
 * to "<"; the browser un-escapes it inside the JSON string, so structured
 * data still parses, but the raw closing tag never reaches the HTML.
 */
describe('template JsonLd XSS escaping', () => {
  const PAYLOAD = '</script><script>alert(document.cookie)</script>'

  function renderHtml(data: Record<string, unknown> | Record<string, unknown>[]): string {
    const el = JsonLd({ data })
    return (el.props as { dangerouslySetInnerHTML: { __html: string } })
      .dangerouslySetInnerHTML.__html
  }

  it('neutralizes a </script> payload in tenant.name', () => {
    const html = renderHtml({ '@type': 'LocalBusiness', name: PAYLOAD })

    // No raw "<" survives — so no literal "</script>" or injected "<script>".
    expect(html).not.toContain('<')
    expect(html).not.toContain('</script>')
    expect(html).toContain('\\u003c/script>')
  })

  it('preserves the data once unescaped (JSON still valid + name intact)', () => {
    const html = renderHtml({ '@type': 'LocalBusiness', name: PAYLOAD })

    // Browsers decode < back to "<" when parsing the JSON string literal,
    // so the structured data a crawler sees is unchanged.
    const parsed = JSON.parse(html.replace(/\\u003c/g, '<'))
    expect(parsed[0].name).toBe(PAYLOAD)
  })
})
