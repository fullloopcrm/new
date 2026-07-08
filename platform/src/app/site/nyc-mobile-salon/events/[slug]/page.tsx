import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { allEvents, eventCategories, boroughNames, neighborhoods } from "@/app/site/nyc-mobile-salon/_lib/constants";
import { getEventBySlug, eventSchema, faqSchema, breadcrumbSchema } from "@/app/site/nyc-mobile-salon/_lib/seo";
import { eventContent } from "@/app/site/nyc-mobile-salon/_lib/event-content";

export const revalidate = 2592000;

export const dynamicParams = true

export async function generateStaticParams() { return [] }

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const evt = getEventBySlug(slug);
  if (!evt) return {};
  const content = eventContent[slug];
  return {
    title: `Mobile ${evt.name} in NYC — Event Beauty at Your Door`,
    description: `Book mobile ${evt.name.toLowerCase()} anywhere in NYC. ${evt.description}. Licensed professionals come to your venue.${content ? ` From ${content.price}. Groups of ${content.groupSize}.` : ""} The NYC Mobile Salon.`,
    alternates: { canonical: `https://thenycmobilesalon.com/events/${slug}` },
  };
}

function getRelatedEvents(currentSlug: string) {
  const currentCat = eventCategories.find((c) => c.items.some((i) => i.slug === currentSlug));
  if (!currentCat) return allEvents.filter((e) => e.slug !== currentSlug).slice(0, 4);
  const sameCategory = currentCat.items.filter((i) => i.slug !== currentSlug);
  const otherEvents = allEvents.filter((e) => e.slug !== currentSlug && !sameCategory.some((s) => s.slug === e.slug));
  return [...sameCategory, ...otherEvents].slice(0, 4);
}

function Sparkle({ className = "" }: { className?: string }) {
  return (
    <svg className={`inline-block ${className}`} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0L14.59 8.41L23 11L14.59 13.59L12 22L9.41 13.59L1 11L9.41 8.41L12 0Z" />
    </svg>
  );
}

