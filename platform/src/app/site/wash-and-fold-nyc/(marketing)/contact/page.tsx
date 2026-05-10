// @ts-nocheck
import type { Metadata } from 'next'
import Link from 'next/link'
import CTABlock from '@/app/site/wash-and-fold-nyc/_components/marketing/CTABlock'
import FAQSection from '@/app/site/wash-and-fold-nyc/_components/marketing/FAQSection'

export const metadata: Metadata = {
  title: 'Contact Wash and Fold NYC — (917) 970-6002 | Text, Call, or Email',
  description: 'Contact Wash and Fold NYC for laundry pickup & delivery. Text or call (917) 970-6002. Email hi@washandfoldnyc.com. $3/lb wash & fold across Manhattan, Brooklyn & Queens.',
  alternates: { canonical: 'https://www.washandfoldnyc.com/contact' },
  openGraph: {
    title: 'Contact Wash and Fold NYC — (917) 970-6002',
    description: 'Text, call, or email us to schedule your first pickup. $3/lb wash & fold with free pickup & delivery across NYC.',
    url: 'https://www.washandfoldnyc.com/contact',
  },
}

const contactFAQs = [
  { question: 'What is the fastest way to reach you?', answer: 'Text (917) 970-6002. We respond within minutes during business hours. Text is faster than calling for most requests.' },
  { question: 'Can I schedule a pickup by text?', answer: 'Yes. Text your address and when you want pickup. We confirm the window and send a driver. Most pickups happen same-day or next-day.' },
  { question: 'What are your hours?', answer: 'Pickup and delivery run 7am to 9pm, seven days a week. Text support is available during the same hours. We process laundry overnight so your order is ready as fast as possible.' },
  { question: 'Do I need to create an account?', answer: 'No. No app, no account, no login. Just text us your address and we handle everything. We keep your preferences on file after your first order.' },
  { question: 'What if I have a problem with my order?', answer: 'Text (917) 970-6002 within 48 hours. A real person will respond and resolve the issue — re-wash, credit, or replacement. We carry full liability insurance.' },
  { question: 'Do you have a physical location?', answer: 'Yes. Our facility is at 150 W 47th St, New York, NY 10036 in Midtown Manhattan. We are not a drop-off location — we are a pickup and delivery service.' },
]

