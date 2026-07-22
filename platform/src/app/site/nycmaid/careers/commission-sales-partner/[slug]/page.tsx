import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ALL_NEIGHBORHOODS, getNeighborhoodsByArea, type Neighborhood } from '@/app/site/nycmaid/_lib/seo/locations'
import { AREAS } from '@/app/site/nycmaid/_lib/seo/data/areas'
import { breadcrumbSchema, localBusinessSchema } from '@/app/site/nycmaid/_lib/seo/schema'
import { pickTeamPhoto } from '@/app/site/nycmaid/_lib/seo/photos'
import { jobDates } from '@/app/site/nycmaid/_lib/seo/job-dates'
import JsonLd from '@/app/site/nycmaid/_components/JsonLd'
import Breadcrumbs from '@/app/site/nycmaid/_components/Breadcrumbs'

export const dynamicParams = false
export const revalidate = 259200 // 3 days — must be a literal for Next segment config

export function generateStaticParams() {
  return ALL_NEIGHBORHOODS.map((n) => ({ slug: n.slug }))
}

function getNeighborhood(slug: string): Neighborhood | undefined {
  return ALL_NEIGHBORHOODS.find((n) => n.slug === slug)
}
function getAreaName(areaSlug: string): string {
  return AREAS.find((a) => a.slug === areaSlug)?.name || areaSlug
}
function getStateAbbr(areaSlug: string): string {
  return areaSlug === 'new-jersey' ? 'NJ' : 'NY'
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const n = getNeighborhood(slug)
  if (!n) return {}
  const title = `Sales Jobs in ${n.name} — Commission / 1099 Sales Rep, Paid Daily`
  const description = `Commission sales jobs in ${n.name}, NYC. 1099 sales rep role — sign clients or referrers and earn 10% recurring on every cleaning, paid daily via Stripe. No cap. Apply: (212) 202-8400`
  return {
    title,
    description,
    alternates: { canonical: `https://www.thenycmaid.com/careers/commission-sales-partner/${n.slug}` },
    openGraph: {
      title: `Sales Jobs in ${n.name} — Commission / 1099 | The NYC Maid`,
      description,
      url: `https://www.thenycmaid.com/careers/commission-sales-partner/${n.slug}`,
    },
  }
}

export default async function NeighborhoodSalesJobPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const n = getNeighborhood(slug)
  if (!n) notFound()

  const areaName = getAreaName(n.area)
  const stateAbbr = getStateAbbr(n.area)
  const nearby = ALL_NEIGHBORHOODS.filter((nb) => n.nearby.includes(nb.slug)).slice(0, 6)
  const sameArea = getNeighborhoodsByArea(n.area).filter((nb) => nb.slug !== n.slug).slice(0, 12)
  const landmarkPhrase = n.landmarks[0] ? ` around ${n.landmarks[0]}` : ''
  const { datePosted, validThrough } = jobDates()
  const photo = pickTeamPhoto(n.slug)
  const photoUrl = `https://www.thenycmaid.com${photo.src}`

  const jobSchema = {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    image: photoUrl,
    title: `Commission Sales Representative (1099) — ${n.name}, ${areaName}`,
    description: `<p>The NYC Maid is hiring a Commission Sales Partner in ${n.name}, ${areaName}${landmarkPhrase}. Sign cleaning clients directly (homeowners, offices, property managers, Airbnb hosts) or sign referrers (doormen, real estate agents, concierges, movers) — and earn <strong>10% recurring commission on every completed cleaning</strong>, for as long as they stay a customer.</p><p>Paid daily via Stripe Connect. 1099 independent contractor, no cap. Tier upgrades to 12% at 50 clients and 15% at 100. Path to Sales Manager with override income. The whole payout system is already live for existing referrers.</p><p>Apply at thenycmaid.com/apply/commission-sales-partner or text (212) 202-8400.</p>`,
    identifier: {
      '@type': 'PropertyValue',
      name: 'The NYC Maid',
      value: `nycmaid-sales-${n.slug}`,
    },
    datePosted,
    validThrough,
    employmentType: ['CONTRACTOR', 'PART_TIME', 'FULL_TIME'],
    jobImmediateStart: true,
    totalJobOpenings: 3,
    hiringOrganization: {
      '@type': 'Organization',
      name: 'The NYC Maid',
      url: 'https://www.thenycmaid.com',
      sameAs: 'https://www.thenycmaid.com',
      logo: { '@type': 'ImageObject', url: 'https://www.thenycmaid.com/icon-512.png', width: 512, height: 512 },
      telephone: '+1-212-202-8400',
      email: 'hi@thenycmaid.com',
      foundingDate: '2018',
      numberOfEmployees: { '@type': 'QuantitativeValue', minValue: 10, maxValue: 50 },
    },
    jobLocation: {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        streetAddress: n.name,
        addressLocality: n.name,
        addressRegion: stateAbbr,
        postalCode: n.zip_codes[0] || (stateAbbr === 'NJ' ? '07102' : '10036'),
        addressCountry: 'US',
      },
      geo: { '@type': 'GeoCoordinates', latitude: n.lat, longitude: n.lng },
    },
    applicantLocationRequirements: { '@type': 'Country', name: 'US' },
    directApply: true,
    industry: 'Cleaning Services',
    occupationalCategory: '41-3091.00',
    qualifications: `NYC-area network access in or around ${n.name}. Relationship builder. Sales background helpful, not required. English required, English/Spanish a plus.`,
    responsibilities: `Sign cleaning clients and referral partners in ${n.name} and the surrounding ${areaName} area. Build and maintain a recurring book of business.`,
    skills: 'Relationship building, prospecting, referral network development, communication, follow-through',
    incentiveCompensation: '10% recurring commission on every completed cleaning from direct clients and referrer networks. Paid daily via Stripe Connect. Tier upgrades at 50 and 100 clients. Sales Manager override.',
    jobBenefits: 'Recurring commission that compounds, paid daily via Stripe Connect, no cap, path to Sales Manager, multi-brand portfolio expansion, 1099 independence.',
    workHours: 'Flexible — set your own schedule',
    educationRequirements: { '@type': 'EducationalOccupationalCredential', credentialCategory: 'high school' },
    experienceRequirements: { '@type': 'OccupationalExperienceRequirements', monthsOfExperience: 0 },
    experienceInPlaceOfEducation: true,
  }

  return (
    <>
      <JsonLd data={[
        localBusinessSchema(),
        breadcrumbSchema([
          { name: 'Home', url: 'https://www.thenycmaid.com' },
          { name: 'Careers', url: 'https://www.thenycmaid.com/available-nyc-maid-jobs' },
          { name: 'Sales Partner', url: 'https://www.thenycmaid.com/careers/commission-sales-partner' },
          { name: `Sales Partner in ${n.name}`, url: `https://www.thenycmaid.com/careers/commission-sales-partner/${n.slug}` },
        ]),
        jobSchema,
      ]} />

      {/* Hero */}
      <section className="bg-gradient-to-b from-[#1E2A4A] to-[#243352] py-20 md:py-24">
        <div className="max-w-4xl mx-auto px-4">
          <p className="text-[#A8F0DC] text-sm font-semibold tracking-[0.2em] uppercase mb-3">Sales Jobs &middot; {n.name}, {areaName} &middot; Commission / 1099</p>
          <h1 className="font-[family-name:var(--font-bebas)] text-4xl md:text-6xl text-white tracking-wide leading-[0.95] mb-5">
            Sales Jobs in {n.name} — Commission, 1099, Paid Daily
          </h1>
          <p className="text-blue-200/80 text-lg max-w-2xl leading-relaxed mb-4">
            Know people in {n.name}{landmarkPhrase}? Turn that network into recurring income. Sign cleaning clients or referrers and earn <strong className="text-white">10% recurring on every cleaning — forever</strong>.
          </p>
          <p className="text-blue-200/60 max-w-2xl leading-relaxed mb-8">
            Paid daily via Stripe Connect. 1099, no cap. Tier upgrades at 50 and 100 clients. Path to Sales Manager. The payout system is already live and running for existing referrers.
          </p>
          <div className="flex flex-wrap items-center gap-3 mb-9">
            <span className="bg-[#A8F0DC]/20 text-[#A8F0DC] text-xs font-semibold px-4 py-2 rounded-full">10% Recurring &mdash; Forever</span>
            <span className="bg-[#A8F0DC]/20 text-[#A8F0DC] text-xs font-semibold px-4 py-2 rounded-full">Paid Daily via Stripe</span>
            <span className="bg-[#A8F0DC]/20 text-[#A8F0DC] text-xs font-semibold px-4 py-2 rounded-full">1099 &middot; No Cap</span>
          </div>
          <div className="flex flex-col sm:flex-row items-start gap-5">
            <Link href="/apply/commission-sales-partner" target="_blank" rel="noopener noreferrer" className="bg-[#A8F0DC] text-[#1E2A4A] px-10 py-4 rounded-lg font-bold text-sm tracking-widest uppercase hover:bg-[#8DE8CC] transition-colors">
              Apply Now
            </Link>
            <a href="sms:2122028400" className="text-blue-200/70 font-medium text-lg py-4 hover:text-white transition-colors underline underline-offset-4">
              or Text (212) 202-8400
            </a>
          </div>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 py-12">
        <Breadcrumbs items={[
          { name: 'Careers', href: '/available-nyc-maid-jobs' },
          { name: 'Sales Partner', href: '/careers/commission-sales-partner' },
          { name: n.name, href: `/careers/commission-sales-partner/${n.slug}` },
        ]} />

        <section className="mb-14">
          <h2 className="font-[family-name:var(--font-bebas)] text-3xl text-[#1E2A4A] tracking-wide mb-3">Two Ways to Earn in {n.name}</h2>
          <p className="text-gray-500 max-w-2xl mb-8">Both pay 10% recurring. Both pay forever. Stack them however you want.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border border-gray-200 rounded-2xl p-6">
              <h3 className="font-semibold text-[#1E2A4A] mb-2">Sign clients directly</h3>
              <p className="text-gray-600 text-sm leading-relaxed">Homeowners, offices, property managers, Airbnb hosts across {n.name} and {areaName}. 10% recurring on every cleaning they book.</p>
            </div>
            <div className="border border-gray-200 rounded-2xl p-6">
              <h3 className="font-semibold text-[#1E2A4A] mb-2">Sign referrers</h3>
              <p className="text-gray-600 text-sm leading-relaxed">Doormen, real estate agents, concierges, movers in {n.name}. Earn 10% on every cleaning your referrer network generates — for years.</p>
            </div>
          </div>
          <div className="mt-8">
            <Link href="/careers/commission-sales-partner" className="text-[#1E2A4A] font-semibold underline underline-offset-4 hover:no-underline">
              See the full role, pay math, and Sales Manager path &rarr;
            </Link>
          </div>
        </section>

        {nearby.length > 0 && (
          <section className="mb-12">
            <h2 className="font-[family-name:var(--font-bebas)] text-2xl text-[#1E2A4A] tracking-wide mb-4">Also Hiring Nearby</h2>
            <div className="flex flex-wrap gap-2">
              {nearby.map((nb) => (
                <Link key={nb.slug} href={`/careers/commission-sales-partner/${nb.slug}`} className="px-4 py-2 bg-gray-100 rounded-full text-sm text-gray-700 hover:bg-[#A8F0DC]/20 hover:text-[#1E2A4A] transition-colors">
                  {nb.name}
                </Link>
              ))}
            </div>
          </section>
        )}

        {sameArea.length > 0 && (
          <section className="mb-8">
            <h2 className="font-[family-name:var(--font-bebas)] text-2xl text-[#1E2A4A] tracking-wide mb-4">More Sales Roles Across {areaName}</h2>
            <div className="flex flex-wrap gap-2">
              {sameArea.map((nb) => (
                <Link key={nb.slug} href={`/careers/commission-sales-partner/${nb.slug}`} className="px-3 py-1.5 bg-gray-100 rounded-full text-xs text-gray-600 hover:bg-[#A8F0DC]/20 hover:text-[#1E2A4A] transition-colors">
                  {nb.name}
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="bg-[#A8F0DC] rounded-2xl p-8 text-center">
          <p className="font-[family-name:var(--font-bebas)] text-3xl text-[#1E2A4A] tracking-wide mb-2">Build Your Book in {n.name}</p>
          <p className="text-[#1E2A4A]/60 max-w-lg mx-auto mb-6">10% recurring. Paid daily. No ceiling. Apply in a few minutes with a 60-second selfie video.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/apply/commission-sales-partner" target="_blank" rel="noopener noreferrer" className="bg-[#1E2A4A] text-white px-10 py-4 rounded-lg font-bold text-sm tracking-widest uppercase hover:bg-[#1E2A4A]/90 transition-colors">
              Apply Now
            </Link>
            <a href="sms:2122028400" className="text-[#1E2A4A]/60 font-medium text-sm hover:text-[#1E2A4A] transition-colors underline underline-offset-4">
              or Text (212) 202-8400
            </a>
          </div>
        </section>
      </div>
    </>
  )
}
