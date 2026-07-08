/**
 * Tenant-scoped Supabase client — the enforced half of tenant isolation.
 *
 * Today the app runs every query through `supabaseAdmin` (service_role), which
 * BYPASSES Row-Level Security — so isolation depends on each route remembering
 * `.eq('tenant_id', …)` (guarded by scripts/audit-tenant-scope.mjs). This client
 * is the structural fix: it connects as the non-privileged `authenticated` role
 * with a signed JWT carrying a `tenant_id` claim, so Postgres RLS enforces the
 * tenant boundary in the database — a forgotten filter can no longer leak.
 *
 * The RLS policies (migration below) read the claim:
 *   using ((current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id') = tenant_id::text)
 *
 * ACTIVATION (staged — do NOT flip blind):
 *   1. Set SUPABASE_JWT_SECRET in Vercel (Supabase dashboard → Settings → API →
 *      JWT Secret). Until then this throws, so nothing silently runs unscoped.
 *   2. Migrate tenant-scoped API routes from supabaseAdmin → tenantDb-over-this.
 *   3. Keep supabaseAdmin (service_role) ONLY for cron / admin / cross-tenant.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { createHmac } from 'crypto'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

/** Mint a short-lived Supabase-compatible JWT for the `authenticated` role,
 *  carrying the tenant_id claim the RLS policies read. HS256, signed with the
 *  project's JWT secret (same secret Supabase uses to verify anon/service keys). */
function mintTenantJwt(tenantId: string): string {
  const secret = process.env.SUPABASE_JWT_SECRET
  if (!secret) {
    throw new Error('SUPABASE_JWT_SECRET not set — tenantClient cannot mint a scoped token. Set it before enabling the RLS role-switch.')
  }
  // exp is deterministic-safe here: token TTL is short; callers create one per request.
  const now = Math.floor(Date.now() / 1000)
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const payload = b64url(JSON.stringify({
    role: 'authenticated',
    aud: 'authenticated',
    tenant_id: tenantId,
    iat: now,
    exp: now + 60 * 5, // 5 minutes
  }))
  const sig = b64url(createHmac('sha256', secret).update(`${header}.${payload}`).digest())
  return `${header}.${payload}.${sig}`
}

/**
 * A Supabase client scoped to one tenant, running as `authenticated` (RLS ON).
 * Use for tenant-owned tables. Cross-tenant/platform work stays on supabaseAdmin.
 */
export function tenantClient(tenantId: string): SupabaseClient {
  if (!tenantId) throw new Error('tenantClient requires a tenantId')
  if (!url || !anonKey) throw new Error('Supabase URL/anon key not configured')
  const token = mintTenantJwt(tenantId)
  return createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

/** True once SUPABASE_JWT_SECRET is present — lets callers/cutover code branch. */
export function tenantClientReady(): boolean {
  return !!process.env.SUPABASE_JWT_SECRET
}
