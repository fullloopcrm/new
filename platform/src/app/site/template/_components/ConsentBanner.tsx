'use client'

import { useEffect, useState } from 'react'
import {
  DNS_COOKIE,
  NOTICE_COOKIE,
  getConsentCookie,
  setConsentCookie,
  hasGpcSignal,
} from '@/app/site/template/_lib/consent'

/**
 * Cookie/privacy notice + CCPA "Do Not Sell or Share" opt-out control.
 *
 * Opt-out model: analytics loads by default (gated server-side on `fl_dns`).
 * This banner (a) gives notice and a one-click opt-out, and (b) auto-records the
 * opt-out when the browser sends Global Privacy Control — reloading so the
 * server-rendered analytics script is dropped on the next render.
 *
 * Shows until the notice is acknowledged; the footer "Do Not Sell or Share My
 * Personal Information" link can re-open it via the `#do-not-sell` hash.
 */
export default function ConsentBanner({ privacyHref = '/privacy-policy' }: { privacyHref?: string }) {
  const [visible, setVisible] = useState(false)
  const [optedOut, setOptedOut] = useState(false)

  useEffect(() => {
    // Honor GPC automatically — a valid opt-out request under CPRA. The
    // analytics gate reads the same signal, so no reload is needed to suppress it.
    if (hasGpcSignal() && getConsentCookie(DNS_COOKIE) !== '1') {
      setConsentCookie(DNS_COOKIE, '1')
    }
    setOptedOut(getConsentCookie(DNS_COOKIE) === '1')
    const acknowledged = getConsentCookie(NOTICE_COOKIE) === '1'
    const wantsPanel = window.location.hash === '#do-not-sell'
    setVisible(!acknowledged || wantsPanel)

    // Footer "Do Not Sell or Share" link re-opens the panel via the hash.
    const onHashChange = () => {
      if (window.location.hash === '#do-not-sell') setVisible(true)
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  function acknowledge() {
    setConsentCookie(NOTICE_COOKIE, '1')
    setVisible(false)
  }

  function optOut() {
    setConsentCookie(DNS_COOKIE, '1')
    setConsentCookie(NOTICE_COOKIE, '1')
    setOptedOut(true)
    // Reload so the analytics script is suppressed server-side.
    window.location.reload()
  }

  if (!visible) return null

  return (
    <div
      role="dialog"
      aria-label="Privacy and cookie notice"
      className="fixed inset-x-0 bottom-0 z-[300] border-t border-gray-200 bg-white/95 backdrop-blur px-4 py-4 shadow-[0_-4px_24px_rgba(0,0,0,0.08)]"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm leading-relaxed text-gray-600">
          We use cookies and similar technology for site functionality and to
          measure and improve our service. You can opt out of the sale or sharing
          of your personal information at any time.{' '}
          <a href={privacyHref} className="text-[var(--brand)] underline underline-offset-2">
            Privacy Policy
          </a>
          .
        </p>
        <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={optOut}
            disabled={optedOut}
            className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
          >
            {optedOut ? 'Opted out ✓' : 'Do Not Sell or Share My Info'}
          </button>
          <button
            type="button"
            onClick={acknowledge}
            className="rounded-lg bg-[var(--brand)] px-5 py-2 text-xs font-bold uppercase tracking-widest text-white transition hover:opacity-90"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  )
}
