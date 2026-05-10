// @ts-nocheck
import type { Metadata } from "next";
import Link from "next/link";
import { services, clientTypes, states, cities, getCitiesByState, getStateUrl, SITE_URL, SITE_SMS_LINK, SITE_PHONE } from "@/app/site/stretch-service/_lib/siteData";
import { JsonLd, webPageSchema, breadcrumbSchema, faqSchema } from "@/app/site/stretch-service/_lib/schema";
import Logo from "@/app/site/stretch-service/_components/Logo";

export const metadata: Metadata = {
  title: "Stretch Therapist Jobs Nationwide | $50/hr | Stretch Service",
  description:
    "Stretch service therapist jobs across all 50 states. $50/hr, flexible schedule 7AM-10PM, fast payment. Join the Stretch Service team. Apply at stretchjobs.com.",
  alternates: { canonical: `${SITE_URL}/jobs` },
};

const requirements = [
  "Experienced in assisted stretching, PNF, massage therapy, or related bodywork",
  "Carry your own mat to every session",
  "Must be located in or able to travel within your metro area",
  "Punctual — clients expect you on time, every time",
  "Positive attitude and genuine passion for helping people move better",
  "Strong knowledge of anatomy and human movement",
  "Excellent communication and client interaction skills",
  "Legal authorization to work in the United States",
];

const perks = [
  { title: "Starting $50/Hour", desc: "Competitive hourly rate with no cap on sessions. The more you work, the more you earn." },
  { title: "Fast Payment", desc: "Get paid within 30 minutes of completing your session. No waiting for bi-weekly paychecks." },
  { title: "Established Client Base", desc: "We already have clients booked and waiting. No need to build your own book of business." },
  { title: "Flexible Schedule", desc: "Choose your own hours between 7AM and 10PM, 7 days a week. Work when it fits your life." },
  { title: "We Handle Everything Else", desc: "Marketing, sales, scheduling, payment processing — we handle it all so you can focus on stretching." },
  { title: "All 50 States", desc: "Work in any state and city. Choose areas convenient to you. No long commutes required." },
];

const dayInTheLife = [
  { title: "Morning Session — Home Visit", time: "9:00 AM", desc: "Arrive at a client&apos;s home. Roll out your mat, perform a quick mobility assessment, and deliver a 60-minute assisted stretching session focused on lower back and hip relief. Client is a desk worker who sits 10 hours a day. You use PNF techniques on their hip flexors and hamstrings, followed by myofascial release on their lower back. By the end of the session, they can touch their toes for the first time in years. They book a weekly program on the spot — $89/session for consistent results." },
  { title: "Midday Session — Corporate Office", time: "12:00 PM", desc: "Head to a corporate client&apos;s office. Quick setup in a conference room. Focus on neck, shoulders, and upper back — the classic desk worker problem areas. You are in and out in 70 minutes. The office manager asks about booking weekly corporate stretch service sessions for the whole team. You share the corporate wellness information and let them know to contact us for volume pricing. This is how stretch service grows — one great session at a time." },
  { title: "Afternoon Session — Residential", time: "3:00 PM", desc: "A runner booked a recovery stretching session after their morning marathon training. PNF techniques on hamstrings, quads, and calves. They can barely touch their toes when you arrive — they are reaching past them when you leave. You recommend weekly stretch service sessions for optimal recovery and injury prevention. They are already sold. Athletes who experience professional assisted stretching once almost always become weekly clients." },
  { title: "Evening Session — Hotel", time: "6:30 PM", desc: "A tourist at a hotel has been walking 25,000 steps a day exploring the city. Full-body passive stretching session focused on legs, back, and shoulders. They tip you $40 because they can finally walk without limping. You mention that stretch service is available at parks and outdoor locations too — they immediately book an outdoor session for tomorrow morning. This is the variety that makes being a stretch service therapist so rewarding. Every session is different." },
];

