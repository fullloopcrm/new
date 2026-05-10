// @ts-nocheck
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import {
  findStateBySlug,
  findCityBySlug,
  getCitiesByState,
  getParksByCity,
  getParksByState,
  getCityUrl,
  getCityServiceUrl,
  getStateUrl,
  getParkUrl,
  getServiceUrl,
  services,
  clientTypes,
  parks,
  SITE_URL,
  SITE_SMS_LINK,
  SITE_PHONE,
  SITE_PHONE_LINK,
} from "@/app/site/stretch-service/_lib/siteData";
import { JsonLd, webPageSchema, breadcrumbSchema, faqSchema, serviceSchema, localBusinessSchema } from "@/app/site/stretch-service/_lib/schema";
import Logo from "@/app/site/stretch-service/_components/Logo";

interface Props { params: Promise<{ state: string; city: string }> }

export const dynamicParams = true;
export const revalidate = 86400;

export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { state: stateSlug, city: citySlug } = await params;
  const state = findStateBySlug(stateSlug);
  const city = findCityBySlug(stateSlug, citySlug);
  if (!state || !city) return {};
  return {
    title: `Stretch Service in ${city.name}, ${state.abbr} | $99/hr Mobile | Stretch Service`,
    description: `Professional mobile stretch service in ${city.name}, ${state.name}. Certified therapists come to your home, office, or hotel. $99/hr, 10% off weekly. ${city.description}`,
    alternates: { canonical: `${SITE_URL}${getCityUrl(city)}` },
  };
}

