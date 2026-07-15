import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createSessionCookie, hashPassword } from '@/lib/nycmaid/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { emailAdmins } from '@/lib/nycmaid/admin-contacts'
import { notify } from '@/lib/nycmaid/notify'
import { rateLimitDb } from '@/lib/rate-limit-db'
import { escapeHtml } from '@/lib/escape-html'
import { safeEqual } from '@/lib/timing-safe-equal'

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const ua = request.headers.get('user-agent') || 'unknown'

    // Persistent (DB-backed) rate limiting, fail-closed. This endpoint used to
    // rate-limit via an in-memory Map, which resets every cold start and is
    // per-instance under concurrent serverless invocations — an attacker gets
    // a fresh set of attempts on every new lambda instance, effectively no
    // limit at all. failClosed: true so a rate-limiter DB outage denies the
    // login instead of silently letting brute force through while blind,
    // matching every other auth-critical endpoint (admin-auth, client/login,
    // portal/auth, etc).
    const rl = await rateLimitDb(`auth_login:${ip}`, 5, 5 * 60 * 1000, { failClosed: true })
    if (!rl.allowed) {
      await notify({ type: 'security', title: 'Login Locked', message: `IP ${ip} locked out after 5 failed attempts` })
      return NextResponse.json({ error: 'Too many attempts. Try again in 5 minutes.' }, { status: 429 })
    }

    // Deliberately NOT `|| ''` — an unconfigured ADMIN_PASSWORD must never
    // resolve to an empty string here. `safeEqual(password, adminPassword)`
    // below would then grant a full owner session to a request that sends
    // `password: ""` (or omits it, since JSON destructuring makes it
    // `undefined` and the typeof guard below rejects that — but an explicit
    // empty string in the body would match). Same fail-open shape as the
    // ADMIN_PASSWORD HMAC-secret fix in lib/nycmaid/auth.ts.
    const adminPassword = process.env.ADMIN_PASSWORD?.trim() || null

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

    // Fallback: legacy PIN-based login. `adminPassword` is null (never '')
    // when unconfigured, so this can't be satisfied by an empty/omitted body
    // password even if ADMIN_PASSWORD is unset. Constant-time compare — a naive
    // === leaks the password byte-by-byte via timing (same class already fixed
    // for CRON_SECRET/ADMIN_PIN across cron/admin routes, de510a4e/413adc6f).
    if (adminPassword && typeof password === 'string' && safeEqual(password, adminPassword)) {
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

    // Notify security once brute-force pressure is evident (3rd+ attempt in
    // the window), same threshold the old in-memory counter used.
    if (rl.remaining <= 2) {
      await notify({ type: 'security', title: 'Failed Login', message: `Failed login attempt from ${ip} (${rl.remaining} attempts remaining before lockout)` })
    }

    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  } catch (err) {
    console.error('Login error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
