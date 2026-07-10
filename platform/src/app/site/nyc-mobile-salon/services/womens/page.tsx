import type { Metadata } from "next";
import Link from "next/link";
import { womensCategories, boroughNames, neighborhoods } from "@/app/site/nyc-mobile-salon/_lib/constants";
import { serviceContent } from "@/app/site/nyc-mobile-salon/_lib/service-content";
import { faqSchema, breadcrumbSchema } from "@/app/site/nyc-mobile-salon/_lib/seo";

export const metadata: Metadata = {
  title: "Women\u2019s Mobile Beauty Services in NYC | Hair, Nails, Makeup, Waxing, Facials",
  description:
    "30+ women\u2019s mobile beauty services delivered to your door in NYC. Blowouts, gel nails, silk press, bridal glam, balayage, waxing, facials, lash extensions, braids & more. Licensed pros across all 5 boroughs. $99/hour.",
  alternates: { canonical: "https://thenycmobilesalon.com/services/womens" },
  openGraph: {
    title: "Women\u2019s Mobile Beauty Services in NYC | Hair, Nails, Makeup, Waxing, Facials",
    description:
      "30+ women\u2019s mobile beauty services delivered to your door in NYC. Blowouts, gel nails, silk press, bridal glam, balayage, waxing, facials, lash extensions, braids & more. Licensed pros across all 5 boroughs. $99/hour.",
    url: "https://thenycmobilesalon.com/services/womens",
  },
};

const faqs = [
  {
    q: "What women\u2019s beauty services do you offer?",
    a: "We offer over 30 women\u2019s beauty services across five categories: hair (blowouts, cuts, color, silk press, braids, extensions, updos), nails (classic and gel manicures, pedicures, nail art, acrylics, dip powder), makeup (full glam, natural looks, lash application), skincare (express facials, deep cleansing facials, microdermabrasion, chemical peels), and waxing (brow, lip, bikini, Brazilian, legs, underarm). Every service is performed by a fully licensed, insured professional who comes to your home, office, hotel, or event venue anywhere in New York City.",
  },
  {
    q: "How much do women\u2019s beauty services cost?",
    a: "Our services start at $99 per hour with a one-hour minimum for individual appointments. For groups of three or more people, there is a two-hour minimum. Specific service prices vary \u2014 for example, a classic manicure starts at $45, a gel manicure at $65, a blowout at $99, and full glam makeup at $150. Visit our pricing page for a complete breakdown of every service.",
  },
  {
    q: "Can I get hair and nails done in one visit?",
    a: "Absolutely. Many of our clients book combination appointments \u2014 a blowout plus a gel manicure is one of our most popular combos. You can mix and match any services from our menu in a single visit. Your stylist and nail tech can work simultaneously if you book both, or we can schedule them back-to-back. Just let us know what you need when you book.",
  },
  {
    q: "Do you offer bridal hair and makeup services?",
    a: "Yes. Bridal services are one of our specialties. We offer bridal hair and makeup, bridal party packages for bridesmaids and mothers, trial runs before the big day, and engagement or boudoir photo shoot styling. We come to your home, hotel, or venue on the morning of your wedding so you and your party can get ready together in comfort. Visit our events page for full details on bridal packages.",
  },
  {
    q: "What hair types and textures do you work with?",
    a: "Our stylists work with every hair type and texture \u2014 straight, wavy, curly, coily, fine, thick, natural, color-treated, and everything in between. We have specialists in silk press for natural hair (type 3 and 4 textures), braids and protective styles, extensions for all hair types, and color services for every shade and texture. When you book, let us know your hair type so we can match you with the right stylist.",
  },
  {
    q: "What products do your professionals use?",
    a: "Our professionals use salon-grade, professional products from trusted brands. For hair, that includes tools like professional dryers, flat irons, and curling wands, plus products with heat protectant and finishing serums. For nails, we use OPI, Essie, CND Shellac, and Gelish gel polishes. For makeup, our artists carry MAC, NARS, Charlotte Tilbury, and Make Up For Ever. For skincare, our estheticians use professional-grade cleansers, serums, masks, and SPF customized to your skin type.",
  },
  {
    q: "Can I book for a group of friends or a party?",
    a: "Yes. Group bookings are one of our most popular offerings. Whether it\u2019s a bridal party, bachelorette, birthday celebration, baby shower, girls\u2019 night in, or prom prep, we bring a full team to your location. For groups of three or more, there is a two-hour minimum at $99 per hour. We can accommodate groups of any size \u2014 just tell us how many people and what services you need.",
  },
  {
    q: "Do you serve my neighborhood in NYC?",
    a: "We serve all five boroughs of New York City \u2014 Manhattan, Brooklyn, Queens, the Bronx, and Staten Island. Our professionals travel to over 200 neighborhoods across the city, from the Upper East Side to Astoria, Park Slope to Riverdale, and everywhere in between. Enter your address when you book and we\u2019ll confirm availability in your area.",
  },
];

