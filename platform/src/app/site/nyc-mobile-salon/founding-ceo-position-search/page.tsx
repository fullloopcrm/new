import { safeJsonLd } from '@/lib/escape-html'
import type { Metadata } from "next";
import Link from "next/link";
import { faqSchema, breadcrumbSchema } from "@/app/site/nyc-mobile-salon/_lib/seo";

export const metadata: Metadata = {
  title: "Founding CEO / Head of Operations — The NYC Mobile Salon",
  description:
    "Founding CEO / Head of Operations opportunity at The NYC Mobile Salon. 21,100 pages indexed, 30+ inbound calls, AI-automated backend, zero capital entry — founder equity stake, pre-revenue pre-funding. Ex-marketplace operators (Glamsquad, Soothe, StyleSeat, Priv, Urban Company) apply.",
  alternates: { canonical: "https://thenycmobilesalon.com/founding-ceo-position-search" },
  openGraph: {
    title: "Founding CEO / Head of Operations — The NYC Mobile Salon",
    description:
      "Take a brand-new NYC mobile beauty platform from founder-led to operator-led. Traction, brand, and AI automation already built. Founder equity stake, pre-revenue pre-funding — real ownership of a real business.",
    url: "https://thenycmobilesalon.com/founding-ceo-position-search",
  },
};

/* ── data ─────────────────────────────────────────────────────────── */

const traction = [
  {
    title: "21,100 pages indexed on Google",
    detail:
      "11,500 impressions at an average position of 12.2 on a brand-new domain — a year's worth of organic SEO traction compressed into 30 days. The search engine trust is already built, and the content engine is still expanding.",
  },
  {
    title: "30+ inbound client calls in the first month",
    detail:
      "Large events, group class bookings, corporate wellness inquiries, and a single request for ten techs at once. Demand is arriving faster than the current solo founder can work through it.",
  },
  {
    title: "Live website and booking platform",
    detail:
      "Fully operational end-to-end booking, payments via Stripe, admin dashboard, cleaner/stylist routing, and real-time dispatch. Clients can book in under two minutes on mobile or desktop.",
  },
  {
    title: "Custom AI-driven automation backend",
    detail:
      "Built in-house, already live. Lead triage, appointment confirmations, cleaner matching, and customer service are automated — and the dev capability is here to automate nearly every operational workflow as the business scales. You inherit leverage, not a to-do list.",
  },
  {
    title: "Licensed pros actively applying",
    detail:
      "Applications are coming in organically from hairstylists, barbers, estheticians, and makeup artists across all five boroughs. The supply side is already self-seeding — we are working through verification now.",
  },
  {
    title: "Pre-revenue, pre-first-hire — ready to flip the switch",
    detail:
      "The demand is here, the infrastructure is here, the brand is here, the automation is here. What is missing is the operator who will turn it on, hire the team, and scale the playbook.",
  },
];

const whatYouOwn = [
  {
    title: "Sales",
    description:
      "Close inbound leads, build the corporate / hotel / event pipeline, and develop the B2B partnership channels that create predictable high-ticket bookings. You will have an SEO engine feeding you warm inbound from day one.",
  },
  {
    title: "Operations",
    description:
      "Own the end-to-end service delivery experience — cleaner dispatch, quality control, incident handling, refund policy, and the operational playbook that makes the brand scalable beyond NYC.",
  },
  {
    title: "Hiring",
    description:
      "Build the first real team. Vet and onboard the licensed pros who are already applying, hire the dispatchers and CX leads to support them, and create the hiring funnel that keeps supply ahead of demand.",
  },
  {
    title: "Customer Service",
    description:
      "Set the customer service standard, build the CX playbook, and then hire the people who run it. NYC clients are demanding — how you respond when things go wrong is what determines whether they book again and bring their network.",
  },
];

