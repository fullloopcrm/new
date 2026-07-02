// @ts-nocheck
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import {
  states,
  findStateBySlug,
  getCitiesByState,
  getStateUrl,
  services,
  clientTypes,
  SITE_URL,
  SITE_SMS_LINK,
  SITE_PHONE,
} from "@/app/site/stretch-service/_lib/siteData";
import { JsonLd, webPageSchema, breadcrumbSchema, jobPostingSchema, faqSchema } from "@/app/site/stretch-service/_lib/schema";
import Logo from "@/app/site/stretch-service/_components/Logo";

interface Props { params: Promise<{ state: string }> }

export const dynamicParams = true;
export const revalidate = 2592000;

export async function generateStaticParams() { return [] }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { state: stateSlug } = await params;
  const state = findStateBySlug(stateSlug);
  if (!state) return {};
  const count = getCitiesByState(stateSlug).length;
  return {
    title: `Stretch Therapist Jobs in ${state.name} | $50/hr | ${count} Cities`,
    description: `Stretch service therapist jobs in ${state.name}. $50/hr, flexible schedule, fast payment. ${count} cities hiring. Apply at stretchjobs.com.`,
    alternates: { canonical: `${SITE_URL}/jobs/${stateSlug}` },
  };
}

export default async function StateJobsPage({ params }: Props) {
  const { state: stateSlug } = await params;
  const state = findStateBySlug(stateSlug);
  if (!state) notFound();

  const stateCities = getCitiesByState(stateSlug);
  const otherStates = states.filter((s) => s.slug !== stateSlug).slice(0, 12);

  const faqItems = [
    { question: `How much do stretch service therapists earn in ${state.name}?`, answer: `Stretch Service therapists in ${state.name} start at $50 per hour for every session delivered. There is no cap on the number of sessions you can accept per day or per week, so your earning potential is in your control. Payment is processed within 30 minutes of completing each session. Many therapists in ${state.name} complete 4-6 sessions daily, earning $200-$300+ per day. Tips from clients are additional income on top of the base rate.` },
    { question: `What cities in ${state.name} are hiring stretch service therapists?`, answer: `We are currently hiring stretch service therapists in ${stateCities.length} cities across ${state.name}. All ${stateCities.length} cities have active client demand and open positions. You can work in multiple cities within ${state.name} and choose the areas most convenient to your location. Browse the full city list on this page to see specific opportunities near you.` },
    { question: `What qualifications do I need for stretch service jobs in ${state.name}?`, answer: `We look for candidates with experience in assisted stretching, PNF stretching, massage therapy, physical therapy, or related bodywork. Preferred certifications include Certified Stretch Therapist (CST), Licensed Massage Therapist (LMT), NASM/ACE personal training certifications, or a physical therapy degree. You must carry your own mat, be punctual, have strong anatomy knowledge, and be authorized to work in the United States. Check ${state.name} state licensing requirements for massage therapy if applicable.` },
    { question: `Is the stretch service therapist position in ${state.name} full-time or part-time?`, answer: `All stretch service therapist positions in ${state.name} are part-time with flexible scheduling. You choose your own hours between 7AM and 10PM, seven days a week. Work as many or as few sessions as you want. Many of our ${state.name} therapists work 15-30 hours per week alongside other wellness or fitness commitments. The schedule flexibility is one of the top reasons therapists choose Stretch Service over traditional studio positions.` },
    { question: `How do I apply for stretch service jobs in ${state.name}?`, answer: `The fastest way to apply is at stretchjobs.com. You can also email your resume and qualifications to jobs@stretchservice.com with "${state.name}" in the subject line, or text us at (888) 734-7274. The onboarding process is fast — most therapists complete their first paid session within 3-5 days of being approved. We verify credentials, review experience, and provide a brief orientation on Stretch Service protocols.` },
    { question: `Do I need to find my own clients in ${state.name}?`, answer: `No. Stretch Service handles all marketing, client acquisition, scheduling, and payment processing in ${state.name}. When a client books a session in your area, we match them with you based on your location, availability, and specialties. Our established client base across ${state.name}&apos;s ${stateCities.length} cities means there are already clients waiting for therapists. You focus on delivering excellent stretch service sessions — we handle everything else.` },
  ];

  return (
    <>
      <JsonLd data={webPageSchema(`Stretch Therapist Jobs in ${state.name}`, `Hiring mobile stretch therapists in ${stateCities.length} ${state.name} cities. $50/hr.`, `${SITE_URL}/jobs/${stateSlug}`)} />
      <JsonLd data={breadcrumbSchema([
        { name: "Home", url: SITE_URL },
        { name: "Jobs", url: `${SITE_URL}/jobs` },
        { name: state.name, url: `${SITE_URL}/jobs/${stateSlug}` },
      ])} />
      <JsonLd data={jobPostingSchema(state.name, state.abbr)} />
      <JsonLd data={faqSchema(faqItems)} />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 pt-36 pb-16 sm:pt-44 sm:pb-20">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">
            <Link href="/jobs" className="hover:text-white">Jobs</Link> / {state.name}
          </p>
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">Now Hiring in {state.name} — $50/hr | Flexible Hours | Fast Payment</p>
          <h1 className="text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl font-heading">
            Stretch Therapist Jobs in <span className="text-teal-200">{state.name}</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/80">
            We&apos;re hiring mobile stretch therapists in {stateCities.length} {state.name} cities. $50/hour starting pay, flexible scheduling, fast payment within 30 minutes.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a href="https://stretchjobs.com" target="_blank" rel="noopener noreferrer" className="inline-block rounded-lg bg-white px-8 py-3.5 text-base font-semibold text-teal-700 shadow-lg transition-colors hover:bg-teal-50 font-cta">Apply at stretchjobs.com</a>
            <a href="mailto:jobs@stretchservice.com?subject=Stretch%20Therapist%20Application" className="inline-block rounded-lg border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:border-white/60 font-cta">Email jobs@stretchservice.com</a>
          </div>
        </div>
      </section>

      {/* Position Details */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-4xl px-6">
          <div className="rounded-xl border border-teal-400 bg-teal-50 p-8 shadow-lg">
            <p className="text-xs font-semibold uppercase tracking-wider text-teal-600 font-cta">Open Position — {state.name}</p>
            <h2 className="mt-2 text-2xl font-bold text-slate-900 font-heading">Part-Time Mobile Stretch Therapist — {state.name}</h2>
            <div className="mt-4 flex flex-wrap gap-3">
              <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold text-teal-700">Starting $50/hr</span>
              <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold text-teal-700">Part-Time / Flexible</span>
              <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold text-teal-700">7AM - 10PM Daily</span>
              <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold text-teal-700">{stateCities.length} Cities</span>
              <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold text-teal-700">Paid Within 30 Min</span>
            </div>
            <p className="mt-4 text-base text-slate-600 leading-relaxed">
              We&apos;re looking for experienced stretch therapists to join our growing team in {state.name}. You&apos;ll deliver mobile stretch therapy sessions to clients at their homes, offices, hotels, and parks. Bring your own mat, show up on time with positive energy, and we handle marketing, scheduling, and payments.
            </p>
          </div>
        </div>
      </section>

      {/* About Working in This State */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 font-heading">About Working as a Stretch Service Therapist in {state.name}</h2>
          <div className="mt-6 space-y-4 text-base leading-relaxed text-slate-700">
            <p>
              {state.name} is a thriving market for mobile stretch service, with {stateCities.length} cities currently hiring therapists. The demand for professional assisted stretching in {state.name} comes from a diverse population — desk workers dealing with chronic back and neck pain, athletes looking for recovery and performance optimization, seniors who want to maintain their mobility and independence, tourists exploring {state.name}&apos;s attractions, and corporate clients who want on-site wellness programs for their employees. As a stretch service therapist in {state.name}, you will never run out of clients who need your expertise.
            </p>
            <p>
              What makes {state.name} an excellent market for stretch service therapists is the combination of population density, health consciousness, and economic activity. {state.name} residents and visitors are increasingly aware of the benefits of professional assisted stretching — improved flexibility, reduced pain, better posture, faster recovery, and enhanced quality of life. This awareness translates directly into demand for qualified therapists who can deliver results. Our client base in {state.name} is growing every month, and we need skilled therapists to keep up with that demand.
            </p>
            <p>
              The lifestyle in {state.name} varies from city to city, and that variety is one of the best things about working here as a mobile stretch service therapist. You might start your morning in a bustling downtown area, stretching a corporate executive before their 9AM meeting. Your afternoon session could be at a suburban home, helping a stay-at-home parent who has been chasing kids all day and needs lower back relief. In the evening, you might visit a hotel to stretch a tourist who just spent the day exploring. Every session is different, every client has unique needs, and every location offers a new experience.
            </p>
            <p>
              Stretch Service provides all the infrastructure you need to succeed in {state.name}. We handle marketing, lead generation, client acquisition, scheduling, and payment processing. When a {state.name} resident or visitor books a stretch service session, we match them with an available therapist in their area — that could be you. There is no building a client base from scratch, no managing a website, no social media marketing, and no chasing invoices. You focus entirely on what you do best: delivering exceptional assisted stretching sessions that keep clients coming back.
            </p>
          </div>
        </div>
      </section>

      {/* Pay and Benefits */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 font-heading">Pay, Benefits &amp; Schedule for {state.name} Therapists</h2>
          <div className="mt-6 space-y-4 text-base leading-relaxed text-slate-700">
            <p>
              Stretch Service therapists in {state.name} earn a starting rate of $50 per hour for every session delivered. There is no cap on the number of sessions you can accept, so your weekly earnings depend entirely on how many hours you want to work. Most {state.name} therapists complete 4-6 sessions on active working days, translating to $200-$300+ in daily earnings before tips. Payment is processed within 30 minutes of session completion — faster than any traditional employer or freelance arrangement.
            </p>
            <p>
              Tips are common and add meaningfully to your income. Hotel sessions, tourist locations, and corporate events tend to generate the highest tips, but many recurring weekly clients also tip their therapists. Your tip income is on top of the $50/hr base rate and is yours to keep in full. Between base pay and tips, active stretch service therapists in {state.name} can realistically earn $1,000-$1,500+ per week working part-time hours.
            </p>
            <p>
              Schedule flexibility is built into the stretch service model. You set your own hours between 7AM and 10PM, seven days a week. Work mornings only, evenings only, weekends only, or any combination that fits your life. You can change your availability week to week — there are no mandatory minimums and no penalties for taking time off. This level of flexibility is especially valuable in {state.name}, where many wellness professionals juggle multiple commitments and need a schedule that adapts to their life rather than the other way around.
            </p>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-xl border border-teal-200/60 bg-teal-50 p-5 text-center">
              <p className="text-sm font-medium text-slate-500">Starting Pay</p>
              <p className="mt-1 text-2xl font-bold text-teal-700">$50/hr</p>
            </div>
            <div className="rounded-xl border border-teal-200/60 bg-teal-50 p-5 text-center">
              <p className="text-sm font-medium text-slate-500">Payment Speed</p>
              <p className="mt-1 text-lg font-bold text-teal-700">30 Minutes</p>
            </div>
            <div className="rounded-xl border border-teal-200/60 bg-teal-50 p-5 text-center">
              <p className="text-sm font-medium text-slate-500">Schedule</p>
              <p className="mt-1 text-lg font-bold text-teal-700">7AM-10PM</p>
            </div>
            <div className="rounded-xl border border-teal-200/60 bg-teal-50 p-5 text-center">
              <p className="text-sm font-medium text-slate-500">{state.name} Cities</p>
              <p className="mt-1 text-2xl font-bold text-teal-700">{stateCities.length}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Requirements */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 font-heading">Requirements for Stretch Service Therapists in {state.name}</h2>
          <div className="mt-6 space-y-4 text-base leading-relaxed text-slate-700">
            <p>
              To join the Stretch Service team in {state.name}, you need hands-on experience in assisted stretching, PNF stretching, massage therapy, physical therapy, or a closely related bodywork discipline. We are not looking for beginners — our clients expect professional, confident therapists who understand anatomy, can assess mobility issues, and deliver sessions that produce measurable results. If you have been working in the wellness or fitness industry and have strong stretching skills, you are likely a great fit.
            </p>
            <p>
              Preferred certifications include Certified Stretch Therapist (CST), Licensed Massage Therapist (LMT), NASM or ACE personal training certifications, NSCA credentials, or a physical therapy assistant degree or higher. CPR and First Aid certification is also preferred. Be sure to check {state.name}&apos;s specific licensing requirements for massage therapy and bodywork, as requirements vary by state. Stretch Service will help you understand what credentials you need to operate legally in {state.name}.
            </p>
            <p>
              Beyond certifications, you must carry your own professional stretching mat to every session, arrive on time to every appointment, maintain excellent communication with clients, and bring a positive, encouraging attitude. Stretch service therapists represent our brand in clients&apos; homes, offices, and hotels — professionalism, hygiene, and client comfort are non-negotiable. You must also be legally authorized to work in the United States and be located in or able to travel within {state.name}&apos;s metro areas.
            </p>
          </div>
        </div>
      </section>

      {/* Cities in This State */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-2xl font-bold text-slate-900 font-heading">Hiring in {stateCities.length} {state.name} Cities</h2>
          <p className="mt-3 text-center text-base text-slate-600 max-w-2xl mx-auto">Click any city below to see stretch service job details for that specific location. All positions start at $50/hr.</p>
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {stateCities.map((c) => (
              <Link key={c.slug} href={`/jobs/${stateSlug}/${c.slug}`}>
                <div className="group rounded-lg border border-slate-200 bg-white p-3 text-center transition-all hover:border-teal-400 hover:shadow-md">
                  <p className="text-sm font-bold text-slate-900 group-hover:text-teal-600 font-heading">{c.name}</p>
                  <p className="mt-0.5 text-xs text-teal-600 font-cta">View Jobs &rarr;</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Service Specialties */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-2xl font-bold text-slate-900 font-heading">Jobs by Service Specialty in {state.name}</h2>
          <p className="mt-3 text-center text-base text-slate-600 max-w-2xl mx-auto">Specialize in the stretch service modalities that match your skills. Every specialty is in demand across {state.name}.</p>
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {services.map((s) => (
              <Link key={s.slug} href={`/jobs/service/${s.slug}`}>
                <div className="group rounded-lg border border-slate-200 bg-white p-3 text-center transition-all hover:border-teal-400 hover:shadow-md">
                  <p className="text-sm font-bold text-slate-900 group-hover:text-teal-600 font-heading">{s.name}</p>
                  <span className="mt-1 inline-block text-xs font-semibold text-teal-600 font-cta">View &rarr;</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-center text-2xl font-bold text-slate-900 font-heading">FAQ: Stretch Service Jobs in {state.name}</h2>
          <div className="mt-8 space-y-3">
            {faqItems.map((faq) => (
              <details key={faq.question} className="group rounded-xl border border-slate-200 bg-white">
                <summary className="cursor-pointer px-6 py-4 text-base font-semibold text-slate-900 transition-colors hover:text-teal-700 font-heading">{faq.question}</summary>
                <div className="px-6 pb-5 text-base leading-relaxed text-slate-600">{faq.answer}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Other States */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-2xl font-bold text-slate-900 font-heading">Stretch Service Jobs in Other States</h2>
          <p className="mt-3 text-center text-base text-slate-600">We hire stretch service therapists in all 50 states. $50/hr everywhere.</p>
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {otherStates.map((s) => (
              <Link key={s.slug} href={`/jobs/${s.slug}`}>
                <div className="group rounded-lg border border-slate-200 bg-white p-3 text-center transition-all hover:border-teal-400 hover:shadow-md">
                  <p className="text-sm font-bold text-slate-900 group-hover:text-teal-600 font-heading">{s.name}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{getCitiesByState(s.slug).length} cities</p>
                </div>
              </Link>
            ))}
          </div>
          <div className="mt-6 text-center">
            <Link href="/jobs" className="text-teal-600 font-semibold underline hover:text-teal-700 font-cta">View All Jobs &rarr;</Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 py-16">
        <div className="absolute inset-0 grid-bg opacity-20" />
        <div className="relative mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-2xl font-bold text-white font-heading">Apply for Stretch Therapist Jobs in {state.name}</h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/80">$50/hour, flexible schedule, fast payment. {stateCities.length} cities hiring now across {state.name}.</p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a href="https://stretchjobs.com" target="_blank" rel="noopener noreferrer" className="inline-block rounded-lg bg-white px-8 py-3.5 text-base font-semibold text-teal-700 shadow-lg transition-colors hover:bg-teal-50 font-cta">Apply at stretchjobs.com</a>
          </div>
          <p className="mt-4 text-sm text-teal-200">Or text us at <a href={SITE_SMS_LINK} className="underline hover:text-white">{SITE_PHONE}</a></p>
        </div>
      </section>
    </>
  );
}
