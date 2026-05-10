// @ts-nocheck
import Link from "next/link";
import type { Metadata } from "next";
import { services, getServiceUrl, SITE_URL, SITE_SMS_LINK, SITE_PHONE, SITE_PHONE_LINK } from "@/app/site/stretch-ny/_lib/siteData";
import { JsonLd, webPageSchema, breadcrumbSchema, faqSchema } from "@/app/site/stretch-ny/_lib/schema";
import Logo from "@/app/site/stretch-ny/_components/Logo";

const PAGE_URL = `${SITE_URL}/stretching-101`;
const PAGE_TITLE = "Stretching 101 | The Complete Guide to Stretch Service";
const PAGE_DESC = "The definitive guide to stretching: 11 types explained, daily routines, myth-busting, and when to see a professional stretch service therapist. Stretch NYC — $99/hr across all five NYC boroughs.";

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESC,
  alternates: { canonical: PAGE_URL },
};

const breadcrumbs = [
  { name: "Home", url: SITE_URL },
  { name: "Stretching 101", url: PAGE_URL },
];

const faqs = [
  { question: "What is stretching and why is it important for your body?", answer: "Stretching is the deliberate lengthening of muscles and connective tissues to improve flexibility, range of motion, and joint health. It is important because it counteracts the shortening and tightening that happens from daily activities like sitting, commuting, and sleeping. Regular stretching reduces injury risk by up to 50%, relieves chronic pain, improves posture, increases athletic performance, and promotes better sleep. For NYC residents who walk, commute, and sit at desks all day, stretching is one of the most impactful health investments you can make." },
  { question: "How many types of stretching are there?", answer: "There are 11 recognized types of stretching used by professionals: assisted stretching, PNF stretching (proprioceptive neuromuscular facilitation), active stretching, dynamic stretching, passive stretching, static stretching, myofascial release, foam rolling, recovery stretching, gentle stretching for seniors, and ballistic stretching. Each type serves a different purpose — from pre-workout warm-ups (dynamic) to deep flexibility gains (PNF) to relaxation (passive). A professional stretch service therapist selects the right combination based on your body, goals, and needs." },
  { question: "How often should you stretch for best results?", answer: "The American College of Sports Medicine recommends stretching at least 2-3 times per week, but daily stretching produces the best results. For most NYC adults, a 10-15 minute morning stretch routine plus a 5-minute desk break every 2 hours is ideal. If you are training for a sport or recovering from an injury, daily stretching combined with weekly professional stretch service sessions produces 3x better flexibility gains than self-stretching alone. Consistency matters more than duration — 10 minutes daily beats one hour once a week." },
  { question: "What is the difference between static and dynamic stretching?", answer: "Static stretching involves holding a position for 30-60 seconds without movement, allowing the muscle to gradually lengthen. It is best performed after exercise or before bed. Dynamic stretching uses controlled, flowing movements to take joints through their full range of motion and is the ideal warm-up before physical activity. Research shows dynamic stretching before exercise improves performance by 5-10%, while static stretching before exercise can temporarily reduce power output by up to 5%. A professional stretch service therapist uses both strategically based on timing and goals." },
  { question: "Is it better to stretch in the morning or at night?", answer: "Both times offer distinct benefits. Morning stretching reduces stiffness accumulated during sleep, increases blood flow, activates your nervous system, and prepares your body for the day ahead. Evening stretching promotes relaxation, reduces cortisol, relieves tension accumulated during the workday, and improves sleep quality. The best approach is to do both: a 10-minute morning routine to wake up your body and a 10-minute evening routine to wind down. Professional stretch service sessions can be scheduled at either time depending on your goals." },
  { question: "Can stretching help with back pain?", answer: "Yes, stretching is one of the most effective non-pharmaceutical treatments for back pain. Targeted stretching of the hip flexors, hamstrings, piriformis, and thoracic spine addresses the root causes of most back pain — which are muscle imbalances and fascial restrictions from prolonged sitting. Studies show that consistent stretching reduces chronic lower back pain by 40-60% over 8 weeks. For NYC desk workers and commuters, professional stretch service sessions that combine PNF stretching with myofascial release provide the fastest and most lasting relief." },
  { question: "What is PNF stretching and why is it the most effective technique?", answer: "PNF stretching (Proprioceptive Neuromuscular Facilitation) is a contract-relax technique that produces 2-3x greater flexibility gains than static stretching alone. The therapist stretches your muscle to its limit, then you push against the therapist for 5-10 seconds (isometric contraction), then relax as the therapist deepens the stretch. This tricks your nervous system into allowing a greater range of motion. PNF stretching requires a trained partner, which is why professional stretch service sessions are far more effective than self-stretching for flexibility improvement." },
  { question: "Is stretching safe for seniors and older adults?", answer: "Yes, stretching is not only safe for seniors — it is essential. Gentle stretching improves joint mobility, reduces fall risk, manages arthritis symptoms, and helps maintain independence. The key is using appropriate techniques: slow movements, chair-assisted positions when needed, and avoiding bouncing or forcing. Our gentle stretch service program is specifically designed for adults over 60 and includes fall prevention exercises, arthritis-friendly techniques, and movements that support daily living activities like reaching, bending, and walking." },
  { question: "Should you stretch before or after a workout?", answer: "Both, but with different techniques. Before a workout, use dynamic stretching — controlled movements like leg swings, arm circles, and walking lunges that warm up your muscles and prepare them for activity. Dynamic stretching before exercise improves performance by 5-10%. After a workout, use static stretching — holding positions for 30-60 seconds to cool down, reduce muscle soreness, and promote recovery. Never do static stretching on cold muscles before intense exercise, as this can temporarily reduce power and increase injury risk." },
  { question: "What are the most common stretching mistakes people make?", answer: "The five most common stretching mistakes are: (1) bouncing during static stretches, which activates the stretch reflex and can cause micro-tears; (2) stretching cold muscles without warming up first; (3) holding your breath instead of breathing deeply through each stretch; (4) pushing through sharp pain instead of mild discomfort; and (5) rushing through stretches without holding long enough (minimum 30 seconds for static stretches). A professional stretch service eliminates all of these mistakes because your therapist controls the movement, depth, and timing." },
  { question: "How long should you hold a stretch?", answer: "For static stretching, the minimum effective hold time is 30 seconds, with 45-60 seconds being optimal for maximum muscle lengthening. Research shows that holding a stretch for less than 15 seconds produces almost no flexibility benefit. For PNF stretching, the contract phase should last 5-10 seconds followed by a 20-30 second deepened stretch. Dynamic stretches are performed as continuous controlled movements for 10-15 repetitions per exercise. During a professional stretch service session, your therapist monitors hold times precisely for optimal results." },
  { question: "Can you overstretch or stretch too much?", answer: "Yes, overstretching is a real risk. Stretching beyond your body&apos;s current capacity can cause muscle strains, ligament damage, joint instability, and inflammation. Signs of overstretching include sharp pain during the stretch, pain that persists after stretching, joint soreness, and decreased range of motion the following day. The key is to stretch to the point of mild tension — never sharp pain. A professional stretch service therapist is trained to read your body&apos;s resistance and stay within safe limits while still achieving maximum benefit." },
  { question: "What is the difference between flexibility and mobility?", answer: "Flexibility is the ability of a muscle to lengthen passively — how far you can be stretched. Mobility is the ability to actively move a joint through its full range of motion with strength and control. You can be flexible without being mobile (like being pushed into a split but not being able to get there yourself). A comprehensive stretch service program addresses both: passive and PNF stretching improve flexibility, while active and dynamic stretching improve mobility. Both are essential for pain-free movement and injury prevention." },
  { question: "When should you see a professional stretch therapist instead of stretching at home?", answer: "You should see a professional stretch service therapist if: (1) you have chronic pain that self-stretching does not resolve; (2) you have hit a flexibility plateau; (3) you are recovering from surgery or injury; (4) you have muscle imbalances causing compensatory movement patterns; (5) you sit at a desk for 8+ hours daily; (6) you are a competitive athlete seeking performance gains; or (7) you simply want faster, more effective results. Professional stretch service sessions achieve in one hour what weeks of self-stretching cannot, because therapists access muscles and angles impossible to reach alone." },
  { question: "How much does professional stretch service cost in NYC?", answer: "Professional stretch service at Stretch NYC costs $99 per 60-minute session. Weekly clients save 10% and pay just $89 per session. Every session includes a full-body mobility assessment, professional equipment brought to your location, and a personalized treatment plan. Our certified stretch therapists serve all five NYC boroughs — Manhattan, Brooklyn, Queens, the Bronx, and Staten Island. Same-day appointments are available 7AM-10PM daily. Text or call 212-202-7080 to book." },
  { question: "What should I wear to a stretch service session?", answer: "Wear comfortable, stretchy clothing that allows full range of motion. Athletic wear, yoga pants, shorts, leggings, or sweatpants work perfectly. Avoid jeans, khakis, belts, or any restrictive clothing. You do not need shoes — most stretching is done barefoot or in socks. If we are meeting at a park or outdoor location, athletic shoes are fine for travel. Our therapists bring all equipment including a portable massage table, mats, and stretching straps." },
  { question: "Does stretching help with stress and anxiety?", answer: "Yes, stretching is clinically proven to reduce stress and anxiety. Sustained stretching activates the parasympathetic nervous system (your body&apos;s rest-and-digest response), lowering cortisol levels and heart rate. Studies show that just 10 minutes of stretching reduces perceived stress by 25-40%. For NYC residents dealing with the constant stimulation of city life, a professional stretch service session provides both physical relief and a deeply calming mental reset. Many clients describe their sessions as more relaxing than massage." },
];