const idealBackground = [
  {
    title: "Marketplace or On-Demand Services Experience",
    description:
      "Ex-Glamsquad, Soothe, StyleSeat, Priv, BeGlammed, Booksy, Vagaro, Urban Company, Blowtie, The Wing, Handy, TaskRabbit, Rinse, Zeel, or similar two-sided platforms. You know what it takes to balance supply and demand in a services marketplace because you have already done it at scale.",
  },
  {
    title: "Supply-Constrained Platform Experience",
    description:
      "You have scaled a business where the bottleneck was skilled labor — not demand. You understand how to recruit, retain, and activate independent professionals, and you know the difference between a platform that grows and a platform that stalls at $2M run-rate.",
  },
  {
    title: "P&L Ownership",
    description:
      "You have owned — not just contributed to — a P&L. You know how to hit unit economics, manage a CAC/LTV ratio, control burn, and tell a growth story to stakeholders with real numbers behind it.",
  },
  {
    title: "NYC-Based",
    description:
      "This is a New York City operation. You live here, you know the neighborhoods, and you have the local relationships (or the ability to build them fast) to open doors with hotels, concierge services, corporate clients, and event planners.",
  },
  {
    title: "Self-Starter with Founder Energy",
    description:
      "Nobody is going to hand you a 30-page onboarding doc. You will walk into traction, a working platform, and an AI-automated backend — and it will be on you to decide what to do next. If you need a playbook to execute, this is not the role. If you want to write the playbook, it is.",
  },
];

const compensation = [
  {
    title: "$0 Entry — Sweat Equity",
    detail:
      "You put in work, not capital. You earn a meaningful ownership stake over time by hitting operational and growth milestones. This is not a small ESOP grant — this is co-founder-level ownership in a multi-million-dollar NYC business that is about to go live.",
  },
  {
    title: "Pre-Revenue, Pre-Funding — Honest About That",
    detail:
      "This is a bootstrapped startup. There is no outside capital to pay a salary and no hourly rate during the ramp. The comp is the equity — period. If you need salary income from day one, this is not the right fit, and it is better that we both know that up front.",
  },
  {
    title: "You Run It Once the Team Is In Place",
    detail:
      "The goal is to transition the business from founder-led to operator-led within 90 days. As revenue comes in, the compensation structure builds out — revenue-share, salary draw, and performance bonuses tied to milestones — all negotiated at the offer stage alongside the equity terms.",
  },
  {
    title: "Real Ownership of a Real Business",
    detail:
      "The brand is built. The SEO engine is live. The AI automation is shipping. Demand is arriving. You are stepping into a running start with real traction — not a deck and a dream. Most operator roles require you to risk your own capital or your career. This one does not.",
  },
];

const process = [
  {
    number: "1",
    title: "Apply",
    description:
      "Submit the application on this page. Tell us about your marketplace experience, the platforms you have scaled, your P&L track record, and your 30/60/90 plan. A short video intro is required — this is an operator-facing role and we need to see how you communicate.",
  },
  {
    number: "2",
    title: "First Conversation",
    description:
      "If your background fits, you will hear back within 72 hours. The first call is 45 minutes with the founder. We talk about your experience, the business as it stands, your compensation expectations, and whether the sweat equity model is right for you.",
  },
  {
    number: "3",
    title: "Deep Dive + Trial Project",
    description:
      "You are given full access to the current metrics, the SEO data, the automation stack, and the inbound pipeline. You return a 30/60/90 plan and a short trial project — scoped so you can complete it in under 10 hours of real work.",
  },
  {
    number: "4",
    title: "Offer + Onboard",
    description:
      "Equity terms, milestones, and the operating agreement are finalized. You onboard as Founding CEO / Head of Operations and the business transitions from founder-led to operator-led over the following 90 days.",
  },
];

