import Link from 'next/link'
import type { SiteConfig } from '@/app/site/template/_config/types'

// Contact page for the streetwear-editorial variant — order support, not
// "book a job." Same badge/heading rhythm as StreetwearAbout.
export default function StreetwearContact({ config }: { config: SiteConfig }) {
  const smsHref = `sms:${config.contact.phoneDigits}`
  const mailHref = `mailto:${config.contact.email}`

  return (
    <div className="bg-black min-h-screen text-white">
      <div className="max-w-[1600px] mx-auto px-5 sm:px-8 pt-12 pb-8 border-b border-white/10">
        <p className="text-[var(--accent)] text-[11px] font-bold tracking-[0.25em] uppercase mb-2 font-[family-name:var(--font-plex-mono)]">
          {config.identity.name}
        </p>
        <h1 className="font-[family-name:var(--font-anton)] text-5xl sm:text-6xl uppercase tracking-wide mb-3">Contact</h1>
        <p className="text-white/50 max-w-xl leading-relaxed">Order questions, sizing, drops — hit us up.</p>
      </div>

      <section className="bg-white text-black py-16 sm:py-24">
        <div className="max-w-[1600px] mx-auto px-5 sm:px-8 grid gap-10 sm:grid-cols-2 max-w-3xl">
          <div>
            <span className="inline-block bg-black text-white text-[11px] font-bold tracking-[0.2em] uppercase px-3 py-1.5 mb-4">
              Text / Call
            </span>
            <a href={smsHref} className="block font-[family-name:var(--font-anton)] text-3xl sm:text-4xl uppercase tracking-wide hover:text-[var(--accent)] transition-colors">
              {config.contact.phone}
            </a>
            <p className="text-black/60 mt-2 text-sm">Fastest way to reach us — order status, sizing help, whatever.</p>
          </div>
          <div>
            <span className="inline-block bg-black text-white text-[11px] font-bold tracking-[0.2em] uppercase px-3 py-1.5 mb-4">
              Email
            </span>
            <a href={mailHref} className="block font-[family-name:var(--font-anton)] text-2xl sm:text-3xl uppercase tracking-wide hover:text-[var(--accent)] transition-colors break-all">
              {config.contact.email}
            </a>
            <p className="text-black/60 mt-2 text-sm">For anything that needs a paper trail — order #, photos, returns.</p>
          </div>
        </div>
      </section>

      <section className="bg-white text-black pb-16 sm:pb-24 border-t border-black/10 pt-16">
        <div className="max-w-[1600px] mx-auto px-5 sm:px-8 max-w-3xl">
          <h2 className="font-[family-name:var(--font-anton)] text-2xl sm:text-3xl uppercase tracking-wide mb-4">
            Before You Reach Out
          </h2>
          <p className="text-black/70 text-base leading-relaxed">
            Order status, shipping, sizing, and returns are covered on our <Link href="/faq" className="underline underline-offset-4 hover:text-[var(--accent)]">FAQ</Link> page — check there first, it&apos;s usually faster than waiting on a reply.
          </p>
        </div>
      </section>
    </div>
  )
}
