// @ts-nocheck
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { allServices, womensCategories, mensCategories, neighborhoods, boroughNames } from "@/app/site/nyc-mobile-salon/_lib/constants";
import { getServiceBySlug, serviceSchema, breadcrumbSchema, faqSchema } from "@/app/site/nyc-mobile-salon/_lib/seo";
import { serviceContent } from "@/app/site/nyc-mobile-salon/_lib/service-content";
import LeadForm from "@/app/site/nyc-mobile-salon/_components/LeadForm";

export const revalidate = 2592000;

export const dynamicParams = true

export async function generateStaticParams() { return [] }

type Props = { params: Promise<{ slug: string }> };

function isWomensService(slug: string): boolean {
  return womensCategories.some((cat) => cat.services.some((s) => s.slug === slug));
}

function getCategoryName(slug: string): string {
  for (const cat of [...womensCategories, ...mensCategories]) {
    if (cat.services.some((s) => s.slug === slug)) return cat.title;
  }
  return "Services";
}

function getRelatedServices(slug: string): typeof allServices {
  for (const cat of [...womensCategories, ...mensCategories]) {
    if (cat.services.some((s) => s.slug === slug)) {
      return cat.services.filter((s) => s.slug !== slug).slice(0, 4);
    }
  }
  return [];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const svc = getServiceBySlug(slug);
  if (!svc) return {};
  const content = serviceContent[slug];
  const gender = isWomensService(slug) ? "women" : "men";
  return {
    title: `Mobile ${svc.name} in NYC \u2014 At-Home ${svc.name} for ${gender === "women" ? "Women" : "Men"} | All 5 Boroughs`,
    description: content
      ? `${content.intro.slice(0, 140)}... Book mobile ${svc.name.toLowerCase()} in Manhattan, Brooklyn, Queens, Bronx & Staten Island. From ${content.price}. Licensed pros.`
      : `Book mobile ${svc.name.toLowerCase()} anywhere in New York City. Licensed professionals come to your home, office, or event. ${svc.description}. $99/hr, 1-hour minimum.`,
    alternates: { canonical: `https://thenycmobilesalon.com/services/${slug}` },
  };
}

function Sparkle({ className = "" }: { className?: string }) {
  return (
    <svg className={`inline-block ${className}`} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0L14.59 8.41L23 11L14.59 13.59L12 22L9.41 13.59L1 11L9.41 8.41L12 0Z" />
    </svg>
  );
}

