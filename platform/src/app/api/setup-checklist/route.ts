import { NextResponse } from 'next/server'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { supabaseAdmin } from '@/lib/supabase'

type ChecklistItem = {
  key: string
  label: string
  description: string
  done: boolean
  href: string
}

type ChecklistSection = {
  id: string
  title: string
  icon: string
  items: ChecklistItem[]
}

export async function GET() {
  try {
    const { tenant } = await getTenantForRequest()

    const [
      { count: clientCount },
      { count: serviceCount },
      { count: teamCount },
      { count: bookingCount },
      { count: campaignCount },
      { data: recentReviewReq },
    ] = await Promise.all([
      supabaseAdmin.from('clients').select('id', { count: 'exact', head: true }).eq('tenant_id', tenant.id),
      supabaseAdmin.from('service_types').select('id', { count: 'exact', head: true }).eq('tenant_id', tenant.id).eq('active', true),
      supabaseAdmin.from('team_members').select('id', { count: 'exact', head: true }).eq('tenant_id', tenant.id).eq('status', 'active'),
      supabaseAdmin.from('bookings').select('id', { count: 'exact', head: true }).eq('tenant_id', tenant.id),
      supabaseAdmin.from('campaigns').select('id', { count: 'exact', head: true }).eq('tenant_id', tenant.id),
      supabaseAdmin.from('reviews').select('id').eq('tenant_id', tenant.id).limit(1),
    ])

    const hasTeam = tenant.team_size !== 'solo'
    const sp = (tenant.setup_progress || {}) as Record<string, boolean>

    const sections: ChecklistSection[] = [
      {
        id: 'get_started',
        title: 'Get Started',
        icon: '🚀',
        items: [
          {
            key: 'explore_dashboard',
            label: 'Explore your dashboard',
            description: 'Take a tour — bookings, clients, team, and finance are all in the sidebar.',
            done: !!sp.explored_dashboard,
            href: '/dashboard',
          },
          {
            key: 'review_services',
            label: 'Review services & pricing',
            description: `You have ${serviceCount || 0} service(s) configured. Verify names, rates, and durations are correct.`,
            done: (serviceCount || 0) > 0 && !!sp.reviewed_services,
            href: '/dashboard/settings',
          },
          {
            key: 'verify_info',
            label: 'Verify your business info',
            description: 'Check your phone number, email, address, and website URL are correct.',
            done: !!(tenant.phone && tenant.email),
            href: '/dashboard/settings',
          },
          {
            key: 'set_hours',
            label: 'Set your business hours',
            description: 'Clients see these when booking. Make sure they match your real availability.',
            done: !!tenant.business_hours,
            href: '/dashboard/settings',
          },
          {
            key: 'review_branding',
            label: 'Review your branding',
            description: 'Your logo, colors, and tagline appear on the client portal and emails.',
            done: !!(tenant.logo_url || (tenant.primary_color && tenant.primary_color !== '#2563eb')),
            href: '/dashboard/settings',
          },
        ],
      },
      {
        id: 'clients_bookings',
        title: 'Clients & Bookings',
        icon: '📋',
        items: [
          {
            key: 'add_client',
            label: 'Add your first client',
            description: 'Import an existing client or add one manually with their name, phone, and email.',
            done: (clientCount || 0) > 0,
            href: '/dashboard/clients',
          },
          {
            key: 'first_booking',
            label: 'Create your first booking',
            description: 'Pick a client, choose a service, assign a date/time, and save.',
            done: (bookingCount || 0) > 0,
            href: '/dashboard/bookings',
          },
          {
            key: 'try_portal',
            label: 'Test the client booking portal',
            description: 'See what your clients see — try booking from their side at your portal link.',
            done: !!sp.tried_portal,
            href: '/portal',
          },
          {
            key: 'share_booking_link',
            label: 'Share your booking link',
            description: 'Copy your portal URL and add it to your website, social media, and Google Business.',
            done: !!sp.shared_booking_link,
            href: '/dashboard/settings',
          },
        ],
      },
      ...(hasTeam ? [{
        id: 'team',
        title: 'Team Setup',
        icon: '👥',
        items: [
          {
            key: 'add_team',
            label: 'Add a team member',
            description: 'Create profiles with name, phone, pay rate, and a 4-digit PIN for the mobile portal.',
            done: (teamCount || 0) > 0,
            href: '/dashboard/team',
          },
          {
            key: 'test_team_portal',
            label: 'Test the team mobile portal',
            description: 'Log in with a team PIN at /team — see their job list, check-in/out flow.',
            done: !!sp.tested_team_portal,
            href: '/team',
          },
          {
            key: 'share_team_portal',
            label: 'Share the team portal with your crew',
            description: 'Send them the /team URL and their PIN. Works great as a phone bookmark.',
            done: !!sp.shared_team_portal,
            href: '/dashboard/team',
          },
        ],
      }] : []),
      {
        id: 'marketing',
        title: 'Marketing & Growth',
        icon: '📣',
        items: [
          {
            key: 'first_campaign',
            label: 'Send your first campaign',
            description: 'Reach out to clients with an email or SMS blast — promotions, updates, or reminders.',
            done: (campaignCount || 0) > 0,
            href: '/dashboard/campaigns',
          },
          {
            key: 'request_review',
            label: 'Request a review from a client',
            description: 'After a job, ask happy clients for a Google review — builds trust and SEO.',
            done: (recentReviewReq?.length || 0) > 0,
            href: '/dashboard/reviews',
          },
          {
            key: 'setup_referrals',
            label: 'Set up your referral program',
            description: 'Let existing clients earn rewards for sending you new business.',
            done: !!sp.setup_referrals,
            href: '/dashboard/referrals',
          },
        ],
      },
      {
        id: 'account',
        title: 'Account & Billing',
        icon: '💳',
        items: [
          {
            key: 'billing',
            label: 'Confirm your billing info',
            description: 'Verify your plan, monthly rate, and payment method are correct.',
            done: !!tenant.payment_method,
            href: '/dashboard/settings',
          },
          {
            key: 'read_docs',
            label: 'Read the getting started guide',
            description: 'Quick 5-minute read covering all features — bookings, team, finance, campaigns.',
            done: !!sp.read_docs,
            href: '/dashboard/docs',
          },
        ],
      },
    ]

    // Flatten for totals
    const allItems = sections.flatMap((s) => s.items)
    const completed = allItems.filter((i) => i.done).length
    const total = allItems.length

    return NextResponse.json({ sections, completed, total })
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    throw err
  }
}

export async function POST(request: Request) {
  try {
    const { tenant } = await getTenantForRequest()
    const body = await request.json()

    if (body.dismissed) {
      await supabaseAdmin
        .from('tenants')
        .update({ setup_dismissed: true })
        .eq('id', tenant.id)
    }

    // Mark a specific checklist item as done in setup_progress
    if (body.complete_key) {
      const current = tenant.setup_progress || {}
      await supabaseAdmin
        .from('tenants')
        .update({ setup_progress: { ...current, [body.complete_key]: true } })
        .eq('id', tenant.id)
    }

    // Unmark a specific checklist item (toggle off)
    if (body.uncomplete_key) {
      const current = (tenant.setup_progress || {}) as Record<string, boolean>
      const updated = { ...current }
      delete updated[body.uncomplete_key]
      await supabaseAdmin
        .from('tenants')
        .update({ setup_progress: updated })
        .eq('id', tenant.id)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    throw err
  }
}
