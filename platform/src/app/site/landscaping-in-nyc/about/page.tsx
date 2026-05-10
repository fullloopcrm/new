// @ts-nocheck
import type { Metadata } from "next";
import Link from "next/link";
import { SITE_NAME, SITE_DOMAIN, PHONE, PHONE_HREF, SMS_HREF, EMAIL } from "@/app/site/landscaping-in-nyc/_lib/siteData";

export const metadata: Metadata = {
  title: `About Us | ${SITE_NAME} — Born & Raised in Queens`,
  description:
    "From selling flowers out of a truck at age 8 to managing $6M NYC parks — our founder's story is rooted in New York City soil. Learn about the team behind Landscaping In NYC.",
  keywords: [
    "about landscaping in nyc",
    "nyc landscaper",
    "queens landscaper",
    "new york city landscape company",
    "nyc landscape architect",
    "landscape design nyc",
  ],
  alternates: { canonical: `${SITE_DOMAIN}/about` },
  openGraph: {
    title: `About Us | ${SITE_NAME}`,
    description:
      "From selling flowers at 8 years old to designing $6M NYC parks. Meet the team behind Landscaping In NYC.",
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
              telephone: "(212) 470-9637",
              email: EMAIL,
              foundingLocation: {
                "@type": "Place",
                name: "Queens, New York",
              },
              description:
                "NYC landscaping company founded by a born-and-raised Queens native with roots in horticulture spanning three generations.",
            },
          }),
        }}
      />

      {/* Hero */}
      <section className="relative overflow-hidden bg-green-700 pt-36 pb-20 sm:pt-44 sm:pb-28">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6">
          <p className="mb-4 inline-block rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-green-200">
            Our Story
          </p>
          <h1 className="text-4xl font-extrabold text-white sm:text-5xl md:text-6xl font-heading leading-tight">
            Born in Queens.{" "}
            <span className="text-green-400">Rooted in NYC.</span>
          </h1>
          <p className="mt-6 text-lg text-green-100/80 max-w-2xl mx-auto leading-relaxed">
            From selling flowers out of the back of a truck at 8 years old to designing
            award-winning urban landscapes across all five boroughs — this is a New York story.
          </p>
        </div>
      </section>

      {/* The Origin Story */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl font-heading mb-8">
            It Started With a Truck and a Grandfather
          </h2>

          <div className="space-y-6 text-slate-700 text-lg leading-relaxed">
            <p>
              When you&rsquo;re 8 years old and your grandfather hands you a bucket of roses and says
              &ldquo;go sell,&rdquo; you don&rsquo;t think about career paths. You just hustle. That&rsquo;s
              how it started — out of the back of a truck in Queens, selling flowers on street corners
              with a man who taught me that everything worth building starts with your hands in the dirt.
            </p>

            <p>
              My grandfather didn&rsquo;t stay in that truck. He turned it into a storefront on Horace
              Harding Boulevard — <strong>The Rose Connection</strong> — a flower shop that still operates
              today. Watching him go from a truck to a real business taught me something that no degree ever
              could: if you show up every single day, if you care about what you&rsquo;re putting into the
              ground, people notice. And they come back.
            </p>

            <div className="my-10 rounded-2xl bg-green-50 border border-green-200 p-8">
              <blockquote className="text-xl italic text-green-800 font-heading text-center">
                &ldquo;Everything worth building starts with your hands in the dirt.&rdquo;
              </blockquote>
              <p className="text-center text-sm text-green-600 mt-3">
                — Learned from my grandfather, Queens, NY
              </p>
            </div>

            <h3 className="text-2xl font-bold text-slate-900 font-heading mt-12 mb-4">
              From Tarping Leaves to Running Crews
            </h3>

            <p>
              I started at the bottom — literally. Tarping leaves, hauling debris, loading trucks before
              sunrise. I worked my way up through <strong>Brickman Landscaping</strong>, one of the largest
              commercial landscape companies in the country, until I was running crews as a foreman. That&rsquo;s
              where I learned how to manage large-scale operations — commercial properties, HOA communities,
              corporate campuses — the kind of work where mistakes cost tens of thousands and deadlines don&rsquo;t
              move.
            </p>

            <h3 className="text-2xl font-bold text-slate-900 font-heading mt-12 mb-4">
              A $6 Million NYC Park
            </h3>

            <p>
              Then came the project that changed everything. I was brought on to manage a{" "}
              <strong>$6 million New York City park</strong> — a project that was featured in{" "}
              <strong>Landscape Architecture Magazine</strong>. We&rsquo;re not talking about
              planting a few trees. We&rsquo;re talking about a complete urban transformation — grading,
              drainage systems, hardscaping, native plantings, irrigation, lighting — built to serve a
              community for decades. That project proved to me that landscaping isn&rsquo;t just maintenance.
              It&rsquo;s architecture. It&rsquo;s engineering. It&rsquo;s art.
            </p>

            <h3 className="text-2xl font-bold text-slate-900 font-heading mt-12 mb-4">
              Redesigning NYC — One Property at a Time
            </h3>

            <p>
              After the park, I went deeper into urban landscape design — redesigning backyards in Brooklyn
              brownstones, building rooftop gardens in Manhattan, transforming concrete patios in Queens into
              outdoor living spaces. Every project in this city is different because every property is different.
              A 200-square-foot backyard in Park Slope has completely different challenges than a 2-acre estate
              in Scarsdale. And that&rsquo;s what makes this work exciting.
            </p>

            <p>
              I&rsquo;ve been doing this my entire life. Not because I chose landscaping — because landscaping
              chose me. It&rsquo;s in my blood. Three generations of it. From flowers on a truck in Queens to
              parks featured in national magazines to the company you&rsquo;re looking at right now.
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
                title: "NYC Native Knowledge",
                desc: "Born and raised here. We know the soil, the microclimates, the regulations, the access challenges, and the neighborhoods — because we grew up in them.",
              },
              {
                title: "Commercial-Grade Experience",
                desc: "From Brickman Landscaping to managing multi-million-dollar city parks — we bring institutional-level precision to every residential and commercial project.",
              },
              {
                title: "Design-Build Execution",
                desc: "We don't just draw plans and hand them off. We design it, we build it, we maintain it. One team, start to finish, no subcontractor roulette.",
              },
              {
                title: "Three Generations Deep",
                desc: "This isn't a side hustle or a startup pivot. Horticulture and landscaping have been in this family for three generations — starting with The Rose Connection in Queens.",
              },
              {
                title: "Year-Round Service",
                desc: "Spring plantings, summer maintenance, fall cleanups, winter snow removal. We don't disappear in October and show up in April. We're here 12 months a year.",
              },
              {
                title: "Every Borough, Every Property Type",
                desc: "Manhattan rooftops, Brooklyn brownstone backyards, Queens estates, Bronx commercial properties, Staten Island residences, Long Island and Westchester — we cover it all.",
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
                year: "Age 8",
                title: "Selling Flowers From a Truck",
                desc: "Started working alongside my grandfather in Queens, selling roses and arrangements out of the back of a truck on the streets of New York City.",
              },
              {
                year: "The Rose Connection",
                title: "From Truck to Storefront",
                desc: "Watched my grandfather build The Rose Connection on Horace Harding Boulevard in Queens — a flower shop that's still in operation today.",
              },
              {
                year: "Early Career",
                title: "Tarping Leaves & Learning the Trade",
                desc: "Started from the ground up in commercial landscaping — tarping leaves, hauling materials, learning every aspect of the craft before sunrise.",
              },
              {
                year: "Brickman Landscaping",
                title: "Foreman at a National Firm",
                desc: "Rose to foreman at Brickman Landscaping, managing commercial crews and large-scale property maintenance across the tri-state area.",
              },
              {
                year: "Career-Defining",
                title: "$6M NYC Park — Featured in Landscape Architecture",
                desc: "Led a $6 million New York City park project from start to finish — grading, drainage, hardscaping, native plantings, irrigation, and lighting. Featured in Landscape Architecture Magazine.",
              },
              {
                year: "Evolution",
                title: "Urban Landscape Design",
                desc: "Shifted into designing and building urban landscapes — Brooklyn brownstone backyards, Manhattan rooftop gardens, Queens outdoor living spaces, and Westchester estates.",
              },
              {
                year: "Today",
                title: "Landscaping In NYC",
                desc: "Founded Landscaping In NYC to bring institutional-quality landscape design and maintenance to every property type across all five boroughs, Long Island, and Westchester.",
              },
            ].map((milestone, i) => (
              <div key={i} className="flex gap-6">
                <div className="flex flex-col items-center">
                  <div className="h-4 w-4 rounded-full bg-green-600 ring-4 ring-green-100 shrink-0" />
                  {i < 6 && <div className="w-0.5 flex-1 bg-green-200" />}
                </div>
                <div className="pb-8">
                  <p className="text-xs font-bold uppercase tracking-widest text-green-600 mb-1">
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
      <section className="bg-green-700 py-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="text-3xl font-extrabold text-white sm:text-4xl font-heading">
            Ready to Transform Your Property?
          </h2>
          <p className="mt-4 text-green-100/80 text-lg max-w-xl mx-auto">
            Three generations of experience. Every borough covered. Get a free estimate from a
            team that&rsquo;s been doing this since before we could drive.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/contact"
              className="inline-block rounded-lg bg-white px-8 py-4 text-base font-bold text-green-700 shadow-lg hover:bg-green-50 transition-colors font-cta"
            >
              Get a Free Estimate
            </Link>
            <a
              href={PHONE_HREF}
              className="inline-block rounded-lg border-2 border-white/30 px-8 py-4 text-base font-bold text-white hover:bg-white/10 transition-colors font-cta"
            >
              Call {PHONE}
            </a>
            <a
              href={SMS_HREF}
              className="inline-block rounded-lg border-2 border-white/30 px-8 py-4 text-base font-bold text-white hover:bg-white/10 transition-colors font-cta"
            >
              Text Us
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
