import type { Metadata } from "next";
import Link from "next/link";
import { SITE_NAME, SITE_DOMAIN, PHONE, PHONE_HREF, SMS_HREF, EMAIL } from "@/app/site/the-nyc-interior-designer/_lib/siteData";

export const metadata: Metadata = {
  title: `About Us | ${SITE_NAME} — NYC Design Roots`,
  description:
    "From styling first apartments to designing luxury penthouses and award-winning commercial spaces — our founder's story is rooted in New York City design. Learn about the team behind The NYC Interior Designer.",
  keywords: [
    "about nyc interior designer",
    "nyc interior design team",
    "manhattan interior designer",
    "new york city design company",
    "nyc residential designer",
    "interior design firm nyc",
  ],
  alternates: { canonical: `${SITE_DOMAIN}/about` },
  openGraph: {
    title: `About Us | ${SITE_NAME}`,
    description:
      "From styling first apartments to designing luxury penthouses. Meet the team behind The NYC Interior Designer.",
    url: `${SITE_DOMAIN}/about`,
    siteName: SITE_NAME,
    type: "website",
  },
};

export default function AboutPage() {
  const year = new Date().getFullYear();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "AboutPage",
            name: `About ${SITE_NAME}`,
            url: `${SITE_DOMAIN}/about`,
            mainEntity: {
              "@type": "LocalBusiness",
              name: SITE_NAME,
              url: SITE_DOMAIN,
              telephone: PHONE,
              email: EMAIL,
              foundingLocation: {
                "@type": "Place",
                name: "New York City, New York",
              },
              description:
                "NYC interior design firm founded by designers with deep roots in New York City architecture, residential renovation, and commercial design.",
            },
          }),
        }}
      />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gray-700 pt-36 pb-20 sm:pt-44 sm:pb-28">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6">
          <p className="mb-4 inline-block rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-blue-200">
            Our Story
          </p>
          <h1 className="text-4xl font-extrabold text-white sm:text-5xl md:text-6xl font-heading leading-tight">
            Born in New York.{" "}
            <span className="text-blue-400">Designed for NYC.</span>
          </h1>
          <p className="mt-6 text-lg text-blue-100/80 max-w-2xl mx-auto leading-relaxed">
            From styling our first apartment renovation in a walk-up to designing
            award-winning commercial interiors — this is a New York story about spaces,
            people, and the city that shaped everything.
          </p>
        </div>
      </section>

      {/* The Origin Story */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl font-heading mb-8">
            It Started With a 400-Square-Foot Studio
          </h2>

          <div className="space-y-6 text-slate-700 text-lg leading-relaxed">
            <p>
              When you live in a 400-square-foot studio in the East Village and you&rsquo;re
              determined to make it feel like a real home — not just a box with a bed — you
              learn to design out of necessity. Every inch matters. Every piece of furniture
              needs to earn its place. That&rsquo;s where this started — not in a design school
              lecture hall, but in a tiny apartment where the dining table was also the desk,
              the bookshelf was also the room divider, and the closet was a creative engineering
              project.
            </p>

            <p>
              Friends started asking for help. Then their friends. Then their friends&rsquo; landlords.
              Before long, what started as solving spatial puzzles for fun became a real business —
              one client, one apartment, one brownstone at a time. Every project taught us something
              new about what makes NYC living work: how light moves between buildings, why a 30-inch
              sofa matters more than a 32-inch one, and how to convince a co-op board that yes, this
              renovation will actually improve the building.
            </p>

            <div className="my-10 rounded-2xl bg-blue-50 border border-blue-200 p-8">
              <blockquote className="text-xl italic text-blue-800 font-heading text-center">
                &ldquo;Great design isn&rsquo;t about making spaces look good in photos.
                It&rsquo;s about making spaces work beautifully for the people who live in them.&rdquo;
              </blockquote>
              <p className="text-center text-sm text-blue-600 mt-3">
                — Our founding principle, New York City
              </p>
            </div>

            <h3 className="text-2xl font-bold text-slate-900 font-heading mt-12 mb-4">
              From Studios to Penthouses
            </h3>

            <p>
              As our portfolio grew, so did the scale of our projects. Studio apartments became
              one-bedrooms. One-bedrooms became brownstone full-floor renovations. Brownstones
              became luxury penthouses. Along the way, we built a team of specialists — certified
              kitchen and bath designers, lighting experts, renovation managers, procurement
              coordinators — each one with deep NYC experience and an obsessive attention to detail.
            </p>

            <h3 className="text-2xl font-bold text-slate-900 font-heading mt-12 mb-4">
              The Commercial Breakthrough
            </h3>

            <p>
              Then came the project that changed the trajectory of the firm. A restaurant owner
              in SoHo hired us to design a 3,000-square-foot space — our first major commercial
              project. We handled everything: the floor plan, the custom banquettes, the bar
              design, the lighting scheme, the acoustic treatment. The space was featured in
              design publications and suddenly we were fielding calls from office tenants, retail
              brands, and hospitality groups across Manhattan and Brooklyn.
            </p>

            <h3 className="text-2xl font-bold text-slate-900 font-heading mt-12 mb-4">
              Designing NYC — One Space at a Time
            </h3>

            <p>
              Today, {SITE_NAME} designs residential and commercial interiors across all five
              boroughs, Long Island, Westchester, and New Jersey. We&rsquo;ve completed over
              2,500 projects — from studio apartments in Astoria to townhouse gut-renovations
              in Park Slope, corner offices in Midtown to boutique hotels in the Lower East Side.
              Every project is different because every client is different. And that&rsquo;s what
              makes this work exciting.
            </p>

            <p>
              We didn&rsquo;t come to interior design from fashion or art school. We came to it
              from living in New York City — from the daily reality of making tight spaces work,
              navigating building politics, and creating homes that are as functional as they are
              beautiful. That&rsquo;s what separates us from decorators. We design for real NYC life.
            </p>
          </div>
        </div>
      </section>

      {/* What We Bring */}
      <section className="bg-slate-50 py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl font-heading mb-10 text-center">
            What We Bring to Every Project
          </h2>

          <div className="grid sm:grid-cols-2 gap-6">
            {[
              {
                title: "NYC-Native Design Instincts",
                desc: "We live and work here. We know the floor plans, the building quirks, the delivery restrictions, the co-op board politics, and the neighborhoods — because we've designed in all of them.",
              },
              {
                title: "Full-Service Execution",
                desc: "We don't just draw mood boards and hand them off. We design it, source it, manage the renovation, coordinate the deliveries, and style it on install day. One team, start to finish.",
              },
              {
                title: "Trade Access & Buying Power",
                desc: "Our accounts at trade-only showrooms, fabric houses, and custom fabricators give you access to pieces and pricing that aren't available to the public — often 30-40% below retail.",
              },
              {
                title: "Renovation Management Expertise",
                desc: "NYC renovations are a logistical nightmare without experienced management. We coordinate contractors, file permits, manage co-op boards, and keep projects on budget and on schedule.",
              },
              {
                title: "2,500+ Completed Projects",
                desc: "From 400 sq ft studios to 4,000 sq ft brownstones to 10,000 sq ft commercial spaces — we've designed every property type in every borough. We've seen it all and solved it all.",
              },
              {
                title: "Every Borough, Every Property Type",
                desc: "Manhattan pre-wars, Brooklyn brownstones, Queens co-ops, Bronx new-construction, Staten Island houses, Long Island estates, Westchester homes, and New Jersey waterfront condos — we cover it all.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <h3 className="text-lg font-bold text-slate-900 font-heading mb-2">
                  {item.title}
                </h3>
                <p className="text-slate-600 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl font-heading mb-12 text-center">
            The Journey
          </h2>

          <div className="space-y-8">
            {[
              {
                year: "The Beginning",
                title: "A 400 Sq Ft Studio in the East Village",
                desc: "Started designing out of necessity — making a tiny NYC apartment live bigger, smarter, and more beautifully than it had any right to.",
              },
              {
                year: "Word of Mouth",
                title: "Friends, Then Friends of Friends",
                desc: "What started as helping friends with their apartments turned into a real pipeline of referrals — each project building skills and reputation in NYC's tight-knit residential market.",
              },
              {
                year: "Growing the Team",
                title: "From Solo Designer to Full Studio",
                desc: "Brought on certified kitchen and bath designers, lighting specialists, and a dedicated procurement coordinator. Every hire was someone with deep NYC design and renovation experience.",
              },
              {
                year: "The SoHo Restaurant",
                title: "First Major Commercial Project",
                desc: "Designed a 3,000-square-foot restaurant in SoHo that was featured in design publications. This project opened the door to commercial work — offices, retail, and hospitality spaces across Manhattan and Brooklyn.",
              },
              {
                year: "Scaling Up",
                title: "Brownstone Renovations & Luxury Condos",
                desc: "Took on increasingly complex projects — multi-floor brownstone gut-renovations, luxury condo full-home designs, and large-scale commercial buildouts requiring DOB permits and co-op board navigation.",
              },
              {
                year: "2,500+ Projects",
                title: "Every Borough, Every Property Type",
                desc: "Reached the milestone of 2,500 completed projects across all five boroughs, Long Island, Westchester, and New Jersey. From studios to penthouses, offices to restaurants.",
              },
              {
                year: "Today",
                title: SITE_NAME,
                desc: `${SITE_NAME} is a full-service interior design firm serving the entire NYC metro area with 18 professional design services, a team of certified specialists, and the deep NYC expertise that only comes from designing here every single day.`,
              },
            ].map((milestone, i) => (
              <div key={i} className="flex gap-6">
                <div className="flex flex-col items-center">
                  <div className="h-4 w-4 rounded-full bg-blue-600 ring-4 ring-blue-100 shrink-0" />
                  {i < 6 && <div className="w-0.5 flex-1 bg-blue-200" />}
                </div>
                <div className="pb-8">
                  <p className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-1">
                    {milestone.year}
                  </p>
                  <h3 className="text-lg font-bold text-slate-900 font-heading">
                    {milestone.title}
                  </h3>
                  <p className="mt-1 text-slate-600 text-sm leading-relaxed">
                    {milestone.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gray-700 py-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="text-3xl font-extrabold text-white sm:text-4xl font-heading">
            Ready to Transform Your Space?
          </h2>
          <p className="mt-4 text-blue-100/80 text-lg max-w-xl mx-auto">
            2,500+ projects completed. Every borough covered. Get a free consultation from a
            team that designs NYC interiors every single day.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href={SMS_HREF}
              className="inline-block rounded-lg bg-white px-8 py-4 text-base font-bold text-blue-700 shadow-lg hover:bg-blue-50 transition-colors font-cta"
            >
              Text Us
            </a>
            <a
              href={PHONE_HREF}
              className="inline-block rounded-lg border-2 border-white/30 px-8 py-4 text-base font-bold text-white hover:bg-white/10 transition-colors font-cta"
            >
              Call {PHONE}
            </a>
            <Link
              href="/contact"
              className="inline-block rounded-lg border-2 border-white/30 px-8 py-4 text-base font-bold text-white hover:bg-white/10 transition-colors font-cta"
            >
              Free Consultation
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
