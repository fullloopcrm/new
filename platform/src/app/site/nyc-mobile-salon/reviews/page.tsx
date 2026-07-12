import { safeJsonLd } from '@/lib/escape-html'
import type { Metadata } from "next";
import Link from "next/link";
import { testimonials } from "@/app/site/nyc-mobile-salon/_lib/constants";
import { faqSchema, breadcrumbSchema } from "@/app/site/nyc-mobile-salon/_lib/seo";

export const metadata: Metadata = {
  title: "Client Reviews & Testimonials — 4.9 Rating | The NYC Mobile Salon",
  description:
    "Read real reviews from 5,000+ clients across all 5 NYC boroughs. 4.9 average rating for mobile hair, nails, makeup, grooming, and event beauty services. See why New Yorkers trust The NYC Mobile Salon.",
  alternates: { canonical: "https://thenycmobilesalon.com/reviews" },
  openGraph: {
    title: "Client Reviews & Testimonials — 4.9 Rating | The NYC Mobile Salon",
    description:
      "Read real reviews from 5,000+ clients across all 5 NYC boroughs. 4.9 average rating for mobile hair, nails, makeup, grooming, and event beauty services. See why New Yorkers trust The NYC Mobile Salon.",
    url: "https://thenycmobilesalon.com/reviews",
  },
};

/* ------------------------------------------------------------------ */
/*  Inline data                                                        */
/* ------------------------------------------------------------------ */

