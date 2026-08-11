import Link from 'next/link'
import type { SiteConfig } from '@/app/site/template/_config/types'

// FAQ page for the streetwear-editorial variant — real e-commerce questions
// (shipping, sizing, returns, order tracking), not the service-business FAQ
// the shared LongformArticle content generates. Same visual rhythm as
// StreetwearAbout/StreetwearContact.
export default function StreetwearFAQ({ config }: { config: SiteConfig }) {
  const smsHref = `sms:${config.contact.phoneDigits}`
  const faqs: Array<{ q: string; a: React.ReactNode }> = [
    {
      q: 'How long does shipping take?',
      a: 'Orders ship within 2 business days. Delivery time depends on the item and supplier — you’ll get a tracking link by email/text as soon as it’s on the way.',
    },
    {
      q: 'What’s your return policy?',
      a: (
        <>
          See our <Link href="/refund-policy" className="underline underline-offset-4 hover:text-[var(--accent)]">Refund Policy</Link> for the full breakdown on returns and exchanges.
        </>
      ),
    },
    {
      q: 'How do I know my size?',
      a: 'Check the size options on each product page before you add to cart. If you’re between sizes or unsure, text us the item and we’ll help you pick.',
    },
    {
      q: 'How do I track my order?',
      a: 'You’ll get a confirmation with a permanent receipt link right after checkout, and a tracking link once your order ships.',
    },
    {
      q: 'What payment methods do you accept?',
      a: 'All major credit and debit cards through our secure checkout.',
    },
    {
      q: 'Do you ship outside the five boroughs?',
      a: 'Yes — we ship nationwide.',
    },
  ]

  return (
    <div className="bg-black min-h-screen text-white">
      <div className="max-w-[1600px] mx-auto px-5 sm:px-8 pt-12 pb-8 border-b border-white/10">
        <p className="text-[var(--accent)] text-[11px] font-bold tracking-[0.25em] uppercase mb-2 font-[family-name:var(--font-plex-mono)]">
          {config.identity.name}
        </p>
        <h1 className="font-[family-name:var(--font-anton)] text-5xl sm:text-6xl uppercase tracking-wide mb-3">FAQ</h1>
        <p className="text-white/50 max-w-xl leading-relaxed">Shipping, sizing, returns — the essentials.</p>
      </div>

      <section className="bg-white text-black py-16 sm:py-24">
        <div className="max-w-[1600px] mx-auto px-5 sm:px-8 max-w-3xl space-y-10">
          {faqs.map((f, i) => (
            <div key={i}>
              <h2 className="font-[family-name:var(--font-anton)] text-2xl sm:text-3xl uppercase tracking-wide mb-2">{f.q}</h2>
              <p className="text-black/70 text-base leading-relaxed">{f.a}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white text-black pb-16 sm:pb-24 border-t border-black/10 pt-16">
        <div className="max-w-[1600px] mx-auto px-5 sm:px-8 max-w-3xl">
          <h2 className="font-[family-name:var(--font-anton)] text-2xl sm:text-3xl uppercase tracking-wide mb-4">
            Still Have A Question?
          </h2>
          <a href={smsHref} className="inline-block bg-black text-white px-8 py-4 font-bold text-sm tracking-[0.15em] uppercase hover:bg-[var(--accent)] hover:text-black transition-colors">
            Text {config.contact.phone}
          </a>
        </div>
      </section>
    </div>
  )
}
