// @ts-nocheck
import Link from "next/link";
import type { Metadata } from "next";
import { getServicesByCategorySlug, getRegions } from "@/app/site/the-nyc-seo/_lib/data";
import { categoryContent } from "@/app/site/the-nyc-seo/_lib/categoryContent";
import Breadcrumbs from "@/app/site/the-nyc-seo/_components/Breadcrumbs";
import CTAGroup from "@/app/site/the-nyc-seo/_components/CTAGroup";
import { SITE_URL, PHONE } from "@/app/site/the-nyc-seo/_lib/seo";

const CATEGORY = "Education";
const SLUG = "education";
const content = categoryContent[CATEGORY];
const phonePlain = PHONE.replace(/-/g, "");

export const metadata: Metadata = {
  title: "SEO for Education Businesses NYC",
  description:
    "SEO and AI search optimization for tutors, music schools, dance studios, language programs, and education businesses across NYC. More students, more enrollments.",
  openGraph: {
    title: "SEO for Education Businesses NYC",
    description:
      "SEO and AI search optimization for tutors, music schools, dance studios, language programs, and education businesses across NYC.",
    url: `${SITE_URL}/businesses/${SLUG}`,
    type: "website",
  },
  alternates: {
    canonical: `${SITE_URL}/businesses/${SLUG}`,
  },
};

const faqs = [
  {
    q: "How long does SEO take for an education business in NYC?",
    a: "Most education businesses start seeing measurable gains in organic traffic within 3-5 months. Competitive terms like 'SAT tutoring NYC' or 'dance classes Manhattan' may take 6-9 months to crack page one, but local long-tail terms like 'piano lessons Upper East Side' can rank faster with proper local SEO and Google Business Profile optimization.",
  },
  {
    q: "What SEO services matter most for tutoring companies?",
    a: "Local SEO and Google Business Profile optimization are the highest-impact services for tutors. Parents search by subject and neighborhood -- 'math tutor Park Slope' or 'reading tutor Astoria.' We build neighborhood-specific pages, optimize your GBP listing, and create content targeting the exact subjects and test prep services you offer.",
  },
  {
    q: "Can SEO help a dance studio or music school compete with ClassPass and aggregators?",
    a: "Yes. Aggregator sites rank for broad terms, but parents and students search for specific, local instruction -- 'ballet classes for kids Brooklyn' or 'guitar lessons for beginners Queens.' We build pages targeting those long-tail searches where your studio can outrank aggregators and capture direct enrollments without paying referral fees.",
  },
  {
    q: "How much does SEO cost for education businesses?",
    a: "Our monthly retainer for education businesses starts at $3,500/month, which covers local SEO, content marketing, Google Business Profile management, and AI search optimization. One-time projects like website redesigns start at $2,500. Strategy consulting is available at $150/hour for businesses that want guidance without a full retainer.",
  },
  {
    q: "Do you build separate pages for each subject or program we offer?",
    a: "Absolutely. A tutoring company offering SAT prep, math tutoring, and reading support needs separate optimized pages for each service. We create dedicated landing pages for every subject, age group, and location you serve -- maximizing the number of searches your site appears in and matching parent intent precisely.",
  },
  {
    q: "How does AI search optimization help education businesses?",
    a: "AI platforms like ChatGPT, Perplexity, and Google AI Overviews are increasingly where parents research education options. We optimize your content so it gets cited in AI-generated answers to queries like 'best music schools in NYC' or 'top SAT prep services near me.' This is a new channel most competitors are ignoring entirely.",
  },
  {
    q: "What results can a language school expect from SEO?",
    a: "Language schools typically see 40-80% increases in organic enrollment inquiries within 6-8 months. We target language-specific and neighborhood-specific terms, build content around common search patterns like 'Spanish classes for adults NYC,' and optimize for Google Maps where local intent dominates.",
  },
  {
    q: "Should driving schools invest in SEO or just rely on Google Ads?",
    a: "Both, but SEO delivers compounding returns that ads never will. Every month you run Google Ads, you pay again. Every month your SEO pages rank, they generate free traffic. We build pages for terms like 'driving school near me' and 'road test prep [borough]' that continue driving enrollments long after the initial investment.",
  },
];