export default async function ServicePage({ params }: Props) {
  const { slug } = await params;
  const svc = getServiceBySlug(slug);
  if (!svc) notFound();

  const content = serviceContent[slug];
  const isWomens = isWomensService(slug);
  const category = getCategoryName(slug);
  const related = getRelatedServices(slug);

  const serviceFaqs = [
    { q: `How much does mobile ${svc.name.toLowerCase()} cost?`, a: content ? `${svc.name} starts at ${content.price}. Our pricing is $99 per hour with a one-hour minimum for individual clients, and a two-hour minimum when booking for groups of three or more. Every price includes travel to your door anywhere in the five boroughs, all professional tools and products, and a fully licensed professional. There are no hidden fees, no trip charges, and no surprise add-ons. You know exactly what you are paying before your appointment is confirmed.` : `Our pricing is $99 per hour with a one-hour minimum for individual clients. For groups of three or more, there is a two-hour minimum. Every price includes travel, tools, products, and a licensed professional. No hidden fees.` },
    { q: `How long does ${svc.name.toLowerCase()} take?`, a: content ? `${svc.name} typically takes ${content.duration}. Your professional will give you an exact estimate based on your specific needs during booking. Keep in mind that mobile appointments sometimes take a few extra minutes compared to a salon because we take the time to set up a proper workstation in your space. We always build in enough time so your appointment never feels rushed. If you are booking multiple services, we will give you a combined time estimate so you can plan your day accordingly.` : `Duration varies based on your specific needs. Contact us for an estimate. We always allow enough time for setup and a thorough, unhurried service.` },
    { q: `Do I need to provide anything for ${svc.name.toLowerCase()}?`, a: `Nothing at all. Your professional arrives with every tool, product, and supply needed to deliver a salon-quality ${svc.name.toLowerCase()} experience. All we ask is that you have a comfortable space with good lighting ready. For hair services, access to a sink is helpful but not always required. For nail services, a table and chair work perfectly. We bring protective coverings for your furniture and floors, and we clean up completely before we leave. You do not need to worry about a thing.` },
    { q: `Is your ${svc.name.toLowerCase()} professional licensed?`, a: `Absolutely. Every professional on our team is fully licensed by the New York State Department of State, carries personal liability insurance, and has been vetted through our multi-step screening process. We verify credentials, check references, and conduct in-person skill assessments before anyone joins our team. Many of our professionals have five or more years of experience working in top New York City salons and barbershops before joining our mobile team. Your safety, comfort, and results are our highest priorities.` },
    { q: `What's included in the price for ${svc.name.toLowerCase()}?`, a: `Every ${svc.name.toLowerCase()} appointment includes travel to your location anywhere in NYC's five boroughs, all professional-grade tools and equipment, premium products and supplies, a fully licensed and insured professional, setup and cleanup of a workstation in your space, and a consultation to ensure you get exactly what you want. There are no extra charges for travel, no fuel surcharges, and no hidden product fees. The price you are quoted is the price you pay. For groups of three or more, we offer a two-hour minimum at our standard $99 per hour rate.` },
    { q: `How do I prepare for my ${svc.name.toLowerCase()} appointment?`, a: `Preparing for your mobile ${svc.name.toLowerCase()} appointment is easy. Make sure you have a comfortable, well-lit area where your professional can work. For hair services, being near a sink is ideal but not mandatory. For nail services, a table and two chairs are all you need. For waxing and skin services, a bed or couch with a clean sheet works perfectly. We recommend wearing comfortable clothing that is easy to change if needed. Have any inspiration photos or references ready to share during your consultation. Beyond that, just relax and let us handle everything.` },
    { q: `Can I book ${svc.name.toLowerCase()} with other services?`, a: `Yes, and many of our clients do. Combining services is one of the biggest advantages of mobile beauty. You can book ${svc.name.toLowerCase()} alongside any of our other ${isWomens ? "women's" : "men's"} services in the same appointment. Popular combinations include hair and nails, hair and makeup, or a full grooming package. When you book multiple services, we coordinate timing so everything flows smoothly. You can also book for multiple people at the same location, which is perfect for bridal parties, girls' nights, or group events. Visit our <a href="/services">full services page</a> to see everything we offer.` },
    { q: `What products do you use for ${svc.name.toLowerCase()}?`, a: `We use only professional-grade, salon-quality products from trusted brands. Our professionals carry a curated selection of premium products chosen for performance, safety, and results. All products are appropriate for a wide range of skin types and hair textures. If you have allergies, sensitivities, or specific product preferences, let us know when you book and we will accommodate your needs. We never use cheap, drugstore-grade products. Your results should be indistinguishable from what you would get at the best salon in Manhattan.` },
    { q: `How do I reschedule or cancel my ${svc.name.toLowerCase()} appointment?`, a: `We understand that plans change, especially in New York City. You can reschedule or cancel your appointment with at least 24 hours notice at no charge. Simply text us, call us, or reply to your confirmation message. If you need to reschedule within 24 hours of your appointment, we will do our best to accommodate you, though a late cancellation fee may apply. We are flexible and understanding because we know how busy life in NYC can be. Our goal is to make the entire experience, from booking to completion, as stress-free as possible.` },
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(
        serviceSchema(`Mobile ${svc.name} in NYC`, `${content?.intro ?? svc.description}. Licensed mobile beauty professionals serving all 5 NYC boroughs.`)
      ) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(
        breadcrumbSchema([
          { name: "Home", url: "/" },
          { name: "Services", url: "/services" },
          { name: isWomens ? "Women\u2019s" : "Men\u2019s", url: isWomens ? "/services/womens" : "/services/mens" },
          { name: svc.name, url: `/services/${slug}` },
        ])
      ) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema(serviceFaqs)) }} />

      {/* Hero */}
      <section className="relative overflow-hidden px-4 py-20 md:py-28" style={isWomens ? { background: "linear-gradient(135deg, #E8A0BF 0%, #D4749B 100%)" } : { background: "linear-gradient(135deg, #1a1a1a 0%, #0c2340 50%, #1a1a1a 100%)" }}>
        <div className="pointer-events-none absolute -right-20 -top-20 h-60 w-60 rounded-full bg-white/10 blur-3xl" />
        <div className="relative mx-auto max-w-4xl text-center">
          <div className="mb-4 flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/60">
            <Link href="/services" className="hover:text-white/80">Services</Link>
            <span>/</span>
            <Link href={isWomens ? "/services/womens" : "/services/mens"} className="hover:text-white/80">{isWomens ? "Women\u2019s" : "Men\u2019s"}</Link>
            <span>/</span>
            <span className="text-white/40">{category}</span>
          </div>
          <h1 className="font-display mb-6 text-5xl font-bold tracking-tight text-white md:text-6xl lg:text-7xl">
            Mobile <span className="italic">{svc.name}</span>
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-white/80">
            {content?.intro ?? `${svc.description}. Licensed professionals come to your door \u2014 anywhere in NYC.`}
          </p>
          {content && (
            <div className="mt-6 flex flex-wrap items-center justify-center gap-6 text-sm text-white/70">
              <span>From <strong className="text-white">{content.price}</strong></span>
              <span className="text-white/30">|</span>
              <span><strong className="text-white">{content.duration}</strong></span>
              <span className="text-white/30">|</span>
              <span>All 5 boroughs</span>
            </div>
          )}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/book" className={isWomens ? "btn-outline-white" : "inline-block rounded-full bg-sky-500 px-9 py-3.5 text-sm font-semibold uppercase tracking-wider text-white shadow-lg shadow-sky-500/30 transition hover:-translate-y-0.5 hover:bg-sky-600 font-display"}>Book {svc.name}</Link>
            <a href="sms:+12122029075" className="btn-outline-white">Text Us</a>
          </div>
        </div>
      </section>

      {/* Details */}
      {content && (
        <section className="bg-white px-6 py-16 md:py-24">
          <div className="mx-auto grid max-w-6xl gap-12 md:grid-cols-[1.4fr_0.6fr] md:items-start">
            <div>
              <h2 className="font-display mb-6 text-3xl font-medium tracking-tight text-charcoal md:text-4xl">
                What to expect from mobile {svc.name.toLowerCase()} in NYC
              </h2>
              <div className="space-y-5 text-lg leading-relaxed text-gray-600">
                <p>{content.details}</p>

                <p>
                  One of the biggest advantages of booking mobile {svc.name.toLowerCase()} is that you receive this service in the comfort and privacy of your own space. There is no rushing through traffic, no searching for parking near a crowded salon, and no sitting in a waiting room scrolling through your phone while your appointment runs behind schedule. When you book with The NYC Mobile Salon, your licensed professional arrives at your door at the scheduled time, sets up a clean and organized workstation, and gives you their complete, undivided attention for the entire appointment. The result is a more relaxed, more personalized, and ultimately better experience than what most traditional salons can offer.
                </p>

                <p>{content.ideal}</p>

                <p>
                  Every {svc.name.toLowerCase()} appointment begins with a one-on-one consultation so your professional understands exactly what you want. We believe that great results start with great communication, and we never skip this step. Whether you have a specific look in mind, a photo to share, or you want expert guidance, your professional will walk you through the process, set expectations, and make sure you are completely comfortable before any work begins. Our professionals maintain the same exacting standards they upheld at top New York City salons and barbershops, and they bring those standards directly to your living room, bedroom, office, or hotel room.
                </p>

                <p>
                  Our team follows strict hygiene and sanitation protocols that meet or exceed New York State requirements. All tools are sanitized between clients using hospital-grade disinfectants, and single-use items are disposed of properly after every appointment. We carry liability insurance and maintain active New York State professional licenses. When you book with The NYC Mobile Salon, you are getting the same level of professionalism and safety you would expect from a high-end Manhattan salon, delivered directly to your door at a fraction of the cost and hassle. Learn more about our process on our <Link href="/how-it-works" className={`font-medium underline ${isWomens ? "text-blush-dark" : "text-sky-600"}`}>how it works</Link> page, or visit our <Link href="/pricing" className={`font-medium underline ${isWomens ? "text-blush-dark" : "text-sky-600"}`}>pricing page</Link> for complete pricing details.
                </p>

                <p>
                  {isWomens
                    ? `Women across all five boroughs book mobile ${svc.name.toLowerCase()} for a wide variety of reasons. Busy professionals book before important meetings or presentations when they need to look polished but cannot afford to spend hours at a salon. New moms book because getting to a salon with a newborn feels impossible. Brides and bridal parties book because having everyone get ready together in one location is more convenient and more fun. Students, freelancers, and remote workers book because they appreciate the flexibility of scheduling an appointment around their own timeline rather than a salon's availability. Whatever your reason, we make it easy.`
                    : `Men across all five boroughs book mobile ${svc.name.toLowerCase()} for a wide variety of reasons. Busy professionals book because they want a quality grooming experience without the barbershop wait. Finance guys in Midtown book early morning appointments before heading to the office. Dads in Brooklyn book while the kids nap. Athletes and performers book before events, photo shoots, and game days. Remote workers in Queens book because they can get a fresh cut between Zoom calls without leaving the apartment. Whatever your reason, we make it easy.`
                  }
                </p>
              </div>

              <h3 className="font-display mt-10 mb-4 text-xl font-semibold text-charcoal">What&apos;s included</h3>
              <ul className="space-y-2.5">
                {content.includes.map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <span className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${isWomens ? "bg-blush/20" : "bg-sky-100"}`}>
                      <svg className={`h-3 w-3 ${isWomens ? "text-blush-dark" : "text-sky-600"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                    </span>
                    <span className="text-base text-gray-700">{item}</span>
                  </li>
                ))}
                <li className="flex items-start gap-2.5">
                  <span className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${isWomens ? "bg-blush/20" : "bg-sky-100"}`}>
                    <svg className={`h-3 w-3 ${isWomens ? "text-blush-dark" : "text-sky-600"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                  </span>
                  <span className="text-base text-gray-700">Travel to your location (all 5 boroughs)</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${isWomens ? "bg-blush/20" : "bg-sky-100"}`}>
                    <svg className={`h-3 w-3 ${isWomens ? "text-blush-dark" : "text-sky-600"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                  </span>
                  <span className="text-base text-gray-700">Complete setup and cleanup</span>
                </li>
              </ul>

              <div className="mt-8">
                <p className="text-base text-gray-500">
                  Want to see our full menu? Browse all <Link href={isWomens ? "/services/womens" : "/services/mens"} className={`font-medium underline ${isWomens ? "text-blush-dark" : "text-sky-600"}`}>{isWomens ? "women's services" : "men's services"}</Link> or check out our <Link href="/events" className={`font-medium underline ${isWomens ? "text-blush-dark" : "text-sky-600"}`}>group and event packages</Link>.
                </p>
              </div>
            </div>

            <div className={`rounded-2xl p-6 ${isWomens ? "bg-blush-light border border-pink-100" : "bg-sky-50 border border-sky-100"}`}>
              <h3 className="font-display mb-4 text-lg font-semibold text-charcoal">Quick Details</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between border-b border-gray-200/50 pb-3">
                  <span className="text-gray-500">Starting price</span>
                  <span className="font-semibold text-charcoal">{content.price}</span>
                </div>
                <div className="flex justify-between border-b border-gray-200/50 pb-3">
                  <span className="text-gray-500">Hourly rate</span>
                  <span className="font-semibold text-charcoal">$99/hr</span>
                </div>
                <div className="flex justify-between border-b border-gray-200/50 pb-3">
                  <span className="text-gray-500">Duration</span>
                  <span className="font-semibold text-charcoal">{content.duration}</span>
                </div>
                <div className="flex justify-between border-b border-gray-200/50 pb-3">
                  <span className="text-gray-500">Minimum</span>
                  <span className="font-semibold text-charcoal">1 hr (individual)</span>
                </div>
                <div className="flex justify-between border-b border-gray-200/50 pb-3">
                  <span className="text-gray-500">Group min</span>
                  <span className="font-semibold text-charcoal">2 hrs (3+ people)</span>
                </div>
                <div className="flex justify-between border-b border-gray-200/50 pb-3">
                  <span className="text-gray-500">Coverage</span>
                  <span className="font-semibold text-charcoal">All 5 boroughs</span>
                </div>
                <div className="flex justify-between border-b border-gray-200/50 pb-3">
                  <span className="text-gray-500">Licensed</span>
                  <span className="font-semibold text-charcoal">NYS Licensed &amp; Insured</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Availability</span>
                  <span className="font-semibold text-charcoal">7 days/week</span>
                </div>
              </div>
              <Link href="/book" className={`mt-6 block w-full text-center ${isWomens ? "btn-rose" : "inline-block rounded-full bg-sky-500 px-9 py-3.5 text-sm font-semibold uppercase tracking-wider text-white shadow-lg shadow-sky-500/30 transition hover:-translate-y-0.5 hover:bg-sky-600 font-display"}`}>
                Book Now
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Why Mobile Service */}
      <section className={`px-6 py-16 md:py-20 ${isWomens ? "bg-blush-light" : "bg-sky-50"}`}>
        <div className="mx-auto max-w-5xl">
          <h2 className="font-display mb-4 text-center text-3xl font-medium tracking-tight text-charcoal md:text-4xl">
            Why choose mobile {svc.name.toLowerCase()}?
          </h2>
          <p className="mx-auto mb-10 max-w-2xl text-center text-lg text-gray-600">
            Skip the salon commute and get professional {svc.name.toLowerCase()} delivered to your home, office, hotel, or event space anywhere in New York City.
          </p>
          <div className="grid gap-6 sm:grid-cols-2">
            <div className={`rounded-2xl border bg-white p-7 ${isWomens ? "border-pink-100" : "border-sky-100"}`}>
              <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-full ${isWomens ? "bg-blush/20" : "bg-sky-100"}`}>
                <Sparkle className={`h-5 w-5 ${isWomens ? "text-blush-dark" : "text-sky-500"}`} />
              </div>
              <h3 className="font-display mb-2 text-lg font-semibold text-charcoal">No salon commute</h3>
              <p className="text-base leading-relaxed text-gray-600">
                Getting to a salon in New York City can easily eat up an hour or more of your day between subway delays, crosstown traffic, and circling for parking. With mobile {svc.name.toLowerCase()}, that wasted time disappears. Your professional comes to you, so you get that time back to spend however you want.
              </p>
            </div>
            <div className={`rounded-2xl border bg-white p-7 ${isWomens ? "border-pink-100" : "border-sky-100"}`}>
              <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-full ${isWomens ? "bg-blush/20" : "bg-sky-100"}`}>
                <Sparkle className={`h-5 w-5 ${isWomens ? "text-blush-dark" : "text-sky-500"}`} />
              </div>
              <h3 className="font-display mb-2 text-lg font-semibold text-charcoal">Your space, your comfort</h3>
              <p className="text-base leading-relaxed text-gray-600">
                There is something genuinely different about receiving {svc.name.toLowerCase()} in your own space. You can play your own music, wear whatever you want, take a call if you need to, and skip the awkward small talk with strangers in the next chair. It is a private, personalized experience that no salon can replicate.
              </p>
            </div>
            <div className={`rounded-2xl border bg-white p-7 ${isWomens ? "border-pink-100" : "border-sky-100"}`}>
              <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-full ${isWomens ? "bg-blush/20" : "bg-sky-100"}`}>
                <Sparkle className={`h-5 w-5 ${isWomens ? "text-blush-dark" : "text-sky-500"}`} />
              </div>
              <h3 className="font-display mb-2 text-lg font-semibold text-charcoal">Licensed &amp; insured professionals</h3>
              <p className="text-base leading-relaxed text-gray-600">
                Every professional on our team holds an active New York State license and carries personal liability insurance. We conduct background checks, verify credentials, and assess skills in person before anyone joins our roster. You are getting top-tier talent with full accountability, not a random person from an app.
              </p>
            </div>
            <div className={`rounded-2xl border bg-white p-7 ${isWomens ? "border-pink-100" : "border-sky-100"}`}>
              <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-full ${isWomens ? "bg-blush/20" : "bg-sky-100"}`}>
                <Sparkle className={`h-5 w-5 ${isWomens ? "text-blush-dark" : "text-sky-500"}`} />
              </div>
              <h3 className="font-display mb-2 text-lg font-semibold text-charcoal">All-inclusive pricing</h3>
              <p className="text-base leading-relaxed text-gray-600">
                Our rate is $99 per hour with a one-hour minimum for individuals and a two-hour minimum for groups of three or more. That price includes travel to your location, all tools and products, setup, cleanup, and the service itself. No hidden fees, no surprise charges, no tipping pressure. What we quote is what you pay.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-white px-6 py-16 md:py-20">
        <div className="mx-auto max-w-4xl">
          <h2 className="font-display mb-4 text-center text-3xl font-medium tracking-tight text-charcoal md:text-4xl">
            How mobile {svc.name.toLowerCase()} works
          </h2>
          <p className="mx-auto mb-12 max-w-2xl text-center text-lg text-gray-600">
            Booking {svc.name.toLowerCase()} with The NYC Mobile Salon is simple. Three steps and you are done.
          </p>
          <div className="grid gap-8 md:grid-cols-3">
            <div className="text-center">
              <div className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full text-xl font-bold text-white ${isWomens ? "bg-blush-dark" : "bg-sky-500"}`}>
                1
              </div>
              <h3 className="font-display mb-2 text-lg font-semibold text-charcoal">Book your appointment</h3>
              <p className="text-base leading-relaxed text-gray-600">
                Fill out our booking form, text us, or call us to schedule your {svc.name.toLowerCase()} appointment. Tell us your preferred date, time, location, and any details about what you are looking for. We will confirm everything within 24 hours and match you with the perfect professional for your needs.
              </p>
            </div>
            <div className="text-center">
              <div className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full text-xl font-bold text-white ${isWomens ? "bg-blush-dark" : "bg-sky-500"}`}>
                2
              </div>
              <h3 className="font-display mb-2 text-lg font-semibold text-charcoal">We come to you</h3>
              <p className="text-base leading-relaxed text-gray-600">
                On your appointment day, your licensed professional arrives at your door with all tools, products, and supplies. They set up a clean, organized workstation in your space and begin with a consultation to make sure you are on the same page about exactly what you want. No rushing, no waiting, no distractions.
              </p>
            </div>
            <div className="text-center">
              <div className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full text-xl font-bold text-white ${isWomens ? "bg-blush-dark" : "bg-sky-500"}`}>
                3
              </div>
              <h3 className="font-display mb-2 text-lg font-semibold text-charcoal">Enjoy the results</h3>
              <p className="text-base leading-relaxed text-gray-600">
                Sit back, relax, and enjoy salon-quality {svc.name.toLowerCase()} in the comfort of your own space. When the service is complete, your professional cleans up thoroughly and leaves your space exactly as they found it. You look amazing, you feel amazing, and you never left home. That is the mobile salon difference.
              </p>
            </div>
          </div>
          <div className="mt-10 text-center">
            <Link href="/how-it-works" className={`text-base font-medium underline ${isWomens ? "text-blush-dark" : "text-sky-600"}`}>
              Learn more about how it works
            </Link>
          </div>
        </div>
      </section>

      {/* Who Books This Service */}
      <section className={`px-6 py-16 md:py-20 ${isWomens ? "bg-blush-light" : "bg-sky-50"}`}>
        <div className="mx-auto max-w-4xl">
          <h2 className="font-display mb-8 text-center text-3xl font-medium tracking-tight text-charcoal md:text-4xl">
            Who books mobile {svc.name.toLowerCase()} in NYC?
          </h2>
          <div className="space-y-5 text-lg leading-relaxed text-gray-600">
            <p>
              {isWomens
                ? `Busy professionals are one of our largest client groups for mobile ${svc.name.toLowerCase()}. Women working long hours in finance, law, tech, media, and healthcare often struggle to fit salon appointments into their schedules. With mobile ${svc.name.toLowerCase()}, they book early morning appointments before work, evening slots after the office, or weekend sessions when they finally have a moment to themselves. No commute means more time for everything else.`
                : `Busy professionals make up a significant portion of our ${svc.name.toLowerCase()} bookings. Men working in finance on Wall Street, tech founders in Flatiron, lawyers in Midtown, and creatives in Williamsburg all book mobile ${svc.name.toLowerCase()} because it fits seamlessly into their packed schedules. Early morning appointments before the office, quick lunchtime sessions, or evening bookings after the markets close. No barbershop wait list, no wasted time.`
              }
            </p>
            <p>
              {isWomens
                ? `New moms and parents of young children are another group that books mobile ${svc.name.toLowerCase()} regularly. When you have a baby or toddler at home, getting to a salon can feel impossible. Mobile ${svc.name.toLowerCase()} means you do not need to arrange childcare, pack a diaper bag, or navigate a stroller through crowded NYC streets. Your professional comes to you, and you can keep an eye on your little one while getting pampered.`
                : `Fathers and family men also book mobile ${svc.name.toLowerCase()} frequently. When you have kids at home and a packed weekend schedule of soccer games, birthday parties, and errands, finding time to sit in a barbershop is a challenge. With mobile ${svc.name.toLowerCase()}, you book a slot during naptime or after the kids go to bed, and you get a quality service without sacrificing family time.`
              }
            </p>
            <p>
              {isWomens
                ? `Brides, bridal parties, and event groups are a natural fit for mobile ${svc.name.toLowerCase()}. Having everyone get ready together in one location, whether it is a hotel suite, an Airbnb, or someone's apartment, is more efficient, more fun, and creates better photos than having everyone scatter to different salons. We handle groups of any size with our $99 per hour rate and two-hour minimum for three or more people. Visit our <a href="/events" class="font-medium underline ${isWomens ? "text-blush-dark" : "text-sky-600"}">events page</a> to learn more.`
                : `Grooms and groomsmen also book mobile ${svc.name.toLowerCase()} for wedding day prep and special events. Getting the whole crew looking sharp in one location saves time and eliminates the stress of coordinating multiple barbershop appointments on a busy morning. We handle groups of any size with our $99 per hour rate and two-hour minimum for three or more people.`
              }
            </p>
            <p>
              We also serve clients with mobility challenges, elderly clients who find it difficult to travel to a salon, post-surgery patients recovering at home, and anyone who simply prefers the privacy and convenience of at-home services. Mobile {svc.name.toLowerCase()} is not a luxury reserved for the wealthy. At $99 per hour, it is accessible, practical, and increasingly the preferred choice for New Yorkers across all five boroughs who value their time and comfort.
            </p>
          </div>
        </div>
      </section>

      {/* Book by Borough */}
      <section className={`px-4 py-16 md:py-20 ${isWomens ? "bg-white" : "bg-white"}`}>
        <div className="mx-auto max-w-5xl">
          <h2 className="font-display mb-4 text-center text-3xl font-medium tracking-tight text-charcoal md:text-4xl">
            Book {svc.name} by borough
          </h2>
          <p className="mx-auto mb-8 max-w-2xl text-center text-base text-gray-600">
            We serve every neighborhood in every borough. Select your borough below to find mobile {svc.name.toLowerCase()} near you. Manhattan, Brooklyn, Queens, the Bronx, and Staten Island are all covered by our team of licensed professionals.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
            {Object.entries(boroughNames).map(([boroSlug, boroName]) => (
              <Link key={boroSlug} href={`/services/${slug}/${boroSlug}`} className={`card-hover rounded-xl border bg-white p-6 text-center ${isWomens ? "border-pink-100" : "border-sky-100"}`}>
                <p className="font-semibold text-charcoal">{boroName}</p>
                <p className="text-xs text-gray-400">{neighborhoods[boroSlug].length} neighborhoods</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className={`px-6 py-16 md:py-20 ${isWomens ? "bg-blush-light" : "bg-sky-50"}`}>
        <div className="mx-auto max-w-3xl">
          <h2 className="font-display mb-4 text-center text-3xl font-medium tracking-tight text-charcoal">
            {svc.name} FAQ
          </h2>
          <p className="mx-auto mb-8 max-w-xl text-center text-base text-gray-600">
            Everything you need to know about booking mobile {svc.name.toLowerCase()} in New York City. If your question is not answered here, text or call us anytime.
          </p>
          {serviceFaqs.map((faq, i) => (
            <details key={faq.q} className={`group ${i > 0 ? "border-t border-gray-200" : ""}`}>
              <summary className="flex cursor-pointer items-center justify-between py-5 text-left">
                <span className="font-display text-lg text-charcoal">{faq.q}</span>
                <svg className={`h-5 w-5 shrink-0 transition-transform group-open:rotate-90 ${isWomens ? "text-blush-dark" : "text-sky-600"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 8.25L21 12m0 0l-3.75 3.75M21 12H3" />
                </svg>
              </summary>
              <p className="pb-5 leading-relaxed text-gray-600">{faq.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Related Services */}
      {related.length > 0 && (
        <section className="bg-white px-4 py-16 md:py-20">
          <div className="mx-auto max-w-5xl">
            <h2 className="font-display mb-4 text-center text-3xl font-medium tracking-tight text-charcoal">
              Related {isWomens ? "women's" : "men's"} services
            </h2>
            <p className="mx-auto mb-8 max-w-xl text-center text-base text-gray-600">
              Pair {svc.name.toLowerCase()} with any of these related services for a complete mobile beauty experience. Book multiple services in one appointment to save time.
            </p>
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
              {related.map((r) => (
                <Link key={r.slug} href={`/services/${r.slug}`} className={`card-hover rounded-xl border bg-white p-5 text-center ${isWomens ? "border-pink-100" : "border-gray-200"}`}>
                  <p className="text-sm font-semibold text-charcoal">{r.name}</p>
                  <p className="mt-1 text-xs text-gray-400">{r.description}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Lead Form */}
      <section className={`px-6 py-16 md:py-24 ${isWomens ? "bg-blush-light" : "bg-sky-50"}`}>
        <div className="mx-auto grid max-w-5xl gap-12 md:grid-cols-2 md:items-start">
          <div>
            <h2 className="font-display mb-6 text-3xl font-medium tracking-tight text-charcoal">
              Book {svc.name} <span className="italic">today</span>
            </h2>
            <p className="mb-3 text-lg leading-relaxed text-gray-600">
              Fill out the form and we&apos;ll confirm your {svc.name.toLowerCase()} appointment within 24 hours. We serve all five boroughs of New York City, seven days a week, with morning, afternoon, and evening availability. Whether you need mobile {svc.name.toLowerCase()} at your apartment, office, hotel, or event venue, we have got you covered.
            </p>
            <p className="mb-5 text-lg leading-relaxed text-gray-600">
              Our rate is $99 per hour with a one-hour minimum for individual clients and a two-hour minimum for groups of three or more. Every appointment includes travel, all tools and products, a licensed professional, and complete setup and cleanup. Or reach us directly:
            </p>
            <div className="space-y-3">
              <a href="sms:+12122029075" className={`flex items-center gap-3 text-lg font-medium hover:underline ${isWomens ? "text-blush-dark" : "text-sky-600"}`}>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                Text us anytime
              </a>
              <a href="tel:+12122029075" className={`flex items-center gap-3 text-lg font-medium hover:underline ${isWomens ? "text-blush-dark" : "text-sky-600"}`}>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                Call us
              </a>
            </div>
          </div>
          <LeadForm id={`service-${slug}`} />
        </div>
      </section>
    </>
  );
}
