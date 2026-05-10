// @ts-nocheck
import Link from "next/link";
import type { Metadata } from "next";
import Breadcrumbs from "@/app/site/the-nyc-seo/_components/Breadcrumbs";
import { PHONE, SITE_URL } from "@/app/site/the-nyc-seo/_lib/seo";

export const metadata: Metadata = {
  title:
    "SEO Portfolio | Live Websites & Microsites That Rank | The NYC SEO",
  description:
    "Browse live SEO websites, EMD microsites, and AI-optimized platforms built by The NYC SEO and Consortium NYC. Visit them. Google them. See them ranking on Google, Bing, DuckDuckGo, and AI search platforms right now.",
  openGraph: {
    title: "SEO Portfolio | Live Websites & Microsites That Rank",
    description:
      "Live SEO websites and EMD microsites we've built that actually rank. Visit them. Google them. See the proof.",
    url: `${SITE_URL}/portfolio`,
  },
  alternates: {
    canonical: `${SITE_URL}/portfolio`,
  },
};

const projects = [
  {
    title: "AI Agent Dev Team",
    domain: "aiagentdevteam.com",
    type: "AI Platform",
    isNew: true,
  },
  {
    title: "Vacation Rentals in Destin FL",
    domain: "vacationrentalsindestinfl.com",
    type: "EMD Microsite",
    isNew: true,
  },
  {
    title: "AI Agent NYC",
    domain: "aiagentnyc.com",
    type: "AI Platform",
    isNew: true,
  },
  {
    title: "Visit Destin",
    domain: "visitdestin.com",
    type: "SEO Platform",
    isNew: true,
  },
  {
    title: "Crab Island Destin FL",
    domain: "crabislanddestinfl.com",
    type: "EMD Microsite",
    isNew: true,
  },
  {
    title: "Rent a Boat in Destin",
    domain: "rentaboatindestin.com",
    type: "EMD Microsite",
    isNew: true,
  },
  {
    title: "Jet Ski Rentals in Destin",
    domain: "jetskirentalsindestin.com",
    type: "EMD Microsite",
    isNew: true,
  },
  {
    title: "Daytona Dumpster Company",
    domain: "daytonadumpstercompany.com",
    type: "SEO Platform",
    isNew: true,
  },
];

