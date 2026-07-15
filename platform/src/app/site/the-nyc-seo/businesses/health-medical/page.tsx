import Link from "next/link";
import type { Metadata } from "next";
import Breadcrumbs from "@/app/site/the-nyc-seo/_components/Breadcrumbs";
import CTAGroup from "@/app/site/the-nyc-seo/_components/CTAGroup";
import { PHONE, SITE_URL } from "@/app/site/the-nyc-seo/_lib/seo";
import {
  getServicesByCategorySlug,
  getNeighborhoodsByRegion,
  getRegions,
  getCategories,
  categoryToSlug,
} from "@/app/site/the-nyc-seo/_lib/data";
import { categoryContent } from "@/app/site/the-nyc-seo/_lib/categoryContent";

export const metadata: Metadata = {
  title: "SEO for Healthcare Businesses NYC",
  description:
    "SEO for dentists, chiropractors, therapists, med spas, and 30+ healthcare specialties in NYC. Local SEO, AI search, and patient acquisition strategies.",
  keywords: [
    "SEO for healthcare businesses NYC",
    "dentist SEO NYC",
    "chiropractor SEO New York",
    "med spa SEO NYC",
    "therapist SEO marketing",
    "healthcare marketing agency NYC",
    "doctor SEO services",
    "medical practice SEO",
    "local SEO for dentists",
    "healthcare digital marketing NYC",
  ],
  openGraph: {
    title: "SEO for Healthcare Businesses NYC",
    description:
      "SEO and AI search optimization for dentists, chiropractors, therapists, med spas, and 30+ healthcare specialties across NYC.",
    url: `${SITE_URL}/businesses/health-medical`,
    type: "website",
  },
  alternates: { canonical: `${SITE_URL}/businesses/health-medical` },
};

const faqs = [
  {
    q: "How does SEO work for healthcare practices in NYC?",
    a: "Healthcare SEO combines local search optimization with HIPAA-compliant content strategy. We optimize your Google Business Profile for medical categories, build citations on healthcare-specific directories like Healthgrades, Zocdoc, Vitals, and WebMD, create condition-specific and treatment-specific landing pages, and build neighborhood-targeted pages for every area you serve. The goal is to appear in the Google Maps local pack and organic results when patients search for your specialty in their neighborhood — 'dentist Upper East Side,' 'chiropractor Park Slope,' 'therapist near me Brooklyn.'",
  },
  {
    q: "How long does SEO take for a medical practice in NYC?",
    a: "Healthcare practices typically see local pack movement within 60 to 90 days as Google Business Profile optimizations, citation building, and review strategies take effect. Organic rankings for condition and treatment keywords take 3 to 6 months depending on competition. Competitive specialties like dentistry and med spas in Manhattan may take 6 to 9 months for top-3 positions, while practices in outer boroughs often see faster results due to lower competition. We report monthly so you see progress from the start.",
  },
  {
    q: "How much does SEO cost for a dental or medical practice?",
    a: "Our healthcare SEO retainers start at $3,500 per month and include Google Business Profile optimization, citation building across healthcare directories, patient-focused content creation, neighborhood-targeted landing pages, review generation systems, and monthly reporting. Project-based work like a complete website redesign with SEO architecture starts at $2,500. We also offer consulting at $150 per hour for practices with in-house marketing teams who need expert SEO guidance.",
  },
  {
    q: "Do you handle HIPAA compliance in healthcare SEO content?",
    a: "Yes. Every piece of content we create for healthcare clients adheres to HIPAA guidelines. We never include patient-identifiable information, real patient stories without documented consent, or any content that could constitute a privacy violation. Our content focuses on conditions, treatments, provider credentials, and practice differentiators — all of which are safe to publish. We also advise on review response best practices to ensure your replies never confirm or deny a patient relationship.",
  },
  {
    q: "Can you help a healthcare practice rank on Zocdoc and Healthgrades?",
    a: "While we do not manage Zocdoc or Healthgrades accounts directly (those are paid platforms with their own internal ranking algorithms), we optimize your profiles on every healthcare directory as part of our citation strategy. Complete, accurate profiles with consistent NAP data, comprehensive specialty listings, and patient reviews improve your visibility on these platforms. More importantly, the SEO work we do — local authority, content depth, review velocity — helps you rank organically so patients find you directly on Google instead of through a middleman that takes a cut.",
  },
  {
    q: "What makes healthcare SEO different from other industries?",
    a: "Healthcare SEO has unique challenges: HIPAA content restrictions, YMYL (Your Money or Your Life) quality standards from Google that demand authoritative content, complex insurance and credential verification signals, and a patient population that researches extensively before booking. Google holds healthcare content to higher E-E-A-T standards — Experience, Expertise, Authoritativeness, and Trustworthiness — which means thin content and generic blog posts actively hurt your rankings. We build content that demonstrates clinical expertise while remaining accessible to patients.",
  },
  {
    q: "Do you optimize for telehealth and virtual practice searches?",
    a: "Yes. Telehealth search volume has grown significantly since 2020 and remains a major patient acquisition channel. We optimize for telehealth-specific keywords — 'online therapist NYC,' 'virtual dermatology consultation,' 'telehealth psychiatrist New York' — and create dedicated telehealth service pages that target these queries. We also optimize your Google Business Profile to reflect telehealth availability, which is a ranking factor for virtual care searches.",
  },
  {
    q: "How do patient reviews impact healthcare SEO rankings?",
    a: "Patient reviews are one of the top three ranking factors for the Google Maps local pack. Healthcare practices with more reviews, higher ratings, and recent review activity consistently outrank competitors. In competitive NYC markets, the practices ranking in the local pack typically have 100+ Google reviews with 4.5+ star averages. We implement HIPAA-compliant review generation systems — automated post-appointment emails, SMS requests, and in-office prompts — that systematically grow your review count without violating patient privacy regulations.",
  },
];

