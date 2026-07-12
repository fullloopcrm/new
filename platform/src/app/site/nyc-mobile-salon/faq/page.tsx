import { safeJsonLd } from '@/lib/escape-html'
import type { Metadata } from "next";
import Link from "next/link";
import { faqSchema, breadcrumbSchema } from "@/app/site/nyc-mobile-salon/_lib/seo";

export const metadata: Metadata = {
  title: "Frequently Asked Questions — Mobile Beauty in NYC | The NYC Mobile Salon",
  description: "Everything you need to know about booking mobile beauty services in NYC. Pricing ($99/hr), coverage (all 5 boroughs), services (37+), licensing, cancellation policy, events, classes, and more.",
  alternates: { canonical: "https://thenycmobilesalon.com/faq" },
  openGraph: {
    title: "Frequently Asked Questions — Mobile Beauty in NYC | The NYC Mobile Salon",
    description: "Everything you need to know about booking mobile beauty services in NYC. Pricing ($99/hr), coverage (all 5 boroughs), services (37+), licensing, cancellation policy, events, classes, and more.",
    url: "https://thenycmobilesalon.com/faq",
  },
};

/* ───────── Sparkle SVG ───────── */
function Sparkle({ className = "" }: { className?: string }) {
  return (
    <svg className={`inline-block ${className}`} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0L14.59 8.41L23 11L14.59 13.59L12 22L9.41 13.59L1 11L9.41 8.41L12 0Z" />
    </svg>
  );
}

