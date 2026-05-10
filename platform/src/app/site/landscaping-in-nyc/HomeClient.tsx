// @ts-nocheck
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  SITE_NAME,
  PHONE,
  PHONE_HREF,
  SMS_HREF,
  EMAIL,
  ADDRESS,
  services,
  areas,
  getAllBoroughs,
  getBoroughUrl,
  getAreaUrl,
  getServiceUrl,
} from "@/app/site/landscaping-in-nyc/_lib/siteData";

/* ─── Pro Tip Component ─── */

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-6 rounded-xl border-2 border-dashed border-green-300 bg-green-50/60 px-5 py-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 shrink-0 text-lg">&#127793;</span>
        <div className="text-sm leading-relaxed text-green-900">
          <span className="font-bold uppercase tracking-wider text-green-700 text-xs">Pro Tip</span>
          <p className="mt-1">{children}</p>
        </div>
      </div>
    </div>
  );
}

/* ─── Featured Areas (boroughs) ─── */

const featuredBoroughs = [
  "manhattan", "brooklyn", "queens", "bronx", "staten-island",
  "long-island", "westchester",
];

/* ─── Testimonials ─── */

const reviews = [
  { name: "Rachel M.", location: "Park Slope, Brooklyn", rating: 5, text: "They transformed our brownstone backyard into an absolute oasis. Beautiful bluestone patio, native plantings, and a drip irrigation system that keeps everything green with zero effort on our part. Best investment we've made in this house.", service: "Full Landscape Design" },
  { name: "David K.", location: "Midtown, Manhattan", rating: 5, text: "Our condo building hired them for a complete rooftop garden installation. They handled the structural assessment, DOB permits, waterproofing coordination — everything. The residents are thrilled and it's already increased our property values.", service: "Rooftop Garden" },
  { name: "Angela T.", location: "Astoria, Queens", rating: 5, text: "We use them for year-round maintenance on our commercial property. Spring cleanups, summer flower rotations, fall leaf removal, winter snow clearing. Completely reliable and the property always looks immaculate. Our tenants love it.", service: "Year-Round Maintenance" },
  { name: "Marcus & Sarah J.", location: "Riverdale, Bronx", rating: 5, text: "Had them redesign our entire front and backyard — new retaining walls, a flagstone patio with a built-in fire pit, and gorgeous perennial beds. The outdoor lighting they installed makes it magical at night. Neighbors keep stopping to compliment it.", service: "Hardscaping & Lighting" },
  { name: "Linda P.", location: "Great Neck, Long Island", rating: 5, text: "They installed a complete smart irrigation system across our property. The WiFi controller adjusts watering based on weather forecasts, and our water bill dropped 35%. The lawn has never looked better — even in August.", service: "Irrigation Systems" },
  { name: "James W.", location: "Scarsdale, Westchester", rating: 5, text: "After a brutal winter, we needed a full spring restoration — new sod, mulch beds, pruning, and seasonal color. Their crew knocked it out in three days and the property looked brand new. We signed up for their maintenance plan immediately.", service: "Spring Restoration" },
];

/* ─── Home FAQ Data ─── */

