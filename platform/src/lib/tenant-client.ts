/**
 * Scoped tenant Supabase client — the missing key that makes RLS non-vacuous.
 *
 * `supabaseAdmin` uses the service_role key and BYPASSES RLS by design, so every
 * request handler that uses it keeps seeing all tenants' rows even after RLS
 * policies exist. `tenantClient(tenantId)` instead mints a short-lived HS256 JWT
 * carrying `role: "authenticated"` + a `tenant_id` claim, and attaches it as the
 * request Authorization. PostgREST then runs the query as the `authenticated`
 * DB role with RLS enforced, and the gap-closure policy
 *   USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)   -- rls-gap-closure.sql
 * scopes every row to that one tenant.
 *
 * FAIL-CLOSED: if SUPABASE_JWT_SECRET (or the Supabase URL) is absent this throws.
 * It must NEVER silently fall back to `supabaseAdmin` (that re-opens the bypass) or
 * to a bare anon client (that darks every tenant query once RLS is on). Throwing
 * surfaces the misconfiguration at deploy time, before any tenant data moves.
 *
 * This module is NOT yet wired into any route. It is the reviewed factory from
 * deploy-prep/tenant-client-path-spec.md, ready for the tier-ordered cutover.
 *
 * Divergences from that spec (both deliberate, driven by the file-only, no-new-dep
 * constraint — see the wiring plan and W5's report):
 *   1. Signs with Node's built-in `crypto` (HMAC-SHA256), not `jose`. `jose` is not
 *      installed and installing it is out of scope for a file-only change. The spec
 *      explicitly permits a Node-only signer (its option 2). Consequence: these
 *      functions are NODE-RUNTIME ONLY — a converted route must not run on the edge
 *      runtime until this is swapped to `jose`. Existing `tenant-header-sig.ts`
 *      already hand-rolls HMAC-SHA256 with `crypto`, so this matches the codebase.
 *   2. Synchronous (Node crypto HMAC is sync), where the spec sketched an async
 *      `jose` signer. Call sites therefore do `const db = tenantClient(id)` with no
 *      `await`. If this is later swapped to `jose`, it becomes async and call sites
 *      gain `await`.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { createHmac } from 'crypto'

/** Token lifetime. Tokens are minted per request and never stored/refreshed. */
export const TOKEN_TTL_SECONDS = 300

/** The claim set PostgREST/RLS reads. `tenant_id` is the only app-specific claim. */
export interface TenantTokenClaims {
  /** PostgREST derives the DB role from this. `authenticated` = RLS enforced. */
  role: 'authenticated'
  /** The isolation key the policy reads via `auth.jwt() ->> 'tenant_id'`. */
  tenant_id: string
  /** GoTrue audience check. */
  aud: 'authenticated'
  /** Traceability (operator/user id). Not read by the tenant policy. */
  sub: string
  /** Issued-at (epoch seconds). */
  iat: number
  /** Expiry (epoch seconds). */
  exp: number
}

interface SignOptions {
  /** Value for the `sub` claim. Defaults to `'operator'`. */
  userId?: string
  /** Override the signing secret (tests). Defaults to `SUPABASE_JWT_SECRET`. */
  secret?: string
  /** Override token TTL in seconds (tests). Defaults to {@link TOKEN_TTL_SECONDS}. */
  ttlSeconds?: number
  /** Override "now" in epoch MILLISECONDS (tests). Defaults to `Date.now()`. */
  nowMs?: number
}

function base64url(input: string | Buffer): string {
  return Buffer.from(input).toString('base64url')
}

/**
 * Mint (but do not attach) an HS256 JWT for `tenantId`. Exported so tests can
 * verify the token's claims and signature without standing up a Supabase client.
 * FAIL-CLOSED: throws if the secret or tenantId is missing.
 */
export function signTenantToken(tenantId: string, opts: SignOptions = {}): string {
  const secret = opts.secret ?? process.env.SUPABASE_JWT_SECRET
  if (!secret) {
    // Never fall back to service_role or anon — surface the misconfig.
    throw new Error('SUPABASE_JWT_SECRET not configured')
  }
  if (!tenantId) throw new Error('tenantClient requires a tenantId')

  const ttl = opts.ttlSeconds ?? TOKEN_TTL_SECONDS
  const nowSec = Math.floor((opts.nowMs ?? Date.now()) / 1000)

  const header = { alg: 'HS256', typ: 'JWT' }
  const claims: TenantTokenClaims = {
    role: 'authenticated',
    tenant_id: tenantId,
    aud: 'authenticated',
    sub: opts.userId ?? 'operator',
    iat: nowSec,
    exp: nowSec + ttl,
  }

  const signingInput = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(claims))}`
  const signature = createHmac('sha256', secret).update(signingInput).digest('base64url')
  return `${signingInput}.${signature}`
}

/**
 * Return a Supabase client whose every request is scoped to `tenantId` by RLS.
 *
 * Each call returns a FRESH, tenant-bound client carrying a freshly-minted token —
 * do not cache one across tenants. Keep the explicit `.eq('tenant_id', tenantId)`
 * on queries through the RLS rollout: it is redundant once the table's policy is on
 * but keeps the route correct in the window before that.
 *
 * FAIL-CLOSED: throws if `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_JWT_SECRET`, or
 * `tenantId` is missing. NODE-RUNTIME ONLY (see module header).
 */
export function tenantClient(tenantId: string, userId = 'operator'): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL not configured')

  // signTenantToken enforces the secret + tenantId invariants (fail-closed).
  const token = signTenantToken(tenantId, { userId })

  // The anon key selects the anon apikey; the Authorization Bearer is what
  // PostgREST reads for the DB role + claims. No session persistence — the token
  // is per-request and short-lived.
  return createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '', {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
