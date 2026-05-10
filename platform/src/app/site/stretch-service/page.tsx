// @ts-nocheck
import Link from "next/link";
import type { Metadata } from "next";
import { cities, parks, services, states, clientTypes, getCityUrl, getParkUrl, getServiceUrl, getStateUrl, getCitiesByState, getCityServiceUrl, getParksByState, SITE_URL, SITE_PHONE, SITE_SMS_LINK, SITE_PHONE_LINK } from "@/app/site/stretch-service/_lib/siteData";
import { JsonLd, faqSchema } from "@/app/site/stretch-service/_lib/schema";
import Logo from "@/app/site/stretch-service/_components/Logo";

export const metadata: Metadata = {
  title: "Assisted Stretch Service | $99/hr Nationwide Mobile | Stretch Service",
  description: "America's #1 assisted stretch service. Certified therapists come to your home, office, or hotel. $99/hr, 10% off weekly. 902 cities across 50 states. Same-day available 7AM-10PM.",
  alternates: { canonical: SITE_URL },
};

/* ─── Reviews ─── */

const reviews = [
  { name: "Angel Reyes", location: "New York, NY", initial: "A", text: "I cannot say enough great things about Stretch Service! After undergoing surgery to repair a partially torn Achilles tendon, my trainer William was exceptional. With his guidance, I regained not only my strength and conditioning, but also my stamina and mobility. This stretch service changed my recovery completely." },
  { name: "Dan Anghelescu", location: "New York, NY", initial: "D", text: "Game-changer for our whole family. Will has had extraordinary impact. His ability to tailor sessions to both adults and children is nothing short of extraordinary. He combines deep anatomical knowledge with intuitive adjustments. Best stretch service we have ever experienced." },
  { name: "Paula Stephenson", location: "Los Angeles, CA", initial: "P", text: "My experience was amazing. Will is knowledgeable, easy to talk to and caring. I felt relief from the many discomforts I had. My body felt better right after. I will definitely continue with my sessions. This mobile stretch service is worth every penny." },
  { name: "Kristina Cabral", location: "Chicago, IL", initial: "K", text: "Kelly is excellent. Professional and efficient. As an active softball player I can say I have never slept so peacefully after. Was extremely relieved and was more than what I expected. The stretch service came right to my apartment. Worth every penny!" },
  { name: "Michael Torres", location: "Houston, TX", initial: "M", text: "Best investment in my health I have made in years. The therapist came right to my office, super professional setup. After years of lower back pain from sitting at a desk, I finally have relief. This stretch service is a must for any desk worker." },
  { name: "Sarah Kim", location: "San Francisco, CA", initial: "S", text: "Incredible service! As a tech worker with chronic neck and shoulder tension, this has been life-changing. The therapist really understands the body and knew exactly where I was holding stress. Booking my weekly stretch service sessions was the best decision I made this year." },
  { name: "James O&apos;Brien", location: "Boston, MA", initial: "J", text: "I run marathons and train regularly. Recovery used to take me days. Since starting weekly sessions with Stretch Service, my recovery time has been cut in half. The PNF stretching techniques they use are incredible. Best stretch service for runners, hands down." },
  { name: "Linda Vasquez", location: "Miami, FL", initial: "L", text: "As a senior with arthritis, I was nervous about trying a stretch service. The gentle stretch program they offer is perfect for me. My therapist is patient, knowledgeable, and always makes me feel safe. I have more mobility now than I have had in ten years. They come right to my home." },
  { name: "Robert Chen", location: "Denver, CO", initial: "R", text: "We booked Stretch Service for our corporate team wellness day at our office. Twenty employees got stretched and the feedback was unanimous — everyone loved it. Productivity went up that week and we have now signed on for monthly corporate stretch service sessions." },
  { name: "Emily Watson", location: "Nashville, TN", initial: "E", text: "I was visiting Nashville from London and my legs were destroyed after three days of exploring. The hotel concierge recommended Stretch Service and they came to my hotel room within two hours. The recovery stretch service was exactly what I needed. I could actually enjoy my last two days in the city." },
];

/* ─── FAQ ─── */

const homeFaqs = [
  { question: "How much does a mobile stretch service session cost?", answer: "Our professional mobile stretch service is priced at $99 per 60-minute session. Weekly clients save 10% and pay just $89 per session. All sessions include a full-body mobility assessment, professional equipment, and a personalized treatment plan delivered directly to your location anywhere in the United States. Visit our pricing page for complete details." },
  { question: "Can I book a same-day stretch service appointment?", answer: "Yes! We offer same-day stretch service appointments across all 50 states. Call (888) 734-7274 to check availability in your city. Most same-day requests are confirmed within 30 minutes." },
  { question: "What is included in a mobile stretch service session?", answer: "Every stretch service session includes a comprehensive full-body mobility assessment, 60 minutes of professional stretching therapy, all necessary equipment (portable massage table, mats, stretching straps, and tools), a customized treatment plan, and personalized recommendations for maintaining progress between sessions. Our certified therapists bring everything needed to your location." },
  { question: "Do you offer weekly stretch service programs with a discount?", answer: "Yes! Our weekly stretch service programs are available at $89 per 60-minute session, saving you 10% compared to single sessions. Weekly clients receive priority scheduling, same-therapist continuity for consistent progress tracking, and significantly better long-term results. Most clients see measurable improvement after just four weekly sessions." },
  { question: "Are your stretch therapists certified and insured?", answer: "Absolutely. All Stretch Service therapists are fully certified in assisted stretching, PNF stretching, myofascial release, and sports rehabilitation. They carry professional liability insurance and have extensive experience serving clients. Learn more about our team on our about page." },
  { question: "How long is each stretch service session?", answer: "Our standard stretch service sessions are 60 minutes. This timeframe allows for a thorough mobility assessment, comprehensive stretching therapy targeting your specific needs, and post-session recommendations. The full hour ensures we address every problem area and leave you feeling significantly better than when we arrived." },
  { question: "Do you bring all equipment to my location?", answer: "Yes! Our therapists bring professional-grade equipment including a portable massage table, stretching mats, resistance bands, stretching straps, and all necessary tools. We transform any space — your living room, office, hotel room, or even a park — into a professional stretch service environment. You do not need to provide anything." },
  { question: "Can assisted stretching help with chronic back pain?", answer: "Yes, our stretch service is highly effective for managing chronic pain conditions including lower back pain, neck tension, sciatica, hip pain, and general muscle tightness. Our therapists use targeted PNF stretching and myofascial release techniques to address the root causes of your pain. Many clients report significant relief after their very first session." },
  { question: "Do you offer corporate wellness stretch service programs?", answer: "Yes! We provide on-site corporate stretch service programs for companies throughout the United States. Our corporate wellness stretching helps reduce workplace injuries, improve employee productivity, lower healthcare costs, and boost team morale. Visit our corporate wellness page for program details and pricing." },
  { question: "Do you provide stretch service at hotels for tourists?", answer: "Absolutely! We come directly to your hotel room anywhere in the country. We also meet tourists at iconic parks and locations in major cities. After a long day of walking 20,000+ steps exploring, our recovery stretch service will have you feeling refreshed for the next day. See our hotel stretching page for details." },
  { question: "What should I wear during a stretch service session?", answer: "Wear comfortable, stretchy clothing that allows full range of motion — athletic wear, yoga pants, shorts, or sweatpants work perfectly. Avoid jeans, belts, or restrictive clothing. You do not need special shoes; most stretching is done barefoot or in socks. Our therapists will guide you through everything once they arrive at your location." },
  { question: "How much space is needed for a stretch service session?", answer: "You need approximately a 6-by-8-foot clear area for our portable massage table setup. A living room, bedroom, office, or hotel room all work perfectly. If space is tight, our therapists are experts at adapting to smaller spaces. For outdoor sessions in parks, we bring mats and find a comfortable grassy area." },
  { question: "How often should I book a stretch service for best results?", answer: "For optimal results, we recommend weekly stretch service sessions. Our data shows that clients who commit to four or more consecutive weekly sessions see 3x greater flexibility improvement than single-session clients. After establishing a baseline, some clients transition to biweekly maintenance sessions. Your therapist will recommend a schedule based on your goals." },
  { question: "When will I see results from professional stretch service?", answer: "Most clients feel immediate relief and improved mobility after their very first stretch service session. Measurable flexibility gains typically appear after 3-4 consistent weekly sessions. Long-term benefits like reduced chronic pain, improved posture, and enhanced athletic performance develop over 6-8 weeks of regular stretching. Consistency is the key to lasting results." },
  { question: "Does insurance cover mobile stretch service sessions?", answer: "While most standard health insurance plans do not directly cover stretch service sessions, many HSA and FSA accounts can be used for our services. Some clients also receive reimbursement through their employer wellness programs. We provide detailed receipts that you can submit to your insurance provider or flexible spending account administrator." },
  { question: "Can I gift a stretch service session to someone?", answer: "Yes! Stretch service gift sessions are one of our most popular offerings. You can purchase a single session or a multi-session package for anyone in the United States. It is the perfect gift for birthdays, holidays, post-surgery recovery, or anyone who deserves to feel amazing. Contact us at (888) 734-7274 to arrange a gift session. Visit our discounts page for special offers." },
  { question: "Is stretch service safe for athletes and people who work out?", answer: "Professional stretch service is not only safe for athletes — it is essential. Our PNF stretching and dynamic stretching techniques are used by Olympic athletes, professional sports teams, and elite fitness competitors worldwide. Pre-workout dynamic stretching improves performance by 5-10%, while post-workout recovery stretching reduces soreness and accelerates healing." },
  { question: "Can seniors safely use your stretch service?", answer: "Absolutely. Our gentle stretch service program is specifically designed for seniors and those with limited mobility. We use slow, controlled movements with extra care and attention. Our therapists are trained in senior-specific techniques including chair-assisted stretching and arthritis-friendly methods. Regular gentle stretching helps prevent falls, maintain independence, and improve quality of life. Learn more on our gentle stretch service page." },
  { question: "What is PNF stretching and how does it work?", answer: "PNF (Proprioceptive Neuromuscular Facilitation) stretching is the gold standard of professional stretching techniques. It combines passive stretching with isometric muscle contractions to achieve 2-3x greater flexibility gains than static stretching alone. Your therapist guides you through contract-relax cycles that trick your nervous system into allowing deeper stretches. Visit our PNF stretch service page for a complete explanation." },
  { question: "What is your cancellation policy for stretch service appointments?", answer: "We ask for at least 4 hours notice for cancellations or rescheduling. Same-day cancellations with less than 4 hours notice may be subject to a cancellation fee. We understand that life is unpredictable, so we try to be as flexible as possible. To reschedule, simply text us at (888) 734-7274 and we will find a new time that works for you." },
  { question: "Do you offer stretch service for chronic pain conditions like sciatica?", answer: "Yes, our stretch service is particularly effective for chronic pain conditions including sciatica, herniated disc discomfort, piriformis syndrome, chronic lower back pain, neck tension, and fibromyalgia symptoms. Our therapists use a combination of targeted PNF stretching, myofascial release, and gentle mobility work to address the root causes of your pain. Visit our chronic pain page for more information." },
  { question: "Can I book a stretch service session in a park?", answer: "Yes! Outdoor stretch service sessions in parks are one of our specialties. We serve 300+ parks and iconic locations across the country including Central Park in New York, Millennium Park in Chicago, Golden Gate Park in San Francisco, and many more. We bring mats, resistance bands, and everything needed for a professional outdoor session. Check out our parks page to see all available locations." },
];

