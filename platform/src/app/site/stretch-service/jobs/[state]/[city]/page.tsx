import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import {
  findStateBySlug,
  findCityBySlug,
  getCitiesByState,
  services,
  clientTypes,
  SITE_URL,
  SITE_SMS_LINK,
  SITE_PHONE,
} from "@/app/site/stretch-service/_lib/siteData";
import { JsonLd, webPageSchema, breadcrumbSchema, jobPostingSchema, faqSchema } from "@/app/site/stretch-service/_lib/schema";
import Logo from "@/app/site/stretch-service/_components/Logo";

interface Props { params: Promise<{ state: string; city: string }> }

export const dynamicParams = true;
export const revalidate = 2592000;

export async function generateStaticParams() { return [] }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { state: stateSlug, city: citySlug } = await params;
  const state = findStateBySlug(stateSlug);
  const city = findCityBySlug(stateSlug, citySlug);
  if (!state || !city) return {};
  return {
    title: `Stretch Therapist Jobs in ${city.name}, ${state.abbr} | $50/hr`,
    description: `Stretch service therapist jobs in ${city.name}, ${state.name}. $50/hr, flexible schedule 7AM-10PM, fast payment. Join Stretch Service. Apply at stretchjobs.com.`,
    alternates: { canonical: `${SITE_URL}/jobs/${stateSlug}/${citySlug}` },
  };
}

