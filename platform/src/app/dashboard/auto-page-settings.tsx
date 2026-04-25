'use client'

import { usePathname } from 'next/navigation'
import PageSettings from '@/components/page-settings'

// Maps a /dashboard pathname → { page slug, title, default tips }.
// Pages that already render their own <PageSettingsGear>/<PageSettingsPanel> will
// also see this global gear. That's intentional: every page must have a gear.
// Once per-page gears are consolidated into this auto-gear, the legacy ones can
// be removed.
const PAGE_MAP: Record<string, { page: string; title: string; tips: string[] }> = {
  '': { page: 'overview', title: 'Overview', tips: ['This is your tenant home. Use the gear to set defaults that apply across the dashboard.'] },
  'activity': { page: 'activity', title: 'Activity', tips: ['Recent client and team actions. Filter to focus on a single channel.'] },
  'ai': { page: 'ai', title: 'AI Assistant', tips: ['Configure the in-app AI assistant for your team.'] },
  'analytics': { page: 'analytics', title: 'Analytics', tips: ['Default date ranges and chart preferences live here.'] },
  'bookings': { page: 'bookings', title: 'Bookings', tips: ['Use the calendar view to visualize your week', 'Bulk select bookings to confirm or cancel'] },
  'calendar': { page: 'calendar', title: 'Calendar', tips: ['Pick your default view, week start, and timezone.'] },
  'campaigns': { page: 'campaigns', title: 'Marketing', tips: ['Configure campaign defaults — channels, sender, opt-out copy.'] },
  'changelog': { page: 'changelog', title: 'Changelog', tips: ['Stay current with platform updates from FullLoop.'] },
  'clients': { page: 'clients', title: 'Clients', tips: ['Configure list defaults, archive policy, tag colors.'] },
  'connect': { page: 'connect', title: 'Connect', tips: ['Manage third-party integrations: Google, Stripe, Telnyx, Resend.'] },
  'docs': { page: 'docs', title: 'Docs', tips: ['Pin frequently used docs and choose your preferred reading mode.'] },
  'feedback': { page: 'feedback', title: 'Feedback', tips: ['Configure auto-reply text, escalation thresholds, and channel routing.'] },
  'finance': { page: 'finance', title: 'Finance', tips: ['Default expense categories, reporting period, and tax rate.'] },
  'google': { page: 'google', title: 'Google Profile', tips: ['Sync interval, default review reply, and posting cadence.'] },
  'leads': { page: 'leads', title: 'Leads', tips: ['Configure your funnel stages, default source, and follow-up cadence.'] },
  'map': { page: 'map', title: 'Map', tips: ['Default zoom, clustering threshold, and marker styles.'] },
  'notifications': { page: 'notifications', title: 'Notifications', tips: ['Enable per-event notifications by channel — email, SMS, in-app.'] },
  'referrals': { page: 'referrals', title: 'Referrals', tips: ['Set commission rate, payout cadence, and referral copy.'] },
  'reviews': { page: 'reviews', title: 'Reviews', tips: ['Default reply template, auto-request after job, escalation rules.'] },
  'sales': { page: 'sales', title: 'Sales', tips: ['Default funnel stage filter and pipeline view.'] },
  'schedules': { page: 'schedules', title: 'Recurring Schedules', tips: ['Default recurrence cadence and timezone.'] },
  'selena': { page: 'selena', title: 'Selena', tips: ['Persona, tone, model, escalation thresholds, hours of operation.'] },
  'settings': { page: 'settings', title: 'Settings', tips: ['Tenant-wide settings live here. Page-specific settings live on each page.'] },
  'sms': { page: 'sms', title: 'SMS Inbox', tips: ['Default reply signatures, auto-archive after N days.'] },
  'social': { page: 'social', title: 'Social Media', tips: ['Connected accounts, default posting cadence, scheduling rules.'] },
  'team': { page: 'team', title: 'Team', tips: ['Default pay rate, role permissions, scheduling defaults.'] },
  'users': { page: 'users', title: 'Users', tips: ['Default role for new invites, two-factor requirements.'] },
  'websites': { page: 'websites', title: 'Websites', tips: ['Tenant-facing site toggles: legacy SEO pages, maintenance mode.'] },
}

export default function AutoPageSettings() {
  const pathname = usePathname() || '/dashboard'
  const segment = pathname.replace(/^\/dashboard\/?/, '').split('/')[0] || ''
  const config = PAGE_MAP[segment]
  if (!config) return null
  return <PageSettings page={config.page} title={config.title} tips={config.tips} />
}
