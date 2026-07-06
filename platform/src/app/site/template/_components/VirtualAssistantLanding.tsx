import Link from 'next/link'
import type { SiteConfig } from '@/app/site/template/_config/types'
import { VA_SERVICES } from '@/app/site/template/_data/va-services'
import { CITIES } from '@/app/site/template/_data/us-locations'
import { HOME_GUIDE } from '@/app/site/template/_data/va-home-guide'

/**
 * Dedicated landing for virtual-assistant tenants. Unlike the local-trade
 * GenericLanding, a VA business is remote + national, so this page drops the
 * geo/address/"licensed & insured" framing and leads with the real pitch:
 * live English-speaking human assistants (not AI voice), an $8/hr starting rate,
 * monthly packages, and the tracking + CRM stack.
 *
 * Config-driven (name, phone, colors, rating, funnel all come from SiteConfig)
 * so it stays inside the GLOBAL RULE — one component serves every VA tenant;
 * they differ by data, not by a forked file. The standard package matrix and
 * partner links below are the VA product's defaults; lift them into config when
 * a second VA tenant needs different numbers.
 */

const FULLLOOP_CRM_URL = 'https://fullloopcrm.com'
const QUO_TRACKING_URL = 'https://www.quo.com/'

const PACKAGES: { name: string; hrs: string; weekly: string; monthly: string; blurb: string; popular?: boolean }[] = [
  { name: 'Starter', hrs: '10 hrs / week', weekly: '$80/wk', monthly: '$320/mo', blurb: 'A few hours of admin or call coverage a day — the easiest way to get your time back.' },
  { name: 'Part-Time', hrs: '20 hrs / week', weekly: '$160/wk', monthly: '$640/mo', blurb: 'A dedicated assistant for half your week — enough to truly take work off your desk.', popular: true },
  { name: 'Full-Time', hrs: '40 hrs / week', weekly: '$320/wk', monthly: '$1,280/mo', blurb: 'A full-time right hand. Your business, covered every workday, start to finish.' },
]

const FAQS: { q: string; a: string }[] = [
  { q: 'Are the assistants real people or AI?', a: 'Real people — 100%. Every assistant is a fluent, professional English speaker based in the Philippines. No AI voice bots, no scripts read by a robot. American customers want to talk to a human, and that is exactly what they get.' },
  { q: 'What can a virtual assistant do for my business?', a: 'The full range — from call answering and appointment setting to admin, data entry, inbox and email management, customer support, and full CRM management inside FullLoop CRM. If it can be done remotely, your assistant can handle it.' },
  { q: 'How much does it cost?', a: 'It starts at $8/hour with a $50/week minimum. Prefer a set plan? Monthly packages run from $320/mo (10 hrs/week) up to $1,280/mo for a full-time, 40-hour-a-week assistant.' },
  { q: 'How do you track the work?', a: 'Every hour is tracked through Quo, so you can see exactly what your assistant is working on and when. Full transparency — you always know what you are paying for.' },
  { q: 'How does my assistant learn my business?', a: 'Each assistant is given a full AI knowledge panel built specifically on your business — your services, your pricing, your process — so they ramp up fast and stay consistent from day one.' },
  { q: 'What hours are they available?', a: '24/7 coverage is available. Whether you need daytime admin, after-hours call answering, or round-the-clock support, we staff to your schedule.' },
  { q: 'Where are you based?', a: 'We are headquartered in New York City and serve over 100 businesses across the United States. Local roots, nationwide reach.' },
  { q: 'Am I locked into a contract?', a: 'No long-term contract. Plans are flexible — scale your hours up or down as your business needs change.' },
]

