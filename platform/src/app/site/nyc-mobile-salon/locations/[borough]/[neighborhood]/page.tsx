// @ts-nocheck
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { womensCategories, mensCategories, neighborhoods, boroughNames } from "@/app/site/nyc-mobile-salon/_lib/constants";
import { getAllNeighborhoodParams, getNeighborhoodName, getBoroughName, localBusinessSchema, breadcrumbSchema, faqSchema } from "@/app/site/nyc-mobile-salon/_lib/seo";

/* ── Sparkle SVG ─────────────────────────────────────────────────── */
function Sparkle({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 0L14.59 8.41L23 11L14.59 13.59L12 22L9.41 13.59L1 11L9.41 8.41L12 0Z" />
    </svg>
  );
}

export const revalidate = 86400;

export const dynamicParams = true

export async function generateStaticParams() { return [] }

type Props = { params: Promise<{ borough: string; neighborhood: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { borough, neighborhood } = await params;
  const hood = getNeighborhoodName(borough, neighborhood);
  const boro = getBoroughName(borough);
  if (!hood || !boro) return {};
  return {
    title: `Mobile Beauty Services in ${hood}, ${boro} | Hair, Nails, Makeup & More | The NYC Mobile Salon`,
    description: `Book mobile beauty services in ${hood}, ${boro}. Licensed stylists come to your door for hair, nails, makeup, grooming, skincare, waxing & more. $99/hour, no travel fees. Serving all of ${boro}.`,
    alternates: { canonical: `https://thenycmobilesalon.com/locations/${borough}/${neighborhood}` },
  };
}

export default async function NeighborhoodLocationPage({ params }: Props) {
  const { borough, neighborhood } = await params;
  const hood = getNeighborhoodName(borough, neighborhood);
  const boro = getBoroughName(borough);
  if (!hood || !boro) notFound();

  const sameBorough = (neighborhoods[borough] ?? []).filter((n) => n.slug !== neighborhood);
  const otherBoroughs = Object.entries(boroughNames).filter(([slug]) => slug !== borough);

  const faqs = [
    {
      q: `Do you serve ${hood}, ${boro}?`,
      a: `Absolutely. The NYC Mobile Salon proudly serves ${hood} and every other neighborhood in ${boro}. Our licensed beauty professionals travel directly to your home, office, hotel, or event venue anywhere in ${hood}. There is no travel fee regardless of where you are located in ${boro}, and we bring all supplies, tools, and products needed for your appointment.`,
    },
    {
      q: `What beauty services are available in ${hood}?`,
      a: `We offer a full range of mobile beauty services in ${hood} including hair styling, blowouts, haircuts, color, highlights, silk press, braids and protective styles, extensions, updos, manicures, pedicures, gel nails, acrylic nails, nail art, full glam makeup, natural makeup, lash application, facials, microdermabrasion, chemical peels, waxing, and complete men's grooming including fades, beard trims, and hot towel shaves. Every service is performed by a licensed, experienced professional.`,
    },
    {
      q: `Is there a travel fee for ${hood}?`,
      a: `No. There is never a travel fee for any location in ${hood} or anywhere else in ${boro}. Our flat rate is $99 per hour with a one-hour minimum for individual bookings. For groups of three or more, there is a two-hour minimum. The price you see is the price you pay with no hidden charges or surcharges.`,
    },
    {
      q: `How do I book a mobile beauty appointment in ${hood}?`,
      a: `Booking is simple. Visit our online booking page at thenycmobilesalon.com/book, select the services you need, choose your preferred date and time, and enter your ${hood} address. You can also call or text us directly. We typically confirm appointments within a few hours and can often accommodate same-day requests depending on availability.`,
    },
    {
      q: `Can I book event beauty services in ${hood}?`,
      a: `Yes. We specialize in on-location event beauty services throughout ${hood} and ${boro}. Whether you are planning a bridal party, bachelorette celebration, birthday glam party, corporate wellness day, photo shoot, or any other group event, our team can handle groups of any size. We bring multiple stylists so everyone is ready on time.`,
    },
    {
      q: `How quickly can a stylist arrive in ${hood}?`,
      a: `While we recommend booking at least 24 to 48 hours in advance for the best availability, we frequently accommodate same-day and next-day appointments in ${hood}. Our network of licensed professionals is spread across all five boroughs, so there is almost always someone nearby. Contact us and we will do our best to get a stylist to your door as quickly as possible.`,
    },
  ];

  return (
    <>
      {/* ── JSON-LD ─────────────────────────────────────────────────── */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            localBusinessSchema({
              name: `The NYC Mobile Salon — ${hood}`,
              url: `https://thenycmobilesalon.com/locations/${borough}/${neighborhood}`,
              areaServed: `${hood}, ${boro}, New York City`,
              description: `Mobile beauty services in ${hood}, ${boro}. Hair, nails, makeup, grooming, and more — delivered to your door.`,
            }),
            breadcrumbSchema([
              { name: "Home", url: "/" },
              { name: "Locations", url: "/locations" },
              { name: boro, url: `/locations/${borough}` },
              { name: hood, url: `/locations/${borough}/${neighborhood}` },
            ]),
            faqSchema(faqs),
          ]),
        }}
      />

      {/* ── 1. Hero ─────────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden px-4 py-24 text-white"
        style={{ background: "linear-gradient(135deg, #7C3AED 0%, #A78BFA 40%, #C4B5FD 100%)" }}
      >
        <div className="relative mx-auto max-w-4xl text-center">
          <nav className="mb-4 text-sm text-purple-100">
            <Link href="/locations" className="hover:underline">Locations</Link>
            <span className="mx-2">/</span>
            <Link href={`/locations/${borough}`} className="hover:underline">{boro}</Link>
            <span className="mx-2">/</span>
            <span className="text-white font-semibold">{hood}</span>
          </nav>
          <h1 className="font-display mb-6 text-4xl font-black tracking-tight md:text-5xl lg:text-6xl">
            Mobile Beauty Services in {hood}, {boro}
          </h1>
          <p className="mx-auto mb-8 max-w-2xl text-lg text-purple-100 md:text-xl">
            Licensed hair stylists, nail technicians, makeup artists, skincare specialists, and grooming professionals — delivered right to your door in {hood}. No travel fees, no salon commute, no hassle. Just exceptional beauty services in the comfort of your own space.
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/book" className="inline-flex items-center gap-2 rounded-full bg-white px-8 py-3.5 text-sm font-bold text-purple-700 shadow-lg transition-transform hover:scale-105">
              <Sparkle className="h-4 w-4" />
              Book Your Appointment
            </Link>
            <Link href="/services" className="inline-flex items-center gap-2 rounded-full border-2 border-white/60 px-8 py-3.5 text-sm font-bold text-white transition-colors hover:bg-white/10">
              Browse All Services
            </Link>
          </div>
        </div>
      </section>

      {/* ── 2. Neighborhood Intro ───────────────────────────────────── */}
      <section className="bg-white px-4 py-20">
        <div className="mx-auto max-w-3xl">
          <h2 className="font-display mb-8 text-3xl font-black text-slate-800 md:text-4xl">
            Your Personal Beauty Team in {hood}
          </h2>

          <p className="mb-5 text-lg leading-relaxed text-slate-600">
            Finding time for a salon visit in {hood} can feel impossible. Between work, family commitments, and the pace of life in {boro}, the last thing you want to do is trek across the neighborhood, wait for your appointment, and lose half your day in the process. That is exactly why The NYC Mobile Salon exists. We bring a full suite of professional beauty services directly to your home, apartment, office, hotel room, or event venue in {hood} — so you never have to choose between looking your best and living your life.
          </p>

          <p className="mb-5 text-lg leading-relaxed text-slate-600">
            Our team of licensed professionals covers every category of beauty and grooming you could need. For women, we offer everything from <Link href="/services/womens" className="text-purple-600 hover:underline">blowouts, haircuts, and color services</Link> to manicures, pedicures, gel nails, acrylic applications, full glam makeup, natural everyday makeup, lash application, facials, chemical peels, microdermabrasion, and a complete range of waxing services. For men, our barbers and groomers deliver fresh <Link href="/services/mens" className="text-purple-600 hover:underline">fades, haircuts, beard trims, hot towel shaves, scalp treatments, and more</Link>. Whatever you need, we bring it to {hood}.
          </p>

          <p className="mb-5 text-lg leading-relaxed text-slate-600">
            We also specialize in <Link href="/events" className="text-purple-600 hover:underline">on-location event beauty</Link> for bridal parties, bachelorette celebrations, birthday glam sessions, corporate wellness days, photo shoots, film productions, and community events throughout {hood} and the rest of {boro}. Planning a group booking? We send multiple stylists so everyone is camera-ready on schedule. And if you want to learn new skills, our <Link href="/classes" className="text-purple-600 hover:underline">beauty workshops and classes</Link> cover blowout techniques, braiding, everyday makeup, skincare routines, nail art, and men&apos;s grooming basics — all taught in your space by working professionals.
          </p>

          <p className="mb-5 text-lg leading-relaxed text-slate-600">
            Every stylist on our platform is fully licensed, insured, and vetted. They arrive with all the tools, products, and supplies needed for your appointment. There are no hidden fees, no travel surcharges, and no minimum distance requirements. Whether you are in a high-rise in the heart of {hood} or a brownstone on a quiet side street, the experience and the price are exactly the same. Our flat rate of $99 per hour means you always know what you are paying before the appointment begins.
          </p>

          <p className="text-lg leading-relaxed text-slate-600">
            Ready to skip the salon commute and bring professional beauty services to your door in {hood}? Browse our <Link href="/services" className="text-purple-600 hover:underline">full service menu</Link>, check out our <Link href="/pricing" className="text-purple-600 hover:underline">transparent pricing</Link>, or go ahead and <Link href="/book" className="text-purple-600 hover:underline">book your first appointment</Link>. We cannot wait to meet you.
          </p>
        </div>
      </section>

      {/* ── 3. Women's Services ─────────────────────────────────────── */}
      <section className="bg-purple-50/50 px-4 py-20">
        <div className="mx-auto max-w-5xl">
          <div className="mb-10 flex items-center gap-3">
            <Sparkle className="h-6 w-6 text-purple-500" />
            <h2 className="font-display text-3xl font-black text-slate-800">Women&apos;s Services in {hood}</h2>
          </div>
          <p className="mb-10 max-w-3xl text-lg text-slate-600">
            From a quick blowout before dinner to a full color transformation, our licensed female-focused service providers cover every category of hair, nails, makeup, skincare, and waxing. Every service listed below is available at your location in {hood}.
          </p>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {womensCategories.map((cat) => (
              <div key={cat.slug} className="rounded-xl border border-purple-100 bg-white p-6">
                <h3 className="font-display mb-4 text-lg font-bold text-purple-700">{cat.title}</h3>
                <ul className="space-y-2">
                  {cat.services.map((s) => (
                    <li key={s.slug}>
                      <Link href={`/services/${s.slug}`} className="group flex items-start gap-2">
                        <span className="mt-1.5 block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-purple-300" />
                        <span>
                          <span className="text-sm font-semibold text-slate-700 group-hover:text-purple-600">{s.name}</span>
                          <span className="block text-xs text-slate-400">{s.description}</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link href="/services/womens" className="text-purple-600 hover:underline font-semibold text-sm">
              View all women&apos;s services &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* ── 4. Men's Services ──────────────────────────────────────── */}
      <section className="bg-white px-4 py-20">
        <div className="mx-auto max-w-5xl">
          <div className="mb-10 flex items-center gap-3">
            <Sparkle className="h-6 w-6 text-sky-500" />
            <h2 className="font-display text-3xl font-black text-slate-800">Men&apos;s Grooming in {hood}</h2>
          </div>
          <p className="mb-10 max-w-3xl text-lg text-slate-600">
            Skip the barbershop line. Our licensed barbers and men&apos;s grooming specialists come to you in {hood} for haircuts, fades, beard work, hot towel shaves, scalp treatments, and more. Every service below is available on-location.
          </p>
          <div className="grid gap-8 md:grid-cols-3">
            {mensCategories.map((cat) => (
              <div key={cat.slug} className="rounded-xl border border-sky-100 bg-sky-50/40 p-6">
                <h3 className="font-display mb-4 text-lg font-bold text-sky-700">{cat.title}</h3>
                <ul className="space-y-2">
                  {cat.services.map((s) => (
                    <li key={s.slug}>
                      <Link href={`/services/${s.slug}`} className="group flex items-start gap-2">
                        <span className="mt-1.5 block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-sky-300" />
                        <span>
                          <span className="text-sm font-semibold text-slate-700 group-hover:text-sky-600">{s.name}</span>
                          <span className="block text-xs text-slate-400">{s.description}</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link href="/services/mens" className="text-purple-600 hover:underline font-semibold text-sm">
              View all men&apos;s services &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* ── 5. Events in {hood} ────────────────────────────────────── */}
      <section className="bg-purple-50/50 px-4 py-20">
        <div className="mx-auto max-w-3xl">
          <h2 className="font-display mb-8 text-3xl font-black text-slate-800">Event Beauty Services in {hood}</h2>

          <p className="mb-5 text-lg leading-relaxed text-slate-600">
            Hosting an event in {hood}? The NYC Mobile Salon provides on-location beauty services for every type of celebration and professional gathering. Our event team specializes in bridal hair and makeup, bridal party styling, bachelorette pampering sessions, birthday glam parties, sweet 16 and quincea&ntilde;era styling, prom prep, and girls&apos; night in packages. We handle groups of any size by dispatching multiple licensed professionals to your venue, apartment, hotel suite, or outdoor space in {hood}.
          </p>

          <p className="mb-5 text-lg leading-relaxed text-slate-600">
            For corporate clients in {hood}, we offer office wellness days with manicure and brow bars, headshot and photo shoot styling for the entire team, conference touch-up stations, and employee appreciation glam packages. If you work in film, television, or content creation, our on-set hair and makeup artists are experienced with production schedules, quick turnarounds, and editorial-level results. We also serve community organizations with senior home salon days, hospital and recovery pampering, shelter and nonprofit glam events, and back-to-school haircut programs.
          </p>

          <p className="text-lg leading-relaxed text-slate-600">
            Every event booking in {hood} includes a dedicated coordinator who works with you on scheduling, stylist assignments, and service flow. We build a custom timeline so everyone looks their best exactly when they need to. <Link href="/events" className="text-purple-600 hover:underline">Learn more about our event packages</Link> or <Link href="/book" className="text-purple-600 hover:underline">request a custom quote</Link>.
          </p>
        </div>
      </section>

      {/* ── 6. Classes in {hood} ───────────────────────────────────── */}
      <section className="bg-white px-4 py-20">
        <div className="mx-auto max-w-3xl">
          <h2 className="font-display mb-8 text-3xl font-black text-slate-800">Beauty Classes &amp; Workshops in {hood}</h2>

          <p className="mb-5 text-lg leading-relaxed text-slate-600">
            Want to level up your beauty skills? The NYC Mobile Salon offers hands-on workshops and classes that come to you in {hood}. Our instructors are licensed, working professionals who teach practical techniques you can use every day. Current offerings include DIY blowout workshops, braiding basics, everyday makeup masterclasses, skincare routine workshops, group nail art classes, and men&apos;s grooming 101 sessions. Classes run 90 minutes to two hours and accommodate groups of four to twelve people.
          </p>

          <p className="mb-5 text-lg leading-relaxed text-slate-600">
            These workshops are perfect for girls&apos; nights, team building events, birthday celebrations, bridal showers, or just a fun weekend activity with friends in {hood}. Every participant gets hands-on instruction, product recommendations tailored to their specific needs, and techniques they can replicate at home. We bring all the tools and supplies — you just provide the space and the enthusiasm.
          </p>

          <p className="text-lg leading-relaxed text-slate-600">
            <Link href="/classes" className="text-purple-600 hover:underline">Browse our full class catalog</Link> to see descriptions, group sizes, and durations. Ready to book a workshop in {hood}? <Link href="/book" className="text-purple-600 hover:underline">Get started here</Link>.
          </p>
        </div>
      </section>

      {/* ── 7. How It Works ────────────────────────────────────────── */}
      <section className="bg-purple-50/50 px-4 py-20">
        <div className="mx-auto max-w-4xl">
          <h2 className="font-display mb-12 text-center text-3xl font-black text-slate-800">How Mobile Beauty Works in {hood}</h2>
          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                step: "1",
                title: "Book Online",
                desc: `Choose your services, pick a date and time, and enter your ${hood} address. We confirm within hours and match you with the perfect licensed professional for your needs.`,
              },
              {
                step: "2",
                title: "We Come to You",
                desc: `Your stylist arrives at your door in ${hood} with everything needed — tools, products, supplies, and equipment. No setup required on your end. We work in any space you have available.`,
              },
              {
                step: "3",
                title: "Look Amazing",
                desc: `Sit back, relax, and enjoy a salon-quality experience without leaving ${hood}. When your appointment is done, you are ready to take on the day — no commute, no waiting, no hassle.`,
              },
            ].map((item) => (
              <div key={item.step} className="rounded-xl border border-purple-100 bg-white p-6 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-purple-600 text-lg font-black text-white">
                  {item.step}
                </div>
                <h3 className="font-display mb-3 text-lg font-bold text-slate-800">{item.title}</h3>
                <p className="text-sm leading-relaxed text-slate-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 8. Pricing ─────────────────────────────────────────────── */}
      <section className="bg-white px-4 py-20">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-display mb-6 text-3xl font-black text-slate-800">Simple, Transparent Pricing</h2>
          <p className="mb-8 text-lg text-slate-600">
            No hidden fees. No travel surcharges. The same rate whether you are in {hood} or anywhere else in New York City.
          </p>
          <div className="mx-auto max-w-md rounded-xl border border-purple-100 bg-white p-8 shadow-sm">
            <p className="mb-2 text-5xl font-black text-purple-600">$99<span className="text-2xl text-slate-400">/hr</span></p>
            <p className="mb-4 text-sm text-slate-500">per stylist</p>
            <ul className="mb-6 space-y-2 text-left text-sm text-slate-600">
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-purple-500">&#10003;</span>
                <span>1-hour minimum for individual bookings</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-purple-500">&#10003;</span>
                <span>2-hour minimum for groups of 3 or more</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-purple-500">&#10003;</span>
                <span>No travel fees anywhere in {hood} or {boro}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-purple-500">&#10003;</span>
                <span>All supplies and products included</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-purple-500">&#10003;</span>
                <span>Licensed, insured professionals only</span>
              </li>
            </ul>
            <Link href="/pricing" className="inline-block rounded-full bg-purple-600 px-8 py-3 text-sm font-bold text-white transition-transform hover:scale-105">
              View Full Pricing Details
            </Link>
          </div>
        </div>
      </section>

      {/* ── 9. Why Mobile Beauty in {hood} ─────────────────────────── */}
      <section className="bg-purple-50/50 px-4 py-20">
        <div className="mx-auto max-w-4xl">
          <h2 className="font-display mb-12 text-center text-3xl font-black text-slate-800">
            Why {hood} Residents Choose Mobile Beauty
          </h2>
          <div className="grid gap-6 sm:grid-cols-2">
            {[
              {
                title: "No Commute Required",
                desc: `Stop wasting time traveling to a salon. Our professionals come directly to your location in ${hood}, saving you valuable time and energy. Whether you live in a walk-up apartment or a doorman building, we meet you where you are.`,
              },
              {
                title: "Your Space, Your Comfort",
                desc: `Get pampered in the comfort of your own home, office, or hotel room in ${hood}. Play your own music, wear your own robe, and enjoy a private, relaxed experience that no salon waiting room can match.`,
              },
              {
                title: "Flexible Scheduling",
                desc: `Early morning blowout before a meeting? Late afternoon glam before a night out in ${hood}? Weekend bridal party prep? We work around your schedule, not the other way around. Same-day appointments are often available.`,
              },
              {
                title: "Licensed Professionals Only",
                desc: `Every stylist, nail technician, makeup artist, and barber on our platform is fully licensed by the state of New York, carries insurance, and has been vetted by our team. You get the same professional-grade service you would find at a top ${boro} salon — delivered to your door in ${hood}.`,
              },
            ].map((card) => (
              <div key={card.title} className="rounded-xl border border-purple-100 bg-white p-6">
                <h3 className="font-display mb-3 text-lg font-bold text-purple-700">{card.title}</h3>
                <p className="text-sm leading-relaxed text-slate-500">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 10. Nearby Neighborhoods ───────────────────────────────── */}
      <section className="bg-white px-4 py-20">
        <div className="mx-auto max-w-4xl">
          <h2 className="font-display mb-8 text-2xl font-black text-slate-800">
            Other Neighborhoods We Serve in {boro}
          </h2>
          <p className="mb-6 text-slate-600">
            In addition to {hood}, our mobile beauty professionals serve every neighborhood across {boro}. Tap any neighborhood below to see services available in that area.
          </p>
          <div className="flex flex-wrap gap-2">
            {sameBorough.map((n) => (
              <Link
                key={n.slug}
                href={`/locations/${borough}/${n.slug}`}
                className="rounded-full border border-purple-200 bg-purple-50 px-4 py-1.5 text-sm font-medium text-purple-700 transition-colors hover:bg-purple-100"
              >
                {n.name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── 11. Other Boroughs ─────────────────────────────────────── */}
      <section className="bg-purple-50/50 px-4 py-20">
        <div className="mx-auto max-w-4xl">
          <h2 className="font-display mb-8 text-2xl font-black text-slate-800">
            We Also Serve All Five NYC Boroughs
          </h2>
          <p className="mb-6 text-slate-600">
            The NYC Mobile Salon covers every borough in New York City. Whether your friends are in Brooklyn, your office is in Manhattan, or your family is in Queens, we bring the same great service everywhere.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
            {otherBoroughs.map(([slug, name]) => (
              <Link
                key={slug}
                href={`/locations/${slug}`}
                className="rounded-xl border border-purple-100 bg-white p-5 text-center font-bold text-slate-700 transition-colors hover:border-purple-300 hover:text-purple-600"
              >
                {name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── 12. FAQ ────────────────────────────────────────────────── */}
      <section className="bg-white px-4 py-20">
        <div className="mx-auto max-w-3xl">
          <h2 className="font-display mb-10 text-center text-3xl font-black text-slate-800">
            Frequently Asked Questions About Mobile Beauty in {hood}
          </h2>
          <div className="space-y-6">
            {faqs.map((faq) => (
              <div key={faq.q} className="rounded-xl border border-purple-100 bg-white p-6">
                <h3 className="font-display mb-3 text-lg font-bold text-slate-800">{faq.q}</h3>
                <p className="text-sm leading-relaxed text-slate-500">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 13. CTA ────────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden px-4 py-24 text-white"
        style={{ background: "linear-gradient(135deg, #7C3AED 0%, #A78BFA 40%, #C4B5FD 100%)" }}
      >
        <div className="relative mx-auto max-w-3xl text-center">
          <Sparkle className="mx-auto mb-4 h-8 w-8 text-purple-200" />
          <h2 className="font-display mb-4 text-3xl font-black md:text-4xl">
            Ready to Book Mobile Beauty in {hood}?
          </h2>
          <p className="mx-auto mb-8 max-w-xl text-lg text-purple-100">
            Licensed professionals. $99 per hour. No travel fees. Your door in {hood}, {boro}. Let&apos;s make it happen.
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/book" className="inline-flex items-center gap-2 rounded-full bg-white px-10 py-3.5 text-sm font-bold text-purple-700 shadow-lg transition-transform hover:scale-105">
              <Sparkle className="h-4 w-4" />
              Book in {hood}
            </Link>
            <Link href="/services" className="inline-flex items-center gap-2 rounded-full border-2 border-white/60 px-10 py-3.5 text-sm font-bold text-white transition-colors hover:bg-white/10">
              Explore Services
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
