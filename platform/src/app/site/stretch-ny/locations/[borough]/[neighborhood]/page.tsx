// @ts-nocheck
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { findBoroughBySlug, findNeighborhoodBySlug, services, getNeighborhoodUrl, getNeighborhoodServiceUrl, getBoroughUrl, SITE_URL, SITE_SMS_LINK, SITE_PHONE, neighborhoods, parks, getParkUrl, getServiceUrl, clientTypes, getNeighborhoodsByBorough, getParksByBorough } from "@/app/site/stretch-ny/_lib/siteData";
import { JsonLd, webPageSchema, breadcrumbSchema, faqSchema, localBusinessSchema } from "@/app/site/stretch-ny/_lib/schema";
import Logo from "@/app/site/stretch-ny/_components/Logo";

interface Props { params: Promise<{ borough: string; neighborhood: string }> }

export const dynamicParams = true;
export const revalidate = 86400;
export async function generateStaticParams() { return []; }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { borough, neighborhood } = await params;
  const n = findNeighborhoodBySlug(borough, neighborhood);
  if (!n) return {};
  return {
    title: `${n.name} Assisted Stretch Service | $99/hr Mobile ${n.borough}`,
    description: `Assisted stretch service in ${n.name}, ${n.borough}. $99/hr, 10% off weekly. Certified therapists come to you. Same-day available 7AM-10PM. Book now.`,
    alternates: { canonical: `${SITE_URL}${getNeighborhoodUrl(n)}` },
  };
}

