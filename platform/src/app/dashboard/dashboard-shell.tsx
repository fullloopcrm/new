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

const badgeMap: Record<string, keyof SidebarCounts> = {
  Bookings: 'bookings',
  Clients: 'clients',
  Leads: 'leads',
  Notifications: 'notifications',
}

const navSections = [
  {
    label: 'Main',
    items: [
      { label: 'Dashboard', href: '/dashboard' },
      { label: 'Bookings', href: '/dashboard/bookings' },
      { label: 'Calendar', href: '/dashboard/calendar' },
      { label: 'Clients', href: '/dashboard/clients' },
      { label: 'Leads', href: '/dashboard/leads' },
      { label: 'Finance', href: '/dashboard/finance' },
      { label: 'Team', href: '/dashboard/team' },
      { label: 'SMS Inbox', href: '/dashboard/sms' },
    ],
  },
  {
    label: 'Tools',
    items: [
      { label: 'Websites', href: '/dashboard/websites' },
      { label: 'Analytics', href: '/dashboard/analytics' },
      { label: 'Reviews', href: '/dashboard/reviews' },
      { label: 'Referrals', href: '/dashboard/referrals' },
      { label: 'Feedback', href: '/dashboard/feedback' },
      { label: 'Marketing', href: '/dashboard/campaigns' },
      { label: 'Google Profile', href: '/dashboard/google' },
      { label: 'Social Media', href: '/dashboard/social' },
      { label: 'Map', href: '/dashboard/map' },
    ],
  },
  {
    label: 'System',
    items: [
      { label: 'Settings', href: '/dashboard/settings' },
      { label: 'Docs', href: '/dashboard/docs' },
      { label: 'Notifications', href: '/dashboard/notifications' },
      { label: 'Activity Log', href: '/dashboard/activity' },
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
  isAdminImpersonation,
  children,
}: {
  tenantName: string
  primaryColor: string
  impersonationBanner: React.ReactNode | null
  isAdminImpersonation?: boolean
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [counts, setCounts] = useState<SidebarCounts | null>(null)

  useEffect(() => {
    fetch('/api/sidebar-counts')
      .then((r) => r.json())
      .then((data) => {
        if (data && !data.error) setCounts(data)
      })
      .catch(() => {})
  }, [])

  return (
    <div className="min-h-screen flex font-body">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — matches admin styling */}
      <aside
        className={`w-44 bg-slate-900 flex flex-col fixed inset-y-0 left-0 z-40 transform transition-transform md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Business name */}
        <div className="px-4 py-3 border-b border-white/10">
          <div className="flex items-center justify-between">
            <Link href="/dashboard" className="font-heading font-bold text-base text-white leading-none truncate">
              {tenantName}
            </Link>
            <Link
              href="/dashboard/notifications"
              className="relative text-white/40 hover:text-white transition-colors shrink-0"
              onClick={() => setSidebarOpen(false)}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
              </svg>
              {counts && counts.notifications > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[8px] font-bold px-1 py-0.5 rounded-full min-w-[14px] text-center leading-none">
                  {formatBadge(counts.notifications)}
                </span>
              )}
            </Link>
          </div>
          <p className="text-[10px] text-white/30 mt-0.5 font-medium">Business Profile</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-1 overflow-y-auto">
          {navSections.map((section) => (
            <div key={section.label} className="mt-4 first:mt-2">
              <p className="px-4 pb-0.5 text-[11px] uppercase tracking-wider font-semibold text-white">
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
                    className="flex items-center justify-between px-4 py-1 text-[13px] font-heading font-medium text-white/70 hover:text-white hover:bg-white/10 transition-colors leading-snug"
                  >
                    {item.label}
                    {badgeCount > 0 && (
                      <span className="bg-teal-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                        {formatBadge(badgeCount)}
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          ))}
        </nav>

        {/* Bottom */}
        <div className="border-t border-white/10 px-3 py-2">
          {isAdminImpersonation ? (
            <Link href="/admin" className="text-[11px] text-white/40 hover:text-white transition-colors font-medium">
              &larr; Back to Admin
            </Link>
          ) : (
            <UserButton afterSignOutUrl="/sign-in" />
          )}
        </div>
      </aside>

      {/* Main content — white bg like admin */}
      <main className="flex-1 min-w-0 overflow-y-auto ml-44 bg-white text-slate-800">
        {impersonationBanner}
        <div className="p-8 max-w-7xl">
          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 text-slate-400 hover:text-slate-900 mb-4 -ml-2"
            onClick={() => setSidebarOpen(true)}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