/* ─── Featured Cities ─── */

const topCities = cities.filter((c) =>
  ["new-york-city", "los-angeles", "chicago", "houston", "phoenix", "philadelphia", "san-antonio", "san-diego", "dallas", "miami", "austin", "denver", "seattle", "boston", "nashville", "san-francisco", "atlanta", "portland"].includes(c.slug)
).slice(0, 18);

const featuredParks = parks.filter((p) => p.touristRating >= 4).slice(0, 15);

/* ─── State groups for major states ─── */
const caTopCities = getCitiesByState("california").slice(0, 12);
const nyTopCities = getCitiesByState("new-york").slice(0, 12);
const txTopCities = getCitiesByState("texas").slice(0, 12);
const flTopCities = getCitiesByState("florida").slice(0, 12);
const ilTopCities = getCitiesByState("illinois").slice(0, 8);

/* ─── State park helpers ─── */
const caParks = getParksByState("california").slice(0, 5);
const nyParks = getParksByState("new-york").slice(0, 5);
const txParks = getParksByState("texas").slice(0, 5);
const flParks = getParksByState("florida").slice(0, 5);
const ilParks = getParksByState("illinois").slice(0, 5);

/* ─── Regional city groups ─── */
const westCoastSlugs = ["california", "washington", "oregon", "nevada", "hawaii", "alaska", "arizona", "utah", "colorado"];
const eastCoastSlugs = ["new-york", "massachusetts", "pennsylvania", "new-jersey", "connecticut", "maryland", "virginia", "rhode-island", "delaware", "maine", "new-hampshire", "vermont"];
const southSlugs = ["florida", "texas", "georgia", "north-carolina", "south-carolina", "tennessee", "louisiana", "alabama", "mississippi", "arkansas", "kentucky", "west-virginia", "oklahoma"];
const midwestSlugs = ["illinois", "ohio", "michigan", "indiana", "wisconsin", "minnesota", "missouri", "iowa", "kansas", "nebraska", "north-dakota", "south-dakota", "montana", "wyoming", "idaho", "new-mexico"];

const westCoastStates = states.filter((s) => westCoastSlugs.includes(s.slug));
const eastCoastStates = states.filter((s) => eastCoastSlugs.includes(s.slug));
const southStates = states.filter((s) => southSlugs.includes(s.slug));
const midwestStates = states.filter((s) => midwestSlugs.includes(s.slug));

/* ─── Popular city + service combos ─── */
const popularCombos = [
  { citySlug: "new-york-city", serviceIdx: 0 },
  { citySlug: "los-angeles", serviceIdx: 1 },
  { citySlug: "chicago", serviceIdx: 6 },
  { citySlug: "miami", serviceIdx: 8 },
  { citySlug: "houston", serviceIdx: 3 },
  { citySlug: "seattle", serviceIdx: 2 },
  { citySlug: "denver", serviceIdx: 4 },
  { citySlug: "boston", serviceIdx: 1 },
  { citySlug: "nashville", serviceIdx: 8 },
  { citySlug: "austin", serviceIdx: 3 },
  { citySlug: "san-francisco", serviceIdx: 6 },
  { citySlug: "phoenix", serviceIdx: 9 },
].map((combo) => {
  const city = cities.find((c) => c.slug === combo.citySlug);
  const service = services[combo.serviceIdx];
  return city && service ? { city, service } : null;
}).filter(Boolean) as { city: typeof cities[0]; service: typeof services[0] }[];

