import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import {
  clientTypes,
  states,
  getCitiesByState,
  services,
  SITE_URL,
  SITE_SMS_LINK,
  SITE_PHONE,
} from "@/app/site/stretch-service/_lib/siteData";
import { JsonLd, webPageSchema, breadcrumbSchema, faqSchema } from "@/app/site/stretch-service/_lib/schema";
import Logo from "@/app/site/stretch-service/_components/Logo";

interface Props {
  params: Promise<{ slug: string }>;
}

export const dynamicParams = true;
export const revalidate = 2592000;

export async function generateStaticParams() { return [] }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const ct = clientTypes.find((c) => c.slug === slug);
  if (!ct) return {};
  return {
    title: `Become a ${ct.name} Stretch Specialist — Stretch Service Jobs | $50/hr`,
    description: `Stretch Service is hiring therapists who specialize in working with ${ct.name.toLowerCase()}. $50/hr, flexible schedule, fast payment. ${ct.shortDesc}`,
    alternates: { canonical: `${SITE_URL}/jobs/specialty/${ct.slug}` },
  };
}

export default async function SpecialtyJobPage({ params }: Props) {
  const { slug } = await params;
  const ct = clientTypes.find((c) => c.slug === slug);
  if (!ct) notFound();

  const otherClientTypes = clientTypes.filter((c) => c.slug !== ct.slug);
  const majorStates = states.filter((st) =>
    ["california", "new-york", "texas", "florida", "illinois", "pennsylvania", "ohio", "georgia", "north-carolina", "michigan"].includes(st.slug)
  );

  const faqItems = [
    { question: `What does a ${ct.name} stretch specialist do?`, answer: `A ${ct.name.toLowerCase()} specialist at Stretch Service delivers mobile assisted stretching sessions specifically tailored to the unique needs and challenges of ${ct.name.toLowerCase()}. ${ct.shortDesc} You will assess each client&apos;s mobility limitations, pain patterns, and wellness goals, then design and deliver customized 60-minute stretch service sessions that produce measurable improvement. Sessions happen at the client&apos;s preferred location — their home, office, hotel, park, or another convenient spot.` },
    { question: `What skills do I need to specialize in ${ct.name.toLowerCase()}?`, answer: `You need experience working with ${ct.name.toLowerCase()}, strong knowledge of the common conditions and limitations this population faces, the ability to modify stretching techniques based on individual client needs, and excellent communication and empathy skills. You should be comfortable adapting your approach for clients with varying levels of mobility, pain tolerance, and fitness. Preferred certifications include CST, LMT, NASM/ACE, or a physical therapy degree. Experience in rehabilitation settings is a strong advantage.` },
    { question: `How much do ${ct.name.toLowerCase()} specialists earn at Stretch Service?`, answer: `${ct.name} specialists earn a starting rate of $50 per hour for every session delivered. There is no cap on sessions. Payment is processed within 30 minutes of completion. Most specialists complete 4-6 sessions per active day, earning $200-$300+ daily before tips. Specializing in ${ct.name.toLowerCase()} can increase your booking frequency because the demand for therapists with this specific expertise is consistently high. Weekly clients in this population are particularly common, providing reliable recurring income.` },
    { question: `Where is the demand for ${ct.name.toLowerCase()} specialists highest?`, answer: `Every Stretch Service market has demand for ${ct.name.toLowerCase()} specialists, but the highest concentrations tend to be in major metro areas across all 50 states. States like California, New York, Texas, Florida, and Illinois consistently lead in bookings for this specialty. The demand is growing as awareness of professional assisted stretching increases nationwide. We are actively hiring ${ct.name.toLowerCase()} specialists in 902+ cities.` },
    { question: `Can I work with other client types in addition to ${ct.name.toLowerCase()}?`, answer: `Absolutely. While ${ct.name.toLowerCase()} may be your primary specialty, most Stretch Service therapists work with a variety of client types throughout their week. Being versatile increases your booking frequency and earning potential. You will be matched with ${ct.name.toLowerCase()} clients when they specifically request this specialty, but you will also have opportunities to serve desk workers, athletes, seniors, tourists, and other populations based on your availability and location.` },
    { question: `How do I apply as a ${ct.name.toLowerCase()} specialist?`, answer: `Apply at stretchjobs.com, email jobs@stretchservice.com with "${ct.name} Specialist" in the subject line, or text (888) 734-7274. In your application, highlight your experience working with ${ct.name.toLowerCase()} and any relevant certifications or training. The onboarding process is fast — most therapists start accepting sessions within 3-5 days of being approved. We verify credentials, review experience, and provide orientation on Stretch Service standards.` },
  ];

  return (
    <>
      <JsonLd
        data={webPageSchema(
          `Become a ${ct.name} Stretch Specialist — Stretch Service Jobs`,
          `Hiring therapists specializing in ${ct.name.toLowerCase()}. $50/hr, flexible schedule.`,
          `${SITE_URL}/jobs/specialty/${ct.slug}`
        )}
      />
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", url: SITE_URL },
          { name: "Jobs", url: `${SITE_URL}/jobs` },
          { name: ct.name, url: `${SITE_URL}/jobs/specialty/${ct.slug}` },
        ])}
      />
      <JsonLd data={faqSchema(faqItems)} />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 pt-36 pb-16 sm:pt-44 sm:pb-20">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">
            <Link href="/jobs" className="hover:text-white">Jobs</Link> / Client Specialty
          </p>
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">{ct.name} Specialist — $50/hr | All 50 States</p>
          <h1 className="text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl font-heading">
            <span className="mr-3 text-4xl sm:text-5xl">{ct.emoji}</span>
            Become a <span className="text-teal-200">{ct.name}</span> Stretch Specialist
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/80">
            {ct.shortDesc} Join Stretch Service and help this population move better, feel better, and live better. Starting at $50/hour.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a href="https://stretchjobs.com" target="_blank" rel="noopener noreferrer" className="inline-block rounded-lg bg-white px-8 py-3.5 text-base font-semibold text-teal-700 shadow-lg transition-colors hover:bg-teal-50 font-cta">Apply at stretchjobs.com</a>
            <a href="mailto:jobs@stretchservice.com?subject=Stretch%20Therapist%20Application" className="inline-block rounded-lg border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:border-white/60 font-cta">Email jobs@stretchservice.com</a>
          </div>
        </div>
      </section>

      {/* Deep Description of Working With This Client Type */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 font-heading">About Working With {ct.name} as a Stretch Service Therapist</h2>
          <div className="mt-6 space-y-4 text-base leading-relaxed text-slate-700">
            <p>
              {ct.shortDesc} As a stretch therapist specializing in {ct.name.toLowerCase()}, you&apos;ll develop deep expertise in addressing the specific mobility challenges, pain patterns, and wellness goals of this population. This is rewarding work — your clients will see and feel measurable improvement from every session you deliver. The impact you make on their daily quality of life is tangible and immediate, which is what makes specializing in {ct.name.toLowerCase()} one of the most fulfilling paths within the stretch service profession.
            </p>
            <p>
              Working with {ct.name.toLowerCase()} requires a specific mindset and skill set that not every therapist possesses. You need to understand the unique physical challenges this population faces, the common conditions and pain patterns they present, and the modifications required to deliver safe, effective stretch service sessions. You also need empathy — the ability to connect with clients on a personal level, understand their frustrations, and create an environment where they feel comfortable and supported. The best {ct.name.toLowerCase()} specialists at Stretch Service combine clinical competence with genuine caring, and their clients feel the difference.
            </p>
            <p>
              The demand for stretch service therapists who specialize in {ct.name.toLowerCase()} is consistently strong across all 50 states. This client population often becomes loyal, long-term weekly clients because the benefits of professional assisted stretching are so significant for their specific needs. Weekly stretch service sessions provide cumulative improvements in flexibility, pain reduction, mobility, and overall quality of life. As a {ct.name.toLowerCase()} specialist, you will build a roster of dedicated clients who rely on you as an essential part of their wellness routine — and that reliability translates to consistent income and a deeply satisfying career.
            </p>
            <p>
              At $50/hr with no cap on sessions, the earning potential for {ct.name.toLowerCase()} specialists is excellent. Because this population tends to convert to weekly bookings at high rates, you can build a predictable schedule of recurring sessions that provide steady income week after week. Tips are common, especially as clients see results and develop trust in your expertise. Many {ct.name.toLowerCase()} specialists at Stretch Service earn $1,000-$1,500+ per week on part-time hours once they have established their client base.
            </p>
          </div>
        </div>
      </section>

      {/* Skills and Empathy Needed */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Skills &amp; Empathy Needed for {ct.name} Clients</h2>
          <div className="mt-6 space-y-4 text-base leading-relaxed text-slate-700">
            <p>
              Technical skill is the foundation, but empathy is what separates a good {ct.name.toLowerCase()} specialist from a great one. This client population often comes to stretch service sessions with a history of frustration — they have tried other treatments, dealt with chronic issues, or faced limitations that affect their daily life. Your ability to listen, validate their experience, and deliver results creates a therapeutic relationship that extends far beyond the physical stretching. When a client feels heard and helped, they become a client for life.
            </p>
            <p>
              On the technical side, you need deep knowledge of the specific conditions and limitations common to {ct.name.toLowerCase()}. This means understanding which muscles are typically shortened, which are weakened, where pain patterns originate, and what stretching approaches are most effective (and most safe) for this population. You should be proficient in PNF stretching, passive stretching, myofascial release, and gentle stretching techniques — and know when to apply each one based on the client&apos;s presentation. The ability to think on your feet and adapt mid-session is critical.
            </p>
            <p>
              Communication skills are essential. You need to clearly explain what you are doing and why, set realistic expectations for progress, provide encouragement when clients are frustrated, and give practical take-home recommendations between stretch service sessions. The best {ct.name.toLowerCase()} specialists educate their clients about their own bodies — helping them understand why they feel the way they do and what consistent stretching can do for their long-term health. This educational approach builds trust and positions you as an expert that clients want to see every week.
            </p>
          </div>
        </div>
      </section>

      {/* Common Conditions and Approaches */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Common Conditions &amp; Stretch Service Approaches</h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-slate-600">
            These are the most common issues {ct.name.toLowerCase()} present with. You should be confident addressing all of them through professional stretch service techniques.
          </p>
          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {ct.painPoints.map((pp) => (
              <div key={pp} className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-4">
                <span className="mt-0.5 text-teal-600 font-bold">&#10003;</span>
                <div>
                  <p className="text-sm font-bold text-slate-700">{pp}</p>
                  <p className="mt-1 text-xs text-slate-500">Address with targeted PNF, passive stretching, and myofascial release techniques customized for {ct.name.toLowerCase()}.</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-8 space-y-4 text-base leading-relaxed text-slate-700">
            <p>
              Each of these conditions requires a tailored approach. A one-size-fits-all stretching routine will not produce the results that {ct.name.toLowerCase()} need and deserve. As a stretch service specialist, you will learn to identify which condition is primary for each client, design a session that addresses the root cause (not just the symptoms), and build a progressive treatment plan that produces cumulative improvement over weeks and months of consistent stretch service sessions.
            </p>
            <p>
              For example, a client presenting with tight hip flexors and lower back pain may need a combination of PNF stretching for the hip flexors, passive stretching for the hamstrings, and myofascial release for the lumbar paraspinals. But the specific techniques, intensity, duration, and sequencing should be customized based on that individual&apos;s pain levels, flexibility baseline, injury history, and goals. This level of personalization is what makes Stretch Service sessions worth $99/hr to our clients — and what makes our therapists worth $50/hr to us.
            </p>
          </div>
        </div>
      </section>

      {/* Skills Needed */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Qualifications for {ct.name} Specialists</h2>
          <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-2">
            <div>
              <h3 className="text-lg font-bold text-slate-900 font-heading">Required Experience</h3>
              <div className="mt-4 space-y-3">
                {[
                  `Experience working with ${ct.name.toLowerCase()}`,
                  "Strong knowledge of anatomy and common conditions for this population",
                  "Ability to modify techniques based on client limitations",
                  "Excellent communication and empathy skills",
                  "Carry your own mat and arrive punctually to every session",
                  "Positive, encouraging attitude that builds client confidence",
                ].map((skill) => (
                  <div key={skill} className="flex items-start gap-3">
                    <span className="mt-0.5 text-teal-600 font-bold">&#10003;</span>
                    <p className="text-sm text-slate-700">{skill}</p>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 font-heading">Preferred Qualifications</h3>
              <div className="mt-4 space-y-3">
                {[
                  "Certified Stretch Therapist (CST) or equivalent",
                  "Licensed Massage Therapist (LMT)",
                  "Experience in physical therapy or rehabilitation settings",
                  "Training in PNF, myofascial release, or related modalities",
                  "CPR / First Aid certified",
                  "Knowledge of common medications and their effects on flexibility",
                ].map((qual) => (
                  <div key={qual} className="flex items-start gap-3">
                    <span className="mt-0.5 text-teal-600 font-bold">&#9733;</span>
                    <p className="text-sm text-slate-700">{qual}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stretch Service Techniques for This Population */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Stretch Service Techniques for {ct.name}</h2>
          <p className="mt-3 text-center text-base text-slate-600 max-w-2xl mx-auto">As a {ct.name.toLowerCase()} specialist, you should be proficient in these stretch service modalities. Each one has specific applications for this client population.</p>
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {services.map((svc) => (
              <Link key={svc.slug} href={`/jobs/service/${svc.slug}`}>
                <div className="group rounded-lg border border-slate-200 bg-white p-3 text-center transition-all hover:border-teal-400 hover:shadow-md">
                  <p className="text-sm font-bold text-slate-900 group-hover:text-teal-600 font-heading">{svc.name}</p>
                  <span className="mt-1 inline-block text-xs font-semibold text-teal-600 font-cta">Learn More &rarr;</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Where This Specialty Is in Demand */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Where {ct.name} Specialists Are in Demand</h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-slate-600">
            We need {ct.name.toLowerCase()} specialists in every state. Here&apos;s where stretch service clients are waiting:
          </p>
          <div className="mt-10 space-y-8">
            {majorStates.map((st) => {
              const stCities = getCitiesByState(st.slug);
              return (
                <div key={st.slug}>
                  <h3 className="text-lg font-bold text-slate-900 font-heading">
                    <Link href={`/jobs/${st.slug}`} className="text-teal-700 hover:text-teal-900">{st.name}</Link>{" "}
                    <span className="text-sm font-normal text-slate-500">({stCities.length} cities)</span>
                  </h3>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {stCities.slice(0, 10).map((c) => (
                      <Link key={c.slug} href={`/jobs/${st.slug}/${c.slug}`} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 transition-all hover:border-teal-400 hover:text-teal-700">
                        {c.name}
                      </Link>
                    ))}
                    {stCities.length > 10 && (
                      <Link href={`/jobs/${st.slug}`} className="rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700">
                        +{stCities.length - 10} more
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Job Details */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-4xl px-6">
          <div className="rounded-xl border border-teal-400 bg-teal-50 p-8 shadow-lg">
            <p className="text-xs font-semibold uppercase tracking-wider text-teal-600 font-cta">Position Details</p>
            <h2 className="mt-2 text-2xl font-bold text-slate-900 font-heading">Part-Time Mobile Stretch Therapist — {ct.name} Specialist</h2>
            <div className="mt-4 flex flex-wrap gap-3">
              <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold text-teal-700">Starting $50/hr</span>
              <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold text-teal-700">Part-Time / Flexible</span>
              <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold text-teal-700">7AM - 10PM Daily</span>
              <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold text-teal-700">Paid Within 30 Min</span>
              <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold text-teal-700">All 50 States</span>
            </div>
            <p className="mt-4 text-base text-slate-600 leading-relaxed">
              We&apos;re looking for therapists who are experienced and passionate about working with {ct.name.toLowerCase()}. You&apos;ll deliver mobile stretch therapy sessions tailored to this population&apos;s unique needs. Bring your own mat, show up on time with positive energy, and we handle marketing, scheduling, and payments. Clients pay $99/hr for their stretch service session — you earn $50/hr for every session completed.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">FAQ: {ct.name} Specialist Jobs</h2>
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

      {/* Other Client Specialties */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Other Client Specialties</h2>
          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {otherClientTypes.map((oc) => (
              <Link key={oc.slug} href={`/jobs/specialty/${oc.slug}`} className="rounded-xl border border-slate-200 bg-white p-4 text-center transition-all hover:border-teal-400 hover:shadow-md">
                <span className="text-2xl">{oc.emoji}</span>
                <h3 className="mt-2 text-sm font-bold text-slate-900 font-heading">{oc.name}</h3>
                <span className="mt-1 inline-block text-xs font-semibold text-teal-600 font-cta">View Jobs &rarr;</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Apply CTA */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 py-16">
        <div className="absolute inset-0 grid-bg opacity-20" />
        <div className="relative mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-2xl font-bold text-white font-heading">Apply as a {ct.name} Specialist</h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/80">
            Use your expertise with {ct.name.toLowerCase()} to earn $50/hour with Stretch Service. Flexible schedule, fast payment, and clients already booked for you.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a href="https://stretchjobs.com" target="_blank" rel="noopener noreferrer" className="inline-block rounded-lg bg-white px-8 py-3.5 text-base font-semibold text-teal-700 shadow-lg transition-colors hover:bg-teal-50 font-cta">Apply at stretchjobs.com</a>
            <a href="mailto:jobs@stretchservice.com?subject=Stretch%20Therapist%20Application" className="inline-block rounded-lg border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:border-white/60 font-cta">Email jobs@stretchservice.com</a>
          </div>
          <p className="mt-4 text-sm text-teal-200">Or call/text us at <a href={SITE_SMS_LINK} className="underline hover:text-white">{SITE_PHONE}</a></p>
        </div>
      </section>
    </>
  );
}
