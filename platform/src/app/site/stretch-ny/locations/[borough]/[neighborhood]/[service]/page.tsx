// @ts-nocheck
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import {
  findBoroughBySlug,
  findNeighborhoodBySlug,
  findServiceBySlug,
  services,
  neighborhoods,
  getNeighborhoodUrl,
  getNeighborhoodServiceUrl,
  getBoroughUrl,
  getServiceUrl,
  getNeighborhoodsByBorough,
  SITE_URL,
  SITE_SMS_LINK,
  SITE_PHONE,
  SITE_PHONE_LINK,
} from "@/app/site/stretch-ny/_lib/siteData";
import {
  JsonLd,
  webPageSchema,
  breadcrumbSchema,
  faqSchema,
  serviceSchema,
  localBusinessSchema,
} from "@/app/site/stretch-ny/_lib/schema";
import Logo from "@/app/site/stretch-ny/_components/Logo";

interface Props {
  params: Promise<{ borough: string; neighborhood: string; service: string }>;
}

export const dynamicParams = true;
export const revalidate = 86400;
export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { borough, neighborhood, service: serviceSlug } = await params;
  const n = findNeighborhoodBySlug(borough, neighborhood);
  const s = findServiceBySlug(serviceSlug);
  if (!n || !s) return {};
  return {
    title: `${s.name} in ${n.name}, ${n.borough} | $99/hr Stretch Service`,
    description: `${s.name} stretch service in ${n.name}, ${n.borough}. $99 per hour mobile stretch service. 10% off weekly sessions. Certified therapists come to you in ${n.name}. Same-day available 7AM-10PM. Book ${s.name} in ${n.name} ${n.borough} today.`,
    alternates: {
      canonical: `${SITE_URL}${getNeighborhoodServiceUrl(n, s)}`,
    },
  };
}