export default function PortfolioPage() {
  return (
    <div className="text-white">
      {/* Hero — dark with emerald accent */}
      <section className="bg-[#0A0A0A] pb-20 pt-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Breadcrumbs items={[{ name: "Portfolio", url: "/portfolio" }]} />

          <div className="mt-10 grid gap-12 lg:grid-cols-5 lg:items-center">
            <div className="lg:col-span-3">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-400">
                Live SEO Projects &middot; Built by Consortium NYC
              </p>
              <h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl">
                SEO Websites &amp; Microsites
                <br />
                <span className="text-emerald-400">We&apos;ve Built That Actually Rank</span>
              </h1>
              <p className="mt-6 text-lg leading-8 text-zinc-300">
                Every{" "}
                <Link href="/about" className="text-[#5CB8FF] hover:text-[#8DD0FF]">
                  SEO agency
                </Link>{" "}
                claims they deliver results. We prove ours. These are live{" "}
                <Link href="/services" className="text-[#5CB8FF] hover:text-[#8DD0FF]">
                  SEO websites
                </Link>
                , EMD microsites, and{" "}
                <Link href="/services#ai-search-optimization-(geo)" className="text-[#5CB8FF] hover:text-[#8DD0FF]">
                  AI-optimized platforms
                </Link>{" "}
                we&apos;ve built for real businesses. Visit them. Google them.
                Ask ChatGPT about them. See them ranking right now.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 lg:col-span-2">
              <div className="rounded-xl border border-emerald-900/60 bg-emerald-950/40 p-5 text-center">
                <div className="text-3xl font-extrabold text-emerald-400">8</div>
                <div className="mt-1 text-xs text-zinc-400">Live Projects</div>
              </div>
              <div className="rounded-xl border border-emerald-900/60 bg-emerald-950/40 p-5 text-center">
                <div className="text-3xl font-extrabold text-emerald-400">100%</div>
                <div className="mt-1 text-xs text-zinc-400">Ranking</div>
              </div>
              <div className="rounded-xl border border-emerald-900/60 bg-emerald-950/40 p-5 text-center">
                <div className="text-3xl font-extrabold text-white">5</div>
                <div className="mt-1 text-xs text-zinc-400">Search Engines</div>
              </div>
              <div className="rounded-xl border border-emerald-900/60 bg-emerald-950/40 p-5 text-center">
                <div className="text-3xl font-extrabold text-white">AI</div>
                <div className="mt-1 text-xs text-zinc-400">Optimized</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Projects Grid — grey */}
      <section className="bg-[#2A2A2A] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 md:grid-cols-2">
            {projects.map((project) => (
              <div
                key={project.domain}
                className="relative overflow-hidden rounded-xl border border-emerald-900/60 bg-emerald-950/40"
              >
                <div className="p-6 pb-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-xl font-bold uppercase tracking-wide text-white">
                        {project.title}
                      </h2>
                      <p className="mt-2 font-mono text-sm text-zinc-400">
                        {project.domain}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full border border-emerald-700 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-400">
                        {project.type}
                      </span>
                      {project.isNew && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2.5 py-0.5 text-[10px] font-bold text-white">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-2.5 w-2.5">
                            <path d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401Z" />
                          </svg>
                          NEW
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 border-t border-emerald-900/60">
                  <a
                    href={`https://${project.domain}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 border-r border-emerald-900/60 py-3.5 text-sm font-semibold text-emerald-400 transition-colors hover:bg-emerald-950/60 hover:text-emerald-300"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                      <path fillRule="evenodd" d="M4.25 5.5a.75.75 0 0 0-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 0 0 .75-.75v-4a.75.75 0 0 1 1.5 0v4A2.25 2.25 0 0 1 12.75 17h-8.5A2.25 2.25 0 0 1 2 14.75v-8.5A2.25 2.25 0 0 1 4.25 4h5a.75.75 0 0 1 0 1.5h-5Zm7.97-2.03a.75.75 0 0 1 .75-.22h4a.75.75 0 0 1 .75.75v4a.75.75 0 0 1-1.5 0V5.06l-5.47 5.47a.75.75 0 0 1-1.06-1.06l5.47-5.47H12.5a.75.75 0 0 1-.53-.22Z" clipRule="evenodd" />
                    </svg>
                    Visit
                  </a>
                  <a
                    href={`https://www.google.com/search?q=${encodeURIComponent(project.domain)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 py-3.5 text-sm font-semibold text-emerald-400 transition-colors hover:bg-emerald-950/60 hover:text-emerald-300"
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23Z" fill="#34A853" />
                      <path d="M5.84 14.09A6.68 6.68 0 0 1 5.5 12c0-.72.13-1.43.34-2.09V7.07H2.18A11 11 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l2.85-2.22.81-.62Z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53Z" fill="#EA4335" />
                    </svg>
                    Google
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What We Build — blue */}
      <section className="bg-[#0080FE] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-3xl font-bold text-white sm:text-4xl">
            Three Types of SEO Assets We Build
          </h2>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            <div className="rounded-xl bg-white/10 p-6 backdrop-blur-sm">
              <h3 className="text-lg font-semibold text-[#EFF70A]">EMD Microsites</h3>
              <p className="mt-3 text-sm text-blue-100">
                Exact Match Domain sites built on keywords your customers search.
                Like &ldquo;brooklynplumber.com&rdquo; or &ldquo;rentaboatindestin.com.&rdquo;
                These rank fast because the domain itself signals relevance. Part of our{" "}
                <Link href="/pricing" className="text-white underline hover:text-blue-200">
                  Starter and Domination plans
                </Link>.
              </p>
            </div>
            <div className="rounded-xl bg-white/10 p-6 backdrop-blur-sm">
              <h3 className="text-lg font-semibold text-[#EFF70A]">SEO Platforms</h3>
              <p className="mt-3 text-sm text-blue-100">
                Full{" "}
                <Link href="/services#web-design--development" className="text-white underline hover:text-blue-200">
                  Next.js websites
                </Link>{" "}
                with hundreds or thousands of{" "}
                <Link href="/services#ai-powered-content--page-generation" className="text-white underline hover:text-blue-200">
                  AI-generated pages
                </Link>
                , each targeting a specific service + location keyword. Structured data,
                internal linking, sitemaps &mdash; the full SEO stack.
              </p>
            </div>
            <div className="rounded-xl bg-white/10 p-6 backdrop-blur-sm">
              <h3 className="text-lg font-semibold text-[#EFF70A]">AI Platforms</h3>
              <p className="mt-3 text-sm text-blue-100">
                <Link href="/services#ai-agent-development" className="text-white underline hover:text-blue-200">
                  AI-powered platforms
                </Link>{" "}
                built for the future of search. Optimized for ChatGPT, Perplexity, and
                Gemini with clean structured data that AI models can parse and recommend.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA — dark */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold sm:text-3xl">
            Want Us to Build Yours?
          </h2>
          <p className="mt-4 text-lg text-zinc-300">
            Every project in our{" "}
            <Link href="/portfolio" className="text-[#5CB8FF] hover:text-[#8DD0FF]">
              portfolio
            </Link>{" "}
            started with a conversation. Tell us about your{" "}
            <Link href="/businesses" className="text-[#5CB8FF] hover:text-[#8DD0FF]">
              business
            </Link>
            {" "}and we&apos;ll show you what we&apos;d build.
          </p>
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/partnership-request-form"
              className="inline-flex items-center rounded-lg bg-[#0080FE] px-7 py-3.5 text-base font-semibold text-white hover:bg-[#0070E0]"
            >
              Get Better Leads
            </Link>
            <a
              href={`tel:${PHONE.replace(/-/g, "")}`}
              className="inline-flex items-center rounded-lg border border-zinc-700 px-7 py-3.5 text-base font-semibold text-white hover:border-zinc-500 hover:bg-white/5"
            >
              Call {PHONE}
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
