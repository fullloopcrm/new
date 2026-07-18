import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import crypto from 'crypto'

/**
 * POST /api/internal/deploy-hook — domain discovery regression test (P1/W1).
 *
 * The hook used to discover re-alias targets via the team-wide `GET
 * /v4/aliases` list, filtered to hosts ending in `.fullloopcrm.com`. That
 * silently dropped every bespoke tenant's own custom domain (e.g.
 * floridamaid.com) even when it's registered on this SAME Vercel project via
 * registerCustomDomain() — those are project domains exactly like the
 * carrying subdomains this hook exists to protect, so a manual `vercel
 * --prod` orphaned them the same way (DEPLOYMENT_NOT_FOUND) with nothing to
 * catch it. Fixed by discovering hosts from the project-scoped `GET
 * /v9/projects/{project}/domains` endpoint instead of a suffix heuristic.
 */

const SECRET = 'whsec-test'
const TOKEN = 'vercel-tok'

function signedRequest(body: unknown) {
  const raw = JSON.stringify(body)
  const sig = crypto.createHmac('sha1', SECRET).update(raw).digest('hex')
  return new Request('http://x/api/internal/deploy-hook', {
    method: 'POST',
    headers: { 'x-vercel-signature': sig },
    body: raw,
  })
}

const deploymentPayload = {
  type: 'deployment.succeeded',
  payload: { deployment: { id: 'dpl_123', target: 'production' } },
}

describe('POST /api/internal/deploy-hook — domain discovery', () => {
  beforeEach(() => {
    vi.stubEnv('VERCEL_DEPLOY_HOOK_SECRET', SECRET)
    vi.stubEnv('VERCEL_DEPLOY_TOKEN', TOKEN)
    vi.stubEnv('VERCEL_PROJECT_ID', 'fullloopcrm')
    vi.stubEnv('VERCEL_TEAM_ID', 'team_x')
  })
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
    vi.resetModules()
  })

  it('rejects a request with an invalid signature (unchanged baseline behavior)', async () => {
    const { POST } = await import('./route')
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const req = new Request('http://x/api/internal/deploy-hook', {
      method: 'POST',
      headers: { 'x-vercel-signature': 'bad-sig' },
      body: JSON.stringify(deploymentPayload),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('discovers hosts via the project-scoped domains endpoint, not the team-wide alias list', async () => {
    const { POST } = await import('./route')
    const fetchMock = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes('/projects/fullloopcrm/domains')) {
        return { ok: true, status: 200, json: async () => ({ domains: [{ name: 'acme.fullloopcrm.com' }] }) }
      }
      return { ok: true, status: 200, json: async () => ({}) }
    })
    vi.stubGlobal('fetch', fetchMock)

    await POST(signedRequest(deploymentPayload))

    const discoveryUrl = fetchMock.mock.calls[0][0] as string
    expect(discoveryUrl).toContain('/v9/projects/fullloopcrm/domains')
    expect(discoveryUrl).not.toContain('/v4/aliases')
    expect(discoveryUrl).toContain('teamId=team_x')
  })

  it('re-aliases a bespoke tenant custom domain that does not end in .fullloopcrm.com', async () => {
    const { POST } = await import('./route')
    const aliasedHosts: string[] = []
    const fetchMock = vi.fn().mockImplementation(async (url: string, opts?: RequestInit) => {
      if (url.includes('/v9/projects/fullloopcrm/domains')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            domains: [
              { name: 'floridamaid.com' },
              { name: 'www.floridamaid.com' },
              { name: 'fullloopcrm.com' },
              { name: 'www.fullloopcrm.com' },
            ],
          }),
        }
      }
      if (url.includes('/v2/deployments/dpl_123/aliases')) {
        const parsed = JSON.parse((opts?.body as string) || '{}') as { alias?: string }
        if (parsed.alias) aliasedHosts.push(parsed.alias)
        return { ok: true, status: 200 }
      }
      return { ok: true, status: 200, json: async () => ({}) }
    })
    vi.stubGlobal('fetch', fetchMock)

    const res = await POST(signedRequest(deploymentPayload))
    const json = (await res.json()) as { reAliased: number; total: number }

    // The bespoke custom domain (apex + www) is re-aliased alongside the
    // wildcard, even though neither ends in .fullloopcrm.com.
    expect(aliasedHosts).toContain('floridamaid.com')
    expect(aliasedHosts).toContain('www.floridamaid.com')
    expect(aliasedHosts).toContain('*.fullloopcrm.com')

    // The platform's own apex/www are excluded — Vercel's native Production
    // Branch aliasing already covers those.
    expect(aliasedHosts).not.toContain('fullloopcrm.com')
    expect(aliasedHosts).not.toContain('www.fullloopcrm.com')

    expect(json.reAliased).toBe(json.total)
  })
})
