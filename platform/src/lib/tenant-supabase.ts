// RLS Stage 2 — scoped Supabase client (docs/tenant-isolation-rls-plan.md).
//
// Mints a short-lived JWT carrying { role: 'authenticated', tenant_id },
// signed with SUPABASE_JWT_SECRET, and uses it as the auth token on a normal
// supabase-js client. RLS policies (already live on 172 tables, currently
// inert since nothing uses this yet) check
// `tenant_id = (auth.jwt() ->> 'tenant_id')::uuid` — a client built here is
// the only thing that can satisfy that check.
//
// service_role (supabaseAdmin) and the app-level tenantDb() guard
// (src/lib/tenant-db.ts) are untouched by this — this is a THIRD, additive
// layer: DB-enforced, can't be bypassed even by a bug in the other two.
import { SignJWT } from 'jose'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const JWT_TTL_SECONDS = 60 * 5 // short-lived; minted fresh per request, never persisted

function getSecret(): Uint8Array {
  const secret = process.env.SUPABASE_JWT_SECRET
  if (!secret) throw new Error('SUPABASE_JWT_SECRET is not set')
  return new TextEncoder().encode(secret)
}

async function mintTenantJwt(tenantId: string): Promise<string> {
  return new SignJWT({ role: 'authenticated', tenant_id: tenantId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${JWT_TTL_SECONDS}s`)
    .setAudience('authenticated')
    .sign(getSecret())
}

const clientCache = new Map<string, { client: SupabaseClient; expiresAt: number }>()

/**
 * A supabase-js client whose auth token carries this tenant's id, satisfying
 * the `tenant_isolation` RLS policy for every table it has one on. Cached
 * per tenantId for the JWT's lifetime so a request handling multiple queries
 * for the same tenant doesn't re-mint + re-auth per call.
 */
export async function tenantClient(tenantId: string): Promise<SupabaseClient> {
  if (!tenantId) throw new Error('tenantClient requires a tenantId')

  const cached = clientCache.get(tenantId)
  if (cached && cached.expiresAt > Date.now()) return cached.client

  const token = await mintTenantJwt(tenantId)
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) throw new Error('NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY not set')

  const client = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })

  // Expire the cache entry a little before the JWT itself does, so a
  // request never runs a query on a token that's about to be rejected.
  clientCache.set(tenantId, { client, expiresAt: Date.now() + (JWT_TTL_SECONDS - 30) * 1000 })
  return client
}