const faqItems = [
  { question: "How much do stretch service therapists get paid?", answer: "Stretch Service therapists start at $50 per hour for every session delivered. There is no cap on the number of sessions you can take, so your earnings are entirely in your control. Many therapists complete 4-6 sessions per day, earning $200-$300+ daily. Payment is processed within 30 minutes of completing each session — no waiting for bi-weekly paychecks or chasing invoices. Tips from clients are additional income on top of your $50/hr base rate." },
  { question: "What qualifications do I need to become a stretch service therapist?", answer: "We look for candidates with hands-on experience in assisted stretching, PNF stretching, massage therapy, physical therapy, or related bodywork modalities. Preferred certifications include Certified Stretch Therapist (CST), Licensed Massage Therapist (LMT), NASM/ACE/NSCA personal training certifications, or a physical therapy degree. CPR and First Aid certification is preferred. Most importantly, you need strong anatomy knowledge, excellent communication skills, and a genuine passion for helping people move better." },
  { question: "Is this a full-time or part-time position?", answer: "Stretch Service therapist positions are part-time with flexible scheduling. You choose your own hours between 7AM and 10PM, seven days a week. Some therapists work mornings only, some prefer evenings, and some work full days on weekends. You control your schedule. Many of our therapists work with Stretch Service alongside other wellness or fitness commitments, and the flexibility makes it easy to balance both." },
  { question: "Do I need to bring my own equipment?", answer: "You are required to bring your own professional stretching mat to every session. Stretch Service provides branding materials, client information, and session protocols. Some therapists choose to bring additional equipment like resistance bands, bolsters, and straps, which clients appreciate. Investing in high-quality equipment is part of being a professional stretch service therapist and contributes to better client outcomes." },
  { question: "How do I get clients?", answer: "You do not need to find your own clients. Stretch Service handles all marketing, lead generation, scheduling, and payment processing. When a client books a session in your area, we match them with you based on your location, availability, and specialties. Our established client base across all 50 states means there are already clients waiting for therapists in most major cities. You focus on delivering world-class stretch service sessions — we handle everything else." },
  { question: "What areas can I work in?", answer: "Stretch Service operates across all 50 states and 902+ cities nationwide. You choose which areas you want to work in — ideally within a reasonable driving distance of your home. You can work in multiple cities if you prefer, and you can change your preferred areas at any time. We recommend choosing areas within 30 minutes of your home to minimize travel time between sessions." },
  { question: "How quickly can I start after applying?", answer: "The onboarding process is fast. Once your application is reviewed and approved, you can start accepting sessions within the same week. We verify your credentials, review your experience, provide a brief orientation on Stretch Service protocols and client expectations, and then you are ready to go. Many therapists complete their first paid session within 3-5 days of applying." },
  { question: "Can I work in multiple cities or states?", answer: "Yes. Many Stretch Service therapists work across multiple cities and even multiple states. If you travel for personal reasons or want to work in different areas on different days, that is completely fine. Our scheduling system allows you to set availability by location and time, so you have full control over where and when you work. Some therapists even take their stretch service career on the road and work in different cities every month." },
  { question: "What happens if a client cancels?", answer: "Clients are required to give at least 4 hours notice for cancellations. If a client cancels within 4 hours of their scheduled session, they may be charged a cancellation fee. We do our best to fill cancelled slots with other clients in your area, so your earning potential is protected. Communication about schedule changes happens via text and our scheduling system." },
  { question: "Do stretch service therapists receive tips?", answer: "Yes, many clients tip their stretch service therapists on top of the $50/hr base rate. Tipping is not required, but it is common — especially for sessions at hotels, tourist locations, and corporate events. Tips are yours to keep in full and are not factored into your $50/hr rate. Delivering exceptional service, being personable, and getting results for your clients are the best ways to earn consistent tips." },
];

