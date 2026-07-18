/**
 * Client PIN login. Called from the copied nycmaid /site/book/dashboard flow.
 * Tenant resolved from middleware-signed x-tenant-id so clients log in to the
 * business whose subdomain/domain they're visiting.
 */
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantFromHeaders } from '@/lib/tenant-site'
import { rateLimitDb } from '@/lib/rate-limit-db'
import { createClientSession, clientSessionCookieOptions } from '@/lib/client-auth'
import { audit } from '@/lib/audit'

export async function POST(request: Request) {
  const tenant = await getTenantFromHeaders()
  if (!tenant) return NextResponse.json({ error: 'Tenant context required' }, { status: 400 })

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const rl = await rateLimitDb(`client-login:${tenant.id}:${ip}`, 5, 10 * 60 * 1000, { failClosed: true })
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many attempts. Try again later.' }, { status: 429 })
  }

  const { pin } = await request.json().catch(() => ({ pin: '' }))
  if (!pin || typeof pin !== 'string' || pin.length !== 6) {
    return NextResponse.json({ error: 'Enter your 6-digit PIN' }, { status: 400 })
  }

  // clients.pin has no DB-level uniqueness guarantee (idx_clients_pin is a
  // plain index, not unique -- see 2026_07_16_client_team_pin_hash.sql's
  // header comment). .maybeSingle() does NOT protect against this: on 2+
  // matching rows postgrest-js sets data:null with a PGRST116 error, the
  // exact same shape it uses for the 0-row case, and that error goes
  // unchecked here -- so a legitimate client whose PIN collides with
  // another client's in the same tenant got a permanent "Invalid PIN"
  // lockout. Same failure class as this session's phone-lookup fixes
  // (portal/auth send_code, webhooks/telnyx) -- limit(2), pick the first
  // deterministically, log loudly if ambiguous. Never log the PIN itself,
  // it's a login credential.
  const { data: clientMatches } = await supabaseAdmin
    .from('clients')
    .select('id, do_not_service')
    .eq('tenant_id', tenant.id)
    .eq('pin', pin)
    .order('id', { ascending: true })
    .limit(2)

  if (clientMatches && clientMatches.length > 1) {
    console.error(`[client login] PIN collision for tenant ${tenant.id} -- ${clientMatches.length} clients share this PIN; using id=${clientMatches[0].id}`)
  }
  const client = clientMatches?.[0] || null

  if (!client || client.do_not_service) {
    return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 })
  }

  const token = createClientSession(client.id, tenant.id)
  const opts = clientSessionCookieOptions()
  const jar = await cookies()
  jar.set(opts.name, token, {
    httpOnly: opts.httpOnly,
    secure: opts.secure,
    sameSite: opts.sameSite,
    path: opts.path,
    maxAge: opts.maxAge,
  })

  await audit({ tenantId: tenant.id, action: 'portal.login', entityType: 'client', entityId: client.id, userId: client.id, ip })

  return NextResponse.json({ client_id: client.id })
}