const categoryIntros: Record<string, string[]> = {
  hair: [
    "Hair services are the cornerstone of our women\u2019s beauty menu, and for good reason. Whether you are preparing for a major life event like a wedding or simply want to look and feel your best on a Tuesday afternoon, our licensed hairstylists deliver salon-quality results in the comfort of your own space. Every stylist arrives with professional-grade tools, premium products, and the expertise to work with your unique hair type, texture, and personal style. From a quick blowout before a dinner reservation to a full color transformation that takes hours of careful work, we handle it all.",
    "Our hair services span the full range of what you would find at any top-tier NYC salon. We offer blowouts and styling for every occasion, precision haircuts and trims tailored to your face shape and lifestyle, single-process and double-process color for everything from root touch-ups to platinum transformations, highlights and balayage for natural-looking dimension, deep conditioning treatments to restore damaged or dry hair, silk press for natural hair, braids and protective styles including box braids and cornrows, hair extension installation and removal, and elegant updos for weddings and formal events. Every service starts at $99 per hour.",
    "What sets our mobile hair services apart is the personalized attention you receive. In a busy NYC salon, you might see three different people during a single appointment. With us, one dedicated stylist handles your service from start to finish. They consult with you before picking up a single tool, they customize every step to your preferences, and they are not rushing to get to the next client in the chair. The result is better communication, better results, and a far more relaxing experience. Browse our full hair menu below and book your appointment today.",
  ],
  nails: [
    "Our mobile nail services bring the full nail salon experience to your door \u2014 minus the commute, the wait, and the questionable ventilation. Every nail technician arrives with a portable station, professional-grade tools, a full range of polish colors, UV and LED lamps for gel services, and hospital-grade sanitation supplies. Whether you want a quick classic manicure with OPI polish or an elaborate set of custom nail art over acrylics, our techs deliver flawless results at your kitchen table, your couch, or wherever you are most comfortable.",
    "We offer seven distinct nail services designed to cover every preference and occasion. Our classic manicure is perfect for a quick, polished finish. The gel manicure delivers chip-free, glossy nails that last two to three weeks. Classic and gel pedicures keep your feet looking and feeling their best with soaks, scrubs, callus removal, and massage included. Our nail art service is for anyone who wants custom, hand-painted designs \u2014 bring a Pinterest board or describe your vision and our artists will bring it to life. Acrylic and press-on application gives you length and strength in any shape you want, and dip powder provides a lightweight, durable alternative to both gel and acrylic. Prices start at $45 for a classic manicure and $65 for a gel manicure.",
    "One of the biggest advantages of mobile nail services is the ability to combine them with other treatments in a single appointment. Many of our clients book a gel manicure alongside a blowout, or add a pedicure to a facial appointment. You can mix and match any services on our menu, and for groups of three or more, you can turn it into a full pampering session with a two-hour minimum. No more running from the nail salon to the hair salon to the waxing studio \u2014 we bring everything to one location.",
  ],
  makeup: [
    "Our mobile makeup services are designed for anyone who wants to look camera-ready without sitting in a makeup chair at a busy studio. Our licensed makeup artists arrive at your door with professional kits stocked with products from MAC, NARS, Charlotte Tilbury, Make Up For Ever, and other top brands. They bring brushes, sponges, lashes, primers, setting sprays, and everything needed to create any look you envision, from a soft natural finish for a professional headshot to full glam for a wedding or gala.",
    "We offer three makeup services to cover the full spectrum of looks. Our full glam makeup is the signature service \u2014 perfect for weddings, galas, photo shoots, content creation, nights out, and any occasion where you want to look absolutely stunning. It includes skin prep, primer, full-coverage foundation, concealer, contour, highlight, eye makeup, lashes (strip or individual), and lip, all finished with setting spray for all-day wear. Our natural everyday makeup service is for clients who want a polished, enhanced look without the heavy coverage \u2014 great for professional headshots, first dates, brunches, and everyday confidence. And our lash application service offers standalone strip or individual lash application for instant drama in under 30 minutes.",
    "Makeup is also one of our most popular services for events. Bridal parties, bachelorette weekends, birthday celebrations, prom groups, and corporate headshot sessions all benefit from having a professional makeup artist come directly to the location. We can send multiple artists for larger groups to ensure everyone is ready on time. If you are planning an event, check out our events page for details on group bookings and packages.",
  ],
  skin: [
    "Professional skincare should not require a trip to a spa with a three-week waitlist. Our mobile skincare services bring licensed estheticians directly to your home, equipped with portable steamers, professional-grade products, and the training to address every skin concern from acne and hyperpigmentation to fine lines and dehydration. Every facial begins with a thorough skin assessment so your esthetician can customize the treatment to your specific skin type, condition, and goals.",
    "We offer four skincare services that range from quick maintenance to advanced treatment. The express facial is a 30-minute cleanse-tone-glow session perfect for busy schedules or pre-event skin prep. Our deep cleansing facial is a full 60-minute treatment with double cleansing, exfoliation, steam, extractions, a custom mask, serum, moisturizer, and SPF. Microdermabrasion uses professional-grade diamond-tip devices to exfoliate dead skin cells and promote cell turnover, ideal for dull skin, uneven texture, and mild scarring. And our light chemical peel uses glycolic, lactic, or salicylic acid to gently resurface the skin for a brighter, smoother complexion with minimal downtime.",
    "Skincare is deeply personal, and that is exactly why a mobile service makes so much sense. In your own bathroom, your esthetician has access to warm water, good lighting, and the privacy you need to fully relax and enjoy the treatment. There is no rushing to get dressed and back into the city after your facial \u2014 you can simply continue with your day (or go straight to bed with fresh, glowing skin). Our skincare services also pair beautifully with other services on our menu, so you can book a facial before a blowout and makeup application for the ultimate pre-event experience.",
  ],
  waxing: [
    "Our mobile waxing services offer professional hair removal in the comfort and privacy of your own home. Every waxing specialist is fully licensed and arrives with professional hard wax (which is gentler on the skin than strip wax for sensitive areas), disposable supplies, sanitation products, and soothing post-wax treatments. Privacy is especially important for intimate waxing services like bikini and Brazilian, and there is no more private setting than your own space.",
    "We offer six waxing services covering every area: brow wax and shaping for clean, sculpted arches that frame your face; lip and chin wax for quick facial hair removal; full face wax covering brows, upper lip, chin, and sideburns; bikini and Brazilian wax for clean lines or full removal; full leg and half leg wax for smooth, razor-burn-free legs; and underarm wax for results that last weeks longer than shaving. Prices range from $25 for a lip and chin wax to $120 for a full leg wax, and most services take 30 minutes or less.",
    "Waxing is also one of the easiest services to combine with other appointments. Many clients add a brow wax to a blowout or facial, or combine a Brazilian with a leg wax and underarm wax for a full body session. Results from professional waxing last three to six weeks depending on your hair growth cycle, making it far more effective and long-lasting than shaving. Our specialists also provide aftercare instructions to help you avoid ingrown hairs and irritation between appointments.",
  ],
};

