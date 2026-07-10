import Link from "next/link";
import type { Metadata } from "next";
import Breadcrumbs from "@/app/site/the-nyc-seo/_components/Breadcrumbs";
import { PHONE, SITE_URL } from "@/app/site/the-nyc-seo/_lib/seo";

export const metadata: Metadata = {
  title: "SEO & AI Search Blog | Guides, Strategy & Insights | The NYC SEO",
  description:
    "SEO and AI search optimization guides for service businesses — from keyword research and structured data to ChatGPT optimization and programmatic SEO. The SEO A-Z and AI Search A-Z series break down every concept you need to dominate search.",
  openGraph: {
    title: "SEO & AI Search Blog | The NYC SEO",
    description: "SEO and AI search guides for service businesses — the SEO A-Z and AI Search A-Z series.",
    url: `${SITE_URL}/blog`,
  },
  alternates: { canonical: `${SITE_URL}/blog` },
};

const seoAZ = [
  { letter: "A", title: "Authority: How Search Engines Decide Who Ranks First", slug: "authority-how-search-engines-decide-who-ranks-first" },
  { letter: "B", title: "Backlinks: The Currency of SEO Trust", slug: "backlinks-the-currency-of-seo-trust" },
  { letter: "C", title: "Core Web Vitals: Why Speed Is a Ranking Factor", slug: "core-web-vitals-why-speed-is-a-ranking-factor" },
  { letter: "D", title: "Domain Rating: What It Means and How to Build It", slug: "domain-rating-what-it-means-and-how-to-build-it" },
  { letter: "E", title: "E-E-A-T: Experience, Expertise, Authoritativeness & Trust", slug: "eeat-experience-expertise-authoritativeness-trust" },
  { letter: "F", title: "FAQPage Schema: Structured Data That Wins Featured Snippets", slug: "faqpage-schema-structured-data-featured-snippets" },
  { letter: "G", title: "Google Business Profile: The Foundation of Local SEO", slug: "google-business-profile-foundation-of-local-seo" },
  { letter: "H", title: "Heading Structure: H1 Through H6 and Why It Matters", slug: "heading-structure-h1-through-h6-why-it-matters" },
  { letter: "I", title: "Internal Linking: How to Pass Authority Through Your Site", slug: "internal-linking-how-to-pass-authority-through-your-site" },
  { letter: "J", title: "JSON-LD: The Structured Data Format Search Engines Prefer", slug: "json-ld-structured-data-format-search-engines-prefer" },
  { letter: "K", title: "Keyword Research: Finding What Your Customers Actually Search", slug: "keyword-research-finding-what-customers-actually-search" },
  { letter: "L", title: "Local SEO: Ranking in the Cities and Neighborhoods You Serve", slug: "local-seo-ranking-in-cities-and-neighborhoods-you-serve" },
  { letter: "M", title: "Meta Tags: Title Tags and Descriptions That Get Clicks", slug: "meta-tags-title-tags-descriptions-that-get-clicks" },
  { letter: "N", title: "NAP Consistency: Name, Address, Phone Across the Web", slug: "nap-consistency-name-address-phone-across-the-web" },
  { letter: "O", title: "On-Page SEO: Everything That Happens on Your Actual Pages", slug: "on-page-seo-everything-that-happens-on-your-actual-pages" },
  { letter: "P", title: "Programmatic SEO: Building Thousands of Pages That Rank", slug: "programmatic-seo-building-thousands-of-pages-that-rank" },
  { letter: "Q", title: "Query Intent: Understanding What Searchers Really Want", slug: "query-intent-understanding-what-searchers-really-want" },
  { letter: "R", title: "Reviews: How Online Reputation Impacts Rankings", slug: "reviews-how-online-reputation-impacts-rankings" },
  { letter: "S", title: "Sitemaps: Helping Search Engines Find Every Page", slug: "sitemaps-helping-search-engines-find-every-page" },
  { letter: "T", title: "Technical SEO: The Code Behind the Rankings", slug: "technical-seo-the-code-behind-the-rankings" },
  { letter: "U", title: "URL Structure: Clean Paths That Search Engines Love", slug: "url-structure-clean-paths-search-engines-love" },
  { letter: "V", title: "Voice Search: Optimizing for How People Actually Talk", slug: "voice-search-optimizing-for-how-people-actually-talk" },
  { letter: "W", title: "Web Performance: Why Faster Sites Rank Higher", slug: "web-performance-why-faster-sites-rank-higher" },
  { letter: "X", title: "XML Sitemaps: The Technical File That Guides Crawlers", slug: "xml-sitemaps-technical-file-that-guides-crawlers" },
  { letter: "Y", title: "Your Competition: How to Analyze and Outrank Them", slug: "your-competition-how-to-analyze-and-outrank-them" },
  { letter: "Z", title: "Zero-Click Searches: Winning When Users Never Leave Google", slug: "zero-click-searches-winning-when-users-never-leave-google" },
];

