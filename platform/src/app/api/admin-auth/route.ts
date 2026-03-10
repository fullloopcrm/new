import { NextResponse } from 'next/server'
import crypto from 'crypto'

const ADMIN_PIN = process.env.ADMIN_PIN || ''
const SECRET = process.env.CLERK_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || 'fallback'

const attempts = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = attempts.get(ip)
  if (entry && entry.resetAt > now) {
    if (entry.count >= 5) return false
    entry.count++
    return true
  }
  attempts.set(ip, { count: 1, resetAt: now + 15 * 60 * 1000 })
  return true
}

export function createAdminToken(): string {
  const payload = JSON.stringify({ role: 'super_admin', exp: Date.now() + 24 * 3600 * 1000 })
  const hmac = crypto.createHmac('sha256', SECRET).update(payload).digest('hex')
  return Buffer.from(payload).toString('base64') + '.' + hmac
}

export function verifyAdminToken(token: string): boolean {
  try {
    const [payloadB64, sig] = token.split('.')
    const payload = Buffer.from(payloadB64, 'base64').toString()
    const expected = crypto.createHmac('sha256', SECRET).update(payload).digest('hex')
    if (sig !== expected) return false
    const data = JSON.parse(payload)
    return data.role === 'super_admin' && data.exp > Date.now()
  } catch {
    return false
  }
}

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown'

  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: 'Too many attempts. Try again in 15 minutes.' }, { status: 429 })
  }

  if (!ADMIN_PIN) {
    return NextResponse.json({ error: 'Admin PIN not configured' }, { status: 500 })
  }

  const { pin } = await request.json()

  if (pin !== ADMIN_PIN) {
    return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 })
  }

  const token = createAdminToken()

  const res = NextResponse.json({ success: true })
  res.cookies.set('admin_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/admin',
    maxAge: 24 * 60 * 60,
  })

  return res
}