export default async function CityPage({ params }: Props) {
  const { state: stateSlug, city: citySlug } = await params;
  const state = findStateBySlug(stateSlug);
  const city = findCityBySlug(stateSlug, citySlug);
  if (!state || !city) notFound();

  const pageUrl = `${SITE_URL}${getCityUrl(city)}`;
  const cityParks = getParksByCity(citySlug);
  const stateParks = getParksByState(stateSlug).filter((p) => p.citySlug !== citySlug).slice(0, 6);
  const siblingCities = getCitiesByState(stateSlug).filter((c) => c.slug !== citySlug).slice(0, 12);

  const faqItems = [
    { question: `How much does stretch service cost in ${city.name}, ${state.abbr}?`, answer: `Our professional mobile stretch service in ${city.name} is $99 per 60-minute session. Weekly clients save 10% at just $89/session. All sessions include a full-body mobility assessment, professional equipment, and a personalized treatment plan delivered to your ${city.name} location.` },
    { question: `Can I book a same-day stretch service in ${city.name}?`, answer: `Yes! We offer same-day stretch service appointments in ${city.name}, ${state.name}. Text or call ${SITE_PHONE} to check availability. Most same-day requests are confirmed within 30 minutes. Available 7AM-10PM daily.` },
    { question: `What stretch services are available in ${city.name}?`, answer: `All ${services.length} professional stretch service types are available in ${city.name}, including assisted stretching, PNF stretching, myofascial release, dynamic stretching, passive stretching, and more. Each session is customized to your specific needs and goals.` },
    { question: `Do you come to hotels in ${city.name}?`, answer: `Absolutely! We come to any hotel, Airbnb, or vacation rental in ${city.name}. Perfect for tourists after a day of exploring ${city.landmarks.length > 0 ? city.landmarks.slice(0, 2).join(" and ") : "the city"}. We also meet clients at local parks for outdoor sessions.` },
    { question: `What are the best things to do in ${city.name} before getting stretched?`, answer: `${city.name} is known for ${city.vibe}. Popular things to do include visiting ${city.landmarks.length > 0 ? city.landmarks.slice(0, 3).join(", ") : "local attractions"}. After a full day of exploring, book a stretch service session to recover. Your body will thank you!` },
    { question: `Are you hiring stretch therapists in ${city.name}?`, answer: `Yes! We are actively hiring certified stretch therapists in ${city.name}, ${state.name}. Starting pay is $50/hour with flexible scheduling, fast payment within 30 minutes of each session, and an established client base. Visit stretchjobs.com to apply.` },
    { question: `How do I prepare for a stretch service session in ${city.name}?`, answer: `Wear comfortable, stretchy clothing (athletic wear, yoga pants, shorts). You need about 6x8 feet of clear floor space. Our therapist brings all equipment including a massage table, mats, and straps. No preparation needed — just be ready to feel amazing.` },
    { question: `Is stretch service in ${city.name} good for athletes?`, answer: `Professional stretch service is essential for athletes in ${city.name}. Our PNF and dynamic stretching techniques are used by professional athletes worldwide. Pre-workout stretching improves performance 5-10%, while post-workout recovery stretching reduces soreness and accelerates healing.` },
    { question: `How often should I get stretch service in ${city.name}?`, answer: `For optimal results, we recommend weekly stretch service sessions in ${city.name}. Clients who commit to four or more consecutive weekly sessions see 3x greater flexibility improvement than single-session clients. Weekly clients also save 10% at $89/session with priority scheduling and same-therapist continuity.` },
    { question: `Is stretch service in ${city.name} safe for seniors?`, answer: `Absolutely! Our gentle stretch service program is specifically designed for seniors in ${city.name}. We use slow, controlled movements with extra care, chair-assisted options, and arthritis-friendly techniques. Regular sessions help maintain mobility, prevent falls, and support independent living.` },
    { question: `Can stretch service in ${city.name} help with chronic back pain?`, answer: `Yes! Our stretch service in ${city.name} is highly effective for chronic pain conditions including lower back pain, neck tension, sciatica, and hip pain. We use targeted PNF stretching and myofascial release techniques to address root causes. Many clients report significant relief after their very first session.` },
    { question: `Do you offer corporate stretch service in ${city.name}?`, answer: `Yes! We provide on-site corporate stretch service programs for ${city.name} companies. We set up in your office and stretch employees in back-to-back sessions. Reduces workplace injuries, boosts productivity, and improves team morale. Visit our corporate wellness page for details.` },
  ];

  return (
    <>
      <JsonLd data={webPageSchema(`Stretch Service in ${city.name}, ${state.abbr}`, `Mobile stretch service in ${city.name}, ${state.name}. $99/hr.`, pageUrl)} />
      <JsonLd data={breadcrumbSchema([
        { name: "Home", url: SITE_URL },
        { name: "Locations", url: `${SITE_URL}/locations` },
        { name: state.name, url: `${SITE_URL}${getStateUrl(state)}` },
        { name: city.name, url: pageUrl },
      ])} />
      <JsonLd data={serviceSchema("Assisted Stretching", `Professional mobile stretch service in ${city.name}, ${state.name}.`, pageUrl, city.name)} />
      <JsonLd data={localBusinessSchema(city.name, state.name)} />
      <JsonLd data={faqSchema(faqItems)} />

      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 pt-36 pb-16 sm:pt-44 sm:pb-24">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">
            <Link href="/locations" className="hover:text-white">Locations</Link>{" / "}
            <Link href={`/locations/${stateSlug}`} className="hover:text-white">{state.name}</Link>{" / "}{city.name}
          </p>
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">Mobile Stretch Service — {city.name}, {state.abbr} | $99/hr | 7AM-10PM</p>
          <h1 className="text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl font-heading">
            Stretch Service in <span className="text-teal-200">{city.name}, {state.abbr}</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/80">{city.description} Professional assisted stretch service in {city.name}. Certified therapists, {services.length} stretch types, same-day appointments. Things to do in {city.name} — get stretched at iconic locations. $99/hr.</p>
          <p className="mx-auto mt-2 text-4xl font-bold text-white sm:text-5xl font-heading">$99 PER HOUR</p>
          <p className="mt-2 text-xl font-bold text-teal-100 font-heading">10% OFF WEEKLY — $89/SESSION</p>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">
            Professional mobile stretch service delivered to your home, office, hotel, or favorite park in {city.name}, {state.name}. {city.description} After a day exploring {city.name}, your body deserves a professional stretch. Our certified therapists come to you.
          </p>
          <div className="mx-auto mt-6 grid max-w-xl grid-cols-3 gap-4">
            <div className="rounded-xl bg-white/10 p-4 backdrop-blur-sm">
              <p className="text-2xl font-bold text-white">$99/hr</p>
              <p className="text-xs text-teal-200">Per Session</p>
            </div>
            <div className="rounded-xl bg-white/10 p-4 backdrop-blur-sm">
              <p className="text-2xl font-bold text-white">7-10PM</p>
              <p className="text-xs text-teal-200">Daily Hours</p>
            </div>
            <div className="rounded-xl bg-white/10 p-4 backdrop-blur-sm">
              <p className="text-2xl font-bold text-white">Same Day</p>
              <p className="text-xs text-teal-200">Available</p>
            </div>
          </div>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a href={SITE_SMS_LINK}><span className="inline-block rounded-lg bg-white px-8 py-3.5 text-base font-semibold text-teal-700 shadow-lg transition-colors hover:bg-teal-50 font-cta">Text {SITE_PHONE} — Book in {city.name}</span></a>
            <a href={SITE_PHONE_LINK}><span className="inline-block rounded-lg border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:border-white/60 font-cta">Call {SITE_PHONE}</span></a>
          </div>
        </div>
      </section>

      {/* ═══ ABOUT THIS CITY ═══ */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 font-heading">Mobile Stretch Service in {city.name}, {state.name}</h2>
          <div className="mt-6 space-y-5 text-base leading-relaxed text-slate-700">
            <p>
              {city.name}, {state.name} is known for {city.vibe}. Whether you are a local resident dealing with the daily grind, a desk worker suffering from chronic back and neck pain, an athlete training for your next event, or a tourist exploring everything {city.name} has to offer — your body needs professional stretch service. Stretch Service brings certified stretch therapists directly to your {city.name} location for just $99 per hour. Weekly clients save 10% at $89 per session.
            </p>
            <p>
              Our mobile stretch service in {city.name} eliminates every barrier to getting the stretching therapy your body needs. No commute to a studio. No awkward group classes. No waiting for equipment. Our therapist arrives at your door with a professional massage table, mats, straps, resistance bands, and every tool needed to deliver a world-class <Link href={getServiceUrl(services[0])} className="text-teal-600 underline hover:text-teal-700">assisted stretch service</Link> session. Your living room, office, hotel room, or a local {city.name} park becomes your private stretching studio.
            </p>
            <p>
              Every stretch service session in {city.name} begins with a comprehensive mobility assessment. Your therapist evaluates your posture, identifies areas of restriction, tests your range of motion, and discusses your specific pain points and goals. From there, they deliver 60 minutes of hands-on stretching therapy using advanced techniques like <Link href={getServiceUrl(services[1])} className="text-teal-600 underline hover:text-teal-700">PNF stretching</Link>, <Link href={getServiceUrl(services[6])} className="text-teal-600 underline hover:text-teal-700">myofascial release</Link>, <Link href={getServiceUrl(services[3])} className="text-teal-600 underline hover:text-teal-700">dynamic stretching</Link>, and more. The session is 100% customized to your body.
            </p>
            <p>
              {city.name} residents and visitors love our stretch service for its convenience, professionalism, and immediate results. After your first session, you will feel an immediate improvement in flexibility, a reduction in pain and tension, and a sense of deep relaxation. Consistent weekly sessions produce measurable gains — our data shows clients who commit to four consecutive weekly sessions see 3x greater flexibility improvement than single-session clients.
            </p>
            <p>
              Life in {city.name} is demanding. The city&apos;s residents juggle careers, commutes, fitness routines, family responsibilities, and an active social scene. All of this takes a physical toll — tight muscles, aching joints, chronic tension, and accumulated stress. Professional stretch service is the most efficient way to counteract these daily demands. In just 60 minutes, our therapists can undo days or weeks of accumulated tension and restore your body to a state of balanced, pain-free mobility. That is why {city.name} has become one of our fastest-growing markets for mobile stretch service.
            </p>
            <p>
              The industries that drive {city.name}&apos;s economy also drive demand for stretch service. Office workers and professionals in {city.name} spend long hours at desks, developing the classic &quot;desk worker&quot; pain pattern: tight hip flexors, rounded shoulders, compressed lumbar spine, and chronic neck tension. Healthcare workers, teachers, retail employees, and service industry professionals in {city.name} spend hours on their feet, developing tight calves, sore feet, and lower back fatigue. Construction workers, tradespeople, and manual laborers develop chronic muscle tension and restricted range of motion from repetitive physical work. Our stretch service addresses all of these patterns with targeted, professional stretching therapy.
            </p>
          </div>
        </div>
      </section>

      {/* ═══ THINGS TO DO + GET STRETCHED ═══ */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 font-heading">Things to Do in {city.name} — Then Get Stretched</h2>
          <div className="mt-6 space-y-5 text-base leading-relaxed text-slate-700">
            <p>
              {city.name} is a city that keeps you moving. {city.landmarks.length > 0 ? `Visitors flock to ${city.landmarks.join(", ")} and more.` : `The city is packed with incredible attractions, restaurants, and experiences.`} Whether you are walking 20,000 steps exploring the city&apos;s top attractions, hiking local trails, standing in lines at popular tourist spots, or dancing the night away — your body is going to feel it by the end of the day.
            </p>
            <p>
              That is exactly when you need Stretch Service. After a full day of things to do in {city.name}, text {SITE_PHONE} and we will send a certified stretch therapist to your hotel, Airbnb, or any location. Our <Link href="/hotel-stretching" className="text-teal-600 underline hover:text-teal-700">hotel stretch service</Link> is specifically designed for travelers. We bring everything — you just relax and let us work out the knots, tension, and soreness from your day of adventure.
            </p>
            <p>
              For locals in {city.name}, things to do on the weekend often involve physical activity — running, hiking, cycling, gym workouts, sports leagues, and outdoor adventures. A professional stretch service session before or after these activities will dramatically improve your performance, reduce your injury risk, and accelerate your recovery. Think of it as the best investment you can make in your active {city.name} lifestyle.
            </p>
            <p>
              The best part about booking stretch service after a day of things to do in {city.name}? You do not have to go anywhere. While other recovery options require you to drive to a spa, find parking, and sit in a waiting room — our therapist comes directly to you. Text {SITE_PHONE} from the comfort of your {city.name} home, hotel, or Airbnb, and a certified stretch therapist will be at your door within 1-2 hours. After 60 minutes of professional stretching, you will feel like a completely different person. Your legs will work again. Your back will stop aching. You will sleep better. And tomorrow, you will be ready to do it all over again.
            </p>
            <p>
              {city.name} is also home to incredible restaurants, craft breweries, live music venues, and nightlife. After a long evening out — standing, dancing, walking between venues — your body can feel as wrecked as after a day of sightseeing. Our evening stretch service appointments (available until 10PM) are perfect for recovering from a night of things to do in {city.name}. Book a late session and wake up feeling refreshed instead of stiff and sore.
            </p>
          </div>
          {city.landmarks.length > 0 && (
            <div className="mt-8">
              <h3 className="text-lg font-bold text-slate-900 font-heading">{city.name} Landmarks &amp; Attractions</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {city.landmarks.map((l) => (
                  <span key={l} className="rounded-full bg-white px-3 py-1 text-xs font-medium text-teal-700 border border-teal-200/60">{l}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ═══ WHO USES STRETCH SERVICE IN THIS CITY ═══ */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 font-heading">Who Uses Stretch Service in {city.name}?</h2>
          <div className="mt-6 space-y-5 text-base leading-relaxed text-slate-700">
            {clientTypes.map((ct) => (
              <p key={ct.slug}>
                <strong>{ct.name}:</strong> {ct.shortDesc} In {city.name}, {state.name}, this client type makes up a significant portion of our stretch service bookings. The most common pain points we treat include {ct.painPoints.slice(0, 4).join(", ").toLowerCase()}. Our therapists use targeted techniques including <Link href={getServiceUrl(services[1])} className="text-teal-600 underline hover:text-teal-700">PNF stretching</Link> and <Link href={getServiceUrl(services[6])} className="text-teal-600 underline hover:text-teal-700">myofascial release</Link> to address each of these issues specifically. {city.name} {ct.name.toLowerCase()} who book weekly stretch service sessions report the most dramatic, lasting results.
              </p>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ HOW IT WORKS IN THIS CITY ═══ */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 font-heading">How Mobile Stretch Service Works in {city.name}</h2>
          <div className="mt-6 space-y-5 text-base leading-relaxed text-slate-700">
            <p>
              Booking a stretch service session in {city.name} takes about 60 seconds. Text or call {SITE_PHONE} with your preferred date, time, and location. We confirm within 30 minutes and assign a certified stretch therapist in the {city.name} area. Same-day appointments are available — many {city.name} clients text us at 3pm and have a therapist at their door by 5pm. We are available 7AM to 10PM daily, 7 days a week.
            </p>
            <p>
              Your therapist arrives at your {city.name} location — home, office, hotel room, or park — with a professional massage table, mats, straps, resistance bands, and all necessary equipment. They set up in under 5 minutes. The session begins with a comprehensive mobility assessment, followed by 60 minutes of customized, hands-on stretching therapy. You remain fully clothed and comfortable throughout. When the session ends, your therapist provides personalized recommendations for maintaining your progress between appointments.
            </p>
            <p>
              Whether you live in {city.name}&apos;s downtown core, the suburbs, or any surrounding neighborhood, our mobile stretch service reaches you. We cover all of {city.name} and the surrounding {state.name} metro area. No commute, no parking, no waiting rooms — just world-class stretch service delivered to your door.
            </p>
          </div>
        </div>
      </section>

      {/* ═══ STRETCH SERVICE VS ALTERNATIVES ═══ */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 font-heading">Stretch Service vs. Other Wellness Options in {city.name}</h2>
          <div className="mt-6 space-y-5 text-base leading-relaxed text-slate-700">
            <p>
              {city.name} has no shortage of wellness options — massage therapists, chiropractors, yoga studios, physical therapy clinics, and personal trainers. So why choose stretch service? Because professional, one-on-one stretch service delivers something none of these alternatives can: targeted, therapist-assisted stretching that produces 2-3x greater flexibility gains than self-stretching, with immediate pain relief and lasting structural improvements.
            </p>
            <p>
              <strong>Stretch service vs. massage in {city.name}:</strong> Massage uses compression to address soft tissue tension. Stretch service uses elongation and neuromuscular techniques to improve flexibility and range of motion. While massage provides temporary relaxation, stretch service produces lasting changes in how your body moves. Many {city.name} clients combine both — but if you choose one, stretch service delivers more functional improvement.
            </p>
            <p>
              <strong>Stretch service vs. yoga in {city.name}:</strong> Yoga is a group class where you are limited to self-stretching. Stretch service is one-on-one, hands-on, and 100% customized to your body. Our PNF techniques achieve stretches and depths that are physically impossible in a yoga class. For people too stiff, injured, or busy for regular yoga classes in {city.name}, stretch service is the ideal alternative.
            </p>
            <p>
              <strong>Stretch service vs. chiropractic in {city.name}:</strong> Chiropractic focuses on spinal alignment through adjustments. Stretch service focuses on the muscles, tendons, and fascia that support your joints. In many cases, chronic misalignment is caused by muscle imbalances — the exact issue stretch service addresses. {city.name} clients who combine chiropractic with weekly stretch service report that their adjustments hold longer and their overall pain is lower.
            </p>
            <p>
              <strong>Stretch service vs. physical therapy in {city.name}:</strong> Physical therapy requires a prescription, involves insurance battles, and costs $200+ per session. Stretch service is $99/hr, no prescription needed, and we come to you. For maintenance, flexibility improvement, and ongoing pain management, stretch service is far more accessible and affordable than PT in {city.name}.
            </p>
          </div>
        </div>
      </section>

      {/* ═══ ALL SERVICES ═══ */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 font-heading">{services.length} Stretch Services in {city.name}, {state.abbr}</h2>
          <p className="mt-3 text-base text-slate-600">Every professional stretch service type is available in {city.name}. Click any service for details specific to your area.</p>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((s) => (
              <Link key={s.slug} href={getCityServiceUrl(city, s)}>
                <div className="group rounded-xl border border-slate-200 bg-white p-5 transition-all hover:border-teal-400 hover:shadow-md h-full">
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-teal-600 font-heading">{s.name}</h3>
                  <p className="mt-1 text-xs font-semibold text-teal-600">{s.tagline}</p>
                  <p className="mt-2 text-sm text-slate-600 line-clamp-2">{s.shortDesc}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {s.idealFor.slice(0, 3).map((tag) => (
                      <span key={tag} className="rounded-full bg-teal-50 px-2.5 py-0.5 text-xs text-teal-700">{tag}</span>
                    ))}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ PARKS ═══ */}
      {cityParks.length > 0 && (
        <section className="bg-section-white py-16">
          <div className="mx-auto max-w-5xl px-6">
            <h2 className="text-2xl font-bold text-slate-900 font-heading">Outdoor Stretch Service — Parks in {city.name}</h2>
            <p className="mt-3 text-base text-slate-600">Get stretched at one of these iconic {city.name} parks. Our therapists meet you with all equipment. Outdoor stretch service sessions are a beautiful way to combine fresh air with professional flexibility therapy. All {city.name} parks below are fully equipped for stretch service — we bring mats, equipment, and everything needed.</p>
            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {cityParks.map((p) => (
                <Link key={p.slug} href={getParkUrl(p)}>
                  <div className="group rounded-xl border border-slate-200 bg-white p-5 transition-all hover:border-teal-400 hover:shadow-md h-full">
                    <h3 className="text-base font-bold text-slate-900 group-hover:text-teal-600 font-heading">{p.name}</h3>
                    <p className="mt-1 text-xs text-slate-500">{"★".repeat(p.touristRating)} | Best spot: {p.bestSpot}</p>
                    <p className="mt-2 text-sm text-slate-600">{p.description}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══ NEARBY STATE PARKS ═══ */}
      {stateParks.length > 0 && (
        <section className={cityParks.length > 0 ? "bg-section-teal py-16" : "bg-section-white py-16"}>
          <div className="mx-auto max-w-5xl px-6">
            <h2 className="text-2xl font-bold text-slate-900 font-heading">More {state.name} Parks for Outdoor Stretch Service</h2>
            <p className="mt-3 text-base text-slate-600">Stretch service is also available at these nearby {state.name} parks. Our therapists travel throughout the state to meet you at any outdoor location.</p>
            <div className="mt-6 flex flex-wrap gap-2">
              {stateParks.map((p) => (
                <Link key={p.slug} href={getParkUrl(p)} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 transition-all hover:border-teal-400 hover:text-teal-700">
                  {p.name} ({p.city})
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══ PRICING ═══ */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-center text-2xl font-bold text-slate-900 font-heading">Stretch Service Pricing in {city.name}</h2>
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="rounded-xl border-2 border-slate-200 bg-white p-8 text-center">
              <p className="text-sm font-semibold uppercase tracking-wider text-slate-500 font-cta">Single Session</p>
              <p className="mt-4 text-5xl font-bold text-teal-700 font-heading">$99</p>
              <p className="mt-1 text-sm text-slate-500">per 60-minute session</p>
              <ul className="mt-6 space-y-2 text-left text-sm text-slate-600">
                <li>&#10003; Full-body mobility assessment</li>
                <li>&#10003; 60 min professional stretching</li>
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
          <h2 className="text-2xl font-bold text-slate-900 font-heading">FAQ: Stretch Service in {city.name}, {state.abbr}</h2>
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

      {/* ═══ NEARBY CITIES ═══ */}
      {siblingCities.length > 0 && (
        <section className="bg-section-teal py-16">
          <div className="mx-auto max-w-5xl px-6">
            <h2 className="text-center text-2xl font-bold text-slate-900 font-heading">Stretch Service in Other {state.name} Cities</h2>
            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {siblingCities.map((c) => (
                <Link key={c.slug} href={getCityUrl(c)}>
                  <div className="group rounded-lg border border-slate-200 bg-white p-3 text-center transition-all hover:border-teal-400 hover:shadow-md">
                    <p className="text-sm font-bold text-slate-900 group-hover:text-teal-600 font-heading">{c.name}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{c.stateAbbr}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══ JOBS CTA ═══ */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-2xl font-bold text-slate-900 font-heading">We&apos;re Hiring Stretch Therapists in {city.name}</h2>
          <p className="mx-auto mt-3 max-w-xl text-base text-slate-600">$50/hr starting pay, flexible schedule, fast payment, established client base. Join the Stretch Service team in {city.name}.</p>
          <Link href={`/jobs/${stateSlug}/${citySlug}`} className="mt-6 inline-block rounded-lg bg-teal-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg transition-colors hover:bg-teal-700 font-cta">View {city.name} Jobs</Link>
        </div>
      </section>

      {/* ═══ FINAL CTA ═══ */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 py-16">
        <div className="absolute inset-0 grid-bg opacity-20" />
        <div className="relative mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-2xl font-bold text-white font-heading">Book Stretch Service in {city.name} — $99/hr</h2>
          <p className="mt-4 text-lg text-white/80">Professional mobile stretch service in {city.name}, {state.name}. Same-day available. 10% off weekly. Your body will thank you.</p>
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