export default function JobsPage() {
  return (
    <>
      <JsonLd
        data={webPageSchema(
          "Jobs at Stretch Service — Hiring Stretch Therapists Nationwide",
          "We are hiring mobile stretch therapists across all 50 states. $50/hr, flexible schedule, fast payment.",
          `${SITE_URL}/jobs`
        )}
      />
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", url: SITE_URL },
          { name: "Jobs", url: `${SITE_URL}/jobs` },
        ])}
      />
      <JsonLd data={faqSchema(faqItems)} />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 pt-36 pb-16 sm:pt-44 sm:pb-20">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">Now Hiring Nationwide</p>
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">Now Hiring — Mobile Stretch Therapists | $50/hr | All 50 States</p>
          <h1 className="text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl font-heading">
            Stretch Service Jobs — <span className="text-teal-200">$50/hr Nationwide</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/80">
            Stretch Service is hiring part-time mobile stretch therapists across all 50 states. Starting at $50/hour with flexible scheduling, fast payment, and an established client base ready for you.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a href="https://stretchjobs.com" target="_blank" rel="noopener noreferrer" className="inline-block rounded-lg bg-white px-8 py-3.5 text-base font-semibold text-teal-700 shadow-lg transition-colors hover:bg-teal-50 font-cta">
              Apply at stretchjobs.com
            </a>
            <a href="mailto:jobs@stretchservice.com?subject=Stretch%20Therapist%20Application" className="inline-block rounded-lg border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:border-white/60 font-cta">
              Email jobs@stretchservice.com
            </a>
          </div>
        </div>
      </section>

      {/* Open Position Summary */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-4xl px-6">
          <div className="rounded-xl border border-teal-400 bg-teal-50 p-8 shadow-lg">
            <p className="text-xs font-semibold uppercase tracking-wider text-teal-600 font-cta">Open Position</p>
            <h2 className="mt-2 text-2xl font-bold text-slate-900 font-heading">Part-Time Mobile Stretch Therapist</h2>
            <div className="mt-4 flex flex-wrap gap-3">
              <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold text-teal-700">Starting $50/hr</span>
              <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold text-teal-700">Part-Time / Flexible</span>
              <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold text-teal-700">7AM - 10PM Daily</span>
              <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold text-teal-700">All 50 States</span>
              <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold text-teal-700">Paid Within 30 Min</span>
            </div>
            <p className="mt-4 text-base text-slate-600 leading-relaxed">
              We&apos;re looking for experienced stretch therapists to join our growing team of mobile wellness professionals. You&apos;ll travel to clients — homes, offices, hotels, parks, and outdoor locations — providing personalized assisted stretching sessions. Bring your own mat, bring your best energy, and we handle everything else.
            </p>
          </div>
        </div>
      </section>

      {/* What It&apos;s Like Being a Stretch Service Therapist */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">What It&apos;s Like Being a Stretch Service Therapist</h2>
          <div className="mt-8 space-y-4 text-base leading-relaxed text-slate-700">
            <p>
              Being a stretch service therapist is one of the most rewarding careers in the wellness industry. Unlike working at a brick-and-mortar studio or gym where you see the same four walls every day, our mobile stretch service model means every session is a new environment. One hour you are stretching a CEO in a corner office overlooking a city skyline. The next hour, you are helping a tourist recover at a park after a day of sightseeing. In the evening, you are at a luxury hotel helping a business traveler who has been sitting in meetings all day. The variety keeps the work exciting and engaging in a way that static positions simply cannot match.
            </p>
            <p>
              Stretch Service therapists are independent, self-motivated professionals who take pride in their craft. You are not micromanaged. You are not stuck in a cubicle. You control your schedule, choose your working areas, and build relationships with repeat clients who look forward to seeing you every week. Many of our therapists describe their work as the perfect balance between autonomy and support — you have the freedom of being your own boss with the backing of an established brand that handles all the business operations you do not want to deal with.
            </p>
            <p>
              The clients you serve genuinely need what you offer. Desk workers with chronic pain who have tried everything else. Athletes pushing for their next personal record. Seniors who want to maintain their independence and mobility. Tourists whose bodies are beaten up from exploring a new city. When you deliver a great stretch service session and see the immediate difference in how someone moves and feels — that is the reward that keeps therapists coming back day after day. You are not selling a luxury. You are providing something that materially improves people&apos;s quality of life.
            </p>
            <p>
              Financially, the stretch service therapist role is designed for earning potential. At $50/hr with the ability to complete 4-6 sessions per day, you can earn $200-$300+ daily on a flexible schedule. Payment is processed within 30 minutes of session completion — no bi-weekly paycheck, no invoicing, no chasing payments. Tips from clients are common and add meaningfully to your income. And because we handle all marketing, client acquisition, and scheduling, you spend zero time on business development and 100% of your time doing the work that earns you money.
            </p>
          </div>
        </div>
      </section>

      {/* Compensation Details */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Compensation, Benefits &amp; Perks</h2>
          <div className="mt-8 space-y-4 text-base leading-relaxed text-slate-700">
            <p>
              Stretch Service therapists start at $50 per hour for every session delivered. This rate is competitive with top stretch studios and massage therapy practices, but with significantly more flexibility and less overhead. You are not paying rent on a studio space, buying expensive equipment, or spending money on marketing. Your only required investment is a professional stretching mat and your own transportation to client locations.
            </p>
            <p>
              Payment is fast — within 30 minutes of completing your session, your earnings are processed. No waiting for a bi-weekly paycheck, no net-30 invoicing, no chasing clients for payment. We handle all payment processing and client billing so you never have to think about the business side. You stretch, you get paid, you move on to your next session. It is that simple.
            </p>
            <p>
              Beyond the base rate, many clients tip their stretch service therapists. Tips range from $10-$50+ per session and are especially common at hotel sessions, tourist locations, and corporate events. Over time, as you build relationships with weekly clients who love your work, your earning potential grows through both volume and client loyalty. Some of our busiest therapists earn $1,500+ per week working part-time hours.
            </p>
          </div>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {perks.map((perk) => (
              <div key={perk.title} className="rounded-xl border border-slate-200 bg-white p-6">
                <h3 className="text-lg font-bold text-teal-700 font-heading">{perk.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{perk.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* A Day in the Life */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">A Day in the Life of a Stretch Service Therapist</h2>
          <p className="mt-3 text-center text-base text-slate-600 max-w-2xl mx-auto">Here is what a typical day looks like for one of our mobile stretch service therapists. Every day is different, but this gives you a sense of the variety and pace.</p>
          <div className="mt-10 space-y-6">
            {dayInTheLife.map((item) => (
              <div key={item.time} className="rounded-xl border border-slate-200 bg-white p-6">
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-bold text-teal-700">{item.time}</span>
                  <h3 className="text-base font-bold text-slate-900 font-heading">{item.title}</h3>
                </div>
                <p className="mt-3 text-sm text-slate-600">{item.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 space-y-4 text-base leading-relaxed text-slate-700">
            <p>
              By 8:00 PM, you have completed four sessions, earned $200+ in base pay plus tips, helped four people feel dramatically better, and still have the rest of your evening free. This is a Wednesday. Some days you work two sessions. Some days you work six. The beauty of being a stretch service therapist is that you design your schedule around your life, not the other way around.
            </p>
            <p>
              And this is just one version of the daily routine. Some of our therapists specialize in morning corporate wellness sessions, doing back-to-back office visits from 8AM to noon. Others focus on evening hotel sessions for tourists and business travelers. Some therapists love outdoor park sessions and build their schedules around good weather days. The stretch service model supports any working style, and you can change your approach as often as you want.
            </p>
          </div>
        </div>
      </section>

      {/* Browse by State — All 50 */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Stretch Service Jobs in All 50 States</h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-slate-600">
            We&apos;re hiring stretch therapists in every state. Pick your state below to see open positions and cities hiring near you. All positions start at $50/hr with flexible scheduling.
          </p>
          <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {states.map((s) => {
              const count = getCitiesByState(s.slug).length;
              return (
                <Link key={s.slug} href={`/jobs/${s.slug}`}>
                  <div className="group rounded-lg border border-slate-200 bg-white p-3 text-center transition-all hover:border-teal-400 hover:shadow-md">
                    <p className="text-sm font-bold text-slate-900 group-hover:text-teal-600 font-heading">{s.name}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{count} {count === 1 ? "city" : "cities"}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Requirements */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">What We&apos;re Looking For</h2>
          <p className="mt-3 text-center text-base text-slate-600 max-w-2xl mx-auto">Every stretch service therapist on our team meets these core requirements. If this describes you, we want to hear from you.</p>
          <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {requirements.map((req) => (
              <div key={req} className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-4">
                <span className="mt-0.5 text-teal-600 font-bold">&#10003;</span>
                <p className="text-sm text-slate-700">{req}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Browse by Service Type */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Jobs by Service Specialty</h2>
          <p className="mt-3 text-center text-base text-slate-600 max-w-2xl mx-auto">Specialize in the stretch service modalities you are most skilled at. Each specialty has unique client demand across the country.</p>
          <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {services.map((s) => (
              <Link key={s.slug} href={`/jobs/service/${s.slug}`}>
                <div className="group rounded-xl border border-slate-200 bg-white p-4 text-center transition-all hover:border-teal-400 hover:shadow-md">
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-teal-600 font-heading">{s.name}</h3>
                  <span className="mt-1 inline-block text-xs font-semibold text-teal-600 font-cta">View Jobs &rarr;</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Browse by Client Specialty */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Jobs by Client Specialty</h2>
          <p className="mt-3 text-center text-base text-slate-600 max-w-2xl mx-auto">Our stretch service therapists work with diverse client populations. Specializing in a client type can increase your booking frequency and earning potential.</p>
          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {clientTypes.map((ct) => (
              <Link key={ct.slug} href={`/jobs/specialty/${ct.slug}`}>
                <div className="group rounded-xl border border-slate-200 bg-white p-4 text-center transition-all hover:border-teal-400 hover:shadow-md">
                  <span className="text-2xl">{ct.emoji}</span>
                  <h3 className="mt-2 text-sm font-bold text-slate-900 group-hover:text-teal-600 font-heading">{ct.name}</h3>
                  <span className="mt-1 inline-block text-xs font-semibold text-teal-600 font-cta">View Jobs &rarr;</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Frequently Asked Questions About Stretch Service Jobs</h2>
          <div className="mt-10 space-y-3">
            {faqItems.map((faq) => (
              <details key={faq.question} className="group rounded-xl border border-slate-200 bg-white">
                <summary className="cursor-pointer px-6 py-4 text-base font-semibold text-slate-900 transition-colors hover:text-teal-700 font-heading">{faq.question}</summary>
                <div className="px-6 pb-5 text-base leading-relaxed text-slate-600">{faq.answer}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Apply CTA */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 py-16">
        <div className="absolute inset-0 grid-bg opacity-20" />
        <div className="relative mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-2xl font-bold text-white font-heading">Ready to Join Stretch Service?</h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/80">$50/hour, flexible schedule, fast payment, established client base. Apply today and start stretching this week.</p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a href="https://stretchjobs.com" target="_blank" rel="noopener noreferrer" className="inline-block rounded-lg bg-white px-8 py-3.5 text-base font-semibold text-teal-700 shadow-lg transition-colors hover:bg-teal-50 font-cta">
              Apply at stretchjobs.com
            </a>
            <a href="mailto:jobs@stretchservice.com?subject=Stretch%20Therapist%20Application" className="inline-block rounded-lg border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:border-white/60 font-cta">
              Email jobs@stretchservice.com
            </a>
          </div>
          <p className="mt-4 text-sm text-teal-200">Or text us at <a href={SITE_SMS_LINK} className="underline hover:text-white">{SITE_PHONE}</a></p>
        </div>
      </section>
    </>
  );
}
