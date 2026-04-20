/**
 * Static platform config blob for the admin /docs page.
 * Ported from nycmaid — rewritten to describe the fullloop multi-tenant
 * platform instead of a single cleaning business.
 */
import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/require-permission'

export async function GET() {
  const { error: authError } = await requirePermission('settings.view')
  if (authError) return authError

  return NextResponse.json({
    platform: 'Full Loop CRM',
    updated: '2026-04-20',
    stack: {
      framework: 'Next.js 16',
      language: 'TypeScript',
      database: 'Supabase PostgreSQL (multi-tenant via tenant_id)',
      hosting: 'Vercel',
      email: 'Resend (per-tenant API keys)',
      sms: 'Telnyx (per-tenant API keys)',
      auth: 'Clerk + PIN fallback',
      styling: 'Tailwind CSS',
    },
    surface: {
      admin: '/dashboard/*',
      public_site: '/site/*',
      client_portal: '/portal/*',
      team_portal: '/team-portal/*',
    },
    cron_jobs: [
      { endpoint: '/api/cron/reminders', description: 'Daily reminders (8am)' },
      { endpoint: '/api/cron/daily-summary', description: 'Daily ops summary (midnight)' },
      { endpoint: '/api/cron/payment-reminder', description: 'Pending payments (every 5 min)' },
      { endpoint: '/api/cron/email-monitor', description: 'Zelle/Venmo email IMAP (every minute)' },
      { endpoint: '/api/cron/late-check-in', description: 'Late check-in alerts (every 5 min)' },
      { endpoint: '/api/cron/schedule-monitor', description: 'Schedule health (3x daily)' },
      { endpoint: '/api/cron/outreach', description: 'Seasonal outreach (weekly)' },
      { endpoint: '/api/cron/sales-follow-ups', description: 'Sales deal follow-ups (daily 10am)' },
    ],
    env_vars: [
      'NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY',
      'CLERK_SECRET_KEY', 'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY', 'CLERK_WEBHOOK_SECRET',
      'RESEND_API_KEY', 'RESEND_WEBHOOK_SECRET',
      'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET',
      'TELNYX_API_KEY', 'TELNYX_PUBLIC_KEY',
      'ANTHROPIC_API_KEY',
      'CRON_SECRET', 'INTERNAL_API_KEY', 'ELCHAPO_MONITOR_KEY',
      'ADMIN_TOKEN_SECRET', 'PORTAL_SECRET', 'TEAM_PORTAL_SECRET',
      'SECRET_ENCRYPTION_KEY',
    ],
  })
}
