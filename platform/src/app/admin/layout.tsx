import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { verifyAdminToken } from '@/app/api/admin-auth/route'
import AdminLogout from './AdminLogout'

const navSections = [
  {
    label: 'PLATFORM',
    items: [
      { label: 'Overview', href: '/admin', icon: '◐' },
      { label: 'Requests', href: '/admin/requests', icon: '◈' },
      { label: 'Businesses', href: '/admin/businesses', icon: '◉' },
      { label: 'Leads', href: '/admin/leads', icon: '◎' },
      { label: 'Analytics', href: '/admin/analytics', icon: '◇' },
    ],
  },
  {
    label: 'COMMUNICATIONS',
    items: [
      { label: 'Announcements', href: '/admin/announcements', icon: '◆' },
      { label: 'Feedback', href: '/admin/feedback', icon: '◇' },
      { label: 'Changelog', href: '/admin/changelog', icon: '◫' },
    ],
  },
  {
    label: 'SYSTEM',
    items: [
      { label: 'Security', href: '/admin/security', icon: '◈' },
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
    <div className="min-h-screen flex bg-slate-900 text-white font-body">
      {/* Sidebar */}
      <aside className="w-60 bg-slate-800/80 backdrop-blur border-r border-slate-700/50 flex flex-col">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-slate-700/50">
          <Link href="/admin" className="font-heading font-bold text-lg tracking-tight">
            Full Loop <span className="bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent">Admin</span>
          </Link>
          <p className="text-[10px] text-slate-500 mt-0.5 uppercase tracking-widest font-medium">Platform Control</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 overflow-y-auto">
          {navSections.map((section) => (
            <div key={section.label} className="mb-2">
              <p className="px-5 py-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
                {section.label}
              </p>
              {section.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 mx-2 px-3 py-2 rounded-lg text-sm text-slate-400 hover:bg-slate-700/60 hover:text-white transition-all duration-150"
                >
                  <span className="text-base w-5 text-center opacity-60">{item.icon}</span>
                  <span className="font-medium">{item.label}</span>
                </Link>
              ))}
            </div>
          ))}
        </nav>

        {/* Bottom actions */}
        <div className="border-t border-slate-700/50 px-3 py-3 space-y-1">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-400 hover:bg-slate-700/60 hover:text-white transition-all duration-150"
          >
            <span className="opacity-60">&larr;</span>
            <span className="font-medium">Dashboard</span>
          </Link>
          <AdminLogout />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0 overflow-y-auto">
        <div className="p-8 max-w-7xl">
          {children}
        </div>
      </main>
    </div>
  )
}
