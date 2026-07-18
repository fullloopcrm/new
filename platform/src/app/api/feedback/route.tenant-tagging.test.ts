import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * POST /api/feedback tenant tagging + admin fan-out.
 *
 * Dashboard feedback submissions are authenticated, so each row now gets
 * tagged with the sending tenant instead of staying anonymous. Public
 * marketing-site widget submissions carry no session and stay tenant_id:
 * null, same as before. Either way, admin still gets notified on all three
 * channels (email, in-app notifications row, Telegram) — best-effort, never
 * blocking the response.
 */

const rateLimitDb = vi.fn(async (_bucket: string, _max: number, _windowMs: number) => ({ allowed: true, remaining: 4 }))
vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb: (bucket: string, max: number, windowMs: number) => rateLimitDb(bucket, max, windowMs) }))

const sendEmail = vi.fn(async (_input: Record<string, unknown>) => ({ success: true }))
vi.mock('@/lib/email', () => ({ sendEmail: (input: Record<string, unknown>) => sendEmail(input) }))

vi.mock('@/lib/require-admin', () => ({ requireAdmin: vi.fn(async () => null) }))

const alertOwner = vi.fn(async (_subject: string, _detail?: string) => null)
vi.mock('@/lib/telegram', () => ({ alertOwner: (subject: string, detail?: string) => alertOwner(subject, detail) }))

const getTenantForRequest = vi.fn()
vi.mock('@/lib/tenant-query', () => ({ getTenantForRequest: () => getTenantForRequest() }))

const inserts: Array<{ table: string; payload: Record<string, unknown> }> = []
const supabaseFrom = vi.fn((table: string) => ({
  insert: async (payload: Record<string, unknown>) => {
    inserts.push({ table, payload })
    return { error: null }
  },
}))
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: { from: (table: string) => supabaseFrom(table) },
}))

function fakeRequest(body: Record<string, unknown>) {
  return {
    headers: { get: () => '1.2.3.4' },
    json: async () => body,
  } as unknown as Request
}

beforeEach(() => {
  inserts.length = 0
  rateLimitDb.mockClear()
  sendEmail.mockClear()
  alertOwner.mockClear()
  supabaseFrom.mockClear()
  getTenantForRequest.mockReset()
})

describe('POST /api/feedback — tenant tagging + admin fan-out', () => {
  it('tags the row with tenant_id and names the tenant when a session is present', async () => {
    getTenantForRequest.mockResolvedValue({
      tenantId: 't-1',
      tenant: { id: 't-1', name: 'Sparkle Cleaning' },
    })
    const { POST } = await import('./route')
    const res = await POST(fakeRequest({ message: 'love the new dashboard', category: 'praise' }))

    expect(res.status).toBe(201)
    const feedbackInsert = inserts.find((i) => i.table === 'platform_feedback')
    expect(feedbackInsert?.payload.tenant_id).toBe('t-1')

    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({
      subject: expect.stringContaining('Sparkle Cleaning'),
    }))

    const notifInsert = inserts.find((i) => i.table === 'notifications')
    expect(notifInsert?.payload).toMatchObject({
      tenant_id: 't-1',
      type: 'platform_feedback',
      recipient_type: 'admin',
    })

    expect(alertOwner).toHaveBeenCalledWith(
      expect.stringContaining('Sparkle Cleaning'),
      expect.stringContaining('love the new dashboard'),
    )
  })

  it('stays anonymous (tenant_id null, no in-app notification) when there is no session', async () => {
    getTenantForRequest.mockRejectedValue(new Error('Unauthorized'))
    const { POST } = await import('./route')
    const res = await POST(fakeRequest({ message: 'anonymous widget feedback', category: 'general' }))

    expect(res.status).toBe(201)
    const feedbackInsert = inserts.find((i) => i.table === 'platform_feedback')
    expect(feedbackInsert?.payload.tenant_id).toBeNull()

    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({
      subject: expect.stringContaining('Anonymous'),
    }))

    expect(inserts.find((i) => i.table === 'notifications')).toBeUndefined()
    expect(alertOwner).toHaveBeenCalledWith(expect.stringContaining('Anonymous'), expect.any(String))
  })
})
