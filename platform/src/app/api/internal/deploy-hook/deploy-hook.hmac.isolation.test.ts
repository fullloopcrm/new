import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import crypto from 'crypto'
import { POST } from './route'

/**
 * The Vercel deploy webhook re-aliases every carrying domain to the newest
 * production deployment. An unauthenticated caller who could reach it could
 * repoint *.fullloopcrm.com (and every tenant alias) at an arbitrary
 * deployment id — a platform-wide takeover of custom-domain routing. The ONLY
 * thing standing between the public internet and that action is the HMAC-SHA1
 * signature gate at the top of POST().
 *
 * These are the previously-untested fail-closed properties of that gate:
 *   - missing config (no secret/token) => 503, never "process anyway"
 *   - missing / wrong / wrong-length / body-tampered signature => 401
 *   - the length guard runs BEFORE timingSafeEqual, so a short sig can't crash
 *     the handler into an unhandled 500 (which some infra treats as retryable)
 *   - NON-VACUITY: a correctly-signed body is NOT rejected (proves the gate
 *     isn't just always-401)
 *
 * The accept-path assertion deliberately signs a non-"deployment.succeeded"
 * event so the handler short-circuits to a 200 `skipped` result and never makes
 * a real Vercel API fetch — the auth gate is exercised without any network mock.
 */

const SECRET = 'deploy-hook-test-secret'
const TOKEN = 'vercel-project-token'

const ORIG = {
  secret: process.env.VERCEL_DEPLOY_HOOK_SECRET,
  token: process.env.VERCEL_DEPLOY_TOKEN,
}

function sign(raw: string, key = SECRET): string {
  return crypto.createHmac('sha1', key).update(raw).digest('hex')
}

function post(raw: string, sig: string | null): Promise<Response> {
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (sig !== null) headers['x-vercel-signature'] = sig
  return POST(new Request('https://x/api/internal/deploy-hook', { method: 'POST', headers, body: raw })) as unknown as Promise<Response>
}

beforeEach(() => {
  process.env.VERCEL_DEPLOY_HOOK_SECRET = SECRET
  process.env.VERCEL_DEPLOY_TOKEN = TOKEN
})

afterAll(() => {
  // Restore so we never leak test secrets into sibling test files.
  if (ORIG.secret === undefined) delete process.env.VERCEL_DEPLOY_HOOK_SECRET
  else process.env.VERCEL_DEPLOY_HOOK_SECRET = ORIG.secret
  if (ORIG.token === undefined) delete process.env.VERCEL_DEPLOY_TOKEN
  else process.env.VERCEL_DEPLOY_TOKEN = ORIG.token
})

describe('deploy-hook HMAC gate — fail-closed', () => {
  it('503s when the hook is not configured (missing secret) — never processes unsigned', async () => {
    delete process.env.VERCEL_DEPLOY_HOOK_SECRET
    const raw = JSON.stringify({ type: 'deployment.succeeded' })
    const res = await post(raw, sign(raw))
    expect(res.status).toBe(503)
  })

  it('503s when the deploy token is missing (misconfig fails closed, not open)', async () => {
    delete process.env.VERCEL_DEPLOY_TOKEN
    const raw = JSON.stringify({ type: 'deployment.succeeded' })
    const res = await post(raw, sign(raw))
    expect(res.status).toBe(503)
  })

  it('401s when the signature header is absent', async () => {
    const raw = JSON.stringify({ type: 'deployment.succeeded' })
    const res = await post(raw, null)
    expect(res.status).toBe(401)
  })

  it('401s on an empty signature', async () => {
    const raw = JSON.stringify({ type: 'deployment.succeeded' })
    const res = await post(raw, '')
    expect(res.status).toBe(401)
  })

  it('401s on a wrong signature of the right length', async () => {
    const raw = JSON.stringify({ type: 'deployment.succeeded' })
    const good = sign(raw)
    const wrong = good.slice(0, -1) + (good.endsWith('0') ? '1' : '0')
    const res = await post(raw, wrong)
    expect(res.status).toBe(401)
  })

  it('401s (no crash) on a wrong-LENGTH signature — length guard precedes timingSafeEqual', async () => {
    const raw = JSON.stringify({ type: 'deployment.succeeded' })
    // timingSafeEqual throws on unequal-length buffers; the handler must guard
    // first and return 401, not surface an unhandled exception.
    const res = await post(raw, 'abcd')
    expect(res.status).toBe(401)
  })

  it('401s when a valid signature is replayed against a DIFFERENT body (sig binds the payload)', async () => {
    const signedRaw = JSON.stringify({ type: 'deployment.succeeded', payload: { deployment: { id: 'dpl_original' } } })
    const sig = sign(signedRaw)
    const tamperedRaw = JSON.stringify({ type: 'deployment.succeeded', payload: { deployment: { id: 'dpl_attacker' } } })
    const res = await post(tamperedRaw, sig)
    expect(res.status).toBe(401)
  })

  it('401s when the signature was minted with a different secret', async () => {
    const raw = JSON.stringify({ type: 'deployment.succeeded' })
    const res = await post(raw, sign(raw, 'some-other-secret'))
    expect(res.status).toBe(401)
  })

  it('NON-VACUITY: a correctly-signed request passes the gate (200, not 401)', async () => {
    // Non-"deployment.succeeded" event => handler short-circuits to a skipped
    // 200 before any Vercel fetch. Proves the gate accepts a valid signature.
    const raw = JSON.stringify({ type: 'deployment.created' })
    const res = await post(raw, sign(raw))
    expect(res.status).toBe(200)
    const json = (await res.json()) as { skipped?: string }
    expect(json.skipped).toBe('deployment.created')
  })
})
