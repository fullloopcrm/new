import type { Metadata } from 'next'
import HeroChat from '@/components/site/HeroChat'
import JsonLd from '@/components/site/JsonLd'
import { getTenantFromHeaders, tenantSiteUrl } from '@/lib/tenant-site'

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await getTenantFromHeaders()
  const name = tenant?.name || 'Our Company'
  const phone = tenant?.phone || ''
  const base = tenantSiteUrl(tenant)
  const canonical = base ? `${base}/chat-with-selena` : undefined
  const title = `Chat With Selena — Book ${name} in 30 Seconds | ${name}`
  const description = `Chat with Selena, our 24/7 AI booking concierge. Get instant pricing, check availability, and book with ${name} in under 30 seconds.${phone ? ` Call ${phone}.` : ''}`

  return {
    title,
    description,
    ...(canonical && { alternates: { canonical } }),
    openGraph: {
      title: `Chat With Selena — Book ${name} in 30 Seconds`,
      description: `Our custom-built AI booking concierge gives you instant pricing, checks real-time availability, and books your appointment in seconds. Available 24/7.`,
      ...(canonical && { url: canonical }),
      siteName: name,
      type: 'website',
      locale: 'en_US',
    },
    twitter: {
      card: 'summary_large_image',
      title: `Chat With Selena — Book ${name} in 30 Seconds`,
      description: 'Instant pricing, real-time availability, book in seconds. Our AI concierge Selena is available 24/7.',
    },
  }
}

export default async function ChatWithSelenaPage() {
  const tenant = await getTenantFromHeaders()
  const name = tenant?.name || 'Our Company'
  const phone = tenant?.phone || ''
  const phoneDigits = phone.replace(/\D/g, '')
  const email = tenant?.email || ''
  const base = tenantSiteUrl(tenant)
  const pricingTiers = ((tenant?.selena_config as Record<string, unknown>)?.pricing_tiers as Array<Record<string, unknown>>) || []

  const schemas: Record<string, unknown>[] = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: `Selena — ${name} AI Booking Concierge`,
      description: `Custom-built AI booking concierge for ${name}. Get instant pricing, check real-time availability, and book your appointment.`,
      ...(base && { url: `${base}/chat-with-selena` }),
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'All',
      browserRequirements: 'Requires JavaScript',
      provider: {
        '@type': 'LocalBusiness',
        name,
        ...(base && { url: base }),
        ...(phone && { telephone: phone }),
        ...(email && { email }),
      },
      featureList: [
        'Instant pricing quotes',
        'Real-time availability checking',
        'Book in under 30 seconds',
        'Available 24/7',
        'No account required',
      ],
    },
  ]

  return (
    <>
      <JsonLd data={schemas} />
      <section className="bg-gradient-to-b from-[var(--brand)] to-[var(--brand)] min-h-screen">
        <div className="max-w-2xl mx-auto px-4 py-12 md:py-20">
          {/* Header */}
          <div className="text-center mb-8">
            <p className="text-[var(--brand-accent)] text-xs font-semibold tracking-[0.25em] uppercase mb-3">{name}</p>
            <h1 className="font-[family-name:var(--font-bebas)] text-5xl md:text-6xl text-white tracking-wide leading-[0.95] mb-4">
              Chat With Selena
            </h1>
            <p className="text-blue-200/70 text-sm max-w-lg mx-auto">
              Our 100% custom-built AI booking concierge — pricing, availability, scheduling in seconds. Not a chatbot template. Built from scratch, just for you.
              {(phone || email) && <> Prefer to </>}
              {phone && (
                <>
                  <a href={`tel:${phoneDigits}`} className="text-[var(--brand-accent)] font-semibold underline underline-offset-2 hover:text-white transition-colors">call</a>
                  {', '}
                  <a href={`sms:${phoneDigits}`} className="text-[var(--brand-accent)] font-semibold underline underline-offset-2 hover:text-white transition-colors">text</a>
                </>
              )}
              {email && (
                <>
                  {phone ? ', or ' : ''}
                  <a href={`mailto:${email}`} className="text-[var(--brand-accent)] font-semibold underline underline-offset-2 hover:text-white transition-colors">email</a>
                </>
              )}
              {(phone || email) && <>? She&apos;s there too.</>}
            </p>
          </div>

          {/* Chat */}
          <HeroChat phone={phone} />

          {/* Trust badges */}
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mt-10 text-sm">
            <span className="text-[var(--brand-accent)] font-medium">&#10003; No money upfront</span>
            <span className="text-[var(--brand-accent)] font-medium">&#10003; Payment upon completion</span>
            <span className="text-[var(--brand-accent)] font-medium">&#10003; No contracts</span>
            <span className="text-[var(--brand-accent)] font-medium">&#10003; Licensed &amp; insured</span>
          </div>

          {/* Pricing summary — driven by tenant pricing_tiers */}
          {pricingTiers.length > 0 && (
            <div className={`grid gap-3 mt-8 ${pricingTiers.length === 1 ? 'grid-cols-1' : pricingTiers.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
              {pricingTiers.slice(0, 3).map((tier, i) => {
                const price = (tier.price as string | number) ?? ''
                const label = (tier.label as string) || (tier.name as string) || ''
                const unit = (tier.unit as string) || '/hr'
                const highlight = i === 1
                return (
                  <div
                    key={i}
                    className={highlight
                      ? 'bg-[var(--brand-accent)]/10 border border-[var(--brand-accent)]/30 rounded-xl p-4 text-center'
                      : 'bg-white/[0.06] border border-white/10 rounded-xl p-4 text-center'
                    }
                  >
                    <p className="font-[family-name:var(--font-bebas)] text-3xl text-white">
                      {typeof price === 'number' || /^\d/.test(String(price)) ? `$${price}` : price}
                      <span className="text-lg text-blue-200/50">{unit}</span>
                    </p>
                    {label && <p className="text-blue-200/50 text-xs mt-1">{label}</p>}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </section>
    </>
  )
}
