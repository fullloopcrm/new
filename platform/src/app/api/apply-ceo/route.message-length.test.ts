import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * POST /api/apply-ceo's rateLimitDb (3/10min per tenant+ip) bounds request
 * COUNT, not the SIZE of its 7 long-form free-text questionnaire fields --
 * a single call inside that cap could still stuff an arbitrarily large
 * string into management_applications.notes (via buildNotes()) and the
 * admin notify() message. Same class as the chat/yinez/feedback
 * message-length caps, ported here via the shared maxLengthError() helper.
 */

vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb: vi.fn(async () => ({ allowed: true })) }))
vi.mock('@/lib/tenant-site', () => ({
  getTenantFromHeaders: vi.fn(async () => ({ id: 'tid-a', name: 'Acme', selena_config: {} })),
}))
const notify = vi.fn(async (..._args: unknown[]) => ({ success: true }))
vi.mock('@/lib/notify', () => ({ notify: (...args: unknown[]) => notify(...args) }))
vi.mock('@/lib/email', () => ({ sendEmail: vi.fn(async () => ({ success: true })) }))
const supabaseFrom = vi.fn()
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (...args: unknown[]) => supabaseFrom(...args) } }))

import { POST } from './route'

function req(body: Record<string, unknown>) {
  return new Request('http://t/api/apply-ceo', { method: 'POST', body: JSON.stringify(body) })
}

const BASE = { name: 'Jane', email: 'jane@example.com', phone: '5551234567' }

beforeEach(() => {
  notify.mockClear()
  supabaseFrom.mockReset()
  supabaseFrom.mockReturnValue({
    insert: () => ({ select: () => ({ single: async () => ({ data: { id: 'app-1' }, error: null }) }) }),
  })
})

describe('POST /api/apply-ceo — questionnaire field length cap', () => {
  it('rejects when any one of the 7 long-form fields exceeds 5000 characters', async () => {
    const res = await POST(req({ ...BASE, plan306090: 'a'.repeat(5001) }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/too long/i)
    expect(supabaseFrom).not.toHaveBeenCalled()
    expect(notify).not.toHaveBeenCalled()
  })

  it('accepts every field exactly at the 5000 character boundary', async () => {
    const res = await POST(req({
      ...BASE,
      marketplaceBackground: 'a'.repeat(5000),
      otherPlatforms: 'b'.repeat(5000),
      plExperience: 'c'.repeat(5000),
      biggestScale: 'd'.repeat(5000),
      whySweatEquity: 'e'.repeat(5000),
      plan306090: 'f'.repeat(5000),
      anythingElse: 'g'.repeat(5000),
    }))
    expect(res.status).toBe(200)
  })

  it('accepts normal-length answers', async () => {
    const res = await POST(req({ ...BASE, plan306090: 'Ship the roadmap, then iterate.' }))
    expect(res.status).toBe(200)
  })

  // Prior round only capped the 7 long-form questionnaire fields; the
  // shorter identity/context fields (currentCompany, location, etc.) fed
  // into buildNotes() the same way and were left unbounded.
  it('rejects when currentCompany (a previously-uncapped field) exceeds 5000 characters', async () => {
    const res = await POST(req({ ...BASE, currentCompany: 'a'.repeat(5001) }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/too long/i)
    expect(supabaseFrom).not.toHaveBeenCalled()
  })
})
