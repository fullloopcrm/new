import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { verifyAdminToken } from '@/app/api/admin-auth/route'
import AdminLogout from './AdminLogout'

const navSections = [
  {
    title: 'System',
    items: [
      { label: 'Overview', href: '/admin' },
      { label: 'Businesses', href: '/admin/businesses' },
      { label: 'Requests', href: '/admin/requests' },
      { label: 'Announcements', href: '/admin/announcements' },
      { label: 'Changelog', href: '/admin/changelog' },
      { label: 'Security', href: '/admin/security' },
      { label: 'Settings', href: '/admin/settings' },
      { label: 'Docs', href: '/admin/docs' },
    ],
  },
  {
    title: 'Sales',
    items: [
      { label: 'Leads', href: '/admin/leads' },
      { label: 'Activate Accounts', href: '/admin/sales' },
      { label: 'Billing', href: '/admin/billing' },
    ],
  },
  {
    title: 'Dashboards',
    items: [
      { label: 'Notifications', href: '/admin/notifications' },
      { label: 'Bookings', href: '/admin/bookings' },
      { label: 'Calendar', href: '/admin/calendar' },
      { label: 'Clients', href: '/admin/clients' },
      { label: 'Finance', href: '/admin/finance' },
      { label: 'Team', href: '/admin/team' },
      { label: 'Analytics', href: '/admin/analytics' },
      { label: 'Feedback', href: '/admin/feedback' },
    ],
  },
  {
    title: 'Tools',
    items: [
      { label: 'Websites', href: '/admin/websites' },
      { label: 'Marketing', href: '/admin/marketing' },
      { label: 'Referrals', href: '/admin/referrals' },
      { label: 'Google Profile', href: '/admin/google-profile' },
      { label: 'Social Media', href: '/admin/social' },
      { label: 'Selena AI', href: '/admin/ai' },
      { label: 'Email', href: '/admin/email' },
      { label: 'SMS', href: '/admin/sms' },
    ],
  },
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
    <div className="min-h-screen flex font-body">
      {/* Sidebar */}
      <aside className="w-44 bg-slate-900 flex flex-col fixed inset-y-0 left-0 z-30">
        {/* Logo */}
        <div className="px-4 py-3 border-b border-white/10">
          <Link href="/admin" className="font-heading font-bold text-base text-white leading-none">
            Full Loop
          </Link>
          <p className="text-[10px] text-white/30 mt-0.5 font-medium">Admin</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-1 overflow-y-auto">
          {navSections.map((section) => (
            <div key={section.title} className="mt-4 first:mt-2">
              <p className="px-4 pb-0.5 text-[11px] uppercase tracking-wider font-semibold text-white">
                {section.title}
              </p>
              {section.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block px-4 py-1 text-[13px] font-heading font-medium text-white/70 hover:text-white hover:bg-white/10 transition-colors leading-snug"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          ))}
        </nav>

        {/* Bottom */}
        <div className="border-t border-white/10 px-3 py-2">
          <AdminLogout />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0 overflow-y-auto ml-44 bg-white text-slate-800">
        <div className="p-8 max-w-7xl">
          {children}
        </div>
      </main>
    </div>
  )
}