export default function VirtualAssistantLanding({ config }: { config: SiteConfig }) {
  const name = config.identity.name
  const phone = config.contact.phone
  const smsHref = `sms:${config.contact.phoneDigits}`
  const telHref = `tel:${config.contact.phoneDigits}`

  // Both the cleaning booking funnel (/book/new) and the cleaning contact page
  // are cleaning-shaped and wrong for a VA lead. Until a dedicated VA lead form
  // exists, the CTA texts the business directly — an action that actually works
  // (matches the "Text us" secondary button). TODO: replace with a VA lead form.
  const cta = { label: 'Get an Assistant', href: `sms:${config.contact.phoneDigits}` }

  return (
    <main>
      {/* Hero */}
      <section className="bg-[var(--brand)] text-[var(--brand-fg)]">
        <div className="max-w-6xl mx-auto px-6 py-20 md:py-28">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mb-7 text-sm text-[var(--brand-fg)]/70">
            {config.reviewCount && (<>
            <span className="text-[var(--accent)] font-semibold">★ {config.rating.toFixed(1)}</span>
            <span className="hidden sm:inline text-[var(--brand-fg)]/25">|</span>
            </>)}
            <span>100+ U.S. businesses served</span>
            <span className="hidden sm:inline text-[var(--brand-fg)]/25">|</span>
            <span>American-owned &amp; managed · NYC</span>
            <span className="hidden sm:inline text-[var(--brand-fg)]/25">|</span>
            <span>24/7 coverage</span>
          </div>

          <p className="text-[var(--accent)] font-semibold tracking-[0.2em] uppercase text-sm mb-4">
            Real human assistants — not AI
          </p>
          <h1 className="font-[family-name:var(--font-bebas)] text-5xl md:text-7xl lg:text-8xl tracking-wide leading-[0.95] mb-5 max-w-4xl">
            Virtual Assistants, Starting at $8/Hour
          </h1>
          <p className="text-[var(--brand-fg)]/75 text-lg md:text-xl max-w-2xl mb-8">
            Fluent, professional English-speaking assistants from the Philippines — answering your
            calls, running your admin, and managing your CRM. A real person, 24/7, for a fraction of
            the cost of hiring in-house.
          </p>

          <div className="flex flex-wrap gap-3 mb-6">
            <Link
              href={cta.href}
              className="inline-flex items-center bg-[var(--accent)] text-[var(--accent-fg)] px-8 py-4 rounded-lg font-bold text-base tracking-widest uppercase hover:bg-[var(--accent-hover)] transition-colors"
            >
              {cta.label}
            </Link>
            <a
              href={telHref}
              className="inline-flex items-center bg-white/10 border border-white/30 text-[var(--brand-fg)] px-8 py-4 rounded-lg font-bold text-base tracking-widest uppercase hover:bg-white/20 transition-colors"
            >
              Call {phone}
            </a>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-[var(--brand-fg)]/70">
            <span>✓ $50/week minimum</span>
            <span>✓ 100% fluent English</span>
            <span>✓ No long-term contract</span>
          </div>
        </div>
      </section>

      {/* Human, not AI — differentiator strip */}
      <section className="bg-[var(--surface)] border-b border-black/5">
        <div className="max-w-5xl mx-auto px-6 py-14 text-center">
          <h2 className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[var(--brand)] tracking-wide mb-3">
            Your customers want a person. So do we.
          </h2>
          <p className="text-gray-600 max-w-3xl mx-auto text-lg leading-relaxed">
            Everyone is racing to answer the phone with a robot. Americans hang up on robots. Every
            {' '}{name} assistant is a real, fluent-English professional who talks to your customers
            like a member of your team — because for as long as you keep them, they are.
          </p>
        </div>
      </section>

      {/* VA 101 — capabilities */}
      <section className="max-w-6xl mx-auto px-6 py-16 md:py-24">
        <p className="text-xs font-semibold text-gray-400 tracking-[0.25em] uppercase mb-3 text-center">
          Virtual Assistant 101
        </p>
        <h2 className="font-[family-name:var(--font-bebas)] text-4xl md:text-5xl text-[var(--brand)] tracking-wide text-center mb-4">
          From Answering Calls to Running Your CRM
        </h2>
        <p className="text-gray-500 text-center max-w-2xl mx-auto mb-12">
          A virtual assistant is a trained professional who handles your work remotely. Ours cover
          the whole range — the front desk, the back office, and everything in between.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {VA_SERVICES.map((s) => (
            <Link
              key={s.slug}
              href={`/virtual-assistant-services/${s.slug}`}
              className="block border border-gray-200 rounded-2xl p-8 hover:border-[var(--brand)] hover:shadow-lg transition-all"
            >
              <h3 className="font-[family-name:var(--font-bebas)] text-2xl text-[var(--brand)] tracking-wide mb-2">
                {s.name}
              </h3>
              <p className="text-gray-500 text-sm leading-relaxed">{s.tagline}</p>
            </Link>
          ))}
        </div>
        <div className="text-center mt-10">
          <Link href="/virtual-assistant-services" className="text-[var(--brand)] font-semibold hover:underline underline-offset-4">
            Browse all virtual assistant services &rarr;
          </Link>
        </div>

        {/* Locations — national internal linking */}
        <div className="mt-14 border-t border-gray-100 pt-10">
          <p className="text-xs font-semibold text-gray-400 tracking-[0.25em] uppercase mb-4 text-center">
            Serving businesses nationwide
          </p>
          <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm">
            {CITIES.slice(0, 24).map((c) => (
              <Link key={c.slug} href={`/virtual-assistant/${c.slug}`} className="text-gray-500 hover:text-[var(--brand)] underline underline-offset-2">
                {c.shortName}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* How it works — knowledge panel + tracking + CRM */}
      <section className="bg-[var(--brand)] text-[var(--brand-fg)]">
        <div className="max-w-6xl mx-auto px-6 py-16 md:py-24">
          <h2 className="font-[family-name:var(--font-bebas)] text-4xl md:text-5xl tracking-wide text-center mb-14">
            Built to Plug Into Your Business
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <p className="text-[var(--accent)] font-[family-name:var(--font-bebas)] text-4xl tracking-wide mb-3">01</p>
              <h3 className="font-semibold text-lg mb-2">A knowledge panel on your business</h3>
              <p className="text-[var(--brand-fg)]/70 text-sm leading-relaxed">
                Every assistant is given a full AI knowledge panel built on your services, pricing,
                and process — so they ramp fast and answer like an insider from day one.
              </p>
            </div>
            <div>
              <p className="text-[var(--accent)] font-[family-name:var(--font-bebas)] text-4xl tracking-wide mb-3">02</p>
              <h3 className="font-semibold text-lg mb-2">Every hour tracked in Quo</h3>
              <p className="text-[var(--brand-fg)]/70 text-sm leading-relaxed">
                All work runs through{' '}
                <a href={QUO_TRACKING_URL} target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] underline underline-offset-2">Quo</a>{' '}
                for full time-tracking transparency. You always see exactly what your assistant is
                doing and what you are paying for.
              </p>
            </div>
            <div>
              <p className="text-[var(--accent)] font-[family-name:var(--font-bebas)] text-4xl tracking-wide mb-3">03</p>
              <h3 className="font-semibold text-lg mb-2">Managed inside FullLoop CRM</h3>
              <p className="text-[var(--brand-fg)]/70 text-sm leading-relaxed">
                Your assistant runs your leads and follow-ups directly in{' '}
                <a href={FULLLOOP_CRM_URL} target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] underline underline-offset-2">FullLoop CRM</a>{' '}
                — so the work lands where your business already lives.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing / monthly packages */}
      <section className="max-w-6xl mx-auto px-6 py-16 md:py-24">
        <p className="text-xs font-semibold text-gray-400 tracking-[0.25em] uppercase mb-3 text-center">
          Simple Pricing
        </p>
        <h2 className="font-[family-name:var(--font-bebas)] text-4xl md:text-5xl text-[var(--brand)] tracking-wide text-center mb-3">
          $8 an Hour. Real Assistants. No Games.
        </h2>
        <p className="text-gray-500 text-center max-w-2xl mx-auto mb-12">
          Pay as you go at <strong className="text-[var(--brand)]">$8/hour</strong> with a
          {' '}<strong className="text-[var(--brand)]">$50/week</strong> minimum, or lock in a monthly
          plan below. Every plan is the same $8/hour rate — just a set number of hours each week.
        </p>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {PACKAGES.map((pkg) => (
            <div
              key={pkg.name}
              className={
                pkg.popular
                  ? 'bg-[var(--brand)] text-[var(--brand-fg)] rounded-2xl p-8 pt-10 relative shadow-xl lg:-my-3'
                  : 'bg-white border border-gray-200 rounded-2xl p-8 flex flex-col'
              }
            >
              {pkg.popular && (
                <div className="absolute -top-3.5 left-6 bg-[var(--accent)] text-[var(--accent-fg)] text-xs font-bold tracking-widest uppercase px-5 py-1.5 rounded-full">
                  Most Popular
                </div>
              )}
              <p className={`text-xs font-semibold tracking-[0.2em] uppercase mb-3 ${pkg.popular ? 'text-[var(--accent)]' : 'text-gray-400'}`}>
                {pkg.name}
              </p>
              <p className={`font-[family-name:var(--font-bebas)] text-5xl lg:text-6xl tracking-wide leading-none mb-1 ${pkg.popular ? 'text-[var(--brand-fg)]' : 'text-[var(--brand)]'}`}>
                {pkg.monthly}
              </p>
              <p className={`text-sm mb-4 ${pkg.popular ? 'text-[var(--brand-fg)]/60' : 'text-gray-400'}`}>
                {pkg.hrs} · {pkg.weekly}
              </p>
              <p className={`text-sm leading-relaxed mb-6 ${pkg.popular ? 'text-[var(--brand-fg)]/75' : 'text-gray-500'}`}>
                {pkg.blurb}
              </p>
              <Link
                href={cta.href}
                className={
                  pkg.popular
                    ? 'inline-flex items-center justify-center bg-[var(--accent)] text-[var(--accent-fg)] px-6 py-3 rounded-lg font-bold text-sm tracking-widest uppercase hover:bg-[var(--accent-hover)] transition-colors'
                    : 'inline-flex items-center justify-center bg-[var(--brand)] text-[var(--brand-fg)] px-6 py-3 rounded-lg font-bold text-sm tracking-widest uppercase hover:bg-[rgb(var(--brand-rgb)/0.9)] transition-colors'
                }
              >
                {cta.label}
              </Link>
            </div>
          ))}
        </div>
        <p className="text-center text-gray-400 text-sm mt-8">
          Prefer to start small? Pay-as-you-go is $8/hour with a $50/week minimum.
        </p>
      </section>

      {/* About */}
      <section className="bg-[var(--surface)]">
        <div className="max-w-4xl mx-auto px-6 py-16 md:py-20">
          <p className="text-xs font-semibold text-gray-400 tracking-[0.25em] uppercase mb-3 text-center">About {name}</p>
          <h2 className="font-[family-name:var(--font-bebas)] text-4xl md:text-5xl text-[var(--brand)] tracking-wide text-center mb-6">
            American-Owned. New York Roots. Nationwide Reach.
          </h2>
          <div className="space-y-5 text-gray-600 text-lg leading-relaxed">
            <p>
              {name} is an American-owned and American-managed company headquartered in New York
              City, supporting over 100 businesses across the United States. You deal with a U.S.
              company, held to U.S. standards — with dedicated, fluent-English assistants from the
              Philippines doing the work. World-class talent, American accountability, honest pricing.
            </p>
            <p>
              We built this because we watched great businesses drown in busywork or hand their
              customers to a robot. Neither is a real answer. A real, trained person — backed by a
              knowledge panel on your business, tracked transparently, and plugged into your CRM — is.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-6 py-16 md:py-24">
        <p className="text-xs font-semibold text-gray-400 tracking-[0.25em] uppercase mb-3 text-center">FAQ</p>
        <h2 className="font-[family-name:var(--font-bebas)] text-4xl md:text-5xl text-[var(--brand)] tracking-wide text-center mb-12">
          Questions, Answered
        </h2>
        <div className="divide-y divide-gray-200">
          {FAQS.map((f) => (
            <details key={f.q} className="group py-5">
              <summary className="flex cursor-pointer items-center justify-between gap-4 list-none">
                <span className="font-semibold text-[var(--brand)] text-lg">{f.q}</span>
                <span className="text-[var(--accent)] text-2xl leading-none transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="text-gray-500 leading-relaxed mt-3">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Long-form guide — SEO depth */}
      <section className="bg-white border-t border-black/5">
        <div className="max-w-3xl mx-auto px-6 py-16 md:py-24">
          {HOME_GUIDE.map((g) => (
            <article key={g.heading} className="mb-12 last:mb-0">
              <h2 className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[var(--brand)] tracking-wide mb-5">
                {g.heading}
              </h2>
              <div className="space-y-4">
                {g.paragraphs.map((p, i) => (
                  <p key={i} className="text-gray-600 leading-relaxed">{p}</p>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Closing CTA */}
      <section className="bg-[var(--brand)] text-[var(--brand-fg)]">
        <div className="max-w-3xl mx-auto px-6 py-16 md:py-20 text-center">
          <h2 className="font-[family-name:var(--font-bebas)] text-4xl md:text-5xl tracking-wide mb-4">
            Get a Real Assistant Today
          </h2>
          <p className="text-[var(--brand-fg)]/70 mb-8 text-lg">
            Starting at $8/hour. English-speaking, 24/7, tracked and ready. Tell us what you need
            off your plate.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href={cta.href}
              className="inline-flex items-center bg-[var(--accent)] text-[var(--accent-fg)] px-8 py-4 rounded-lg font-bold text-sm tracking-widest uppercase hover:bg-[var(--accent-hover)] transition-colors"
            >
              {cta.label}
            </Link>
            <a
              href={smsHref}
              className="inline-flex items-center bg-white/10 border border-white/30 text-[var(--brand-fg)] px-8 py-4 rounded-lg font-bold text-sm tracking-widest uppercase hover:bg-white/20 transition-colors"
            >
              Text {phone}
            </a>
          </div>
        </div>
      </section>
    </main>
  )
}
