// @ts-nocheck
import type { Metadata } from "next";
import Link from "next/link";
import { faqSchema, breadcrumbSchema, localBusinessSchema } from "@/app/site/nyc-mobile-salon/_lib/seo";

export const metadata: Metadata = {
  title: "About The NYC Mobile Salon — Licensed Mobile Beauty Pros Across All 5 Boroughs",
  description:
    "The NYC Mobile Salon brings licensed beauty professionals to your door across all 5 NYC boroughs. Learn about our mission, our team, our standards, and why thousands of New Yorkers trust us for mobile hair, nails, makeup, grooming, and more.",
  alternates: { canonical: "https://thenycmobilesalon.com/about" },
  openGraph: {
    title: "About The NYC Mobile Salon — Licensed Mobile Beauty Pros Across All 5 Boroughs",
    description:
      "The NYC Mobile Salon brings licensed beauty professionals to your door across all 5 NYC boroughs. Learn about our mission, our team, our standards, and why thousands of New Yorkers trust us for mobile hair, nails, makeup, grooming, and more.",
    url: "https://thenycmobilesalon.com/about",
  },
};

const faqs = [
  {
    q: "Who are your stylists?",
    a: "Every stylist, nail technician, esthetician, makeup artist, and barber on The NYC Mobile Salon team is fully licensed in the state of New York. We verify credentials through the New York State Division of Licensing Services, check professional references, and conduct background screenings before any professional joins our network. Our team includes specialists with experience at top NYC salons, editorial and fashion work, bridal styling, and men's grooming. Many hold advanced certifications in color correction, balayage, keratin treatments, and specialized skincare protocols.",
  },
  {
    q: "How do I book an appointment?",
    a: "Booking with The NYC Mobile Salon is simple. Visit our Book Now page, tell us what service you need, your preferred date and time, and your location anywhere in the five NYC boroughs. We'll match you with an available licensed professional and confirm your appointment — usually within a few hours. No apps to download, no accounts to create, no subscriptions required. You can also reach us directly by email at hey@thenycmobilesalon.com for custom requests, group bookings, or event inquiries.",
  },
  {
    q: "What's the pricing?",
    a: "Individual mobile beauty services start at $99 per hour with a one-hour minimum. Group bookings, events, and beauty classes have a two-hour minimum for groups of three or more. All pricing is transparent and all-inclusive — there are no hidden fees, no travel surcharges, and no surprise add-ons. The price you see is the price you pay, regardless of which borough or neighborhood you're in. We bring all tools, products, and supplies at no extra charge.",
  },
  {
    q: "Do you serve my neighborhood?",
    a: "If you're in New York City, we almost certainly serve your neighborhood. The NYC Mobile Salon covers all five boroughs — Manhattan, Brooklyn, Queens, The Bronx, and Staten Island — across more than 200 neighborhoods. From the Upper East Side to Bay Ridge, Astoria to Riverdale, Williamsburg to St. George, and everywhere in between. Visit our Locations page to find your specific borough and neighborhood, or just tell us your address when you book and we'll confirm coverage.",
  },
  {
    q: "Can I request a specific stylist?",
    a: "Absolutely. Once you've worked with a stylist you love, you can request them by name for all future appointments. We encourage building long-term relationships with your favorite professionals — consistency matters when it comes to beauty services. We'll do our best to accommodate your preference based on their availability. If your preferred stylist isn't available for a particular date, we'll match you with someone equally qualified.",
  },
  {
    q: "What if I need to cancel or reschedule?",
    a: "We understand that plans change — especially in New York City. You can reschedule or cancel your appointment for free with at least 12 hours' notice before your scheduled start time. No penalties, no hassle, no guilt trips. If you need to reschedule within 12 hours, contact us and we'll do our best to accommodate. For event bookings and large group appointments, we ask for 48 hours' notice for cancellations.",
  },
];

function Sparkle({ className = "" }: { className?: string }) {
  return (
    <svg className={`inline-block ${className}`} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0L14.59 8.41L23 11L14.59 13.59L12 22L9.41 13.59L1 11L9.41 8.41L12 0Z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-purple-100">
      <svg className="h-3.5 w-3.5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    </div>
  );
}