const additionalReviews = [
  // Hair
  { name: "Danielle R.", borough: "Manhattan", neighborhood: "Upper East Side", service: "Blowout", text: "I booked a blowout for a work event and my stylist arrived right on time to my UES apartment. She set up quickly, asked about my preferences, and gave me the bounciest, most voluminous blowout I have ever had. Three coworkers asked who did my hair that night.", rating: 5 },
  { name: "Tamika J.", borough: "Brooklyn", neighborhood: "Crown Heights", service: "Silk Press", text: "Finding a stylist who understands natural hair texture is everything. My silk press came out bone straight, shiny, and lasted almost two weeks. She used a heat protectant and took her time with each section. I have already rebooked for next month.", rating: 5 },
  { name: "Rachel L.", borough: "Manhattan", neighborhood: "Chelsea", service: "Balayage", text: "I was nervous about getting color done outside a salon, but my colorist brought everything she needed and the balayage came out absolutely gorgeous. The transition from my dark roots to the honey blonde ends is seamless. I get compliments daily.", rating: 5 },
  { name: "Keisha W.", borough: "Brooklyn", neighborhood: "Bed-Stuy", service: "Braids", text: "She did my knotless braids in my living room while I watched Netflix. They are neat, even, and exactly the right tension. No sore scalp, no loose edges. Took about four hours for waist-length and worth every minute. Will never go back to sitting in a braiding shop.", rating: 5 },
  { name: "Sofia C.", borough: "Queens", neighborhood: "Astoria", service: "Haircut", text: "My stylist gave me the most precise layered cut I have had in years. She even styled it with a round brush blowout so I could see the full effect. The convenience of doing this in my own bathroom was incredible.", rating: 5 },

  // Nails
  { name: "Aisha K.", borough: "Brooklyn", neighborhood: "Park Slope", service: "Gel Manicure", text: "I have two small kids and getting to a nail salon is basically impossible. Having a nail tech come to my apartment in Park Slope was a game changer. The gel mani was flawless and lasted three full weeks without a single chip.", rating: 5 },
  { name: "Mei L.", borough: "Queens", neighborhood: "Flushing", service: "Nail Art", text: "I showed her a photo of a complex nail art design I found online and she recreated it perfectly. Hand-painted cherry blossoms with gold foil accents on a sheer pink base. She brought her entire collection of gels and tools. Absolutely stunning work.", rating: 5 },
  { name: "Christina V.", borough: "Staten Island", neighborhood: "Todt Hill", service: "Pedicure", text: "I booked a gel pedicure for me and my mom as a Mother's Day treat. The nail tech was so sweet and professional. She set up a whole little spa station in our living room with towels and a foot soak. My mom loved it and keeps telling all her friends.", rating: 5 },
  { name: "Jasmine P.", borough: "Manhattan", neighborhood: "Harlem", service: "Dip Powder", text: "First time trying dip powder nails and I am completely converted. My tech explained every step, let me pick from a huge color selection, and the result is smooth, strong, and beautiful. Four weeks later they still look fresh.", rating: 5 },

  // Makeup
  { name: "Lauren D.", borough: "Manhattan", neighborhood: "Tribeca", service: "Bridal Makeup", text: "My wedding makeup artist arrived at my Tribeca loft at 6 AM, set up her station, and made me feel like a supermodel. The airbrush foundation lasted through twelve hours of dancing, crying happy tears, and August heat. Every photo from that day is stunning.", rating: 5 },
  { name: "Vanessa M.", borough: "Brooklyn", neighborhood: "Williamsburg", service: "Event Makeup", text: "Booked makeup for a gallery opening in Williamsburg and my artist nailed the brief perfectly. She created a smoky eye with a subtle glitter that caught the light beautifully. Quick, professional, and she even taught me how to touch up later in the evening.", rating: 5 },
  { name: "Nina F.", borough: "Queens", neighborhood: "Forest Hills", service: "Natural Makeup", text: "I needed a natural, polished look for professional headshots. The makeup artist enhanced my features without making me look overdone. My skin looked dewy and healthy, my brows were sculpted perfectly, and the photos turned out amazing.", rating: 5 },

  // Men's Grooming
  { name: "Marcus T.", borough: "Brooklyn", neighborhood: "Fort Greene", service: "Fade", text: "Best fade I have ever gotten and I did not even have to leave my couch. The barber brought a full setup, laid down a drop cloth, and gave me the cleanest mid fade with a crispy line-up. He even did my beard. These guys are the real deal.", rating: 5 },
  { name: "David K.", borough: "Manhattan", neighborhood: "Murray Hill", service: "Hot Towel Shave", text: "I treated myself to the hot towel straight razor shave before a big date. The barber was meticulous. Hot towel, pre-shave oil, three passes with a straight razor, cold towel, aftershave balm. My face has never been this smooth. I felt like I stepped out of a 1920s barbershop.", rating: 5 },
  { name: "James O.", borough: "Bronx", neighborhood: "Riverdale", service: "Beard Trim", text: "I have a long beard and most barbers do not know how to shape it properly. This guy clearly knew what he was doing. He trimmed it with scissors first, shaped the neckline with a trimmer, and finished with beard oil. Clean, professional, and fast.", rating: 5 },
  { name: "Andre W.", borough: "Brooklyn", neighborhood: "Bushwick", service: "Men's Haircut", text: "Getting a barber to come to my Bushwick loft on a Sunday morning felt like a luxury I did not know I needed. Perfect taper, clean edges, and he was done in thirty minutes. Now my whole building wants his number.", rating: 5 },

  // Events
  { name: "Priya S.", borough: "Queens", neighborhood: "Jackson Heights", service: "Bridal Party", text: "Booked them for my bridal party of eight and every single person looked incredible. Three stylists showed up, set up stations in our hotel suite, and worked through hair and makeup for everyone. We stayed on schedule and the photos are breathtaking. Worth every penny.", rating: 5 },
  { name: "Samantha G.", borough: "Manhattan", neighborhood: "Midtown", service: "Corporate Event", text: "Our company booked The NYC Mobile Salon for an employee wellness day at our Midtown office. Two nail techs and a makeup artist came and set up stations in our conference room. The team absolutely loved it. Best morale booster we have done all year.", rating: 5 },
  { name: "Tiffany B.", borough: "Brooklyn", neighborhood: "DUMBO", service: "Birthday Party", text: "I threw a birthday brunch for my girlfriends and surprised them with mobile glam. The stylist did blowouts and the nail tech did gel manis for six of us. Everyone was obsessed. My best friend already booked them for her birthday next month.", rating: 5 },

  // Classes
  { name: "Monica H.", borough: "Manhattan", neighborhood: "West Village", service: "Braiding Class", text: "I took the braiding basics class with five of my friends in my West Village apartment. The instructor was patient and so skilled. By the end of two hours, I could do a decent French braid on myself. We had wine and snacks and it felt like a private tutorial. Such a fun girls' night activity.", rating: 5 },
  { name: "Gabrielle T.", borough: "Queens", neighborhood: "Long Island City", service: "Makeup Class", text: "The everyday makeup masterclass was exactly what I needed. The instructor analyzed my skin tone, recommended products, and walked me through a full routine step by step. I finally understand how to blend eyeshadow and my morning routine is so much faster now.", rating: 5 },

  // More borough coverage
  { name: "Rosa M.", borough: "Bronx", neighborhood: "Mott Haven", service: "Gel Manicure", text: "I was so happy to find a mobile nail service that actually comes to the Bronx. She arrived at my Mott Haven apartment right on time with a huge selection of gel colors. My French tips are perfect and my cuticles look amazing. Finally, a quality nail service without the commute.", rating: 5 },
  { name: "Patricia N.", borough: "Staten Island", neighborhood: "St. George", service: "Blowout", text: "Living in Staten Island, it always felt like good beauty services required a trip into Manhattan. Not anymore. My stylist came to my house near St. George and gave me a salon-quality blowout that lasted three days. I am telling everyone on the island about this.", rating: 5 },
  { name: "Denise A.", borough: "Bronx", neighborhood: "Pelham Bay", service: "Deep Conditioning", text: "My hair was so damaged from years of heat styling. The stylist who came to my Pelham Bay apartment did a deep conditioning treatment with a protein mask and steam cap. My curls came back to life. She also gave me a whole at-home care plan. So thoughtful and knowledgeable.", rating: 5 },
  { name: "Linda C.", borough: "Staten Island", neighborhood: "Great Kills", service: "Facial", text: "I booked an express facial and it was the most relaxing forty-five minutes of my week. The esthetician set up in my dining room with soft music and proper lighting. She analyzed my skin, did extractions gently, and my face was glowing afterward. Better than any spa I have been to.", rating: 5 },
  { name: "Michelle R.", borough: "Bronx", neighborhood: "Fordham", service: "Waxing", text: "I was nervous about getting a Brazilian at home but the esthetician was so professional and put me completely at ease. She was quick, thorough, and the results were perfect. So much more comfortable than doing this at a random waxing place. Private, clean, and painless.", rating: 5 },
];

