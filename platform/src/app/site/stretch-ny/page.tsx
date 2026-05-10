// @ts-nocheck
import Link from "next/link";
import type { Metadata } from "next";
import { neighborhoods, parks, services, boroughs, clientTypes, getNeighborhoodUrl, getParkUrl, getServiceUrl, getBoroughUrl, SITE_URL, SITE_PHONE, SITE_SMS_LINK, SITE_PHONE_LINK } from "@/app/site/stretch-ny/_lib/siteData";
import { JsonLd, faqSchema } from "@/app/site/stretch-ny/_lib/schema";
import Logo from "@/app/site/stretch-ny/_components/Logo";

export const metadata: Metadata = {
  title: "Assisted Stretch Service NYC | $99/hr Mobile | Stretch NYC",
  description: "NYC's #1 assisted stretch service. Certified therapists come to your home, office, or hotel. $99/hr, 10% off weekly. Manhattan, Brooklyn, Queens, Bronx & Staten Island. Same-day available 7AM-10PM.",
  alternates: { canonical: SITE_URL },
};

/* ─── Reviews ─── */

const reviews = [
  { name: "Angel Reyes", location: "New York, NY", initial: "A", text: "I cannot say enough great things about Stretch NYC! After undergoing surgery to repair a partially torn Achilles tendon, my trainer William was exceptional. With his guidance, I regained not only my strength and conditioning, but also my stamina and mobility. This stretch service changed my recovery completely." },
  { name: "Dan Anghelescu", location: "New York, NY", initial: "D", text: "Game-changer for our whole family. Will has had extraordinary impact. His ability to tailor sessions to both adults and children is nothing short of extraordinary. He combines deep anatomical knowledge with intuitive adjustments. Best stretch service in all of NYC." },
  { name: "Paula Stephenson", location: "New York, NY", initial: "P", text: "My experience was amazing. Will is knowledgeable, easy to talk to and caring. I felt relief from the many discomforts I had. My body felt better right after. I will definitely continue with my sessions. This mobile stretch service is worth every penny." },
  { name: "Kristina Cabral", location: "Brooklyn, NY", initial: "K", text: "Kelly is excellent. Professional and efficient. As an active softball player I can say I have never slept so peacefully after. Was extremely relieved and was more than what I expected. The stretch service came right to my apartment in Brooklyn. Worth every penny!" },
  { name: "Michael Torres", location: "Manhattan, NY", initial: "M", text: "Best investment in my health I have made in years. The therapist came right to my office in Midtown, super professional setup. After years of lower back pain from sitting at a desk, I finally have relief. This stretch service is a must for any desk worker in NYC." },
  { name: "Sarah Kim", location: "Upper West Side, NY", initial: "S", text: "Incredible service! As a tech worker with chronic neck and shoulder tension, this has been life-changing. The therapist really understands the body and knew exactly where I was holding stress. Booking my weekly stretch service sessions was the best decision I made this year." },
  { name: "James O&apos;Brien", location: "Williamsburg, NY", initial: "J", text: "I run marathons and train in Prospect Park regularly. Recovery used to take me days. Since starting weekly sessions with Stretch NYC, my recovery time has been cut in half. The PNF stretching techniques they use are incredible. Best stretch service for runners in Brooklyn, hands down." },
  { name: "Linda Vasquez", location: "Astoria, NY", initial: "L", text: "As a senior with arthritis, I was nervous about trying a stretch service. The gentle stretch program they offer is perfect for me. My therapist is patient, knowledgeable, and always makes me feel safe. I have more mobility now than I have had in ten years. They come right to my apartment in Queens." },
  { name: "Robert Chen", location: "Tribeca, NY", initial: "R", text: "We booked Stretch NYC for our corporate team wellness day at our Tribeca office. Twenty employees got stretched and the feedback was unanimous — everyone loved it. Productivity went up that week and we have now signed on for monthly corporate stretch service sessions." },
  { name: "Emily Watson", location: "Park Slope, NY", initial: "E", text: "I was visiting NYC from London and my legs were destroyed after three days of walking. The hotel concierge recommended Stretch NYC and they came to my hotel room within two hours. The recovery stretch service was exactly what I needed. I could actually enjoy my last two days in the city." },
];

/* ─── FAQ ─── */

const homeFaqs = [
  { question: "How much does a mobile stretch service session cost in NYC?", answer: "Our professional mobile stretch service is priced at $99 per 60-minute session. Weekly clients save 10% and pay just $89 per session. All sessions include a full-body mobility assessment, professional equipment, and a personalized treatment plan delivered directly to your NYC location. Visit our pricing page for complete details." },
  { question: "Can I book a same-day stretch service appointment?", answer: "Yes! We offer same-day stretch service appointments across all five NYC boroughs including Manhattan, Brooklyn, Queens, the Bronx, and Staten Island. Text or call 212-202-7080 to check availability in your neighborhood. Most same-day requests are confirmed within 30 minutes." },
  { question: "What is included in a mobile stretch service session?", answer: "Every stretch service session includes a comprehensive full-body mobility assessment, 60 minutes of professional stretching therapy, all necessary equipment (portable massage table, mats, stretching straps, and tools), a customized treatment plan, and personalized recommendations for maintaining progress between sessions. Our certified therapists bring everything needed to your location." },
  { question: "Do you offer weekly stretch service programs with a discount?", answer: "Yes! Our weekly stretch service programs are available at $89 per 60-minute session, saving you 10% compared to single sessions. Weekly clients receive priority scheduling, same-therapist continuity for consistent progress tracking, and significantly better long-term results. Most clients see measurable improvement after just four weekly sessions." },
  { question: "Are your stretch therapists certified and insured?", answer: "Absolutely. All Stretch NYC therapists are fully certified in assisted stretching, PNF stretching, myofascial release, and sports rehabilitation. They carry professional liability insurance and have extensive experience serving clients across NYC. Learn more about our team on our about page." },
  { question: "How long is each stretch service session?", answer: "Our standard stretch service sessions are 60 minutes. This timeframe allows for a thorough mobility assessment, comprehensive stretching therapy targeting your specific needs, and post-session recommendations. The full hour ensures we address every problem area and leave you feeling significantly better than when we arrived." },
  { question: "Do you bring all equipment to my NYC location?", answer: "Yes! Our therapists bring professional-grade equipment including a portable massage table, stretching mats, resistance bands, stretching straps, and all necessary tools. We transform any space — your living room, office, hotel room, or even a spot in Central Park — into a professional stretch service environment. You do not need to provide anything." },
  { question: "Can assisted stretching help with chronic back pain?", answer: "Yes, our stretch service is highly effective for managing chronic pain conditions including lower back pain, neck tension, sciatica, hip pain, and general muscle tightness. Our therapists use targeted PNF stretching and myofascial release techniques to address the root causes of your pain. Many clients report significant relief after their very first session." },
  { question: "Do you offer corporate wellness stretch service programs?", answer: "Yes! We provide on-site corporate stretch service programs for companies throughout NYC. Our corporate wellness stretching helps reduce workplace injuries, improve employee productivity, lower healthcare costs, and boost team morale. We serve offices in Manhattan, Brooklyn, and all five boroughs. Visit our corporate wellness page for program details and pricing." },
  { question: "Do you provide stretch service at NYC hotels for tourists?", answer: "Absolutely! We come directly to your hotel room anywhere in NYC. We also meet tourists at iconic locations like Central Park, Brooklyn Bridge Park, The High Line, and 30+ other parks. After a long day of walking 20,000+ steps exploring the city, our recovery stretch service will have you feeling refreshed for the next day. See our hotel stretching page for details." },
  { question: "What should I wear during a stretch service session?", answer: "Wear comfortable, stretchy clothing that allows full range of motion — athletic wear, yoga pants, shorts, or sweatpants work perfectly. Avoid jeans, belts, or restrictive clothing. You do not need special shoes; most stretching is done barefoot or in socks. Our therapists will guide you through everything once they arrive at your NYC location." },
  { question: "How much space is needed for a stretch service session?", answer: "You need approximately a 6-by-8-foot clear area for our portable massage table setup. A living room, bedroom, office, or hotel room all work perfectly. If space is tight in your NYC apartment, our therapists are experts at adapting to smaller spaces. For outdoor sessions in parks like Central Park or Prospect Park, we bring mats and find a comfortable grassy area." },
  { question: "How often should I book a stretch service for best results?", answer: "For optimal results, we recommend weekly stretch service sessions. Our data shows that clients who commit to four or more consecutive weekly sessions see 3x greater flexibility improvement than single-session clients. After establishing a baseline, some clients transition to biweekly maintenance sessions. Your therapist will recommend a schedule based on your goals." },
  { question: "When will I see results from professional stretch service?", answer: "Most clients feel immediate relief and improved mobility after their very first stretch service session. Measurable flexibility gains typically appear after 3-4 consistent weekly sessions. Long-term benefits like reduced chronic pain, improved posture, and enhanced athletic performance develop over 6-8 weeks of regular stretching. Consistency is the key to lasting results." },
  { question: "Does insurance cover mobile stretch service sessions?", answer: "While most standard health insurance plans do not directly cover stretch service sessions, many HSA and FSA accounts can be used for our services. Some clients also receive reimbursement through their employer wellness programs. We provide detailed receipts that you can submit to your insurance provider or flexible spending account administrator." },
  { question: "Can I gift a stretch service session to someone in NYC?", answer: "Yes! Stretch service gift sessions are one of our most popular offerings. You can purchase a single session or a multi-session package for anyone in the NYC area. It is the perfect gift for birthdays, holidays, post-surgery recovery, or anyone who deserves to feel amazing. Contact us at 212-202-7080 to arrange a gift session. Visit our discounts page for special offers." },
  { question: "Is stretch service safe for athletes and people who work out?", answer: "Professional stretch service is not only safe for athletes — it is essential. Our PNF stretching and dynamic stretching techniques are used by Olympic athletes, professional sports teams, and elite fitness competitors worldwide. Pre-workout dynamic stretching improves performance by 5-10%, while post-workout recovery stretching reduces soreness and accelerates healing." },
  { question: "Can seniors safely use your stretch service?", answer: "Absolutely. Our gentle stretch service program is specifically designed for seniors and those with limited mobility. We use slow, controlled movements with extra care and attention. Our therapists are trained in senior-specific techniques including chair-assisted stretching and arthritis-friendly methods. Regular gentle stretching helps prevent falls, maintain independence, and improve quality of life. Learn more on our gentle stretch service page." },
  { question: "What is PNF stretching and how does it work?", answer: "PNF (Proprioceptive Neuromuscular Facilitation) stretching is the gold standard of professional stretching techniques. It combines passive stretching with isometric muscle contractions to achieve 2-3x greater flexibility gains than static stretching alone. Your therapist guides you through contract-relax cycles that trick your nervous system into allowing deeper stretches. Visit our PNF stretch service page for a complete explanation." },
  { question: "What is your cancellation policy for stretch service appointments?", answer: "We ask for at least 4 hours notice for cancellations or rescheduling. Same-day cancellations with less than 4 hours notice may be subject to a cancellation fee. We understand that NYC life is unpredictable, so we try to be as flexible as possible. To reschedule, simply text us at 212-202-7080 and we will find a new time that works for you." },
  { question: "Do you offer stretch service for chronic pain conditions like sciatica?", answer: "Yes, our stretch service is particularly effective for chronic pain conditions including sciatica, herniated disc discomfort, piriformis syndrome, chronic lower back pain, neck tension, and fibromyalgia symptoms. Our therapists use a combination of targeted PNF stretching, myofascial release, and gentle mobility work to address the root causes of your pain. Visit our chronic pain page for more information." },
  { question: "Can I book a stretch service session in a NYC park?", answer: "Yes! Outdoor stretch service sessions in NYC parks are one of our specialties. We serve 50+ parks and iconic locations including Central Park, Prospect Park, Brooklyn Bridge Park, The High Line, Riverside Park, and many more. We bring mats, resistance bands, and everything needed for a professional outdoor session. Check out our parks page to see all available locations." },
];

/* ─── Neighborhood Filters ─── */

const manhattanHoods = neighborhoods.filter((n) => n.boroughSlug === "manhattan").slice(0, 20);
const brooklynHoods = neighborhoods.filter((n) => n.boroughSlug === "brooklyn").slice(0, 20);
const queensHoods = neighborhoods.filter((n) => n.boroughSlug === "queens").slice(0, 20);
const bronxHoods = neighborhoods.filter((n) => n.boroughSlug === "bronx").slice(0, 20);
const siHoods = neighborhoods.filter((n) => n.boroughSlug === "staten-island").slice(0, 20);
const featuredParks = parks.filter((p) => p.touristRating >= 4).slice(0, 15);

