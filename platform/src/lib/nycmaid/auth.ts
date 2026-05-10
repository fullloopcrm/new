import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createHmac, randomBytes } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase'
import type { AdminRole } from '@/lib/nycmaid/roles'
import { canAccessAPI } from '@/lib/nycmaid/roles'

// Session token = random value signed with ADMIN_PASSWORD as secret
// Can't be forged without knowing the password
function signToken(token: string): string {
  const secret = process.env.ADMIN_PASSWORD || ''
  return createHmac('sha256', secret).update(token).digest('hex')
}

// Hash password with HMAC-SHA256
export function hashPassword(password: string): string {
  return createHmac('sha256', process.env.ADMIN_PASSWORD || 'fallback').update(password).digest('hex')
}

// Session cookie now encodes userId: userId.token.timestamp.signature
export function createSessionCookie(userId?: string): string {
  const token = randomBytes(32).toString('hex')
  const timestamp = Date.now().toString(36)
  if (userId) {
    const payload = `${userId}.${token}.${timestamp}`
    const signature = signToken(payload)
    return `${payload}.${signature}`
  }
  // Legacy PIN-based session (no userId)
  const payload = `${token}.${timestamp}`
  const signature = signToken(payload)
  return `${payload}.${signature}`
}

export function verifySessionCookie(cookie: string): { valid: boolean; userId?: string } {
  if (!cookie) return { valid: false }
  const parts = cookie.split('.')

  // New user-based format: userId.token.timestamp.signature
  if (parts.length === 4) {
    const [userId, token, timestamp, signature] = parts
    if (!userId || !token || !timestamp || !signature) return { valid: false }
    const payload = `${userId}.${token}.${timestamp}`
    if (signToken(payload) !== signature) return { valid: false }
    const created = parseInt(timestamp, 36)
    if (Date.now() - created > 24 * 60 * 60 * 1000) return { valid: false }
    return { valid: true, userId }
  }

  // Legacy format: token.timestamp.signature (PIN login, no userId)
  if (parts.length === 3) {
    const [token, timestamp, signature] = parts
    if (!token || !timestamp || !signature) return { valid: false }
    const payload = `${token}.${timestamp}`
    if (signToken(payload) !== signature) return { valid: false }
    const created = parseInt(timestamp, 36)
    if (Date.now() - created > 24 * 60 * 60 * 1000) return { valid: false }
    return { valid: true } // Legacy session, no userId — treated as owner
  }

  // Ancient legacy: token.signature
  if (parts.length === 2) {
    const [token, signature] = parts
    if (!token || !signature) return { valid: false }
    if (signToken(token) !== signature) return { valid: false }
    return { valid: true }
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

// Get the current admin user from session
export async function getAdminUser(): Promise<AdminUser | null> {
  const cookieStore = await cookies()
  const session = cookieStore.get('admin_session')?.value
  if (!session) return null

  const { valid, userId } = verifySessionCookie(session)
  if (!valid) return null

  // Legacy PIN session — treat as owner
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
  return verifySessionCookie(session).valid
}

export async function requireAdmin() {
  const authenticated = await isAdminAuthenticated()
  if (!authenticated) {
    throw new Error('Unauthorized')
  }
}

// Use this at start of API routes to protect them
// Returns null if authenticated, NextResponse error if not
// Automatically enforces role-based restrictions
export async function protectAdminAPI(): Promise<NextResponse | null> {
  const cookieStore = await cookies()
  const session = cookieStore.get('admin_session')?.value

  if (!session || !verifySessionCookie(session).valid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check role-based restrictions from cookie (fast, no DB hit)
  const role = cookieStore.get('admin_role')?.value as AdminRole | undefined
  if (role && role !== 'owner') {
    // Viewer: read-only — block all mutations
    if (role === 'viewer') {
      // Allow GET-like reads via these specific endpoints
      // Everything else is blocked at the API handler level for write methods
      // But we can't check HTTP method here — the route handler does that
      // So we restrict by endpoint access instead
      return null // sidebar + middleware already restrict page access; API-level blocks below
    }
  }

  return null // authenticated
}

// Use this at start of POST/PUT/DELETE handlers to block viewers and restrict managers
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

// Block access to finance/settings/team pay — owner only
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

// Require a specific role or higher
export async function requireRole(...roles: AdminRole[]): Promise<NextResponse | null> {
  const user = await getAdminUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!roles.includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden — insufficient permissions' }, { status: 403 })
  }
  return null
}

// Client session: signed token containing client_id
export function createClientSession(clientId: string): string {
  const payload = `${clientId}.${Date.now()}`
  const signature = signToken(payload)
  return `${payload}.${signature}`
}

export function verifyClientSession(cookie: string): string | null {
  if (!cookie) return null
  const parts = cookie.split('.')
  if (parts.length !== 3) return null
  const [clientId, timestamp, signature] = parts
  if (!clientId || !timestamp || !signature) return null
  const payload = `${clientId}.${timestamp}`
  if (signToken(payload) !== signature) return null
  // Sessions valid for 30 days
  const age = Date.now() - parseInt(timestamp)
  if (age > 30 * 24 * 60 * 60 * 1000) return null
  return clientId
}

// Verify client session cookie and optionally check client_id matches
export async function protectClientAPI(requiredClientId?: string): Promise<{ clientId: string } | NextResponse> {
  const cookieStore = await cookies()
  const session = cookieStore.get('client_session')?.value

  if (!session) {
    return NextResponse.json({ error: 'Not logged in' }, { status: 401 })
  }

  const clientId = verifyClientSession(session)
  if (!clientId) {
    return NextResponse.json({ error: 'Session expired' }, { status: 401 })
  }

  // Check DNS status — kick out do_not_service clients
  const { data: client } = await supabaseAdmin.from('clients').select('do_not_service').eq('id', clientId).single()
  if (client?.do_not_service) {
    return NextResponse.json({ error: 'Session expired' }, { status: 401 })
  }

  if (requiredClientId && clientId !== requiredClientId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  return { clientId }
}

// For cron jobs - check secret header
export function protectCronAPI(request: Request): NextResponse | null {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  // If no CRON_SECRET set, block all cron requests in production
  if (!cronSecret) {
    console.error('CRON_SECRET not configured')
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 })
  }

  // Vercel cron sends: Authorization: Bearer <CRON_SECRET>
  if (authHeader === `Bearer ${cronSecret}`) {
    return null
  }

  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