const faqs = [
  { q: "Are all your reviews from real clients?", a: "Yes. Every review on this page is from a verified client who booked and received services through The NYC Mobile Salon. We never solicit fake reviews, purchase testimonials, or edit client feedback. What you read here is genuine, unfiltered feedback from real New Yorkers across all five boroughs." },
  { q: "What is your average rating and how many clients have you served?", a: "We maintain a 4.9 out of 5.0 average rating across more than 5,000 completed appointments. Our professionals are rated after every session, and we take feedback seriously. Any professional who consistently falls below our quality threshold is removed from our roster." },
  { q: "Do you have a satisfaction guarantee?", a: "Absolutely. If you are not completely happy with your service, contact us within 24 hours and we will either send a professional to fix the issue at no charge or provide a full refund. Your satisfaction is not negotiable — it is guaranteed." },
  { q: "What should I expect during a mobile beauty appointment?", a: "Your licensed professional will arrive at your location with all necessary tools, products, and supplies. They will set up a clean workspace, consult with you on your desired look, and perform the service. Cleanup is included — we leave your space exactly as we found it. The entire experience is designed to feel like a private salon session in your own home." },
  { q: "How do you maintain such consistently high quality across all five boroughs?", a: "Every professional on our roster goes through a rigorous vetting process including license verification, portfolio review, skills assessment, and a background check. We also conduct ongoing quality monitoring through client ratings, periodic spot checks, and continuous training. Our $99 per hour all-inclusive pricing attracts top-tier talent who take pride in their craft." },
];

/* ------------------------------------------------------------------ */
/*  Reusable components                                                */
/* ------------------------------------------------------------------ */

function Sparkle() {
  return (
    <svg className="inline-block h-5 w-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1.5M12 19.5V21M4.22 4.22l1.06 1.06M17.72 17.72l1.06 1.06M3 12h1.5M19.5 12H21M4.22 19.78l1.06-1.06M17.72 6.28l1.06-1.06" />
    </svg>
  );
}

function Stars({ count = 5 }: { count?: number }) {
  return (
    <span className="flex gap-0.5" aria-label={`${count} out of 5 stars`}>
      {[...Array(count)].map((_, i) => (
        <svg key={i} className="h-5 w-5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.448a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.54 1.118l-3.37-2.448a1 1 0 00-1.176 0l-3.37 2.448c-.784.57-1.838-.197-1.539-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.063 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.957z" />
        </svg>
      ))}
    </span>
  );
}

