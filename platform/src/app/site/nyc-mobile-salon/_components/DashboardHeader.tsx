// @ts-nocheck
'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import SidePanel from '@/app/site/nyc-mobile-salon/_components/SidePanel'
import PushPrompt from '@/app/site/nyc-mobile-salon/_components/PushPrompt'

type PageType = 'dashboard' | 'calendar' | 'bookings' | 'cleaners' | 'clients' | 'team' | 'websites' | 'leads' | 'referrals' | 'finance' | 'feedback' | 'analytics' | 'docs' | 'settings' | 'selena'

interface DashboardHeaderProps {
  currentPage?: PageType
}

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
  hot_lead: { icon: '🔥', iconBg: 'bg-orange-100', title: 'Hot Lead' },
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
  security: { icon: '🔒', iconBg: 'bg-gray-100', title: 'Security' }
}

const defaultConfig = { icon: '🔔', iconBg: 'bg-gray-100', title: 'Notification' }

function getNotificationLink(n: Notification): string | null {
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
      return '/admin/cleaners'
    case 'feedback':
      return '/admin/feedback'
    case 'security':
      return '/admin/settings'
    case 'hot_lead':
      return '/admin/leads'
    default:
      return null
  }
}

export default function DashboardHeader({ currentPage = 'dashboard' }: DashboardHeaderProps) {
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [showNotifications, setShowNotifications] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 60000)
    return () => clearInterval(interval)
  }, [])

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
    router.push('/admin')
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

  const navItems: { name: string; href: string; page: PageType }[] = [
    { name: 'Dashboard', href: '/admin', page: 'dashboard' },
    { name: 'Calendar', href: '/admin/calendar', page: 'calendar' },
    { name: 'Bookings', href: '/admin/bookings', page: 'bookings' },
    { name: 'Clients', href: '/admin/clients', page: 'clients' },
    { name: 'Team', href: '/admin/cleaners', page: 'cleaners' },
    { name: 'Websites', href: '/admin/websites', page: 'websites' },
    { name: 'Leads', href: '/admin/leads', page: 'leads' },
    { name: 'Referrals', href: '/admin/referrals', page: 'referrals' },
    { name: 'Finance', href: '/admin/finance', page: 'finance' },
    { name: 'Feedback', href: '/admin/feedback', page: 'feedback' },
    { name: 'Analytics', href: '/admin/analytics', page: 'analytics' },
    { name: 'Docs', href: '/admin/docs', page: 'docs' },
  ]

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="flex items-center justify-between px-3 md:px-6 py-3">
        <div className="flex items-center gap-3 md:gap-8">
          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2.5 -ml-1 text-gray-600 hover:text-[#1E2A4A]"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileMenuOpen
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              }
            </svg>
          </button>
          <Link href="/admin" className="text-xl font-bold text-[#1E2A4A]">
            The NYC Mobile Salon
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.page}
                href={item.href}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  currentPage === item.page
                    ? 'bg-[#1E2A4A]/10 text-[#1E2A4A]'
                    : 'text-gray-600 hover:text-[#1E2A4A] hover:bg-gray-50'
                }`}
              >
                {item.name}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-1 md:gap-2">
          {/* Settings */}
          <Link
            href="/admin/settings"
            className={`p-2 rounded-lg transition-colors ${currentPage === 'settings' ? 'bg-[#1E2A4A]/10 text-[#1E2A4A]' : 'text-gray-500 hover:text-[#1E2A4A] hover:bg-gray-50'}`}
            title="Settings"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </Link>

          {/* Notifications */}
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 text-gray-500 hover:text-[#1E2A4A] hover:bg-gray-50 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

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

          {/* Logout */}
          <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-[#1E2A4A] ml-1 md:ml-2 hidden md:block">Logout</button>
          <button onClick={handleLogout} className="md:hidden p-2 text-gray-500 hover:text-[#1E2A4A]" title="Logout">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile nav menu */}
      {mobileMenuOpen && (
        <nav className="md:hidden border-t border-gray-200 bg-white px-3 py-2">
          <div className="grid grid-cols-3 gap-1">
            {navItems.map((item) => (
              <Link
                key={item.page}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`px-3 py-3 rounded-lg text-sm font-medium text-center transition-colors ${
                  currentPage === item.page
                    ? 'bg-[#1E2A4A] text-white'
                    : 'text-gray-600 hover:text-[#1E2A4A] bg-gray-50'
                }`}
              >
                {item.name}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </header>
  )
}