export default async function NeighborhoodPage({ params }: Props) {
  const { borough, neighborhood } = await params;
  const b = findBoroughBySlug(borough);
  const n = findNeighborhoodBySlug(borough, neighborhood);
  if (!b || !n) notFound();

  const pageUrl = `${SITE_URL}${getNeighborhoodUrl(n)}`;
  const boroughParks = getParksByBorough(n.boroughSlug).slice(0, 5);
  const siblingNeighborhoods = getNeighborhoodsByBorough(n.boroughSlug).filter((sn) => sn.slug !== n.slug).slice(0, 8);
  const comboServices = services.slice(0, 6);

  const faqItems = [
    { question: `How much does stretch service cost in ${n.name}?`, answer: `Mobile stretch service in ${n.name}, ${n.borough} is $99 per hour for a single session. If you book weekly stretch service, each session drops to $89 per hour — that is a 10% discount for committing to regular flexibility work. Our certified stretch therapists bring all professional equipment directly to your location anywhere in ${n.name}. There are no hidden fees, no travel surcharges, and no equipment rental costs. You pay $99 per hour for world-class stretch service delivered to your door.` },
    { question: `Can I get same-day stretch service in ${n.name}?`, answer: `Yes, we offer same-day stretch service appointments throughout ${n.name} and all ${n.borough} neighborhoods. Our mobile stretch service therapists are positioned across ${n.borough} daily, so last-minute bookings are almost always available. Text or call 212-202-7080 to check today's availability for ${n.name} stretch service. Most same-day requests are confirmed within 30 minutes.` },
    { question: `What stretch services are available in ${n.name}?`, answer: `We offer all 11 professional stretch services in ${n.name} including assisted stretching, PNF stretching, myofascial release, recovery stretching, gentle stretch for seniors, active stretching, dynamic stretching, passive stretching, static stretching, foam rolling guidance, and ballistic stretching for advanced athletes. Every ${n.name} stretch service session is customized to your body, goals, and current flexibility level. Your therapist performs a mobility assessment at the start of each session.` },
    { question: `Do you bring equipment for stretch service in ${n.name}?`, answer: `Absolutely. Our mobile stretch service therapists arrive at your ${n.name} location with everything needed for a professional session — a portable stretch table, resistance bands, foam rollers, yoga blocks, and all other tools required. You do not need to provide anything except a space roughly 8 by 6 feet. We set up and break down everything. This is what makes our ${n.name} stretch service truly mobile and hassle-free.` },
    { question: `How long is a stretch service session in ${n.name}?`, answer: `A standard ${n.name} stretch service session is 60 minutes at $99 per hour. This includes a brief mobility assessment, a full-body stretching protocol customized to your needs, and post-session recommendations. If you need more time, 90-minute sessions are available at $149. Many ${n.name} residents book 60-minute sessions weekly as part of their wellness routine, taking advantage of our 10% weekly discount at $89 per session.` },
    { question: `Is stretch service in ${n.name} available on weekends?`, answer: `Yes, our ${n.name} stretch service operates 7 days a week, 7AM to 10PM daily — including weekends and most holidays. Weekend appointments are especially popular with ${n.name} residents who use Saturday and Sunday sessions to recover from their workweek. We recommend booking weekend ${n.name} stretch service sessions at least 24 hours in advance, though same-day availability is often possible.` },
    { question: `Can couples or roommates share a stretch service session in ${n.name}?`, answer: `We offer back-to-back stretch service sessions for couples, roommates, or family members sharing a ${n.name} apartment. Your therapist completes one full 60-minute session at $99 per hour, then immediately begins the second person's session. This is more efficient than booking separate appointments because you eliminate the travel time between clients. Many ${n.name} couples book back-to-back Saturday morning stretch service sessions as part of their weekend wellness routine. Each person receives a fully customized session with their own mobility assessment and tailored stretching protocol.` },
    { question: `Do I need to tip my stretch service therapist in ${n.name}?`, answer: `Tipping is not required for ${n.name} stretch service, but it is always appreciated. Our certified stretch therapists are compensated fairly, and the $99 per hour rate covers the full cost of your session including all equipment, travel to your ${n.name} location, setup, and breakdown. If you feel your therapist delivered exceptional stretch service, a 15-20% tip is customary in the wellness industry. Many of our regular ${n.name} clients who book weekly stretch service at $89 per session choose to tip at the end of each month rather than after every individual session.` },
    { question: `What should I wear for stretch service in ${n.name}?`, answer: `Wear comfortable, flexible clothing for your ${n.name} stretch service session — athletic wear, yoga pants, shorts, or anything that allows full range of motion. Avoid jeans, belts, or restrictive clothing that could limit the effectiveness of your stretching protocol. You do not need shoes during the session. Many ${n.name} residents simply wear whatever they would wear to a gym or yoga class. Your therapist will let you know at the start of the session if any clothing adjustments would help achieve better results during your stretch service appointment.` },
    { question: `How far in advance should I book stretch service in ${n.name}?`, answer: `For guaranteed availability, we recommend booking your ${n.name} stretch service session at least 24 to 48 hours in advance. However, same-day bookings are frequently available, especially on weekday mornings and early afternoons. If you are booking weekly stretch service in ${n.name}, your therapist reserves your recurring time slot so you never have to worry about availability. For special events, corporate bookings, or group sessions in ${n.name}, we recommend booking at least one week in advance to ensure we can accommodate your full party at $99 per hour per person.` },
  ];

  return (
    <>
      <JsonLd data={webPageSchema(`${n.name} Stretch Service — Mobile Stretching in ${n.name}, ${n.borough}`, `Professional mobile stretch service in ${n.name}, ${n.borough}. $99 per hour. Certified therapists come to you.`, pageUrl)} />
      <JsonLd data={breadcrumbSchema([
        { name: "Home", url: SITE_URL },
        { name: "Locations", url: `${SITE_URL}/locations` },
        { name: n.borough, url: `${SITE_URL}${getBoroughUrl(b)}` },
        { name: n.name, url: pageUrl },
      ])} />
      <JsonLd data={localBusinessSchema(n.name, n.borough)} />
      <JsonLd data={faqSchema(faqItems)} />

      {/* ═══════════════ HERO ═══════════════ */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 pt-36 pb-16 sm:pt-44 sm:pb-20">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">
            Mobile Stretch Service &mdash; {n.borough} | $99/hr | 7AM-10PM Daily
          </p>
          <h1 className="text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl font-heading">
            {n.name} <span className="text-teal-200">Stretch Service</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/80">
            {n.description} Professional assisted stretch service delivered to your door in {n.name}. Certified therapists, {services.length} stretch types, same-day appointments. $99/hr, 10% off weekly.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-6">
            <div className="rounded-lg bg-white/10 px-5 py-3 backdrop-blur-sm">
              <p className="text-3xl font-bold text-white font-heading">$99</p>
              <p className="text-sm font-medium text-teal-200">PER HOUR</p>
            </div>
            <div className="rounded-lg bg-white/10 px-5 py-3 backdrop-blur-sm">
              <p className="text-3xl font-bold text-white font-heading">10%</p>
              <p className="text-sm font-medium text-teal-200">OFF WEEKLY</p>
            </div>
          </div>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a href={SITE_SMS_LINK}><span className="inline-block rounded-lg bg-white px-8 py-3.5 text-base font-semibold text-teal-700 shadow-lg transition-colors hover:bg-teal-50 font-cta">Text {SITE_PHONE} — Book Now</span></a>
            <Link href={getBoroughUrl(b)}><span className="inline-block rounded-lg border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:border-white/60 font-cta">All {n.borough} Neighborhoods</span></Link>
          </div>
        </div>
      </section>

      {/* ═══════════════ ABOUT THIS NEIGHBORHOOD ═══════════════ */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl font-heading">About {n.name} Stretch Service — Mobile Stretching in {n.borough}</h2>
          <p className="mt-6 text-base leading-relaxed text-slate-600">
            {n.name} is one of {n.borough}&apos;s most distinctive neighborhoods, and it is exactly the kind of place where professional stretch service makes a real difference in people&apos;s daily lives. {n.description} The character of {n.name} shapes how residents move, work, and recover — and our mobile stretch service in {n.name} is designed to fit seamlessly into the rhythm of life here.
          </p>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            Living in {n.name} means navigating the physical demands that come with New York City life in {n.borough}. The daily commute alone takes a toll on your body — whether you are walking to the subway, standing on a crowded train, or climbing stairs at your station. Add desk work, long hours on your feet, carrying groceries up walk-up apartment stairs, and the general stress of city living, and it becomes clear why {n.name} residents are turning to professional stretch service as an essential part of their wellness routine. Our {n.name} stretch service addresses these specific physical demands with targeted, therapeutic stretching protocols delivered right to your door.
          </p>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            The vibe in {n.name} is {n.vibe}. This is a neighborhood where people take their health seriously but also value convenience above almost everything else. That is precisely why mobile stretch service in {n.name} has become so popular — you do not have to travel to a studio, fight for a parking spot, or squeeze another errand into your already packed schedule. Instead, a certified stretch therapist arrives at your {n.name} home or office with all professional equipment, sets up in minutes, and delivers a world-class stretch service session for $99 per hour. When you book weekly, that drops to just $89 per session — a 10% discount that makes consistent stretch service in {n.name} genuinely affordable.
          </p>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            {n.name} attracts a diverse mix of residents, workers, and visitors, each with their own reasons for needing stretch service. Young professionals who spend 8-10 hours at desks develop chronic neck and shoulder tension. Fitness enthusiasts training at local gyms need recovery stretching to prevent injuries and improve performance. Seniors living independently in {n.name} rely on gentle stretch service to maintain mobility and prevent falls. Tourists staying in {n.name} hotels walk 20,000+ steps daily exploring {n.borough} and need recovery stretching to enjoy the rest of their trip. Our mobile stretch service in {n.name} serves every one of these client types with specialized protocols.
          </p>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            The physical infrastructure of {n.name} itself creates specific stretch service needs. Many {n.name} buildings are older walk-ups where residents climb multiple flights of stairs daily — creating tight hip flexors, sore calves, and lower back strain. The streets and sidewalks of {n.name} mean constant walking on hard surfaces, which leads to plantar fascia tightness, ankle stiffness, and knee discomfort over time. Even the subway commute from {n.name} to other parts of {n.borough} or Manhattan involves standing, holding overhead rails, and bracing against sudden stops — all of which create tension patterns that professional stretch service can address. Our therapists who serve {n.name} understand these neighborhood-specific physical demands and build them into every stretch service session.
          </p>
          {n.landmarks.length > 0 && (
            <>
              <p className="mt-4 text-base leading-relaxed text-slate-600">
                {n.name} is home to several notable landmarks and destinations that define the neighborhood. Residents and visitors near {n.landmarks[0]} and other {n.name} landmarks benefit from having stretch service available just minutes from where they live, work, or explore. Whether you have spent the day walking around {n.landmarks.length > 1 ? n.landmarks[1] : n.landmarks[0]} or you are recovering from a long week of commuting from {n.name} to your office, our mobile stretch service therapists know this neighborhood and can reach any location in {n.name} quickly.
              </p>
              <div className="mt-6">
                <h3 className="text-lg font-bold text-slate-900 font-heading">Stretch Service Near {n.name} Landmarks</h3>
                <p className="mt-2 text-sm text-slate-600">We deliver mobile stretch service to locations near all major {n.name} landmarks including:</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {n.landmarks.map((l) => (
                    <span key={l} className="rounded-full bg-teal-50 px-3 py-1 text-xs font-medium text-teal-700 border border-teal-200/60">{l}</span>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </section>

      {/* ═══════════════ STRETCH SERVICES AVAILABLE ═══════════════ */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl font-heading">Stretch Services Available in {n.name}</h2>
          <p className="mt-3 text-base text-slate-600">
            All {services.length} professional stretch services are available with mobile delivery anywhere in {n.name}, {n.borough}. Every session is $99 per hour with a 10% discount for weekly bookings. Tap any stretch service below to learn more about what we offer in {n.name}.
          </p>
          <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {services.map((s) => (
              <Link key={s.slug} href={getNeighborhoodServiceUrl(n, s)}>
                <div className="group rounded-xl border border-teal-200/60 bg-white p-5 transition-all hover:border-teal-400 hover:shadow-md">
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-teal-600 font-heading">{s.name} in {n.name}</h3>
                  <p className="mt-1.5 text-xs text-slate-500 line-clamp-2">{s.shortDesc}</p>
                  <p className="mt-2 text-xs font-semibold text-teal-600">$99/hr — Book {s.name} in {n.name} &rarr;</p>
                </div>
              </Link>
            ))}
          </div>
          <p className="mt-6 text-sm text-slate-500 text-center">
            Not sure which stretch service is right for you? Text {SITE_PHONE} and our team will recommend the best stretch service for your needs in {n.name}.
            You can also browse our full <Link href="/services" className="text-teal-600 underline hover:text-teal-800">stretch services menu</Link> to compare all options.
          </p>
        </div>
      </section>

      {/* ═══════════════ THE COMPLETE GUIDE TO STRETCH SERVICE ═══════════════ */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl font-heading">The Complete Guide to Stretch Service in {n.name}</h2>
          <p className="mt-6 text-base leading-relaxed text-slate-600">
            Understanding what stretch service actually looks like in {n.name} helps you appreciate why so many {n.borough} residents have made it a non-negotiable part of their weekly routine. Life in {n.name} moves fast. The alarm goes off early, the commute starts before coffee kicks in, and the day is a blur of obligations that keep your body locked in the same positions for hours at a time. Whether you work from a home office in {n.name}, commute to Midtown Manhattan, or run a local business on one of {n.name}&apos;s busy commercial streets, the physical toll accumulates in predictable ways — stiff shoulders, compressed lower back, tight hamstrings, and a neck that never quite feels right. Professional stretch service in {n.name} exists to undo that damage systematically, session by session, week by week.
          </p>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            A typical stretch service session in {n.name} begins when your certified therapist arrives at your front door. They carry a professional portable stretch table, resistance bands, foam rollers, and any specialized tools your session requires. Setup takes about five minutes — your therapist transforms a small corner of your living room, bedroom, or home office into a professional stretching studio. You do not need to clear an entire room. A space of roughly eight by six feet is all that is required. Many {n.name} apartment dwellers are surprised at how seamlessly the setup works even in compact New York City living spaces. Once the table is ready, your therapist begins with a brief mobility assessment — checking your range of motion in key joints, identifying areas of tightness, and asking about any pain or discomfort you have been experiencing since your last session.
          </p>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            The stretching protocol itself is where the real magic happens. Unlike a generic stretch routine you might follow from a video, professional stretch service in {n.name} adapts to your body in real time. Your therapist uses their hands to guide your limbs through ranges of motion you simply cannot achieve on your own. They apply targeted pressure to release fascial adhesions, use <Link href={getServiceUrl(services[1])} className="text-teal-600 underline hover:text-teal-800">PNF stretching</Link> techniques to trick your nervous system into allowing deeper stretches, and employ <Link href={getServiceUrl(services[0])} className="text-teal-600 underline hover:text-teal-800">assisted stretching</Link> methods that produce measurably greater flexibility gains than solo work. The session flows from one body region to the next — your therapist addresses your neck and shoulders, works through your thoracic spine, opens your hip flexors, lengthens your hamstrings, and finishes with your calves and feet. Every minute of your $99 per hour session is productive, purposeful, and tailored to your body.
          </p>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            What makes stretch service in {n.name} different from booking the same service elsewhere in New York City? Context. Our therapists who work in {n.name} understand the lifestyle of this specific neighborhood. They know that {n.name} residents tend to walk more than the average New Yorker because of the neighborhood&apos;s layout and transit options. They understand the commute patterns — which subway lines serve {n.name}, how long the average resident stands on a train, and what physical stress that commute creates over weeks and months. They factor in the types of buildings in {n.name} — whether you are climbing four flights of walk-up stairs every day or taking an elevator in a newer high-rise. All of this neighborhood-specific knowledge gets built into your stretch service protocol. You are not receiving a cookie-cutter session. You are receiving stretch service designed for a person who lives the {n.name} lifestyle.
          </p>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            The convenience factor cannot be overstated. {n.name} residents who book stretch service tell us the same thing — the reason they stick with it is because it comes to them. There is no gym bag to pack, no train to catch, no class to be late for. You text {SITE_PHONE}, your appointment is confirmed, and your therapist shows up exactly when promised. After 60 minutes of professional stretch service at $99 per hour, your therapist packs up, your space is back to normal, and you carry on with your evening feeling looser, more mobile, and genuinely better than you did before the session. For {n.name} residents who book weekly at $89 per session, this becomes the highlight of their week — a consistent investment in their physical health that pays dividends in reduced pain, better posture, improved sleep, and greater overall energy. If you live in {n.name} and have not tried professional stretch service yet, you are missing out on one of the most effective wellness tools available in {n.borough}.
          </p>
          {boroughParks.length > 0 && (
            <p className="mt-4 text-base leading-relaxed text-slate-600">
              Many {n.name} stretch service clients also take advantage of outdoor sessions in nearby parks. Our therapists meet you at <Link href={getParkUrl(boroughParks[0])} className="text-teal-600 underline hover:text-teal-800">{boroughParks[0].name}</Link>{boroughParks.length > 1 && <>, <Link href={getParkUrl(boroughParks[1])} className="text-teal-600 underline hover:text-teal-800">{boroughParks[1].name}</Link></>}{boroughParks.length > 2 && <>, or <Link href={getParkUrl(boroughParks[2])} className="text-teal-600 underline hover:text-teal-800">{boroughParks[2].name}</Link></>} for outdoor stretch service sessions that combine fresh air with professional stretching — a popular option during spring and fall in {n.name}. Whether you prefer an indoor session in your {n.name} apartment or an outdoor session in a nearby park, our mobile stretch service adapts to your preference and delivers the same world-class results at $99 per hour.
            </p>
          )}
        </div>
      </section>

      {/* ═══════════════ WHY RESIDENTS CHOOSE STRETCH SERVICE ═══════════════ */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl font-heading">Why {n.name} Residents Choose Stretch Service</h2>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            Residents throughout {n.name} are discovering that professional stretch service is not a luxury — it is a practical solution to the physical challenges of living in {n.borough}. Here are four reasons why {n.name} stretch service has become essential for people who live, work, and play in this neighborhood.
          </p>

          <div className="mt-8 space-y-8">
            <div>
              <h3 className="text-lg font-bold text-slate-900 font-heading">1. Mobile Stretch Service Saves {n.name} Residents Time</h3>
              <p className="mt-2 text-base leading-relaxed text-slate-600">
                Time is the most valuable resource for anyone living in {n.name}. Between commuting, working, running errands, and trying to maintain some semblance of a social life, there are not enough hours in the day. Traditional wellness services require you to travel to a location, wait for your appointment, complete your session, and travel back — easily consuming 90 minutes or more for a 60-minute service. Mobile stretch service in {n.name} eliminates all of that wasted time. Your certified stretch therapist comes to your {n.name} apartment, office, or hotel room at exactly the time you choose. There is no travel, no waiting room, and no commute. You open your door, get stretched for 60 minutes at $99 per hour, and you are done. For busy {n.name} residents, this time savings alone makes mobile stretch service the obvious choice over studio-based alternatives.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-900 font-heading">2. {n.name} Stretch Service Addresses Neighborhood-Specific Pain</h3>
              <p className="mt-2 text-base leading-relaxed text-slate-600">
                The physical demands of living in {n.name} are unique. Your commute pattern, the type of building you live in, the sidewalks you walk daily, and even the stairs at your nearest subway station all contribute to specific tension patterns in your body. Our stretch service therapists who work in {n.name} understand these patterns because they see them in every client from this neighborhood. Tight hip flexors from subway commutes, chronic shoulder tension from carrying bags on {n.name} streets, lower back pain from older apartment furniture — these are {n.name}-specific issues that generic stretching programs do not address. Our {n.name} stretch service is customized to the reality of how you live and move in this neighborhood.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-900 font-heading">3. Consistent Stretch Service Prevents Chronic Issues</h3>
              <p className="mt-2 text-base leading-relaxed text-slate-600">
                Most {n.name} residents do not seek out stretch service until something hurts. But the real power of professional stretch service is prevention. Weekly stretch service at $89 per session (10% off our standard $99 per hour rate) keeps your muscles supple, your joints mobile, and your fascia healthy — preventing the chronic pain conditions that develop over months and years of NYC living. {n.name} residents who commit to weekly stretch service report fewer sick days, better sleep, less daily pain, and significantly improved quality of life. Prevention is always cheaper and more effective than treatment, and weekly stretch service in {n.name} is one of the best investments you can make in your long-term physical health.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-900 font-heading">4. Professional Stretch Service Delivers Results Self-Stretching Cannot</h3>
              <p className="mt-2 text-base leading-relaxed text-slate-600">
                You can stretch on your own — but you cannot replicate what a certified stretch therapist achieves in a professional stretch service session. Self-stretching is limited by your own strength, flexibility, and body mechanics. You physically cannot reach the same depth, apply the same targeted pressure, or use techniques like PNF stretching on yourself. Professional stretch service in {n.name} uses advanced techniques including <Link href={getServiceUrl(services[1])} className="text-teal-600 underline hover:text-teal-800">PNF stretching</Link>, <Link href={getServiceUrl(services[6])} className="text-teal-600 underline hover:text-teal-800">myofascial release</Link>, and <Link href={getServiceUrl(services[0])} className="text-teal-600 underline hover:text-teal-800">assisted stretching</Link> that produce 2-3x greater flexibility improvements than anything you can do alone. For {n.name} residents who are serious about their mobility and physical health, professional stretch service is not optional — it is necessary.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════ STRETCH SERVICE VS OTHER WELLNESS OPTIONS ═══════════════ */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl font-heading">Stretch Service vs Other Wellness Options in {n.name}</h2>
          <p className="mt-6 text-base leading-relaxed text-slate-600">
            {n.name} has no shortage of wellness options. Yoga studios, massage parlors, gyms with personal trainers, pilates reformer studios, and chiropractic offices all compete for your time and money in this {n.borough} neighborhood. So why are more {n.name} residents choosing mobile stretch service over these alternatives? The answer comes down to three things — specificity, convenience, and value. Let us break down how stretch service in {n.name} compares to each major wellness category so you can make an informed decision about where to invest your wellness budget.
          </p>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            Yoga studios in {n.name} offer group classes at fixed times, typically ranging from $25 to $40 per class. While yoga provides general flexibility benefits, it is a one-size-fits-all experience. The instructor cannot customize the class to your specific tight spots, injury history, or mobility goals. You follow the same sequence as everyone else in the room, which means some poses help you and others are irrelevant or even counterproductive for your body. Professional stretch service in {n.name} at $99 per hour is a fully personalized session where every minute is spent addressing your specific needs. You are not stretching muscles that are already flexible — your therapist targets exactly what is tight, restricted, or painful. The per-session cost is higher than a yoga class, but the results per dollar are dramatically better because nothing is wasted.
          </p>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            Massage parlors and spas in {n.name} charge $120 to $200 or more per hour, and they require you to travel to their location, change clothes, and often sit in a waiting room before your appointment begins. Massage focuses primarily on muscle relaxation and pain relief through soft tissue manipulation. Stretch service, by contrast, actively improves your range of motion, addresses fascial restrictions, and retrains your neuromuscular system to allow greater flexibility. A massage makes you feel good for a day or two. Regular stretch service in {n.name} at $99 per hour produces cumulative improvements in mobility, posture, and pain reduction that compound over weeks and months. And because our stretch service comes to your {n.name} home or office, you save 30 to 45 minutes of travel time compared to visiting a spa.
          </p>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            Gym memberships in {n.name} typically cost $80 to $200 per month, and adding a personal trainer costs $100 to $175 per session. Most gym-goers focus on strength and cardio while neglecting flexibility entirely — which is exactly why so many gym enthusiasts in {n.name} end up with chronic tightness, reduced range of motion, and nagging injuries. Professional stretch service complements your gym routine perfectly. For $99 per hour (or $89 weekly), you get targeted flexibility work that your gym routine completely misses. Many {n.name} athletes and fitness enthusiasts book stretch service the day after their hardest training sessions for <Link href={getServiceUrl(services[3])} className="text-teal-600 underline hover:text-teal-800">recovery stretching</Link> that accelerates muscle repair and prevents overuse injuries. Unlike a gym, stretch service comes to you — no commute, no locker room, no waiting for equipment.
          </p>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            The bottom line for {n.name} residents evaluating their wellness options is this — mobile stretch service at $99 per hour delivers more targeted results, more conveniently, and at a competitive price point compared to every major alternative available in the neighborhood. It is not a replacement for exercise or medical care, but it fills a critical gap that yoga classes, massage sessions, and gym memberships leave wide open. If you are spending money on wellness in {n.name} and you are not including professional stretch service, you are leaving significant health benefits on the table.
          </p>
        </div>
      </section>

      {/* ═══════════════ QUICK STATS ═══════════════ */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 text-center font-heading">{n.name} Stretch Service — Quick Facts</h2>
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-xl border border-teal-200/60 bg-white p-5 text-center">
              <p className="text-sm font-medium text-slate-500">Price</p>
              <p className="mt-1 text-2xl font-bold text-teal-700">$99</p>
              <p className="mt-1 text-xs text-slate-400">Per Hour</p>
            </div>
            <div className="rounded-xl border border-teal-200/60 bg-white p-5 text-center">
              <p className="text-sm font-medium text-slate-500">Weekly Rate</p>
              <p className="mt-1 text-2xl font-bold text-teal-700">$89</p>
              <p className="mt-1 text-xs text-slate-400">10% Off Weekly</p>
            </div>
            <div className="rounded-xl border border-teal-200/60 bg-white p-5 text-center">
              <p className="text-sm font-medium text-slate-500">Hours</p>
              <p className="mt-1 text-2xl font-bold text-teal-700">7-10</p>
              <p className="mt-1 text-xs text-slate-400">AM - PM Daily</p>
            </div>
            <div className="rounded-xl border border-teal-200/60 bg-white p-5 text-center">
              <p className="text-sm font-medium text-slate-500">Rating</p>
              <p className="mt-1 text-2xl font-bold text-teal-700">5.0</p>
              <p className="mt-1 text-xs text-slate-400">31+ Reviews</p>
            </div>
          </div>
          <p className="mt-6 text-center text-sm text-slate-500">
            All {n.name} stretch service sessions include a mobility assessment, full-body stretching protocol, and post-session recommendations. No hidden fees. No travel surcharges.
          </p>
        </div>
      </section>

      {/* ═══════════════ NEARBY PARKS FOR OUTDOOR STRETCHING ═══════════════ */}
      {boroughParks.length > 0 && (
        <section className="bg-section-white py-16">
          <div className="mx-auto max-w-4xl px-6">
            <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl font-heading">Nearby Parks for Outdoor Stretch Service Near {n.name}</h2>
            <p className="mt-4 text-base leading-relaxed text-slate-600">
              One of the best things about living in {n.name}, {n.borough} is access to green spaces where you can enjoy outdoor stretch service sessions. Our mobile stretch service therapists are happy to meet you at any park near {n.name} for an outdoor stretching session — weather permitting. Outdoor stretch service combines the physical benefits of professional stretching with the mental health benefits of being in nature. Many {n.name} residents prefer park sessions during spring and fall when the weather in {n.borough} is perfect for outdoor wellness activities. Here are popular parks near {n.name} where we deliver stretch service.
            </p>
            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {boroughParks.map((p) => (
                <Link key={p.slug} href={getParkUrl(p)}>
                  <div className="group rounded-xl border border-slate-200 bg-white p-5 transition-all hover:border-teal-400 hover:shadow-md">
                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-teal-600 font-heading">{p.name}</h3>
                    <p className="mt-1.5 text-xs text-slate-500 line-clamp-2">{p.description}</p>
                    <p className="mt-2 text-xs font-semibold text-teal-600">Stretch service at {p.name} &rarr;</p>
                  </div>
                </Link>
              ))}
            </div>
            <p className="mt-6 text-sm text-slate-500">
              Do not see your favorite park listed? We deliver mobile stretch service to any outdoor location near {n.name}. Text {SITE_PHONE} to book an outdoor stretch service session.
            </p>
          </div>
        </section>
      )}

      {/* ═══════════════ POPULAR STRETCH SERVICE COMBINATIONS ═══════════════ */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl font-heading">Popular Stretch Service Combinations in {n.name}</h2>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            Different {n.name} residents need different types of stretch service depending on their lifestyle, fitness level, and physical goals. Here are the six most popular stretch service combinations booked by people living and working in {n.name}, {n.borough}. Each combination pairs a specific stretch service technique with the unique demands of the {n.name} lifestyle, and every session is available at $99 per hour with a 10% weekly discount. Tap any combination below to learn more and book your {n.name} stretch service session.
          </p>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {comboServices.map((s, idx) => {
              const comboDescriptions = [
                `The most popular stretch service in ${n.name}. Your therapist guides every movement, achieving deeper stretches than you can reach alone. Perfect for ${n.name} desk workers and commuters dealing with chronic tension from daily city life.`,
                `Advanced neuromuscular technique that produces rapid flexibility gains. ${n.name} athletes, runners, and gym-goers book PNF stretch service to break through flexibility plateaus and prevent overuse injuries from training.`,
                `Deep fascial release for ${n.name} residents carrying years of accumulated tension. This stretch service targets the connective tissue wrapping your muscles, releasing adhesions that limit mobility and cause persistent pain in shoulders, hips, and back.`,
                `Essential for ${n.name} fitness enthusiasts after hard workouts. Recovery stretch service accelerates muscle repair, reduces soreness, and restores range of motion — helping you get back to training faster than passive rest alone.`,
                `Designed for ${n.name} seniors who want to maintain independence, prevent falls, and keep their joints mobile. Gentle stretch service uses slow, controlled movements and lighter pressure, tailored to age-related flexibility needs.`,
                `Movement-based stretch service that improves functional flexibility for ${n.name} residents with active lifestyles. Active stretching builds strength at end-range positions, making everyday movements in the neighborhood easier and safer.`,
              ];
              return (
                <Link key={s.slug} href={getNeighborhoodServiceUrl(n, s)}>
                  <div className="group rounded-xl border border-teal-200/60 bg-white p-5 transition-all hover:border-teal-400 hover:shadow-md h-full">
                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-teal-600 font-heading">{s.name} in {n.name}</h3>
                    <p className="mt-2 text-xs text-slate-500">{comboDescriptions[idx]}</p>
                    <p className="mt-3 text-xs font-semibold text-teal-600">$99/hr — Book {s.name} &rarr;</p>
                  </div>
                </Link>
              );
            })}
          </div>
          <p className="mt-6 text-sm text-slate-500 text-center">
            Not sure which stretch service combination is right for your {n.name} lifestyle? Text {SITE_PHONE} and our team will recommend the perfect stretch service based on your body, goals, and daily routine. Most {n.name} clients blend multiple techniques across weekly sessions for comprehensive flexibility improvement.
          </p>
        </div>
      </section>

      {/* ═══════════════ CLIENT TYPES IN THIS NEIGHBORHOOD ═══════════════ */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl font-heading">Who Books Stretch Service in {n.name}?</h2>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            {n.name} is a diverse neighborhood in {n.borough}, and our stretch service client base reflects that diversity. From young professionals to retirees, athletes to desk workers, tourists to lifelong residents — every type of person in {n.name} benefits from professional stretch service. Here are the most common client types who book stretch service in {n.name} and why this service matters to each of them.
          </p>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {clientTypes.slice(0, 6).map((ct) => (
              <div key={ct.slug} className="rounded-xl border border-slate-200 bg-white p-5">
                <h3 className="text-sm font-bold text-slate-900 font-heading">{ct.emoji} {ct.name}</h3>
                <p className="mt-1.5 text-xs text-slate-500">{ct.shortDesc}</p>
                <ul className="mt-3 space-y-1">
                  {ct.painPoints.slice(0, 3).map((pp) => (
                    <li key={pp} className="text-xs text-slate-600 flex items-start gap-1.5">
                      <span className="mt-1 h-1 w-1 flex-shrink-0 rounded-full bg-teal-500" />
                      {pp}
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-xs text-teal-600 font-medium">Stretch service in {n.name} helps with all of these.</p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-base leading-relaxed text-slate-600">
            No matter which category you fall into, {n.name} stretch service is customized to your specific needs. Our certified therapists perform a mobility assessment at the start of every session to understand exactly what your body needs. Whether you are a {n.name} desk worker dealing with chronic neck tension, an athlete training for a race, or a senior focused on maintaining independence, the stretch service session you receive is designed around your body and your goals — not a generic one-size-fits-all routine.
          </p>
        </div>
      </section>

      {/* ═══════════════ STRETCH SERVICE FOR TOURISTS ═══════════════ */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl font-heading">{n.name} Stretch Service for Tourists</h2>
          <p className="mt-6 text-base leading-relaxed text-slate-600">
            If you are visiting {n.name} as a tourist, you already know how physically demanding a New York City trip can be. The average tourist in {n.borough} walks 20,000 to 30,000 steps per day — exploring {n.name}&apos;s streets, visiting {n.landmarks.length > 0 ? n.landmarks[0] : `local attractions`}, standing in lines, navigating the subway, and carrying bags through crowded sidewalks. By the second or third day of your trip, your feet ache, your legs are heavy, your back is stiff, and your energy is fading. This is exactly when stretch service in {n.name} becomes a game-changer for your vacation. A single 60-minute stretch service session at $99 per hour can restore your body and give you the mobility to enjoy the rest of your trip without limping through your itinerary.
          </p>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            Our mobile stretch service is ideal for tourists because we come directly to your {n.name} hotel room, Airbnb, or short-term rental. You do not need to find a spa, navigate unfamiliar streets, or waste precious vacation time traveling to an appointment. Simply text {SITE_PHONE} with your {n.name} accommodation address and preferred time, and a certified stretch therapist arrives at your door with all professional equipment. Many tourists book early morning stretch service sessions before heading out for a full day of sightseeing, while others prefer evening sessions to recover after a long day on their feet. Same-day bookings are almost always available, so you can decide in the moment when your body tells you it needs professional stretch service.
          </p>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            For tourists staying in {n.name} who want a unique wellness experience, we also offer outdoor stretch service sessions at nearby parks — combining the benefits of professional stretching with the beauty of {n.borough}&apos;s green spaces. {boroughParks.length > 0 && <>Our therapists can meet you at <Link href={getParkUrl(boroughParks[0])} className="text-teal-600 underline hover:text-teal-800">{boroughParks[0].name}</Link> for an outdoor stretch service session that doubles as a memorable New York City experience. </>}If you are planning a longer stay in {n.name}, consider booking our <Link href="/hotel-stretching" className="text-teal-600 underline hover:text-teal-800">hotel stretching service</Link> — a specialized stretch service program designed specifically for travelers who want to stay loose, pain-free, and energized throughout their New York City visit. Whether you are here for three days or three weeks, professional stretch service in {n.name} at $99 per hour ensures that physical discomfort does not ruin the trip you have been planning for months.
          </p>
          {n.landmarks.length > 1 && (
            <p className="mt-4 text-base leading-relaxed text-slate-600">
              Tourists visiting {n.name} landmarks like {n.landmarks[0]} and {n.landmarks[1]} particularly benefit from stretch service because these destinations involve extensive walking, standing, and stair climbing. After a day spent exploring these {n.name} attractions, a professional stretch service session back at your hotel releases the accumulated tension in your legs, back, and feet — leaving you refreshed and ready for tomorrow&apos;s adventures in {n.borough}.
            </p>
          )}
        </div>
      </section>

      {/* ═══════════════ HOW MOBILE STRETCH SERVICE WORKS ═══════════════ */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl font-heading">How Mobile Stretch Service Works in {n.name}</h2>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            Booking mobile stretch service in {n.name} is simple and takes less than two minutes. Here is exactly how it works, from first contact to your completed stretch service session.
          </p>
          <div className="mt-8 space-y-6">
            <div className="flex gap-4">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-teal-100 text-sm font-bold text-teal-700">1</div>
              <div>
                <h3 className="text-base font-bold text-slate-900 font-heading">Text or Call to Book Your {n.name} Stretch Service</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Send a text or call {SITE_PHONE} with your {n.name} address (or nearby cross streets), preferred date and time, and any specific concerns (back pain, recovery, flexibility goals). Our team responds within minutes and confirms your {n.name} stretch service appointment.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-teal-100 text-sm font-bold text-teal-700">2</div>
              <div>
                <h3 className="text-base font-bold text-slate-900 font-heading">Your Therapist Arrives at Your {n.name} Location</h3>
                <p className="mt-1 text-sm text-slate-600">
                  On the day of your appointment, your certified stretch therapist arrives at your {n.name} location — whether that is your apartment, office, hotel room, or even a park nearby. They bring a portable stretch table, resistance bands, foam rollers, and all other professional equipment. Setup takes approximately 5 minutes. You do not need to provide anything.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-teal-100 text-sm font-bold text-teal-700">3</div>
              <div>
                <h3 className="text-base font-bold text-slate-900 font-heading">60-Minute Professional Stretch Service Session</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Your session begins with a brief mobility assessment, followed by a full-body stretch service protocol customized to your needs. Your therapist uses techniques from our 11 stretch services — including <Link href={getServiceUrl(services[0])} className="text-teal-600 underline hover:text-teal-800">assisted stretching</Link>, <Link href={getServiceUrl(services[1])} className="text-teal-600 underline hover:text-teal-800">PNF stretching</Link>, and <Link href={getServiceUrl(services[6])} className="text-teal-600 underline hover:text-teal-800">myofascial release</Link> — based on what your body needs. The full session is 60 minutes for $99 per hour.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-teal-100 text-sm font-bold text-teal-700">4</div>
              <div>
                <h3 className="text-base font-bold text-slate-900 font-heading">Post-Session Recommendations and Weekly Booking</h3>
                <p className="mt-1 text-sm text-slate-600">
                  After your stretch service session, your therapist provides personalized recommendations — self-stretches to do between sessions, posture adjustments for your daily routine, and a suggested stretch service frequency. Most {n.name} residents find that weekly stretch service at $89 per session (10% off) delivers the best results. Your therapist breaks down all equipment, and your {n.name} space is back to normal in minutes.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════ FAQ ═══════════════ */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl font-heading">{n.name} Stretch Service — Frequently Asked Questions</h2>
          <p className="mt-3 text-base text-slate-600">
            Common questions about booking stretch service in {n.name}, {n.borough}. If your question is not answered below, text {SITE_PHONE} and we will respond within minutes.
          </p>
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

      {/* ═══════════════ OTHER BOROUGH NEIGHBORHOODS ═══════════════ */}
      {siblingNeighborhoods.length > 0 && (
        <section className="bg-section-white py-16">
          <div className="mx-auto max-w-4xl px-6">
            <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl font-heading">Other {n.borough} Neighborhoods With Stretch Service</h2>
            <p className="mt-3 text-base text-slate-600">
              We deliver mobile stretch service across all of {n.borough} — not just {n.name}. If you work in one neighborhood and live in another, you can book stretch service at either location. Here are other {n.borough} neighborhoods where our certified stretch therapists are available at $99 per hour.
            </p>
            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {siblingNeighborhoods.map((sn) => (
                <Link key={sn.slug} href={getNeighborhoodUrl(sn)}>
                  <div className="group rounded-xl border border-slate-200 bg-white p-4 text-center transition-all hover:border-teal-400 hover:shadow-md">
                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-teal-600 font-heading">{sn.name}</h3>
                    <p className="mt-1 text-xs text-slate-500">Stretch Service</p>
                  </div>
                </Link>
              ))}
            </div>
            <p className="mt-6 text-center text-sm text-slate-500">
              <Link href={getBoroughUrl(b)} className="text-teal-600 underline hover:text-teal-800">View all {n.borough} neighborhoods with stretch service &rarr;</Link>
            </p>
          </div>
        </section>
      )}

      {/* ═══════════════ FINAL CTA ═══════════════ */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 py-16">
        <div className="absolute inset-0 grid-bg opacity-20" />
        <div className="relative mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-2xl font-bold text-white sm:text-3xl font-heading">Book Stretch Service in {n.name} Today</h2>
          <p className="mt-4 text-lg text-white/80">
            Professional mobile stretch service delivered anywhere in {n.name}, {n.borough}. Same-day appointments available 7AM to 10PM daily. Our certified stretch therapists come to your home, office, or hotel with all equipment included.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-6">
            <div className="rounded-lg bg-white/10 px-5 py-3 backdrop-blur-sm">
              <p className="text-3xl font-bold text-white font-heading">$99</p>
              <p className="text-sm font-medium text-teal-200">PER HOUR</p>
            </div>
            <div className="rounded-lg bg-white/10 px-5 py-3 backdrop-blur-sm">
              <p className="text-3xl font-bold text-white font-heading">10%</p>
              <p className="text-sm font-medium text-teal-200">OFF WEEKLY</p>
            </div>
          </div>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a href={SITE_SMS_LINK}><span className="inline-block rounded-lg bg-white px-8 py-3.5 text-base font-semibold text-teal-700 shadow-lg transition-colors hover:bg-teal-50 font-cta">Text {SITE_PHONE} — Book Now</span></a>
            <Link href={getBoroughUrl(b)}><span className="inline-block rounded-lg border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:border-white/60 font-cta">All {n.borough} Neighborhoods</span></Link>
          </div>
        </div>
      </section>
    </>
  );
}
