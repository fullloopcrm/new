import type { Metadata } from "next";
import Link from "next/link";
import { faqSchema, breadcrumbSchema } from "@/app/site/nyc-mobile-salon/_lib/seo";

export const metadata: Metadata = {
  title: "How It Works — Mobile Beauty Booking in NYC | The NYC Mobile Salon",
  description:
    "Book a licensed mobile beauty professional in 3 easy steps. Tell us what you need, we match you with a pro, and they show up at your door anywhere in NYC. No apps, no accounts — just great beauty service.",
  alternates: { canonical: "https://thenycmobilesalon.com/how-it-works" },
  openGraph: {
    title: "How It Works — Mobile Beauty Booking in NYC | The NYC Mobile Salon",
    description:
      "Book a licensed mobile beauty professional in 3 easy steps. Tell us what you need, we match you with a pro, and they show up at your door anywhere in NYC. No apps, no accounts — just great beauty service.",
    url: "https://thenycmobilesalon.com/how-it-works",
  },
};

const faqs = [
  { q: "How far in advance should I book?", a: "We can often accommodate same-day requests, but 24-48 hours notice is ideal. For events, bridal parties, and group bookings, we recommend booking at least 1-2 weeks ahead to guarantee your preferred date and stylist." },
  { q: "What if I need to reschedule?", a: "No worries — reschedule for free up to 12 hours before your appointment. Life happens, and we get that. If you need to cancel entirely, the same 12-hour window applies. No penalties, no hassle." },
  { q: "Do I need to provide anything?", a: "Nope. Our stylists bring everything — tools, products, supplies, even a drop cloth to protect your floors. All you need is a chair, an outlet, and decent lighting. For skincare and makeup, come with clean skin." },
  { q: "Is there a travel fee?", a: "Travel is included for all 5 NYC boroughs — Manhattan, Brooklyn, Queens, The Bronx, and Staten Island. No hidden charges, no surge pricing. The price you see is the price you pay." },
  { q: "What services do you offer?", a: "We offer 37+ services across hair, nails, makeup, skincare, waxing, and men's grooming. Everything from blowouts and braids to gel manicures, full glam makeup, facials, and beard trims. We also do events, bridal parties, corporate wellness days, and hands-on beauty classes." },
  { q: "Are your stylists licensed?", a: "Every single stylist, nail tech, esthetician, and barber on our team is fully licensed in the state of New York. We verify credentials, check references, and only work with experienced professionals. Your safety and results are non-negotiable." },
  { q: "How much does it cost?", a: "Services start at $99 per hour with a 1-hour minimum for individual appointments. Group bookings, events, and classes have a 2-hour minimum for groups of 3 or more. No hidden fees — pricing is transparent and all-inclusive." },
  { q: "Can I request a specific stylist?", a: "Absolutely. Once you've worked with someone you love, you can request them by name for future bookings. We'll do our best to accommodate your preference based on their availability." },
  { q: "What areas do you serve?", a: "We serve all five NYC boroughs — over 200 neighborhoods from the Upper East Side to Bay Ridge, Astoria to Riverdale, and everywhere in between. If you're in NYC, we come to you." },
  { q: "What about group bookings and events?", a: "We handle everything from bridal parties and bachelorettes to corporate team events and birthday celebrations. For groups of 3 or more, we assign multiple stylists so everyone gets attention. Contact us for custom event packages." },
];

function Sparkle({ className = "" }: { className?: string }) {
  return (
    <svg className={`inline-block ${className}`} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0L14.59 8.41L23 11L14.59 13.59L12 22L9.41 13.59L1 11L9.41 8.41L12 0Z" />
    </svg>
  );
}