const faqs = [
  {
    q: "What does sweat equity actually mean here?",
    a: "You put in operational work and earn ownership over time against defined milestones — first hires made, first $X of monthly revenue hit, first month of operator-led growth, and so on. Specific equity percentages and vesting are discussed in the first call because they depend on your experience, the scope of what you take on, and the compensation structure that works for both sides. What is not negotiable is that the ownership is meaningful and the path to it is clear.",
  },
  {
    q: "Is this a W-2 job or a founder role?",
    a: "Founder / co-founder-level role. It is not a W-2 position and there is no salary or hourly pay during the ramp. The business is pre-revenue and bootstrapped — there is no outside capital to pay an operator today, and we are not pretending otherwise. The comp during ramp is the equity stake. As revenue comes in, a compensation structure builds on top of the equity — revenue-share, salary draw, and performance bonuses tied to milestones — all negotiated at the offer stage. If you need income from day one, this is the wrong fit and we both need to know that up front.",
  },
  {
    q: "How much capital does the business need before it can scale?",
    a: "Very little. The website, booking platform, SEO engine, and AI automation stack are already built and paid for. Payment processing, liability insurance, and the compliance stack are in place. The biggest marginal cost of scaling is the time spent hiring and onboarding licensed pros — and that is what you will be running. The business is designed to grow on gross margin, not venture capital.",
  },
  {
    q: "Why is the founder hiring a CEO instead of running it themselves?",
    a: "The founder is an operator with 25 years of marketing, branding, business development, growth, and strategy experience. The brand, the SEO engine, the AI automation, the platform, and the early demand are already built. What is not the founder's highest and best use is the day-to-day operations of hiring dispatchers, managing cleaner rosters, and running CX — that is a different skill set, and it is a full-time job. The right operator takes this from a founder-led prototype to a real NYC business, and eventually to a multi-city platform.",
  },
  {
    q: "What does 'AI-driven automation backend' mean in practice?",
    a: "It means the grunt work of running a services marketplace is already mostly automated. Lead qualification, appointment confirmations, cleaner matching, customer service triage, and admin workflows are handled by in-house AI agents that have been built and deployed. As the operator, you are not reinventing these systems — you are using them as leverage. When you need a new automation, the dev capability is here to build it. That is what makes this different from stepping into a typical services startup where everything is manual.",
  },
  {
    q: "Do I have to already live in NYC to apply?",
    a: "Strongly preferred. This is a New York City operation — the service area is the five boroughs, the first hires are NYC-based, and the customer relationships are in-person. If you are relocating to NYC in the near term, we are open to a conversation, but we are not hiring remote operators for this role. Once NYC is stable, national expansion is the next chapter.",
  },
  {
    q: "What platforms count as 'marketplace or on-demand services experience'?",
    a: "Any two-sided platform where you scaled supply (independent professionals) and demand (clients) simultaneously. That includes beauty-specific platforms like Glamsquad, Soothe, StyleSeat, Priv, BeGlammed, BeGLOSSY, and Blowtie, broader services marketplaces like Booksy, Vagaro, Urban Company, Handy, TaskRabbit, Zeel, and Rinse, and adjacent categories like fitness (Classpass), cleaning, or home services. If you scaled a supply-constrained services platform at any significant level — whether you ran ops, growth, or general management — we want to talk.",
  },
  {
    q: "What if I do not have a marketplace background but I am a strong NYC operator?",
    a: "Apply anyway. The marketplace experience is strongly preferred because the unit economics, supply/demand dynamics, and operational playbook are specific to two-sided platforms. But if you have scaled an NYC services business, managed a P&L, and built a team — and you can articulate why you understand marketplace dynamics even without direct experience — we will read your application carefully. Tell us the story in the application.",
  },
  {
    q: "What does the first 30 days look like?",
    a: "First week: full data access, 1:1 with the founder, and shadowing the inbound pipeline and cleaner onboarding. Second week: you write the 30/60/90 plan, propose the first three hires, and start closing the backlog of inbound leads. Third and fourth week: first operational hire onboarded, customer service playbook written, and first measurable revenue milestone set. The goal is for the business to be running on your operational playbook — not the founder's — by the end of month one.",
  },
  {
    q: "How do I know this is not just a cheap way to hire an operator for equity?",
    a: "Fair question. The honest answer is that the founder has built the business to the point where most of the 'build' work is done — brand, platform, SEO, automation, early demand. What is left is the operator work, and that is genuinely what the founder is not the best person to do. The equity is meaningful because the value creation from this point forward is operational, not technical or marketing-related. You will see the full data room in the second conversation and make your own judgment. If it is not compelling, walk away. This is designed to be obviously a good deal for the right person, and obviously not the right fit for everyone else.",
  },
];

/* ── component ────────────────────────────────────────────────────── */

function Sparkle({ className = "" }: { className?: string }) {
  return (
    <svg className={`inline-block ${className}`} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0L14.59 8.41L23 11L14.59 13.59L12 22L9.41 13.59L1 11L9.41 8.41L12 0Z" />
    </svg>
  );
}

