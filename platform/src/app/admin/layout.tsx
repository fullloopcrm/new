import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { verifyAdminToken } from '@/app/api/admin-auth/route'

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
    <div className="min-h-screen flex bg-slate-900 text-white">
      <aside className="w-56 bg-slate-800 border-r border-slate-700 flex flex-col">
        <div className="px-5 py-4 border-b border-slate-700">
          <Link href="/admin" className="font-bold text-base">
            Full Loop <span className="text-teal-400">Admin</span>
          </Link>
          <p className="text-[10px] text-slate-500 mt-0.5 uppercase tracking-wider">Platform Control</p>
        </div>

        <nav className="flex-1 py-3 overflow-y-auto">
          {navSections.map((section) => (
            <div key={section.label} className="mb-1">
              <p className="px-5 py-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                {section.label}
              </p>
              {section.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-2.5 mx-2 px-3 py-1.5 rounded-lg text-sm text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
                >
                  <span className="text-base w-5 text-center">{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </div>
          ))}
        </nav>

        <div className="border-t border-slate-700 px-4 py-3">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
          >
            &larr; Dashboard
          </Link>
        </div>
      </aside>

      <main className="flex-1 p-8 min-w-0">{children}</main>
    </div>
  )
}
