// @ts-nocheck
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import {
  states,
  findStateBySlug,
  getCitiesByState,
  getParksByState,
  getCityUrl,
  getParkUrl,
  getStateUrl,
  getCityServiceUrl,
  services,
  getServiceUrl,
  clientTypes,
  cities,
  SITE_URL,
  SITE_SMS_LINK,
  SITE_PHONE,
  SITE_PHONE_LINK,
} from "@/app/site/stretch-service/_lib/siteData";
import { JsonLd, webPageSchema, breadcrumbSchema, faqSchema } from "@/app/site/stretch-service/_lib/schema";
import Logo from "@/app/site/stretch-service/_components/Logo";

interface Props { params: Promise<{ state: string }> }

export const dynamicParams = true;
export const revalidate = 2592000;

export async function generateStaticParams() { return [] }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { state: stateSlug } = await params;
  const state = findStateBySlug(stateSlug);
  if (!state) return {};
  const stateCities = getCitiesByState(stateSlug);
  return {
    title: `Stretch Service in ${state.name} | ${stateCities.length} Cities | $99/hr`,
    description: `Professional mobile stretch service in ${state.name}. ${stateCities.length} cities served. Certified therapists come to your home, office, or hotel. $99/hr, 10% off weekly.`,
    alternates: { canonical: `${SITE_URL}${getStateUrl(state)}` },
  };
}