export default function FoundingCEOPage() {
  return (
    <>
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: safeJsonLd(faqSchema(faqs)),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: safeJsonLd(
            breadcrumbSchema([
              { name: "Home", url: "/" },
              { name: "Founding CEO", url: "/founding-ceo-position-search" },
            ])
          ),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: safeJsonLd({
            "@context": "https://schema.org",
            "@type": "JobPosting",
            title: "Founding CEO / Head of Operations",
            description:
              "Founding CEO / Head of Operations at The NYC Mobile Salon — take a brand-new mobile beauty platform from founder-led to operator-led. 21,100 pages indexed, 30+ inbound calls, AI-automated backend. Pre-revenue bootstrapped startup: founder equity stake only, no salary or hourly during ramp. Ex-marketplace operators preferred.",
            identifier: {
              "@type": "PropertyValue",
              name: "The NYC Mobile Salon",
              value: "nycms-founding-ceo",
            },
            datePosted: new Date().toISOString().split("T")[0],
            validThrough: new Date(Date.now() + 180 * 86400000).toISOString().split("T")[0],
            employmentType: ["FULL_TIME", "CONTRACTOR"],
            hiringOrganization: {
              "@type": "Organization",
              name: "The NYC Mobile Salon",
              sameAs: "https://thenycmobilesalon.com",
              logo: "https://thenycmobilesalon.com/logo.png",
            },
            jobLocation: {
              "@type": "Place",
              address: {
                "@type": "PostalAddress",
                addressLocality: "New York",
                addressRegion: "NY",
                addressCountry: "US",
              },
            },
            applicantLocationRequirements: {
              "@type": "City",
              name: "New York",
            },
            directApply: true,
            qualifications:
              "5+ years in marketplace / on-demand services. P&L ownership. NYC-based. Scaled a supply-constrained two-sided platform.",
            jobBenefits:
              "Meaningful founder-level equity stake, AI-automated operational backend, pre-built SEO engine, pre-built brand, inbound demand from day one. Pre-revenue bootstrapped — no salary during ramp.",
          }),
        }}
      />

      {/* ── 1. Hero ──────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden px-4 py-24 text-white md:py-32"
        style={{
          background:
            "linear-gradient(135deg, #7C3AED 0%, #A78BFA 40%, #C4B5FD 100%)",
        }}
      >
        <div className="relative mx-auto max-w-4xl text-center">
          <span className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-white/20 px-4 py-1.5 text-sm font-semibold backdrop-blur-sm">
            <Sparkle className="h-3.5 w-3.5 text-yellow-300" />
            Founding Team — Once In A Lifetime
          </span>
          <h1 className="mb-6 font-display text-5xl font-black tracking-tight md:text-6xl lg:text-7xl">
            Founding CEO /<br />
            Head of&nbsp;Operations
          </h1>
          <p className="mx-auto mb-8 max-w-2xl text-lg text-white/90 md:text-xl">
            A brand-new NYC mobile beauty platform with 21,100 indexed pages, 30+ inbound calls, a live booking engine, and a custom AI-automated backend — all built in 30 days. Now looking for the operator who will turn it on.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/founding-ceo-position-search/application"
              className="inline-block rounded-full bg-white px-10 py-4 text-sm font-bold text-purple-600 shadow-lg transition hover:bg-purple-50"
            >
              Apply — Founding Equity
            </Link>
            <a
              href="#traction"
              className="inline-block rounded-full border border-white/40 bg-transparent px-8 py-4 text-sm font-bold text-white transition hover:bg-white/10"
            >
              See the Traction
            </a>
          </div>
        </div>
      </section>

      {/* ── Quick Stats Bar ──────────────────────────────────────── */}
      <section className="bg-charcoal px-4 py-10">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-6 md:grid-cols-4">
          {[
            { value: "21,100", label: "Pages Indexed" },
            { value: "11,500", label: "Google Impressions" },
            { value: "30+", label: "Inbound Calls" },
            { value: "$0", label: "Capital Required" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="font-display text-3xl font-black text-purple-400 md:text-4xl">
                {stat.value}
              </p>
              <p className="mt-1 text-sm text-white/60">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 2. The Opportunity ───────────────────────────────────── */}
      <section className="bg-white px-4 py-20">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-2 flex items-center justify-center gap-2 text-sm font-semibold uppercase tracking-widest text-purple-600">
            <Sparkle className="h-3.5 w-3.5" />
            The Opportunity
          </h2>
          <h3 className="mb-8 text-center font-display text-3xl font-black tracking-tight md:text-4xl">
            Step Into Traction, Not A Blank&nbsp;Page
          </h3>
          <div className="space-y-5 text-slate-600 leading-relaxed">
            <p>
              Most operator roles ask you to either risk your own capital to buy in, or to join a company that is already ten years old and running on its own momentum. This role is different. <strong>The NYC Mobile Salon</strong> is 30 days old, pre-revenue, and pre-first-hire — and it already has a year&rsquo;s worth of SEO traction, a fully working booking platform, a custom AI-automated operational backend, and a backlog of inbound client demand.
            </p>
            <p>
              What is missing is the operator. The person who owns sales, operations, hiring, and customer service. The person who takes the business from founder-led to operator-led, builds the first real team, and scales NYC before the business goes national.
            </p>
            <p>
              Because the platform and the automation are already in place, this role is about leverage — not grinding. The tech does the heavy lifting. The operator drives growth, closes the inbound, and builds the team. The brand, the SEO engine, the AI automation, and the early demand are already built. You are stepping into traction, not a blank page.
            </p>
            <p>
              The business was built by an operator with <strong>25 years of experience in marketing, branding, business development, growth, and strategy</strong>. That operator is not the right person to run day-to-day operations, hire dispatchers, or build the first CX team — and honestly, they know it. The right founding operator walks into the business, looks at what is already built, and says <em>&ldquo;I know exactly what to do with this.&rdquo;</em>
            </p>
          </div>
        </div>
      </section>

      {/* ── 3. The Traction ──────────────────────────────────────── */}
      <section id="traction" className="bg-purple-50/50 px-4 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-2 flex items-center justify-center gap-2 text-sm font-semibold uppercase tracking-widest text-purple-600">
            <Sparkle className="h-3.5 w-3.5" />
            30 Days In
          </h2>
          <h3 className="mb-4 text-center font-display text-3xl font-black tracking-tight md:text-4xl">
            Where We Are Right&nbsp;Now
          </h3>
          <p className="mx-auto mb-10 max-w-2xl text-center text-sm text-slate-600 leading-relaxed">
            These are not projections. This is what has been built and shipped in the first 30 days — before a single dollar of paid marketing, before the first hire, and before the founder has flipped the switch from build mode to sell mode.
          </p>
          <div className="grid gap-6 md:grid-cols-2">
            {traction.map((item) => (
              <div key={item.title} className="rounded-xl border border-purple-100 bg-white p-6">
                <h4 className="mb-3 font-display text-lg font-bold text-slate-800">
                  {item.title}
                </h4>
                <p className="text-sm leading-relaxed text-slate-600">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 4. What You Own ──────────────────────────────────────── */}
      <section className="bg-white px-4 py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-2 flex items-center justify-center gap-2 text-sm font-semibold uppercase tracking-widest text-purple-600">
            <Sparkle className="h-3.5 w-3.5" />
            The Role
          </h2>
          <h3 className="mb-10 text-center font-display text-3xl font-black tracking-tight md:text-4xl">
            What You Own From Day&nbsp;One
          </h3>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {whatYouOwn.map((item) => (
              <div
                key={item.title}
                className="rounded-xl border border-purple-100 bg-white p-6"
              >
                <h4 className="mb-3 font-display text-xl font-bold text-slate-800">
                  {item.title}
                </h4>
                <p className="text-sm leading-relaxed text-slate-600">{item.description}</p>
              </div>
            ))}
          </div>
          <p className="mx-auto mt-10 max-w-2xl text-center text-sm text-slate-500 leading-relaxed">
            Your job is not to build the product — the product is built. Your job is to turn demand into revenue, hire the first team, and write the operational playbook that makes this business scalable beyond NYC.
          </p>
        </div>
      </section>

      {/* ── 5. Who Fits ──────────────────────────────────────────── */}
      <section className="bg-purple-50/50 px-4 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-2 flex items-center justify-center gap-2 text-sm font-semibold uppercase tracking-widest text-purple-600">
            <Sparkle className="h-3.5 w-3.5" />
            Ideal Background
          </h2>
          <h3 className="mb-10 text-center font-display text-3xl font-black tracking-tight md:text-4xl">
            Who We&rsquo;re Looking&nbsp;For
          </h3>
          <div className="space-y-4">
            {idealBackground.map((item) => (
              <div
                key={item.title}
                className="rounded-xl border border-purple-100 bg-white p-6"
              >
                <h4 className="mb-2 font-display text-lg font-bold text-slate-800">
                  {item.title}
                </h4>
                <p className="text-sm leading-relaxed text-slate-600">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 6. Compensation ──────────────────────────────────────── */}
      <section className="bg-white px-4 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-2 flex items-center justify-center gap-2 text-sm font-semibold uppercase tracking-widest text-purple-600">
            <Sparkle className="h-3.5 w-3.5" />
            Compensation
          </h2>
          <h3 className="mb-4 text-center font-display text-3xl font-black tracking-tight md:text-4xl">
            Structure Built for the Right&nbsp;Operator
          </h3>
          <p className="mx-auto mb-10 max-w-2xl text-center text-sm text-slate-600 leading-relaxed">
            Designed so the right self-starter never has to put cash in and never has to work for free — while earning a meaningful ownership stake in a business with real traction.
          </p>
          <div className="grid gap-6 md:grid-cols-2">
            {compensation.map((item) => (
              <div
                key={item.title}
                className="rounded-xl border border-purple-100 bg-white p-6"
              >
                <h4 className="mb-3 font-display text-xl font-bold text-slate-800">
                  {item.title}
                </h4>
                <p className="text-sm leading-relaxed text-slate-600">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 7. Why This Is Different ─────────────────────────────── */}
      <section className="bg-purple-50/50 px-4 py-20">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-2 flex items-center justify-center gap-2 text-sm font-semibold uppercase tracking-widest text-purple-600">
            <Sparkle className="h-3.5 w-3.5" />
            Why This Is Different
          </h2>
          <h3 className="mb-10 text-center font-display text-3xl font-black tracking-tight md:text-4xl">
            Leverage, Not&nbsp;Grinding
          </h3>
          <div className="space-y-6">
            <div className="rounded-xl border border-purple-100 bg-white p-6">
              <h4 className="mb-2 font-display text-lg font-bold text-slate-800">
                The AI Automation Backend Was Built Before You Got Here
              </h4>
              <p className="text-sm leading-relaxed text-slate-600">
                Most early-stage services businesses spend the first two years manually doing the work that eventually gets automated. We did it in reverse — we built the automation first. Lead triage, appointment confirmations, cleaner matching, admin workflows, and customer service routing are already automated. You walk into leverage. Your time is spent on the work that only a human can do — closing deals, building trust, and hiring the right people.
              </p>
            </div>

            <div className="rounded-xl border border-purple-100 bg-white p-6">
              <h4 className="mb-2 font-display text-lg font-bold text-slate-800">
                The SEO Engine Is Already Feeding You Leads
              </h4>
              <p className="text-sm leading-relaxed text-slate-600">
                21,100 pages indexed. 11,500 impressions in 30 days. Average position 12.2 on a brand-new domain. This is a year&rsquo;s worth of organic SEO traction compressed into a month — and it is still compounding. The inbound leads are going to keep coming whether or not anyone is answering the phone. Your job is to make sure someone is.
              </p>
            </div>

            <div className="rounded-xl border border-purple-100 bg-white p-6">
              <h4 className="mb-2 font-display text-lg font-bold text-slate-800">
                The Dev Capability Is Still In-House
              </h4>
              <p className="text-sm leading-relaxed text-slate-600">
                When you need a new automation, a new internal tool, a new dashboard, or a new integration with a partner platform — the dev capability is here and ready to build it. You are not going to be blocked by engineering bandwidth. You will have the leverage of a full product and engineering team on demand, for as long as the business needs it.
              </p>
            </div>

            <div className="rounded-xl border border-purple-100 bg-white p-6">
              <h4 className="mb-2 font-display text-lg font-bold text-slate-800">
                The Brand Is Already Built
              </h4>
              <p className="text-sm leading-relaxed text-slate-600">
                Name, domain, visual identity, copy, positioning — all done. Clients are already finding us through Google, booking, and asking for professionals by name. You are not going to spend your first quarter running a branding exercise or arguing about a logo. You are going to spend it selling, hiring, and shipping.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 8. Process ───────────────────────────────────────────── */}
      <section className="bg-white px-4 py-20">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-2 flex items-center justify-center gap-2 text-sm font-semibold uppercase tracking-widest text-purple-600">
            <Sparkle className="h-3.5 w-3.5" />
            Process
          </h2>
          <h3 className="mb-10 text-center font-display text-3xl font-black tracking-tight md:text-4xl">
            How The Hire Works
          </h3>
          <div className="grid gap-8 md:grid-cols-4">
            {process.map((step) => (
              <div key={step.number} className="text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-purple-600 text-xl font-black text-white">
                  {step.number}
                </div>
                <h4 className="mb-2 font-display text-lg font-bold text-slate-800">
                  {step.title}
                </h4>
                <p className="text-sm leading-relaxed text-slate-600">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 9. FAQ ───────────────────────────────────────────────── */}
      <section className="bg-purple-50/50 px-4 py-20">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-2 flex items-center justify-center gap-2 text-sm font-semibold uppercase tracking-widest text-purple-600">
            <Sparkle className="h-3.5 w-3.5" />
            FAQ
          </h2>
          <h3 className="mb-10 text-center font-display text-3xl font-black tracking-tight md:text-4xl">
            Questions Real Operators&nbsp;Ask
          </h3>
          <div className="space-y-6">
            {faqs.map((faq) => (
              <div key={faq.q} className="rounded-xl border border-purple-100 bg-white p-6">
                <h4 className="mb-2 font-display font-bold text-slate-800">{faq.q}</h4>
                <p className="text-sm leading-relaxed text-slate-600">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 10. Apply CTA ────────────────────────────────────────── */}
      <section id="apply" className="bg-white px-4 py-24">
        <div className="mx-auto max-w-lg text-center">
          <h2 className="mb-2 flex items-center justify-center gap-2 text-sm font-semibold uppercase tracking-widest text-purple-600">
            <Sparkle className="h-3.5 w-3.5" />
            Apply Now
          </h2>
          <h3 className="mb-4 font-display text-3xl font-black tracking-tight md:text-4xl">
            Think You&rsquo;re The&nbsp;One?
          </h3>
          <p className="mb-8 text-sm text-slate-600">
            The application is deliberately in-depth. It includes a video intro, a question about your marketplace track record, and a short 30/60/90 plan. We are not looking for a resume drop — we are looking for someone who can tell us, in their own words, why this is obviously their next move.
          </p>
          <Link
            href="/founding-ceo-position-search/application"
            className="inline-block rounded-full bg-purple-600 px-10 py-4 text-sm font-bold text-white shadow-lg shadow-purple-500/20 transition hover:-translate-y-0.5 hover:bg-purple-700"
          >
            Start Your Application
          </Link>

          <div className="mt-8">
            <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-slate-400">
              Or reach out directly
            </p>
            <div className="flex items-center justify-center gap-4">
              <a
                href="mailto:hey@thenycmobilesalon.com?subject=Founding%20CEO%20Inquiry"
                className="flex items-center gap-2 rounded-full border border-purple-200 bg-white px-6 py-3 text-sm font-bold text-purple-600 transition hover:-translate-y-0.5 hover:bg-purple-50"
              >
                Email Founder
              </a>
              <a
                href="sms:+12122029075"
                className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-6 py-3 text-sm font-bold text-slate-600 transition hover:-translate-y-0.5 hover:bg-gray-50"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                  />
                </svg>
                Text Founder
              </a>
            </div>
            <p className="mt-3 text-xs text-slate-400">Text anytime</p>
          </div>
        </div>
      </section>

      {/* ── 11. Final CTA Banner ─────────────────────────────────── */}
      <section
        className="px-4 py-16 text-white"
        style={{
          background:
            "linear-gradient(135deg, #7C3AED 0%, #A78BFA 40%, #C4B5FD 100%)",
        }}
      >
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="mb-4 font-display text-3xl font-black tracking-tight md:text-4xl">
            $0 In. Real Equity. Real Business.
          </h2>
          <p className="mx-auto mb-6 max-w-xl text-white/90">
            Brand built. SEO built. Automation built. Demand arriving. The only thing missing is the operator who turns it on.
          </p>
          <Link
            href="/founding-ceo-position-search/application"
            className="inline-block rounded-full bg-white px-10 py-4 text-sm font-bold text-purple-600 shadow-lg transition hover:bg-purple-50"
          >
            Apply Now
          </Link>
        </div>
      </section>
    </>
  );
}