function Sparkle({ className = "" }: { className?: string }) {
  return (
    <svg className={`inline-block ${className}`} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0L14.59 8.41L23 11L14.59 13.59L12 22L9.41 13.59L1 11L9.41 8.41L12 0Z" />
    </svg>
  );
}

export default function WomensServicesPage() {
  return (
    <>
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema(faqs)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbSchema([
              { name: "Home", url: "/" },
              { name: "Services", url: "/services" },
              { name: "Women\u2019s Services", url: "/services/womens" },
            ])
          ),
        }}
      />

      {/* Hero */}
      <section className="relative overflow-hidden px-4 py-20 md:py-28" style={{ background: "linear-gradient(135deg, #E8A0BF 0%, #D4749B 50%, #C45A85 100%)" }}>
        <div className="pointer-events-none absolute -right-20 -top-20 h-60 w-60 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-20 bottom-0 h-80 w-80 rounded-full bg-white/5 blur-3xl" />
        <div className="relative mx-auto max-w-4xl text-center">
          <div className="mb-4 flex items-center justify-center gap-2">
            <Sparkle className="h-4 w-4 text-white/60" />
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">For Her</span>
            <Sparkle className="h-4 w-4 text-white/60" />
          </div>
          <h1 className="font-display mb-6 text-5xl font-bold tracking-tight text-white md:text-6xl lg:text-7xl">
            Women&apos;s <span className="italic">Beauty Services</span>
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-white/80">
            Hair, nails, makeup, skincare, and waxing &mdash; 30+ services delivered to your door by licensed professionals across <Link href="/locations/manhattan" className="text-white underline hover:text-white/80">Manhattan</Link>, <Link href="/locations/brooklyn" className="text-white underline hover:text-white/80">Brooklyn</Link>, <Link href="/locations/queens" className="text-white underline hover:text-white/80">Queens</Link>, the <Link href="/locations/bronx" className="text-white underline hover:text-white/80">Bronx</Link> &amp; <Link href="/locations/staten-island" className="text-white underline hover:text-white/80">Staten Island</Link>.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/book" className="btn-outline-white">Book Now</Link>
            <Link href="/pricing" className="btn-outline-white">See Pricing</Link>
          </div>
        </div>
      </section>

      {/* Intro SEO block */}
      <section className="bg-white px-6 py-16 md:py-20">
        <div className="mx-auto max-w-4xl">
          <div className="space-y-5 text-lg leading-relaxed text-gray-600">
            <p>
              The NYC Mobile Salon offers a complete menu of women&apos;s beauty services &mdash; all delivered to your home, office, hotel, or event venue anywhere in New York City. Every service is performed by a fully licensed, insured professional who arrives at your door with all the tools, products, and sanitation supplies needed. No commute. No parking. No waiting room. Just salon-quality results in the comfort of your own space. Our services start at <strong>$99 per hour</strong> with a one-hour minimum for individual appointments and a two-hour minimum for groups of three or more.
            </p>
            <p>
              Our women&apos;s services span five categories: <strong>hair</strong> (including <Link href="/services/blowouts-and-styling" className="text-blush-dark underline hover:text-blush">blowouts and styling</Link>, <Link href="/services/haircuts-and-trims" className="text-blush-dark underline hover:text-blush">haircuts and trims</Link>, <Link href="/services/single-process-color" className="text-blush-dark underline hover:text-blush">single-process color</Link>, <Link href="/services/double-process-color" className="text-blush-dark underline hover:text-blush">double-process color</Link>, <Link href="/services/highlights-balayage-ombre" className="text-blush-dark underline hover:text-blush">highlights and balayage</Link>, <Link href="/services/deep-conditioning-treatment" className="text-blush-dark underline hover:text-blush">deep conditioning</Link>, <Link href="/services/silk-press" className="text-blush-dark underline hover:text-blush">silk press</Link>, <Link href="/services/braids-and-protective-styles" className="text-blush-dark underline hover:text-blush">braids and protective styles</Link>, <Link href="/services/extensions" className="text-blush-dark underline hover:text-blush">extensions</Link>, and <Link href="/services/updo-and-formal-styling" className="text-blush-dark underline hover:text-blush">updos</Link>), <strong>nails</strong> (including <Link href="/services/classic-manicure" className="text-blush-dark underline hover:text-blush">classic manicures</Link>, <Link href="/services/gel-manicure" className="text-blush-dark underline hover:text-blush">gel manicures</Link>, <Link href="/services/classic-pedicure" className="text-blush-dark underline hover:text-blush">pedicures</Link>, <Link href="/services/nail-art" className="text-blush-dark underline hover:text-blush">nail art</Link>, <Link href="/services/acrylic-press-on" className="text-blush-dark underline hover:text-blush">acrylics</Link>, and <Link href="/services/dip-powder" className="text-blush-dark underline hover:text-blush">dip powder</Link>), <strong>makeup</strong> (including <Link href="/services/full-glam-makeup" className="text-blush-dark underline hover:text-blush">full glam</Link>, <Link href="/services/natural-everyday-makeup" className="text-blush-dark underline hover:text-blush">natural everyday looks</Link>, and <Link href="/services/lash-application" className="text-blush-dark underline hover:text-blush">lash application</Link>), <strong>skincare</strong> (including <Link href="/services/express-facial" className="text-blush-dark underline hover:text-blush">express facials</Link>, <Link href="/services/deep-cleansing-facial" className="text-blush-dark underline hover:text-blush">deep cleansing facials</Link>, <Link href="/services/microdermabrasion" className="text-blush-dark underline hover:text-blush">microdermabrasion</Link>, and <Link href="/services/light-chemical-peel" className="text-blush-dark underline hover:text-blush">chemical peels</Link>), and <strong>waxing</strong> (including <Link href="/services/brow-wax-and-shape" className="text-blush-dark underline hover:text-blush">brow shaping</Link>, <Link href="/services/bikini-brazilian-wax" className="text-blush-dark underline hover:text-blush">bikini and Brazilian</Link>, <Link href="/services/leg-wax" className="text-blush-dark underline hover:text-blush">leg wax</Link>, and more).
            </p>
            <p>
              Whether you need a quick 30-minute <Link href="/services/gel-manicure" className="text-blush-dark underline hover:text-blush">gel manicure</Link> before a dinner date, a full bridal glam transformation on the morning of your wedding, or a relaxing <Link href="/services/deep-cleansing-facial" className="text-blush-dark underline hover:text-blush">deep cleansing facial</Link> on a Sunday evening, we have the right professional for every service. Our team includes hairstylists who specialize in textured hair and silk press, colorists who handle everything from root touch-ups to platinum double-process, nail technicians with years of experience in gel, acrylic, and hand-painted art, makeup artists who have worked editorial, bridal, and red carpet, estheticians trained in advanced skincare treatments, and waxing specialists who work with professional hard wax for maximum comfort.
            </p>
            <p>
              We serve all five boroughs of New York City, covering over 200 neighborhoods from the Upper East Side to Far Rockaway, from Riverdale to Tottenville. Our professionals are based throughout the city so travel time is minimal, and we are available mornings, evenings, and weekends to fit your schedule. You can book a single service for yourself or a full day of pampering for a group &mdash; we have handled bridal parties of 12, corporate wellness events with 30 employees, and everything in between. Visit our <Link href="/events" className="text-blush-dark underline hover:text-blush">events page</Link> for group bookings or our <Link href="/classes" className="text-blush-dark underline hover:text-blush">classes page</Link> to learn a new skill from our pros.
            </p>
            <p>
              Every appointment is backed by our commitment to professionalism, cleanliness, and quality. All of our professionals carry liability insurance, follow strict sanitation protocols between clients, and use single-use disposable items wherever possible. We bring our own tools, products, towels, and supplies &mdash; you do not need to provide anything. Just open your door, sit down, and let us handle the rest. New York City is the most demanding city in the world, and our women&apos;s beauty services are built to meet that demand with the quality, convenience, and reliability that New Yorkers expect.
            </p>
            <p>
              Ready to experience the difference? <Link href="/book" className="text-blush-dark underline hover:text-blush">Book your appointment</Link> online in under two minutes, or visit our <Link href="/pricing" className="text-blush-dark underline hover:text-blush">pricing page</Link> for a full breakdown of what every service costs. If you have questions, check out the <Link href="/faq" className="text-blush-dark underline hover:text-blush">FAQ</Link> at the bottom of this page or reach out to us directly. We are here to make you look and feel incredible &mdash; wherever you are in the city.
            </p>
          </div>
        </div>
      </section>

      {/* Service Categories */}
      {womensCategories.map((cat, catIdx) => (
        <section key={cat.slug} className={`px-4 py-16 md:py-20 ${catIdx % 2 === 0 ? "bg-blush-light" : "bg-white"}`}>
          <div className="mx-auto max-w-6xl">
            <div className="mb-10">
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-blush-dark">
                <Sparkle className="mr-1 h-3 w-3" /> {cat.title}
              </p>
              <h2 className="font-display text-3xl font-medium tracking-tight text-charcoal md:text-4xl">
                Mobile {cat.title} Services
              </h2>
            </div>

            {/* Category intro paragraphs */}
            {categoryIntros[cat.slug] && (
              <div className="mb-10 space-y-4 text-base leading-relaxed text-gray-600">
                {categoryIntros[cat.slug].map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>
            )}

            <div className="grid gap-6 md:grid-cols-2">
              {cat.services.map((svc) => {
                const content = serviceContent[svc.slug];
                return (
                  <Link key={svc.slug} href={`/services/${svc.slug}`} className="group rounded-xl border border-pink-100 bg-white p-6 transition-all hover:shadow-md hover:shadow-blush/10">
                    <h3 className="font-display mb-2 text-xl font-semibold text-charcoal group-hover:text-blush-dark transition-colors">{svc.name}</h3>
                    <p className="mb-3 text-sm text-gray-500">{svc.description}</p>
                    {content && (
                      <div className="flex items-center gap-4 text-xs text-blush-dark">
                        <span>{content.duration}</span>
                        <span className="text-gray-300">|</span>
                        <span>From {content.price}</span>
                        <span className="ml-auto font-semibold group-hover:translate-x-1 transition-transform">&rarr;</span>
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      ))}

      {/* Why Mobile Beauty for Women */}
      <section className="bg-white px-6 py-16 md:py-20">
        <div className="mx-auto max-w-4xl">
          <div className="mb-8 text-center">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-blush-dark">
              <Sparkle className="mr-1 h-3 w-3" /> The Mobile Advantage
            </p>
            <h2 className="font-display text-3xl font-medium tracking-tight text-charcoal md:text-4xl">
              Why Women in NYC Choose Mobile Beauty
            </h2>
          </div>
          <div className="space-y-5 text-lg leading-relaxed text-gray-600">
            <p>
              New York City women are among the busiest people on the planet. Between demanding careers, family responsibilities, social commitments, fitness routines, and the sheer logistics of navigating a city of eight million people, finding time for self-care can feel impossible. Traditional salons require commuting, waiting, and blocking out far more time than the service itself actually takes. A 45-minute blowout becomes a two-hour ordeal when you factor in the subway ride, the wait for your stylist, and the walk home. Mobile beauty eliminates all of that friction. Your stylist arrives at your door at the exact time you booked, performs the service, and you are done. No commute, no waiting room, no wasted time.
            </p>
            <p>
              For busy professionals, mobile beauty means you can get a blowout before a morning meeting without waking up at 5 AM, or have your nails done during your lunch break without leaving the office. For moms, it means getting your hair colored while the baby naps, or having a stylist come while the kids are at school instead of trying to find childcare for a salon visit. For brides, it means the entire bridal party can get ready together at the hotel or venue, creating memories and reducing the chaos of wedding-morning logistics. For anyone recovering from surgery, managing a disability, or simply preferring the comfort of home, mobile beauty brings professional services directly to you.
            </p>
            <p>
              There is also a quality advantage that many clients do not expect. In a traditional salon, your stylist is often juggling multiple clients at once, stepping away to check on someone else&apos;s color processing or fielding interruptions from the front desk. With a mobile appointment, your professional&apos;s entire focus is on you. The consultation is more thorough, the service is more attentive, and the results are consistently better because there are zero distractions. Every service at The NYC Mobile Salon starts at $99 per hour, and the quality of that hour is unmatched by anything you will experience in a traditional salon setting.
            </p>
            <p>
              Finally, mobile beauty is simply more hygienic. Our professionals bring their own sanitized tools, single-use disposable items, and fresh products to every appointment. You are not sharing a nail station that has seen a dozen clients that day, or sitting in a styling chair with someone else&apos;s hair still on the cape. Your appointment happens in your own clean space, with tools that were sanitized specifically for you. For anyone who has ever been concerned about salon cleanliness &mdash; and especially since the pandemic raised everyone&apos;s awareness of shared spaces &mdash; mobile beauty offers peace of mind that brick-and-mortar salons simply cannot match.
            </p>
          </div>
        </div>
      </section>

      {/* Events for Women */}
      <section className="bg-blush-light px-6 py-16 md:py-20">
        <div className="mx-auto max-w-4xl">
          <div className="mb-8 text-center">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-blush-dark">
              <Sparkle className="mr-1 h-3 w-3" /> Group Bookings
            </p>
            <h2 className="font-display text-3xl font-medium tracking-tight text-charcoal md:text-4xl">
              Beauty Events &amp; Parties for Women
            </h2>
          </div>
          <div className="space-y-5 text-lg leading-relaxed text-gray-600">
            <p>
              Some of the best moments in life are shared with the women closest to you, and The NYC Mobile Salon makes it easy to turn those moments into full-on pampering experiences. Our event services bring a team of licensed professionals directly to your home, hotel suite, Airbnb, venue, or any private space in New York City. Whether you are celebrating a wedding, a milestone birthday, a baby on the way, or simply a Saturday night with your best friends, we handle the beauty so you can focus on the celebration.
            </p>
            <p>
              <strong>Bridal parties</strong> are our most popular group booking. We offer <Link href="/events" className="text-blush-dark underline hover:text-blush">bridal hair and makeup</Link>, bridal party packages for bridesmaids and mothers, trial runs, and engagement or boudoir shoot styling. Our team arrives at your getting-ready location with everything needed to make every member of the bridal party look and feel incredible. For <strong>bachelorette weekends</strong>, we bring manicures, pedicures, blowouts, and makeup to your rental or hotel for a spa-like experience without leaving the party. <strong>Birthday celebrations</strong> get the same treatment &mdash; book nail art, glam makeup, and styling for the birthday crew. <strong>Baby showers</strong> are elevated with mini manicures and express facials for the guests while the mama-to-be gets pampered. And <strong>girls&apos; night in</strong> is taken to another level with a mix of mani-pedis, blowouts, and face masks (you supply the wine).
            </p>
            <p>
              Group bookings require a two-hour minimum at $99 per hour for parties of three or more. We can accommodate groups of any size &mdash; for larger events, we send multiple professionals so everyone is served efficiently. We also offer corporate event services including office wellness days, headshot styling, and conference touch-up stations. Whatever the occasion, visit our <Link href="/events" className="text-blush-dark underline hover:text-blush">events page</Link> to explore the full menu and book your group.
            </p>
          </div>
        </div>
      </section>

      {/* Classes */}
      <section className="bg-white px-6 py-16 md:py-20">
        <div className="mx-auto max-w-4xl">
          <div className="mb-8 text-center">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-blush-dark">
              <Sparkle className="mr-1 h-3 w-3" /> Learn From the Pros
            </p>
            <h2 className="font-display text-3xl font-medium tracking-tight text-charcoal md:text-4xl">
              Beauty Classes &amp; Workshops
            </h2>
          </div>
          <div className="space-y-5 text-lg leading-relaxed text-gray-600">
            <p>
              Want to learn the techniques our professionals use so you can recreate them at home? Our <Link href="/classes" className="text-blush-dark underline hover:text-blush">beauty classes and workshops</Link> are hands-on, small-group sessions taught by the same licensed pros who deliver our services. Each class is designed to be fun, social, and genuinely educational &mdash; you will leave with real skills you can use every day, not just a certificate.
            </p>
            <p>
              Our current class lineup includes the <Link href="/classes/diy-blowout-workshop" className="text-blush-dark underline hover:text-blush">DIY Blowout Workshop</Link> where you will learn to blow out your own hair like a professional stylist using round brushes, flat irons, and the right products. The <Link href="/classes/braiding-basics-class" className="text-blush-dark underline hover:text-blush">Braiding Basics</Link> class covers French braids, Dutch braids, fishtails, and more. Our <Link href="/classes/everyday-makeup-masterclass" className="text-blush-dark underline hover:text-blush">Everyday Makeup Masterclass</Link> teaches you how to build a quick, polished daily makeup routine that takes under 10 minutes. The <Link href="/classes/skincare-routine-workshop" className="text-blush-dark underline hover:text-blush">Skincare Routine Workshop</Link> helps you find your perfect cleanse-treat-protect routine based on your skin type. And the <Link href="/classes/group-nail-art-class" className="text-blush-dark underline hover:text-blush">Group Nail Art Class</Link> teaches design techniques and nail art basics that you can practice at home. Classes accommodate groups of 4 to 12 and last 90 minutes to 2 hours.
            </p>
            <p>
              Classes are perfect for birthday parties, bridal showers, team-building events, or any group that wants to learn something new together. They can also be combined with our regular services &mdash; book a braiding class followed by blowouts, or a skincare workshop followed by express facials. Visit our <Link href="/classes" className="text-blush-dark underline hover:text-blush">classes page</Link> for the full lineup, pricing, and availability.
            </p>
          </div>
        </div>
      </section>

      {/* Available by Borough */}
      <section className="bg-blush-light px-4 py-16 md:py-20">
        <div className="mx-auto max-w-5xl text-center">
          <h2 className="font-display mb-4 text-3xl font-medium tracking-tight text-charcoal md:text-4xl">
            Available across all five boroughs
          </h2>
          <p className="mx-auto mb-8 max-w-2xl text-gray-500">
            Our licensed professionals are based throughout New York City, covering over 200 neighborhoods. No matter where you live, work, or are hosting an event, we come to you.
          </p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
            {Object.entries(boroughNames).map(([slug, name]) => (
              <Link key={slug} href={`/locations/${slug}`} className="card-hover rounded-xl border border-pink-100 bg-white p-6 text-center">
                <p className="text-lg font-semibold text-charcoal">{name}</p>
                <p className="mt-1 text-xs text-blush-dark">{neighborhoods[slug]?.length} neighborhoods</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-white px-6 py-16 md:py-20">
        <div className="mx-auto max-w-4xl">
          <div className="mb-10 text-center">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-blush-dark">
              <Sparkle className="mr-1 h-3 w-3" /> Common Questions
            </p>
            <h2 className="font-display text-3xl font-medium tracking-tight text-charcoal md:text-4xl">
              Frequently Asked Questions
            </h2>
          </div>
          <div className="space-y-6">
            {faqs.map((faq, i) => (
              <div key={i} className="rounded-xl border border-pink-100 bg-blush-light/50 p-6">
                <h3 className="font-display mb-3 text-lg font-semibold text-charcoal">{faq.q}</h3>
                <p className="text-base leading-relaxed text-gray-600">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 py-16 md:py-20 text-center" style={{ background: "linear-gradient(135deg, #E8A0BF 0%, #D4749B 50%, #C45A85 100%)" }}>
        <div className="mx-auto max-w-3xl">
          <h2 className="font-display mb-4 text-3xl font-medium text-white md:text-4xl">
            Ready to get <span className="italic">pampered?</span>
          </h2>
          <p className="mb-4 text-lg text-white/80">
            Over 30 women&apos;s beauty services delivered to your door by licensed professionals. Hair, nails, makeup, skincare, and waxing &mdash; all five boroughs, seven days a week. Starting at $99 per hour.
          </p>
          <p className="mb-8 text-white/70">
            Book online in under two minutes. Choose your service, pick your time, and we handle the rest. No commute, no waiting, no hassle &mdash; just salon-quality results in the comfort of your own space.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/book" className="btn-outline-white">Book Your Appointment</Link>
            <Link href="/pricing" className="btn-outline-white">View Pricing</Link>
            <Link href="/events" className="btn-outline-white">Plan a Group Event</Link>
          </div>
        </div>
      </section>
    </>
  );
}