/* ───────── FAQs ───────── */
const faqs = [
  /* ── Booking & Scheduling ── */
  {
    q: "How do I book a mobile beauty appointment in NYC?",
    a: "Booking a mobile beauty appointment with The NYC Mobile Salon is simple and takes less than two minutes. Just visit our online booking page, select the services you need, choose your preferred date and time, and enter your location anywhere in New York City. Once we receive your request, we match you with a licensed stylist who specializes in the services you selected and confirm your appointment via text or email. You can also reach out to us directly at hey@thenycmobilesalon.com if you have special requests or want help planning a group session. We designed the entire process to be as effortless as possible so you can focus on your day while we handle the rest.",
  },
  {
    q: "How far in advance should I book my appointment?",
    a: "We recommend booking at least 24 to 48 hours in advance to secure your preferred stylist and time slot, especially during busy weekends and holiday seasons. That said, we understand that life in New York City moves fast and sometimes you need beauty services on short notice. We do our best to accommodate same-day and next-day requests depending on stylist availability. For events, bridal parties, and group bookings of three or more people, we strongly recommend booking at least one to two weeks ahead to ensure we can assign enough stylists to cover everyone comfortably. The earlier you book, the more flexibility you have with timing and stylist selection.",
  },
  {
    q: "Can I book a same-day mobile beauty appointment?",
    a: "Yes, we accept same-day bookings whenever stylist availability allows. New York City is our home base and we have stylists stationed across all five boroughs, so there is a good chance we can get someone to your door even with just a few hours of notice. Same-day availability is first-come, first-served, so the earlier in the day you reach out the better your chances. If you need a last-minute appointment, submit a booking request through our online form or email us directly at hey@thenycmobilesalon.com and we will do everything we can to make it happen. Same-day appointments are priced the same as any other booking at $99 per hour with no rush fees or surcharges.",
  },
  {
    q: "Can I request a specific stylist?",
    a: "Absolutely. If you have worked with one of our stylists before and loved the experience, just include their name in the notes when you book and we will prioritize scheduling them for your appointment. Many of our clients build ongoing relationships with their favorite stylist, and we think that continuity is one of the best parts of the mobile salon experience. If your preferred stylist is unavailable for your requested time, we will let you know and either suggest an alternative time or match you with another highly rated professional who specializes in the same services. Every stylist on our team is licensed, vetted, and reviewed, so you are in great hands no matter who shows up.",
  },
  {
    q: "What if I need to reschedule or cancel my appointment?",
    a: "We offer free cancellation and rescheduling up to 12 hours before your scheduled appointment time. Life in NYC is unpredictable and we completely understand that plans change, so we keep our cancellation policy as flexible as possible. If you cancel or reschedule with less than 12 hours notice, a cancellation fee may apply to compensate the stylist who reserved that time for you. To reschedule, simply reply to your confirmation email or text, or reach out to us at hey@thenycmobilesalon.com. We will work with you to find a new time that fits your schedule without any hassle.",
  },
  {
    q: "What are your hours of operation?",
    a: "We offer mobile beauty services seven days a week across all five boroughs of New York City. Our standard booking hours run from 7 AM to 9 PM, which gives you plenty of flexibility whether you need early-morning styling before a big meeting or evening glam before a night out. For special events like weddings, corporate functions, and photo shoots, we can accommodate earlier or later appointments depending on stylist availability. We operate on holidays as well, since we know that is when people often need beauty services the most. Just book through our online form and select the time that works best for you.",
  },

  /* ── Pricing & Payment ── */
  {
    q: "How much do mobile beauty services cost in NYC?",
    a: "All of our mobile beauty services are priced at a flat rate of $99 per hour, regardless of the service type. Whether you are booking a blowout, a full set of gel nails, a men's haircut, makeup application, or any of our 37+ services, the rate stays the same. This simple, transparent pricing model means you always know exactly what you are paying before your appointment and there are never any surprises on your bill. Visit our pricing page for a full breakdown of what you can accomplish in a one-hour or two-hour session. We believe luxury mobile beauty should be accessible, and our $99 per hour rate reflects that commitment.",
  },
  {
    q: "Is there a minimum booking requirement?",
    a: "Yes. For individual appointments, there is a one-hour minimum booking at $99. This gives your stylist enough time to deliver high-quality results for most single services, whether that is a haircut, blowout, manicure, or makeup application. For group bookings of three or more people, including events, parties, and classes, there is a two-hour minimum at $99 per hour. The two-hour minimum for groups ensures your stylist or stylists have adequate time to serve everyone in the group without rushing. You can always book additional hours beyond the minimum if you need more time or want to combine multiple services in a single visit.",
  },
  {
    q: "Are there any hidden fees or extra charges?",
    a: "No, never. Our $99 per hour rate is all-inclusive with no hidden fees, no service charges, and no surprise add-ons. Unlike traditional salons that might tack on charges for product usage, long hair, difficult textures, or weekend appointments, we keep it straightforward. The price you see is the price you pay, period. We also do not charge setup fees, cleanup fees, or equipment fees. Our stylists arrive with all the professional tools and products they need, and that is all included in your hourly rate. Transparency is one of our core values and we take it seriously.",
  },
  {
    q: "Is travel included in the price or do you charge a travel fee?",
    a: "Travel is completely free and included in your $99 per hour rate for all locations within New York City. Whether you are in the heart of Manhattan, deep in the Bronx, on the waterfront in Staten Island, or anywhere across Brooklyn and Queens, there is zero travel fee. We believe that a mobile beauty service should not penalize you for where you live, so we cover all five boroughs equally. Our stylists are based throughout the city, and we match you with someone nearby whenever possible to minimize travel time and maximize your appointment time. No travel surcharges, no distance calculations, no borough-based pricing tiers.",
  },
  {
    q: "Do I need to tip my stylist?",
    a: "Tipping is never required but always appreciated. Our stylists are independent professionals who take pride in delivering exceptional service, and a tip is a wonderful way to recognize their work if you feel they went above and beyond. The industry standard for beauty services is typically 15 to 20 percent, but any amount is meaningful. You can tip your stylist directly in cash or through any of the digital payment methods we accept. Whether you choose to tip or not, your stylist will always deliver the same high level of service and professionalism.",
  },
  {
    q: "What payment methods do you accept?",
    a: "We accept Venmo, Zelle, Cash App, Apple Pay, and cash. We intentionally offer multiple digital payment options to make the transaction as seamless as possible since our service comes to you and you should not have to worry about finding an ATM or swiping a card. Payment is collected at the time of your appointment, and your stylist will confirm the total before any payment is processed. For group bookings and events, we can also arrange invoicing if that is more convenient for your organization. If you have a preferred payment method not listed here, reach out and we will see what we can do.",
  },

  /* ── Services ── */
  {
    q: "What services does The NYC Mobile Salon offer?",
    a: "We offer more than 37 professional beauty services across six categories: hair styling, hair coloring, nail services, makeup and lashes, skincare and facials, and men's grooming. That includes everything from blowouts, silk presses, braids, and extensions to gel manicures, pedicures, full-face makeup, lash extensions, facials, beard trims, and men's haircuts. Every service is performed by a licensed professional who specializes in that area, using high-quality, salon-grade products. Visit our full services page to browse everything we offer and find exactly what you need. If you do not see a specific service listed, contact us because we may be able to accommodate custom requests as well.",
  },
  {
    q: "Do you offer men's grooming and barbering services?",
    a: "Yes, we offer a full range of men's grooming services delivered right to your home, office, or hotel room anywhere in NYC. Our men's services include haircuts, fades, lineups, beard trims and shaping, hot towel shaves, scalp treatments, and more. Every grooming appointment is handled by a licensed barber or stylist with specific experience in men's hair and grooming. Whether you need a quick cleanup before a business meeting or a full grooming session before a wedding, we bring the barbershop to you. Check out our men's grooming page for the full list of services and book your appointment today.",
  },
  {
    q: "Do you offer bridal and event beauty services?",
    a: "Absolutely. Bridal beauty and event styling are among our most popular bookings. We offer hair styling, makeup application, nail services, and more for brides, bridesmaids, mothers of the bride, and entire wedding parties. Our team can handle everything from bridal trials and day-of styling to full glam for your entire group. We also cover non-wedding events like galas, photo shoots, birthday celebrations, corporate events, and holiday parties. For events, we assign dedicated stylists based on the size of your group and the services requested. Visit our events page to learn more about how we handle group bookings and event-day coordination.",
  },
  {
    q: "Do you offer beauty and grooming classes?",
    a: "Yes, we offer hands-on beauty and grooming workshops taught by our licensed professionals. Our class offerings include blowout technique, natural hair care, braiding, makeup application, skincare routines, nail art, men's grooming basics, and more. Classes are perfect for bridal parties, birthday celebrations, corporate team-building events, or anyone who wants to learn professional techniques they can use at home. Each class includes instruction, practice time, and all the products and tools you need. Group classes require a minimum of three participants with a two-hour minimum booking at $99 per hour. Browse our full class catalog to find a workshop that interests you.",
  },
  {
    q: "What products do your stylists use?",
    a: "Our stylists use professional, salon-grade products from trusted brands across every service category. For hair services, that includes high-quality shampoos, conditioners, heat protectants, and styling products suited to every hair type and texture. For nail services, we use long-lasting gel and traditional polish from professional nail brands. Makeup artists carry full kits with high-performance foundations, concealers, eyeshadow palettes, and setting sprays. If you have a preferred product or brand you would like your stylist to use, just let us know in advance and we will do our best to accommodate. We also carry hypoallergenic and sensitive-skin options for clients with allergies or sensitivities.",
  },
  {
    q: "Can I get multiple services done in a single visit?",
    a: "Yes, and many of our clients do exactly that. One of the biggest advantages of booking mobile beauty is that you can combine multiple services into a single appointment without having to travel between different salons or specialists. Want a blowout and a manicure? A full face of makeup and lash extensions? A haircut and a beard trim? Just let us know what you need when you book and we will schedule enough time to cover everything. For multiple services, we recommend booking a two-hour or longer session so your stylist has plenty of time to deliver excellent results without rushing. You can also request multiple stylists if you want services done simultaneously to save time.",
  },

  /* ── Location & Coverage ── */
  {
    q: "Where does The NYC Mobile Salon serve?",
    a: "We serve all five boroughs of New York City: Manhattan, Brooklyn, Queens, the Bronx, and Staten Island. That means more than 200 neighborhoods from the Upper East Side and Williamsburg to Astoria, Fordham, and St. George. No matter where you are in the city, we can get a licensed stylist to your door. Our coverage area includes residential apartments, townhouses, office buildings, hotels, event venues, co-working spaces, and more. Visit our locations page to find your specific neighborhood and see the full list of areas we serve. We are the only mobile salon that covers every corner of NYC with zero travel fees.",
  },
  {
    q: "Can you come to my office, hotel, or event venue?",
    a: "Yes, we regularly serve clients at offices, hotels, Airbnbs, event venues, photography studios, co-working spaces, and more. Many of our clients are busy professionals who book appointments at their office during lunch breaks or before important meetings. We also work with hotels and hospitality groups to offer in-room beauty services for guests. If you are hosting an event at a venue, we can coordinate with the venue staff to set up in a designated area. All we need is a chair, access to a power outlet, and decent lighting. For services that require water like color treatments or rinse-out conditioning, we will need access to a sink as well.",
  },
  {
    q: "What do I need to provide for my appointment?",
    a: "Our stylists bring all of their own professional tools, products, and equipment, so you do not need to provide much. The basics we ask for are a sturdy chair for you to sit in, access to an electrical outlet for tools like blow dryers, flat irons, and nail lamps, and good lighting so your stylist can see their work clearly. If you are booking a service that requires water, such as hair coloring, chemical treatments, or rinse-out deep conditioning, we will need access to a sink. A kitchen or bathroom sink works perfectly. Beyond that, just be ready and we will handle everything else. If you have any questions about setup for a specific service, feel free to ask when you book.",
  },
  {
    q: "Do you serve areas outside of New York City?",
    a: "Currently, our core service area is limited to the five boroughs of New York City. However, we do occasionally accommodate requests in nearby areas including parts of Westchester, Long Island, and northern New Jersey on a case-by-case basis. For locations outside NYC, a travel surcharge may apply depending on the distance. If you are located just outside the city and want to book, reach out to us at hey@thenycmobilesalon.com with your address and the services you need, and we will let you know if we can make it work. We are actively expanding our coverage area, so check back regularly or follow us for updates on new service zones.",
  },

  /* ── Quality & Safety ── */
  {
    q: "Are your stylists licensed and insured?",
    a: "Yes, every single stylist, barber, nail technician, and makeup artist on The NYC Mobile Salon team is fully licensed by the State of New York. We verify credentials before anyone joins our roster and maintain up-to-date records for every professional on our team. In addition to licensing, our stylists carry liability insurance for your protection and peace of mind. We take the credentialing process seriously because your safety and the quality of your experience depend on it. When you book with us, you can be confident that a trained, vetted, and insured professional is walking through your door.",
  },
  {
    q: "How do you ensure quality and consistency across appointments?",
    a: "Quality control is built into every part of our operation. First, we have a rigorous vetting process for every stylist who joins our team, which includes license verification, portfolio review, skills assessment, and a background check. Second, we collect detailed feedback after every appointment and use that data to maintain high standards across the board. Stylists who consistently receive outstanding reviews are prioritized for bookings, and we address any concerns immediately. Third, our team uses only professional-grade products and tools, which means you get salon-quality results every single time. We currently maintain a 4.9-star average across thousands of completed appointments, and we work hard to keep that number where it is.",
  },
  {
    q: "What if I have allergies or skin sensitivities?",
    a: "We take allergies and sensitivities very seriously. When you book your appointment, there is a section in the booking form where you can note any allergies, sensitivities, or skin conditions your stylist should be aware of. Our stylists carry hypoallergenic and fragrance-free product options for clients who need them. If you have a specific allergy to a common ingredient like latex, formaldehyde, or certain dyes, please let us know in advance so your stylist can prepare accordingly and bring appropriate alternatives. We can also accommodate requests to use your own products if you have a specific brand or formula that works best for your skin or hair. Your health and comfort always come first.",
  },
  {
    q: "Is your equipment sanitized between appointments?",
    a: "Absolutely. Sanitation and hygiene are non-negotiable for every stylist on our team. All tools, including scissors, combs, brushes, clippers, nail implements, and makeup brushes, are thoroughly cleaned and sanitized between every appointment using hospital-grade disinfectants. Single-use items like nail files, buffers, and certain applicators are disposed of after each client and never reused. Our stylists follow New York State Department of Health guidelines for sanitation in cosmetology, and we hold ourselves to an even higher standard because mobile services demand extra attention to hygiene. You can book with complete confidence that every tool that touches you is clean and safe.",
  },

  /* ── Events & Groups ── */
  {
    q: "How do group bookings work?",
    a: "Group bookings are one of our specialties. For groups of three or more people, there is a two-hour minimum booking at $99 per hour. When you submit a group booking request, let us know how many people are in your group and what services each person needs. We will then assign the right number of stylists to ensure everyone is served efficiently without long wait times. For example, a bridal party of six might have two or three stylists working simultaneously so everyone is ready on time. Group bookings are perfect for bridal parties, birthday celebrations, girls' nights, corporate events, and team outings. Visit our events page or our booking page to get started.",
  },
  {
    q: "Can you handle large events with 10 or more guests?",
    a: "Yes, we regularly handle large-scale events with 10, 20, or even more guests. We have a deep roster of licensed professionals across all service categories, so we can scale our team to match the size of your event. For large events, we recommend booking as early as possible, ideally two to four weeks in advance, so we can coordinate scheduling, assign enough stylists, and plan the timeline to make sure everyone is taken care of. We will work with you or your event coordinator to create a detailed schedule that accounts for the number of guests, the services requested, and any hard deadlines like ceremony start times or photo call times. Large events are priced at the same $99 per hour rate with no upcharges for group size.",
  },
  {
    q: "Do you offer corporate beauty and wellness events?",
    a: "Yes, corporate events are a growing part of our business and we love working with companies across New York City. We offer on-site beauty and wellness services for corporate team-building events, employee appreciation days, product launches, client hospitality events, conference activations, and more. Popular corporate services include express manicures, blowouts, chair massages, makeup touch-ups, and grooming stations. We can set up in your office, a rented event space, or any venue of your choosing. Our team handles all the logistics including setup, breakdown, and scheduling so your event runs smoothly. Reach out at hey@thenycmobilesalon.com to discuss your corporate event needs and get a custom plan.",
  },
  {
    q: "How do bridal party bookings work?",
    a: "Bridal beauty is one of our most popular services and we have a streamlined process to make your wedding day stress-free. Start by booking a bridal trial one to three months before your wedding so you and your stylist can perfect your look. On the wedding day, our team arrives at your getting-ready location, whether that is your home, a hotel suite, or the venue itself, with plenty of time to style the entire bridal party. We assign dedicated stylists based on the number of people who need services and the timeline you are working with. Hair, makeup, nails, lashes, and touch-up kits are all available. Every detail is coordinated in advance so the morning of your wedding is relaxed, fun, and exactly how you imagined it. Visit our events page for more details on bridal packages.",
  },
  {
    q: "Can I book a beauty class for a private group?",
    a: "Yes, private group classes are one of the most fun things we offer. You can book a hands-on beauty or grooming workshop for your friend group, bridal party, birthday celebration, corporate team, or any gathering of three or more people. Our instructors teach real techniques that you can use at home, covering everything from blowout styling and natural hair care to makeup application, skincare routines, nail art, and braiding. Each participant gets individual attention and hands-on practice time with professional products and tools included. Private classes start at a two-hour minimum at $99 per hour and can be customized to focus on whatever skills your group wants to learn. Check out our full class lineup to find your perfect workshop.",
  },
];

