import type { Metadata } from "next";
import Link from "next/link";
import { mensCategories, boroughNames, neighborhoods } from "@/app/site/nyc-mobile-salon/_lib/constants";
import { serviceContent } from "@/app/site/nyc-mobile-salon/_lib/service-content";
import { faqSchema, breadcrumbSchema } from "@/app/site/nyc-mobile-salon/_lib/seo";

const faqs = [
  {
    q: "What men's grooming services do you offer?",
    a: "We offer a full menu of men's grooming services delivered to your door anywhere in NYC. Our hair services include haircuts, fades (low, mid, high, skin, shadow, drop, burst, and temp fades), line ups and edge ups, and buzz cuts. Beard services include beard trim and shape, hot towel straight razor shave, and beard oil treatment. Our grooming services include brow cleanup, ear and nose wax, scalp treatment, men's manicure, men's pedicure, and back wax. Every service is performed by a fully licensed barber or grooming specialist.",
  },
  {
    q: "How much does men's mobile grooming cost in NYC?",
    a: "All of our men's grooming services are billed at $99 per hour with a one-hour minimum for individual appointments. If you are booking for three or more people (groomsmen, corporate events, group grooming sessions), the minimum is two hours. This flat hourly rate covers any combination of services, so you can mix and match haircuts, beard work, and grooming services within your session. Visit our pricing page for full details.",
  },
  {
    q: "Can you do fades at my home or apartment?",
    a: "Absolutely. Our barbers perform fades at your home, apartment, office, hotel room, or any private indoor location in NYC. We bring professional cordless clippers, multiple guard sets, detailers, capes, neck strips, and a portable cleanup system. Whether you want a skin fade, shadow fade, drop fade, burst fade, or temp fade, we deliver barbershop-level precision without you ever stepping outside.",
  },
  {
    q: "Do you offer wedding day grooming for grooms and groomsmen?",
    a: "Yes, wedding day grooming is one of our most popular services. We come to your hotel, Airbnb, venue, or home on the morning of your wedding and handle haircuts, fades, beard trims, hot towel shaves, brow cleanups, and manicures for the entire groomsmen party. The two-hour minimum applies for groups of three or more. Many grooms also book a trial grooming session one to two weeks before the wedding to lock in their look.",
  },
  {
    q: "What about beard maintenance between appointments?",
    a: "We offer full beard maintenance including trimming to your desired length, neckline cleanup with a straight razor, cheek line definition, mustache trimming, and blending your beard with your hairline. We also offer beard oil treatments to soften coarse hair, reduce itch, and hydrate the skin underneath. For men who prefer a clean-shaven look, our hot towel straight razor shave is the closest, smoothest shave you can get.",
  },
  {
    q: "Do you serve my neighborhood in NYC?",
    a: "We serve all five boroughs of New York City: Manhattan, Brooklyn, Queens, the Bronx, and Staten Island. From the Upper East Side to Bushwick, from Astoria to Riverdale, from St. George to Bay Ridge, our barbers and groomers travel to you. We cover over 200 neighborhoods across NYC. Check our locations page to find your specific neighborhood.",
  },
  {
    q: "Can I book regular recurring appointments?",
    a: "Yes, and we highly recommend it. Many of our clients book standing appointments every two to three weeks for haircuts and fades, and monthly for full grooming sessions. Regular clients get priority scheduling and the consistency of working with the same barber every time. Contact us to set up a recurring schedule that works for you.",
  },
  {
    q: "What products and tools do your barbers use?",
    a: "Our barbers use professional-grade cordless clippers (Wahl, Andis, BaByliss), precision detailers, professional shears, straight razors with disposable blades, and premium styling products. For beard services, we use professional trimmers, badger hair brushes, pre-shave oils, and premium aftershave balms. For grooming services like manicures and pedicures, we use hospital-grade sanitization protocols and professional nail care tools. All tools are sanitized between every client.",
  },
];

