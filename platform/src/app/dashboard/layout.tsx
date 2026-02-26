import { redirect } from 'next/navigation'
import { getCurrentTenant } from '@/lib/tenant'
import { UserButton } from '@clerk/nextjs'
import Link from 'next/link'

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: '◐' },
  { label: 'Bookings', href: '/dashboard/bookings', icon: '◫' },
  { label: 'Clients', href: '/dashboard/clients', icon: '◉' },
  { label: 'Team', href: '/dashboard/team', icon: '◎' },
  { label: 'Schedules', href: '/dashboard/schedules', icon: '◈' },
  { label: 'Reviews', href: '/dashboard/reviews', icon: '★' },
  { label: 'Campaigns', href: '/dashboard/campaigns', icon: '◆' },
  { label: 'Settings', href: '/dashboard/settings', icon: '⚙' },
]

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const tenant = await getCurrentTenant()

  if (!tenant) {
    redirect('/onboarding')
  }

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-100">
          <h1 className="font-bold text-lg" style={{ color: tenant.primary_color }}>
            {tenant.name}
          </h1>
          <p className="text-xs text-gray-400 mt-1">Full Loop CRM</p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-100">
          <UserButton afterSignOutUrl="/sign-in" />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-8">
        {children}
      </main>
    </div>
  )
}
