'use client'

import { formatPhone } from '@/lib/format'

// Row-level Call/Text/Directions — lets the list be worked from without opening
// the edit panel. Call routes through the comhub dialer (matches the edit
// panel's own Call link); Text and Directions are plain sms:/maps deep links.
// stopPropagation so tapping these doesn't also fire the row's onClick(openEdit).
export function ContactChips({ phone, address }: { phone?: string | null; address?: string | null }) {
  if (!phone && !address) return null
  return (
    <div
      className="flex items-center gap-1.5 mt-1 flex-wrap"
      onClick={(e) => e.stopPropagation()}
    >
      {phone && (
        <>
          <a href={`/admin/comhub?dial=${encodeURIComponent(phone)}`} className="text-[11px] px-1.5 py-0.5 rounded bg-green-50 text-green-700 border border-green-200 font-medium hover:bg-green-100 whitespace-nowrap">
            {formatPhone(phone)}
          </a>
          <a href={`sms:${phone}`} className="text-[11px] px-1.5 py-0.5 rounded bg-gray-50 text-gray-600 border border-gray-200 font-medium hover:bg-gray-100" title="Text">Text</a>
        </>
      )}
      {address && (
        <a
          href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] text-gray-400 hover:text-blue-600 hover:underline truncate max-w-[160px]"
          title="Get directions"
        >
          {address}
        </a>
      )}
    </div>
  )
}
