'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import SidePanel from '@/app/site/wash-and-fold-nyc/_components/SidePanel'
import PushPrompt from '@/app/site/wash-and-fold-nyc/_components/PushPrompt'

interface Notification {
  id: string
  type: string
  title: string | null
  message: string
  created_at: string
  read: boolean
  booking_id: string | null
  bookings?: {
    id: string
    start_time: string
    service_type: string
    price: number
    clients?: { name: string; address: string } | null
    cleaners?: { name: string } | null
  } | null
}

const notificationConfig: Record<string, { icon: string; iconBg: string; title: string }> = {
  new_booking: { icon: '📅', iconBg: 'bg-green-100', title: 'New Booking' },
  check_in: { icon: '▶️', iconBg: 'bg-blue-100', title: 'Job Started' },
  check_out: { icon: '✅', iconBg: 'bg-green-100', title: 'Job Completed' },
  payment_received: { icon: '💰', iconBg: 'bg-emerald-100', title: 'Payment Received' },
  payment_pending: { icon: '⚠️', iconBg: 'bg-yellow-100', title: 'Payment Needed' },
  booking_cancelled: { icon: '❌', iconBg: 'bg-red-100', title: 'Booking Cancelled' },
  referral_commission: { icon: '🎁', iconBg: 'bg-purple-100', title: 'Referral Commission' },
  reschedule: { icon: '🔄', iconBg: 'bg-indigo-100', title: 'Rescheduled' },
  new_referrer: { icon: '👋', iconBg: 'bg-pink-100', title: 'New Referrer' },
  new_client: { icon: '🧑', iconBg: 'bg-teal-100', title: 'New Client' },
  pending_reminder: { icon: '⚠️', iconBg: 'bg-red-100', title: 'Pending Bookings' },
  booking_confirmed: { icon: '✅', iconBg: 'bg-green-100', title: 'Booking Confirmed' },
  cleaner_application: { icon: '📋', iconBg: 'bg-blue-100', title: 'New Application' },
  job_broadcast: { icon: '📢', iconBg: 'bg-orange-100', title: 'Job Broadcast' },
  job_claimed: { icon: '🙋', iconBg: 'bg-green-100', title: 'Job Claimed' },
  job_complete: { icon: '✅', iconBg: 'bg-green-100', title: 'Job Completed' },
  recurring_expiring: { icon: '📆', iconBg: 'bg-yellow-100', title: 'Recurring Ending' },
  unpaid_team: { icon: '💸', iconBg: 'bg-red-100', title: 'Unpaid Team' },
  feedback: { icon: '💬', iconBg: 'bg-blue-100', title: 'Feedback' },
  referral_lead: { icon: '🔗', iconBg: 'bg-purple-100', title: 'Referral Lead' },
  error: { icon: '🚨', iconBg: 'bg-red-100', title: 'System Alert' },
  security: { icon: '🔒', iconBg: 'bg-gray-100', title: 'Security' },
  video_uploaded: { icon: '🎥', iconBg: 'bg-indigo-100', title: 'Video Uploaded' },
  '15min_warning': { icon: '⏱️', iconBg: 'bg-yellow-100', title: '15-Min Heads Up' },
  'time_off_request': { icon: '🏖️', iconBg: 'bg-orange-100', title: 'Time Off Request' },
  'sales_follow_up': { icon: '📞', iconBg: 'bg-amber-100', title: 'Sales Follow-Up' }
}

const defaultConfig = { icon: '🔔', iconBg: 'bg-gray-100', title: 'Notification' }

// Map notification type → admin page
function getNotificationLink(n: Notification): string | null {
  // Booking-related: link to specific booking
  if (n.booking_id) return `/admin/bookings?id=${n.booking_id}`

  switch (n.type) {
    case 'new_booking':
    case 'booking_confirmed':
    case 'booking_cancelled':
    case 'reschedule':
    case 'check_in':
    case 'check_out':
    case 'payment_received':
    case 'payment_pending':
    case 'pending_reminder':
    case 'recurring_expiring':
      return '/admin/bookings'
    case 'new_client':
      return '/admin/clients'
    case 'new_referrer':
    case 'referral_commission':
    case 'referral_lead':
      return '/admin/referrals'
    case 'cleaner_application':
    case 'job_broadcast':
    case 'job_claimed':
    case 'job_complete':
    case 'unpaid_team':
    case 'time_off_request':
      return '/admin/cleaners'
    case 'feedback':
      return '/admin/feedback'
    case 'security':
      return '/admin/settings'
    case 'sales_follow_up':
      return '/admin/sales'
    default:
      return null
  }
}

// Map href → role page key
const PAGE_KEY_MAP: Record<string, string> = {
  '/admin': 'dashboard',
  '/admin/bookings': 'bookings',
  '/admin/calendar': 'calendar',
  '/admin/clients': 'clients',
  '/admin/selena': 'selena',
  '/admin/leads': 'leads',
  '/admin/finance': 'finance',
  '/admin/cleaners': 'team',
  '/admin/websites': 'websites',
  '/admin/analytics': 'analytics',
  '/admin/referrals': 'referrals',
  '/admin/feedback': 'feedback',
  '/admin/marketing': 'marketing',
  '/admin/google': 'google-profile',
  '/admin/users': 'users',
  '/admin/sales': 'sales',
  '/admin/settings': 'settings',
  '/admin/docs': 'docs',
}

