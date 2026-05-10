// @ts-nocheck
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { states, findStateBySlug, getCitiesByState, services, SITE_URL, SITE_SMS_LINK, SITE_PHONE, SITE_PHONE_LINK } from "@/app/site/stretch-service/_lib/siteData";
import { JsonLd, webPageSchema, breadcrumbSchema, faqSchema } from "@/app/site/stretch-service/_lib/schema";

interface Props { params: Promise<{ state: string }> }

export const dynamicParams = true;
export const revalidate = 86400;

export async function generateStaticParams() {
  return states.map((s) => ({ state: s.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { state } = await params;
  const s = findStateBySlug(state);
  if (!s) return {};
  const cities = getCitiesByState(state);
  return {
    title: `Corporate Stretch Service ${s.name} | ${cities.length} Cities | $99/hr`,
    description: `Corporate stretch service programs across ${cities.length} ${s.name} cities. On-site employee wellness, injury prevention, productivity boost. Weekly, monthly, event programs. Custom corporate rates. $99/hr base.`,
    alternates: { canonical: `${SITE_URL}/corporate-wellness/${s.slug}` },
  };
}

export default async function StateCorporatePage({ params }: Props) {
  const { state } = await params;
  const s = findStateBySlug(state);
  if (!s) notFound();
  const cities = getCitiesByState(state);

  const programTypes = [
    {
      name: "Weekly On-Site Stretch Service",
      desc: `Recurring weekly stretch service sessions at your ${s.name} office are the foundation of an effective corporate wellness program. Your dedicated therapist arrives at the same time each week, sets up in your designated space, and provides 15-30 minute individual stretch sessions for employees throughout the day. Weekly consistency is what produces the strongest results — your therapist tracks each employee&apos;s progress, identifies developing issues before they become injuries, and builds personalized protocols. Most ${s.name} companies schedule 4-8 hours of therapist time per week, serving 16-32 employees per session day. After 8-12 weeks of weekly stretch service, companies consistently report measurable reductions in employee pain complaints and injury claims.`,
    },
    {
      name: "Monthly Wellness Day",
      desc: `A dedicated wellness day once a month where our team of stretch therapists comes to your ${s.name} office and provides stretch service sessions for all employees. We bring 2-4 therapists depending on your team size, set up multiple stations, and rotate through your staff during the workday. Monthly wellness days combine individual stretch sessions with group mobility workshops and lunch-and-learn presentations about ergonomics, desk stretches, and self-care techniques. This format creates an event-like atmosphere that ${s.name} employees look forward to each month. It&apos;s an excellent starting point for companies exploring corporate stretch service — many ${s.name} businesses start monthly and upgrade to weekly after seeing the impact.`,
    },
    {
      name: "Event & Team Building",
      desc: `One-time stretch service events for ${s.name} company retreats, team offsites, product launches, wellness fairs, or holiday parties. Our event-based corporate stretch service is interactive, energizing, and memorable. We set up individual stretch stations, lead group mobility workshops, or combine both formats. Team building stretch events are uniquely inclusive — every fitness level can participate, and the shared experience creates genuine bonding. We&apos;ve provided event stretch service at tech company hackathons, law firm retreats, warehouse safety days, and startup launch parties across ${s.name}. Events can be held at your office, a park, hotel conference room, or any venue in the state.`,
    },
    {
      name: "Executive Wellness Program",
      desc: `Private 60-minute stretch service sessions for ${s.name} executives and leadership teams, scheduled at their convenience in their office or a private conference room. Your C-suite and senior leaders carry enormous physical and mental stress that manifests as chronic tension, pain, and decreased energy. Our executive stretch service combines assisted stretching, myofascial release, and targeted mobility work tailored to each executive&apos;s specific needs. Sessions are confidential and scheduled around their calendar. Many ${s.name} executives use their stretch service appointment as a mid-day reset that sharpens decision-making and sustains energy through afternoon meetings and calls.`,
    },
    {
      name: "Warehouse & Labor Program",
      desc: `For ${s.name} companies with physical labor forces — warehouses, manufacturing plants, distribution centers, and construction sites — our stretch service program reduces the musculoskeletal injuries that cost these industries billions annually. Pre-shift stretch sessions prepare workers&apos; bodies for lifting, bending, reaching, and repetitive motions. Post-shift sessions address accumulated strain and prevent chronic injuries. Our therapists understand industrial ergonomics and design protocols specific to each role&apos;s physical demands. OSHA data shows that companies implementing pre-shift stretching reduce injury rates by 50-70% and workers&apos; compensation costs by 40%. For ${s.name} warehouse and manufacturing operations, corporate stretch service is a critical safety investment with immediate, measurable ROI.`,
    },
    {
      name: "Remote & Hybrid Team Program",
      desc: `For ${s.name} companies with remote or hybrid workforces, our stretch service program brings wellness to employees wherever they work. For hybrid teams, we provide on-site stretch service on office days — making in-office days more attractive. For fully remote ${s.name} teams, we offer virtual stretch workshops led by certified therapists via video call, guiding employees through targeted routines at their home desks. We also coordinate in-person stretch service when remote teams gather for quarterly meetings or retreats. The remote workforce faces unique challenges: poor home office ergonomics, longer sedentary hours, and isolation that increases physical tension. Our hybrid program addresses all of these.`,
    },
  ];

  const faqItems = [
    { question: `What is corporate stretch service in ${s.name}?`, answer: `Corporate stretch service in ${s.name} is an on-site employee wellness program where certified stretch therapists come directly to your office and provide professional assisted stretching to your team. Our therapists bring all equipment, set up in any available space, and provide individual 15-minute sessions or group 30-minute workshops. There is no disruption to the workday, no special clothing required, and no commute for employees. We serve businesses across ${cities.length} ${s.name} cities with weekly, monthly, and event-based programs at custom corporate rates starting from $99 per hour.` },
    { question: `How much does corporate stretch service cost in ${s.name}?`, answer: `Individual stretch service sessions in ${s.name} start at $99 per hour. Corporate programs receive custom pricing based on team size, frequency, and program type. Weekly and monthly programs include volume discounts. Most ${s.name} companies invest $500 to $2,000 per month depending on team size and frequency. The return on investment is clear — reduction in sick days, injury claims, and healthcare costs more than offsets the program cost. Text ${SITE_PHONE} for a free custom quote for your ${s.name} company.` },
    { question: `Which ${s.name} cities do you serve for corporate stretch service?`, answer: `We provide corporate stretch service in ${cities.length} cities across ${s.name}. Our certified therapists are available in major metropolitan areas and surrounding communities throughout the state. Whether your office is in a downtown business district, suburban office park, or industrial zone, we bring our stretch service directly to your ${s.name} location. Click any city on this page to see specific corporate stretch service details for that area.` },
    { question: `What industries benefit from corporate stretch service in ${s.name}?`, answer: `Every industry with desk workers, physical laborers, or high-stress environments in ${s.name} benefits from corporate stretch service. Our most active ${s.name} clients include technology companies, financial services firms, healthcare organizations, law firms, manufacturing plants, warehouses, distribution centers, call centers, creative agencies, and co-working spaces. The common thread is that every workforce has physical demands — sitting, standing, lifting, or repetitive motions — that professional stretch service addresses before they become injuries or chronic conditions.` },
    { question: `Can we try a single stretch service session before committing in ${s.name}?`, answer: `Absolutely. Most ${s.name} companies start with a trial day so employees can experience our corporate stretch service firsthand. We bring a therapist for a half-day or full-day trial, serve as many employees as the schedule allows, and collect feedback. No commitment required. Over 90% of ${s.name} companies that do a trial convert to ongoing programs because the employee response is overwhelmingly positive. The trial gives leadership the data they need to justify the investment and gives employees a tangible experience of the benefits.` },
    { question: `How many employees can you serve per day in ${s.name}?`, answer: `A single stretch therapist can serve 16-20 employees per day in ${s.name} with individual 15-minute sessions. For larger teams, we bring multiple therapists to serve your entire office efficiently. We have served ${s.name} offices ranging from 10 employees to 500+ in a single day by scaling our therapist team. We work with you to create a rotating schedule that ensures every employee gets access to stretch service without leaving their desk for more than 15-20 minutes.` },
    { question: `Do you provide corporate stretch service for ${s.name} warehouse and manufacturing companies?`, answer: `Yes. Our warehouse and labor stretch service program is specifically designed for ${s.name} companies with physical workforces. Pre-shift stretch sessions prepare workers for lifting, bending, and repetitive motions. Post-shift sessions address accumulated strain. OSHA data shows pre-shift stretching reduces injury rates by 50-70% and workers compensation costs by 40%. For ${s.name} warehouse and manufacturing operations, corporate stretch service is a safety investment with immediate ROI that pays for itself through reduced injury expenses.` },
    { question: `Are your ${s.name} stretch therapists certified and insured?`, answer: `Yes. All Stretch Service therapists working in ${s.name} are certified in assisted stretching, PNF techniques, and myofascial release. Many hold additional certifications in massage therapy, physical therapy assistance, or athletic training. Every therapist carries professional liability insurance and has passed a thorough background check. When you book corporate stretch service through Stretch Service in ${s.name}, you get trained, vetted, insured professionals who understand workplace wellness and corporate environments.` },
  ];

  const otherStates = states.filter((st) => st.slug !== s.slug).slice(0, 10);

  return (
    <>
      <JsonLd data={webPageSchema(`Corporate Stretch Service ${s.name}`, `Corporate wellness programs across ${cities.length} ${s.name} cities. On-site stretch service for offices.`, `${SITE_URL}/corporate-wellness/${s.slug}`)} />
      <JsonLd data={breadcrumbSchema([
        { name: "Home", url: SITE_URL },
        { name: "Corporate Wellness", url: `${SITE_URL}/corporate-wellness` },
        { name: s.name, url: `${SITE_URL}/corporate-wellness/${s.slug}` },
      ])} />
      <JsonLd data={faqSchema(faqItems)} />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 pt-36 pb-16 sm:pt-44 sm:pb-20">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">
            <Link href="/corporate-wellness" className="hover:text-white">Corporate Wellness</Link>
          </p>
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">Corporate Wellness — {s.name} | {cities.length} Cities | Custom Rates</p>
          <h1 className="text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl font-heading">
            {s.name} <span className="text-teal-200">Corporate Stretch Service</span>
          </h1>
          <p className="mx-auto mt-2 text-2xl font-bold text-white font-heading">$99/hr | Custom Corporate Rates Available</p>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/80">
            On-site corporate stretch service programs across {cities.length} {s.name} cities. Reduce workplace injuries by up to 50%, boost productivity by 25%, and improve employee wellness with professional assisted stretching delivered to your office.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a href={SITE_SMS_LINK}><span className="inline-block rounded-lg bg-white px-8 py-3.5 text-base font-semibold text-teal-700 shadow-lg transition-colors hover:bg-teal-50 font-cta">Text {SITE_PHONE} — Get Quote</span></a>
            <a href={SITE_PHONE_LINK}><span className="inline-block rounded-lg border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:border-white/60 font-cta">Call {SITE_PHONE}</span></a>
          </div>
        </div>
      </section>

      {/* About Corporate Stretch Service in [State] */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 font-heading">About Corporate Stretch Service in {s.name}</h2>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            {s.name} is home to a diverse business landscape that spans technology, finance, healthcare, manufacturing, logistics, and professional services. Companies across every {s.name} industry are discovering that corporate stretch service is one of the most effective and affordable employee wellness investments available. Unlike gym memberships that see 18% utilization rates, corporate stretch service programs delivered on-site at your {s.name} office achieve 70-90% employee participation because we remove every barrier — no commute, no special clothing, no time away from the building, and no effort required from the employee beyond walking to the stretch station and relaxing while a certified therapist does the work.
          </p>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            The {s.name} workforce faces the same physical challenges affecting office workers nationwide, compounded by state-specific factors. Long commutes in {s.name}&apos;s metropolitan areas add hours of sedentary time to already desk-heavy days. Competitive job markets across {s.name}&apos;s major cities mean companies need compelling wellness perks to attract and retain top talent. The state&apos;s growing warehouse and distribution sector creates high injury risk for physical workers. And the increasingly hybrid nature of {s.name}&apos;s workforce demands flexible wellness solutions that serve employees both on-site and remotely. Our corporate stretch service programs address every one of these challenges with customized solutions.
          </p>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            When your {s.name} company invests in corporate stretch service, the results are measurable from day one. Employees report immediate relief from chronic neck pain, lower back tension, and the stiffness that accumulates during 8-10 hours of sitting. Within 90 days of implementing weekly stretch service, {s.name} companies typically see reductions in pain-related complaints, fewer requests for ergonomic equipment, and improved afternoon productivity scores. Within six months, the data shows reduced sick days, fewer injury claims, and improved employee retention — metrics that translate directly to your bottom line.
          </p>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            Our certified stretch therapists serving {s.name} are trained in assisted stretching, PNF (Proprioceptive Neuromuscular Facilitation), myofascial release, and workplace ergonomics. They understand the unique demands of corporate environments — arriving on time, setting up quietly and quickly, maintaining professionalism, and working efficiently within the constraints of a business setting. Whether your {s.name} office is a downtown high-rise, a suburban office park, a co-working space, or a warehouse facility, our therapists bring everything they need and adapt to your space. Programs start at $99 per hour for individual sessions, with custom corporate rates available for weekly and monthly programs based on team size and frequency.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link href="/services/assisted-stretch-service" className="rounded-full bg-teal-50 px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-100">Assisted Stretching</Link>
            <Link href="/services/pnf-stretch-service" className="rounded-full bg-teal-50 px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-100">PNF Stretching</Link>
            <Link href="/services/myofascial-release-stretch-service" className="rounded-full bg-teal-50 px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-100">Myofascial Release</Link>
            <Link href="/pricing" className="rounded-full bg-teal-50 px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-100">View Pricing</Link>
            <Link href={`/locations/${s.slug}`} className="rounded-full bg-teal-50 px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-100">{s.name} Locations</Link>
          </div>
        </div>
      </section>

      {/* 6 Program Types */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 font-heading">6 Corporate Stretch Service Programs in {s.name}</h2>
          <p className="mt-3 text-base text-slate-600">Every program is fully customized to your {s.name} company&apos;s size, schedule, industry, and goals. Choose one or combine several for comprehensive coverage.</p>
          <div className="mt-8 space-y-6">
            {programTypes.map((p) => (
              <div key={p.name} className="rounded-xl border border-teal-200/60 bg-white p-6">
                <h3 className="text-lg font-bold text-teal-700 font-heading">{p.name}</h3>
                <p className="mt-2 text-sm text-slate-600">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits with Data */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 font-heading">Why {s.name} Companies Choose Our Corporate Stretch Service</h2>
          <p className="mt-3 text-base text-slate-600">The ROI of corporate stretch service is documented across every industry. Here&apos;s what {s.name} businesses gain from investing in on-site stretch service programs.</p>
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="rounded-xl border border-teal-200/60 bg-white p-6">
              <h3 className="text-lg font-bold text-teal-700 font-heading">Reduce Workplace Injuries by 50%</h3>
              <p className="mt-2 text-sm text-slate-600">On-site stretch service reduces musculoskeletal injury claims by up to 50% according to Bureau of Labor Statistics data. For {s.name} companies, this translates to fewer workers&apos; compensation claims, lower insurance premiums, reduced lost-time incidents, and healthier employees who can perform at their best. Musculoskeletal injuries are the most common and costly workplace injuries — stretching addresses them at the source before they become claims. The reduction is especially dramatic for {s.name} warehouse, manufacturing, and physical labor operations where pre-shift and post-shift stretch service programs prevent the injuries that cost these industries billions annually.</p>
            </div>
            <div className="rounded-xl border border-teal-200/60 bg-white p-6">
              <h3 className="text-lg font-bold text-teal-700 font-heading">Boost Productivity 15-25%</h3>
              <p className="mt-2 text-sm text-slate-600">Employees who receive stretch service during the workday report 15-25% higher afternoon productivity. A 15-minute stretch break pays for itself many times over in productive output. The American Journal of Health Promotion found that wellness programs return $3.27 in reduced medical costs and $2.73 in reduced absenteeism for every dollar invested. For {s.name} knowledge workers, the afternoon productivity boost alone justifies the stretch service investment — your team returns from their stretch session with renewed focus, energy, and mental clarity rather than the post-lunch slump that kills productivity in offices statewide.</p>
            </div>
            <div className="rounded-xl border border-teal-200/60 bg-white p-6">
              <h3 className="text-lg font-bold text-teal-700 font-heading">Improve Retention & Recruitment</h3>
              <p className="mt-2 text-sm text-slate-600">In {s.name}&apos;s competitive job market, wellness perks are the second most important factor in employee retention behind compensation, according to SHRM research. Companies offering corporate stretch service stand out to job candidates and give existing employees a tangible reason to stay. When 89% of employees at companies with wellness programs report higher job satisfaction, the impact on your {s.name} company&apos;s ability to attract and keep top talent is clear. Corporate stretch service is visible, personal, and memorable — employees talk about it to their friends and professional networks, turning your wellness program into a recruitment tool.</p>
            </div>
            <div className="rounded-xl border border-teal-200/60 bg-white p-6">
              <h3 className="text-lg font-bold text-teal-700 font-heading">Mobile — We Come to Your {s.name} Office</h3>
              <p className="mt-2 text-sm text-slate-600">Our certified therapists come to your {s.name} office with all equipment — portable tables, mats, bolsters, and any tools needed. Setup takes under 5 minutes in any available space: a conference room, break room, private office, or open area. There is no disruption to your workday, no commute for employees, and no special facilities required. This is what makes corporate stretch service fundamentally different from gym memberships and off-site wellness programs — we bring the wellness to your employees rather than asking them to find time to go get it. The convenience drives participation rates of 70-90%, compared to the 18% utilization of corporate gym memberships.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Industry Breakdown for State */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 font-heading">{s.name} Industries That Benefit from Corporate Stretch Service</h2>
          <p className="mt-3 text-base text-slate-600">{s.name}&apos;s economy spans multiple industries, each with unique physical demands on its workforce. Here&apos;s how corporate stretch service addresses the specific challenges facing {s.name} workers across the state&apos;s dominant industries.</p>
          <div className="mt-8 space-y-4">
            <div className="rounded-xl border border-teal-200/60 bg-white p-6">
              <h3 className="text-base font-bold text-teal-700 font-heading">Technology & Startups in {s.name}</h3>
              <p className="mt-2 text-sm text-slate-600">{s.name}&apos;s tech sector is growing rapidly, with companies ranging from early-stage startups to established enterprises. Tech workers spend 10+ hours at screens daily, developing chronic neck pain, carpal tunnel risk, and lower back issues. Corporate stretch service integrates seamlessly into tech office culture — open floor plans, flexible schedules, and a workforce that values innovative perks. {s.name} tech companies that offer on-site stretch service gain a recruiting advantage in a sector where talent competition is fierce.</p>
            </div>
            <div className="rounded-xl border border-teal-200/60 bg-white p-6">
              <h3 className="text-base font-bold text-teal-700 font-heading">Finance & Professional Services in {s.name}</h3>
              <p className="mt-2 text-sm text-slate-600">{s.name}&apos;s financial and professional services firms — banks, accounting firms, insurance companies, and consulting practices — employ workers who sit for long hours under high pressure. The combination of sedentary desk work and deadline stress creates chronic tension patterns. Corporate stretch service provides a release valve that keeps high-performing {s.name} professionals healthy and productive through demanding seasons like tax season, audit periods, and deal closings.</p>
            </div>
            <div className="rounded-xl border border-teal-200/60 bg-white p-6">
              <h3 className="text-base font-bold text-teal-700 font-heading">Healthcare in {s.name}</h3>
              <p className="mt-2 text-sm text-slate-600">{s.name}&apos;s healthcare sector employs thousands of nurses, technicians, administrators, and support staff who face physical demands ranging from long hours on their feet to bending over patients. Hospital systems and medical practices investing in stretch service for their staff see reduced injury rates and lower burnout — critical outcomes in an industry facing nationwide staffing shortages. Healthy caregivers provide better patient care, making corporate stretch service a quality-of-care investment.</p>
            </div>
            <div className="rounded-xl border border-teal-200/60 bg-white p-6">
              <h3 className="text-base font-bold text-teal-700 font-heading">Manufacturing, Warehouse & Distribution in {s.name}</h3>
              <p className="mt-2 text-sm text-slate-600">{s.name}&apos;s manufacturing and logistics sector has the highest injury rates of any industry. Workers performing repetitive lifting, bending, and reaching need pre-shift and post-shift stretch service to prevent the musculoskeletal injuries that drive up workers&apos; comp costs. {s.name} facilities implementing our stretch service programs report 50-70% fewer injury claims and recoup their entire investment within the first quarter through reduced injury expenses alone.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Cities Grid */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 font-heading">Corporate Stretch Service in {cities.length} {s.name} Cities</h2>
          <p className="mt-3 text-base text-slate-600">We provide corporate stretch service to businesses in cities across {s.name}. Click any city below to explore corporate wellness program details, local pricing information, and city-specific stretch service options for your {s.name} office. Each city page includes program types, FAQ, service links, and information about bringing stretch service to your specific location.</p>
          <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {cities.map((c) => (
              <Link key={c.slug} href={`/corporate-wellness/${s.slug}/${c.slug}`}>
                <div className="group rounded-xl border border-slate-200 bg-white p-5 transition-all hover:border-teal-400 hover:shadow-md">
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-teal-600 font-heading">{c.name} Corporate Stretch Service</h3>
                  <p className="mt-1 text-xs text-slate-500">{c.name}, {s.abbr} | Pop. {c.population.toLocaleString()}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works in [State] */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 font-heading">How Corporate Stretch Service Works in {s.name}</h2>
          <p className="mt-3 text-base text-slate-600">Getting started with corporate stretch service for your {s.name} company is straightforward. Here&apos;s the process from first contact to ongoing program delivery.</p>
          <div className="mt-8 space-y-4">
            {[
              { step: "1", title: "Contact Us", desc: `Reach out via text at ${SITE_PHONE}, phone, or email to discuss your ${s.name} company&apos;s needs. Tell us about your team size, office location, work environment, and wellness goals. We&apos;ll ask about injury patterns, employee demographics, and any existing programs. This initial consultation is free and takes about 15 minutes.` },
              { step: "2", title: "Custom Program Design", desc: `Based on our consultation, we design a corporate stretch service program tailored to your ${s.name} company. This includes session frequency (weekly, bi-weekly, monthly, or event-based), duration, number of therapists needed, scheduling format, and specific stretch protocols for your team&apos;s needs. We present a detailed proposal with pricing, timeline, and expected outcomes.` },
              { step: "3", title: "On-Site Delivery", desc: `Our certified stretch therapists arrive at your ${s.name} office with all equipment. Setup takes under 5 minutes. Employees rotate through individual 15-minute stretch sessions or participate in 30-minute group workshops. Your therapist manages the schedule and ensures zero disruption to your workday. Sessions are professional, efficient, and immediately effective.` },
              { step: "4", title: "Progress Tracking", desc: `We track participation rates, employee feedback, common issues addressed, and program outcomes for your ${s.name} company. Monthly reports show exactly what your corporate stretch service investment delivers. We adjust protocols based on data — if trending issues emerge across your team, we adapt our approach. This data-driven method ensures continuous improvement and measurable ROI.` },
              { step: "5", title: "Scale & Expand", desc: `As your ${s.name} team experiences the benefits, most companies expand their stretch service program. Weekly companies add a second day. Single-location companies extend to other ${s.name} offices. Office-only programs add warehouse or remote components. We scale seamlessly because our therapist network covers all ${cities.length} ${s.name} cities where we operate.` },
            ].map((step) => (
              <div key={step.step} className="flex gap-4 rounded-xl border border-teal-200/60 bg-white p-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-600 text-lg font-bold text-white">{step.step}</div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 font-heading">{step.title}</h3>
                  <p className="mt-1 text-sm text-slate-600">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Case Study Style Content */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 font-heading">What Corporate Stretch Service Looks Like at a {s.name} Office</h2>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            It&apos;s 10:00 AM on a Tuesday at a {s.name} office. Your team has been at their desks since 8:30, and the morning energy is starting to fade. Necks are stiffening. Lower backs are aching. Shoulders are creeping up toward ears. The afternoon productivity dip is already building — but today is different because your company invested in corporate stretch service.
          </p>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            Your dedicated Stretch Service therapist arrives at 10:00 AM, quietly sets up a portable stretch station in the conference room reserved for wellness, and sends a notification that sessions are open. The first employee — a software developer who has been dealing with chronic neck pain from 10 hours of daily screen time — walks in and lies down on the padded table. Over the next 15 minutes, the therapist works through a targeted sequence of assisted stretches focusing on the cervical spine, upper trapezius, and pectoral muscles that have shortened from months of forward head posture. The developer stands up, rolls their neck, and says the same thing every employee says after their first stretch service session: &quot;I didn&apos;t realize how tight I was.&quot;
          </p>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            Throughout the day, employees rotate through individual sessions. The marketing manager gets hip flexor and lower back work — she commutes 45 minutes each way and sits all day. The warehouse coordinator gets shoulder and arm stretches — he spends half his day at a desk and half walking the floor. The CEO gets a full 30-minute executive session during her lunch break, combining assisted stretching with myofascial release for the chronic tension she carries in her shoulders from years of high-stress leadership. By 3:00 PM, 16 employees have received stretch service sessions, and the office energy is noticeably different. People are standing up straighter. The afternoon slump that usually hits at 2:30 has been replaced by focused, energized work. The investment in corporate stretch service is already paying for itself in productive hours that would otherwise be lost to discomfort and fatigue.
          </p>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            This is what corporate stretch service looks like at hundreds of {s.name} offices every week. It&apos;s quiet, professional, efficient, and effective. No disruption. No downtime. Just healthier, happier, more productive employees who know their company cares about their physical well-being. And for {s.name} companies tracking the numbers, the monthly report tells the story: participation rates above 80%, employee satisfaction scores above 90%, and a steady decline in the pain complaints and sick days that were costing the company far more than the stretch service program.
          </p>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 font-heading">Corporate Stretch Service Pricing in {s.name}</h2>
          <p className="mt-3 text-base text-slate-600">Transparent pricing with custom corporate rates for {s.name} businesses. Volume discounts available for weekly and monthly programs.</p>
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-3">
            <div className="rounded-xl border border-teal-200/60 bg-white p-6 text-center">
              <h3 className="text-lg font-bold text-slate-900 font-heading">Individual Sessions</h3>
              <p className="mt-2 text-3xl font-bold text-teal-600">$99<span className="text-base font-normal text-slate-500">/hr</span></p>
              <p className="mt-3 text-sm text-slate-600">Standard rate for individual stretch service sessions in {s.name}. Ideal for trial days, demo sessions, and executive wellness programs. 60-minute sessions with one certified therapist. 10% off weekly bookings.</p>
            </div>
            <div className="rounded-xl border-2 border-teal-400 bg-white p-6 text-center">
              <h3 className="text-lg font-bold text-slate-900 font-heading">Weekly Programs</h3>
              <p className="mt-2 text-3xl font-bold text-teal-600">Custom<span className="text-base font-normal text-slate-500"> rates</span></p>
              <p className="mt-3 text-sm text-slate-600">Recurring weekly on-site stretch service at discounted corporate rates for {s.name} companies. Pricing based on weekly hours, team size, and contract length. The most popular and highest-ROI corporate option.</p>
            </div>
            <div className="rounded-xl border border-teal-200/60 bg-white p-6 text-center">
              <h3 className="text-lg font-bold text-slate-900 font-heading">Enterprise</h3>
              <p className="mt-2 text-3xl font-bold text-teal-600">Custom<span className="text-base font-normal text-slate-500"> rates</span></p>
              <p className="mt-3 text-sm text-slate-600">Multi-location {s.name} programs with dedicated therapist teams, priority scheduling, and comprehensive reporting. For companies with 100+ employees or multiple {s.name} offices.</p>
            </div>
          </div>
          <p className="mt-6 text-center text-sm text-slate-500">
            All {s.name} corporate stretch service programs include certified therapists, all equipment, liability insurance, scheduling management, and monthly progress reports. <Link href="/pricing" className="text-teal-600 hover:text-teal-800 underline">View full pricing details</Link>.
          </p>
        </div>
      </section>

      {/* Statistics */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 font-heading">Corporate Stretch Service Results in {s.name}</h2>
          <p className="mt-3 text-base text-slate-600">The data behind corporate stretch service is compelling. {s.name} companies across every industry report dramatic improvements when they invest in on-site stretch service programs. These statistics drive companies from 10-person startups to Fortune 500 enterprises to make stretch service a permanent part of their workplace culture.</p>
          <div className="mt-8 grid grid-cols-2 gap-6 lg:grid-cols-4">
            {[
              { stat: "50%", label: "Reduction in musculoskeletal injury claims (Bureau of Labor Statistics)" },
              { stat: "32%", label: "Average decrease in employee sick days with regular stretch service" },
              { stat: "25%", label: "Improvement in afternoon focus and concentration after stretch sessions" },
              { stat: "$3.27", label: "Return per $1 spent on workplace wellness (American Journal of Health Promotion)" },
              { stat: "90%", label: "Employee satisfaction with corporate stretch service programs" },
              { stat: "40%", label: "Reduction in workers comp costs with pre-shift stretch programs (OSHA)" },
              { stat: "70-90%", label: "Employee participation in on-site stretch service vs. 18% for gym memberships" },
              { stat: "89%", label: "Of employees report higher satisfaction at companies with wellness programs (SHRM)" },
            ].map((item) => (
              <div key={item.stat} className="rounded-xl border border-slate-200 bg-white p-5 text-center">
                <p className="text-2xl font-bold text-teal-600">{item.stat}</p>
                <p className="mt-2 text-xs text-slate-600">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stretch Service Types */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 font-heading">Stretch Service Types for {s.name} Corporate Programs</h2>
          <p className="mt-3 text-base text-slate-600">Our corporate stretch service programs in {s.name} incorporate multiple stretching techniques tailored to your team&apos;s specific needs.</p>
          <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {services.slice(0, 8).map((sv) => (
              <Link key={sv.slug} href={`/services/${sv.slug}`}>
                <div className="group rounded-lg border border-teal-200/60 bg-white p-4 transition-all hover:border-teal-400 hover:shadow-md">
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-teal-600 font-heading">{sv.name}</h3>
                  <p className="mt-1 text-xs text-slate-500 line-clamp-2">{sv.shortDesc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 font-heading">{s.name} Corporate Stretch Service FAQ</h2>
          <p className="mt-3 text-base text-slate-600">Common questions about bringing corporate stretch service to your {s.name} workplace.</p>
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

      {/* Other States */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 font-heading">Corporate Stretch Service in Other States</h2>
          <p className="mt-3 text-base text-slate-600">We provide corporate stretch service in all 50 states. Explore programs in other states or visit our <Link href="/corporate-wellness" className="text-teal-600 hover:text-teal-800 underline">main corporate wellness page</Link> for the full list.</p>
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {otherStates.map((st) => (
              <Link key={st.slug} href={`/corporate-wellness/${st.slug}`}>
                <div className="group rounded-lg border border-teal-200/60 bg-white p-3 text-center transition-all hover:border-teal-400 hover:shadow-md">
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-teal-600 font-heading">{st.name}</h3>
                  <p className="text-xs text-slate-500">{st.abbr}</p>
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
          <h2 className="text-2xl font-bold text-white font-heading">Get a Corporate Stretch Service Quote for {s.name}</h2>
          <p className="mt-4 text-lg text-white/80">Custom programs for any team size across {cities.length} {s.name} cities. Weekly, monthly, or event-based. Text us for a free consultation and proposal.</p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a href={SITE_SMS_LINK}><span className="inline-block rounded-lg bg-white px-8 py-3.5 text-base font-semibold text-teal-700 shadow-lg transition-colors hover:bg-teal-50 font-cta">Text {SITE_PHONE}</span></a>
            <a href={SITE_PHONE_LINK}><span className="inline-block rounded-lg border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:border-white/60 font-cta">Call {SITE_PHONE}</span></a>
          </div>
        </div>
      </section>

      {/* Explore Links */}
      <section className="bg-section-white py-12">
        <div className="mx-auto max-w-4xl px-6">
          <p className="text-center text-sm font-semibold text-slate-500 mb-4">Explore Stretch Service in {s.name}</p>
          <div className="flex flex-wrap justify-center gap-2">
            <Link href="/services" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">All Services</Link>
            <Link href={`/locations/${s.slug}`} className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">{s.name} Locations</Link>
            <Link href="/corporate-wellness" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">All Corporate Programs</Link>
            <Link href="/pricing" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">Pricing</Link>
            <Link href="/parks" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">Parks</Link>
            <Link href="/hotel-stretching" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">Hotel Stretch</Link>
            <Link href="/faq" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">FAQ</Link>
            <Link href="/jobs" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">Careers</Link>
            <Link href="/services/assisted-stretch-service" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">Assisted Stretch</Link>
            <Link href="/services/pnf-stretch-service" className="rounded-full bg-white px-3 py-1 text-xs text-teal-700 border border-teal-200/60 hover:bg-teal-50">PNF Stretching</Link>
          </div>
        </div>
      </section>
    </>
  );
}
