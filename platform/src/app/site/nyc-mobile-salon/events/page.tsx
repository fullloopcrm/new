import type { Metadata } from "next";
import Link from "next/link";
import { eventCategories, boroughNames, neighborhoods } from "@/app/site/nyc-mobile-salon/_lib/constants";
import { eventContent } from "@/app/site/nyc-mobile-salon/_lib/event-content";
import { faqSchema, breadcrumbSchema } from "@/app/site/nyc-mobile-salon/_lib/seo";

export const metadata: Metadata = {
  title: "Mobile Event Beauty Services in NYC | Bridal, Corporate, Parties — All 5 Boroughs",
  description:
    "Mobile beauty for every event. Bridal parties, corporate events, birthdays, content shoots, prom prep, bachelorettes & more — licensed pros come to your venue anywhere in NYC. $99/hr, 2hr min for groups of 3+. Get a free quote.",
  alternates: { canonical: "https://thenycmobilesalon.com/events" },
  openGraph: {
    title: "Mobile Event Beauty Services in NYC | Bridal, Corporate, Parties — All 5 Boroughs",
    description:
      "Mobile beauty for every event. Bridal parties, corporate events, birthdays, content shoots, prom prep, bachelorettes & more — licensed pros come to your venue anywhere in NYC. $99/hr, 2hr min for groups of 3+. Get a free quote.",
    url: "https://thenycmobilesalon.com/events",
  },
};

const eventFaqs = [
  {
    q: "How far in advance should I book an event?",
    a: "We recommend booking at least 2-4 weeks ahead for small events like birthday parties or girls' night in, and 2-3 months for weddings, large corporate events, or anything during peak season (May through October). The earlier you reach out, the more flexibility we have with scheduling and staffing. That said, we do accommodate last-minute bookings when our calendar allows — reach out and we'll do our best to make it work on short notice.",
  },
  {
    q: "How many stylists will come to my event?",
    a: "We scale our team to match your group size, timeline, and the complexity of services requested. For a party of 6-8 getting blowouts and makeup, we typically send 2-3 professionals working simultaneously so everyone is ready within a couple of hours. For weddings and large celebrations with 15+ people, we deploy full teams of 4-6+ stylists and makeup artists who coordinate seamlessly. During your consultation, we build a detailed timeline that ensures everyone is camera-ready right on schedule — no one is left waiting, and the bride always goes last for maximum freshness.",
  },
  {
    q: "Can we customize the services for our group?",
    a: "Absolutely — every event package is fully customizable, and that is one of the biggest advantages of working with us. You can mix and match blowouts, updos, full glam makeup, natural makeup, gel manicures, pedicures, express facials, lash applications, and more to fit your group's preferences and budget. Some guests might want the full works while others just want a blowout — we accommodate individual preferences within the group booking. We will work with you during the planning phase to build a service menu that makes sense for your event, your timeline, and your budget.",
  },
  {
    q: "Do you provide services for men's events too?",
    a: "Yes, we absolutely do. We offer full men's grooming packages including fades, haircuts, beard trims, hot towel shaves, lineup and edge-up services, brow cleanups, and even men's manicures and pedicures. Bachelor parties, groomsmen prep sessions, corporate events with mixed-gender teams, and group grooming sessions are all popular bookings. Our barbers and grooming specialists are experienced with all hair types and textures, and they bring the full barbershop experience directly to your location.",
  },
  {
    q: "What about venues — do you work in hotels, offices, and homes?",
    a: "We work anywhere with electricity and a bit of space. We have done events in Manhattan penthouses, Brooklyn Airbnbs, Queens banquet halls, Bronx community centers, Staten Island homes, Midtown hotel suites, corporate offices on Park Avenue, rooftop terraces, parks, event venues, lofts, studios, and even backstage at concert venues. We bring all of our own equipment — professional chairs, mirrors, lighting, tools, products, sanitization supplies, and backup gear. All we need from you is access to power outlets and enough room for our team to set up stations.",
  },
  {
    q: "Is there a minimum group size for event bookings?",
    a: "Our event pricing of $99 per hour with a 2-hour minimum kicks in for groups of 3 or more people. However, we are flexible and can accommodate smaller bookings as well — even a solo bridal glam session qualifies as an event booking with its own pricing structure. For larger groups of 10 or more, we offer custom packages that can bring the per-person cost down significantly. Contact us with your group size and we will put together a tailored quote that works for your budget.",
  },
  {
    q: "What is the cancellation and rescheduling policy for events?",
    a: "We understand that plans change, especially in New York City. For events, we ask for at least 48 hours notice for cancellations or reschedules with no penalty. Cancellations within 48 hours may be subject to a partial fee, depending on the size of the booking and how many team members we have already scheduled. For weddings and large-scale events, we have a separate deposit and cancellation policy that we walk you through during your initial consultation. Our goal is always to be fair and flexible.",
  },
  {
    q: "Do you charge travel fees for event bookings?",
    a: "No, we do not charge travel fees for event bookings anywhere within the five boroughs of New York City. Whether your event is in the Financial District, Astoria, Park Slope, Riverdale, or Tottenville, the price is the same. Our team travels to you with all equipment and supplies included in the quoted rate. There are no hidden surcharges, no fuel fees, no setup fees, and no surprise upcharges on the day of your event. The price we quote is the price you pay.",
  },
  {
    q: "What products and brands do you use?",
    a: "Our stylists and makeup artists use professional-grade products from top salon and beauty brands. For hair, we work with products from brands like Oribe, Bumble and bumble, Moroccanoil, and Redken. For makeup, our artists carry professional lines including MAC, NARS, Charlotte Tilbury, and Make Up For Ever. For nails, we use OPI, Essie, and CND. We can also accommodate special requests if you have a preferred brand or if anyone in your group has allergies or sensitivities — just let us know during the booking process.",
  },
  {
    q: "How does payment work for event bookings?",
    a: "For most events, we collect a deposit at the time of booking to secure your date and team. The remaining balance is due on the day of the event. We accept all major credit cards, Venmo, Zelle, and cash. For large events like weddings and corporate bookings, we can set up a custom payment schedule with milestone payments leading up to the event date. We provide a detailed invoice that breaks down every service and cost so there are no surprises. Gratuity is always appreciated but never required.",
  },
];

