import { describe, it, expect } from 'vitest'
import { renderAssistantMarkdown } from './render-markdown'

/**
 * Regression test for the AI-dashboard reflected-XSS fix. Assistant content is
 * rendered via dangerouslySetInnerHTML; content the AI echoes verbatim (e.g. a
 * client name/message) must be HTML-escaped before the markdown transform.
 */
describe('renderAssistantMarkdown', () => {
  it('escapes an onerror image payload the AI reflected', () => {
    const html = renderAssistantMarkdown('<img src=x onerror=alert(1)>')
    expect(html).not.toContain('<img')
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;')
  })

  it('escapes a script payload', () => {
    const html = renderAssistantMarkdown('<script>alert(1)</script>')
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
  })

  it('still renders **bold** and newlines as the only markup', () => {
    const html = renderAssistantMarkdown('Hello **world**\nsecond line')
    expect(html).toContain('<strong>world</strong>')
    expect(html).toContain('<br />')
  })

  it('does not let injected markup ride inside bold', () => {
    const html = renderAssistantMarkdown('**<b>x</b>**')
    expect(html).toContain('<strong>&lt;b&gt;x&lt;/b&gt;</strong>')
    expect(html).not.toContain('<b>x</b>')
  })
})