export default async function CityJobsPage({ params }: Props) {
  const { state: stateSlug, city: citySlug } = await params;
  const state = findStateBySlug(stateSlug);
  const city = findCityBySlug(stateSlug, citySlug);
  if (!state || !city) notFound();

  const siblingCities = getCitiesByState(stateSlug).filter((c) => c.slug !== citySlug).slice(0, 12);

  const faqItems = [
    { question: `How much do stretch service therapists earn in ${city.name}?`, answer: `Stretch Service therapists in ${city.name}, ${state.name} start at $50 per hour for every session delivered. There is no cap on the number of sessions you can accept per day. Most ${city.name} therapists complete 4-6 sessions on active working days, earning $200-$300+ daily before tips. Payment is processed within 30 minutes of session completion. Tips from clients are common — especially for hotel sessions and corporate events — and add to your base rate.` },
    { question: `What types of clients will I serve in ${city.name}?`, answer: `${city.name} has a diverse client base for stretch service therapists. You will work with desk workers and tech professionals dealing with chronic back and neck pain, athletes seeking recovery and performance optimization, seniors who want to maintain mobility, tourists exploring ${city.name} who need recovery stretching, corporate teams that want on-site wellness, and individuals managing chronic pain conditions. The variety keeps every day interesting and ensures consistent demand for your services.` },
    { question: `What is the schedule like for stretch service therapists in ${city.name}?`, answer: `You set your own schedule. Stretch Service therapists in ${city.name} choose their own hours between 7AM and 10PM, seven days a week. Work mornings, evenings, weekends, or any combination that fits your life. There are no mandatory minimums and no penalties for taking time off. Many ${city.name} therapists work part-time alongside other wellness or fitness commitments. You can change your availability week to week as needed.` },
    { question: `How do I apply for stretch service jobs in ${city.name}?`, answer: `Apply at stretchjobs.com, email jobs@stretchservice.com with "${city.name}, ${state.abbr}" in the subject line, or text (888) 734-7274. The onboarding process is fast — most therapists complete their first paid session within 3-5 days of approval. We verify your credentials, review your experience, provide orientation on Stretch Service protocols, and then you are ready to start accepting sessions in ${city.name}.` },
    { question: `Do I need to find my own clients in ${city.name}?`, answer: `No. Stretch Service handles all marketing, client acquisition, scheduling, and payment processing in ${city.name}. When a client books a session in the ${city.name} area, we match them with an available therapist based on location, availability, and specialties. Our established client base in ${city.name} means there are already clients waiting. You focus on delivering excellent stretch service sessions — we handle the rest.` },
    { question: `What qualifications do I need for stretch service jobs in ${city.name}?`, answer: `We look for candidates with hands-on experience in assisted stretching, PNF stretching, massage therapy, or physical therapy. Preferred certifications include CST, LMT, NASM/ACE certifications, or a PT degree. You must carry your own mat, be punctual, and have strong anatomy knowledge. Check ${state.name} state licensing requirements for massage therapy and bodywork. Strong communication skills and a positive attitude are essential for building repeat client relationships in ${city.name}.` },
  ];

  return (
    <>
      <JsonLd data={webPageSchema(`Stretch Therapist Jobs in ${city.name}, ${state.abbr}`, `Hiring mobile stretch therapists in ${city.name}, ${state.name}. $50/hr.`, `${SITE_URL}/jobs/${stateSlug}/${citySlug}`)} />
      <JsonLd data={breadcrumbSchema([
        { name: "Home", url: SITE_URL },
        { name: "Jobs", url: `${SITE_URL}/jobs` },
        { name: state.name, url: `${SITE_URL}/jobs/${stateSlug}` },
        { name: city.name, url: `${SITE_URL}/jobs/${stateSlug}/${citySlug}` },
      ])} />
      <JsonLd data={jobPostingSchema(city.name, state.name)} />
      <JsonLd data={faqSchema(faqItems)} />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 pt-36 pb-16 sm:pt-44 sm:pb-20">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">
            <Link href="/jobs" className="hover:text-white">Jobs</Link>{" / "}
            <Link href={`/jobs/${stateSlug}`} className="hover:text-white">{state.name}</Link>{" / "}{city.name}
          </p>
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">Hiring in {city.name}, {state.abbr} — $50/hr | Part-Time | Flexible</p>
          <h1 className="text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl font-heading">
            Stretch Therapist Jobs in <span className="text-teal-200">{city.name}, {state.abbr}</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/80">
            Stretch Service is hiring mobile stretch therapists in {city.name}, {state.name}. Starting at $50/hour with flexible scheduling, fast payment, and an established client base.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a href="https://stretchjobs.com" target="_blank" rel="noopener noreferrer" className="inline-block rounded-lg bg-white px-8 py-3.5 text-base font-semibold text-teal-700 shadow-lg transition-colors hover:bg-teal-50 font-cta">Apply at stretchjobs.com</a>
            <a href="mailto:jobs@stretchservice.com?subject=Stretch%20Therapist%20Application%20-%20{city.name}" className="inline-block rounded-lg border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:border-white/60 font-cta">Email jobs@stretchservice.com</a>
          </div>
        </div>
      </section>

      {/* Position Details */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-4xl px-6">
          <div className="rounded-xl border border-teal-400 bg-teal-50 p-8 shadow-lg">
            <p className="text-xs font-semibold uppercase tracking-wider text-teal-600 font-cta">Open Position — {city.name}, {state.abbr}</p>
            <h2 className="mt-2 text-2xl font-bold text-slate-900 font-heading">Part-Time Mobile Stretch Therapist — {city.name}</h2>
            <div className="mt-4 flex flex-wrap gap-3">
              <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold text-teal-700">Starting $50/hr</span>
              <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold text-teal-700">Part-Time / Flexible</span>
              <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold text-teal-700">7AM - 10PM Daily</span>
              <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold text-teal-700">Paid Within 30 Min</span>
            </div>
            <p className="mt-4 text-base text-slate-600 leading-relaxed">
              We&apos;re looking for experienced stretch therapists to join our team in {city.name}, {state.name}. You&apos;ll travel to clients at their homes, offices, hotels, and parks throughout the {city.name} area, providing personalized assisted stretching sessions. {city.name} is known for {city.vibe} — our clients here need your expertise.
            </p>
          </div>
        </div>
      </section>

      {/* About Working in This City */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 font-heading">About Working as a Stretch Service Therapist in {city.name}</h2>
          <div className="mt-6 space-y-4 text-base leading-relaxed text-slate-700">
            <p>
              {city.name}, {state.name} is a thriving market for mobile stretch service. With a population of {city.population.toLocaleString()} and a city known for {city.vibe}, there is strong demand for professional stretching from desk workers, athletes, tourists, seniors, and corporate clients. {city.landmarks.length > 0 ? `Popular landmarks like ${city.landmarks.slice(0, 3).join(", ")} attract tourists who need recovery stretching after long days of exploring.` : "The active local population keeps demand for stretch services consistently high."}
            </p>
            <p>
              {city.name} is the kind of city where stretch service therapists build loyal, long-term client relationships. Many of our {city.name} clients start with a single session and immediately sign up for the weekly program because the results are so dramatic. As a therapist here, you will develop a regular roster of clients who look forward to seeing you every week. That consistency means reliable income, predictable scheduling, and the satisfaction of watching your clients improve over time. There is nothing quite like seeing a client who could barely touch their knees when you started now touching their toes after a month of weekly stretch service sessions.
            </p>
            <p>
              The {city.name} area offers excellent variety for mobile stretch service work. Residential sessions at clients&apos; homes account for the majority of bookings, but you will also serve corporate offices, hotels, parks, gyms, and special events. The mix keeps every day interesting and exposes you to a wide range of client needs and environments. Some therapists in {city.name} develop specialties — one might become the go-to therapist for local athletes, while another builds a reputation with the corporate wellness crowd. The flexibility to shape your own practice within the Stretch Service framework is one of the biggest perks of working in {city.name}.
            </p>
          </div>
        </div>
      </section>

      {/* City Lifestyle for Therapists */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 font-heading">{city.name} Lifestyle for Stretch Service Therapists</h2>
          <div className="mt-6 space-y-4 text-base leading-relaxed text-slate-700">
            <p>
              Living and working in {city.name} as a stretch service therapist offers a quality of life that most traditional wellness jobs cannot match. Because you set your own schedule between 7AM and 10PM, you can structure your day around your personal priorities. Morning person? Stack your sessions from 7AM to noon and have your afternoons free. Night owl? Start at 2PM and work through the evening. Weekend warrior? Work Saturday and Sunday when demand peaks and take weekdays off for your own training, errands, or relaxation.
            </p>
            <p>
              {city.name} residents value health and wellness, which means the stretch service client base here is educated, appreciative, and committed to their sessions. Clients in {city.name} understand the value of professional assisted stretching and respect the expertise you bring. This creates a positive working environment where your skills are recognized and rewarded. Many {city.name} clients become not just regular clients but genuine advocates who refer friends, family, and coworkers to Stretch Service — which means more bookings in your area.
            </p>
            <p>
              The cost of living in {city.name} varies, but at $50/hr with 4-6 sessions per active day plus tips, stretch service therapists here earn a comfortable income on a part-time schedule. The combination of strong hourly pay, flexible hours, zero commute to a fixed workplace, and the intrinsic reward of helping people move better makes this one of the most attractive wellness positions available in {city.name}, {state.name}. Whether you are a seasoned massage therapist looking for more flexibility, a personal trainer expanding into stretch work, or a physical therapy professional seeking supplemental income, Stretch Service in {city.name} is worth your consideration.
            </p>
          </div>
        </div>
      </section>

      {/* Client Types */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-2xl font-bold text-slate-900 font-heading">Client Types You&apos;ll Serve in {city.name}</h2>
          <p className="mt-3 text-center text-base text-slate-600 max-w-2xl mx-auto">As a stretch service therapist in {city.name}, you will work with a diverse range of clients. Here are the primary client populations you should be prepared to serve.</p>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {clientTypes.map((ct) => (
              <Link key={ct.slug} href={`/jobs/specialty/${ct.slug}`}>
                <div className="group rounded-xl border border-slate-200 bg-white p-4 text-center transition-all hover:border-teal-400 hover:shadow-md">
                  <span className="text-2xl">{ct.emoji}</span>
                  <h3 className="mt-2 text-sm font-bold text-slate-900 group-hover:text-teal-600 font-heading">{ct.name}</h3>
                  <p className="mt-1 text-xs text-slate-500">{ct.shortDesc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Pay / Benefits / Schedule */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 font-heading">Pay, Benefits &amp; Schedule in {city.name}</h2>
          <div className="mt-6 space-y-4 text-base leading-relaxed text-slate-700">
            <p>
              Stretch Service therapists in {city.name} earn $50 per hour for every session delivered, with no cap on the number of sessions per day or week. Payment is processed within 30 minutes of completing each session — no invoicing, no waiting for paychecks. Tips from clients are additional income on top of the base rate. Most active {city.name} therapists earn $200-$300+ per working day before tips, with the busiest therapists earning $1,000-$1,500+ weekly on part-time hours.
            </p>
            <p>
              The schedule is entirely in your control. Work between 7AM and 10PM, seven days a week, choosing the hours that fit your life. There are no mandatory session minimums, no penalties for taking days off, and no requirement to work specific days. You can work as many or as few sessions as you want each week. This level of flexibility is ideal for {city.name} wellness professionals who want strong hourly earnings without the rigidity of a traditional employer schedule.
            </p>
            <p>
              Stretch Service handles all marketing, client acquisition, scheduling, and payment processing in {city.name}. You do not need to spend time on business development, social media, invoicing, or client follow-up. We provide the clients, the scheduling infrastructure, and the payment system. You provide the mat, the skills, and the great attitude. It is a partnership designed to let you focus 100% of your working time on the thing that earns you money: delivering excellent stretch service sessions.
            </p>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-xl border border-teal-200/60 bg-teal-50 p-5 text-center">
              <p className="text-sm font-medium text-slate-500">Starting Pay</p>
              <p className="mt-1 text-2xl font-bold text-teal-700">$50/hr</p>
            </div>
            <div className="rounded-xl border border-teal-200/60 bg-teal-50 p-5 text-center">
              <p className="text-sm font-medium text-slate-500">Payment Speed</p>
              <p className="mt-1 text-lg font-bold text-teal-700">30 Min</p>
            </div>
            <div className="rounded-xl border border-teal-200/60 bg-teal-50 p-5 text-center">
              <p className="text-sm font-medium text-slate-500">Schedule</p>
              <p className="mt-1 text-lg font-bold text-teal-700">Flexible</p>
            </div>
            <div className="rounded-xl border border-teal-200/60 bg-teal-50 p-5 text-center">
              <p className="text-sm font-medium text-slate-500">Population</p>
              <p className="mt-1 text-lg font-bold text-teal-700">{city.population.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Services You'll Deliver */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-2xl font-bold text-slate-900 font-heading">Services You&apos;ll Deliver in {city.name}</h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-slate-600">You should be proficient in as many of these stretch service modalities as possible. Clients in {city.name} book all of these services regularly.</p>
          <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((s) => (
              <Link key={s.slug} href={`/jobs/service/${s.slug}`}>
                <div className="group rounded-lg border border-slate-200 bg-white p-4 transition-all hover:border-teal-400 hover:shadow-md">
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-teal-600 font-heading">{s.name}</h3>
                  <p className="mt-1 text-xs text-slate-500 line-clamp-1">{s.tagline}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-center text-2xl font-bold text-slate-900 font-heading">FAQ: Stretch Service Jobs in {city.name}, {state.abbr}</h2>
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

      {/* Other Cities */}
      {siblingCities.length > 0 && (
        <section className="bg-section-teal py-16">
          <div className="mx-auto max-w-5xl px-6">
            <h2 className="text-center text-2xl font-bold text-slate-900 font-heading">Stretch Service Jobs in Other {state.name} Cities</h2>
            <p className="mt-3 text-center text-base text-slate-600">All positions start at $50/hr with flexible scheduling and fast payment.</p>
            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {siblingCities.map((c) => (
                <Link key={c.slug} href={`/jobs/${stateSlug}/${c.slug}`}>
                  <div className="group rounded-lg border border-slate-200 bg-white p-3 text-center transition-all hover:border-teal-400 hover:shadow-md">
                    <p className="text-sm font-bold text-slate-900 group-hover:text-teal-600 font-heading">{c.name}</p>
                    <p className="mt-0.5 text-xs text-teal-600 font-cta">View Jobs &rarr;</p>
                  </div>
                </Link>
              ))}
            </div>
            <div className="mt-6 text-center">
              <Link href={`/jobs/${stateSlug}`} className="text-teal-600 font-semibold underline hover:text-teal-700 font-cta">All {state.name} Jobs &rarr;</Link>
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 py-16">
        <div className="absolute inset-0 grid-bg opacity-20" />
        <div className="relative mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-2xl font-bold text-white font-heading">Apply for Stretch Jobs in {city.name}, {state.abbr}</h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/80">$50/hour, flexible schedule, fast payment, established client base in {city.name}.</p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a href="https://stretchjobs.com" target="_blank" rel="noopener noreferrer" className="inline-block rounded-lg bg-white px-8 py-3.5 text-base font-semibold text-teal-700 shadow-lg transition-colors hover:bg-teal-50 font-cta">Apply at stretchjobs.com</a>
          </div>
          <p className="mt-4 text-sm text-teal-200">Or text us at <a href={SITE_SMS_LINK} className="underline hover:text-white">{SITE_PHONE}</a></p>
        </div>
      </section>
    </>
  );
}
