import { supabaseAdmin } from '@/lib/supabase'
import { sendEmail } from '@/lib/email'

// Rate limit: track last alert time per error type to avoid spamming
const alertCooldowns = new Map<string, number>()
const COOLDOWN_MS = 10 * 60 * 1000 // 10 minutes

interface ErrorContext {
  source: string       // e.g. 'api/bookings', 'cron/reminders', 'client'
  tenantId?: string    // optional — platform-level errors won't have this
  severity?: 'low' | 'medium' | 'high' | 'critical'
  url?: string
  extra?: string
}

export async function trackError(error: unknown, context: ErrorContext) {
  const message = error instanceof Error
    ? error.message
    : (typeof error === 'object' && error !== null && 'message' in error)
      ? (error as { message: string }).message
      : JSON.stringify(error)
  const stack = error instanceof Error ? error.stack : undefined
  const severity = context.severity || 'medium'

  // 1. Log to notifications table (always shows in dashboard)
  try {
    await supabaseAdmin.from('notifications').insert({
      tenant_id: context.tenantId || null,
      type: 'error',
      title: `${context.source}`,
      message: message.length > 200 ? message.slice(0, 200) + '...' : message,
      channel: 'system',
      recipient_type: 'admin',
    })
  } catch (e) {
    console.error('Failed to log error notification:', e)
  }

  // 2. Email alert for high/critical errors (rate-limited)
  if (severity === 'high' || severity === 'critical') {
    const cooldownKey = `${context.source}:${message.slice(0, 50)}`
    const lastAlert = alertCooldowns.get(cooldownKey) || 0
    const now = Date.now()

    if (now - lastAlert > COOLDOWN_MS) {
      alertCooldowns.set(cooldownKey, now)
      const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL
      if (adminEmail) {
        const html = `
          <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto;">
            <div style="background: ${severity === 'critical' ? '#dc2626' : '#f59e0b'}; color: white; padding: 16px 20px; border-radius: 8px 8px 0 0;">
              <h2 style="margin: 0; font-size: 16px;">${severity === 'critical' ? 'CRITICAL' : 'HIGH'} Error Alert</h2>
            </div>
            <div style="background: #fff; border: 1px solid #e5e7eb; border-top: 0; padding: 20px; border-radius: 0 0 8px 8px;">
              <p style="color: #666; font-size: 13px; margin: 0 0 4px 0;">Source</p>
              <p style="color: #000; font-size: 15px; margin: 0 0 16px 0; font-weight: 600;">${context.source}</p>
              <p style="color: #666; font-size: 13px; margin: 0 0 4px 0;">Error</p>
              <p style="color: #000; font-size: 14px; margin: 0 0 16px 0;">${message.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
              ${context.tenantId ? `<p style="color: #666; font-size: 13px; margin: 0 0 4px 0;">Tenant</p><p style="color: #000; font-size: 14px; margin: 0 0 16px 0;">${context.tenantId}</p>` : ''}
              ${context.url ? `<p style="color: #666; font-size: 13px; margin: 0 0 4px 0;">URL</p><p style="color: #000; font-size: 14px; margin: 0 0 16px 0;">${context.url}</p>` : ''}
              ${stack ? `<p style="color: #666; font-size: 13px; margin: 0 0 4px 0;">Stack Trace</p><pre style="background: #f5f5f5; padding: 12px; border-radius: 6px; font-size: 11px; overflow-x: auto; color: #333; margin: 0 0 16px 0;">${stack.slice(0, 500).replace(/</g, '&lt;')}</pre>` : ''}
              <p style="color: #999; font-size: 12px; margin: 0;">
                ${new Date().toLocaleString('en-US')} ET
              </p>
            </div>
          </div>
        `
        try {
          await sendEmail({
            to: adminEmail,
            subject: `[FL] ${severity === 'critical' ? 'CRITICAL' : 'HIGH'} Error: ${context.source}`,
            html,
          })
        } catch (e) {
          console.error('Failed to send error alert email:', e)
        }
      }
    }
  }

  // Always console.error for Vercel logs
  console.error(`[${severity.toUpperCase()}] ${context.source}:`, message, stack || '')
}
