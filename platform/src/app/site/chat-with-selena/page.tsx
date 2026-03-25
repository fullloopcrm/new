import type { Metadata } from 'next'
import HeroChat from '@/components/site/HeroChat'
import JsonLd from '@/components/site/JsonLd'

export const metadata: Metadata = {
  title: 'Chat With Selena — Book NYC Maid Service in 30 Seconds | The NYC Maid',
  description: 'Chat with Selena, our 24/7 AI booking concierge. Get instant pricing, check availability, and book a professional house cleaning in Manhattan, Brooklyn, Queens, Long Island or NJ — in under 30 seconds.',
  alternates: { canonical: 'https://www.thenycmaid.com/chat-with-selena' },
  openGraph: {
    title: 'Chat With Selena — Book NYC Maid Service in 30 Seconds',
    description: 'Our custom-built AI booking concierge gives you instant pricing, checks real-time availability, and books your cleaning in seconds. Available 24/7.',
    url: 'https://www.thenycmaid.com/chat-with-selena',
    siteName: 'The NYC Maid',
    type: 'website',
    locale: 'en_US',
    images: [{ url: 'https://www.thenycmaid.com/icon-512.png', width: 512, height: 512, alt: 'The NYC Maid — Chat With Selena' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Chat With Selena — Book NYC Maid Service in 30 Seconds',
    description: 'Instant pricing, real-time availability, book in seconds. Our AI concierge Selena is available 24/7.',
  },
  keywords: [
    'book cleaning online NYC', 'AI booking concierge', 'instant cleaning quote NYC',
    'chat booking maid service', 'NYC maid service online booking', 'book house cleaning Manhattan',
    'cleaning service chatbot', 'The NYC Maid Selena', '24/7 cleaning booking NYC',
  ],
}

const schemas = [
  {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Selena — The NYC Maid AI Booking Concierge',
    description: 'Custom-built AI booking concierge for The NYC Maid. Get instant pricing, check real-time availability, and book professional house cleaning in Manhattan, Brooklyn, Queens, Long Island, and New Jersey.',
    url: 'https://www.thenycmaid.com/chat-with-selena',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'All',
    browserRequirements: 'Requires JavaScript',
    offers: {
      '@type': 'AggregateOffer',
      lowPrice: '49',
      highPrice: '100',
      priceCurrency: 'USD',
      offerCount: '3',
    },
    provider: {
      '@type': 'LocalBusiness',
      name: 'The NYC Maid',
      url: 'https://www.thenycmaid.com',
      telephone: '+1-212-202-8400',
      email: 'hi@thenycmaid.com',
      address: { '@type': 'PostalAddress', addressLocality: 'New York', addressRegion: 'NY', addressCountry: 'US' },
      geo: { '@type': 'GeoCoordinates', latitude: 40.7589, longitude: -73.9851 },
      priceRange: '$49-$100/hr',
      aggregateRating: { '@type': 'AggregateRating', ratingValue: '5.0', reviewCount: '47', bestRating: '5' },
      areaServed: [
        { '@type': 'City', name: 'New York' },
        { '@type': 'City', name: 'Brooklyn' },
        { '@type': 'City', name: 'Queens' },
        { '@type': 'State', name: 'New Jersey' },
        { '@type': 'AdministrativeArea', name: 'Long Island' },
      ],
    },
    featureList: [
      'Instant pricing quotes',
      'Real-time availability checking',
      'Book in under 30 seconds',
      'Available 24/7',
      'Bilingual English/Spanish',
      'No account required',
    ],
  },
  {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'How much does house cleaning cost in NYC?',
        acceptedAnswer: { '@type': 'Answer', text: 'The NYC Maid offers three rates: $49/hr when you provide supplies, $65/hr when we bring everything (normally $75), and $100/hr for same-day emergency service. A typical 1-bedroom apartment takes about 2 hours.' },
      },
      {
        '@type': 'Question',
        name: 'How do I book a cleaning with The NYC Maid?',
        acceptedAnswer: { '@type': 'Answer', text: 'Chat with Selena, our AI booking concierge, right on our website. She\'ll get your pricing, check availability, and book your cleaning in about 30 seconds. You can also text (888) 316-4019 or call (212) 202-8400.' },
      },
      {
        '@type': 'Question',
        name: 'What areas does The NYC Maid serve?',
        acceptedAnswer: { '@type': 'Answer', text: 'We serve Manhattan, Brooklyn, Queens, western Long Island (Nassau County), and parts of New Jersey along the Hudson River within 30 minutes of NYC including Hoboken, Jersey City, and Fort Lee.' },
      },
      {
        '@type': 'Question',
        name: 'Are your cleaners background-checked and insured?',
        acceptedAnswer: { '@type': 'Answer', text: 'Yes. Every cleaner is fully background-checked, vetted, and insured up to $1,000,000. We carry general liability insurance and bonding for your complete peace of mind.' },
      },
      {
        '@type': 'Question',
        name: 'Can I book a same-day cleaning?',
        acceptedAnswer: { '@type': 'Answer', text: 'Yes. Same-day and emergency cleaning is available at $100/hr. Chat with Selena or text (888) 316-4019 and we\'ll dispatch a professional cleaner within hours.' },
      },
    ],
  },
  {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: 'House Cleaning Service NYC',
    provider: {
      '@type': 'LocalBusiness',
      name: 'The NYC Maid',
      url: 'https://www.thenycmaid.com',
    },
    serviceType: 'House Cleaning',
    areaServed: { '@type': 'City', name: 'New York' },
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Cleaning Services',
      itemListElement: [
        { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Regular Cleaning' }, priceSpecification: { '@type': 'UnitPriceSpecification', price: '49', priceCurrency: 'USD', unitText: 'hour' } },
        { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Full-Service Cleaning (We Bring Everything)' }, priceSpecification: { '@type': 'UnitPriceSpecification', price: '65', priceCurrency: 'USD', unitText: 'hour' } },
        { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Same-Day Emergency Cleaning' }, priceSpecification: { '@type': 'UnitPriceSpecification', price: '100', priceCurrency: 'USD', unitText: 'hour' } },
        { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Deep Cleaning' }, priceSpecification: { '@type': 'UnitPriceSpecification', price: '65', priceCurrency: 'USD', unitText: 'hour' } },
        { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Move-In/Move-Out Cleaning' }, priceSpecification: { '@type': 'UnitPriceSpecification', price: '65', priceCurrency: 'USD', unitText: 'hour' } },
        { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Airbnb Turnover Cleaning' }, priceSpecification: { '@type': 'UnitPriceSpecification', price: '65', priceCurrency: 'USD', unitText: 'hour' } },
      ],
    },
  },
]

export default function ChatWithSelenaPage() {
  return (
    <>
      <JsonLd data={schemas} />
      <section className="bg-gradient-to-b from-[#1E2A4A] to-[#243352] min-h-screen">
        <div className="max-w-2xl mx-auto px-4 py-12 md:py-20">
          {/* Header */}
          <div className="text-center mb-8">
            <p className="text-[#A8F0DC] text-xs font-semibold tracking-[0.25em] uppercase mb-3">The NYC Maid</p>
            <h1 className="font-[family-name:var(--font-bebas)] text-5xl md:text-6xl text-white tracking-wide leading-[0.95] mb-4">
              Chat With Selena
            </h1>
            <p className="text-white text-sm italic mb-3">
              (Named after our abuelita — the woman who taught us that a clean home is a happy home. She&apos;d be proud.)
            </p>
            <p className="text-blue-200/70 text-sm max-w-lg mx-auto">
              Our 100% custom-built AI booking concierge — pricing, availability, scheduling in seconds. Not a chatbot template. Built from scratch, just for you. Prefer to{' '}
              <a href="tel:2122028400" className="text-[#A8F0DC] font-semibold underline underline-offset-2 hover:text-white transition-colors">call</a>,{' '}
              <a href="sms:8883164019" className="text-[#A8F0DC] font-semibold underline underline-offset-2 hover:text-white transition-colors">text</a>, or{' '}
              <a href="mailto:hi@thenycmaid.com" className="text-[#A8F0DC] font-semibold underline underline-offset-2 hover:text-white transition-colors">email</a>? She&apos;s there too.
            </p>
          </div>

          {/* Chat */}
          <HeroChat />

          {/* Trust badges */}
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mt-10 text-sm">
            <span className="text-[#A8F0DC] font-medium">&#10003; No money upfront</span>
            <span className="text-[#A8F0DC] font-medium">&#10003; Payment upon completion</span>
            <span className="text-[#A8F0DC] font-medium">&#10003; No contracts</span>
            <span className="text-[#A8F0DC] font-medium">&#10003; Insured up to $1,000,000</span>
          </div>

          {/* Pricing summary */}
          <div className="grid grid-cols-3 gap-3 mt-8">
            <div className="bg-white/[0.06] border border-white/10 rounded-xl p-4 text-center">
              <p className="font-[family-name:var(--font-bebas)] text-3xl text-white">$49<span className="text-lg text-blue-200/50">/hr</span></p>
              <p className="text-blue-200/50 text-xs mt-1">You provide supplies</p>
            </div>
            <div className="bg-[#A8F0DC]/10 border border-[#A8F0DC]/30 rounded-xl p-4 text-center">
              <p className="font-[family-name:var(--font-bebas)] text-3xl text-white">$65<span className="text-lg text-blue-200/50">/hr</span></p>
              <p className="text-blue-200/50 text-xs mt-1">We bring everything</p>
            </div>
            <div className="bg-white/[0.06] border border-white/10 rounded-xl p-4 text-center">
              <p className="font-[family-name:var(--font-bebas)] text-3xl text-white">$100<span className="text-lg text-blue-200/50">/hr</span></p>
              <p className="text-blue-200/50 text-xs mt-1">Same-day emergency</p>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
