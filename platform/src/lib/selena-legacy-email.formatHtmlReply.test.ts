import { describe, it, expect } from 'vitest'
import { formatHtmlReply } from './selena-legacy-email'

describe('formatHtmlReply HTML escaping', () => {
  it('escapes a hostile tenant business name in the automated reply footer', () => {
    const html = formatHtmlReply('Thanks for reaching out!', {
      id: 't1',
      name: '<img src=x onerror=alert(1)>Acme',
      email: 'acme@example.com',
      phone: null,
      resend_api_key: null,
      email_from: null,
      domain: null,
    } as never)

    expect(html).not.toContain('<img src=x onerror=alert(1)>')
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;')
  })
})
