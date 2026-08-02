'use client'

import { formatPhone } from '@/lib/format'
import { CallTextCopy } from '../_components/CallTextCopy'

// Row-level Call/Text/Directions — lets the list be worked from without opening
// the edit panel. Call and Text both route through ComHub; Directions is a
// plain maps deep link. stopPropagation so tapping these doesn't also fire
// the row's onClick(openEdit).
export function ContactChips({ phone, address }: { phone?: string | null; address?: string | null }) {
  if (!phone && !address) return null
  return (
    <div
      className="flex items-center gap-1.5 mt-1 flex-wrap"
      onClick={(e) => e.stopPropagation()}
    >
      {phone && (
        <>
          <span className="text-[11px] text-gray-500 whitespace-nowrap">{formatPhone(phone)}</span>
          <CallTextCopy phone={phone} size="xs" />
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
