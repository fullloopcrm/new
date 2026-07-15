import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { JsonLd } from './schema'

/**
 * W4 broad-hunt: JsonLd renders JSON.stringify(data) via dangerouslySetInnerHTML
 * into a <script type="application/ld+json"> tag. JSON.stringify does NOT escape
 * '<', so a field containing the literal sequence '</script>' closes the tag
 * early -- the HTML parser doesn't care it's inside a JSON string -- letting
 * arbitrary markup after it execute. Any schema field sourced from
 * admin-editable tenant content (business name, FAQ answers, etc.) is a
 * potential injection point into every visitor's page.
 */
describe('JsonLd', () => {
  it('never emits a literal "</script>" even when a field contains one', () => {
    const payload = {
      '@type': 'Organization',
      name: '</script><script>window.__pwned = true</script>',
    }
    const { container } = render(<JsonLd data={payload} />)
    const script = container.querySelector('script[type="application/ld+json"]')
    expect(script).toBeTruthy()
    expect(script!.innerHTML).not.toContain('</script><script>')
    // The escaped payload still round-trips to the original string via JSON.parse.
    expect(JSON.parse(script!.innerHTML).name).toBe(payload.name)
  })
})