export default function FAQPage() {
  return (
    <>
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(faqSchema(faqs)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: safeJsonLd(
            breadcrumbSchema([
              { name: "Home", url: "/" },
              { name: "FAQ", url: "/faq" },
            ])
          ),
        }}
      />

      {/* ─── HERO ─── */}
      <section
        className="relative overflow-hidden px-4 py-24 md:py-32"
        style={{ background: "linear-gradient(135deg, #7C3AED 0%, #A78BFA 40%, #C4B5FD 100%)" }}
      >
        <div className="pointer-events-none absolute -right-32 top-0 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-32 bottom-0 h-60 w-60 rounded-full bg-white/5 blur-3xl" />
        <div className="relative mx-auto max-w-4xl text-center">
          <div className="mb-4 flex items-center justify-center gap-2">
            <Sparkle className="h-4 w-4 text-white/60" />
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">Frequently Asked Questions</span>
            <Sparkle className="h-4 w-4 text-white/60" />
          </div>
          <h1 className="font-display mb-6 text-5xl font-bold tracking-tight text-white md:text-6xl lg:text-7xl">
            NYC Mobile Salon FAQ
          </h1>
          <p className="mx-auto max-w-2xl text-lg leading-relaxed text-white/80">
            From booking and pricing to services, coverage, and event planning &mdash; find answers to every question about mobile beauty in New York City.
          </p>
        </div>
      </section>

      {/* ─── INTRO ─── */}
      <section className="bg-white px-4 py-16 md:py-20">
        <div className="mx-auto max-w-3xl space-y-5 text-base leading-relaxed text-slate-600">
          <p>
            The NYC Mobile Salon brings licensed beauty professionals directly to your door anywhere in New York City. Whether you need a
            blowout before a big meeting, bridal styling on your wedding morning, a fresh fade at your apartment, or gel nails for your
            entire friend group, we make it happen &mdash; on your schedule, at your location, with zero travel fees. Our team offers more
            than <Link href="/services" className="text-purple-600 hover:underline">37 professional beauty services</Link> across hair
            styling, hair coloring, nail services, makeup and lashes, skincare, and men&apos;s grooming.
          </p>
          <p>
            We serve all five boroughs of NYC &mdash; Manhattan, Brooklyn, Queens, the Bronx, and Staten Island &mdash; covering more
            than <Link href="/locations" className="text-purple-600 hover:underline">200 neighborhoods</Link>. Every appointment is
            handled by a licensed, insured, and vetted professional at a flat rate
            of <Link href="/pricing" className="text-purple-600 hover:underline">$99 per hour</Link> with no hidden charges. Below
            you will find detailed answers to the questions we hear most often. If you do not see your question listed, email us at{" "}
            <a href="mailto:hey@thenycmobilesalon.com" className="text-purple-600 hover:underline">hey@thenycmobilesalon.com</a> and we
            will get back to you quickly.
          </p>
          <p>
            You can also explore our <Link href="/how-it-works" className="text-purple-600 hover:underline">How It Works</Link> page
            for a step-by-step overview, browse <Link href="/events" className="text-purple-600 hover:underline">event packages</Link> for
            group bookings, or check out our <Link href="/classes" className="text-purple-600 hover:underline">beauty classes</Link> if
            you want to learn professional techniques hands-on. Ready to book?{" "}
            <Link href="/book" className="text-purple-600 hover:underline">Schedule your appointment now</Link>.
          </p>
        </div>
      </section>

      {/* ─── FAQ: Booking & Scheduling ─── */}
      <section className="bg-purple-50/50 px-4 py-16 md:py-20">
        <div className="mx-auto max-w-3xl">
          <p className="mb-3 text-center text-xs font-semibold uppercase tracking-widest text-purple-600">
            <Sparkle className="mr-1 h-3 w-3" /> Booking &amp; Scheduling
          </p>
          <h2 className="font-display mb-10 text-center text-3xl font-medium tracking-tight text-slate-900 md:text-4xl">
            How to book mobile beauty in NYC
          </h2>
          <div className="space-y-4">
            {faqs.slice(0, 6).map((faq) => (
              <div key={faq.q} className="rounded-xl border border-purple-100 bg-white p-6">
                <h3 className="mb-3 text-lg font-bold text-slate-800">{faq.q}</h3>
                <p className="text-sm leading-relaxed text-slate-600">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FAQ: Pricing & Payment ─── */}
      <section className="bg-white px-4 py-16 md:py-20">
        <div className="mx-auto max-w-3xl">
          <p className="mb-3 text-center text-xs font-semibold uppercase tracking-widest text-purple-600">
            <Sparkle className="mr-1 h-3 w-3" /> Pricing &amp; Payment
          </p>
          <h2 className="font-display mb-10 text-center text-3xl font-medium tracking-tight text-slate-900 md:text-4xl">
            Transparent pricing with no surprises
          </h2>
          <div className="space-y-4">
            {faqs.slice(6, 12).map((faq) => (
              <div key={faq.q} className="rounded-xl border border-purple-100 bg-white p-6">
                <h3 className="mb-3 text-lg font-bold text-slate-800">{faq.q}</h3>
                <p className="text-sm leading-relaxed text-slate-600">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FAQ: Services ─── */}
      <section className="bg-purple-50/50 px-4 py-16 md:py-20">
        <div className="mx-auto max-w-3xl">
          <p className="mb-3 text-center text-xs font-semibold uppercase tracking-widest text-purple-600">
            <Sparkle className="mr-1 h-3 w-3" /> Services
          </p>
          <h2 className="font-display mb-10 text-center text-3xl font-medium tracking-tight text-slate-900 md:text-4xl">
            37+ professional beauty services at your door
          </h2>
          <div className="space-y-4">
            {faqs.slice(12, 18).map((faq) => (
              <div key={faq.q} className="rounded-xl border border-purple-100 bg-white p-6">
                <h3 className="mb-3 text-lg font-bold text-slate-800">{faq.q}</h3>
                <p className="text-sm leading-relaxed text-slate-600">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FAQ: Location & Coverage ─── */}
      <section className="bg-white px-4 py-16 md:py-20">
        <div className="mx-auto max-w-3xl">
          <p className="mb-3 text-center text-xs font-semibold uppercase tracking-widest text-purple-600">
            <Sparkle className="mr-1 h-3 w-3" /> Location &amp; Coverage
          </p>
          <h2 className="font-display mb-10 text-center text-3xl font-medium tracking-tight text-slate-900 md:text-4xl">
            All five boroughs, zero travel fees
          </h2>
          <div className="space-y-4">
            {faqs.slice(18, 22).map((faq) => (
              <div key={faq.q} className="rounded-xl border border-purple-100 bg-white p-6">
                <h3 className="mb-3 text-lg font-bold text-slate-800">{faq.q}</h3>
                <p className="text-sm leading-relaxed text-slate-600">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FAQ: Quality & Safety ─── */}
      <section className="bg-purple-50/50 px-4 py-16 md:py-20">
        <div className="mx-auto max-w-3xl">
          <p className="mb-3 text-center text-xs font-semibold uppercase tracking-widest text-purple-600">
            <Sparkle className="mr-1 h-3 w-3" /> Quality &amp; Safety
          </p>
          <h2 className="font-display mb-10 text-center text-3xl font-medium tracking-tight text-slate-900 md:text-4xl">
            Licensed, insured, and vetted professionals
          </h2>
          <div className="space-y-4">
            {faqs.slice(22, 26).map((faq) => (
              <div key={faq.q} className="rounded-xl border border-purple-100 bg-white p-6">
                <h3 className="mb-3 text-lg font-bold text-slate-800">{faq.q}</h3>
                <p className="text-sm leading-relaxed text-slate-600">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FAQ: Events & Groups ─── */}
      <section className="bg-white px-4 py-16 md:py-20">
        <div className="mx-auto max-w-3xl">
          <p className="mb-3 text-center text-xs font-semibold uppercase tracking-widest text-purple-600">
            <Sparkle className="mr-1 h-3 w-3" /> Events &amp; Groups
          </p>
          <h2 className="font-display mb-10 text-center text-3xl font-medium tracking-tight text-slate-900 md:text-4xl">
            Group bookings, bridal parties, and corporate events
          </h2>
          <div className="space-y-4">
            {faqs.slice(26, 31).map((faq) => (
              <div key={faq.q} className="rounded-xl border border-purple-100 bg-white p-6">
                <h3 className="mb-3 text-lg font-bold text-slate-800">{faq.q}</h3>
                <p className="text-sm leading-relaxed text-slate-600">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── STILL HAVE QUESTIONS? ─── */}
      <section className="bg-purple-50/50 px-4 py-16 md:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <Sparkle className="mx-auto mb-4 h-6 w-6 text-purple-400" />
          <h2 className="font-display mb-4 text-3xl font-medium tracking-tight text-slate-900 md:text-4xl">
            Still have questions?
          </h2>
          <p className="mb-8 text-base leading-relaxed text-slate-600">
            We are happy to help with anything not covered above. Whether you have a question about a specific service, need help planning
            an event, or just want to chat about what mobile beauty can do for you, our team is here for you. Reach out anytime and we
            will get back to you as quickly as possible.
          </p>
          <a
            href="mailto:hey@thenycmobilesalon.com"
            className="inline-block rounded-full bg-purple-600 px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-purple-500/20 transition hover:-translate-y-0.5 hover:bg-purple-700"
          >
            Email Us at hey@thenycmobilesalon.com
          </a>
        </div>
      </section>

      {/* ─── QUICK LINKS ─── */}
      <section className="bg-white px-4 py-16 md:py-20">
        <div className="mx-auto max-w-5xl">
          <p className="mb-3 text-center text-xs font-semibold uppercase tracking-widest text-purple-600">
            <Sparkle className="mr-1 h-3 w-3" /> Explore More
          </p>
          <h2 className="font-display mb-10 text-center text-3xl font-medium tracking-tight text-slate-900 md:text-4xl">
            Quick links to everything you need
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Our Services", desc: "Browse all 37+ mobile beauty services", href: "/services" },
              { label: "Events", desc: "Bridal, corporate, and group packages", href: "/events" },
              { label: "Classes", desc: "Hands-on beauty workshops in NYC", href: "/classes" },
              { label: "Locations", desc: "All 5 boroughs, 200+ neighborhoods", href: "/locations" },
              { label: "Pricing", desc: "$99/hr flat rate, no hidden fees", href: "/pricing" },
              { label: "Book Now", desc: "Schedule your appointment today", href: "/book" },
              { label: "How It Works", desc: "Three simple steps to looking amazing", href: "/how-it-works" },
              { label: "About Us", desc: "Our story, mission, and team", href: "/about" },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-xl border border-purple-100 bg-white p-5 transition hover:border-purple-300 hover:shadow-md"
              >
                <h3 className="mb-1 font-bold text-slate-800">{link.label}</h3>
                <p className="text-sm text-slate-500">{link.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section
        className="px-4 py-20 md:py-28"
        style={{ background: "linear-gradient(135deg, #7C3AED 0%, #A78BFA 40%, #C4B5FD 100%)" }}
      >
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-display mb-4 text-4xl font-bold tracking-tight text-white md:text-5xl">
            Ready to book mobile beauty?
          </h2>
          <p className="mx-auto mb-8 max-w-xl text-lg text-white/80">
            $99 per hour. All five boroughs. 37+ services. Licensed professionals at your door. No travel fees, no hidden charges.
          </p>
          <Link
            href="/book"
            className="inline-block rounded-full bg-white px-10 py-4 text-sm font-bold uppercase tracking-wider text-purple-700 shadow-lg shadow-purple-900/20 transition hover:-translate-y-0.5 hover:bg-purple-50"
          >
            Book Your Appointment
          </Link>
        </div>
      </section>
    </>
  );
}
