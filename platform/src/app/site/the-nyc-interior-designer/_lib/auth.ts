import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { randomBytes, timingSafeEqual } from 'crypto'
import { supabaseAdmin } from '@/app/site/the-nyc-interior-designer/_lib/supabase'
import type { AdminRole } from '@/app/site/the-nyc-interior-designer/_lib/roles'
import { safeEqual, signWithSecret } from '@/lib/secret-compare'

// Throws if ADMIN_PASSWORD is unset (signWithSecret) rather than silently
// signing with a '' key — an HMAC keyed with '' is publicly computable, so
// with the secret unset anyone could forge a valid admin_session for any id.
function signToken(token: string): string {
  return signWithSecret(token, process.env.ADMIN_PASSWORD)
}

// Constant-time compare for HMAC signatures — a plain !== early-exits per
// mismatched character, which is the textbook timing side-channel case.
// Propagates signToken()'s throw when ADMIN_PASSWORD is unset; callers catch
// it and fail closed (no valid session) instead of comparing against an
// insecurely-derived signature.
function signaturesMatch(expected: string, provided: string): boolean {
  const expectedBuf = Buffer.from(expected, 'utf8')
  const providedBuf = Buffer.from(provided, 'utf8')
  if (expectedBuf.length !== providedBuf.length) return false
  return timingSafeEqual(expectedBuf, providedBuf)
}

export function hashPassword(password: string): string {
  return signWithSecret(password, process.env.ADMIN_PASSWORD)
}

export function createSessionCookie(userId?: string): string {
  const token = randomBytes(32).toString('hex')
  const timestamp = Date.now().toString(36)
  if (userId) {
    const payload = `${userId}.${token}.${timestamp}`
    const signature = signToken(payload)
    return `${payload}.${signature}`
  }
  const payload = `${token}.${timestamp}`
  const signature = signToken(payload)
  return `${payload}.${signature}`
}

export function verifySessionCookie(cookie: string): { valid: boolean; userId?: string } {
  if (!cookie) return { valid: false }
  const parts = cookie.split('.')

  try {
    if (parts.length === 4) {
      const [userId, token, timestamp, signature] = parts
      if (!userId || !token || !timestamp || !signature) return { valid: false }
      const payload = `${userId}.${token}.${timestamp}`
      if (!signaturesMatch(signToken(payload), signature)) return { valid: false }
      const created = parseInt(timestamp, 36)
      if (Date.now() - created > 24 * 60 * 60 * 1000) return { valid: false }
      return { valid: true, userId }
    }

    if (parts.length === 3) {
      const [token, timestamp, signature] = parts
      if (!token || !timestamp || !signature) return { valid: false }
      const payload = `${token}.${timestamp}`
      if (!signaturesMatch(signToken(payload), signature)) return { valid: false }
      const created = parseInt(timestamp, 36)
      if (Date.now() - created > 24 * 60 * 60 * 1000) return { valid: false }
      return { valid: true }
    }

    if (parts.length === 2) {
      const [token, signature] = parts
      if (!token || !signature) return { valid: false }
      if (!signaturesMatch(signToken(token), signature)) return { valid: false }
      return { valid: true }
    }
  } catch {
    // ADMIN_PASSWORD not configured — signToken() throws rather than sign
    // with a publicly-computable '' key. Fail closed: no session is valid.
    return { valid: false }
  }

  return { valid: false }
}

export interface AdminUser {
  id: string
  email: string
  name: string
  role: AdminRole
  status: string
}

export async function getAdminUser(): Promise<AdminUser | null> {
  const cookieStore = await cookies()
  const session = cookieStore.get('admin_session')?.value
  if (!session) return null

  const { valid, userId } = verifySessionCookie(session)
  if (!valid) return null

  if (!userId) {
    return { id: 'legacy', email: '', name: 'Admin', role: 'owner', status: 'active' }
  }

  const { data } = await supabaseAdmin
    .from('admin_users')
    .select('id, email, name, role, status')
    .eq('id', userId)
    .eq('status', 'active')
    .single()

  return data as AdminUser | null
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies()
  const session = cookieStore.get('admin_session')?.value
  if (!session) return false
  const { valid, userId } = verifySessionCookie(session)
  if (!valid) return false
  // Legacy PIN session (no userId) has no admin_users row to re-check against —
  // treated as owner, matching getAdminUser()'s existing behavior for this format.
  if (!userId) return true
  // Instant revocation: a disabled/removed admin's signed cookie stays
  // cryptographically valid until its 24h expiry. Re-check current status on
  // every request instead of trusting only the signature (mirrors
  // requirePortalPermission's per-request status check on team-portal).
  const { data } = await supabaseAdmin
    .from('admin_users')
    .select('status')
    .eq('id', userId)
    .single()
  return data?.status === 'active'
}

export async function protectAdminAPI(): Promise<NextResponse | null> {
  const cookieStore = await cookies()
  const session = cookieStore.get('admin_session')?.value

  if (!session || !verifySessionCookie(session).valid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return null
}

export async function protectWriteAPI(): Promise<NextResponse | null> {
  const authError = await protectAdminAPI()
  if (authError) return authError

  const user = await getAdminUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (user.role === 'viewer') {
    return NextResponse.json({ error: 'Forbidden — viewer accounts are read-only' }, { status: 403 })
  }

  return null
}

export async function protectOwnerAPI(): Promise<NextResponse | null> {
  const authError = await protectAdminAPI()
  if (authError) return authError

  const user = await getAdminUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (user.role !== 'owner') {
    return NextResponse.json({ error: 'Forbidden — owner access required' }, { status: 403 })
  }

  return null
}

export async function requireRole(...roles: AdminRole[]): Promise<NextResponse | null> {
  const user = await getAdminUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!roles.includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden — insufficient permissions' }, { status: 403 })
  }
  return null
}

export function protectCronAPI(request: Request): NextResponse | null {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    console.error('CRON_SECRET not configured')
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 })
  }

  // Constant-time compare — a naive `===` leaks CRON_SECRET one byte at a
  // time via response timing.
  if (safeEqual(authHeader || '', `Bearer ${cronSecret}`)) {
    return null
  }

  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
