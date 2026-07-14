'use client'

import { useEffect, useState } from 'react'
import {
  DNS_COOKIE,
  NOTICE_COOKIE,
  getCookie,
  setCookie,
  hasGpcSignal,
  isEuVisitor,
  getConsentRecord,
  setConsentRecord,
  isConsentRecordCurrent,
} from '@/lib/consent/consent'

interface ConsentBannerProps {
  /** Link to this site's own privacy policy. Omit if the site has none yet — the banner then shows plain text instead of a dead link. */
  privacyHref?: string
}

/**
 * Cookie/privacy notice.
 *
 * - EU/EEA/UK/Switzerland visitors (geo-detected at the edge): GDPR opt-in.
 *   Analytics stays off until "Accept" is clicked. "Reject" and "Accept" are
 *   the same size/weight — rejecting is exactly as easy as accepting.
 * - Everyone else: CCPA/CPRA opt-out. Analytics loads by default; "Do Not
 *   Sell or Share" records the opt-out, and a Global Privacy Control browser
 *   signal is honored automatically.
 *
 * Either variant can be re-opened via the `#privacy-choices` (or legacy
 * `#do-not-sell`) URL hash, e.g. from a footer link.
 */
export default function ConsentBanner({ privacyHref }: ConsentBannerProps) {
  const [mounted, setMounted] = useState(false)
  const [isEu, setIsEu] = useState(false)
  const [visible, setVisible] = useState(false)
  const [optedOut, setOptedOut] = useState(false)

  function wantsReopen(): boolean {
    return window.location.hash === '#privacy-choices' || window.location.hash === '#do-not-sell'
  }

  useEffect(() => {
    setMounted(true)
    const eu = isEuVisitor()
    setIsEu(eu)

    if (eu) {
      setVisible(!isConsentRecordCurrent(getConsentRecord()) || wantsReopen())
    } else {
      // Honor GPC automatically — a valid opt-out request under CPRA.
      if (hasGpcSignal() && getCookie(DNS_COOKIE) !== '1') {
        setCookie(DNS_COOKIE, '1')
      }
      setOptedOut(getCookie(DNS_COOKIE) === '1')
      setVisible(getCookie(NOTICE_COOKIE) !== '1' || wantsReopen())
    }

    const onHashChange = () => {
      if (wantsReopen()) setVisible(true)
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  function acceptAnalytics() {
    setConsentRecord(true)
    setVisible(false)
    // Reload so gated analytics scripts mount on the next render.
    window.location.reload()
  }

  function rejectAnalytics() {
    setConsentRecord(false)
    setVisible(false)
  }

  function acknowledge() {
    setCookie(NOTICE_COOKIE, '1')
    setVisible(false)
  }

  function optOut() {
    setCookie(DNS_COOKIE, '1')
    setCookie(NOTICE_COOKIE, '1')
    setOptedOut(true)
    window.location.reload()
  }

  if (!mounted || !visible) return null

  const privacyLink = privacyHref ? (
    <a href={privacyHref} className="text-gray-900 underline underline-offset-2">
      Privacy Policy
    </a>
  ) : (
    <span className="font-medium">Privacy Policy</span>
  )

  if (isEu) {
    return (
      <div
        role="dialog"
        aria-label="Cookie consent"
        className="fixed inset-x-0 bottom-0 z-[300] border-t border-gray-200 bg-white/95 backdrop-blur px-4 py-4 shadow-[0_-4px_24px_rgba(0,0,0,0.08)]"
      >
        <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm leading-relaxed text-gray-600">
            We use cookies for site functionality. With your consent, we&apos;d also like to use
            analytics cookies to understand how visitors use this site. See our {privacyLink}.
          </p>
          <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={rejectAnalytics}
              className="rounded-lg border border-gray-300 px-5 py-2 text-xs font-bold uppercase tracking-widest text-gray-700 transition hover:bg-gray-50"
            >
              Reject
            </button>
            <button
              type="button"
              onClick={acceptAnalytics}
              className="rounded-lg bg-gray-900 px-5 py-2 text-xs font-bold uppercase tracking-widest text-white transition hover:opacity-90"
            >
              Accept
            </button>
          </div>
        </div>
      </div>
    )
  }

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
          of your personal information at any time. See our {privacyLink}.
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
            className="rounded-lg bg-gray-900 px-5 py-2 text-xs font-bold uppercase tracking-widest text-white transition hover:opacity-90"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  )
}
