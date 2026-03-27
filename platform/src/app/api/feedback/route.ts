import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendEmail } from '@/lib/email'

// SQL to create table:
// CREATE TABLE platform_feedback (
//   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
//   category TEXT DEFAULT 'general',
//   message TEXT NOT NULL,
//   status TEXT DEFAULT 'unread',
//   admin_notes TEXT,
//   created_at TIMESTAMPTZ DEFAULT NOW()
// );
// CREATE INDEX idx_feedback_status ON platform_feedback(status);

export async function GET() {
  // Admin only — used by /admin/feedback
  // No auth check here since admin layout handles it
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

    const { error } = await supabaseAdmin
      .from('platform_feedback')
      .insert({
        message: message.trim(),
        category: cat,
        status: 'unread',
      })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Notify admin
    sendEmail({
      to: 'jeff@consortiumnyc.com',
      subject: `[Feedback] ${cat.charAt(0).toUpperCase() + cat.slice(1)} — Anonymous`,
      html: `
        <div style="font-family: -apple-system, sans-serif; max-width: 500px;">
          <h2 style="color: #333; margin-bottom: 4px;">New Anonymous Feedback</h2>
          <p style="color: #888; font-size: 13px; margin-top: 0;">Category: <strong>${cat}</strong></p>
          <div style="background: #f5f5f5; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <p style="color: #333; white-space: pre-wrap; margin: 0;">${message.trim().replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
          </div>
          <a href="https://homeservicesbusinesscrm.com/admin/feedback" style="display: inline-block; background: #333; color: #fff; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-size: 14px;">View in Admin</a>
        </div>
      `,
    }).catch(() => {})

    return NextResponse.json({ success: true }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}

export async function PATCH(request: Request) {
  // Mark feedback as read / add notes — admin use
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