const homeFAQs = [
  { question: "What landscaping services do you offer in NYC?", answer: "We offer comprehensive landscaping services including landscape design, rooftop gardens, irrigation systems, outdoor lighting, lawn maintenance, hardscaping, snow removal, seasonal flower rotations, tree care, and more. We serve all five boroughs, Long Island, and Westchester." },
  { question: "Do you work in all five boroughs?", answer: "Yes. We provide full-service landscaping across Manhattan, Brooklyn, Queens, the Bronx, and Staten Island, as well as Long Island and Westchester County. Each area has unique landscaping needs and we tailor our approach accordingly." },
  { question: "How much does landscaping cost in NYC?", answer: "Landscaping costs in NYC vary based on project scope, property size, and materials. A basic garden cleanup might start around $500, while a full landscape design and installation for a brownstone backyard ranges from $5,000 to $25,000+. Rooftop gardens typically start at $10,000. Contact us for a free estimate tailored to your property." },
  { question: "Do you offer free estimates?", answer: "Yes. We provide free on-site estimates for all landscaping projects in our service area. One of our landscape professionals will visit your property, discuss your vision, and provide a detailed written estimate with no obligation." },
  { question: "What is the best time of year for landscaping in NYC?", answer: "Spring (March-May) and fall (September-November) are ideal for major landscaping work in NYC. However, we provide year-round services including winter snow removal, holiday lighting, and indoor plant care. Planning in winter allows us to begin installation as soon as the ground thaws." },
  { question: "Do you handle NYC permits for landscaping work?", answer: "Certain landscaping projects in NYC require permits from the Department of Buildings (DOB), especially rooftop installations, retaining walls, and significant grading work. We handle all permit applications and coordinate with building management and co-op/condo boards on your behalf." },
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
      <section className="relative overflow-hidden bg-green-700 pt-36 pb-20 sm:pt-44 sm:pb-28">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-green-500/20 blur-3xl animate-blob" />
        <div className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-emerald-500/20 blur-3xl animate-blob animation-delay-2000" />

        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 text-sm font-semibold uppercase tracking-widest text-green-200 font-cta"
          >
            NYC&apos;s Premier Landscaping Company &bull; All 5 Boroughs &bull; Long Island &bull; Westchester
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl font-heading"
          >
            Premium <span className="text-green-200">NYC Landscaping</span> for Every Outdoor Space
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mx-auto mt-6 max-w-3xl text-lg leading-relaxed text-white/80"
          >
            From <Link href="/services/rooftop-gardens" className="text-green-200 underline underline-offset-2 hover:text-white">Manhattan rooftop gardens</Link> to <Link href="/services/landscape-design" className="text-green-200 underline underline-offset-2 hover:text-white">Brooklyn brownstone backyards</Link>, we design, build, and maintain stunning outdoor environments across New York City. Our team of landscape architects and horticulture experts delivers <Link href="/services" className="text-green-200 underline underline-offset-2 hover:text-white">{services.length} professional services</Link> — including <Link href="/services/patio-hardscape-design" className="text-green-200 underline underline-offset-2 hover:text-white">hardscaping</Link>, <Link href="/services/irrigation-systems" className="text-green-200 underline underline-offset-2 hover:text-white">irrigation</Link>, <Link href="/services/landscape-lighting" className="text-green-200 underline underline-offset-2 hover:text-white">lighting</Link>, and <Link href="/services/snow-removal" className="text-green-200 underline underline-offset-2 hover:text-white">snow removal</Link>.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
          >
            <Link href="/estimate">
              <motion.span whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }} className="inline-block rounded-lg bg-white px-8 py-3.5 text-base font-semibold text-green-700 shadow-lg transition-colors hover:bg-green-50 font-cta">
                Free Estimate
              </motion.span>
            </Link>
            <Link href="/services">
              <motion.span whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }} className="inline-block rounded-lg border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:border-white/60 font-cta">
                Explore {services.length} Services
              </motion.span>
            </Link>
            <a href={SMS_HREF}>
              <motion.span whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }} className="inline-block rounded-lg border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:border-white/60 font-cta">
                {PHONE} | Text
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
            <p className="text-xs font-bold uppercase tracking-widest text-green-600 font-cta">Who We Are</p>
            <h2 className="mt-3 text-2xl font-bold text-slate-900 sm:text-3xl font-heading">
              NYC&apos;s Most Trusted <span className="text-green-400">Landscaping Team</span>
            </h2>
            <p className="mx-auto mt-5 max-w-3xl text-base leading-relaxed text-slate-600">
              {SITE_NAME} was founded by a team of landscape architects, horticulturists, and master gardeners who have collectively spent <strong>over 40 years</strong> transforming outdoor spaces across the five boroughs, Long Island, and Westchester. We&apos;ve designed and installed everything from intimate Chelsea courtyard gardens to sprawling Westchester estate landscapes, commercial plaza greenscapes, and award-winning rooftop installations atop Manhattan high-rises.
            </p>
            <p className="mx-auto mt-4 max-w-3xl text-base leading-relaxed text-slate-600">
              This isn&apos;t a side hustle run out of someone&apos;s truck. We employ full-time landscape designers, certified irrigation technicians, licensed arborists, and trained installation crews who understand the unique challenges of landscaping in New York City — limited access, building regulations, rooftop weight loads, urban microclimates, and the relentless cycle of freeze-thaw winters and humid summers. Every project we take on gets the same meticulous attention, whether it&apos;s a $2,000 seasonal planting or a $200,000 full property transformation.
            </p>
          </motion.div>

          <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { value: "40+", label: "Combined Years of Experience" },
              { value: "2,500+", label: "Projects Completed" },
              { value: "187", label: "5-Star Reviews" },
              { value: "7", label: "Service Regions" },
            ].map((stat) => (
              <div key={stat.label} className="rounded-xl border border-slate-200 bg-white p-4 text-center">
                <p className="text-2xl font-bold text-green-600 font-heading">{stat.value}</p>
                <p className="mt-1 text-xs text-slate-500">{stat.label}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 text-center">
            <Link href="/contact" className="text-sm font-semibold text-green-600 hover:text-green-800 font-cta">
              Get a Free Estimate &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          WHY NYC LANDSCAPING IS DIFFERENT — DEEP EXPLAINER
      ═══════════════════════════════════════════════════════════ */}
      <section className="bg-section-white py-20">
        <div className="mx-auto max-w-4xl px-6">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl font-heading">
              Why <span className="text-green-400">NYC Landscaping</span> Demands a Specialist
            </h2>
          </motion.div>

          <div className="mt-8 space-y-5 text-base leading-relaxed text-slate-600">
            <p>
              <strong>Landscaping in New York City</strong> is fundamentally different from landscaping anywhere else in the country. The challenges are unique — limited space, difficult access, strict building codes, co-op and condo board approvals, rooftop weight restrictions, and a climate that swings from brutally hot summers to freezing winters with salt-laden sidewalks. A landscaper who works in the suburbs simply isn&apos;t equipped for the complexity of a <Link href="/services/rooftop-gardens" className="text-green-600 underline underline-offset-2 hover:text-green-800">Manhattan rooftop garden</Link> or a <Link href="/services/landscape-design" className="text-green-600 underline underline-offset-2 hover:text-green-800">Brooklyn brownstone backyard renovation</Link>.
            </p>
            <p>
              That&apos;s where we come in. Our team works exclusively in the New York City metro area — we know the soil conditions in every borough, the sunlight patterns between buildings, the wind loads on rooftops at different heights, and exactly which plants thrive in which microclimates. We know which <Link href="/areas" className="text-green-600 underline underline-offset-2 hover:text-green-800">neighborhoods</Link> have sandy soil (looking at you, Rockaway), which have clay (much of the Bronx), and which have six inches of construction fill that needs to be replaced entirely.
            </p>
            <p>
              We also understand the logistics that make NYC projects uniquely challenging. Getting materials to a third-floor terrace in a walk-up? We&apos;ve done it hundreds of times. Coordinating crane lifts for rooftop planters? Standard procedure. Working around building management schedules, noise ordinances, and loading dock access windows? It&apos;s built into every project plan we create.
            </p>

            <Tip>The biggest mistake NYC property owners make is hiring a general contractor or suburban landscaper for urban outdoor work. A rooftop that isn&apos;t properly waterproofed or a planter that exceeds the structural load limit can cause catastrophic damage. Always hire a team with NYC-specific experience.</Tip>

            <h3 className="text-2xl font-bold text-slate-900 font-heading pt-4">Our Approach to Every Project</h3>
            <p>
              Every project begins with a thorough site analysis. We evaluate sunlight exposure throughout the day (urban shadows change dramatically by season), existing drainage patterns, soil composition, wind conditions, and structural capacity for rooftop and terrace work. We then present a detailed <Link href="/services/landscape-design" className="text-green-600 underline underline-offset-2 hover:text-green-800">design plan</Link> with 3D renderings, plant selections tailored to your specific microclimate, hardscape specifications, and an <Link href="/services/irrigation-systems" className="text-green-600 underline underline-offset-2 hover:text-green-800">irrigation plan</Link> that ensures everything stays healthy with minimal effort on your part.
            </p>
            <p>
              We believe in designing for all four seasons. Your outdoor space should look stunning in April when the dogwoods bloom, in July when the perennials peak, in October when the ornamental grasses turn gold, and even in January when the evergreen structure and <Link href="/services/landscape-lighting" className="text-green-600 underline underline-offset-2 hover:text-green-800">landscape lighting</Link> carry the show. That&apos;s the difference between a landscaper who plants flowers and a landscape professional who creates an outdoor living environment.
            </p>

            <Tip>Ask your landscaper about &quot;four-season interest.&quot; If they only talk about spring and summer plantings, they&apos;re leaving half the year on the table. A well-designed NYC landscape should look beautiful 365 days a year.</Tip>

            <h3 className="text-2xl font-bold text-slate-900 font-heading pt-4">What Types of Properties Do We Work On?</h3>
            <p>
              We handle every type of outdoor space in the NYC metro area:
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 mt-4">
              {[
                { label: "Brownstone Backyards", href: "/services/landscape-design" },
                { label: "Rooftop Gardens & Terraces", href: "/services/rooftop-gardens" },
                { label: "Commercial Properties", href: "/services/commercial-landscaping" },
                { label: "Townhouse Gardens", href: "/services/landscape-design" },
                { label: "Condo & Co-op Common Areas", href: "/services/lawn-garden-maintenance" },
                { label: "Restaurant Patios & Outdoor Dining", href: "/services/patio-hardscape-design" },
                { label: "Suburban Estates (LI & Westchester)", href: "/services/landscape-design" },
                { label: "Community Gardens & Parks", href: "/services/lawn-garden-maintenance" },
              ].map((item) => (
                <Link key={item.label} href={item.href} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition-all hover:border-green-300 hover:text-green-600">
                  <span className="text-green-500">&rarr;</span> {item.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          QUICK STATS BAR
      ═══════════════════════════════════════════════════════════ */}
      <section className="bg-green-600 py-10">
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
                <p className="mt-1 text-sm text-green-100">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          ALL SERVICES
      ═══════════════════════════════════════════════════════════ */}
      <section className="bg-section-green py-20">
        <div className="mx-auto max-w-6xl px-6">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center">
            <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl font-heading">
              <span className="text-green-400">{services.length} Professional Landscaping Services</span> for NYC
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-500">
              From <Link href="/services/landscape-design" className="text-green-600 underline underline-offset-2 hover:text-green-800">custom landscape design</Link> to <Link href="/services/snow-removal" className="text-green-600 underline underline-offset-2 hover:text-green-800">winter snow removal</Link>, we cover every outdoor need for residential and commercial properties across NYC.
            </p>
          </motion.div>

          <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service, i) => (
              <motion.div key={service.slug} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.03 }}>
                <Link href={getServiceUrl(service)}>
                  <div className="group h-full rounded-xl border border-green-200/60 bg-white p-6 transition-all hover:border-green-400 hover:shadow-lg">
                    <h3 className="text-base font-bold text-slate-900 group-hover:text-green-600 font-heading">{service.name}</h3>
                    <p className="mt-1 text-xs font-medium text-green-600 font-cta">{service.tagline}</p>
                    <p className="mt-3 text-sm leading-relaxed text-slate-500">{service.shortDesc}</p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>

          <div className="mx-auto mt-10 max-w-2xl">
            <Tip>Not sure which service you need? Start with a free consultation. We&apos;ll visit your property, discuss your goals and budget, and recommend the right combination of services — whether that&apos;s a full design-build project or just seasonal maintenance to keep things looking sharp.</Tip>
          </div>

          <div className="mt-6 text-center">
            <Link href="/services" className="text-sm font-semibold text-green-600 hover:text-green-800 font-cta">View All Services &rarr;</Link>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          WHY CHOOSE US
      ═══════════════════════════════════════════════════════════ */}
      <section className="bg-section-white py-20">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl font-heading">
            Why NYC Property Owners <span className="text-green-400">Choose Us</span>
          </h2>
          <p className="mt-4 text-base text-slate-600">
            There are hundreds of landscaping companies in the New York City area. Here&apos;s what sets us apart and why our clients stay with us year after year.
          </p>

          <Tip>The cheapest landscaper is rarely the best value. In NYC, poor drainage installation can flood a basement, an overloaded rooftop planter can cause structural damage, and invasive plant species can take over in one season. Hire for expertise, not just price.</Tip>

          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2">
            {[
              { title: "NYC-Exclusive Focus", desc: "We work only in the New York City metro area. This means we understand building codes, DOB permit requirements, co-op and condo board processes, and the unique logistics of urban landscaping. We're not a suburban company dabbling in the city — this is all we do." },
              { title: "Licensed, Insured & Certified", desc: "Fully licensed and insured with $2M in general liability coverage. Our team includes certified landscape designers, ISA-certified arborists, and EPA-certified irrigation technicians. We carry all required NYC business licenses and comply with Local Law 11 where applicable." },
              { title: "Design-Build Under One Roof", desc: "Unlike companies that outsource design or installation, we handle everything in-house — from the initial design concept and 3D renderings to hardscape construction, planting, irrigation, and lighting. One team, one point of contact, one guarantee." },
              { title: "Year-Round Service", desc: "NYC outdoor spaces need attention 12 months a year. We offer comprehensive maintenance plans that cover spring cleanups, summer plant care, fall prep, winter snow removal, and everything in between. Your landscape never goes untended." },
              { title: "Transparent Pricing", desc: "We provide detailed written estimates with line-item pricing before any work begins. No hidden fees, no surprise change orders, no verbal-only agreements. You know exactly what you're paying for and what to expect at every phase." },
              { title: "Rooftop & Terrace Specialists", desc: "Rooftop work requires structural knowledge, waterproofing expertise, and wind-load calculations that ground-level landscapers simply don't have. We've installed over 300 rooftop gardens across Manhattan, Brooklyn, and Queens — it's one of our core specialties." },
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
            How It Works — <span className="text-green-400">Step by Step</span>
          </h2>
          <p className="mt-4 text-base text-slate-600">
            From your first call to the finished landscape, here&apos;s exactly how our process works. Most residential projects complete in 1-4 weeks.
          </p>

          <div className="mt-12 space-y-8">
            {[
              { step: "01", title: "Request a Free Estimate", desc: "Call us, text us, or fill out our online form. We'll schedule a free on-site consultation at your property within 48 hours. There's no obligation and no pressure — just a professional assessment of your space and your options.", links: [{ label: "Get Free Estimate", href: "/estimate" }, { label: "Call Us", href: PHONE_HREF }] },
              { step: "02", title: "Site Assessment & Consultation", desc: "Our landscape designer visits your property to evaluate sunlight, soil, drainage, access, structural capacity (for rooftops), and any building-specific requirements. We discuss your vision, lifestyle, budget, and maintenance preferences. This is where great landscapes begin.", links: [{ label: "Our Design Process", href: "/services/landscape-design" }] },
              { step: "03", title: "Custom Design Presentation", desc: "We present a detailed design plan with 3D renderings, plant selections, hardscape specifications, irrigation layouts, and lighting plans. Every element is chosen for your property's specific conditions. We revise until you love it — most clients are thrilled after one round.", links: [{ label: "Design Services", href: "/services/landscape-design" }] },
              { step: "04", title: "Permit & Approval Coordination", desc: "If your project requires NYC DOB permits, co-op or condo board approval, or building management sign-off, we handle the entire process. We prepare all documentation, attend board meetings when needed, and ensure full compliance before breaking ground.", links: [] },
              { step: "05", title: "Professional Installation", desc: "Our trained crews execute the design with precision — grading, drainage, hardscape construction, soil preparation, planting, irrigation installation, and lighting. We protect existing surfaces, coordinate with building staff, and maintain a clean work site throughout the project.", links: [{ label: "All Services", href: "/services" }] },
              { step: "06", title: "Walkthrough & Maintenance Plan", desc: "We walk you through every element of your new landscape, explain care instructions, and set up your irrigation controller. Then we recommend a seasonal maintenance plan to keep everything looking perfect year-round. Your outdoor space is now the best room in your home.", links: [{ label: "Maintenance Plans", href: "/services/lawn-garden-maintenance" }] },
            ].map((item) => (
              <motion.div key={item.step} initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="flex gap-5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-green-600 text-sm font-bold text-white font-mono">
                  {item.step}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 font-heading">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-500">{item.desc}</p>
                  {item.links.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {item.links.map((link) => (
                        <Link key={link.href} href={link.href} className="text-xs font-semibold text-green-600 hover:text-green-800 font-cta">{link.label} &rarr;</Link>
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
          <Tip>The best time to start planning your landscape project is 4-6 weeks before you want work to begin. Spring is our busiest season — property owners who book in January and February get priority scheduling and often better pricing.</Tip>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          SEASONAL SERVICES OVERVIEW
      ═══════════════════════════════════════════════════════════ */}
      <section className="bg-section-white py-20">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl font-heading">
            Year-Round <span className="text-green-400">Seasonal Care</span> for NYC Landscapes
          </h2>
          <p className="mt-4 text-base text-slate-600">
            New York City&apos;s four distinct seasons each demand different care. Here&apos;s what your landscape needs throughout the year — and how we keep it thriving in every condition.
          </p>

          <div className="mt-10 overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-slate-50">
                  <th className="px-5 py-3.5 font-semibold text-slate-900 font-heading">Season</th>
                  <th className="px-5 py-3.5 font-semibold text-slate-900 font-heading">Key Services</th>
                  <th className="px-5 py-3.5 font-semibold text-slate-900 font-heading">Why It Matters</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { season: "Spring (Mar-May)", services: "Cleanup, mulching, planting, irrigation startup", why: "Remove winter damage, prep soil, plant annuals and perennials for peak season" },
                  { season: "Summer (Jun-Aug)", services: "Mowing, watering, pruning, flower rotations", why: "Maintain growth, manage heat stress, keep color vibrant through the hottest months" },
                  { season: "Fall (Sep-Nov)", services: "Leaf removal, aeration, overseeding, winterization", why: "Strengthen roots for winter, clean up debris, prepare irrigation for freeze" },
                  { season: "Winter (Dec-Feb)", services: "Snow removal, ice management, holiday lighting", why: "Keep paths safe, protect plants from salt damage, maintain curb appeal year-round" },
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

          <Tip>NYC salt damage is one of the biggest killers of urban plantings. If your property borders a sidewalk or street, ask about salt-tolerant plant species and protective burlap wrapping for winter. A $50 burlap job can save a $500 shrub.</Tip>

          <p className="mt-6 text-sm text-slate-500">
            <strong>Maintenance plans save money:</strong> Our annual maintenance contracts cost 15-20% less than booking individual seasonal services. You also get priority scheduling — critical during spring rush and winter storms. View our <Link href="/services/lawn-garden-maintenance" className="text-green-600 underline underline-offset-2 hover:text-green-800">maintenance plans</Link> or <Link href="/contact" className="text-green-600 underline underline-offset-2 hover:text-green-800">contact us</Link> for a custom quote.
          </p>
          <p className="mt-4 text-sm text-slate-500">
            <strong>Snow removal tip:</strong> NYC property owners are legally required to clear sidewalks within 4 hours of snowfall (or by 11 AM for overnight snow). Our <Link href="/services/snow-removal" className="text-green-600 underline underline-offset-2 hover:text-green-800">snow removal service</Link> ensures compliance — we monitor weather forecasts and dispatch crews proactively so you never get a violation.
          </p>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          CLIENT TESTIMONIALS
      ═══════════════════════════════════════════════════════════ */}
      <section className="bg-section-green py-20">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 sm:text-4xl font-heading">
            What Our Clients Are <span className="text-green-400">Saying</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-lg text-slate-500">
            Real results from property owners across NYC who trusted us with their outdoor spaces.
          </p>

          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2">
            {reviews.slice(0, visibleReviews).map((review, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }} className="rounded-xl border border-green-200/60 bg-white p-6">
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
                  <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">{review.service}</span>
                </div>
              </motion.div>
            ))}
          </div>

          {visibleReviews < reviews.length && (
            <div className="mt-8 text-center">
              <button onClick={() => setVisibleReviews(reviews.length)} className="text-sm font-semibold text-green-600 hover:text-green-800 font-cta">
                Show All Reviews &darr;
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Review tip */}
      <section className="bg-section-white py-8">
        <div className="mx-auto max-w-4xl px-6">
          <Tip>Want to see examples of our work in your specific neighborhood? Ask us during your free consultation. We have before-and-after photos from projects across all five boroughs and can show you exactly what we&apos;ve done on properties similar to yours.</Tip>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          10 LANDSCAPING TIPS
      ═══════════════════════════════════════════════════════════ */}
      <section className="bg-section-white py-20">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl font-heading">
            10 Expert <span className="text-green-400">NYC Landscaping Tips</span>
          </h2>
          <p className="mt-4 text-base text-slate-600">
            Insider advice from our landscape designers and horticulturists. These tips apply specifically to the New York City metro area.
          </p>

          <div className="mt-10 space-y-6">
            {[
              { num: "1", title: "Choose plants rated for USDA Zone 7a/7b", tip: "NYC sits in hardiness zones 7a and 7b. Plants rated for Zone 6 or lower will handle our winters easily. Avoid anything rated Zone 8+ unless it's in a sheltered, south-facing microclimate — it won't survive a typical February." },
              { num: "2", title: "Install drip irrigation, not spray", tip: "In NYC's tight spaces, spray irrigation wastes water on sidewalks, walls, and neighbors' property. Drip irrigation delivers water directly to root zones, uses 30-50% less water, and works perfectly in beds, planters, and rooftop containers." },
              { num: "3", title: "Go native whenever possible", tip: "Native plants like Black-Eyed Susans, Eastern Red Columbine, and Sweetspire are adapted to NYC's climate and require far less water, fertilizer, and pest control. They also support local pollinators — your garden becomes an ecosystem, not just decoration." },
              { num: "4", title: "Budget for drainage before aesthetics", tip: "NYC's clay-heavy soils and impervious surfaces create drainage nightmares. Before spending on beautiful plants and stonework, invest in proper grading, French drains, or dry wells. A flooded patio or waterlogged garden bed will destroy everything you plant." },
              { num: "5", title: "Use lightweight soil mixes on rooftops", tip: "Standard topsoil weighs 90-100 lbs per cubic foot when wet. Engineered lightweight mixes (perlite, vermiculite, peat) weigh 30-40 lbs. On a rooftop, this difference determines whether you can have a lush garden or just a few pots. Always get a structural assessment first." },
              { num: "6", title: "Plan for shade — most NYC spaces have it", tip: "Between buildings, fences, and trees, most NYC gardens get partial shade at best. Embrace it: hostas, ferns, astilbe, heuchera, and Japanese forest grass thrive in shade and look stunning. Fighting shade with sun-loving plants is a losing battle." },
              { num: "7", title: "Invest in landscape lighting", tip: "With limited outdoor space, NYC landscapes need to pull double duty — beautiful during the day, usable at night. Quality LED landscape lighting extends your outdoor hours, adds security, and transforms the mood of any garden, patio, or rooftop." },
              { num: "8", title: "Protect plantings from road salt", tip: "Salt spray from snowplows and sidewalk treatment damages plants within 10-15 feet of the street. Use salt-tolerant species near roads (bayberry, rugosa roses, ornamental grasses) and install physical barriers or burlap screens to shield sensitive plants in winter." },
              { num: "9", title: "Mulch everything, every year", tip: "A 2-3 inch layer of hardwood mulch suppresses weeds, retains moisture, regulates soil temperature, and looks clean and professional. In NYC's urban heat island, mulch is even more critical — it can reduce soil temperature by 10-15 degrees in summer." },
              { num: "10", title: "Start small, build over seasons", tip: "You don't need to do everything at once. A phased approach — hardscape year one, planting year two, lighting year three — spreads the cost and lets you adjust based on how you actually use the space. Good landscape design anticipates future phases." },
            ].map((tip) => (
              <div key={tip.num} className="flex gap-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-green-100 text-sm font-bold text-green-700 font-mono">
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
      <section className="bg-section-green py-20">
        <div className="mx-auto max-w-6xl px-6">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center">
            <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl font-heading">
              Landscaping Across <span className="text-green-400">{areas.length}+ NYC Neighborhoods</span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-500">
              We serve all five boroughs, Long Island, and Westchester with neighborhood-specific landscaping expertise tailored to local conditions.
            </p>
          </motion.div>

          <div className="mt-14 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
            {boroughs.map((borough, i) => (
              <motion.div key={borough.slug} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.03 }}>
                <Link href={getBoroughUrl(borough.slug)}>
                  <div className="group rounded-lg border border-green-200/60 bg-white p-4 text-center transition-all hover:border-green-400 hover:shadow-md">
                    <p className="text-sm font-semibold text-slate-800 group-hover:text-green-600 font-cta">{borough.name}</p>
                    <p className="text-xs text-slate-400">{borough.count} neighborhoods</p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>

          <div className="mt-10 text-center">
            <Link href="/areas">
              <motion.span whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }} className="inline-block rounded-lg bg-green-600 px-8 py-3 text-sm font-semibold text-white transition-colors hover:bg-green-700 font-cta">
                View All Service Areas
              </motion.span>
            </Link>
          </div>
        </div>
      </section>

      {/* Areas tip */}
      <section className="bg-section-white py-8">
        <div className="mx-auto max-w-4xl px-6">
          <Tip>Every NYC neighborhood has different landscaping conditions. Manhattan rooftops face intense wind. Brooklyn brownstone yards deal with deep shade. Queens and the Bronx have larger lots with full sun. Long Island and Westchester have completely different soil types. We customize every project to the specific conditions of your neighborhood.</Tip>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          NYC LANDSCAPING vs DIY COMPARISON
      ═══════════════════════════════════════════════════════════ */}
      <section className="bg-section-white py-20">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl font-heading">
            Professional Landscaping vs. <span className="text-green-400">DIY in NYC</span>
          </h2>
          <p className="mt-4 text-base text-slate-600">
            Thinking about tackling it yourself? Here&apos;s an honest comparison to help you decide. Some projects are great for DIY — others genuinely need a professional.
          </p>

          <div className="mt-10 overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-slate-50">
                  <th className="px-5 py-3.5 font-semibold text-slate-900 font-heading">Factor</th>
                  <th className="px-5 py-3.5 font-semibold text-green-700 font-heading">Professional</th>
                  <th className="px-5 py-3.5 font-semibold text-slate-700 font-heading">DIY</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { f: "Design Expertise", d: "Landscape architects with NYC experience", c: "YouTube tutorials and guesswork" },
                  { f: "Plant Selection", d: "Climate-matched, site-specific choices", c: "Whatever looks good at the nursery" },
                  { f: "Drainage & Grading", d: "Engineered solutions that prevent flooding", c: "Often overlooked until problems appear" },
                  { f: "Permits & Compliance", d: "Handled completely by our team", c: "Your responsibility — fines start at $1,000" },
                  { f: "Timeline", d: "1-3 weeks for most projects", c: "Weekends for months (or years)" },
                  { f: "Warranty", d: "1-year plant guarantee, workmanship warranty", c: "None — redo at your own expense" },
                  { f: "Long-Term Cost", d: "Higher upfront, lower over 5 years", c: "Lower upfront, higher from mistakes and replacements" },
                  { f: "Property Value Impact", d: "5-15% increase in property value", c: "Varies — poor work can decrease value" },
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

          <Tip>Great DIY landscaping projects in NYC: container gardening, annual flower beds, basic mulching, herb gardens. Projects that need a pro: drainage, hardscaping, irrigation, rooftop work, retaining walls, tree removal, and anything requiring a permit.</Tip>

          <p className="mt-6 text-sm text-slate-500">
            <strong>The ROI argument:</strong> According to the National Association of Realtors, professional landscaping returns 100-200% of its cost at resale. In NYC&apos;s competitive real estate market, a stunning outdoor space can be the difference between a quick sale and months on the market. <Link href="/contact" className="text-green-600 underline underline-offset-2 hover:text-green-800">Contact us</Link> for a free consultation to discuss your property&apos;s potential.
          </p>
        </div>
      </section>

      {/* Pre-FAQ tip */}
      <section className="bg-section-green py-8">
        <div className="mx-auto max-w-4xl px-6">
          <Tip>If a landscaper can&apos;t show you photos of completed NYC projects — specifically rooftops, brownstone yards, and urban gardens — they don&apos;t have the experience you need. Ask for references from properties similar to yours. We&apos;re happy to share our full portfolio.</Tip>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          FAQ
      ═══════════════════════════════════════════════════════════ */}
      <section className="bg-section-light py-20">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 sm:text-4xl font-heading">
            Frequently Asked <span className="text-green-400">Questions</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-center text-lg text-slate-500">
            Answers to the most common NYC landscaping questions. For more, visit our <Link href="/faq" className="text-green-600 underline underline-offset-2 hover:text-green-800">full FAQ page</Link>.
          </p>

          <div className="mt-12 space-y-3">
            {homeFAQs.map((faq, i) => (
              <div key={i} className="rounded-xl border border-slate-200 bg-white transition-colors hover:border-green-300">
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="flex w-full items-center justify-between px-6 py-5 text-left">
                  <span className="pr-4 text-base font-semibold text-slate-800 font-heading">{faq.question}</span>
                  <svg className={`h-5 w-5 shrink-0 text-green-500 transition-transform duration-200 ${openFaq === i ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
            Visit Our <span className="text-green-400">NYC Office</span>
          </h2>
          <div className="mt-12 flex justify-center">
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center max-w-md">
              <h3 className="text-xl font-bold text-slate-900 font-heading">{SITE_NAME}</h3>
              <p className="mt-3 text-sm text-slate-500">{ADDRESS}</p>
              <p className="mt-1 text-sm text-slate-500">New York, NY 10036</p>
              <div className="mt-4 flex flex-col items-center gap-2">
                <a href={PHONE_HREF} className="text-sm font-semibold text-green-600 hover:text-green-800 font-cta">{PHONE}</a>
                <a href={`mailto:${EMAIL}`} className="text-sm font-semibold text-green-600 hover:text-green-800 font-cta">{EMAIL}</a>
              </div>
              <div className="mt-6">
                <Link href="/contact" className="inline-block rounded-lg bg-green-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-700 font-cta">
                  Get a Free Estimate
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final tip */}
      <section className="bg-section-green py-8">
        <div className="mx-auto max-w-4xl px-6">
          <Tip>The best outdoor space in NYC is the one you actually use. Don&apos;t overthink it — start with a free estimate, get a professional plan, and transform your property. Whether it&apos;s a 200-square-foot terrace or a 2-acre estate, we make it happen.</Tip>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          FINAL CTA
      ═══════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-green-700 py-20">
        <div className="absolute inset-0 grid-bg opacity-20" />
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-emerald-500/15 blur-3xl animate-blob" />

        <div className="relative mx-auto max-w-3xl px-6 text-center">
          <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-3xl font-bold text-white sm:text-4xl font-heading">
            Transform Your NYC Outdoor Space Today
          </motion.h2>
          <motion.p initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }} className="mx-auto mt-4 max-w-xl text-lg text-white/80">
            Get a free estimate, explore our services, or call our team to discuss your landscaping project. No obligation, no pressure — just expert advice.
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }} className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/estimate">
              <motion.span whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }} className="inline-block rounded-lg bg-white px-8 py-3.5 text-base font-semibold text-green-700 shadow-lg transition-colors hover:bg-green-50 font-cta">
                Free Estimate
              </motion.span>
            </Link>
            <Link href="/areas">
              <motion.span whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }} className="inline-block rounded-lg border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:border-white/60 font-cta">
                Explore {areas.length}+ Neighborhoods
              </motion.span>
            </Link>
            <a href={SMS_HREF}>
              <motion.span whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }} className="inline-block rounded-lg border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:border-white/60 font-cta">
                {PHONE} | Text
              </motion.span>
            </a>
          </motion.div>
        </div>
      </section>
    </>
  );
}