export default async function NeighborhoodServicePage({ params }: Props) {
  const { borough, neighborhood, service: serviceSlug } = await params;
  const b = findBoroughBySlug(borough);
  const n = findNeighborhoodBySlug(borough, neighborhood);
  const s = findServiceBySlug(serviceSlug);
  if (!b || !n || !s) notFound();

  const otherServices = services
    .filter((sv) => sv.slug !== s.slug)
    .slice(0, 6);
  const boroughNeighborhoods = getNeighborhoodsByBorough(n.boroughSlug)
    .filter((nb) => nb.slug !== n.slug)
    .slice(0, 6);
  const pageUrl = `${SITE_URL}${getNeighborhoodServiceUrl(n, s)}`;
  const landmarkList = n.landmarks.join(", ");
  const firstTwoLandmarks = n.landmarks.slice(0, 2).join(" and ");
  const idealForList = s.idealFor.join(", ");

  const faqItems = [
    {
      question: `What is ${s.name} stretch service in ${n.name}, ${n.borough}?`,
      answer: `${s.name} stretch service in ${n.name}, ${n.borough} is a professional mobile stretching therapy delivered directly to your home, office, hotel, or any location in ${n.name}. ${s.description} Our certified stretch therapists bring all professional equipment to your door — no travel required on your part. ${s.name} in ${n.name} ${n.borough} is available seven days a week from 7AM to 10PM with same-day appointments.`,
    },
    {
      question: `How much does ${s.name} cost in ${n.name}?`,
      answer: `${s.name} stretch service in ${n.name} is $99 per hour for a single session. Weekly ${s.name} programs in ${n.name} are $89 per session — that is 10% off every session when you commit to a weekly schedule. Every session includes a full mobility assessment, professional equipment brought to your location anywhere in ${n.name}, ${n.borough}, and a personalized treatment plan. There are no hidden fees, no travel surcharges, and no membership requirements.`,
    },
    {
      question: `Can I get same-day ${s.name} in ${n.name}?`,
      answer: `Yes, same-day ${s.name} stretch service appointments are available in ${n.name} and throughout ${n.borough}. We maintain a network of certified stretch therapists across ${n.borough} so that someone is always available near ${n.name}. To book a same-day ${s.name} session in ${n.name}, text or call 212-202-7080. Morning, afternoon, and evening slots are available from 7AM to 10PM daily.`,
    },
    {
      question: `Who is ${s.name} in ${n.name} best for?`,
      answer: `${s.name} stretch service in ${n.name} is ideal for: ${idealForList}. Whether you are a long-time ${n.name} resident dealing with the physical demands of New York City life, a professional working in ${n.borough}, or a visitor staying near ${firstTwoLandmarks}, our therapists customize each ${s.name} session to your individual needs, fitness level, and goals. No prior stretching experience is required.`,
    },
    {
      question: `What should I wear for a ${s.name} session in ${n.name}?`,
      answer: `For your ${s.name} stretch service session in ${n.name}, wear comfortable, stretchy clothing that allows a full range of movement. Athletic wear, yoga pants, leggings, shorts, and t-shirts all work perfectly. Avoid jeans, belts, or restrictive clothing. You do not need to bring any equipment — your ${s.name} therapist brings everything needed to your ${n.name} location including a professional stretch table, mats, straps, and therapy tools.`,
    },
    {
      question: `How do I book ${s.name} in ${n.name}, ${n.borough}?`,
      answer: `Booking ${s.name} stretch service in ${n.name} takes less than two minutes. Text or call 212-202-7080 with your preferred date, time, and address in ${n.name}. We will confirm your appointment and assign a certified ${s.name} therapist who serves the ${n.name} area of ${n.borough}. You can also request a specific therapist if you have worked with us before. Walk-in and same-day appointments are welcome subject to availability.`,
    },
    {
      question: `How often should I get ${s.name} in ${n.name}?`,
      answer: `For best results, we recommend weekly ${s.name} stretch service sessions. Most ${n.name} clients see dramatic improvement in flexibility, pain reduction, and mobility within four to six weeks of consistent weekly sessions. Single sessions provide immediate relief and are great for tourists visiting ${n.name} or anyone looking for a one-time recovery session. Our weekly program at $89 per session (10% off the regular $99 rate) is designed for ${n.name} residents who want lasting results.`,
    },
    {
      question: `Is ${s.name} safe for beginners in ${n.name}?`,
      answer: `Absolutely. ${s.name} stretch service in ${n.name} is safe and appropriate for all fitness levels, including complete beginners. Your certified therapist performs a thorough mobility assessment before every session and adjusts all techniques to your current flexibility, comfort level, and any existing conditions. Whether you have never been professionally stretched before or you are an experienced athlete, your ${s.name} session in ${n.name} will be tailored specifically to you.`,
    },
    {
      question: `Can I get ${s.name} stretch service at my office in ${n.name}?`,
      answer: `Yes, our ${s.name} stretch service therapists regularly visit offices, coworking spaces, and commercial locations throughout ${n.name}, ${n.borough}. Many ${n.name} professionals book midday or after-work ${s.name} sessions right at their desk or in a conference room. Your therapist brings a portable stretch table and all necessary equipment, and setup takes only a few minutes. Office ${s.name} sessions in ${n.name} are a popular way to combat the neck pain, shoulder tension, and lower back stiffness that come from long hours at a computer. Corporate group rates are also available for ${n.name} offices that want to offer ${s.name} stretch service as an employee wellness benefit.`,
    },
    {
      question: `What makes ${s.name} in ${n.name} different from regular stretching on my own?`,
      answer: `Professional ${s.name} stretch service in ${n.name} delivers results that self-stretching simply cannot match. When you stretch on your own, your muscles engage to hold positions, which limits how deeply you can actually lengthen the tissue. With therapist-assisted ${s.name}, your body can fully relax while the therapist takes each muscle through its complete range of motion. Our ${n.name} therapists also use proprioceptive neuromuscular facilitation techniques, contract-relax protocols, and fascial release methods that are impossible to replicate solo. The combination of expert hands, professional equipment, and proven ${s.name} protocols means you achieve in one $99 session what might take weeks of self-stretching to accomplish.`,
    },
  ];

  return (
    <>
      <JsonLd
        data={webPageSchema(
          `${s.name} Stretch Service in ${n.name}, ${n.borough}`,
          `${s.shortDesc} Professional ${s.name} stretch service available in ${n.name}, ${n.borough}. $99/hr. 10% off weekly.`,
          pageUrl
        )}
      />
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", url: SITE_URL },
          { name: "Locations", url: `${SITE_URL}/locations` },
          { name: n.borough, url: `${SITE_URL}${getBoroughUrl(b)}` },
          { name: n.name, url: `${SITE_URL}${getNeighborhoodUrl(n)}` },
          { name: s.name, url: pageUrl },
        ])}
      />
      <JsonLd
        data={serviceSchema(
          s.name,
          s.description,
          pageUrl,
          `${n.name}, ${n.borough}`
        )}
      />
      <JsonLd data={faqSchema(faqItems)} />
      <JsonLd data={localBusinessSchema(n.name, n.borough)} />

      {/* ── Section 1: Hero ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 pt-36 pb-16 sm:pt-44 sm:pb-20">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">
            {n.borough} / {n.name} | $99/hr Mobile Stretch Service
          </p>
          <h1 className="text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl font-heading">
            {s.name} in{" "}
            <span className="text-teal-200">
              {n.name}, {n.borough}
            </span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/80">
            Professional {s.name.toLowerCase()} in {n.name}, {n.borough}. {s.tagline}. Mobile stretch service to your location. Certified therapists. Same-day available. $99/hr, 10% off weekly at $89/session.
          </p>
          <div className="mx-auto mt-6 flex flex-wrap items-center justify-center gap-4 text-sm font-semibold text-teal-100">
            <span className="rounded-full border border-teal-300/40 bg-teal-600/40 px-4 py-1.5">
              $99 Per Hour
            </span>
            <span className="rounded-full border border-teal-300/40 bg-teal-600/40 px-4 py-1.5">
              10% Off Weekly
            </span>
            <span className="rounded-full border border-teal-300/40 bg-teal-600/40 px-4 py-1.5">
              Same-Day Available
            </span>
            <span className="rounded-full border border-teal-300/40 bg-teal-600/40 px-4 py-1.5">
              7AM - 10PM Daily
            </span>
          </div>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a href={SITE_SMS_LINK}>
              <span className="inline-block rounded-lg bg-white px-8 py-3.5 text-base font-semibold text-teal-700 shadow-lg transition-colors hover:bg-teal-50 font-cta">
                Text {SITE_PHONE}
              </span>
            </a>
            <a href={SITE_PHONE_LINK}>
              <span className="inline-block rounded-lg border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:border-white/60 font-cta">
                Call {SITE_PHONE}
              </span>
            </a>
            <Link href={getServiceUrl(s)}>
              <span className="inline-block rounded-lg border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:border-white/60 font-cta">
                Full {s.name} Guide
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Section 2: About This Service in This Neighborhood (600+ words) ── */}
      <section className="bg-section-white py-16 sm:py-20">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl font-heading">
            About {s.name} Stretch Service in {n.name}, {n.borough}
          </h2>

          <p className="mt-6 text-base leading-relaxed text-slate-600">
            {s.name} stretch service in {n.name}, {n.borough} is a fully mobile,
            professionally delivered stretching therapy that comes directly to
            your door. {s.description} When you book {s.name} in {n.name}, a
            certified stretch therapist arrives at your home, office, hotel, gym,
            or any location in the neighborhood with all the professional
            equipment needed for a complete session. There is nothing for you to
            buy, no studio to travel to, and no membership to sign. You simply
            text or call {SITE_PHONE}, choose a time that works for your
            schedule, and your {s.name} therapist handles the rest.
          </p>

          <p className="mt-4 text-base leading-relaxed text-slate-600">
            {n.name} is one of {n.borough}&apos;s most distinctive neighborhoods.{" "}
            {n.description} The {n.vibe.toLowerCase()} atmosphere of {n.name}{" "}
            means residents and visitors here lead active, demanding lives — and
            that is exactly why {s.name} stretch service has become so popular in
            this part of {n.borough}. Whether you spend your days walking between{" "}
            {firstTwoLandmarks}, commuting to work from {n.name}, sitting at a
            desk in a {n.borough} office, or training at a local gym, the
            physical toll adds up. Tight hip flexors from sitting on the subway,
            stiff shoulders from hunching over a laptop, sore calves from
            navigating {n.name}&apos;s sidewalks, lower back pain from standing
            on crowded trains — these are the daily realities that make{" "}
            {s.name} stretch service not just beneficial but essential for{" "}
            {n.name} residents.
          </p>

          <p className="mt-4 text-base leading-relaxed text-slate-600">
            Our {s.name} therapists who serve {n.name} are intimately familiar
            with this neighborhood and the specific physical demands of living
            here. They understand that {n.name} residents need more than a
            generic stretching routine. Each {s.name} session in {n.name} begins
            with a comprehensive mobility assessment where your therapist
            evaluates your current range of motion, identifies tight areas and
            imbalances, and discusses your goals and any pain points. From there,
            your therapist designs a customized {s.name} protocol targeting your
            specific needs. This is not a one-size-fits-all approach. The{" "}
            {s.name} stretch service you receive in {n.name} is built around
            your body, your lifestyle, and your goals.
          </p>

          <p className="mt-4 text-base leading-relaxed text-slate-600">
            {s.name} in {n.name} {n.borough} addresses the root causes of
            stiffness, pain, and restricted mobility. Unlike massage, which
            focuses on muscle relaxation, {s.name} stretch service actively
            lengthens your muscles, improves joint mobility, and retrains your
            nervous system to allow greater range of motion. The results are
            measurable: most clients experience a significant improvement in
            flexibility after their very first {s.name} session in {n.name}.
            With consistent weekly sessions, {n.name} clients typically achieve
            dramatic improvements in overall mobility, reduced chronic pain, and
            noticeably better posture within four to six weeks. That is why so
            many {n.name} residents choose to enroll in our weekly {s.name}{" "}
            program at just $89 per session — a 10% savings over the standard
            $99 per hour rate.
          </p>

          <p className="mt-4 text-base leading-relaxed text-slate-600">
            The convenience factor of booking {s.name} stretch service in{" "}
            {n.name} cannot be overstated. In a city where time is your most
            valuable resource, eliminating the commute to a studio saves you
            anywhere from thirty minutes to over an hour of travel time. Your{" "}
            {s.name} therapist arrives at your {n.name} location ready to work,
            sets up in minutes in any space large enough for a stretch table, and
            delivers a full sixty-minute professional session. When the session
            is over, you are already home. You can shower, relax, hydrate, and
            let the benefits of your {s.name} session set in without battling{" "}
            {n.borough} traffic or crowded trains. For {n.name} residents who
            value their time, this mobile {s.name} stretch service is a game
            changer.
          </p>

          <p className="mt-4 text-base leading-relaxed text-slate-600">
            We serve all of {n.name} and the surrounding {n.borough}{" "}
            neighborhoods. If you live near {landmarkList}, or anywhere else in{" "}
            {n.name}, our {s.name} stretch service team can reach you. We
            service apartments, brownstones, co-ops, condos, houses, offices,
            hotel rooms, and even outdoor spaces in {n.name}. Some {n.name}{" "}
            clients prefer to be stretched in a nearby park or green space on
            nice days — and we are happy to accommodate that as well. The
            flexibility of our mobile {s.name} stretch service means your
            session happens wherever is most comfortable and convenient for you
            in {n.name}, {n.borough}.
          </p>
        </div>
      </section>

      {/* ── Section 3: Key Benefits ── */}
      <section className="bg-section-teal py-16 sm:py-20">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl font-heading">
            Key Benefits of {s.name} Stretch Service in {n.name}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            Every {s.name} stretch service session in {n.name} delivers a
            comprehensive set of benefits that go beyond simple flexibility
            improvement. Our certified therapists use proven techniques to
            address the specific physical challenges that {n.name},{" "}
            {n.borough} residents face every day. Here are the core benefits you
            can expect from your {s.name} session.
          </p>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {s.features.map((feature, i) => (
              <div
                key={i}
                className="flex gap-3 rounded-lg border border-teal-200/60 bg-white p-5"
              >
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-700">
                  {i + 1}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {feature}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-slate-500">
                    This benefit of {s.name} stretch service is especially
                    valuable for {n.name} residents who deal with the physical
                    demands of daily life in {n.borough}. Your therapist ensures
                    you experience this benefit fully during every session.
                  </p>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-6 text-base leading-relaxed text-slate-600">
            These benefits compound over time. While a single {s.name} stretch
            service session in {n.name} provides immediate relief and noticeable
            improvement, consistent weekly sessions create lasting changes in
            your flexibility, posture, pain levels, and overall quality of life.
            Most {n.name} clients who commit to the weekly {s.name} program at
            $89 per session report that they wish they had started sooner.
          </p>
        </div>
      </section>

      {/* ── Section 4: Why Residents Choose (400+ words) ── */}
      <section className="bg-section-white py-16 sm:py-20">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl font-heading">
            Why {n.name} Residents Choose {s.name} Stretch Service
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            {n.name} is a neighborhood where people expect quality, convenience,
            and results. That is why {s.name} stretch service has become one of
            the most popular wellness services in this part of {n.borough}. Here
            are the four primary reasons {n.name} residents consistently choose{" "}
            {s.name} from Stretch NYC.
          </p>
          <div className="mt-8 space-y-6">
            <div className="flex gap-4">
              <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-100 text-sm font-bold text-teal-700">
                1
              </span>
              <div>
                <h3 className="text-lg font-bold text-slate-900 font-heading">
                  True Mobile Convenience in {n.name}
                </h3>
                <p className="mt-2 text-base leading-relaxed text-slate-600">
                  Our {s.name} stretch service comes directly to your {n.name}{" "}
                  location — your apartment, your office, your hotel, or any
                  space you choose. There is no commute, no parking, no subway
                  ride, and no waiting room. In a neighborhood like {n.name}{" "}
                  where your time is precious, eliminating travel to and from a
                  studio is a significant advantage. Your {s.name} therapist
                  arrives with a professional stretch table, mats, straps, and
                  all therapy tools. Setup takes less than five minutes in any
                  room with enough space, and cleanup is equally fast. You get to
                  stay in your comfortable {n.name} home environment throughout
                  the entire experience.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-100 text-sm font-bold text-teal-700">
                2
              </span>
              <div>
                <h3 className="text-lg font-bold text-slate-900 font-heading">
                  NYC-Specific Expertise for {n.name} Lifestyles
                </h3>
                <p className="mt-2 text-base leading-relaxed text-slate-600">
                  Our {s.name} therapists who serve {n.name} understand the
                  unique physical demands of living in this {n.borough}{" "}
                  neighborhood. The daily commute, the miles of walking, the desk
                  work, the stress of city living — all of it creates specific
                  patterns of tension and restriction that our therapists are
                  trained to identify and address. When you book {s.name} in{" "}
                  {n.name}, you are getting a therapist who knows exactly what{" "}
                  {n.borough} bodies need because they work in this borough every
                  single day. That local expertise translates to faster results
                  and more effective sessions.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-100 text-sm font-bold text-teal-700">
                3
              </span>
              <div>
                <h3 className="text-lg font-bold text-slate-900 font-heading">
                  Same-Day Availability Throughout {n.name}
                </h3>
                <p className="mt-2 text-base leading-relaxed text-slate-600">
                  Life in {n.name} does not follow a predictable schedule, and
                  neither does your body. That is why we offer same-day{" "}
                  {s.name} stretch service appointments throughout {n.name} and
                  all of {n.borough}. Whether you wake up with a stiff neck,
                  throw out your back at the gym, or simply decide today is the
                  day you finally address that chronic tightness, we can have a
                  certified {s.name} therapist at your {n.name} door within
                  hours. We operate from 7AM to 10PM every single day including
                  weekends and holidays, because {n.name} residents need
                  flexibility in their scheduling just as much as in their
                  bodies.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-100 text-sm font-bold text-teal-700">
                4
              </span>
              <div>
                <h3 className="text-lg font-bold text-slate-900 font-heading">
                  Proven, Results-Driven {s.name} Approach
                </h3>
                <p className="mt-2 text-base leading-relaxed text-slate-600">
                  {s.tagline}. When {n.name} residents invest $99 per hour in{" "}
                  {s.name} stretch service, they expect measurable results — and
                  that is exactly what we deliver. Every session includes
                  before-and-after range of motion checks so you can see and feel
                  the improvement. Our therapists track your progress over time
                  and adjust your {s.name} protocol as your flexibility improves.{" "}
                  {n.name} clients are not paying for a relaxation session (
                  though it certainly feels amazing). They are investing in a
                  professional therapeutic service that delivers quantifiable
                  improvements in flexibility, mobility, and pain reduction with
                  every single visit.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 5: What a Session Looks Like (300+ words) ── */}
      <section className="bg-section-teal py-16 sm:py-20">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl font-heading">
            What a {s.name} Session Looks Like in {n.name}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            Wondering what to expect when you book {s.name} stretch service in{" "}
            {n.name}, {n.borough}? Here is a complete walkthrough of your
            session from start to finish so you know exactly what happens when
            your certified stretch therapist arrives at your {n.name} location.
          </p>

          <div className="mt-8 space-y-6">
            <div className="rounded-lg border border-teal-200/60 bg-white p-5">
              <h3 className="text-base font-bold text-slate-900 font-heading">
                Step 1: Booking Your {s.name} Session
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                You text or call {SITE_PHONE} and let us know you want to book{" "}
                {s.name} in {n.name}. Share your preferred date, time, and
                address. We confirm your appointment within minutes and assign a
                certified {s.name} therapist who regularly serves the {n.name}{" "}
                area of {n.borough}. Same-day bookings are welcome.
              </p>
            </div>

            <div className="rounded-lg border border-teal-200/60 bg-white p-5">
              <h3 className="text-base font-bold text-slate-900 font-heading">
                Step 2: Your Therapist Arrives in {n.name}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                At your scheduled time, your {s.name} therapist arrives at your{" "}
                {n.name} address carrying a professional stretch table, padded
                mats, therapy straps, and any other equipment needed for your
                session. Setup takes approximately three to five minutes. Your
                therapist is familiar with {n.name} and the surrounding{" "}
                {n.borough} area, so they arrive promptly whether you live near{" "}
                {firstTwoLandmarks} or anywhere else in the neighborhood.
              </p>
            </div>

            <div className="rounded-lg border border-teal-200/60 bg-white p-5">
              <h3 className="text-base font-bold text-slate-900 font-heading">
                Step 3: Mobility Assessment
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Before any stretching begins, your therapist performs a
                comprehensive mobility assessment. They evaluate your current
                range of motion in key areas — hips, shoulders, spine, hamstrings,
                and more. They ask about any pain, tightness, injuries, or goals
                you have. This assessment ensures your {s.name} session in{" "}
                {n.name} is precisely tailored to what your body needs today, not
                a generic routine.
              </p>
            </div>

            <div className="rounded-lg border border-teal-200/60 bg-white p-5">
              <h3 className="text-base font-bold text-slate-900 font-heading">
                Step 4: Your Full {s.name} Session (60 Minutes)
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Your therapist guides you through a full sixty-minute {s.name}{" "}
                protocol customized to your assessment results. {s.shortDesc}{" "}
                Throughout the session, your therapist communicates with you
                about pressure, depth, and comfort to ensure maximum benefit
                without exceeding your limits. Most {n.name} clients describe
                the experience as deeply relaxing yet incredibly effective.
              </p>
            </div>

            <div className="rounded-lg border border-teal-200/60 bg-white p-5">
              <h3 className="text-base font-bold text-slate-900 font-heading">
                Step 5: Post-Session Review and Recommendations
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                After your {s.name} session, your therapist reviews the areas
                addressed, discusses what they found during the session, and
                provides personalized recommendations for maintaining your
                results between sessions. If you are a {n.name} resident
                interested in ongoing {s.name} stretch service, they will
                discuss the weekly program option at $89 per session — 10% off
                every visit. Your therapist packs up, and you are already home in{" "}
                {n.name} feeling dramatically better.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 6: Pricing ── */}
      <section className="bg-section-white py-16 sm:py-20">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-center text-2xl font-bold text-slate-900 sm:text-3xl font-heading">
            {s.name} Stretch Service Pricing in {n.name}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base leading-relaxed text-slate-600">
            Simple, transparent pricing for {s.name} stretch service in{" "}
            {n.name}, {n.borough}. No hidden fees, no travel surcharges, no
            memberships required. Every session includes a full mobility
            assessment and all professional equipment brought to your {n.name}{" "}
            location.
          </p>

          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="rounded-xl border-2 border-slate-200 bg-white p-8 text-center">
              <h3 className="text-lg font-bold text-slate-900 font-heading">
                Single Session
              </h3>
              <p className="mt-2 text-4xl font-bold text-teal-600 font-heading">
                $99
              </p>
              <p className="mt-1 text-sm text-slate-500">per hour</p>
              <ul className="mt-6 space-y-2 text-left text-sm text-slate-600">
                <li className="flex gap-2">
                  <span className="text-teal-600">&#10003;</span> 60-minute{" "}
                  {s.name} session
                </li>
                <li className="flex gap-2">
                  <span className="text-teal-600">&#10003;</span> Full mobility
                  assessment included
                </li>
                <li className="flex gap-2">
                  <span className="text-teal-600">&#10003;</span> All equipment
                  brought to your {n.name} location
                </li>
                <li className="flex gap-2">
                  <span className="text-teal-600">&#10003;</span> Same-day
                  availability
                </li>
                <li className="flex gap-2">
                  <span className="text-teal-600">&#10003;</span> No membership
                  or commitment
                </li>
                <li className="flex gap-2">
                  <span className="text-teal-600">&#10003;</span> Cash, card,
                  Venmo, Zelle, CashApp
                </li>
              </ul>
              <a href={SITE_SMS_LINK} className="mt-6 block">
                <span className="inline-block w-full rounded-lg bg-teal-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-teal-700 font-cta">
                  Book Single Session
                </span>
              </a>
            </div>

            <div className="rounded-xl border-2 border-teal-500 bg-white p-8 text-center shadow-lg">
              <div className="mb-2 inline-block rounded-full bg-teal-100 px-3 py-0.5 text-xs font-bold text-teal-700">
                BEST VALUE — 10% OFF
              </div>
              <h3 className="text-lg font-bold text-slate-900 font-heading">
                Weekly Program
              </h3>
              <p className="mt-2 text-4xl font-bold text-teal-600 font-heading">
                $89
              </p>
              <p className="mt-1 text-sm text-slate-500">
                per session &middot; weekly
              </p>
              <ul className="mt-6 space-y-2 text-left text-sm text-slate-600">
                <li className="flex gap-2">
                  <span className="text-teal-600">&#10003;</span> 60-minute{" "}
                  {s.name} session every week
                </li>
                <li className="flex gap-2">
                  <span className="text-teal-600">&#10003;</span> 10% off every
                  session ($10 saved per week)
                </li>
                <li className="flex gap-2">
                  <span className="text-teal-600">&#10003;</span> Priority
                  scheduling in {n.name}
                </li>
                <li className="flex gap-2">
                  <span className="text-teal-600">&#10003;</span> Same therapist
                  continuity
                </li>
                <li className="flex gap-2">
                  <span className="text-teal-600">&#10003;</span> Progress
                  tracking and plan adjustment
                </li>
                <li className="flex gap-2">
                  <span className="text-teal-600">&#10003;</span> Cancel or
                  pause any time
                </li>
              </ul>
              <a href={SITE_SMS_LINK} className="mt-6 block">
                <span className="inline-block w-full rounded-lg bg-teal-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-teal-700 font-cta">
                  Start Weekly Program
                </span>
              </a>
            </div>
          </div>

          <p className="mt-8 text-center text-sm text-slate-500">
            Corporate and group {s.name} rates available for {n.name} offices
            and teams.{" "}
            <Link
              href="/corporate-wellness"
              className="font-semibold text-teal-600 hover:text-teal-700"
            >
              Learn about corporate wellness programs
            </Link>
            .
          </p>
        </div>
      </section>

      {/* ── Section 7: The Science Behind This Service (400+ words) ── */}
      <section className="bg-section-teal py-16 sm:py-20">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl font-heading">
            The Science Behind {s.name} for {n.name} Residents
          </h2>

          <p className="mt-6 text-base leading-relaxed text-slate-600">
            Understanding the science behind {s.name} stretch service helps
            explain why it is so effective for the specific types of pain,
            tightness, and mobility restrictions that {n.name}, {n.borough}{" "}
            residents experience every day. Professional {s.name} stretch service
            works on multiple physiological systems simultaneously — your muscles,
            your fascia, your nervous system, and your joints — to produce results
            that go far beyond what static stretching or foam rolling can achieve
            on their own. At $99 per hour, every {s.name} session in {n.name}{" "}
            applies evidence-based techniques grounded in exercise science and
            neuromuscular research.
          </p>

          <p className="mt-4 text-base leading-relaxed text-slate-600">
            One of the primary mechanisms behind {s.name} stretch service is
            proprioceptive neuromuscular facilitation, commonly known as PNF
            stretching. PNF techniques involve cycles of targeted muscle
            contraction followed by assisted relaxation and lengthening. When your{" "}
            {s.name} therapist in {n.name} asks you to gently push against their
            hands and then relax, they are engaging the Golgi tendon organs in
            your muscles. These sensory receptors detect changes in muscle tension
            and, when stimulated through PNF protocols, signal the nervous system
            to reduce protective muscle guarding. The result is a measurable
            increase in range of motion that occurs within a single session.
            Research published in the Journal of Strength and Conditioning Research
            has consistently shown that PNF-based stretch service techniques
            produce greater flexibility gains than passive stretching alone. For{" "}
            {n.name} residents dealing with chronically tight hip flexors from
            subway commuting or locked-up shoulders from desk work, PNF-based{" "}
            {s.name} stretch service addresses the neurological component of
            tightness that most people never target on their own.
          </p>

          <p className="mt-4 text-base leading-relaxed text-slate-600">
            Fascial science is another critical component of the {s.name} stretch
            service your therapist delivers in {n.name}. Fascia is the
            interconnected web of connective tissue that surrounds every muscle,
            bone, nerve, and organ in your body. When fascia becomes dehydrated,
            restricted, or adhered — which happens naturally from the repetitive
            movement patterns and prolonged sitting common among {n.name}{" "}
            residents — it limits your range of motion and can generate pain that
            feels muscular but actually originates in the fascial network. Your{" "}
            {s.name} therapist uses slow, sustained stretching techniques combined
            with gentle traction and compression to rehydrate fascial tissue,
            break up adhesions, and restore the smooth gliding between tissue
            layers that allows full, pain-free movement. This fascial release work
            is particularly valuable for {n.name} clients who sit for extended
            periods, carry heavy bags through {n.borough}, or stand for long
            shifts at work.
          </p>

          <p className="mt-4 text-base leading-relaxed text-slate-600">
            Your nervous system plays a central role in how much range of motion
            your body allows at any given moment. Chronic stress, insufficient
            movement, and pain all cause the nervous system to increase baseline
            muscle tone as a protective mechanism — essentially keeping your
            muscles partially contracted at all times. For {n.name} residents
            navigating the high-stress environment of {n.borough}, this elevated
            resting muscle tone is extremely common and contributes to the
            persistent neck tension, jaw clenching, rounded shoulders, and lower
            back stiffness that so many New Yorkers accept as normal. {s.name}{" "}
            stretch service works directly with the nervous system through
            rhythmic breathing cues, gradual progressive loading, and sustained
            holds that activate the parasympathetic nervous system. As your body
            shifts from a sympathetic fight-or-flight state into a
            parasympathetic rest-and-restore state during your {s.name} session in{" "}
            {n.name}, your nervous system releases its protective grip on your
            muscles. This is why so many clients report feeling not only more
            flexible but calmer, less stressed, and more mentally clear after a{" "}
            {s.name} session. The stretch service is working on your mind and body
            simultaneously.{" "}
            <Link
              href={getServiceUrl(s)}
              className="font-semibold text-teal-600 hover:text-teal-700"
            >
              Learn more about {s.name} techniques in our full guide
            </Link>
            .
          </p>

          <p className="mt-4 text-base leading-relaxed text-slate-600">
            Joint mobilization is the final pillar of the science behind {s.name}{" "}
            stretch service in {n.name}. Over time, joints that are not regularly
            taken through their full range of motion develop restrictions in the
            joint capsule itself. Your {s.name} therapist applies gentle,
            controlled movements that take each joint through progressively
            greater ranges of motion, stimulating the production of synovial
            fluid that lubricates the joint and nourishes the cartilage. This is
            especially important for {n.name} residents who are concerned about
            long-term joint health. Regular {s.name} stretch service sessions at
            $99 per hour help maintain healthy joint mobility, reduce the risk of
            degenerative changes, and keep your body moving freely whether you
            are walking through {n.name}, climbing subway stairs in {n.borough},
            or training at your local gym.
          </p>
        </div>
      </section>

      {/* ── Section 8: Your First Session in This Neighborhood (300+ words) ── */}
      <section className="bg-section-white py-16 sm:py-20">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl font-heading">
            Your First {s.name} Session in {n.name}
          </h2>

          <p className="mt-6 text-base leading-relaxed text-slate-600">
            If you have never booked a professional {s.name} stretch service
            session before, here is exactly what your first experience looks like
            from start to finish in {n.name}, {n.borough}. We want you to feel
            completely prepared and confident before your therapist arrives, so
            there are no surprises and you can focus entirely on the session
            itself.
          </p>

          <p className="mt-4 text-base leading-relaxed text-slate-600">
            Booking your first {s.name} stretch service session in {n.name} is
            simple. Text or call {SITE_PHONE} and share your {n.name} address,
            your preferred date and time, and a brief description of what you are
            hoping to address — whether that is general tightness, a specific pain
            area, athletic recovery, or simply wanting to improve your overall
            flexibility. Our scheduling team confirms your appointment within
            minutes and assigns a certified {s.name} therapist who regularly
            serves the {n.name} area of {n.borough}. If you are near{" "}
            {firstTwoLandmarks}, your therapist likely lives or works nearby and
            knows the neighborhood well. Therapists who drive in {n.name} use
            metered street parking or nearby garages. Those arriving by transit
            use the closest subway station or bus routes serving {n.name}. Either
            way, they arrive on time carrying all professional equipment.
          </p>

          <p className="mt-4 text-base leading-relaxed text-slate-600">
            When your {s.name} therapist arrives at your {n.name} location, the
            first ten minutes are dedicated to a thorough intake and mobility
            assessment. Your therapist asks about your medical history, any
            current injuries or conditions, your daily activities and habits in{" "}
            {n.name}, and your goals for the session. They then perform a series
            of gentle range-of-motion tests on your major joints — shoulders,
            hips, spine, ankles — to establish a baseline. This assessment is
            crucial because it ensures your {s.name} session is built around your
            body as it is today, not a generic template. Your therapist takes
            notes and will reference these baselines in future sessions to track
            your progress over time.
          </p>

          <p className="mt-4 text-base leading-relaxed text-slate-600">
            The {s.name} stretch service session itself lasts a full sixty minutes
            of hands-on work. Your therapist guides you through a series of
            assisted stretches, each one held for the optimal duration to produce
            lasting flexibility gains. You remain fully clothed in comfortable
            athletic wear throughout the session. Your therapist communicates
            constantly, asking about your comfort level and adjusting pressure and
            depth in real time. Most first-time {n.name} clients are surprised by
            how relaxing the experience feels while simultaneously producing
            dramatic improvements in their range of motion. When the session ends,
            your therapist walks you through aftercare recommendations:
            hydrating well for the rest of the day, taking a short walk around{" "}
            {n.name} to keep your muscles warm, avoiding intense exercise for
            twelve to twenty-four hours, and noting any areas of soreness which
            are normal after a first session. Your therapist then discusses
            scheduling your next {s.name} session in {n.name} — whether that is a
            single follow-up at $99 per hour or enrolling in the weekly program at
            $89 per session for consistent results with a 10% discount on every
            visit.
          </p>
        </div>
      </section>

      {/* ── Section 9: Service vs Other Treatments (300+ words) ── */}
      <section className="bg-section-teal py-16 sm:py-20">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl font-heading">
            {s.name} vs Other Treatments in {n.name}
          </h2>

          <p className="mt-6 text-base leading-relaxed text-slate-600">
            {n.name}, {n.borough} residents have many wellness options available
            to them, from massage studios and yoga classes to chiropractic offices
            and physical therapy clinics. So how does {s.name} stretch service
            compare to these alternatives, and when is {s.name} the right choice
            for you? Understanding the differences helps you make an informed
            decision about which treatment best addresses the specific issues you
            face as a {n.name} resident.
          </p>

          <p className="mt-4 text-base leading-relaxed text-slate-600">
            <strong className="text-slate-900">{s.name} Stretch Service vs Massage in {n.name}:</strong>{" "}
            Massage therapy focuses primarily on relieving muscle tension through
            compression, kneading, and pressure techniques. It is excellent for
            relaxation and reducing acute muscle soreness. However, massage does
            not actively lengthen your muscles or improve your range of motion.{" "}
            {s.name} stretch service takes a fundamentally different approach by
            actively moving your joints through progressively greater ranges of
            motion while your muscles are in a relaxed state. The result is that
            you leave a {s.name} session in {n.name} with measurably greater
            flexibility and mobility — not just temporary relief from tension.
            Many {n.name} clients alternate between massage and {s.name} stretch
            service, using massage for recovery and {s.name} for functional
            improvement. At $99 per hour, {s.name} stretch service in {n.name}{" "}
            also comes to you, eliminating the need to travel to a massage studio
            in {n.borough}.
          </p>

          <p className="mt-4 text-base leading-relaxed text-slate-600">
            <strong className="text-slate-900">{s.name} Stretch Service vs Yoga in {n.name}:</strong>{" "}
            Yoga offers many benefits including mindfulness, strength building,
            and flexibility improvement through self-directed poses. The
            limitation of yoga for {n.name} residents dealing with significant
            tightness or pain is that it requires you to use your own muscles to
            hold positions, which inherently limits how deeply you can stretch.
            When your muscles are both the stretcher and the thing being
            stretched, you hit a ceiling. {s.name} stretch service removes this
            limitation entirely. Your therapist does the work while your body
            relaxes, allowing stretches to go significantly deeper than anything
            you can achieve in a yoga class. Additionally, {s.name} stretch
            service in {n.name} is one-on-one, fully customized to your body,
            and delivered at your location — compared to a group yoga class at a{" "}
            {n.borough} studio where the instructor cannot tailor every pose to
            your individual needs.
          </p>

          <p className="mt-4 text-base leading-relaxed text-slate-600">
            <strong className="text-slate-900">{s.name} Stretch Service vs Chiropractic in {n.name}:</strong>{" "}
            Chiropractic care focuses on spinal alignment and joint manipulation
            through high-velocity adjustments. It can be effective for acute
            joint issues and certain types of back pain. {s.name} stretch service
            takes a complementary but distinct approach by working on the soft
            tissue — muscles, fascia, and tendons — that surrounds and supports
            your joints. Many {n.name} residents find that their joints feel
            misaligned precisely because the surrounding soft tissue is tight and
            pulling them out of position. By restoring proper muscle length and
            fascial mobility through {s.name} stretch service, the joints
            naturally return to better alignment without forceful manipulation.
            Several {n.name} chiropractors actively recommend {s.name} stretch
            service to their patients as a complementary therapy. At $99 per hour
            with mobile delivery anywhere in {n.name}, {s.name} stretch service
            is also more accessible than repeated chiropractic office visits that
            require travel across {n.borough} and time spent in waiting rooms.
          </p>
        </div>
      </section>

      {/* ── Section 10: FAQ (10 questions) ── */}
      <section className="bg-section-white py-16 sm:py-20">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl font-heading">
            Frequently Asked Questions: {s.name} Stretch Service in {n.name},{" "}
            {n.borough}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            Have questions about booking {s.name} stretch service in {n.name}?
            Below are answers to the most common questions from {n.name}{" "}
            residents and visitors considering {s.name} in {n.borough}. If you
            do not see your question here, text or call {SITE_PHONE} and we will
            be happy to help.
          </p>
          <div className="mt-8 space-y-3">
            {faqItems.map((faq) => (
              <details
                key={faq.question}
                className="group rounded-xl border border-slate-200 bg-white"
              >
                <summary className="cursor-pointer px-6 py-4 text-base font-semibold text-slate-900 transition-colors hover:text-teal-700 font-heading">
                  {faq.question}
                </summary>
                <div className="px-6 pb-5 text-base leading-relaxed text-slate-600">
                  {faq.answer}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section 11: Other Services in Neighborhood ── */}
      <section className="bg-section-teal py-16 sm:py-20">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-center text-2xl font-bold text-slate-900 sm:text-3xl font-heading">
            Other Stretch Services Available in {n.name}, {n.borough}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base leading-relaxed text-slate-600">
            In addition to {s.name}, Stretch NYC offers a full range of
            professional stretch services throughout {n.name}. Each service is
            delivered mobile to your {n.name} location at $99 per hour with 10%
            off weekly programs. Explore our other stretch service options below.
          </p>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {otherServices.map((sv) => (
              <Link key={sv.slug} href={getNeighborhoodServiceUrl(n, sv)}>
                <div className="group rounded-xl border border-teal-200/60 bg-white p-5 transition-all hover:border-teal-400 hover:shadow-md">
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-teal-600 font-heading">
                    {sv.name} in {n.name}
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-slate-500 line-clamp-3">
                    {sv.shortDesc} Available as a mobile stretch service in{" "}
                    {n.name}, {n.borough}. $99/hr.
                  </p>
                </div>
              </Link>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link
              href={getNeighborhoodUrl(n)}
              className="text-sm font-semibold text-teal-600 hover:text-teal-700 font-cta"
            >
              View All Stretch Services in {n.name} &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* ── Section 12: Other Neighborhoods for This Service ── */}
      <section className="bg-section-white py-16 sm:py-20">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-center text-2xl font-bold text-slate-900 sm:text-3xl font-heading">
            {s.name} Stretch Service in Other {n.borough} Neighborhoods
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base leading-relaxed text-slate-600">
            Stretch NYC delivers {s.name} stretch service across all of{" "}
            {n.borough}. If you live, work, or are staying in another{" "}
            {n.borough} neighborhood, we serve you there too. Every neighborhood
            below offers the same $99 per hour {s.name} stretch service with
            same-day availability and 10% off weekly programs.
          </p>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {boroughNeighborhoods.map((nb) => (
              <Link key={nb.slug} href={getNeighborhoodServiceUrl(nb, s)}>
                <div className="group rounded-xl border border-slate-200 bg-white p-5 transition-all hover:border-teal-400 hover:shadow-md">
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-teal-600 font-heading">
                    {s.name} in {nb.name}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    {nb.name}, {n.borough} &middot; $99/hr stretch service
                  </p>
                </div>
              </Link>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link
              href={getBoroughUrl(b)}
              className="text-sm font-semibold text-teal-600 hover:text-teal-700 font-cta"
            >
              View All {n.borough} Neighborhoods &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* ── Section 13: Related Links ── */}
      <section className="bg-section-teal py-12 sm:py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="mb-6 text-center text-xl font-bold text-slate-900 font-heading">
            Related Links for {s.name} Stretch Service in {n.name}
          </h2>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <Link
              href={getNeighborhoodUrl(n)}
              className="flex items-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-teal-50 hover:text-teal-700 border border-teal-200/60"
            >
              All Services in {n.name}
            </Link>
            <Link
              href={getBoroughUrl(b)}
              className="flex items-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-teal-50 hover:text-teal-700 border border-teal-200/60"
            >
              All {n.borough} Neighborhoods
            </Link>
            <Link
              href={getServiceUrl(s)}
              className="flex items-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-teal-50 hover:text-teal-700 border border-teal-200/60"
            >
              {s.name} Full Guide
            </Link>
            <Link
              href="/pricing"
              className="flex items-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-teal-50 hover:text-teal-700 border border-teal-200/60"
            >
              Stretch Service Pricing
            </Link>
            <Link
              href="/services"
              className="flex items-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-teal-50 hover:text-teal-700 border border-teal-200/60"
            >
              All Stretch Services
            </Link>
            <Link
              href="/locations"
              className="flex items-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-teal-50 hover:text-teal-700 border border-teal-200/60"
            >
              All NYC Locations
            </Link>
            <Link
              href="/parks"
              className="flex items-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-teal-50 hover:text-teal-700 border border-teal-200/60"
            >
              Parks and Iconic Locations
            </Link>
            <Link
              href="/hotel-stretching"
              className="flex items-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-teal-50 hover:text-teal-700 border border-teal-200/60"
            >
              Hotel Stretch Service
            </Link>
            <Link
              href="/corporate-wellness"
              className="flex items-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-teal-50 hover:text-teal-700 border border-teal-200/60"
            >
              Corporate Wellness Programs
            </Link>
            <Link
              href="/about"
              className="flex items-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-teal-50 hover:text-teal-700 border border-teal-200/60"
            >
              About Stretch NYC
            </Link>
            <Link
              href="/faq"
              className="flex items-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-teal-50 hover:text-teal-700 border border-teal-200/60"
            >
              FAQ
            </Link>
            <Link
              href="/contact"
              className="flex items-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-teal-50 hover:text-teal-700 border border-teal-200/60"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </section>

      {/* ── Section 14: Final CTA ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 py-16 sm:py-20">
        <div className="absolute inset-0 grid-bg opacity-20" />
        <div className="relative mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-2xl font-bold text-white sm:text-3xl font-heading">
            Ready for {s.name} Stretch Service in {n.name}?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/80">
            Our certified stretch therapists come to you anywhere in {n.name},{" "}
            {n.borough}. Same-day appointments available 7AM to 10PM daily. $99
            per hour for a single session. $89 per session with our weekly
            program — that is 10% off every visit. No memberships, no contracts,
            no hidden fees. Just professional {s.name} stretch service delivered
            to your {n.name} door.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a href={SITE_SMS_LINK}>
              <span className="inline-block rounded-lg bg-white px-8 py-3.5 text-base font-semibold text-teal-700 shadow-lg transition-colors hover:bg-teal-50 font-cta">
                Text {SITE_PHONE}
              </span>
            </a>
            <a href={SITE_PHONE_LINK}>
              <span className="inline-block rounded-lg border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:border-white/60 font-cta">
                Call {SITE_PHONE}
              </span>
            </a>
          </div>
          <p className="mt-6 text-sm text-teal-200">
            Serving all of {n.name}, {n.borough} and every neighborhood across
            New York City&apos;s five boroughs.{" "}
            <Link
              href="/locations"
              className="font-semibold text-white underline hover:text-teal-100"
            >
              View all locations
            </Link>
            .
          </p>
        </div>
      </section>
    </>
  );
}
