import { describe, it, expect } from 'vitest'
import { renderAssistantMarkdown } from './render-assistant-markdown'

describe('renderAssistantMarkdown', () => {
  it('applies **bold** transform', () => {
    expect(renderAssistantMarkdown('a **bold** word')).toBe(
      'a <strong>bold</strong> word',
    )
  })

  it('converts newlines to <br />', () => {
    expect(renderAssistantMarkdown('line1\nline2')).toBe('line1<br />line2')
  })

  it('escapes a script tag before transforming (no raw HTML executes)', () => {
    expect(renderAssistantMarkdown('<script>alert(1)</script>')).toBe(
      '&lt;script&gt;alert(1)&lt;/script&gt;',
    )
  })

  it('neutralizes an img onerror payload embedded in content', () => {
    const out = renderAssistantMarkdown('<img src=x onerror="alert(1)">')
    expect(out).not.toContain('<img')
    expect(out).toContain('&lt;img')
  })

  it('escapes user-injected tags even inside bold markers', () => {
    // The escape runs first, so the injected tag is inert; only <strong> is real.
    expect(renderAssistantMarkdown('**<b>x</b>**')).toBe(
      '<strong>&lt;b&gt;x&lt;/b&gt;</strong>',
    )
  })

  it('escapes ampersands', () => {
    expect(renderAssistantMarkdown('Tom & Jerry')).toBe('Tom &amp; Jerry')
  })
})