export default function HomePage() {
  return (
    <>
      <JsonLd data={faqSchema(homeFaqs)} />

      {/* ═══════════════════════════════════════════════════════
          SECTION 1 — HERO
      ═══════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 pt-36 pb-16 sm:pt-44 sm:pb-24">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <div className="mb-6 flex justify-center">
          </div>
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">America&apos;s #1 Assisted Stretch Service</p>
          <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl font-heading">
            NATIONWIDE <span className="gradient-text">ASSISTED</span><br />
            STRETCH SERVICE<br />
            <span className="text-teal-200 text-3xl sm:text-4xl">Mobile — We Come to You</span>
          </h1>
          <div className="mx-auto mt-8 max-w-2xl">
            <p className="text-6xl font-bold text-white sm:text-7xl lg:text-8xl font-heading tracking-tight"><strong>$99 PER HOUR</strong></p>
            <p className="mt-3 text-2xl font-bold text-teal-100 sm:text-3xl font-heading"><strong>10% OFF WEEKLY — $89/SESSION</strong></p>
          </div>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">
            Professional mobile stretch service delivered directly to your home, office, hotel room, or favorite park. Our certified stretch therapists serve {cities.length}+ cities across all 50 states — from{" "}
            <Link href={getStateUrl(states.find((s) => s.slug === "new-york")!)} className="underline text-white hover:text-teal-200">New York</Link> to{" "}
            <Link href={getStateUrl(states.find((s) => s.slug === "california")!)} className="underline text-white hover:text-teal-200">California</Link>,{" "}
            <Link href={getStateUrl(states.find((s) => s.slug === "texas")!)} className="underline text-white hover:text-teal-200">Texas</Link> to{" "}
            <Link href={getStateUrl(states.find((s) => s.slug === "florida")!)} className="underline text-white hover:text-teal-200">Florida</Link>, and everywhere in between.
            Same-day appointments available 7 days a week.
          </p>
          <div className="mx-auto mt-8 grid max-w-xl grid-cols-3 gap-4">
            <div className="rounded-xl bg-white/10 p-4 backdrop-blur-sm">
              <p className="text-2xl font-bold text-white">7AM-10PM</p>
              <p className="text-xs text-teal-200">Hours Daily</p>
            </div>
            <div className="rounded-xl bg-white/10 p-4 backdrop-blur-sm">
              <p className="text-2xl font-bold text-white">5.0 Stars</p>
              <p className="text-xs text-teal-200">150+ Reviews</p>
            </div>
            <div className="rounded-xl bg-white/10 p-4 backdrop-blur-sm">
              <p className="text-2xl font-bold text-white">$99/hr</p>
              <p className="text-xs text-teal-200">Per Session</p>
            </div>
          </div>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a href={SITE_SMS_LINK}>
              <span className="inline-block rounded-lg bg-white px-8 py-3.5 text-base font-semibold text-teal-700 shadow-lg transition-colors hover:bg-teal-50 font-cta">
                Text {SITE_PHONE} — Book Now
              </span>
            </a>
            <a href={SITE_PHONE_LINK}>
              <span className="inline-block rounded-lg border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:border-white/60 font-cta">
                Call {SITE_PHONE} — Same Day
              </span>
            </a>
          </div>
          <p className="mt-4 text-sm text-teal-200">10% OFF weekly stretch service — just $89/session | No contracts, cancel anytime</p>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 2 — ABOUT
      ═══════════════════════════════════════════════════════ */}

      {/* 2A — What Is Assisted Stretching */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <div className="mb-6 flex justify-center">
          </div>
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">What Is Assisted Stretching? The Complete Guide to America&apos;s Fastest-Growing Wellness Service</h2>
          <div className="mt-8 space-y-5 text-base leading-relaxed text-slate-700">
            <p>
              Assisted stretching is a professional, hands-on therapy where a certified stretch therapist physically moves your body through targeted positions and controlled movements that you simply cannot achieve on your own. Unlike self-stretching — where you are limited by your own strength, flexibility, and range of motion — a professional <Link href={getServiceUrl(services[0])} className="text-teal-600 underline hover:text-teal-700">assisted stretch service</Link> uses advanced techniques to unlock deep muscle tension, restore joint mobility, and provide immediate pain relief that lasts for days. This is not a massage, and it is not yoga. Assisted stretching is a distinct therapeutic discipline backed by decades of sports science research and practiced by physical therapists, athletic trainers, and rehabilitation specialists around the world.
            </p>
            <p>
              During an assisted stretch service session, your therapist begins with a comprehensive mobility assessment. They evaluate your posture, identify areas of restriction, test your range of motion in key joints, and discuss your pain points and goals. Based on this assessment, they develop a personalized stretching protocol that targets your specific problem areas. The therapist then guides your body through each stretch, using precise hand placement, controlled pressure, and carefully calibrated angles to achieve depths and positions that are physically impossible to reach alone. You remain fully clothed and comfortable throughout the entire session.
            </p>
            <p>
              The science behind assisted stretching is compelling. When a trained therapist stretches your muscles, they can apply consistent, sustained force at the exact angle needed to lengthen specific muscle fibers and fascial tissue. Your muscles contain proprioceptors — sensory receptors that detect changes in muscle length and tension. Through techniques like <Link href={getServiceUrl(services[1])} className="text-teal-600 underline hover:text-teal-700">PNF stretching</Link> (Proprioceptive Neuromuscular Facilitation), your therapist strategically activates these receptors to override your body&apos;s natural stretch reflex. This allows muscles to relax deeper and stretch further than they would during self-stretching. Research published in the Journal of Athletic Training shows that therapist-assisted PNF stretching produces 2-3 times greater flexibility gains than any form of self-stretching.
            </p>
            <p>
              The mobile stretch service model that Stretch Service pioneered has transformed how Americans access professional stretching therapy. Instead of traveling to a clinic, studio, or gym — where you are limited by someone else&apos;s schedule and forced to commute — our certified stretch therapists come directly to your location. Your living room, your office, your hotel room, a park, a rooftop, or a conference room. We bring a professional massage table, mats, straps, resistance bands, and every tool needed to deliver a world-class stretch service session. All you provide is your body and roughly 6x8 feet of floor space.
            </p>
            <p>
              This convenience factor is not just a luxury — it is a clinical advantage. Research shows that people who exercise or receive therapy in familiar, comfortable environments experience lower cortisol levels, reduced anxiety, and better therapeutic outcomes. When you are relaxed in your own space, your muscles release tension more readily, your nervous system downregulates faster, and your stretch therapist can achieve deeper, more effective stretches. This is why our clients consistently report better results from mobile stretch service sessions compared to in-studio visits.
            </p>
            <p>
              Stretch Service operates in {cities.length}+ cities across all 50 states. Whether you are a desk worker in <Link href={getCityUrl(cities.find((c) => c.slug === "new-york-city")!)} className="text-teal-600 underline hover:text-teal-700">New York</Link> dealing with chronic neck pain, a tourist in <Link href={getCityUrl(cities.find((c) => c.slug === "miami")!)} className="text-teal-600 underline hover:text-teal-700">Miami</Link> whose legs are destroyed after a day of sightseeing, a senior in <Link href={getCityUrl(cities.find((c) => c.slug === "phoenix")!)} className="text-teal-600 underline hover:text-teal-700">Phoenix</Link> who wants to maintain independence, or a marathon runner in <Link href={getCityUrl(cities.find((c) => c.slug === "boston")!)} className="text-teal-600 underline hover:text-teal-700">Boston</Link> who needs faster recovery — Stretch Service delivers professional, certified stretch therapy to your door for just $99 per hour. Weekly clients save 10% at $89 per session.
            </p>
            <p>
              What sets our stretch service apart from every other option is the depth of our therapists&apos; training and their singular focus on stretching. Every Stretch Service therapist is individually certified in multiple stretching modalities including <Link href={getServiceUrl(services[0])} className="text-teal-600 underline hover:text-teal-700">assisted stretching</Link>, <Link href={getServiceUrl(services[1])} className="text-teal-600 underline hover:text-teal-700">PNF stretching</Link>, <Link href={getServiceUrl(services[6])} className="text-teal-600 underline hover:text-teal-700">myofascial release</Link>, <Link href={getServiceUrl(services[3])} className="text-teal-600 underline hover:text-teal-700">dynamic stretching</Link>, and <Link href={getServiceUrl(services[8])} className="text-teal-600 underline hover:text-teal-700">recovery stretching</Link>. They do not split their time between massage, personal training, and stretching. Stretching is all they do, all day, every day. This singular focus produces specialists who understand the nuances of flexibility therapy at a level that generalists simply cannot match.
            </p>
            <p>
              The typical assisted stretch service client sees results immediately. After your very first session, you will notice improved range of motion, reduced tension and pain, and a profound sense of physical relaxation. Most clients describe it as feeling like their body has been &quot;reset&quot; — like years of accumulated tension have been dissolved in 60 minutes. But the real magic happens with consistency. Clients who commit to weekly stretch service sessions see compounding improvements: 40% greater range of motion after four weeks, 60% reduction in chronic pain symptoms, measurably improved posture, and significantly better sleep quality. The body responds to consistent, professional stretching in ways that no amount of self-stretching can replicate.
            </p>
          </div>
        </div>
      </section>

      {/* 2B — Why Mobile Stretch Service */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Why Stretch Service? America&apos;s Most-Trusted Mobile Stretch Service</h2>
          <div className="mt-8 space-y-5 text-base leading-relaxed text-slate-700">
            <p>
              What separates Stretch Service from every gym class, yoga studio, and stretching franchise in America? Three things: mobility, expertise, and results. Our therapists do not work at a desk in a fixed location waiting for you to show up. They are mobile professionals who come directly to you — wherever you are, whenever you need them. This mobile stretch service model eliminates every barrier to consistent stretching: no commute, no changing clothes at a gym, no awkward group settings, no waiting for a bench or a mat.
            </p>
            <p>
              Every Stretch Service therapist is individually certified in assisted stretching, PNF techniques, <Link href={getServiceUrl(services[6])} className="text-teal-600 underline hover:text-teal-700">myofascial release</Link>, and sports rehabilitation. They undergo rigorous screening, skills testing, and ongoing training to maintain the highest standards in the industry. When a therapist arrives at your location, they bring a professional massage table, stretching mats, resistance bands, and specialized tools. Your session includes a full-body mobility assessment, a personalized treatment plan, and 60 minutes of hands-on stretching therapy customized to your body, your pain, and your goals.
            </p>
            <p>
              The results speak for themselves. Our clients report an average 40% improvement in range of motion after four consecutive weekly sessions. Chronic pain sufferers report a 60% reduction in pain levels. Athletes report faster recovery times and improved performance metrics. Corporate clients who implement our wellness programs see reduced workplace injuries and increased employee satisfaction. And tourists who book a <Link href="/hotel-stretching" className="text-teal-600 underline hover:text-teal-700">hotel stretch service</Link> session after a day of sightseeing say it is the single best thing they did on their trip.
            </p>
            <p>
              At $99 per hour — with a 10% discount for weekly clients at just $89 per session — Stretch Service delivers extraordinary value. Compare that to the $200+ per session charged by physical therapy clinics, the $150+ for specialty mobility studios, or the $180+ for personal trainers who may not even specialize in flexibility work. Our stretch service therapists are specialists. Stretching is all they do, all day, every day. That singular focus is why they are the best in the business.
            </p>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 3 — ALL 11 SERVICES EXPLAINED
      ═══════════════════════════════════════════════════════ */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">{services.length} Professional Stretch Service Types — Delivered Nationwide</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">Every stretch service technique backed by sports science. Certified therapists bring professional equipment to your location. $99/hr, 10% off weekly.</p>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((s, i) => (
              <Link key={s.slug} href={getServiceUrl(s)}>
                <div className="group rounded-xl border border-slate-200 bg-white p-6 transition-all hover:border-teal-400 hover:shadow-md h-full">
                  <div className="flex items-start gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-100 text-sm font-bold text-teal-700">{i + 1}</span>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 group-hover:text-teal-600 font-heading">{s.name}</h3>
                      <p className="mt-1 text-xs font-semibold text-teal-600">{s.tagline}</p>
                      <p className="mt-3 text-sm text-slate-600">{s.shortDesc}</p>
                      <div className="mt-4 flex flex-wrap gap-1.5">
                        {s.idealFor.slice(0, 3).map((tag) => (
                          <span key={tag} className="rounded-full bg-teal-50 px-2.5 py-0.5 text-xs text-teal-700">{tag}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link href="/services" className="text-teal-600 font-semibold underline hover:text-teal-700 font-cta">View All {services.length} Stretch Services &rarr;</Link>
          </div>
        </div>
      </section>

      {/* ═══ SERVICES DEEP DIVE ═══ */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Every Stretch Service Technique Explained</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">Understanding what each stretch service type does helps you choose the right one for your body. Here is a deep dive into all {services.length} services we offer.</p>
          <div className="mt-10 space-y-8">
            {services.map((s) => (
              <div key={s.slug} className="rounded-xl border border-slate-200 bg-white p-6">
                <h3 className="text-lg font-bold text-slate-900 font-heading">
                  <Link href={getServiceUrl(s)} className="text-teal-700 hover:text-teal-900">{s.name}</Link>
                </h3>
                <p className="mt-1 text-xs font-semibold text-teal-600">{s.tagline}</p>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">{s.description}</p>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  This stretch service technique is ideal for {s.idealFor.join(", ").toLowerCase()}. Key features include {s.features.slice(0, 4).join(", ").toLowerCase()}. Available in all {cities.length}+ cities for $99/hr, or $89/hr with a weekly plan.
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {s.idealFor.map((tag) => (
                    <span key={tag} className="rounded-full bg-teal-50 px-2.5 py-0.5 text-xs text-teal-700">{tag}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 4 — HOW IT WORKS
      ═══════════════════════════════════════════════════════ */}
      <section className="bg-section-white py-16" id="how-it-works">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">How Our Mobile Stretch Service Works — 4 Simple Steps</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">From booking to feeling amazing in under 2 minutes. Here is how to get a professional stretch service session anywhere in the United States.</p>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { step: "1", title: "Text or Call", desc: `Text or call ${SITE_PHONE} with your preferred date, time, and location. We serve 902+ cities across all 50 states.` },
              { step: "2", title: "We Confirm", desc: "We confirm your appointment and assign a certified stretch therapist in your area. Most requests confirmed within 30 minutes." },
              { step: "3", title: "Therapist Arrives", desc: "Your certified stretch therapist arrives at your location with professional equipment — massage table, mats, straps, and tools." },
              { step: "4", title: "Feel Amazing", desc: "Enjoy a 60-minute professional stretch service session. Feel immediate relief, improved flexibility, and reduced pain." },
            ].map((item) => (
              <div key={item.step} className="rounded-xl border border-teal-200/60 bg-white p-6 text-center">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-teal-600 text-xl font-bold text-white">{item.step}</span>
                <h3 className="mt-4 text-lg font-bold text-slate-900 font-heading">{item.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 5 — WHO WE SERVE (CLIENT TYPES) — EXPANDED
      ═══════════════════════════════════════════════════════ */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Who Benefits from Professional Stretch Service?</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">Our stretch service is designed for everyone — from desk workers and athletes to seniors and tourists. Here are the people we help every day.</p>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {clientTypes.map((ct) => (
              <div key={ct.slug} className="rounded-xl border border-slate-200 bg-white p-6 transition-all hover:border-teal-400 hover:shadow-md h-full">
                <span className="text-3xl">{ct.emoji}</span>
                <h3 className="mt-3 text-base font-bold text-slate-900 font-heading">{ct.name}</h3>
                <p className="mt-2 text-sm text-slate-600">{ct.shortDesc}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {ct.painPoints.slice(0, 3).map((pp) => (
                    <span key={pp} className="rounded-full bg-teal-50 px-2.5 py-0.5 text-xs text-teal-700">{pp}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CLIENT TYPES DEEP PARAGRAPHS ═══ */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">How Stretch Service Helps Every Client Type</h2>
          <div className="mt-10 space-y-8">
            <div>
              <h3 className="text-lg font-bold text-slate-900 font-heading">Stretch Service for Desk Workers &amp; Tech Professionals</h3>
              <p className="mt-3 text-base leading-relaxed text-slate-700">
                If you sit at a desk for 8 to 12 hours a day, your body is slowly falling apart. Your hip flexors shorten and tighten from constant sitting. Your shoulders round forward from reaching toward a keyboard. Your neck develops chronic tension from craning toward a screen. Your lower back aches because your core disengages when seated. These are not minor inconveniences — they are the precursors to serious musculoskeletal problems that cost American workers billions of dollars in healthcare costs and lost productivity every year. Professional stretch service directly addresses every one of these issues. Our therapists use a combination of <Link href={getServiceUrl(services[1])} className="text-teal-600 underline hover:text-teal-700">PNF stretching</Link> for the hip flexors, <Link href={getServiceUrl(services[6])} className="text-teal-600 underline hover:text-teal-700">myofascial release</Link> for the neck and shoulders, and <Link href={getServiceUrl(services[5])} className="text-teal-600 underline hover:text-teal-700">static stretching</Link> for the lumbar spine to reverse the damage that desk work inflicts on your body. Weekly stretch service sessions are the single best investment a desk worker can make in their long-term health.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 font-heading">Stretch Service for Commuters</h3>
              <p className="mt-3 text-base leading-relaxed text-slate-700">
                Whether you drive two hours a day or squeeze into a packed subway car, commuting takes a brutal toll on your body. Drivers develop tight hip flexors, compressed lumbar discs, and shoulder tension from gripping the steering wheel. Train and bus commuters suffer from standing fatigue, lower back strain from balancing, and neck tension from looking at phones during the ride. Our mobile stretch service meets you at home after your commute and systematically addresses every pain point that your daily travel creates. Many of our commuter clients in cities like <Link href={getCityUrl(cities.find((c) => c.slug === "new-york-city")!)} className="text-teal-600 underline hover:text-teal-700">New York</Link>, <Link href={getCityUrl(cities.find((c) => c.slug === "los-angeles")!)} className="text-teal-600 underline hover:text-teal-700">Los Angeles</Link>, and <Link href={getCityUrl(cities.find((c) => c.slug === "chicago")!)} className="text-teal-600 underline hover:text-teal-700">Chicago</Link> say their weekly stretch service session is the only thing that makes their commute bearable.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 font-heading">Stretch Service for Tourists &amp; Travelers</h3>
              <p className="mt-3 text-base leading-relaxed text-slate-700">
                You fly across the country, walk 20,000 steps exploring a new city, stand in lines at every major attraction, carry bags all day, and then collapse in your hotel room with a body that feels like it has been through a war. Sound familiar? Our <Link href="/hotel-stretching" className="text-teal-600 underline hover:text-teal-700">hotel stretch service</Link> is specifically designed for travelers. We come directly to your hotel room with all equipment and deliver 60 minutes of professional <Link href={getServiceUrl(services[8])} className="text-teal-600 underline hover:text-teal-700">recovery stretching</Link> that will have you feeling brand new for the next day of exploration. We serve every major tourist city in America and our therapists know exactly how to treat the specific pain patterns that sightseeing creates.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 font-heading">Stretch Service for Athletes &amp; Fitness Enthusiasts</h3>
              <p className="mt-3 text-base leading-relaxed text-slate-700">
                Professional athletes have known for decades what weekend warriors are just discovering: professional stretch service is not optional — it is essential. Our <Link href={getServiceUrl(services[1])} className="text-teal-600 underline hover:text-teal-700">PNF stretching</Link> techniques produce 2-3x greater flexibility gains than self-stretching, our <Link href={getServiceUrl(services[3])} className="text-teal-600 underline hover:text-teal-700">dynamic stretching</Link> improves athletic performance by 5-10% when done before activity, and our <Link href={getServiceUrl(services[8])} className="text-teal-600 underline hover:text-teal-700">recovery stretching</Link> accelerates post-workout healing by 40-60%. Whether you run, lift, swim, cycle, play tennis, or train in martial arts, our stretch service will make you faster, stronger, and more resilient.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 font-heading">Stretch Service for Seniors &amp; Active Agers</h3>
              <p className="mt-3 text-base leading-relaxed text-slate-700">
                Maintaining mobility as you age is the single most important factor in preserving independence and quality of life. Our <Link href={getServiceUrl(services[9])} className="text-teal-600 underline hover:text-teal-700">gentle stretch service</Link> program is specifically designed for seniors with extra-gentle, slow-paced movements, chair-assisted options, and arthritis-friendly techniques. Regular gentle stretching improves balance (reducing fall risk), maintains joint mobility, reduces stiffness and pain, and supports the ability to perform daily activities independently. Our therapists are trained in senior-specific care and bring patience, compassion, and deep expertise to every session.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 font-heading">Stretch Service for Post-Surgery &amp; Rehabilitation</h3>
              <p className="mt-3 text-base leading-relaxed text-slate-700">
                Recovering from surgery requires careful, guided stretching to restore range of motion, break up scar tissue, prevent muscle atrophy, and rebuild functional movement patterns. Our stretch service therapists work within the parameters set by your surgeon or physical therapist to deliver safe, effective stretching that accelerates your recovery. From ACL reconstruction to hip replacement to rotator cuff repair, our therapists have experience with every major surgical recovery protocol.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 font-heading">Stretch Service for Corporate &amp; Office Teams</h3>
              <p className="mt-3 text-base leading-relaxed text-slate-700">
                Forward-thinking companies are bringing stretch service directly to the office as part of their corporate wellness programs. On-site corporate stretch service reduces workplace injuries, lowers healthcare costs, boosts employee productivity, and dramatically improves team morale. We set up in a conference room or open area and stretch employees in back-to-back 30 or 60-minute sessions. Companies across America are discovering that a monthly or weekly corporate stretch service day is one of the highest-ROI wellness investments they can make. Visit our <Link href="/corporate-wellness" className="text-teal-600 underline hover:text-teal-700">corporate wellness page</Link> for program details.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 font-heading">Stretch Service for Chronic Pain Sufferers</h3>
              <p className="mt-3 text-base leading-relaxed text-slate-700">
                Chronic pain — whether it is sciatica, persistent lower back pain, neck tension, hip pain, or fibromyalgia — responds remarkably well to consistent professional stretching. Our therapists use a combination of <Link href={getServiceUrl(services[1])} className="text-teal-600 underline hover:text-teal-700">PNF stretching</Link>, <Link href={getServiceUrl(services[6])} className="text-teal-600 underline hover:text-teal-700">myofascial release</Link>, and targeted mobility work to address the root causes of chronic pain rather than just masking symptoms. Many chronic pain clients report a 60% or greater reduction in pain levels after four consecutive weekly stretch service sessions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION — SCIENCE BEHIND STRETCHING
      ═══════════════════════════════════════════════════════ */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">The Science Behind Professional Stretch Service</h2>
          <div className="mt-8 space-y-5 text-base leading-relaxed text-slate-700">
            <p>
              The effectiveness of professional stretch service is not anecdotal — it is backed by decades of peer-reviewed research in sports science, physical therapy, and rehabilitation medicine. Understanding the physiological mechanisms behind stretching explains why therapist-assisted stretching produces dramatically superior results compared to self-stretching, yoga, or general exercise.
            </p>
            <p>
              <strong>Muscle Spindles and the Stretch Reflex:</strong> Every muscle in your body contains sensory receptors called muscle spindles. When a muscle is stretched too quickly or too far, these spindles trigger a protective contraction called the stretch reflex — essentially your body&apos;s way of preventing injury. This is why self-stretching often feels like hitting a wall. A professional stretch service therapist understands how to work around the stretch reflex using slow, sustained holds and techniques like <Link href={getServiceUrl(services[1])} className="text-teal-600 underline hover:text-teal-700">PNF stretching</Link> to gradually override the reflex and achieve deeper, more effective stretches.
            </p>
            <p>
              <strong>Golgi Tendon Organs (GTOs):</strong> Located at the junction where muscles meet tendons, Golgi tendon organs detect changes in muscle tension. When properly activated through PNF contract-relax techniques, GTOs trigger a response called autogenic inhibition — the muscle reflexively relaxes, allowing for significantly deeper stretching. This mechanism is the primary reason that professional PNF stretch service produces 2-3x greater flexibility gains than passive or static stretching alone.
            </p>
            <p>
              <strong>Fascial Remodeling:</strong> Your muscles are wrapped in a web of connective tissue called fascia. Over time, fascia becomes tight, adhesed, and restricted — especially in people who sit for extended periods, perform repetitive movements, or have experienced injuries. <Link href={getServiceUrl(services[6])} className="text-teal-600 underline hover:text-teal-700">Myofascial release</Link> stretch service targets these fascial restrictions with sustained pressure and specific stretching angles that cause the fascia to remodel and release. The result is lasting improvements in mobility that persist between sessions.
            </p>
            <p>
              <strong>Nervous System Downregulation:</strong> Professional stretch service does not just affect muscles — it profoundly impacts your nervous system. The combination of controlled breathing, gentle sustained stretches, and the relaxing environment of a one-on-one session activates your parasympathetic nervous system (the &quot;rest and digest&quot; response). Cortisol levels drop, heart rate decreases, and your body enters a state of deep relaxation that allows muscles to release tension they have been holding for months or years. This neurological component is why many clients describe their stretch service session as the most relaxed they have felt in years.
            </p>
            <p>
              <strong>Viscoelastic Creep:</strong> Muscles and tendons exhibit viscoelastic properties, meaning they gradually lengthen when sustained force is applied over time. Professional stretch service leverages this property through carefully timed holds of 30-60 seconds per position. During these sustained stretches, your therapist applies consistent, calibrated force that allows the tissue to gradually &quot;creep&quot; into longer resting positions. This is physically impossible to achieve with self-stretching because you cannot simultaneously apply external force and relax the target muscle. It requires a trained professional — and that is exactly what Stretch Service provides.
            </p>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION — STRETCH SERVICE VS ALTERNATIVES
      ═══════════════════════════════════════════════════════ */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Stretch Service vs. Massage, Chiropractic, Yoga, and Physical Therapy</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">People often ask how professional stretch service compares to other wellness modalities. Here is an honest breakdown of how stretch service stacks up against the most common alternatives.</p>
          <div className="mt-10 space-y-8">
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-bold text-slate-900 font-heading">Stretch Service vs. Massage Therapy</h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                Massage therapy uses compression, kneading, and friction to address soft tissue tension. Professional stretch service uses elongation, targeted positioning, and neuromuscular techniques to improve flexibility and range of motion. While massage provides temporary relaxation and pain relief, stretch service produces lasting structural changes in muscle length, fascial mobility, and joint range. Many clients find that combining monthly massage with weekly stretch service sessions delivers the best of both worlds — but if you have to choose one, stretch service delivers more functional, measurable improvement in how your body moves and feels. Stretch service at $99/hr is also significantly more affordable than most massage therapists.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-bold text-slate-900 font-heading">Stretch Service vs. Chiropractic Care</h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                Chiropractic adjustments focus on spinal alignment through high-velocity, low-amplitude thrusts. Stretch service focuses on improving the flexibility and length of the muscles, tendons, and fascia that surround and support your joints. In many cases, chronic misalignment is caused by muscle imbalances and fascial restrictions — the exact issues that professional stretch service addresses. Our clients who combine chiropractic care with regular stretch service sessions report that their adjustments hold longer and their overall pain levels are significantly lower. At $99/hr with no insurance hoops, stretch service is also far more accessible than chiropractic visits.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-bold text-slate-900 font-heading">Stretch Service vs. Yoga</h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                Yoga is a wonderful practice for overall wellness, mindfulness, and general flexibility. However, yoga is a group class format that cannot provide the individualized, hands-on attention that professional stretch service delivers. In a yoga class, you are limited to self-stretching — no one is physically guiding your body into deeper positions or using PNF techniques to override your stretch reflex. Stretch service is one-on-one, 100% customized to your body, and performed by a certified specialist. The result is 2-3x greater flexibility gains per session compared to yoga. For people who are too stiff, injured, or intimidated to attend a yoga class, stretch service is the perfect alternative.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-bold text-slate-900 font-heading">Stretch Service vs. Physical Therapy</h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                Physical therapy is a medical treatment for specific injuries and conditions, typically prescribed by a doctor and covered by insurance. Professional stretch service is a wellness and performance service focused on improving flexibility, reducing pain, and enhancing quality of life. While there is overlap in techniques (both use PNF stretching, for example), stretch service is more accessible — no prescription needed, no insurance battles, no commute to a clinic, and no $200+ per session copays. Our mobile stretch service therapists come to you for $99/hr and focus exclusively on stretching, flexibility, and mobility. For many clients, regular stretch service sessions are the best way to maintain gains achieved in physical therapy.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 6 — TOP CITIES
      ═══════════════════════════════════════════════════════ */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Top Cities for Mobile Stretch Service</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">Stretch Service operates in {cities.length}+ cities across all 50 states. Here are some of our most popular locations.</p>
          <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {topCities.map((c) => (
              <Link key={c.slug} href={getCityUrl(c)}>
                <div className="group rounded-xl border border-slate-200 bg-white p-4 text-center transition-all hover:border-teal-400 hover:shadow-md">
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-teal-600 font-heading">{c.name}</h3>
                  <p className="mt-1 text-xs text-slate-500">{c.stateAbbr}</p>
                </div>
              </Link>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link href="/locations" className="text-teal-600 font-semibold underline hover:text-teal-700 font-cta">Browse All {cities.length}+ Cities &rarr;</Link>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 7 — STATE-BY-STATE CITIES (TOP 5 STATES)
      ═══════════════════════════════════════════════════════ */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Stretch Service by State — Our Largest Markets</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">We serve every major city in every state. Explore our top markets below, or <Link href="/locations" className="text-teal-600 underline hover:text-teal-700">browse all locations</Link>.</p>
          <div className="mt-10 space-y-10">
            {[
              { name: "California", slug: "california", topCities: caTopCities },
              { name: "New York", slug: "new-york", topCities: nyTopCities },
              { name: "Texas", slug: "texas", topCities: txTopCities },
              { name: "Florida", slug: "florida", topCities: flTopCities },
              { name: "Illinois", slug: "illinois", topCities: ilTopCities },
            ].map((state) => (
              <div key={state.slug}>
                <h3 className="text-xl font-bold text-slate-900 font-heading">
                  <Link href={`/locations/${state.slug}`} className="text-teal-700 hover:text-teal-900">{state.name}</Link>
                  <span className="ml-2 text-sm font-normal text-slate-500">({getCitiesByState(state.slug).length} cities)</span>
                </h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {state.topCities.map((c) => (
                    <Link key={c.slug} href={getCityUrl(c)} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 transition-all hover:border-teal-400 hover:text-teal-700">
                      {c.name}
                    </Link>
                  ))}
                  {getCitiesByState(state.slug).length > state.topCities.length && (
                    <Link href={`/locations/${state.slug}`} className="rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700">
                      +{getCitiesByState(state.slug).length - state.topCities.length} more
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION — STRETCH SERVICE BY REGION
      ═══════════════════════════════════════════════════════ */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Stretch Service by Region — Coast to Coast Coverage</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">Our stretch service covers every region of the United States. Here is how we serve each part of the country and the unique needs of each area.</p>
          <div className="mt-10 space-y-10">
            <div>
              <h3 className="text-xl font-bold text-slate-900 font-heading">West Coast Stretch Service</h3>
              <p className="mt-3 text-base leading-relaxed text-slate-700">
                The West Coast is the epicenter of wellness culture in America, and stretch service fits perfectly into the active, health-conscious lifestyles of states like <Link href={getStateUrl(states.find((s) => s.slug === "california")!)} className="text-teal-600 underline hover:text-teal-700">California</Link>, <Link href={getStateUrl(states.find((s) => s.slug === "washington")!)} className="text-teal-600 underline hover:text-teal-700">Washington</Link>, and <Link href={getStateUrl(states.find((s) => s.slug === "oregon")!)} className="text-teal-600 underline hover:text-teal-700">Oregon</Link>. Tech workers in Silicon Valley and Seattle rely on our stretch service to combat the chronic neck and shoulder tension from 10-hour days at a screen. Hikers, surfers, and runners across Southern California use our <Link href={getServiceUrl(services[8])} className="text-teal-600 underline hover:text-teal-700">recovery stretch service</Link> to stay active year-round. Tourists visiting Los Angeles, San Francisco, San Diego, and Las Vegas book our <Link href="/hotel-stretching" className="text-teal-600 underline hover:text-teal-700">hotel stretch service</Link> after days packed with sightseeing. The West Coast&apos;s outdoor lifestyle creates enormous demand for professional stretch service, and we serve every major city in the region.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {westCoastStates.slice(0, 6).map((s) => (
                  <Link key={s.slug} href={getStateUrl(s)} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 transition-all hover:border-teal-400 hover:text-teal-700">
                    {s.name}
                  </Link>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900 font-heading">East Coast Stretch Service</h3>
              <p className="mt-3 text-base leading-relaxed text-slate-700">
                The East Coast is defined by fast-paced lifestyles, brutal commutes, and demanding professional careers — all of which create a massive need for professional stretch service. In <Link href={getStateUrl(states.find((s) => s.slug === "new-york")!)} className="text-teal-600 underline hover:text-teal-700">New York</Link>, our stretch service therapists help desk workers, commuters, and tourists recover from the physical demands of the city that never sleeps. In <Link href={getStateUrl(states.find((s) => s.slug === "massachusetts")!)} className="text-teal-600 underline hover:text-teal-700">Massachusetts</Link>, marathon runners and students at Boston&apos;s world-class universities depend on our stretch service for performance and recovery. Across <Link href={getStateUrl(states.find((s) => s.slug === "pennsylvania")!)} className="text-teal-600 underline hover:text-teal-700">Pennsylvania</Link>, <Link href={getStateUrl(states.find((s) => s.slug === "new-jersey")!)} className="text-teal-600 underline hover:text-teal-700">New Jersey</Link>, and <Link href={getStateUrl(states.find((s) => s.slug === "connecticut")!)} className="text-teal-600 underline hover:text-teal-700">Connecticut</Link>, suburban professionals book weekly stretch service sessions to counteract the toll of long train commutes and sedentary office work. The East Coast is one of our largest markets, and our therapists serve every city from Maine to Virginia.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {eastCoastStates.slice(0, 6).map((s) => (
                  <Link key={s.slug} href={getStateUrl(s)} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 transition-all hover:border-teal-400 hover:text-teal-700">
                    {s.name}
                  </Link>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900 font-heading">Southern Stretch Service</h3>
              <p className="mt-3 text-base leading-relaxed text-slate-700">
                The American South combines intense heat, sprawling cities, and a culture that embraces both hard work and hospitality. In <Link href={getStateUrl(states.find((s) => s.slug === "texas")!)} className="text-teal-600 underline hover:text-teal-700">Texas</Link>, our stretch service therapists serve everyone from oil field workers in Houston to tech professionals in Austin to seniors in San Antonio. <Link href={getStateUrl(states.find((s) => s.slug === "florida")!)} className="text-teal-600 underline hover:text-teal-700">Florida</Link> is one of our biggest markets — retirees rely on our <Link href={getServiceUrl(services[9])} className="text-teal-600 underline hover:text-teal-700">gentle stretch service</Link> for mobility, tourists in Miami and Orlando book hotel stretch service sessions daily, and athletes across the state use our recovery techniques year-round. In <Link href={getStateUrl(states.find((s) => s.slug === "tennessee")!)} className="text-teal-600 underline hover:text-teal-700">Tennessee</Link>, Nashville&apos;s tourist scene drives huge demand for post-sightseeing stretch service. Georgia, the Carolinas, Louisiana — every Southern state has an active and growing stretch service client base.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {southStates.slice(0, 6).map((s) => (
                  <Link key={s.slug} href={getStateUrl(s)} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 transition-all hover:border-teal-400 hover:text-teal-700">
                    {s.name}
                  </Link>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900 font-heading">Midwest Stretch Service</h3>
              <p className="mt-3 text-base leading-relaxed text-slate-700">
                The Midwest is America&apos;s heartland — and heartland bodies need stretch service just as much as coastal ones. In <Link href={getStateUrl(states.find((s) => s.slug === "illinois")!)} className="text-teal-600 underline hover:text-teal-700">Illinois</Link>, Chicago&apos;s massive professional workforce and tourist scene make it one of our top markets nationally. <Link href={getStateUrl(states.find((s) => s.slug === "ohio")!)} className="text-teal-600 underline hover:text-teal-700">Ohio</Link>, <Link href={getStateUrl(states.find((s) => s.slug === "michigan")!)} className="text-teal-600 underline hover:text-teal-700">Michigan</Link>, and <Link href={getStateUrl(states.find((s) => s.slug === "indiana")!)} className="text-teal-600 underline hover:text-teal-700">Indiana</Link> have growing stretch service demand driven by manufacturing workers, desk professionals, and an increasingly active senior population. Cold Midwest winters mean people spend months less active, which leads to tightness, reduced mobility, and increased pain — all of which professional stretch service directly addresses. Our therapists serve every major Midwest city and deliver the same $99/hr, 10% off weekly pricing nationwide.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {midwestStates.slice(0, 6).map((s) => (
                  <Link key={s.slug} href={getStateUrl(s)} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 transition-all hover:border-teal-400 hover:text-teal-700">
                    {s.name}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 8 — THINGS TO DO + GET STRETCHED
      ═══════════════════════════════════════════════════════ */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Things to Do in America&apos;s Top Cities — Get Stretched</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">
            Whether you are exploring Times Square in New York, walking the Magnificent Mile in Chicago, hiking in Denver, or touring the French Quarter in New Orleans — your body is going to feel it. After 20,000+ steps of sightseeing, your legs, back, and feet are screaming. That is where Stretch Service comes in. We meet you at your hotel, your Airbnb, or an iconic park and deliver a professional recovery stretch service that will have you feeling brand new for the next day.
          </p>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { city: "New York", things: "Walk the Brooklyn Bridge, explore Central Park, visit the Met, climb the Statue of Liberty pedestal. Your calves and lower back will be destroyed by 4pm. Afterward, our stretch service therapist comes to your Manhattan, Brooklyn, or Queens hotel and delivers 60 minutes of recovery stretching that saves your next day of exploring the city." },
              { city: "Chicago", things: "Navy Pier, Millennium Park, Art Institute, deep dish pizza crawl through Lincoln Park. Your feet and legs will be begging for relief by dinner. Chicago stretch service clients love our hotel sessions — we meet you anywhere in the Loop, River North, or Magnificent Mile and get you ready for another day of things to do in Chicago." },
              { city: "Los Angeles", things: "Griffith Observatory hike, Venice Beach, Hollywood Walk of Fame, Santa Monica Pier. The hills alone will wreck your quads. LA stretch service is perfect for tourists who underestimate how much walking this car-centric city actually requires once you start sightseeing." },
              { city: "Miami", things: "South Beach, Wynwood Walls, Little Havana, Everglades airboat ride. The heat plus the walking is a body-destroying combo. Our Miami stretch service therapists know exactly how to treat heat-exhaustion tightness and tourist fatigue." },
              { city: "San Francisco", things: "Walk across the Golden Gate Bridge, explore Fisherman&apos;s Wharf, ride cable cars, hike Lands End. Those hills are no joke. San Francisco stretch service is essential for any tourist who spends a day navigating this beautiful, punishing city on foot." },
              { city: "Nashville", things: "Broadway honky-tonks, Centennial Park, Country Music Hall of Fame, hot chicken crawl. Dancing and walking all day takes a toll. Nashville stretch service is one of our fastest-growing markets as the city&apos;s tourist scene continues to explode." },
              { city: "Denver", things: "Red Rocks Amphitheatre, Rocky Mountain National Park day trip, LoDo breweries, altitude hiking. The altitude makes everything harder on your body. Denver stretch service helps tourists and locals adapt to the physical demands of the Mile High City." },
              { city: "Austin", things: "Sixth Street live music, Lady Bird Lake paddleboarding, Barton Springs swimming, BBQ trails. The Texas heat plus non-stop activity creates serious recovery needs. Austin stretch service has become a staple for conference attendees and tourists alike." },
              { city: "Boston", things: "Freedom Trail walk, Fenway Park, Harvard Yard, whale watching, North End restaurants. Boston is a walking city and your body will feel every cobblestone. Our Boston stretch service is perfect after a full day on the Freedom Trail." },
            ].map((item) => (
              <div key={item.city} className="rounded-xl border border-teal-200/60 bg-white p-6">
                <h3 className="text-lg font-bold text-teal-700 font-heading">Things to Do in {item.city}</h3>
                <p className="mt-3 text-sm text-slate-600">{item.things}</p>
                <p className="mt-3 text-xs font-semibold text-teal-600">Book a post-sightseeing stretch service &rarr;</p>
              </div>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link href="/hotel-stretching" className="text-teal-600 font-semibold underline hover:text-teal-700 font-cta">Hotel Stretch Service for Tourists &rarr;</Link>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION — TOURIST DEEP DIVE
      ═══════════════════════════════════════════════════════ */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Traveling? Stretch Service Is the Best Thing You Can Do for Your Body</h2>
          <div className="mt-8 space-y-5 text-base leading-relaxed text-slate-700">
            <p>
              Travel is one of the most physically demanding things you can do to your body. Between the compressed airplane seats, the hours of walking on unfamiliar terrain, the sleeping in hotel beds your body is not used to, and the general exhaustion of being on the go nonstop — your muscles, joints, and fascia take an absolute beating. This is true whether you are visiting America&apos;s top tourist destinations for vacation or traveling for business conferences and meetings.
            </p>
            <p>
              Our <Link href="/hotel-stretching" className="text-teal-600 underline hover:text-teal-700">hotel stretch service</Link> was designed specifically for travelers. We come directly to your hotel room — any hotel, any Airbnb, any vacation rental in {cities.length}+ cities across all 50 states. Our therapist arrives with a portable massage table, mats, and all equipment. They deliver 60 minutes of professional <Link href={getServiceUrl(services[8])} className="text-teal-600 underline hover:text-teal-700">recovery stretching</Link> that targets the exact pain patterns that travel creates: tight calves and feet from walking, compressed lower back from sitting on planes, stiff neck from sleeping in strange beds, and overall muscle fatigue from nonstop activity.
            </p>
            <p>
              The most popular time for tourist stretch service bookings is between 5pm and 9pm — right when travelers return to their hotels after a full day of sightseeing. They text {SITE_PHONE}, we confirm within 30 minutes, and a therapist is at their door within 1-2 hours. After 60 minutes of professional stretch service, they can actually enjoy dinner, sleep better, and wake up ready for another day of adventure. It is the difference between limping through the second half of your trip and actually enjoying it.
            </p>
            <p>
              Business travelers love our stretch service for different reasons. After a day of sitting in conference rooms, standing at trade show booths, or enduring back-to-back meetings, their bodies are stiff, their backs ache, and their stress levels are through the roof. A professional stretch service session in their hotel room is the ultimate recovery tool — it addresses the physical tension, activates the parasympathetic nervous system for stress relief, and sets them up for a better night of sleep. Smart companies are now building stretch service into their travel budgets because the productivity gains from well-rested, pain-free employees more than justify the $99 investment.
            </p>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 9 — PARKS & OUTDOOR LOCATIONS
      ═══════════════════════════════════════════════════════ */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Outdoor Stretch Service — {parks.length}+ Parks Nationwide</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">Get stretched at America&apos;s most iconic parks and outdoor spaces. Our therapists meet you with mats and equipment. $99/hr.</p>
          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featuredParks.map((p, i) => (
              <Link key={p.slug} href={getParkUrl(p)}>
                <div className="group rounded-xl border border-slate-200 bg-white p-5 transition-all hover:border-teal-400 hover:shadow-md h-full">
                  <div className="flex items-start gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-100 text-sm font-bold text-teal-700">{i + 1}</span>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 group-hover:text-teal-600 font-heading">{p.name}</h3>
                      <p className="mt-1 text-xs text-slate-500">{p.city}, {p.state} | {"★".repeat(p.touristRating)}</p>
                      <p className="mt-2 text-sm text-slate-600 line-clamp-2">{p.description}</p>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link href="/parks" className="text-teal-600 font-semibold underline hover:text-teal-700 font-cta">View All {parks.length}+ Parks &rarr;</Link>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 10 — STATE PARKS BREAKDOWN
      ═══════════════════════════════════════════════════════ */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Parks by State — Top Outdoor Stretch Spots</h2>
          <div className="mt-10 space-y-10">
            {[
              { name: "California", parks: caParks },
              { name: "New York", parks: nyParks },
              { name: "Texas", parks: txParks },
              { name: "Florida", parks: flParks },
              { name: "Illinois", parks: ilParks },
            ].map((state) => state.parks.length > 0 && (
              <div key={state.name}>
                <h3 className="text-lg font-bold text-slate-900 font-heading">{state.name} Parks</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {state.parks.map((p) => (
                    <Link key={p.slug} href={getParkUrl(p)} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 transition-all hover:border-teal-400 hover:text-teal-700">
                      {p.name}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION — POPULAR CITY + SERVICE COMBOS
      ═══════════════════════════════════════════════════════ */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Popular Stretch Service Combinations by City</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">These are the most-booked stretch service combinations across the country. Each city has its own unique needs and our therapists customize every session accordingly.</p>
          <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {popularCombos.map((combo) => (
              <Link key={`${combo.city.slug}-${combo.service.slug}`} href={getCityServiceUrl(combo.city, combo.service)}>
                <div className="group rounded-xl border border-slate-200 bg-white p-4 text-center transition-all hover:border-teal-400 hover:shadow-md h-full">
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-teal-600 font-heading">{combo.service.name}</h3>
                  <p className="mt-1 text-xs text-slate-500">in {combo.city.name}, {combo.city.stateAbbr}</p>
                  <p className="mt-2 text-xs text-teal-600 font-medium">$99/hr &rarr;</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 11 — PRICING
      ═══════════════════════════════════════════════════════ */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Stretch Service Pricing — Transparent, Honest, Affordable</h2>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="rounded-xl border-2 border-slate-200 bg-white p-8 text-center">
              <p className="text-sm font-semibold uppercase tracking-wider text-slate-500 font-cta">Single Session</p>
              <p className="mt-4 text-5xl font-bold text-teal-700 font-heading">$99</p>
              <p className="mt-1 text-sm text-slate-500">per 60-minute session</p>
              <ul className="mt-6 space-y-2 text-left text-sm text-slate-600">
                <li>&#10003; Full-body mobility assessment</li>
                <li>&#10003; 60 min professional stretching</li>
                <li>&#10003; All equipment included</li>
                <li>&#10003; Personalized treatment plan</li>
                <li>&#10003; Same-day available</li>
              </ul>
            </div>
            <div className="rounded-xl border-2 border-teal-400 bg-teal-50 p-8 text-center shadow-lg">
              <p className="text-sm font-semibold uppercase tracking-wider text-teal-600 font-cta">Weekly Program</p>
              <p className="mt-4 text-5xl font-bold text-teal-700 font-heading">$89</p>
              <p className="mt-1 text-sm text-teal-600 font-semibold">10% OFF — per 60-minute session</p>
              <ul className="mt-6 space-y-2 text-left text-sm text-slate-700">
                <li>&#10003; Everything in Single Session</li>
                <li>&#10003; Priority scheduling</li>
                <li>&#10003; Same therapist every week</li>
                <li>&#10003; Progress tracking</li>
                <li>&#10003; No contracts — cancel anytime</li>
              </ul>
            </div>
          </div>
          <div className="mt-8 text-center">
            <Link href="/pricing" className="text-teal-600 font-semibold underline hover:text-teal-700 font-cta">View Full Pricing Details &rarr;</Link>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 12 — REVIEWS
      ═══════════════════════════════════════════════════════ */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">What Our Clients Say About Stretch Service</h2>
          <p className="mx-auto mt-4 max-w-xl text-center text-base text-slate-600">5.0 stars across 150+ verified reviews. Real clients, real results, real relief.</p>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {reviews.map((r) => (
              <div key={r.name} className="rounded-xl border border-teal-200/60 bg-white p-6">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-600 text-lg font-bold text-white">{r.initial}</span>
                  <div>
                    <p className="text-sm font-bold text-slate-900">{r.name}</p>
                    <p className="text-xs text-slate-500">{r.location}</p>
                  </div>
                </div>
                <div className="mt-2 text-xs text-teal-600">★★★★★</div>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">{r.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 13 — BROWSE ALL 50 STATES — EXPANDED DIRECTORY
      ═══════════════════════════════════════════════════════ */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Stretch Service in All 50 States — Complete Directory</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">Click any state to see cities, parks, and stretch service options near you. Every state offers the full range of {services.length} stretch service types, $99/hr single sessions, and 10% off weekly programs at $89/session.</p>
          <div className="mt-10 space-y-6">
            {states.map((s) => {
              const stCities = getCitiesByState(s.slug);
              return (
                <div key={s.slug} className="rounded-lg border border-slate-200 bg-white p-4">
                  <h3 className="text-base font-bold text-slate-900 font-heading">
                    <Link href={getStateUrl(s)} className="text-teal-700 hover:text-teal-900">Stretch Service in {s.name}</Link>
                    <span className="ml-2 text-sm font-normal text-slate-500">({stCities.length} {stCities.length === 1 ? "city" : "cities"})</span>
                  </h3>
                  {stCities.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {stCities.slice(0, 8).map((c) => (
                        <Link key={c.slug} href={getCityUrl(c)} className="rounded-full border border-slate-200 px-2.5 py-0.5 text-xs font-medium text-slate-600 transition-all hover:border-teal-400 hover:text-teal-700">
                          {c.name}
                        </Link>
                      ))}
                      {stCities.length > 8 && (
                        <Link href={getStateUrl(s)} className="rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-semibold text-teal-700">
                          +{stCities.length - 8} more
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 14 — FAQ
      ═══════════════════════════════════════════════════════ */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Frequently Asked Questions About Stretch Service</h2>
          <p className="mx-auto mt-4 max-w-xl text-center text-base text-slate-600">Everything you need to know about professional mobile stretch service. Can&apos;t find your answer? Text us at {SITE_PHONE}.</p>
          <div className="mt-10 space-y-3">
            {homeFaqs.map((faq) => (
              <details key={faq.question} className="group rounded-xl border border-teal-200/60 bg-white">
                <summary className="cursor-pointer px-6 py-4 text-base font-semibold text-slate-900 transition-colors hover:text-teal-700 font-heading">{faq.question}</summary>
                <div className="px-6 pb-5 text-base leading-relaxed text-slate-600">{faq.answer}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 15 — JOBS CTA
      ═══════════════════════════════════════════════════════ */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-3xl font-bold text-slate-900 font-heading">Join the Stretch Service Team — We&apos;re Hiring Nationwide</h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-slate-600">We&apos;re hiring certified stretch therapists in every state. $50/hour starting pay, flexible schedule, fast payment, established client base.</p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/jobs" className="inline-block rounded-lg bg-teal-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg transition-colors hover:bg-teal-700 font-cta">View Open Positions</Link>
            <a href="https://stretchjobs.com" target="_blank" rel="noopener noreferrer" className="inline-block rounded-lg border-2 border-teal-600 px-8 py-3.5 text-base font-semibold text-teal-700 transition-colors hover:bg-teal-50 font-cta">Apply at stretchjobs.com</a>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 16 — FINAL CTA
      ═══════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 py-16">
        <div className="absolute inset-0 grid-bg opacity-20" />
        <div className="relative mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-3xl font-bold text-white font-heading">Book Your Stretch Service Today — $99/hr Nationwide</h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/80">
            Professional mobile stretch service in {cities.length}+ cities across all 50 states. Same-day available. 10% off weekly. No contracts. Your body will thank you.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a href={SITE_SMS_LINK}>
              <span className="inline-block rounded-lg bg-white px-8 py-3.5 text-base font-semibold text-teal-700 shadow-lg transition-colors hover:bg-teal-50 font-cta">
                Text {SITE_PHONE} — Book Now
              </span>
            </a>
            <a href={SITE_PHONE_LINK}>
              <span className="inline-block rounded-lg border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:border-white/60 font-cta">
                Call {SITE_PHONE}
              </span>
            </a>
          </div>
          <p className="mt-4 text-sm text-teal-200">$99/hr single session | $89/hr weekly (10% off) | 7AM-10PM daily | Same-day available</p>
        </div>
      </section>
    </>
  );
}
