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
export const revalidate = 86400

export async function generateStaticParams() { return [] }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const n = ALL_NEIGHBORHOODS.find(nb => nb.slug === slug)
  if (!n) return {}
  return {
    title: `Laundry Jobs in ${n.name} — Now Hiring | The NYC Wash and Fold Service Company`,
    description: `Now hiring laundry pickup, processing & delivery workers in ${n.name}. $18-22/hr, flexible schedule, weekly pay. Apply today. (917) 970-6002.`,
    alternates: { canonical: `https://www.washandfoldnyc.com/careers/${slug}` },
  }
}

export default async function NeighborhoodCareerPage({ params }: Props) {
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
            Laundry Jobs in {n.name}
          </h1>
          <p className="text-sky-200/60 text-lg max-w-2xl mb-6">
            Now hiring pickup/delivery drivers and laundry attendants in {n.name}, {area?.name}. $18–22/hr, flexible schedule, weekly pay.
          </p>
          <a href="sms:9179706002" className="bg-white text-[#4BA3D4] px-8 py-3.5 rounded-lg font-bold text-sm tracking-widest uppercase hover:bg-[#2B7BB0] transition-colors">
            Apply — Text (917) 970-6002
          </a>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <Breadcrumbs items={[{ name: 'Careers', href: '/careers' }, { name: n.name, href: `/careers/${n.slug}` }]} />
      </div>

      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="font-[family-name:var(--font-bebas)] text-3xl text-[#1a3a5c] tracking-wide mb-6">What the Job Involves</h2>
          <div className="space-y-4 text-gray-600 leading-relaxed">
            <p>As a NYC Wash and Fold Service Company team member in {n.name}, you&apos;ll handle laundry pickups and deliveries in the {n.name} area and surrounding neighborhoods. You&apos;ll work with {n.housing_types.slice(0, 2).join(' and ')} near landmarks like {n.landmarks[0]} and {n.landmarks[1]}.</p>
            <p>Routes typically cover {n.name} and nearby areas including {n.nearby.slice(0, 3).join(', ')}. You set your own availability — morning routes, afternoon routes, or both.</p>
          </div>

          <h2 className="font-[family-name:var(--font-bebas)] text-3xl text-[#1a3a5c] tracking-wide mt-12 mb-6">Requirements</h2>
          <ul className="space-y-2">
            {['Valid ID', 'Smartphone for route coordination', 'Reliable and punctual', 'Comfortable carrying laundry bags (up to 30 lbs)', 'English required, Spanish a plus', 'Background check required'].map(r => (
              <li key={r} className="flex items-start gap-2 text-gray-600">
                <span className="text-[#4BA3D4] mt-1">&#10003;</span>{r}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {nearby.length > 0 && (
        <section className="py-16 bg-[#F0F8FF]">
          <div className="max-w-7xl mx-auto px-4">
            <h2 className="font-[family-name:var(--font-bebas)] text-3xl text-[#1a3a5c] tracking-wide text-center mb-6">Also Hiring Nearby</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              {nearby.map(nb => (
                <Link key={nb.slug} href={`/careers/${nb.slug}`} className="border border-gray-200 bg-white rounded-xl p-3 text-center hover:border-[#4BA3D4] transition-all">
                  <p className="text-sm text-[#1a3a5c]">{nb.name}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <CTABlock title={`Apply in ${n.name}`} subtitle="Text (917) 970-6002 — $18-22/hr, flexible schedule, start this week." />
    </>
  )
}
