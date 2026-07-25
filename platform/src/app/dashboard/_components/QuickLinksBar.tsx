'use client'

import { useState } from 'react'
import { useTenantSettings } from '@/lib/use-tenant-settings'

export type LinkKind = 'book' | 'collect' | 'portal' | 'referral' | 'sales' | 'team' | 'reviews' | 'website' | 'feedback' | 'apply'

const LABELS: Record<LinkKind, string> = {
  book: 'Booking Form',
  collect: 'Contact/Collect Form',
  portal: 'Client Portal',
  referral: 'Referral Portal',
  sales: 'Sales Partner Portal',
  team: 'Team Portal',
  reviews: 'Review Submission Form',
  website: 'Live Website',
  feedback: 'Client Feedback Portal',
  apply: 'Careers / Apply Form',
}

// `/portal`, `/portal/collect`, `/portal/feedback`, `/team`, and
// `/reviews/submit` are root app routes (never rewritten per tenant, see
// APP_ROOT_PREFIXES in src/middleware.ts) so they're identical for every
// tenant — confirmed live 200 on nycmaid, the-florida-maid, and
// sunnyside-clean-nyc. `/book/new`, `/referral`, `/sales`, `/apply` live
// inside each tenant's own site tree and only resolve as-is for
// template-driven tenants (src/app/site/template) — the majority of
// tenants, including nycmaid.
const DEFAULT_PATHS: Record<LinkKind, string> = {
  book: '/book/new',
  collect: '/portal/collect',
  portal: '/portal',
  referral: '/referral',
  sales: '/sales',
  team: '/team',
  reviews: '/reviews/submit',
  website: '/',
  feedback: '/portal/feedback',
  apply: '/apply',
}

// Per-tenant overrides for the bespoke (non-template) tenant sites in
// src/app/site/<slug>/, each hand-built with its own route names. Audited
// directly against each tenant's site folder 2026-07-24 (see
// BESPOKE_SITE_TENANTS in src/middleware.ts for the full bespoke list).
// null = that tenant has no equivalent page yet; omit the link rather than
// show a dead one. nycmaid isn't listed — its bespoke paths already match
// the defaults.
const BESPOKE_OVERRIDES: Record<string, Partial<Record<LinkKind, string | null>>> = {
  'the-florida-maid': { book: '/book-now', sales: null },
  'we-pay-you-junk': { book: '/book-junk-removal-service-today', referral: null, sales: null, apply: '/apply-for-junk-removal-job' },
  'nyc-mobile-salon': { book: '/book', referral: null, sales: null, apply: null },
  'the-nyc-exterminator': { book: '/book-exterminator-today', referral: null, sales: null, apply: '/careers' },
  'nyc-tow': { book: '/book-towing-service-today', referral: null, sales: null, apply: '/apply-for-towing-job' },
  'nycroadsideemergencyassistance': { book: '/book-towing-service-today', referral: null, sales: null, apply: '/apply-for-towing-job' },
  'theroadsidehelper': { book: '/book-roadside-help-now', referral: null, sales: null, apply: '/apply-to-join-our-team' },
  'toll-trucks-near-me': { book: '/book-tow-truck-now', referral: null, sales: null, apply: '/apply-for-tow-driver-job' },
  'sunnyside-clean-nyc': { referral: null, sales: null, apply: '/careers' },
  'wash-and-fold-nyc': { book: null, referral: null, sales: null, apply: null },
  'wash-and-fold-hoboken': { book: null, referral: null, sales: null, apply: null },
  'landscaping-in-nyc': { book: '/book', referral: null, sales: null },
  'debt-service-ratio-loan': { book: null, referral: null, sales: null, apply: null },
  'fla-dumpster-rentals': { book: null, referral: null, sales: null, apply: null },
  'stretch-ny': { book: null, referral: null, sales: null, apply: '/careers' },
  'stretch-service': { book: null, referral: null, sales: null, apply: '/careers' },
  'the-home-services-company': { book: '/book', referral: null, sales: null },
  'the-nyc-interior-designer': { book: null, referral: null, sales: null },
  'the-nyc-marketing-company': { book: null, referral: null, sales: null, apply: null },
  'the-nyc-seo': { book: null, referral: null, sales: null, apply: null },
  'consortium-nyc': { book: null, referral: null, sales: null, apply: null },
}

interface QuickLinksBarProps {
  kinds: LinkKind[]
}

export default function QuickLinksBar({ kinds }: QuickLinksBarProps) {
  const { tenant } = useTenantSettings()
  const [copied, setCopied] = useState('')

  function copy(url: string) {
    navigator.clipboard.writeText(url)
    setCopied(url)
    setTimeout(() => setCopied(''), 2000)
  }

  const slug = typeof tenant?.slug === 'string' ? tenant.slug : ''
  const overrides = BESPOKE_OVERRIDES[slug] || {}

  const links = kinds
    .map((kind) => {
      const override = overrides[kind]
      if (override === null) return null
      return { label: LABELS[kind], path: override ?? DEFAULT_PATHS[kind] }
    })
    .filter((link): link is { label: string; path: string } => link !== null)

  if (links.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border border-slate-200 rounded-lg px-5 py-3 mb-6">
      {links.map((link) => {
        const url = typeof window !== 'undefined' ? `${window.location.origin}${link.path}` : link.path
        return (
          <div key={link.path} className="flex items-center gap-2 text-sm">
            <span className="text-slate-400">{link.label}:</span>
            <code className="text-blue-400 font-mono text-xs bg-slate-50 px-2 py-0.5 rounded">{url}</code>
            <button onClick={() => copy(url)} className="text-xs text-slate-400 hover:text-slate-900 transition-colors">
              {copied === url ? 'Copied' : 'Copy Link'}
            </button>
          </div>
        )
      })}
    </div>
  )
}