export default function AboutPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema(faqs)) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(
        breadcrumbSchema([{ name: "Home", url: "/" }, { name: "About", url: "/about" }])
      ) }} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema()) }}
      />

      {/* ── Hero ── */}
      <section className="relative overflow-hidden px-4 py-20 md:py-28" style={{ background: "linear-gradient(135deg, #7C3AED 0%, #A78BFA 40%, #C4B5FD 100%)" }}>
        <div className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-32 bottom-0 h-60 w-60 rounded-full bg-white/5 blur-3xl" />
        <div className="relative mx-auto max-w-4xl text-center">
          <div className="mb-4 flex items-center justify-center gap-2">
            <Sparkle className="h-4 w-4 text-white/60" />
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">About Us</span>
            <Sparkle className="h-4 w-4 text-white/60" />
          </div>
          <h1 className="font-display mb-6 text-5xl font-bold tracking-tight text-white md:text-6xl lg:text-7xl">
            NYC&apos;s Mobile <span className="italic">Beauty Team</span>
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-white/80">
            The NYC Mobile Salon is a network of 100+ licensed beauty professionals who deliver salon-quality hair, nails, makeup, skincare, grooming, and more to your door — anywhere across all five New York City boroughs. No commute, no waiting rooms, no compromise on quality. Just exceptional beauty services in the comfort of your own space, on your schedule.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/book" className="inline-block rounded-full bg-white px-9 py-3.5 text-sm font-semibold uppercase tracking-wider text-purple-700 shadow-lg shadow-purple-500/20 transition hover:-translate-y-0.5 hover:bg-purple-50 font-display">Book Now</Link>
            <Link href="/services" className="btn-outline-white">Browse Services</Link>
          </div>
        </div>
      </section>

      {/* ── Our Story ── */}
      <section className="bg-white px-6 py-16 md:py-20">
        <div className="mx-auto max-w-4xl">
          <div className="mb-4 flex items-center gap-2 text-purple-600">
            <Sparkle className="h-3 w-3" />
            <span className="text-xs font-semibold uppercase tracking-[0.2em] font-display">Our Story</span>
          </div>
          <h2 className="font-display mb-8 text-3xl font-bold tracking-tight text-charcoal md:text-4xl">
            Born from frustration with the NYC salon experience
          </h2>
          <div className="space-y-5 text-lg leading-relaxed text-gray-600">
            <p>
              The NYC Mobile Salon was founded because we were tired of the same thing every New Yorker is tired of — the exhausting, time-consuming, often disappointing salon experience that has somehow become the norm in one of the greatest cities in the world. Think about it: you spend 20 minutes finding a salon that is actually accepting new clients. You book two weeks out because nothing is available sooner. The day of, you commute 30 minutes across the city, find nowhere to park or get off a crowded subway, walk three blocks in the rain, and arrive at a tiny storefront where you wait another 15 minutes past your appointment time in a cramped lobby. By the time someone actually touches your hair, you have already lost an hour of your day — and the service has not even started yet. We knew there had to be a better way.
            </p>
            <p>
              So we flipped the entire model. Instead of asking clients to come to us, we built a network of top-tier, fully licensed beauty professionals who come to you. Your apartment in <Link href="/locations/manhattan" className="text-purple-600 hover:underline">Manhattan</Link>. Your brownstone in <Link href="/locations/brooklyn" className="text-purple-600 hover:underline">Brooklyn</Link>. Your office in <Link href="/locations/queens" className="text-purple-600 hover:underline">Queens</Link>. Your hotel room in Midtown. Your event space in <Link href="/locations/bronx" className="text-purple-600 hover:underline">The Bronx</Link>. Your Airbnb in <Link href="/locations/staten-island" className="text-purple-600 hover:underline">Staten Island</Link>. Anywhere in New York City, any day of the week, from early morning to late evening. We bring the entire salon experience — the tools, the products, the expertise, the pampering — directly to your door.
            </p>
            <p>
              We started small, with a handful of stylists serving Manhattan neighborhoods like the Upper East Side, Chelsea, and the West Village. Word spread fast. Clients told their friends. Friends told their coworkers. Within months, we were fielding booking requests from Brooklyn, Queens, and beyond. We expanded borough by borough, neighborhood by neighborhood, carefully recruiting and vetting professionals in each area until we had comprehensive coverage across all five boroughs. Today, The NYC Mobile Salon serves more than 200 neighborhoods with a roster of over 100 licensed beauty professionals specializing in everything from <Link href="/services/blowouts-and-styling" className="text-purple-600 hover:underline">blowouts and styling</Link> to <Link href="/services/gel-manicure" className="text-purple-600 hover:underline">gel manicures</Link>, <Link href="/services/full-glam-makeup" className="text-purple-600 hover:underline">full glam makeup</Link>, <Link href="/services/skincare-facial" className="text-purple-600 hover:underline">facials</Link>, <Link href="/services/mens-haircut-and-style" className="text-purple-600 hover:underline">men&apos;s haircuts</Link>, and much more.
            </p>
            <p>
              What started as a simple idea — bring the salon to the client instead of the other way around — has grown into something we are genuinely proud of. We have completed thousands of appointments, served clients for weddings and proms and job interviews and first dates and quiet Sunday mornings where someone just wanted to feel good. We have built relationships with repeat clients who request the same stylist every time, and we have introduced new clients to professionals they now consider part of their personal care team. The NYC Mobile Salon is not just a booking service. It is a new way of thinking about beauty in New York City — and we are just getting started.
            </p>
          </div>
        </div>
      </section>

      {/* ── Our Mission ── */}
      <section className="bg-purple-50/50 px-6 py-16 md:py-20">
        <div className="mx-auto max-w-4xl">
          <div className="mb-4 flex items-center gap-2 text-purple-600">
            <Sparkle className="h-3 w-3" />
            <span className="text-xs font-semibold uppercase tracking-[0.2em] font-display">Our Mission</span>
          </div>
          <h2 className="font-display mb-8 text-3xl font-bold tracking-tight text-charcoal md:text-4xl">
            Democratizing beauty access across New York City
          </h2>
          <div className="space-y-5 text-lg leading-relaxed text-gray-600">
            <p>
              Our mission is straightforward: everyone in New York City deserves access to professional, high-quality beauty services — regardless of their mobility, their schedule, their neighborhood, or their living situation. The traditional salon model works for some people. It does not work for everyone. It does not work for the new mother who cannot leave the house with a newborn. It does not work for the elderly client who has difficulty traveling to a storefront. It does not work for the busy executive who has exactly 45 minutes between meetings. It does not work for the person recovering from surgery who still wants to feel human. It does not work for the bride who needs her entire wedding party ready in one location. And frankly, it does not work for the millions of New Yorkers who simply do not want to spend their limited free time commuting to and sitting in a salon when that salon could come to them.
            </p>
            <p>
              The NYC Mobile Salon exists to close that gap. We believe that professional beauty services should fit into your life — not the other way around. That is why we have built a service model that is flexible enough to accommodate a solo <Link href="/services/blowouts-and-styling" className="text-purple-600 hover:underline">blowout appointment</Link> in a studio apartment and scalable enough to handle a 15-person <Link href="/events/bridal-hair-and-makeup" className="text-purple-600 hover:underline">bridal party</Link> at a venue in Brooklyn. It is why we serve all five boroughs, including neighborhoods in <Link href="/locations/staten-island" className="text-purple-600 hover:underline">Staten Island</Link> and <Link href="/locations/bronx" className="text-purple-600 hover:underline">The Bronx</Link> that traditional mobile services often ignore. And it is why we have made our pricing simple and transparent — starting at $99 per hour with no hidden fees, no travel surcharges, and no upselling. Professional beauty should not be a luxury reserved for people with the time and resources to chase it down. It should come to your door.
            </p>
            <p>
              Beyond individual services, we are committed to building real community around beauty in New York City. That means offering <Link href="/classes" className="text-purple-600 hover:underline">hands-on beauty classes</Link> where clients can learn professional techniques for themselves. It means supporting <Link href="/events" className="text-purple-600 hover:underline">group events</Link> that bring people together — birthday celebrations, corporate wellness days, bachelorette parties, girls&apos; nights. And it means treating our professionals as partners, not gig workers. Every stylist, nail tech, and esthetician in our network is a skilled, licensed professional who chose this career. We match them with clients who value their expertise, and we make sure they are compensated fairly for the exceptional work they do.
            </p>
          </div>
        </div>
      </section>

      {/* ── By the Numbers ── */}
      <section className="bg-white px-6 py-16 md:py-20">
        <div className="mx-auto max-w-4xl">
          <div className="mb-4 flex items-center gap-2 text-purple-600">
            <Sparkle className="h-3 w-3" />
            <span className="text-xs font-semibold uppercase tracking-[0.2em] font-display">By the Numbers</span>
          </div>
          <h2 className="font-display mb-4 text-3xl font-bold tracking-tight text-charcoal md:text-4xl">
            The numbers behind the network
          </h2>
          <p className="mb-10 max-w-2xl text-lg leading-relaxed text-gray-600">
            We let our track record speak for itself. Here is a snapshot of The NYC Mobile Salon by the numbers — from appointments completed to neighborhoods served, our growth reflects the trust that thousands of New Yorkers place in our team every month.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { value: "5,000+", label: "Appointments Completed", desc: "Thousands of successful mobile beauty appointments delivered across NYC" },
              { value: "200+", label: "Neighborhoods Served", desc: "Comprehensive coverage spanning every corner of all five boroughs" },
              { value: "4.9/5", label: "Average Client Rating", desc: "Consistently exceptional reviews from clients across every service category" },
              { value: "100%", label: "Licensed Professionals", desc: "Every stylist, tech, and artist verified through NYS licensing" },
              { value: "5", label: "Boroughs Covered", desc: "Manhattan, Brooklyn, Queens, The Bronx, and Staten Island" },
              { value: "$99/hr", label: "Starting Price", desc: "All-inclusive pricing with no hidden fees, travel charges, or surcharges" },
            ].map((stat) => (
              <div key={stat.label} className="rounded-xl border border-purple-100 bg-white p-6 text-center">
                <p className="font-display text-4xl font-bold text-purple-600">{stat.value}</p>
                <p className="mt-2 text-sm font-semibold text-charcoal">{stat.label}</p>
                <p className="mt-1 text-sm text-gray-500">{stat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── What Makes Us Different ── */}
      <section className="bg-purple-50/50 px-6 py-16 md:py-20">
        <div className="mx-auto max-w-4xl">
          <div className="mb-4 flex items-center gap-2 text-purple-600">
            <Sparkle className="h-3 w-3" />
            <span className="text-xs font-semibold uppercase tracking-[0.2em] font-display">What Makes Us Different</span>
          </div>
          <h2 className="font-display mb-4 text-3xl font-bold tracking-tight text-charcoal md:text-4xl">
            Not just another salon — a completely different model
          </h2>
          <p className="mb-10 max-w-2xl text-lg leading-relaxed text-gray-600">
            Traditional salons are built around the salon&apos;s schedule, the salon&apos;s location, and the salon&apos;s convenience. The NYC Mobile Salon is built around yours. Here is what sets us apart from every other beauty service option in New York City.
          </p>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: "Licensed & Insured",
                desc: "Every single professional in our network is fully licensed in the state of New York and carries their own liability insurance. We verify credentials through the NYS Division of Licensing Services before anyone joins our team. We do not cut corners on qualifications — ever. Your safety, your trust, and your results are non-negotiable. Many of our professionals hold advanced certifications in specialties like color correction, balayage, keratin treatments, lash extensions, and advanced skincare protocols.",
              },
              {
                title: "We Come to You",
                desc: "Your apartment, your office, your hotel room, your Airbnb, your event venue, your parents' house — wherever you are in New York City, we show up. Our professionals arrive with everything they need: tools, products, supplies, protective coverings for your furniture and floors. All you need is a chair, an outlet, and decent lighting. We have done appointments in studio apartments and penthouse suites, corporate boardrooms and backstage at fashion shows. If you have a space, we can work in it.",
              },
              {
                title: "All-Inclusive Pricing",
                desc: "Services start at $99 per hour with no hidden fees, no travel surcharges, no product upcharges, and no surprise add-ons when the bill comes. The price you see is the price you pay — whether you are in the Upper East Side of Manhattan or the south shore of Staten Island. We include travel time, setup, cleanup, and all products and supplies in our pricing. Group bookings and events have a two-hour minimum for three or more guests, with the same transparent per-hour rate.",
              },
              {
                title: "Full Service Menu",
                desc: "We offer 37+ individual services across every major beauty category: women's hair (blowouts, cuts, color, styling, braids, extensions, treatments), nails (classic and gel manicures, pedicures, nail art, dip powder), makeup (natural, full glam, editorial, bridal), skincare (facials, peels, extractions), waxing (brow, lip, full body), and men's grooming (haircuts, fades, beard trims, hot towel shaves). Whatever you need, we have a licensed professional who specializes in it.",
              },
              {
                title: "Flexible Scheduling",
                desc: "We book appointments seven days a week, from early morning through late evening. Need a blowout before a 7 AM flight? We will be there at 5:30. Want a manicure on a Sunday night? No problem. Our scheduling flexibility is one of the biggest reasons clients choose us over traditional salons. We can often accommodate same-day requests, and we recommend just 24 to 48 hours notice for standard appointments. For events and group bookings, one to two weeks advance notice is ideal.",
              },
              {
                title: "Events & Groups",
                desc: "From bridal parties and bachelorette celebrations to corporate team events, birthday parties, holiday gatherings, and hands-on beauty classes — we handle group experiences of every size. For groups of three or more, we assign multiple professionals so everyone receives dedicated attention without long waits. We have styled wedding parties of 15, hosted corporate wellness events for entire offices, and run beauty classes for groups learning professional techniques. Contact us for custom event packages and pricing.",
              },
            ].map((card) => (
              <div key={card.title} className="rounded-xl border border-purple-100 bg-white p-6">
                <div className="mb-3 flex items-start gap-3">
                  <CheckIcon />
                  <h3 className="font-display text-lg font-bold text-charcoal">{card.title}</h3>
                </div>
                <p className="text-sm leading-relaxed text-gray-600">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Our Standards ── */}
      <section className="bg-white px-6 py-16 md:py-20">
        <div className="mx-auto max-w-4xl">
          <div className="mb-4 flex items-center gap-2 text-purple-600">
            <Sparkle className="h-3 w-3" />
            <span className="text-xs font-semibold uppercase tracking-[0.2em] font-display">Our Standards</span>
          </div>
          <h2 className="font-display mb-8 text-3xl font-bold tracking-tight text-charcoal md:text-4xl">
            The highest standards in mobile beauty — no exceptions
          </h2>
          <div className="space-y-5 text-lg leading-relaxed text-gray-600">
            <p>
              When you invite a beauty professional into your home or personal space, trust is everything. That is why The NYC Mobile Salon maintains the highest standards in the mobile beauty industry for every aspect of our operation — from who we hire to the products they use to how they sanitize their equipment between clients. We do not take shortcuts, and we do not make exceptions. Every client who books with us deserves the same level of professionalism, safety, and quality, and that is exactly what we deliver.
            </p>
            <p>
              Our vetting process begins with licensing verification. Every professional on our team — whether they are a hairstylist, nail technician, esthetician, makeup artist, or barber — holds a current, valid license issued by the New York State Division of Licensing Services. We verify that license before they perform a single appointment. Beyond licensing, we conduct reference checks with previous employers and clients, review portfolios of their work, and require a background screening. Only about one in five applicants who express interest in joining our network actually make it through the full vetting process. We are selective by design because our clients trust us to send someone qualified, professional, and trustworthy into their spaces.
            </p>
            <p>
              Equipment sanitization is another area where we hold ourselves to the highest standard. All tools are cleaned and sanitized between every appointment following New York City Department of Health guidelines. Metal implements like scissors, shears, and cuticle nippers are sterilized using hospital-grade disinfectant. Combs, brushes, and styling tools are cleaned with professional-grade sanitizing solutions. Single-use items like nail files, buffers, and wax strips are discarded after each client — never reused. Our professionals carry fresh linens, disposable capes, and protective coverings for furniture and floors. When a stylist leaves your space, you would never know they were there — except for how great you look.
            </p>
            <p>
              We are equally particular about product quality. Our professionals use salon-grade, professional-quality products from trusted brands — not drugstore substitutes. Whether it is hair color, skincare serums, nail polish, or styling products, everything that touches your skin or hair is the same caliber you would find at a premium NYC salon. If you have allergies, sensitivities, or product preferences, let us know when you book and we will make sure your stylist comes prepared with appropriate alternatives. And our commitment to quality does not stop after the appointment. We actively collect client feedback after every booking and use that feedback to maintain our standards, identify areas for improvement, and ensure that every professional in our network consistently delivers the exceptional results our clients expect.
            </p>
          </div>
        </div>
      </section>

      {/* ── Who We Serve ── */}
      <section className="bg-purple-50/50 px-6 py-16 md:py-20">
        <div className="mx-auto max-w-4xl">
          <div className="mb-4 flex items-center gap-2 text-purple-600">
            <Sparkle className="h-3 w-3" />
            <span className="text-xs font-semibold uppercase tracking-[0.2em] font-display">Who We Serve</span>
          </div>
          <h2 className="font-display mb-4 text-3xl font-bold tracking-tight text-charcoal md:text-4xl">
            Built for every New Yorker
          </h2>
          <p className="mb-10 max-w-2xl text-lg leading-relaxed text-gray-600">
            The NYC Mobile Salon serves a wide range of clients across all five boroughs. Whether you are an individual looking for convenience, a bride preparing for the biggest day of your life, a corporate team planning a wellness event, or a group celebrating a milestone — we have the professionals, the experience, and the flexibility to deliver exactly what you need.
          </p>
          <div className="grid gap-6 sm:grid-cols-2">
            {[
              {
                title: "Individuals",
                desc: "Busy professionals who do not have time to commute to a salon. New parents who cannot easily leave the house. Elderly clients who prefer the comfort of home. People recovering from illness or surgery who still want to feel their best. Remote workers who want to look polished for video calls without leaving their apartment. Anyone who values their time and wants salon-quality results without the hassle of a traditional salon visit. Our individual appointments cover everything from quick blowouts and manicures to full color services, facials, and men's grooming.",
              },
              {
                title: "Brides & Wedding Parties",
                desc: "Your wedding day is not the day to gamble on an untested stylist or stress about getting your entire bridal party across town to a salon. The NYC Mobile Salon brings the entire glam squad to your getting-ready location — whether it is a hotel suite, a private residence, or the venue itself. We handle hair styling, makeup, nail touch-ups, and more for the bride, bridesmaids, mothers, flower girls, and anyone else who wants to look their absolute best. We assign multiple professionals for larger parties so everyone is ready on time, looking flawless.",
              },
              {
                title: "Corporate & Teams",
                desc: "Companies across New York City partner with us for corporate wellness days, team appreciation events, client entertainment, and conference perks. We set up stations at your office, coworking space, or event venue and provide services like express blowouts, mini facials, manicures, and chair massages. It is an unforgettable perk that boosts morale, shows employees you care, and impresses clients. We handle all logistics, setup, and cleanup. Just give us a date, a headcount, and a location, and we take care of the rest.",
              },
              {
                title: "Social Events & Celebrations",
                desc: "Birthday parties, bachelorette weekends, girls' nights, sweet sixteens, prom prep, baby showers, holiday gatherings, reunion dinners — any event where your group wants to look and feel amazing. We bring the salon experience to your celebration with multiple professionals, full service menus, and a fun, social atmosphere. We also offer hands-on beauty classes as group activities — learn to do your own blowout, master everyday makeup, or try nail art techniques with a professional instructor guiding you through every step.",
              },
            ].map((card) => (
              <div key={card.title} className="rounded-xl border border-purple-100 bg-white p-6">
                <div className="mb-3 flex items-start gap-3">
                  <CheckIcon />
                  <h3 className="font-display text-lg font-bold text-charcoal">{card.title}</h3>
                </div>
                <p className="text-sm leading-relaxed text-gray-600">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Our Services ── */}
      <section className="bg-white px-6 py-16 md:py-20">
        <div className="mx-auto max-w-4xl">
          <div className="mb-4 flex items-center gap-2 text-purple-600">
            <Sparkle className="h-3 w-3" />
            <span className="text-xs font-semibold uppercase tracking-[0.2em] font-display">Our Services</span>
          </div>
          <h2 className="font-display mb-8 text-3xl font-bold tracking-tight text-charcoal md:text-4xl">
            37+ mobile beauty services delivered to your door
          </h2>
          <div className="space-y-5 text-lg leading-relaxed text-gray-600">
            <p>
              The NYC Mobile Salon offers a comprehensive menu of professional beauty services that rivals — and often exceeds — what you would find at a traditional brick-and-mortar salon. Every service is performed by a licensed professional using salon-grade products and tools, and every appointment includes travel, setup, cleanup, and all supplies at no additional cost. Here is an overview of our service categories:
            </p>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {[
              {
                title: "Women's Hair",
                desc: "Blowouts, cuts, color, highlights, balayage, braids, updos, extensions, keratin treatments, deep conditioning, and more. Whether you need a quick style refresh or a full color transformation, our licensed hairstylists deliver salon-quality results in your space.",
                link: "/services/womens",
              },
              {
                title: "Nails",
                desc: "Classic manicures, gel manicures, dip powder, pedicures, nail art, nail repair, and custom designs. Our licensed nail technicians bring everything — UV lamps, polishes, tools, and sanitation supplies — for a full nail salon experience at your location.",
                link: "/services/womens",
              },
              {
                title: "Makeup",
                desc: "Natural everyday looks, full glam, editorial, bridal, and special occasion makeup. Our licensed makeup artists work with professional-grade products and techniques to create looks that photograph beautifully and last all day or night.",
                link: "/services/full-glam-makeup",
              },
              {
                title: "Skincare",
                desc: "Professional facials, chemical peels, extractions, hydrating treatments, and customized skincare consultations. Our licensed estheticians assess your skin type and concerns to deliver targeted treatments that leave your skin glowing.",
                link: "/services/skincare-facial",
              },
              {
                title: "Waxing",
                desc: "Brow shaping, lip, chin, underarm, bikini, Brazilian, full leg, and full body waxing services. Our estheticians use premium hard and soft wax formulas appropriate for each area, with strict single-use hygiene protocols for every client.",
                link: "/services/womens",
              },
              {
                title: "Men's Grooming",
                desc: "Haircuts, fades, beard trims, lineup and edge-ups, hot towel shaves, and complete grooming packages. Our licensed barbers and men's stylists deliver precision cuts and expert grooming in the comfort of your home or office.",
                link: "/services/mens-haircut-and-style",
              },
              {
                title: "Events",
                desc: "Bridal parties, bachelorettes, corporate events, birthday celebrations, holiday parties, prom prep, and more. We bring multiple professionals for group bookings so everyone gets dedicated attention without long waits.",
                link: "/events",
              },
              {
                title: "Beauty Classes",
                desc: "Hands-on workshops where you learn professional techniques from licensed beauty pros. Blowout basics, everyday makeup, nail art, skincare routines, and more — perfect for groups, parties, and team-building events.",
                link: "/classes",
              },
            ].map((svc) => (
              <Link key={svc.title} href={svc.link} className="group rounded-xl border border-purple-100 bg-white p-6 transition hover:border-purple-300 hover:shadow-md">
                <h3 className="font-display text-lg font-bold text-charcoal group-hover:text-purple-600">{svc.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">{svc.desc}</p>
                <span className="mt-3 inline-block text-sm font-semibold text-purple-600">View services &rarr;</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Coverage ── */}
      <section className="bg-purple-50/50 px-6 py-16 md:py-20">
        <div className="mx-auto max-w-4xl">
          <div className="mb-4 flex items-center gap-2 text-purple-600">
            <Sparkle className="h-3 w-3" />
            <span className="text-xs font-semibold uppercase tracking-[0.2em] font-display">Coverage Area</span>
          </div>
          <h2 className="font-display mb-4 text-3xl font-bold tracking-tight text-charcoal md:text-4xl">
            Mobile beauty services across all 5 NYC boroughs
          </h2>
          <p className="mb-10 max-w-2xl text-lg leading-relaxed text-gray-600">
            The NYC Mobile Salon serves every borough in New York City — from the northern tip of The Bronx to the southern shore of Staten Island, from the brownstones of Brooklyn to the high-rises of Manhattan and the diverse neighborhoods of Queens. No matter where you are in NYC, a licensed beauty professional can be at your door. Click on your borough below to explore our coverage in your area and find mobile beauty services near you.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { name: "Manhattan", slug: "manhattan", neighborhoods: "Upper East Side, Upper West Side, Midtown, Chelsea, West Village, SoHo, Tribeca, Harlem, Financial District, and more" },
              { name: "Brooklyn", slug: "brooklyn", neighborhoods: "Williamsburg, Park Slope, DUMBO, Brooklyn Heights, Bushwick, Bed-Stuy, Bay Ridge, Prospect Heights, Crown Heights, and more" },
              { name: "Queens", slug: "queens", neighborhoods: "Astoria, Long Island City, Forest Hills, Flushing, Jackson Heights, Bayside, Woodside, Sunnyside, Ridgewood, and more" },
              { name: "The Bronx", slug: "bronx", neighborhoods: "Riverdale, Fordham, Pelham Bay, Throggs Neck, Mott Haven, Kingsbridge, Morris Park, Wakefield, and more" },
              { name: "Staten Island", slug: "staten-island", neighborhoods: "St. George, Tottenville, Great Kills, New Dorp, Todt Hill, West Brighton, Stapleton, Eltingville, and more" },
            ].map((borough) => (
              <Link key={borough.slug} href={`/locations/${borough.slug}`} className="group rounded-xl border border-purple-100 bg-white p-6 transition hover:border-purple-300 hover:shadow-md">
                <h3 className="font-display text-lg font-bold text-charcoal group-hover:text-purple-600">{borough.name}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-500">{borough.neighborhoods}</p>
                <span className="mt-3 inline-block text-sm font-semibold text-purple-600">Explore {borough.name} &rarr;</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="bg-white px-6 py-16 md:py-20">
        <div className="mx-auto max-w-4xl">
          <div className="mb-4 flex items-center gap-2 text-purple-600">
            <Sparkle className="h-3 w-3" />
            <span className="text-xs font-semibold uppercase tracking-[0.2em] font-display">Frequently Asked Questions</span>
          </div>
          <h2 className="font-display mb-10 text-3xl font-bold tracking-tight text-charcoal md:text-4xl">
            Common questions about The NYC Mobile Salon
          </h2>
          <div className="space-y-6">
            {faqs.map((faq) => (
              <div key={faq.q} className="rounded-xl border border-purple-100 bg-white p-6">
                <h3 className="font-display text-lg font-bold text-charcoal">{faq.q}</h3>
                <p className="mt-3 leading-relaxed text-gray-600">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="bg-purple-50/50 px-6 py-16 md:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-4 flex items-center justify-center gap-2 text-purple-600">
            <Sparkle className="h-3 w-3" />
            <span className="text-xs font-semibold uppercase tracking-[0.2em] font-display">Get Started</span>
            <Sparkle className="h-3 w-3" />
          </div>
          <h2 className="font-display mb-6 text-3xl font-bold tracking-tight text-charcoal md:text-4xl">
            Ready to experience the difference?
          </h2>
          <p className="mx-auto mb-8 max-w-xl text-lg leading-relaxed text-gray-600">
            Join thousands of New Yorkers who have already made the switch from traditional salons to The NYC Mobile Salon. Book a licensed beauty professional today and discover what it feels like to get salon-quality service in the comfort of your own space — on your schedule, on your terms, anywhere in all five NYC boroughs.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/book" className="rounded-full bg-purple-600 px-9 py-3.5 text-sm font-semibold uppercase tracking-wider text-white shadow-lg shadow-purple-500/20 transition hover:-translate-y-0.5 hover:bg-purple-700 font-display">Book Now</Link>
            <Link href="/services" className="rounded-full border-2 border-purple-600 px-9 py-3.5 text-sm font-semibold uppercase tracking-wider text-purple-600 transition hover:-translate-y-0.5 hover:bg-purple-50 font-display">Browse Services</Link>
          </div>
        </div>
      </section>
    </>
  );
}