/* ─── Borough park helpers ─── */
const manhattanParks = parks.filter((p) => p.boroughSlug === "manhattan").slice(0, 5);
const brooklynParks = parks.filter((p) => p.boroughSlug === "brooklyn").slice(0, 5);
const queensParks = parks.filter((p) => p.boroughSlug === "queens").slice(0, 5);
const bronxParks = parks.filter((p) => p.boroughSlug === "bronx").slice(0, 5);
const siParks = parks.filter((p) => p.boroughSlug === "staten-island").slice(0, 5);

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
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">NYC&apos;s #1 Assisted Stretch Service</p>
          <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl font-heading">
            NYC <span className="gradient-text">ASSISTED</span><br />
            STRETCH SERVICE<br />
            <span className="text-teal-200 text-3xl sm:text-4xl">Mobile — We Come to You</span>
          </h1>
          <div className="mx-auto mt-8 max-w-2xl">
            <p className="text-6xl font-bold text-white sm:text-7xl lg:text-8xl font-heading tracking-tight"><strong>$99 PER HOUR</strong></p>
            <p className="mt-3 text-2xl font-bold text-teal-100 sm:text-3xl font-heading"><strong>10% OFF WEEKLY — $89/SESSION</strong></p>
          </div>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">
            Professional mobile stretch service delivered directly to your home, office, hotel room, or favorite NYC park. Our certified stretch therapists serve all five boroughs:{" "}
            <Link href={getBoroughUrl(boroughs[0])} className="underline text-white hover:text-teal-200">Manhattan</Link>,{" "}
            <Link href={getBoroughUrl(boroughs[1])} className="underline text-white hover:text-teal-200">Brooklyn</Link>,{" "}
            <Link href={getBoroughUrl(boroughs[2])} className="underline text-white hover:text-teal-200">Queens</Link>,{" "}
            <Link href={getBoroughUrl(boroughs[3])} className="underline text-white hover:text-teal-200">The Bronx</Link>, and{" "}
            <Link href={getBoroughUrl(boroughs[4])} className="underline text-white hover:text-teal-200">Staten Island</Link>.
            Same-day appointments available 7 days a week.
          </p>
          <div className="mx-auto mt-8 grid max-w-xl grid-cols-3 gap-4">
            <div className="rounded-xl bg-white/10 p-4 backdrop-blur-sm">
              <p className="text-2xl font-bold text-white">7AM-10PM</p>
              <p className="text-xs text-teal-200">Hours Daily</p>
            </div>
            <div className="rounded-xl bg-white/10 p-4 backdrop-blur-sm">
              <p className="text-2xl font-bold text-white">5.0 Stars</p>
              <p className="text-xs text-teal-200">31 Reviews</p>
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
          SECTION 2 — ABOUT (alternating white/teal)
      ═══════════════════════════════════════════════════════ */}

      {/* 2A — What Is Assisted Stretching */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <div className="mb-6 flex justify-center">
          </div>
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">What Is Assisted Stretching? The Complete Guide to NYC&apos;s Fastest-Growing Wellness Service</h2>
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
              For New Yorkers, a mobile stretch service is especially valuable. The physical demands of NYC life — from cramped subway commutes and hours at a desk to walking miles across concrete sidewalks — create chronic patterns of muscle tension and joint restriction that compound over time. Your hip flexors shorten from sitting. Your shoulders round forward from screen use. Your neck strains from looking down at your phone on the L train. A professional stretch service addresses all of these patterns systematically, helping your body recover from the specific stresses of urban living. Whether you live in <Link href={getBoroughUrl(boroughs[0])} className="text-teal-600 underline hover:text-teal-700">Manhattan</Link>, <Link href={getBoroughUrl(boroughs[1])} className="text-teal-600 underline hover:text-teal-700">Brooklyn</Link>, or <Link href={getBoroughUrl(boroughs[2])} className="text-teal-600 underline hover:text-teal-700">Queens</Link>, our mobile stretch service comes directly to you.
            </p>
          </div>
        </div>
      </section>

      {/* 2B — How Our Mobile Stretch Service Works */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">How Our Mobile Stretch Service Works in NYC</h2>
          <div className="mt-8 space-y-5 text-base leading-relaxed text-slate-700">
            <p>
              Booking a stretch service session with Stretch NYC is designed to be as effortless as possible. We know that New Yorkers are busy, schedules are packed, and the last thing you want is a complicated booking process. Here is exactly how it works, from your first text message to feeling amazing after your session.
            </p>
            <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-white p-6 transition-all hover:border-teal-400 hover:shadow-md">
                <p className="text-3xl font-bold text-teal-600">1</p>
                <h3 className="mt-3 text-lg font-bold text-slate-900 font-heading">Text Us</h3>
                <p className="mt-2 text-sm text-slate-600">Send a text to <a href={SITE_SMS_LINK} className="text-teal-600 font-semibold">{SITE_PHONE}</a> with your name, preferred date and time, and location. You can also call if you prefer — we answer 7AM to 10PM daily. Tell us about any specific pain points or goals so we can match you with the right therapist for your stretch service session.</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-6 transition-all hover:border-teal-400 hover:shadow-md">
                <p className="text-3xl font-bold text-teal-600">2</p>
                <h3 className="mt-3 text-lg font-bold text-slate-900 font-heading">We Confirm</h3>
                <p className="mt-2 text-sm text-slate-600">We confirm your appointment within minutes. You will receive a confirmation text with your therapist&apos;s name, arrival time, and what to expect. No apps to download, no accounts to create, no complicated scheduling systems. Just a simple text conversation to get your stretch service booked.</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-6 transition-all hover:border-teal-400 hover:shadow-md">
                <p className="text-3xl font-bold text-teal-600">3</p>
                <h3 className="mt-3 text-lg font-bold text-slate-900 font-heading">Therapist Arrives</h3>
                <p className="mt-2 text-sm text-slate-600">Your certified stretch therapist arrives at your location with all professional equipment — portable massage table, mats, straps, and tools. They set up in minutes and begin with a thorough mobility assessment before starting your customized stretch service session.</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-6 transition-all hover:border-teal-400 hover:shadow-md">
                <p className="text-3xl font-bold text-teal-600">4</p>
                <h3 className="mt-3 text-lg font-bold text-slate-900 font-heading">Feel Amazing</h3>
                <p className="mt-2 text-sm text-slate-600">After 60 minutes of professional stretch service therapy, you will feel immediate relief. Improved range of motion, reduced pain, less tension, and a sense of physical freedom that lasts for days. Your therapist leaves you with personalized recommendations and your next session is just a text away.</p>
              </div>
            </div>
            <p className="mt-6">
              We serve every corner of New York City. Whether you need a stretch service in your <Link href={getNeighborhoodUrl(manhattanHoods[0])} className="text-teal-600 underline hover:text-teal-700">{manhattanHoods[0].name}</Link> apartment, your <Link href={getNeighborhoodUrl(brooklynHoods[0])} className="text-teal-600 underline hover:text-teal-700">{brooklynHoods[0].name}</Link> brownstone, your Midtown Manhattan office, or your hotel room in Times Square, our therapists come to you. We also offer outdoor stretch service sessions at iconic NYC parks including <Link href={getParkUrl(featuredParks[0])} className="text-teal-600 underline hover:text-teal-700">{featuredParks[0].name}</Link>, <Link href={getParkUrl(featuredParks[1])} className="text-teal-600 underline hover:text-teal-700">{featuredParks[1].name}</Link>, and <Link href={getParkUrl(featuredParks[2])} className="text-teal-600 underline hover:text-teal-700">{featuredParks[2].name}</Link>. The convenience of mobile stretch service means you never have to commute to a studio, find parking, or waste time traveling — the therapy comes to wherever you are.
            </p>
          </div>
        </div>
      </section>

      {/* 2C — Why Professional Stretch Service vs Self-Stretching */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Why Professional Stretch Service vs Self-Stretching</h2>
          <div className="mt-8 space-y-5 text-base leading-relaxed text-slate-700">
            <p>
              Many people wonder whether they really need a professional stretch service when they can stretch on their own at home or at the gym. The truth is, self-stretching and professional assisted stretching are fundamentally different in their effectiveness, safety, and results. Self-stretching is limited by your own strength, flexibility, body awareness, and the physical reality that you cannot apply external force to your own muscles at the precise angles needed for deep tissue release. A professional stretch service overcomes every single one of these limitations.
            </p>
            <p>
              When you stretch on your own, your muscles are simultaneously working to hold the stretch position AND trying to relax into the stretch — these opposing forces cancel each other out and significantly limit your range of motion. During a professional stretch service session, your therapist does all the work. Your muscles can fully relax, allowing for stretches that are 40-60% deeper than what you could achieve alone. This deeper stretch translates directly to greater flexibility gains, faster pain relief, and more lasting results.
            </p>
            <p>
              Self-stretching also carries a hidden risk: without professional guidance, many people stretch with improper form, stretch the wrong muscles, or push too far and cause micro-tears. A certified stretch therapist monitors your body&apos;s response in real-time, adjusting pressure, angle, and duration based on how your muscles are responding. They can feel tension patterns that you are not even aware of and target areas you did not know were tight. This precision is what makes a professional stretch service dramatically more effective than even the most dedicated self-stretching routine.
            </p>
            <p>
              Consider the numbers: a person who self-stretches daily for 30 minutes will see modest flexibility improvements over several months. A person who receives one 60-minute professional <Link href={getServiceUrl(services[0])} className="text-teal-600 underline hover:text-teal-700">assisted stretch service</Link> session per week will typically see the same improvements in just 2-3 weeks — and with zero effort on their part during the session. For busy New Yorkers who barely have time to eat lunch, the efficiency of professional stretch service is a game-changer. You get better results in less time while literally lying down and relaxing.
            </p>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          NEW SECTION — The Complete Guide to Professional Stretch Service in NYC
      ═══════════════════════════════════════════════════════ */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">The Complete Guide to Professional Stretch Service in NYC</h2>
          <div className="mt-8 space-y-5 text-base leading-relaxed text-slate-700">
            <p>
              If you have ever searched for an &quot;assisted stretch service near me&quot; in New York City, you have probably noticed that the industry is booming. Professional stretching services have exploded in popularity over the past decade, growing from a niche offering for elite athletes into a mainstream wellness practice that millions of Americans now rely on. But what exactly makes a professional stretch service different from attending a yoga class at your local studio or doing a quick stretch routine at the gym? The answer comes down to three critical factors: technique, personalization, and results. A professional stretching service NYC residents trust delivers targeted, one-on-one therapy that is customized to your body&apos;s unique needs — something no group class or solo routine can replicate.
            </p>
            <p>
              In a yoga class, you follow a group sequence that is designed for the average person. The instructor cannot adjust the routine for your specific tight hip flexor or your chronically restricted left shoulder. At the gym, you might spend five minutes on a foam roller or pull your arm across your chest before jumping into your workout, but these surface-level stretches barely scratch the surface of what your body actually needs. A mobile stretch service NYC therapist, by contrast, spends the entire 60-minute session focused exclusively on your body. They feel where the restrictions are, identify the compensation patterns your body has developed over years of desk work or subway commuting, and apply targeted techniques like <Link href={getServiceUrl(services[1])} className="text-teal-600 underline hover:text-teal-700">PNF stretching</Link> and <Link href={getServiceUrl(services[6])} className="text-teal-600 underline hover:text-teal-700">myofascial release</Link> to address the root causes of your stiffness and pain. This is the difference between a generic wellness activity and a precise therapeutic intervention.
            </p>
            <p>
              The concept of mobile stretch service matters enormously in a city like New York. Time is the most valuable commodity for New Yorkers, and the friction of traveling to a studio, changing clothes, waiting for your appointment, and commuting home afterward can easily turn a 60-minute session into a three-hour ordeal. Our in-home stretch service New York model eliminates all of that friction. Your therapist comes to your apartment in <Link href={getNeighborhoodUrl(manhattanHoods[0])} className="text-teal-600 underline hover:text-teal-700">{manhattanHoods[0].name}</Link>, your office in <Link href={getNeighborhoodUrl(manhattanHoods[4])} className="text-teal-600 underline hover:text-teal-700">{manhattanHoods[4].name}</Link>, your hotel room in Times Square, or your favorite bench in <Link href={getParkUrl(featuredParks[0])} className="text-teal-600 underline hover:text-teal-700">{featuredParks[0].name}</Link>. They bring all the equipment, set up in minutes, and pack up when the session is done. You do not even have to put on shoes. For a city where people regularly Uber two blocks to save ten minutes, the convenience of a mobile stretch therapist near me NYC service is transformative.
            </p>
            <p>
              The history of assisted stretching is deeply rooted in rehabilitation science. In the 1940s, Dr. Herman Kabat and physical therapists Margaret Knott and Dorothy Voss developed PNF stretching as a treatment for polio patients who had lost motor function. They discovered that by combining passive movement with strategic muscle contractions, they could retrain the nervous system and restore range of motion far more effectively than passive movement alone. This breakthrough technique eventually spread from rehabilitation clinics to athletic training rooms, where sports teams realized that PNF stretch service Manhattan athletes received was producing flexibility gains that translated directly to improved performance. By the 1980s, PNF was standard practice in professional sports. Today, it forms the backbone of every professional stretch service offered by Stretch NYC.
            </p>
            <p>
              Scientific research consistently validates the effectiveness of professional stretching. A 2019 meta-analysis published in the Journal of Sports Science and Medicine examined 23 studies on assisted stretching and found that participants who received therapist-guided stretching achieved an average of 54% greater flexibility gains compared to those who self-stretched, with the benefits compounding over time. Another study from the International Journal of Sports Physical Therapy demonstrated that just four weeks of weekly PNF stretch service sessions produced measurable improvements in hamstring flexibility, hip range of motion, and lower back mobility that persisted for up to six weeks after treatment ended. These are not marginal improvements — they represent the difference between living with chronic tightness and moving freely through your day.
            </p>
            <p>
              Consistency is the key that unlocks the full potential of professional stretch service. While a single session provides immediate relief — reduced muscle tension, improved range of motion, decreased pain — the truly transformative results come from committing to a regular schedule. We recommend a minimum of four consecutive weekly sessions for new clients. During this four-session window, your therapist establishes a baseline assessment, develops a progressive treatment plan, and begins the process of neurological reprogramming that creates lasting flexibility changes. Most clients who complete our four-session introductory program become long-term weekly clients because the results speak for themselves. At our affordable stretch service NYC $99 per session rate — or just $89 with weekly booking — professional stretching is one of the most cost-effective wellness investments you can make. Explore all of our <Link href="/services" className="text-teal-600 underline hover:text-teal-700">stretch service types</Link>, check <Link href="/pricing" className="text-teal-600 underline hover:text-teal-700">pricing details</Link>, or browse <Link href="/locations" className="text-teal-600 underline hover:text-teal-700">neighborhoods we serve</Link> across every borough in New York City.
            </p>
          </div>
        </div>
      </section>

      {/* 2D — PNF and Myofascial Explained */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Advanced Stretch Service Techniques: PNF and Myofascial Release</h2>
          <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
            <div>
              <h3 className="text-xl font-bold text-slate-900 font-heading">PNF Stretching — The Gold Standard</h3>
              <div className="mt-4 space-y-4 text-base leading-relaxed text-slate-700">
                <p>
                  <Link href={getServiceUrl(services[1])} className="text-teal-600 underline hover:text-teal-700">PNF stretching</Link> (Proprioceptive Neuromuscular Facilitation) is widely regarded as the most effective stretching technique in modern sports science. Originally developed in the 1940s for polio rehabilitation patients, PNF stretching has since become the preferred method for Olympic athletes, professional sports teams, and rehabilitation centers worldwide. When delivered as part of a professional stretch service, PNF techniques produce results that are simply impossible to achieve through any other method.
                </p>
                <p>
                  The technique works through a contract-relax cycle. Your therapist moves a muscle to its current end range, then asks you to contract (push against their resistance) for 6-10 seconds. After the contraction, you relax, and the therapist gently pushes the muscle further into the stretch. This process activates your Golgi tendon organs — proprioceptors that signal your nervous system to relax the muscle — allowing a significantly deeper stretch. Studies published in the Journal of Strength and Conditioning Research demonstrate that PNF stretching produces 2-3x greater range of motion improvements compared to static stretching alone.
                </p>
                <p>
                  For New Yorkers, PNF stretch service is especially effective for chronic hip flexor tightness from subway sitting, rounded shoulders from desk work, and hamstring restriction from long walks across the city. Our therapists in <Link href={getBoroughUrl(boroughs[0])} className="text-teal-600 underline hover:text-teal-700">Manhattan</Link>, <Link href={getBoroughUrl(boroughs[1])} className="text-teal-600 underline hover:text-teal-700">Brooklyn</Link>, and <Link href={getBoroughUrl(boroughs[2])} className="text-teal-600 underline hover:text-teal-700">Queens</Link> are all certified in advanced PNF protocols.
                </p>
              </div>
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900 font-heading">Myofascial Release — Deep Tissue Freedom</h3>
              <div className="mt-4 space-y-4 text-base leading-relaxed text-slate-700">
                <p>
                  <Link href={getServiceUrl(services[6])} className="text-teal-600 underline hover:text-teal-700">Myofascial release</Link> targets the fascia — the web of connective tissue that wraps around every muscle, bone, nerve, and organ in your body. Think of fascia as a full-body suit that sits just beneath your skin. When healthy, fascia is supple and slides freely. But when it becomes restricted due to stress, injury, surgery, poor posture, or repetitive movements (like typing at a desk or gripping subway poles), it creates adhesions that cause pain, stiffness, and severely limited mobility. These fascial restrictions are the hidden cause of many chronic pain conditions that stretching alone cannot fix.
                </p>
                <p>
                  During a myofascial release stretch service session, your therapist applies sustained, gentle pressure to areas of fascial restriction. Unlike massage, which works on muscles, myofascial release works on the connective tissue layer. The therapist holds pressure for 90-120 seconds at each restriction point, allowing the fascia to slowly soften, elongate, and release. This technique is especially effective for NYC desk workers suffering from tech neck, chronic lower back pain, and shoulder tension. When combined with PNF stretching as part of a comprehensive stretch service, myofascial release delivers transformative results.
                </p>
                <p>
                  Many of our clients in neighborhoods like <Link href={getNeighborhoodUrl(manhattanHoods[1])} className="text-teal-600 underline hover:text-teal-700">{manhattanHoods[1].name}</Link>, <Link href={getNeighborhoodUrl(brooklynHoods[1])} className="text-teal-600 underline hover:text-teal-700">{brooklynHoods[1].name}</Link>, and <Link href={getNeighborhoodUrl(queensHoods[0])} className="text-teal-600 underline hover:text-teal-700">{queensHoods[0].name}</Link> book combined PNF and myofascial sessions for maximum benefit.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2E — Who We Serve */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Who Benefits from Our NYC Stretch Service</h2>
          <p className="mt-3 text-center text-base text-slate-600">Our professional stretch service is designed for every body type, age, and fitness level. Here are the eight client groups we serve most frequently across New York City.</p>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2">
            {clientTypes.map((ct) => (
              <div key={ct.slug} className="rounded-xl border border-slate-200 bg-white p-6 transition-all hover:border-teal-400 hover:shadow-md">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{ct.emoji}</span>
                  <h3 className="text-lg font-bold text-slate-900 font-heading">{ct.name}</h3>
                </div>
                <p className="mt-3 text-sm text-slate-600">{ct.shortDesc}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {ct.painPoints.slice(0, 4).map((pp) => (
                    <span key={pp} className="rounded-full bg-teal-50 px-3 py-1 text-xs text-teal-700">{pp}</span>
                  ))}
                </div>
                <p className="mt-3 text-sm text-slate-600">
                  {ct.slug === "desk-workers" && <>If you spend 8+ hours a day at a desk in a <Link href={getBoroughUrl(boroughs[0])} className="text-teal-600 underline hover:text-teal-700">Manhattan</Link> office, your body is suffering from chronic postural stress. Our <Link href={getServiceUrl(services[0])} className="text-teal-600 underline hover:text-teal-700">assisted stretch service</Link> targets the specific muscle groups that desk work shortens and tightens — hip flexors, chest, upper traps, and neck. A weekly stretch service session can reverse years of desk damage and help you move freely again. Many of our desk worker clients in <Link href={getNeighborhoodUrl(manhattanHoods[2])} className="text-teal-600 underline hover:text-teal-700">{manhattanHoods[2].name}</Link> and <Link href={getNeighborhoodUrl(brooklynHoods[2])} className="text-teal-600 underline hover:text-teal-700">{brooklynHoods[2].name}</Link> report dramatic improvement after just three sessions.</>}
                  {ct.slug === "nyc-commuters" && <>Daily subway commutes wreak havoc on your body. Standing on crowded trains, gripping poles, absorbing jolts, and sitting in awkward positions all create cumulative strain. Our mobile stretch service meets you at home after your commute — whether you live in <Link href={getBoroughUrl(boroughs[2])} className="text-teal-600 underline hover:text-teal-700">Queens</Link>, <Link href={getBoroughUrl(boroughs[1])} className="text-teal-600 underline hover:text-teal-700">Brooklyn</Link>, or <Link href={getBoroughUrl(boroughs[3])} className="text-teal-600 underline hover:text-teal-700">the Bronx</Link> — and undoes the damage before it compounds. Our <Link href={getServiceUrl(services[4])} className="text-teal-600 underline hover:text-teal-700">passive stretch service</Link> is perfect for commuters who just want to relax after a long day.</>}
                  {ct.slug === "tourists-travelers" && <>You flew into NYC, walked 20,000+ steps exploring Times Square, the Brooklyn Bridge, Central Park, and the High Line, and now your legs feel like concrete. Our <Link href={getServiceUrl(services[8])} className="text-teal-600 underline hover:text-teal-700">recovery stretch service</Link> is designed exactly for this scenario. We come to your hotel room or meet you at iconic parks like <Link href={getParkUrl(featuredParks[0])} className="text-teal-600 underline hover:text-teal-700">{featuredParks[0].name}</Link>. Check out our <Link href="/hotel-stretching" className="text-teal-600 underline hover:text-teal-700">hotel stretching page</Link> for tourist-specific packages.</>}
                  {ct.slug === "athletes" && <>Whether you run in <Link href={getParkUrl(featuredParks[0])} className="text-teal-600 underline hover:text-teal-700">{featuredParks[0].name}</Link>, lift at your gym in <Link href={getNeighborhoodUrl(manhattanHoods[3])} className="text-teal-600 underline hover:text-teal-700">{manhattanHoods[3].name}</Link>, or play sports in <Link href={getBoroughUrl(boroughs[1])} className="text-teal-600 underline hover:text-teal-700">Brooklyn</Link>, our <Link href={getServiceUrl(services[1])} className="text-teal-600 underline hover:text-teal-700">PNF stretch service</Link> and <Link href={getServiceUrl(services[3])} className="text-teal-600 underline hover:text-teal-700">dynamic stretch service</Link> will improve your performance and accelerate your recovery. Professional stretch service is used by elite athletes worldwide for a reason — it works better and faster than anything else.</>}
                  {ct.slug === "seniors" && <>Our <Link href={getServiceUrl(services[9])} className="text-teal-600 underline hover:text-teal-700">gentle stretch service</Link> is specifically designed for seniors who want to maintain mobility, prevent falls, and stay independent. With chair-assisted options and arthritis-friendly techniques, our therapists provide safe, effective stretching for older adults throughout <Link href={getBoroughUrl(boroughs[0])} className="text-teal-600 underline hover:text-teal-700">Manhattan</Link>, <Link href={getBoroughUrl(boroughs[2])} className="text-teal-600 underline hover:text-teal-700">Queens</Link>, and all five boroughs. Regular gentle stretch service sessions help prevent falls — the number one cause of injury in seniors.</>}
                  {ct.slug === "post-surgery" && <>After surgery, safe and guided stretching is critical for restoring range of motion and preventing scar tissue adhesions. Our therapists work closely with your physician&apos;s guidelines to provide gentle, progressive stretch service therapy that supports your recovery without risking re-injury. We serve post-surgery clients in neighborhoods across <Link href={getBoroughUrl(boroughs[0])} className="text-teal-600 underline hover:text-teal-700">Manhattan</Link> and <Link href={getBoroughUrl(boroughs[1])} className="text-teal-600 underline hover:text-teal-700">Brooklyn</Link>, coming directly to your home for maximum comfort during recovery.</>}
                  {ct.slug === "corporate-teams" && <>Our <Link href="/corporate-wellness" className="text-teal-600 underline hover:text-teal-700">corporate stretch service program</Link> brings professional assisted stretching directly to your NYC office. On-site stretch service sessions reduce workplace injuries, lower healthcare costs, boost productivity, and improve team morale. We serve corporate clients in <Link href={getNeighborhoodUrl(manhattanHoods[4])} className="text-teal-600 underline hover:text-teal-700">{manhattanHoods[4].name}</Link>, <Link href={getNeighborhoodUrl(brooklynHoods[3])} className="text-teal-600 underline hover:text-teal-700">{brooklynHoods[3].name}</Link>, and throughout all five boroughs.</>}
                  {ct.slug === "chronic-pain" && <>Chronic pain from sciatica, herniated discs, fibromyalgia, and tension headaches can make NYC life unbearable. Our stretch service combines targeted <Link href={getServiceUrl(services[1])} className="text-teal-600 underline hover:text-teal-700">PNF stretching</Link> with <Link href={getServiceUrl(services[6])} className="text-teal-600 underline hover:text-teal-700">myofascial release</Link> to address the root causes of chronic pain — not just the symptoms. Many of our chronic pain clients in <Link href={getBoroughUrl(boroughs[0])} className="text-teal-600 underline hover:text-teal-700">Manhattan</Link> and <Link href={getBoroughUrl(boroughs[1])} className="text-teal-600 underline hover:text-teal-700">Brooklyn</Link> report significant improvement after consistent weekly sessions.</>}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 2F — The Science Behind Stretching */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">The Science Behind Professional Stretch Service</h2>
          <div className="mt-8 space-y-5 text-base leading-relaxed text-slate-700">
            <p>
              The human body contains over 600 muscles, 360 joints, and an intricate web of fascia and connective tissue that determines how freely you move. When muscles are chronically shortened — from sitting, repetitive movement, stress, or injury — they pull on joints, compress nerves, restrict blood flow, and create compensatory movement patterns that lead to pain in areas far from the original restriction. A professional stretch service addresses the body as an integrated system, not just a collection of isolated muscles, and that is why the results are so much more profound than anything you can achieve alone.
            </p>
            <p>
              At the cellular level, stretching activates mechanotransduction — a process where physical force applied to cells triggers biochemical responses. When a therapist applies sustained stretch force to a muscle, the mechanical stress signals fibroblasts (connective tissue cells) to remodel the tissue structure. Over time, this remodeling increases the number of sarcomeres (the basic contractile units of muscle fibers) arranged in series, literally making the muscle longer and more elastic. This is why consistent weekly stretch service sessions produce permanent flexibility improvements, while sporadic stretching provides only temporary relief.
            </p>
            <p>
              Stretching also has profound effects on the nervous system. Chronic pain and muscle tension are often maintained by a feedback loop between the muscles and the brain. When muscles are tight, they send constant tension signals to the central nervous system, which responds by increasing muscle tone (tightness) even further — a vicious cycle. Professional stretch service breaks this cycle through both mechanical tissue release and neurological reprogramming. Techniques like <Link href={getServiceUrl(services[1])} className="text-teal-600 underline hover:text-teal-700">PNF stretching</Link> specifically target the nervous system, activating Golgi tendon organs and muscle spindles to reset your body&apos;s perception of safe range of motion. After a stretch service session, your nervous system recalibrates, allowing greater range of motion without triggering protective tension responses.
            </p>
            <p>
              The cardiovascular benefits of professional stretch service are often overlooked but equally significant. Stretching increases blood flow to muscles by up to 30%, improving oxygen delivery and nutrient transport while accelerating the removal of metabolic waste products like lactic acid. For NYC residents who walk miles daily, this enhanced circulation means faster recovery, less soreness, and more energy. Stretching also activates the parasympathetic nervous system — your body&apos;s &quot;rest and digest&quot; mode — reducing cortisol levels, lowering blood pressure, and promoting the deep relaxation that is so hard to achieve in the high-stress environment of New York City.
            </p>
            <p>
              Perhaps most importantly, research from the American College of Sports Medicine demonstrates that flexibility is a key predictor of functional independence as we age. NYC seniors who maintain flexibility through regular stretch service sessions are significantly less likely to experience falls, joint replacements, and loss of independence. Our <Link href={getServiceUrl(services[9])} className="text-teal-600 underline hover:text-teal-700">gentle stretch service</Link> program for seniors is designed around this research, focusing on the specific movements and ranges of motion that matter most for daily life in the city — reaching overhead for subway handles, bending to tie shoes, climbing stairs in walkup buildings, and walking confidently on uneven sidewalks.
            </p>
          </div>
        </div>
      </section>

      {/* 2G — Stretching vs Other Modalities */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Stretch Service vs Massage, Chiropractic, Yoga, and Physical Therapy</h2>
          <div className="mt-8 space-y-5 text-base leading-relaxed text-slate-700">
            <p>
              New Yorkers have no shortage of wellness options, so it is important to understand how professional stretch service differs from other popular modalities. Each has its place, but assisted stretching fills a unique gap that none of the others can address as effectively.
            </p>
            <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-white p-6 transition-all hover:border-teal-400 hover:shadow-md">
                <h3 className="text-lg font-bold text-slate-900 font-heading">Stretch Service vs Massage</h3>
                <p className="mt-2 text-sm text-slate-600">Massage focuses on relaxing muscles through kneading and pressure. Stretch service actively lengthens muscles and improves joint range of motion. While massage provides temporary relief from tension, professional stretch service creates permanent structural changes in muscle length and flexibility. Many of our NYC clients use both — massage for relaxation and stretch service for functional improvement. Our <Link href={getServiceUrl(services[4])} className="text-teal-600 underline hover:text-teal-700">passive stretch service</Link> is the closest to a massage-like experience while still delivering flexibility gains.</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-6 transition-all hover:border-teal-400 hover:shadow-md">
                <h3 className="text-lg font-bold text-slate-900 font-heading">Stretch Service vs Chiropractic</h3>
                <p className="mt-2 text-sm text-slate-600">Chiropractic care focuses on spinal alignment through adjustments. Professional stretch service addresses the muscles and fascia that pull joints out of alignment in the first place. In many cases, tight muscles are the root cause of the misalignment that chiropractors correct — and without addressing the muscle tightness, the adjustment will not hold. Many chiropractors in <Link href={getBoroughUrl(boroughs[0])} className="text-teal-600 underline hover:text-teal-700">Manhattan</Link> and <Link href={getBoroughUrl(boroughs[1])} className="text-teal-600 underline hover:text-teal-700">Brooklyn</Link> recommend stretch service as a complement to their adjustments.</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-6 transition-all hover:border-teal-400 hover:shadow-md">
                <h3 className="text-lg font-bold text-slate-900 font-heading">Stretch Service vs Yoga</h3>
                <p className="mt-2 text-sm text-slate-600">Yoga is an active practice where you stretch yourself. Professional stretch service is passive — the therapist does the work while you relax. Yoga requires flexibility to do many poses correctly, creating a chicken-and-egg problem for stiff New Yorkers. Stretch service breaks through this barrier, giving you the baseline flexibility to actually benefit from yoga. Many yoga practitioners in <Link href={getNeighborhoodUrl(manhattanHoods[5])} className="text-teal-600 underline hover:text-teal-700">{manhattanHoods[5].name}</Link> and <Link href={getNeighborhoodUrl(brooklynHoods[4])} className="text-teal-600 underline hover:text-teal-700">{brooklynHoods[4].name}</Link> use our <Link href={getServiceUrl(services[2])} className="text-teal-600 underline hover:text-teal-700">active stretch service</Link> to complement their practice.</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-6 transition-all hover:border-teal-400 hover:shadow-md">
                <h3 className="text-lg font-bold text-slate-900 font-heading">Stretch Service vs Physical Therapy</h3>
                <p className="mt-2 text-sm text-slate-600">Physical therapy treats diagnosed conditions and injuries, often requiring a doctor&apos;s referral and insurance. Professional stretch service is a wellness and prevention modality that anyone can access without a referral. While PT focuses on rehabilitation, stretch service focuses on optimization, maintenance, and prevention. Many of our clients transition from PT to regular stretch service sessions to maintain the progress they achieved during rehabilitation. Our <Link href={getServiceUrl(services[8])} className="text-teal-600 underline hover:text-teal-700">recovery stretch service</Link> bridges the gap between physical therapy and ongoing wellness.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2H — Tourist/Hotel, Corporate, Parks, Careers */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 font-heading">Stretch Service for NYC Tourists and Hotel Guests</h2>
              <div className="mt-4 space-y-4 text-base leading-relaxed text-slate-700">
                <p>
                  Visiting New York City is an incredible experience — but it is also physically brutal. The average NYC tourist walks 20,000-30,000 steps per day exploring Manhattan&apos;s endless streets, climbing subway stairs, and standing in lines at Broadway shows and restaurants. By day two, most visitors are dealing with sore feet, tight calves, aching lower backs, and leg fatigue that makes every step painful.
                </p>
                <p>
                  Our <Link href="/hotel-stretching" className="text-teal-600 underline hover:text-teal-700">hotel stretch service</Link> solves this problem. We come directly to your hotel room — anywhere in NYC — with all equipment. In 60 minutes, our therapist uses <Link href={getServiceUrl(services[8])} className="text-teal-600 underline hover:text-teal-700">recovery stretching</Link> techniques to flush metabolic waste from your muscles, reduce inflammation, and restore your legs so you can enjoy the rest of your trip. We also meet tourists at iconic locations like <Link href={getParkUrl(featuredParks[0])} className="text-teal-600 underline hover:text-teal-700">{featuredParks[0].name}</Link>, <Link href={getParkUrl(featuredParks[1])} className="text-teal-600 underline hover:text-teal-700">{featuredParks[1].name}</Link>, and <Link href={getParkUrl(featuredParks[2])} className="text-teal-600 underline hover:text-teal-700">{featuredParks[2].name}</Link> for an unforgettable outdoor stretch service experience.
                </p>
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900 font-heading">Corporate Wellness Stretch Service Programs</h2>
              <div className="mt-4 space-y-4 text-base leading-relaxed text-slate-700">
                <p>
                  NYC companies are discovering that on-site <Link href="/corporate-wellness" className="text-teal-600 underline hover:text-teal-700">corporate stretch service</Link> programs are one of the most effective employee wellness investments they can make. Studies show that workplace stretching programs reduce musculoskeletal injury claims by up to 50%, decrease absenteeism, and increase employee satisfaction scores. For companies with desk-bound teams, the ROI of regular stretch service sessions far exceeds the cost.
                </p>
                <p>
                  We bring our professional stretch service directly to your office in <Link href={getBoroughUrl(boroughs[0])} className="text-teal-600 underline hover:text-teal-700">Manhattan</Link>, <Link href={getBoroughUrl(boroughs[1])} className="text-teal-600 underline hover:text-teal-700">Brooklyn</Link>, or any NYC borough. Our corporate programs include individual 15-minute chair stretch sessions for team members, group stretch service workshops, and lunch-and-learn wellness presentations. Contact us for custom corporate pricing.
                </p>
              </div>
            </div>
          </div>
          <div className="mt-12 grid grid-cols-1 gap-12 lg:grid-cols-2">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 font-heading">Stretch Service in NYC Parks and Iconic Locations</h2>
              <div className="mt-4 space-y-4 text-base leading-relaxed text-slate-700">
                <p>
                  One of the most unique aspects of our mobile stretch service is the ability to book sessions at any of 50+ NYC parks and iconic locations. Imagine getting a professional stretch in the middle of <Link href={getParkUrl(featuredParks[0])} className="text-teal-600 underline hover:text-teal-700">{featuredParks[0].name}</Link> on a beautiful morning, or a sunset stretch service session at <Link href={getParkUrl(featuredParks[1])} className="text-teal-600 underline hover:text-teal-700">{featuredParks[1].name}</Link> with the Manhattan skyline as your backdrop.
                </p>
                <p>
                  Popular outdoor stretch service locations include <Link href={getParkUrl(featuredParks[2])} className="text-teal-600 underline hover:text-teal-700">{featuredParks[2].name}</Link>,{" "}
                  {featuredParks.slice(3, 8).map((p, i) => (
                    <span key={p.slug}>
                      <Link href={getParkUrl(p)} className="text-teal-600 underline hover:text-teal-700">{p.name}</Link>
                      {i < 4 ? ", " : ". "}
                    </span>
                  ))}
                  Visit our <Link href="/parks" className="text-teal-600 underline hover:text-teal-700">parks page</Link> to see all available locations for outdoor stretch service sessions.
                </p>
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900 font-heading">Join the Stretch NYC Team</h2>
              <div className="mt-4 space-y-4 text-base leading-relaxed text-slate-700">
                <p>
                  Are you a certified stretch therapist, massage therapist, personal trainer, or physical therapy professional looking for flexible, rewarding work in New York City? Stretch NYC is hiring mobile stretch service therapists across all five boroughs. We offer competitive pay starting at $50/hour, flexible scheduling, and the opportunity to build meaningful relationships with clients while helping them feel their best.
                </p>
                <p>
                  We need both male and female therapists to serve our diverse NYC client base. If you are passionate about helping people move better and live pain-free, visit our <Link href="/jobs" className="text-teal-600 underline hover:text-teal-700">careers page</Link> to apply. We serve neighborhoods across <Link href={getBoroughUrl(boroughs[0])} className="text-teal-600 underline hover:text-teal-700">Manhattan</Link>, <Link href={getBoroughUrl(boroughs[1])} className="text-teal-600 underline hover:text-teal-700">Brooklyn</Link>, <Link href={getBoroughUrl(boroughs[2])} className="text-teal-600 underline hover:text-teal-700">Queens</Link>, <Link href={getBoroughUrl(boroughs[3])} className="text-teal-600 underline hover:text-teal-700">the Bronx</Link>, and <Link href={getBoroughUrl(boroughs[4])} className="text-teal-600 underline hover:text-teal-700">Staten Island</Link>.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 3 — REVIEWS
      ═══════════════════════════════════════════════════════ */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <div className="text-center">
            <p className="text-sm font-semibold text-slate-500">Google Reviews</p>
            <p className="mt-1 text-4xl font-bold text-slate-900 font-heading">5.0</p>
            <p className="text-sm text-teal-600">&#9733;&#9733;&#9733;&#9733;&#9733; (31 Reviews)</p>
            <p className="mt-2 text-base text-slate-600">Real reviews from real NYC stretch service clients</p>
          </div>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {reviews.map((r) => (
              <div key={r.name} className="rounded-xl border border-slate-200 bg-white p-6 transition-all hover:border-teal-400 hover:shadow-md">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-100 text-sm font-bold text-teal-700">{r.initial}</div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">{r.name}</p>
                    <p className="text-xs text-slate-500">{r.location}</p>
                  </div>
                </div>
                <p className="mt-1 text-xs text-teal-600">&#9733;&#9733;&#9733;&#9733;&#9733;</p>
                <p className="mt-3 text-sm text-slate-600">{r.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 4 — SERVICES
      ═══════════════════════════════════════════════════════ */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">All 11 NYC Stretch Service Types We Offer</h2>
          <p className="mt-3 text-center text-base text-slate-600">Every stretch service is delivered mobile — we come to your home, office, hotel, or park anywhere in NYC. <strong>$99/hour</strong> per session, or <strong>$89/session with weekly booking (10% OFF)</strong>.</p>

          {/* Service Cards Grid */}
          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((s) => (
              <Link key={s.slug} href={getServiceUrl(s)}>
                <div className="group rounded-xl border border-teal-200/60 bg-white p-6 transition-all hover:border-teal-400 hover:shadow-md h-full">
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-teal-600 font-heading">{s.name}</h3>
                  <p className="mt-1 text-xs font-semibold text-teal-600">{s.tagline}</p>
                  <p className="mt-2 text-sm text-slate-600">{s.shortDesc}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {s.idealFor.slice(0, 3).map((tag) => (
                      <span key={tag} className="rounded-full bg-teal-50 px-2.5 py-0.5 text-xs text-teal-700">{tag}</span>
                    ))}
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Detailed Service Descriptions */}
          <div className="mt-16 space-y-10">
            <div>
              <h3 className="text-xl font-bold text-slate-900 font-heading"><Link href={getServiceUrl(services[0])} className="hover:text-teal-600">Assisted Stretch Service in NYC</Link></h3>
              <p className="mt-3 text-base leading-relaxed text-slate-700">
                Our flagship <Link href={getServiceUrl(services[0])} className="text-teal-600 underline hover:text-teal-700">assisted stretch service</Link> is a comprehensive, one-on-one session where your certified therapist guides your body through targeted positions for maximum flexibility gains. This is the most popular stretch service we offer because it covers everything — a full-body mobility assessment, targeted stretching of all major muscle groups, PNF techniques for stubborn areas, and personalized recommendations for maintaining your progress. Assisted stretching is ideal for first-time clients, desk workers in <Link href={getNeighborhoodUrl(manhattanHoods[2])} className="text-teal-600 underline hover:text-teal-700">{manhattanHoods[2].name}</Link>, commuters from <Link href={getBoroughUrl(boroughs[2])} className="text-teal-600 underline hover:text-teal-700">Queens</Link>, and anyone looking for a complete stretch service experience. At <strong>$99 per hour</strong>, it is the best value in NYC wellness.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900 font-heading"><Link href={getServiceUrl(services[1])} className="hover:text-teal-600">PNF Stretch Service in NYC</Link></h3>
              <p className="mt-3 text-base leading-relaxed text-slate-700">
                <Link href={getServiceUrl(services[1])} className="text-teal-600 underline hover:text-teal-700">PNF stretch service</Link> (Proprioceptive Neuromuscular Facilitation) is the gold standard technique used by Olympic athletes and professional sports teams. Using contract-relax cycles that trick your nervous system into allowing deeper stretches, PNF produces 2-3x greater flexibility improvements than static stretching. This stretch service is especially popular with runners who train in <Link href={getParkUrl(featuredParks[0])} className="text-teal-600 underline hover:text-teal-700">{featuredParks[0].name}</Link>, CrossFit athletes in <Link href={getNeighborhoodUrl(brooklynHoods[0])} className="text-teal-600 underline hover:text-teal-700">{brooklynHoods[0].name}</Link>, and anyone who has hit a flexibility plateau. If you are serious about results, PNF stretch service is the technique for you.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900 font-heading"><Link href={getServiceUrl(services[2])} className="hover:text-teal-600">Active Stretch Service in NYC</Link></h3>
              <p className="mt-3 text-base leading-relaxed text-slate-700">
                <Link href={getServiceUrl(services[2])} className="text-teal-600 underline hover:text-teal-700">Active stretch service</Link> is unique because you use your own muscles to hold stretch positions while your therapist guides proper form and alignment. This builds strength and flexibility simultaneously, making it the perfect stretch service for yoga practitioners in <Link href={getNeighborhoodUrl(manhattanHoods[5])} className="text-teal-600 underline hover:text-teal-700">{manhattanHoods[5].name}</Link>, dancers, gymnasts, and anyone who wants functional flexibility that translates directly to real-world movement. Active stretching develops body awareness and muscle control that passive techniques alone cannot provide.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900 font-heading"><Link href={getServiceUrl(services[3])} className="hover:text-teal-600">Dynamic Stretch Service in NYC</Link></h3>
              <p className="mt-3 text-base leading-relaxed text-slate-700">
                <Link href={getServiceUrl(services[3])} className="text-teal-600 underline hover:text-teal-700">Dynamic stretch service</Link> uses controlled, flowing movements to take your joints through their full range of motion. Research shows that dynamic stretching before physical activity improves performance by 5-10% and significantly reduces injury risk. This stretch service is the ideal pre-workout warm-up for runners in <Link href={getParkUrl(featuredParks[0])} className="text-teal-600 underline hover:text-teal-700">{featuredParks[0].name}</Link>, gym-goers in <Link href={getNeighborhoodUrl(manhattanHoods[3])} className="text-teal-600 underline hover:text-teal-700">{manhattanHoods[3].name}</Link>, and athletes throughout <Link href={getBoroughUrl(boroughs[1])} className="text-teal-600 underline hover:text-teal-700">Brooklyn</Link> and <Link href={getBoroughUrl(boroughs[2])} className="text-teal-600 underline hover:text-teal-700">Queens</Link>.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900 font-heading"><Link href={getServiceUrl(services[4])} className="hover:text-teal-600">Passive Stretch Service in NYC</Link></h3>
              <p className="mt-3 text-base leading-relaxed text-slate-700">
                <Link href={getServiceUrl(services[4])} className="text-teal-600 underline hover:text-teal-700">Passive stretch service</Link> is the most relaxing form of assisted stretching. Your therapist does all the work while you remain completely relaxed — no effort required on your part. This allows for deeper stretches because your muscles are not fighting against the stretch. Passive stretching is especially popular among stressed-out NYC professionals in <Link href={getNeighborhoodUrl(manhattanHoods[4])} className="text-teal-600 underline hover:text-teal-700">{manhattanHoods[4].name}</Link>, travelers recovering from jet lag in their hotels, and anyone who wants a deeply calming stretch service experience after a long NYC day.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900 font-heading"><Link href={getServiceUrl(services[5])} className="hover:text-teal-600">Static Stretch Service in NYC</Link></h3>
              <p className="mt-3 text-base leading-relaxed text-slate-700">
                <Link href={getServiceUrl(services[5])} className="text-teal-600 underline hover:text-teal-700">Static stretch service</Link> involves sustained stretch holds of 30-60 seconds with therapist assistance for maximum muscle lengthening. This is the foundation of all flexibility improvement and is recommended post-workout, before bed, and as part of any recovery routine. Static stretching is the most commonly requested stretch service for clients in <Link href={getBoroughUrl(boroughs[0])} className="text-teal-600 underline hover:text-teal-700">Manhattan</Link> who want to unwind after work and sleep better at night.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900 font-heading"><Link href={getServiceUrl(services[6])} className="hover:text-teal-600">Myofascial Release Stretch Service in NYC</Link></h3>
              <p className="mt-3 text-base leading-relaxed text-slate-700">
                <Link href={getServiceUrl(services[6])} className="text-teal-600 underline hover:text-teal-700">Myofascial release stretch service</Link> targets the fascia — the connective tissue that wraps around every muscle in your body. When fascia becomes tight from stress, injury, or repetitive desk work, it creates chronic pain patterns that regular stretching cannot fix. Our therapists apply sustained pressure to fascial restrictions, breaking up adhesions and restoring normal tissue mobility. This stretch service is especially popular among tech workers in <Link href={getNeighborhoodUrl(manhattanHoods[6])} className="text-teal-600 underline hover:text-teal-700">{manhattanHoods[6].name}</Link> and <Link href={getNeighborhoodUrl(brooklynHoods[2])} className="text-teal-600 underline hover:text-teal-700">{brooklynHoods[2].name}</Link> who suffer from chronic neck and shoulder tension.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900 font-heading"><Link href={getServiceUrl(services[7])} className="hover:text-teal-600">Foam Rolling Stretch Service in NYC</Link></h3>
              <p className="mt-3 text-base leading-relaxed text-slate-700">
                Our <Link href={getServiceUrl(services[7])} className="text-teal-600 underline hover:text-teal-700">foam rolling stretch service</Link> pairs expert-guided foam rolling techniques with professional instruction. Most people own a foam roller but use it incorrectly — missing key areas, applying wrong pressure, or rolling too fast. Our therapists teach you proper technique and guide you through a customized routine. This stretch service gives you tools to maintain your progress between professional sessions, and is popular with gym-goers throughout <Link href={getBoroughUrl(boroughs[0])} className="text-teal-600 underline hover:text-teal-700">Manhattan</Link> and <Link href={getBoroughUrl(boroughs[1])} className="text-teal-600 underline hover:text-teal-700">Brooklyn</Link>.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900 font-heading"><Link href={getServiceUrl(services[8])} className="hover:text-teal-600">Recovery Stretch Service in NYC</Link></h3>
              <p className="mt-3 text-base leading-relaxed text-slate-700">
                <Link href={getServiceUrl(services[8])} className="text-teal-600 underline hover:text-teal-700">Recovery stretch service</Link> is designed specifically for after physical exertion — a marathon, a gym session, a day of walking NYC, or a long flight. Your therapist uses a combination of gentle static stretching, light PNF, and myofascial techniques to flush metabolic waste, reduce inflammation, and prevent the stiffness that hits 24-48 hours later. For NYC tourists who have walked 20,000+ steps exploring the city, recovery stretching at their hotel is the difference between enjoying tomorrow and barely being able to move. This is our most-booked stretch service among visitors and athletes training in parks like <Link href={getParkUrl(featuredParks[0])} className="text-teal-600 underline hover:text-teal-700">{featuredParks[0].name}</Link>.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900 font-heading"><Link href={getServiceUrl(services[9])} className="hover:text-teal-600">Gentle Stretch Service for Seniors in NYC</Link></h3>
              <p className="mt-3 text-base leading-relaxed text-slate-700">
                Our <Link href={getServiceUrl(services[9])} className="text-teal-600 underline hover:text-teal-700">gentle stretch service</Link> is specifically designed for seniors and those with limited mobility. Using slow, controlled movements with extra care and attention, this program focuses on maintaining and improving the movements that matter most for daily life — reaching overhead, bending down, getting in and out of chairs, and walking confidently. Regular gentle stretch service helps prevent falls (the number one cause of injury in seniors) and supports independent living. We serve seniors throughout <Link href={getBoroughUrl(boroughs[0])} className="text-teal-600 underline hover:text-teal-700">Manhattan</Link>, <Link href={getBoroughUrl(boroughs[2])} className="text-teal-600 underline hover:text-teal-700">Queens</Link>, <Link href={getBoroughUrl(boroughs[3])} className="text-teal-600 underline hover:text-teal-700">the Bronx</Link>, and all five boroughs.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900 font-heading"><Link href={getServiceUrl(services[10])} className="hover:text-teal-600">Ballistic Stretch Service in NYC</Link></h3>
              <p className="mt-3 text-base leading-relaxed text-slate-700">
                <Link href={getServiceUrl(services[10])} className="text-teal-600 underline hover:text-teal-700">Ballistic stretch service</Link> is an advanced technique reserved for conditioned athletes and individuals with an existing flexibility base. Using controlled bouncing movements at end range of motion, ballistic stretching produces rapid flexibility improvements and prepares the body for explosive athletic movements. Our therapists only recommend this stretch service for clients who have graduated through our other stretching programs. It is especially popular with martial artists, dancers, and competitive athletes training in <Link href={getBoroughUrl(boroughs[0])} className="text-teal-600 underline hover:text-teal-700">Manhattan</Link> and <Link href={getBoroughUrl(boroughs[1])} className="text-teal-600 underline hover:text-teal-700">Brooklyn</Link>.
              </p>
            </div>
          </div>

          {/* Service CTA */}
          <div className="mt-12 rounded-xl bg-white p-8 text-center">
            <p className="text-lg font-bold text-slate-900 font-heading">Not Sure Which Stretch Service Is Right for You?</p>
            <p className="mt-2 text-base text-slate-600">Text us your goals and pain points — we will recommend the perfect stretch service for your body and lifestyle.</p>
            <a href={SITE_SMS_LINK} className="mt-4 inline-block rounded-lg bg-teal-600 px-8 py-3 text-base font-semibold text-white transition-colors hover:bg-teal-700 font-cta">Text {SITE_PHONE} — Get a Recommendation</a>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          NEW SECTION — Stretch Service by Borough
      ═══════════════════════════════════════════════════════ */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Stretch Service by Borough: All Five NYC Boroughs Covered</h2>
          <p className="mt-3 text-center text-base text-slate-600">We deliver professional mobile stretch service to every corner of New York City. Here is what stretch service looks like in each of the five boroughs — the neighborhoods we serve most, the clients we see, and the parks where we stretch.</p>

          <div className="mt-10 space-y-10">
            {/* Manhattan */}
            <div className="rounded-xl border border-slate-200 bg-white p-8">
              <h3 className="text-2xl font-bold text-slate-900 font-heading"><Link href={getBoroughUrl(boroughs[0])} className="hover:text-teal-600">Best Stretch Service in Manhattan</Link></h3>
              <div className="mt-4 space-y-4 text-base leading-relaxed text-slate-700">
                <p>
                  Manhattan is our busiest borough for stretch service bookings, and for good reason. With more than 1.6 million residents packed into 23 square miles — plus over four million daily commuters flowing in from the outer boroughs and New Jersey — Manhattan is the epicenter of desk-related pain, commuter tension, and stress-induced tightness. The best stretch service in Manhattan reaches executives in <Link href={getNeighborhoodUrl(manhattanHoods[4])} className="text-teal-600 underline hover:text-teal-700">{manhattanHoods[4].name}</Link> high-rises, creative professionals in their <Link href={getNeighborhoodUrl(manhattanHoods[6])} className="text-teal-600 underline hover:text-teal-700">{manhattanHoods[6].name}</Link> lofts, and tourists recovering at Midtown hotels. Our stretch service Upper East Side clients tend to be wellness-focused professionals and seniors who value regular maintenance sessions, while our <Link href={getNeighborhoodUrl(manhattanHoods[1])} className="text-teal-600 underline hover:text-teal-700">{manhattanHoods[1].name}</Link> clients skew toward young professionals and athletes who want peak performance.
                </p>
                <p>
                  The most popular Manhattan neighborhoods for mobile stretch service include <Link href={getNeighborhoodUrl(manhattanHoods[0])} className="text-teal-600 underline hover:text-teal-700">{manhattanHoods[0].name}</Link>, <Link href={getNeighborhoodUrl(manhattanHoods[1])} className="text-teal-600 underline hover:text-teal-700">{manhattanHoods[1].name}</Link>, <Link href={getNeighborhoodUrl(manhattanHoods[2])} className="text-teal-600 underline hover:text-teal-700">{manhattanHoods[2].name}</Link>, <Link href={getNeighborhoodUrl(manhattanHoods[3])} className="text-teal-600 underline hover:text-teal-700">{manhattanHoods[3].name}</Link>, <Link href={getNeighborhoodUrl(manhattanHoods[5])} className="text-teal-600 underline hover:text-teal-700">{manhattanHoods[5].name}</Link>, <Link href={getNeighborhoodUrl(manhattanHoods[6])} className="text-teal-600 underline hover:text-teal-700">{manhattanHoods[6].name}</Link>, <Link href={getNeighborhoodUrl(manhattanHoods[7])} className="text-teal-600 underline hover:text-teal-700">{manhattanHoods[7].name}</Link>, and <Link href={getNeighborhoodUrl(manhattanHoods[8])} className="text-teal-600 underline hover:text-teal-700">{manhattanHoods[8].name}</Link>. Our corporate stretch service New York program is especially popular among Manhattan offices, where we provide on-site chair stretches and group sessions for entire teams. For outdoor sessions, we serve clients at stretch service Central Park locations, {manhattanParks.length > 1 && <><Link href={getParkUrl(manhattanParks[1])} className="text-teal-600 underline hover:text-teal-700">{manhattanParks[1].name}</Link>, and </>}{manhattanParks.length > 2 && <><Link href={getParkUrl(manhattanParks[2])} className="text-teal-600 underline hover:text-teal-700">{manhattanParks[2].name}</Link>.</>}
                </p>
              </div>
            </div>

            {/* Brooklyn */}
            <div className="rounded-xl border border-slate-200 bg-white p-8">
              <h3 className="text-2xl font-bold text-slate-900 font-heading"><Link href={getBoroughUrl(boroughs[1])} className="hover:text-teal-600">Best Stretch Service in Brooklyn</Link></h3>
              <div className="mt-4 space-y-4 text-base leading-relaxed text-slate-700">
                <p>
                  Brooklyn is our second-busiest borough and home to some of our most dedicated long-term stretch service clients. The borough&apos;s incredible diversity means we serve everyone from tech startup founders in <Link href={getNeighborhoodUrl(brooklynHoods[2])} className="text-teal-600 underline hover:text-teal-700">{brooklynHoods[2].name}</Link> to young families in <Link href={getNeighborhoodUrl(brooklynHoods[3])} className="text-teal-600 underline hover:text-teal-700">{brooklynHoods[3].name}</Link> to marathon runners training along the Prospect Park loop. Stretch service Williamsburg Brooklyn is booming as the neighborhood&apos;s health-conscious residents embrace professional stretching as part of their wellness routines. Our <Link href={getServiceUrl(services[1])} className="text-teal-600 underline hover:text-teal-700">PNF stretch service</Link> is the most requested technique among Brooklyn athletes, while <Link href={getServiceUrl(services[4])} className="text-teal-600 underline hover:text-teal-700">passive stretch service</Link> dominates among the borough&apos;s remote workers who spend all day on laptops.
                </p>
                <p>
                  Popular Brooklyn neighborhoods for stretch service include <Link href={getNeighborhoodUrl(brooklynHoods[0])} className="text-teal-600 underline hover:text-teal-700">{brooklynHoods[0].name}</Link>, <Link href={getNeighborhoodUrl(brooklynHoods[1])} className="text-teal-600 underline hover:text-teal-700">{brooklynHoods[1].name}</Link>, <Link href={getNeighborhoodUrl(brooklynHoods[4])} className="text-teal-600 underline hover:text-teal-700">{brooklynHoods[4].name}</Link>, <Link href={getNeighborhoodUrl(brooklynHoods[5])} className="text-teal-600 underline hover:text-teal-700">{brooklynHoods[5].name}</Link>, <Link href={getNeighborhoodUrl(brooklynHoods[6])} className="text-teal-600 underline hover:text-teal-700">{brooklynHoods[6].name}</Link>, <Link href={getNeighborhoodUrl(brooklynHoods[7])} className="text-teal-600 underline hover:text-teal-700">{brooklynHoods[7].name}</Link>, <Link href={getNeighborhoodUrl(brooklynHoods[8])} className="text-teal-600 underline hover:text-teal-700">{brooklynHoods[8].name}</Link>, and <Link href={getNeighborhoodUrl(brooklynHoods[9])} className="text-teal-600 underline hover:text-teal-700">{brooklynHoods[9].name}</Link>. For outdoor stretch service sessions, Brooklyn clients love {brooklynParks.slice(0, 3).map((p, i) => (<span key={p.slug}><Link href={getParkUrl(p)} className="text-teal-600 underline hover:text-teal-700">{p.name}</Link>{i < 2 ? ", " : ". "}</span>))}
                </p>
              </div>
            </div>

            {/* Queens */}
            <div className="rounded-xl border border-slate-200 bg-white p-8">
              <h3 className="text-2xl font-bold text-slate-900 font-heading"><Link href={getBoroughUrl(boroughs[2])} className="hover:text-teal-600">Best Stretch Service in Queens</Link></h3>
              <div className="mt-4 space-y-4 text-base leading-relaxed text-slate-700">
                <p>
                  Queens is the most ethnically diverse urban area in the world, and our stretch service reflects that incredible diversity. We serve first-generation immigrants dealing with physically demanding labor jobs, corporate professionals commuting from <Link href={getNeighborhoodUrl(queensHoods[0])} className="text-teal-600 underline hover:text-teal-700">{queensHoods[0].name}</Link> to Manhattan, active seniors maintaining mobility in <Link href={getNeighborhoodUrl(queensHoods[1])} className="text-teal-600 underline hover:text-teal-700">{queensHoods[1].name}</Link>, and athletes training at parks throughout the borough. Our stretch service for seniors NYC program sees heavy demand in Queens, where a large senior population values in-home care. Queens commuters who ride the 7 train or the E train daily are among our most loyal weekly stretch service clients — the long commute takes a serious toll on their bodies.
                </p>
                <p>
                  Top Queens neighborhoods for mobile stretch service include <Link href={getNeighborhoodUrl(queensHoods[0])} className="text-teal-600 underline hover:text-teal-700">{queensHoods[0].name}</Link>, <Link href={getNeighborhoodUrl(queensHoods[1])} className="text-teal-600 underline hover:text-teal-700">{queensHoods[1].name}</Link>, <Link href={getNeighborhoodUrl(queensHoods[2])} className="text-teal-600 underline hover:text-teal-700">{queensHoods[2].name}</Link>, <Link href={getNeighborhoodUrl(queensHoods[3])} className="text-teal-600 underline hover:text-teal-700">{queensHoods[3].name}</Link>, <Link href={getNeighborhoodUrl(queensHoods[4])} className="text-teal-600 underline hover:text-teal-700">{queensHoods[4].name}</Link>, <Link href={getNeighborhoodUrl(queensHoods[5])} className="text-teal-600 underline hover:text-teal-700">{queensHoods[5].name}</Link>, <Link href={getNeighborhoodUrl(queensHoods[6])} className="text-teal-600 underline hover:text-teal-700">{queensHoods[6].name}</Link>, and <Link href={getNeighborhoodUrl(queensHoods[7])} className="text-teal-600 underline hover:text-teal-700">{queensHoods[7].name}</Link>. Queens park sessions are popular at {queensParks.slice(0, 3).map((p, i) => (<span key={p.slug}><Link href={getParkUrl(p)} className="text-teal-600 underline hover:text-teal-700">{p.name}</Link>{i < 2 ? ", " : ". "}</span>))}
                </p>
              </div>
            </div>

            {/* Bronx */}
            <div className="rounded-xl border border-slate-200 bg-white p-8">
              <h3 className="text-2xl font-bold text-slate-900 font-heading"><Link href={getBoroughUrl(boroughs[3])} className="hover:text-teal-600">Best Stretch Service in the Bronx</Link></h3>
              <div className="mt-4 space-y-4 text-base leading-relaxed text-slate-700">
                <p>
                  The Bronx is a borough of resilience, and our stretch service for back pain NYC program has found a particularly grateful audience here. Many Bronx residents work physically demanding jobs — construction, healthcare, food service, delivery — that create chronic pain patterns requiring professional intervention. Our <Link href={getServiceUrl(services[6])} className="text-teal-600 underline hover:text-teal-700">myofascial release</Link> and <Link href={getServiceUrl(services[8])} className="text-teal-600 underline hover:text-teal-700">recovery stretch service</Link> are the most popular techniques in the Bronx, where clients need deep relief from the physical toll of hard work. Seniors in Bronx communities also represent a significant portion of our client base, with our <Link href={getServiceUrl(services[9])} className="text-teal-600 underline hover:text-teal-700">gentle stretch service</Link> helping them maintain independence and quality of life.
                </p>
                <p>
                  In-demand Bronx neighborhoods for stretch service include <Link href={getNeighborhoodUrl(bronxHoods[0])} className="text-teal-600 underline hover:text-teal-700">{bronxHoods[0].name}</Link>, <Link href={getNeighborhoodUrl(bronxHoods[1])} className="text-teal-600 underline hover:text-teal-700">{bronxHoods[1].name}</Link>, <Link href={getNeighborhoodUrl(bronxHoods[2])} className="text-teal-600 underline hover:text-teal-700">{bronxHoods[2].name}</Link>, <Link href={getNeighborhoodUrl(bronxHoods[3])} className="text-teal-600 underline hover:text-teal-700">{bronxHoods[3].name}</Link>, <Link href={getNeighborhoodUrl(bronxHoods[4])} className="text-teal-600 underline hover:text-teal-700">{bronxHoods[4].name}</Link>, <Link href={getNeighborhoodUrl(bronxHoods[5])} className="text-teal-600 underline hover:text-teal-700">{bronxHoods[5].name}</Link>, <Link href={getNeighborhoodUrl(bronxHoods[6])} className="text-teal-600 underline hover:text-teal-700">{bronxHoods[6].name}</Link>, and <Link href={getNeighborhoodUrl(bronxHoods[7])} className="text-teal-600 underline hover:text-teal-700">{bronxHoods[7].name}</Link>. For outdoor sessions, Bronx parks offer beautiful settings including {bronxParks.slice(0, 3).map((p, i) => (<span key={p.slug}><Link href={getParkUrl(p)} className="text-teal-600 underline hover:text-teal-700">{p.name}</Link>{i < 2 ? ", " : ". "}</span>))}
                </p>
              </div>
            </div>

            {/* Staten Island */}
            <div className="rounded-xl border border-slate-200 bg-white p-8">
              <h3 className="text-2xl font-bold text-slate-900 font-heading"><Link href={getBoroughUrl(boroughs[4])} className="hover:text-teal-600">Best Stretch Service in Staten Island</Link></h3>
              <div className="mt-4 space-y-4 text-base leading-relaxed text-slate-700">
                <p>
                  Staten Island is NYC&apos;s most suburban borough, and our mobile stretch service is especially valuable here because wellness studios and professional stretching options are far fewer than in Manhattan or Brooklyn. Staten Island residents who commute via the ferry and then subway or bus endure some of the longest commutes in the city, making them prime candidates for our post-commute <Link href={getServiceUrl(services[0])} className="text-teal-600 underline hover:text-teal-700">assisted stretch service</Link>. The borough also has a strong athletic community with runners, cyclists, and recreational sports leagues that benefit from our <Link href={getServiceUrl(services[3])} className="text-teal-600 underline hover:text-teal-700">dynamic stretch service</Link> and post-workout stretch service NYC programs.
                </p>
                <p>
                  Growing Staten Island neighborhoods for stretch service include <Link href={getNeighborhoodUrl(siHoods[0])} className="text-teal-600 underline hover:text-teal-700">{siHoods[0].name}</Link>, <Link href={getNeighborhoodUrl(siHoods[1])} className="text-teal-600 underline hover:text-teal-700">{siHoods[1].name}</Link>, <Link href={getNeighborhoodUrl(siHoods[2])} className="text-teal-600 underline hover:text-teal-700">{siHoods[2].name}</Link>, <Link href={getNeighborhoodUrl(siHoods[3])} className="text-teal-600 underline hover:text-teal-700">{siHoods[3].name}</Link>, <Link href={getNeighborhoodUrl(siHoods[4])} className="text-teal-600 underline hover:text-teal-700">{siHoods[4].name}</Link>, <Link href={getNeighborhoodUrl(siHoods[5])} className="text-teal-600 underline hover:text-teal-700">{siHoods[5].name}</Link>, <Link href={getNeighborhoodUrl(siHoods[6])} className="text-teal-600 underline hover:text-teal-700">{siHoods[6].name}</Link>, and <Link href={getNeighborhoodUrl(siHoods[7])} className="text-teal-600 underline hover:text-teal-700">{siHoods[7].name}</Link>. Beautiful Staten Island parks for outdoor stretch service sessions include {siParks.slice(0, 3).map((p, i) => (<span key={p.slug}><Link href={getParkUrl(p)} className="text-teal-600 underline hover:text-teal-700">{p.name}</Link>{i < 2 ? ", " : ". "}</span>))}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 5 — TIPS
      ═══════════════════════════════════════════════════════ */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Stretching Tips for NYC Life</h2>
          <p className="mt-3 text-center text-base text-slate-600">Expert tips from our stretch service therapists to help you feel better every day in New York City.</p>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-6 transition-all hover:border-teal-400 hover:shadow-md">
              <h3 className="text-lg font-bold text-slate-900 font-heading">Subway Commuter Stretch Tips</h3>
              <p className="mt-3 text-sm text-slate-600">
                The average NYC commuter spends 80+ minutes per day on the subway. Standing on a crowded train gripping a pole overhead strains your shoulders, neck, and lower back. While waiting on the platform, do gentle neck rolls — tilt your head slowly left, forward, right, and back in a circle. On the train, engage your core to maintain balance instead of relying on upper body grip strength. After your commute, a professional <Link href={getServiceUrl(services[0])} className="text-teal-600 underline hover:text-teal-700">assisted stretch service</Link> will undo all the damage. Our therapists serve commuters in <Link href={getBoroughUrl(boroughs[2])} className="text-teal-600 underline hover:text-teal-700">Queens</Link>, <Link href={getBoroughUrl(boroughs[1])} className="text-teal-600 underline hover:text-teal-700">Brooklyn</Link>, and <Link href={getBoroughUrl(boroughs[3])} className="text-teal-600 underline hover:text-teal-700">the Bronx</Link> who need post-commute relief.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6 transition-all hover:border-teal-400 hover:shadow-md">
              <h3 className="text-lg font-bold text-slate-900 font-heading">Desk Worker Stretch Tips</h3>
              <p className="mt-3 text-sm text-slate-600">
                If you work at a desk in <Link href={getBoroughUrl(boroughs[0])} className="text-teal-600 underline hover:text-teal-700">Manhattan</Link>, set a timer to stand every 30 minutes. Do doorframe chest stretches — place your forearms on either side of a doorway and lean forward to open your chest and counteract rounded shoulders. Squeeze your shoulder blades together 10 times every hour. For your hip flexors, try a standing lunge stretch at your desk. These quick fixes help temporarily, but for lasting relief from desk-related pain, our weekly <Link href={getServiceUrl(services[5])} className="text-teal-600 underline hover:text-teal-700">static stretch service</Link> and <Link href={getServiceUrl(services[6])} className="text-teal-600 underline hover:text-teal-700">myofascial release</Link> sessions are the real solution.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6 transition-all hover:border-teal-400 hover:shadow-md">
              <h3 className="text-lg font-bold text-slate-900 font-heading">Post-Workout Recovery Tips</h3>
              <p className="mt-3 text-sm text-slate-600">
                After your gym session or run in <Link href={getParkUrl(featuredParks[0])} className="text-teal-600 underline hover:text-teal-700">{featuredParks[0].name}</Link>, spend at least 10 minutes on gentle static stretches — hold each position for 30 seconds and breathe deeply. Focus on the muscle groups you just trained. Foam rolling major muscles for 60 seconds each can reduce soreness by up to 30%. But for truly accelerated recovery, nothing compares to a professional <Link href={getServiceUrl(services[8])} className="text-teal-600 underline hover:text-teal-700">recovery stretch service</Link> session. Our therapists use techniques that flush metabolic waste and reduce inflammation 40-60% faster than self-stretching alone.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6 transition-all hover:border-teal-400 hover:shadow-md">
              <h3 className="text-lg font-bold text-slate-900 font-heading">Better Sleep Stretch Tips</h3>
              <p className="mt-3 text-sm text-slate-600">
                NYC stress and small apartments make quality sleep a challenge. One hour before bed, do gentle stretches for 10-15 minutes — hamstring stretches lying on your back, figure-four hip stretches, and gentle spinal twists. Combine stretching with deep breathing: inhale for 4 counts, hold for 4, exhale for 8. Avoid screens during your stretch routine. For the deepest pre-sleep relaxation, our evening <Link href={getServiceUrl(services[4])} className="text-teal-600 underline hover:text-teal-700">passive stretch service</Link> sessions leave clients in a state of complete calm. Many clients in <Link href={getNeighborhoodUrl(manhattanHoods[0])} className="text-teal-600 underline hover:text-teal-700">{manhattanHoods[0].name}</Link> and <Link href={getNeighborhoodUrl(brooklynHoods[0])} className="text-teal-600 underline hover:text-teal-700">{brooklynHoods[0].name}</Link> book 8PM sessions specifically for better sleep.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6 transition-all hover:border-teal-400 hover:shadow-md">
              <h3 className="text-lg font-bold text-slate-900 font-heading">Tourist Recovery Tips</h3>
              <p className="mt-3 text-sm text-slate-600">
                If you are visiting NYC and have walked 20,000+ steps today, elevate your legs against a wall for 10 minutes when you get back to your hotel. Roll your feet on a water bottle to relieve plantar fascia tightness. Gentle calf stretches against a wall can prevent the intense calf soreness that ruins the next morning. For complete tourist recovery, book our <Link href="/hotel-stretching" className="text-teal-600 underline hover:text-teal-700">hotel stretch service</Link> — we come to your room with all equipment and have you feeling refreshed in 60 minutes. We also meet tourists at <Link href={getParkUrl(featuredParks[0])} className="text-teal-600 underline hover:text-teal-700">{featuredParks[0].name}</Link> and other iconic locations for outdoor stretch service sessions.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6 transition-all hover:border-teal-400 hover:shadow-md">
              <h3 className="text-lg font-bold text-slate-900 font-heading">Senior Mobility Tips</h3>
              <p className="mt-3 text-sm text-slate-600">
                For seniors living in NYC, daily movement is essential for maintaining independence. Start each morning with 5 minutes of gentle movement — ankle circles, knee lifts while holding a chair, and gentle arm reaches overhead. Practice balance by standing on one foot for 10 seconds (hold a counter for safety). These exercises help but cannot replace the targeted, therapist-guided mobility work of our <Link href={getServiceUrl(services[9])} className="text-teal-600 underline hover:text-teal-700">gentle stretch service</Link>. Our senior-focused stretch service sessions throughout <Link href={getBoroughUrl(boroughs[0])} className="text-teal-600 underline hover:text-teal-700">Manhattan</Link>, <Link href={getBoroughUrl(boroughs[2])} className="text-teal-600 underline hover:text-teal-700">Queens</Link>, and <Link href={getBoroughUrl(boroughs[3])} className="text-teal-600 underline hover:text-teal-700">the Bronx</Link> are specifically designed for active aging.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6 transition-all hover:border-teal-400 hover:shadow-md">
              <h3 className="text-lg font-bold text-slate-900 font-heading">Pre-Run Warm-Up Tips</h3>
              <p className="mt-3 text-sm text-slate-600">
                Before your run in <Link href={getParkUrl(featuredParks[0])} className="text-teal-600 underline hover:text-teal-700">{featuredParks[0].name}</Link> or along the Hudson River, never start cold. Walk briskly for 5 minutes first, then do <Link href={getServiceUrl(services[3])} className="text-teal-600 underline hover:text-teal-700">dynamic stretches</Link> — leg swings forward and back, lateral lunges, high knees, and butt kicks. Dynamic movement warms muscles and lubricates joints far better than static holding. For optimal race-day preparation or serious training cycles, our professional <Link href={getServiceUrl(services[3])} className="text-teal-600 underline hover:text-teal-700">dynamic stretch service</Link> session before your event can improve performance by 5-10% according to sports science research. Many NYC marathon runners book pre-race stretch service sessions with us.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6 transition-all hover:border-teal-400 hover:shadow-md">
              <h3 className="text-lg font-bold text-slate-900 font-heading">Chronic Pain Management Tips</h3>
              <p className="mt-3 text-sm text-slate-600">
                Living with chronic pain in NYC is exhausting — it makes commuting, working, and even sleeping miserable. For lower back pain, try the cat-cow stretch on all fours: arch your back up like a cat, then drop your belly down. For sciatica, a figure-four stretch lying on your back can provide temporary relief. For neck tension, gentle ear-to-shoulder tilts held for 20 seconds each side help. But for lasting chronic pain management, our combination of <Link href={getServiceUrl(services[1])} className="text-teal-600 underline hover:text-teal-700">PNF stretch service</Link> and <Link href={getServiceUrl(services[6])} className="text-teal-600 underline hover:text-teal-700">myofascial release</Link> addresses root causes that self-stretching simply cannot reach. Many chronic pain clients in <Link href={getBoroughUrl(boroughs[0])} className="text-teal-600 underline hover:text-teal-700">Manhattan</Link> and <Link href={getBoroughUrl(boroughs[1])} className="text-teal-600 underline hover:text-teal-700">Brooklyn</Link> see major improvement with weekly sessions.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6 transition-all hover:border-teal-400 hover:shadow-md">
              <h3 className="text-lg font-bold text-slate-900 font-heading">Pregnancy & Prenatal Stretch Tips</h3>
              <p className="mt-3 text-sm text-slate-600">
                Pregnancy puts enormous strain on your body — your center of gravity shifts, your lower back bears extra load, and hormonal changes loosen ligaments. Gentle stretches like the cat-cow, side-lying hip stretches, and seated piriformis stretches can provide significant relief. Avoid lying flat on your back after the first trimester. Always work with a professional who understands prenatal modifications. Our <Link href={getServiceUrl(services[4])} className="text-teal-600 underline hover:text-teal-700">passive stretch service</Link> therapists are trained in prenatal stretching protocols safe for all trimesters. Many expecting mothers across <Link href={getBoroughUrl(boroughs[0])} className="text-teal-600 underline hover:text-teal-700">Manhattan</Link> and <Link href={getBoroughUrl(boroughs[1])} className="text-teal-600 underline hover:text-teal-700">Brooklyn</Link> use our in-home stretch service throughout their pregnancy.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6 transition-all hover:border-teal-400 hover:shadow-md">
              <h3 className="text-lg font-bold text-slate-900 font-heading">Weekend Warrior Stretch Tips</h3>
              <p className="mt-3 text-sm text-slate-600">
                You sit at a desk all week, then go all-out on Saturday — hiking, playing pickup basketball, running a 10K, or hitting an intense fitness class. This pattern is a recipe for injury because your muscles are tight from five days of sitting and suddenly asked to perform at maximum capacity. Before your weekend activity, do 10 minutes of <Link href={getServiceUrl(services[3])} className="text-teal-600 underline hover:text-teal-700">dynamic stretching</Link>. After, spend 15 minutes on gentle static holds. Better yet, book a professional <Link href={getServiceUrl(services[8])} className="text-teal-600 underline hover:text-teal-700">recovery stretch service</Link> session for Sunday morning — our therapists come to your apartment and undo the damage before Monday hits. Popular with weekend warriors in <Link href={getNeighborhoodUrl(brooklynHoods[4])} className="text-teal-600 underline hover:text-teal-700">{brooklynHoods[4].name}</Link> and <Link href={getNeighborhoodUrl(manhattanHoods[3])} className="text-teal-600 underline hover:text-teal-700">{manhattanHoods[3].name}</Link>.
              </p>
            </div>
          </div>
          <div className="mt-10 text-center">
            <p className="text-base text-slate-600">Want the complete guide? Our Stretching 101 covers daily routines by age group, sport-specific protocols, and professional techniques.</p>
            <Link href="/stretching-101" className="mt-4 inline-block rounded-lg bg-teal-600 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:bg-teal-700 font-cta">
              Read the Full Stretching 101 Guide
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          NEW SECTION — Who Needs a Professional Stretch Service in NYC?
      ═══════════════════════════════════════════════════════ */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Who Needs a Professional Stretch Service in NYC?</h2>
          <p className="mt-3 text-center text-base text-slate-600">New York City puts unique physical demands on every type of person. Here is a deep look at who benefits most from professional stretch service — and why the neighborhoods they live and work in matter.</p>

          <div className="mt-10 space-y-8">
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-bold text-slate-900 font-heading">NYC Desk Workers and Corporate Professionals</h3>
              <p className="mt-3 text-base leading-relaxed text-slate-700">
                The average Manhattan office worker sits for 10-12 hours per day when you combine desk time with commuting and meals. This prolonged sitting shortens your hip flexors, rounds your shoulders, weakens your glutes, and compresses your lumbar spine — creating a cascade of chronic pain issues that worsen with every passing year. Our <Link href={getServiceUrl(services[0])} className="text-teal-600 underline hover:text-teal-700">assisted stretch service</Link> specifically targets the muscle groups that desk work destroys, systematically lengthening your hip flexors, opening your chest, decompressing your spine, and restoring the natural curves that sitting eliminates. Desk workers in <Link href={getNeighborhoodUrl(manhattanHoods[4])} className="text-teal-600 underline hover:text-teal-700">{manhattanHoods[4].name}</Link> offices, <Link href={getNeighborhoodUrl(manhattanHoods[6])} className="text-teal-600 underline hover:text-teal-700">{manhattanHoods[6].name}</Link> tech companies, and <Link href={getNeighborhoodUrl(brooklynHoods[2])} className="text-teal-600 underline hover:text-teal-700">{brooklynHoods[2].name}</Link> coworking spaces are among our most loyal weekly stretch service clients.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-bold text-slate-900 font-heading">Athletes and Fitness Enthusiasts</h3>
              <p className="mt-3 text-base leading-relaxed text-slate-700">
                Whether you are a marathon runner logging miles through <Link href={getParkUrl(featuredParks[0])} className="text-teal-600 underline hover:text-teal-700">{featuredParks[0].name}</Link>, a CrossFit devotee in <Link href={getNeighborhoodUrl(brooklynHoods[0])} className="text-teal-600 underline hover:text-teal-700">{brooklynHoods[0].name}</Link>, or a weekend warrior playing basketball in <Link href={getBoroughUrl(boroughs[2])} className="text-teal-600 underline hover:text-teal-700">Queens</Link>, your muscles accumulate micro-damage with every workout that needs targeted recovery. Our stretch service for athletes NYC program combines <Link href={getServiceUrl(services[1])} className="text-teal-600 underline hover:text-teal-700">PNF stretching</Link> for maximum flexibility gains with <Link href={getServiceUrl(services[3])} className="text-teal-600 underline hover:text-teal-700">dynamic stretch service</Link> for pre-event preparation and <Link href={getServiceUrl(services[8])} className="text-teal-600 underline hover:text-teal-700">recovery stretching</Link> for post-workout restoration. Professional post-workout stretch service NYC athletes receive cuts recovery time in half and reduces injury risk by up to 50%. Athletes training in <Link href={getNeighborhoodUrl(manhattanHoods[3])} className="text-teal-600 underline hover:text-teal-700">{manhattanHoods[3].name}</Link> and <Link href={getNeighborhoodUrl(brooklynHoods[4])} className="text-teal-600 underline hover:text-teal-700">{brooklynHoods[4].name}</Link> make up a significant portion of our weekly client base.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-bold text-slate-900 font-heading">Seniors and Older Adults</h3>
              <p className="mt-3 text-base leading-relaxed text-slate-700">
                Aging in New York City presents unique challenges — steep subway stairs, uneven sidewalks, crowded streets where balance matters, and walkup apartments with no elevator. Our stretch service for seniors NYC program uses <Link href={getServiceUrl(services[9])} className="text-teal-600 underline hover:text-teal-700">gentle stretch techniques</Link> specifically calibrated for older bodies, focusing on the movements that matter most for independent city living. Chair-assisted stretches, arthritis-friendly protocols, and fall-prevention mobility work help seniors maintain the strength and flexibility they need to navigate NYC safely. We see particularly strong demand for senior stretch service in <Link href={getBoroughUrl(boroughs[2])} className="text-teal-600 underline hover:text-teal-700">Queens</Link> neighborhoods like <Link href={getNeighborhoodUrl(queensHoods[1])} className="text-teal-600 underline hover:text-teal-700">{queensHoods[1].name}</Link>, <Link href={getBoroughUrl(boroughs[3])} className="text-teal-600 underline hover:text-teal-700">Bronx</Link> communities like <Link href={getNeighborhoodUrl(bronxHoods[0])} className="text-teal-600 underline hover:text-teal-700">{bronxHoods[0].name}</Link>, and Manhattan&apos;s <Link href={getNeighborhoodUrl(manhattanHoods[0])} className="text-teal-600 underline hover:text-teal-700">{manhattanHoods[0].name}</Link>.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-bold text-slate-900 font-heading">Tourists and Hotel Guests</h3>
              <p className="mt-3 text-base leading-relaxed text-slate-700">
                Every year, over 60 million tourists visit New York City, and the vast majority push their bodies far beyond normal limits. Walking 20,000 to 30,000 steps per day across concrete sidewalks, standing in Times Square, climbing the Brooklyn Bridge, and exploring museums for hours creates intense muscle fatigue that ruins trips. Our tourist stretch service NYC hotel program is specifically designed for this scenario. We deliver same day stretch service NYC visitors need — often arriving within two hours of booking. Our therapists come to any hotel room in <Link href={getBoroughUrl(boroughs[0])} className="text-teal-600 underline hover:text-teal-700">Manhattan</Link>, <Link href={getBoroughUrl(boroughs[1])} className="text-teal-600 underline hover:text-teal-700">Brooklyn</Link>, or anywhere in the city with all equipment. We also meet tourists at hotel room stretch service NYC locations near <Link href={getParkUrl(featuredParks[0])} className="text-teal-600 underline hover:text-teal-700">{featuredParks[0].name}</Link> and <Link href={getParkUrl(featuredParks[1])} className="text-teal-600 underline hover:text-teal-700">{featuredParks[1].name}</Link> for unforgettable outdoor recovery sessions.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-bold text-slate-900 font-heading">Chronic Pain Sufferers</h3>
              <p className="mt-3 text-base leading-relaxed text-slate-700">
                Millions of New Yorkers live with chronic pain — lower back pain from years of sitting, sciatica from compressed nerves, neck tension from screen use, and fibromyalgia symptoms exacerbated by the stress of city living. Our stretch service for back pain NYC program combines targeted <Link href={getServiceUrl(services[1])} className="text-teal-600 underline hover:text-teal-700">PNF stretching</Link> to address muscular restrictions with <Link href={getServiceUrl(services[6])} className="text-teal-600 underline hover:text-teal-700">myofascial release</Link> to break up fascial adhesions that trap nerves and restrict blood flow. Unlike pain medication that masks symptoms, professional stretch service addresses the mechanical root causes of chronic pain. Clients throughout <Link href={getNeighborhoodUrl(manhattanHoods[7])} className="text-teal-600 underline hover:text-teal-700">{manhattanHoods[7].name}</Link>, <Link href={getNeighborhoodUrl(brooklynHoods[3])} className="text-teal-600 underline hover:text-teal-700">{brooklynHoods[3].name}</Link>, and <Link href={getNeighborhoodUrl(queensHoods[0])} className="text-teal-600 underline hover:text-teal-700">{queensHoods[0].name}</Link> report life-changing improvement with consistent weekly sessions.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-bold text-slate-900 font-heading">NYC Commuters</h3>
              <p className="mt-3 text-base leading-relaxed text-slate-700">
                The average New York City commute is 43 minutes each way — among the longest in the nation. Whether you ride the subway from <Link href={getNeighborhoodUrl(queensHoods[0])} className="text-teal-600 underline hover:text-teal-700">{queensHoods[0].name}</Link>, take the bus from <Link href={getNeighborhoodUrl(bronxHoods[0])} className="text-teal-600 underline hover:text-teal-700">{bronxHoods[0].name}</Link>, or ride the ferry from <Link href={getNeighborhoodUrl(siHoods[0])} className="text-teal-600 underline hover:text-teal-700">{siHoods[0].name}</Link>, the cumulative toll of daily commuting creates chronic muscle tension patterns that compound over months and years. Gripping subway poles strains shoulders and forearms, bracing against sudden stops tightens your core and lower back, and sitting in cramped seats shortens your hip flexors. Our <Link href={getServiceUrl(services[4])} className="text-teal-600 underline hover:text-teal-700">passive stretch service</Link> is the perfect post-commute reset — your mobile stretch therapist near me NYC comes to your home and systematically releases every tension pattern your commute created that day.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-bold text-slate-900 font-heading">Post-Surgery Recovery Patients</h3>
              <p className="mt-3 text-base leading-relaxed text-slate-700">
                Recovering from surgery in a small NYC apartment without easy access to rehabilitation facilities makes professional in-home stretch service invaluable. Our therapists work within your physician&apos;s guidelines to provide gentle, progressive stretching that prevents scar tissue adhesions, restores range of motion, and supports your recovery timeline. We coordinate with physical therapists and surgeons to ensure continuity of care. Post-surgery clients in <Link href={getNeighborhoodUrl(manhattanHoods[0])} className="text-teal-600 underline hover:text-teal-700">{manhattanHoods[0].name}</Link>, <Link href={getNeighborhoodUrl(brooklynHoods[3])} className="text-teal-600 underline hover:text-teal-700">{brooklynHoods[3].name}</Link>, and <Link href={getNeighborhoodUrl(queensHoods[2])} className="text-teal-600 underline hover:text-teal-700">{queensHoods[2].name}</Link> appreciate that our in-home stretch service New York model means they never have to leave their apartment during recovery.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-bold text-slate-900 font-heading">Corporate Teams and Office Workers</h3>
              <p className="mt-3 text-base leading-relaxed text-slate-700">
                Forward-thinking NYC companies are investing in corporate stretch service New York programs as part of their employee wellness strategy. On-site stretch service sessions during the workday reduce musculoskeletal injury claims by up to 50%, decrease absenteeism, boost afternoon productivity, and improve employee satisfaction scores. Our <Link href="/corporate-wellness" className="text-teal-600 underline hover:text-teal-700">corporate stretch service</Link> program includes individual 15-minute chair stretches, group mobility workshops, and recurring weekly sessions that keep entire teams performing at their best. We serve corporate clients in <Link href={getNeighborhoodUrl(manhattanHoods[4])} className="text-teal-600 underline hover:text-teal-700">{manhattanHoods[4].name}</Link> towers, <Link href={getNeighborhoodUrl(manhattanHoods[6])} className="text-teal-600 underline hover:text-teal-700">{manhattanHoods[6].name}</Link> tech offices, <Link href={getNeighborhoodUrl(brooklynHoods[2])} className="text-teal-600 underline hover:text-teal-700">{brooklynHoods[2].name}</Link> coworking hubs, and offices throughout all five boroughs.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 6 — FAQ
      ═══════════════════════════════════════════════════════ */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Frequently Asked Questions About NYC Stretch Service</h2>
          <p className="mt-3 text-center text-base text-slate-600">Everything you need to know about booking a professional stretch service in New York City.</p>
          <div className="mt-8 space-y-3">
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
          NEW SECTION — Stretch Service vs Other Wellness Treatments
      ═══════════════════════════════════════════════════════ */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Stretch Service vs Other Wellness Treatments: A Comprehensive Comparison</h2>
          <div className="mt-8 space-y-5 text-base leading-relaxed text-slate-700">
            <p>
              New York City offers more wellness options per square mile than any city on earth — from massage studios on every block to chiropractic offices, yoga studios, physical therapy clinics, and personal trainers at every gym. With so many choices, many New Yorkers wonder where professional stretch service fits into the landscape and whether it can replace or complement the other treatments they already use. The answer depends on your goals, but for most people, a professional stretching service NYC therapists deliver fills a critical gap that no other modality addresses as directly or effectively.
            </p>
            <p>
              <strong>Stretch Service vs Massage Therapy:</strong> Massage therapy and stretch service are the two modalities most commonly confused with each other, but they work through fundamentally different mechanisms. Massage applies pressure to muscle tissue to increase circulation, release trigger points, and promote relaxation. Stretch service actively lengthens muscles and mobilizes joints to improve range of motion and flexibility. The key distinction is that massage provides temporary relief from muscle tension, while professional stretch service creates lasting structural changes in muscle length. Many of our clients in <Link href={getNeighborhoodUrl(manhattanHoods[0])} className="text-teal-600 underline hover:text-teal-700">{manhattanHoods[0].name}</Link> and <Link href={getNeighborhoodUrl(brooklynHoods[0])} className="text-teal-600 underline hover:text-teal-700">{brooklynHoods[0].name}</Link> use both — massage for relaxation, and our <Link href={getServiceUrl(services[0])} className="text-teal-600 underline hover:text-teal-700">assisted stretch service</Link> for measurable flexibility improvement.
            </p>
            <p>
              <strong>Stretch Service vs Chiropractic Care:</strong> Chiropractic adjustments realign joints — particularly in the spine — through targeted manipulations. Professional stretch service addresses the muscles and fascia that pull those joints out of alignment in the first place. This is a critical distinction: if tight muscles are causing your misalignment, chiropractic adjustments alone will provide only temporary relief because the muscles will pull everything back out of position. By combining regular stretch service with chiropractic care, you address both the symptom (misalignment) and the cause (muscular tightness). Many chiropractors across <Link href={getBoroughUrl(boroughs[0])} className="text-teal-600 underline hover:text-teal-700">Manhattan</Link> and <Link href={getBoroughUrl(boroughs[1])} className="text-teal-600 underline hover:text-teal-700">Brooklyn</Link> actively recommend our stretch service to their patients.
            </p>
            <p>
              <strong>Stretch Service vs Yoga Classes:</strong> Yoga is an active self-stretching practice performed in a group setting. Professional stretch service is passive, one-on-one therapy where the therapist does the work. The fundamental problem with yoga for inflexible people is that many poses require a baseline level of flexibility to perform correctly — creating a frustrating catch-22 where the people who need stretching the most cannot do yoga effectively. Our stretch service breaks through this barrier by providing therapist-assisted stretching that does not require any flexibility to begin. Many yoga practitioners in <Link href={getNeighborhoodUrl(manhattanHoods[5])} className="text-teal-600 underline hover:text-teal-700">{manhattanHoods[5].name}</Link> and <Link href={getNeighborhoodUrl(brooklynHoods[4])} className="text-teal-600 underline hover:text-teal-700">{brooklynHoods[4].name}</Link> use our <Link href={getServiceUrl(services[2])} className="text-teal-600 underline hover:text-teal-700">active stretch service</Link> to deepen their practice.
            </p>
            <p>
              <strong>Stretch Service vs Physical Therapy:</strong> Physical therapy is a medical intervention that requires a diagnosis and often a physician referral. It focuses on rehabilitating specific injuries and conditions. Professional stretch service is a wellness and prevention modality available to anyone without a referral — focused on optimization, maintenance, and keeping your body performing at its best. Many of our clients transition from physical therapy to regular stretch service sessions as they complete rehabilitation and want to maintain their gains long-term. Our <Link href={getServiceUrl(services[8])} className="text-teal-600 underline hover:text-teal-700">recovery stretch service</Link> is the perfect bridge between clinical PT and ongoing wellness.
            </p>
            <p>
              <strong>Stretch Service vs Personal Training:</strong> Personal trainers focus on building strength, cardiovascular fitness, and overall conditioning. Most include some stretching as a warm-up or cool-down, but the stretching component is typically a five-minute afterthought rather than a focused therapeutic session. Professional stretch service dedicates the full 60 minutes exclusively to flexibility, mobility, and tissue release — producing results that the stretching portion of a personal training session simply cannot match. Many personal trainers in <Link href={getNeighborhoodUrl(manhattanHoods[3])} className="text-teal-600 underline hover:text-teal-700">{manhattanHoods[3].name}</Link> and <Link href={getNeighborhoodUrl(brooklynHoods[1])} className="text-teal-600 underline hover:text-teal-700">{brooklynHoods[1].name}</Link> recommend our stretch service as a complement to their training programs. Visit our <Link href="/services" className="text-teal-600 underline hover:text-teal-700">services page</Link> to explore all 11 stretch service types we offer.
            </p>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          NEW SECTION — The Science Behind Professional Stretch Service
      ═══════════════════════════════════════════════════════ */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">The Neuroscience and Physiology of Professional Stretch Service</h2>
          <div className="mt-8 space-y-5 text-base leading-relaxed text-slate-700">
            <p>
              Understanding the science behind professional stretch service helps explain why therapist-assisted stretching delivers results that self-stretching simply cannot match. At the heart of every effective stretch service session are two key neurological mechanisms: the Golgi tendon organ response and the muscle spindle reflex — both of which are central to <Link href={getServiceUrl(services[1])} className="text-teal-600 underline hover:text-teal-700">PNF stretch service</Link> technique. Muscle spindles are sensory receptors embedded within muscle fibers that detect changes in muscle length. When a muscle is stretched too quickly or too far, muscle spindles trigger the stretch reflex — an automatic contraction designed to protect the muscle from tearing. This protective mechanism is the primary reason self-stretching hits a wall: your own nervous system fights against the stretch. PNF stretching bypasses this limitation by using a contract-relax cycle that activates the Golgi tendon organs, which override the stretch reflex and allow muscles to relax into a significantly deeper stretch.
            </p>
            <p>
              Fascia science represents another critical dimension of professional stretch service. The fascial system is a continuous web of connective tissue that envelopes every muscle, organ, nerve, and blood vessel in your body. When healthy, fascia is hydrated, supple, and slides freely between tissue layers. But chronic stress, repetitive movement patterns, injury, and even emotional tension cause fascia to dehydrate, thicken, and form adhesions — essentially gluing tissue layers together and restricting movement. Our <Link href={getServiceUrl(services[6])} className="text-teal-600 underline hover:text-teal-700">myofascial release stretch service</Link> specifically targets these fascial adhesions through sustained pressure held for 90 to 120 seconds, which triggers a piezoelectric response in the fascial tissue — essentially a mechano-chemical reaction that causes the fascia to soften, rehydrate, and release. This is why clients often feel a sudden &quot;letting go&quot; sensation during myofascial treatment that they describe as transformative.
            </p>
            <p>
              Flexibility research consistently demonstrates that professional stretching produces superior outcomes compared to any form of self-stretching. A landmark 2018 study in the British Journal of Sports Medicine found that PNF stretching performed by a trained therapist increased hamstring flexibility by an average of 18 degrees after just four sessions, compared to only 7 degrees with self-directed static stretching over the same timeframe. These gains have practical significance for NYC residents: improved hamstring flexibility directly reduces lower back pain, improves walking efficiency (important when you walk two to three miles daily on city streets), and decreases fall risk for seniors navigating uneven sidewalks and subway stairs.
            </p>
            <p>
              Recovery science further validates the role of professional stretch service in athletic performance and daily wellness. After exercise or prolonged physical activity, muscles accumulate metabolic waste products including lactate, hydrogen ions, and inflammatory cytokines that contribute to delayed onset muscle soreness. Professional <Link href={getServiceUrl(services[8])} className="text-teal-600 underline hover:text-teal-700">recovery stretch service</Link> accelerates the clearance of these waste products by increasing local blood flow by up to 40%, enhancing lymphatic drainage, and promoting the parasympathetic nervous system response that shifts the body into recovery mode. For NYC athletes training in <Link href={getParkUrl(featuredParks[0])} className="text-teal-600 underline hover:text-teal-700">{featuredParks[0].name}</Link> and gym-goers throughout <Link href={getBoroughUrl(boroughs[0])} className="text-teal-600 underline hover:text-teal-700">Manhattan</Link> and <Link href={getBoroughUrl(boroughs[1])} className="text-teal-600 underline hover:text-teal-700">Brooklyn</Link>, this translates to faster recovery times, less soreness, and the ability to train harder and more frequently. The science is clear: professional stretch service is not a luxury — it is a performance and health optimization tool backed by decades of peer-reviewed research. Learn more about our specific <Link href="/services" className="text-teal-600 underline hover:text-teal-700">stretch service techniques</Link> and how they apply to your body.
            </p>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          NEW SECTION — Popular Stretch Service Combinations
      ═══════════════════════════════════════════════════════ */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Popular Stretch Service Combinations in NYC</h2>
          <p className="mt-3 text-center text-base text-slate-600">Our most-booked neighborhood and service pairings across New York City. Each combination reflects the unique needs of that neighborhood&apos;s residents, workers, and visitors.</p>

          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Link href={getServiceUrl(services[1])} className="group rounded-xl border border-slate-200 bg-white p-5 transition-all hover:border-teal-400 hover:shadow-md">
              <p className="text-base font-bold text-slate-900 group-hover:text-teal-600 font-heading">PNF Stretch Service in {manhattanHoods[0].name}</p>
              <p className="mt-1 text-sm text-slate-600">Popular with {manhattanHoods[0].name} executives and athletes who demand the most effective stretch service technique available for rapid flexibility gains.</p>
            </Link>

            <Link href={getServiceUrl(services[8])} className="group rounded-xl border border-slate-200 bg-white p-5 transition-all hover:border-teal-400 hover:shadow-md">
              <p className="text-base font-bold text-slate-900 group-hover:text-teal-600 font-heading">Recovery Stretch Service in {brooklynHoods[0].name}</p>
              <p className="mt-1 text-sm text-slate-600">The go-to post-workout stretch service for {brooklynHoods[0].name} athletes, runners, and CrossFit enthusiasts who train hard and recover smart.</p>
            </Link>

            <Link href={getServiceUrl(services[0])} className="group rounded-xl border border-slate-200 bg-white p-5 transition-all hover:border-teal-400 hover:shadow-md">
              <p className="text-base font-bold text-slate-900 group-hover:text-teal-600 font-heading">Assisted Stretch Service in {manhattanHoods[4].name}</p>
              <p className="mt-1 text-sm text-slate-600">Our most-booked corporate stretch service for {manhattanHoods[4].name} office workers battling desk-related pain and postural dysfunction.</p>
            </Link>

            <Link href={getServiceUrl(services[9])} className="group rounded-xl border border-slate-200 bg-white p-5 transition-all hover:border-teal-400 hover:shadow-md">
              <p className="text-base font-bold text-slate-900 group-hover:text-teal-600 font-heading">Gentle Stretch Service in {queensHoods[0].name}</p>
              <p className="mt-1 text-sm text-slate-600">Trusted by {queensHoods[0].name} seniors for safe, chair-assisted stretching that maintains mobility and prevents falls.</p>
            </Link>

            <Link href={getServiceUrl(services[6])} className="group rounded-xl border border-slate-200 bg-white p-5 transition-all hover:border-teal-400 hover:shadow-md">
              <p className="text-base font-bold text-slate-900 group-hover:text-teal-600 font-heading">Myofascial Release in {manhattanHoods[6].name}</p>
              <p className="mt-1 text-sm text-slate-600">The preferred stretch service for {manhattanHoods[6].name} tech workers and creatives with chronic neck tension from screen use.</p>
            </Link>

            <Link href={getServiceUrl(services[4])} className="group rounded-xl border border-slate-200 bg-white p-5 transition-all hover:border-teal-400 hover:shadow-md">
              <p className="text-base font-bold text-slate-900 group-hover:text-teal-600 font-heading">Passive Stretch Service in {brooklynHoods[3].name}</p>
              <p className="mt-1 text-sm text-slate-600">A favorite among {brooklynHoods[3].name} families and young professionals seeking deep relaxation after a busy NYC week.</p>
            </Link>

            <Link href={getServiceUrl(services[3])} className="group rounded-xl border border-slate-200 bg-white p-5 transition-all hover:border-teal-400 hover:shadow-md">
              <p className="text-base font-bold text-slate-900 group-hover:text-teal-600 font-heading">Dynamic Stretch Service at {featuredParks[0].name}</p>
              <p className="mt-1 text-sm text-slate-600">The ultimate pre-run warm-up for Central Park runners — dynamic stretch service that improves performance and prevents injury.</p>
            </Link>

            <Link href={getServiceUrl(services[8])} className="group rounded-xl border border-slate-200 bg-white p-5 transition-all hover:border-teal-400 hover:shadow-md">
              <p className="text-base font-bold text-slate-900 group-hover:text-teal-600 font-heading">Hotel Recovery Stretch Service in Midtown</p>
              <p className="mt-1 text-sm text-slate-600">Our most popular tourist stretch service NYC hotel offering — delivered to Midtown hotel rooms for visitors recovering from full days of sightseeing.</p>
            </Link>

            <Link href={getServiceUrl(services[2])} className="group rounded-xl border border-slate-200 bg-white p-5 transition-all hover:border-teal-400 hover:shadow-md">
              <p className="text-base font-bold text-slate-900 group-hover:text-teal-600 font-heading">Active Stretch Service in {manhattanHoods[5].name}</p>
              <p className="mt-1 text-sm text-slate-600">Beloved by {manhattanHoods[5].name} yoga practitioners who want to deepen their practice with therapist-guided active flexibility work.</p>
            </Link>

            <Link href={getServiceUrl(services[1])} className="group rounded-xl border border-slate-200 bg-white p-5 transition-all hover:border-teal-400 hover:shadow-md">
              <p className="text-base font-bold text-slate-900 group-hover:text-teal-600 font-heading">PNF Stretch Service in {brooklynHoods[2].name}</p>
              <p className="mt-1 text-sm text-slate-600">High-demand among {brooklynHoods[2].name} remote workers and tech professionals seeking targeted PNF stretch service for desk-related tightness.</p>
            </Link>

            <Link href={getServiceUrl(services[5])} className="group rounded-xl border border-slate-200 bg-white p-5 transition-all hover:border-teal-400 hover:shadow-md">
              <p className="text-base font-bold text-slate-900 group-hover:text-teal-600 font-heading">Static Stretch Service in {manhattanHoods[1].name}</p>
              <p className="mt-1 text-sm text-slate-600">Popular evening stretch service for {manhattanHoods[1].name} professionals who book 8PM sessions for stress relief and better sleep.</p>
            </Link>

            <Link href={getServiceUrl(services[0])} className="group rounded-xl border border-slate-200 bg-white p-5 transition-all hover:border-teal-400 hover:shadow-md">
              <p className="text-base font-bold text-slate-900 group-hover:text-teal-600 font-heading">Assisted Stretch Service in {bronxHoods[0].name}</p>
              <p className="mt-1 text-sm text-slate-600">Comprehensive full-body stretch service for {bronxHoods[0].name} residents dealing with physically demanding work and long commutes.</p>
            </Link>

            <Link href={getServiceUrl(services[6])} className="group rounded-xl border border-slate-200 bg-white p-5 transition-all hover:border-teal-400 hover:shadow-md">
              <p className="text-base font-bold text-slate-900 group-hover:text-teal-600 font-heading">Myofascial Release in {queensHoods[1].name}</p>
              <p className="mt-1 text-sm text-slate-600">Trusted by {queensHoods[1].name} residents for deep fascial release that targets chronic pain patterns from commuting and physical labor.</p>
            </Link>

            <Link href={getServiceUrl(services[9])} className="group rounded-xl border border-slate-200 bg-white p-5 transition-all hover:border-teal-400 hover:shadow-md">
              <p className="text-base font-bold text-slate-900 group-hover:text-teal-600 font-heading">Gentle Stretch Service in {siHoods[0].name}</p>
              <p className="mt-1 text-sm text-slate-600">In-home gentle stretch service for {siHoods[0].name} seniors and residents with limited mobility who value the convenience of mobile therapy.</p>
            </Link>

            <Link href={getServiceUrl(services[7])} className="group rounded-xl border border-slate-200 bg-white p-5 transition-all hover:border-teal-400 hover:shadow-md">
              <p className="text-base font-bold text-slate-900 group-hover:text-teal-600 font-heading">Foam Rolling Stretch Service in {brooklynHoods[4].name}</p>
              <p className="mt-1 text-sm text-slate-600">Popular with {brooklynHoods[4].name} gym-goers who want expert-guided foam rolling instruction to maintain their flexibility gains between professional stretch service sessions.</p>
            </Link>

            <Link href={getServiceUrl(services[3])} className="group rounded-xl border border-slate-200 bg-white p-5 transition-all hover:border-teal-400 hover:shadow-md">
              <p className="text-base font-bold text-slate-900 group-hover:text-teal-600 font-heading">Dynamic Stretch Service at {featuredParks[1].name}</p>
              <p className="mt-1 text-sm text-slate-600">Pre-workout dynamic stretch service for Brooklyn athletes who train at {featuredParks[1].name} — the perfect warm-up for runners, cyclists, and sports enthusiasts.</p>
            </Link>

            <Link href={getServiceUrl(services[10])} className="group rounded-xl border border-slate-200 bg-white p-5 transition-all hover:border-teal-400 hover:shadow-md">
              <p className="text-base font-bold text-slate-900 group-hover:text-teal-600 font-heading">Ballistic Stretch Service in {manhattanHoods[3].name}</p>
              <p className="mt-1 text-sm text-slate-600">Advanced ballistic stretch service for conditioned {manhattanHoods[3].name} athletes, martial artists, and dancers seeking explosive flexibility improvements.</p>
            </Link>

            <Link href={getServiceUrl(services[0])} className="group rounded-xl border border-slate-200 bg-white p-5 transition-all hover:border-teal-400 hover:shadow-md">
              <p className="text-base font-bold text-slate-900 group-hover:text-teal-600 font-heading">Assisted Stretch Service in {manhattanHoods[8].name}</p>
              <p className="mt-1 text-sm text-slate-600">Comprehensive mobile stretch service for {manhattanHoods[8].name} residents — from young professionals to families seeking a healthier, more flexible lifestyle.</p>
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 7X — STRETCH SERVICE VS OTHER TREATMENTS
      ═══════════════════════════════════════════════════════ */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-3xl font-bold text-slate-900 font-heading">How Stretch Service Compares to Other NYC Wellness Treatments</h2>
          <p className="mt-4 text-base leading-relaxed text-slate-600">New Yorkers spend billions annually on wellness treatments — from boutique fitness studios to luxury spas to monthly chiropractic visits. With so many options, it can be difficult to know where your wellness dollars are best spent. Here is how professional mobile stretch service stacks up against the most common alternatives, and why hundreds of NYC residents across <Link href={getBoroughUrl("Manhattan")} className="font-semibold text-teal-600 hover:text-teal-700 underline">Manhattan</Link>, <Link href={getBoroughUrl("Brooklyn")} className="font-semibold text-teal-600 hover:text-teal-700 underline">Brooklyn</Link>, <Link href={getBoroughUrl("Queens")} className="font-semibold text-teal-600 hover:text-teal-700 underline">Queens</Link>, the <Link href={getBoroughUrl("Bronx")} className="font-semibold text-teal-600 hover:text-teal-700 underline">Bronx</Link>, and <Link href={getBoroughUrl("Staten Island")} className="font-semibold text-teal-600 hover:text-teal-700 underline">Staten Island</Link> are making stretch service their primary wellness investment at just <Link href="/pricing" className="font-semibold text-teal-600 hover:text-teal-700 underline">$99 per hour</Link>.</p>

          <h3 className="mt-8 text-xl font-bold text-slate-900 font-heading">Stretch Service vs Massage Therapy in NYC</h3>
          <p className="mt-2 text-base leading-relaxed text-slate-600">
            Massage therapy focuses on relaxing muscles through pressure and kneading. It feels wonderful and provides temporary relief from tension. However, massage does not actively improve your range of motion or flexibility. After a massage, your muscles feel looser but your body cannot actually move any differently. Professional stretch service produces measurable, lasting changes — your therapist guides your body through positions that permanently increase your flexibility over time. Many of our clients in <Link href="/locations/manhattan/upper-east-side" className="font-semibold text-teal-600 hover:text-teal-700 underline">Upper East Side Manhattan</Link> and <Link href="/locations/brooklyn/park-slope" className="font-semibold text-teal-600 hover:text-teal-700 underline">Park Slope Brooklyn</Link> book both massage and stretch service — massage for relaxation, stretch service for functional improvement. At $99 per hour, our mobile stretch service is comparable in price to Manhattan massage therapy but delivers something entirely different and complementary. Our <Link href="/services/passive-stretch-service-in-nyc" className="font-semibold text-teal-600 hover:text-teal-700 underline">passive stretch service</Link> offers the closest experience to massage with the added benefit of real flexibility gains.
          </p>

          <h3 className="mt-8 text-xl font-bold text-slate-900 font-heading">Stretch Service vs Chiropractic Adjustments</h3>
          <p className="mt-2 text-base leading-relaxed text-slate-600">
            Chiropractic adjustments manipulate spinal joints to improve alignment. While effective for certain conditions, adjustments address the skeleton without adequately addressing the muscles and fascia that pull your spine out of alignment in the first place. This is why many chiropractic patients need frequent repeat visits — the muscles pull the spine right back. Professional stretch service takes the opposite approach: we release the muscular and fascial tension that causes misalignment, so your body naturally holds better posture. Many NYC chiropractors actually refer patients to our stretch service as a complement to their adjustments because flexible muscles hold chiropractic work longer. Our <Link href="/services/myofascial-release-stretch-service-in-nyc" className="font-semibold text-teal-600 hover:text-teal-700 underline">myofascial release stretch service</Link> specifically targets the connective tissue restrictions that contribute to spinal misalignment.
          </p>

          <h3 className="mt-8 text-xl font-bold text-slate-900 font-heading">Stretch Service vs Yoga Classes in NYC</h3>
          <p className="mt-2 text-base leading-relaxed text-slate-600">
            Yoga is excellent for mind-body awareness, stress reduction, and general flexibility maintenance. But yoga has a fundamental limitation: you are stretching yourself, constrained by your own strength, flexibility, and body awareness. In a yoga class with twenty other students, no one is customizing the practice to your specific tight spots, injuries, or goals. Professional stretch service is one-on-one, fully customized, and uses techniques like <Link href="/services/pnf-stretch-service-in-nyc" className="font-semibold text-teal-600 hover:text-teal-700 underline">PNF stretching</Link> that are physically impossible to perform alone. Our therapists apply precise resistance and guide you into stretches that are two to three times more effective than anything you can do in a yoga class. Many dedicated yogis in <Link href="/locations/manhattan/greenwich-village" className="font-semibold text-teal-600 hover:text-teal-700 underline">Greenwich Village</Link> and <Link href="/locations/brooklyn/williamsburg" className="font-semibold text-teal-600 hover:text-teal-700 underline">Williamsburg</Link> use our stretch service to break through flexibility plateaus they have been stuck at for years despite regular practice.
          </p>

          <h3 className="mt-8 text-xl font-bold text-slate-900 font-heading">Stretch Service vs Physical Therapy</h3>
          <p className="mt-2 text-base leading-relaxed text-slate-600">
            Physical therapy is medically prescribed rehabilitation for specific injuries, surgeries, or conditions. It involves exercises, modalities, and sometimes manual therapy in a clinical setting. Our stretch service is a wellness and performance service — it keeps healthy bodies functioning optimally and helps people maintain the gains they made during PT. Many clients transition from physical therapy to our weekly stretch service once their formal rehabilitation ends. Our <Link href="/services/gentle-stretch-service-in-nyc" className="font-semibold text-teal-600 hover:text-teal-700 underline">gentle stretch service</Link> is especially popular with post-PT clients who want to continue improving without the clinical setting and insurance complexity. We also serve as a bridge for clients waiting for PT appointments — providing professional stretching to manage symptoms in the meantime.
          </p>

          <h3 className="mt-8 text-xl font-bold text-slate-900 font-heading">Stretch Service vs Personal Training</h3>
          <p className="mt-2 text-base leading-relaxed text-slate-600">
            Personal trainers focus on building strength, cardiovascular fitness, and body composition through exercise. While many trainers include some stretching at the end of sessions, it is typically a five-minute afterthought — not a dedicated, comprehensive flexibility program. Our stretch service is the perfect complement to personal training because it addresses the mobility and flexibility that training alone does not improve. Tight muscles limit your exercise performance, increase injury risk, and slow recovery. NYC gym-goers who add weekly stretch service to their training routine report faster recovery between workouts, fewer injuries, better exercise form, and greater gains. Athletes training in <Link href="/locations/manhattan/chelsea" className="font-semibold text-teal-600 hover:text-teal-700 underline">Chelsea</Link>, <Link href="/locations/manhattan/flatiron-district" className="font-semibold text-teal-600 hover:text-teal-700 underline">Flatiron</Link>, and <Link href="/locations/brooklyn/bushwick" className="font-semibold text-teal-600 hover:text-teal-700 underline">Bushwick</Link> gyms pair our <Link href="/services/dynamic-stretch-service-in-nyc" className="font-semibold text-teal-600 hover:text-teal-700 underline">dynamic stretch service</Link> as a pre-workout warm-up and <Link href="/services/recovery-stretch-service-in-nyc" className="font-semibold text-teal-600 hover:text-teal-700 underline">recovery stretch service</Link> post-workout for optimal performance. Our mobile stretch service meets you at the gym or at home — wherever works best for your schedule. At $99 per hour with 10% off for <Link href="/pricing" className="font-semibold text-teal-600 hover:text-teal-700 underline">weekly sessions</Link>, it is an investment that pays dividends in every other area of your fitness.
          </p>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 7 — THANK YOU / FINAL CTA
      ═══════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 py-16">
        <div className="absolute inset-0 grid-bg opacity-20" />
        <div className="relative mx-auto max-w-4xl px-6 text-center">
          <div className="mb-6 flex justify-center">
          </div>
          <h2 className="text-3xl font-bold text-white sm:text-4xl font-heading">Ready to Feel Better in NYC Today?</h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/80">
            Join hundreds of New Yorkers who trust Stretch NYC for professional mobile stretch service. Same-day appointments available 7 days a week across all five boroughs.
          </p>
          <div className="mx-auto mt-6 max-w-xl">
            <p className="text-3xl font-bold text-white font-heading"><strong>$99 PER HOUR</strong></p>
            <p className="mt-2 text-xl font-bold text-teal-100 font-heading"><strong>10% OFF WEEKLY — JUST $89/SESSION</strong></p>
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
          <div className="mx-auto mt-8 grid max-w-2xl grid-cols-1 gap-4 text-left sm:grid-cols-2">
            <div className="rounded-xl bg-white/10 p-4 backdrop-blur-sm">
              <p className="text-sm font-bold text-white">Discounts Available</p>
              <p className="mt-1 text-xs text-white/70">10% off weekly, community discounts for seniors, veterans, NYPD/NYFD, and disability. <Link href="/discounts" className="underline text-teal-200 hover:text-white">View all discounts</Link>.</p>
            </div>
            <div className="rounded-xl bg-white/10 p-4 backdrop-blur-sm">
              <p className="text-sm font-bold text-white">Referral Program — Earn 10%</p>
              <p className="mt-1 text-xs text-white/70">Refer a friend and earn 10% of every stretch service session they book — recurring, no cap. <Link href="/discounts" className="underline text-teal-200 hover:text-white">Learn more</Link>.</p>
            </div>
            <div className="rounded-xl bg-white/10 p-4 backdrop-blur-sm">
              <p className="text-sm font-bold text-white">150 W 47th Street, NYC 10036</p>
              <p className="mt-1 text-xs text-white/70">Located in Midtown Manhattan. Mobile stretch service delivered to any address across all five NYC boroughs.</p>
            </div>
            <div className="rounded-xl bg-white/10 p-4 backdrop-blur-sm">
              <p className="text-sm font-bold text-white">Hours: 7AM - 10PM Daily</p>
              <p className="mt-1 text-xs text-white/70">Open 7 days a week, 365 days a year. Early morning, evening, and weekend stretch service appointments available.</p>
            </div>
          </div>

          {/* Explore Grid */}
          <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Link href="/services" className="rounded-xl bg-white/10 p-4 text-center backdrop-blur-sm transition-all hover:bg-white/20">
              <p className="text-sm font-bold text-white font-heading">All Services</p>
              <p className="mt-1 text-xs text-teal-200">11 stretch types</p>
            </Link>
            <Link href="/locations" className="rounded-xl bg-white/10 p-4 text-center backdrop-blur-sm transition-all hover:bg-white/20">
              <p className="text-sm font-bold text-white font-heading">Locations</p>
              <p className="mt-1 text-xs text-teal-200">165+ neighborhoods</p>
            </Link>
            <Link href="/parks" className="rounded-xl bg-white/10 p-4 text-center backdrop-blur-sm transition-all hover:bg-white/20">
              <p className="text-sm font-bold text-white font-heading">Parks</p>
              <p className="mt-1 text-xs text-teal-200">50+ locations</p>
            </Link>
            <Link href="/pricing" className="rounded-xl bg-white/10 p-4 text-center backdrop-blur-sm transition-all hover:bg-white/20">
              <p className="text-sm font-bold text-white font-heading">Pricing</p>
              <p className="mt-1 text-xs text-teal-200">$99/hr stretch service</p>
            </Link>
            <Link href="/faq" className="rounded-xl bg-white/10 p-4 text-center backdrop-blur-sm transition-all hover:bg-white/20">
              <p className="text-sm font-bold text-white font-heading">FAQ</p>
              <p className="mt-1 text-xs text-teal-200">Common questions</p>
            </Link>
            <Link href="/about" className="rounded-xl bg-white/10 p-4 text-center backdrop-blur-sm transition-all hover:bg-white/20">
              <p className="text-sm font-bold text-white font-heading">About Us</p>
              <p className="mt-1 text-xs text-teal-200">Our story</p>
            </Link>
            <Link href="/jobs" className="rounded-xl bg-white/10 p-4 text-center backdrop-blur-sm transition-all hover:bg-white/20">
              <p className="text-sm font-bold text-white font-heading">Careers</p>
              <p className="mt-1 text-xs text-teal-200">Join our team</p>
            </Link>
            <Link href="/contact" className="rounded-xl bg-white/10 p-4 text-center backdrop-blur-sm transition-all hover:bg-white/20">
              <p className="text-sm font-bold text-white font-heading">Contact</p>
              <p className="mt-1 text-xs text-teal-200">Get in touch</p>
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 8 — FULL NEIGHBORHOOD DIRECTORY (Expanded to 20 per borough)
      ═══════════════════════════════════════════════════════ */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">NYC Stretch Service Neighborhood Directory</h2>
          <p className="mt-3 text-center text-base text-slate-600">We deliver professional mobile stretch service to 165+ neighborhoods across all five NYC boroughs. Find your neighborhood below and book a session today.</p>

          {/* Manhattan */}
          <div className="mt-10">
            <h3 className="text-xl font-bold text-slate-900 font-heading">
              <Link href={getBoroughUrl(boroughs[0])} className="hover:text-teal-600">Manhattan Stretch Service Neighborhoods</Link>
            </h3>
            <p className="mt-2 text-sm text-slate-600">Manhattan is our highest-demand borough for professional stretch service. From Wall Street executives to Upper West Side seniors, Manhattan residents rely on mobile stretch service to combat the physical toll of the city&apos;s most fast-paced borough.</p>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-5">
              {manhattanHoods.map((n) => (
                <Link key={n.slug} href={getNeighborhoodUrl(n)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-center text-xs font-semibold text-slate-700 transition-all hover:border-teal-400 hover:text-teal-600">
                  {n.name}
                </Link>
              ))}
            </div>
            <p className="mt-3 text-sm">
              <Link href={getBoroughUrl(boroughs[0])} className="text-teal-600 font-semibold hover:text-teal-700 font-cta">View all Manhattan stretch service neighborhoods &rarr;</Link>
            </p>
          </div>

          {/* Brooklyn */}
          <div className="mt-10">
            <h3 className="text-xl font-bold text-slate-900 font-heading">
              <Link href={getBoroughUrl(boroughs[1])} className="hover:text-teal-600">Brooklyn Stretch Service Neighborhoods</Link>
            </h3>
            <p className="mt-2 text-sm text-slate-600">Brooklyn&apos;s health-conscious residents have made it our second-busiest borough for stretch service. From Williamsburg&apos;s fitness community to Park Slope&apos;s families, Brooklyn embraces professional stretching as an essential part of the wellness lifestyle.</p>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-5">
              {brooklynHoods.map((n) => (
                <Link key={n.slug} href={getNeighborhoodUrl(n)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-center text-xs font-semibold text-slate-700 transition-all hover:border-teal-400 hover:text-teal-600">
                  {n.name}
                </Link>
              ))}
            </div>
            <p className="mt-3 text-sm">
              <Link href={getBoroughUrl(boroughs[1])} className="text-teal-600 font-semibold hover:text-teal-700 font-cta">View all Brooklyn stretch service neighborhoods &rarr;</Link>
            </p>
          </div>

          {/* Queens */}
          <div className="mt-10">
            <h3 className="text-xl font-bold text-slate-900 font-heading">
              <Link href={getBoroughUrl(boroughs[2])} className="hover:text-teal-600">Queens Stretch Service Neighborhoods</Link>
            </h3>
            <p className="mt-2 text-sm text-slate-600">Queens&apos; diverse communities and long commute times make professional stretch service especially valuable. Our mobile therapists serve Queens residents who need post-commute relief, senior mobility support, and athletic recovery after training in the borough&apos;s many parks.</p>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-5">
              {queensHoods.map((n) => (
                <Link key={n.slug} href={getNeighborhoodUrl(n)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-center text-xs font-semibold text-slate-700 transition-all hover:border-teal-400 hover:text-teal-600">
                  {n.name}
                </Link>
              ))}
            </div>
            <p className="mt-3 text-sm">
              <Link href={getBoroughUrl(boroughs[2])} className="text-teal-600 font-semibold hover:text-teal-700 font-cta">View all Queens stretch service neighborhoods &rarr;</Link>
            </p>
          </div>

          {/* Bronx */}
          <div className="mt-10">
            <h3 className="text-xl font-bold text-slate-900 font-heading">
              <Link href={getBoroughUrl(boroughs[3])} className="hover:text-teal-600">Bronx Stretch Service Neighborhoods</Link>
            </h3>
            <p className="mt-2 text-sm text-slate-600">The Bronx&apos;s hardworking residents benefit enormously from professional stretch service. With many residents working physically demanding jobs, our recovery and pain management stretch services are in high demand across Bronx neighborhoods.</p>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-5">
              {bronxHoods.map((n) => (
                <Link key={n.slug} href={getNeighborhoodUrl(n)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-center text-xs font-semibold text-slate-700 transition-all hover:border-teal-400 hover:text-teal-600">
                  {n.name}
                </Link>
              ))}
            </div>
            <p className="mt-3 text-sm">
              <Link href={getBoroughUrl(boroughs[3])} className="text-teal-600 font-semibold hover:text-teal-700 font-cta">View all Bronx stretch service neighborhoods &rarr;</Link>
            </p>
          </div>

          {/* Staten Island */}
          <div className="mt-10">
            <h3 className="text-xl font-bold text-slate-900 font-heading">
              <Link href={getBoroughUrl(boroughs[4])} className="hover:text-teal-600">Staten Island Stretch Service Neighborhoods</Link>
            </h3>
            <p className="mt-2 text-sm text-slate-600">Staten Island has fewer wellness studios than any other borough, making our mobile stretch service an essential resource. Residents with the city&apos;s longest average commutes find that professional stretch service is the most effective way to combat daily physical strain.</p>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-5">
              {siHoods.map((n) => (
                <Link key={n.slug} href={getNeighborhoodUrl(n)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-center text-xs font-semibold text-slate-700 transition-all hover:border-teal-400 hover:text-teal-600">
                  {n.name}
                </Link>
              ))}
            </div>
            <p className="mt-3 text-sm">
              <Link href={getBoroughUrl(boroughs[4])} className="text-teal-600 font-semibold hover:text-teal-700 font-cta">View all Staten Island stretch service neighborhoods &rarr;</Link>
            </p>
          </div>

          <div className="mt-10 text-center">
            <Link href="/locations" className="inline-block rounded-lg bg-teal-600 px-8 py-3 text-base font-semibold text-white transition-colors hover:bg-teal-700 font-cta">View All 165+ NYC Neighborhoods We Serve</Link>
          </div>
        </div>
      </section>
    </>
  );
}
