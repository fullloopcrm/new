import type { Metadata } from 'next'
import Link from 'next/link'
import { SERVICES } from '@/app/site/wash-and-fold-nyc/_lib/seo/services'
import CTABlock from '@/app/site/wash-and-fold-nyc/_components/marketing/CTABlock'

export const metadata: Metadata = {
  title: 'NYC Laundry Services — $3/lb Wash & Fold, Dry Cleaning, Pickup & Delivery',
  description: 'All laundry services by The NYC Wash and Fold Service Company. Wash & fold $3/lb, free pickup & delivery, dry cleaning, comforter cleaning, commercial laundry. Manhattan, Brooklyn & Queens. (917) 970-6002.',
  alternates: { canonical: 'https://www.washandfoldnyc.com/services' },
}

export default function ServicesPage() {
  return (
    <>
      <section className="bg-gradient-to-b from-[#1a3a5c] to-[#2B7BB0] pt-16 pb-20">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className="text-xs font-semibold text-[#7EC8E3] tracking-[0.25em] uppercase mb-4">Our Services</p>
          <h1 className="font-[family-name:var(--font-bebas)] text-4xl md:text-6xl text-white tracking-wide mb-6">
            NYC Laundry Services — $3/lb
          </h1>
          <p className="text-sky-200/60 text-lg max-w-2xl mx-auto mb-10">
            Wash & fold, pickup & delivery, dry cleaning, comforters, and commercial laundry. $39 minimum. Free pickup on all orders. Same-day rush +$20.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <div className="bg-white/10 border border-white/20 rounded-xl px-6 py-4 text-center">
              <p className="font-[family-name:var(--font-bebas)] text-3xl text-white">$3<span className="text-lg text-sky-200/60">/lb</span></p>
              <p className="text-sky-200/40 text-xs mt-1">Wash & Fold</p>
            </div>
            <div className="bg-white/10 border border-white/20 rounded-xl px-6 py-4 text-center">
              <p className="font-[family-name:var(--font-bebas)] text-3xl text-[#7EC8E3]">FREE</p>
              <p className="text-sky-200/40 text-xs mt-1">Pickup & Delivery</p>
            </div>
            <div className="bg-white/10 border border-white/20 rounded-xl px-6 py-4 text-center">
              <p className="font-[family-name:var(--font-bebas)] text-3xl text-white">+$20</p>
              <p className="text-sky-200/40 text-xs mt-1">Same-Day Rush</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="font-[family-name:var(--font-bebas)] text-3xl text-[#1a3a5c] tracking-wide text-center mb-4">All Services</h2>
          <p className="text-gray-500 text-center max-w-2xl mx-auto mb-12">Seven laundry services to cover every need — from everyday wash & fold to commercial bulk laundry.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {SERVICES.map(service => (
              <Link
                key={service.slug}
                href={`/services/${service.urlSlug}`}
                className="group border border-gray-200 rounded-2xl p-7 hover:border-[#4BA3D4] hover:shadow-lg transition-all bg-white"
              >
                <h3 className="font-[family-name:var(--font-bebas)] text-xl text-[#1a3a5c] tracking-wide mb-2 group-hover:text-[#4BA3D4] transition-colors">
                  {service.name}
                </h3>
                <p className="text-gray-500 text-sm leading-relaxed mb-4">{service.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-[#1a3a5c]">{service.priceRange}</span>
                  <span className="text-sm text-gray-400">{service.duration}</span>
                </div>
                <ul className="mt-4 space-y-1">
                  {service.features.slice(0, 4).map(f => (
                    <li key={f} className="flex items-start gap-2 text-xs text-gray-400">
                      <span className="text-[#4BA3D4] mt-0.5">&#10003;</span>
                      {f}
                    </li>
                  ))}
                </ul>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-[#F0F8FF]">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="font-[family-name:var(--font-bebas)] text-3xl text-[#1a3a5c] tracking-wide mb-4">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-10">
            <div>
              <p className="font-[family-name:var(--font-bebas)] text-5xl text-[#4BA3D4]/30">01</p>
              <p className="font-[family-name:var(--font-bebas)] text-xl text-[#1a3a5c] mt-2">Text or Call</p>
              <p className="text-gray-500 text-sm mt-2">Text (917) 970-6002 with your address. We&apos;ll schedule a pickup.</p>
            </div>
            <div>
              <p className="font-[family-name:var(--font-bebas)] text-5xl text-[#4BA3D4]/30">02</p>
              <p className="font-[family-name:var(--font-bebas)] text-xl text-[#1a3a5c] mt-2">We Pick Up</p>
              <p className="text-gray-500 text-sm mt-2">Leave your bag with the doorman or at your door. We grab it — free pickup on all orders over $39.</p>
            </div>
            <div>
              <p className="font-[family-name:var(--font-bebas)] text-5xl text-[#4BA3D4]/30">03</p>
              <p className="font-[family-name:var(--font-bebas)] text-xl text-[#1a3a5c] mt-2">Delivered Clean</p>
              <p className="text-gray-500 text-sm mt-2">Washed, dried, folded, and delivered back to your door within 24–48 hours. Pay after.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="font-[family-name:var(--font-bebas)] text-3xl text-[#1a3a5c] tracking-wide text-center mb-8">Subscription Plans</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="border border-gray-200 rounded-xl p-6 text-center">
              <p className="font-[family-name:var(--font-bebas)] text-xl text-[#1a3a5c]">Weekly 15 lb</p>
              <p className="font-[family-name:var(--font-bebas)] text-3xl text-[#4BA3D4] mt-2">$162<span className="text-lg text-gray-400">/mo</span></p>
              <p className="text-gray-400 text-xs mt-1">10% off &middot; Save $18/mo</p>
            </div>
            <div className="border-2 border-[#4BA3D4] rounded-xl p-6 text-center relative">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#4BA3D4] text-white text-xs font-bold px-3 py-1 rounded-full">Most Popular</span>
              <p className="font-[family-name:var(--font-bebas)] text-xl text-[#1a3a5c]">Weekly 20 lb</p>
              <p className="font-[family-name:var(--font-bebas)] text-3xl text-[#4BA3D4] mt-2">$216<span className="text-lg text-gray-400">/mo</span></p>
              <p className="text-gray-400 text-xs mt-1">10% off &middot; Save $24/mo</p>
            </div>
            <div className="border border-gray-200 rounded-xl p-6 text-center">
              <p className="font-[family-name:var(--font-bebas)] text-xl text-[#1a3a5c]">Biweekly 15 lb</p>
              <p className="font-[family-name:var(--font-bebas)] text-3xl text-[#4BA3D4] mt-2">$85.50<span className="text-lg text-gray-400">/mo</span></p>
              <p className="text-gray-400 text-xs mt-1">5% off &middot; Save $4.50/mo</p>
            </div>
          </div>
        </div>
      </section>

      <CTABlock title="Schedule Your Laundry Pickup" subtitle="Text or call — $3/lb, free pickup & delivery across Manhattan, Brooklyn & Queens." />
    </>
  )
}
