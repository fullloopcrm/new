// @ts-nocheck
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import {
  services,
  findServiceBySlug,
  getServiceUrl,
  neighborhoods,
  boroughs,
  parks,
  getNeighborhoodUrl,
  getBoroughUrl,
  getParkUrl,
  SITE_URL,
  SITE_SMS_LINK,
  SITE_PHONE,
  SITE_PHONE_LINK,
} from "@/app/site/stretch-ny/_lib/siteData";
import { JsonLd, webPageSchema, breadcrumbSchema, faqSchema, serviceSchema } from "@/app/site/stretch-ny/_lib/schema";
import Logo from "@/app/site/stretch-ny/_components/Logo";

interface Props {
  params: Promise<{ slug: string }>;
}

export const dynamicParams = true
export const revalidate = 2592000

export async function generateStaticParams() { return [] }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const service = findServiceBySlug(slug);
  if (!service) return {};
  return {
    title: `${service.name} Stretch Service NYC | $99/hr Mobile`,
    description: `${service.shortDesc} Professional mobile stretch service. $99/hr, 10% off weekly. NYC-wide. Same-day available 7AM-10PM.`,
    alternates: { canonical: `${SITE_URL}${getServiceUrl(service)}` },
  };
}

export default async function ServicePage({ params }: Props) {
  const { slug } = await params;
  const service = findServiceBySlug(slug);
  if (!service) notFound();

  const otherServices = services.filter((s) => s.slug !== slug);
  const pageUrl = `${SITE_URL}${getServiceUrl(service)}`;

  /* Neighborhood helpers */
  const manhattanHoods = neighborhoods.filter((n) => n.boroughSlug === "manhattan");
  const brooklynHoods = neighborhoods.filter((n) => n.boroughSlug === "brooklyn");
  const queensHoods = neighborhoods.filter((n) => n.boroughSlug === "queens");
  const bronxHoods = neighborhoods.filter((n) => n.boroughSlug === "bronx");
  const statenIslandHoods = neighborhoods.filter((n) => n.boroughSlug === "staten-island");

  const manhattanParks = parks.filter((p) => p.boroughSlug === "manhattan");
  const brooklynParks = parks.filter((p) => p.boroughSlug === "brooklyn");
  const queensParks = parks.filter((p) => p.boroughSlug === "queens");
  const bronxParks = parks.filter((p) => p.boroughSlug === "bronx");

  /* Top neighborhoods for combos */
  const comboNeighborhoods = [
    ...manhattanHoods.slice(0, 4),
    ...brooklynHoods.slice(0, 3),
    ...queensHoods.slice(0, 2),
    ...bronxHoods.slice(0, 1),
  ];

  const pageFaqs = [
    {
      question: `What is ${service.name} and how does it differ from other stretch services?`,
      answer: `${service.name} is a professional mobile stretch service that focuses on ${service.tagline.toLowerCase()}. Unlike generic stretching routines you might find at a gym or fitness class, our ${service.name.toLowerCase()} stretch service is delivered one-on-one by certified stretch therapists who customize every session to your body&apos;s unique needs. ${service.description} This stretch service is available across all five boroughs of New York City, and our therapists bring professional-grade equipment directly to your location — whether that&apos;s your apartment, office, hotel room, or even a park.`,
    },
    {
      question: `How much does ${service.name} stretch service cost in NYC?`,
      answer: `Our ${service.name.toLowerCase()} stretch service is priced at $99 per 60-minute session. If you commit to a weekly program, you receive 10% off — bringing your per-session cost down to just $89. All sessions are fully mobile, meaning we come to your home, office, hotel, or any NYC location with professional equipment included. There are no hidden fees, no membership requirements, and no long-term contracts. You can book a single session to try it out, or start a weekly program immediately for the best value. Text or call ${SITE_PHONE} to book your first session today.`,
    },
    {
      question: `Who is ${service.name} stretch service best for?`,
      answer: `${service.name} is ideal for a wide range of people: ${service.idealFor.join(", ")}. Our certified therapists customize each ${service.name.toLowerCase()} session to your specific needs, goals, and fitness level. Whether you are a professional athlete training in Manhattan, a desk worker dealing with chronic neck and shoulder tension in Midtown, a senior looking to maintain mobility in Brooklyn, or a tourist recovering from a long day of sightseeing in Times Square, this stretch service adapts to you. We have successfully helped thousands of New Yorkers improve their flexibility, reduce pain, and move better through life.`,
    },
    {
      question: `Can I get same-day ${service.name} in NYC?`,
      answer: `Yes, absolutely. We offer same-day ${service.name.toLowerCase()} appointments across all five boroughs — Manhattan, Brooklyn, Queens, Bronx, and Staten Island. Our team of certified stretch therapists is available seven days a week from 7AM to 10PM. Same-day availability depends on therapist schedules in your area, but we can typically accommodate requests with as little as two hours&apos; notice. For guaranteed scheduling, we recommend booking at least 24 hours in advance. Text or call ${SITE_PHONE} to check same-day availability for this stretch service near you.`,
    },
    {
      question: `What should I wear for a ${service.name} session?`,
      answer: `For your ${service.name.toLowerCase()} stretch service session, wear comfortable athletic clothing that allows full range of motion — think yoga pants, athletic shorts, a t-shirt, or anything you would wear to a gym or yoga class. Avoid jeans, belts, heavy zippers, or restrictive clothing. You do not need to bring any equipment — our therapists arrive with everything needed for a professional ${service.name.toLowerCase()} session, including a portable treatment table, resistance bands, and any other tools specific to your stretch service. We recommend having a small open area in your space, roughly six by eight feet, for the session.`,
    },
    {
      question: `How often should I get ${service.name} stretch service?`,
      answer: `For optimal results, we recommend ${service.name.toLowerCase()} stretch service once or twice per week. Consistency is the key to lasting flexibility improvements, pain reduction, and mobility gains. Most clients notice immediate improvements after their very first session, but the real transformation happens over four to eight weeks of regular sessions. That is why we offer our weekly program at just $89 per session (10% off the single-session rate of $99). Many of our long-term clients in neighborhoods like the Upper East Side, Williamsburg, and Park Slope have been stretching with us weekly for months and report life-changing results.`,
    },
    {
      question: `Is ${service.name} safe for people with injuries or chronic pain?`,
      answer: `Yes, ${service.name.toLowerCase()} stretch service is safe for most people with injuries or chronic pain, but we always recommend consulting with your doctor first if you have a serious medical condition. Our certified stretch therapists are trained to work with clients who have chronic pain conditions, past injuries, post-surgical limitations, and age-related stiffness. Before every session, your therapist conducts a thorough assessment of your current condition, pain levels, and limitations. They then customize the ${service.name.toLowerCase()} session to work within your comfort zone while still achieving meaningful progress. We never push past your limits, and you are always in control.`,
    },
    {
      question: `What areas of NYC do you serve for ${service.name}?`,
      answer: `Our ${service.name.toLowerCase()} stretch service covers all five boroughs of New York City. In Manhattan, we serve neighborhoods from the Financial District to Washington Heights. In Brooklyn, we cover Williamsburg, Park Slope, DUMBO, Brooklyn Heights, and beyond. In Queens, we serve Astoria, Long Island City, Flushing, and more. We also serve the Bronx and Staten Island. No matter where you are in NYC, our mobile stretch therapists can come to your home, office, hotel, gym, or even outdoor locations like Central Park and Prospect Park. Text ${SITE_PHONE} with your location and we will confirm availability.`,
    },
  ];

  return (
    <>
      <JsonLd data={webPageSchema(`${service.name} in NYC`, service.shortDesc, pageUrl)} />
      <JsonLd data={breadcrumbSchema([
        { name: "Home", url: SITE_URL },
        { name: "Services", url: `${SITE_URL}/services` },
        { name: service.name, url: pageUrl },
      ])} />
      <JsonLd data={serviceSchema(service.name, service.description, pageUrl)} />
      <JsonLd data={faqSchema(pageFaqs)} />

      {/* ───────── HERO ───────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 pt-36 pb-16 sm:pt-44 sm:pb-20">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">
            $99/hr Mobile Stretch Service &mdash; {service.idealFor.slice(0,3).join(", ")}
          </p>
          <h1 className="text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl font-heading">
            {service.name} <span className="text-teal-200">Stretch Service NYC</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/80">
            Professional {service.name.toLowerCase()} delivered to your home, office, hotel, or any NYC location. Certified therapists. Same-day available 7AM-10PM. 10% off weekly at $89/session.
          </p>
          <p className="mx-auto mt-6 max-w-xl text-xl font-bold text-white">
            <strong className="text-2xl text-yellow-300">$99 PER HOUR</strong>{" "}
            &mdash; Weekly clients save with{" "}
            <strong className="text-2xl text-yellow-300">10% OFF WEEKLY ($89)</strong>
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a href={SITE_SMS_LINK}>
              <span className="inline-block rounded-lg bg-white px-8 py-3.5 text-base font-semibold text-teal-700 shadow-lg transition-colors hover:bg-teal-50 font-cta">
                Text {SITE_PHONE} &mdash; Book Now
              </span>
            </a>
            <a href={SITE_PHONE_LINK}>
              <span className="inline-block rounded-lg border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:border-white/60 font-cta">
                Call {SITE_PHONE}
              </span>
            </a>
            <Link href="/locations">
              <span className="inline-block rounded-lg border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:border-white/60 font-cta">
                View All Locations
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* ───────── DEEP ABOUT (800+ words) ───────── */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl font-heading">
            What Is {service.name} Stretch Service?
          </h2>

          <p className="mt-6 text-base leading-relaxed text-slate-600">
            {service.name} is one of the most sought-after professional stretch services in New York City, and for good reason. This specialized stretch service addresses the unique physical demands that come with living, working, and playing in one of the world&apos;s most fast-paced cities. Whether you&apos;re commuting through crowded subway cars, sitting at a desk in a Midtown high-rise for ten hours a day, training for the New York City Marathon in{" "}
            {manhattanParks.length > 0 && (
              <Link href={getParkUrl(manhattanParks[0])} className="text-teal-600 underline hover:text-teal-800">
                {manhattanParks[0].name}
              </Link>
            )}
            , or recovering from a long day of sightseeing from Times Square to the Brooklyn Bridge, {service.name.toLowerCase()} stretch service provides targeted, professional relief that generic stretching simply cannot match.
          </p>

          <p className="mt-4 text-base leading-relaxed text-slate-600">
            {service.description} When you book a {service.name.toLowerCase()} stretch service session with Stretch NYC, you are not getting a cookie-cutter routine pulled from a fitness app or YouTube video. Every session begins with a comprehensive assessment of your body&apos;s current state &mdash; your range of motion, pain points, movement restrictions, and personal goals. Your certified stretch therapist then designs a customized {service.name.toLowerCase()} protocol specifically for you, targeting the areas that need the most attention while working within your comfort zone to ensure both safety and maximum results.
          </p>

          <h3 className="mt-8 text-xl font-bold text-slate-900 font-heading">
            The Science Behind {service.name} Stretch Service
          </h3>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            The science behind {service.name.toLowerCase()} is well-documented in sports medicine and rehabilitation research. When muscles remain in shortened, contracted positions for extended periods &mdash; as they do when you sit at a desk, stand on a subway, or sleep in an awkward position &mdash; they develop what physiologists call &quot;adaptive shortening.&quot; Over time, these chronically shortened muscles create imbalances throughout your kinetic chain, leading to pain, reduced mobility, and increased injury risk. {service.name} stretch service directly counteracts this process by systematically lengthening and releasing these tight, restricted muscles under the guidance of a trained professional.
          </p>

          <p className="mt-4 text-base leading-relaxed text-slate-600">
            What makes professional {service.name.toLowerCase()} stretch service fundamentally different from self-stretching is the involvement of a trained therapist who can see what you cannot feel. When you stretch on your own, your body naturally compensates &mdash; shifting the stretch away from the tightest areas and into muscles that are already flexible. This is why so many people stretch regularly and never see improvement. A certified stretch therapist identifies these compensation patterns and uses specific techniques to isolate exactly the muscles that need work. The result is dramatically faster progress and more meaningful flexibility gains than you could ever achieve stretching alone.
          </p>

          <h3 className="mt-8 text-xl font-bold text-slate-900 font-heading">
            Why Professional {service.name} vs. DIY Stretching
          </h3>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            Many New Yorkers wonder whether they really need a professional {service.name.toLowerCase()} stretch service when they could just stretch at home or follow along with a video. The answer lies in the results. Research published in the Journal of Strength and Conditioning found that assisted stretching techniques produce significantly greater gains in range of motion compared to self-stretching alone. The reason is simple: your body has built-in protective mechanisms (the stretch reflex) that prevent you from reaching your true flexibility potential on your own. A trained therapist knows how to work with your nervous system, not against it, to unlock ranges of motion that are physically impossible to access by yourself.
          </p>

          <p className="mt-4 text-base leading-relaxed text-slate-600">
            Beyond the physical advantages, professional {service.name.toLowerCase()} stretch service offers something that self-stretching never can: accountability and consistency. When you have a certified therapist showing up at your door in{" "}
            {manhattanHoods.length > 0 && (
              <Link href={getNeighborhoodUrl(manhattanHoods[0])} className="text-teal-600 underline hover:text-teal-800">
                {manhattanHoods[0].name}
              </Link>
            )}
            ,{" "}
            {brooklynHoods.length > 0 && (
              <Link href={getNeighborhoodUrl(brooklynHoods[0])} className="text-teal-600 underline hover:text-teal-800">
                {brooklynHoods[0].name}
              </Link>
            )}
            , or{" "}
            {queensHoods.length > 0 && (
              <Link href={getNeighborhoodUrl(queensHoods[0])} className="text-teal-600 underline hover:text-teal-800">
                {queensHoods[0].name}
              </Link>
            )}
            {" "}at a scheduled time, you are far more likely to maintain the consistency that produces real, lasting results. Our clients who commit to weekly {service.name.toLowerCase()} stretch service sessions at <strong>$89 per session (10% off the single-session rate of $99)</strong> consistently report transformative improvements in their flexibility, pain levels, posture, and overall quality of life within just four to six weeks.
          </p>

          <p className="mt-4 text-base leading-relaxed text-slate-600">
            The mobile nature of our {service.name.toLowerCase()} stretch service means there are zero barriers to entry. You do not need to fight NYC traffic to get to a stretching studio, find parking, or squeeze a commute into your already-packed schedule. Our certified therapists come directly to you &mdash; your apartment, your office, your hotel, or even your favorite spot in{" "}
            {manhattanParks.length > 1 && (
              <Link href={getParkUrl(manhattanParks[1])} className="text-teal-600 underline hover:text-teal-800">
                {manhattanParks[1].name}
              </Link>
            )}
            {" "}or{" "}
            {brooklynParks.length > 0 && (
              <Link href={getParkUrl(brooklynParks[0])} className="text-teal-600 underline hover:text-teal-800">
                {brooklynParks[0].name}
              </Link>
            )}
            . They bring all the professional equipment needed for a full {service.name.toLowerCase()} session, set up in minutes, and leave your space exactly as they found it. It is the most convenient way to access world-class stretch therapy in New York City, and it is available at just <strong>$99 PER HOUR</strong> for single sessions or <strong>$89 per session with our 10% OFF WEEKLY</strong> program.
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            {service.idealFor.map((tag) => (
              <span key={tag} className="rounded-full bg-teal-50 px-3 py-1 text-xs font-medium text-teal-700 border border-teal-200/60">{tag}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ───────── KEY BENEFITS ───────── */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl font-heading">
            Key Benefits of {service.name} Stretch Service
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            Every {service.name.toLowerCase()} stretch service session with Stretch NYC delivers a comprehensive set of benefits that go far beyond basic flexibility. Our certified stretch therapists use their expertise to ensure that each of the following benefits is maximized during your session. Here is a detailed look at what makes this stretch service so effective for New Yorkers across every borough, from the{" "}
            <Link href={getBoroughUrl(boroughs[0])} className="text-teal-600 underline hover:text-teal-800">Manhattan</Link>
            {" "}skyline to the parks of{" "}
            <Link href={getBoroughUrl(boroughs[1])} className="text-teal-600 underline hover:text-teal-800">Brooklyn</Link>
            .
          </p>

          <div className="mt-8 space-y-6">
            {service.features.map((feature, i) => (
              <div key={i} className="rounded-xl border border-teal-200/60 bg-white p-6">
                <div className="flex gap-3 items-start">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-100 text-sm font-bold text-teal-700">{i + 1}</div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 font-heading">{feature}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">
                      {i === 0 && (
                        <>This foundational benefit of {service.name.toLowerCase()} stretch service sets the stage for everything else. When you work with a certified stretch therapist, you gain access to professional-grade techniques and personalized attention that addresses your body&apos;s specific needs. Unlike group classes or generic stretching videos, this one-on-one stretch service approach means every movement, every hold, and every adjustment is designed specifically for your body. Clients across NYC neighborhoods like {manhattanHoods.length > 1 && <Link href={getNeighborhoodUrl(manhattanHoods[1])} className="text-teal-600 underline hover:text-teal-800">{manhattanHoods[1].name}</Link>} and {brooklynHoods.length > 1 && <Link href={getNeighborhoodUrl(brooklynHoods[1])} className="text-teal-600 underline hover:text-teal-800">{brooklynHoods[1].name}</Link>} consistently rate this personalized approach as the number one reason they continue with weekly sessions.</>
                      )}
                      {i === 1 && (
                        <>This specific aspect of {service.name.toLowerCase()} stretch service is what separates professional stretch therapy from anything you can do on your own. The technique employed here directly targets the mechanisms that create lasting flexibility improvements and meaningful pain reduction. Research in sports science has demonstrated that this benefit alone can improve functional range of motion by fifteen to thirty percent over a series of consistent sessions. Whether you are an athlete training near {manhattanParks.length > 0 && <Link href={getParkUrl(manhattanParks[0])} className="text-teal-600 underline hover:text-teal-800">{manhattanParks[0].name}</Link>} or a desk worker in a {manhattanHoods.length > 2 && <Link href={getNeighborhoodUrl(manhattanHoods[2])} className="text-teal-600 underline hover:text-teal-800">{manhattanHoods[2].name}</Link>} high-rise, this benefit of our stretch service is immediately noticeable from your very first session.</>
                      )}
                      {i === 2 && (
                        <>One of the most impactful benefits of {service.name.toLowerCase()} stretch service is how it improves your body&apos;s ability to move freely through daily life. This goes beyond just being more flexible &mdash; it means walking up subway stairs without knee pain, reaching overhead shelves without shoulder impingement, and sitting through a long meeting without your back screaming at you. For the millions of New Yorkers who walk, climb, carry, and hustle their way through each day, this stretch service benefit translates directly into a better quality of life. Our therapists serving {queensHoods.length > 0 && <Link href={getNeighborhoodUrl(queensHoods[0])} className="text-teal-600 underline hover:text-teal-800">{queensHoods[0].name}</Link>} and {bronxHoods.length > 0 && <Link href={getNeighborhoodUrl(bronxHoods[0])} className="text-teal-600 underline hover:text-teal-800">{bronxHoods[0].name}</Link>} see this transformation in their clients every single week.</>
                      )}
                      {i === 3 && (
                        <>This benefit of our {service.name.toLowerCase()} stretch service addresses something that most people do not realize is holding them back. Tension and restriction in the body often accumulate so gradually that you do not notice until a professional therapist identifies the problem areas. Through expert assessment and targeted technique, this aspect of the stretch service reveals and addresses hidden limitations you may have been compensating for without knowing it. It is one of the most eye-opening parts of a first session, and many clients in neighborhoods from {brooklynHoods.length > 2 && <Link href={getNeighborhoodUrl(brooklynHoods[2])} className="text-teal-600 underline hover:text-teal-800">{brooklynHoods[2].name}</Link>} to {statenIslandHoods.length > 0 && <Link href={getNeighborhoodUrl(statenIslandHoods[0])} className="text-teal-600 underline hover:text-teal-800">{statenIslandHoods[0].name}</Link>} describe it as a revelation.</>
                      )}
                      {i === 4 && (
                        <>Perhaps the most immediately satisfying benefit of {service.name.toLowerCase()} stretch service is the tangible relief you feel during and after each session. While long-term flexibility improvement is the ultimate goal, the session-by-session experience of reduced tension, increased ease of movement, and pain relief keeps clients coming back. This is particularly valued by NYC professionals who carry stress in their neck and shoulders, runners who pound the pavement through {manhattanParks.length > 0 && <Link href={getParkUrl(manhattanParks[0])} className="text-teal-600 underline hover:text-teal-800">{manhattanParks[0].name}</Link>} and {brooklynParks.length > 0 && <Link href={getParkUrl(brooklynParks[0])} className="text-teal-600 underline hover:text-teal-800">{brooklynParks[0].name}</Link>}, and seniors who deal with daily stiffness. The immediate relief from this stretch service is what turns first-time clients into lifelong advocates.</>
                      )}
                      {i === 5 && (
                        <>Every body is different, and this benefit of {service.name.toLowerCase()} stretch service ensures that your sessions evolve with you over time. Your stretch therapist tracks your progress, identifies new areas of focus, and adjusts the intensity and technique of your stretch service as your body changes and improves. This dynamic, personalized approach means you never plateau and you never waste time on stretches that are not serving your specific needs. Clients who book weekly {service.name.toLowerCase()} sessions at our discounted rate of $89 per session benefit the most from this progressive approach, as their therapist develops deep familiarity with their body and can optimize every minute of each session.</>
                      )}
                      {i === 6 && (
                        <>The convenience factor of this {service.name.toLowerCase()} stretch service benefit cannot be overstated for busy New Yorkers. Our therapists arrive at your location anywhere in NYC &mdash; from luxury apartments on the Upper East Side to coworking spaces in {brooklynHoods.length > 0 && <Link href={getNeighborhoodUrl(brooklynHoods[0])} className="text-teal-600 underline hover:text-teal-800">{brooklynHoods[0].name}</Link>}, hotel rooms in Midtown, and corporate offices in the Financial District &mdash; with all the professional equipment needed for a full {service.name.toLowerCase()} session. You do not need to own any equipment, clear a huge amount of space, or prepare in any special way. Just wear comfortable clothing and your therapist handles absolutely everything else.</>
                      )}
                      {i === 7 && (
                        <>Safety is paramount in any stretch service, and this benefit reflects our commitment to your wellbeing. Our certified stretch therapists are trained to work within your body&apos;s limits while still pushing you toward meaningful improvement. Every movement is controlled, every technique is evidence-based, and every session respects your current physical condition. This makes our {service.name.toLowerCase()} stretch service appropriate for everyone from elite athletes preparing for competition to seniors working on maintaining their independence. With sessions available across all five NYC boroughs at <strong>$99 PER HOUR</strong> (or <strong>$89 with 10% OFF WEEKLY</strong>), professional stretch therapy has never been more accessible or more safe.</>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────── WHO THIS IS FOR ───────── */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl font-heading">
            Who Is {service.name} Stretch Service For?
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            Our {service.name.toLowerCase()} stretch service is designed to serve a wide range of New Yorkers, from elite athletes to complete beginners. Below we explore exactly how this stretch service benefits each type of client and why so many people across NYC&apos;s diverse neighborhoods trust Stretch NYC with their flexibility and mobility goals.
          </p>

          <div className="mt-8 space-y-6">
            {service.idealFor.map((persona, i) => (
              <div key={persona} className="rounded-xl border border-slate-200 bg-white p-6">
                <h3 className="text-lg font-bold text-slate-900 font-heading">{persona}</h3>
                <p className="mt-3 text-base leading-relaxed text-slate-600">
                  {i === 0 && (
                    <>{persona} are among the most common clients for our {service.name.toLowerCase()} stretch service in New York City. The daily grind of NYC life &mdash; whether that means sitting at a desk in a {manhattanHoods.length > 2 && <Link href={getNeighborhoodUrl(manhattanHoods[2])} className="text-teal-600 underline hover:text-teal-800">{manhattanHoods[2].name}</Link>} office for eight to ten hours, commuting on packed subway trains, or walking miles through city streets &mdash; takes a tremendous toll on the body. {service.name} stretch service specifically targets the muscle groups and movement patterns most affected by these daily demands. Our therapists see clients in this category from every neighborhood in the city, from the corporate towers of the Financial District to the creative offices of {brooklynHoods.length > 0 && <Link href={getNeighborhoodUrl(brooklynHoods[0])} className="text-teal-600 underline hover:text-teal-800">{brooklynHoods[0].name}</Link>}. They consistently report that weekly {service.name.toLowerCase()} sessions have dramatically reduced their chronic pain, improved their posture, and given them more energy throughout the workday. At just <strong>$89 per weekly session</strong>, this stretch service pays for itself in reduced pain and increased productivity.</>
                  )}
                  {i === 1 && (
                    <>{persona} represent another major client group for {service.name.toLowerCase()} stretch service. Whether you are training for the NYC Marathon with runs through {manhattanParks.length > 0 && <Link href={getParkUrl(manhattanParks[0])} className="text-teal-600 underline hover:text-teal-800">{manhattanParks[0].name}</Link>}, hitting the gym in {brooklynHoods.length > 1 && <Link href={getNeighborhoodUrl(brooklynHoods[1])} className="text-teal-600 underline hover:text-teal-800">{brooklynHoods[1].name}</Link>}, or playing competitive sports in {queensHoods.length > 0 && <Link href={getNeighborhoodUrl(queensHoods[0])} className="text-teal-600 underline hover:text-teal-800">{queensHoods[0].name}</Link>}, {service.name.toLowerCase()} stretch service enhances your performance, accelerates your recovery, and significantly reduces your injury risk. Our stretch therapists work with everyone from weekend warriors to professional athletes, and they understand the specific demands that different sports and activities place on the body. This stretch service can be tailored as a pre-workout warm-up, a post-workout recovery session, or a standalone flexibility improvement program. Many athletes in our client base combine {service.name.toLowerCase()} with other stretch services like <Link href={getServiceUrl(otherServices[0])} className="text-teal-600 underline hover:text-teal-800">{otherServices[0].name}</Link> for maximum results.</>
                  )}
                  {i === 2 && (
                    <>{persona} find tremendous value in our {service.name.toLowerCase()} stretch service because it addresses their specific physical challenges with expert care and precision. Living in New York City means constantly adapting to an environment that was not designed for physical comfort &mdash; cramped apartments, hard subway seats, miles of concrete sidewalks, and the general stress of urban life all contribute to chronic tension and restricted mobility. {service.name} stretch service provides a targeted intervention that helps this group maintain and improve their physical wellbeing despite these environmental challenges. Our therapists serving neighborhoods across {boroughs.map((b, bi) => <span key={b.slug}>{bi > 0 && (bi === boroughs.length - 1 ? ", and " : ", ")}<Link href={getBoroughUrl(b)} className="text-teal-600 underline hover:text-teal-800">{b.name}</Link></span>)} understand the unique physical demands of each area and customize their stretch service approach accordingly.</>
                  )}
                  {i === 3 && (
                    <>{persona} benefit enormously from {service.name.toLowerCase()} stretch service because it provides a safe, controlled environment for improving physical function. Whether you are recovering from an injury, managing a chronic condition, or dealing with age-related stiffness, our certified stretch therapists know how to work within your limitations while still achieving meaningful progress. This stretch service is designed to meet you exactly where you are and take you forward at a pace that feels comfortable and safe. We have therapists experienced in working with this client group across all five boroughs, and they bring a level of patience, expertise, and care that makes every session both productive and enjoyable. Many clients in this category start with our {service.name.toLowerCase()} stretch service and eventually add sessions of <Link href={getServiceUrl(otherServices[1])} className="text-teal-600 underline hover:text-teal-800">{otherServices[1].name}</Link> as their condition improves.</>
                  )}
                  {i === 4 && (
                    <>{persona} are ideal candidates for {service.name.toLowerCase()} stretch service because this modality directly addresses the root causes of their discomfort. Rather than masking symptoms with temporary relief, our stretch therapists use {service.name.toLowerCase()} techniques to systematically address the muscle imbalances, fascial restrictions, and movement limitations that create ongoing issues. Many clients in this group have tried everything from generic physical therapy to pain medication without lasting results, and they find that professional {service.name.toLowerCase()} stretch service finally provides the sustained improvement they have been seeking. Our mobile service means there is no need to travel to an appointment &mdash; we come directly to your home in neighborhoods like {manhattanHoods.length > 3 && <Link href={getNeighborhoodUrl(manhattanHoods[3])} className="text-teal-600 underline hover:text-teal-800">{manhattanHoods[3].name}</Link>}, {brooklynHoods.length > 2 && <Link href={getNeighborhoodUrl(brooklynHoods[2])} className="text-teal-600 underline hover:text-teal-800">{brooklynHoods[2].name}</Link>}, or anywhere else in NYC.</>
                  )}
                  {i >= 5 && (
                    <>{persona} round out our diverse client base for {service.name.toLowerCase()} stretch service. No matter what brings you to professional stretching &mdash; whether it is performance enhancement, pain management, stress relief, rehabilitation, or simply a desire to move better and feel better &mdash; our certified therapists deliver a stretch service experience that exceeds expectations. The beauty of {service.name.toLowerCase()} is its versatility: the same fundamental techniques can be adjusted in intensity, duration, and focus to serve wildly different client needs. From high-powered executives in Tribeca to retirees in {statenIslandHoods.length > 0 && <Link href={getNeighborhoodUrl(statenIslandHoods[0])} className="text-teal-600 underline hover:text-teal-800">{statenIslandHoods[0].name}</Link>}, this stretch service adapts to every body. Book your first session at <strong>$99 per hour</strong> or start a weekly program at <strong>$89 per session (10% OFF WEEKLY)</strong> by texting {SITE_PHONE}.</>
                  )}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────── WHAT TO EXPECT (400+ words) ───────── */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl font-heading">
            What to Expect in a {service.name} Stretch Service Session
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            Booking your first {service.name.toLowerCase()} stretch service session with Stretch NYC is simple, and knowing what to expect helps you get the most out of your experience. Here is a detailed step-by-step walkthrough of what happens from the moment you book until your therapist packs up and leaves.
          </p>

          <div className="mt-8 space-y-6">
            <div className="rounded-xl border border-teal-200/60 bg-white p-6">
              <h3 className="text-lg font-bold text-teal-700 font-heading">Step 1: Booking Your Session</h3>
              <p className="mt-2 text-base leading-relaxed text-slate-600">
                Text or call {SITE_PHONE} to schedule your {service.name.toLowerCase()} stretch service session. Let us know your preferred date, time, and location anywhere in NYC. Whether you are in a high-rise apartment in{" "}
                {manhattanHoods.length > 4 && <Link href={getNeighborhoodUrl(manhattanHoods[4])} className="text-teal-600 underline hover:text-teal-800">{manhattanHoods[4].name}</Link>}
                , a brownstone in{" "}
                {brooklynHoods.length > 3 && <Link href={getNeighborhoodUrl(brooklynHoods[3])} className="text-teal-600 underline hover:text-teal-800">{brooklynHoods[3].name}</Link>}
                , a corporate office in the Financial District, or a hotel room near Times Square, we will match you with a certified stretch therapist in your area. Same-day appointments are often available with as little as two hours&apos; notice. Single sessions are <strong>$99 PER HOUR</strong>, and weekly programs are just <strong>$89 per session (10% OFF WEEKLY)</strong>.
              </p>
            </div>

            <div className="rounded-xl border border-teal-200/60 bg-white p-6">
              <h3 className="text-lg font-bold text-teal-700 font-heading">Step 2: Therapist Arrival and Setup</h3>
              <p className="mt-2 text-base leading-relaxed text-slate-600">
                Your certified stretch therapist arrives at your location at the scheduled time with all the professional equipment needed for your {service.name.toLowerCase()} stretch service session. This includes a portable treatment table, resistance bands, foam rollers, and any other tools specific to {service.name.toLowerCase()} technique. Setup takes about three to five minutes, and your therapist will need a space of approximately six by eight feet. They will introduce themselves, confirm your appointment details, and create a comfortable, professional environment for your session.
              </p>
            </div>

            <div className="rounded-xl border border-teal-200/60 bg-white p-6">
              <h3 className="text-lg font-bold text-teal-700 font-heading">Step 3: Assessment and Consultation</h3>
              <p className="mt-2 text-base leading-relaxed text-slate-600">
                Before any stretching begins, your therapist conducts a thorough assessment of your current physical condition. This includes a discussion of your goals, any pain or discomfort you are experiencing, your activity level, any injuries or medical conditions, and your experience with stretching. They will also perform a brief movement assessment to identify your current range of motion, areas of tightness, and any muscle imbalances. This assessment is what separates professional {service.name.toLowerCase()} stretch service from generic stretching &mdash; it ensures that every minute of your session is targeted and effective. For returning clients, this step is shorter as your therapist already knows your body and can quickly check in on progress since your last session.
              </p>
            </div>

            <div className="rounded-xl border border-teal-200/60 bg-white p-6">
              <h3 className="text-lg font-bold text-teal-700 font-heading">Step 4: The {service.name} Session</h3>
              <p className="mt-2 text-base leading-relaxed text-slate-600">
                The core of your session is approximately 50 minutes of hands-on {service.name.toLowerCase()} stretch service. Your therapist guides your body through a series of targeted positions and movements designed to address your specific needs. Throughout the session, they communicate constantly &mdash; checking your comfort level, explaining what each movement targets, and adjusting intensity based on your feedback. You may feel deep stretching sensations, tension release, and occasionally mild discomfort as tight muscles let go, but you should never feel sharp pain. If anything feels off, your therapist adjusts immediately. Many clients report feeling deeply relaxed during this portion of the session, with some even falling asleep during gentler stretches.
              </p>
            </div>

            <div className="rounded-xl border border-teal-200/60 bg-white p-6">
              <h3 className="text-lg font-bold text-teal-700 font-heading">Step 5: Post-Session Review and Next Steps</h3>
              <p className="mt-2 text-base leading-relaxed text-slate-600">
                After your {service.name.toLowerCase()} stretch service session, your therapist will walk you through what they found, what they worked on, and what they recommend going forward. They may suggest specific self-care stretches to do between sessions, recommend a frequency for future sessions, or suggest complementary stretch services like{" "}
                <Link href={getServiceUrl(otherServices[2])} className="text-teal-600 underline hover:text-teal-800">{otherServices[2].name}</Link>
                {" "}or{" "}
                <Link href={getServiceUrl(otherServices[3])} className="text-teal-600 underline hover:text-teal-800">{otherServices[3].name}</Link>
                {" "}that could enhance your results. They will pack up their equipment and leave your space exactly as they found it. The entire experience, from arrival to departure, takes approximately 70 minutes for a 60-minute session. Most clients feel an immediate difference in their mobility and pain levels, and many report sleeping significantly better the night after their first {service.name.toLowerCase()} session.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ───────── BY BOROUGH (500+ words) ───────── */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl font-heading">
            {service.name} Stretch Service by Borough
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            Our {service.name.toLowerCase()} stretch service covers every corner of New York City. Here is how residents and visitors in each borough use this stretch service to improve their lives.
          </p>

          <div className="mt-8 space-y-8">
            {/* Manhattan */}
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="text-xl font-bold text-slate-900 font-heading">
                <Link href={getBoroughUrl(boroughs[0])} className="hover:text-teal-600">{service.name} Stretch Service in Manhattan</Link>
              </h3>
              <p className="mt-3 text-base leading-relaxed text-slate-600">
                Manhattan is our busiest borough for {service.name.toLowerCase()} stretch service, and it is easy to see why. The island is packed with desk workers, corporate professionals, Broadway performers, and tourists who put extraordinary demands on their bodies every single day. In neighborhoods like{" "}
                {manhattanHoods.slice(0, 6).map((n, i) => (
                  <span key={n.slug}>
                    {i > 0 && (i === 5 ? ", and " : ", ")}
                    <Link href={getNeighborhoodUrl(n)} className="text-teal-600 underline hover:text-teal-800">{n.name}</Link>
                  </span>
                ))}
                , our therapists deliver {service.name.toLowerCase()} sessions in apartments, offices, hotel rooms, and even outdoor spaces in{" "}
                {manhattanParks.slice(0, 3).map((p, i) => (
                  <span key={p.slug}>
                    {i > 0 && (i === 2 ? ", and " : ", ")}
                    <Link href={getParkUrl(p)} className="text-teal-600 underline hover:text-teal-800">{p.name}</Link>
                  </span>
                ))}
                . Manhattan clients particularly value the mobile nature of this stretch service because getting anywhere on the island already takes long enough &mdash; the last thing anyone wants is another commute to a stretching studio. At <strong>$99 per hour</strong>, our {service.name.toLowerCase()} stretch service is competitively priced for Manhattan, and the weekly rate of <strong>$89 (10% OFF)</strong> makes consistent sessions accessible even on a tight budget.
              </p>
            </div>

            {/* Brooklyn */}
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="text-xl font-bold text-slate-900 font-heading">
                <Link href={getBoroughUrl(boroughs[1])} className="hover:text-teal-600">{service.name} Stretch Service in Brooklyn</Link>
              </h3>
              <p className="mt-3 text-base leading-relaxed text-slate-600">
                Brooklyn&apos;s fitness-conscious population makes it a natural fit for {service.name.toLowerCase()} stretch service. From the yoga studios and CrossFit boxes of{" "}
                {brooklynHoods.slice(0, 5).map((n, i) => (
                  <span key={n.slug}>
                    {i > 0 && (i === 4 ? ", and " : ", ")}
                    <Link href={getNeighborhoodUrl(n)} className="text-teal-600 underline hover:text-teal-800">{n.name}</Link>
                  </span>
                ))}
                , our therapists work with a diverse range of clients who understand the value of professional stretch therapy. Brooklyn runners who train along the paths of{" "}
                {brooklynParks.slice(0, 2).map((p, i) => (
                  <span key={p.slug}>
                    {i > 0 && " and "}
                    <Link href={getParkUrl(p)} className="text-teal-600 underline hover:text-teal-800">{p.name}</Link>
                  </span>
                ))}
                {" "}are among our most loyal weekly clients, using {service.name.toLowerCase()} stretch service to maintain peak performance and prevent the overuse injuries that come with high-volume training on hard surfaces. Young professionals working remotely from Brooklyn apartments also rely heavily on this stretch service to combat the effects of all-day desk work without the ergonomic setups they might have in a corporate office.
              </p>
            </div>

            {/* Queens */}
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="text-xl font-bold text-slate-900 font-heading">
                <Link href={getBoroughUrl(boroughs[2])} className="hover:text-teal-600">{service.name} Stretch Service in Queens</Link>
              </h3>
              <p className="mt-3 text-base leading-relaxed text-slate-600">
                Queens is the most ethnically diverse urban area in the world, and our {service.name.toLowerCase()} stretch service reflects that diversity in our client base. In neighborhoods like{" "}
                {queensHoods.slice(0, 5).map((n, i) => (
                  <span key={n.slug}>
                    {i > 0 && (i === 4 ? ", and " : ", ")}
                    <Link href={getNeighborhoodUrl(n)} className="text-teal-600 underline hover:text-teal-800">{n.name}</Link>
                  </span>
                ))}
                , we serve everyone from young families to retirees, from construction workers to tech professionals. Queens residents often have longer commutes than other boroughs, which means more time sitting on trains and buses, more walking between transfers, and more physical strain by the end of each day. Our mobile {service.name.toLowerCase()} stretch service is especially valuable here because it eliminates the need for yet another trip &mdash; your therapist comes directly to your Queens home or office after your long day. Parks like{" "}
                {queensParks.slice(0, 2).map((p, i) => (
                  <span key={p.slug}>
                    {i > 0 && " and "}
                    <Link href={getParkUrl(p)} className="text-teal-600 underline hover:text-teal-800">{p.name}</Link>
                  </span>
                ))}
                {" "}are also popular outdoor session locations for Queens clients who prefer stretching in the open air.
              </p>
            </div>

            {/* Bronx */}
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="text-xl font-bold text-slate-900 font-heading">
                <Link href={getBoroughUrl(boroughs[3])} className="hover:text-teal-600">{service.name} Stretch Service in the Bronx</Link>
              </h3>
              <p className="mt-3 text-base leading-relaxed text-slate-600">
                The Bronx is home to some of NYC&apos;s most active communities, and our {service.name.toLowerCase()} stretch service is growing rapidly here. From{" "}
                {bronxHoods.slice(0, 4).map((n, i) => (
                  <span key={n.slug}>
                    {i > 0 && (i === 3 ? ", and " : ", ")}
                    <Link href={getNeighborhoodUrl(n)} className="text-teal-600 underline hover:text-teal-800">{n.name}</Link>
                  </span>
                ))}
                , Bronx residents are discovering the life-changing benefits of professional {service.name.toLowerCase()} stretch service. The borough&apos;s strong sports culture &mdash; with everything from basketball leagues to boxing gyms &mdash; means there is enormous demand for professional stretch services that help athletes perform better and recover faster. Our therapists also work with a significant senior population in the Bronx, providing gentle, safe {service.name.toLowerCase()} sessions focused on maintaining mobility and preventing falls. The beautiful green spaces of{" "}
                {bronxParks.slice(0, 2).map((p, i) => (
                  <span key={p.slug}>
                    {i > 0 && " and "}
                    <Link href={getParkUrl(p)} className="text-teal-600 underline hover:text-teal-800">{p.name}</Link>
                  </span>
                ))}
                {" "}offer wonderful settings for outdoor {service.name.toLowerCase()} sessions during warmer months.
              </p>
            </div>

            {/* Staten Island */}
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="text-xl font-bold text-slate-900 font-heading">
                <Link href={getBoroughUrl(boroughs[4])} className="hover:text-teal-600">{service.name} Stretch Service in Staten Island</Link>
              </h3>
              <p className="mt-3 text-base leading-relaxed text-slate-600">
                Staten Island residents enjoy a more suburban pace of life, but that does not mean they are immune to the physical demands that make {service.name.toLowerCase()} stretch service so valuable. In neighborhoods like{" "}
                {statenIslandHoods.slice(0, 4).map((n, i) => (
                  <span key={n.slug}>
                    {i > 0 && (i === 3 ? ", and " : ", ")}
                    <Link href={getNeighborhoodUrl(n)} className="text-teal-600 underline hover:text-teal-800">{n.name}</Link>
                  </span>
                ))}
                , our therapists serve clients who commute to Manhattan daily via the Staten Island Ferry or the Verrazzano Bridge, enduring some of the longest commutes in the city. These commuters accumulate tremendous physical tension from hours of sitting, standing, and walking each day, making regular {service.name.toLowerCase()} stretch service essential for maintaining their health and comfort. Staten Island&apos;s active retiree community also represents a growing segment of our client base, with many seniors booking weekly {service.name.toLowerCase()} sessions at <strong>$89 per session (10% OFF WEEKLY)</strong> to maintain their independence and quality of life.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ───────── PRICING ───────── */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl font-heading">
            {service.name} Stretch Service Pricing
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-slate-600">
            Professional {service.name.toLowerCase()} stretch service delivered to your door anywhere in New York City. No hidden fees, no membership requirements, no long-term contracts. Every session includes a full mobility assessment, customized treatment, professional equipment, and a take-home care plan. Our pricing is transparent and competitive for the level of certified, one-on-one stretch therapy you receive.
          </p>

          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 max-w-xl mx-auto">
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <p className="text-4xl font-bold text-teal-700">$99</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">Single 60-Min Session</p>
              <p className="mt-3 text-sm text-slate-500">
                Perfect for trying {service.name.toLowerCase()} stretch service for the first time, one-off recovery sessions, or booking whenever you need it. No commitment required &mdash; pay per session and experience the full benefit of professional stretch therapy on your schedule.
              </p>
            </div>
            <div className="rounded-xl border-2 border-teal-500 bg-white p-6 relative">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-teal-600 px-4 py-1 text-xs font-bold text-white">BEST VALUE</span>
              <p className="text-4xl font-bold text-teal-700">$89</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">Weekly Program (10% Off)</p>
              <p className="mt-3 text-sm text-slate-500">
                Our most popular option. Commit to weekly {service.name.toLowerCase()} stretch service sessions and save 10% on every session. Weekly clients see the fastest flexibility improvements, the most significant pain reduction, and the best long-term results. Your therapist develops deep familiarity with your body and can optimize every session for maximum benefit.
              </p>
            </div>
          </div>

          <p className="mx-auto mt-8 max-w-2xl text-base leading-relaxed text-slate-600">
            Both pricing options include mobile service to any location in NYC&apos;s five boroughs. Whether your {service.name.toLowerCase()} stretch service takes place in a{" "}
            <Link href={getBoroughUrl(boroughs[0])} className="text-teal-600 underline hover:text-teal-800">Manhattan</Link>
            {" "}penthouse, a{" "}
            <Link href={getBoroughUrl(boroughs[1])} className="text-teal-600 underline hover:text-teal-800">Brooklyn</Link>
            {" "}walk-up, a{" "}
            <Link href={getBoroughUrl(boroughs[2])} className="text-teal-600 underline hover:text-teal-800">Queens</Link>
            {" "}office, or anywhere else, the price is the same. Corporate packages for teams and offices are also available &mdash; contact us for custom pricing on group {service.name.toLowerCase()} stretch service programs.
          </p>

          <a href={SITE_SMS_LINK} className="mt-8 inline-block rounded-lg bg-teal-600 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:bg-teal-700 font-cta">
            Book {service.name} &mdash; Text {SITE_PHONE}
          </a>
        </div>
      </section>

      {/* ───────── FAQ (8+ questions) ───────── */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl font-heading">
            {service.name} Stretch Service FAQ
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            Below you will find answers to the most common questions about our {service.name.toLowerCase()} stretch service in New York City. If your question is not answered here, text us at {SITE_PHONE} and we will get back to you right away.
          </p>
          <div className="mt-8 space-y-3">
            {pageFaqs.map((faq) => (
              <details key={faq.question} className="group rounded-xl border border-slate-200 bg-white">
                <summary className="cursor-pointer px-6 py-4 text-base font-semibold text-slate-900 transition-colors hover:text-teal-700 font-heading">
                  {faq.question}
                </summary>
                <div className="px-6 pb-5 text-base leading-relaxed text-slate-600">{faq.answer}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ───────── LONG-TAIL SEO CONTENT ───────── */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl font-heading">
            Finding the Right {service.name} Stretch Service Near You in NYC
          </h2>

          <p className="mt-6 text-base leading-relaxed text-slate-600">
            If you have been searching for &quot;{service.name.toLowerCase()} stretch service NYC&quot;, &quot;mobile {service.name.toLowerCase()} near me&quot;, or &quot;{service.name.toLowerCase()} for back pain NYC&quot;, you have come to the right place. Stretch NYC is the premier provider of professional mobile {service.name.toLowerCase()} stretch service across all five boroughs of New York City. Unlike studio-based services that require you to commute to their location, our certified stretch therapists come directly to you &mdash; wherever you are in NYC.
          </p>

          <p className="mt-4 text-base leading-relaxed text-slate-600">
            Many New Yorkers discover our {service.name.toLowerCase()} stretch service after searching for terms like &quot;best stretching service in Manhattan&quot;, &quot;professional stretch therapist Brooklyn&quot;, &quot;{service.name.toLowerCase()} for athletes NYC&quot;, or &quot;mobile stretching Queens&quot;. No matter what brought you here, the result is the same: a world-class {service.name.toLowerCase()} stretch service delivered to your door by certified professionals who are passionate about helping you move better, feel better, and live better. Our stretch service is particularly popular among people searching for &quot;{service.name.toLowerCase()} for seniors near me&quot;, &quot;post-workout stretch service NYC&quot;, &quot;{service.name.toLowerCase()} for desk workers&quot;, and &quot;affordable stretching service New York City&quot;.
          </p>

          <p className="mt-4 text-base leading-relaxed text-slate-600">
            What sets our {service.name.toLowerCase()} stretch service apart from other stretching services in NYC is the combination of professional certification, mobile convenience, personalized treatment, and transparent pricing at just <strong>$99 PER HOUR</strong> (or <strong>$89 with 10% OFF WEEKLY</strong>). We do not believe in upselling packages you do not need, locking you into contracts you cannot cancel, or charging hidden fees for equipment or travel. Every {service.name.toLowerCase()} session is a complete, standalone experience that delivers real, measurable results.
          </p>

          <h3 className="mt-8 text-xl font-bold text-slate-900 font-heading">
            {service.name} Stretch Service for Common NYC Conditions
          </h3>

          <p className="mt-4 text-base leading-relaxed text-slate-600">
            New York City creates a unique set of physical challenges that {service.name.toLowerCase()} stretch service is perfectly positioned to address. <strong>{service.name} for back pain NYC</strong> is one of our most requested applications &mdash; whether your back pain comes from sitting at a desk all day, carrying heavy bags through the subway, or sleeping on a mattress that has seen better days, our therapists use {service.name.toLowerCase()} techniques to target the specific muscles and fascial restrictions causing your discomfort. Similarly, <strong>{service.name.toLowerCase()} for neck and shoulder tension</strong> addresses the epidemic of &quot;tech neck&quot; and rounded shoulders that affects nearly every New Yorker who uses a phone or computer regularly.
          </p>

          <p className="mt-4 text-base leading-relaxed text-slate-600">
            <strong>{service.name} for hip pain and tightness</strong> is another extremely common application of this stretch service, particularly among people who sit for long periods, run on hard surfaces, or commute via subway (where standing in cramped, swaying cars creates chronic hip flexor tension). Our therapists also frequently work with clients seeking <strong>{service.name.toLowerCase()} for sciatica NYC</strong>, <strong>{service.name.toLowerCase()} for plantar fasciitis</strong>, <strong>{service.name.toLowerCase()} for headaches and migraines</strong>, and <strong>{service.name.toLowerCase()} for stress and anxiety relief</strong>. Each of these conditions responds remarkably well to consistent, professional stretch therapy, and our {service.name.toLowerCase()} stretch service approach addresses the root cause rather than just masking the symptoms.
          </p>

          <p className="mt-4 text-base leading-relaxed text-slate-600">
            Whether you are looking for {service.name.toLowerCase()} near{" "}
            {manhattanParks.length > 0 && <Link href={getParkUrl(manhattanParks[0])} className="text-teal-600 underline hover:text-teal-800">{manhattanParks[0].name}</Link>}
            , {service.name.toLowerCase()} in{" "}
            {brooklynHoods.length > 0 && <Link href={getNeighborhoodUrl(brooklynHoods[0])} className="text-teal-600 underline hover:text-teal-800">{brooklynHoods[0].name}</Link>}
            , mobile {service.name.toLowerCase()} in{" "}
            {queensHoods.length > 0 && <Link href={getNeighborhoodUrl(queensHoods[0])} className="text-teal-600 underline hover:text-teal-800">{queensHoods[0].name}</Link>}
            , or the best stretch service in{" "}
            <Link href={getBoroughUrl(boroughs[3])} className="text-teal-600 underline hover:text-teal-800">the Bronx</Link>
            , our team of certified stretch therapists is ready to deliver an exceptional {service.name.toLowerCase()} experience directly to your location. Text {SITE_PHONE} today to book your first session.
          </p>
        </div>
      </section>

      {/* ───────── OTHER SERVICES ───────── */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-center text-2xl font-bold text-slate-900 sm:text-3xl font-heading">
            Other Professional Stretch Services in NYC
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base leading-relaxed text-slate-600">
            {service.name} is just one of the eleven professional stretch services we offer across New York City. Many of our clients combine multiple stretch services for optimal results. Explore our complete lineup below to find the perfect complement to your {service.name.toLowerCase()} sessions.
          </p>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {otherServices.map((s) => (
              <Link key={s.slug} href={getServiceUrl(s)}>
                <div className="group rounded-xl border border-slate-200 bg-white p-5 transition-all hover:border-teal-400 hover:shadow-md h-full">
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-teal-600 font-heading">{s.name}</h3>
                  <p className="mt-2 text-xs text-slate-500 leading-relaxed">{s.shortDesc}</p>
                  <p className="mt-3 text-xs font-semibold text-teal-600">Learn more &rarr;</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ───────── POPULAR NEIGHBORHOOD COMBOS ───────── */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl font-heading">
            Popular {service.name} Locations Across NYC
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            Our {service.name.toLowerCase()} stretch service is available in every neighborhood across New York City&apos;s five boroughs. Below are some of the most popular locations where our clients book {service.name.toLowerCase()} sessions. Click any neighborhood to learn more about our stretch services in that area, including nearby parks, landmarks, and session availability.
          </p>

          <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {comboNeighborhoods.map((n) => (
              <Link key={n.slug} href={getNeighborhoodUrl(n)}>
                <div className="group flex items-center gap-3 rounded-xl border border-teal-200/60 bg-white p-4 transition-all hover:border-teal-400 hover:shadow-md">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-100 text-sm font-bold text-teal-700">
                    {n.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-teal-600 font-heading">
                      {service.name} in {n.name}
                    </h3>
                    <p className="text-xs text-slate-500">{n.borough} &mdash; Mobile stretch service available</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-8 text-center">
            <Link href="/locations">
              <span className="inline-block rounded-lg border-2 border-teal-600 px-8 py-3 text-base font-semibold text-teal-700 transition-colors hover:bg-teal-600 hover:text-white font-cta">
                View All NYC Neighborhoods &rarr;
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* ───────── PARKS & OUTDOOR SESSIONS ───────── */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl font-heading">
            Outdoor {service.name} Stretch Service in NYC Parks
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            One of the unique advantages of our mobile {service.name.toLowerCase()} stretch service is the ability to have your session outdoors in any of NYC&apos;s beautiful parks and green spaces. There is something special about combining professional stretch therapy with fresh air and natural surroundings. Many of our clients prefer outdoor {service.name.toLowerCase()} sessions during the warmer months, and our therapists are fully equipped to deliver the same high-quality stretch service experience in a park setting. Here are some of the most popular parks where our clients book {service.name.toLowerCase()} stretch service sessions.
          </p>

          <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {parks.slice(0, 9).map((p) => (
              <Link key={p.slug} href={getParkUrl(p)}>
                <div className="group rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-teal-400 hover:shadow-md h-full">
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-teal-600 font-heading">{p.name}</h3>
                  <p className="text-xs text-slate-500">{p.borough}</p>
                  <p className="mt-2 text-xs text-slate-500 leading-relaxed line-clamp-2">{p.description}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ───────── WHY STRETCH NYC ───────── */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl font-heading">
            Why Choose Stretch NYC for {service.name} Stretch Service?
          </h2>

          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="rounded-xl border border-teal-200/60 bg-white p-6">
              <h3 className="text-lg font-bold text-slate-900 font-heading">Certified Professionals</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Every Stretch NYC therapist is professionally certified in {service.name.toLowerCase()} and multiple other stretch modalities. They undergo rigorous training and continuing education to ensure you receive the highest quality stretch service available in New York City. Our therapists are not personal trainers who dabble in stretching &mdash; they are dedicated stretch specialists who focus exclusively on helping clients achieve their flexibility and mobility goals.
              </p>
            </div>
            <div className="rounded-xl border border-teal-200/60 bg-white p-6">
              <h3 className="text-lg font-bold text-slate-900 font-heading">100% Mobile Service</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                We come to you, period. Your {service.name.toLowerCase()} stretch service session takes place wherever you are most comfortable &mdash; your home, office, hotel, gym, or even a park. Our therapists travel across all five boroughs with professional equipment, so you never have to add another commute to your already-busy NYC schedule. This mobile approach means more consistency, less friction, and better results for our clients across{" "}
                {boroughs.map((b, i) => (
                  <span key={b.slug}>{i > 0 && (i === boroughs.length - 1 ? ", and " : ", ")}<Link href={getBoroughUrl(b)} className="text-teal-600 underline hover:text-teal-800">{b.name}</Link></span>
                ))}.
              </p>
            </div>
            <div className="rounded-xl border border-teal-200/60 bg-white p-6">
              <h3 className="text-lg font-bold text-slate-900 font-heading">Transparent Pricing</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                <strong>$99 PER HOUR</strong> for single sessions. <strong>$89 per session with 10% OFF WEEKLY</strong> programs. That is it. No hidden fees, no surprise charges for equipment or travel, no mandatory packages, and no long-term contracts. You pay for exactly what you get: a professional, one-on-one {service.name.toLowerCase()} stretch service session with a certified therapist. We believe great stretch therapy should be accessible and straightforward, not wrapped in confusing pricing structures.
              </p>
            </div>
            <div className="rounded-xl border border-teal-200/60 bg-white p-6">
              <h3 className="text-lg font-bold text-slate-900 font-heading">Same-Day Availability</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Need a {service.name.toLowerCase()} stretch service session today? We often can accommodate same-day requests with as little as two hours&apos; notice. Our team of therapists is distributed across NYC&apos;s five boroughs, which means there is usually someone available near your location. Whether you woke up with a stiff back, just finished a tough workout, or have a last-minute need for professional stretch therapy, text {SITE_PHONE} and we will do our best to get you on the schedule today.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ───────── FINAL CTA ───────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 py-16">
        <div className="absolute inset-0 grid-bg opacity-20" />
        <div className="relative mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-2xl font-bold text-white sm:text-3xl font-heading">
            Ready for {service.name} Stretch Service in NYC?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/80">
            Professional {service.name.toLowerCase()} stretch service delivered to your door by certified therapists. Available seven days a week, 7AM to 10PM, across all five boroughs.
          </p>
          <p className="mx-auto mt-6 max-w-xl text-xl font-bold text-white">
            <strong className="text-2xl text-yellow-300">$99 PER HOUR</strong>{" "}
            &mdash; Weekly clients get{" "}
            <strong className="text-2xl text-yellow-300">10% OFF WEEKLY ($89)</strong>
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a href={SITE_SMS_LINK}>
              <span className="inline-block rounded-lg bg-white px-8 py-3.5 text-base font-semibold text-teal-700 shadow-lg transition-colors hover:bg-teal-50 font-cta">
                Text {SITE_PHONE} &mdash; Book Now
              </span>
            </a>
            <a href={SITE_PHONE_LINK}>
              <span className="inline-block rounded-lg border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:border-white/60 font-cta">
                Call {SITE_PHONE}
              </span>
            </a>
            <Link href="/locations">
              <span className="inline-block rounded-lg border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:border-white/60 font-cta">
                View NYC Locations
              </span>
            </Link>
          </div>
          <p className="mt-6 text-sm text-white/60">
            Same-day appointments available. No contracts. No hidden fees. Just professional {service.name.toLowerCase()} stretch service at your door.
          </p>
        </div>
      </section>
    </>
  );
}
