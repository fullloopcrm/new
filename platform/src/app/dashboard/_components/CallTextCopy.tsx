'use client'

import { useState } from 'react'

/**
 * Call/Text/Copy for a phone number, used everywhere a client/team-member
 * phone shows up (bookings, clients, jobs, team, calendar). Call and Text
 * both route through ComHub (?dial= / ?text=) instead of the device's own
 * tel:/sms: apps -- Telnyx is the tenant's real phone line, so every call
 * and text needs to land in ComHub's thread history, not a personal phone.
 * Copy is a plain clipboard action for pasting the number elsewhere.
 */
export function CallTextCopy({
  phone,
  size = 'sm',
  variant = 'inline',
}: {
  phone: string
  size?: 'xs' | 'sm'
  /** 'inline' = compact pill row (default). 'block' = three stacked full-width
   * buttons, matching the "Quick Actions" sidebar pattern (clients/team detail). */
  variant?: 'inline' | 'block'
}) {
  const [copied, setCopied] = useState(false)

  function copy() {
    navigator.clipboard.writeText(phone).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  if (variant === 'block') {
    return (
      <>
        <a
          href={`/admin/comhub?dial=${encodeURIComponent(phone)}`}
          className="w-full block text-center text-sm bg-blue-50 text-blue-700 py-2 rounded-lg font-medium hover:bg-blue-100"
        >
          Call
        </a>
        <a
          href={`/admin/comhub?text=${encodeURIComponent(phone)}`}
          className="w-full block text-center text-sm bg-green-50 text-green-700 py-2 rounded-lg font-medium hover:bg-green-100"
        >
          Text
        </a>
        <button
          type="button"
          onClick={copy}
          className="w-full block text-center text-sm bg-gray-50 text-gray-600 py-2 rounded-lg font-medium hover:bg-gray-100"
        >
          {copied ? 'Copied' : 'Copy Number'}
        </button>
      </>
    )
  }

  const sizeClass = size === 'xs' ? 'text-[11px] px-1.5 py-0.5' : 'text-xs px-2 py-0.5'
  return (
    <span className="inline-flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
      <a
        href={`/admin/comhub?dial=${encodeURIComponent(phone)}`}
        className={`${sizeClass} rounded bg-blue-50 text-blue-700 font-medium hover:bg-blue-100 whitespace-nowrap`}
      >
        Call
      </a>
      <a
        href={`/admin/comhub?text=${encodeURIComponent(phone)}`}
        className={`${sizeClass} rounded bg-green-50 text-green-700 font-medium hover:bg-green-100 whitespace-nowrap`}
      >
        Text
      </a>
      <button
        type="button"
        onClick={copy}
        className={`${sizeClass} rounded bg-gray-50 text-gray-600 border border-gray-200 font-medium hover:bg-gray-100 whitespace-nowrap`}
      >
        {copied ? 'Copied' : 'Copy'}
      </button>
    </span>
  )
}
