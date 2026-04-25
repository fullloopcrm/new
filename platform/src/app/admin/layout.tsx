import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { verifyAdminToken } from '@/app/api/admin-auth/route'
import AdminLogout from './AdminLogout'

// Editorial Loop styling for the platform admin. Mirrors /dashboard's
// .loop-scope chrome but uses the admin's own nav structure (super-admin
// view across all tenants).

type Sub = { letter: string; label: string; href: string }
type Section = {
  num: string
  label: string
  href: string
  fold: string
  subs: Sub[]
}

const navMain: Section[] = [
  { num: '00', label: 'Overview', href: '/admin', fold: 'overview', subs: [] },
  { num: '01', label: 'Tenants', href: '/admin/businesses', fold: 'tenants', subs: [
    { letter: 'A', label: 'Businesses', href: '/admin/businesses' },
    { letter: 'B', label: 'Requests', href: '/admin/requests' },
    { letter: 'C', label: 'Prospects', href: '/admin/prospects' },
  ]},
  { num: '02', label: 'Sales', href: '/admin/sales', fold: 'sales', subs: [
    { letter: 'A', label: 'Leads', href: '/admin/leads' },
    { letter: 'B', label: 'Activate', href: '/admin/sales' },
    { letter: 'C', label: 'Billing', href: '/admin/billing' },
  ]},
  { num: '03', label: 'Live Dashboards', href: '/admin/bookings', fold: 'dash', subs: [
    { letter: 'A', label: 'Bookings', href: '/admin/bookings' },
    { letter: 'B', label: 'Calendar', href: '/admin/calendar' },
    { letter: 'C', label: 'Clients', href: '/admin/clients' },
    { letter: 'D', label: 'Finance', href: '/admin/finance' },
    { letter: 'E', label: 'Team', href: '/admin/team' },
    { letter: 'F', label: 'Analytics', href: '/admin/analytics' },
    { letter: 'G', label: 'Notifications', href: '/admin/notifications' },
    { letter: 'H', label: 'Feedback', href: '/admin/feedback' },
  ]},
  { num: '04', label: 'Marketing', href: '/admin/marketing', fold: 'marketing', subs: [
    { letter: 'A', label: 'Marketing', href: '/admin/marketing' },
    { letter: 'B', label: 'Websites', href: '/admin/websites' },
    { letter: 'C', label: 'Referrals', href: '/admin/referrals' },
    { letter: 'D', label: 'Google Profile', href: '/admin/google-profile' },
    { letter: 'E', label: 'Social', href: '/admin/social' },
    { letter: 'F', label: 'Email', href: '/admin/email' },
    { letter: 'G', label: 'SMS', href: '/admin/sms' },
  ]},
  { num: '05', label: 'Selena AI', href: '/admin/ai', fold: 'ai', subs: [] },
]

const navPlatform = [
  { label: 'System Status', href: '/admin/status' },
  { label: 'Monitoring', href: '/admin/monitoring' },
  { label: 'Security', href: '/admin/security' },
  { label: 'Announcements', href: '/admin/announcements' },
  { label: 'Changelog', href: '/admin/changelog' },
  { label: 'Settings', href: '/admin/settings' },
  { label: 'Docs', href: '/admin/docs' },
]

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()
  const token = cookieStore.get('admin_token')?.value

  if (!token || !verifyAdminToken(token)) {
    redirect('/admin-login')
  }

  return (
    <div className="loop-scope min-h-screen flex" style={{ background: 'var(--color-loop-bg)' }}>
      {/* SIDEBAR */}
      <aside
        className="w-60 fixed inset-y-0 left-0 z-40 flex flex-col"
        style={{ background: 'var(--color-loop-ink)', color: 'var(--color-loop-muted-2)', borderRight: '1px solid #2E2E2E' }}
      >
        {/* Brand */}
        <div className="px-[22px] pt-[22px] pb-1">
          <Link href="/admin" className="block" style={{ fontFamily: 'var(--display)', fontSize: '19px', fontWeight: 500, letterSpacing: '-0.015em', color: '#F4F4F1' }}>
            Full Loop<i style={{ fontStyle: 'italic', color: '#888', fontWeight: 400 }}>/</i>
          </Link>
        </div>
        <div className="px-[22px] pb-4" style={{ fontFamily: 'var(--mono)', fontSize: '10px', color: '#555', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
          Admin · v2.4
        </div>

        <div className="flex-1 overflow-y-auto pb-20">
          {/* Main */}
          <div className="mx-[22px] mt-[14px] mb-[6px]" style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.18em', color: '#5A5A5A', fontWeight: 600 }}>
            Platform
          </div>
          {navMain.map((item) => (
            <div key={item.href}>
              <Link
                href={item.href}
                className="px-[22px] py-1.5 flex items-center gap-3 transition-colors"
                style={{ fontSize: '13.5px', color: '#A8A8A4' }}
              >
                <span style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: '#5A5A5A', width: '18px', flexShrink: 0 }}>
                  {item.num}
                </span>
                <span>{item.label}</span>
              </Link>
              {item.subs.map((sub) => (
                <Link
                  key={sub.href}
                  href={sub.href}
                  className="flex items-center gap-2.5 transition-colors hover:bg-[rgba(255,255,255,0.02)]"
                  style={{ padding: '4px 22px 4px 44px', fontSize: '12.5px', color: '#888' }}
                >
                  <span style={{ fontFamily: 'var(--mono)', fontSize: '9.5px', color: '#555', width: '12px', flexShrink: 0, letterSpacing: '0.04em' }}>
                    {sub.letter}
                  </span>
                  <span>{sub.label}</span>
                </Link>
              ))}
            </div>
          ))}

          {/* Platform group */}
          <div className="mx-[22px] mt-[14px] mb-[6px]" style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.18em', color: '#5A5A5A', fontWeight: 600 }}>
            System
          </div>
          {navPlatform.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="px-[22px] py-1.5 flex items-center gap-3"
              style={{ fontSize: '13.5px', color: '#A8A8A4' }}
            >
              <span style={{ width: '18px', flexShrink: 0 }} />
              <span>{item.label}</span>
            </Link>
          ))}
        </div>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 px-[22px] pt-[14px] pb-[18px]" style={{ background: 'linear-gradient(to top, #1C1C1C 70%, transparent)' }}>
          <div className="flex items-center gap-2 pt-3" style={{ fontFamily: 'var(--mono)', fontSize: '10.5px', color: '#888', borderTop: '1px solid #2E2E2E', letterSpacing: '0.04em' }}>
            <span className="w-[6px] h-[6px] rounded-full" style={{ background: '#4ADE80', boxShadow: '0 0 8px rgba(74,222,128,0.4)' }} />
            All systems operational
          </div>
          <div className="mt-2.5">
            <AdminLogout />
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <main className="flex-1 min-w-0 overflow-y-auto md:ml-60" style={{ background: 'var(--color-loop-bg)' }}>
        <div className="px-12 pt-4 pb-24 max-w-[1500px]">
          {children}
        </div>
      </main>
    </div>
  )
}
