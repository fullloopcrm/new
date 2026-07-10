"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  SITE_NAME,
  PHONE,
  SMS_HREF,
  EMAIL,
  ADDRESS,
  services,
  areas,
  getAllBoroughs,
  getBoroughUrl,
  getAreaUrl,
  getServiceUrl,
  getDesignServices,
  getContractorServices,
} from "@/app/site/the-nyc-interior-designer/_lib/siteData";

/* ─── Pro Tip Component ─── */

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-6 rounded-xl border-2 border-dashed border-blue-300 bg-blue-50/60 px-5 py-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 shrink-0 text-lg">&#9998;</span>
        <div className="text-sm leading-relaxed text-blue-900">
          <span className="font-bold uppercase tracking-wider text-blue-700 text-xs">Design Tip</span>
          <p className="mt-1">{children}</p>
        </div>
      </div>
    </div>
  );
}

/* ─── Featured Areas (boroughs) ─── */

const featuredBoroughs = [
  "manhattan", "brooklyn", "queens", "bronx", "staten-island",
  "long-island", "westchester", "new-jersey",
];

/* ─── Testimonials ─── */

const reviews = [
  { name: "Rachel M.", location: "Upper West Side, Manhattan", rating: 5, text: "They completely transformed our pre-war apartment. The kitchen redesign maximized every inch, and the living room feels twice as large with their space planning. They handled the co-op board approval seamlessly. Best investment we've made in this apartment.", service: "Full-Home Design" },
  { name: "David K.", location: "Hudson Yards, Manhattan", rating: 5, text: "We hired them to design our new condo from scratch. They handled everything — furniture selection, custom closets, lighting design, window treatments. The result is stunning and every piece was delivered and installed without a single issue. Incredible attention to detail.", service: "New Construction Design" },
  { name: "Angela T.", location: "Tribeca, Manhattan", rating: 5, text: "They staged our loft for sale and it went under contract in 5 days at above asking. The staging completely transformed how buyers perceived the space. They handled the furniture rental, styling, and even coordinated with our photographer. Worth every penny.", service: "Home Staging" },
  { name: "Marcus & Sarah J.", location: "Park Slope, Brooklyn", rating: 5, text: "Had them redesign our entire brownstone — all four floors. New kitchen, three bathrooms, custom built-ins in every room, and a stunning parlor floor living space. They managed the contractors, the DOB permits, and the co-op board. The result exceeded our expectations.", service: "Brownstone Renovation" },
  { name: "Linda P.", location: "Great Neck, Long Island", rating: 5, text: "They designed our kitchen and master bathroom and the transformation is unbelievable. The custom cabinetry, the tile work, the lighting — every detail was thoughtfully considered. They stayed on budget and finished on time. We're already planning phase two.", service: "Kitchen & Bath Design" },
  { name: "James W.", location: "Scarsdale, Westchester", rating: 5, text: "After living with builder-grade finishes for years, we hired them for a complete home refresh. New color palette, custom window treatments, curated furniture, and a home office that actually makes me productive. Our house finally feels like us.", service: "Full-Home Refresh" },
];

/* ─── Home FAQ Data ─── */

const homeFAQs = [
  { question: "What interior design services do you offer in NYC?", answer: "We offer comprehensive interior design services including full-home design, kitchen design, bathroom design, space planning, color consultation, furniture selection, lighting design, renovation management, staging, custom closets, and more. We serve all five boroughs, Long Island, Westchester, and New Jersey." },
  { question: "Do you work in all five boroughs?", answer: "Yes. We provide full-service interior design across Manhattan, Brooklyn, Queens, the Bronx, and Staten Island, as well as Long Island, Westchester County, and New Jersey. Each area has unique design challenges and we tailor our approach accordingly." },
  { question: "How much does interior design cost in NYC?", answer: "Interior design costs in NYC vary based on project scope, property size, and material selections. A single-room design starts around $2,500, while a full-home design ranges from $15,000 to $50,000+. Kitchen and bathroom renovations typically range from $25,000 to $100,000+. Contact us for a free consultation tailored to your project." },
  { question: "Do you offer free consultations?", answer: "Yes. We provide free initial consultations for all interior design projects in our service area. One of our design professionals will visit your property, discuss your vision, and provide a detailed proposal with no obligation." },
  { question: "What is the best time to start an interior design project in NYC?", answer: "Any time is a good time to start planning. However, spring and fall are popular for renovations due to milder weather for deliveries and construction. Winter is ideal for planning and design work so you're ready to begin construction in spring. Lead times for custom furniture and materials can be 8-16 weeks, so starting early is always smart." },
  { question: "Do you handle NYC permits and co-op board approvals?", answer: "Many interior renovation projects in NYC require permits from the Department of Buildings (DOB), especially those involving plumbing, electrical, or structural changes. We handle all permit applications and coordinate with co-op and condo boards on alteration agreements on your behalf." },
];