const aiSearchAZ = [
  { letter: "A", title: "Answer Engine Optimization: Getting Cited by AI", slug: "answer-engine-optimization-getting-cited-by-ai" },
  { letter: "B", title: "Bing Integration: Why It Powers ChatGPT Results", slug: "bing-integration-why-it-powers-chatgpt-results" },
  { letter: "C", title: "ChatGPT Optimization: How to Get Recommended by Name", slug: "chatgpt-optimization-how-to-get-recommended-by-name" },
  { letter: "D", title: "Data Structures: What AI Models Parse From Your Pages", slug: "data-structures-what-ai-models-parse-from-your-pages" },
  { letter: "E", title: "Entity Authority: How AI Decides Which Businesses to Recommend", slug: "entity-authority-how-ai-decides-which-businesses-to-recommend" },
  { letter: "F", title: "FAQ Content: The Format AI Search Models Love Most", slug: "faq-content-the-format-ai-search-models-love-most" },
  { letter: "G", title: "GEO: Generative Engine Optimization Explained", slug: "geo-generative-engine-optimization-explained" },
  { letter: "H", title: "Hallucination Prevention: Making Sure AI Gets Your Info Right", slug: "hallucination-prevention-making-sure-ai-gets-your-info-right" },
  { letter: "I", title: "Indexing for AI: How Crawlers Feed Language Models", slug: "indexing-for-ai-how-crawlers-feed-language-models" },
  { letter: "J", title: "JSON-LD for AI: Structured Data That Machines Understand", slug: "json-ld-for-ai-structured-data-machines-understand" },
  { letter: "K", title: "Knowledge Graphs: How AI Connects Your Business to Queries", slug: "knowledge-graphs-how-ai-connects-business-to-queries" },
  { letter: "L", title: "LLM Training Data: Where AI Gets Its Recommendations", slug: "llm-training-data-where-ai-gets-its-recommendations" },
  { letter: "M", title: "Multi-Platform Strategy: ChatGPT, Perplexity, Gemini & Claude", slug: "multi-platform-strategy-chatgpt-perplexity-gemini-claude" },
  { letter: "N", title: "Natural Language Content: Writing for AI Comprehension", slug: "natural-language-content-writing-for-ai-comprehension" },
  { letter: "O", title: "OpenAI Search: How ChatGPT Finds and Recommends Businesses", slug: "openai-search-how-chatgpt-finds-recommends-businesses" },
  { letter: "P", title: "Perplexity Optimization: Getting Cited in AI Search Results", slug: "perplexity-optimization-getting-cited-in-ai-search-results" },
  { letter: "Q", title: "Query Patterns: How People Search AI vs Google", slug: "query-patterns-how-people-search-ai-vs-google" },
  { letter: "R", title: "RAG Systems: How AI Retrieves and Generates Answers", slug: "rag-systems-how-ai-retrieves-and-generates-answers" },
  { letter: "S", title: "Source Attribution: Getting Your Business Cited as the Source", slug: "source-attribution-getting-business-cited-as-source" },
  { letter: "T", title: "Trust Signals: What Makes AI Recommend One Business Over Another", slug: "trust-signals-what-makes-ai-recommend-one-business-over-another" },
  { letter: "U", title: "User Intent in AI: How AI Interprets What Customers Need", slug: "user-intent-in-ai-how-ai-interprets-what-customers-need" },
  { letter: "V", title: "Voice AI: When Customers Talk to AI Instead of Typing", slug: "voice-ai-when-customers-talk-to-ai-instead-of-typing" },
  { letter: "W", title: "Web Presence: The Signals AI Aggregates About Your Business", slug: "web-presence-signals-ai-aggregates-about-your-business" },
  { letter: "X", title: "X-Factor: The Competitive Edge of Early AI Search Adoption", slug: "x-factor-competitive-edge-early-ai-search-adoption" },
  { letter: "Y", title: "Your AI Visibility Score: Measuring AI Search Performance", slug: "your-ai-visibility-score-measuring-ai-search-performance" },
  { letter: "Z", title: "Zero to Recommended: The Full AI Search Optimization Playbook", slug: "zero-to-recommended-full-ai-search-optimization-playbook" },
];

