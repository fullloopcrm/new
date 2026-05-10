// @ts-nocheck
import Link from "next/link";
import type { Metadata } from "next";
import {
  getServicesByCategorySlug,
  getNeighborhoodsByRegion,
  getRegions,
  categoryToSlug,
  getCategories,
} from "@/app/site/the-nyc-seo/_lib/data";
import { categoryContent } from "@/app/site/the-nyc-seo/_lib/categoryContent";
import { PHONE, SITE_URL, getFAQPageSchema } from "@/app/site/the-nyc-seo/_lib/seo";
import Breadcrumbs from "@/app/site/the-nyc-seo/_components/Breadcrumbs";
import CTAGroup from "@/app/site/the-nyc-seo/_components/CTAGroup";

const CATEGORY = "Beauty & Personal Care";
const SLUG = "beauty-personal-care";

export const metadata: Metadata = {
  title: "SEO for Beauty & Salon Businesses NYC",
  description:
    "SEO for hair salons, barber shops, nail salons, med spas, and beauty businesses in NYC. Rank on Google, Maps, and AI search. Book more appointments.",
  openGraph: {
    title: "SEO for Beauty & Salon Businesses NYC",
    description:
      "SEO for hair salons, barber shops, nail salons, med spas, and beauty businesses in NYC. Rank on Google, Maps, and AI search. Book more appointments.",
    url: `${SITE_URL}/businesses/${SLUG}`,
    type: "website",
  },
  alternates: {
    canonical: `${SITE_URL}/businesses/${SLUG}`,
  },
};

const faqs = [
  {
    q: "Why is SEO important for hair salons and beauty businesses?",
    a: "Beauty is one of the most locally searched industries on Google. 'Hair salon near me,' 'nail salon [neighborhood],' and 'best barber in Brooklyn' are searched tens of thousands of times monthly in NYC alone. Instagram drives brand awareness, but Google drives booked appointments. Clients who search Google are ready to book — they're not browsing for inspiration. SEO puts your salon in front of those high-intent clients at the exact moment they're looking for a new stylist, nail tech, or aesthetician.",
  },
  {
    q: "How long does it take for a salon to rank on Google?",
    a: "Most beauty businesses start seeing local pack (Google Maps) improvements within 6-10 weeks. Organic rankings for competitive terms like 'hair salon Williamsburg' or 'med spa Midtown' typically take 3-5 months to reach page one. New salons with no existing web presence take longer, but the local nature of beauty searches means you don't need to outrank national brands — you just need to outrank the shops on your block.",
  },
  {
    q: "Can you help a med spa rank for treatment-specific keywords?",
    a: "Absolutely. Med spas have a unique SEO opportunity because clients search for specific treatments: 'Botox NYC,' 'laser hair removal Brooklyn,' 'chemical peel Upper East Side.' We build dedicated pages for every treatment you offer, optimized with medical schema markup, before-and-after content strategies, and the E-E-A-T signals Google requires for medical-adjacent content. Treatment pages often convert at 3-5x the rate of generic spa pages.",
  },
  {
    q: "How do Google reviews impact a beauty business's rankings?",
    a: "Google reviews are one of the strongest ranking signals for local search. Salons and spas with 100+ reviews and a 4.5+ rating consistently outrank competitors in the map pack. Beyond rankings, reviews directly impact booking decisions — 88% of consumers trust online reviews as much as personal recommendations. We implement review acquisition systems that consistently grow your review count while maintaining authenticity.",
  },
  {
    q: "What's the ROI of SEO for a beauty business?",
    a: "A single new regular client is worth $2,000-$5,000+ annually (bi-weekly visits at $75-$200 per visit). Our monthly retainer is $3,500. If SEO brings in just 2-3 new regular clients per month, the return exceeds 10x the investment within the first year. For med spas, where individual treatment packages can exceed $1,000-$5,000, a single new client can cover months of SEO investment.",
  },
  {
    q: "Do you handle Instagram and social media for salons too?",
    a: "Our focus is search — Google, AI platforms, and local directories. That said, our content marketing and branding services complement your social media presence. We ensure your website and Google Business Profile showcase the same quality portfolio work you post on Instagram, and we structure your content so that blog posts and service pages can be repurposed as social content. For dedicated social media management, we can recommend partners.",
  },
  {
    q: "How does AI search affect beauty businesses?",
    a: "More consumers are asking AI assistants 'best hair salon for balayage in NYC' or 'affordable nail salon in SoHo.' AI models like ChatGPT and Perplexity pull from authoritative web content to generate recommendations. If your salon has a well-structured site with strong reviews, detailed service pages, and quality backlinks, you're far more likely to be recommended. We specifically optimize for this emerging channel.",
  },
  {
    q: "What's included in your beauty business SEO package?",
    a: "Our monthly retainer ($3,500/mo) includes: full technical SEO audit and fixes, Google Business Profile optimization and management, content creation (service pages, location pages, blog posts), local citation building, review management strategy, AI search optimization, link building, and monthly performance reporting with strategy calls. Everything is tailored to beauty and personal care — we understand your industry's unique search patterns.",
  },
];