// Role → accessible page keys
const ROLE_PAGES: Record<string, string[]> = {
  owner: ['*'],
  admin: ['dashboard', 'bookings', 'calendar', 'clients', 'team', 'finance', 'feedback'],
  manager: ['dashboard', 'bookings', 'calendar', 'clients', 'selena', 'leads', 'sales', 'feedback'],
  viewer: ['dashboard', 'bookings', 'calendar'],
}

const navGroups = [
  {
    label: 'MAIN',
    items: [
      { name: 'Dashboard', href: '/admin', icon: '◻' },
      { name: 'Bookings', href: '/admin/bookings', icon: '◻' },
      { name: 'Calendar', href: '/admin/calendar', icon: '◻' },
      { name: 'Clients', href: '/admin/clients', icon: '◻' },
      { name: 'Selena', href: '/admin/selena', icon: '◻' },
      { name: 'Leads', href: '/admin/leads', icon: '◻' },
      { name: 'Sales', href: '/admin/sales', icon: '◻' },
      { name: 'Finance', href: '/admin/finance', icon: '◻' },
      { name: 'Team', href: '/admin/cleaners', icon: '◻' },
    ]
  },
  {
    label: 'TOOLS',
    items: [
      { name: 'Websites', href: '/admin/websites', icon: '◻' },
      { name: 'Analytics', href: '/admin/analytics', icon: '◻' },
      { name: 'Referrals', href: '/admin/referrals', icon: '◻' },
      { name: 'Feedback', href: '/admin/feedback', icon: '◻' },
      { name: 'Marketing', href: '/admin/marketing', icon: '◻' },
      { name: 'Google Profile', href: '/admin/google', icon: '◻' },
    ]
  },
  {
    label: 'SYSTEM',
    items: [
      { name: 'Users', href: '/admin/users', icon: '◻' },
      { name: 'Settings', href: '/admin/settings', icon: '◻' },
      { name: 'Docs', href: '/admin/docs', icon: '◻' },
    ]
  }
]