export default function BlogPage() {
  return (
    <div className="text-white">
      {/* Hero */}
      <section className="bg-[#0A0A0A] pb-20 pt-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Breadcrumbs items={[{ name: "Blog", url: "/blog" }]} />

          <div className="mt-10 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#0080FE]">52 Guides &middot; Two Series</p>
            <h1 className="mx-auto mt-4 max-w-4xl text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
              The SEO &amp; AI Search
              <br /><span className="text-[#EFF70A]">Knowledge Base</span>
            </h1>
            <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-zinc-300">
              Two complete A-to-Z series covering every concept in{" "}<Link href="/services/search-engine-optimization" className="text-[#5CB8FF] hover:text-[#8DD0FF]">search engine optimization</Link> and{" "}<Link href="/services/ai-search-optimization" className="text-[#5CB8FF] hover:text-[#8DD0FF]">AI search optimization</Link>. No fluff. No filler. Just the knowledge your{" "}<Link href="/businesses" className="text-[#5CB8FF] hover:text-[#8DD0FF]">service business</Link> needs to dominate every search platform.
            </p>
          </div>
        </div>
      </section>

      {/* SEO A-Z Series */}
      <section className="bg-[#2A2A2A] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#0080FE]">Series 01</p>
            <h2 className="mt-2 text-3xl font-bold sm:text-4xl">SEO A&ndash;Z</h2>
            <p className="mx-auto mt-3 max-w-2xl text-zinc-400">26 guides covering every fundamental of search engine optimization — from authority and backlinks to zero-click searches.</p>
          </div>

          <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {seoAZ.map((post) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="group flex items-start gap-3 rounded-xl border border-zinc-800 bg-[#141414] p-4 transition-colors hover:border-[#0080FE]/40 hover:bg-[#1a1a1a]"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#0080FE] text-sm font-bold text-white">
                  {post.letter}
                </span>
                <span className="text-sm font-medium leading-snug text-zinc-300 group-hover:text-white">
                  {post.title}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* AI Search A-Z Series */}
      <section className="bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#EFF70A]">Series 02</p>
            <h2 className="mt-2 text-3xl font-bold sm:text-4xl">AI Search A&ndash;Z</h2>
            <p className="mx-auto mt-3 max-w-2xl text-zinc-400">26 guides on the future of search — from answer engine optimization and ChatGPT visibility to generative engine optimization and AI trust signals.</p>
          </div>

          <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {aiSearchAZ.map((post) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="group flex items-start gap-3 rounded-xl border border-zinc-800 bg-[#141414] p-4 transition-colors hover:border-[#EFF70A]/30 hover:bg-[#1a1a1a]"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#EFF70A] text-sm font-bold text-black">
                  {post.letter}
                </span>
                <span className="text-sm font-medium leading-snug text-zinc-300 group-hover:text-white">
                  {post.title}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#0080FE] py-14">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">Rather Have Us Handle It?</h2>
          <p className="mx-auto mt-3 max-w-2xl text-lg text-blue-100">Reading about SEO is one thing. Having a team that builds{" "}<Link href="/services" className="text-white underline hover:text-blue-200">the entire platform</Link> for you is another. We handle{" "}<Link href="/services/search-engine-optimization" className="text-white underline hover:text-blue-200">SEO</Link>,{" "}<Link href="/services/ai-search-optimization" className="text-white underline hover:text-blue-200">AI search</Link>, and everything in between.</p>
          <div className="mt-6 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link href="/partnership-request-form" className="inline-flex items-center rounded-lg bg-white px-6 py-3 text-lg font-semibold text-[#0080FE] hover:bg-blue-50">Get Better Leads</Link>
            <a href={`tel:${PHONE.replace(/-/g, "")}`} className="inline-flex items-center rounded-lg border-2 border-white px-6 py-3 text-lg font-semibold text-white hover:bg-white/10">Call {PHONE}</a>
          </div>
        </div>
      </section>
    </div>
  );
}