const serviceCards = [
  {
    title: "Local SEO & Google Maps",
    desc: "Rank in Google's Local Pack when parents search 'tutoring near me' or 'dance classes [neighborhood].' We optimize your Google Business Profile, build local citations, and get you visible where families actually look.",
    href: "/services/local-seo",
  },
  {
    title: "SEO Strategy",
    desc: "Keyword research, competitor analysis, and a 12-month roadmap built around how parents and students search for education services in your borough and neighborhood.",
    href: "/services/seo-strategy",
  },
  {
    title: "Content Marketing",
    desc: "Subject guides, parent resources, test prep tips, and blog content that establishes authority, earns links, and ranks for informational searches that feed your enrollment pipeline.",
    href: "/services/content-marketing",
  },
  {
    title: "AI Search Optimization",
    desc: "Get your school or tutoring service cited in ChatGPT, Perplexity, and Google AI Overviews when parents ask AI for education recommendations in NYC.",
    href: "/services/ai-search-optimization",
  },
  {
    title: "Google Business Profile",
    desc: "Full GBP setup, review generation strategy, Q&A management, photo optimization, and weekly posting to maximize your visibility in Google Maps and local search.",
    href: "/services/google-business-profile",
  },
  {
    title: "Web Design & Development",
    desc: "Fast, mobile-first websites built for enrollment conversion. Program pages, instructor bios, scheduling integration, and clear calls-to-action designed to turn visitors into students.",
    href: "/services/web-design-development",
  },
  {
    title: "On-Page SEO",
    desc: "Title tags, meta descriptions, header structure, schema markup, and internal linking optimized for every program page, location page, and subject you teach.",
    href: "/services/on-page-seo",
  },
  {
    title: "Off-Page SEO & Link Building",
    desc: "Earn backlinks from parent blogs, education directories, local news outlets, and community sites that boost your domain authority and search rankings.",
    href: "/services/off-page-seo",
  },
  {
    title: "Analytics & Reporting",
    desc: "Monthly reports showing enrollment inquiries, keyword rankings, traffic growth, and ROI. We track the metrics that matter to your enrollment numbers, not vanity stats.",
    href: "/services/analytics-reporting",
  },
  {
    title: "Programmatic SEO & Automation",
    desc: "Hundreds of location-specific and subject-specific pages generated at scale -- covering every neighborhood and program combination your business serves.",
    href: "/services/automation",
  },
];

const businessTypes = [
  { name: "Tutors & Test Prep", slug: "tutor", desc: "SAT, SHSAT, math, reading, and academic tutoring" },
  { name: "Music Lessons", slug: "music-lessons", desc: "Piano, guitar, voice, violin, and instrument instruction" },
  { name: "Dance Studios", slug: "dance-studio", desc: "Ballet, hip-hop, salsa, contemporary, and ballroom" },
  { name: "Language Schools", slug: "daycare", desc: "ESL, Spanish, Mandarin, French, and multilingual programs" },
  { name: "Driving Instructors", slug: "driving-school", desc: "Learner's permit prep, road test training, and defensive driving" },
  { name: "Art & Creative Classes", slug: "preschool", desc: "Drawing, painting, pottery, and creative enrichment programs" },
];

const processSteps = [
  { step: "Audit & Discovery", detail: "We analyze your current search visibility, competitor positioning, enrollment patterns, and the specific terms parents and students use to find education services in your area." },
  { step: "Strategy & Keyword Mapping", detail: "We build a keyword map targeting every subject, program, age group, and neighborhood you serve -- identifying the searches with the highest enrollment intent." },
  { step: "Technical & On-Page Foundation", detail: "We fix site speed issues, implement schema markup, optimize every page for target keywords, and build the technical foundation search engines need to rank your site." },
  { step: "Content & Page Build-Out", detail: "We create dedicated pages for each program, subject, and location. Blog content, parent guides, and FAQ pages fill the top of your enrollment funnel." },
  { step: "Local SEO & GBP Optimization", detail: "Google Business Profile is fully optimized, citations are built across education directories, and a review generation system is put in place to build social proof." },
  { step: "Ongoing Optimization & Reporting", detail: "Monthly performance reviews, keyword tracking, content refreshes, and strategic adjustments keep your rankings climbing and enrollment growing quarter over quarter." },
];

