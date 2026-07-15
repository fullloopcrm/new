import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import JsonLd from './JsonLd'

/**
 * JsonLd is the shared JSON-LD serializer for the config-driven marketing
 * template. Its values are tenant-derived (business name, url, FAQ copy), so an
 * attacker-controlled tenant field must NOT be able to break out of the
 * <script type="application/ld+json"> block. The only character that can start a
 * closing </script> tag is '<', so we assert '<' is escaped to '<' and that
 * no raw '</script' survives into the rendered HTML.
 */
describe('JsonLd — script-tag breakout prevention', () => {
  const breakout = '</script><script>alert(document.domain)</script>'

  it('escapes < so a tenant value cannot close the script tag', () => {
    const html = renderToStaticMarkup(<JsonLd data={{ name: breakout }} />)
    // No raw closing tag survived (case-insensitive, in case of </ScRiPt>).
    expect(html.toLowerCase()).not.toContain('</script><script>')
    // The escaped form is present instead.
    expect(html).toContain('\\u003c/script')
  })

  it('escapes < in both object and array inputs', () => {
    const single = renderToStaticMarkup(<JsonLd data={{ url: '<b>x' }} />)
    const array = renderToStaticMarkup(<JsonLd data={[{ url: '<b>x' }]} />)
    expect(single).toContain('\\u003cb>x')
    expect(array).toContain('\\u003cb>x')
    expect(single).not.toContain('<b>x')
    expect(array).not.toContain('<b>x')
  })

  it('still emits valid, parseable JSON-LD for benign data', () => {
    const html = renderToStaticMarkup(
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'Organization', name: 'Acme' }} />,
    )
    const json = html.replace(/^.*<script[^>]*>/, '').replace(/<\/script>.*$/, '')
    // Escaped payload round-trips back to the original object once parsed.
    const parsed = JSON.parse(json.replace(/\\u003c/g, '<'))
    expect(parsed[0].name).toBe('Acme')
  })
})
