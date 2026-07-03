import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { rateLimitDb } from '@/lib/rate-limit-db'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyTenantHeaderSig } from '@/lib/tenant-header-sig'
import { hashAdminPin } from '@/lib/admin-pin'
import { sendLoginAlert } from '@/lib/login-alert'
import crypto from 'crypto'

const ADMIN_PIN = process.env.ADMIN_PIN || ''
const SECRET = process.env.ADMIN_TOKEN_SECRET

// ---- Super-admin token (global ADMIN_PIN) — unchanged. God-mode, any tenant. ----
export function createAdminToken(): string {
  if (!SECRET) throw new Error('ADMIN_TOKEN_SECRET is not configured')
  const payload = JSON.stringify({ role: 'super_admin', exp: Date.now() + 24 * 3600 * 1000 })
  const hmac = crypto.createHmac('sha256', SECRET).update(payload).digest('hex')
  return Buffer.from(payload).toString('base64') + '.' + hmac
}

export function verifyAdminToken(token: string): boolean {
  if (!SECRET) return false
  try {
    const [payloadB64, sig] = token.split('.')
    if (!sig) return false
    const payload = Buffer.from(payloadB64, 'base64').toString()
    const expected = crypto.createHmac('sha256', SECRET).update(payload).digest('hex')
    // Use constant-time compare to avoid HMAC brute-force via timing oracle.
    const a = Buffer.from(sig)
    const b = Buffer.from(expected)
    if (a.length !== b.length) return false
    if (!crypto.timingSafeEqual(a, b)) return false
    const data = JSON.parse(payload)
    // Only the global super-admin token satisfies verifyAdminToken(). Tenant-admin
    // tokens are validated separately (verifyTenantAdminToken) so they can NEVER
    // pass a platform-super-admin gate (require-admin, impersonation, etc.).
    return data.role === 'super_admin' && data.exp > Date.now()
  } catch {
    return false
  }
}

// ---- Tenant-admin token (per-member PIN) — bound to one tenant + member. ----
export function createTenantAdminToken(tenantId: string, memberId: string, role: string): string {
  if (!SECRET) throw new Error('ADMIN_TOKEN_SECRET is not configured')
  const payload = JSON.stringify({
    role: 'tenant_admin',
    tenantId,
    memberId,
    memberRole: role,
    exp: Date.now() + 24 * 3600 * 1000,
  })
  const hmac = crypto.createHmac('sha256', SECRET).update(payload).digest('hex')
  return Buffer.from(payload).toString('base64') + '.' + hmac
}

/**
 * Returns {memberId, role} only if the token is a valid tenant_admin token AND
 * its tenantId matches the tenant the request is being served for. This is the
 * isolation guarantee: a token minted for tenant A is rejected on tenant B.
 */
export function verifyTenantAdminToken(
  token: string,
  expectedTenantId: string,
): { memberId: string; role: string } | null {
  if (!SECRET) return null
  try {
    const [payloadB64, sig] = token.split('.')
    if (!sig) return null
    const payload = Buffer.from(payloadB64, 'base64').toString()
    const expected = crypto.createHmac('sha256', SECRET).update(payload).digest('hex')
    const a = Buffer.from(sig)
    const b = Buffer.from(expected)
    if (a.length !== b.length) return null
    if (!crypto.timingSafeEqual(a, b)) return null
    const data = JSON.parse(payload)
    if (data.role !== 'tenant_admin') return null
    if (data.exp <= Date.now()) return null
    if (data.tenantId !== expectedTenantId) return null
    return { memberId: String(data.memberId), role: String(data.memberRole || 'staff') }
  } catch {
    return null
  }
}

function setAdminCookie(res: NextResponse, token: string): void {
  res.cookies.set('admin_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 24 * 60 * 60,
  })
}

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown'
  const ua = request.headers.get('user-agent') || 'unknown'

  const rl = await rateLimitDb(`admin_auth:${ip}`, 5, 15 * 60 * 1000)
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many attempts. Try again in 15 minutes.' }, { status: 429 })
  }

  if (!SECRET) {
    return NextResponse.json({ error: 'Admin token secret not configured' }, { status: 500 })
  }

  const { pin } = await request.json()
  if (!pin || typeof pin !== 'string') {
    return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 })
  }

  // 1) Global super-admin PIN — god-mode, works on any host (Jeff). Unchanged.
  if (ADMIN_PIN && pin === ADMIN_PIN) {
    const res = NextResponse.json({ success: true, role: 'super_admin' })
    setAdminCookie(res, createAdminToken())
    await sendLoginAlert({ ip, ua, who: 'Super Admin (platform)' })
    return res
  }

  // 2) Per-tenant member PIN. Resolve which tenant this request is FOR from the
  //    signed x-tenant-id header (set by middleware from the domain). Without a
  //    verified tenant context we cannot scope the PIN, so fail closed.
  const h = await headers()
  const headerTenantId = h.get('x-tenant-id')
  const headerSig = h.get('x-tenant-sig')
  if (headerTenantId && verifyTenantHeaderSig(headerTenantId, headerSig)) {
    const { data: member } = await supabaseAdmin
      .from('tenant_members')
      .select('id, role')
      .eq('tenant_id', headerTenantId)
      .eq('pin_hash', hashAdminPin(pin))
      .maybeSingle()

    if (member) {
      await supabaseAdmin
        .from('tenant_members')
        .update({ pin_last_login: new Date().toISOString() })
        .eq('id', member.id)
        .then(() => {}, () => {})

      const res = NextResponse.json({ success: true, role: 'tenant_admin' })
      setAdminCookie(res, createTenantAdminToken(headerTenantId, member.id, member.role))
      await sendLoginAlert({ tenantId: headerTenantId, ip, ua, who: `Tenant admin (${member.role})` })
      return res
    }
  }

  return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 })
}
