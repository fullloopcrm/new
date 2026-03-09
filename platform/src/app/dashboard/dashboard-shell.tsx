'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Script from 'next/script'
import { UserButton } from '@clerk/nextjs'
import ToastProvider from './toast-provider'

type SidebarCounts = {
  clients: number
  bookings: number
  leads: number
  notifications: number
}

// Map nav labels to count keys
const badgeMap: Record<string, keyof SidebarCounts> = {
  Bookings: 'bookings',
  Clients: 'clients',
  Leads: 'leads',
}

const navSections = [
  {
    label: 'MAIN',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: '◐' },
      { label: 'Bookings', href: '/dashboard/bookings', icon: '◫' },
      { label: 'Map', href: '/dashboard/map', icon: '◍' },
      { label: 'Clients', href: '/dashboard/clients', icon: '◉' },
      { label: 'Leads', href: '/dashboard/leads', icon: '◇' },
      { label: 'Finance', href: '/dashboard/finance', icon: '$' },
      { label: 'Team', href: '/dashboard/team', icon: '◎' },
    ],
  },
  {
    label: 'TOOLS',
    items: [
      { label: 'Campaigns', href: '/dashboard/campaigns', icon: '◆' },
      { label: 'Reviews', href: '/dashboard/reviews', icon: '★' },
      { label: 'Referrals', href: '/dashboard/referrals', icon: '◈' },
      { label: 'Selenas AI', href: '/dashboard/ai', icon: '✧' },
    ],
  },
  {
    label: 'SYSTEM',
    items: [
      { label: 'Activity', href: '/dashboard/activity', icon: '▤' },
      { label: 'Settings', href: '/dashboard/settings', icon: '⚙' },
      { label: 'Docs', href: '/dashboard/docs', icon: '◔' },
      { label: "What's New", href: '/dashboard/changelog', icon: '✦' },
    ],
  },
]

function formatBadge(count: number): string {
  if (count > 99) return '99+'
  return String(count)
}

export default function DashboardShell({
  tenantName,
  primaryColor,
  impersonationBanner,
  children,
}: {
  tenantName: string
  primaryColor: string
  impersonationBanner: React.ReactNode | null
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [counts, setCounts] = useState<SidebarCounts | null>(null)

  useEffect(() => {
    fetch('/api/sidebar-counts')
      .then((r) => r.json())
      .then((data) => {
        if (data && !data.error) {
          setCounts(data)
        }
      })
      .catch(() => {})
  }, [])

  return (
    <div className="min-h-screen flex bg-slate-900 text-white">
      {/* Mobile backdrop overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`w-56 bg-slate-800 border-r border-slate-700 flex flex-col fixed inset-y-0 left-0 z-40 transform transition-transform md:relative md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="px-5 py-4 border-b border-slate-700">
          <div className="flex items-center justify-between">
            <h1 className="font-heading font-bold text-base truncate" style={{ color: primaryColor }}>
              {tenantName}
            </h1>
            <Link
              href="/dashboard/notifications"
              className="relative text-slate-400 hover:text-white transition-colors"
              title="Notifications"
              onClick={() => setSidebarOpen(false)}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
              </svg>
              {counts && counts.notifications > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-bold px-1 py-0.5 rounded-full min-w-[16px] text-center leading-none">
                  {formatBadge(counts.notifications)}
                </span>
              )}
            </Link>
          </div>
          <p className="text-[10px] text-slate-500 mt-0.5 uppercase tracking-wider">Full Loop CRM</p>
        </div>

        <nav className="flex-1 py-3 overflow-y-auto">
          {navSections.map((section) => (
            <div key={section.label} className="mb-1">
              <p className="px-5 py-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                {section.label}
              </p>
              {section.items.map((item) => {
                const countKey = badgeMap[item.label]
                const badgeCount = counts && countKey ? counts[countKey] : 0

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className="flex items-center justify-between mx-2 px-3 py-1.5 rounded-lg text-sm text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-base w-5 text-center">{item.icon}</span>
                      {item.label}
                    </div>
                    {badgeCount > 0 && (
                      <span className="bg-teal-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                        {formatBadge(badgeCount)}
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          ))}
        </nav>

        <div className="border-t border-slate-700 px-4 py-3">
          <UserButton afterSignOutUrl="/sign-in" />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0">
        {impersonationBanner}
        <div className="p-4 md:p-8">
          {/* Mobile hamburger button */}
          <button
            className="md:hidden p-2 text-slate-400 hover:text-white mb-4"
            onClick={() => setSidebarOpen(true)}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          {children}
        </div>
      </main>
      <ToastProvider />
      <Script id="tawk-to" strategy="lazyOnload">
        {`var Tawk_API=Tawk_API||{}, Tawk_LoadStart=new Date();
(function(){
var s1=document.createElement("script"),s0=document.getElementsByTagName("script")[0];
s1.async=true;
s1.src='https://embed.tawk.to/6823effa7c5b09190cd447fe/1ir662r4n';
s1.charset='UTF-8';
s1.setAttribute('crossorigin','*');
s0.parentNode.insertBefore(s1,s0);
})();`}
      </Script>
    </div>
  )
}