export const metadata: Metadata = {
  title: "Men\u2019s Mobile Grooming Services in NYC | Fades, Haircuts, Beard, Grooming",
  description:
    "Men\u2019s mobile grooming delivered to your door in NYC. Fades, haircuts, beard sculpting, hot towel shaves, brow cleanup, scalp treatments, men\u2019s manicures & pedicures. Licensed barbers and groomers across all 5 boroughs. $99/hour.",
  alternates: { canonical: "https://thenycmobilesalon.com/services/mens" },
  openGraph: {
    title: "Men\u2019s Mobile Grooming Services in NYC | Fades, Haircuts, Beard, Grooming",
    description:
      "Men\u2019s mobile grooming delivered to your door in NYC. Fades, haircuts, beard sculpting, hot towel shaves, brow cleanup, scalp treatments, men\u2019s manicures & pedicures. Licensed barbers and groomers across all 5 boroughs. $99/hour.",
    url: "https://thenycmobilesalon.com/services/mens",
  },
};

export default function MensServicesPage() {
  return (
    <>
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            faqSchema(faqs)
          ).replace(/</g, '\\u003c'),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbSchema([
              { name: "Home", url: "/" },
              { name: "Services", url: "/services" },
              { name: "Men\u2019s Grooming", url: "/services/mens" },
            ])
          ).replace(/</g, '\\u003c'),
        }}
      />

      {/* Hero */}
      <section className="relative overflow-hidden px-4 py-20 md:py-28" style={{ background: "linear-gradient(135deg, #1a1a1a 0%, #0c2340 50%, #1a1a1a 100%)" }}>
        <div className="pointer-events-none absolute right-0 top-0 h-[400px] w-[400px] rounded-full bg-sky-500/5 blur-3xl" />
        <div className="relative mx-auto max-w-4xl text-center">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-white/50">For Him</p>
          <h1 className="font-display mb-6 text-5xl font-bold tracking-tight text-white md:text-6xl lg:text-7xl">
            Men&apos;s <span className="italic text-sky-400">Grooming</span>
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-white/70">
            Fades, haircuts, beard sculpting, hot towel shaves, and full grooming packages &mdash; delivered to your door by licensed barbers across <Link href="/locations/manhattan" className="text-sky-400 hover:underline">Manhattan</Link>, <Link href="/locations/brooklyn" className="text-sky-400 hover:underline">Brooklyn</Link>, <Link href="/locations/queens" className="text-sky-400 hover:underline">Queens</Link>, the <Link href="/locations/bronx" className="text-sky-400 hover:underline">Bronx</Link> &amp; <Link href="/locations/staten-island" className="text-sky-400 hover:underline">Staten Island</Link>.
          </p>
          <p className="mx-auto mt-4 max-w-xl text-sm text-white/50">
            All services billed at <strong className="text-white/80">$99/hour</strong> &middot; 1-hour minimum for individuals &middot; 2-hour minimum for groups of 3+
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/book" className="inline-block rounded-full bg-sky-500 px-9 py-3.5 text-sm font-semibold uppercase tracking-wider text-white shadow-lg shadow-sky-500/30 transition hover:-translate-y-0.5 hover:bg-sky-600 font-display">Book Now</Link>
            <Link href="/pricing" className="btn-outline-light">See Pricing</Link>
          </div>
        </div>
      </section>

      {/* Intro */}
      <section className="bg-white px-6 py-16 md:py-20">
        <div className="mx-auto max-w-4xl">
          <h2 className="font-display mb-8 text-3xl font-medium tracking-tight text-charcoal md:text-4xl">
            Mobile men&apos;s grooming, delivered across NYC
          </h2>
          <div className="space-y-5 text-lg leading-relaxed text-gray-600">
            <p>
              The NYC Mobile Salon delivers a complete menu of men&apos;s grooming services directly to your home, office, hotel, or any private indoor location anywhere in New York City. Every service is performed by a fully licensed barber or grooming specialist who arrives with professional-grade tools, premium products, and everything needed for a barbershop-quality experience &mdash; without the barbershop wait. All services are billed at a flat rate of <strong>$99 per hour</strong>, with a one-hour minimum for individual appointments and a two-hour minimum when booking for three or more people.
            </p>
            <p>
              Our men&apos;s <Link href="/services/fade-haircut" className="text-sky-500 hover:underline">hair services</Link> cover every cut and style a man could want. Whether you need a crisp <Link href="/services/fade-haircut" className="text-sky-500 hover:underline">fade</Link> &mdash; low, mid, high, skin, shadow, drop, burst, or temp &mdash; a classic <Link href="/services/mens-haircut-and-style" className="text-sky-500 hover:underline">haircut and style</Link>, a razor-sharp <Link href="/services/line-up-edge-up" className="text-sky-500 hover:underline">line up</Link>, or a clean <Link href="/services/buzz-cut" className="text-sky-500 hover:underline">buzz cut</Link>, our barbers deliver precision and consistency every single time. We bring professional cordless clippers, multiple guard sets, detailers, and shears, so there is no compromise on quality just because we come to you. In fact, most of our clients tell us the experience is better than their old barbershop because they get the same level of skill with zero wait time, no commute, and no awkward small talk unless they want it.
            </p>
            <p>
              Our <Link href="/services/beard-trim-and-shape" className="text-sky-500 hover:underline">beard services</Link> are equally thorough. A well-groomed beard is the difference between looking intentional and looking accidental, and our barbers treat beard work with the same precision as a haircut. We offer full <Link href="/services/beard-trim-and-shape" className="text-sky-500 hover:underline">beard trim and shaping</Link> with neckline razor cleanup and cheek line definition, old-school <Link href="/services/hot-towel-shave" className="text-sky-500 hover:underline">hot towel straight razor shaves</Link> with pre-shave oil and aftershave balm, and hydrating <Link href="/services/beard-oil-treatment" className="text-sky-500 hover:underline">beard oil treatments</Link> that soften coarse hair and eliminate itch. Whether you are growing out a full beard, maintaining a tight stubble, or going clean-shaven, we have the service and the expertise.
            </p>
            <p>
              Beyond hair and beard, our grooming services cover everything else a man needs to look and feel his best. A <Link href="/services/mens-brow-cleanup" className="text-sky-500 hover:underline">brow cleanup</Link> removes the unibrow and stray hairs while keeping a natural, masculine shape. An <Link href="/services/ear-and-nose-wax" className="text-sky-500 hover:underline">ear and nose wax</Link> takes five minutes and lasts a month. A professional <Link href="/services/scalp-treatment" className="text-sky-500 hover:underline">scalp treatment</Link> exfoliates buildup, reduces flaking, and promotes healthier hair growth. Our <Link href="/services/mens-manicure" className="text-sky-500 hover:underline">men&apos;s manicure</Link> and <Link href="/services/mens-pedicure" className="text-sky-500 hover:underline">men&apos;s pedicure</Link> leave your hands and feet clean, trimmed, and buffed &mdash; no polish required, just well-groomed hands and feet that make a quiet but powerful impression. And for men who want smooth skin, our <Link href="/services/back-wax" className="text-sky-500 hover:underline">back wax</Link> delivers clean results that last four to six weeks.
            </p>
            <p>
              The beauty of our hourly pricing model is that you can combine any of these services in a single session. Book an hour and get a fade plus a beard trim. Book ninety minutes and add a brow cleanup and a manicure. Book two hours for the full experience: haircut, beard, hot towel shave, brow cleanup, and grooming. You are paying for time, not for each individual service, which means you get more value and more flexibility than a traditional barbershop menu.
            </p>
            <p>
              We serve all five boroughs of New York City &mdash; Manhattan, Brooklyn, Queens, the Bronx, and Staten Island &mdash; and we cover over 200 neighborhoods. Whether you are in a high-rise on the Upper East Side, a brownstone in Park Slope, a walk-up in Astoria, or a house in Riverdale, your barber will come to you. No commute, no waiting, no wasted time. Just professional grooming on your schedule, at your location.
            </p>
          </div>
        </div>
      </section>

      {/* Service Categories */}
      {mensCategories.map((cat, catIdx) => {
        const categoryIntros: Record<string, React.ReactNode> = {
          hair: (
            <div className="mb-8 space-y-4 text-lg leading-relaxed text-gray-600">
              <p>
                Hair is the foundation of men&apos;s grooming, and our barbers treat every cut with the precision and care it deserves. Whether you prefer a classic side part, a modern textured crop, or a sharp fade with a hard part, our licensed barbers have the skill and experience to deliver exactly what you want. We specialize in all types of men&apos;s hair &mdash; straight, wavy, curly, and coily &mdash; and we adjust our techniques and tools for every texture.
              </p>
              <p>
                Fades are our most requested service in New York City, and for good reason. A well-executed fade requires a trained eye, steady hands, and the right equipment. Our barbers bring professional cordless clippers with adjustable blades, multiple guard sets, and precision detailers to create seamless blends that rival any top barbershop in Manhattan or Brooklyn. From skin fades that taper to the scalp to shadow fades with a softer transition, we customize every fade to your head shape, hair type, and personal style.
              </p>
              <p>
                For men who want to stay fresh between full haircuts, our line up and edge up service sharpens the hairline around the forehead, temples, sideburns, and neckline using trimmers and a straight razor. Many of our clients book a line up every week or two and a full haircut every three to four weeks &mdash; it is the easiest way to always look sharp without a major time commitment.
              </p>
            </div>
          ),
          beard: (
            <div className="mb-8 space-y-4 text-lg leading-relaxed text-gray-600">
              <p>
                A great beard does not happen by accident. It requires regular maintenance, the right tools, and a barber who understands shape, proportion, and how your beard relates to your face and haircut. Our beard services cover everything from quick maintenance trims to full sculpting sessions and luxurious hot towel shaves. Whether you are rocking a full beard, a goatee, designer stubble, or going completely clean-shaven, we have the service for you.
              </p>
              <p>
                Our <Link href="/services/hot-towel-shave" className="text-sky-500 hover:underline">hot towel straight razor shave</Link> is a true barbershop luxury experience brought to your living room. It starts with a steaming hot towel wrap to open your pores, followed by pre-shave oil, a rich lather applied with a badger hair brush, and a meticulous straight razor shave with the grain. We finish with a cold towel to close the pores and a soothing aftershave balm. This is the kind of shave that leaves your skin impossibly smooth and makes you feel like a gentleman from another era &mdash; except you never had to leave your apartment.
              </p>
              <p>
                For men with beards that feel dry, coarse, or itchy, our beard oil treatment is a game-changer. We apply premium oils blended for your specific beard type, work them in with a thorough beard and face massage, and finish with combing and styling. The result is a softer, healthier, better-looking beard with zero itch and a natural, healthy sheen.
              </p>
            </div>
          ),
          grooming: (
            <div className="mb-8 space-y-4 text-lg leading-relaxed text-gray-600">
              <p>
                Grooming is the detail work that separates a man who looks good from a man who looks great. These are the services most men know they should be getting but never quite get around to &mdash; brow cleanup, ear and nose hair removal, scalp care, hand and foot maintenance, and body waxing. At The NYC Mobile Salon, we make it easy by bringing every one of these services directly to your door. No awkward trips to a salon, no wondering if you belong there. Your groomer comes to you, handles everything in the privacy of your own home, and leaves you looking and feeling polished from head to toe.
              </p>
              <p>
                Our men&apos;s manicure and pedicure are among our fastest-growing services, and for good reason. Clean, trimmed, buffed nails are a subtle but powerful grooming move that people notice even if they cannot pinpoint exactly why. Our manicure includes nail trimming and shaping, cuticle care, hand exfoliation, a brief massage, and buffing for a clean natural finish. No polish unless you want it. Our pedicure covers the feet with a warm soak, callus removal, nail work, scrub, and massage &mdash; essential for athletes, runners, and anyone who spends long days on their feet.
              </p>
              <p>
                Scalp treatments are another service that more men are discovering. If you deal with dandruff, dry scalp, product buildup, or thinning, a professional scalp treatment can make a significant difference. We exfoliate the scalp to remove dead skin and buildup, apply a hydrating or stimulating mask tailored to your needs, and finish with a deeply relaxing scalp massage that promotes blood flow and healthier hair growth. Pair it with a haircut for the ultimate grooming session.
              </p>
            </div>
          ),
        };

        return (
          <section key={cat.slug} className={`px-4 py-16 md:py-20 ${catIdx % 2 === 0 ? "bg-gray-50" : "bg-white"}`}>
            <div className="mx-auto max-w-6xl">
              <div className="mb-10">
                <h2 className="font-display text-3xl font-medium tracking-tight text-charcoal md:text-4xl">
                  {cat.title}
                </h2>
              </div>

              {categoryIntros[cat.slug]}

              <div className="grid gap-6 md:grid-cols-2">
                {cat.services.map((svc) => {
                  const content = serviceContent[svc.slug];
                  return (
                    <Link key={svc.slug} href={`/services/${svc.slug}`} className="group rounded-xl border border-sky-100 bg-white p-6 transition-all hover:shadow-md hover:shadow-sky-500/10">
                      <h3 className="font-display mb-2 text-xl font-semibold text-charcoal group-hover:text-sky-600 transition-colors">{svc.name}</h3>
                      <p className="mb-3 text-sm text-gray-500">{svc.description}</p>
                      {content && (
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>{content.duration}</span>
                          <span className="text-gray-300">|</span>
                          <span>From {content.price}</span>
                          <span className="ml-auto font-semibold text-sky-500 group-hover:translate-x-1 transition-transform">&rarr;</span>
                        </div>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          </section>
        );
      })}

      {/* Why Mobile Grooming */}
      <section className="bg-white px-6 py-16 md:py-20">
        <div className="mx-auto max-w-4xl">
          <h2 className="font-display mb-8 text-3xl font-medium tracking-tight text-charcoal md:text-4xl">
            Why men in NYC are choosing mobile grooming
          </h2>
          <div className="space-y-5 text-lg leading-relaxed text-gray-600">
            <p>
              The traditional barbershop experience has a lot going for it &mdash; the atmosphere, the camaraderie, the ritual. But it also comes with things most busy New Yorkers would rather skip: the commute, the walk-in wait, the inconsistency of whoever happens to be available when you show up, and the lost Saturday morning you will never get back. Mobile grooming eliminates every one of those friction points. You book a time, your barber shows up at your door, and you get a professional haircut, fade, or grooming session in the comfort of your own space. No travel, no waiting, no wasted time.
            </p>
            <p>
              Privacy is another major reason men are switching to mobile grooming. Not every guy wants to sit in a row of chairs making small talk while getting a manicure, a brow cleanup, or a back wax. When your groomer comes to your home, you get the same professional service in a private, comfortable setting where you can relax and be yourself. This is especially true for grooming services like pedicures, scalp treatments, and waxing that men often avoid simply because they feel self-conscious doing them in a public salon.
            </p>
            <p>
              For busy professionals, mobile grooming is a time multiplier. You can get a haircut during your lunch break without leaving the office. You can get a fade and a beard trim before a dinner date while you are already getting ready at home. You can book a Saturday morning session and still make your noon brunch, because your barber arrives, handles your cut, and is gone in 45 minutes &mdash; no commute on either end. For men who bill by the hour, the math alone makes mobile grooming a no-brainer.
            </p>
            <p>
              Pre-event grooming is another area where mobile shines. Whether you have a job interview, a first date, a corporate headshot session, a presentation, or a night out, getting groomed right before the event means you look your absolute freshest when it matters most. No need to schedule your barbershop visit a day or two early and hope your fade still looks clean by the time the event rolls around. With mobile grooming, you book your barber for the morning of and walk into your event looking sharp, confident, and freshly cut.
            </p>
          </div>
        </div>
      </section>

      {/* For Grooms */}
      <section className="bg-gray-50 px-6 py-16 md:py-20">
        <div className="mx-auto max-w-4xl">
          <h2 className="font-display mb-8 text-3xl font-medium tracking-tight text-charcoal md:text-4xl">
            Wedding day grooming for grooms &amp; groomsmen
          </h2>
          <div className="space-y-5 text-lg leading-relaxed text-gray-600">
            <p>
              Your wedding day is one of the most photographed days of your life, and every groom deserves to look his absolute best. The NYC Mobile Salon specializes in wedding day grooming for grooms and groomsmen. We come to your hotel, Airbnb, venue, or home on the morning of the wedding and handle everything: haircuts, fades, beard trims, hot towel shaves, brow cleanups, ear and nose wax, manicures, and any other grooming your party needs. With our $99 per hour rate and two-hour minimum for groups of three or more, you can groom an entire wedding party for a fraction of what you would spend sending everyone to individual barbershop appointments.
            </p>
            <p>
              Many of our grooms book a trial grooming session one to two weeks before the wedding to dial in exactly the right haircut, fade height, beard length, and overall look. That way, on the morning of the wedding, your barber already knows your preferences and can execute quickly and confidently. It also gives your hair and beard time to settle into the style so everything looks natural and camera-ready rather than freshly-cut-an-hour-ago stiff.
            </p>
            <p>
              Wedding grooming is one of those details that makes a bigger difference than most grooms expect. When you and your groomsmen show up to photos with fresh fades, clean beards, groomed brows, and polished hands, it shows. The photos come out sharper, the confidence is higher, and the whole experience of getting ready together becomes a memorable part of the day. <Link href="/events" className="text-sky-500 hover:underline">Learn more about our event and wedding services</Link>, or <Link href="/book" className="text-sky-500 hover:underline">book your wedding grooming session today</Link>.
            </p>
          </div>
        </div>
      </section>

      {/* Men's Grooming 101 Class */}
      <section className="bg-white px-6 py-16 md:py-20">
        <div className="mx-auto max-w-4xl">
          <h2 className="font-display mb-8 text-3xl font-medium tracking-tight text-charcoal md:text-4xl">
            Men&apos;s Grooming 101 Class
          </h2>
          <div className="space-y-5 text-lg leading-relaxed text-gray-600">
            <p>
              Want to level up your grooming game between barber visits? Our <Link href="/classes/mens-grooming-101" className="text-sky-500 hover:underline">Men&apos;s Grooming 101 class</Link> teaches you the fundamentals of at-home grooming and maintenance. Led by our licensed barbers and grooming specialists, this hands-on class covers beard trimming and shaping techniques, proper skincare routines for men, how to maintain your hairline between cuts, brow grooming, nail care, and product selection. You will learn which tools are worth investing in, how to use them correctly, and how to build a simple daily grooming routine that keeps you looking sharp every day &mdash; not just the day you see your barber.
            </p>
            <p>
              The class is available as a private one-on-one session at your home or as a group session for friends, groomsmen, or corporate teams. It makes a great gift, a unique bachelor party activity, or a team-building event. Our instructors tailor the content to your specific needs and questions, so whether you are a grooming novice who needs the basics or someone looking to refine specific skills, you will walk away with practical knowledge you can use immediately. <Link href="/classes/mens-grooming-101" className="text-sky-500 hover:underline">Learn more and book a Men&apos;s Grooming 101 session</Link>.
            </p>
          </div>
        </div>
      </section>

      {/* Available by Borough */}
      <section className="bg-gray-50 px-4 py-16 md:py-20">
        <div className="mx-auto max-w-5xl text-center">
          <h2 className="font-display mb-4 text-3xl font-medium tracking-tight text-charcoal md:text-4xl">
            Available across all five boroughs
          </h2>
          <p className="mx-auto mb-8 max-w-2xl text-gray-500">
            Our licensed barbers and grooming specialists travel to your home, office, or hotel anywhere in New York City. Over 200 neighborhoods covered, seven days a week.
          </p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
            {Object.entries(boroughNames).map(([slug, name]) => (
              <Link key={slug} href={`/locations/${slug}`} className="card-hover rounded-xl border border-sky-100 bg-white p-6 text-center">
                <p className="text-lg font-semibold text-charcoal">{name}</p>
                <p className="mt-1 text-xs text-sky-500">{neighborhoods[slug]?.length} neighborhoods</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-white px-6 py-16 md:py-20">
        <div className="mx-auto max-w-4xl">
          <h2 className="font-display mb-10 text-3xl font-medium tracking-tight text-charcoal md:text-4xl">
            Frequently asked questions about men&apos;s grooming
          </h2>
          <div className="divide-y divide-gray-100">
            {faqs.map((faq, i) => (
              <div key={i} className="py-6">
                <h3 className="font-display mb-3 text-lg font-semibold text-charcoal">{faq.q}</h3>
                <p className="text-gray-600 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 py-16 md:py-20 text-center" style={{ background: "linear-gradient(135deg, #1a1a1a 0%, #0c2340 50%, #1a1a1a 100%)" }}>
        <div className="mx-auto max-w-3xl">
          <h2 className="font-display mb-4 text-3xl font-medium text-white md:text-4xl">
            Ready to get <span className="italic text-sky-400">fresh?</span>
          </h2>
          <p className="mb-4 text-lg text-white/70">
            Book your mobile grooming appointment today. Your licensed barber comes to your home, office, or hotel anywhere in NYC with everything needed for a barbershop-quality experience &mdash; no commute, no waiting, no hassle.
          </p>
          <p className="mb-8 text-sm text-white/50">
            $99/hour &middot; 1-hour minimum for individuals &middot; 2-hour minimum for groups of 3+ &middot; All five boroughs
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/book" className="inline-block rounded-full bg-sky-500 px-9 py-3.5 text-sm font-semibold uppercase tracking-wider text-white shadow-lg shadow-sky-500/30 transition hover:-translate-y-0.5 hover:bg-sky-600 font-display">Book Your Appointment</Link>
            <Link href="/pricing" className="btn-outline-light">See Pricing</Link>
          </div>
        </div>
      </section>
    </>
  );
}