export default function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [showNotifications, setShowNotifications] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [badgeCounts, setBadgeCounts] = useState<Record<string, number>>({})
  const [userRole, setUserRole] = useState<string>('owner')

  useEffect(() => {
    fetchNotifications()
    fetchBadgeCounts()
    fetchUserRole()
    const interval = setInterval(() => { fetchNotifications(); fetchBadgeCounts() }, 60000)
    return () => clearInterval(interval)
  }, [])

  const fetchUserRole = async () => {
    try {
      const res = await fetch('/api/auth/me')
      if (res.ok) {
        const data = await res.json()
        setUserRole(data.role || 'owner')
      }
    } catch {}
  }

  const canAccess = (href: string): boolean => {
    const pageKey = PAGE_KEY_MAP[href]
    if (!pageKey) return true
    const allowed = ROLE_PAGES[userRole]
    if (!allowed) return true
    return allowed.includes('*') || allowed.includes(pageKey)
  }

  // Close mobile menu on navigation
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications?limit=20')
      if (res.ok) {
        const data = await res.json()
        setNotifications(data.notifications || [])
        setUnreadCount(data.unreadCount || 0)
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err)
    }
  }

  const fetchBadgeCounts = async () => {
    try {
      const res = await fetch('/api/sidebar-counts')
      if (res.ok) {
        const data = await res.json()
        setBadgeCounts(data)
      }
    } catch {}
  }

  const badgeMap: Record<string, string> = {
    '/admin/bookings': 'bookings',
    '/admin/calendar': 'calendar',
    '/admin/clients': 'clients',
    '/admin/feedback': 'feedback',
    '/admin/referrals': 'referrals',
    '/admin/sales': 'sales'
  }

  const markAllRead = async () => {
    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllRead: true })
      })
      setUnreadCount(0)
      setNotifications(notifications.map(n => ({ ...n, read: true })))
    } catch (err) {
      console.error('Failed to mark as read:', err)
    }
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.href = '/admin'
  }

  const formatTimeAgo = (dateStr: string) => {
    const now = new Date()
    const date = new Date(dateStr)
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)
    const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' })
    if (diffMins < 1) return `${time} (just now)`
    if (diffMins < 60) return `${time} (${diffMins}m ago)`
    if (diffHours < 24) return `${time} (${diffHours}h ago)`
    if (diffDays < 7) return `${dayName} ${time} (${diffDays}d ago)`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' + time
  }

  const getNotificationDetails = (n: Notification) => {
    const config = notificationConfig[n.type] || defaultConfig
    const booking = n.bookings
    let line1 = n.title || config.title
    let line2 = n.message
    let line3 = ''
    if (booking) {
      const date = new Date(booking.start_time).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
      const time = new Date(booking.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
      line3 = `${date} @ ${time}`
      if (booking.service_type) line3 += ` • ${booking.service_type}`
    }
    return { config, line1, line2, line3 }
  }

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin'
    return pathname.startsWith(href)
  }

  const sidebarContent = (
    <>
      {/* Brand + Notifications */}
      <div className="px-5 pt-6 pb-4">
        <div className="flex items-center justify-between">
          <Link href="/admin" className="block">
            <span className="text-[#A8F0DC] font-bold text-lg tracking-wide">NYC MAID</span>
          </Link>
          <button
            onClick={() => { if (!showNotifications && unreadCount > 0) markAllRead(); setShowNotifications(!showNotifications) }}
            className="relative p-2 rounded-lg text-white/50 hover:text-white/80 hover:bg-white/[0.04] transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
        </div>
        <div className="mt-3 h-px bg-white/10" />
      </div>

      {/* Nav Groups */}
      <nav className="flex-1 px-3 overflow-y-auto admin-sidebar-scroll">
        {navGroups.map((group) => {
          const visibleItems = group.items.filter(item => canAccess(item.href))
          if (visibleItems.length === 0) return null
          return (
            <div key={group.label} className="mb-4">
              <p className="px-3 mb-1.5 text-xs font-bold tracking-[0.12em] text-white/30 uppercase">
                {group.label}
              </p>
              {visibleItems.map((item) => {
                const active = isActive(item.href)
                const badgeKey = badgeMap[item.href]
                const count = badgeKey ? (badgeCounts[badgeKey] || 0) : 0
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-150 ${
                      active
                        ? 'bg-[#A8F0DC]/12 text-[#A8F0DC] border-l-[3px] border-[#A8F0DC] -ml-px'
                        : 'text-white/50 hover:text-white/80 hover:bg-white/[0.04]'
                    }`}
                  >
                    {active && <span className="text-[#A8F0DC] text-xs">▸</span>}
                    {item.name}
                    {count > 0 && (
                      <span className="ml-auto bg-white/15 text-white/70 text-[11px] font-semibold min-w-[20px] h-5 flex items-center justify-center rounded-full px-1.5">
                        {count > 99 ? '99+' : count}
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          )
        })}
      </nav>

      {/* Bottom section */}
      <div className="px-3 pb-4 mt-auto">
        <div className="h-px bg-white/10 mb-3" />

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium text-white/50 hover:text-red-400 hover:bg-white/[0.04] transition-all mt-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Logout
        </button>
      </div>

      {/* Notification Panel */}
      <SidePanel open={showNotifications} onClose={() => setShowNotifications(false)} title="Notifications" width="max-w-md">
        <div className="mb-4">
          <PushPrompt role="admin" />
        </div>
        {unreadCount > 0 && (
          <div className="flex justify-end mb-4">
            <button onClick={markAllRead} className="text-sm text-[#1E2A4A] hover:text-[#1E2A4A] font-medium">Mark all read</button>
          </div>
        )}
        {notifications.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-gray-400 text-4xl mb-3">🔔</p>
            <p className="text-gray-500">No notifications yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 -mx-6">
            {notifications.map((n) => {
              const { config, line1, line2, line3 } = getNotificationDetails(n)
              const link = getNotificationLink(n)
              const content = (
                <div className="flex gap-3">
                  <div className={`w-10 h-10 rounded-lg ${config.iconBg} flex items-center justify-center flex-shrink-0`}>
                    <span className="text-lg">{config.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2">
                      <p className="font-medium text-sm text-[#1E2A4A]">{line1}</p>
                      <span className="text-xs text-gray-400 whitespace-nowrap">{formatTimeAgo(n.created_at)}</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-0.5">{line2}</p>
                    {line3 && <p className="text-xs text-gray-400 mt-1">{line3}</p>}
                  </div>
                  {!n.read && <div className="w-2 h-2 bg-[#A8F0DC] rounded-full flex-shrink-0 mt-2" />}
                </div>
              )
              return link ? (
                <button
                  key={n.id}
                  onClick={() => { setShowNotifications(false); router.push(link) }}
                  className={`w-full text-left px-6 py-4 hover:bg-gray-50 transition cursor-pointer ${!n.read ? 'bg-[#A8F0DC]/10' : ''}`}
                >
                  {content}
                </button>
              ) : (
                <div key={n.id} className={`px-6 py-4 ${!n.read ? 'bg-[#A8F0DC]/10' : ''}`}>
                  {content}
                </div>
              )
            })}
          </div>
        )}
      </SidePanel>
    </>
  )

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-3 left-3 z-50 p-2 bg-[#1E2A4A] text-white rounded-lg shadow-lg"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/40" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed md:sticky top-0 left-0 z-40 h-screen w-60
          bg-[#1E2A4A] flex flex-col
          transition-transform duration-200 ease-out
          md:translate-x-0
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Mobile close */}
        <button
          onClick={() => setMobileOpen(false)}
          className="md:hidden absolute top-4 right-3 p-2.5 text-white/40 hover:text-white"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {sidebarContent}
      </aside>
    </>
  )
}