export default async function EventPage({ params }: Props) {
  const { slug } = await params;
  const evt = getEventBySlug(slug);
  if (!evt) notFound();

  const content = eventContent[slug];
  const related = getRelatedEvents(slug);

  const faqs = [
    {
      q: `What's included in mobile ${evt.name.toLowerCase()} services?`,
      a: `Every mobile ${evt.name.toLowerCase()} booking includes a fully equipped team of licensed professionals who arrive at your location with all the tools, products, and supplies needed to deliver a salon-quality experience. There is no setup fee, no hidden charges, and no cleanup for you to worry about afterward. We bring professional-grade lighting, mirrors, styling tools, and premium beauty products. Our team handles setup and breakdown, sanitizes all equipment between uses, and leaves your space exactly as we found it. You also get a dedicated event coordinator who manages scheduling and communicates with your team leading up to the event.`,
    },
    {
      q: `How much does mobile ${evt.name.toLowerCase()} cost in NYC?`,
      a: `Our standard rate for mobile beauty services is $99 per hour, with a two-hour minimum for groups of three or more. This base rate covers professional hair styling, makeup application, and related beauty services performed at your location. Pricing can vary depending on the complexity of the services requested, the size of your group, and any specialized add-ons you choose. For larger events, corporate functions, or weddings, we offer custom packages designed to fit your specific needs and budget. We always provide a detailed, no-obligation quote before you commit, so there are never any surprises. Visit our pricing page for a full breakdown, or reach out for a personalized estimate based on your event details.`,
    },
    {
      q: `How far in advance should I book ${evt.name.toLowerCase()}?`,
      a: `We recommend booking your ${evt.name.toLowerCase()} at least two to four weeks in advance to guarantee availability and give us time to plan your event properly. For weddings, large corporate events, and peak-season celebrations between May and October, booking two to three months ahead is ideal. The earlier you book, the more flexibility you have with scheduling, stylist selection, and customization options. That said, we understand that life happens on short notice. If you need last-minute event beauty services, reach out anyway. We maintain a roster of on-call professionals across all five boroughs and can often accommodate bookings with as little as 48 hours' notice, depending on availability. Rush bookings may be subject to an additional fee.`,
    },
    {
      q: `Can you handle large groups for ${evt.name.toLowerCase()}?`,
      a: content
        ? `Absolutely. Our ${evt.name.toLowerCase()} packages typically serve groups of ${content.groupSize}, but we regularly scale beyond that for larger events. The way we handle large groups is simple: we send more professionals. Instead of one stylist working through a line of fifteen people, we dispatch three, four, or even five licensed artists who work simultaneously. This keeps wait times short, ensures every person gets individualized attention, and keeps your event on schedule. We have successfully staffed events ranging from intimate groups of three to corporate wellness days with two hundred employees and community events with even more. For very large bookings, we assign a dedicated event coordinator who manages the logistics, timing, and on-site flow so you can focus on enjoying the event.`
        : `We can accommodate groups of virtually any size. We scale our team to match your needs by dispatching multiple licensed professionals who work simultaneously. Whether you have five guests or fifty, we build a staffing plan that keeps wait times short and ensures everyone receives personalized, high-quality service. For very large events, we assign a dedicated coordinator to manage on-site flow and timing.`,
    },
    {
      q: `What if I need to change the date or cancel my ${evt.name.toLowerCase()} booking?`,
      a: `We understand that plans change, especially in a city like New York where schedules shift constantly. We offer free rescheduling with at least 72 hours' notice before your appointment. If you need to change the date, time, location, or group size, simply contact us and we will work with you to find an alternative that fits. Cancellations made more than 72 hours before the scheduled appointment receive a full refund. Cancellations within 72 hours may be subject to a cancellation fee, as we will have already reserved our team and prepared supplies for your event. For weddings and large-scale bookings that involve significant advance planning, our cancellation and rescheduling policies are outlined in the booking agreement we send during the reservation process. We always aim to be flexible and fair.`,
    },
    {
      q: `Do you offer trial runs or consultations for ${evt.name.toLowerCase()}?`,
      a: `Yes. We offer trial sessions and complimentary consultations for many of our event services. Trials are especially popular for weddings, where the bride and bridal party want to preview their look before the big day. During a trial, your stylist and makeup artist work with you to test multiple looks, photograph each option, and finalize every detail including product shades, styling techniques, and hold levels. For non-wedding events, we offer a free phone or video consultation where we discuss your vision, review inspiration photos, and build a customized service plan. This ensures that when our team arrives on the day of your event, everyone is aligned and there are no surprises. Trial sessions are booked separately and typically take 60 to 90 minutes.`,
    },
    {
      q: `What products and equipment do your ${evt.name.toLowerCase()} professionals use?`,
      a: `Our team uses exclusively professional-grade, high-end beauty products from brands trusted by top salons and production studios. For makeup, we work with brands known for their long-wearing, photograph-ready formulas that look stunning in person and on camera. For hair, we use salon-quality styling tools, heat protectants, and finishing products designed to hold through long events. All of our products are cruelty-free, and we carry hypoallergenic and fragrance-free options for clients with sensitivities or allergies. We bring our own professional lighting, full-length mirrors, styling capes, sanitized tools, and everything else needed to transform any space into a temporary salon. You do not need to provide anything except a flat surface and a power outlet.`,
    },
    {
      q: `Where in NYC can you provide ${evt.name.toLowerCase()} services?`,
      a: `We serve all five New York City boroughs: Manhattan, Brooklyn, Queens, the Bronx, and Staten Island. Our team travels to any location within the city, including private residences, apartments, hotel suites, Airbnbs, offices, co-working spaces, event venues, restaurants with private rooms, rooftops, parks (yes, we have done outdoor events), community centers, houses of worship, schools, and hospitals. If you have a venue, we can work in it. We are also available for events in the greater NYC metro area, including parts of Westchester, Long Island, and northern New Jersey, though locations outside the five boroughs may be subject to a small travel fee. No matter where you are, our team arrives on time, fully equipped, and ready to transform your space.`,
    },
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(
        eventSchema({ name: `Mobile ${evt.name} in NYC`, description: `${evt.description}. Professional event beauty services across all 5 NYC boroughs.`, url: `https://thenycmobilesalon.com/events/${slug}` })
      ) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(
        faqSchema(faqs)
      ) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(
        breadcrumbSchema([{ name: "Home", url: "/" }, { name: "Events", url: "/events" }, { name: evt.name, url: `/events/${slug}` }])
      ) }} />

      {/* Hero */}
      <section className="relative overflow-hidden px-4 py-20 md:py-28" style={{ background: "linear-gradient(135deg, #D4749B 0%, #E8A0BF 40%, #C9A96E 100%)" }}>
        <div className="pointer-events-none absolute -right-20 -top-20 h-60 w-60 rounded-full bg-white/10 blur-3xl" />
        <div className="relative mx-auto max-w-4xl text-center">
          <div className="mb-4 flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/60">
            <Link href="/events" className="hover:text-white/80">Events</Link>
            <span>/</span>
            <span className="text-white/40">{evt.name}</span>
          </div>
          <h1 className="font-display mb-6 text-5xl font-bold tracking-tight text-white md:text-6xl">
            Mobile {evt.name} in NYC
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-white/80">
            {evt.description}. Licensed professionals come to your venue anywhere in NYC.
            {content ? ` Groups of ${content.groupSize}. From ${content.price}.` : ""}
          </p>
          <div className="mt-8">
            <Link href="/book" className="btn-rose">Get a Free Quote</Link>
          </div>
        </div>
      </section>

      {/* Content */}
      {content && (
        <section className="bg-white px-6 py-16 md:py-20">
          <div className="mx-auto max-w-4xl md:grid md:grid-cols-3 md:gap-12">
            <div className="md:col-span-2">
              <h2 className="font-display mb-6 text-3xl font-medium tracking-tight text-charcoal">
                About {evt.name.toLowerCase()}
              </h2>
              <div className="space-y-5 text-lg leading-relaxed text-gray-600">
                <p>{content.intro}</p>

                <p>
                  Finding reliable, high-quality beauty services for events in New York City can be surprisingly
                  difficult. Between salon availability, travel logistics, and the challenge of coordinating a
                  group booking, what should be the fun part of your event often turns into the most stressful.
                  That is exactly why mobile {evt.name.toLowerCase()} services have become one of the
                  fastest-growing categories in NYC event planning. Instead of asking your group to coordinate
                  individual salon appointments across different boroughs, a professional team comes directly to
                  you, fully equipped and ready to work.
                </p>

                <p>{content.details}</p>

                <p>
                  Every event is different, and we approach each booking with that understanding. Whether you are
                  hosting an intimate gathering of three or coordinating beauty services for a group of thirty,
                  our team builds a custom plan that accounts for your timeline, your venue layout, and the
                  specific services each person wants. We have worked in hotel suites with limited counter space,
                  open-concept loft venues with soaring ceilings, cozy Brooklyn brownstones, corporate
                  boardrooms, and everything in between. Our professionals are adaptable, efficient, and
                  genuinely great at making people feel comfortable and taken care of.
                </p>

                <p className="font-medium text-charcoal">{content.ideal}</p>

                <p>
                  What sets our mobile {evt.name.toLowerCase()} apart from other options in NYC is our
                  commitment to consistency. Every stylist and artist on our roster is fully licensed, insured,
                  and vetted through our quality assurance process. We do not use contractors we have not worked
                  with before, and we do not cut corners on products or equipment. When you book with The NYC
                  Mobile Salon, you are getting the same level of professionalism and quality you would expect
                  from a top-tier Manhattan salon, delivered to your door at a fraction of the hassle.
                </p>
              </div>

              <h3 className="font-display mt-10 mb-4 text-xl font-semibold text-charcoal">What&apos;s included</h3>
              <ul className="space-y-2">
                {content.includes.map((item) => (
                  <li key={item} className="flex items-center gap-2.5 text-gray-700">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blush/20">
                      <svg className="h-3 w-3 text-blush-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                    </span>
                    {item}
                  </li>
                ))}
              </ul>

              {/* What to Expect */}
              <h3 className="font-display mt-10 mb-4 text-xl font-semibold text-charcoal">
                What to expect on the day of your {evt.name.toLowerCase()}
              </h3>
              <div className="space-y-4 text-lg leading-relaxed text-gray-600">
                <p>
                  On the day of your event, our team arrives 15 to 30 minutes before your first scheduled
                  appointment to set up. We transform a section of your space into a professional styling
                  area, complete with mirrors, lighting, and all the tools and products we need. Setup is
                  quick and clean, and we always confirm the layout with you before we begin.
                </p>
                <p>
                  Once we are set up, guests rotate through services according to a timeline we build in
                  advance. If your group is getting multiple services, such as hair, makeup, and nails, we
                  stagger appointments so there is no downtime and no bottlenecks. Each person gets
                  one-on-one attention from their stylist or artist, and we keep things moving efficiently
                  without ever feeling rushed. The atmosphere is relaxed, fun, and social, which is exactly
                  what getting ready for an event should feel like.
                </p>
                <p>
                  When the last person is finished, we pack up, clean our area, and leave your space exactly
                  as we found it. You will not find stray bobby pins, product residue, or leftover supplies.
                  We take pride in leaving no trace, because your venue matters and your deposit matters.
                </p>
              </div>

              {/* Planning Your Event */}
              <h3 className="font-display mt-10 mb-4 text-xl font-semibold text-charcoal">
                Planning your {evt.name.toLowerCase()} in NYC
              </h3>
              <div className="space-y-4 text-lg leading-relaxed text-gray-600">
                <p>
                  The best {evt.name.toLowerCase()} experiences start with good planning. Here are a few
                  tips we have learned from hundreds of events across all five boroughs. First, finalize your
                  guest count and service list as early as possible. This allows us to assign the right number
                  of professionals and build a realistic timeline. Overbooking stylists is expensive, and
                  underbooking creates bottlenecks and stress.
                </p>
                <p>
                  Second, think about your venue. Ideally, our team needs a well-lit area with access to
                  electrical outlets, a flat surface like a table or countertop, and enough space for one
                  chair per stylist. Natural light is a huge bonus for makeup accuracy. If your venue is
                  small, let us know in advance and we will plan a compact setup that works within your
                  space constraints.
                </p>
                <p>
                  Third, communicate with your guests about what services are available and how to prepare.
                  For hair services, we generally recommend arriving with clean, dry hair unless your stylist
                  specifies otherwise. For makeup, a freshly washed and moisturized face is the best canvas.
                  Sending these guidelines to your group ahead of time ensures faster service and better
                  results for everyone.
                </p>
              </div>
            </div>

            {/* Sidebar */}
            <div className="mt-10 md:mt-0">
              <div className="rounded-xl border border-pink-100 bg-blush-light p-6">
                <h3 className="font-display mb-4 text-lg font-semibold text-charcoal">Quick details</h3>
                <dl className="space-y-3 text-sm">
                  <div><dt className="font-semibold text-charcoal">Starting at</dt><dd className="text-gray-600">{content.price}</dd></div>
                  <div><dt className="font-semibold text-charcoal">Standard rate</dt><dd className="text-gray-600">$99/hr (2hr min for 3+)</dd></div>
                  <div><dt className="font-semibold text-charcoal">Group size</dt><dd className="text-gray-600">{content.groupSize}</dd></div>
                  <div><dt className="font-semibold text-charcoal">Coverage</dt><dd className="text-gray-600">All 5 NYC boroughs</dd></div>
                  <div><dt className="font-semibold text-charcoal">Staff</dt><dd className="text-gray-600">Licensed & insured pros</dd></div>
                  <div><dt className="font-semibold text-charcoal">Setup</dt><dd className="text-gray-600">We bring everything</dd></div>
                  <div><dt className="font-semibold text-charcoal">Booking lead time</dt><dd className="text-gray-600">2-4 weeks recommended</dd></div>
                  <div><dt className="font-semibold text-charcoal">Cancellation</dt><dd className="text-gray-600">Free reschedule 72hrs+</dd></div>
                  <div><dt className="font-semibold text-charcoal">Travel fee</dt><dd className="text-gray-600">None within NYC</dd></div>
                </dl>
                <Link href="/book" className="btn-rose mt-6 block w-full text-center">Get a Quote</Link>
              </div>

              <div className="mt-6 rounded-xl border border-pink-100 bg-white p-6">
                <h3 className="font-display mb-3 text-lg font-semibold text-charcoal">Popular add-ons</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center gap-2">
                    <Sparkle className="h-3 w-3 text-blush-dark" />
                    Lash application
                  </li>
                  <li className="flex items-center gap-2">
                    <Sparkle className="h-3 w-3 text-blush-dark" />
                    Gel manicures
                  </li>
                  <li className="flex items-center gap-2">
                    <Sparkle className="h-3 w-3 text-blush-dark" />
                    Express facials
                  </li>
                  <li className="flex items-center gap-2">
                    <Sparkle className="h-3 w-3 text-blush-dark" />
                    Touch-up kits
                  </li>
                  <li className="flex items-center gap-2">
                    <Sparkle className="h-3 w-3 text-blush-dark" />
                    Extended on-site hours
                  </li>
                </ul>
                <p className="mt-3 text-xs text-gray-400">Add-ons can be included in your custom quote.</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* How It Works */}
      <section className="bg-blush-light px-6 py-16 md:py-20">
        <div className="mx-auto max-w-4xl">
          <h2 className="font-display mb-4 text-center text-2xl font-medium tracking-tight text-charcoal md:text-3xl">
            How mobile {evt.name.toLowerCase()} works
          </h2>
          <p className="mx-auto mb-12 max-w-2xl text-center text-gray-500">
            From first inquiry to final touch-up, here is how we bring professional {evt.name.toLowerCase()} services directly to your door anywhere in New York City.
          </p>
          <div className="grid gap-8 md:grid-cols-4">
            {[
              {
                step: "1",
                title: "Tell us about your event",
                desc: `Fill out our quick quote form or text us with the details of your ${evt.name.toLowerCase()}. Let us know the date, time, location, number of guests, and the services you are interested in. We will respond within a few hours with a custom proposal and pricing breakdown. There is no cost and no obligation for the quote.`,
              },
              {
                step: "2",
                title: "We build your plan",
                desc: `Once you approve the quote, your dedicated event coordinator builds a detailed service timeline, assigns the right number of licensed professionals to your event, and confirms all logistics. For larger bookings, we schedule a pre-event call or consultation to review every detail and answer any questions.`,
              },
              {
                step: "3",
                title: "We arrive and set up",
                desc: `On the day of your ${evt.name.toLowerCase()}, our team arrives early with all equipment, products, and supplies. We set up a professional styling area in your space, confirm the schedule, and begin services right on time. Every guest receives personalized attention and a look they love.`,
              },
              {
                step: "4",
                title: "You enjoy the event",
                desc: `When every guest is styled and ready, we pack up, clean our area, and leave your space spotless. You and your guests head into the event looking and feeling incredible, with zero stress about the beauty logistics. That is the entire point.`,
              },
            ].map((item) => (
              <div key={item.step} className="rounded-xl border border-pink-100 bg-white p-6">
                <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-blush/20 text-sm font-bold text-blush-dark">
                  {item.step}
                </div>
                <h3 className="font-display mb-2 text-base font-semibold text-charcoal">{item.title}</h3>
                <p className="text-sm leading-relaxed text-gray-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Mobile */}
      <section className="bg-white px-6 py-16 md:py-20">
        <div className="mx-auto max-w-4xl">
          <h2 className="font-display mb-4 text-center text-2xl font-medium tracking-tight text-charcoal md:text-3xl">
            Why choose mobile {evt.name.toLowerCase()} over a traditional salon
          </h2>
          <p className="mx-auto mb-10 max-w-2xl text-center text-gray-500">
            Coordinating a group at a salon is a logistical headache. Mobile beauty eliminates every pain point and makes the experience part of the celebration.
          </p>
          <div className="space-y-6 text-lg leading-relaxed text-gray-600">
            <p>
              The traditional approach to event beauty goes something like this: you call a salon, try to book
              four or five consecutive appointments on a Saturday morning, realize the salon cannot accommodate
              your full group in one block, split everyone across two locations, and then spend the morning
              coordinating Ubers, parking, and text chains about who is running late. Half the group ends up
              stressed before the event even starts. Mobile beauty exists to solve this exact problem. When
              our team comes to you, everyone gets ready together, in one place, on one timeline. No one has
              to drive anywhere, wait in a lobby, or rush through their appointment because the next person is
              already seated.
            </p>
            <p>
              Beyond the convenience factor, there is something genuinely special about getting ready together
              in a private space. The energy in the room when a group of friends, family members, or colleagues
              is being pampered together is completely different from the transactional feeling of a salon visit.
              People laugh, catch up, take photos, and create memories that become part of the event story.
              That shared experience is something you simply cannot replicate when everyone is scattered across
              different salons or staggered through solo appointments. For events like {evt.name.toLowerCase()},
              the getting-ready process should be as enjoyable as the event itself.
            </p>
            <p>
              From a practical standpoint, mobile services are also more efficient for groups. At a salon, one
              stylist typically works through clients one at a time. With our mobile setup, we dispatch multiple
              professionals who work simultaneously. A group of eight that would take four hours at a salon takes
              closer to 90 minutes with four of our stylists working in parallel. This means less time sitting
              around and more time enjoying your event. And because we control the environment, the scheduling,
              and the team, there are no delays caused by walk-in clients, overbooked chairs, or stylists
              running behind from a previous appointment.
            </p>
            <p>
              Cost is another consideration. When you factor in the time, transportation, tips, and coordination
              overhead of getting a group to and from a salon, mobile services are often comparable in total cost
              and dramatically better in terms of the experience delivered. Our transparent pricing at $99 per hour
              with a two-hour minimum for groups of three or more means you know exactly what you are paying before
              you commit. There are no hidden fees, no surprise charges, and no awkward tip calculations at the end.
              Everything is included, everything is professional, and everything happens in your space on your schedule.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="px-6 py-16 md:py-20" style={{ background: "linear-gradient(135deg, #FDF2F8 0%, #FFF7ED 100%)" }}>
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="font-display mb-4 text-2xl font-medium tracking-tight text-charcoal md:text-3xl">
            {evt.name} pricing
          </h2>
          <p className="mx-auto mb-10 max-w-2xl text-gray-500">
            Transparent, straightforward pricing for mobile beauty services anywhere in New York City. No hidden fees, no surprises.
          </p>
          <div className="mx-auto grid max-w-3xl gap-6 md:grid-cols-2">
            <div className="rounded-xl border border-pink-100 bg-white p-8 text-left">
              <h3 className="font-display mb-1 text-lg font-semibold text-charcoal">Standard rate</h3>
              <p className="mb-4 text-3xl font-bold text-blush-dark">$99<span className="text-lg font-normal text-gray-400">/hour</span></p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center gap-2">
                  <svg className="h-4 w-4 shrink-0 text-blush-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                  2-hour minimum for groups of 3+
                </li>
                <li className="flex items-center gap-2">
                  <svg className="h-4 w-4 shrink-0 text-blush-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                  Licensed, insured professionals
                </li>
                <li className="flex items-center gap-2">
                  <svg className="h-4 w-4 shrink-0 text-blush-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                  All tools and products included
                </li>
                <li className="flex items-center gap-2">
                  <svg className="h-4 w-4 shrink-0 text-blush-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                  No travel fee within NYC
                </li>
                <li className="flex items-center gap-2">
                  <svg className="h-4 w-4 shrink-0 text-blush-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                  Setup and cleanup included
                </li>
              </ul>
            </div>
            <div className="rounded-xl border border-pink-100 bg-white p-8 text-left">
              <h3 className="font-display mb-1 text-lg font-semibold text-charcoal">Custom packages</h3>
              <p className="mb-4 text-3xl font-bold text-blush-dark">Get a quote</p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center gap-2">
                  <svg className="h-4 w-4 shrink-0 text-blush-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                  Tailored to your event needs
                </li>
                <li className="flex items-center gap-2">
                  <svg className="h-4 w-4 shrink-0 text-blush-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                  Multi-stylist team for large groups
                </li>
                <li className="flex items-center gap-2">
                  <svg className="h-4 w-4 shrink-0 text-blush-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                  Bundle hair, makeup, and nails
                </li>
                <li className="flex items-center gap-2">
                  <svg className="h-4 w-4 shrink-0 text-blush-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                  Corporate and recurring rates
                </li>
                <li className="flex items-center gap-2">
                  <svg className="h-4 w-4 shrink-0 text-blush-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                  Weddings and premium events
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-8 flex flex-col items-center gap-3">
            <Link href="/book" className="btn-rose">Get a Free Quote</Link>
            <Link href="/pricing" className="text-sm text-blush-dark underline underline-offset-2 hover:text-blush-dark/80">View full pricing details</Link>
          </div>
        </div>
      </section>

      {/* Book by Borough */}
      <section className="bg-blush-light px-4 py-16 md:py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="font-display mb-8 text-center text-2xl font-medium tracking-tight text-charcoal md:text-3xl">
            Book {evt.name.toLowerCase()} by borough
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
            {Object.entries(boroughNames).map(([boroSlug, boroName]) => (
              <Link key={boroSlug} href={`/events/${slug}/${boroSlug}`} className="card-hover rounded-xl border border-pink-100 bg-white p-6 text-center">
                <p className="text-lg font-semibold text-charcoal">{boroName}</p>
                <p className="mt-1 text-xs text-blush-dark">{neighborhoods[boroSlug]?.length} neighborhoods &rarr;</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-white px-6 py-16 md:py-20">
        <div className="mx-auto max-w-3xl">
          <h2 className="font-display mb-4 text-center text-2xl font-medium tracking-tight text-charcoal">
            Frequently asked questions about {evt.name.toLowerCase()}
          </h2>
          <p className="mx-auto mb-10 max-w-xl text-center text-gray-500">
            Everything you need to know about booking mobile {evt.name.toLowerCase()} services in New York City.
          </p>
          <div className="divide-y divide-pink-100">
            {faqs.map((faq) => (
              <div key={faq.q} className="py-6">
                <h3 className="font-display mb-2 text-lg font-semibold text-charcoal">{faq.q}</h3>
                <p className="text-gray-600 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Related Events */}
      <section className="bg-blush-light px-4 py-16 md:py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="font-display mb-8 text-center text-2xl font-medium tracking-tight text-charcoal">
            Other event services
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
            {related.map((r) => {
              const rc = eventContent[r.slug];
              return (
                <Link key={r.slug} href={`/events/${r.slug}`} className="group rounded-xl border border-pink-100 bg-white p-5 transition-all hover:shadow-md hover:shadow-pink-500/10">
                  <h3 className="font-display mb-1 text-sm font-semibold text-charcoal group-hover:text-blush-dark transition-colors">{r.name}</h3>
                  <p className="text-xs text-gray-400">{r.description}</p>
                  {rc && <p className="mt-2 text-xs text-blush-dark">From {rc.price}</p>}
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-white px-4 py-16 md:py-20 text-center">
        <div className="mx-auto max-w-2xl">
          <h2 className="font-display mb-4 text-3xl font-medium text-charcoal">
            Ready to plan your <span className="italic">{evt.name.toLowerCase()}</span>?
          </h2>
          <p className="mb-4 text-lg text-gray-500">
            Tell us about your event and we will put together a custom quote within hours. Our team has
            styled thousands of events across all five NYC boroughs, from intimate gatherings to
            large-scale productions, and we would love to be part of yours.
          </p>
          <p className="mb-8 text-gray-400">
            Free quotes. Custom packages. No pressure, no obligations. Just professional beauty services
            delivered to your door, anywhere in New York City.
          </p>
          <div className="flex flex-col items-center gap-3">
            <Link href="/book" className="btn-rose">Get a Free Quote</Link>
            <p className="text-xs text-gray-400">Or text us to discuss your {evt.name.toLowerCase()} needs</p>
          </div>
        </div>
      </section>
    </>
  );
}
