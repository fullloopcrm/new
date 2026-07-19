import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendEmail } from '@/lib/email'
import { requireAdmin } from '@/lib/require-admin'
import { rateLimitDb } from '@/lib/rate-limit-db'
import { getTenantForRequest } from '@/lib/tenant-query'
import { alertOwner } from '@/lib/telegram'

// SQL to create table:
// CREATE TABLE platform_feedback (
//   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
//   category TEXT DEFAULT 'general',
//   message TEXT NOT NULL,
//   status TEXT DEFAULT 'unread',
//   admin_notes TEXT,
//   tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
//   created_at TIMESTAMPTZ DEFAULT NOW()
// );
// CREATE INDEX idx_feedback_status ON platform_feedback(status);
// See migrations/2026_07_18_platform_feedback_tenant_id.sql for the tenant_id backfill.

export async function GET() {
  // Admin only — used by /admin/feedback. /api/feedback is listed as an
  // isPublicRoute (skips Clerk) so the PIN-based admin session below is the
  // only server-side gate; the admin layout's client-side check is not one.
  const authError = await requireAdmin()
  if (authError) return authError

  const { data, error } = await supabaseAdmin
    .from('platform_feedback')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { count: unreadCount } = await supabaseAdmin
    .from('platform_feedback')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'unread')

  return NextResponse.json({ feedback: data || [], unread: unreadCount || 0 })
}

export async function POST(request: Request) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const rl = await rateLimitDb(`feedback:${ip}`, 5, 10 * 60 * 1000)
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many submissions' }, { status: 429 })
    }

    const body = await request.json()
    const { message, category } = body

    if (!message || typeof message !== 'string' || message.trim().length < 3) {
      return NextResponse.json({ error: 'Feedback message is required (minimum 3 characters)' }, { status: 400 })
    }

    if (message.length > 5000) {
      return NextResponse.json({ error: 'Feedback is too long (max 5000 characters)' }, { status: 400 })
    }

    const validCategories = ['general', 'bug', 'feature', 'pricing', 'partnership', 'complaint', 'praise', 'other']
    const cat = validCategories.includes(category) ? category : 'general'

    // Best-effort tenant tag — dashboard submissions carry an authenticated
    // session; public marketing-site widget submissions have none and stay
    // anonymous, same as before.
    let tenantId: string | null = null
    let tenantName: string | null = null
    try {
      const ctx = await getTenantForRequest()
      tenantId = ctx.tenantId
      tenantName = ctx.tenant.name
    } catch {
      // No session — anonymous submission.
    }

    const { error } = await supabaseAdmin
      .from('platform_feedback')
      .insert({
        message: message.trim(),
        category: cat,
        status: 'unread',
        tenant_id: tenantId,
      })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const who = tenantName || 'Anonymous'
    const trimmed = message.trim()

    // Notify admin — email
    sendEmail({
      to: process.env.ADMIN_NOTIFICATION_EMAIL || process.env.ADMIN_EMAIL || 'hi@fullloopcrm.com',
      subject: `[Feedback] ${cat.charAt(0).toUpperCase() + cat.slice(1)} — ${who}`,
      html: `
        <div style="font-family: -apple-system, sans-serif; max-width: 500px;">
          <h2 style="color: #333; margin-bottom: 4px;">New Feedback — ${who}</h2>
          <p style="color: #888; font-size: 13px; margin-top: 0;">Category: <strong>${cat}</strong></p>
          <div style="background: #f5f5f5; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <p style="color: #333; white-space: pre-wrap; margin: 0;">${trimmed.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
          </div>
          <a href="https://homeservicesbusinesscrm.com/admin/feedback" style="display: inline-block; background: #333; color: #fff; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-size: 14px;">View in Admin</a>
        </div>
      `,
    }).catch(() => {})

    // Notify admin — in-app notification (only when we know the tenant;
    // notifications.tenant_id is NOT NULL). Surfaces on /admin/notifications.
    if (tenantId) {
      supabaseAdmin
        .from('notifications')
        .insert({
          tenant_id: tenantId,
          type: 'platform_feedback',
          title: `New feedback — ${who}`,
          message: trimmed.slice(0, 200),
          channel: 'system',
          recipient_type: 'admin',
        })
        .then(() => {}, () => {})
    }

    // Notify admin — Telegram (Jefe channel, same alerting path as
    // system-check/comms-monitor platform alerts).
    alertOwner(`New feedback (${cat}) — ${who}`, trimmed.slice(0, 500)).catch(() => {})

    return NextResponse.json({ success: true }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}

export async function PATCH(request: Request) {
  // Mark feedback as read / add notes — admin use
  const authError = await requireAdmin()
  if (authError) return authError

  try {
    const body = await request.json()
    const { id, status, admin_notes } = body

    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

    const update: Record<string, string> = {}
    if (status) update.status = status
    if (admin_notes !== undefined) update.admin_notes = admin_notes

    const { error } = await supabaseAdmin
      .from('platform_feedback')
      .update(update)
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
