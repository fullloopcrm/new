// @ts-nocheck
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import {
  findStateBySlug,
  findCityBySlug,
  findServiceBySlug,
  services,
  clientTypes,
  getCityUrl,
  getCityServiceUrl,
  getStateUrl,
  getServiceUrl,
  getParksByCity,
  getParkUrl,
  getCitiesByState,
  SITE_URL,
  SITE_SMS_LINK,
  SITE_PHONE,
  SITE_PHONE_LINK,
} from "@/app/site/stretch-service/_lib/siteData";
import { JsonLd, webPageSchema, breadcrumbSchema, faqSchema, serviceSchema, localBusinessSchema } from "@/app/site/stretch-service/_lib/schema";
import Logo from "@/app/site/stretch-service/_components/Logo";

interface Props { params: Promise<{ state: string; city: string; service: string }> }

export const dynamicParams = true;
export const revalidate = 86400;

export async function generateStaticParams() { return [] }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { state: stateSlug, city: citySlug, service: serviceSlug } = await params;
  const state = findStateBySlug(stateSlug);
  const city = findCityBySlug(stateSlug, citySlug);
  const service = findServiceBySlug(serviceSlug);
  if (!state || !city || !service) return {};
  return {
    title: `${service.name} in ${city.name}, ${state.abbr} | $99/hr | Stretch Service`,
    description: `Professional ${service.name.toLowerCase()} in ${city.name}, ${state.name}. ${service.shortDesc} Mobile service — we come to you. $99/hr, 10% off weekly.`,
    alternates: { canonical: `${SITE_URL}${getCityServiceUrl(city, service)}` },
  };
}

