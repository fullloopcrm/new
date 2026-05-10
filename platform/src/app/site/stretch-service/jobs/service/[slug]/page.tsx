// @ts-nocheck
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import {
  services,
  findServiceBySlug,
  states,
  getCitiesByState,
  clientTypes,
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
export const revalidate = 86400;

export async function generateStaticParams() {
  return services.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const s = findServiceBySlug(slug);
  if (!s) return {};
  return {
    title: `Become a ${s.name} Specialist — Stretch Service Jobs | $50/hr`,
    description: `Stretch Service is hiring ${s.name} specialists across all 50 states. $50/hr, flexible schedule, fast payment. ${s.shortDesc}`,
    alternates: { canonical: `${SITE_URL}/jobs/service/${s.slug}` },
  };
}

export default async function ServiceJobPage({ params }: Props) {
  const { slug } = await params;
  const s = findServiceBySlug(slug);
  if (!s) notFound();

  const otherServices = services.filter((os) => os.slug !== s.slug);
  const majorStates = states.filter((st) =>
    ["california", "new-york", "texas", "florida", "illinois", "pennsylvania", "ohio", "georgia", "north-carolina", "michigan"].includes(st.slug)
  );

  const faqItems = [
    { question: `What does a ${s.name} specialist do at Stretch Service?`, answer: `A ${s.name} specialist with Stretch Service delivers mobile ${s.name.toLowerCase()} sessions to clients at their homes, offices, hotels, parks, and other locations. You perform comprehensive mobility assessments, identify areas of restriction and pain, and deliver targeted ${s.name.toLowerCase()} therapy tailored to each client&apos;s unique needs. Sessions are 60 minutes and priced at $99/hr for clients. You earn $50/hr for each session delivered. Every session is different — one client might need ${s.name.toLowerCase()} for chronic back pain, while the next needs it for athletic recovery.` },
    { question: `What qualifications do I need to specialize in ${s.name}?`, answer: `You need hands-on experience performing ${s.name.toLowerCase()} techniques, strong knowledge of anatomy, kinesiology, and biomechanics, and the ability to assess client mobility and customize sessions accordingly. Preferred certifications include Certified Stretch Therapist (CST), Licensed Massage Therapist (LMT), NASM/ACE personal training certifications, or a physical therapy degree. Specific ${s.name.toLowerCase()} training or certification is a strong advantage. CPR/First Aid certification is also preferred.` },
    { question: `How much do ${s.name} specialists earn?`, answer: `${s.name} specialists at Stretch Service earn a starting rate of $50 per hour for every session delivered. There is no cap on sessions, so your weekly earnings depend on how many hours you work. Most specialists complete 4-6 sessions per active day, earning $200-$300+ daily before tips. Payment is processed within 30 minutes of session completion. Tips from clients add to your base rate, and ${s.name.toLowerCase()} specialists tend to get excellent tips because the results are so tangible and immediate.` },
    { question: `Where is ${s.name} in demand?`, answer: `${s.name} is in demand across all 50 states and 902+ cities where Stretch Service operates. The highest demand tends to be in major metro areas where populations of desk workers, athletes, seniors, and corporate clients are concentrated. States like California, New York, Texas, Florida, and Illinois consistently have the most ${s.name.toLowerCase()} bookings. However, every Stretch Service market has demand for ${s.name.toLowerCase()} — it is one of our most popular service types nationwide.` },
    { question: `Can I specialize exclusively in ${s.name}?`, answer: `While you can indicate ${s.name} as your primary specialty, we encourage all stretch service therapists to be proficient in multiple modalities. Clients sometimes request specific techniques, and being versatile increases your booking frequency. That said, if ${s.name.toLowerCase()} is your strongest skill, you will naturally be matched with clients who request it most often. Over time, you can build a reputation in your area as the go-to ${s.name.toLowerCase()} specialist.` },
    { question: `How do I apply as a ${s.name} specialist?`, answer: `Apply at stretchjobs.com, email jobs@stretchservice.com with "${s.name} Specialist" in the subject line, or text us at (888) 734-7274. In your application, highlight your specific ${s.name.toLowerCase()} experience and any relevant certifications. The onboarding process is fast — most therapists are approved and accepting sessions within 3-5 days. We verify credentials, review experience, and provide a brief orientation on Stretch Service standards and protocols.` },
  ];

  return (
    <>
      <JsonLd
        data={webPageSchema(
          `Become a ${s.name} Specialist — Stretch Service Jobs`,
          `Hiring ${s.name} specialists nationwide. $50/hr, flexible schedule.`,
          `${SITE_URL}/jobs/service/${s.slug}`
        )}
      />
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", url: SITE_URL },
          { name: "Jobs", url: `${SITE_URL}/jobs` },
          { name: s.name, url: `${SITE_URL}/jobs/service/${s.slug}` },
        ])}
      />
      <JsonLd data={faqSchema(faqItems)} />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 pt-36 pb-16 sm:pt-44 sm:pb-20">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">
            <Link href="/jobs" className="hover:text-white">Jobs</Link> / Service Specialty
          </p>
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">Specialist Position — {s.name} | $50/hr | Nationwide</p>
          <h1 className="text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl font-heading">
            Become a <span className="text-teal-200">{s.name}</span> Specialist
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/80">
            {s.tagline}. Join Stretch Service and deliver expert {s.name.toLowerCase()} sessions across the nation. Starting at $50/hour.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a href="https://stretchjobs.com" target="_blank" rel="noopener noreferrer" className="inline-block rounded-lg bg-white px-8 py-3.5 text-base font-semibold text-teal-700 shadow-lg transition-colors hover:bg-teal-50 font-cta">Apply at stretchjobs.com</a>
            <a href="mailto:jobs@stretchservice.com?subject=Stretch%20Therapist%20Application" className="inline-block rounded-lg border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:border-white/60 font-cta">Email jobs@stretchservice.com</a>
          </div>
        </div>
      </section>

      {/* Deep Description of This Service Specialty */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 font-heading">About Specializing in {s.name} at Stretch Service</h2>
          <div className="mt-6 space-y-4 text-base leading-relaxed text-slate-700">
            <p>
              {s.description} As a {s.name.toLowerCase()} specialist with Stretch Service, you will deliver this powerful modality to clients across the country, helping them achieve results they cannot get on their own. {s.name} is one of the most requested stretch service techniques, and therapists who excel in this area are consistently among our busiest and highest-earning team members.
            </p>
            <p>
              Specializing in {s.name.toLowerCase()} within the Stretch Service framework means you get to focus on the clinical work you love while we handle every aspect of the business. No marketing, no client acquisition, no scheduling software, no payment processing, no invoicing. You arrive at the client&apos;s location with your mat, assess their needs, deliver a world-class {s.name.toLowerCase()} session, and get paid within 30 minutes. The simplicity of this model allows you to see more clients, earn more money, and spend zero time on administrative tasks that drain your energy and eat into your earning hours.
            </p>
            <p>
              The demand for {s.name.toLowerCase()} specialists is driven by the specific benefits this technique provides. {s.shortDesc} These benefits resonate with a wide range of clients — from desk workers with chronic pain to athletes seeking peak performance. As awareness of professional assisted stretching grows across the United States, the demand for skilled {s.name.toLowerCase()} practitioners is growing with it. Stretch Service is at the forefront of this growth, and we need talented therapists to meet the demand.
            </p>
            <p>
              What sets Stretch Service {s.name.toLowerCase()} specialists apart from practitioners at traditional studios is the mobile, personalized nature of the service. You are not stretching someone in a crowded group class or a small studio room with thin walls. You are in their home, their office, their hotel room, or their favorite park — providing a private, one-on-one {s.name.toLowerCase()} experience that is customized entirely to their body and goals. This personal touch creates deeper client relationships, better outcomes, and more repeat bookings. Many of our {s.name.toLowerCase()} specialists develop loyal weekly client bases within their first few months.
            </p>
          </div>
        </div>
      </section>

      {/* What You Need to Know */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">What a {s.name} Specialist Does</h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-slate-600">
            As a {s.name.toLowerCase()} specialist with Stretch Service, you&apos;ll deliver these key elements in every session:
          </p>
          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {s.features.map((feat) => (
              <div key={feat} className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-4">
                <span className="mt-0.5 text-teal-600 font-bold">&#10003;</span>
                <p className="text-sm text-slate-700">{feat}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Skills & Certifications */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Skills &amp; Certifications for {s.name} Specialists</h2>
          <div className="mt-6 space-y-4 text-base leading-relaxed text-slate-700">
            <p>
              Becoming a successful {s.name.toLowerCase()} specialist at Stretch Service requires a combination of technical proficiency, anatomical knowledge, and interpersonal skills. On the technical side, you need hands-on experience performing {s.name.toLowerCase()} techniques with confidence and precision. You should be able to assess a client&apos;s mobility in the first five minutes of a session and build a customized treatment plan on the spot. Every client is different, and cookie-cutter approaches do not produce the results that keep clients coming back for weekly stretch service sessions.
            </p>
            <p>
              Anatomical knowledge is foundational. You need to understand how muscles, tendons, ligaments, and fascia interact during {s.name.toLowerCase()} movements. You should be able to identify compensatory patterns, recognize contraindications, and modify techniques for clients with injuries, limited mobility, or medical conditions. The best {s.name.toLowerCase()} specialists think like clinicians — every stretch has a purpose, every movement is intentional, and every session is designed to produce measurable improvement.
            </p>
            <p>
              Interpersonally, you need to be an excellent communicator who can explain techniques in plain language, build trust quickly, and create a comfortable environment in any setting. Stretch service sessions happen in intimate settings — clients&apos; homes, hotel rooms, private offices — and your ability to be professional, warm, and reassuring is what transforms a good session into an exceptional one. Clients who trust their therapist relax more deeply, which leads to better stretching outcomes, which leads to repeat bookings and referrals.
            </p>
          </div>
          <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-2">
            <div>
              <h3 className="text-lg font-bold text-slate-900 font-heading">Required Skills</h3>
              <div className="mt-4 space-y-3">
                {[
                  `Hands-on experience performing ${s.name.toLowerCase()} techniques`,
                  "Strong knowledge of anatomy, kinesiology, and biomechanics",
                  "Ability to assess client mobility and customize sessions",
                  "Clear communication to explain techniques to clients",
                  "Carry your own mat and arrive on time to every session",
                ].map((skill) => (
                  <div key={skill} className="flex items-start gap-3">
                    <span className="mt-0.5 text-teal-600 font-bold">&#10003;</span>
                    <p className="text-sm text-slate-700">{skill}</p>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 font-heading">Preferred Certifications</h3>
              <div className="mt-4 space-y-3">
                {[
                  "Certified Stretch Therapist (CST) or equivalent",
                  "Licensed Massage Therapist (LMT)",
                  "NASM, ACE, or NSCA Personal Training Certification",
                  "Physical Therapy Assistant or related degree",
                  "CPR / First Aid certified",
                ].map((cert) => (
                  <div key={cert} className="flex items-start gap-3">
                    <span className="mt-0.5 text-teal-600 font-bold">&#9733;</span>
                    <p className="text-sm text-slate-700">{cert}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Ideal Client Types */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Clients You&apos;ll Work With as a {s.name} Specialist</h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-slate-600">
            {s.name} is most popular with these client types. Understanding their unique needs and goals will make you a more effective and in-demand stretch service therapist.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            {s.idealFor.map((client) => (
              <span key={client} className="rounded-full bg-teal-50 px-4 py-2 text-sm font-medium text-teal-700">{client}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Where This Service Is in Demand */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Where {s.name} Specialists Are in Demand</h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-slate-600">
            We need {s.name.toLowerCase()} specialists in every state. Here are the areas with the highest demand and open positions for stretch service therapists:
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
                    {stCities.slice(0, 12).map((c) => (
                      <Link key={c.slug} href={`/jobs/${st.slug}/${c.slug}`} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 transition-all hover:border-teal-400 hover:text-teal-700">
                        {c.name}
                      </Link>
                    ))}
                    {stCities.length > 12 && (
                      <Link href={`/jobs/${st.slug}`} className="rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700">
                        +{stCities.length - 12} more
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
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-4xl px-6">
          <div className="rounded-xl border border-teal-400 bg-teal-50 p-8 shadow-lg">
            <p className="text-xs font-semibold uppercase tracking-wider text-teal-600 font-cta">Position Details</p>
            <h2 className="mt-2 text-2xl font-bold text-slate-900 font-heading">Part-Time Mobile Stretch Therapist — {s.name} Specialist</h2>
            <div className="mt-4 flex flex-wrap gap-3">
              <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold text-teal-700">Starting $50/hr</span>
              <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold text-teal-700">Part-Time / Flexible</span>
              <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold text-teal-700">7AM - 10PM Daily</span>
              <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold text-teal-700">Paid Within 30 Min</span>
              <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold text-teal-700">All 50 States</span>
            </div>
            <p className="mt-4 text-base text-slate-600 leading-relaxed">
              We&apos;re looking for therapists with strong {s.name.toLowerCase()} skills to join our growing team. You&apos;ll deliver mobile {s.name.toLowerCase()} sessions to clients across the country. Bring your own mat, bring your expertise, and we handle marketing, scheduling, and payments. Clients pay $99/hr for stretch service sessions — you earn $50/hr for every session you complete. Fast payment, flexible schedule, established clients.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">FAQ: {s.name} Specialist Jobs at Stretch Service</h2>
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

      {/* Other Service Specialties */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Other Stretch Service Specialties</h2>
          <p className="mt-3 text-center text-base text-slate-600">Explore other stretch service modalities. Many therapists are proficient in multiple specialties.</p>
          <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {otherServices.map((os) => (
              <Link key={os.slug} href={`/jobs/service/${os.slug}`} className="rounded-xl border border-slate-200 bg-white p-4 text-center transition-all hover:border-teal-400 hover:shadow-md">
                <h3 className="text-sm font-bold text-slate-900 font-heading">{os.name}</h3>
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
          <h2 className="text-2xl font-bold text-white font-heading">Apply as a {s.name} Specialist</h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/80">
            Put your {s.name.toLowerCase()} expertise to work. $50/hour, flexible schedule, fast payment, and clients already waiting for you.
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
