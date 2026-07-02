// @ts-nocheck
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import {
  services,
  findServiceBySlug,
  getServiceUrl,
  states,
  cities,
  clientTypes,
  getCitiesByState,
  getCityServiceUrl,
  getCityUrl,
  getStateUrl,
  parks,
  getParkUrl,
  SITE_URL,
  SITE_SMS_LINK,
  SITE_PHONE,
  SITE_PHONE_LINK,
} from "@/app/site/stretch-service/_lib/siteData";
import { JsonLd, webPageSchema, breadcrumbSchema, faqSchema, serviceSchema } from "@/app/site/stretch-service/_lib/schema";
import Logo from "@/app/site/stretch-service/_components/Logo";

interface Props {
  params: Promise<{ slug: string }>;
}

export const dynamicParams = true
export const revalidate = 2592000

export async function generateStaticParams() { return [] }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const service = findServiceBySlug(slug);
  if (!service) return {};
  return {
    title: `${service.name} Stretch Service | $99/hr Nationwide Mobile`,
    description: `${service.shortDesc} Professional mobile stretch service. $99/hr, 10% off weekly. Nationwide. Same-day available 7AM-10PM.`,
    alternates: { canonical: `${SITE_URL}${getServiceUrl(service)}` },
  };
}

export default async function ServicePage({ params }: Props) {
  const { slug } = await params;
  const service = findServiceBySlug(slug);
  if (!service) notFound();

  const otherServices = services.filter((s) => s.slug !== slug);
  const pageUrl = `${SITE_URL}${getServiceUrl(service)}`;

  /* Top cities by population for this service */
  const topCities = cities.filter((c) =>
    ["new-york-city", "los-angeles", "chicago", "houston", "phoenix", "philadelphia", "san-antonio", "san-diego", "dallas", "miami", "austin", "denver", "seattle", "boston", "nashville", "san-francisco", "atlanta", "portland"].includes(c.slug)
  ).slice(0, 18);

  /* Major states */
  const majorStates = states.filter((s) =>
    ["california", "new-york", "texas", "florida", "illinois", "pennsylvania", "ohio", "georgia", "north-carolina", "michigan"].includes(s.slug)
  );

  /* Regional grouping */
  const westCoastCities = cities.filter((c) => ["california", "washington", "oregon", "nevada", "colorado", "arizona"].includes(c.stateSlug)).slice(0, 8);
  const eastCoastCities = cities.filter((c) => ["new-york", "massachusetts", "pennsylvania", "new-jersey", "connecticut", "maryland", "virginia"].includes(c.stateSlug)).slice(0, 8);
  const southCities = cities.filter((c) => ["florida", "texas", "georgia", "north-carolina", "tennessee", "louisiana"].includes(c.stateSlug)).slice(0, 8);
  const midwestCities = cities.filter((c) => ["illinois", "ohio", "michigan", "indiana", "wisconsin", "minnesota", "missouri"].includes(c.stateSlug)).slice(0, 8);

  const faqItems = [
    { question: `What is ${service.name.toLowerCase()} and how does it work?`, answer: service.description },
    { question: `How much does ${service.name.toLowerCase()} cost?`, answer: `${service.name} is $99 per 60-minute session. Weekly clients save 10% at $89/session. All equipment included. We come to your home, office, hotel, or any location.` },
    { question: `Who is ${service.name.toLowerCase()} best for?`, answer: `${service.name} is ideal for ${service.idealFor.join(", ").toLowerCase()}. Your therapist customizes every session to your specific needs, fitness level, and goals.` },
    { question: `Is ${service.name.toLowerCase()} safe?`, answer: `Yes, when performed by a certified stretch therapist, ${service.name.toLowerCase()} is completely safe. All Stretch Service therapists are certified, insured, and extensively trained in this technique. They monitor your comfort throughout and never push beyond safe limits.` },
    { question: `Can I book ${service.name.toLowerCase()} for same-day?`, answer: `Yes! Same-day appointments are available in most cities. Text or call ${SITE_PHONE} and most requests are confirmed within 30 minutes. Available 7AM-10PM daily.` },
    { question: `How often should I get ${service.name.toLowerCase()}?`, answer: `For optimal results, we recommend weekly sessions. Clients who commit to 4+ consecutive weekly sessions see 3x greater improvement than single-session clients. After building a baseline, some clients shift to biweekly maintenance.` },
    { question: `What should I wear for a ${service.name.toLowerCase()} session?`, answer: `Comfortable, stretchy clothing — athletic wear, yoga pants, shorts, or sweatpants. Avoid jeans or restrictive clothing. Most stretching is done barefoot or in socks.` },
    { question: `How is ${service.name.toLowerCase()} different from massage?`, answer: `${service.name} focuses specifically on improving flexibility, range of motion, and muscle length through targeted stretching techniques. While massage addresses soft tissue through compression, stretching works by lengthening muscles and fascia to improve mobility and reduce pain. Many clients combine both modalities for comprehensive results.` },
    { question: `Can ${service.name.toLowerCase()} help with chronic pain?`, answer: `Yes! ${service.name} is highly effective for chronic pain conditions including lower back pain, neck tension, sciatica, hip pain, and general muscle tightness. Our therapists use targeted techniques to address root causes rather than just masking symptoms. Many clients report significant relief after their very first session.` },
    { question: `How does ${service.name.toLowerCase()} compare to yoga?`, answer: `${service.name} is one-on-one, hands-on, and 100% customized to your body — unlike group yoga classes. Professional ${service.name.toLowerCase()} produces 2-3x greater flexibility gains per session. For people who are too stiff, injured, or busy for yoga, ${service.name.toLowerCase()} is the superior alternative.` },
    { question: `Do you bring all equipment for ${service.name.toLowerCase()}?`, answer: `Yes! Our therapists bring a professional massage table, mats, straps, resistance bands, and all necessary tools. We transform any space — your living room, office, hotel room, or park — into a professional stretch service environment. You provide the body and about 6x8 feet of floor space.` },
    { question: `Can seniors safely receive ${service.name.toLowerCase()}?`, answer: `Absolutely. Our therapists adjust the intensity and technique selection based on each client&apos;s fitness level and comfort. For seniors, we often incorporate elements of our gentle stretch program with extra-gentle, slow-paced movements and chair-assisted options. Every session is 100% customized to what your body needs.` },
  ];

  return (
    <>
      <JsonLd data={webPageSchema(`${service.name} — Nationwide Mobile Stretch Service`, service.description, pageUrl)} />
      <JsonLd data={breadcrumbSchema([
        { name: "Home", url: SITE_URL },
        { name: "Services", url: `${SITE_URL}/services` },
        { name: service.name, url: pageUrl },
      ])} />
      <JsonLd data={serviceSchema(service.name, service.description, pageUrl)} />
      <JsonLd data={faqSchema(faqItems)} />

      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 pt-36 pb-16 sm:pt-44 sm:pb-24">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">
            <Link href="/services" className="hover:text-white">Services</Link>{" / "}{service.name}
          </p>
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">$99/hr Mobile Stretch Service — Nationwide | {service.idealFor.slice(0,3).join(", ")}</p>
          <h1 className="text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl font-heading">
            {service.name} — <span className="text-teal-200">$99/hr Nationwide</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/80">Professional {service.name.toLowerCase()} delivered to your home, office, hotel, or any location in 900+ American cities. Certified therapists. Same-day available 7AM-10PM. 10% off weekly.</p>
          <p className="mx-auto mt-2 text-xl font-bold text-teal-100 font-heading">{service.tagline}</p>
          <p className="mx-auto mt-2 text-3xl font-bold text-white font-heading">10% OFF WEEKLY — $89/SESSION</p>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/80">{service.shortDesc} Mobile service — we come to your home, office, hotel, or park. Same-day available 7AM-10PM.</p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a href={SITE_SMS_LINK}><span className="inline-block rounded-lg bg-white px-8 py-3.5 text-base font-semibold text-teal-700 shadow-lg transition-colors hover:bg-teal-50 font-cta">Text {SITE_PHONE} — Book Now</span></a>
            <a href={SITE_PHONE_LINK}><span className="inline-block rounded-lg border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:border-white/60 font-cta">Call {SITE_PHONE}</span></a>
          </div>
        </div>
      </section>

      {/* ═══ DEEP ABOUT ═══ */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 font-heading">What Is {service.name}? A Complete Guide</h2>
          <div className="mt-6 space-y-5 text-base leading-relaxed text-slate-700">
            <p>{service.description}</p>
            <p>
              At Stretch Service, our certified therapists deliver professional {service.name.toLowerCase()} sessions in {cities.length}+ cities across all 50 states. Every session is one-on-one, fully customized to your body, and delivered at the location of your choice. We bring a professional massage table, mats, straps, and all necessary equipment. You provide the body and about 6x8 feet of floor space — we handle everything else.
            </p>
            <p>
              {service.name} is one of {services.length} professional stretch service types we offer. Each technique is backed by decades of sports science research and performed by therapists who specialize exclusively in stretching. This singular focus produces specialists who understand the nuances of flexibility therapy at a level that generalists simply cannot match.
            </p>
            <p>
              The benefits of professional {service.name.toLowerCase()} are immediate and measurable. Most clients feel relief, improved range of motion, and reduced tension after their very first session. Consistent weekly sessions produce compounding results — our data shows 3x greater flexibility improvement for clients who commit to four or more consecutive weekly sessions compared to single-session clients.
            </p>
            <p>
              At $99 per hour — with a 10% discount for weekly clients at $89 per session — {service.name.toLowerCase()} is one of the most cost-effective wellness investments you can make. Compare that to the $200+ charged by specialty clinics or the $150+ for studio sessions that are not one-on-one. Our mobile model eliminates overhead costs and passes those savings directly to you.
            </p>
            <p>
              The science behind {service.name.toLowerCase()} is well-established. When a trained therapist performs this technique, they work with your body&apos;s proprioceptive system to override protective reflexes and achieve significantly deeper, more effective stretches than you can achieve on your own. Your muscles contain sensory receptors called muscle spindles and Golgi tendon organs that detect changes in length and tension. Through precise hand placement and controlled force, your therapist strategically activates these receptors to trigger relaxation responses that allow muscles to stretch further and hold improved positions longer.
            </p>
            <p>
              Beyond flexibility, professional {service.name.toLowerCase()} activates the parasympathetic nervous system (the &quot;rest and digest&quot; response), reducing cortisol levels and promoting deep relaxation. It improves blood circulation, accelerates lymphatic drainage, stimulates synovial fluid production in joints, and promotes fascial remodeling. These physiological effects combine to produce both immediate relief and lasting structural improvements in how your body moves, feels, and functions.
            </p>
            <p>
              {service.name} is effective for virtually every body type, age group, and fitness level. Our therapists adjust the intensity, technique selection, and pacing based on your individual assessment. Whether you are a professional athlete seeking peak performance, a desk worker with chronic pain, a senior maintaining mobility, or a tourist recovering from a day of sightseeing — {service.name.toLowerCase()} delivers measurable, meaningful results.
            </p>
          </div>
        </div>
      </section>

      {/* ═══ KEY BENEFITS EXPANDED ═══ */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-2xl font-bold text-slate-900 font-heading">Key Benefits of {service.name}</h2>
          <div className="mt-8 space-y-6">
            {service.features.map((feat) => (
              <div key={feat} className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 text-teal-600 font-bold text-lg">&#10003;</span>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 font-heading">{feat}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">
                      This benefit of {service.name.toLowerCase()} is one of the most valued by our clients. Professional, therapist-assisted {service.name.toLowerCase()} delivers this result consistently because our certified specialists have the training, equipment, and expertise to target the exact mechanisms in your body that produce this outcome. Self-stretching and group classes simply cannot replicate this level of precision and effectiveness.
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ WHO THIS SERVICE IS FOR — EXPANDED ═══ */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 font-heading">Who Is {service.name} For?</h2>
          <div className="mt-6 space-y-5 text-base leading-relaxed text-slate-700">
            {service.idealFor.map((client) => (
              <p key={client}>
                <strong>{client}:</strong> {service.name} is particularly effective for {client.toLowerCase()}. Whether you are dealing with chronic pain, recovering from intense physical activity, or simply looking to improve your overall flexibility and quality of life, {service.name.toLowerCase()} addresses your specific needs with proven techniques. Our therapists customize every session based on your individual assessment, ensuring that {client.toLowerCase()} receive the exact type and intensity of {service.name.toLowerCase()} that produces the best results for their body and goals.
              </p>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ WHAT TO EXPECT ═══ */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 font-heading">What to Expect in a {service.name} Session</h2>
          <div className="mt-6 space-y-5 text-base leading-relaxed text-slate-700">
            <p>
              Your {service.name.toLowerCase()} session begins the moment you text or call {SITE_PHONE}. We confirm your appointment within 30 minutes and assign a certified therapist in your area. Same-day appointments are available in most cities. Your therapist arrives at your location — home, office, hotel, or park — with a professional massage table, mats, straps, and all necessary equipment.
            </p>
            <p>
              The first 5-10 minutes of your session are dedicated to a comprehensive mobility assessment. Your therapist evaluates your posture, tests range of motion in key joints, identifies areas of restriction and pain, and discusses your specific goals. This assessment is critical because it allows your therapist to design a personalized {service.name.toLowerCase()} protocol that targets your exact problem areas rather than following a generic routine.
            </p>
            <p>
              For the next 50-55 minutes, your therapist guides your body through a series of {service.name.toLowerCase()} positions and techniques. You remain fully clothed on the massage table or mat. Your therapist communicates throughout the session, checking your comfort level and adjusting intensity in real time. The experience is deeply relaxing for most clients — many describe it as the most peaceful and therapeutic hour of their week.
            </p>
            <p>
              After the session, you will feel immediate improvement. Increased range of motion, reduced tension and pain, and a profound sense of physical relaxation. Your therapist provides 2-3 specific exercises or stretches you can do between appointments to maintain your progress. They also discuss scheduling — weekly clients receive 10% off at $89/session, priority scheduling, and same-therapist continuity for consistent progress tracking. No contracts, cancel anytime.
            </p>
          </div>
        </div>
      </section>

      {/* ═══ PRICING ═══ */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-center text-2xl font-bold text-slate-900 font-heading">{service.name} Pricing — Nationwide</h2>
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="rounded-xl border-2 border-slate-200 bg-white p-8 text-center">
              <p className="text-sm font-semibold uppercase tracking-wider text-slate-500 font-cta">Single Session</p>
              <p className="mt-4 text-5xl font-bold text-teal-700 font-heading">$99</p>
              <p className="mt-1 text-sm text-slate-500">per 60-minute session</p>
              <ul className="mt-6 space-y-2 text-left text-sm text-slate-600">
                <li>&#10003; Professional {service.name.toLowerCase()}</li>
                <li>&#10003; Full-body mobility assessment</li>
                <li>&#10003; All equipment included</li>
                <li>&#10003; Same-day available</li>
                <li>&#10003; Mobile — we come to you</li>
              </ul>
            </div>
            <div className="rounded-xl border-2 border-teal-400 bg-teal-50 p-8 text-center shadow-lg">
              <p className="text-sm font-semibold uppercase tracking-wider text-teal-600 font-cta">Weekly Program</p>
              <p className="mt-4 text-5xl font-bold text-teal-700 font-heading">$89</p>
              <p className="mt-1 text-sm text-teal-600 font-semibold">10% OFF — per session</p>
              <ul className="mt-6 space-y-2 text-left text-sm text-slate-700">
                <li>&#10003; Everything in Single Session</li>
                <li>&#10003; Same therapist every week</li>
                <li>&#10003; Priority scheduling</li>
                <li>&#10003; Progress tracking</li>
                <li>&#10003; No contracts — cancel anytime</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ BY REGION ═══ */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-2xl font-bold text-slate-900 font-heading">{service.name} by Region — Where It&apos;s Most Popular</h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-slate-600">{service.name} is available in {cities.length}+ cities across all 50 states. Here is where demand is highest.</p>
          <div className="mt-10 space-y-8">
            <div>
              <h3 className="text-lg font-bold text-slate-900 font-heading">West Coast — {service.name}</h3>
              <p className="mt-2 text-sm text-slate-600">The West Coast&apos;s wellness culture and active lifestyles drive massive demand for {service.name.toLowerCase()}. Tech workers in Seattle and Silicon Valley, surfers and hikers in Southern California, and tourists across the region all rely on this service.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {westCoastCities.map((c) => (
                  <Link key={c.slug} href={getCityServiceUrl(c, service)} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 transition-all hover:border-teal-400 hover:text-teal-700">
                    {c.name}, {c.stateAbbr}
                  </Link>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 font-heading">East Coast — {service.name}</h3>
              <p className="mt-2 text-sm text-slate-600">Fast-paced careers, brutal commutes, and demanding lifestyles make the East Coast one of our highest-demand regions for {service.name.toLowerCase()}. From New York to Boston to Philadelphia, professionals depend on this service.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {eastCoastCities.map((c) => (
                  <Link key={c.slug} href={getCityServiceUrl(c, service)} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 transition-all hover:border-teal-400 hover:text-teal-700">
                    {c.name}, {c.stateAbbr}
                  </Link>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 font-heading">South — {service.name}</h3>
              <p className="mt-2 text-sm text-slate-600">From Florida&apos;s retirees to Texas&apos; athletes to Nashville&apos;s tourists, the South is a rapidly growing market for {service.name.toLowerCase()}. The heat and active culture create high demand for professional stretching therapy.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {southCities.map((c) => (
                  <Link key={c.slug} href={getCityServiceUrl(c, service)} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 transition-all hover:border-teal-400 hover:text-teal-700">
                    {c.name}, {c.stateAbbr}
                  </Link>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 font-heading">Midwest — {service.name}</h3>
              <p className="mt-2 text-sm text-slate-600">Cold winters and long periods of reduced activity make {service.name.toLowerCase()} essential for Midwest residents. Chicago leads the region in demand, with growing markets across Ohio, Michigan, and Minnesota.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {midwestCities.map((c) => (
                  <Link key={c.slug} href={getCityServiceUrl(c, service)} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 transition-all hover:border-teal-400 hover:text-teal-700">
                    {c.name}, {c.stateAbbr}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ TOP CITIES FOR THIS SERVICE ═══ */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-2xl font-bold text-slate-900 font-heading">{service.name} in Top Cities</h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-slate-600">{service.name} is available in {cities.length}+ cities. Here are our most popular locations.</p>
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {topCities.map((c) => (
              <Link key={c.slug} href={getCityServiceUrl(c, service)}>
                <div className="group rounded-lg border border-slate-200 bg-white p-3 text-center transition-all hover:border-teal-400 hover:shadow-md">
                  <p className="text-sm font-bold text-slate-900 group-hover:text-teal-600 font-heading">{c.name}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{c.stateAbbr}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ BY STATE ═══ */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-2xl font-bold text-slate-900 font-heading">{service.name} by State</h2>
          <div className="mt-8 space-y-6">
            {majorStates.map((st) => {
              const stCities = getCitiesByState(st.slug).slice(0, 8);
              if (stCities.length === 0) return null;
              return (
                <div key={st.slug}>
                  <h3 className="text-lg font-bold text-slate-900 font-heading">
                    <Link href={getStateUrl(st)} className="text-teal-700 hover:text-teal-900">{st.name}</Link>
                    <span className="ml-2 text-sm font-normal text-slate-500">({getCitiesByState(st.slug).length} cities)</span>
                  </h3>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {stCities.map((c) => (
                      <Link key={c.slug} href={getCityServiceUrl(c, service)} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 transition-all hover:border-teal-400 hover:text-teal-700">
                        {c.name}
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-8 text-center">
            <Link href="/locations" className="text-teal-600 font-semibold underline hover:text-teal-700 font-cta">Browse All {cities.length}+ Cities &rarr;</Link>
          </div>
        </div>
      </section>

      {/* ═══ POPULAR CITY COMBOS ═══ */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-2xl font-bold text-slate-900 font-heading">Popular {service.name} Locations</h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-slate-600">These cities have the highest demand for {service.name.toLowerCase()}. Click any city for local details and booking.</p>
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {topCities.slice(0, 12).map((c) => (
              <Link key={c.slug} href={getCityServiceUrl(c, service)}>
                <div className="group rounded-lg border border-slate-200 bg-white p-4 text-center transition-all hover:border-teal-400 hover:shadow-md">
                  <p className="text-sm font-bold text-slate-900 group-hover:text-teal-600 font-heading">{service.name}</p>
                  <p className="mt-0.5 text-xs text-slate-500">in {c.name}, {c.stateAbbr}</p>
                  <p className="mt-1 text-xs text-teal-600 font-medium">$99/hr &rarr;</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FAQ ═══ */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 font-heading">FAQ: {service.name}</h2>
          <div className="mt-8 space-y-3">
            {faqItems.map((faq) => (
              <details key={faq.question} className="group rounded-xl border border-teal-200/60 bg-white">
                <summary className="cursor-pointer px-6 py-4 text-base font-semibold text-slate-900 transition-colors hover:text-teal-700 font-heading">{faq.question}</summary>
                <div className="px-6 pb-5 text-base leading-relaxed text-slate-600">{faq.answer}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ OTHER SERVICES ═══ */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-2xl font-bold text-slate-900 font-heading">Other Stretch Services</h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-slate-600">We offer {services.length} professional stretch service types. Explore other options to find the perfect match for your body and goals.</p>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {otherServices.map((s) => (
              <Link key={s.slug} href={getServiceUrl(s)}>
                <div className="group rounded-xl border border-slate-200 bg-white p-5 transition-all hover:border-teal-400 hover:shadow-md h-full">
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-teal-600 font-heading">{s.name}</h3>
                  <p className="mt-1 text-xs font-semibold text-teal-600">{s.tagline}</p>
                  <p className="mt-2 text-sm text-slate-600 line-clamp-2">{s.shortDesc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 py-16">
        <div className="absolute inset-0 grid-bg opacity-20" />
        <div className="relative mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-2xl font-bold text-white font-heading">Book {service.name} — $99/hr Nationwide</h2>
          <p className="mt-4 text-lg text-white/80">{service.tagline}. Mobile service in {cities.length}+ cities. Same-day available. 10% off weekly.</p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a href={SITE_SMS_LINK}><span className="inline-block rounded-lg bg-white px-8 py-3.5 text-base font-semibold text-teal-700 shadow-lg transition-colors hover:bg-teal-50 font-cta">Text {SITE_PHONE}</span></a>
            <a href={SITE_PHONE_LINK}><span className="inline-block rounded-lg border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:border-white/60 font-cta">Call {SITE_PHONE}</span></a>
          </div>
          <p className="mt-4 text-sm text-teal-200">$99/hr single session | $89/hr weekly (10% off) | 7AM-10PM daily | Same-day available</p>
        </div>
      </section>
    </>
  );
}