export default async function CityServicePage({ params }: Props) {
  const { state: stateSlug, city: citySlug, service: serviceSlug } = await params;
  const state = findStateBySlug(stateSlug);
  const city = findCityBySlug(stateSlug, citySlug);
  const service = findServiceBySlug(serviceSlug);
  if (!state || !city || !service) notFound();

  const pageUrl = `${SITE_URL}${getCityServiceUrl(city, service)}`;
  const otherServices = services.filter((s) => s.slug !== serviceSlug);
  const cityParks = getParksByCity(citySlug);
  const siblCities = getCitiesByState(stateSlug).filter((c) => c.slug !== citySlug).slice(0, 12);

  const faqItems = [
    { question: `How much does ${service.name.toLowerCase()} cost in ${city.name}?`, answer: `${service.name} in ${city.name}, ${state.name} is $99 per 60-minute session. Weekly clients save 10% at $89/session. Our certified therapist brings all equipment to your ${city.name} location. No additional fees.` },
    { question: `What happens during a ${service.name.toLowerCase()} session in ${city.name}?`, answer: `${service.description} Your therapist arrives at your ${city.name} location with professional equipment, performs a mobility assessment, then delivers 60 minutes of ${service.name.toLowerCase()} customized to your specific needs. You remain clothed throughout.` },
    { question: `Is ${service.name.toLowerCase()} good for beginners in ${city.name}?`, answer: `Yes! ${service.name} is suitable for all fitness levels. Your therapist adjusts the intensity based on your comfort and flexibility level. Whether you are a complete beginner or an advanced athlete, the session is customized to your body.` },
    { question: `Can I combine ${service.name.toLowerCase()} with other stretch services?`, answer: `Absolutely. Many ${city.name} clients receive a combination of techniques within a single session. Your therapist may blend ${service.name.toLowerCase()} with other modalities based on your assessment. The session is always tailored to what your body needs most.` },
    { question: `How quickly can I book ${service.name.toLowerCase()} in ${city.name}?`, answer: `Same-day appointments are available in ${city.name}. Text or call ${SITE_PHONE} and most requests are confirmed within 30 minutes. We are available 7AM-10PM daily, 7 days a week.` },
    { question: `Who is ${service.name.toLowerCase()} ideal for?`, answer: `${service.name} is ideal for ${service.idealFor.join(", ").toLowerCase()}. Whether you are dealing with chronic pain, recovering from a workout, or looking to improve your overall flexibility, this service delivers measurable results.` },
    { question: `How is ${service.name.toLowerCase()} different from regular stretching?`, answer: `Professional ${service.name.toLowerCase()} performed by a certified therapist produces 2-3x greater flexibility gains than self-stretching. Your therapist uses precise hand placement, controlled pressure, and advanced neuromuscular techniques to achieve depths and positions you cannot reach on your own. The results are immediate and measurable.` },
    { question: `How often should I get ${service.name.toLowerCase()} in ${city.name}?`, answer: `For optimal results, we recommend weekly ${service.name.toLowerCase()} sessions in ${city.name}. Clients who commit to four or more consecutive weekly sessions see 3x greater improvement than single-session clients. Weekly clients also save 10% at $89/session.` },
    { question: `Can I get ${service.name.toLowerCase()} at a park in ${city.name}?`, answer: `Yes! We offer outdoor ${service.name.toLowerCase()} sessions at ${cityParks.length > 0 ? `parks including ${cityParks.slice(0, 2).map((p) => p.name).join(" and ")}` : `local parks in ${city.name}`}. Our therapists bring mats and all equipment for a professional outdoor session.` },
    { question: `Is ${service.name.toLowerCase()} covered by insurance in ${city.name}?`, answer: `While most standard health insurance plans do not directly cover stretch service sessions, many HSA and FSA accounts can be used. Some ${city.name} clients also receive reimbursement through employer wellness programs. We provide detailed receipts for your records.` },
    { question: `What should I wear for ${service.name.toLowerCase()} in ${city.name}?`, answer: `Comfortable, stretchy clothing — athletic wear, yoga pants, shorts, or sweatpants. Avoid jeans or restrictive clothing. Most ${service.name.toLowerCase()} is done barefoot or in socks. Our therapist will guide you through everything when they arrive at your ${city.name} location.` },
    { question: `Do you offer ${service.name.toLowerCase()} for corporate teams in ${city.name}?`, answer: `Yes! We provide on-site corporate ${service.name.toLowerCase()} programs for ${city.name} companies. We set up in your office and deliver back-to-back sessions for your team. Contact us at ${SITE_PHONE} for corporate pricing and scheduling.` },
  ];

  return (
    <>
      <JsonLd data={webPageSchema(`${service.name} in ${city.name}, ${state.abbr}`, `${service.name} stretch service in ${city.name}, ${state.name}. $99/hr.`, pageUrl)} />
      <JsonLd data={breadcrumbSchema([
        { name: "Home", url: SITE_URL },
        { name: "Locations", url: `${SITE_URL}/locations` },
        { name: state.name, url: `${SITE_URL}${getStateUrl(state)}` },
        { name: city.name, url: `${SITE_URL}${getCityUrl(city)}` },
        { name: service.name, url: pageUrl },
      ])} />
      <JsonLd data={serviceSchema(service.name, service.description, pageUrl, city.name)} />
      <JsonLd data={localBusinessSchema(city.name, state.name)} />
      <JsonLd data={faqSchema(faqItems)} />

      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 pt-36 pb-16 sm:pt-44 sm:pb-24">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">
            <Link href="/locations" className="hover:text-white">Locations</Link>{" / "}
            <Link href={`/locations/${stateSlug}`} className="hover:text-white">{state.name}</Link>{" / "}
            <Link href={`/locations/${stateSlug}/${citySlug}`} className="hover:text-white">{city.name}</Link>
          </p>
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">{city.name}, {state.abbr} | $99/hr Mobile Stretch Service</p>
          <h1 className="text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl font-heading">
            {service.name} in <span className="text-teal-200">{city.name}, {state.abbr}</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/80">Professional {service.name.toLowerCase()} in {city.name}, {state.abbr}. {service.tagline}. Mobile stretch service to your door. Certified therapists. Same-day available. $99/hr, 10% off weekly.</p>
          <p className="mx-auto mt-2 text-4xl font-bold text-white sm:text-5xl font-heading">$99 PER HOUR</p>
          <p className="mt-2 text-xl font-bold text-teal-100 font-heading">10% OFF WEEKLY — $89/SESSION</p>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/80">
            {service.tagline}. Professional mobile {service.name.toLowerCase()} delivered to your home, office, hotel, or favorite park in {city.name}, {state.name}. Same-day available 7AM-10PM.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a href={SITE_SMS_LINK}><span className="inline-block rounded-lg bg-white px-8 py-3.5 text-base font-semibold text-teal-700 shadow-lg transition-colors hover:bg-teal-50 font-cta">Text {SITE_PHONE} — Book Now</span></a>
            <a href={SITE_PHONE_LINK}><span className="inline-block rounded-lg border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:border-white/60 font-cta">Call {SITE_PHONE}</span></a>
          </div>
        </div>
      </section>

      {/* ═══ ABOUT THIS SERVICE IN THIS CITY ═══ */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 font-heading">{service.name} Stretch Service in {city.name}, {state.name}</h2>
          <div className="mt-6 space-y-5 text-base leading-relaxed text-slate-700">
            <p>
              {service.description} In {city.name}, {state.name}, our certified stretch therapists deliver professional {service.name.toLowerCase()} sessions directly to your location for $99 per hour. Weekly clients save 10% at $89 per session. Whether you are at your home, office, hotel, or a local park, we bring all professional equipment and transform any space into a stretching studio.
            </p>
            <p>
              {city.name} residents and visitors benefit enormously from {service.name.toLowerCase()}. The city is known for {city.vibe}, and whether you are a desk worker dealing with chronic tension, a tourist whose body is destroyed from sightseeing, or an athlete training at peak intensity — {service.name.toLowerCase()} addresses your specific needs with proven, science-backed techniques. Research shows that professional therapist-assisted stretching produces 2-3x greater flexibility gains than any form of self-stretching.
            </p>
            <p>
              Every {service.name.toLowerCase()} session in {city.name} begins with a comprehensive mobility assessment. Your therapist evaluates your posture, identifies restrictions, tests your range of motion in key joints, and discusses your pain points and goals. They then develop a personalized {service.name.toLowerCase()} protocol targeting your specific problem areas. You remain fully clothed and comfortable throughout the entire session. The result? Immediate relief, improved mobility, and a body that feels years younger.
            </p>
            <p>
              What makes our {service.name.toLowerCase()} in {city.name} different from a studio or gym class? Three things: it is one-on-one (your session is 100% about you), it is mobile (no commute, no changing at a gym), and it is delivered by a certified specialist (stretching is all our therapists do, all day, every day). This singular focus is why our clients consistently report better results than any alternative.
            </p>
            <p>
              The demand for professional {service.name.toLowerCase()} in {city.name} has grown dramatically as more people discover the limitations of self-stretching, yoga classes, and generic fitness programs. When a certified therapist performs {service.name.toLowerCase()} on your body, they can apply precise, sustained force at the exact angle needed to lengthen specific muscle fibers and fascial tissue. They can work around your body&apos;s protective stretch reflex using advanced neuromuscular techniques. And they can target areas of restriction that you did not even know you had. This level of precision is simply impossible to achieve on your own — no matter how many stretching videos you watch or yoga classes you attend.
            </p>
            <p>
              {city.name} is a city that demands a lot from your body. The commutes, the desk work, the active lifestyle, the weekend adventures — all of it creates accumulated tension, restricted mobility, and chronic pain patterns. Regular {service.name.toLowerCase()} sessions are the most effective way to reverse this damage and keep your body functioning at its best. Our {city.name} clients who commit to weekly sessions report 40% improvement in range of motion, 60% reduction in chronic pain, and significantly better quality of life. At $99 per session — $89 for weekly clients — it is one of the most cost-effective wellness investments you can make in {city.name}.
            </p>
          </div>
        </div>
      </section>

      {/* ═══ THE SCIENCE BEHIND THIS SERVICE ═══ */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 font-heading">The Science Behind {service.name}</h2>
          <div className="mt-6 space-y-5 text-base leading-relaxed text-slate-700">
            <p>
              {service.name} is not just a feel-good treatment — it is backed by decades of peer-reviewed research in sports science, physical therapy, and rehabilitation medicine. Understanding the physiological mechanisms behind {service.name.toLowerCase()} explains why it produces such dramatic results compared to self-stretching or general exercise.
            </p>
            <p>
              When a certified therapist performs {service.name.toLowerCase()}, they work with your body&apos;s proprioceptive system — the network of sensory receptors in your muscles, tendons, and joints that detect changes in length, tension, and position. By strategically activating these receptors through precise hand placement and controlled force application, your therapist can override your body&apos;s natural protective reflexes and achieve significantly deeper, more effective stretches. This is the fundamental reason why therapist-assisted {service.name.toLowerCase()} produces 2-3x greater flexibility gains than any form of self-stretching.
            </p>
            <p>
              The benefits of {service.name.toLowerCase()} extend far beyond flexibility. Professional stretching activates the parasympathetic nervous system, reducing cortisol levels and promoting deep relaxation. It improves blood circulation and lymphatic flow, accelerating the removal of metabolic waste products from muscle tissue. It stimulates the production of synovial fluid in joints, improving lubrication and reducing stiffness. And it promotes fascial remodeling — the gradual restructuring of the connective tissue that wraps around every muscle, bone, and organ in your body.
            </p>
            <p>
              For {city.name} residents and visitors, the science translates to practical, immediate results. After your first {service.name.toLowerCase()} session, you will notice improved range of motion, reduced pain, and a profound sense of physical relaxation. After four consecutive weekly sessions, you will see measurable improvements in flexibility, posture, and chronic pain levels. The science is clear: professional {service.name.toLowerCase()} works, and it works dramatically better than any alternative.
            </p>
          </div>
        </div>
      </section>

      {/* ═══ WHAT A SESSION LOOKS LIKE ═══ */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 font-heading">What a {service.name} Session Looks Like in {city.name}</h2>
          <div className="mt-6 space-y-5 text-base leading-relaxed text-slate-700">
            <p>
              You text or call {SITE_PHONE} with your preferred date, time, and {city.name} location. We confirm within 30 minutes and assign a certified therapist in the {city.name} area. Same-day appointments are available — many clients text us in the afternoon and have a therapist at their door by early evening.
            </p>
            <p>
              Your therapist arrives at your {city.name} location with a professional massage table, mats, straps, resistance bands, and all necessary equipment. They set up in under 5 minutes — your living room, bedroom, office, hotel room, or a flat section of a local {city.name} park works perfectly. You need about 6x8 feet of clear floor space.
            </p>
            <p>
              The session begins with a 5-10 minute mobility assessment. Your therapist evaluates your posture, tests your range of motion in key joints, identifies areas of restriction and pain, and discusses your goals. Based on this assessment, they design a personalized {service.name.toLowerCase()} protocol targeting your specific needs.
            </p>
            <p>
              For the next 50-55 minutes, your therapist guides your body through a series of {service.name.toLowerCase()} positions and techniques. You remain fully clothed and comfortable on the massage table or mat. Your therapist communicates throughout, checking your comfort level and adjusting intensity. The experience is deeply relaxing for most clients — many describe it as the most peaceful 60 minutes of their week.
            </p>
            <p>
              After the session, your therapist provides 2-3 specific stretches or exercises you can do between appointments to maintain your progress. They also discuss scheduling for your next session — weekly clients receive 10% off at $89/session, priority scheduling, and same-therapist continuity for consistent progress tracking.
            </p>
          </div>
        </div>
      </section>

      {/* ═══ WHO BENEFITS ═══ */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 font-heading">Who Benefits from {service.name} in {city.name}?</h2>
          <div className="mt-6 space-y-5 text-base leading-relaxed text-slate-700">
            {clientTypes.map((ct) => (
              <p key={ct.slug}>
                <strong>{ct.name}:</strong> {service.name} is particularly effective for {ct.name.toLowerCase()} in {city.name}. {ct.shortDesc} Our therapists use {service.name.toLowerCase()} techniques to target the specific pain points that affect this group: {ct.painPoints.slice(0, 3).join(", ").toLowerCase()}. {city.name} {ct.name.toLowerCase()} who book weekly {service.name.toLowerCase()} sessions report the most significant, lasting improvement in flexibility, pain reduction, and quality of life.
              </p>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ THIS SERVICE VS ALTERNATIVES ═══ */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 font-heading">{service.name} vs. Other Treatments in {city.name}</h2>
          <div className="mt-6 space-y-5 text-base leading-relaxed text-slate-700">
            <p>
              {city.name} residents have many wellness options — massage, chiropractic, yoga, physical therapy, personal training. How does professional {service.name.toLowerCase()} compare? Here is an honest breakdown.
            </p>
            <p>
              <strong>{service.name} vs. massage:</strong> Massage uses compression to address soft tissue tension. {service.name} uses elongation and neuromuscular techniques to improve flexibility and range of motion. While massage provides temporary relaxation, {service.name.toLowerCase()} produces lasting structural changes in muscle length and joint mobility. At $99/hr, our {city.name} {service.name.toLowerCase()} is also more affordable than most massage therapists.
            </p>
            <p>
              <strong>{service.name} vs. yoga:</strong> Yoga is a group class limited to self-stretching. {service.name} is one-on-one, hands-on, and produces 2-3x greater flexibility gains per session. For {city.name} residents who are too stiff, injured, or busy for regular yoga classes, professional {service.name.toLowerCase()} is the superior alternative.
            </p>
            <p>
              <strong>{service.name} vs. physical therapy:</strong> PT requires a prescription and costs $200+ per session with insurance battles. {service.name} in {city.name} is $99/hr, no prescription needed, and we come to you. For ongoing flexibility improvement, pain management, and maintenance of PT gains, {service.name.toLowerCase()} is far more accessible.
            </p>
            <p>
              <strong>{service.name} vs. self-stretching:</strong> Research shows that therapist-assisted {service.name.toLowerCase()} produces 2-3x greater flexibility gains than any form of self-stretching. Your therapist can apply precise force at angles you cannot reach, work around your stretch reflex using advanced techniques, and target areas of restriction you did not know you had. There is simply no comparison.
            </p>
          </div>
        </div>
      </section>

      {/* ═══ FEATURES ═══ */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-2xl font-bold text-slate-900 font-heading">What&apos;s Included in {service.name} in {city.name}</h2>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {service.features.map((feat) => (
              <div key={feat} className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-4">
                <span className="mt-0.5 text-teal-600 font-bold">&#10003;</span>
                <p className="text-sm text-slate-700">{feat}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ IDEAL FOR ═══ */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-center text-2xl font-bold text-slate-900 font-heading">{service.name} in {city.name} Is Ideal For</h2>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {service.idealFor.map((client) => (
              <span key={client} className="rounded-full bg-teal-50 px-4 py-2 text-sm font-medium text-teal-700 border border-teal-200/60">{client}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ THINGS TO DO ═══ */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 font-heading">Things to Do in {city.name} — Then Book {service.name}</h2>
          <div className="mt-6 space-y-4 text-base leading-relaxed text-slate-700">
            <p>
              {city.name} is packed with incredible things to do. {city.landmarks.length > 0 ? `Visit ${city.landmarks.slice(0, 3).join(", ")} and more.` : "Explore the local attractions, restaurants, parks, and cultural sites."} After a full day of adventure, your muscles are tight, your back is aching, and your body needs professional attention. That is the perfect time to book a {service.name.toLowerCase()} session.
            </p>
            <p>
              Our therapists come to your {city.name} hotel, Airbnb, or home within hours of your text. They set up in minutes and deliver 60 minutes of targeted {service.name.toLowerCase()} that will leave you feeling recovered, refreshed, and ready for tomorrow. It is the best thing you can do for your body after a day of things to do in {city.name}.
            </p>
          </div>
        </div>
      </section>

      {/* ═══ PARKS ═══ */}
      {cityParks.length > 0 && (
        <section className="bg-section-white py-16">
          <div className="mx-auto max-w-4xl px-6">
            <h2 className="text-2xl font-bold text-slate-900 font-heading">{service.name} at {city.name} Parks</h2>
            <p className="mt-3 text-base text-slate-600">Book an outdoor {service.name.toLowerCase()} session at any of these {city.name} parks. Our therapists bring mats and all equipment for a professional outdoor stretch service session.</p>
            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {cityParks.map((p) => (
                <Link key={p.slug} href={getParkUrl(p)}>
                  <div className="group rounded-lg border border-slate-200 bg-white p-4 transition-all hover:border-teal-400 hover:shadow-md">
                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-teal-600 font-heading">{p.name}</h3>
                    <p className="mt-1 text-xs text-slate-500">{"★".repeat(p.touristRating)} | {p.bestSpot}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══ OTHER SERVICES IN CITY ═══ */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-2xl font-bold text-slate-900 font-heading">Other Stretch Services in {city.name}</h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-slate-600">All {services.length} professional stretch service types are available in {city.name}. Explore other options to find the perfect match for your body.</p>
          <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {otherServices.map((s) => (
              <Link key={s.slug} href={getCityServiceUrl(city, s)}>
                <div className="group rounded-lg border border-slate-200 bg-white p-4 transition-all hover:border-teal-400 hover:shadow-md">
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-teal-600 font-heading">{s.name}</h3>
                  <p className="mt-1 text-xs text-slate-500 line-clamp-1">{s.tagline}</p>
                  <p className="mt-2 text-xs text-teal-600 font-medium">$99/hr in {city.name} &rarr;</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ OTHER CITIES FOR THIS SERVICE ═══ */}
      {siblCities.length > 0 && (
        <section className="bg-section-white py-16">
          <div className="mx-auto max-w-5xl px-6">
            <h2 className="text-center text-2xl font-bold text-slate-900 font-heading">{service.name} in Other {state.name} Cities</h2>
            <p className="mx-auto mt-3 max-w-2xl text-center text-slate-600">{service.name} is available in every {state.name} city. Same $99/hr pricing, same certified therapists, same professional equipment.</p>
            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {siblCities.map((c) => (
                <Link key={c.slug} href={getCityServiceUrl(c, service)}>
                  <div className="group rounded-lg border border-slate-200 bg-white p-3 text-center transition-all hover:border-teal-400 hover:shadow-md">
                    <p className="text-sm font-bold text-slate-900 group-hover:text-teal-600 font-heading">{c.name}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{service.name}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══ PRICING ═══ */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-center text-2xl font-bold text-slate-900 font-heading">{service.name} Pricing in {city.name}</h2>
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="rounded-xl border-2 border-slate-200 bg-white p-8 text-center">
              <p className="text-sm font-semibold uppercase tracking-wider text-slate-500 font-cta">Single Session</p>
              <p className="mt-4 text-5xl font-bold text-teal-700 font-heading">$99</p>
              <p className="mt-1 text-sm text-slate-500">per 60-minute session</p>
              <ul className="mt-6 space-y-2 text-left text-sm text-slate-600">
                <li>&#10003; {service.name} with certified therapist</li>
                <li>&#10003; Full-body mobility assessment</li>
                <li>&#10003; All equipment included</li>
                <li>&#10003; Same-day available in {city.name}</li>
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
                <li>&#10003; No contracts — cancel anytime</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FAQ ═══ */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 font-heading">FAQ: {service.name} in {city.name}, {state.abbr}</h2>
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

      {/* ═══ CTA ═══ */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 py-16">
        <div className="absolute inset-0 grid-bg opacity-20" />
        <div className="relative mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-2xl font-bold text-white font-heading">Book {service.name} in {city.name} — $99/hr</h2>
          <p className="mt-4 text-lg text-white/80">{service.tagline}. Mobile service in {city.name}, {state.name}. Same-day available. 10% off weekly.</p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a href={SITE_SMS_LINK}><span className="inline-block rounded-lg bg-white px-8 py-3.5 text-base font-semibold text-teal-700 shadow-lg transition-colors hover:bg-teal-50 font-cta">Text {SITE_PHONE}</span></a>
            <a href={SITE_PHONE_LINK}><span className="inline-block rounded-lg border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:border-white/60 font-cta">Call {SITE_PHONE}</span></a>
          </div>
          <p className="mt-4 text-sm text-teal-200">$99/hr single | $89/hr weekly (10% off) | 7AM-10PM daily</p>
        </div>
      </section>
    </>
  );
}
