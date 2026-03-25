'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function AnnouncementBar() {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  return (
    <div className="bg-teal-600 text-white text-sm relative z-50">
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-center gap-3">
        <span className="font-medium text-center">
          Built by home service pros with 25+ years in the field. This is the platform we wished we had.{' '}
          <Link
            href="/about-full-loop-crm"
            className="underline underline-offset-2 font-bold hover:text-yellow-300 transition-colors"
          >
            See our story &rarr;
          </Link>
        </span>
        <button
          onClick={() => setDismissed(true)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white text-lg leading-none"
          aria-label="Dismiss"
        >
          &times;
        </button>
      </div>
    </div>
  )
}