export default function Stretching101Page() {
  return (
    <>
      <JsonLd data={webPageSchema(PAGE_TITLE, PAGE_DESC, PAGE_URL, breadcrumbs)} />
      <JsonLd data={breadcrumbSchema(breadcrumbs)} />
      <JsonLd data={faqSchema(faqs)} />

      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 pt-36 pb-16 sm:pt-44 sm:pb-20">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <div className="mb-6 flex justify-center">
          </div>
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">The Definitive Stretching Resource</p>
          <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl font-heading">
            STRETCHING 101<br />
            <span className="gradient-text">THE COMPLETE GUIDE</span><br />
            TO STRETCH SERVICE
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">
            Everything you need to know about stretching — the 11 types, daily routines by age, myth-busting, and when professional stretch service makes all the difference. Written by NYC&apos;s leading stretch service team. <strong className="text-white">$99/hr | 10% off weekly.</strong>
          </p>
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

      {/* ═══ BREADCRUMBS ═══ */}
      <div className="bg-slate-50 border-b border-slate-200">
        <div className="mx-auto max-w-5xl px-6 py-3">
          <nav className="flex text-sm text-slate-500" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-teal-600">Home</Link>
            <span className="mx-2">/</span>
            <span className="text-slate-900 font-medium">Stretching 101</span>
          </nav>
        </div>
      </div>

      {/* ═══ TABLE OF CONTENTS ═══ */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-3xl font-bold text-slate-900 font-heading text-center">Your Complete Stretching Education</h2>
          <p className="mt-4 text-center text-slate-600 max-w-3xl mx-auto">
            Whether you are brand new to stretching or a seasoned athlete looking to optimize your routine, this comprehensive guide covers everything from fundamental concepts to advanced techniques. Bookmark this page — it is the only stretching resource you will ever need.
          </p>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <Link href="/stretching-101/daily-stretching-routine" className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
              <h3 className="text-lg font-bold text-slate-900 font-heading">Daily Stretching Routine</h3>
              <p className="mt-2 text-sm text-slate-600">Must-do stretches organized by age group: 18-30, 30-45, 45-60, and 60+. Morning, midday, and evening routines with step-by-step instructions.</p>
              <span className="mt-3 inline-block text-sm font-semibold text-teal-600 font-cta">Read the full guide &rarr;</span>
            </Link>
            <Link href="/stretching-101/stretching-for-back-pain" className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
              <h3 className="text-lg font-bold text-slate-900 font-heading">Stretching for Back Pain</h3>
              <p className="mt-2 text-sm text-slate-600">The 10 best stretches for lower back pain, upper back relief, NYC-specific triggers, and when to see a professional stretch service therapist.</p>
              <span className="mt-3 inline-block text-sm font-semibold text-teal-600 font-cta">Read the full guide &rarr;</span>
            </Link>
            <Link href="/stretching-101/stretching-for-athletes" className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
              <h3 className="text-lg font-bold text-slate-900 font-heading">Stretching for Athletes</h3>
              <p className="mt-2 text-sm text-slate-600">Pre-workout dynamic routines, post-workout recovery, sport-specific protocols for runners, cyclists, and gym-goers across NYC.</p>
              <span className="mt-3 inline-block text-sm font-semibold text-teal-600 font-cta">Read the full guide &rarr;</span>
            </Link>
            <Link href="/stretching-101/stretching-for-seniors" className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
              <h3 className="text-lg font-bold text-slate-900 font-heading">Stretching for Seniors</h3>
              <p className="mt-2 text-sm text-slate-600">Safe chair stretches, standing exercises with support, fall prevention routines, and arthritis-friendly techniques for adults 60+.</p>
              <span className="mt-3 inline-block text-sm font-semibold text-teal-600 font-cta">Read the full guide &rarr;</span>
            </Link>
            <Link href="/stretching-101/stretching-for-desk-workers" className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
              <h3 className="text-lg font-bold text-slate-900 font-heading">Stretching for Desk Workers</h3>
              <p className="mt-2 text-sm text-slate-600">Tech neck fixes, hip flexor openers, 5-minute desk routines, and lunch break stretches for NYC office workers in Midtown, FiDi, and DUMBO.</p>
              <span className="mt-3 inline-block text-sm font-semibold text-teal-600 font-cta">Read the full guide &rarr;</span>
            </Link>
            <div className="rounded-xl border border-teal-200 bg-teal-50 p-6 shadow-sm">
              <h3 className="text-lg font-bold text-teal-800 font-heading">Book a Stretch Service</h3>
              <p className="mt-2 text-sm text-teal-700">Skip the reading — let a certified stretch therapist do the work. $99/hr, 10% off weekly. All five boroughs.</p>
              <a href={SITE_SMS_LINK} className="mt-3 inline-block text-sm font-semibold text-teal-600 font-cta">Text {SITE_PHONE} &rarr;</a>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ WHAT IS STRETCHING ═══ */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-3xl font-bold text-slate-900 font-heading">What Is Stretching and Why Does It Matter?</h2>
          <div className="mt-6 space-y-5 text-base leading-relaxed text-slate-700">
            <p>
              Stretching is the deliberate, controlled lengthening of muscles, tendons, and fascia to improve flexibility, restore range of motion, and promote overall musculoskeletal health. It is one of the oldest and most fundamental human health practices — and one of the most misunderstood. Most people think of stretching as something you do for 30 seconds before a run. In reality, stretching is a sophisticated discipline with 11 distinct techniques, each serving different physiological purposes and producing different results in the body.
            </p>
            <p>
              At its most basic level, stretching works by lengthening the muscle fibers and the surrounding connective tissue (fascia) that can become shortened and tight from disuse, repetitive movements, or sustained postures like sitting. When a muscle is chronically shortened — as the hip flexors are for anyone who sits at a desk — it pulls on the surrounding structures, creating pain, compensatory movement patterns, and eventually injury. Stretching reverses this process by restoring the muscle to its optimal length, relieving the pull on joints and surrounding tissues.
            </p>
            <p>
              But stretching does far more than just lengthen muscles. When you hold a stretch, you activate mechanoreceptors in the muscle tissue that communicate with your central nervous system. This triggers a neurological relaxation response that reduces muscle guarding (the involuntary tightening your body does to protect itself), lowers cortisol levels, and activates the parasympathetic nervous system — your body&apos;s built-in calm-down mechanism. This is why a <Link href={getServiceUrl(services[4])} className="text-teal-600 underline hover:text-teal-700">passive stretch service</Link> session can feel as relaxing as meditation.
            </p>
            <p>
              For New Yorkers specifically, stretching addresses the unique physical demands of city living. The average NYC resident walks 6,000-10,000 steps per day on hard concrete, sits on rigid subway seats during commutes, hunches over laptops in cramped apartments, and carries stress in their neck and shoulders from the relentless pace of the city. Every one of these activities creates muscle tension, fascial adhesions, and movement restrictions that compound over time. Without regular stretching — whether self-directed or through a professional <Link href={getServiceUrl(services[0])} className="text-teal-600 underline hover:text-teal-700">assisted stretch service</Link> — this tension accumulates until it manifests as chronic pain, limited mobility, and increased injury risk.
            </p>
            <p>
              The science is clear: stretching works. A 2019 meta-analysis in the British Journal of Sports Medicine found that regular stretching reduces injury risk by 54% in athletic populations. A 2021 study in the Journal of Physical Therapy Science showed that four weeks of daily stretching reduced chronic lower back pain scores by 58%. And a 2020 study published in the Journal of Aging and Physical Activity found that seniors who stretched 3+ times per week had 36% fewer falls than non-stretchers. These are not marginal improvements — they are transformative outcomes from one of the simplest health interventions available.
            </p>
          </div>
        </div>
      </section>

      {/* ═══ THE 11 TYPES OF STRETCHING ═══ */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-3xl font-bold text-slate-900 font-heading text-center">The 11 Types of Stretching Explained</h2>
          <p className="mt-4 text-center text-slate-600 max-w-3xl mx-auto">
            Professional stretch service therapists draw from 11 distinct stretching techniques. Understanding each type helps you make informed decisions about your flexibility training — and helps you understand why professional stretch service sessions are so much more effective than stretching at home.
          </p>
          <div className="mt-10 space-y-8">
            {services.map((service, index) => (
              <div key={service.slug} className="rounded-xl border border-slate-200 bg-white p-6">
                <div className="flex items-start gap-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-100 text-lg font-bold text-teal-700">{index + 1}</span>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 font-heading">
                      <Link href={getServiceUrl(service)} className="hover:text-teal-600 transition-colors">{service.name}</Link>
                    </h3>
                    <p className="mt-1 text-sm font-semibold text-teal-600">{service.tagline}</p>
                    <p className="mt-3 text-base text-slate-700 leading-relaxed">{service.description}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {service.idealFor.map((item) => (
                        <span key={item} className="rounded-full bg-teal-50 px-3 py-1 text-xs font-medium text-teal-700">{item}</span>
                      ))}
                    </div>
                    <Link href={getServiceUrl(service)} className="mt-4 inline-block text-sm font-semibold text-teal-600 hover:text-teal-700 font-cta">
                      Learn more about {service.name.toLowerCase()} &rarr;
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ HOW OFTEN TO STRETCH ═══ */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-3xl font-bold text-slate-900 font-heading">How Often Should You Stretch? Daily Recommendations</h2>
          <div className="mt-6 space-y-5 text-base leading-relaxed text-slate-700">
            <p>
              The frequency and duration of your stretching practice depends on your goals, age, activity level, and current flexibility. However, the overwhelming consensus in sports science and rehabilitation medicine is clear: <strong>daily stretching produces the best results, and consistency matters more than duration.</strong> Ten minutes of focused stretching every day will produce dramatically better outcomes than one hour of stretching once a week.
            </p>
            <p>
              The American College of Sports Medicine (ACSM) recommends stretching at least 2-3 times per week for general health maintenance, holding each stretch for 30-60 seconds and performing 2-4 repetitions per muscle group. However, these are minimum recommendations. For people dealing with chronic tightness, desk work, athletic training, or age-related stiffness, daily stretching is strongly recommended. Our professional stretch service therapists typically advise clients to follow this schedule:
            </p>
          </div>
          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-bold text-slate-900 font-heading">General Health Maintenance</h3>
              <ul className="mt-3 space-y-2 text-sm text-slate-700">
                <li className="flex items-start gap-2"><span className="text-teal-600 font-bold">Morning:</span> 10-minute full-body stretch routine daily</li>
                <li className="flex items-start gap-2"><span className="text-teal-600 font-bold">Midday:</span> 5-minute desk or standing stretch break every 2 hours</li>
                <li className="flex items-start gap-2"><span className="text-teal-600 font-bold">Evening:</span> 10-minute wind-down stretch before bed, 3-5x per week</li>
                <li className="flex items-start gap-2"><span className="text-teal-600 font-bold">Professional:</span> One stretch service session per week or biweekly</li>
              </ul>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-bold text-slate-900 font-heading">Active Lifestyles and Athletes</h3>
              <ul className="mt-3 space-y-2 text-sm text-slate-700">
                <li className="flex items-start gap-2"><span className="text-teal-600 font-bold">Pre-workout:</span> 10-minute <Link href={getServiceUrl(services[3])} className="text-teal-600 underline">dynamic stretch</Link> warm-up before every session</li>
                <li className="flex items-start gap-2"><span className="text-teal-600 font-bold">Post-workout:</span> 15-minute <Link href={getServiceUrl(services[5])} className="text-teal-600 underline">static stretch</Link> cool-down after every session</li>
                <li className="flex items-start gap-2"><span className="text-teal-600 font-bold">Rest days:</span> 20-minute full-body flexibility routine</li>
                <li className="flex items-start gap-2"><span className="text-teal-600 font-bold">Professional:</span> One to two <Link href={getServiceUrl(services[1])} className="text-teal-600 underline">PNF stretch service</Link> sessions per week</li>
              </ul>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-bold text-slate-900 font-heading">Desk Workers and NYC Commuters</h3>
              <ul className="mt-3 space-y-2 text-sm text-slate-700">
                <li className="flex items-start gap-2"><span className="text-teal-600 font-bold">Morning:</span> 10-minute routine targeting hips, back, and shoulders</li>
                <li className="flex items-start gap-2"><span className="text-teal-600 font-bold">Every 2 hrs:</span> 5-minute <Link href="/stretching-101/stretching-for-desk-workers" className="text-teal-600 underline">desk stretch break</Link></li>
                <li className="flex items-start gap-2"><span className="text-teal-600 font-bold">Lunch:</span> 15-minute walk and stretch routine</li>
                <li className="flex items-start gap-2"><span className="text-teal-600 font-bold">Professional:</span> Weekly stretch service session ($89/session with 10% off)</li>
              </ul>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-bold text-slate-900 font-heading">Seniors and Active Agers (60+)</h3>
              <ul className="mt-3 space-y-2 text-sm text-slate-700">
                <li className="flex items-start gap-2"><span className="text-teal-600 font-bold">Morning:</span> 15-minute <Link href="/stretching-101/stretching-for-seniors" className="text-teal-600 underline">gentle stretch routine</Link> daily</li>
                <li className="flex items-start gap-2"><span className="text-teal-600 font-bold">Midday:</span> 10-minute chair stretches and balance exercises</li>
                <li className="flex items-start gap-2"><span className="text-teal-600 font-bold">Evening:</span> 10-minute relaxation stretches before bed</li>
                <li className="flex items-start gap-2"><span className="text-teal-600 font-bold">Professional:</span> Weekly <Link href={getServiceUrl(services[9])} className="text-teal-600 underline">gentle stretch service</Link> session</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ COMMON MYTHS DEBUNKED ═══ */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-3xl font-bold text-slate-900 font-heading text-center">10 Stretching Myths Debunked</h2>
          <p className="mt-4 text-center text-slate-600 max-w-3xl mx-auto">
            Misinformation about stretching is everywhere — from outdated gym advice to social media fitness influencers. Here are the most common myths our stretch service therapists encounter, corrected with current sports science.
          </p>
          <div className="mt-10 space-y-6">
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-bold text-red-600 font-heading">Myth #1: You should always stretch before exercise</h3>
              <p className="mt-2 text-base text-slate-700"><strong className="text-teal-700">The truth:</strong> Static stretching before exercise can temporarily reduce power output by 3-5% and does not prevent injury. What you should do before exercise is <Link href={getServiceUrl(services[3])} className="text-teal-600 underline hover:text-teal-700">dynamic stretching</Link> — controlled movements that warm up muscles and prepare joints for activity. Save static stretching for after your workout. A professional stretch service therapist always sequences techniques in the right order for your activity.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-bold text-red-600 font-heading">Myth #2: Stretching should hurt to be effective</h3>
              <p className="mt-2 text-base text-slate-700"><strong className="text-teal-700">The truth:</strong> Stretching should feel like mild tension or mild discomfort — never sharp pain. If you feel pain, you are overstretching, which activates the stretch reflex (your body&apos;s protective mechanism that actually tightens the muscle). Effective stretching exists in the zone of mild discomfort where the muscle can gradually relax and lengthen. A professional <Link href={getServiceUrl(services[0])} className="text-teal-600 underline hover:text-teal-700">assisted stretch service</Link> therapist is trained to find this sweet spot.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-bold text-red-600 font-heading">Myth #3: If you are flexible, you do not need to stretch</h3>
              <p className="mt-2 text-base text-slate-700"><strong className="text-teal-700">The truth:</strong> Flexibility without stretching maintenance deteriorates quickly. Hypermobile individuals actually need stretching even more — but they need active stretching and stability work, not just passive lengthening. Flexibility is &quot;use it or lose it.&quot; Even naturally flexible people lose range of motion with age, inactivity, and repetitive postures like desk sitting. Regular stretch service sessions help maintain and improve flexibility regardless of your baseline.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-bold text-red-600 font-heading">Myth #4: Bouncing during stretches helps you get deeper</h3>
              <p className="mt-2 text-base text-slate-700"><strong className="text-teal-700">The truth:</strong> Bouncing (ballistic movement) during static stretches activates the stretch reflex, which causes the muscle to contract rather than relax — the opposite of what you want. Uncontrolled bouncing can also cause micro-tears in muscle fibers. <Link href={getServiceUrl(services[10])} className="text-teal-600 underline hover:text-teal-700">Ballistic stretching</Link> does exist as a legitimate technique, but it is an advanced method that should only be performed under professional supervision with athletes who have an established flexibility base.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-bold text-red-600 font-heading">Myth #5: Stretching is only for athletes and yoga people</h3>
              <p className="mt-2 text-base text-slate-700"><strong className="text-teal-700">The truth:</strong> Stretching is for every human body. In fact, the people who benefit most from stretch service are not athletes — they are desk workers, commuters, seniors, and anyone with chronic pain from sedentary lifestyles. NYC desk workers who sit 8-10 hours daily develop shortened hip flexors, rounded shoulders, and compressed spinal discs that cause pain, reduce mobility, and accelerate degeneration. <Link href="/stretching-101/stretching-for-desk-workers" className="text-teal-600 underline hover:text-teal-700">Stretching for desk workers</Link> is arguably more important than stretching for athletes.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-bold text-red-600 font-heading">Myth #6: You can get the same results stretching alone as with a therapist</h3>
              <p className="mt-2 text-base text-slate-700"><strong className="text-teal-700">The truth:</strong> Self-stretching is limited by your own strength, range of motion, and the fact that your muscles resist their own stretch. A professional stretch service therapist can access muscles and angles impossible to reach alone, apply techniques like <Link href={getServiceUrl(services[1])} className="text-teal-600 underline hover:text-teal-700">PNF stretching</Link> that require a trained partner, and monitor your body&apos;s response in real time. Studies show therapist-assisted stretching produces 2-3x greater flexibility gains than self-stretching alone.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-bold text-red-600 font-heading">Myth #7: Stretching takes too long to see results</h3>
              <p className="mt-2 text-base text-slate-700"><strong className="text-teal-700">The truth:</strong> Most clients feel immediate relief after their very first professional stretch service session. Measurable flexibility improvements typically appear after 3-4 consistent sessions. A 2019 study found that daily hamstring stretching increased range of motion by an average of 19% in just four weeks. The key is consistency — even 10 minutes daily produces significant results within two weeks.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-bold text-red-600 font-heading">Myth #8: Older adults should not stretch because their joints are too fragile</h3>
              <p className="mt-2 text-base text-slate-700"><strong className="text-teal-700">The truth:</strong> Older adults should stretch MORE, not less. Age-related stiffness is largely due to reduced activity and fascial dehydration — not joint fragility. Gentle, appropriate stretching improves joint health, reduces fall risk by 36%, manages arthritis symptoms, and helps maintain independence. Our <Link href={getServiceUrl(services[9])} className="text-teal-600 underline hover:text-teal-700">gentle stretch service</Link> program is specifically designed for adults 60+ with extra care, slow movements, and chair-assisted options.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-bold text-red-600 font-heading">Myth #9: Foam rolling is the same as stretching</h3>
              <p className="mt-2 text-base text-slate-700"><strong className="text-teal-700">The truth:</strong> <Link href={getServiceUrl(services[7])} className="text-teal-600 underline hover:text-teal-700">Foam rolling</Link> is a self-myofascial release technique — it targets the fascia (connective tissue) rather than the muscle fibers themselves. While foam rolling is an excellent complement to stretching (and we teach it as part of our stretch service), it does not produce the same flexibility gains as sustained static or PNF stretching. The best approach is to foam roll tight areas first to release fascial restrictions, then stretch the underlying muscles for maximum lengthening.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-bold text-red-600 font-heading">Myth #10: Once you are flexible, you stay flexible forever</h3>
              <p className="mt-2 text-base text-slate-700"><strong className="text-teal-700">The truth:</strong> Flexibility is a &quot;use it or lose it&quot; quality. If you stop stretching, your muscles and fascia will gradually return to their shortened state within 2-4 weeks. This is why we recommend ongoing weekly stretch service sessions — they maintain the flexibility gains you have worked hard to achieve and prevent the gradual tightening that leads to pain and injury. Think of stretching like brushing your teeth: it is a lifelong practice, not a one-time fix.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ PROFESSIONAL VS DIY ═══ */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-3xl font-bold text-slate-900 font-heading">When to See a Professional Stretch Service Therapist vs. DIY</h2>
          <div className="mt-6 space-y-5 text-base leading-relaxed text-slate-700">
            <p>
              Self-stretching at home is valuable and we encourage it — every one of our <Link href="/stretching-101/daily-stretching-routine" className="text-teal-600 underline hover:text-teal-700">daily stretching routine</Link> guides is designed for independent practice. However, there are specific situations where professional stretch service is dramatically more effective, and in some cases necessary for safe progress.
            </p>
            <p>
              Think of self-stretching as brushing your teeth and professional stretch service as going to the dentist. You should brush daily, but you also need professional cleaning and examination regularly. Self-stretching maintains your baseline, prevents minor tightness from accumulating, and keeps you feeling good between sessions. Professional stretch service breaks through plateaus, addresses deep restrictions you cannot reach alone, corrects muscle imbalances you may not even be aware of, and accelerates your progress dramatically.
            </p>
          </div>
          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-bold text-teal-700 font-heading">Self-Stretching Is Great For:</h3>
              <ul className="mt-3 space-y-2 text-sm text-slate-700">
                <li>&#10003; Daily maintenance between professional sessions</li>
                <li>&#10003; Morning wake-up routines</li>
                <li>&#10003; Pre and post-workout warm-up and cool-down</li>
                <li>&#10003; Desk breaks during the workday</li>
                <li>&#10003; Mild tension relief after a long commute</li>
                <li>&#10003; Evening wind-down before bed</li>
                <li>&#10003; General flexibility maintenance</li>
              </ul>
            </div>
            <div className="rounded-xl border border-teal-300 bg-teal-50 p-6">
              <h3 className="text-lg font-bold text-teal-700 font-heading">Professional Stretch Service Is Essential For:</h3>
              <ul className="mt-3 space-y-2 text-sm text-teal-800">
                <li>&#10003; Chronic pain that self-stretching does not resolve</li>
                <li>&#10003; Flexibility plateaus you cannot break through alone</li>
                <li>&#10003; Post-surgery or post-injury rehabilitation</li>
                <li>&#10003; Muscle imbalances and compensatory patterns</li>
                <li>&#10003; Deep fascial restrictions (<Link href={getServiceUrl(services[6])} className="text-teal-600 underline">myofascial release</Link>)</li>
                <li>&#10003; PNF stretching (requires a trained partner)</li>
                <li>&#10003; Athletic performance optimization</li>
                <li>&#10003; Senior fall prevention and mobility</li>
                <li>&#10003; Rapid results — 2-3x faster than self-stretching</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ EXPLORE GUIDES ═══ */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-3xl font-bold text-slate-900 font-heading text-center">Explore Our In-Depth Stretching Guides</h2>
          <p className="mt-4 text-center text-slate-600 max-w-3xl mx-auto">
            Each guide below is a comprehensive, standalone resource with step-by-step instructions, hold times, repetitions, common mistakes, and modifications. Written by our certified stretch service therapists with decades of combined experience.
          </p>
          <div className="mt-10 space-y-6">
            <Link href="/stretching-101/daily-stretching-routine" className="block rounded-xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="sm:flex sm:items-start sm:gap-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 font-heading">Daily Stretching Routine — Must-Do Stretches by Age</h3>
                  <p className="mt-2 text-base text-slate-600">Complete morning, midday, and evening routines organized by age group (18-30, 30-45, 45-60, 60+). Each stretch includes step-by-step instructions, target muscles, hold times, reps, common mistakes, and modifications. Over 40 stretches with professional guidance.</p>
                  <span className="mt-3 inline-block text-sm font-semibold text-teal-600 font-cta">Read the full guide &rarr;</span>
                </div>
              </div>
            </Link>
            <Link href="/stretching-101/stretching-for-back-pain" className="block rounded-xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="sm:flex sm:items-start sm:gap-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 font-heading">Stretching for Back Pain NYC — Professional Relief Guide</h3>
                  <p className="mt-2 text-base text-slate-600">The 10 best stretches for lower back pain, upper back and thoracic stretches, NYC-specific back pain triggers (desk work, subway, walking), and when self-stretching is not enough. Includes professional stretch service recommendations for chronic back pain.</p>
                  <span className="mt-3 inline-block text-sm font-semibold text-teal-600 font-cta">Read the full guide &rarr;</span>
                </div>
              </div>
            </Link>
            <Link href="/stretching-101/stretching-for-athletes" className="block rounded-xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="sm:flex sm:items-start sm:gap-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 font-heading">Stretching for Athletes NYC — Performance and Recovery Guide</h3>
                  <p className="mt-2 text-base text-slate-600">Pre-workout dynamic routines, post-workout static protocols, sport-specific stretching for runners, cyclists, basketball, tennis, swimming, and CrossFit. PNF stretching for athletes and recovery protocols for Central Park runners and Brooklyn cyclists.</p>
                  <span className="mt-3 inline-block text-sm font-semibold text-teal-600 font-cta">Read the full guide &rarr;</span>
                </div>
              </div>
            </Link>
            <Link href="/stretching-101/stretching-for-seniors" className="block rounded-xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="sm:flex sm:items-start sm:gap-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 font-heading">Stretching for Seniors NYC — Safe Mobility and Fall Prevention</h3>
                  <p className="mt-2 text-base text-slate-600">Chair stretching routines, standing stretches with support, balance exercises, fall prevention through flexibility, arthritis-friendly techniques, and when to use professional gentle stretch service. Complete guide for adults 60+ in New York City.</p>
                  <span className="mt-3 inline-block text-sm font-semibold text-teal-600 font-cta">Read the full guide &rarr;</span>
                </div>
              </div>
            </Link>
            <Link href="/stretching-101/stretching-for-desk-workers" className="block rounded-xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="sm:flex sm:items-start sm:gap-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 font-heading">Stretching for Desk Workers NYC — Office Stretch Guide</h3>
                  <p className="mt-2 text-base text-slate-600">Tech neck fixes, lower back stretches for sitting, hip flexor openers, shoulder and chest stretches, wrist stretches for typing, 5-minute desk routines, 15-minute lunch break routines, and corporate wellness programs for NYC offices.</p>
                  <span className="mt-3 inline-block text-sm font-semibold text-teal-600 font-cta">Read the full guide &rarr;</span>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* ═══ STRETCH SERVICE TYPES QUICK LINKS ═══ */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-3xl font-bold text-slate-900 font-heading text-center">Our 11 Stretch Service Types</h2>
          <p className="mt-4 text-center text-slate-600 max-w-3xl mx-auto">
            Every stretch service session is customized using one or more of these techniques. Your therapist selects the right combination based on your body, goals, and needs.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <Link key={service.slug} href={getServiceUrl(service)} className="rounded-xl border border-slate-200 bg-white p-4 hover:shadow-md transition-shadow">
                <h3 className="font-bold text-slate-900 font-heading">{service.name}</h3>
                <p className="mt-1 text-xs text-slate-500">{service.shortDesc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ LOCATIONS AND PARKS ═══ */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-3xl font-bold text-slate-900 font-heading text-center">Stretch Service Across All Five NYC Boroughs</h2>
          <p className="mt-4 text-center text-slate-600 max-w-3xl mx-auto">
            Our mobile stretch service therapists come to your home, office, hotel, or favorite park anywhere in New York City. We serve every neighborhood in all five boroughs — including outdoor sessions at 50+ iconic NYC parks.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <Link href="/locations/manhattan" className="rounded-xl border border-slate-200 bg-white p-4 text-center hover:shadow-md transition-shadow">
              <h3 className="font-bold text-slate-900 font-heading">Manhattan</h3>
              <p className="mt-1 text-xs text-slate-500">Midtown, UWS, UES, FiDi, Chelsea, SoHo &amp; more</p>
            </Link>
            <Link href="/locations/brooklyn" className="rounded-xl border border-slate-200 bg-white p-4 text-center hover:shadow-md transition-shadow">
              <h3 className="font-bold text-slate-900 font-heading">Brooklyn</h3>
              <p className="mt-1 text-xs text-slate-500">Williamsburg, Park Slope, DUMBO, Heights &amp; more</p>
            </Link>
            <Link href="/locations/queens" className="rounded-xl border border-slate-200 bg-white p-4 text-center hover:shadow-md transition-shadow">
              <h3 className="font-bold text-slate-900 font-heading">Queens</h3>
              <p className="mt-1 text-xs text-slate-500">Astoria, LIC, Flushing, Forest Hills &amp; more</p>
            </Link>
            <Link href="/locations/bronx" className="rounded-xl border border-slate-200 bg-white p-4 text-center hover:shadow-md transition-shadow">
              <h3 className="font-bold text-slate-900 font-heading">The Bronx</h3>
              <p className="mt-1 text-xs text-slate-500">Riverdale, Fordham, Pelham Bay &amp; more</p>
            </Link>
            <Link href="/locations/staten-island" className="rounded-xl border border-slate-200 bg-white p-4 text-center hover:shadow-md transition-shadow">
              <h3 className="font-bold text-slate-900 font-heading">Staten Island</h3>
              <p className="mt-1 text-xs text-slate-500">St. George, Todt Hill, Great Kills &amp; more</p>
            </Link>
          </div>
          <div className="mt-6 text-center">
            <Link href="/parks" className="text-sm font-semibold text-teal-600 hover:text-teal-700 font-cta">See all 50+ NYC parks where we offer outdoor stretch service &rarr;</Link>
          </div>
        </div>
      </section>

      {/* ═══ FAQ ═══ */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-3xl font-bold text-slate-900 font-heading text-center">Stretching 101 — Frequently Asked Questions</h2>
          <p className="mt-4 text-center text-slate-600 max-w-3xl mx-auto">
            Our stretch service therapists answer the most common stretching questions we hear from clients across New York City.
          </p>
          <div className="mt-10 space-y-4">
            {faqs.map((faq) => (
              <details key={faq.question} className="group rounded-xl border border-slate-200 bg-white">
                <summary className="flex cursor-pointer items-center justify-between p-6 text-base font-semibold text-slate-900 font-heading">
                  {faq.question}
                  <span className="ml-4 shrink-0 text-teal-600 transition-transform group-open:rotate-45">+</span>
                </summary>
                <div className="px-6 pb-6 text-sm leading-relaxed text-slate-700">{faq.answer}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FINAL CTA ═══ */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 py-20">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-3xl px-6 text-center">
          <div className="mb-6 flex justify-center">
          </div>
          <h2 className="text-3xl font-bold text-white sm:text-4xl font-heading">
            Ready to Experience Professional Stretch Service?
          </h2>
          <p className="mt-4 text-lg text-teal-100">
            Stop guessing with self-stretching. Our certified therapists bring professional-grade stretch service directly to your NYC location — home, office, hotel, or park. <strong className="text-white">$99/hr | 10% off weekly at $89/session.</strong>
          </p>
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
          <p className="mt-4 text-sm text-teal-200">All five boroughs | 7AM-10PM daily | Same-day appointments | No contracts</p>
        </div>
      </section>
    </>
  );
}
