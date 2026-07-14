import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createSessionCookie, hashPassword } from '@/lib/nycmaid/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { emailAdmins } from '@/lib/nycmaid/admin-contacts'
import { notify } from '@/lib/nycmaid/notify'
import { rateLimitDb } from '@/lib/rate-limit-db'
import { escapeHtml } from '@/lib/escape-html'
import { safeEqual } from '@/lib/secret-compare'

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const ua = request.headers.get('user-agent') || 'unknown'

    // DB-backed so the limit survives serverless cold starts (an in-memory
    // Map resets per-instance and gives no real brute-force protection).
    // failClosed: an auth-critical route must deny on a limiter outage
    // instead of allowing unlimited guesses while it's blind.
    const rl = await rateLimitDb(`auth_login:${ip}`, 5, 5 * 60 * 1000, { failClosed: true })
    if (!rl.allowed) {
      await notify({ type: 'security', title: 'Login Locked', message: `IP ${ip} locked out after 5 failed attempts` })
      return NextResponse.json({ error: 'Too many attempts. Try again in 5 minutes.' }, { status: 429 })
    }

    // Empty ADMIN_PASSWORD must never authorize the PIN-fallback path below —
    // `(process.env.ADMIN_PASSWORD || '').trim()` used to default to '', so an
    // unconfigured secret + an empty submitted password compared equal and
    // handed out a full owner session with zero credentials.
    const adminPassword = (process.env.ADMIN_PASSWORD || '').trim()

    // Try user-based login first (email + password)
    if (email && password) {
      let passwordHash: string | null = null
      try {
        passwordHash = hashPassword(password)
      } catch {
        // ADMIN_PASSWORD not configured — hashPassword() fails closed rather
        // than hashing with a publicly-known fallback key.
      }
      const { data: user } = passwordHash
        ? await supabaseAdmin
            .from('admin_users')
            .select('id, email, name, role, status')
            .eq('email', email.toLowerCase().trim())
            .eq('password_hash', passwordHash)
            .single()
        : { data: null }

      if (user) {
        if (user.status === 'disabled') {
          return NextResponse.json({ error: 'Account disabled. Contact your administrator.' }, { status: 403 })
        }

        // Update last_login
        await supabaseAdmin
          .from('admin_users')
          .update({ last_login: new Date().toISOString() })
          .eq('id', user.id)

        // Set session cookie with userId
        const session = createSessionCookie(user.id)
        const cookieStore = await cookies()
        cookieStore.set('admin_session', session, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 60 * 60 * 24,
          path: '/'
        })
        // Role cookie for middleware page-level enforcement (not httpOnly — middleware reads it)
        cookieStore.set('admin_role', user.role, {
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 60 * 60 * 24,
          path: '/'
        })

        const timeET = new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })
        await notify({ type: 'security', title: 'Admin Login', message: `${user.name} (${user.role}) logged in from ${ip} at ${timeET}` })

        return NextResponse.json({ success: true, user: { name: user.name, role: user.role } })
      }
    }

    // Fallback: legacy PIN-based login. `adminPassword &&` guards against the
    // empty-secret bypass (see comment above); safeEqual() is constant-time.
    if (adminPassword && safeEqual(password, adminPassword)) {
      const session = createSessionCookie()
      const cookieStore = await cookies()
      cookieStore.set('admin_session', session, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24,
        path: '/'
      })
      cookieStore.set('admin_role', 'owner', {
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24,
        path: '/'
      })

      const timeET = new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })
      await notify({ type: 'security', title: 'Admin Login', message: `PIN login from ${ip} at ${timeET}` })

      const html = `
        <div style="font-family: sans-serif; max-width: 400px;">
          <h3 style="color: #000;">Admin Login Alert</h3>
          <p><strong>IP:</strong> ${escapeHtml(ip)}</p>
          <p><strong>Time:</strong> ${escapeHtml(timeET)}</p>
          <p><strong>Device:</strong> ${escapeHtml(ua.substring(0, 100))}</p>
          <p style="color: #666; font-size: 12px;">If this wasn't you, change ADMIN_PASSWORD immediately.</p>
        </div>
      `
      try { await emailAdmins('Admin Login Alert', html, ['owner']) } catch {}

      return NextResponse.json({ success: true, user: { name: 'Admin', role: 'owner' } })
    }

    // Failed attempt — rl.remaining reflects the DB-backed bucket consumed above.
    if (rl.remaining <= 2) {
      await notify({ type: 'security', title: 'Failed Login', message: `Repeated failed login attempts from ${ip} (${rl.remaining} attempts remaining before lockout)` })
    }

    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  } catch (err) {
    console.error('Login error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