export default function BeautyPersonalCarePage() {
  const services = getServicesByCategorySlug(SLUG);
  const content = categoryContent[CATEGORY];
  const neighborhoodsByRegion = getNeighborhoodsByRegion();
  const regions = getRegions();
  const allCategories = getCategories();

  const organizationSchema = {
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
    email: "hi@consortiumnyc.com",
  };

  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "SEO for Beauty & Salon Businesses NYC",
    description:
      "Search engine optimization, local SEO, and AI search optimization for beauty and personal care businesses including hair salons, barber shops, nail salons, spas, med spas, and waxing studios in the NYC metro area.",
    provider: {
      "@type": "Organization",
      name: "The NYC SEO",
      url: SITE_URL,
    },
    areaServed: {
      "@type": "City",
      name: "New York",
    },
    serviceType: "Search Engine Optimization",
  };

  const faqSchema = getFAQPageSchema(faqs);

  return (
    <div className="text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(organizationSchema),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(serviceSchema),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqSchema),
        }}
      />

      {/* ── Hero ── */}
      <section className="bg-[#0A0A0A] pb-20 pt-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Breadcrumbs
            items={[
              { name: "Businesses", url: "/businesses" },
              {
                name: "Beauty & Personal Care",
                url: "/businesses/beauty-personal-care",
              },
            ]}
          />

          <div className="mt-10 grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#0080FE]">
                {services.length} Business Types &middot; SEO &amp; AI Search
              </p>
              <h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl">
                SEO for{" "}
                <span className="text-[#EFF70A]">
                  Beauty &amp; Salon
                </span>{" "}
                Businesses in NYC
              </h1>
              <p className="mt-6 text-lg leading-8 text-zinc-300">
                NYC has over 25,000 salons and spas competing for the same
                clients. Instagram gets you noticed. Google gets you booked.
                Whether you run a{" "}
                <Link
                  href="/hair-salon"
                  className="text-[#5CB8FF] hover:text-[#8DD0FF]"
                >
                  hair salon
                </Link>
                , a{" "}
                <Link
                  href="/med-spa"
                  className="text-[#5CB8FF] hover:text-[#8DD0FF]"
                >
                  med spa
                </Link>
                , a{" "}
                <Link
                  href="/barber-shop"
                  className="text-[#5CB8FF] hover:text-[#8DD0FF]"
                >
                  barber shop
                </Link>
                , or a{" "}
                <Link
                  href="/nail-salon"
                  className="text-[#5CB8FF] hover:text-[#8DD0FF]"
                >
                  nail salon
                </Link>
                , we build the{" "}
                <Link
                  href="/services/seo"
                  className="text-[#5CB8FF] hover:text-[#8DD0FF]"
                >
                  SEO
                </Link>{" "}
                and{" "}
                <Link
                  href="/services/ai-search-optimization"
                  className="text-[#5CB8FF] hover:text-[#8DD0FF]"
                >
                  AI search platforms
                </Link>{" "}
                that fill your appointment book.
              </p>
              <CTAGroup variant="hero" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {content.stats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-xl border border-zinc-800 bg-[#141414] p-5 text-center"
                >
                  <div className="text-3xl font-extrabold text-[#0080FE]">
                    {stat.value}
                  </div>
                  <div className="mt-1 text-xs text-zinc-400">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Why Beauty Businesses Need SEO ── */}
      <section className="bg-[#141414] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Why Beauty Businesses Need SEO in 2026
          </h2>
          <p className="mt-4 max-w-3xl text-lg text-zinc-300">
            The NYC beauty market generates over $8 billion annually. Clients
            discover new salons through Google search, Google Maps, and
            increasingly through AI assistants. A salon without{" "}
            <Link
              href="/services/local-seo"
              className="text-[#5CB8FF] hover:text-[#8DD0FF]"
            >
              local SEO
            </Link>{" "}
            is invisible to the largest source of new clients &mdash; people
            actively searching for beauty services in their neighborhood right
            now.
          </p>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl border border-zinc-800 bg-[#0A0A0A] p-6">
              <h3 className="text-lg font-bold text-[#EFF70A]">
                Appointment-Ready Searches
              </h3>
              <p className="mt-2 text-sm text-zinc-400">
                &ldquo;Hair salon near me&rdquo; and &ldquo;nail salon
                open now&rdquo; are searched by people ready to book within
                hours. These aren&rsquo;t browsers &mdash; they&rsquo;re buyers.
                Ranking for these terms fills chairs immediately, not next month.
              </p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-[#0A0A0A] p-6">
              <h3 className="text-lg font-bold text-[#EFF70A]">
                Recurring Revenue Clients
              </h3>
              <p className="mt-2 text-sm text-zinc-400">
                A client who finds your salon through Google and loves the
                experience comes back every 2-6 weeks. A single client acquired
                through SEO can generate $2,000-$5,000+ in annual revenue.{" "}
                <Link
                  href="/services/fullloopcrm"
                  className="text-[#5CB8FF] hover:text-[#8DD0FF]"
                >
                  CRM follow-up
                </Link>{" "}
                keeps them coming back.
              </p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-[#0A0A0A] p-6">
              <h3 className="text-lg font-bold text-[#EFF70A]">
                Google Reviews = Social Proof
              </h3>
              <p className="mt-2 text-sm text-zinc-400">
                Beauty is personal. Clients read reviews obsessively before
                booking. A strong{" "}
                <Link
                  href="/services/google-business-profile"
                  className="text-[#5CB8FF] hover:text-[#8DD0FF]"
                >
                  Google Business Profile
                </Link>{" "}
                with hundreds of reviews and portfolio photos is the most
                powerful trust signal in the industry. We build and manage that
                presence.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── What We Build ── */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            What We Build for Beauty Businesses
          </h2>
          <p className="mt-4 text-zinc-400">
            A complete SEO and AI search platform designed around how beauty
            clients discover and choose salons, spas, and beauty professionals.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                num: "01",
                title: "Google Maps & Local Pack",
                desc: "Beauty searches are neighborhood-specific. We optimize your Google Business Profile with the right categories, service lists, photos, and review strategy to dominate the local 3-pack.",
                href: "/services/local-seo",
              },
              {
                num: "02",
                title: "Service & Treatment Pages",
                desc: "Dedicated pages for every service: balayage, Brazilian blowouts, Botox, gel manicures, beard fades. Each page targets specific search terms clients actually use.",
                href: "/services/on-page-seo",
              },
              {
                num: "03",
                title: "Review Acquisition & Management",
                desc: "We implement systems that encourage happy clients to leave Google reviews after every appointment. More reviews = higher rankings = more bookings. It compounds.",
                href: "/services/google-business-profile",
              },
              {
                num: "04",
                title: "Beauty Content Marketing",
                desc: "Blog posts, seasonal trend guides, and before-and-after showcases that attract links, build authority, and capture 'how to' and 'best salon for' searches.",
                href: "/services/content-marketing",
              },
              {
                num: "05",
                title: "AI Search Optimization",
                desc: "When clients ask ChatGPT or Perplexity 'best hair salon for curly hair in Brooklyn,' your salon needs to be in the response. We optimize your digital footprint for AI recommendation.",
                href: "/services/ai-search-optimization",
              },
              {
                num: "06",
                title: "Technical SEO & Mobile Speed",
                desc: "Most beauty searches happen on phones. We ensure your site loads fast, looks great on mobile, and has the technical foundation that Google rewards with higher rankings.",
                href: "/services/search-engine-optimization",
              },
              {
                num: "07",
                title: "Link Building & PR",
                desc: "Earn backlinks from beauty publications, local lifestyle blogs, wedding directories, and NYC media. Authority signals that separate page-one salons from page-three ones.",
                href: "/services/off-page-seo",
              },
              {
                num: "08",
                title: "Programmatic Neighborhood Pages",
                desc: "Hundreds of pages targeting specific neighborhoods: 'nail salon Astoria,' 'barber shop Harlem,' 'med spa Upper East Side.' Automated at scale, optimized individually.",
                href: "/services/automation",
              },
              {
                num: "09",
                title: "Beauty Website Design",
                desc: "Stunning, conversion-focused websites built for beauty brands. Online booking integration, portfolio galleries, service menus, and gift card functionality that turns traffic into revenue.",
                href: "/services/web-design-development",
              },
              {
                num: "10",
                title: "Brand & Visual Identity",
                desc: "A cohesive brand across your website, GBP, social media, and storefront builds recognition and trust. We align your digital presence with the in-salon experience.",
                href: "/services/branding",
              },
            ].map((card) => (
              <Link
                key={card.num}
                href={card.href}
                className="group rounded-xl border border-zinc-800 bg-[#141414] p-6 transition-colors hover:border-[#0080FE]"
              >
                <span className="text-sm font-bold text-[#0080FE]">
                  {card.num}
                </span>
                <h3 className="mt-2 text-lg font-bold group-hover:text-[#0080FE]">
                  {card.title}
                </h3>
                <p className="mt-2 text-sm text-zinc-400">{card.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Our Process ── */}
      <section className="bg-[#141414] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            How We Rank Beauty Businesses
          </h2>
          <p className="mt-4 max-w-3xl text-zinc-400">
            A proven process built specifically for the beauty industry&rsquo;s
            unique search patterns and client acquisition lifecycle.
          </p>
          <div className="mt-10 space-y-8">
            {[
              {
                step: "1. Beauty Market Analysis",
                detail:
                  "We analyze your local competitive landscape: which salons rank for your target services, their review counts, backlink profiles, and content strategies. We identify the gaps between where you are and where you need to be.",
              },
              {
                step: "2. Service & Keyword Mapping",
                detail:
                  "We map every service you offer to specific search queries. 'Balayage Brooklyn,' 'men's fade Astoria,' 'Botox Midtown,' 'gel manicure near me' — each term gets assigned to a dedicated page with conversion-focused content.",
              },
              {
                step: "3. Google Business Profile Overhaul",
                detail:
                  "Your GBP is your most important local asset. We optimize categories, add service menus, upload portfolio photos, manage Q&A, and implement a review collection system that builds social proof with every client visit.",
              },
              {
                step: "4. Website Optimization",
                detail:
                  "We optimize every page on your site for speed, mobile usability, and search. Service pages get schema markup, portfolio sections get image alt text, and your booking flow gets streamlined to minimize friction.",
              },
              {
                step: "5. Content & Portfolio Strategy",
                detail:
                  "We create service pages, location pages, before-and-after showcases, and blog content targeting seasonal beauty trends and common client questions. 'Best hair color for fall 2026,' 'how much do lash extensions cost in NYC' — all captured.",
              },
              {
                step: "6. Citation & Directory Building",
                detail:
                  "We build citations across beauty-specific directories (StyleSeat, Booksy, Vagaro) and general business directories (Yelp, Google, Bing Places). Consistent NAP data across 50+ platforms strengthens your local authority.",
              },
              {
                step: "7. AI & Emerging Search",
                detail:
                  "We structure your content so AI platforms recommend your salon. Strong reviews, authoritative content, and proper schema markup are the signals that get your business into ChatGPT and Perplexity responses.",
              },
              {
                step: "8. Track, Report, Grow",
                detail:
                  "Monthly reports show rankings, profile views, calls, direction requests, and bookings attributed to search. We refine strategy based on what drives the most valuable new clients to your business.",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="rounded-xl border border-zinc-800 bg-[#0A0A0A] p-6"
              >
                <h3 className="text-lg font-bold text-[#EFF70A]">
                  {item.step}
                </h3>
                <p className="mt-2 text-sm text-zinc-400">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Mid CTA ── */}
      <CTAGroup variant="mid" />

      {/* ── Industry Deep-Dive ── */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            The NYC Beauty &amp; Personal Care Market
          </h2>
          <p className="mt-4 max-w-3xl text-zinc-400">
            NYC&rsquo;s beauty industry is massive, diverse, and fiercely
            competitive. Here&rsquo;s the market context that shapes our SEO
            strategy.
          </p>

          <div className="mt-10">
            <h3 className="text-xl font-bold text-[#EFF70A]">
              Why Neighborhood Matters in Beauty
            </h3>
            <ul className="mt-4 space-y-3">
              {content.whySEOMatters.map((item, i) => (
                <li
                  key={i}
                  className="flex items-start gap-3 text-sm text-zinc-300"
                >
                  <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#0080FE]" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-12">
            <h3 className="text-xl font-bold text-[#EFF70A]">
              How Clients Choose Beauty Providers
            </h3>
            <div className="mt-4 space-y-4">
              {content.seoProcess.map((item, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-zinc-800 bg-[#141414] p-4"
                >
                  <h4 className="font-semibold text-white">{item.step}</h4>
                  <p className="mt-1 text-sm text-zinc-400">{item.detail}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-12">
            <h3 className="text-xl font-bold text-[#EFF70A]">
              What Drives Beauty Service Pricing in NYC
            </h3>
            <p className="mt-3 text-sm text-zinc-400">{content.investmentContext}</p>
            <ul className="mt-4 space-y-2">
              {content.investmentFactors.map((factor, i) => (
                <li
                  key={i}
                  className="flex items-start gap-3 text-sm text-zinc-300"
                >
                  <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#EFF70A]" />
                  {factor}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── All Business Types in This Category ── */}
      <section className="bg-[#141414] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Beauty Business Types We Optimize
          </h2>
          <p className="mt-4 text-zinc-400">
            We build{" "}
            <Link
              href="/services/seo-strategy"
              className="text-[#5CB8FF] hover:text-[#8DD0FF]"
            >
              SEO strategies
            </Link>{" "}
            for every type of beauty and personal care business. Click any
            business type for its dedicated page.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {services.map((s) => (
              <Link
                key={s.slug}
                href={`/${s.slug}`}
                className="group rounded-xl border border-zinc-800 bg-[#0A0A0A] p-6 transition-colors hover:border-[#0080FE]"
              >
                <h3 className="text-lg font-bold group-hover:text-[#0080FE]">
                  {s.name}
                </h3>
                <p className="mt-2 text-sm text-zinc-400">{s.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Beauty &amp; Salon SEO Pricing
          </h2>
          <p className="mt-4 max-w-3xl text-zinc-400">
            Clear, transparent pricing for beauty businesses. No long-term
            contracts. See our full{" "}
            <Link
              href="/pricing"
              className="text-[#5CB8FF] hover:text-[#8DD0FF]"
            >
              pricing page
            </Link>{" "}
            for more details.
          </p>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            <div className="rounded-xl border border-zinc-800 bg-[#141414] p-8">
              <h3 className="text-lg font-bold text-[#0080FE]">
                Monthly Retainer
              </h3>
              <div className="mt-4 text-4xl font-extrabold">$3,500</div>
              <div className="text-sm text-zinc-500">per month</div>
              <ul className="mt-6 space-y-2 text-sm text-zinc-300">
                <li>Full SEO strategy &amp; execution</li>
                <li>Google Business Profile management</li>
                <li>Review acquisition system</li>
                <li>Content production &amp; service pages</li>
                <li>Monthly reporting &amp; strategy calls</li>
              </ul>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-[#141414] p-8">
              <h3 className="text-lg font-bold text-[#0080FE]">
                Project-Based
              </h3>
              <div className="mt-4 text-4xl font-extrabold">$2,500</div>
              <div className="text-sm text-zinc-500">starting at</div>
              <ul className="mt-6 space-y-2 text-sm text-zinc-300">
                <li>Site audit &amp; technical fixes</li>
                <li>GBP setup &amp; optimization</li>
                <li>Service page creation</li>
                <li>Citation cleanup &amp; building</li>
                <li>Keyword research &amp; mapping</li>
              </ul>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-[#141414] p-8">
              <h3 className="text-lg font-bold text-[#0080FE]">Consulting</h3>
              <div className="mt-4 text-4xl font-extrabold">$150</div>
              <div className="text-sm text-zinc-500">per hour</div>
              <ul className="mt-6 space-y-2 text-sm text-zinc-300">
                <li>SEO strategy sessions</li>
                <li>In-house team training</li>
                <li>Content &amp; portfolio audits</li>
                <li>Competitive analysis deep-dives</li>
                <li>AI search readiness assessment</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── Region Coverage ── */}
      <section className="bg-[#141414] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Beauty SEO Across the NYC Metro
          </h2>
          <p className="mt-4 text-zinc-400">
            Every borough has a distinct beauty culture. Our{" "}
            <Link
              href="/services/seo-strategy"
              className="text-[#5CB8FF] hover:text-[#8DD0FF]"
            >
              SEO strategy
            </Link>{" "}
            reflects the search patterns and client expectations unique to each
            region.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {regions.map((region) => (
              <div
                key={region}
                className="rounded-xl border border-zinc-800 bg-[#0A0A0A] p-5"
              >
                <h3 className="font-bold text-white">{region}</h3>
                <p className="mt-2 text-xs text-zinc-400">
                  {content.regionNotes[region]}
                </p>
                {neighborhoodsByRegion[region] && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {neighborhoodsByRegion[region].slice(0, 4).map((n) => (
                      <Link
                        key={n.slug}
                        href={`/areas/${n.slug}`}
                        className="rounded-full bg-[#2A2A2A] px-2 py-0.5 text-xs text-zinc-400 hover:text-[#5CB8FF]"
                      >
                        {n.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PreFaq CTA ── */}
      <CTAGroup variant="preFaq" />

      {/* ── FAQ ── */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Beauty &amp; Salon SEO &mdash; FAQ
          </h2>
          <p className="mt-4 text-zinc-400">
            Common questions from{" "}
            <Link
              href="/hair-salon"
              className="text-[#5CB8FF] hover:text-[#8DD0FF]"
            >
              hair salons
            </Link>
            ,{" "}
            <Link
              href="/barber-shop"
              className="text-[#5CB8FF] hover:text-[#8DD0FF]"
            >
              barber shops
            </Link>
            ,{" "}
            <Link
              href="/med-spa"
              className="text-[#5CB8FF] hover:text-[#8DD0FF]"
            >
              med spas
            </Link>
            , and other beauty professionals considering SEO.
          </p>
          <div className="mt-10 space-y-6">
            {faqs.map((faq, i) => (
              <div
                key={i}
                className="rounded-xl border border-zinc-800 bg-[#141414] p-6"
              >
                <h3 className="font-bold text-white">{faq.q}</h3>
                <p className="mt-3 text-sm leading-relaxed text-zinc-400">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Cross-Links ── */}
      <section className="bg-[#141414] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Explore Other Industries We Serve
          </h2>
          <p className="mt-4 text-zinc-400">
            We build SEO platforms for{" "}
            <Link
              href="/businesses"
              className="text-[#5CB8FF] hover:text-[#8DD0FF]"
            >
              170+ business types
            </Link>{" "}
            across every industry in New York City.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            {allCategories
              .filter((c) => c !== CATEGORY)
              .map((c) => (
                <Link
                  key={c}
                  href={`/businesses/${categoryToSlug(c)}`}
                  className="rounded-full border border-zinc-700 bg-[#0A0A0A] px-4 py-2 text-sm text-zinc-300 hover:border-[#0080FE] hover:text-white"
                >
                  {c}
                </Link>
              ))}
          </div>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/services"
              className="text-sm text-[#5CB8FF] hover:text-[#8DD0FF]"
            >
              All Services
            </Link>
            <Link
              href="/services/branding"
              className="text-sm text-[#5CB8FF] hover:text-[#8DD0FF]"
            >
              Branding
            </Link>
            <Link
              href="/services/fullloopcrm"
              className="text-sm text-[#5CB8FF] hover:text-[#8DD0FF]"
            >
              Full Loop CRM
            </Link>
            <Link
              href="/services/marketing-consulting"
              className="text-sm text-[#5CB8FF] hover:text-[#8DD0FF]"
            >
              Marketing Consulting
            </Link>
            <Link
              href="/services/ai-agent-development"
              className="text-sm text-[#5CB8FF] hover:text-[#8DD0FF]"
            >
              AI Agent Development
            </Link>
            <Link
              href="/areas"
              className="text-sm text-[#5CB8FF] hover:text-[#8DD0FF]"
            >
              All Areas
            </Link>
            <Link
              href="/about"
              className="text-sm text-[#5CB8FF] hover:text-[#8DD0FF]"
            >
              About Us
            </Link>
            <Link
              href="/contact"
              className="text-sm text-[#5CB8FF] hover:text-[#8DD0FF]"
            >
              Contact
            </Link>
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <CTAGroup variant="final" />
    </div>
  );
}
