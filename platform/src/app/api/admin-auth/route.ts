import { NextResponse } from 'next/server'
import crypto from 'crypto'

const ADMIN_PIN = process.env.ADMIN_PIN || ''
const SECRET = process.env.ADMIN_TOKEN_SECRET

// NOTE: In-memory rate limiting — resets on server restart (serverless cold start).
// Acceptable for admin PIN auth since it's a secondary defense layer.
const attempts = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000

function checkRateLimit(ip: string): boolean {
  const now = Date.now()

  // Cleanup expired entries to prevent memory leaks
  if (attempts.size > 1000) {
    for (const [key, val] of attempts) {
      if (val.resetAt <= now) attempts.delete(key)
    }
  }

  const entry = attempts.get(ip)
  if (entry && entry.resetAt > now) {
    if (entry.count >= 5) return false
    entry.count++
    return true
  }
  attempts.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
  return true
}

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

  if (!SECRET) {
    return NextResponse.json({ error: 'Admin token secret not configured' }, { status: 500 })
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
    path: '/',
    maxAge: 24 * 60 * 60,
  })

  return res
}
