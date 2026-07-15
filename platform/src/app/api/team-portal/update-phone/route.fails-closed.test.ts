import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * /api/team-portal/update-phone lets a cleaner rewrite team_members.phone
 * with no login — the ONLY gate is the signed link token from
 * cron/phone-fixup. If ADMIN_PASSWORD is unconfigured, the pre-fix signer
 * used `|| ''` and would silently mint (and this route would silently
 * accept) a token signed with an empty-string key — a forged token for any
 * known team_member_id would pass. Proves the route now 400s instead of
 * writing to team_members when the signing secret is missing.
 */

let updateCalled: boolean

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === 'team_members') {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({ data: { id: 'member-1', email: 'cleaner@example.com' }, error: null }),
            }),
          }),
          update: () => {
            updateCalled = true
            return { eq: async () => ({ error: null }) }
          },
        }
      }
      if (table === 'cleaner_applications') {
        return { update: () => ({ eq: async () => ({ error: null }) }) }
      }
      throw new Error(`unexpected table: ${table}`)
    },
  },
}))

function jsonReq(body: unknown): Request {
  return { json: async () => body } as unknown as Request
}

beforeEach(() => {
  vi.resetModules()
  updateCalled = false
})

describe('team-portal/update-phone — fails closed when ADMIN_PASSWORD is unconfigured', () => {
  it('rejects a token forged with the empty-secret default (400, no DB write)', async () => {
    delete process.env.ADMIN_PASSWORD
    const { createHmac } = await import('crypto')
    const expiry = Date.now() + 60 * 60 * 1000
    const payload = `member-1.${expiry}`
    const forgedSig = createHmac('sha256', '').update(payload).digest('hex')
    const forgedToken = `${payload}.${forgedSig}`

    const { POST } = await import('./route')
    const res = await POST(jsonReq({ token: forgedToken, phone: '9175551234' }))

    expect(res.status).toBe(400)
    expect(updateCalled).toBe(false)
  })

  it('control: a validly-minted token is accepted once ADMIN_PASSWORD is configured', async () => {
    process.env.ADMIN_PASSWORD = 'test-admin-password'
    const { createPhoneFixupToken } = await import('@/lib/nycmaid/phone-fixup-token')
    const token = createPhoneFixupToken('member-1', Date.now() + 60 * 60 * 1000)

    const { POST } = await import('./route')
    const res = await POST(jsonReq({ token, phone: '9175551234' }))

    expect(res.status).toBe(200)
    expect(updateCalled).toBe(true)
  })
})