export default function ContactPage() {
  return (
    <>
      <section className="bg-gradient-to-b from-[#1a3a5c] to-[#2B7BB0] pt-16 pb-20">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-xs font-semibold text-[#7EC8E3] tracking-[0.25em] uppercase mb-4">Contact Us</p>
          <h1 className="font-[family-name:var(--font-bebas)] text-4xl md:text-6xl text-white tracking-wide mb-6">
            Contact Wash and Fold NYC
          </h1>
          <p className="text-sky-200/60 text-lg max-w-2xl mx-auto mb-10">
            Text or call to schedule your first pickup. No app, no account, no forms — just a real person ready to help.
          </p>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <a href="sms:9179706002" className="group border border-gray-200 rounded-2xl p-8 text-center hover:border-[#4BA3D4] hover:shadow-lg transition-all">
              <div className="w-14 h-14 bg-[#F0F8FF] rounded-xl flex items-center justify-center mx-auto mb-5">
                <svg className="w-7 h-7 text-[#4BA3D4]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" /></svg>
              </div>
              <h2 className="font-[family-name:var(--font-bebas)] text-2xl text-[#1a3a5c] tracking-wide mb-2 group-hover:text-[#4BA3D4] transition-colors">Text Us</h2>
              <p className="text-[#4BA3D4] font-bold text-lg mb-2">(917) 970-6002</p>
              <p className="text-gray-500 text-sm">Fastest way to reach us. Response within minutes during business hours.</p>
            </a>

            <a href="tel:9179706002" className="group border border-gray-200 rounded-2xl p-8 text-center hover:border-[#4BA3D4] hover:shadow-lg transition-all">
              <div className="w-14 h-14 bg-[#F0F8FF] rounded-xl flex items-center justify-center mx-auto mb-5">
                <svg className="w-7 h-7 text-[#4BA3D4]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" /></svg>
              </div>
              <h2 className="font-[family-name:var(--font-bebas)] text-2xl text-[#1a3a5c] tracking-wide mb-2 group-hover:text-[#4BA3D4] transition-colors">Call Us</h2>
              <p className="text-[#4BA3D4] font-bold text-lg mb-2">(917) 970-6002</p>
              <p className="text-gray-500 text-sm">Talk to a real person. Available 7am–9pm, seven days a week.</p>
            </a>

            <a href="mailto:hi@washandfoldnyc.com" className="group border border-gray-200 rounded-2xl p-8 text-center hover:border-[#4BA3D4] hover:shadow-lg transition-all">
              <div className="w-14 h-14 bg-[#F0F8FF] rounded-xl flex items-center justify-center mx-auto mb-5">
                <svg className="w-7 h-7 text-[#4BA3D4]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" /></svg>
              </div>
              <h2 className="font-[family-name:var(--font-bebas)] text-2xl text-[#1a3a5c] tracking-wide mb-2 group-hover:text-[#4BA3D4] transition-colors">Email Us</h2>
              <p className="text-[#4BA3D4] font-bold text-lg mb-2">hi@washandfoldnyc.com</p>
              <p className="text-gray-500 text-sm">For billing, invoices, business inquiries, or partnership questions.</p>
            </a>
          </div>
        </div>
      </section>

      <section className="py-20 bg-[#F0F8FF]">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="font-[family-name:var(--font-bebas)] text-3xl text-[#1a3a5c] tracking-wide text-center mb-4">Service Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-10">
            <div className="bg-white border border-gray-200 rounded-2xl p-7">
              <h3 className="font-semibold text-[#1a3a5c] mb-3">Hours</h3>
              <p className="text-gray-500 text-sm leading-relaxed">Pickup & delivery: 7am–9pm, 7 days a week</p>
              <p className="text-gray-500 text-sm leading-relaxed">Text support: 7am–9pm daily</p>
              <p className="text-gray-500 text-sm leading-relaxed">Processing: Overnight & weekends</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl p-7">
              <h3 className="font-semibold text-[#1a3a5c] mb-3">Service Area</h3>
              <p className="text-gray-500 text-sm leading-relaxed">All of <Link href="/boroughs/manhattan" className="text-[#4BA3D4] underline underline-offset-2">Manhattan</Link>, <Link href="/boroughs/brooklyn" className="text-[#4BA3D4] underline underline-offset-2">Brooklyn</Link>, and <Link href="/boroughs/queens" className="text-[#4BA3D4] underline underline-offset-2">Queens</Link>.</p>
              <p className="text-gray-500 text-sm leading-relaxed mt-1">Nearly 200 neighborhoods. Same rate everywhere.</p>
              <Link href="/locations" className="text-[#4BA3D4] text-sm underline underline-offset-2 mt-2 inline-block">View all locations</Link>
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl p-7">
              <h3 className="font-semibold text-[#1a3a5c] mb-3">Pricing</h3>
              <p className="text-gray-500 text-sm leading-relaxed">Wash & fold: $3/lb ($39 minimum)</p>
              <p className="text-gray-500 text-sm leading-relaxed">Same-day rush: +$20</p>
              <p className="text-gray-500 text-sm leading-relaxed">Free pickup & delivery on all orders</p>
              <Link href="/services" className="text-[#4BA3D4] text-sm underline underline-offset-2 mt-2 inline-block">All services & pricing</Link>
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl p-7">
              <h3 className="font-semibold text-[#1a3a5c] mb-3">Payment</h3>
              <p className="text-gray-500 text-sm leading-relaxed">Credit card, Zelle, Venmo, Apple Pay, cash</p>
              <p className="text-gray-500 text-sm leading-relaxed mt-1">Pay after delivery. Invoicing available for businesses.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="font-[family-name:var(--font-bebas)] text-3xl text-[#1a3a5c] tracking-wide text-center mb-4">Location</h2>
          <div className="bg-[#F0F8FF] border border-[#4BA3D4]/10 rounded-2xl p-8 text-center">
            <p className="font-semibold text-[#1a3a5c] text-lg">Wash and Fold NYC</p>
            <p className="text-gray-500 mt-1">150 W 47th St, New York, NY 10036</p>
            <p className="text-gray-500 text-sm mt-1">Midtown Manhattan</p>
            <p className="text-gray-400 text-xs mt-4">We are a pickup and delivery service — not a walk-in location. Text or call to schedule.</p>
          </div>
        </div>
      </section>

      <FAQSection faqs={contactFAQs} title="Contact FAQ" />

      <CTABlock title="Ready to Schedule Your First Pickup?" subtitle="Text (917) 970-6002 with your address — we'll confirm a pickup window within minutes." />
    </>
  )
}
