/**
 * Client-portal session cookies for the copied nycmaid frontend. Clients log in
 * with their PIN (stored on clients.pin), we set a signed cookie. Independent
 * of the HMAC-token flow in /api/portal/auth, which the web app UI uses.
 *
 * Format: clientId.tenantId.timestamp.hmac  — tenant bound into the signature
 * so a cookie minted for tenant A cannot be replayed against tenant B.
 */
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { supabaseAdmin } from './supabase'

const COOKIE = 'client_session'
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000 // 30 days

function secret(): string {
  const s = process.env.PORTAL_SECRET
  if (!s) throw new Error('PORTAL_SECRET required for client session signing')
  return s
}

function sign(payload: string): string {
  return crypto.createHmac('sha256', secret()).update(payload).digest('hex')
}

export function createClientSession(clientId: string, tenantId: string): string {
  const payload = `${clientId}.${tenantId}.${Date.now()}`
  return `${payload}.${sign(payload)}`
}

export function verifyClientSessionToken(cookie: string | undefined): { clientId: string; tenantId: string } | null {
  if (!cookie) return null
  const parts = cookie.split('.')
  if (parts.length !== 4) return null
  const [clientId, tenantId, ts, sig] = parts
  if (!clientId || !tenantId || !ts || !sig) return null
  const expected = sign(`${clientId}.${tenantId}.${ts}`)
  if (expected.length !== sig.length) return null
  try {
    if (!crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(sig, 'hex'))) return null
  } catch {
    return null
  }
  const age = Date.now() - parseInt(ts)
  if (!Number.isFinite(age) || age > MAX_AGE_MS) return null
  return { clientId, tenantId }
}

/**
 * Require a logged-in client. Must also match the provided tenant (so the
 * cookie from tenant A can't be used on tenant B's subdomain).
 * Returns { clientId } on success, NextResponse on failure.
 */
export async function protectClientAPI(
  expectedTenantId: string,
  requiredClientId?: string,
): Promise<{ clientId: string } | NextResponse> {
  const cookieStore = await cookies()
  const session = cookieStore.get(COOKIE)?.value
  const verified = verifyClientSessionToken(session)
  if (!verified) {
    return NextResponse.json({ error: 'Not logged in' }, { status: 401 })
  }
  if (verified.tenantId !== expectedTenantId) {
    return NextResponse.json({ error: 'Session not valid for this tenant' }, { status: 401 })
  }
  if (requiredClientId && verified.clientId !== requiredClientId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }
  // Block do_not_service clients.
  const { data: client } = await supabaseAdmin
    .from('clients')
    .select('do_not_service')
    .eq('id', verified.clientId)
    .eq('tenant_id', expectedTenantId)
    .single()
  if (!client || client.do_not_service) {
    return NextResponse.json({ error: 'Session expired' }, { status: 401 })
  }
  return { clientId: verified.clientId }
}

export function clientSessionCookieOptions() {
  return {
    name: COOKIE,
    httpOnly: true as const,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    path: '/',
    maxAge: Math.floor(MAX_AGE_MS / 1000),
  }
}
