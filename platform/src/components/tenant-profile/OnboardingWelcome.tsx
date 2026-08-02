'use client'

/**
 * Landing screen shown once before the ProfileWizard steps begin — on the
 * public /onboard/[token] link and the in-dashboard onboarding wizard alike.
 * Persists "seen" in localStorage (keyed by token, or 'session' for the
 * dashboard) so a tenant who leaves and comes back to finish their profile
 * doesn't have to click through it again, but a fresh link always shows it.
 */
import { useEffect, useState } from 'react'
import { PROFILE_SECTION_META as SECTION_META, type ProfileSection } from '@/lib/tenant-profile'

const seenKey = (id: string) => `fl-onboarding-welcome-seen:${id}`

export function useWelcomeGate(id: string) {
  const [showWelcome, setShowWelcome] = useState(false)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    const seen = typeof window !== 'undefined' && window.localStorage.getItem(seenKey(id)) === '1'
    setShowWelcome(!seen)
    setChecked(true)
  }, [id])

  const dismiss = () => {
    if (typeof window !== 'undefined') window.localStorage.setItem(seenKey(id), '1')
    setShowWelcome(false)
  }

  // Re-shows the welcome screen (e.g. hitting Back from the first wizard
  // step) without clearing the localStorage "seen" flag — coming back to
  // look at it again isn't the same as never having seen it, so a future
  // fresh page load still skips straight to the wizard.
  const show = () => setShowWelcome(true)

  return { showWelcome: checked && showWelcome, dismiss, show }
}

const TOUCHES: { title: string; body: string }[] = [
  { title: 'Your Services catalog', body: 'What you sell and what it costs, live in the same Catalog your team prices jobs from.' },
  { title: 'Your AI agent', body: 'Your name, tone, policies, and FAQs become what your agent says to customers — texts, calls, web chat.' },
  { title: 'Your admin tools', body: 'Invoicing, tax filing prep, licensing/insurance display, and team defaults, all pulled from here.' },
  { title: 'Your site & booking flow', body: 'Hours, service area, payment methods, and branding shape what customers actually see and use.' },
]

const TIPS: string[] = [
  "Don't have your EIN or entity type on hand yet? You can save and come back — just know your account can't fully go live (Stripe payments, Telnyx texting) until it's added.",
  'Jump between sections in any order using the tabs above — there\'s no wrong sequence to fill this out in.',
  "Not sure about a legal or tax question? Ask your accountant rather than guess — we'd rather you double-check than have it wrong.",
  'Everything you enter is editable later in Settings — nothing here is a one-time, locked-in answer.',
]

export function OnboardingWelcome({ businessName, sections, onStart }: { businessName: string; sections: ProfileSection[]; onStart: () => void }) {
  return (
    <div className="mx-auto max-w-6xl px-6 pt-12 pb-28 lg:px-10">
      <div className="mb-8 flex items-center gap-2 text-sm font-semibold text-slate-900">
        <span className="font-heading text-slate-900">Full Loop</span>
        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-900">CRM</span>
      </div>

      <h1 className="font-heading text-4xl font-bold leading-tight text-slate-900">
        Welcome to Full Loop CRM.
      </h1>
      <p className="mt-3 max-w-3xl text-base text-slate-900">
        We&apos;re excited to have you{businessName ? `, ${businessName}` : ''}. This is your business profile —
        the real, live record your whole Full Loop account runs on. It takes most owners 20-30 minutes, and you
        can save and come back anytime.
      </p>

      <div className="mb-2 mt-8 flex flex-wrap gap-2">
        <span className="flex items-center gap-1.5 rounded-full border border-teal-600 bg-teal-50 px-3 py-1.5 text-xs font-medium text-teal-700">
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-teal-600 text-[10px] text-white">✓</span>
          Welcome
        </span>
        {sections.map((s, i) => {
          const m = SECTION_META[s] || { title: s, blurb: '' }
          return (
            <span
              key={s}
              className="flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-400"
            >
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-slate-100 text-[10px] text-slate-400">
                {i + 1}
              </span>
              {m.title}
            </span>
          )
        })}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-x-10 gap-y-6 lg:grid-cols-2">
        <section>
          <h2 className="font-heading text-sm font-bold uppercase tracking-wide text-slate-900">What we&apos;re going to do</h2>
          <p className="mt-2 text-sm text-slate-900">
            Walk through 14 short sections — business identity, contact info, brand, services &amp; pricing,
            scheduling, payments, communications, and more. Nothing here is a test; skip anything you don&apos;t
            have on hand.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-sm font-bold uppercase tracking-wide text-slate-900">Why we&apos;re asking</h2>
          <p className="mt-2 text-sm text-slate-900">
            Full Loop doesn&apos;t hand you a blank dashboard and make you configure everything by hand. What you
            tell us here builds your account — your first services, your booking rules, your AI agent&apos;s voice —
            so it&apos;s ready to run your business on day one.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-sm font-bold uppercase tracking-wide text-slate-900">Where this goes</h2>
          <p className="mt-2 text-sm text-slate-900">
            Straight into your real tenant profile — the same record your dashboard, your team, and your AI agent
            all read from. No intermediate form, no re-entry step: every answer saves as you type and is live
            immediately.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-sm font-bold uppercase tracking-wide text-slate-900">Good to know</h2>
          <ul className="mt-2 space-y-1.5">
            {TIPS.map((tip) => (
              <li key={tip} className="flex gap-2 text-sm text-slate-900">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-slate-900" />
                {tip}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="mt-8">
        <h2 className="font-heading text-sm font-bold uppercase tracking-wide text-slate-900">What it touches</h2>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {TOUCHES.map((t) => (
            <div key={t.title} className="rounded border border-slate-200 bg-white p-4">
              <p className="text-sm font-semibold text-slate-900">{t.title}</p>
              <p className="mt-1 text-xs text-slate-900">{t.body}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-4 flex items-start gap-3 rounded border border-amber-200 bg-white p-4">
        <span aria-hidden className="text-lg leading-none">🚧</span>
        <p className="text-sm text-slate-900">
          <span className="font-semibold">Financial reporting and HR tools are still being built out.</span> What
          you enter here — tax ID, pay rates, licensing &amp; insurance docs — is saved and ready the moment those
          land, but you won&apos;t see finished dashboards for them yet. We&apos;ll be live soon.
        </p>
      </div>

      <div className="mt-4 flex items-start gap-3 rounded border border-slate-200 bg-white p-4">
        <span aria-hidden className="text-lg leading-none">🔒</span>
        <p className="text-sm text-slate-900">
          <span className="font-semibold">Safe and secure.</span> This link is private to your business only.
          Sensitive fields (API keys, banking/tax info) are encrypted before they&apos;re ever stored, and nothing
          you enter is shared outside your account. If you&apos;re ever unsure who&apos;s seen this link, ask us to
          regenerate it and the old one stops working instantly.
        </p>
      </div>

      <button
        type="button"
        onClick={onStart}
        className="mt-8 w-full rounded-lg bg-slate-900 px-6 py-3 text-sm font-semibold text-white hover:bg-slate-700 sm:w-auto"
      >
        Let&apos;s get started →
      </button>
    </div>
  )
}
