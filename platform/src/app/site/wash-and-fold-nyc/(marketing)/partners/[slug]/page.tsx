// @ts-nocheck
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ALL_NEIGHBORHOODS } from '@/app/site/wash-and-fold-nyc/_lib/seo/locations'
import { AREAS } from '@/app/site/wash-and-fold-nyc/_lib/seo/data/areas'
import CTABlock from '@/app/site/wash-and-fold-nyc/_components/marketing/CTABlock'
import Breadcrumbs from '@/app/site/wash-and-fold-nyc/_components/marketing/Breadcrumbs'

interface Props { params: Promise<{ slug: string }> }

export const dynamicParams = true
export const revalidate = 2592000

export async function generateStaticParams() { return [] }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const n = ALL_NEIGHBORHOODS.find(nb => nb.slug === slug)
  if (!n) return {}
  return {
    title: `Laundromat Partnership in ${n.name} | The NYC Wash and Fold Service Company`,
    description: `Partner with The NYC Wash and Fold Service Company in ${n.name}. We send customers, you wash. $1-1.50/lb partner rate. Apply today. (917) 970-6002.`,
    alternates: { canonical: `https://www.washandfoldnyc.com/partners/${slug}` },
  }
}

export default async function NeighborhoodPartnerPage({ params }: Props) {
  const { slug } = await params
  const n = ALL_NEIGHBORHOODS.find(nb => nb.slug === slug)
  if (!n) notFound()
  const area = AREAS.find(a => a.slug === n.area)
  const nearby = ALL_NEIGHBORHOODS.filter(nb => n.nearby.includes(nb.slug)).slice(0, 6)

  return (
    <>
      <section className="bg-gradient-to-b from-[#1a3a5c] to-[#2B7BB0] pt-16 pb-20">
        <div className="max-w-6xl mx-auto px-4">
          <h1 className="font-[family-name:var(--font-bebas)] text-4xl md:text-6xl text-white tracking-wide mb-4">
            Laundromat Partnership in {n.name}
          </h1>
          <p className="text-sky-200/60 text-lg max-w-2xl mb-6">
            We&apos;re looking for a laundromat partner in {n.name}, {area?.name}. We send the customers, handle pickup & delivery, and you process the laundry at your facility.
          </p>
          <a href="sms:9179706002" className="bg-white text-[#4BA3D4] px-8 py-3.5 rounded-lg font-bold text-sm tracking-widest uppercase hover:bg-[#2B7BB0] transition-colors">
            Apply — Text (917) 970-6002
          </a>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <Breadcrumbs items={[{ name: 'Partners', href: '/partners' }, { name: n.name, href: `/partners/${n.slug}` }]} />
      </div>

      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="font-[family-name:var(--font-bebas)] text-3xl text-[#1a3a5c] tracking-wide mb-6">Why {n.name} Needs a Partner</h2>
          <div className="text-gray-600 leading-relaxed space-y-4">
            <p>{n.name} is home to {n.housing_types.slice(0, 3).join(', ')} — residents who need laundry service but don&apos;t have time to do it themselves. The neighborhood is near {n.landmarks[0]} and {n.landmarks[1]}, with steady demand for wash and fold.</p>
            <p>As a partner, you process laundry at your normal rate ($1–$1.50/lb) while we handle everything customer-facing: marketing, pickup, delivery, billing, and support. You focus on what you do best — washing clothes.</p>
          </div>

          <div className="mt-8 bg-gradient-to-r from-[#4BA3D4] to-[#7EC8E3] rounded-xl p-6 text-white">
            <p className="font-[family-name:var(--font-bebas)] text-xl mb-2">Revenue Potential in {n.name}</p>
            <p className="text-white/80 text-sm">Partner rate: <strong>$1–$1.50/lb</strong> &middot; Customer rate: <strong>$3/lb</strong> &middot; Typical partner sees 50–200+ lbs/week within 3 months</p>
          </div>
        </div>
      </section>

      {nearby.length > 0 && (
        <section className="py-16 bg-[#F0F8FF]">
          <div className="max-w-7xl mx-auto px-4">
            <h2 className="font-[family-name:var(--font-bebas)] text-3xl text-[#1a3a5c] tracking-wide text-center mb-6">Nearby Partnership Opportunities</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              {nearby.map(nb => (
                <Link key={nb.slug} href={`/partners/${nb.slug}`} className="border border-gray-200 bg-white rounded-xl p-3 text-center hover:border-[#4BA3D4] transition-all">
                  <p className="text-sm text-[#1a3a5c]">{nb.name}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <CTABlock title={`Partner in ${n.name}`} subtitle="Text (917) 970-6002 — we're actively seeking laundromat partners." />
    </>
  )
}
