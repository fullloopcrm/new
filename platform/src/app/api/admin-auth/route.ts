import { NextResponse } from 'next/server'
import { rateLimitDb } from '@/lib/rate-limit-db'
import crypto from 'crypto'

const ADMIN_PIN = process.env.ADMIN_PIN || ''
const SECRET = process.env.ADMIN_TOKEN_SECRET

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
    return data.role === 'super_admin' && data.exp > Date.now()
  } catch {
    return false
  }
}

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown'

  const rl = await rateLimitDb(`admin_auth:${ip}`, 5, 15 * 60 * 1000)
  if (!rl.allowed) {
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
    sameSite: 'strict',
    path: '/',
    maxAge: 24 * 60 * 60,
  })

  return res
}
