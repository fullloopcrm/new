/**
 * Client PIN login. Called from the copied nycmaid /site/book/dashboard flow.
 * Tenant resolved from middleware-signed x-tenant-id so clients log in to the
 * business whose subdomain/domain they're visiting.
 */
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { tenantDb } from '@/lib/tenant-db'
import { getTenantFromHeaders } from '@/lib/tenant-site'
import { rateLimitDb } from '@/lib/rate-limit-db'
import { createClientSession, clientSessionCookieOptions } from '@/lib/client-auth'
import { audit } from '@/lib/audit'
import { logAuthFailure } from '@/lib/error-tracking'
import { findRowByPin } from '@/lib/pin-lookup'

// Same cap as /api/portal/auth's identical fallback scan.
const PIN_SCAN_CAP = 5000

export async function POST(request: Request) {
  const tenant = await getTenantFromHeaders()
  if (!tenant) return NextResponse.json({ error: 'Tenant context required' }, { status: 400 })

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  // Two layers. Per-IP (5/10min) stops a single host guessing PINs. A wrong PIN
  // resolves to no account, so per-victim lockout isn't possible here — instead
  // a per-tenant cap (100/10min) locks out distributed PIN-spraying that rotates
  // IPs, which the per-IP bucket alone can't see. 100/10min sits far above any
  // real login volume for a tenant but far below what brute-forcing a 6-digit
  // PIN needs; bump it for unusually high-traffic tenants if false 429s appear.
  const rlIp = await rateLimitDb(`client-login:${tenant.id}:${ip}`, 5, 10 * 60 * 1000, { failClosed: true })
  const rlTenant = await rateLimitDb(`client-login-tenant:${tenant.id}`, 100, 10 * 60 * 1000, { failClosed: true })
  if (!rlIp.allowed || !rlTenant.allowed) {
    await logAuthFailure({ surface: 'client/login', tenantId: tenant.id, ip, lockedOut: true })
    return NextResponse.json({ error: 'Too many attempts. Try again later.' }, { status: 429 })
  }

  const { pin } = await request.json().catch(() => ({ pin: '' }))
  if (!pin || typeof pin !== 'string' || pin.length !== 6) {
    return NextResponse.json({ error: 'Enter your 6-digit PIN' }, { status: 400 })
  }

  // findRowByPin: clients.pin is encrypted at rest (secret-crypto AES-256-GCM,
  // random IV per encryption), so the same PIN never produces the same
  // ciphertext twice — a plain `.eq('pin', pin)` lookup can only ever match a
  // legacy plaintext row. Without the decrypt-and-scan fallback below, every
  // client whose PIN was written through the encrypted path (sec-07's fix)
  // could never log in here — a real, live bug found 2026-08-01: this route
  // was the one caller of the clients-PIN-login flow that never adopted the
  // findRowByPin pattern already used by the sibling /api/portal/auth route.
  const client = await findRowByPin(
    pin,
    async () => {
      const { data } = await tenantDb(tenant.id)
        .from('clients')
        .select('id, do_not_service, pin')
        .eq('pin', pin)
        .maybeSingle()
      return data as { id: string; do_not_service: boolean; pin: string | null } | null
    },
    async () => {
      const { data } = await tenantDb(tenant.id)
        .from('clients')
        .select('id, do_not_service, pin')
        .limit(PIN_SCAN_CAP)
      return (data || []) as { id: string; do_not_service: boolean; pin: string | null }[]
    },
  )

  if (!client || client.do_not_service) {
    await logAuthFailure({ surface: 'client/login', tenantId: tenant.id, ip, lockedOut: false, remaining: Math.min(rlIp.remaining, rlTenant.remaining) })
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