export default function HowItWorksPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(
        faqSchema(faqs)
      ).replace(/</g, '\\u003c') }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(
        breadcrumbSchema([{ name: "Home", url: "/" }, { name: "How It Works", url: "/how-it-works" }])
      ).replace(/</g, '\\u003c') }} />

      {/* Hero */}
      <section className="relative overflow-hidden px-4 py-20 md:py-28" style={{ background: "linear-gradient(135deg, #7C3AED 0%, #A78BFA 40%, #C4B5FD 100%)" }}>
        <div className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-32 bottom-0 h-60 w-60 rounded-full bg-white/5 blur-3xl" />
        <div className="relative mx-auto max-w-4xl text-center">
          <div className="mb-4 flex items-center justify-center gap-2">
            <Sparkle className="h-4 w-4 text-white/60" />
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">How It Works</span>
            <Sparkle className="h-4 w-4 text-white/60" />
          </div>
          <h1 className="font-display mb-6 text-5xl font-bold tracking-tight text-white md:text-6xl lg:text-7xl">
            How Mobile Beauty <span className="italic">Works in NYC</span>
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-white/80">
            No apps to download. No accounts to create. No subscriptions. Just tell us what you need, and a licensed beauty professional shows up at your door anywhere in NYC with everything they need to make you look and feel incredible.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/book" className="inline-block rounded-full bg-white px-9 py-3.5 text-sm font-semibold uppercase tracking-wider text-purple-700 shadow-lg shadow-purple-500/20 transition hover:-translate-y-0.5 hover:bg-purple-50 font-display">Book Now</Link>
            <Link href="/services" className="btn-outline-white">Browse Services</Link>
          </div>
        </div>
      </section>

      {/* Intro */}
      <section className="bg-white px-6 py-16 md:py-20">
        <div className="mx-auto max-w-4xl">
          <div className="space-y-5 text-lg leading-relaxed text-gray-600">
            <p>
              The NYC Mobile Salon makes booking mobile beauty services as simple as ordering dinner. We&apos;ve eliminated the friction that makes traditional salon experiences frustrating — the commute, the wait, the awkward small talk, the scramble to find parking. Instead, you get a licensed professional at your door, on your schedule, with everything they need to deliver salon-quality results in your own space.
            </p>
            <p>
              Whether you need a <Link href="/services/blowouts-and-styling" className="text-purple-600 hover:underline">blowout before a meeting</Link>, a <Link href="/services/gel-manicure" className="text-purple-600 hover:underline">gel manicure</Link> during your lunch break, <Link href="/services/full-glam-makeup" className="text-purple-600 hover:underline">full glam makeup</Link> for a night out, or a <Link href="/services/mens-haircut-and-style" className="text-purple-600 hover:underline">fresh haircut</Link> without leaving your apartment — the process is the same every time. Three steps, no surprises, no hidden fees. We serve all five boroughs: <Link href="/locations/manhattan" className="text-purple-600 hover:underline">Manhattan</Link>, <Link href="/locations/brooklyn" className="text-purple-600 hover:underline">Brooklyn</Link>, <Link href="/locations/queens" className="text-purple-600 hover:underline">Queens</Link>, <Link href="/locations/bronx" className="text-purple-600 hover:underline">The Bronx</Link>, and <Link href="/locations/staten-island" className="text-purple-600 hover:underline">Staten Island</Link>.
            </p>
          </div>
        </div>
      </section>

      {/* Steps */}
      <section className="bg-purple-50/50 px-4 py-16 md:py-24">
        <div className="mx-auto max-w-5xl">
          <p className="mb-3 text-center text-xs font-semibold uppercase tracking-widest text-purple-600">
            <Sparkle className="mr-1 h-3 w-3" /> The Process
          </p>
          <h2 className="font-display mb-12 text-center text-3xl font-medium tracking-tight text-charcoal md:text-4xl">
            Book mobile beauty in three easy steps
          </h2>

          <div className="space-y-8">
            {/* Step 1 */}
            <div className="rounded-xl border border-purple-100 bg-white p-8 md:flex md:gap-8 md:p-10">
              <div className="mb-4 flex items-center gap-4 md:mb-0 md:flex-col md:items-start">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-purple-600 text-lg font-bold text-white font-display">1</span>
              </div>
              <div>
                <h3 className="font-display mb-3 text-xl font-semibold text-charcoal md:text-2xl">Tell us what you need</h3>
                <p className="mb-4 text-gray-600 leading-relaxed">
                  Fill out our quick booking form — it takes about 30 seconds. Pick your service (or services), select your borough and neighborhood, choose your preferred date and time, and tell us anything we should know. Want a specific hair color? Need allergen-free products? Hosting a group? Include it all in the notes.
                </p>
                <p className="text-gray-600 leading-relaxed">
                  We offer <Link href="/services" className="text-purple-600 hover:underline">37+ services</Link> across six categories: <Link href="/services/womens" className="text-purple-600 hover:underline">women&apos;s hair</Link>, nails, makeup, skincare, waxing, and <Link href="/services/mens" className="text-purple-600 hover:underline">men&apos;s grooming</Link>. You can also book <Link href="/events" className="text-purple-600 hover:underline">event services</Link> for bridal parties, corporate events, and celebrations, or sign up for a <Link href="/classes" className="text-purple-600 hover:underline">hands-on beauty class</Link>. Whatever you need, it starts with the form.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="rounded-xl border border-purple-100 bg-white p-8 md:flex md:gap-8 md:p-10">
              <div className="mb-4 flex items-center gap-4 md:mb-0 md:flex-col md:items-start">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-purple-600 text-lg font-bold text-white font-display">2</span>
              </div>
              <div>
                <h3 className="font-display mb-3 text-xl font-semibold text-charcoal md:text-2xl">We match you with a licensed pro</h3>
                <p className="mb-4 text-gray-600 leading-relaxed">
                  Once your request comes in, we match you with a licensed professional who specializes in exactly what you need. Need a colorist? You get a colorist. Need a nail artist who does intricate hand-painted designs? That&apos;s who shows up. We don&apos;t send generalists — we send specialists.
                </p>
                <p className="text-gray-600 leading-relaxed">
                  Every professional on our team is fully licensed in the state of New York, vetted through a rigorous screening process, and experienced in mobile service delivery. We confirm all the details with you before the appointment — service, timing, location, special requests, pricing — so there are zero surprises. If you&apos;ve booked with us before and loved your stylist, you can request them by name.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="rounded-xl border border-purple-100 bg-white p-8 md:flex md:gap-8 md:p-10">
              <div className="mb-4 flex items-center gap-4 md:mb-0 md:flex-col md:items-start">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-purple-600 text-lg font-bold text-white font-display">3</span>
              </div>
              <div>
                <h3 className="font-display mb-3 text-xl font-semibold text-charcoal md:text-2xl">They show up. You glow up.</h3>
                <p className="mb-4 text-gray-600 leading-relaxed">
                  Your stylist arrives at your door — apartment, house, office, hotel, Airbnb, you name it — with everything they need. Tools, products, supplies, even a drop cloth to protect your floors. You don&apos;t need to provide anything except a chair, an outlet, and decent lighting. They set up, do their thing, and leave you looking incredible.
                </p>
                <p className="text-gray-600 leading-relaxed">
                  This is what makes mobile beauty different from a traditional salon. You&apos;re in your own space, on your own schedule. Play your own music. Wear your own robe. Let the kids run around. Take a call between services. There&apos;s no rush, no awkward small talk with strangers, and no fighting for a cab after. When your stylist finishes, you&apos;re already exactly where you want to be — looking amazing.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What We Bring */}
      <section className="bg-white px-6 py-16 md:py-20">
        <div className="mx-auto max-w-5xl">
          <p className="mb-3 text-center text-xs font-semibold uppercase tracking-widest text-purple-600">
            <Sparkle className="mr-1 h-3 w-3" /> Full-Service Mobile
          </p>
          <h2 className="font-display mb-10 text-center text-3xl font-medium tracking-tight text-charcoal md:text-4xl">
            What our stylists bring to every appointment
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3">
            {[
              { title: "Professional-Grade Tools", desc: "Salon-quality blow dryers, flat irons, curling wands, clippers, UV lamps — whatever the service requires. No consumer-grade shortcuts." },
              { title: "Premium Products", desc: "We use professional products from trusted brands. Need hypoallergenic or vegan options? Just let us know in your booking." },
              { title: "All Supplies & Materials", desc: "Capes, clips, bowls, brushes, nail polish, skincare products, wax — everything is included. You provide zero materials." },
              { title: "Sanitized Equipment", desc: "Every tool is sanitized between appointments following NYC Department of Health standards. Your safety is non-negotiable." },
              { title: "Floor Protection", desc: "Drop cloths and coverings to protect your floors and furniture. We leave your space exactly how we found it — or cleaner." },
              { title: "Aftercare Guidance", desc: "Product recommendations, maintenance tips, and styling advice so your results last. Your stylist wants you to look great long after they leave." },
            ].map((item) => (
              <div key={item.title} className="rounded-xl border border-purple-100 bg-purple-50/30 p-6">
                <h3 className="font-display mb-2 text-sm font-semibold text-charcoal">{item.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Who It's For */}
      <section className="bg-purple-50/50 px-6 py-16 md:py-20">
        <div className="mx-auto max-w-5xl">
          <p className="mb-3 text-center text-xs font-semibold uppercase tracking-widest text-purple-600">
            <Sparkle className="mr-1 h-3 w-3" /> For Everyone
          </p>
          <h2 className="font-display mb-10 text-center text-3xl font-medium tracking-tight text-charcoal md:text-4xl">
            Who books mobile beauty in NYC?
          </h2>
          <div className="grid gap-6 sm:grid-cols-2">
            {[
              { title: "Busy Professionals", desc: "You don't have 3 hours to spend at a salon. You need a blowout before a presentation, fresh nails before a client dinner, or a quick grooming session between meetings. Mobile beauty fits your schedule, not the other way around." },
              { title: "Brides & Wedding Parties", desc: "Getting ready at the venue, hotel, or apartment with your crew while a team of stylists handles hair, makeup, and nails. No one has to fight traffic or show up stressed. Everyone gets pampered together." },
              { title: "Parents & Caregivers", desc: "You can't leave the house easily. Kids, elderly parents, mobility limitations — whatever the reason, mobile beauty means you don't have to arrange childcare or find transportation just to get a haircut." },
              { title: "Event Hosts & Planners", desc: "Corporate wellness days, team-building beauty workshops, birthday parties, bachelorettes, holiday celebrations. We bring the beauty experience to your event, wherever it is in NYC." },
              { title: "New Yorkers Who Value Their Time", desc: "The average salon visit in NYC takes 2-3 hours when you factor in commute, wait time, and the service itself. Mobile beauty cuts that in half. Same results, zero commute, no waiting." },
              { title: "Men Who Want to Look Sharp", desc: "Our men's grooming services include haircuts, beard trims, fades, skincare, and more. Same convenience, same quality — no barbershop wait." },
            ].map((item) => (
              <div key={item.title} className="rounded-xl border border-purple-100 bg-white p-6">
                <h3 className="font-display mb-2 text-lg font-semibold text-charcoal">{item.title}</h3>
                <p className="text-gray-600 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Overview */}
      <section className="bg-white px-6 py-16 md:py-20">
        <div className="mx-auto max-w-4xl">
          <p className="mb-3 text-center text-xs font-semibold uppercase tracking-widest text-purple-600">
            <Sparkle className="mr-1 h-3 w-3" /> Transparent Pricing
          </p>
          <h2 className="font-display mb-10 text-center text-3xl font-medium tracking-tight text-charcoal md:text-4xl">
            Simple, honest pricing
          </h2>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-xl border border-purple-100 bg-purple-50/30 p-8">
              <h3 className="font-display mb-2 text-xl font-semibold text-charcoal">Individual Services</h3>
              <p className="mb-4 text-3xl font-bold text-purple-600">$99<span className="text-base font-normal text-gray-500">/hour</span></p>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-center gap-2"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-purple-100"><svg className="h-3 w-3 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg></span>1-hour minimum</li>
                <li className="flex items-center gap-2"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-purple-100"><svg className="h-3 w-3 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg></span>All tools & products included</li>
                <li className="flex items-center gap-2"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-purple-100"><svg className="h-3 w-3 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg></span>No travel fees in NYC</li>
                <li className="flex items-center gap-2"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-purple-100"><svg className="h-3 w-3 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg></span>Hair, nails, makeup, skincare, grooming</li>
              </ul>
            </div>
            <div className="rounded-xl border border-purple-100 bg-purple-50/30 p-8">
              <h3 className="font-display mb-2 text-xl font-semibold text-charcoal">Groups, Events & Classes</h3>
              <p className="mb-4 text-3xl font-bold text-purple-600">$99<span className="text-base font-normal text-gray-500">/hour</span></p>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-center gap-2"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-purple-100"><svg className="h-3 w-3 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg></span>2-hour minimum for 3+ people</li>
                <li className="flex items-center gap-2"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-purple-100"><svg className="h-3 w-3 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg></span>Multiple stylists for large groups</li>
                <li className="flex items-center gap-2"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-purple-100"><svg className="h-3 w-3 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg></span>Bridal, corporate, parties, workshops</li>
                <li className="flex items-center gap-2"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-purple-100"><svg className="h-3 w-3 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg></span>Custom packages available</li>
              </ul>
            </div>
          </div>
          <p className="mt-6 text-center text-sm text-gray-500">
            All pricing is transparent and all-inclusive. No travel fees, no hidden charges, no surge pricing.{" "}
            <Link href="/pricing" className="text-purple-600 hover:underline">See full pricing details &rarr;</Link>
          </p>
        </div>
      </section>

      {/* Why Mobile */}
      <section className="bg-purple-50/50 px-6 py-16 md:py-20">
        <div className="mx-auto max-w-4xl">
          <p className="mb-3 text-center text-xs font-semibold uppercase tracking-widest text-purple-600">
            <Sparkle className="mr-1 h-3 w-3" /> Why Mobile
          </p>
          <h2 className="font-display mb-10 text-center text-3xl font-medium tracking-tight text-charcoal md:text-4xl">
            Why New Yorkers are switching to mobile beauty
          </h2>
          <div className="space-y-5 text-lg leading-relaxed text-gray-600">
            <p>
              The traditional salon model was designed for a world where people had time to spare. You block out half your Saturday, commute to the salon, wait 20 minutes past your appointment time, sit in a chair for an hour, then commute back. That&apos;s 2-3 hours of your day gone for a service that takes 45 minutes.
            </p>
            <p>
              Mobile beauty flips that model. Your stylist comes to you — your apartment, your office, your hotel room, your Airbnb, your friend&apos;s living room. You save the commute time, the wait time, and the awkward &quot;am I done yet?&quot; energy. You can multitask, relax in your own space, or prep for your event in the same location where you&apos;re getting ready. For group bookings and events, it&apos;s even more efficient — everyone gets serviced in the same location instead of coordinating 8 people at a salon.
            </p>
            <p>
              And the quality? It&apos;s identical. Our professionals are the same licensed stylists, nail techs, makeup artists, and barbers who work at top NYC salons. The only difference is they come to you. Same tools, same products, same expertise — just way more convenient.
            </p>
            <p className="font-medium text-charcoal">
              Over 5,000 New Yorkers have booked with The NYC Mobile Salon. The average rating is 4.9 out of 5. Once you try mobile beauty, you don&apos;t go back.
            </p>
          </div>
        </div>
      </section>

      {/* Services Overview */}
      <section className="bg-white px-6 py-16 md:py-20">
        <div className="mx-auto max-w-5xl">
          <p className="mb-3 text-center text-xs font-semibold uppercase tracking-widest text-purple-600">
            <Sparkle className="mr-1 h-3 w-3" /> What We Offer
          </p>
          <h2 className="font-display mb-10 text-center text-3xl font-medium tracking-tight text-charcoal md:text-4xl">
            37+ services across six categories
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            {[
              { title: "Hair Services", desc: "Blowouts, haircuts, color, highlights, balayage, silk press, braids, extensions, updos, deep conditioning", href: "/services/womens", count: "10 services" },
              { title: "Nail Services", desc: "Classic & gel manicures, pedicures, nail art, acrylics, press-ons, dip powder — all with premium polishes", href: "/services/womens", count: "7 services" },
              { title: "Makeup", desc: "Full glam, natural everyday looks, lash application — for any occasion from work to weddings", href: "/services/womens", count: "3 services" },
              { title: "Skincare", desc: "Express facials, deep cleansing, microdermabrasion, light chemical peels — all with professional-grade products", href: "/services/womens", count: "4 services" },
              { title: "Waxing", desc: "Brow shaping, lip, chin, full face, underarm, bikini, full leg — fast, clean, professional", href: "/services/womens", count: "7 services" },
              { title: "Men's Grooming", desc: "Haircuts, fades, beard trims, hot towel shaves, brow cleanup, facials, scalp treatments", href: "/services/mens", count: "6 services" },
            ].map((cat) => (
              <Link key={cat.title} href={cat.href} className="group rounded-xl border border-purple-100 bg-purple-50/30 p-6 transition-all hover:shadow-md hover:shadow-purple-500/10">
                <h3 className="font-display mb-2 text-lg font-semibold text-charcoal group-hover:text-purple-600">{cat.title}</h3>
                <p className="mb-3 text-sm text-gray-500">{cat.desc}</p>
                <span className="text-xs font-semibold text-purple-600">{cat.count} &rarr;</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Coverage */}
      <section className="bg-purple-50/50 px-4 py-16 md:py-20">
        <div className="mx-auto max-w-5xl text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-purple-600">
            <Sparkle className="mr-1 h-3 w-3" /> All Five Boroughs
          </p>
          <h2 className="font-display mb-4 text-3xl font-medium tracking-tight text-charcoal md:text-4xl">
            We come to you, wherever you are in NYC
          </h2>
          <p className="mx-auto mb-8 max-w-2xl text-gray-600">
            Over 200 neighborhoods across Manhattan, Brooklyn, Queens, The Bronx, and Staten Island. No travel fees, no boundaries. If you&apos;re in New York City, we&apos;re there.
          </p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
            {[
              { name: "Manhattan", slug: "manhattan", count: "40+" },
              { name: "Brooklyn", slug: "brooklyn", count: "45+" },
              { name: "Queens", slug: "queens", count: "50+" },
              { name: "The Bronx", slug: "bronx", count: "35+" },
              { name: "Staten Island", slug: "staten-island", count: "20+" },
            ].map((b) => (
              <Link key={b.slug} href={`/locations/${b.slug}`} className="card-hover rounded-xl border border-purple-100 bg-white p-6 text-center">
                <p className="text-lg font-semibold text-charcoal">{b.name}</p>
                <p className="mt-1 text-xs text-purple-600">{b.count} neighborhoods &rarr;</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-white px-6 py-16 md:py-20">
        <div className="mx-auto max-w-3xl">
          <h2 className="font-display mb-10 text-center text-3xl font-medium tracking-tight text-charcoal md:text-4xl">
            Frequently asked <span className="italic">questions</span>
          </h2>
          <div className="divide-y divide-purple-100">
            {faqs.map((faq) => (
              <div key={faq.q} className="py-6">
                <h3 className="font-display mb-2 text-lg font-semibold text-charcoal">{faq.q}</h3>
                <p className="text-gray-600 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-purple-50/50 px-4 py-16 text-center">
        <h2 className="font-display mb-4 text-3xl font-medium text-charcoal">
          Ready to <span className="italic">book?</span>
        </h2>
        <p className="mx-auto mb-6 max-w-lg text-gray-500">
          Three steps. That&apos;s it. Tell us what you need, we match you with a licensed pro, and they show up at your door. Starting at $99/hour.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link href="/book" className="inline-block rounded-full bg-purple-600 px-9 py-3.5 text-sm font-semibold uppercase tracking-wider text-white shadow-lg shadow-purple-500/20 transition hover:-translate-y-0.5 hover:bg-purple-700 font-display">
            Book Your Appointment
          </Link>
          <Link href="/services" className="inline-block rounded-full border border-purple-200 bg-white px-9 py-3.5 text-sm font-semibold uppercase tracking-wider text-purple-700 transition hover:-translate-y-0.5 hover:bg-purple-50 font-display">
            Browse Services
          </Link>
        </div>
      </section>
    </>
  );
}