export default function HomeClient() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [visibleReviews, setVisibleReviews] = useState(4);

  const boroughs = getAllBoroughs();

  return (
    <>
      {/* ═══════════════════════════════════════════════════════════
          HERO
      ═══════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-gray-700 pt-36 pb-20 sm:pt-44 sm:pb-28">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-blue-500/20 blur-3xl animate-blob" />
        <div className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-blue-500/20 blur-3xl animate-blob animation-delay-2000" />

        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 text-sm font-semibold uppercase tracking-widest text-blue-200 font-cta"
          >
            NYC&apos;s Premier Interior Design Studio &bull; All 5 Boroughs &bull; Long Island &bull; Westchester &bull; NJ
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl font-heading"
          >
            Premium <span className="text-blue-200">NYC Interior Design</span> for Every Space
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mx-auto mt-6 max-w-3xl text-lg leading-relaxed text-white/80"
          >
            From <Link href="/services/kitchen-design" className="text-blue-200 underline underline-offset-2 hover:text-white">Manhattan kitchen renovations</Link> to <Link href="/services/full-home-interior-design" className="text-blue-200 underline underline-offset-2 hover:text-white">Brooklyn brownstone transformations</Link>, we design, build, and style stunning interiors across New York City. Our team of interior designers and renovation specialists delivers <Link href="/services" className="text-blue-200 underline underline-offset-2 hover:text-white">{services.length} professional services</Link> — including <Link href="/services/space-planning" className="text-blue-200 underline underline-offset-2 hover:text-white">space planning</Link>, <Link href="/services/lighting-design" className="text-blue-200 underline underline-offset-2 hover:text-white">lighting design</Link>, <Link href="/services/furniture-selection" className="text-blue-200 underline underline-offset-2 hover:text-white">furniture selection</Link>, and <Link href="/services/renovation-management" className="text-blue-200 underline underline-offset-2 hover:text-white">renovation management</Link>.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
          >
            <Link href="/get-a-free-consultation">
              <motion.span whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }} className="inline-block rounded-lg bg-white px-8 py-3.5 text-base font-semibold text-blue-700 shadow-lg transition-colors hover:bg-blue-50 font-cta">
                Book Now — $20 Off
              </motion.span>
            </Link>
            <a href={SMS_HREF}>
              <motion.span whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }} className="inline-block rounded-lg border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:border-white/60 font-cta">
                Text Us
              </motion.span>
            </a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-12 flex flex-wrap items-center justify-center gap-6 text-sm text-white/50"
          >
            <span>&#9733;&#9733;&#9733;&#9733;&#9733; 4.9/5 from 187 clients</span>
            <span>&bull;</span>
            <span>Serving NYC since 2012</span>
            <span>&bull;</span>
            <span>Licensed &amp; Insured</span>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          WHO WE ARE
      ═══════════════════════════════════════════════════════════ */}
      <section className="bg-slate-50 border-b border-slate-200 py-14">
        <div className="mx-auto max-w-4xl px-6">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600 font-cta">Who We Are</p>
            <h2 className="mt-3 text-2xl font-bold text-slate-900 sm:text-3xl font-heading">
              NYC&apos;s Most Trusted <span className="text-blue-400">Interior Design Team</span>
            </h2>
            <p className="mx-auto mt-5 max-w-3xl text-base leading-relaxed text-slate-600">
              {SITE_NAME} was founded by a team of interior designers, architects, and renovation specialists who have collectively spent <strong>over 40 years</strong> transforming residential and commercial spaces across the five boroughs, Long Island, Westchester, and New Jersey. We&apos;ve designed everything from intimate studio apartments on the Upper East Side to sprawling Westchester estates, commercial office buildouts, and award-winning restaurant interiors in SoHo.
            </p>
            <p className="mx-auto mt-4 max-w-3xl text-base leading-relaxed text-slate-600">
              This isn&apos;t a weekend decorator with a Pinterest board. We employ full-time interior designers, certified kitchen and bath specialists, licensed renovation managers, and dedicated procurement coordinators who understand the unique challenges of design in New York City — co-op board politics, building delivery restrictions, freight elevator scheduling, narrow staircases, and the relentless demand for storage in spaces that never have enough of it.
            </p>
          </motion.div>

          <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { value: "40+", label: "Combined Years of Experience" },
              { value: "2,500+", label: "Projects Completed" },
              { value: "187", label: "5-Star Reviews" },
              { value: "8", label: "Service Regions" },
            ].map((stat) => (
              <div key={stat.label} className="rounded-xl border border-slate-200 bg-white p-4 text-center">
                <p className="text-2xl font-bold text-blue-600 font-heading">{stat.value}</p>
                <p className="mt-1 text-xs text-slate-500">{stat.label}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 text-center">
            <Link href="/contact" className="text-sm font-semibold text-blue-600 hover:text-blue-800 font-cta">
              Get a Free Consultation &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          WHY NYC INTERIOR DESIGN IS DIFFERENT — DEEP EXPLAINER
      ═══════════════════════════════════════════════════════════ */}
      <section className="bg-section-white py-20">
        <div className="mx-auto max-w-4xl px-6">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl font-heading">
              Why <span className="text-blue-400">NYC Interior Design</span> Demands a Specialist
            </h2>
          </motion.div>

          <div className="mt-8 space-y-5 text-base leading-relaxed text-slate-600">
            <p>
              <strong>Interior design in New York City</strong> is fundamentally different from interior design anywhere else in the country. The challenges are unique — small footprints, impossible layouts, co-op and condo board approval processes, strict building codes, freight elevator scheduling, narrow doorways and staircases, and a cost-of-living that demands every square foot work harder than anywhere else. A designer who works in the suburbs simply isn&apos;t equipped for the complexity of a <Link href="/services/kitchen-design" className="text-blue-600 underline underline-offset-2 hover:text-blue-800">Manhattan galley kitchen renovation</Link> or a <Link href="/services/full-home-interior-design" className="text-blue-600 underline underline-offset-2 hover:text-blue-800">Brooklyn brownstone full-floor redesign</Link>.
            </p>
            <p>
              That&apos;s where we come in. Our team works exclusively in the New York City metro area — we know the floor plan quirks of every building era, the delivery restrictions in every major residential building, which co-op boards are strict and which are flexible, and exactly how to maximize a 400-square-foot studio so it lives like a one-bedroom. We know which <Link href="/areas" className="text-blue-600 underline underline-offset-2 hover:text-blue-800">neighborhoods</Link> have pre-war charm that needs preserving, which have new-construction condos with blank-canvas potential, and which have loft conversions where industrial character meets modern living.
            </p>
            <p>
              We also understand the logistics that make NYC projects uniquely challenging. Getting a custom 10-foot sofa through a building lobby and into a freight elevator on a Tuesday between 9 and 11 AM? We&apos;ve done it hundreds of times. Coordinating five different trades in a 900-square-foot apartment renovation? Standard procedure. Managing a co-op alteration agreement that requires board approval, neighbor notification, and a licensed engineer&apos;s sign-off? It&apos;s built into every project plan we create.
            </p>

            <Tip>The biggest mistake NYC homeowners make is hiring a decorator who doesn&apos;t understand building logistics. A beautiful design means nothing if the furniture can&apos;t get through the door, the co-op board rejects the renovation plan, or the contractor doesn&apos;t know how to work within building hours. Always hire a team with NYC-specific experience.</Tip>

            <h3 className="text-2xl font-bold text-slate-900 font-heading pt-4">Our Approach to Every Project</h3>
            <p>
              Every project begins with a thorough space analysis. We evaluate natural light at different times of day, existing architectural details worth preserving, structural possibilities for layout changes, storage potential, and the client&apos;s actual daily routines. We then present a detailed <Link href="/services/space-planning" className="text-blue-600 underline underline-offset-2 hover:text-blue-800">space plan</Link> with 3D renderings, material selections tailored to your aesthetic and budget, a <Link href="/services/furniture-selection" className="text-blue-600 underline underline-offset-2 hover:text-blue-800">furniture plan</Link> with pieces scaled to your exact dimensions, and a <Link href="/services/lighting-design" className="text-blue-600 underline underline-offset-2 hover:text-blue-800">lighting plan</Link> that transforms the mood of every room.
            </p>
            <p>
              We believe in designing for real life, not magazine photos. Your home should work for how you actually live — morning coffee routines, work-from-home days, dinner parties, kids&apos; homework time, weekend relaxation. That&apos;s the difference between a decorator who picks pretty things and a design professional who creates a home that functions beautifully every single day.
            </p>

            <Tip>Ask your designer about &quot;lifestyle mapping.&quot; If they don&apos;t ask how you spend a typical Tuesday versus a Saturday, they&apos;re designing for aesthetics alone. A well-designed NYC interior should look beautiful and work perfectly for your specific daily routines.</Tip>

            <h3 className="text-2xl font-bold text-slate-900 font-heading pt-4">What Types of Properties Do We Design?</h3>
            <p>
              We handle every type of interior space in the NYC metro area:
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 mt-4">
              {[
                { label: "Pre-War Apartments", href: "/services/full-home-interior-design" },
                { label: "New Construction Condos", href: "/services/full-home-interior-design" },
                { label: "Brownstone & Townhouse Renovations", href: "/services/renovation-management" },
                { label: "Loft Conversions", href: "/services/space-planning" },
                { label: "Co-op & Condo Units", href: "/services/full-home-interior-design" },
                { label: "Commercial Offices & Retail", href: "/services/commercial-interior-design" },
                { label: "Suburban Homes (LI, Westchester & NJ)", href: "/services/full-home-interior-design" },
                { label: "Restaurant & Hospitality Spaces", href: "/services/commercial-interior-design" },
              ].map((item) => (
                <Link key={item.label} href={item.href} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition-all hover:border-blue-300 hover:text-blue-600">
                  <span className="text-blue-500">&rarr;</span> {item.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          QUICK STATS BAR
      ═══════════════════════════════════════════════════════════ */}
      <section className="bg-blue-600 py-10">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            {[
              { value: `${services.length}`, label: "Services Offered" },
              { value: `${areas.length}+`, label: "Neighborhoods Served" },
              { value: "4.9/5", label: "Client Rating" },
              { value: "2,500+", label: "Projects Completed" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-3xl font-bold text-white font-heading">{stat.value}</p>
                <p className="mt-1 text-sm text-blue-100">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          DESIGN SERVICES
      ═══════════════════════════════════════════════════════════ */}
      <section className="bg-section-alt py-20">
        <div className="mx-auto max-w-6xl px-6">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center">
            <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl font-heading">
              <span className="text-blue-400">Professional Interior Design Services</span> for NYC
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-500">
              From <Link href="/services/full-home-interior-design" className="text-blue-600 underline underline-offset-2 hover:text-blue-800">full-home design</Link> to <Link href="/services/staging-styling" className="text-blue-600 underline underline-offset-2 hover:text-blue-800">real estate staging</Link>, we cover every interior design need for residential and commercial properties across NYC.
            </p>
          </motion.div>

          <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {getDesignServices().map((service, i) => (
              <motion.div key={service.slug} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.03 }}>
                <Link href={getServiceUrl(service)}>
                  <div className="group h-full rounded-xl border border-blue-200/60 bg-white p-6 transition-all hover:border-blue-400 hover:shadow-lg">
                    <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 font-heading">{service.name}</h3>
                    <p className="mt-1 text-xs font-medium text-blue-600 font-cta">{service.tagline}</p>
                    <p className="mt-3 text-sm leading-relaxed text-slate-500">{service.shortDesc}</p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>

          <div className="mx-auto mt-10 max-w-2xl">
            <Tip>Not sure which service you need? Start with a free consultation. We&apos;ll visit your property, discuss your goals and budget, and recommend the right combination of services — whether that&apos;s a full design-build renovation or just a color consultation and furniture refresh.</Tip>
          </div>

          <div className="mt-6 text-center">
            <Link href="/services" className="text-sm font-semibold text-blue-600 hover:text-blue-800 font-cta">View All Design Services &rarr;</Link>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          DESIGN + CONSTRUCTION TIP
      ═══════════════════════════════════════════════════════════ */}
      <section className="bg-section-white py-8">
        <div className="mx-auto max-w-4xl px-6">
          <Tip>The advantage of working with The NYC Interior Designer is that we handle both the design vision and the construction execution under one roof. When your designer and your contractor are on the same team, there are no miscommunications, no finger-pointing, and no gaps between what was designed and what gets built. That&apos;s how we deliver projects on time, on budget, and exactly as envisioned.</Tip>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          CONSTRUCTION & CONTRACTOR SERVICES
      ═══════════════════════════════════════════════════════════ */}
      <section className="bg-section-alt py-20">
        <div className="mx-auto max-w-6xl px-6">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center">
            <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl font-heading">
              <span className="text-blue-400">Construction &amp; Contractor Services</span> for NYC
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-500">
              From <Link href="/services/kitchen-renovation" className="text-blue-600 underline underline-offset-2 hover:text-blue-800">kitchen renovations</Link> to <Link href="/services/electrical-services" className="text-blue-600 underline underline-offset-2 hover:text-blue-800">electrical work</Link>, our licensed contractors handle every phase of construction across all five boroughs.
            </p>
          </motion.div>

          <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {getContractorServices().map((service, i) => (
              <motion.div key={service.slug} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.03 }}>
                <Link href={getServiceUrl(service)}>
                  <div className="group h-full rounded-xl border border-blue-200/60 bg-white p-6 transition-all hover:border-blue-400 hover:shadow-lg">
                    <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 font-heading">{service.name}</h3>
                    <p className="mt-1 text-xs font-medium text-blue-600 font-cta">{service.tagline}</p>
                    <p className="mt-3 text-sm leading-relaxed text-slate-500">{service.shortDesc}</p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>

          <div className="mt-6 text-center">
            <Link href="/services" className="text-sm font-semibold text-blue-600 hover:text-blue-800 font-cta">View All Construction Services &rarr;</Link>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          WHY CHOOSE US
      ═══════════════════════════════════════════════════════════ */}
      <section className="bg-section-white py-20">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl font-heading">
            Why NYC Homeowners <span className="text-blue-400">Choose Us</span>
          </h2>
          <p className="mt-4 text-base text-slate-600">
            There are hundreds of interior designers in the New York City area. Here&apos;s what sets us apart and why our clients recommend us to their friends.
          </p>

          <Tip>The cheapest designer is rarely the best value. In NYC, a poorly planned kitchen renovation can cost $20,000 to redo, the wrong sofa won&apos;t fit through your door, and a missed co-op board requirement can delay your project by months. Hire for expertise, not just price.</Tip>

          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2">
            {[
              { title: "NYC-Exclusive Focus", desc: "We work only in the New York City metro area. This means we understand building codes, DOB permit requirements, co-op and condo board processes, delivery logistics, and the unique challenges of designing for compact urban spaces. We're not a suburban firm dabbling in the city — this is all we do." },
              { title: "Licensed, Insured & Certified", desc: "Fully licensed and insured with $2M in general liability coverage. Our team includes certified interior designers, NKBA-certified kitchen and bath specialists, and licensed renovation managers. We carry all required NYC business licenses and meet every building's insurance requirements." },
              { title: "Design-Build Under One Roof", desc: "Unlike designers who hand off to contractors, we manage everything in-house — from the initial concept and 3D renderings to contractor coordination, procurement, delivery, and final styling. One team, one point of contact, one guarantee." },
              { title: "Trade Access & Buying Power", desc: "Our trade accounts give you access to showrooms, fabric houses, and manufacturers that aren't open to the public — often at 30-40% below retail. We source from hundreds of vendors and custom fabricators, ensuring every piece is right for your space and budget." },
              { title: "Transparent Pricing", desc: "We provide detailed proposals with clear pricing before any work begins. No hidden markups, no surprise fees, no verbal-only agreements. You know exactly what you're paying for and what to expect at every phase of the project." },
              { title: "Co-op & Condo Specialists", desc: "NYC building renovations require insurance certificates, alteration agreements, board approvals, and building management coordination that most designers don't handle. We've navigated hundreds of co-op and condo boards — it's one of our core competencies." },
            ].map((req) => (
              <div key={req.title} className="rounded-xl border border-slate-200 bg-white p-6">
                <h3 className="text-base font-bold text-slate-900 font-heading">{req.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">{req.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          HOW IT WORKS (6 steps)
      ═══════════════════════════════════════════════════════════ */}
      <section className="bg-section-light py-20">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl font-heading">
            How It Works — <span className="text-blue-400">Step by Step</span>
          </h2>
          <p className="mt-4 text-base text-slate-600">
            From your first call to the final reveal, here&apos;s exactly how our process works. Most residential projects complete in 8-16 weeks.
          </p>

          <div className="mt-12 space-y-8">
            {[
              { step: "01", title: "Book a Free Consultation", desc: "Book online in under a minute — or text us. We'll schedule a free in-home consultation within 48 hours and take $20 off your project. There's no obligation and no pressure — just a professional assessment of your space and your options.", links: [{ label: "Book — $20 Off", href: "/get-a-free-consultation" }, { label: "Text Us", href: SMS_HREF }] },
              { step: "02", title: "Space Assessment & Discovery", desc: "Our designer visits your property to evaluate the layout, natural light, architectural details, storage potential, and any building-specific requirements. We discuss your vision, lifestyle, budget, and timeline. This is where great design begins.", links: [{ label: "Our Design Process", href: "/services/space-planning" }] },
              { step: "03", title: "Design Concept Presentation", desc: "We present mood boards, space plans, material palettes, furniture selections, and 3D renderings. Every element is chosen for your specific space, lifestyle, and aesthetic. We revise until you love it — most clients are thrilled after one round.", links: [{ label: "Design Services", href: "/services/full-home-interior-design" }] },
              { step: "04", title: "Board Approval & Permit Coordination", desc: "If your project requires co-op or condo board approval, DOB permits, or building management sign-off, we handle the entire process. We prepare all documentation, coordinate with building architects, and ensure full compliance before any work begins.", links: [] },
              { step: "05", title: "Procurement & Installation", desc: "We order all furniture, materials, and finishes — coordinating delivery windows with your building, scheduling contractors, and managing every installation detail. Custom pieces are fabricated, trades are sequenced, and quality is monitored at every step.", links: [{ label: "All Services", href: "/services" }] },
              { step: "06", title: "Final Styling & Reveal", desc: "We style every surface — hanging art, arranging accessories, placing pillows, setting the dining table. Then we walk you through your transformed space, explain care instructions for materials, and hand you the keys to your new interior. This is the best day.", links: [{ label: "Art Curation", href: "/services/art-curation" }] },
            ].map((item) => (
              <motion.div key={item.step} initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="flex gap-5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-sm font-bold text-white font-mono">
                  {item.step}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 font-heading">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-500">{item.desc}</p>
                  {item.links.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {item.links.map((link) => (
                        <Link key={link.href} href={link.href} className="text-xs font-semibold text-blue-600 hover:text-blue-800 font-cta">{link.label} &rarr;</Link>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Process tip */}
      <section className="bg-section-white py-8">
        <div className="mx-auto max-w-4xl px-6">
          <Tip>The best time to start planning your design project is 8-12 weeks before you want to move in or complete the renovation. Custom furniture lead times can be 10-16 weeks, and co-op board approvals typically take 4-8 weeks. Starting the design process early gives you the best selection and scheduling options.</Tip>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          SEASONAL CONSIDERATIONS
      ═══════════════════════════════════════════════════════════ */}
      <section className="bg-section-white py-20">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl font-heading">
            Year-Round <span className="text-blue-400">Design Considerations</span> for NYC Interiors
          </h2>
          <p className="mt-4 text-base text-slate-600">
            New York City&apos;s four distinct seasons affect everything from renovation scheduling to material selection. Here&apos;s how we plan projects around the calendar.
          </p>

          <div className="mt-10 overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-slate-50">
                  <th className="px-5 py-3.5 font-semibold text-slate-900 font-heading">Season</th>
                  <th className="px-5 py-3.5 font-semibold text-slate-900 font-heading">Best For</th>
                  <th className="px-5 py-3.5 font-semibold text-slate-900 font-heading">Why It Matters</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { season: "Spring (Mar-May)", services: "Kitchen & bath renovations, full-home projects", why: "Milder weather for construction debris removal, easier deliveries, contractors at full capacity" },
                  { season: "Summer (Jun-Aug)", services: "Painting, flooring, smaller refreshes", why: "Open windows for ventilation during paint/finish work, some contractors offer summer pricing" },
                  { season: "Fall (Sep-Nov)", services: "Design planning, furniture orders, staging", why: "Fall orders arrive before holidays, ideal time to plan spring renovations and lock in pricing" },
                  { season: "Winter (Dec-Feb)", services: "Design consultations, board approvals, planning", why: "Quieter season means faster board approvals, better contractor availability for spring starts" },
                ].map((row, i) => (
                  <tr key={row.season} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                    <td className="px-5 py-3.5 font-semibold text-slate-900">{row.season}</td>
                    <td className="px-5 py-3.5 text-slate-600">{row.services}</td>
                    <td className="px-5 py-3.5 text-slate-600">{row.why}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Tip>NYC building renovation rules often restrict construction to weekdays 8 AM - 5 PM, with no work on weekends or holidays. Some luxury buildings have even stricter hours. We factor building schedules into every project timeline so there are no surprises.</Tip>

          <p className="mt-6 text-sm text-slate-500">
            <strong>Planning ahead saves money:</strong> Ordering custom furniture 12-16 weeks in advance avoids rush fees. Submitting co-op board applications in winter means faster approvals. Booking contractors in fall for spring starts gets you priority scheduling. View our <Link href="/services/renovation-management" className="text-blue-600 underline underline-offset-2 hover:text-blue-800">renovation management services</Link> or <Link href="/contact" className="text-blue-600 underline underline-offset-2 hover:text-blue-800">contact us</Link> for a project timeline consultation.
          </p>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          CLIENT TESTIMONIALS
      ═══════════════════════════════════════════════════════════ */}
      <section className="bg-section-alt py-20">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 sm:text-4xl font-heading">
            What Our Clients Are <span className="text-blue-400">Saying</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-lg text-slate-500">
            Real results from property owners across NYC who trusted us with their interiors.
          </p>

          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2">
            {reviews.slice(0, visibleReviews).map((review, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }} className="rounded-xl border border-blue-200/60 bg-white p-6">
                <div className="flex items-center gap-1 text-yellow-500">
                  {Array.from({ length: review.rating }).map((_, j) => (
                    <span key={j}>&#9733;</span>
                  ))}
                </div>
                <p className="mt-3 text-sm leading-relaxed text-slate-600 italic">&ldquo;{review.text}&rdquo;</p>
                <div className="mt-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-slate-900">{review.name}</p>
                    <p className="text-xs text-slate-500">{review.location}</p>
                  </div>
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">{review.service}</span>
                </div>
              </motion.div>
            ))}
          </div>

          {visibleReviews < reviews.length && (
            <div className="mt-8 text-center">
              <button onClick={() => setVisibleReviews(reviews.length)} className="text-sm font-semibold text-blue-600 hover:text-blue-800 font-cta">
                Show All Reviews &darr;
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Review tip */}
      <section className="bg-section-white py-8">
        <div className="mx-auto max-w-4xl px-6">
          <Tip>Want to see examples of our work in your specific neighborhood or building type? Ask us during your free consultation. We have before-and-after photos from projects across all five boroughs and can show you exactly what we&apos;ve done in properties similar to yours.</Tip>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          10 INTERIOR DESIGN TIPS
      ═══════════════════════════════════════════════════════════ */}
      <section className="bg-section-white py-20">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl font-heading">
            10 Expert <span className="text-blue-400">NYC Interior Design Tips</span>
          </h2>
          <p className="mt-4 text-base text-slate-600">
            Insider advice from our interior designers and renovation specialists. These tips apply specifically to the New York City metro area.
          </p>

          <div className="mt-10 space-y-6">
            {[
              { num: "1", title: "Measure everything — including doorways and elevators", tip: "The #1 mistake NYC homeowners make is buying furniture that doesn't fit through the door, the elevator, or the stairwell. Before ordering anything, measure every passage from the delivery truck to its final position. We've seen $8,000 sofas returned because they couldn't make the turn at the landing." },
              { num: "2", title: "Maximize vertical space in every room", tip: "In NYC, square footage is expensive but vertical space is free. Floor-to-ceiling bookshelves, tall cabinets, wall-mounted storage, and high curtain rods that make windows feel taller — thinking vertically can transform a cramped room into one that feels spacious and functional." },
              { num: "3", title: "Invest in lighting before furniture", tip: "NYC apartments are notoriously dark, especially lower floors and north-facing units. Before buying a single piece of furniture, address your lighting — layered ambient, task, and accent lighting transforms the mood and perceived size of every room more than any furniture upgrade." },
              { num: "4", title: "Choose a cohesive color palette for flow", tip: "In small NYC apartments, every room is visible from every other room. A cohesive color palette that flows from room to room makes the entire space feel larger and more intentional. Pick 3-5 colors and use them throughout — varying the proportions by room for variety." },
              { num: "5", title: "Scale furniture to your actual room size", tip: "A sectional designed for a suburban family room will overwhelm a NYC living room. Always choose furniture scaled to your space — apartment-sized sofas, round dining tables instead of rectangular, and armless chairs that take up less visual weight. Proper scale is the biggest design secret." },
              { num: "6", title: "Design for dual-purpose rooms", tip: "In NYC, your living room is also your office, your bedroom might double as a guest room, and your dining area might be your workspace. Design every room with its secondary function in mind — convertible furniture, smart storage, and flexible layouts make small spaces work harder." },
              { num: "7", title: "Don't skip window treatments", tip: "NYC apartments face other buildings, streets, and variable light conditions. Quality window treatments provide privacy, light control, and insulation — plus they add softness and height to any room. Ceiling-mounted curtain tracks with floor-length panels make windows feel twice as tall." },
              { num: "8", title: "Budget 20% contingency for renovations", tip: "NYC renovations always reveal surprises — old plumbing behind walls, asbestos in pre-war buildings, structural issues hidden by previous renovations. A 20% contingency budget prevents mid-project panic and lets you make smart decisions instead of cutting corners when surprises appear." },
              { num: "9", title: "Start with the kitchen — it has the highest ROI", tip: "If you can only renovate one room, make it the kitchen. In NYC real estate, a modern kitchen with quality finishes returns 75-100% of its cost at resale and makes daily living dramatically better. Even a cosmetic kitchen refresh — new cabinet fronts, countertops, and hardware — makes an outsized impact." },
              { num: "10", title: "Hire a designer before hiring a contractor", tip: "Too many NYC homeowners hire a contractor first and a designer second — or not at all. Starting with a designer means every construction dollar is spent intentionally, the layout is optimized before walls are opened, and materials are selected for both beauty and longevity. It saves money in the long run." },
            ].map((tip) => (
              <div key={tip.num} className="flex gap-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-sm font-bold text-blue-700 font-mono">
                  {tip.num}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 font-heading">{tip.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-slate-500">{tip.tip}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          SERVICE AREAS / BOROUGHS
      ═══════════════════════════════════════════════════════════ */}
      <section className="bg-section-alt py-20">
        <div className="mx-auto max-w-6xl px-6">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center">
            <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl font-heading">
              Interior Design Across <span className="text-blue-400">{areas.length}+ NYC Neighborhoods</span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-500">
              We serve all five boroughs, Long Island, Westchester, and New Jersey with neighborhood-specific design expertise tailored to local architecture and building types.
            </p>
          </motion.div>

          <div className="mt-14 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
            {boroughs.map((borough, i) => (
              <motion.div key={borough.slug} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.03 }}>
                <Link href={getBoroughUrl(borough.slug)}>
                  <div className="group rounded-lg border border-blue-200/60 bg-white p-4 text-center transition-all hover:border-blue-400 hover:shadow-md">
                    <p className="text-sm font-semibold text-slate-800 group-hover:text-blue-600 font-cta">{borough.name}</p>
                    <p className="text-xs text-slate-400">{borough.count} neighborhoods</p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>

          <div className="mt-10 text-center">
            <Link href="/areas">
              <motion.span whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }} className="inline-block rounded-lg bg-blue-600 px-8 py-3 text-sm font-semibold text-white transition-colors hover:bg-gray-700 font-cta">
                View All Service Areas
              </motion.span>
            </Link>
          </div>
        </div>
      </section>

      {/* Areas tip */}
      <section className="bg-section-white py-8">
        <div className="mx-auto max-w-4xl px-6">
          <Tip>Every NYC neighborhood has different design considerations. Manhattan pre-wars have ornate moldings worth preserving. Brooklyn brownstones have parlor floors begging for open layouts. Queens co-ops have compact kitchens that need creative solutions. Long Island and Westchester homes have completely different spatial proportions. We customize every project to the specific character of your neighborhood and building.</Tip>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          PROFESSIONAL VS DIY COMPARISON
      ═══════════════════════════════════════════════════════════ */}
      <section className="bg-section-white py-20">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl font-heading">
            Professional Interior Design vs. <span className="text-blue-400">DIY in NYC</span>
          </h2>
          <p className="mt-4 text-base text-slate-600">
            Thinking about designing it yourself? Here&apos;s an honest comparison to help you decide. Some projects are great for DIY — others genuinely need a professional.
          </p>

          <div className="mt-10 overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-slate-50">
                  <th className="px-5 py-3.5 font-semibold text-slate-900 font-heading">Factor</th>
                  <th className="px-5 py-3.5 font-semibold text-blue-700 font-heading">Professional</th>
                  <th className="px-5 py-3.5 font-semibold text-slate-700 font-heading">DIY</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { f: "Space Planning", d: "Optimized layouts with 3D renderings", c: "Trial and error with tape measures" },
                  { f: "Furniture Selection", d: "Trade-only showrooms at designer pricing", c: "Retail prices with no professional guidance" },
                  { f: "Renovation Management", d: "Licensed contractors, permits handled", c: "Finding contractors on apps, hoping for the best" },
                  { f: "Co-op/Condo Boards", d: "Alteration agreements prepared and managed", c: "Your responsibility — rejections cause months of delay" },
                  { f: "Timeline", d: "8-16 weeks with dedicated project management", c: "Months of weekends (often years for renovations)" },
                  { f: "Material Access", d: "Trade discounts, custom fabricators, vintage dealers", c: "Limited to retail stores and online" },
                  { f: "Long-Term Cost", d: "Higher upfront, fewer costly mistakes", c: "Lower upfront, expensive trial-and-error" },
                  { f: "Property Value Impact", d: "Cohesive, professional result that appraises well", c: "Varies — inconsistent choices can hurt resale" },
                ].map((row, i) => (
                  <tr key={row.f} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                    <td className="px-5 py-3 font-medium text-slate-900">{row.f}</td>
                    <td className="px-5 py-3 text-slate-600">{row.d}</td>
                    <td className="px-5 py-3 text-slate-600">{row.c}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Tip>Great DIY interior design projects in NYC: accent walls, shelf styling, throw pillow refreshes, small art walls, closet organization. Projects that need a pro: kitchen renovations, bathroom gut-renovations, space planning for open layouts, anything requiring permits, co-op board approvals, and whole-home cohesion.</Tip>

          <p className="mt-6 text-sm text-slate-500">
            <strong>The ROI argument:</strong> In NYC&apos;s competitive real estate market, professionally designed interiors sell faster and for more. A well-designed apartment photographs beautifully for listings, shows better in person, and signals to buyers that the property has been cared for. <Link href="/contact" className="text-blue-600 underline underline-offset-2 hover:text-blue-800">Contact us</Link> for a free consultation to discuss your property&apos;s potential.
          </p>
        </div>
      </section>

      {/* Pre-FAQ tip */}
      <section className="bg-section-alt py-8">
        <div className="mx-auto max-w-4xl px-6">
          <Tip>If a designer can&apos;t show you photos of completed NYC projects — specifically apartments, brownstones, and co-op renovations — they don&apos;t have the experience you need. Ask for references from properties similar to yours. We&apos;re happy to share our full portfolio.</Tip>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          FAQ
      ═══════════════════════════════════════════════════════════ */}
      <section className="bg-section-light py-20">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 sm:text-4xl font-heading">
            Frequently Asked <span className="text-blue-400">Questions</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-center text-lg text-slate-500">
            Answers to the most common NYC interior design questions. For more, visit our <Link href="/faq" className="text-blue-600 underline underline-offset-2 hover:text-blue-800">full FAQ page</Link>.
          </p>

          <div className="mt-12 space-y-3">
            {homeFAQs.map((faq, i) => (
              <div key={i} className="rounded-xl border border-slate-200 bg-white transition-colors hover:border-blue-300">
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="flex w-full items-center justify-between px-6 py-5 text-left">
                  <span className="pr-4 text-base font-semibold text-slate-800 font-heading">{faq.question}</span>
                  <svg className={`h-5 w-5 shrink-0 text-blue-500 transition-transform duration-200 ${openFaq === i ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <AnimatePresence>
                  {openFaq === i && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                      <p className="px-6 pb-5 text-sm leading-relaxed text-slate-500">{faq.answer}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          OUR OFFICE
      ═══════════════════════════════════════════════════════════ */}
      <section className="bg-section-white py-20">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 sm:text-4xl font-heading">
            Visit Our <span className="text-blue-400">NYC Studio</span>
          </h2>
          <div className="mt-12 flex justify-center">
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center max-w-md">
              <h3 className="text-xl font-bold text-slate-900 font-heading">{SITE_NAME}</h3>
              <p className="mt-3 text-sm text-slate-500">{ADDRESS}</p>
              <p className="mt-1 text-sm text-slate-500">New York, NY 10036</p>
              <div className="mt-4 flex flex-col items-center gap-2">
                <a href={SMS_HREF} className="text-sm font-semibold text-blue-600 hover:text-blue-800 font-cta">Text: {PHONE}</a>
                <a href={`mailto:${EMAIL}`} className="text-sm font-semibold text-blue-600 hover:text-blue-800 font-cta">{EMAIL}</a>
              </div>
              <div className="mt-6">
                <Link href="/contact" className="inline-block rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gray-700 font-cta">
                  Book a Free Consultation
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final tip */}
      <section className="bg-section-alt py-8">
        <div className="mx-auto max-w-4xl px-6">
          <Tip>The best interior in NYC is the one that works for your life. Don&apos;t overthink it — start with a free consultation, get a professional plan, and transform your space. Whether it&apos;s a 400-square-foot studio or a 4,000-square-foot brownstone, we make it happen.</Tip>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          FINAL CTA
      ═══════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-gray-700 py-20">
        <div className="absolute inset-0 grid-bg opacity-20" />
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-blue-500/15 blur-3xl animate-blob" />

        <div className="relative mx-auto max-w-3xl px-6 text-center">
          <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-3xl font-bold text-white sm:text-4xl font-heading">
            Transform Your NYC Interior Today
          </motion.h2>
          <motion.p initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }} className="mx-auto mt-4 max-w-xl text-lg text-white/80">
            Get a free consultation, explore our services, or call our team to discuss your design project. No obligation, no pressure — just expert advice.
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }} className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/get-a-free-consultation">
              <motion.span whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }} className="inline-block rounded-lg bg-white px-8 py-3.5 text-base font-semibold text-blue-700 shadow-lg transition-colors hover:bg-blue-50 font-cta">
                Book Now — $20 Off
              </motion.span>
            </Link>
            <a href={SMS_HREF}>
              <motion.span whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }} className="inline-block rounded-lg border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:border-white/60 font-cta">
                Text Us
              </motion.span>
            </a>
          </motion.div>
        </div>
      </section>
    </>
  );
}