export default function HealthMedicalPage() {
  const services = getServicesByCategorySlug("health-medical");
  const content = categoryContent["Health & Medical"];
  const neighborhoodsByRegion = getNeighborhoodsByRegion();
  const regions = getRegions();
  const allCategories = getCategories().filter((c) => c !== "Health & Medical");

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "The NYC SEO",
    url: SITE_URL,
    telephone: PHONE,
    email: "hi@consortiumnyc.com",
    address: {
      "@type": "PostalAddress",
      streetAddress: "150 W 47th St",
      addressLocality: "New York",
      addressRegion: "NY",
      postalCode: "10036",
      addressCountry: "US",
    },
    parentOrganization: {
      "@type": "Organization",
      name: "Consortium NYC",
      url: "https://www.consortiumnyc.com",
    },
  };

  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "SEO for Healthcare Businesses NYC",
    description:
      "SEO and AI search optimization for healthcare practices including dentists, chiropractors, therapists, med spas, dermatologists, and 30+ medical specialties across New York City, New Jersey, Long Island, and Westchester.",
    url: `${SITE_URL}/businesses/health-medical`,
    provider: {
      "@type": "Organization",
      name: "The NYC SEO",
      url: SITE_URL,
    },
    areaServed: [
      { "@type": "City", name: "New York" },
      { "@type": "State", name: "New Jersey" },
      { "@type": "Place", name: "Long Island" },
      { "@type": "Place", name: "Westchester" },
    ],
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Healthcare SEO Services",
      itemListElement: [
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Local SEO for Healthcare Practices" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Google Business Profile Optimization for Doctors" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Healthcare Content Marketing" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "AI Search Optimization for Medical Practices" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Patient Review Generation Systems" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Medical Practice Website Design" } },
      ],
    },
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.a,
      },
    })),
  };

  return (
    <div className="text-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema).replace(/</g, '\\u003c') }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema).replace(/</g, '\\u003c') }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema).replace(/</g, '\\u003c') }} />

      {/* ============================================================
          SECTION 1: HERO
          ============================================================ */}
      <section className="bg-[#0A0A0A] pb-20 pt-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Breadcrumbs
            items={[
              { name: "Businesses", url: "/businesses" },
              { name: "Health & Medical", url: "/businesses/health-medical" },
            ]}
          />

          <div className="mt-10 grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#0080FE]">
                {services.length} Healthcare Specialties &middot; 318 Neighborhoods &middot; 20+ Years
              </p>
              <h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl">
                SEO for Healthcare
                <br />
                <span className="text-[#EFF70A]">Businesses in NYC</span>
              </h1>
              <p className="mt-6 text-lg leading-8 text-zinc-300">
                Patients are searching &ldquo;dentist near me,&rdquo; &ldquo;best chiropractor Brooklyn,&rdquo; and &ldquo;therapist accepting new patients Upper West Side&rdquo; every single day. If your practice is not ranking in the{" "}
                <Link href="/services/local-seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Google Maps local pack</Link>{" "}
                and the first page of organic results, those patients are booking with your competitor. We build{" "}
                <Link href="/services/seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">SEO platforms</Link>{" "}
                for {services.length} healthcare specialties across{" "}
                <Link href="/areas" className="text-[#5CB8FF] hover:text-[#8DD0FF]">every neighborhood</Link>{" "}
                in the NYC metro area — HIPAA-compliant, E-E-A-T optimized, and built to fill your patient pipeline. Powered by{" "}
                <Link href="/services/web-design-development" className="text-[#5CB8FF] hover:text-[#8DD0FF]">modern web development</Link>, not WordPress templates.
              </p>
              <CTAGroup variant="hero" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[
                { value: `${services.length}`, label: "Healthcare Specialties" },
                { value: "65K+", label: "Licensed Physicians in NYC" },
                { value: "70+", label: "NYC Hospitals & Centers" },
                { value: "24 days", label: "Avg Wait for New Patients" },
              ].map((stat) => (
                <div key={stat.label} className="rounded-xl border border-zinc-800 bg-[#141414] p-5 text-center">
                  <div className="text-3xl font-extrabold text-[#0080FE]">{stat.value}</div>
                  <div className="mt-1 text-xs text-zinc-400">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 2: WHY HEALTHCARE BUSINESSES NEED SEO
          ============================================================ */}
      <section className="bg-[#141414] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Why Healthcare Practices in NYC Need SEO
          </h2>
          <div className="mt-8 space-y-6 text-zinc-300 leading-relaxed">
            <p>
              NYC has over 65,000 licensed physicians and thousands more dentists, therapists, chiropractors, and wellness practitioners all competing for the same patient population. The practices that thrive are not necessarily the best clinicians — they are the most visible ones. When a patient searches &ldquo;dentist accepting new patients near me&rdquo; or &ldquo;best dermatologist Manhattan,&rdquo; the{" "}
              <Link href="/services/google-business-profile" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Google Business Profile</Link>{" "}
              and organic listings on the first page capture 95% of the clicks. Page two might as well not exist.
            </p>
            <p>
              Healthcare is a YMYL (Your Money or Your Life) category in Google&rsquo;s quality guidelines, which means Google holds medical content to the highest standards of{" "}
              <Link href="/services/content-marketing" className="text-[#5CB8FF] hover:text-[#8DD0FF]">content quality</Link>{" "}
              and authority. Generic blog posts about &ldquo;5 tips for healthy teeth&rdquo; written by freelancers do not rank anymore. Google wants content written or reviewed by credentialed professionals, published on authoritative websites, and backed by consistent patient reviews and professional citations. This is exactly what our{" "}
              <Link href="/services/seo-strategy" className="text-[#5CB8FF] hover:text-[#8DD0FF]">SEO strategy</Link>{" "}
              delivers for healthcare practices.
            </p>
            <p>
              The shift to AI search makes this even more critical. When a patient asks ChatGPT &ldquo;who is the best chiropractor in Park Slope,&rdquo; the answer is synthesized from the same signals that drive Google rankings: consistent business data, authoritative content, patient reviews, and structured data markup. Practices that invest in{" "}
              <Link href="/services/ai-search-optimization" className="text-[#5CB8FF] hover:text-[#8DD0FF]">AI search optimization</Link>{" "}
              today are building the patient pipeline that will dominate for the next decade. Those that ignore it will watch their competitors get recommended while they remain invisible.
            </p>
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 3: WHAT WE BUILD — SERVICE CARDS
          ============================================================ */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            What We Build for Healthcare Practices
          </h2>
          <p className="mt-4 max-w-3xl text-zinc-400">
            Every deliverable is built for the healthcare industry — HIPAA-compliant, E-E-A-T optimized, and designed to convert searchers into booked patients.
          </p>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                num: "01",
                title: "Local SEO & Google Maps",
                desc: "Rank in the local pack for every specialty and neighborhood you serve. Healthcare-specific citations on Healthgrades, Zocdoc, Vitals, and 80+ directories.",
                href: "/services/local-seo",
              },
              {
                num: "02",
                title: "Google Business Profile",
                desc: "Full GBP optimization with medical categories, insurance attributes, telehealth indicators, provider photos, and HIPAA-safe review responses.",
                href: "/services/google-business-profile",
              },
              {
                num: "03",
                title: "Condition & Treatment Pages",
                desc: "E-E-A-T optimized content for every condition you treat and procedure you perform. Written to Google's YMYL standards with proper medical schema markup.",
                href: "/services/content-marketing",
              },
              {
                num: "04",
                title: "AI Search Optimization",
                desc: "Get recommended when patients ask ChatGPT, Perplexity, or Gemini for the best provider in their specialty and area.",
                href: "/services/ai-search-optimization",
              },
              {
                num: "05",
                title: "Programmatic Neighborhood Pages",
                desc: "Unique landing pages for every specialty-neighborhood combination. 'Dentist Upper East Side,' 'Chiropractor Astoria,' 'Therapist Park Slope' — at scale.",
                href: "/services/automation",
              },
              {
                num: "06",
                title: "On-Page & Technical SEO",
                desc: "Medical schema markup (MedicalOrganization, Physician, MedicalCondition), site speed, Core Web Vitals, and mobile-first design.",
                href: "/services/on-page-seo",
              },
              {
                num: "07",
                title: "Off-Page SEO & Authority Building",
                desc: "Backlinks from medical associations, healthcare publications, local health organizations, and NYC health media outlets.",
                href: "/services/off-page-seo",
              },
              {
                num: "08",
                title: "Web Design & Development",
                desc: "HIPAA-compliant, ADA-accessible websites built on Next.js. Online booking integration, provider bios, and patient-first UX design.",
                href: "/services/web-design-development",
              },
              {
                num: "09",
                title: "Patient Review Systems",
                desc: "HIPAA-compliant review generation via post-appointment emails and SMS. Response templates that build trust without violating privacy regulations.",
                href: "/services/fullloopcrm",
              },
              {
                num: "10",
                title: "Analytics & Patient Attribution",
                desc: "Track which keywords, pages, and channels drive patient bookings. Monthly reports with call tracking, form attribution, and ROI analysis.",
                href: "/services/analytics-reporting",
              },
            ].map((card) => (
              <Link
                key={card.num}
                href={card.href}
                className="group rounded-xl border border-zinc-800 bg-[#141414] p-6 transition-colors hover:border-[#0080FE]"
              >
                <span className="text-sm font-bold text-[#0080FE]">{card.num}</span>
                <h3 className="mt-2 text-lg font-semibold text-white group-hover:text-[#0080FE]">
                  {card.title}
                </h3>
                <p className="mt-2 text-sm text-zinc-400">{card.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 4: OUR PROCESS
          ============================================================ */}
      <section className="bg-[#141414] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            How We Rank Healthcare Practices
          </h2>
          <p className="mt-4 text-zinc-400">
            A process built specifically for the healthcare industry — accounting for HIPAA, YMYL standards, E-E-A-T requirements, and the patient decision journey.
          </p>
          <div className="mt-10 space-y-10">
            {[
              {
                step: "01",
                title: "Healthcare Market Audit",
                body: "We analyze your local search footprint against every competing practice in your specialty and service area. This includes Google Business Profile health, citation accuracy across healthcare directories (Healthgrades, Zocdoc, Vitals, WebMD, RateMDs), review profile benchmarking, current rankings on a geo-grid, and content authority assessment. For healthcare, we also audit E-E-A-T signals — provider credentials, author attribution, and medical content quality.",
              },
              {
                step: "02",
                title: "Keyword Strategy & Content Architecture",
                body: "Healthcare keywords follow specialty-specific patterns: [specialty] + [neighborhood], [condition] + [treatment] + [location], and [provider type] + [insurance/attribute]. 'Dentist accepting Aetna Upper East Side,' 'sciatica treatment chiropractor Brooklyn,' 'therapist sliding scale Queens.' We map every high-intent keyword to a page, building a hub-and-spoke architecture around your specialties, conditions, treatments, and service areas.",
              },
              {
                step: "03",
                title: "Website Build or Optimization",
                body: "We build HIPAA-compliant, ADA-accessible websites on Next.js or optimize your existing site. Every page gets MedicalOrganization and Physician schema, proper author attribution for E-E-A-T, online booking integration, and an internal linking structure that passes authority from your strongest pages to new content. Provider bio pages are optimized as standalone authority assets.",
              },
              {
                step: "04",
                title: "Content Development",
                body: "We create condition pages, treatment pages, provider profiles, and neighborhood-targeted landing pages — all written to Google's YMYL medical content standards. Content is reviewed for medical accuracy, includes proper disclaimers, and is attributed to your credentialed providers. We also build FAQ content targeting long-tail patient queries: 'does insurance cover Invisalign in NYC,' 'how long does a root canal take,' 'is acupuncture covered by Blue Cross in New York.'",
              },
              {
                step: "05",
                title: "GBP, Citations & Review Engine",
                body: "Full Google Business Profile optimization with healthcare-specific categories, insurance attributes, telehealth indicators, and weekly posts. Citation building across 80+ directories including healthcare-specific platforms. HIPAA-compliant review generation via post-appointment emails and SMS — we build the system, you control the patient touchpoints. Every review response follows a HIPAA-safe template that builds trust and reinforces keywords.",
              },
              {
                step: "06",
                title: "Ongoing Optimization & Patient Attribution",
                body: "Monthly reporting with geo-grid rank tracking, call recording attribution (HIPAA-compliant), form submission tracking, and patient acquisition cost analysis. We track which specialties, conditions, and neighborhoods drive the most patient bookings, then optimize accordingly. Healthcare SEO requires continuous content refreshing as medical guidelines evolve and seasonal conditions shift patient search behavior.",
              },
            ].map((item) => (
              <div key={item.step} className="flex gap-6">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#0080FE] text-lg font-bold text-white">
                  {item.step}
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-[#EFF70A]">{item.title}</h3>
                  <p className="mt-3 text-zinc-300 leading-relaxed">{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 5: MID CTA
          ============================================================ */}
      <CTAGroup variant="mid" />

      {/* ============================================================
          SECTION 6: INDUSTRY DEEP-DIVE
          ============================================================ */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            The Healthcare Market in NYC
          </h2>
          <p className="mt-4 text-zinc-400">
            The competitive landscape for healthcare practices — and why{" "}
            <Link href="/services/seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">SEO</Link>{" "}
            is the most cost-effective patient acquisition channel.
          </p>

          {/* Stats */}
          <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {content.stats.map((stat) => (
              <div key={stat.label} className="rounded-xl border border-zinc-800 bg-[#141414] p-4 text-center">
                <div className="text-xl font-extrabold text-[#EFF70A]">{stat.value}</div>
                <div className="mt-1 text-xs text-zinc-500">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Why Local Matters */}
          <div className="mt-12">
            <h3 className="text-xl font-semibold text-white">Why Local Visibility Is Critical for Healthcare</h3>
            <ul className="mt-4 space-y-3">
              {content.whySEOMatters.map((point) => (
                <li key={point} className="flex gap-3 text-zinc-300">
                  <span className="mt-1 text-[#0080FE]">&#9654;</span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* How to Choose */}
          <div className="mt-12">
            <h3 className="text-xl font-semibold text-white">What Patients Look for When Choosing a Provider</h3>
            <p className="mt-3 text-sm text-zinc-400">Understanding the patient decision process helps us optimize your content and listings for the signals that drive bookings.</p>
            <div className="mt-4 space-y-4">
              {content.seoProcess.map((item) => (
                <div key={item.step} className="rounded-lg border border-zinc-800 bg-[#141414] p-4">
                  <p className="font-medium text-white">{item.step}</p>
                  <p className="mt-1 text-sm text-zinc-400">{item.detail}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Cost Context */}
          <div className="mt-12">
            <h3 className="text-xl font-semibold text-white">Healthcare Cost Landscape in NYC</h3>
            <p className="mt-3 text-zinc-400">{content.investmentContext}</p>
            <ul className="mt-4 space-y-2">
              {content.investmentFactors.map((factor) => (
                <li key={factor} className="flex gap-3 text-sm text-zinc-300">
                  <span className="text-[#EFF70A]">&bull;</span>
                  <span>{factor}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 7: ALL BUSINESS TYPES IN THIS CATEGORY
          ============================================================ */}
      <section className="bg-[#2A2A2A] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            All {services.length} Healthcare Business Types We Rank
          </h2>
          <p className="mt-4 text-zinc-400">
            Every healthcare specialty we build{" "}
            <Link href="/services/seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">SEO</Link>,{" "}
            <Link href="/services/local-seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">local SEO</Link>, and{" "}
            <Link href="/services/content-marketing" className="text-[#5CB8FF] hover:text-[#8DD0FF]">content marketing</Link>{" "}
            strategies for. Click any specialty for the full SEO breakdown.
          </p>
          <div className="mt-10 grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {services.map((s) => (
              <Link
                key={s.slug}
                href={`/${s.slug}`}
                className="rounded-lg border border-zinc-700 bg-[#141414] p-4 transition-colors hover:border-[#0080FE]"
              >
                <h3 className="font-medium text-white">{s.name}</h3>
                <p className="mt-1 line-clamp-2 text-xs text-zinc-400">{s.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 8: PRICING
          ============================================================ */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold sm:text-4xl">
              SEO Pricing for Healthcare Practices
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-zinc-400">
              Transparent pricing for every practice size. No long-term contracts. No hidden fees.{" "}
              <Link href="/pricing" className="text-[#5CB8FF] hover:text-[#8DD0FF]">View full pricing details</Link>.
            </p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            {[
              {
                name: "Monthly Retainer",
                price: "$3,500/mo",
                desc: "Ongoing SEO, content, and patient acquisition",
                features: [
                  "Full SEO & local SEO management",
                  "Google Business Profile optimization",
                  "Condition & treatment content pages",
                  "Healthcare citation building (80+ dirs)",
                  "HIPAA-compliant review generation",
                  "Programmatic neighborhood pages",
                  "Monthly reporting & strategy calls",
                ],
              },
              {
                name: "Project-Based",
                price: "$2,500+",
                desc: "Website builds, audits, and one-time projects",
                features: [
                  "Practice website build or redesign",
                  "Comprehensive healthcare SEO audit",
                  "Medical schema markup implementation",
                  "Content architecture & planning",
                  "Competitor practice analysis",
                  "E-E-A-T content optimization",
                  "Provider bio page optimization",
                ],
              },
              {
                name: "Consulting",
                price: "$150/hr",
                desc: "Expert guidance for practice marketing teams",
                features: [
                  "Healthcare SEO strategy sessions",
                  "YMYL content review & guidance",
                  "Patient acquisition funnel design",
                  "Technical SEO guidance",
                  "Marketing team training",
                  "Quarterly strategy reviews",
                  "HIPAA compliance SEO consulting",
                ],
              },
            ].map((tier) => (
              <div
                key={tier.name}
                className="rounded-xl border border-zinc-800 bg-[#141414] p-8"
              >
                <h3 className="text-lg font-bold text-white">{tier.name}</h3>
                <div className="mt-2 text-3xl font-extrabold text-[#0080FE]">{tier.price}</div>
                <p className="mt-2 text-sm text-zinc-400">{tier.desc}</p>
                <ul className="mt-6 space-y-3">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-zinc-300">
                      <span className="mt-0.5 text-green-400">&#10003;</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/partnership-request-form"
                  className="mt-8 block rounded-lg bg-[#0080FE] px-4 py-3 text-center text-sm font-semibold text-white hover:bg-[#0070E0]"
                >
                  Get Started
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 9: REGION COVERAGE
          ============================================================ */}
      <section className="bg-[#141414] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Areas We Cover for Healthcare SEO
          </h2>
          <p className="mt-4 text-zinc-400">
            We build{" "}
            <Link href="/services/local-seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">local SEO</Link>{" "}
            campaigns that target patients in every neighborhood of your service area.
          </p>
          <div className="mt-10 space-y-10">
            {regions.map((region) => {
              const neighborhoods = neighborhoodsByRegion[region] || [];
              const note = content.regionNotes[region];
              return (
                <div key={region}>
                  <h3 className="text-xl font-semibold text-[#EFF70A]">{region}</h3>
                  {note && <p className="mt-2 text-sm text-zinc-400">{note}</p>}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {neighborhoods.slice(0, 12).map((n) => (
                      <Link
                        key={n.slug}
                        href={`/areas/${n.slug}`}
                        className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-300 transition-colors hover:border-[#0080FE] hover:text-[#0080FE]"
                      >
                        {n.name}
                      </Link>
                    ))}
                    {neighborhoods.length > 12 && (
                      <span className="rounded-full px-3 py-1 text-xs text-zinc-600">
                        +{neighborhoods.length - 12} more
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 10: PRE-FAQ CTA
          ============================================================ */}
      <CTAGroup variant="preFaq" />

      {/* ============================================================
          SECTION 11: FAQ
          ============================================================ */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Healthcare SEO: Frequently Asked Questions
          </h2>
          <div className="mt-10 space-y-8">
            {faqs.map((faq) => (
              <div key={faq.q}>
                <h3 className="text-lg font-semibold text-white">{faq.q}</h3>
                <p className="mt-3 text-zinc-300 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 12: CROSS-LINKS & FINAL CTA
          ============================================================ */}
      <section className="bg-[#2A2A2A] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Other Industries We Rank
          </h2>
          <p className="mt-4 text-zinc-400">
            Healthcare is one of {allCategories.length + 1} industries we build{" "}
            <Link href="/services/seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">SEO platforms</Link>{" "}
            for. Explore our work across every industry.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {allCategories.map((cat) => (
              <Link
                key={cat}
                href={`/businesses/${categoryToSlug(cat)}`}
                className="rounded-lg border border-zinc-700 bg-[#141414] p-4 text-center font-medium text-white transition-colors hover:border-[#0080FE] hover:text-[#0080FE]"
              >
                {cat}
              </Link>
            ))}
          </div>
          <div className="mt-10 flex flex-wrap gap-4 text-sm">
            <Link href="/services" className="text-[#5CB8FF] hover:text-[#8DD0FF]">All Services</Link>
            <Link href="/businesses" className="text-[#5CB8FF] hover:text-[#8DD0FF]">All Business Types</Link>
            <Link href="/areas" className="text-[#5CB8FF] hover:text-[#8DD0FF]">All Areas</Link>
            <Link href="/pricing" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Pricing</Link>
            <Link href="/services/search-engine-optimization" className="text-[#5CB8FF] hover:text-[#8DD0FF]">SEO</Link>
            <Link href="/services/branding" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Branding</Link>
            <Link href="/services/marketing-consulting" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Marketing Consulting</Link>
            <Link href="/services/marketing-manager" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Marketing Manager</Link>
            <Link href="/services/ai-agent-development" className="text-[#5CB8FF] hover:text-[#8DD0FF]">AI Agent Development</Link>
            <Link href="/services/ai-content-generation" className="text-[#5CB8FF] hover:text-[#8DD0FF]">AI Content Generation</Link>
          </div>
        </div>
      </section>

      <CTAGroup variant="final" />
    </div>
  );
}