export default function EducationPage() {
  const services = getServicesByCategorySlug(SLUG);
  const regions = getRegions();

  const orgSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "The NYC SEO",
    url: SITE_URL,
    telephone: PHONE,
    address: {
      "@type": "PostalAddress",
      streetAddress: "150 W 47th St",
      addressLocality: "New York",
      addressRegion: "NY",
      postalCode: "10036",
      addressCountry: "US",
    },
  };

  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "SEO for Education Businesses NYC",
    description:
      "Search engine optimization and AI search visibility for tutoring companies, music schools, dance studios, language programs, and education businesses in New York City.",
    provider: orgSchema,
    areaServed: { "@type": "City", name: "New York" },
    serviceType: "Search Engine Optimization",
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <div className="text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      {/* ── 1. Hero ──────────────────────────────────────────── */}
      <section className="bg-[#0A0A0A] pb-20 pt-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Breadcrumbs
            items={[
              { name: "Businesses", url: "/businesses" },
              { name: "Education", url: "/businesses/education" },
            ]}
            dark
          />

          <div className="mt-10 grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#0080FE]">
                SEO for Education &middot; NYC &middot; All Boroughs
              </p>
              <h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl">
                SEO That Fills Classrooms, Studios &amp;{" "}
                <span className="text-[#EFF70A]">Tutoring Schedules</span>
              </h1>
              <p className="mt-6 text-lg leading-8 text-zinc-300">
                Parents search Google before they search anywhere else. When someone types{" "}
                <em>&quot;SAT tutor near me&quot;</em> or{" "}
                <em>&quot;dance classes for kids Brooklyn,&quot;</em>{" "}
                your education business needs to be the first result they see. We build{" "}
                <Link href="/services/seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">SEO systems</Link>,{" "}
                <Link href="/services/local-seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">local search platforms</Link>, and{" "}
                <Link href="/services/ai-search-optimization" className="text-[#5CB8FF] hover:text-[#8DD0FF]">AI search visibility</Link>{" "}
                that drive consistent enrollment for{" "}
                <Link href="/tutor" className="text-[#5CB8FF] hover:text-[#8DD0FF]">tutors</Link>,{" "}
                <Link href="/music-lessons" className="text-[#5CB8FF] hover:text-[#8DD0FF]">music schools</Link>,{" "}
                <Link href="/dance-studio" className="text-[#5CB8FF] hover:text-[#8DD0FF]">dance studios</Link>, and every education business across{" "}
                <Link href="/areas" className="text-[#5CB8FF] hover:text-[#8DD0FF]">NYC&apos;s 318+ neighborhoods</Link>.
              </p>
              <CTAGroup variant="hero" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {content.stats.map((s) => (
                <div
                  key={s.label}
                  className="rounded-xl border border-zinc-800 bg-[#141414] p-5 text-center"
                >
                  <div className="text-3xl font-extrabold text-[#0080FE]">{s.value}</div>
                  <div className="mt-1 text-xs text-zinc-400">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. Why Education Needs SEO ────────────────────────── */}
      <section className="bg-[#141414] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Why Education Businesses Need SEO in 2026
          </h2>
          <p className="mt-4 max-w-3xl text-zinc-400">
            The education market in New York City is one of the most competitive in the country.
            Parents are researching tutors, enrichment programs, and schools online before they
            ever pick up the phone. If your website does not rank for the subjects, neighborhoods,
            and program types families are searching for, you are handing enrollments to the
            competition.
          </p>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {content.whySEOMatters.map((reason, i) => (
              <div
                key={i}
                className="rounded-xl border border-zinc-800 bg-[#0A0A0A] p-6"
              >
                <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-[#0080FE] text-sm font-bold text-white">
                  {i + 1}
                </div>
                <p className="text-sm leading-relaxed text-zinc-300">{reason}</p>
              </div>
            ))}
          </div>
          <p className="mt-8 text-zinc-400">
            Organic search is the most cost-effective way to fill seats consistently.
            Unlike paid ads that stop working the moment you stop paying,{" "}
            <Link href="/services/search-engine-optimization" className="text-[#5CB8FF] hover:text-[#8DD0FF]">search engine optimization</Link>{" "}
            compounds over time -- every page we build and every ranking we earn continues
            driving enrollment month after month. Pair that with{" "}
            <Link href="/services/google-business-profile" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Google Business Profile optimization</Link>{" "}
            and <Link href="/services/content-marketing" className="text-[#5CB8FF] hover:text-[#8DD0FF]">content marketing</Link>,
            and your education business becomes the default choice for families in your area.
          </p>
        </div>
      </section>

      {/* ── 3. What We Build ─────────────────────────────────── */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            What We Build for Education Businesses
          </h2>
          <p className="mt-4 max-w-3xl text-zinc-400">
            Every engagement is tailored to your specific education niche, whether you teach
            one-on-one or run a multi-location school. Here is what a full SEO build looks like
            for education companies.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {serviceCards.map((card) => (
              <Link
                key={card.href}
                href={card.href}
                className="group rounded-xl border border-zinc-800 bg-[#141414] p-6 transition-colors hover:border-[#0080FE]"
              >
                <h3 className="text-lg font-bold text-white group-hover:text-[#0080FE]">
                  {card.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                  {card.desc}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── 4. Our Process ───────────────────────────────────── */}
      <section className="bg-[#141414] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Our SEO Process for Education Companies
          </h2>
          <p className="mt-4 max-w-3xl text-zinc-400">
            We have spent 20 years refining this process. It works for solo tutors and
            multi-location schools alike.
          </p>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {processSteps.map((step, i) => (
              <div key={i} className="rounded-xl border border-zinc-800 bg-[#0A0A0A] p-6">
                <div className="mb-3 text-xs font-bold uppercase tracking-widest text-[#0080FE]">
                  Step {i + 1}
                </div>
                <h3 className="text-lg font-bold text-white">{step.step}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">{step.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 5. Mid CTA ───────────────────────────────────────── */}
      <CTAGroup
        variant="mid"
        title="Your Next Student Is Searching Right Now"
        subtitle="If they can't find you on Google, they're enrolling somewhere else. Let's fix that."
      />

      {/* ── 6. Industry Deep-Dive ────────────────────────────── */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            The Education SEO Landscape in NYC
          </h2>
          <p className="mt-4 max-w-3xl text-zinc-400">{content.investmentContext}</p>

          <div className="mt-12">
            <h3 className="text-2xl font-bold">Common Mistakes Education Businesses Make Online</h3>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {content.seoMistakes.map((m, i) => (
                <div key={i} className="rounded-xl border border-zinc-800 bg-[#141414] p-6">
                  <h4 className="font-bold text-[#EFF70A]">{m.mistake}</h4>
                  <p className="mt-2 text-sm text-zinc-400">{m.consequence}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-12">
            <h3 className="text-2xl font-bold">When to Invest in SEO</h3>
            <ul className="mt-6 space-y-3">
              {content.signsYouNeedSEO.map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-[#0080FE]" />
                  <span className="text-zinc-300">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-12">
            <h3 className="text-2xl font-bold">How to Choose the Right SEO Partner</h3>
            <div className="mt-6 space-y-4">
              {content.seoProcess.map((item, i) => (
                <div key={i} className="rounded-xl border border-zinc-800 bg-[#141414] p-5">
                  <h4 className="font-bold text-white">
                    {i + 1}. {item.step}
                  </h4>
                  <p className="mt-1 text-sm text-zinc-400">{item.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── 7. Business Types Grid ───────────────────────────── */}
      <section className="bg-[#2A2A2A] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Education Business Types We Serve
          </h2>
          <p className="mt-4 max-w-3xl text-zinc-400">
            We build SEO programs for every type of education business in New York City.
            Click any business type to see how we approach their specific market.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {businessTypes.map((bt) => (
              <Link
                key={bt.slug}
                href={`/${bt.slug}`}
                className="group rounded-xl border border-zinc-700 bg-[#141414] p-6 transition-colors hover:border-[#0080FE]"
              >
                <h3 className="text-lg font-bold text-white group-hover:text-[#0080FE]">
                  {bt.name}
                </h3>
                <p className="mt-2 text-sm text-zinc-400">{bt.desc}</p>
              </Link>
            ))}
          </div>
          <p className="mt-8 text-zinc-400">
            See all{" "}
            <Link href="/businesses" className="text-[#5CB8FF] hover:text-[#8DD0FF]">170+ business types</Link>{" "}
            we provide SEO services for, or explore other industries like{" "}
            <Link href="/businesses/health-medical" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Health &amp; Medical</Link>,{" "}
            <Link href="/businesses/legal" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Legal</Link>, and{" "}
            <Link href="/businesses/home-services" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Home Services</Link>.
          </p>
        </div>
      </section>

      {/* ── 8. Pricing ───────────────────────────────────────── */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Education SEO Pricing
          </h2>
          <p className="mt-4 max-w-3xl text-zinc-400">
            Transparent pricing for education businesses. No hidden fees, no long-term contracts,
            no fluff. See our full{" "}
            <Link href="/pricing" className="text-[#5CB8FF] hover:text-[#8DD0FF]">pricing page</Link>{" "}
            for details.
          </p>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            <div className="rounded-xl border border-zinc-800 bg-[#141414] p-8 text-center">
              <div className="text-sm font-semibold uppercase tracking-widest text-[#0080FE]">
                Monthly Retainer
              </div>
              <div className="mt-4 text-4xl font-extrabold">$3,500</div>
              <div className="text-zinc-400">/month</div>
              <p className="mt-4 text-sm text-zinc-400">
                Full-service SEO including local search, content marketing,{" "}
                <Link href="/services/google-business-profile" className="text-[#5CB8FF] hover:text-[#8DD0FF]">GBP management</Link>,
                and AI search optimization. The complete growth engine for education businesses
                serious about enrollment growth.
              </p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-[#141414] p-8 text-center">
              <div className="text-sm font-semibold uppercase tracking-widest text-[#0080FE]">
                Project-Based
              </div>
              <div className="mt-4 text-4xl font-extrabold">$2,500</div>
              <div className="text-zinc-400">starting</div>
              <p className="mt-4 text-sm text-zinc-400">
                One-time projects like{" "}
                <Link href="/services/web-design-development" className="text-[#5CB8FF] hover:text-[#8DD0FF]">website redesigns</Link>,
                SEO audits, or{" "}
                <Link href="/services/branding" className="text-[#5CB8FF] hover:text-[#8DD0FF]">branding</Link>{" "}
                work. Defined scope, clear deliverables, fixed price.
              </p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-[#141414] p-8 text-center">
              <div className="text-sm font-semibold uppercase tracking-widest text-[#0080FE]">
                Consulting
              </div>
              <div className="mt-4 text-4xl font-extrabold">$150</div>
              <div className="text-zinc-400">/hour</div>
              <p className="mt-4 text-sm text-zinc-400">
                <Link href="/services/marketing-consulting" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Strategy consulting</Link>{" "}
                for education businesses that have an in-house team but need expert direction
                on SEO, content, or{" "}
                <Link href="/services/ai-search-optimization" className="text-[#5CB8FF] hover:text-[#8DD0FF]">AI search</Link>.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 9. Region Coverage ───────────────────────────────── */}
      <section className="bg-[#141414] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Education SEO Across Every Borough &amp; Region
          </h2>
          <p className="mt-4 max-w-3xl text-zinc-400">
            We build location-specific SEO programs for education businesses across{" "}
            <Link href="/areas" className="text-[#5CB8FF] hover:text-[#8DD0FF]">all 318+ neighborhoods</Link>{" "}
            we cover. Each region has unique characteristics that shape our approach.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {regions.map((region) => (
              <div
                key={region}
                className="rounded-xl border border-zinc-800 bg-[#0A0A0A] p-5"
              >
                <h3 className="font-bold text-white">{region}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                  {content.regionNotes[region]}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 10. PreFaq CTA ───────────────────────────────────── */}
      <CTAGroup
        variant="preFaq"
        title="We've Ranked Education Businesses for 20 Years"
        subtitle="From solo tutors to multi-location schools, we know exactly how to get education businesses found online. Your competitors wish they started sooner."
      />

      {/* ── 11. FAQ ──────────────────────────────────────────── */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Frequently Asked Questions
          </h2>
          <p className="mt-4 text-zinc-400">
            Common questions about SEO for education businesses in NYC.
          </p>
          <dl className="mt-10 space-y-6">
            {faqs.map((faq, i) => (
              <div key={i} className="rounded-xl border border-zinc-800 bg-[#141414] p-6">
                <dt className="text-lg font-bold text-white">{faq.q}</dt>
                <dd className="mt-3 text-sm leading-relaxed text-zinc-400">{faq.a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ── 12. Cross-Links & Final CTA ──────────────────────── */}
      <section className="bg-[#2A2A2A] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Explore More Industries &amp; Services
          </h2>
          <div className="mt-10 grid gap-8 sm:grid-cols-2">
            <div>
              <h3 className="text-xl font-bold text-white">Other Industries We Serve</h3>
              <ul className="mt-4 space-y-2">
                <li>
                  <Link href="/businesses/health-medical" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Health &amp; Medical SEO</Link>
                </li>
                <li>
                  <Link href="/businesses/legal" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Legal SEO</Link>
                </li>
                <li>
                  <Link href="/businesses/home-services" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Home Services SEO</Link>
                </li>
                <li>
                  <Link href="/businesses/real-estate" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Real Estate SEO</Link>
                </li>
                <li>
                  <Link href="/businesses/business-services" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Business Services SEO</Link>
                </li>
                <li>
                  <Link href="/businesses/fitness-wellness" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Fitness &amp; Wellness SEO</Link>
                </li>
                <li>
                  <Link href="/businesses/beauty-personal-care" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Beauty &amp; Personal Care SEO</Link>
                </li>
                <li>
                  <Link href="/businesses" className="text-[#5CB8FF] hover:text-[#8DD0FF]">All 170+ Business Types &rarr;</Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Our SEO Services</h3>
              <ul className="mt-4 space-y-2">
                <li>
                  <Link href="/services/seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">SEO Services</Link>
                </li>
                <li>
                  <Link href="/services/local-seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Local SEO</Link>
                </li>
                <li>
                  <Link href="/services/ai-search-optimization" className="text-[#5CB8FF] hover:text-[#8DD0FF]">AI Search Optimization</Link>
                </li>
                <li>
                  <Link href="/services/content-marketing" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Content Marketing</Link>
                </li>
                <li>
                  <Link href="/services/on-page-seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">On-Page SEO</Link>
                </li>
                <li>
                  <Link href="/services/off-page-seo" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Off-Page SEO</Link>
                </li>
                <li>
                  <Link href="/services/fullloopcrm" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Full Loop CRM</Link>
                </li>
                <li>
                  <Link href="/services/ai-agent-development" className="text-[#5CB8FF] hover:text-[#8DD0FF]">AI Agent Development</Link>
                </li>
                <li>
                  <Link href="/pricing" className="text-[#5CB8FF] hover:text-[#8DD0FF]">Pricing Guide &rarr;</Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <CTAGroup variant="final" />
    </div>
  );
}
