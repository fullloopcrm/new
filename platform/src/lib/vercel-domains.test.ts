import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { registerCarryingDomain } from './vercel-domains'

describe('registerCarryingDomain', () => {
  beforeEach(() => {
    vi.stubEnv('VERCEL_API_TOKEN', 'tok')
    vi.stubEnv('VERCEL_TEAM_ID', 'team_x')
    vi.stubEnv('VERCEL_PROJECT_ID', 'platform')
  })
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('skips (never throws) when Vercel env is not configured', async () => {
    vi.stubEnv('VERCEL_API_TOKEN', '')
    const r = await registerCarryingDomain('acme')
    expect(r).toMatchObject({ ok: false, status: 'skipped', domain: 'acme.fullloopcrm.com' })
  })

  it('registers the <slug>.fullloopcrm.com domain on success', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 })
    vi.stubGlobal('fetch', fetchMock)
    const r = await registerCarryingDomain('acme')
    expect(r).toMatchObject({ ok: true, status: 'created', domain: 'acme.fullloopcrm.com' })
    const url = fetchMock.mock.calls[0][0] as string
    expect(url).toContain('/projects/platform/domains')
    expect(url).toContain('teamId=team_x')
    expect(JSON.parse((fetchMock.mock.calls[0][1] as { body: string }).body)).toEqual({ name: 'acme.fullloopcrm.com' })
  })

  it('treats already-attached (409) as success/idempotent', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false, status: 409, json: async () => ({ error: { code: 'domain_already_exists' } }),
    }))
    const r = await registerCarryingDomain('acme')
    expect(r).toMatchObject({ ok: true, status: 'exists' })
  })

  it('never throws when the fetch itself fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')))
    const r = await registerCarryingDomain('acme')
    expect(r).toMatchObject({ ok: false, status: 'error' })
  })
})