export default async function StatePage({ params }: Props) {
  const { state: stateSlug } = await params;
  const state = findStateBySlug(stateSlug);
  if (!state) notFound();

  const stateCities = getCitiesByState(stateSlug);
  const stateParks = getParksByState(stateSlug);
  const pageUrl = `${SITE_URL}${getStateUrl(state)}`;
  const otherStates = states.filter((s) => s.slug !== stateSlug);

  const topCity = stateCities[0];

  const faqItems = [
    { question: `How much does stretch service cost in ${state.name}?`, answer: `Our professional mobile stretch service in ${state.name} is $99 per 60-minute session. Weekly clients save 10% at just $89/session. All sessions include a full-body mobility assessment, professional equipment, and a personalized treatment plan delivered to your location.` },
    { question: `How many cities do you serve in ${state.name}?`, answer: `We currently serve ${stateCities.length} cities across ${state.name}. Our certified stretch therapists travel to your home, office, hotel, or any convenient location. Text ${SITE_PHONE} to check availability in your specific area.` },
    { question: `Can I book a same-day stretch service appointment in ${state.name}?`, answer: `Yes! We offer same-day appointments in most ${state.name} cities. Text or call ${SITE_PHONE} and most requests are confirmed within 30 minutes. Available 7AM-10PM daily.` },
    { question: `Are you hiring stretch therapists in ${state.name}?`, answer: `Yes! We are actively hiring certified stretch therapists across ${state.name}. Starting pay is $50/hour with flexible scheduling, fast payment, and an established client base. Visit our jobs page or apply at stretchjobs.com.` },
    { question: `What types of stretch service are available in ${state.name}?`, answer: `All ${services.length} professional stretch service types are available in every ${state.name} city, including assisted stretching, PNF stretching, myofascial release, dynamic stretching, passive stretching, static stretching, foam rolling, recovery stretching, gentle stretch for seniors, active stretching, and ballistic stretching. Each session is customized to your specific needs.` },
    { question: `Do you offer corporate stretch service programs in ${state.name}?`, answer: `Yes! We provide on-site corporate stretch service programs for companies throughout ${state.name}. Our corporate wellness stretching reduces workplace injuries, improves productivity, and boosts employee morale. We set up in your office and stretch your team in back-to-back sessions. Visit our corporate wellness page for details.` },
    { question: `Can I get a stretch service session at a park in ${state.name}?`, answer: `Absolutely! We serve ${stateParks.length} parks and outdoor locations across ${state.name}. Our therapists bring mats, equipment, and everything needed for a professional outdoor stretch service session. It is a beautiful way to combine fresh air with flexibility therapy.` },
    { question: `Is stretch service in ${state.name} good for seniors?`, answer: `Yes! Our gentle stretch service program is specifically designed for seniors in ${state.name}. It features extra-gentle, slow-paced movements, chair-assisted options, and arthritis-friendly techniques. Regular sessions help maintain mobility, prevent falls, and support independent living. Our therapists are trained in senior-specific care and bring patience and expertise to every session.` },
  ];

  return (
    <>
      <JsonLd data={webPageSchema(`Stretch Service in ${state.name}`, `Mobile stretch service in ${stateCities.length} cities across ${state.name}. $99/hr.`, pageUrl)} />
      <JsonLd data={breadcrumbSchema([
        { name: "Home", url: SITE_URL },
        { name: "Locations", url: `${SITE_URL}/locations` },
        { name: state.name, url: pageUrl },
      ])} />
      <JsonLd data={faqSchema(faqItems)} />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 pt-36 pb-16 sm:pt-44 sm:pb-20">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">
            <Link href="/locations" className="hover:text-white">Locations</Link> / {state.name}
          </p>
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">{stateCities.length} Cities | $99/hr | Same-Day Appointments</p>
          <h1 className="text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl font-heading">
            Stretch Service in <span className="text-teal-200">{state.name}</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/80">Professional mobile assisted stretch service across {stateCities.length} {state.name} cities. Our certified therapists come to your home, office, or hotel. $99/hr, 10% off weekly. Things to do in {state.name} — get stretched.</p>
          <p className="mx-auto mt-2 text-4xl font-bold text-white sm:text-5xl font-heading">$99 PER HOUR</p>
          <p className="mt-2 text-xl font-bold text-teal-100 font-heading">10% OFF WEEKLY — $89/SESSION</p>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/80">
            Professional mobile stretch service in {stateCities.length} cities across {state.name}. Certified therapists come to your home, office, hotel, or favorite park. Same-day available 7AM-10PM daily.
          </p>
          <div className="mx-auto mt-6 grid max-w-lg grid-cols-3 gap-4">
            <div className="rounded-xl bg-white/10 p-4 backdrop-blur-sm">
              <p className="text-2xl font-bold text-white">{stateCities.length}</p>
              <p className="text-xs text-teal-200">Cities</p>
            </div>
            <div className="rounded-xl bg-white/10 p-4 backdrop-blur-sm">
              <p className="text-2xl font-bold text-white">{stateParks.length}</p>
              <p className="text-xs text-teal-200">Parks</p>
            </div>
            <div className="rounded-xl bg-white/10 p-4 backdrop-blur-sm">
              <p className="text-2xl font-bold text-white">$99</p>
              <p className="text-xs text-teal-200">Per Hour</p>
            </div>
          </div>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a href={SITE_SMS_LINK}><span className="inline-block rounded-lg bg-white px-8 py-3.5 text-base font-semibold text-teal-700 shadow-lg transition-colors hover:bg-teal-50 font-cta">Text {SITE_PHONE} — Book in {state.abbr}</span></a>
            <a href={SITE_PHONE_LINK}><span className="inline-block rounded-lg border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:border-white/60 font-cta">Call {SITE_PHONE}</span></a>
          </div>
        </div>
      </section>

      {/* ═══ ABOUT STRETCH SERVICE IN THIS STATE ═══ */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 font-heading">Mobile Stretch Service Across {state.name}</h2>
          <div className="mt-6 space-y-5 text-base leading-relaxed text-slate-700">
            <p>
              {state.name} is home to a diverse population of professionals, athletes, families, retirees, and travelers — all of whom benefit from professional stretch service. Whether you live in the largest metro area or a smaller city, Stretch Service delivers certified stretch therapists directly to your location anywhere in {state.name}. Our mobile model means you never have to commute to a studio, wait in a lobby, or work around someone else&apos;s schedule. We come to you — your home, your office, your hotel room, or a local park — with professional equipment and deliver 60 minutes of transformative stretching therapy for just $99 per hour.
            </p>
            <p>
              {state.name} residents face unique physical challenges depending on their lifestyle. Desk workers in {state.name}&apos;s corporate offices develop chronic neck tension, rounded shoulders, and lower back pain from hours of sitting. Commuters who drive long distances or ride public transit develop tight hip flexors, compressed spinal discs, and shoulder strain. Athletes and fitness enthusiasts across {state.name} — runners, cyclists, gym-goers, hikers, and team sport players — need professional stretch service to accelerate recovery, prevent injuries, and push past flexibility plateaus. And the growing senior population in {state.name} depends on our <Link href={getServiceUrl(services[9])} className="text-teal-600 underline hover:text-teal-700">gentle stretch service</Link> program to maintain mobility, prevent falls, and stay independent.
            </p>
            <p>
              Stretch Service operates in {stateCities.length} cities across {state.name}, with certified therapists available same-day in most locations. Every session begins with a comprehensive mobility assessment, followed by 60 minutes of hands-on stretching therapy using techniques like <Link href={getServiceUrl(services[1])} className="text-teal-600 underline hover:text-teal-700">PNF stretching</Link>, <Link href={getServiceUrl(services[6])} className="text-teal-600 underline hover:text-teal-700">myofascial release</Link>, <Link href={getServiceUrl(services[3])} className="text-teal-600 underline hover:text-teal-700">dynamic stretching</Link>, and more. Whether you are dealing with chronic pain, recovering from surgery, training for a race, or simply want to feel better in your body — our {state.name} stretch service therapists deliver measurable results every session.
            </p>
            <p>
              The demand for professional stretch service in {state.name} has exploded in recent years. More people are discovering that self-stretching and yoga classes cannot match the results of one-on-one, therapist-assisted stretching. Our PNF stretching techniques produce 2-3x greater flexibility gains than static stretching alone. Our <Link href={getServiceUrl(services[6])} className="text-teal-600 underline hover:text-teal-700">myofascial release</Link> targets the fascial adhesions that cause chronic pain and restricted movement. And our <Link href={getServiceUrl(services[8])} className="text-teal-600 underline hover:text-teal-700">recovery stretch service</Link> accelerates post-workout healing by 40-60%. These are not marketing claims — they are backed by published research in sports science and physical therapy journals.
            </p>
          </div>
        </div>
      </section>

      {/* All Cities */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 font-heading">All {stateCities.length} Cities in {state.name}</h2>
          <p className="mt-3 text-base text-slate-600">Click any city for local stretch service options, nearby parks, and things to do.</p>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {stateCities.map((c) => (
              <Link key={c.slug} href={getCityUrl(c)}>
                <div className="group rounded-xl border border-slate-200 bg-white p-5 transition-all hover:border-teal-400 hover:shadow-md h-full">
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-teal-600 font-heading">{c.name}</h3>
                  <p className="mt-1 text-xs text-slate-500">Pop. {c.population.toLocaleString()} | {c.stateAbbr}</p>
                  <p className="mt-2 text-sm text-slate-600 line-clamp-2">{c.description}</p>
                  {c.landmarks.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {c.landmarks.slice(0, 3).map((l) => (
                        <span key={l} className="rounded-full bg-teal-50 px-2.5 py-0.5 text-xs text-teal-700">{l}</span>
                      ))}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ ALL SERVICES WITH DESCRIPTIONS ═══ */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 font-heading">{services.length} Stretch Services Available in {state.name}</h2>
          <p className="mt-3 text-base text-slate-600">All {services.length} professional stretch service types are available in every {state.name} city. $99/hr single sessions, $89/hr weekly with 10% off.</p>
          <div className="mt-8 space-y-6">
            {services.map((s) => (
              <div key={s.slug} className="rounded-xl border border-slate-200 bg-white p-5">
                <h3 className="text-base font-bold text-slate-900 font-heading">
                  <Link href={getServiceUrl(s)} className="text-teal-700 hover:text-teal-900">{s.name} in {state.name}</Link>
                </h3>
                <p className="mt-1 text-xs font-semibold text-teal-600">{s.tagline}</p>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{s.shortDesc} Available in all {stateCities.length} {state.name} cities. Our certified therapists deliver professional {s.name.toLowerCase()} sessions at your home, office, hotel, or favorite park for $99/hr.</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {s.idealFor.slice(0, 4).map((tag) => (
                    <span key={tag} className="rounded-full bg-teal-50 px-2.5 py-0.5 text-xs text-teal-700">{tag}</span>
                  ))}
                </div>
                {topCity && (
                  <p className="mt-2 text-xs text-slate-500">
                    Most popular in: <Link href={getCityServiceUrl(topCity, s)} className="text-teal-600 underline hover:text-teal-700">{s.name} in {topCity.name}</Link>
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Parks */}
      {stateParks.length > 0 && (
        <section className="bg-section-teal py-16">
          <div className="mx-auto max-w-5xl px-6">
            <h2 className="text-2xl font-bold text-slate-900 font-heading">Parks in {state.name} — Outdoor Stretch Service Spots</h2>
            <p className="mt-3 text-base text-slate-600">Get stretched outdoors at one of {state.name}&apos;s beautiful parks. Our therapists bring mats, equipment, and everything needed for a professional outdoor stretch service session. Fresh air and flexibility therapy is a powerful combination.</p>
            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {stateParks.map((p) => (
                <Link key={p.slug} href={getParkUrl(p)}>
                  <div className="group rounded-xl border border-slate-200 bg-white p-5 transition-all hover:border-teal-400 hover:shadow-md h-full">
                    <h3 className="text-base font-bold text-slate-900 group-hover:text-teal-600 font-heading">{p.name}</h3>
                    <p className="mt-1 text-xs text-slate-500">{p.city} | {"★".repeat(p.touristRating)}</p>
                    <p className="mt-2 text-sm text-slate-600 line-clamp-2">{p.description}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══ WHO USES STRETCH SERVICE IN THIS STATE ═══ */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 font-heading">Who Uses Stretch Service in {state.name}?</h2>
          <p className="mt-3 text-base text-slate-600">{state.name} is home to a diverse population, and our stretch service serves every type of client. Here is who benefits most from professional stretching therapy in {state.name}.</p>
          <div className="mt-8 space-y-5 text-base leading-relaxed text-slate-700">
            {clientTypes.map((ct) => (
              <div key={ct.slug}>
                <p>
                  <strong>{ct.name}:</strong> {ct.shortDesc} In {state.name}, this is one of our most-booked client categories. Common pain points include {ct.painPoints.join(", ").toLowerCase()}. Our stretch service therapists use targeted techniques to address each of these issues, delivering measurable improvement in flexibility, pain reduction, and quality of life. Whether you are in {stateCities.length > 0 ? stateCities[0].name : state.name} or any other {state.name} city, we come to your location with all equipment for $99/hr.
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ HOW IT WORKS IN THIS STATE ═══ */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 font-heading">How Mobile Stretch Service Works in {state.name}</h2>
          <div className="mt-6 space-y-5 text-base leading-relaxed text-slate-700">
            <p>
              Booking a stretch service session in {state.name} is simple and fast. Text or call {SITE_PHONE} with your city, preferred date and time, and the location where you would like your session (home, office, hotel, or park). We confirm your appointment and assign a certified stretch therapist in your area — most requests are confirmed within 30 minutes. Same-day appointments are available in most {state.name} cities.
            </p>
            <p>
              Your certified stretch therapist arrives at your {state.name} location with a professional massage table, mats, straps, resistance bands, and all necessary equipment. They set up in under 5 minutes — your living room, bedroom, office, hotel room, or even a flat section of a local park works perfectly. You need about 6x8 feet of clear floor space.
            </p>
            <p>
              Every stretch service session begins with a comprehensive mobility assessment. Your therapist evaluates your posture, identifies areas of restriction, tests your range of motion, and discusses your specific goals and pain points. Based on this assessment, they deliver 60 minutes of hands-on stretching therapy customized to your body. Techniques may include <Link href={getServiceUrl(services[1])} className="text-teal-600 underline hover:text-teal-700">PNF stretching</Link>, <Link href={getServiceUrl(services[6])} className="text-teal-600 underline hover:text-teal-700">myofascial release</Link>, <Link href={getServiceUrl(services[4])} className="text-teal-600 underline hover:text-teal-700">passive stretching</Link>, <Link href={getServiceUrl(services[5])} className="text-teal-600 underline hover:text-teal-700">static stretching</Link>, and other modalities depending on your needs.
            </p>
            <p>
              After your session, your therapist provides personalized recommendations for maintaining your progress between appointments. Weekly clients in {state.name} save 10% at $89/session and receive priority scheduling, same-therapist continuity, and progress tracking. No contracts — cancel anytime. Our {state.name} stretch service clients who commit to weekly sessions see 3x greater flexibility improvement than single-session clients.
            </p>
          </div>
        </div>
      </section>

      {/* ═══ CORPORATE WELLNESS ═══ */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 font-heading">Corporate Wellness Stretch Service in {state.name}</h2>
          <div className="mt-6 space-y-5 text-base leading-relaxed text-slate-700">
            <p>
              Forward-thinking companies across {state.name} are bringing professional stretch service directly to the workplace. Our corporate wellness stretch service programs reduce workplace injuries, lower healthcare costs, boost employee productivity, and dramatically improve team morale. We set up in a conference room, open area, or break room and stretch employees in back-to-back 30 or 60-minute sessions throughout the day.
            </p>
            <p>
              Corporate stretch service is particularly valuable for {state.name} companies with desk-bound employees. After just one on-site stretching session, employees report reduced back pain, improved focus, and better mood. Companies that implement monthly or weekly corporate stretch service programs see measurable reductions in repetitive strain injuries, sick days, and workers&apos; compensation claims. It is one of the highest-ROI wellness investments a {state.name} company can make.
            </p>
            <p>
              <Link href="/corporate-wellness" className="text-teal-600 underline hover:text-teal-700">Visit our corporate wellness page</Link> for program details, team pricing, and to schedule a demo at your {state.name} office. We serve companies of all sizes — from 5-person startups to 5,000-person enterprises.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 font-heading">FAQ: Stretch Service in {state.name}</h2>
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

      {/* ═══ JOBS CTA ═══ */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-2xl font-bold text-slate-900 font-heading">We&apos;re Hiring Stretch Therapists in {state.name}</h2>
          <p className="mx-auto mt-3 max-w-xl text-base text-slate-600">$50/hr starting pay, flexible schedule, fast payment, established client base. Join the Stretch Service team in {state.name}.</p>
          <Link href={`/jobs/${stateSlug}`} className="mt-6 inline-block rounded-lg bg-teal-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg transition-colors hover:bg-teal-700 font-cta">View {state.name} Jobs</Link>
        </div>
      </section>

      {/* Other States */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-2xl font-bold text-slate-900 font-heading">Stretch Service in All 50 States</h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-slate-600">We serve every state in America. Click any state below to explore stretch service cities, parks, and options.</p>
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {otherStates.map((s) => (
              <Link key={s.slug} href={getStateUrl(s)}>
                <div className="group rounded-lg border border-slate-200 bg-white p-3 text-center transition-all hover:border-teal-400 hover:shadow-md">
                  <p className="text-sm font-bold text-slate-900 group-hover:text-teal-600 font-heading">{s.name}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{getCitiesByState(s.slug).length} cities</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 py-16">
        <div className="absolute inset-0 grid-bg opacity-20" />
        <div className="relative mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-2xl font-bold text-white font-heading">Book Stretch Service in {state.name} — $99/hr</h2>
          <p className="mt-4 text-lg text-white/80">Professional mobile stretch service in {stateCities.length} {state.name} cities. Same-day available. 10% off weekly. Your body will thank you.</p>
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