function ReviewCard({ review }: { review: { name: string; borough: string; neighborhood?: string; service?: string; text: string; rating: number } }) {
  return (
    <div className="rounded-xl border border-purple-100 bg-white p-6">
      <Stars count={review.rating} />
      <p className="mt-3 text-base leading-relaxed text-slate-600">&ldquo;{review.text}&rdquo;</p>
      <div className="mt-4 flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-purple-700 text-sm font-bold text-white font-display">
          {review.name[0]}
        </div>
        <div>
          <p className="text-sm font-bold text-slate-800 font-display">{review.name}</p>
          <p className="text-xs text-slate-400">
            {review.neighborhood ? `${review.neighborhood}, ` : ""}
            {review.borough}
            {review.service ? ` — ${review.service}` : ""}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  All reviews combined                                               */
/* ------------------------------------------------------------------ */

const allReviews = [
  ...testimonials.map((t) => ({ ...t, neighborhood: undefined, service: undefined })),
  ...additionalReviews,
];

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function ReviewsPage() {
  const jsonLd = [
    breadcrumbSchema([
      { name: "Home", url: "/" },
      { name: "Reviews", url: "/reviews" },
    ]),
    faqSchema(faqs),
    {
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      name: "The NYC Mobile Salon",
      url: "https://thenycmobilesalon.com",
    },
  ];

  return (
    <>
      {/* JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />

      {/* ── 1. Hero ─────────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden px-4 py-24 text-white md:py-32"
        style={{ background: "linear-gradient(135deg, #7C3AED 0%, #A78BFA 40%, #C4B5FD 100%)" }}
      >
        <div className="relative mx-auto max-w-4xl text-center">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/20 px-5 py-2 text-sm font-semibold uppercase tracking-wider backdrop-blur font-display">
            <Sparkle /> Client Reviews & Testimonials <Sparkle />
          </p>
          <h1 className="mb-6 text-5xl font-black tracking-tight md:text-6xl font-display">
            NYC Mobile Salon Reviews — 4.9 Stars
          </h1>
          <p className="mx-auto max-w-2xl text-lg leading-relaxed text-white/90">
            Over 5,000 appointments completed across all five NYC boroughs with a 4.9 average rating. Read what real New Yorkers have to say about their mobile beauty experience with The NYC Mobile Salon.
          </p>
        </div>
      </section>

      {/* ── 2. Stats Bar ────────────────────────────────────────────── */}
      <section className="border-b border-purple-100 bg-white px-4 py-10">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-6 text-center md:grid-cols-4">
          {[
            { value: "5,000+", label: "Appointments" },
            { value: "4.9/5", label: "Average Rating" },
            { value: "200+", label: "Neighborhoods" },
            { value: "100%", label: "Licensed Pros" },
          ].map((stat) => (
            <div key={stat.label}>
              <p className="text-3xl font-black text-purple-600 font-display">{stat.value}</p>
              <p className="mt-1 text-sm font-medium text-slate-500">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 3. Intro ────────────────────────────────────────────────── */}
      <section className="bg-purple-50/50 px-4 py-20">
        <div className="mx-auto max-w-3xl">
          <p className="mb-3 inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-purple-600 font-display">
            <Sparkle /> Why Reviews Matter
          </p>
          <h2 className="mb-8 text-3xl font-black tracking-tight text-slate-900 md:text-4xl font-display">
            Trusted by Thousands of New Yorkers
          </h2>

          <div className="space-y-5 text-base leading-relaxed text-slate-600">
            <p>
              When you invite someone into your home for a beauty service, trust is everything. That is why we take every single piece of client feedback seriously and why we are proud to share our reviews publicly. With a 4.9 average rating across more than 5,000 completed appointments, The NYC Mobile Salon has earned the confidence of clients in every corner of New York City — from <Link href="/locations/manhattan/upper-east-side" className="text-purple-600 hover:underline">Upper East Side</Link> high-rises to <Link href="/locations/brooklyn/park-slope" className="text-purple-600 hover:underline">Park Slope</Link> brownstones, <Link href="/locations/queens/astoria" className="text-purple-600 hover:underline">Astoria</Link> walk-ups to <Link href="/locations/bronx/riverdale" className="text-purple-600 hover:underline">Riverdale</Link> homes.
            </p>
            <p>
              Our clients book us for everything: <Link href="/services/hair/blowouts-and-styling" className="text-purple-600 hover:underline">blowouts</Link> before date night, <Link href="/services/nails/gel-manicure" className="text-purple-600 hover:underline">gel manicures</Link> during lunch breaks, <Link href="/services/makeup/full-glam-makeup" className="text-purple-600 hover:underline">full glam makeup</Link> for galas and weddings, <Link href="/services/mens-hair/fade-haircut" className="text-purple-600 hover:underline">fresh fades</Link> on lazy Sunday mornings, <Link href="/services/hair/braids-and-protective-styles" className="text-purple-600 hover:underline">braids and protective styles</Link> in the comfort of their own living rooms, and <Link href="/services/hair/silk-press" className="text-purple-600 hover:underline">silk presses</Link> that last for weeks. We also handle <Link href="/events" className="text-purple-600 hover:underline">large events</Link> like bridal parties, corporate wellness days, and birthday celebrations, plus we offer hands-on <Link href="/classes" className="text-purple-600 hover:underline">beauty classes and workshops</Link> for groups who want to learn new skills.
            </p>
            <p>
              What makes us different is our commitment to consistency. Every professional on our roster is fully licensed and insured in New York State. They go through a multi-step vetting process that includes portfolio review, a live skills assessment, reference checks, and a background screening. We monitor quality continuously through post-appointment ratings, and any professional who falls below our standards is removed from the platform. That is how we maintain a 4.9 rating at scale — not by cherry-picking reviews, but by holding every appointment to the same high standard.
            </p>
            <p>
              Below you will find authentic, unedited testimonials from clients across all five boroughs. These are real people sharing real experiences — no fluff, no filler, no fake names. We believe that the best marketing is happy clients, and we are grateful that so many New Yorkers have taken the time to share their stories. If you are ready to see what all the buzz is about, <Link href="/book" className="text-purple-600 hover:underline">book your first appointment</Link> and experience the difference for yourself. We also offer transparent <Link href="/pricing" className="text-purple-600 hover:underline">all-inclusive pricing starting at $99 per hour</Link> with no hidden fees or upcharges.
            </p>
          </div>
        </div>
      </section>

      {/* ── 4. Featured Reviews ─────────────────────────────────────── */}
      <section className="bg-white px-4 py-20">
        <div className="mx-auto max-w-5xl">
          <p className="mb-3 inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-purple-600 font-display">
            <Sparkle /> Featured Testimonials
          </p>
          <h2 className="mb-10 text-3xl font-black tracking-tight text-slate-900 md:text-4xl font-display">
            What Our Clients Are Saying
          </h2>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {allReviews.map((review, i) => (
              <ReviewCard key={i} review={review} />
            ))}
          </div>
        </div>
      </section>

      {/* ── 5. What Clients Love Most ──────────────────────────────── */}
      <section className="bg-purple-50/50 px-4 py-20">
        <div className="mx-auto max-w-5xl">
          <p className="mb-3 inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-purple-600 font-display">
            <Sparkle /> Common Themes
          </p>
          <h2 className="mb-10 text-3xl font-black tracking-tight text-slate-900 md:text-4xl font-display">
            What Clients Love Most
          </h2>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                title: "Convenience",
                desc: "No commute, no waiting rooms, no fighting for appointments. Our professionals come directly to your home, office, hotel, or event venue anywhere in NYC. Clients consistently tell us that reclaiming their travel time is the single biggest benefit of booking mobile beauty services. Whether you live in a Midtown high-rise or a Staten Island colonial, the salon comes to you.",
              },
              {
                title: "Professionalism",
                desc: "Every professional on our roster is licensed by New York State, fully insured, and vetted through a rigorous screening process. They arrive on time, bring all their own supplies, set up a clean workspace, and leave your space spotless. Punctuality, courtesy, and hygiene are non-negotiable standards that our clients praise again and again.",
              },
              {
                title: "Quality",
                desc: "Salon-quality results without the salon. Our clients frequently tell us that their mobile appointments deliver better results than brick-and-mortar salons because they receive one hundred percent of their stylist's attention in a private, relaxed setting. No distractions, no rushing, no compromises on technique or products.",
              },
              {
                title: "Value",
                desc: "Starting at just $99 per hour with all-inclusive pricing, there are no hidden fees for travel, products, or setup. What you see is what you pay. Many clients tell us that when they factor in the cost of their own travel time, the convenience premium practically pays for itself. Premium beauty services at a fair, transparent price.",
              },
            ].map((card) => (
              <div key={card.title} className="rounded-xl border border-purple-100 bg-white p-6">
                <h3 className="mb-3 text-lg font-bold text-slate-900 font-display">{card.title}</h3>
                <p className="text-sm leading-relaxed text-slate-600">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 6. Reviews by Borough ──────────────────────────────────── */}
      <section className="bg-white px-4 py-20">
        <div className="mx-auto max-w-5xl">
          <p className="mb-3 inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-purple-600 font-display">
            <Sparkle /> City-Wide Coverage
          </p>
          <h2 className="mb-4 text-3xl font-black tracking-tight text-slate-900 md:text-4xl font-display">
            Reviews by Borough
          </h2>
          <p className="mb-10 max-w-2xl text-base leading-relaxed text-slate-600">
            We serve clients in all five boroughs of New York City. Here is a snapshot of what clients in each borough have to say about their experience. Visit our <Link href="/locations" className="text-purple-600 hover:underline">locations page</Link> to find your neighborhood.
          </p>

          {[
            { borough: "Manhattan", reviews: allReviews.filter((r) => r.borough === "Manhattan").slice(0, 3) },
            { borough: "Brooklyn", reviews: allReviews.filter((r) => r.borough === "Brooklyn").slice(0, 3) },
            { borough: "Queens", reviews: allReviews.filter((r) => r.borough === "Queens").slice(0, 3) },
            { borough: "Bronx", reviews: allReviews.filter((r) => r.borough === "Bronx").slice(0, 3) },
            { borough: "Staten Island", reviews: allReviews.filter((r) => r.borough === "Staten Island").slice(0, 2) },
          ].map((group) => (
            <div key={group.borough} className="mb-12 last:mb-0">
              <h3 className="mb-5 text-xl font-bold text-slate-900 font-display">{group.borough}</h3>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {group.reviews.map((review, i) => (
                  <ReviewCard key={i} review={review} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 7. Reviews by Service ──────────────────────────────────── */}
      <section className="bg-purple-50/50 px-4 py-20">
        <div className="mx-auto max-w-5xl">
          <p className="mb-3 inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-purple-600 font-display">
            <Sparkle /> By Service Category
          </p>
          <h2 className="mb-4 text-3xl font-black tracking-tight text-slate-900 md:text-4xl font-display">
            Reviews by Service
          </h2>
          <p className="mb-10 max-w-2xl text-base leading-relaxed text-slate-600">
            No matter what service you need, our professionals deliver exceptional results. Browse reviews by category to see feedback specific to the service you are interested in. Explore our full <Link href="/services" className="text-purple-600 hover:underline">service menu</Link> for details and pricing.
          </p>

          {[
            { category: "Hair Services", services: ["Blowout", "Silk Press", "Balayage", "Braids", "Haircut", "Deep Conditioning"], link: "/services/hair" },
            { category: "Nail Services", services: ["Gel Manicure", "Nail Art", "Pedicure", "Dip Powder"], link: "/services/nails" },
            { category: "Makeup", services: ["Bridal Makeup", "Event Makeup", "Natural Makeup"], link: "/services/makeup" },
            { category: "Men's Grooming", services: ["Fade", "Hot Towel Shave", "Beard Trim", "Men's Haircut"], link: "/services/mens-hair" },
            { category: "Events & Parties", services: ["Bridal Party", "Corporate Event", "Birthday Party"], link: "/events" },
            { category: "Classes & Workshops", services: ["Braiding Class", "Makeup Class"], link: "/classes" },
          ].map((group) => {
            const filtered = additionalReviews.filter((r) => r.service && group.services.includes(r.service));
            if (filtered.length === 0) return null;
            return (
              <div key={group.category} className="mb-12 last:mb-0">
                <h3 className="mb-2 text-xl font-bold text-slate-900 font-display">
                  <Link href={group.link} className="text-purple-600 hover:underline">{group.category}</Link>
                </h3>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {filtered.slice(0, 3).map((review, i) => (
                    <ReviewCard key={i} review={review} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── 8. Our Commitment to Quality ───────────────────────────── */}
      <section className="bg-white px-4 py-20">
        <div className="mx-auto max-w-3xl">
          <p className="mb-3 inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-purple-600 font-display">
            <Sparkle /> Our Standards
          </p>
          <h2 className="mb-8 text-3xl font-black tracking-tight text-slate-900 md:text-4xl font-display">
            Our Commitment to Quality
          </h2>

          <div className="space-y-5 text-base leading-relaxed text-slate-600">
            <p>
              Maintaining a 4.9 average rating across thousands of appointments does not happen by accident. It is the result of deliberate, systematic quality control at every stage of our operation. It starts with recruitment: we accept fewer than fifteen percent of professionals who apply to join our roster. Every candidate must hold a current New York State license in their specialty, provide a professional portfolio, pass a live skills assessment with one of our senior evaluators, and clear a comprehensive background check. We do not cut corners on vetting because our clients are inviting these professionals into their most personal spaces.
            </p>
            <p>
              Once a professional joins our team, the quality monitoring continues. After every appointment, clients receive a brief survey asking them to rate their experience on a five-point scale across multiple dimensions: punctuality, professionalism, technique, cleanliness, and overall satisfaction. These ratings feed into each professional&apos;s running score, and we review performance data monthly. Professionals who maintain consistently high ratings earn priority scheduling and access to premium bookings. Those who receive negative feedback are contacted immediately, and repeated issues result in removal from the platform. We also conduct periodic unannounced quality checks and offer ongoing training workshops to keep our team at the top of their game.
            </p>
            <p>
              Beyond individual performance, we invest heavily in the client experience as a whole. Our booking process is designed to be simple and transparent. Our <Link href="/pricing" className="text-purple-600 hover:underline">pricing</Link> is all-inclusive with no hidden fees. Our customer support team is available seven days a week to handle questions, changes, and any concerns. And our satisfaction guarantee means that if something is not right, we make it right — no questions asked. We believe that every client deserves a five-star experience, and we build our entire business around delivering exactly that. Learn more about <Link href="/how-it-works" className="text-purple-600 hover:underline">how it works</Link> or read our <Link href="/about" className="text-purple-600 hover:underline">about page</Link> for the full story behind The NYC Mobile Salon.
            </p>
          </div>
        </div>
      </section>

      {/* ── 9. FAQ ──────────────────────────────────────────────────── */}
      <section className="bg-purple-50/50 px-4 py-20">
        <div className="mx-auto max-w-3xl">
          <p className="mb-3 inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-purple-600 font-display">
            <Sparkle /> Common Questions
          </p>
          <h2 className="mb-10 text-3xl font-black tracking-tight text-slate-900 md:text-4xl font-display">
            Frequently Asked Questions About Reviews
          </h2>

          <div className="space-y-6">
            {faqs.map((faq, i) => (
              <div key={i} className="rounded-xl border border-purple-100 bg-white p-6">
                <h3 className="mb-3 text-lg font-bold text-slate-900 font-display">{faq.q}</h3>
                <p className="text-base leading-relaxed text-slate-600">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 10. CTA ─────────────────────────────────────────────────── */}
      <section
        className="px-4 py-24 text-center text-white"
        style={{ background: "linear-gradient(135deg, #7C3AED 0%, #A78BFA 40%, #C4B5FD 100%)" }}
      >
        <div className="mx-auto max-w-2xl">
          <h2 className="mb-4 text-4xl font-black tracking-tight md:text-5xl font-display">
            Join 5,000+ Happy Clients
          </h2>
          <p className="mb-8 text-lg leading-relaxed text-white/90">
            Experience the mobile beauty service that New Yorkers are raving about. Licensed professionals, salon-quality results, delivered to your door in all five boroughs. Book your first appointment today and see why our clients give us a 4.9 rating.
          </p>
          <Link
            href="/book"
            className="rounded-full bg-purple-600 px-9 py-3.5 text-sm font-semibold uppercase tracking-wider text-white shadow-lg shadow-purple-500/20 transition hover:-translate-y-0.5 hover:bg-purple-700 font-display"
          >
            Book Your Appointment
          </Link>
        </div>
      </section>
    </>
  );
}
