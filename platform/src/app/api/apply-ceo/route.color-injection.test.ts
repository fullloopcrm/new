import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * POST /api/apply-ceo's applicant-confirmation email builds its own ad-hoc
 * HTML (not one of the shared, already-hardened templates) and splices
 * tenant.primary_color verbatim into `style="color:${color}"`. tenant.
 * primary_color is self-serve free text with no format enforcement, so a
 * malicious tenant could smuggle extra CSS declarations into an email sent
 * to a real applicant (a third party, not the tenant themselves).
 */

const TENANT = 'tenant-1'
let sendEmailMock: ReturnType<typeof vi.fn<(args: unknown) => void>>
let tenantPrimaryColor: string

vi.mock('@/lib/tenant-site', () => ({
  getTenantFromHeaders: vi.fn(async () => ({
    id: TENANT,
    name: 'Acme',
    selena_config: { lead_confirmation_enabled: true },
    email_from: null,
    resend_api_key: 'rk_1',
    get primary_color() {
      return tenantPrimaryColor
    },
  })),
}))

vi.mock('@/lib/rate-limit-db', () => ({
  rateLimitDb: vi.fn(async () => ({ allowed: true })),
}))

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: vi.fn(() => ({
      insert: () => ({
        select: () => ({
          single: async () => ({ data: { id: 'app-1' }, error: null }),
        }),
      }),
    })),
    storage: {
      from: vi.fn(() => ({
        getPublicUrl: (path: string) => ({ data: { publicUrl: `https://storage.example/uploads/${path}` } }),
      })),
    },
  },
}))

vi.mock('@/lib/notify', () => ({ notify: vi.fn(async () => ({ success: true })) }))

vi.mock('@/lib/email', () => ({
  sendEmail: vi.fn(async (args: unknown) => {
    sendEmailMock(args)
    return { success: true }
  }),
}))

beforeEach(() => {
  sendEmailMock = vi.fn()
  tenantPrimaryColor = '#0d9488'
})

const REQUIRED_BODY = {
  name: 'Jane Doe',
  email: 'jane@example.com',
  phone: '5551234567',
  linkedinUrl: 'https://linkedin.com/in/jane',
  location: 'nyc-current',
  yearsExperience: '5-10',
  marketplaceBackground: 'StyleSeat',
  plExperience: 'owned-full',
  teamSize: '5-15',
  biggestScale: 'scaled it',
  whySweatEquity: 'reasons',
  plan306090: 'plan',
}

describe('POST /api/apply-ceo — CSS-injection via tenant.primary_color', () => {
  it('rejects a malformed primary_color instead of splicing it raw into the confirmation-email style attribute', async () => {
    tenantPrimaryColor = 'red;position:fixed;top:0;left:0;width:100%;height:100%;background:url(https://evil.example/track.gif)'

    const { POST } = await import('./route')
    const res = await POST(new Request('http://x/api/apply-ceo', {
      method: 'POST',
      body: JSON.stringify(REQUIRED_BODY),
    }))
    expect(res.status).toBe(200)

    expect(sendEmailMock).toHaveBeenCalledTimes(1)
    const call = sendEmailMock.mock.calls[0][0] as { html: string }
    expect(call.html).not.toContain('position:fixed')
    expect(call.html).not.toContain('evil.example')
    expect(call.html).toContain('color:#111111')
  })

  it('renders a well-formed primary_color unchanged', async () => {
    tenantPrimaryColor = '#0d9488'

    const { POST } = await import('./route')
    const res = await POST(new Request('http://x/api/apply-ceo', {
      method: 'POST',
      body: JSON.stringify(REQUIRED_BODY),
    }))
    expect(res.status).toBe(200)

    const call = sendEmailMock.mock.calls[0][0] as { html: string }
    expect(call.html).toContain('color:#0d9488')
  })
})
