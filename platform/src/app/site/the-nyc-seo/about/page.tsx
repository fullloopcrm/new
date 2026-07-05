import Link from "next/link";
import type { Metadata } from "next";
import { getAllServices, getAllNeighborhoods } from "@/app/site/the-nyc-seo/_lib/data";
import Breadcrumbs from "@/app/site/the-nyc-seo/_components/Breadcrumbs";
import { PHONE, SITE_URL } from "@/app/site/the-nyc-seo/_lib/seo";

export const metadata: Metadata = {
  title:
    "About The NYC SEO | NYC SEO & AI Search Agency | Consortium NYC",
  description:
    "The NYC SEO is a Consortium NYC partnership — 25+ years of digital marketing, 10,000+ projects, A+ BBB rated. We build SEO and AI search optimization platforms for service businesses across NYC, NJ, Long Island & Westchester. Not WordPress. Not templates. Real infrastructure that ranks.",
  openGraph: {
    title: "About The NYC SEO | NYC SEO & AI Search Agency",
    description:
      "25+ years of digital marketing. A+ BBB rated. We build SEO and AI search platforms for service businesses across the NYC metro area.",
    url: `${SITE_URL}/about`,
  },
  alternates: {
    canonical: `${SITE_URL}/about`,
  },
};

export default function AboutPage() {
  const totalServices = getAllServices().length;
  const totalNeighborhoods = getAllNeighborhoods().length;
  const totalPages = totalServices * totalNeighborhoods;

  return (
    <div>
      {/* Hero — dark with blue accent */}
      <section className="bg-[#0A0A0A] pb-20 pt-8 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Breadcrumbs items={[{ name: "About", url: "/about" }]} />

          <div className="mt-10 grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#0080FE]">
                About The NYC SEO
              </p>
              <h1 className="mt-3 text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
                We Don&apos;t Do SEO Reports.
                <br />
                <span className="text-[#EFF70A]">We Build Things.</span>
              </h1>
              <p className="mt-6 text-lg leading-8 text-zinc-300">
                The NYC SEO is a{" "}
                <a
                  href="https://www.consortiumnyc.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#5CB8FF] hover:text-[#8DD0FF]"
                >
                  Consortium NYC
                </a>{" "}
                partnership &mdash; a team with 25+ years of digital marketing experience,
                10,000+ projects completed, and an{" "}
                <a
                  href="https://www.bbb.org/us/ny/new-york/profile/web-designer/consortium-nyc-0121-87177901"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#5CB8FF] hover:text-[#8DD0FF]"
                >
                  A+ BBB rating
                </a>
                . We build{" "}
                <Link href="/services" className="text-[#5CB8FF] hover:text-[#8DD0FF]">
                  SEO and AI search optimization platforms
                </Link>{" "}
                for{" "}
                <Link href="/businesses" className="text-[#5CB8FF] hover:text-[#8DD0FF]">
                  service businesses
                </Link>{" "}
                across{" "}
                <Link href="/areas" className="text-[#5CB8FF] hover:text-[#8DD0FF]">
                  NYC, New Jersey, Long Island &amp; Westchester
                </Link>
                .
              </p>
              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <Link
                  href="/partnership-request-form"
                  className="inline-flex items-center justify-center rounded-lg bg-[#0080FE] px-6 py-3 text-sm font-semibold text-white hover:bg-[#0070E0]"
                >
                  Work With Us
                </Link>
                <a
                  href={`tel:${PHONE.replace(/-/g, "")}`}
                  className="inline-flex items-center justify-center rounded-lg border border-zinc-700 px-6 py-3 text-sm font-semibold text-white hover:border-zinc-500 hover:bg-white/5"
                >
                  Call {PHONE}
                </a>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-zinc-800 bg-[#141414] p-6 text-center">
                <div className="text-3xl font-extrabold text-white">25+</div>
                <div className="mt-1 text-sm text-zinc-400">Years Experience</div>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-[#141414] p-6 text-center">
                <div className="text-3xl font-extrabold text-white">10K+</div>
                <div className="mt-1 text-sm text-zinc-400">Projects Completed</div>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-[#141414] p-6 text-center">
                <div className="text-3xl font-extrabold text-[#EFF70A]">A+</div>
                <div className="mt-1 text-sm text-zinc-400">BBB Rating</div>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-[#141414] p-6 text-center">
                <div className="flex justify-center text-xl text-yellow-400">&#9733;&#9733;&#9733;&#9733;&#9733;</div>
                <div className="mt-1 text-sm text-zinc-400">Google Reviews</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Our Story — grey */}
      <section className="bg-[#2A2A2A] py-20 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-3xl font-bold sm:text-4xl">
              Why We Built The NYC SEO
            </h2>
            <div className="mt-8 space-y-6 text-lg leading-8 text-zinc-300">
              <p>
                We&apos;ve spent 25 years watching{" "}
                <Link href="/businesses" className="text-[#5CB8FF] hover:text-[#8DD0FF]">
                  service businesses
                </Link>{" "}
                burn money on the same cycle: hire an SEO agency, get monthly reports
                for 6 months, see no results, cancel, repeat. The agencies weren&apos;t
                building anything. They were billing for hope.
              </p>
              <p>
                So we built something different. The NYC SEO is a{" "}
                <Link href="/services" className="text-[#5CB8FF] hover:text-[#8DD0FF]">
                  programmatic SEO platform
                </Link>{" "}
                &mdash; {totalPages.toLocaleString()}+ pages, each targeting a real
                service in a real neighborhood. Not blog posts. Not PDF reports. Live,
                ranking pages with{" "}
                <Link href="/services#search-engine-optimization" className="text-[#5CB8FF] hover:text-[#8DD0FF]">
                  structured data
                </Link>
                , proper schema markup, and content engineered to rank on{" "}
                <strong className="text-white">Google, Bing, Yahoo, DuckDuckGo</strong> and
                get recommended by{" "}
                <Link href="/services#ai-search-optimization-(geo)" className="text-[#5CB8FF] hover:text-[#8DD0FF]">
                  ChatGPT, Perplexity, Gemini, and Claude
                </Link>
                .
              </p>
              <p>
                We don&apos;t use WordPress. We don&apos;t use templates from 2015. We build
                custom Next.js platforms with AI-powered content generation, automated
                internal linking, and dynamic structured data. The result is a{" "}
                <Link href="/pricing" className="text-[#5CB8FF] hover:text-[#8DD0FF]">
                  lead generation machine
                </Link>{" "}
                that works 24/7 at $0 per click &mdash; while your competitors keep feeding
                the Google Ads machine.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* What We Do — blue */}
      <section className="bg-[#0080FE] py-20 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-3xl font-bold sm:text-4xl">
            Traditional SEO + AI Search &mdash; One Platform
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-lg text-blue-100">
            Most agencies optimize for Google and call it a day. We optimize for every
            search engine and every AI platform at the same time.
          </p>

          <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl bg-white/10 p-6 backdrop-blur-sm">
              <h3 className="text-lg font-semibold text-[#EFF70A]">SEO &amp; Technical Optimization</h3>
              <p className="mt-3 text-sm text-blue-100">
                On-page, off-page, and technical SEO for{" "}
                <Link href="/businesses" className="text-white underline hover:text-blue-200">
                  170+ service industries
                </Link>
                . Title tags, meta descriptions, heading structure, internal linking,
                schema markup, Core Web Vitals &mdash; the full stack.
              </p>
            </div>
            <div className="rounded-xl bg-white/10 p-6 backdrop-blur-sm">
              <h3 className="text-lg font-semibold text-[#EFF70A]">AI Search Optimization (GEO)</h3>
              <p className="mt-3 text-sm text-blue-100">
                Generative Engine Optimization for ChatGPT, Perplexity, Gemini, and
                Claude. We structure every page so AI models can read, understand, and
                recommend your business. AI search converts at{" "}
                <Link href="/services#ai-search-optimization-(geo)" className="text-white underline hover:text-blue-200">
                  4&ndash;5x the rate
                </Link>{" "}
                of traditional search.
              </p>
            </div>
            <div className="rounded-xl bg-white/10 p-6 backdrop-blur-sm">
              <h3 className="text-lg font-semibold text-[#EFF70A]">AI Agent Development</h3>
              <p className="mt-3 text-sm text-blue-100">
                Custom{" "}
                <Link href="/services#ai-agent-development" className="text-white underline hover:text-blue-200">
                  AI agents
                </Link>{" "}
                that qualify leads, answer customer questions, and book appointments
                24/7. Built on the same structured data powering your SEO platform.
              </p>
            </div>
            <div className="rounded-xl bg-white/10 p-6 backdrop-blur-sm">
              <h3 className="text-lg font-semibold text-[#EFF70A]">Programmatic SEO</h3>
              <p className="mt-3 text-sm text-blue-100">
                AI-powered page generation at scale. We build dedicated, optimized pages
                for every service + location combination. This site has{" "}
                <Link href="/businesses" className="text-white underline hover:text-blue-200">
                  {totalPages.toLocaleString()}+ of them
                </Link>
                .
              </p>
            </div>
            <div className="rounded-xl bg-white/10 p-6 backdrop-blur-sm">
              <h3 className="text-lg font-semibold text-[#EFF70A]">Multi-Engine Optimization</h3>
              <p className="mt-3 text-sm text-blue-100">
                Google, Bing, Yahoo, DuckDuckGo &mdash; plus AI platforms. Most agencies
                only target Google. We put you in front of every search engine where your{" "}
                <Link href="/areas" className="text-white underline hover:text-blue-200">
                  local customers
                </Link>{" "}
                look for services.
              </p>
            </div>
            <div className="rounded-xl bg-white/10 p-6 backdrop-blur-sm">
              <h3 className="text-lg font-semibold text-[#EFF70A]">EMD Microsites</h3>
              <p className="mt-3 text-sm text-blue-100">
                Exact Match Domain microsites built to rank fast for your highest-value
                keywords. Managed, hosted, and optimized as part of your{" "}
                <Link href="/pricing" className="text-white underline hover:text-blue-200">
                  SEO plan
                </Link>
                .
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Coverage Area — black */}
      <section className="bg-[#0A0A0A] py-20 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            {totalNeighborhoods} Neighborhoods. 8 Regions. Total Coverage.
          </h2>
          <p className="mt-4 max-w-2xl text-lg text-zinc-300">
            We build{" "}
            <Link href="/services" className="text-[#5CB8FF] hover:text-[#8DD0FF]">
              SEO and AI search platforms
            </Link>{" "}
            covering every corner of the NYC metro area &mdash; from{" "}
            <Link href="/plumber/manhattan" className="text-[#5CB8FF] hover:text-[#8DD0FF]">
              Manhattan
            </Link>{" "}
            to{" "}
            <Link href="/electrician/hoboken" className="text-[#5CB8FF] hover:text-[#8DD0FF]">
              Hoboken
            </Link>{" "}
            to{" "}
            <Link href="/hvac/white-plains" className="text-[#5CB8FF] hover:text-[#8DD0FF]">
              White Plains
            </Link>
            . Every neighborhood gets dedicated optimized pages for every{" "}
            <Link href="/businesses" className="text-[#5CB8FF] hover:text-[#8DD0FF]">
              service type
            </Link>{" "}
            we support.
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { region: "Manhattan", example: "Upper East Side to FiDi" },
              { region: "Brooklyn", example: "Williamsburg to Bay Ridge" },
              { region: "Queens", example: "Astoria to Far Rockaway" },
              { region: "Bronx", example: "Riverdale to City Island" },
              { region: "Staten Island", example: "St. George to Tottenville" },
              { region: "New Jersey", example: "Jersey City, Hoboken, Newark & 40+" },
              { region: "Long Island", example: "Great Neck to Montauk" },
              { region: "Westchester", example: "Yonkers to Peekskill" },
            ].map((area) => (
              <Link
                key={area.region}
                href={`/areas#${area.region.toLowerCase().replace(/\s+/g, "-")}`}
                className="rounded-xl border border-zinc-800 bg-[#141414] p-5 transition-colors hover:border-[#0080FE]"
              >
                <h3 className="font-semibold text-white">{area.region}</h3>
                <p className="mt-1 text-xs text-zinc-500">{area.example}</p>
              </Link>
            ))}
          </div>

          <div className="mt-10 text-center">
            <Link
              href="/areas"
              className="inline-flex items-center rounded-lg border border-zinc-700 px-6 py-3 text-sm font-semibold text-white hover:border-zinc-500 hover:bg-white/5"
            >
              All {totalNeighborhoods} Areas &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* Consortium NYC — grey */}
      <section className="bg-[#2A2A2A] py-20 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#0080FE]">
              Powered By
            </p>
            <h2 className="mt-3 text-3xl font-bold sm:text-4xl">
              Consortium NYC Digital Marketing Agency
            </h2>
            <p className="mt-6 text-lg leading-8 text-zinc-300">
              <a
                href="https://www.consortiumnyc.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#5CB8FF] hover:text-[#8DD0FF]"
              >
                Consortium NYC
              </a>{" "}
              is a New York-based digital marketing agency with 25+ years of experience
              in SEO, web development, branding, and AI integration. We&apos;ve completed
              10,000+ projects for businesses ranging from local service providers to
              national brands. The NYC SEO is our dedicated{" "}
              <Link href="/services" className="text-[#5CB8FF] hover:text-[#8DD0FF]">
                SEO and AI search optimization platform
              </Link>{" "}
              for the service business market.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-6">
              <a
                href="https://www.bbb.org/us/ny/new-york/profile/web-designer/consortium-nyc-0121-87177901"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:border-zinc-500"
              >
                <span className="text-lg font-bold text-white">A+</span> BBB Rating
              </a>
              <a
                href="https://share.google/nbwE7X3l2UqirIYkJ"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:border-zinc-500"
              >
                <span className="text-yellow-400">&#9733;&#9733;&#9733;&#9733;&#9733;</span> 5-Star Google
              </a>
              <div className="flex items-center gap-2 rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300">
                <span className="text-lg font-bold text-white">25+</span> Years
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300">
                <span className="text-lg font-bold text-white">10K+</span> Projects
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA — blue */}
      <section className="bg-[#0080FE] py-14">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">
            Ready to Build Your Organic Lead Machine?
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-lg text-blue-100">
            Tell us about your{" "}
            <Link href="/businesses" className="text-white underline hover:text-blue-200">
              business
            </Link>
            . We&apos;ll show you the{" "}
            <Link href="/services" className="text-white underline hover:text-blue-200">
              SEO and AI search strategy
            </Link>
            , the pages, and the full plan. No cost. No commitment.
          </p>
          <div className="mt-6 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/partnership-request-form"
              className="inline-flex items-center rounded-lg bg-white px-6 py-3 text-lg font-semibold text-[#0080FE] shadow-sm hover:bg-blue-50"
            >
              Get Better Leads
            </Link>
            <a
              href={`tel:${PHONE.replace(/-/g, "")}`}
              className="inline-flex items-center rounded-lg border-2 border-white px-6 py-3 text-lg font-semibold text-white hover:bg-white/10"
            >
              Call {PHONE}
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