const categoryIntros: Record<string, string[]> = {
  bridal: [
    "Your wedding is the most photographed day of your life, and every detail matters — from the first look to the last dance. The NYC Mobile Salon's bridal beauty team specializes in creating timeless, camera-ready looks that hold up through every emotional moment, every hug, and every hour on the dance floor. We come to your hotel suite, your home, your Airbnb, or your venue with a full team of licensed hair stylists and makeup artists who work in parallel so your entire bridal party is ready exactly when they need to be.",
    "What makes mobile bridal beauty different from booking a salon? Everything. When you go the traditional route, you are coordinating transportation for multiple people to a salon at the crack of dawn, then rushing back to the venue for photos. With us, everyone gets ready together in one space. The photographer captures the getting-ready moments. The champagne flows. The energy builds naturally. And nobody has to sit in traffic with a fresh updo worrying about humidity. We handle all the logistics — timeline, team coordination, setup, products, tools, and cleanup — so you can focus on enjoying the morning of the biggest day of your life.",
    "We offer everything from solo bridal glam packages to full bridal party hair and makeup for groups of 15 or more. Our bridal trial runs ensure zero surprises on the wedding day. And for engagement sessions, boudoir shoots, rehearsal dinners, and bridal showers, we have dedicated packages designed for each milestone on the road to your wedding.",
  ],
  parties: [
    "Celebrations are better when everyone looks and feels amazing, and that is exactly what our party and celebration beauty packages deliver. Whether it is a milestone birthday in a Tribeca loft, a bachelorette weekend at an Airbnb in Williamsburg, a Sweet 16 in a Queens banquet hall, or a casual girls' night in at your apartment, The NYC Mobile Salon brings a full team of beauty professionals directly to your location with everything needed to transform your group.",
    "Our party packages are fully customizable because no two celebrations are alike. Some groups want full glam — blowouts, updos, full-face makeup, gel manicures, lash applications — while others want something more relaxed, like express facials, simple blowouts, and classic manicures. You build the menu, we build the team. Multiple professionals work simultaneously so even a group of 15 can be fully glammed up in a couple of hours. We bring all the tools, products, stations, mirrors, and lighting. You bring the music and the guest list.",
    "Our most popular party bookings include birthday glam parties, bachelorette pampering sessions, prom prep parties, and spa days at home. We also do baby shower pampering, Sweet 16 and quinceanera glam, and girls' night in packages. Every booking starts at $99 per hour with a 2-hour minimum for groups of 3 or more, and we never charge travel fees anywhere in the five boroughs.",
  ],
  corporate: [
    "Corporate beauty and wellness services are one of the most impactful employee perks a company can offer, and The NYC Mobile Salon makes it effortless to bring that experience directly to your office, conference, or corporate event. We set up professional beauty stations in your conference room, lounge, or common area and run services in quick 15-30 minute slots so your team can rotate through without losing an entire workday. Popular corporate services include express manicures, brow cleanups, blowout touch-ups, hand massages, and mini facials.",
    "We have provided on-site beauty services for companies across every industry in New York City — from tech startups in Flatiron to law firms in Midtown, media companies in Hudson Yards to financial firms in the Financial District. Our corporate packages are designed for Employee Appreciation Day, Women's History Month, Mental Health Awareness initiatives, end-of-quarter celebrations, holiday parties, and frankly, any regular day when your team could use a morale boost. We handle all scheduling, setup, and cleanup, and we can brand the experience with custom signage for sponsor activations or company events.",
    "Beyond office wellness days, we offer headshot and photo shoot styling for team websites and LinkedIn profiles, conference touch-up stations for trade shows and networking events, and employee appreciation glam sessions. For conferences and trade shows, our beauty stations serve as high-impact experiential marketing activations that drive foot traffic and create memorable impressions with attendees.",
  ],
  "film-photo-content": [
    "The NYC Mobile Salon provides production-grade hair and makeup services for film, television, commercial shoots, music videos, content creation, editorial projects, and red carpet events throughout all five boroughs. Our on-set team understands the unique demands of production environments — early call times, quick turnarounds, continuity requirements, and the pressure of working within tight shooting schedules. We bring professional kits stocked with everything from natural beauty looks to full editorial glam, and our artists are experienced with HD, 4K, and high-contrast lighting requirements.",
    "For content creators, influencers, YouTubers, podcasters, and social media professionals, we offer dedicated packages designed for fast, camera-ready results. Our stylists understand how different platforms affect how makeup reads on camera, and they can pivot between multiple looks for different content pieces in a single session. Regulars can lock in recurring weekly or monthly bookings at preferred rates. For editorial and lookbook shoots, our artists collaborate directly with photographers, creative directors, and designers to bring creative visions to life across every genre, era, and aesthetic.",
    "We also provide red carpet and press prep services for celebrities, public figures, executives, and VIPs preparing for premieres, galas, award shows, and media appearances. Our red carpet team creates looks designed to shine under flash photography and stage lighting while still looking natural up close. We coordinate with wardrobe stylists and publicists, and we maintain absolute discretion and professionalism on every booking.",
  ],
  community: [
    "Beauty is for everyone, and The NYC Mobile Salon is proud to offer community-focused beauty services that bring dignity, confidence, and care to people who need it most. Our community and specialty event packages serve senior living facilities, hospitals, shelters, nonprofit organizations, schools, and community centers across all five boroughs. These are some of the most meaningful bookings we do, and our team approaches every one with the same professionalism and attention to detail as our highest-profile events.",
    "For senior homes and assisted living facilities, our gentle, experienced stylists provide haircuts, wash and sets, blowouts, manicures, and hand massages that brighten residents' days and give them something to look forward to. For hospitals and recovery settings, we bring compassionate pampering services using hypoallergenic products and gentle techniques, coordinating with medical staff to ensure safety and comfort. These small acts of beauty care can make a profound difference during difficult times.",
    "We partner with shelters, workforce development programs, and community nonprofits to provide confidence-boosting haircuts, styling, manicures, and makeup for people preparing for job interviews, milestones, and fresh starts. We also offer back-to-school kids' haircut events for families and community organizations. For nonprofit and community bookings, we offer donated or significantly reduced rates — contact us to discuss how we can work together.",
  ],
};

function Sparkle({ className = "" }: { className?: string }) {
  return (
    <svg className={`inline-block ${className}`} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0L14.59 8.41L23 11L14.59 13.59L12 22L9.41 13.59L1 11L9.41 8.41L12 0Z" />
    </svg>
  );
}

export default function EventsPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(
        faqSchema(eventFaqs)
      ) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(
        breadcrumbSchema([{ name: "Home", url: "/" }, { name: "Events", url: "/events" }])
      ) }} />

      {/* Hero */}
      <section className="relative overflow-hidden px-4 py-20 md:py-28" style={{ background: "linear-gradient(135deg, #D4749B 0%, #E8A0BF 40%, #C9A96E 100%)" }}>
        <div className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-32 bottom-0 h-60 w-60 rounded-full bg-white/5 blur-3xl" />
        <div className="relative mx-auto max-w-4xl text-center">
          <div className="mb-4 flex items-center justify-center gap-2">
            <Sparkle className="h-4 w-4 text-white/60" />
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">Events & Group Bookings</span>
            <Sparkle className="h-4 w-4 text-white/60" />
          </div>
          <h1 className="font-display mb-6 text-5xl font-bold tracking-tight text-white md:text-6xl lg:text-7xl">
            Mobile Event Beauty <span className="italic">Services in NYC</span>
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-white/80">
            Bridal parties, corporate events, birthdays, content shoots, prom prep, bachelorettes, and more — our team of licensed professionals arrives at your venue with everything needed. 23 event types across all five NYC boroughs. $99/hour with a 2-hour minimum for groups of 3+. No travel fees, ever.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/book" className="btn-rose">Get a Free Quote</Link>
            <Link href="/pricing" className="btn-outline-white">See Pricing</Link>
          </div>
        </div>
      </section>

      {/* Intro */}
      <section className="bg-white px-6 py-16 md:py-20">
        <div className="mx-auto max-w-4xl">
          <h2 className="font-display mb-8 text-3xl font-medium tracking-tight text-charcoal md:text-4xl">
            Mobile event beauty services for every occasion in New York City
          </h2>
          <div className="space-y-5 text-lg leading-relaxed text-gray-600">
            <p>
              The NYC Mobile Salon specializes in group and event beauty services across all five boroughs of New York City. Whether you are planning a <Link href="/events/bridal-hair-and-makeup" className="text-blush-dark hover:underline">wedding</Link>, a <Link href="/events/birthday-glam-party" className="text-blush-dark hover:underline">birthday party</Link>, a <Link href="/events/office-wellness-day" className="text-blush-dark hover:underline">corporate wellness day</Link>, a <Link href="/events/on-set-hair-and-makeup" className="text-blush-dark hover:underline">film or photo shoot</Link>, or a <Link href="/events/senior-home-salon-day" className="text-blush-dark hover:underline">community outreach event</Link>, we send a full team of licensed hair stylists, makeup artists, nail technicians, and estheticians directly to your location with all of the equipment, products, and supplies needed to make every person in your group look and feel incredible.
            </p>
            <p>
              Our event beauty services span five major categories: bridal, parties and celebrations, corporate and professional, film and photo production, and community and specialty events. Within those five categories, we offer 23 distinct event types — each with its own dedicated service menu, staffing approach, and pricing structure. From a solo bride getting glammed up in her hotel suite to a 200-person corporate wellness day in a Midtown office tower, we have the team, the experience, and the logistics to handle events of any size and complexity anywhere in Manhattan, Brooklyn, Queens, the Bronx, and Staten Island.
            </p>
            <p>
              What sets mobile event beauty apart from the traditional salon approach? When you coordinate a group at a salon, you are dealing with individual appointments spread across different time slots, transportation logistics, and the stress of getting everyone to the same place on time. With The NYC Mobile Salon, everyone gets ready together in one location. Our team arrives with professional stations, lighting, mirrors, and a full inventory of products. Multiple professionals work simultaneously so a group of 10 does not take 10 hours. The getting-ready experience becomes part of the event itself — relaxed, communal, and fun rather than a logistical headache.
            </p>
            <p>
              Our event pricing starts at $99 per hour with a 2-hour minimum for groups of 3 or more people. There are no travel fees anywhere in the five boroughs, no setup charges, and no surprise upcharges on the day of your event. For larger events and weddings, we offer custom packages with per-person pricing that can bring the cost down significantly. Every event starts with a free consultation where we learn about your vision, your group size, your timeline, and your budget, and we put together a tailored proposal that covers every detail. Visit our <Link href="/pricing" className="text-blush-dark hover:underline">pricing page</Link> for more information on rates and packages.
            </p>
            <p>
              We handle everything from start to finish — initial consultation, team staffing, timeline planning, day-of coordination, setup, service delivery, and cleanup. You tell us what you need, how many people, when, and where, and we take care of the rest. Our event coordinators work with you to build a minute-by-minute schedule that ensures everyone is ready exactly when they need to be, whether that means the bride is camera-ready before the photographer arrives at 10am or the entire corporate team has fresh headshot styling before the shoot at 2pm. That level of planning and precision is what makes The NYC Mobile Salon the top choice for event beauty services in New York City.
            </p>
            <p>
              Ready to start planning? <Link href="/book" className="text-blush-dark hover:underline">Request a free quote</Link> and tell us about your event. We respond to every inquiry within 24 hours with a detailed proposal tailored to your needs. Browse the event categories below to learn more about each type of event we serve.
            </p>
          </div>
        </div>
      </section>

      {/* Event Categories */}
      {eventCategories.map((cat, catIdx) => (
        <section key={cat.slug} className={`px-4 py-16 md:py-20 ${catIdx % 2 === 0 ? "bg-blush-light" : "bg-white"}`}>
          <div className="mx-auto max-w-6xl">
            <div className="mb-10">
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-blush-dark">
                <Sparkle className="mr-1 h-3 w-3" /> {cat.title}
              </p>
              <h2 className="font-display text-3xl font-medium tracking-tight text-charcoal md:text-4xl">
                {cat.title}
              </h2>
              <p className="mt-2 text-lg text-gray-500">{cat.description}</p>
            </div>

            {/* Category intro paragraphs */}
            {categoryIntros[cat.slug] && (
              <div className="mb-10 space-y-4 text-base leading-relaxed text-gray-600">
                {categoryIntros[cat.slug].map((paragraph, pIdx) => (
                  <p key={pIdx}>{paragraph}</p>
                ))}
              </div>
            )}

            <div className="grid gap-6 md:grid-cols-2">
              {cat.items.map((item) => {
                const content = eventContent[item.slug];
                return (
                  <Link key={item.slug} href={`/events/${item.slug}`} className="group rounded-xl border border-pink-100 bg-white p-6 transition-all hover:shadow-md hover:shadow-pink-500/10">
                    <h3 className="font-display mb-2 text-xl font-semibold text-charcoal group-hover:text-blush-dark transition-colors">{item.name}</h3>
                    <p className="mb-3 text-sm text-gray-500">{item.description}</p>
                    {content && (
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>{content.groupSize}</span>
                        <span className="text-gray-300">|</span>
                        <span>From {content.price}</span>
                        <span className="ml-auto font-semibold text-blush-dark group-hover:translate-x-1 transition-transform">&rarr;</span>
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      ))}

      {/* Why Mobile Event Beauty */}
      <section className="bg-white px-6 py-16 md:py-20">
        <div className="mx-auto max-w-4xl">
          <p className="mb-3 text-center text-xs font-semibold uppercase tracking-widest text-blush-dark">
            <Sparkle className="mr-1 h-3 w-3" /> The Mobile Advantage
          </p>
          <h2 className="font-display mb-10 text-center text-3xl font-medium tracking-tight text-charcoal md:text-4xl">
            Why mobile event beauty is better than going to a salon
          </h2>
          <div className="space-y-5 text-lg leading-relaxed text-gray-600">
            <p>
              Coordinating a group of people at a traditional salon is one of the most stressful parts of planning any event. You are juggling multiple appointment times, hoping everyone shows up on time, dealing with transportation across the city, and praying that the salon can accommodate your entire group without running behind schedule. By the time everyone is done, half the group has been waiting for hours and the energy is flat. Mobile event beauty eliminates all of that friction. Your team arrives at the location where the event is happening — or wherever the group is staying — and everyone gets ready together in the same space, at the same time, surrounded by the people they are celebrating with.
            </p>
            <p>
              The getting-ready experience is often one of the most memorable parts of any event, especially weddings, birthdays, and bachelorette weekends. When everyone is in the same room getting pampered simultaneously, the energy is completely different than a scattered morning of individual salon visits. The music is playing, the conversation is flowing, and the anticipation builds naturally as each person&apos;s look comes together. Our photographers and videographers love it too — the getting-ready photos and footage are some of the most candid, joyful content from any event. That communal experience simply does not happen when people are getting ready in isolation at different salons across the city.
            </p>
            <p>
              From a logistics standpoint, mobile event beauty is simply more efficient. We bring the exact number of professionals your group needs, and they all work simultaneously. A bridal party of 8 does not take 8 hours — it takes 2-3 hours with a team of 3-4 stylists working in parallel. We build a minute-by-minute timeline during the planning phase so every person knows exactly when they are in the chair, and the entire group is ready with time to spare before the next phase of the event begins. There is no waiting, no rushing, and no last-minute panic. We have done this hundreds of times and our coordination is dialed in.
            </p>
            <p>
              Flexibility is another major advantage. We work in any space with electricity — apartments, hotel suites, Airbnbs, offices, event venues, backyards, rooftops, lofts, community centers, even parks. We bring all of our own equipment including professional chairs, mirrors, lighting rigs, product stations, and sanitization supplies. You do not need to arrange anything special or prepare the space in advance beyond making sure we have access and outlets. And because we come to you, there is no travel time eating into your schedule. The moment we arrive, we start setting up, and within minutes your group is getting pampered. That kind of flexibility and efficiency is why event planners, wedding coordinators, and corporate HR teams across New York City choose The NYC Mobile Salon over traditional salon bookings for their events.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works for Events */}
      <section className="bg-blush-light px-6 py-16 md:py-20">
        <div className="mx-auto max-w-5xl">
          <p className="mb-3 text-center text-xs font-semibold uppercase tracking-widest text-blush-dark">
            <Sparkle className="mr-1 h-3 w-3" /> Simple Process
          </p>
          <h2 className="font-display mb-12 text-center text-3xl font-medium tracking-tight text-charcoal md:text-4xl">
            How event bookings work
          </h2>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                step: "1",
                title: "Tell us about your event",
                desc: "Fill out our quick event inquiry form with your date, location, group size, and the services you are interested in. You can also text us directly. We respond to every inquiry within 24 hours.",
              },
              {
                step: "2",
                title: "We plan staffing & timeline",
                desc: "Our event coordinator puts together a custom proposal with the right number of professionals, a detailed service timeline, and transparent pricing. We work with you to finalize every detail before the event day.",
              },
              {
                step: "3",
                title: "Our team arrives ready",
                desc: "On the day of your event, our team arrives at your location on time with all equipment, products, and supplies. We set up professional stations and get right to work — no delays, no missing gear, no excuses.",
              },
              {
                step: "4",
                title: "Everyone looks amazing",
                desc: "Multiple professionals work simultaneously so your entire group is glammed up, styled, and event-ready right on schedule. We handle cleanup before we leave. You just enjoy the compliments.",
              },
            ].map((item) => (
              <div key={item.step} className="rounded-xl border border-pink-100 bg-white p-6 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blush-light text-xl font-bold text-blush-dark">
                  {item.step}
                </div>
                <h3 className="font-display mb-3 text-lg font-semibold text-charcoal">{item.title}</h3>
                <p className="text-sm leading-relaxed text-gray-500">{item.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <p className="mb-4 text-gray-600">Ready to get started? The first step is telling us about your event.</p>
            <Link href="/book" className="btn-rose">Request a Free Quote</Link>
          </div>
        </div>
      </section>

      {/* Pricing for Events */}
      <section className="bg-white px-6 py-16 md:py-20">
        <div className="mx-auto max-w-4xl">
          <p className="mb-3 text-center text-xs font-semibold uppercase tracking-widest text-blush-dark">
            <Sparkle className="mr-1 h-3 w-3" /> Transparent Pricing
          </p>
          <h2 className="font-display mb-10 text-center text-3xl font-medium tracking-tight text-charcoal md:text-4xl">
            Event pricing that makes sense
          </h2>
          <div className="space-y-5 text-lg leading-relaxed text-gray-600">
            <p>
              Our event beauty services start at <strong className="text-charcoal">$99 per hour</strong> with a <strong className="text-charcoal">2-hour minimum</strong> for groups of 3 or more people. That rate covers the professional&apos;s time, all tools and products, travel to your location anywhere in the five boroughs, setup, and cleanup. There are no travel fees, no setup fees, no hidden surcharges, and no surprise upcharges on the day of your event. The price we quote during your consultation is the price you pay.
            </p>
            <p>
              For larger events — weddings with full bridal parties, corporate wellness days with 50+ employees, multi-day production shoots — we offer custom packages with per-person pricing, day rates, and volume discounts that can bring the overall cost down significantly. Every custom package is built specifically for your event based on your group size, the services requested, the timeline, and the complexity of the booking. Our event coordinators work with you to find the right balance between comprehensive service and budget.
            </p>
            <p>
              Specialty events like bridal glam, on-set production work, red carpet prep, and editorial styling have their own pricing tiers that reflect the advanced skill level and specialized products required. You can browse individual event pages for starting prices, or <Link href="/pricing" className="text-blush-dark hover:underline">visit our pricing page</Link> for a full breakdown of rates across all services. For the fastest and most accurate quote, <Link href="/book" className="text-blush-dark hover:underline">submit an event inquiry</Link> with your details and we will have a custom proposal in your inbox within 24 hours.
            </p>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-pink-100 bg-blush-light p-6 text-center">
              <p className="font-display text-3xl font-bold text-blush-dark">$99/hr</p>
              <p className="mt-1 text-sm text-gray-500">Starting rate for events</p>
            </div>
            <div className="rounded-xl border border-pink-100 bg-blush-light p-6 text-center">
              <p className="font-display text-3xl font-bold text-blush-dark">2hr min</p>
              <p className="mt-1 text-sm text-gray-500">For groups of 3+</p>
            </div>
            <div className="rounded-xl border border-pink-100 bg-blush-light p-6 text-center">
              <p className="font-display text-3xl font-bold text-blush-dark">$0</p>
              <p className="mt-1 text-sm text-gray-500">Travel fees — always free</p>
            </div>
          </div>
        </div>
      </section>

      {/* Available by Borough */}
      <section className="bg-blush-light px-4 py-16 md:py-20">
        <div className="mx-auto max-w-5xl text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-blush-dark">
            <Sparkle className="mr-1 h-3 w-3" /> By Location
          </p>
          <h2 className="font-display mb-4 text-3xl font-medium tracking-tight text-charcoal md:text-4xl">
            Event services across all five boroughs
          </h2>
          <p className="mx-auto mb-8 max-w-2xl text-gray-500">
            No matter where your event is happening in New York City, our team will be there. We serve every neighborhood in Manhattan, Brooklyn, Queens, the Bronx, and Staten Island — same pricing, same quality, no travel fees.
          </p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
            {Object.entries(boroughNames).map(([slug, name]) => (
              <Link key={slug} href={`/locations/${slug}`} className="card-hover rounded-xl border border-pink-100 bg-white p-6 text-center">
                <p className="text-lg font-semibold text-charcoal">{name}</p>
                <p className="mt-1 text-xs text-blush-dark">{neighborhoods[slug]?.length} neighborhoods &rarr;</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-white px-6 py-16 md:py-20">
        <div className="mx-auto max-w-3xl">
          <h2 className="font-display mb-4 text-center text-3xl font-medium tracking-tight text-charcoal md:text-4xl">
            Event booking <span className="italic">FAQ</span>
          </h2>
          <p className="mb-10 text-center text-gray-500">
            Everything you need to know about booking mobile beauty services for your event in New York City. Have a question that is not listed here? <Link href="/book" className="text-blush-dark hover:underline">Contact us</Link> and we will get back to you within 24 hours.
          </p>
          <div className="divide-y divide-pink-100">
            {eventFaqs.map((faq) => (
              <div key={faq.q} className="py-6">
                <h3 className="font-display mb-2 text-lg font-semibold text-charcoal">{faq.q}</h3>
                <p className="text-gray-600 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-blush-light px-4 py-16 md:py-20 text-center">
        <div className="mx-auto max-w-3xl">
          <Sparkle className="mx-auto mb-4 h-6 w-6 text-blush-dark" />
          <h2 className="font-display mb-4 text-3xl font-medium text-charcoal md:text-4xl">
            Have an event? <span className="italic text-gradient-rose">Let&apos;s plan it.</span>
          </h2>
          <p className="mb-4 text-lg text-gray-600">
            Whether you are planning a wedding, throwing a birthday party, organizing a corporate wellness day, prepping for a photo shoot, or coordinating a community event, The NYC Mobile Salon has the team, the experience, and the passion to make everyone look and feel their absolute best. We serve all five boroughs of New York City with no travel fees, starting at just $99 per hour with a 2-hour minimum for groups of 3 or more.
          </p>
          <p className="mb-8 text-gray-500">
            Tell us about your event and we will put together a custom package. Free quotes, no pressure, and a response within 24 hours. Your event deserves the best — let us bring it to you.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/book" className="btn-rose">
              Get a Free Quote
            </Link>
            <Link href="/pricing" className="btn-outline-rose">
              See Pricing
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
