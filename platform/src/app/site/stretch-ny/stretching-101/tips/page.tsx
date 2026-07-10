import Link from "next/link";
import type { Metadata } from "next";
import { services, getServiceUrl, SITE_URL, SITE_SMS_LINK, SITE_PHONE, SITE_PHONE_LINK } from "@/app/site/stretch-ny/_lib/siteData";
import { JsonLd, webPageSchema, breadcrumbSchema, faqSchema } from "@/app/site/stretch-ny/_lib/schema";
import Logo from "@/app/site/stretch-ny/_components/Logo";

export const metadata: Metadata = {
  title: "100+ Stretching Tips | The Ultimate Guide by Age & Activity",
  description:
    "The most comprehensive stretching guide online. 100+ tips organized by age group, activity, body part, and time of day. Daily routines, must-do stretches, professional techniques. Free guide from Stretch NYC.",
  alternates: { canonical: `${SITE_URL}/stretching-101/tips` },
};

const tipsFaqs = [
  {
    question: "How often should I stretch?",
    answer:
      "For optimal results, stretch daily. A minimum of three to four days per week maintains baseline flexibility, but daily stretching produces the best improvements. Morning stretching wakes up your nervous system and lubricates joints, while evening stretching promotes better sleep quality. If you can only stretch once a day, choose the time that addresses your biggest issue: morning for stiffness, midday for desk tension, or evening for recovery and relaxation. Professional assisted stretch sessions once or twice per week accelerate results dramatically.",
  },
  {
    question: "Is it safe to stretch every day?",
    answer:
      "Yes, daily stretching is safe and recommended for most people. The key is to vary intensity and avoid overstretching the same muscle group aggressively two days in a row. Gentle static stretching and light dynamic movement are safe every day. More intense PNF stretching or deep fascial work should be spaced at least 48 hours apart to allow tissue adaptation. Listen to your body: mild tension during a stretch is normal and productive, but sharp pain means you should stop immediately and consult a professional.",
  },
  {
    question: "How long should I hold a stretch?",
    answer:
      "Research shows that 30 seconds is the minimum effective hold time for static stretches, with 45 to 60 seconds producing significantly better results. Holds under 15 seconds produce negligible flexibility improvements. For seniors and those with very tight muscles, holds of 60 to 90 seconds may be necessary to allow the Golgi tendon organs to signal the muscle to relax. Dynamic stretches are not held at all but rather performed as controlled movements through the full range of motion for 8 to 12 repetitions per movement.",
  },
  {
    question: "Should I stretch before or after exercise?",
    answer:
      "Both, but with different types of stretching. Before exercise, use dynamic stretching: controlled movements through your full range of motion that warm up muscles and activate your nervous system. Studies show dynamic stretching before activity improves performance by 5 to 10 percent and reduces injury risk. After exercise, use static stretching: sustained holds of 30 to 60 seconds that help muscles return to resting length, reduce soreness, and improve long-term flexibility. Never perform aggressive static stretching on cold muscles before intense exercise.",
  },
  {
    question: "Can stretching help me lose weight?",
    answer:
      "Stretching alone does not burn significant calories for weight loss. However, it supports weight loss indirectly in several important ways. Improved flexibility allows you to exercise more effectively and with less pain, meaning you can train harder and more consistently. Stretching reduces cortisol levels, which helps regulate appetite and fat storage. Better mobility means more daily movement, which increases total daily energy expenditure. And improved sleep quality from evening stretching supports hormonal balance that regulates metabolism.",
  },
  {
    question: "What is the difference between static and dynamic stretching?",
    answer:
      "Static stretching involves holding a position for 30 to 60 seconds, allowing the muscle to gradually lengthen. It is best used after exercise or as a standalone flexibility session. Dynamic stretching involves controlled movements through your full range of motion without holding any position. It is best used as a warm-up before physical activity. Both types are important and serve different purposes. A complete flexibility program includes both: dynamic before activity and static after activity.",
  },
  {
    question: "What is PNF stretching and why is it more effective?",
    answer:
      "PNF stands for Proprioceptive Neuromuscular Facilitation. It is the most effective stretching technique scientifically documented, producing two to three times greater flexibility gains than static stretching alone. PNF works by alternating between muscle contraction and relaxation to trick your nervous system into allowing deeper stretches. The most common technique is contract-relax: you stretch to your limit, then contract the stretched muscle against resistance for 6 seconds, then relax and stretch deeper. PNF requires a trained partner or therapist, which is why professional stretch services produce faster results.",
  },
  {
    question: "Can I stretch too much?",
    answer:
      "Yes, overstretching is possible and counterproductive. Stretching a muscle beyond its capacity can cause microtears, inflammation, and a protective tightening response that actually decreases flexibility. Signs of overstretching include sharp or burning pain during the stretch, increased soreness or stiffness the next day, bruising, and decreased range of motion. A proper stretch should feel like mild to moderate tension, never sharp pain. The stretch sensation should gradually decrease during the hold as the muscle relaxes. If tension increases during a hold, you are stretching too aggressively.",
  },
  {
    question: "Is stretching good for back pain?",
    answer:
      "Stretching is one of the most effective non-pharmaceutical treatments for back pain, but the key is stretching the right muscles. Most back pain is caused by tight hip flexors, hamstrings, and piriformis muscles that pull the pelvis out of alignment, not by tight back muscles themselves. Stretching the hip flexors, hamstrings, glutes, and piriformis often relieves back pain more effectively than stretching the back directly. A professional stretch therapist can identify which specific muscles are contributing to your pain pattern and target them precisely.",
  },
  {
    question: "At what age should I start stretching regularly?",
    answer:
      "The ideal time to start a regular stretching practice is in your teens or twenties, when your body is most adaptable. However, it is never too late to start. People in their 60s, 70s, and 80s can make significant flexibility improvements with consistent practice. The key difference is that older adults should begin more gently, hold stretches longer, and progress more gradually. Studies show that adults over 65 who stretch regularly have 30 percent fewer falls and maintain independence longer than those who do not stretch.",
  },
  {
    question: "Should I stretch if my muscles are sore?",
    answer:
      "Gentle stretching can help with delayed onset muscle soreness by increasing blood flow and reducing muscle stiffness. However, the key word is gentle. Do not aggressively stretch muscles that are very sore, as this can increase inflammation and delay recovery. Light static stretching at about 50 percent of your normal intensity, combined with gentle movement, helps more than complete rest. If soreness lasts more than 72 hours or is accompanied by swelling, consult a healthcare professional.",
  },
  {
    question: "Can stretching improve my posture?",
    answer:
      "Absolutely. Poor posture is almost always caused by muscle imbalances: tight muscles in the chest, hip flexors, and neck pulling the body forward, combined with weak muscles in the upper back and glutes. Stretching the tight muscles while strengthening the weak ones is the most effective posture correction strategy. Specifically, stretching the pectorals, hip flexors, and neck flexors while strengthening the rhomboids, lower trapezius, and deep core muscles creates balanced alignment. Most people see noticeable posture improvement within four to six weeks of consistent targeted stretching.",
  },
  {
    question: "Is yoga the same as stretching?",
    answer:
      "Yoga includes stretching but is much broader. Yoga combines flexibility work with strength, balance, breathwork, and meditative practice. Stretching is more targeted and specific: you can focus precisely on the muscles that need the most attention without spending time on poses that do not address your particular limitations. Professional assisted stretching is the most targeted approach of all, because a trained therapist can identify and address your specific restrictions in ways that neither yoga nor solo stretching can achieve.",
  },
  {
    question: "Do I need to warm up before stretching?",
    answer:
      "For static stretching, yes. Cold muscles are less elastic and more prone to strain. A five-minute warm-up of light walking, marching in place, or arm circles raises muscle temperature and blood flow sufficiently. Dynamic stretching, on the other hand, serves as both warm-up and stretch, which is why it is recommended before exercise. The exception is very gentle, slow stretching in the morning: you can perform light stretches without warming up first, as long as you do not push deeply and respect your body's morning stiffness.",
  },
  {
    question: "How long does it take to become flexible?",
    answer:
      "Noticeable flexibility improvements typically occur within two to four weeks of consistent daily stretching. Significant changes in range of motion take six to twelve weeks. Achieving advanced flexibility goals like full splits can take six months to over a year, depending on your starting point and genetics. Consistency is far more important than intensity: stretching for 10 minutes daily produces better results than one hour-long session per week. Professional PNF stretching can accelerate these timelines by 50 percent or more.",
  },
  {
    question: "Can stretching help with anxiety and stress?",
    answer:
      "Yes. Stretching activates the parasympathetic nervous system, which is your body's rest-and-digest response. Deep, slow stretching combined with controlled breathing lowers cortisol levels, reduces heart rate, and decreases blood pressure. Studies have shown that just 10 minutes of stretching reduces perceived stress levels by 20 to 30 percent. Stretching areas where you hold tension, particularly the neck, shoulders, and hips, is especially effective for stress relief. Many of our NYC clients report that their stretch sessions are the most relaxing hour of their week.",
  },
  {
    question: "Is it normal to shake during a stretch?",
    answer:
      "Mild shaking or trembling during a stretch is common and usually not a concern. It typically indicates that your muscles are working near the limit of their current strength or flexibility. Neuromuscular fatigue causes the muscle fibers to fire unevenly, creating the shaking sensation. If the shaking is mild, you can continue the stretch. If it is intense or accompanied by pain, ease out of the stretch slightly. Over time, as your muscles adapt, the shaking will decrease. Consistent stretching progressively reduces this response.",
  },
  {
    question: "Can stretching help with headaches?",
    answer:
      "Many headaches, particularly tension headaches and cervicogenic headaches, respond very well to stretching. Tight muscles in the neck, shoulders, and upper back can refer pain to the head. Stretching the upper trapezius, levator scapulae, suboccipital muscles, and SCM (sternocleidomastoid) can provide immediate headache relief for many people. Regular stretching of these areas can reduce the frequency of tension headaches by 50 percent or more. If you experience frequent headaches, a professional stretch therapist can identify and address the specific muscle tension patterns causing them.",
  },
  {
    question: "Should I stretch on rest days?",
    answer:
      "Yes, rest days are actually ideal for stretching. On rest days, your muscles are not fatigued from exercise, so you can focus on deeper, more sustained flexibility work. Gentle stretching on rest days promotes recovery by increasing blood flow to muscles, reducing residual soreness, and preventing stiffness from inactivity. A 15 to 20 minute stretching routine on rest days keeps your muscles supple and ready for your next workout while also supporting your overall recovery.",
  },
  {
    question: "What should I do if a stretch causes pain?",
    answer:
      "Stop immediately. There is an important difference between the mild discomfort of a good stretch and actual pain. A productive stretch feels like moderate tension that gradually eases as you hold the position. Pain, especially sharp, shooting, or burning sensations, means something is wrong. If you experience pain, ease out of the stretch, try a gentler modification, or skip that stretch entirely. Persistent pain after stretching should be evaluated by a healthcare professional. A certified stretch therapist can help you find the right intensity and technique for your body.",
  },
  {
    question: "Can stretching replace massage?",
    answer:
      "Stretching and massage address overlapping but different issues. Stretching improves muscle length, range of motion, and neuromuscular coordination. Massage addresses muscle knots, adhesions, and deep tissue tension. Professional assisted stretching, particularly techniques like myofascial release, bridges the gap between the two. For most people, a combination of regular stretching and periodic professional bodywork produces the best results. Many of our clients find that assisted stretch sessions provide both the flexibility benefits of stretching and the tension relief of massage.",
  },
  {
    question: "How does stretching improve sleep?",
    answer:
      "Stretching before bed improves sleep through several mechanisms. First, it activates the parasympathetic nervous system, shifting your body from fight-or-flight mode into rest-and-digest mode. Second, it releases physical tension that can keep you tossing and turning. Third, the rhythmic breathing used during stretching signals to your brain that it is time to wind down. Studies show that 10 minutes of gentle stretching before bed reduces the time it takes to fall asleep by 30 percent and improves overall sleep quality scores. Focus on gentle hip, hamstring, and upper back stretches for the best sleep benefits.",
  },
  {
    question: "Is stretching safe during pregnancy?",
    answer:
      "Gentle stretching is generally safe and beneficial during pregnancy, but with important modifications. Avoid deep backbends, lying flat on your back after the first trimester, and any position that feels uncomfortable. The hormone relaxin increases joint laxity during pregnancy, so it is important not to overstretch. Focus on hip openers, gentle hamstring stretches, and upper back stretches to address common pregnancy discomforts. Always consult your healthcare provider before starting a stretching program during pregnancy, and consider working with a stretch therapist experienced in prenatal care.",
  },
  {
    question: "What is the best time of day to stretch?",
    answer:
      "The best time to stretch is whenever you will actually do it consistently. However, different times offer different benefits. Morning stretching combats overnight stiffness and sets a positive tone for the day. Midday stretching counteracts desk posture and gives you an energy boost. Pre-workout dynamic stretching prepares your body for exercise. Post-workout static stretching supports recovery. Evening stretching promotes relaxation and better sleep. If you can only choose one time, evening stretching provides the broadest benefits because your muscles are warmest and most pliable, and the relaxation effect supports sleep.",
  },
  {
    question: "How is professional stretching different from stretching at home?",
    answer:
      "Professional assisted stretching is dramatically more effective than self-stretching for several reasons. First, a therapist can apply precise external force that reaches muscles you cannot access on your own. Second, PNF techniques require a trained partner to provide resistance. Third, when someone else controls the stretch, your muscles can fully relax rather than contracting to maintain the position. Fourth, a therapist can identify muscle imbalances and compensation patterns you would never notice yourself. Most clients report two to three times faster flexibility gains with professional sessions compared to self-stretching alone.",
  },
  {
    question: "How many stretches should I do in a session?",
    answer:
      "A focused stretching session should include 8 to 12 stretches covering all major muscle groups, taking 15 to 30 minutes. If you are short on time, prioritize the areas that are tightest or most relevant to your activities. For a quick 5-minute session, choose 3 to 4 stretches for your most problematic areas. Quality matters more than quantity: holding 6 stretches for 60 seconds each is more effective than rushing through 15 stretches for 15 seconds each. A professional session typically covers 15 to 20 stretches in 60 minutes because the therapist can transition between positions efficiently.",
  },
];

export default function StretchingTipsPage() {
  const pnf = services.find((s) => s.slug === "pnf-stretch-service-in-nyc")!;
  const assisted = services.find((s) => s.slug === "assisted-stretch-service-in-nyc")!;
  const myofascial = services.find((s) => s.slug === "myofascial-release-stretch-service-in-nyc")!;
  const recovery = services.find((s) => s.slug === "recovery-stretch-service-in-nyc")!;
  const gentle = services.find((s) => s.slug === "gentle-stretch-service-in-nyc")!;
  const dynamic = services.find((s) => s.slug === "dynamic-stretch-service-in-nyc")!;
  const passive = services.find((s) => s.slug === "passive-stretch-service-in-nyc")!;
  const staticS = services.find((s) => s.slug === "static-stretch-service-in-nyc")!;
  const active = services.find((s) => s.slug === "active-stretch-service-in-nyc")!;
  const foam = services.find((s) => s.slug === "foam-rolling-stretch-service-in-nyc")!;
  const ballistic = services.find((s) => s.slug === "ballistic-stretch-service-in-nyc")!;

  return (
    <>
      <JsonLd
        data={webPageSchema(
          "100+ Stretching Tips — The Ultimate Guide by Age & Activity",
          "The most comprehensive stretching guide online. 100+ tips organized by age group, activity, body part, and time of day.",
          `${SITE_URL}/stretching-101/tips`
        )}
      />
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", url: SITE_URL },
          { name: "Stretching 101", url: `${SITE_URL}/stretching-101` },
          { name: "100+ Stretching Tips", url: `${SITE_URL}/stretching-101/tips` },
        ])}
      />
      <JsonLd data={faqSchema(tipsFaqs)} />

      {/* ════════════════════════════════════════════════════════════════
          SECTION 1 — HERO
      ════════════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 pt-36 pb-16 sm:pt-44 sm:pb-24">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">
            THE DEFINITIVE STRETCHING RESOURCE
          </p>
          <div className="mb-6 flex justify-center">
          </div>
          <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl font-heading">
            100+ Stretching Tips — <span className="text-teal-200">The Ultimate Guide</span>
          </h1>
          <p className="mx-auto mt-6 max-w-3xl text-lg text-white/80">
            Everything you need to know about stretching, organized by age group, body part, activity, and time of day. Over 100 stretches with step-by-step instructions, breathing cues, common mistakes, and modifications. From science-backed fundamentals to advanced professional techniques, this is the most complete stretching guide you will find anywhere online. Free from Stretch NYC — New York City&apos;s premier mobile stretch service.
          </p>
          <p className="mx-auto mt-4 max-w-xl text-base text-teal-200 font-semibold">
            Professional stretch sessions start at $99/hr — 10% off weekly bookings
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
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          SECTION 2 — TABLE OF CONTENTS
      ════════════════════════════════════════════════════════════════ */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Table of Contents</h2>
          <p className="mt-3 text-center text-base text-slate-600">Jump to any section. Bookmark this page — you will come back to it.</p>
          <nav className="mt-10">
            <ol className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-sm">
              <li><a href="#why-stretching-matters" className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-4 transition-colors hover:border-teal-400"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-700">1</span><span className="font-semibold text-slate-800">Why Stretching Matters — The Science</span></a></li>
              <li><a href="#ages-18-30" className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-4 transition-colors hover:border-teal-400"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-700">2</span><span className="font-semibold text-slate-800">Daily Stretches for Ages 18-30</span></a></li>
              <li><a href="#ages-30-45" className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-4 transition-colors hover:border-teal-400"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-700">3</span><span className="font-semibold text-slate-800">Daily Stretches for Ages 30-45</span></a></li>
              <li><a href="#ages-45-60" className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-4 transition-colors hover:border-teal-400"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-700">4</span><span className="font-semibold text-slate-800">Daily Stretches for Ages 45-60</span></a></li>
              <li><a href="#ages-60-plus" className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-4 transition-colors hover:border-teal-400"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-700">5</span><span className="font-semibold text-slate-800">Daily Stretches for Ages 60+</span></a></li>
              <li><a href="#by-body-part" className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-4 transition-colors hover:border-teal-400"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-700">6</span><span className="font-semibold text-slate-800">Stretching by Body Part</span></a></li>
              <li><a href="#by-activity" className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-4 transition-colors hover:border-teal-400"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-700">7</span><span className="font-semibold text-slate-800">Stretching by Activity</span></a></li>
              <li><a href="#by-time-of-day" className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-4 transition-colors hover:border-teal-400"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-700">8</span><span className="font-semibold text-slate-800">Stretching by Time of Day</span></a></li>
              <li><a href="#nyc-tips" className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-4 transition-colors hover:border-teal-400"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-700">9</span><span className="font-semibold text-slate-800">NYC-Specific Stretching Tips</span></a></li>
              <li><a href="#when-professional" className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-4 transition-colors hover:border-teal-400"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-700">10</span><span className="font-semibold text-slate-800">When Self-Stretching Is Not Enough</span></a></li>
              <li><a href="#faq" className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-4 transition-colors hover:border-teal-400"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-700">11</span><span className="font-semibold text-slate-800">FAQ — 25+ Common Questions Answered</span></a></li>
              <li><a href="#book-now" className="flex items-start gap-3 rounded-lg border border-teal-300 bg-teal-50 p-4 transition-colors hover:border-teal-500"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-600 text-xs font-bold text-white">CTA</span><span className="font-semibold text-teal-800">Book a Professional Stretch — $99/hr</span></a></li>
            </ol>
          </nav>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          SECTION 3 — WHY STRETCHING MATTERS — THE SCIENCE
      ════════════════════════════════════════════════════════════════ */}
      <section id="why-stretching-matters" className="bg-section-white py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 sm:text-4xl font-heading">Why Stretching Matters — The Science</h2>
          <p className="mt-4 text-center text-base text-slate-600">Understanding what happens inside your body when you stretch transforms stretching from a chore into a science-backed superpower.</p>

          <div className="mt-12 space-y-10 text-base leading-relaxed text-slate-700">
            <div>
              <h3 className="text-2xl font-bold text-slate-900 font-heading">Flexibility Physiology: What Actually Happens When You Stretch</h3>
              <p className="mt-4">
                When you hold a stretch, you are not simply pulling on a rubber band. You are engaging a complex neurological and physiological process that involves your muscles, tendons, fascia, and nervous system working in concert. Understanding this process is the difference between stretching effectively and wasting your time.
              </p>
              <p className="mt-4">
                At the most fundamental level, your muscles are made up of units called sarcomeres — the basic contractile unit of muscle tissue. Each sarcomere contains overlapping filaments of actin and myosin that slide past each other to create movement. When you stretch a muscle, you are increasing the distance between these filaments within each sarcomere. Over time, with consistent stretching, your body actually adds new sarcomeres in series at the end of existing muscle fibers, physically lengthening the muscle. This process, called sarcomerogenesis, is the biological basis of lasting flexibility improvements and explains why consistency matters more than intensity.
              </p>
              <p className="mt-4">
                The process of adding new sarcomeres does not happen overnight. Research shows that it takes approximately two to four weeks of consistent daily stretching to begin adding sarcomeres, and six to twelve weeks to see meaningful structural changes. This is why people who stretch sporadically never seem to make progress — they are not stretching consistently enough to trigger sarcomerogenesis. The takeaway is clear: short daily sessions beat long occasional ones.
              </p>
              <p className="mt-4">
                But sarcomeres are only part of the story. Your muscles contain two crucial sensory organs that regulate flexibility: muscle spindles and Golgi tendon organs. Understanding these sensors is key to understanding why certain stretching techniques work better than others, and why professional stretch therapy produces faster results than self-stretching.
              </p>
            </div>

            <div>
              <h3 className="text-2xl font-bold text-slate-900 font-heading">Muscle Spindles and the Stretch Reflex</h3>
              <p className="mt-4">
                Muscle spindles are sensory receptors located within the belly of your muscles, running parallel to the muscle fibers. Their primary job is to detect changes in muscle length and the rate of that change. When a muscle is stretched quickly or forcefully, muscle spindles fire a signal to the spinal cord, which triggers an immediate protective contraction of the muscle. This is called the stretch reflex, and it is the same mechanism that makes your knee jerk when a doctor taps below your kneecap.
              </p>
              <p className="mt-4">
                The stretch reflex is your body&apos;s primary defense against muscle tears. When your body senses that a muscle is being lengthened too quickly, it automatically contracts the muscle to prevent damage. This is why bouncing during a stretch (ballistic stretching without proper training) can actually work against you — each bounce triggers the stretch reflex, causing the muscle to tighten rather than lengthen. It is also why slow, gradual stretching is more effective for most people: by moving slowly into a stretch, you minimize the stretch reflex response and allow the muscle to gradually accept a longer position.
              </p>
              <p className="mt-4">
                The stretch reflex sensitivity adapts over time with consistent stretching. Regular stretchers develop a higher tolerance for muscle lengthening, meaning their muscle spindles fire at a greater muscle length than those of non-stretchers. This neurological adaptation actually accounts for a significant portion of early flexibility gains — before your muscles physically lengthen, your nervous system learns to tolerate greater stretch.
              </p>
            </div>

            <div>
              <h3 className="text-2xl font-bold text-slate-900 font-heading">Golgi Tendon Organs and Autogenic Inhibition</h3>
              <p className="mt-4">
                Golgi tendon organs (GTOs) are sensory receptors located at the junction where your muscle fibers meet the tendon. Unlike muscle spindles, which detect changes in muscle length, GTOs detect changes in muscle tension. When tension in a muscle-tendon unit reaches a certain threshold, GTOs trigger a protective relaxation response called autogenic inhibition. Essentially, when the tension gets too high, your nervous system tells the muscle to let go.
              </p>
              <p className="mt-4">
                This autogenic inhibition response is the scientific basis for PNF stretching and explains why it is the most effective stretching technique available. In a PNF contract-relax sequence, you first stretch a muscle to its limit, then contract it isometrically against resistance for six to ten seconds. This isometric contraction dramatically increases tension in the muscle-tendon unit, powerfully activating the GTOs. When you then relax the contraction, the resulting autogenic inhibition temporarily overrides the stretch reflex, allowing you to stretch significantly deeper than before. This is not a trick or a placebo — it is exploiting a fundamental neurological mechanism that was designed to protect your muscles from tearing under excessive load.
              </p>
              <p className="mt-4">
                The PNF technique essentially tells your nervous system: &ldquo;This muscle just handled very high tension without damage, so it is safe to allow it to lengthen further.&rdquo; This is why a single PNF session can produce flexibility gains that would take weeks of static stretching to achieve. It is also why PNF stretching requires a trained partner or professional therapist — you cannot provide effective isometric resistance against your own stretch. This is one of the most important reasons why professional <Link href={getServiceUrl(pnf)} className="text-teal-600 hover:text-teal-700 underline">PNF stretch service</Link> outperforms self-stretching by such a large margin.
              </p>
            </div>

            <div>
              <h3 className="text-2xl font-bold text-slate-900 font-heading">Fascia Science: The Hidden Key to Flexibility</h3>
              <p className="mt-4">
                For decades, the stretching conversation focused almost exclusively on muscles. But in recent years, fascia has emerged as perhaps the most important factor in flexibility and mobility. Fascia is a continuous web of connective tissue that wraps around every muscle, bone, nerve, organ, and blood vessel in your body. Think of it as a three-dimensional bodysuit that holds everything in place. When fascia is healthy and hydrated, it is supple, slippery, and allows free movement. When it becomes dehydrated, damaged, or restricted, it creates adhesions — essentially internal scar tissue — that bind tissues together and severely limit flexibility.
              </p>
              <p className="mt-4">
                One of the most fascinating discoveries in fascia research is its piezoelectric response. When fascia is compressed or stretched, it generates tiny electrical charges that stimulate the cells within it (called fibroblasts) to remodel and reorganize. Sustained, gentle pressure — like that applied during <Link href={getServiceUrl(myofascial)} className="text-teal-600 hover:text-teal-700 underline">myofascial release</Link> — triggers this piezoelectric response and encourages the fascia to become more supple and organized. This is why myofascial techniques work through different mechanisms than traditional muscle stretching and why they can address restrictions that stretching alone cannot resolve.
              </p>
              <p className="mt-4">
                Fascia hydration is another critical concept. Fascia is approximately 70 percent water, and its pliability depends heavily on maintaining adequate hydration. When you sit in one position for extended periods (like at a desk or during a long flight), the fascia in compressed areas loses water and becomes stiff and sticky. Movement and stretching literally squeeze water back into fascial tissue, restoring its supple quality. This is why you feel stiff after sitting for hours and why even a few minutes of movement dramatically reduces that stiffness. It is also why drinking adequate water supports your flexibility — dehydrated fascia is tight fascia.
              </p>
              <p className="mt-4">
                Fascial adhesions develop gradually from repetitive postures, injuries, inflammation, and lack of movement. Once formed, these adhesions do not respond well to traditional muscle stretching because they involve connective tissue, not muscle tissue. This is where professional <Link href={getServiceUrl(myofascial)} className="text-teal-600 hover:text-teal-700 underline">myofascial release therapy</Link> becomes invaluable. A trained therapist can identify and apply sustained pressure to fascial restrictions that you could never effectively address on your own, breaking up adhesions and restoring tissue glide. Many people who feel &ldquo;permanently tight&rdquo; despite years of stretching actually have fascial restrictions that require hands-on intervention.
              </p>
            </div>

            <div>
              <h3 className="text-2xl font-bold text-slate-900 font-heading">What the Research Says: Flexibility Gains and Injury Prevention</h3>
              <p className="mt-4">
                The body of scientific evidence supporting stretching continues to grow. Here is what the research tells us about the measurable benefits of consistent stretching practice.
              </p>
              <p className="mt-4">
                <strong>Flexibility gains per week:</strong> Studies show that consistent daily stretching of 30 to 60 seconds per muscle group produces measurable flexibility improvements of approximately 1 to 3 degrees of range of motion per week in the targeted joint. This may not sound like much, but over 12 weeks, that translates to 12 to 36 degrees of improvement — which can be the difference between not being able to touch your toes and placing your palms flat on the floor. PNF stretching accelerates this rate, producing gains of 3 to 5 degrees per week when performed two to three times per week with a trained therapist.
              </p>
              <p className="mt-4">
                <strong>Injury prevention:</strong> A 2014 meta-analysis published in the British Journal of Sports Medicine found that stretching programs reduce the overall risk of musculoskeletal injuries by 25 to 30 percent. The effect is even more pronounced for specific injury types: regular hamstring stretching reduces hamstring strain risk by up to 65 percent in athletes, and regular calf stretching reduces Achilles tendon injuries by up to 50 percent. For the general population, maintaining adequate hip and hamstring flexibility reduces lower back injury risk by approximately 40 percent.
              </p>
              <p className="mt-4">
                <strong>Stretching and longevity:</strong> Emerging research is drawing connections between flexibility and longevity that are hard to ignore. A 2020 study published in the Scandinavian Journal of Medicine and Science in Sports found that body flexibility, as measured by a sit-and-reach test, was independently associated with arterial flexibility and cardiovascular health. People with greater musculoskeletal flexibility had more elastic arteries, lower blood pressure, and reduced cardiovascular risk. A separate study in the Journal of Gerontology found that older adults who maintained flexibility through regular stretching had 30 percent fewer falls and 50 percent fewer fall-related injuries compared to age-matched controls.
              </p>
              <p className="mt-4">
                <strong>Stretching and chronic pain:</strong> Research consistently shows that targeted stretching programs reduce chronic pain intensity by 30 to 50 percent across multiple conditions, including chronic lower back pain, neck pain, shoulder impingement, and hip pain. A 2016 Cochrane review found that stretching-based exercise programs were as effective as many pharmaceutical interventions for chronic lower back pain, with fewer side effects and better long-term outcomes.
              </p>
            </div>

            <div>
              <h3 className="text-2xl font-bold text-slate-900 font-heading">Why Professional Stretch Service Outperforms Self-Stretching</h3>
              <p className="mt-4">
                Understanding the science makes it clear why <Link href={getServiceUrl(assisted)} className="text-teal-600 hover:text-teal-700 underline">professional assisted stretching</Link> produces dramatically better results than stretching on your own. When you stretch yourself, your muscles cannot fully relax because they are actively working to hold your body in the stretch position. A professional therapist eliminates this problem entirely: you can lie completely relaxed while they take your muscles through their full range of motion. This allows for deeper stretches with less effort and lower injury risk.
              </p>
              <p className="mt-4">
                Professional stretch therapy also provides access to PNF techniques, the gold standard of flexibility improvement. Since PNF requires isometric contraction against external resistance, it cannot be effectively performed alone. The combination of complete muscle relaxation, precise external force application, and PNF neuromuscular techniques is why clients consistently report two to three times faster flexibility gains with professional sessions compared to self-stretching. Add in the therapist&apos;s ability to identify and address fascial restrictions, muscle imbalances, and compensation patterns, and the case for professional stretch service becomes overwhelming. If you are serious about your flexibility, mobility, and overall wellbeing, a <Link href={getServiceUrl(pnf)} className="text-teal-600 hover:text-teal-700 underline">professional PNF stretch session</Link> is the single highest-impact investment you can make.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          SECTION 4 — DAILY MUST-DO STRETCHES: AGES 18-30
      ════════════════════════════════════════════════════════════════ */}
      <section id="ages-18-30" className="bg-section-teal py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 sm:text-4xl font-heading">Daily Must-Do Stretches for Ages 18-30</h2>
          <p className="mt-4 text-center text-base text-slate-600">Your body is at peak adaptability. Build the flexibility foundation now that will serve you for decades. These are the stretches every young adult should do daily, organized into specific routines for every part of your day.</p>

          <div className="mt-12 space-y-10 text-base leading-relaxed text-slate-700">
            <div>
              <h3 className="text-2xl font-bold text-slate-900 font-heading">Morning Routine: 10 Essential Stretches (15 Minutes)</h3>
              <p className="mt-4">Start every day with this sequence. These ten stretches wake up your nervous system, lubricate your joints, and set the tone for a mobile, pain-free day. Perform them in order — the sequence is designed to progressively open your body from core to extremities.</p>

              <div className="mt-8 space-y-8">
                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <h4 className="text-lg font-bold text-teal-700 font-heading">1. Cat-Cow Stretch</h4>
                  <p className="mt-1 text-sm text-slate-500"><strong>Target muscles:</strong> Erector spinae, rectus abdominis, transverse abdominis, hip flexors, neck extensors and flexors</p>
                  <p className="mt-3"><strong>Step-by-step instructions:</strong></p>
                  <ol className="mt-2 list-decimal pl-6 space-y-2">
                    <li>Start on all fours with your wrists directly under your shoulders and your knees directly under your hips. Spread your fingers wide and press evenly through your entire palm. Your spine should be in a neutral position — neither arched nor rounded — with your gaze directed at the floor between your hands.</li>
                    <li>Inhale slowly through your nose as you drop your belly toward the floor. Lift your sitting bones toward the ceiling, draw your shoulder blades together on your back, and lift your gaze forward and slightly upward. This is the Cow position. Feel the stretch across your entire front body, from your hip flexors through your abdomen to your chest and throat. Do not collapse into your lower back — actively lengthen through your spine.</li>
                    <li>Exhale slowly through your mouth as you round your spine toward the ceiling. Tuck your tailbone under, draw your belly button toward your spine, and let your head hang heavy between your arms. Press firmly through your hands to push the floor away and create maximum roundness in your upper back. This is the Cat position. Feel the stretch across your entire back body.</li>
                    <li>Continue flowing between Cat and Cow for 8 to 10 repetitions, synchronizing each movement with your breath. Move slowly and deliberately, spending a full inhale in Cow and a full exhale in Cat. Try to articulate each vertebra individually as you transition between positions.</li>
                    <li>On the final repetition, return to a neutral spine and pause for two breaths, noticing how your spine feels compared to when you started.</li>
                  </ol>
                  <p className="mt-3 text-sm text-slate-600"><strong>Hold time:</strong> 3-5 seconds at each end position | <strong>Reps:</strong> 8-10 cycles | <strong>Breathing:</strong> Inhale into Cow, exhale into Cat</p>
                  <p className="mt-2 text-sm text-slate-500"><strong>Common mistakes:</strong> Moving too quickly without syncing breath, collapsing weight into wrists instead of distributing through entire hand, only moving the lower back instead of articulating the entire spine. <strong>Modification:</strong> If wrists are sensitive, make fists and rest on your knuckles, or perform on your forearms.</p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <h4 className="text-lg font-bold text-teal-700 font-heading">2. World&apos;s Greatest Stretch</h4>
                  <p className="mt-1 text-sm text-slate-500"><strong>Target muscles:</strong> Hip flexors, hamstrings, thoracic spine rotators, adductors, glutes, quadriceps, lats, pectorals</p>
                  <p className="mt-3"><strong>Step-by-step instructions:</strong></p>
                  <ol className="mt-2 list-decimal pl-6 space-y-2">
                    <li>Begin in a high plank position with your hands directly under your shoulders and your body forming a straight line from head to heels. Engage your core and glutes to prevent your hips from sagging.</li>
                    <li>Step your right foot forward and place it flat on the floor just outside your right hand. Your right knee should be directly over your right ankle, and your left leg should remain extended behind you with your left knee off the ground. You should feel a deep stretch in your left hip flexor.</li>
                    <li>Keeping your left hand firmly planted on the ground, rotate your torso to the right and extend your right arm toward the ceiling. Follow your right hand with your gaze. Hold this rotation for 3 to 5 seconds, breathing deeply. Feel the stretch through your thoracic spine and chest.</li>
                    <li>Bring your right hand back to the ground inside your right foot. Now drop your right elbow toward the ground inside your right foot, gently pressing your right knee outward with your right elbow. Hold for 3 to 5 seconds. This deepens the hip flexor and adductor stretch.</li>
                    <li>Return to the high plank position and repeat the entire sequence on the left side. Complete 3 to 4 repetitions per side, moving slowly and controlled throughout.</li>
                  </ol>
                  <p className="mt-3 text-sm text-slate-600"><strong>Hold time:</strong> 3-5 seconds each position | <strong>Reps:</strong> 3-4 per side | <strong>Breathing:</strong> Exhale into each deeper position</p>
                  <p className="mt-2 text-sm text-slate-500"><strong>Common mistakes:</strong> Letting the back knee drop to the ground (keep it hovering for more hip flexor activation), not rotating the thoracic spine enough, rushing through positions. <strong>Modification:</strong> Drop the back knee to the ground if the full position is too challenging.</p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <h4 className="text-lg font-bold text-teal-700 font-heading">3. 90/90 Hip Switch</h4>
                  <p className="mt-1 text-sm text-slate-500"><strong>Target muscles:</strong> External and internal hip rotators, glutes, piriformis, TFL, adductors</p>
                  <p className="mt-3"><strong>Step-by-step instructions:</strong></p>
                  <ol className="mt-2 list-decimal pl-6 space-y-2">
                    <li>Sit on the floor with both knees bent at 90-degree angles. Your right leg should be in front of you with your right shin roughly parallel to your shoulders, knee bent at 90 degrees. Your left leg should be to your left side, also bent at 90 degrees, with your left shin pointing behind you.</li>
                    <li>Sit tall with your spine long and your chest lifted. Place your hands on the floor on either side of your front leg for balance. You should feel a stretch in your right glute and outer hip, and in your left hip flexor and inner thigh.</li>
                    <li>Hold this position for 5 seconds, then transition: lift both knees off the ground simultaneously and rotate them to the opposite side, so your left leg is now in front and your right leg is behind. This switching motion should come from your hips, not from shifting your torso.</li>
                    <li>Continue switching back and forth for 8 to 10 total repetitions. Each time you settle into a position, take a moment to sit taller and deepen the stretch before switching again.</li>
                    <li>If you feel tightness or restriction on one side, spend an extra 10 seconds in that position before switching. Asymmetries in hip rotation are very common and important to address.</li>
                  </ol>
                  <p className="mt-3 text-sm text-slate-600"><strong>Hold time:</strong> 5 seconds each side | <strong>Reps:</strong> 8-10 switches | <strong>Breathing:</strong> Exhale as you switch, inhale and lengthen spine in the hold</p>
                  <p className="mt-2 text-sm text-slate-500"><strong>Common mistakes:</strong> Leaning too far back instead of staying upright, forcing the knees to the ground (let them hover if needed), rushing the transitions. <strong>Modification:</strong> Place a folded towel under your hip if you cannot sit upright comfortably.</p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <h4 className="text-lg font-bold text-teal-700 font-heading">4. Thoracic Spine Rotation</h4>
                  <p className="mt-1 text-sm text-slate-500"><strong>Target muscles:</strong> Thoracic rotators, obliques, intercostals, rhomboids, pectorals, anterior deltoid</p>
                  <p className="mt-3"><strong>Step-by-step instructions:</strong></p>
                  <ol className="mt-2 list-decimal pl-6 space-y-2">
                    <li>Lie on your left side with your knees stacked and bent at 90 degrees in front of you. Extend both arms straight in front of you at shoulder height, palms together. Your knees should be at hip level.</li>
                    <li>Keeping your knees stacked and pressed together (this locks your lumbar spine and forces the rotation to come from your thoracic spine), slowly lift your right arm up and over your body in a wide arc, following your fingertips with your gaze.</li>
                    <li>Continue the arc until your right arm reaches the floor (or as far as it will go) on the opposite side of your body. Both shoulder blades should be as close to the floor as possible. Your upper body will be open and facing the ceiling while your lower body remains on its side. Hold for 5 to 8 seconds, breathing deeply into your chest.</li>
                    <li>Slowly reverse the arc, bringing your right arm back to meet your left. Repeat 5 to 6 times on this side, then roll over and perform the same sequence on the other side.</li>
                    <li>With each repetition, try to reach slightly further. The rotational range should increase progressively as your thoracic spine warms up.</li>
                  </ol>
                  <p className="mt-3 text-sm text-slate-600"><strong>Hold time:</strong> 5-8 seconds at end range | <strong>Reps:</strong> 5-6 per side | <strong>Breathing:</strong> Inhale as you open, exhale to deepen the rotation</p>
                  <p className="mt-2 text-sm text-slate-500"><strong>Common mistakes:</strong> Allowing the top knee to lift off the bottom knee (this means rotation is coming from the lumbar spine), moving the arm too quickly, holding the breath. <strong>Modification:</strong> Place a pillow between your knees to keep them aligned.</p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <h4 className="text-lg font-bold text-teal-700 font-heading">5. Standing Quad Stretch</h4>
                  <p className="mt-1 text-sm text-slate-500"><strong>Target muscles:</strong> Quadriceps (rectus femoris, vastus lateralis, vastus medialis, vastus intermedius), hip flexors</p>
                  <p className="mt-3"><strong>Step-by-step instructions:</strong></p>
                  <ol className="mt-2 list-decimal pl-6 space-y-2">
                    <li>Stand tall with your feet hip-width apart. You may place one hand on a wall, chair, or doorframe for balance. Engage your core and maintain an upright posture throughout the stretch.</li>
                    <li>Bend your right knee and reach back with your right hand to grasp the top of your right foot or ankle. Keep your knees close together — the right knee should point straight down toward the floor, not out to the side.</li>
                    <li>Gently pull your right heel toward your right glute. As you do this, actively tuck your pelvis under (posterior pelvic tilt) by squeezing your right glute and drawing your belly button toward your spine. This pelvic tuck dramatically increases the hip flexor stretch component.</li>
                    <li>Hold for 30 to 45 seconds, breathing steadily. You should feel a strong stretch along the entire front of your right thigh and into the front of your hip. If you do not feel it in the hip flexor, increase the pelvic tuck.</li>
                    <li>Release slowly and repeat on the left side. Perform twice on each side.</li>
                  </ol>
                  <p className="mt-3 text-sm text-slate-600"><strong>Hold time:</strong> 30-45 seconds | <strong>Reps:</strong> 2 per side | <strong>Breathing:</strong> Slow nasal breathing, exhale to deepen the pelvic tuck</p>
                  <p className="mt-2 text-sm text-slate-500"><strong>Common mistakes:</strong> Arching the lower back (defeats the hip flexor component), letting the stretching knee drift forward or outward, leaning the torso forward. <strong>Modification:</strong> Loop a towel or strap around the foot if you cannot reach your ankle comfortably.</p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <h4 className="text-lg font-bold text-teal-700 font-heading">6. Standing Hamstring Stretch</h4>
                  <p className="mt-1 text-sm text-slate-500"><strong>Target muscles:</strong> Hamstrings (biceps femoris, semitendinosus, semimembranosus), calves (gastrocnemius), lower back (erector spinae)</p>
                  <p className="mt-3"><strong>Step-by-step instructions:</strong></p>
                  <ol className="mt-2 list-decimal pl-6 space-y-2">
                    <li>Stand facing a chair, bench, or low table. Place your right heel on the surface with your leg straight and your toes pointing toward the ceiling. The height should be challenging but not painful — start low and work up over time.</li>
                    <li>Stand tall on your left leg with a slight bend in your left knee. Square your hips so both hip bones point directly forward. Place your hands on your hips or let them rest on your extended leg.</li>
                    <li>Hinge forward from your hips — not from your waist. Keep your back flat and your chest proud as you lean forward. Imagine leading with your sternum toward your toes. You should feel the stretch behind your right thigh.</li>
                    <li>Hold for 30 to 45 seconds. To increase the stretch, flex your right foot (pull toes toward your shin) and continue to hinge deeper from the hips. To decrease, add a slight bend to the extended knee.</li>
                    <li>Return to standing slowly, then repeat on the left side. Perform twice on each side.</li>
                  </ol>
                  <p className="mt-3 text-sm text-slate-600"><strong>Hold time:</strong> 30-45 seconds | <strong>Reps:</strong> 2 per side | <strong>Breathing:</strong> Exhale as you hinge deeper, inhale to maintain position</p>
                  <p className="mt-2 text-sm text-slate-500"><strong>Common mistakes:</strong> Rounding the back instead of hinging from the hips, locking out the standing knee, bouncing at the bottom. <strong>Modification:</strong> Use a lower surface or keep a slight bend in the extended knee until flexibility improves.</p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <h4 className="text-lg font-bold text-teal-700 font-heading">7. Chest Opener (Doorway Stretch)</h4>
                  <p className="mt-1 text-sm text-slate-500"><strong>Target muscles:</strong> Pectoralis major, pectoralis minor, anterior deltoid, biceps (short head)</p>
                  <p className="mt-3"><strong>Step-by-step instructions:</strong></p>
                  <ol className="mt-2 list-decimal pl-6 space-y-2">
                    <li>Stand in a doorway with your arms raised to 90 degrees — elbows at shoulder height, forearms pointing straight up. Place your forearms and palms flat against the doorframe on either side.</li>
                    <li>Stagger your stance with one foot slightly in front of the other for balance. Engage your core and maintain a tall spine throughout the stretch.</li>
                    <li>Slowly lean your body forward through the doorway, keeping your forearms pressed against the frame. You should feel a deep stretch across your chest and the front of your shoulders. Do not push through pain — stop at a comfortable stretch.</li>
                    <li>Hold for 30 to 45 seconds, breathing deeply. With each exhale, try to lean slightly further forward. With each inhale, lift your chest slightly to maintain good posture.</li>
                    <li>To target different fibers of the pectorals, perform additional sets with your arms at different angles: arms lower (45 degrees) targets the upper chest fibers, arms higher (135 degrees) targets the lower chest fibers. Perform 2 repetitions at each angle.</li>
                  </ol>
                  <p className="mt-3 text-sm text-slate-600"><strong>Hold time:</strong> 30-45 seconds | <strong>Reps:</strong> 2 at each arm angle | <strong>Breathing:</strong> Deep diaphragmatic breaths, exhale to lean deeper</p>
                  <p className="mt-2 text-sm text-slate-500"><strong>Common mistakes:</strong> Arching the lower back to create the illusion of a deeper stretch, letting the shoulders shrug up toward the ears, holding the breath. <strong>Modification:</strong> Do one arm at a time if the bilateral stretch is too intense.</p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <h4 className="text-lg font-bold text-teal-700 font-heading">8. Neck Circles</h4>
                  <p className="mt-1 text-sm text-slate-500"><strong>Target muscles:</strong> Sternocleidomastoid, upper trapezius, levator scapulae, scalenes, suboccipitals, platysma</p>
                  <p className="mt-3"><strong>Step-by-step instructions:</strong></p>
                  <ol className="mt-2 list-decimal pl-6 space-y-2">
                    <li>Stand or sit tall with your shoulders relaxed and down away from your ears. Let your arms hang naturally by your sides. Close your eyes if comfortable to increase body awareness.</li>
                    <li>Slowly drop your chin toward your chest. Pause for a breath, feeling the stretch along the back of your neck and upper back.</li>
                    <li>Begin rolling your head to the right, bringing your right ear toward your right shoulder. Do not lift your shoulder to meet your ear. Pause for a breath, feeling the stretch along the left side of your neck.</li>
                    <li>Continue the circle, tilting your head back gently (only go as far as comfortable — do not compress the back of your neck aggressively), then over to the left side, and back to the starting position with chin to chest. This completes one full circle.</li>
                    <li>Perform 5 slow circles to the right, then 5 slow circles to the left. Each full circle should take approximately 10 to 15 seconds. Move slowly enough that you can identify any spots of particular tightness and pause there for an extra breath.</li>
                  </ol>
                  <p className="mt-3 text-sm text-slate-600"><strong>Hold time:</strong> Continuous movement, 10-15 seconds per circle | <strong>Reps:</strong> 5 circles each direction | <strong>Breathing:</strong> Continuous slow breathing throughout</p>
                  <p className="mt-2 text-sm text-slate-500"><strong>Common mistakes:</strong> Moving too quickly, extending too far backward (this compresses cervical vertebrae), tensing the shoulders. <strong>Modification:</strong> Perform semicircles only (ear to ear through chin to chest, skipping the backward tilt) if extension causes discomfort.</p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <h4 className="text-lg font-bold text-teal-700 font-heading">9. Ankle Circles</h4>
                  <p className="mt-1 text-sm text-slate-500"><strong>Target muscles:</strong> Tibialis anterior, peroneals (fibularis), gastrocnemius, soleus, intrinsic foot muscles</p>
                  <p className="mt-3"><strong>Step-by-step instructions:</strong></p>
                  <ol className="mt-2 list-decimal pl-6 space-y-2">
                    <li>Stand on your left foot, lightly holding a wall or chair for balance. Lift your right foot slightly off the ground. Keep your right leg relaxed from the knee down.</li>
                    <li>Slowly draw large circles with your right toes, rotating your ankle through its full range of motion. Move through dorsiflexion (toes up), eversion (toes out), plantarflexion (toes down), and inversion (toes in) in a smooth, continuous circle.</li>
                    <li>Perform 10 circles clockwise, then 10 circles counterclockwise. Focus on making the circles as large as possible, exploring the full range of each ankle movement.</li>
                    <li>Switch to your left ankle and repeat the same sequence. Pay attention to any asymmetries between your ankles — the tighter side needs more work.</li>
                    <li>After circles, add 10 repetitions of pointing your toes down as far as possible, then pulling them up toward your shin as far as possible. This targets dorsiflexion and plantarflexion specifically, two movements critical for walking, running, and squat mechanics.</li>
                  </ol>
                  <p className="mt-3 text-sm text-slate-600"><strong>Hold time:</strong> Continuous movement | <strong>Reps:</strong> 10 circles each direction, each foot | <strong>Breathing:</strong> Natural breathing throughout</p>
                  <p className="mt-2 text-sm text-slate-500"><strong>Common mistakes:</strong> Making tiny circles (go bigger), rotating from the knee instead of the ankle, skipping the counterclockwise direction. <strong>Modification:</strong> Sit in a chair with your foot off the ground if standing balance is an issue.</p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <h4 className="text-lg font-bold text-teal-700 font-heading">10. Wrist Circles</h4>
                  <p className="mt-1 text-sm text-slate-500"><strong>Target muscles:</strong> Wrist flexors, wrist extensors, pronators, supinators, intrinsic hand muscles</p>
                  <p className="mt-3"><strong>Step-by-step instructions:</strong></p>
                  <ol className="mt-2 list-decimal pl-6 space-y-2">
                    <li>Extend both arms in front of you at shoulder height. Make loose fists with both hands.</li>
                    <li>Slowly rotate both wrists in large clockwise circles, moving through full flexion, extension, and side-to-side range. Focus on making the circles as big as your wrists will allow, exploring every degree of available motion.</li>
                    <li>Perform 10 circles clockwise, then 10 circles counterclockwise. You may hear some popping or cracking — this is usually normal and is simply gas being released from the joint capsule.</li>
                    <li>After circles, spread your fingers wide and hold for 5 seconds, then make tight fists and hold for 5 seconds. Repeat this open-close sequence 5 times to mobilize the intrinsic muscles of the hand.</li>
                    <li>Finish by pressing your palms together in front of your chest (prayer position) and slowly lowering your hands while keeping the heels of your palms pressed together, until you feel a stretch in your wrists and forearms. Hold for 15 to 20 seconds.</li>
                  </ol>
                  <p className="mt-3 text-sm text-slate-600"><strong>Hold time:</strong> Continuous movement for circles, 15-20 seconds for prayer stretch | <strong>Reps:</strong> 10 circles each direction | <strong>Breathing:</strong> Natural breathing throughout</p>
                  <p className="mt-2 text-sm text-slate-500"><strong>Common mistakes:</strong> Making tiny, rushed circles, only going in one direction, skipping the finger mobilization. <strong>Modification:</strong> For sensitive wrists, reduce the circle size and avoid the prayer stretch if it causes discomfort.</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-2xl font-bold text-slate-900 font-heading">Pre-Workout Dynamic Routine (10 Minutes)</h3>
              <p className="mt-4">Before any gym session, run, or sport, this dynamic warm-up prepares your muscles for performance and reduces injury risk. These are movement-based stretches — do not hold static positions. For more on the science behind dynamic warm-ups, check out our <Link href={getServiceUrl(dynamic)} className="text-teal-600 hover:text-teal-700 underline">dynamic stretch service</Link>.</p>

              <div className="mt-6 space-y-4">
                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <h4 className="text-lg font-bold text-teal-700 font-heading">1. Leg Swings (Forward/Back)</h4>
                  <p className="mt-2">Stand sideways to a wall, holding it lightly for balance. Swing your outside leg forward and backward like a pendulum, gradually increasing the range with each swing. Keep your torso upright and core engaged. The leg should swing freely from the hip — do not force it higher than your flexibility allows. Perform 15 swings per leg. This mobilizes the hip joint and activates the hip flexors and hamstrings.</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <h4 className="text-lg font-bold text-teal-700 font-heading">2. Leg Swings (Side to Side)</h4>
                  <p className="mt-2">Face the wall and hold it lightly with both hands. Swing your right leg across your body (adduction) and then out to the right (abduction) in a controlled pendulum motion. Gradually increase the range with each swing. Keep your hips square to the wall throughout. Perform 15 swings per leg. This mobilizes the inner and outer thighs and prepares the hip adductors and abductors for lateral movement.</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <h4 className="text-lg font-bold text-teal-700 font-heading">3. Walking Knee Hugs</h4>
                  <p className="mt-2">Walk forward slowly. With each step, lift your knee toward your chest and pull it tight with both hands, squeezing for one second before stepping forward and repeating on the other side. Rise up onto the toes of your standing foot for an added calf and balance challenge. Perform 10 per leg (20 total steps). This activates the glutes, stretches the hip extensors, and improves single-leg balance.</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <h4 className="text-lg font-bold text-teal-700 font-heading">4. Walking Quad Pulls</h4>
                  <p className="mt-2">Walk forward slowly. With each step, bend your knee behind you and grab your ankle with the same-side hand, pulling your heel toward your glute. Simultaneously reach your opposite arm overhead and lean slightly away from the stretching side. Hold for one second, then step forward and repeat on the other side. Perform 10 per leg. This dynamically stretches the quadriceps and hip flexors while activating the glutes.</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <h4 className="text-lg font-bold text-teal-700 font-heading">5. Arm Circles (Forward and Backward)</h4>
                  <p className="mt-2">Stand tall and extend both arms out to the sides at shoulder height. Circle both arms forward in progressively larger circles, starting with small circles and building to full arm-length circles over 15 repetitions. Then reverse direction for 15 backward circles. Keep your core engaged and avoid swaying. This warms up the shoulder joint, rotator cuff, and upper back muscles for any pushing, pulling, or overhead activity.</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <h4 className="text-lg font-bold text-teal-700 font-heading">6. Inchworms</h4>
                  <p className="mt-2">Stand tall with feet hip-width apart. Hinge forward at the hips and place your hands on the floor in front of your feet (bend your knees as needed). Walk your hands forward until you are in a high plank position. Hold the plank for 2 seconds, then walk your feet toward your hands in small steps, keeping your legs as straight as possible. Stand up and repeat 5 times. This progressively warms up the hamstrings, core, shoulders, and wrists while elevating your heart rate.</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-2xl font-bold text-slate-900 font-heading">Post-Workout Static Routine (10 Minutes)</h3>
              <p className="mt-4">After any workout, these static stretches help your muscles return to their resting length, reduce soreness, and improve long-term flexibility. Hold each stretch for 45 to 60 seconds and breathe deeply. This is when your muscles are warmest and most receptive to lengthening. For accelerated recovery, consider our <Link href={getServiceUrl(recovery)} className="text-teal-600 hover:text-teal-700 underline">professional recovery stretch service</Link>.</p>

              <div className="mt-6 space-y-4">
                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <h4 className="text-lg font-bold text-teal-700 font-heading">1. Standing Forward Fold</h4>
                  <p className="mt-2">Stand with feet hip-width apart. Exhale and fold forward from the hips, letting your upper body hang heavy. Grab opposite elbows and let your head and neck relax completely. Bend your knees as much as needed to reduce tension on the hamstrings. Gently sway side to side. Hold for 60 seconds. This stretches the entire posterior chain — hamstrings, calves, lower back, and upper back — while the inverted position brings blood flow to the brain for mental recovery.</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <h4 className="text-lg font-bold text-teal-700 font-heading">2. Pigeon Pose</h4>
                  <p className="mt-2">From a high plank, bring your right knee forward and place it behind your right wrist. Extend your left leg straight behind you. Lower your hips toward the floor. If your right hip does not reach the floor, place a folded towel underneath it. Walk your hands forward and lower your chest over your right shin. Hold for 60 seconds per side. This deeply stretches the piriformis, glutes, and hip external rotators — essential for anyone who runs, cycles, or sits for extended periods.</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <h4 className="text-lg font-bold text-teal-700 font-heading">3. Kneeling Hip Flexor Stretch</h4>
                  <p className="mt-2">Kneel on your left knee with your right foot flat on the floor in front of you, right knee at 90 degrees. Tuck your pelvis under by squeezing your left glute and pressing your hips forward. Reach your left arm overhead and lean slightly to the right for an added lateral stretch. Hold for 45 seconds per side. This targets the psoas and iliacus — two deep hip flexor muscles that become chronically tight from sitting.</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <h4 className="text-lg font-bold text-teal-700 font-heading">4. Lying Spinal Twist</h4>
                  <p className="mt-2">Lie on your back with both arms extended to the sides in a T position. Bend your right knee and cross it over your body to the left, aiming for the floor. Keep both shoulders pressed into the floor. Turn your head to look at your right hand. Hold for 45 seconds per side. This stretches the glutes, lower back, obliques, and chest simultaneously while providing gentle traction to the spine.</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <h4 className="text-lg font-bold text-teal-700 font-heading">5. Figure-Four Stretch</h4>
                  <p className="mt-2">Lie on your back. Cross your right ankle over your left knee, creating a figure-four shape. Reach through and grab behind your left thigh, pulling your left knee toward your chest. Keep your right knee pressing away from your body. Hold for 45 seconds per side. This targets the piriformis and deep external rotators of the hip — muscles that refer pain to the lower back and sciatic nerve when tight.</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <h4 className="text-lg font-bold text-teal-700 font-heading">6. Child&apos;s Pose</h4>
                  <p className="mt-2">Kneel on the floor with your big toes touching and knees spread wide. Sit back on your heels and walk your hands forward as far as you can reach. Rest your forehead on the floor and let your entire body melt into the position. Hold for 60 seconds. Breathe deeply into your back ribs. This gently stretches the lats, lower back, hips, and ankles while activating the parasympathetic nervous system for recovery.</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-2xl font-bold text-slate-900 font-heading">Desk Break Routine (2 Minutes, No Equipment)</h3>
              <p className="mt-4">Do this every 2 hours when working at a desk. You do not even need to leave your chair for most of these. They combat the postural damage of prolonged sitting and give your brain a reset.</p>

              <div className="mt-6 space-y-4">
                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <h4 className="text-lg font-bold text-teal-700 font-heading">1. Seated Neck Side Bend</h4>
                  <p className="mt-2">Sit tall and drop your right ear toward your right shoulder. Place your right hand gently on the left side of your head — do not pull, just let the weight of your hand add a light stretch. Hold 20 seconds per side. Stretches the upper trapezius and scalenes.</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <h4 className="text-lg font-bold text-teal-700 font-heading">2. Seated Chest Opener</h4>
                  <p className="mt-2">Interlace your fingers behind your back. Straighten your arms and lift them slightly while squeezing your shoulder blades together and lifting your chest. Hold 20 seconds. Reverses the rounded-shoulder posture from typing and screen work.</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <h4 className="text-lg font-bold text-teal-700 font-heading">3. Seated Spinal Twist</h4>
                  <p className="mt-2">Sit tall with feet flat on the floor. Place your right hand on your left knee and your left hand behind you on the chair. Rotate your torso to the left, using your hands as anchors. Look over your left shoulder. Hold 20 seconds per side. Mobilizes the thoracic spine and relieves lower back compression from sitting.</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <h4 className="text-lg font-bold text-teal-700 font-heading">4. Seated Figure-Four</h4>
                  <p className="mt-2">Cross your right ankle over your left knee. Sit tall and gently press your right knee down with your right hand while leaning forward slightly from the hips. Hold 20 seconds per side. Opens up the hip external rotators that compress from sitting.</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <h4 className="text-lg font-bold text-teal-700 font-heading">5. Standing Calf Raises with Hold</h4>
                  <p className="mt-2">Stand behind your chair, holding the back for balance. Rise up onto your toes as high as possible and hold for 5 seconds at the top. Lower slowly. Repeat 10 times. Then step one foot back and press the heel down for a 20-second calf stretch per side. This reactivates circulation in the lower legs and combats the blood pooling that occurs from prolonged sitting.</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-2xl font-bold text-slate-900 font-heading">Evening Wind-Down Routine (10 Minutes)</h3>
              <p className="mt-4">This gentle routine activates your parasympathetic nervous system, releases the tension of the day, and prepares your body for deep, restorative sleep. Perform in dim lighting with slow, deliberate breathing.</p>

              <div className="mt-6 space-y-4">
                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <h4 className="text-lg font-bold text-teal-700 font-heading">1. Supine Hamstring Stretch with Strap</h4>
                  <p className="mt-2">Lie on your back. Loop a towel, belt, or yoga strap around the ball of your right foot. Extend your right leg toward the ceiling, keeping it as straight as possible. Use the strap to gently pull the leg closer. Keep your left leg flat on the floor or bent at the knee. Hold 60 seconds per side. The supine position allows total body relaxation while stretching the hamstrings effectively.</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <h4 className="text-lg font-bold text-teal-700 font-heading">2. Happy Baby Pose</h4>
                  <p className="mt-2">Lie on your back. Bend both knees toward your chest and grab the outside edges of your feet with your hands. Gently pull your knees toward the floor on either side of your torso. Rock gently side to side. Your lower back should press into the floor. Hold 60 seconds. This deeply opens the hips and inner thighs while gently decompressing the lower back. The rocking motion is naturally calming.</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <h4 className="text-lg font-bold text-teal-700 font-heading">3. Legs Up the Wall</h4>
                  <p className="mt-2">Sit sideways against a wall, then swing your legs up so you are lying on your back with your legs resting vertically against the wall. Scoot your hips as close to the wall as comfortable. Let your arms rest at your sides with palms facing up. Close your eyes. Hold 2 to 3 minutes. This position promotes venous return, reduces leg swelling, and strongly activates the parasympathetic nervous system. It is one of the most effective positions for calming the body before sleep.</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <h4 className="text-lg font-bold text-teal-700 font-heading">4. Reclined Butterfly</h4>
                  <p className="mt-2">Lie on your back. Bring the soles of your feet together and let your knees fall open to the sides. Place one hand on your belly and one on your chest. If your knees do not reach the floor comfortably, place pillows under each knee for support. Close your eyes and take 10 slow, deep breaths — 4 seconds in through the nose, 6 seconds out through the mouth. Hold for 2 minutes. This gently opens the hips and groin while the breathing pattern shifts your nervous system into sleep-ready mode.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          SECTION 5 — DAILY MUST-DO STRETCHES: AGES 30-45
      ════════════════════════════════════════════════════════════════ */}
      <section id="ages-30-45" className="bg-section-white py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 sm:text-4xl font-heading">Daily Must-Do Stretches for Ages 30-45</h2>
          <p className="mt-4 text-center text-base text-slate-600">This is the desk damage decade. Your hip flexors are shortening, your thoracic spine is rounding, and your shoulders are rolling forward. These stretches target the specific patterns of tightness that develop from years of sitting, commuting, and screen time. Fight back now or pay later.</p>

          <div className="mt-12 space-y-10 text-base leading-relaxed text-slate-700">
            <div>
              <h3 className="text-2xl font-bold text-slate-900 font-heading">Morning Routine: 10 Targeted Stretches (20 Minutes)</h3>
              <p className="mt-4">These stretches specifically counter the postural dysfunctions that accumulate in your 30s and 40s. Longer hold times than the 18-30 routine because your tissues need more time to release. Do not skip the hip flexor stretches — they are the single most important thing you can do for your lower back health at this age.</p>

              <div className="mt-8 space-y-8">
                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <h4 className="text-lg font-bold text-teal-700 font-heading">1. Kneeling Hip Flexor Stretch with Overhead Reach</h4>
                  <p className="mt-1 text-sm text-slate-500"><strong>Target muscles:</strong> Psoas, iliacus, rectus femoris, quadratus lumborum, obliques</p>
                  <p className="mt-3"><strong>Step-by-step instructions:</strong></p>
                  <ol className="mt-2 list-decimal pl-6 space-y-2">
                    <li>Kneel on your left knee with your right foot flat on the floor in front of you. Place a folded towel under your left knee for cushioning. Your right knee should be directly over your right ankle at a 90-degree angle.</li>
                    <li>Engage your core and squeeze your left glute to tuck your pelvis under. This posterior pelvic tilt is essential — without it, you will not stretch the psoas effectively. You should already feel a stretch in the front of your left hip before you do anything else.</li>
                    <li>Maintaining the pelvic tuck, raise your left arm overhead and lean slightly to the right. This adds a stretch to the quadratus lumborum and obliques on the left side, which are often tight and contribute to lower back pain.</li>
                    <li>Hold for 45 to 60 seconds, breathing deeply. With each exhale, try to tuck the pelvis slightly more and lean slightly further. The stretch should intensify gradually without becoming painful.</li>
                    <li>Return to center, lower your arm, and switch sides. Perform twice on each side. If one side is significantly tighter, add a third repetition on that side.</li>
                  </ol>
                  <p className="mt-3 text-sm text-slate-600"><strong>Hold time:</strong> 45-60 seconds | <strong>Reps:</strong> 2-3 per side | <strong>Breathing:</strong> Exhale to deepen the pelvic tuck</p>
                  <p className="mt-2 text-sm text-slate-500"><strong>Common mistakes:</strong> Failing to tuck the pelvis (the most common and most consequential mistake), arching the lower back, lunging the front knee too far forward. <strong>Modification:</strong> Hold onto a chair or wall with the non-reaching hand for balance.</p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <h4 className="text-lg font-bold text-teal-700 font-heading">2. Thread the Needle (Thoracic Spine)</h4>
                  <p className="mt-1 text-sm text-slate-500"><strong>Target muscles:</strong> Thoracic rotators, rhomboids, posterior deltoid, lats, intercostals</p>
                  <p className="mt-3"><strong>Step-by-step instructions:</strong></p>
                  <ol className="mt-2 list-decimal pl-6 space-y-2">
                    <li>Start on all fours with wrists under shoulders and knees under hips. Your spine should be in a neutral position.</li>
                    <li>Lift your right arm out to the side and up toward the ceiling, opening your chest to the right and following your hand with your gaze. Inhale as you open up. This is the open position.</li>
                    <li>Exhale and sweep your right arm under your body, threading it between your left hand and left knee. Slide your right arm along the floor as far as it will go, resting your right shoulder and right temple on the floor. This is the threaded position.</li>
                    <li>Hold the threaded position for 5 seconds, then sweep back to the open position. Repeat 8 times on this side, then switch to the left arm for 8 repetitions.</li>
                    <li>On the final repetition, hold the threaded position for 15 to 20 seconds to get a deeper static stretch through the thoracic spine and posterior shoulder.</li>
                  </ol>
                  <p className="mt-3 text-sm text-slate-600"><strong>Hold time:</strong> 5 seconds per rep, 15-20 seconds final hold | <strong>Reps:</strong> 8 per side | <strong>Breathing:</strong> Inhale to open, exhale to thread</p>
                  <p className="mt-2 text-sm text-slate-500"><strong>Common mistakes:</strong> Rotating from the lumbar spine instead of the thoracic spine, rushing through the movement, not reaching far enough in the threaded position. <strong>Modification:</strong> Place a pillow under your forehead in the threaded position if the floor is too low.</p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <h4 className="text-lg font-bold text-teal-700 font-heading">3. Wall Pec Stretch (Two Angles)</h4>
                  <p className="mt-1 text-sm text-slate-500"><strong>Target muscles:</strong> Pectoralis major (upper and lower fibers), pectoralis minor, anterior deltoid, biceps short head</p>
                  <p className="mt-3"><strong>Step-by-step instructions:</strong></p>
                  <ol className="mt-2 list-decimal pl-6 space-y-2">
                    <li>Stand next to a wall or doorframe. Place your right forearm flat against the wall with your elbow at shoulder height and your forearm pointing straight up. Your upper arm should be parallel to the floor.</li>
                    <li>Step your right foot forward and slowly rotate your body to the left, away from the wall. Keep your forearm pressing into the wall as your body turns. You should feel a deep stretch across your right chest and the front of your right shoulder.</li>
                    <li>Hold for 30 seconds, breathing deeply. Then adjust your arm angle: move your elbow above shoulder height (arm angled upward at about 135 degrees) and repeat the rotation. This targets the lower pectoral fibers. Hold 30 seconds.</li>
                    <li>Adjust once more: move your elbow below shoulder height (arm angled downward at about 45 degrees) and rotate again. This targets the upper pectoral fibers and the pectoralis minor. Hold 30 seconds.</li>
                    <li>Switch to the left side and repeat all three angles. The 30-45 age group typically has very tight upper pectoral fibers from forward shoulder posture, so pay extra attention to the low-arm angle.</li>
                  </ol>
                  <p className="mt-3 text-sm text-slate-600"><strong>Hold time:</strong> 30 seconds per angle | <strong>Reps:</strong> 3 angles per side | <strong>Breathing:</strong> Deep diaphragmatic breaths, exhale to rotate deeper</p>
                  <p className="mt-2 text-sm text-slate-500"><strong>Common mistakes:</strong> Shrugging the shoulder up toward the ear, arching the lower back, only doing one arm angle. <strong>Modification:</strong> Reduce the rotation if the stretch is too intense.</p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <h4 className="text-lg font-bold text-teal-700 font-heading">4. Standing Cross-Body Shoulder Stretch</h4>
                  <p className="mt-1 text-sm text-slate-500"><strong>Target muscles:</strong> Posterior deltoid, infraspinatus, teres minor, rhomboids</p>
                  <p className="mt-3"><strong>Step-by-step instructions:</strong></p>
                  <ol className="mt-2 list-decimal pl-6 space-y-2">
                    <li>Stand tall with your shoulders relaxed. Bring your right arm across your body at chest height, keeping it straight.</li>
                    <li>Use your left hand to pull your right arm closer to your chest by pressing just above the elbow. Do not press on the elbow joint itself.</li>
                    <li>Keep your right shoulder pressed down away from your ear — the tendency is to shrug, which reduces the stretch effectiveness. You should feel a deep stretch in the back of your right shoulder.</li>
                    <li>Hold for 30 to 45 seconds per side, breathing steadily. Perform twice on each side.</li>
                  </ol>
                  <p className="mt-3 text-sm text-slate-600"><strong>Hold time:</strong> 30-45 seconds | <strong>Reps:</strong> 2 per side | <strong>Breathing:</strong> Natural, steady breathing</p>
                  <p className="mt-2 text-sm text-slate-500"><strong>Common mistakes:</strong> Shrugging the shoulder, pressing on the elbow joint, rotating the torso. <strong>Modification:</strong> Use a doorframe — place the back of your hand against the frame and walk forward to control the stretch intensity.</p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <h4 className="text-lg font-bold text-teal-700 font-heading">5. Supine Figure-Four Glute Stretch</h4>
                  <p className="mt-1 text-sm text-slate-500"><strong>Target muscles:</strong> Piriformis, gluteus medius, gluteus maximus, deep external rotators</p>
                  <p className="mt-3"><strong>Step-by-step instructions:</strong></p>
                  <ol className="mt-2 list-decimal pl-6 space-y-2">
                    <li>Lie on your back with both knees bent and feet flat on the floor. Cross your right ankle over your left knee, creating a figure-four shape.</li>
                    <li>Reach both hands through the triangle created by your legs and clasp behind your left thigh (or on top of your left shin if you cannot reach behind).</li>
                    <li>Gently pull your left thigh toward your chest while simultaneously pressing your right knee away from your body with your right elbow. Keep your head and shoulders relaxed on the floor.</li>
                    <li>Hold for 45 to 60 seconds per side. If you feel a deep ache in the right glute, you are in the right spot. This is especially important for people who sit all day, as the piriformis compresses the sciatic nerve when tight.</li>
                    <li>Switch sides and repeat. If one side is significantly tighter (very common), add an extra 30-second hold on the tighter side.</li>
                  </ol>
                  <p className="mt-3 text-sm text-slate-600"><strong>Hold time:</strong> 45-60 seconds | <strong>Reps:</strong> 1-2 per side | <strong>Breathing:</strong> Deep belly breaths, exhale to pull deeper</p>
                  <p className="mt-2 text-sm text-slate-500"><strong>Common mistakes:</strong> Lifting the head and shoulders off the floor (increases neck tension), not pressing the knee away actively, rushing the stretch. <strong>Modification:</strong> If you cannot reach behind your thigh, keep your left foot on the floor and simply press your right knee away.</p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <h4 className="text-lg font-bold text-teal-700 font-heading">6. Levator Scapulae Stretch</h4>
                  <p className="mt-1 text-sm text-slate-500"><strong>Target muscles:</strong> Levator scapulae, upper trapezius, splenius cervicis</p>
                  <p className="mt-3"><strong>Step-by-step instructions:</strong></p>
                  <ol className="mt-2 list-decimal pl-6 space-y-2">
                    <li>Sit or stand tall. Turn your head 45 degrees to the right, so you are looking toward your right armpit.</li>
                    <li>Drop your chin toward your right collarbone. Place your right hand gently on the back of your head — do not pull aggressively, just let the weight of your hand add a gentle stretch.</li>
                    <li>Reach your left hand behind your back or hold the bottom of your chair seat to anchor your left shoulder down. You should feel a targeted stretch on the left side of your neck, deeper and more specific than a standard side bend.</li>
                    <li>Hold for 30 seconds, then release slowly. Repeat on the other side. Perform twice per side.</li>
                  </ol>
                  <p className="mt-3 text-sm text-slate-600"><strong>Hold time:</strong> 30 seconds | <strong>Reps:</strong> 2 per side | <strong>Breathing:</strong> Slow nasal breathing</p>
                  <p className="mt-2 text-sm text-slate-500"><strong>Common mistakes:</strong> Pulling too aggressively on the head, not anchoring the opposite shoulder, turning the head too far or not far enough. <strong>Modification:</strong> Perform lying down to eliminate the need to hold body position.</p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <h4 className="text-lg font-bold text-teal-700 font-heading">7. Couch Stretch (Hip Flexor Intensifier)</h4>
                  <p className="mt-1 text-sm text-slate-500"><strong>Target muscles:</strong> Psoas, iliacus, rectus femoris, quadriceps</p>
                  <p className="mt-3"><strong>Step-by-step instructions:</strong></p>
                  <ol className="mt-2 list-decimal pl-6 space-y-2">
                    <li>Face away from a couch, chair, or wall. Place your left knee on the ground and your left shin against the vertical surface behind you, with the top of your left foot resting against the surface. Your right foot should be flat on the floor in front of you with your knee at 90 degrees.</li>
                    <li>Engage your core and squeeze your left glute to create a posterior pelvic tilt. Slowly press your hips forward. The stretch should be intense along the entire front of your left thigh and deep into your left hip flexor.</li>
                    <li>If this intensity is manageable, work toward bringing your torso upright. If it is too intense, lean forward and place both hands on your front knee for support.</li>
                    <li>Hold for 60 seconds per side. This is one of the most intense hip flexor stretches, so start conservatively and build up over weeks. This stretch addresses the deep psoas muscle that standard kneeling stretches often miss.</li>
                  </ol>
                  <p className="mt-3 text-sm text-slate-600"><strong>Hold time:</strong> 60 seconds | <strong>Reps:</strong> 1-2 per side | <strong>Breathing:</strong> Deep, slow breaths — the intensity makes breathing discipline essential</p>
                  <p className="mt-2 text-sm text-slate-500"><strong>Common mistakes:</strong> Arching the lower back (this means the glutes are not engaged), using a surface that is too high initially, holding the breath. <strong>Modification:</strong> Start with a standard kneeling hip flexor stretch and graduate to this version after two to three weeks.</p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <h4 className="text-lg font-bold text-teal-700 font-heading">8. Prone Press-Up (Cobra Variation)</h4>
                  <p className="mt-1 text-sm text-slate-500"><strong>Target muscles:</strong> Rectus abdominis, hip flexors, spinal extensors (gently activated), intercostals</p>
                  <p className="mt-3"><strong>Step-by-step instructions:</strong></p>
                  <ol className="mt-2 list-decimal pl-6 space-y-2">
                    <li>Lie face down with your palms flat on the floor near your shoulders, elbows bent and close to your body. Your legs should be straight with the tops of your feet on the floor.</li>
                    <li>Keeping your hips on the floor, slowly press through your hands to lift your chest off the ground. Straighten your arms as much as comfortable while keeping your pelvis pressed into the floor. Your back will arch — this is the intended movement.</li>
                    <li>Look forward (not up) and hold the position for 10 seconds, breathing into your chest. Then slowly lower back down.</li>
                    <li>Repeat 5 to 8 times, going slightly higher with each repetition as your back warms up. This movement is the opposite of the flexed position you sit in all day and is essential for lumbar spine health in the desk-worker population.</li>
                  </ol>
                  <p className="mt-3 text-sm text-slate-600"><strong>Hold time:</strong> 10 seconds | <strong>Reps:</strong> 5-8 | <strong>Breathing:</strong> Inhale as you press up, exhale at the top</p>
                  <p className="mt-2 text-sm text-slate-500"><strong>Common mistakes:</strong> Lifting the hips off the floor (reduces the lumbar extension), clenching the glutes, shrugging the shoulders. <strong>Modification:</strong> Stay on your forearms (sphinx position) if full extension is too much.</p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <h4 className="text-lg font-bold text-teal-700 font-heading">9. Seated Hamstring Stretch with Strap</h4>
                  <p className="mt-1 text-sm text-slate-500"><strong>Target muscles:</strong> Hamstrings, calves (gastrocnemius), lower back (erector spinae)</p>
                  <p className="mt-3"><strong>Step-by-step instructions:</strong></p>
                  <ol className="mt-2 list-decimal pl-6 space-y-2">
                    <li>Sit on the floor with both legs extended in front of you. Sit on a folded towel if you cannot maintain an upright spine with straight legs.</li>
                    <li>Loop a towel or yoga strap around the ball of your right foot. Hold one end in each hand. Keep your right leg straight with your knee pressed toward the floor.</li>
                    <li>Sit tall and hinge forward from your hips, keeping your back flat. Use the strap to maintain contact with your foot while you lean forward. Do not round your back to reach further — the stretch should come from the hip hinge, not from spinal flexion.</li>
                    <li>Hold for 45 to 60 seconds. To add a calf stretch, pull the strap to flex your foot (toes toward shin). To add a lower back stretch, after the hamstrings relax, allow a gentle rounding of the back in the final 10 seconds.</li>
                    <li>Repeat on the left side. Then perform one more set with both legs extended, reaching the strap around both feet simultaneously.</li>
                  </ol>
                  <p className="mt-3 text-sm text-slate-600"><strong>Hold time:</strong> 45-60 seconds | <strong>Reps:</strong> 1-2 per side | <strong>Breathing:</strong> Exhale to hinge deeper</p>
                  <p className="mt-2 text-sm text-slate-500"><strong>Common mistakes:</strong> Rounding the back to reach further (defeats the purpose), bending the knee, pulling the strap too aggressively. <strong>Modification:</strong> Bend the non-stretching knee and place that foot against the inner thigh of the straight leg.</p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <h4 className="text-lg font-bold text-teal-700 font-heading">10. Cat-Cow with Extended Pause</h4>
                  <p className="mt-1 text-sm text-slate-500"><strong>Target muscles:</strong> Entire spinal column, abdominals, hip flexors, neck</p>
                  <p className="mt-3"><strong>Step-by-step instructions:</strong></p>
                  <ol className="mt-2 list-decimal pl-6 space-y-2">
                    <li>Start on all fours as described in the 18-30 section, but with a key difference: you will hold each position for 10 seconds instead of flowing through continuously. This extended hold allows deeper segmental mobilization of the spine, which becomes increasingly important in your 30s and 40s as individual vertebral segments lose mobility.</li>
                    <li>Inhale into Cow position and hold for 10 seconds, breathing normally. Focus on each segment of your spine individually — try to create the deepest arch in the areas that feel the stiffest (usually the mid-back for desk workers).</li>
                    <li>Exhale into Cat position and hold for 10 seconds. Focus on maximizing the rounding in each segment. Push the floor away and spread your shoulder blades as wide as possible.</li>
                    <li>Perform 5 cycles with the extended holds, then 5 flowing cycles as described in the 18-30 section. This combination of static holds and dynamic flow provides comprehensive spinal mobilization.</li>
                  </ol>
                  <p className="mt-3 text-sm text-slate-600"><strong>Hold time:</strong> 10 seconds each position | <strong>Reps:</strong> 5 held + 5 flowing | <strong>Breathing:</strong> Normal breathing during holds, synced breathing during flow</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-2xl font-bold text-slate-900 font-heading">Office Stretches — Do Every 2 Hours at Your Desk</h3>
              <p className="mt-4">Set a timer. Every 2 hours, do all five of these. They take less than 3 minutes and will prevent the cumulative postural damage that leads to chronic pain.</p>
              <div className="mt-6 space-y-4">
                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <h4 className="text-lg font-bold text-teal-700 font-heading">1. Chin Tucks</h4>
                  <p className="mt-2">Sit tall. Without tilting your head, pull your chin straight back, creating a double chin. Hold 5 seconds, release. Repeat 10 times. This reverses the forward head posture from screen use and strengthens the deep neck flexors. One of the single most effective exercises for tech neck.</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <h4 className="text-lg font-bold text-teal-700 font-heading">2. Shoulder Blade Squeezes</h4>
                  <p className="mt-2">Sit tall with arms at your sides. Squeeze your shoulder blades together as if trying to hold a pencil between them. Hold 5 seconds. Repeat 10 times. This activates the mid-trapezius and rhomboids — muscles that are stretched and weakened by forward shoulder posture — while stretching the tight pectorals.</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <h4 className="text-lg font-bold text-teal-700 font-heading">3. Wrist Flexor and Extensor Stretches</h4>
                  <p className="mt-2">Extend your right arm in front with palm up. Use your left hand to pull your right fingers down and back. Hold 15 seconds. Then flip: palm down, pull fingers toward you. Hold 15 seconds. Switch hands. Essential for anyone who types, texts, or uses a mouse — prevents carpal tunnel symptoms and forearm tension.</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <h4 className="text-lg font-bold text-teal-700 font-heading">4. Seated Hip Flexor Stretch</h4>
                  <p className="mt-2">Sit at the edge of your chair. Extend your right leg behind you with your toes on the floor. Tuck your pelvis under and lean back slightly. You should feel a stretch in the front of your right hip. Hold 20 seconds per side. This is the only way to stretch hip flexors while seated and is critical for the 30-45 desk worker.</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <h4 className="text-lg font-bold text-teal-700 font-heading">5. Standing Back Extension</h4>
                  <p className="mt-2">Stand up. Place your hands on your lower back, fingers pointing down. Gently lean backward, pressing your hips forward and arching your upper back. Hold 5 seconds. Repeat 5 times. This reverses the flexed posture from sitting and provides immediate lower back relief. The 2-second version: just stand up and reach both arms overhead as high as you can while taking a deep breath. Even this minimal movement breaks the sitting cycle.</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-2xl font-bold text-slate-900 font-heading">Stress-Relief Stretches</h3>
              <p className="mt-4">Stress lives in your body — specifically in your neck, jaw, shoulders, and hips. These stretches target the physical manifestations of stress. Combine with slow breathing for maximum effect. For a truly transformative de-stress experience, book a professional <Link href={getServiceUrl(passive)} className="text-teal-600 hover:text-teal-700 underline">passive stretch session</Link>.</p>
              <div className="mt-6 space-y-4">
                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <h4 className="text-lg font-bold text-teal-700 font-heading">Jaw Release</h4>
                  <p className="mt-2">Place your tongue on the roof of your mouth behind your front teeth. Open your mouth as wide as comfortable while keeping your tongue in place. Hold 5 seconds, close slowly. Repeat 5 times. Then place your fingertips on the masseter muscles (the big muscles on the sides of your jaw) and massage in small circles for 30 seconds. The jaw is one of the primary stress storage sites in the body, and releasing it sends a powerful relaxation signal to the nervous system.</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <h4 className="text-lg font-bold text-teal-700 font-heading">Diaphragmatic Breathing with Hip Stretch</h4>
                  <p className="mt-2">Lie on your back with your feet on the wall, knees bent at 90 degrees. Let your knees fall open to the sides for a gentle inner thigh stretch. Place one hand on your chest and one on your belly. Breathe so only the belly hand rises — 4 seconds in through the nose, 8 seconds out through the mouth. Continue for 2 minutes. This combines hip opening with the most powerful parasympathetic breathing pattern, creating rapid stress relief.</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-2xl font-bold text-slate-900 font-heading">Weekend Warrior Warm-Up and Recovery</h3>
              <p className="mt-4">If you are sedentary during the week and active on weekends, you are at high injury risk. Always warm up with the pre-workout dynamic routine from the 18-30 section before any weekend activity. After, add the post-workout static routine. And seriously consider a professional <Link href={getServiceUrl(recovery)} className="text-teal-600 hover:text-teal-700 underline">recovery stretch</Link> on Sunday evening — your Monday self will thank you.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          SECTION 6 — DAILY MUST-DO STRETCHES: AGES 45-60
      ════════════════════════════════════════════════════════════════ */}
      <section id="ages-45-60" className="bg-section-teal py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 sm:text-4xl font-heading">Daily Must-Do Stretches for Ages 45-60</h2>
          <p className="mt-4 text-center text-base text-slate-600">Flexibility maintenance becomes critical now. Your connective tissues are losing elasticity, joint fluid production is declining, and recovery takes longer. The good news: consistent stretching at this age produces dramatic quality-of-life improvements. Longer holds, gentler pace, and smart progression are key.</p>

          <div className="mt-12 space-y-10 text-base leading-relaxed text-slate-700">
            <div>
              <h3 className="text-2xl font-bold text-slate-900 font-heading">Morning Routine: 8 Essential Stretches (20 Minutes)</h3>
              <p className="mt-4">Morning stiffness is common at this age because synovial fluid in your joints thickens overnight. These stretches progressively mobilize your joints and warm up your tissues. Start gently and increase range gradually — your body needs a longer warm-up period than it did a decade ago.</p>

              <div className="mt-8 space-y-8">
                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <h4 className="text-lg font-bold text-teal-700 font-heading">1. Supine Knee-to-Chest Stretch</h4>
                  <p className="mt-1 text-sm text-slate-500"><strong>Target muscles:</strong> Lower back (erector spinae, quadratus lumborum), glutes, hip extensors</p>
                  <p className="mt-3"><strong>Step-by-step instructions:</strong></p>
                  <ol className="mt-2 list-decimal pl-6 space-y-2">
                    <li>Lie on your back on a firm but padded surface (a yoga mat on carpet is ideal). Start with both legs extended. Take three deep breaths to settle into the position.</li>
                    <li>Slowly bend your right knee and lift it toward your chest. Clasp both hands around your right shin, just below the knee (never on the kneecap). Keep your left leg extended on the floor, or bend it with the foot flat if your lower back is uncomfortable.</li>
                    <li>Gently pull your right knee closer to your chest until you feel a comfortable stretch in your right glute and lower back. Keep your head on the floor and your shoulders relaxed. The pull should be gentle and steady — never forceful.</li>
                    <li>Hold for 45 to 60 seconds, breathing slowly. With each exhale, allow the knee to move slightly closer to the chest. The stretch should deepen naturally as the muscles relax.</li>
                    <li>Release slowly and switch sides. Then pull both knees to the chest simultaneously and hold for 30 seconds, rocking gently side to side to massage the lower back.</li>
                  </ol>
                  <p className="mt-3 text-sm text-slate-600"><strong>Hold time:</strong> 45-60 seconds per side, 30 seconds both knees | <strong>Reps:</strong> 1 per side + 1 bilateral | <strong>Breathing:</strong> Slow exhale to deepen</p>
                  <p className="mt-2 text-sm text-slate-500"><strong>Common mistakes:</strong> Pulling on the kneecap (pull on the shin), lifting the head, tensing the shoulders. <strong>Modification:</strong> If reaching the shin is difficult, loop a towel behind the knee.</p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <h4 className="text-lg font-bold text-teal-700 font-heading">2. Supine Hamstring Stretch</h4>
                  <p className="mt-1 text-sm text-slate-500"><strong>Target muscles:</strong> Hamstrings, gastrocnemius, lower back</p>
                  <p className="mt-3"><strong>Step-by-step instructions:</strong></p>
                  <ol className="mt-2 list-decimal pl-6 space-y-2">
                    <li>Remain lying on your back. Loop a towel or strap around the ball of your right foot. Hold one end of the towel in each hand.</li>
                    <li>Slowly straighten your right leg toward the ceiling, keeping tension on the towel. It is perfectly fine if your leg does not reach vertical — go only as far as you can while keeping the leg straight and your lower back pressed into the floor.</li>
                    <li>Once you reach your comfortable limit, hold the position for 60 seconds. Use the towel to maintain the position without straining. The stretch should feel moderate, not intense.</li>
                    <li>To add a calf component, use the towel to pull your toes toward your shin while holding the stretch. To add an adductor stretch, let the leg fall slightly outward while keeping tension on the towel.</li>
                    <li>Lower slowly and repeat on the other side.</li>
                  </ol>
                  <p className="mt-3 text-sm text-slate-600"><strong>Hold time:</strong> 60 seconds | <strong>Reps:</strong> 1 per side | <strong>Breathing:</strong> Slow, steady breathing, exhale as the muscle relaxes</p>
                  <p className="mt-2 text-sm text-slate-500"><strong>Common mistakes:</strong> Bending the knee to get the leg higher (keep it straight even if the angle is modest), lifting the head, gripping the towel too tightly. <strong>Modification:</strong> Keep the non-stretching knee bent with foot flat on the floor if the lower back is uncomfortable.</p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <h4 className="text-lg font-bold text-teal-700 font-heading">3. Gentle Cat-Cow (Extended Timing)</h4>
                  <p className="mt-1 text-sm text-slate-500"><strong>Target muscles:</strong> Entire spinal column, abdominals, hip flexors</p>
                  <p className="mt-3"><strong>Step-by-step instructions:</strong></p>
                  <ol className="mt-2 list-decimal pl-6 space-y-2">
                    <li>Come to all fours with wrists under shoulders and knees under hips. Place extra padding under your knees if needed. If wrist pressure is uncomfortable, come down onto your fists or forearms instead.</li>
                    <li>Very slowly transition into Cow: drop the belly, lift the tailbone, and look forward. Take a full 5-second inhale for this transition, moving as slowly as possible through each vertebral segment.</li>
                    <li>Hold the Cow position for 5 seconds, breathing normally. Focus on the area of your spine that feels the stiffest and try to create more movement there.</li>
                    <li>Very slowly transition into Cat over a 5-second exhale. Round the spine, tuck the tailbone, let the head hang. Hold for 5 seconds.</li>
                    <li>Perform 6 to 8 cycles at this slow pace. The slower tempo gives your joints time to lubricate with synovial fluid, which is especially important for morning stiffness at this age.</li>
                  </ol>
                  <p className="mt-3 text-sm text-slate-600"><strong>Hold time:</strong> 5 seconds each position + 5-second transitions | <strong>Reps:</strong> 6-8 cycles | <strong>Breathing:</strong> 5-second inhale/exhale synchronized</p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <h4 className="text-lg font-bold text-teal-700 font-heading">4. Standing Calf Stretch</h4>
                  <p className="mt-1 text-sm text-slate-500"><strong>Target muscles:</strong> Gastrocnemius, soleus, Achilles tendon, plantar fascia</p>
                  <p className="mt-3"><strong>Step-by-step instructions:</strong></p>
                  <ol className="mt-2 list-decimal pl-6 space-y-2">
                    <li>Stand facing a wall with both hands flat against it at shoulder height. Step your right foot back about two to three feet while keeping your left foot close to the wall.</li>
                    <li>Keep your right leg straight and press your right heel firmly into the floor. Lean into the wall by bending your left knee. You should feel a stretch in the upper portion of your right calf (gastrocnemius). Hold 30 seconds.</li>
                    <li>Keeping your right foot in the same position, bend your right knee slightly. The stretch should shift to the lower portion of your calf and the Achilles tendon area (soleus). Hold 30 seconds.</li>
                    <li>Switch legs and repeat both positions. Healthy calf flexibility is critical for safe walking and stair navigation — two activities where falls become increasingly dangerous at this age.</li>
                  </ol>
                  <p className="mt-3 text-sm text-slate-600"><strong>Hold time:</strong> 30 seconds each position | <strong>Reps:</strong> 2 positions per side | <strong>Breathing:</strong> Natural, steady breathing</p>
                  <p className="mt-2 text-sm text-slate-500"><strong>Common mistakes:</strong> Allowing the back heel to lift, turning the back foot outward, bending the back knee during the straight-leg variation. <strong>Modification:</strong> Decrease the step distance to reduce intensity.</p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <h4 className="text-lg font-bold text-teal-700 font-heading">5. Seated Spinal Rotation</h4>
                  <p className="mt-1 text-sm text-slate-500"><strong>Target muscles:</strong> Thoracic rotators, obliques, intercostals, erector spinae</p>
                  <p className="mt-3"><strong>Step-by-step instructions:</strong></p>
                  <ol className="mt-2 list-decimal pl-6 space-y-2">
                    <li>Sit on a firm chair with feet flat on the floor, hip-width apart. Sit tall with your spine long and your core lightly engaged.</li>
                    <li>Cross your arms over your chest, placing each hand on the opposite shoulder. This position prevents you from cheating by using your arms to force the rotation.</li>
                    <li>Slowly rotate your entire torso to the right, leading with your eyes, then head, then shoulders, then ribcage. Rotate as far as comfortable without forcing. Your hips and knees should remain facing forward — all rotation comes from the trunk.</li>
                    <li>Hold the end position for 10 seconds, breathing into the stretch. With each exhale, try to rotate one degree further.</li>
                    <li>Return to center slowly and rotate to the left. Perform 3 to 4 rotations in each direction, holding 10 seconds at the end range each time. This exercise maintains the thoracic rotation that is essential for walking mechanics, reaching, and looking over your shoulder while driving.</li>
                  </ol>
                  <p className="mt-3 text-sm text-slate-600"><strong>Hold time:</strong> 10 seconds each direction | <strong>Reps:</strong> 3-4 per side | <strong>Breathing:</strong> Exhale to rotate deeper</p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <h4 className="text-lg font-bold text-teal-700 font-heading">6. Shoulder Pendulums</h4>
                  <p className="mt-1 text-sm text-slate-500"><strong>Target muscles:</strong> Rotator cuff (supraspinatus, infraspinatus, teres minor, subscapularis), deltoids, joint capsule</p>
                  <p className="mt-3"><strong>Step-by-step instructions:</strong></p>
                  <ol className="mt-2 list-decimal pl-6 space-y-2">
                    <li>Stand next to a table and bend forward at the waist, supporting yourself with one hand on the table. Let the other arm hang straight down like a pendulum, completely relaxed.</li>
                    <li>Without using your shoulder muscles, shift your body weight to swing your arm gently in small circles. Start with circles the size of a dinner plate and gradually increase to the size of a large pizza.</li>
                    <li>Circle 10 times clockwise, then 10 times counterclockwise. Then swing the arm forward and back 10 times, then side to side 10 times.</li>
                    <li>Switch sides. This exercise uses gravity and momentum to gently mobilize the shoulder joint without requiring muscular effort, making it perfect for shoulders that are stiff, sore, or recovering from injury.</li>
                  </ol>
                  <p className="mt-3 text-sm text-slate-600"><strong>Hold time:</strong> Continuous movement | <strong>Reps:</strong> 10 each direction | <strong>Breathing:</strong> Natural breathing</p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <h4 className="text-lg font-bold text-teal-700 font-heading">7. Gentle Standing Quad Stretch</h4>
                  <p className="mt-1 text-sm text-slate-500"><strong>Target muscles:</strong> Quadriceps, hip flexors</p>
                  <p className="mt-3"><strong>Step-by-step instructions:</strong></p>
                  <ol className="mt-2 list-decimal pl-6 space-y-2">
                    <li>Stand near a wall or sturdy chair for balance support — always use a support at this age to prevent fall risk. Hold the support with your left hand.</li>
                    <li>Bend your right knee and reach back with your right hand to grasp your right ankle. If you cannot reach your ankle, loop a towel around your foot and hold the ends of the towel.</li>
                    <li>Gently pull your heel toward your glute, keeping your knees close together. Tuck your pelvis slightly to add the hip flexor component. The stretch should feel moderate, never sharp.</li>
                    <li>Hold for 45 seconds per side. Perform once on each side. If balance is a concern, perform this stretch lying on your side or prone (face down).</li>
                  </ol>
                  <p className="mt-3 text-sm text-slate-600"><strong>Hold time:</strong> 45 seconds | <strong>Reps:</strong> 1 per side | <strong>Breathing:</strong> Slow, steady breathing</p>
                  <p className="mt-2 text-sm text-slate-500"><strong>Modification:</strong> Lie on your side and perform the stretch from the floor to eliminate balance challenges entirely.</p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <h4 className="text-lg font-bold text-teal-700 font-heading">8. Neck and Upper Trapezius Stretch</h4>
                  <p className="mt-1 text-sm text-slate-500"><strong>Target muscles:</strong> Upper trapezius, levator scapulae, scalenes, sternocleidomastoid</p>
                  <p className="mt-3"><strong>Step-by-step instructions:</strong></p>
                  <ol className="mt-2 list-decimal pl-6 space-y-2">
                    <li>Sit in a chair with both feet flat on the floor. Reach your right hand under the chair seat and grip the chair to anchor your right shoulder down.</li>
                    <li>Tilt your head to the left, bringing your left ear toward your left shoulder. Do not force it — gravity alone provides a good stretch. Place your left hand gently on the right side of your head for a small additional weight (do not pull).</li>
                    <li>Hold 30 seconds, breathing slowly. Then rotate your head so you are looking toward your left armpit and hold another 30 seconds — this shifts the stretch to the levator scapulae.</li>
                    <li>Release very slowly (fast movements can cause dizziness at this age), then repeat on the other side.</li>
                  </ol>
                  <p className="mt-3 text-sm text-slate-600"><strong>Hold time:</strong> 30 seconds each angle | <strong>Reps:</strong> 2 angles per side | <strong>Breathing:</strong> Slow nasal breathing</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-2xl font-bold text-slate-900 font-heading">Arthritis-Friendly Modifications</h3>
              <p className="mt-4">If you have arthritis in any joint, apply these modification principles to any stretch in this guide: reduce the range of motion by 20 percent, increase hold times to 60 to 90 seconds (arthritic joints need more time to warm up), avoid any position that creates compression in the affected joint, and use heat (warm shower, heating pad) before stretching to increase tissue pliability. Our <Link href={getServiceUrl(gentle)} className="text-teal-600 hover:text-teal-700 underline">gentle stretch service</Link> is specifically designed for clients with arthritis and joint concerns.</p>
            </div>

            <div>
              <h3 className="text-2xl font-bold text-slate-900 font-heading">Pre-Walk Warm-Up (5 Minutes)</h3>
              <p className="mt-4">Walking is the most important exercise at this age, but walking on cold, stiff muscles and joints increases injury risk. Do these before every walk.</p>
              <div className="mt-6 space-y-4">
                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <p className="mt-2"><strong>March in place</strong> for 1 minute, gradually lifting knees higher. Then perform <strong>10 ankle circles</strong> per foot. Follow with <strong>10 gentle leg swings</strong> per leg (forward and back, holding a wall). Finish with <strong>10 shoulder rolls</strong> forward and backward. This simple sequence lubricates the hip, knee, ankle, and shoulder joints and raises your core body temperature enough for safe walking.</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-2xl font-bold text-slate-900 font-heading">When to Transition to Professional Stretch Service</h3>
              <p className="mt-4">If you are noticing that your self-stretching is not producing the results it used to, or if you have specific areas of tightness that you cannot seem to release on your own, it is time to add professional stretch therapy. The 45-60 age group benefits enormously from <Link href={getServiceUrl(assisted)} className="text-teal-600 hover:text-teal-700 underline">assisted stretching</Link> because a therapist can safely take your joints through ranges that you cannot achieve on your own and apply PNF techniques that are impossible to perform solo. Many of our clients in this age group book weekly sessions and report that it has transformed their mobility, pain levels, and quality of life. At $99 per hour with 10% off weekly bookings, it is one of the best investments in your long-term health.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          SECTION 7 — DAILY MUST-DO STRETCHES: AGES 60+
      ════════════════════════════════════════════════════════════════ */}
      <section id="ages-60-plus" className="bg-section-white py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 sm:text-4xl font-heading">Daily Must-Do Stretches for Ages 60+</h2>
          <p className="mt-4 text-center text-base text-slate-600">Stretching at this age is not about achieving impressive flexibility — it is about maintaining the range of motion needed for independent daily living. The research is clear: seniors who stretch regularly have fewer falls, less pain, and more independence. Safety is paramount. Always have a sturdy support nearby.</p>

          <div className="mt-12 space-y-10 text-base leading-relaxed text-slate-700">
            <div>
              <h3 className="text-2xl font-bold text-slate-900 font-heading">Morning Routine: 8 Gentle Stretches (15-20 Minutes)</h3>
              <p className="mt-4">Begin every morning with these gentle stretches. They progressively mobilize your major joints and prepare your body for the day&apos;s activities. Take your time — there is no rush. Use a sturdy chair, wall, or countertop for balance on any standing stretch.</p>

              <div className="mt-8 space-y-8">
                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <h4 className="text-lg font-bold text-teal-700 font-heading">1. Bed Stretch: Full-Body Wake-Up</h4>
                  <p className="mt-2">Before you even get out of bed, lie flat on your back. Reach your arms overhead and point your toes, making yourself as long as possible. Hold 10 seconds and release. Then hug both knees gently to your chest and hold 15 seconds. Rock gently side to side. Then place both feet flat on the bed with knees bent, and let both knees fall gently to the right. Hold 15 seconds. Repeat to the left. This 1-minute bed sequence mobilizes your spine, hips, and shoulders before you put weight on your joints.</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <h4 className="text-lg font-bold text-teal-700 font-heading">2. Seated Ankle Pumps and Circles</h4>
                  <p className="mt-2">Sit on the edge of your bed or a sturdy chair. Extend your right leg. Point your toes forward, then pull them back toward your shin. Repeat 10 times. Then circle your ankle 10 times clockwise and 10 times counterclockwise. Switch feet. This activates the calf muscle pump that circulates blood in your lower legs and mobilizes ankle joints that stiffen overnight. Healthy ankle mobility is directly linked to fall prevention.</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <h4 className="text-lg font-bold text-teal-700 font-heading">3. Seated Neck Stretches</h4>
                  <p className="mt-2">Sit tall in a sturdy chair. Slowly tilt your right ear toward your right shoulder. Hold 20 seconds. Return to center. Tilt left. Hold 20 seconds. Then slowly turn your head to look over your right shoulder. Hold 20 seconds. Return to center. Turn left. Hold 20 seconds. Finally, gently tuck your chin toward your chest. Hold 20 seconds. All movements should be slow and controlled — never quick or jerky. This sequence maintains the neck mobility needed for safe driving, crossing streets, and daily activities.</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <h4 className="text-lg font-bold text-teal-700 font-heading">4. Seated Shoulder Rolls and Arm Raises</h4>
                  <p className="mt-2">Sit tall. Shrug both shoulders up toward your ears, then roll them backward and down in a large circle. Repeat 10 times backward, then 10 times forward. Then extend both arms to the sides and slowly raise them overhead (or as high as comfortable). Hold 5 seconds at the top. Lower slowly. Repeat 5 times. This maintains the overhead reaching ability needed for daily tasks like putting away dishes, getting dressed, and reaching shelves.</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <h4 className="text-lg font-bold text-teal-700 font-heading">5. Seated Knee Extension</h4>
                  <p className="mt-2">Sit in a chair with your feet flat on the floor. Slowly straighten your right leg until it is parallel to the floor (or as straight as you can get it). Hold 10 seconds, feeling the stretch behind your knee and the contraction in the front of your thigh. Lower slowly. Repeat 5 times per leg. This combines a gentle hamstring stretch with quadriceps strengthening — the quadriceps are the primary muscles that prevent falls by supporting your knees during walking and stair climbing.</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <h4 className="text-lg font-bold text-teal-700 font-heading">6. Seated Spinal Twist</h4>
                  <p className="mt-2">Sit tall with feet flat on the floor. Place your right hand on your left knee and your left hand on the armrest or seat behind you. Slowly rotate to the left, leading with your eyes. Hold 20 seconds. Return to center. Repeat to the right. Perform twice in each direction. This maintains the torso rotation needed for turning in bed, getting in and out of cars, and looking behind you when walking.</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <h4 className="text-lg font-bold text-teal-700 font-heading">7. Standing Hip Flexor Stretch (with Support)</h4>
                  <p className="mt-2">Stand facing a countertop or sturdy chair, holding it with both hands. Step your right foot back about one to two feet. Bend your left knee slightly and tuck your pelvis under by squeezing your right glute. You should feel a gentle stretch in the front of your right hip. Hold 30 seconds per side. This is gentler than the kneeling version and eliminates the challenge of getting down to and up from the floor.</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <h4 className="text-lg font-bold text-teal-700 font-heading">8. Standing Calf Stretch (with Wall Support)</h4>
                  <p className="mt-2">Stand facing a wall with both hands on the wall at shoulder height. Step your right foot back, keeping the heel on the floor and the leg straight. Lean into the wall until you feel a stretch in your right calf. Hold 30 seconds. Then bend the right knee slightly to stretch the deeper soleus muscle. Hold 30 seconds. Switch legs. Calf flexibility is essential for safe stair navigation and walking on uneven surfaces.</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-2xl font-bold text-slate-900 font-heading">Chair-Assisted Stretches: 8 Stretches You Can Do Sitting</h3>
              <p className="mt-4">For days when standing is challenging, or for those with significant mobility limitations, this complete routine can be done entirely from a sturdy chair. Use a chair without wheels, with armrests if possible.</p>

              <div className="mt-6 space-y-4">
                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <h4 className="text-lg font-bold text-teal-700 font-heading">1. Seated Overhead Reach</h4>
                  <p className="mt-2">Sit tall. Interlace your fingers and press your palms toward the ceiling, straightening your arms as much as comfortable. Lean slightly to the right and hold 15 seconds. Return to center. Lean slightly to the left and hold 15 seconds. Lower your arms. This stretches the lats, intercostals, and shoulders — all muscles that tighten with prolonged sitting.</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <h4 className="text-lg font-bold text-teal-700 font-heading">2. Seated Chest Opener</h4>
                  <p className="mt-2">Sit near the front edge of your chair. Reach both arms behind you and interlace your fingers (or hold a small towel between your hands if your shoulders cannot reach). Lift your chest, squeeze your shoulder blades together, and gently lift your hands away from your back. Hold 20 seconds. This reverses the forward slump posture and opens the chest for better breathing capacity.</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <h4 className="text-lg font-bold text-teal-700 font-heading">3. Seated Figure-Four Hip Stretch</h4>
                  <p className="mt-2">Cross your right ankle over your left knee. Sit tall and gently press your right knee down with your right hand. If comfortable, lean your torso forward slightly from the hips. Hold 30 seconds per side. This stretches the deep hip rotators and is one of the most important stretches for maintaining the hip mobility needed for getting in and out of chairs, cars, and bathtubs.</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <h4 className="text-lg font-bold text-teal-700 font-heading">4. Seated Hamstring Stretch</h4>
                  <p className="mt-2">Sit at the edge of your chair. Extend your right leg forward with the heel on the floor and toes pointing up. Sit tall and gently lean forward from the hips until you feel a stretch behind your right thigh. Keep your back straight — do not round. Hold 30 seconds per side. Use your hands on your left thigh for support.</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <h4 className="text-lg font-bold text-teal-700 font-heading">5. Seated Marching</h4>
                  <p className="mt-2">Sit tall with feet flat on the floor. Lift your right knee toward your chest as high as comfortable, then lower it. Lift your left knee. Continue alternating for 20 repetitions (10 per side). This mobilizes the hip joints, activates the hip flexors, and gently increases heart rate. Add arm swings (opposite arm to opposite knee) for additional upper body involvement.</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <h4 className="text-lg font-bold text-teal-700 font-heading">6. Seated Wrist and Finger Stretches</h4>
                  <p className="mt-2">Extend your right arm forward with palm up. Use your left hand to gently pull back on your right fingers. Hold 15 seconds. Flip your right palm down and pull fingers toward you. Hold 15 seconds. Then spread all fingers as wide as possible and hold 5 seconds. Make tight fists and hold 5 seconds. Repeat the open-close sequence 5 times. Switch hands. Hand and wrist mobility affects your ability to grip, carry, cook, and perform virtually every daily task.</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <h4 className="text-lg font-bold text-teal-700 font-heading">7. Seated Trunk Lateral Flexion</h4>
                  <p className="mt-2">Sit tall. Raise your right arm overhead. Lean your torso to the left, feeling a stretch along the right side of your trunk. Keep your hips anchored to the chair. Hold 15 seconds. Return to center. Raise your left arm and lean right. Hold 15 seconds. Repeat twice per side. This maintains the lateral spinal flexibility needed for reaching, dressing, and household tasks.</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <h4 className="text-lg font-bold text-teal-700 font-heading">8. Seated Foot Stretch</h4>
                  <p className="mt-2">Place a tennis ball or small massage ball under your right foot. Roll the ball slowly from your heel to your toes and back, applying moderate pressure. Spend 30 seconds on each foot. This massages the plantar fascia and intrinsic foot muscles, reduces foot pain, and improves the proprioceptive feedback that helps maintain balance while walking.</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-2xl font-bold text-slate-900 font-heading">Standing Balance Stretches (with Support)</h3>
              <p className="mt-4">These six stretches combine flexibility work with balance training — both critical for fall prevention. Always hold onto a sturdy surface (countertop, heavy chair, wall) with at least one hand.</p>
              <div className="mt-6 space-y-4">
                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <h4 className="text-lg font-bold text-teal-700 font-heading">1. Tandem Stance with Calf Raise</h4>
                  <p className="mt-2">Stand with one hand on a countertop. Place your right foot directly in front of your left foot (heel to toe). Hold this position for 15 seconds. Then rise up onto your toes and hold 5 seconds. Lower slowly. Switch feet (left in front). This challenges your balance system while stretching the Achilles tendon during the calf raise.</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <h4 className="text-lg font-bold text-teal-700 font-heading">2. Standing Quad Stretch with Chair</h4>
                  <p className="mt-2">Hold a chair with your left hand. Bend your right knee and grasp your ankle (or use a towel). Gently pull toward your glute. The balance challenge of standing on one leg provides bonus proprioceptive training. Hold 30 seconds per side.</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <h4 className="text-lg font-bold text-teal-700 font-heading">3. Standing Hip Abduction</h4>
                  <p className="mt-2">Hold a chair with both hands. Lift your right leg out to the side, keeping it straight. Lift as high as comfortable (even a few inches is beneficial). Hold 5 seconds at the top. Lower slowly. Repeat 10 times per side. This strengthens the hip abductors while stretching the adductors — both critical for lateral stability and preventing sideways falls.</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <h4 className="text-lg font-bold text-teal-700 font-heading">4. Heel-to-Toe Walking</h4>
                  <p className="mt-2">Walk along a hallway wall, placing your hand on the wall for support. With each step, place your heel directly in front of the toes of your other foot, as if walking on a tightrope. Take 20 steps forward, then turn and come back. This improves dynamic balance, ankle stability, and proprioception.</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <h4 className="text-lg font-bold text-teal-700 font-heading">5. Standing Knee Lift and Hold</h4>
                  <p className="mt-2">Hold a chair with one hand. Lift your right knee toward your chest and hold it there for 10 seconds. Lower slowly. Repeat 5 times per side. This combines hip flexor stretching (of the standing leg), balance training, and hip flexor strengthening (of the lifting leg). As you improve, try reducing your grip on the chair to just fingertips.</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <h4 className="text-lg font-bold text-teal-700 font-heading">6. Standing Back Extension with Chair</h4>
                  <p className="mt-2">Hold the back of a sturdy chair with both hands. Step back so your arms are extended. Gently arch your back, pushing your chest through your arms while keeping your hips back. Hold 15 seconds. Return to neutral. Repeat 3 times. This stretches the front of the body and decompresses the spine in a safe, supported position.</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-2xl font-bold text-slate-900 font-heading">Fall Prevention Through Flexibility</h3>
              <p className="mt-4">Falls are the leading cause of injury and injury-related death in adults over 65. Research shows that a structured stretching and balance program reduces fall risk by 30 to 40 percent. The stretches above target the three key fall-prevention systems: ankle mobility (allowing you to adjust your base of support quickly), hip strength and flexibility (allowing you to recover your balance when disrupted), and proprioception (your body&apos;s awareness of its position in space). Consistent daily practice is essential — the benefits are cumulative and require ongoing maintenance.</p>
            </div>

            <div>
              <h3 className="text-2xl font-bold text-slate-900 font-heading">Arthritis Management Stretches by Joint</h3>
              <p className="mt-4">Stretching with arthritis requires patience and gentleness, but it is one of the most effective non-pharmaceutical treatments for managing arthritis symptoms. The following stretches target the joints most commonly affected by arthritis.</p>
              <div className="mt-6 space-y-4">
                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <h4 className="text-lg font-bold text-teal-700 font-heading">Knee Arthritis</h4>
                  <p className="mt-2">Seated knee extension (described above), gentle seated hamstring stretch, and standing quad stretch with support. Always warm the joint first with a warm towel or heating pad for 10 minutes before stretching. Never force a swollen joint. Move through whatever range is available without pain.</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <h4 className="text-lg font-bold text-teal-700 font-heading">Hip Arthritis</h4>
                  <p className="mt-2">Seated figure-four stretch, gentle standing hip flexor stretch, seated knee-to-chest, and gentle seated hip circles (lift one foot slightly and draw small circles with your knee). Focus on pain-free range of motion and gradually increase over weeks. Avoid deep squatting positions or crossing legs aggressively.</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <h4 className="text-lg font-bold text-teal-700 font-heading">Shoulder Arthritis</h4>
                  <p className="mt-2">Pendulum swings (described above), seated overhead reach (only to comfortable height), wall finger walks (stand facing a wall and walk your fingers up the wall), and cross-body stretches. Shoulders respond well to gentle, frequent movement — stretch 3 to 4 times daily in short sessions rather than one long session.</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <h4 className="text-lg font-bold text-teal-700 font-heading">Hand and Wrist Arthritis</h4>
                  <p className="mt-2">Finger spreads, gentle fist making, wrist circles, prayer stretches, and finger-to-thumb touches (touch each fingertip to your thumb in sequence). Warm your hands in warm water for 5 minutes before stretching. These stretches maintain the grip strength and dexterity needed for cooking, writing, buttoning clothes, and other essential daily tasks.</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <h4 className="text-lg font-bold text-teal-700 font-heading">Spine Arthritis</h4>
                  <p className="mt-2">Gentle cat-cow (on hands and knees or seated), seated spinal twists, gentle side bends, and supine knee-to-chest stretches. Avoid jarring or high-impact movements. Focus on slow, controlled movements through pain-free ranges. The goal is to maintain the mobility you have, not to force new range.</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <h4 className="text-lg font-bold text-teal-700 font-heading">Ankle Arthritis</h4>
                  <p className="mt-2">Ankle pumps and circles (seated), gentle calf stretches with a wall, towel toe curls, and marble pickups (place marbles on the floor and pick them up with your toes). Ankle arthritis is particularly important to manage because limited ankle mobility directly increases fall risk by reducing your body&apos;s ability to make quick balance adjustments.</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-2xl font-bold text-slate-900 font-heading">When to Use Professional Gentle Stretch Service</h3>
              <p className="mt-4">Our <Link href={getServiceUrl(gentle)} className="text-teal-600 hover:text-teal-700 underline">Gentle Stretch program</Link> is specifically designed for seniors and those with limited mobility. Our therapists are trained in senior-specific techniques, arthritis-friendly modifications, and fall prevention protocols. If you find that self-stretching is becoming difficult due to balance concerns, joint pain, or limited range, a professional therapist can safely guide your body through movements that you cannot achieve alone. Many of our senior clients report significant improvements in daily function after just four sessions.</p>
            </div>

            <div>
              <h3 className="text-2xl font-bold text-slate-900 font-heading">Safety Guidelines for Senior Stretching</h3>
              <p className="mt-4">Always warm up before stretching (march in place for 2 to 3 minutes or take a warm shower). Never bounce or jerk into a stretch. Breathe continuously — never hold your breath. Stop immediately if you feel sharp pain, dizziness, or numbness. Always have a stable support surface nearby during standing stretches. Stretch in a well-lit area free of tripping hazards. Wear non-slip footwear or go barefoot on a non-slip surface. If you have osteoporosis, avoid aggressive forward bending of the spine and consult your physician about which stretches are safe for you. If you take blood pressure medication, rise slowly from any lying or seated position to prevent dizziness from orthostatic hypotension.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          SECTION 8 — STRETCHING BY BODY PART
      ════════════════════════════════════════════════════════════════ */}
      <section id="by-body-part" className="bg-section-teal py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 sm:text-4xl font-heading">Stretching by Body Part</h2>
          <p className="mt-4 text-center text-base text-slate-600">Got a specific area that is tight or painful? Jump to that section. Every stretch includes target muscles, step-by-step instructions, hold time, and common mistakes to avoid.</p>

          <div className="mt-12 space-y-12 text-base leading-relaxed text-slate-700">

            {/* Neck & Shoulders */}
            <div>
              <h3 className="text-2xl font-bold text-slate-900 font-heading">Neck and Shoulders (6 Stretches)</h3>
              <p className="mt-4">The neck and shoulders are the primary tension storage areas for most people, especially those who work at computers, commute, or carry stress. These six stretches target every major muscle group in the neck-shoulder complex. For chronic neck and shoulder tension, our <Link href={getServiceUrl(myofascial)} className="text-teal-600 hover:text-teal-700 underline">myofascial release service</Link> can address deep fascial restrictions that stretching alone cannot resolve.</p>
              <div className="mt-6 space-y-4">
                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <h4 className="text-lg font-bold text-teal-700 font-heading">1. Upper Trapezius Stretch</h4>
                  <p className="mt-1 text-sm text-slate-500"><strong>Target:</strong> Upper trapezius</p>
                  <p className="mt-2">Sit tall. Reach your right hand under the chair to anchor your right shoulder. Tilt your head to the left, bringing your left ear toward your left shoulder. Place your left hand gently on the right side of your head for light additional weight. Hold 30 seconds. Switch sides. Do not pull on the head — let gravity and the weight of your hand do the work. The upper trapezius is the muscle that tightens when you shrug from stress, and it is chronically hypertonic in most adults.</p>
                  <p className="mt-2 text-sm text-slate-500"><strong>Common mistakes:</strong> Pulling aggressively on the head, lifting the shoulder toward the ear, holding the breath.</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <h4 className="text-lg font-bold text-teal-700 font-heading">2. Levator Scapulae Stretch</h4>
                  <p className="mt-1 text-sm text-slate-500"><strong>Target:</strong> Levator scapulae</p>
                  <p className="mt-2">Sit tall. Turn your head 45 degrees to the right. Tuck your chin toward your right collarbone. Place your right hand on the back of your head for gentle additional weight. Anchor your left shoulder by reaching under the chair or pressing your left hand on your thigh. Hold 30 seconds. Switch sides. The levator scapulae runs from the upper cervical vertebrae to the shoulder blade and is the muscle most responsible for the deep, nagging pain between the neck and shoulder that so many people experience.</p>
                  <p className="mt-2 text-sm text-slate-500"><strong>Common mistakes:</strong> Not turning the head enough before tucking the chin, not anchoring the opposite shoulder.</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <h4 className="text-lg font-bold text-teal-700 font-heading">3. SCM Stretch</h4>
                  <p className="mt-1 text-sm text-slate-500"><strong>Target:</strong> Sternocleidomastoid</p>
                  <p className="mt-2">Sit or stand tall. Place your right hand on your left collarbone, pressing gently down to anchor the sternoclavicular attachment. Tilt your head back and to the right, looking up toward the ceiling on your right side. You should feel a stretch along the left side of the front of your neck. Hold 20 seconds. Switch sides. The SCM is often tight from forward head posture and contributes to headaches and jaw tension. Stretch gently — this is a delicate area.</p>
                  <p className="mt-2 text-sm text-slate-500"><strong>Common mistakes:</strong> Extending the neck too aggressively, not anchoring the collarbone, stretching too quickly.</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <h4 className="text-lg font-bold text-teal-700 font-heading">4. Cross-Body Shoulder Stretch</h4>
                  <p className="mt-1 text-sm text-slate-500"><strong>Target:</strong> Posterior deltoid, infraspinatus, teres minor</p>
                  <p className="mt-2">Bring your right arm across your body at chest height. Use your left hand to pull your right arm closer by pressing above the elbow (never on the joint). Keep your right shoulder pressed down away from your ear. Hold 30 seconds per side. This stretches the posterior shoulder muscles that tighten from desk work and contribute to shoulder impingement.</p>
                  <p className="mt-2 text-sm text-slate-500"><strong>Common mistakes:</strong> Shrugging the shoulder, pressing on the elbow joint, rotating the torso toward the arm.</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <h4 className="text-lg font-bold text-teal-700 font-heading">5. Behind-the-Back Shoulder Stretch</h4>
                  <p className="mt-1 text-sm text-slate-500"><strong>Target:</strong> Internal rotators, subscapularis, anterior deltoid, pectorals</p>
                  <p className="mt-2">Stand tall. Reach your right arm behind your back and use your left hand to grasp your right wrist. Gently pull your right hand toward your left hip. Stand tall and lift your chest. Hold 30 seconds per side. For a deeper variation, interlace your fingers behind your back and lift your arms while leaning forward from the hips. This stretches the internal rotators and pectorals that shorten from computer and phone use.</p>
                  <p className="mt-2 text-sm text-slate-500"><strong>Common mistakes:</strong> Rounding the shoulders forward (defeats the purpose), pulling too aggressively, not maintaining upright posture.</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <h4 className="text-lg font-bold text-teal-700 font-heading">6. Suboccipital Release</h4>
                  <p className="mt-1 text-sm text-slate-500"><strong>Target:</strong> Suboccipital muscles (rectus capitis, obliquus capitis)</p>
                  <p className="mt-2">Sit in a chair. Place both hands behind your head with fingers interlaced at the base of your skull — right where your head meets your neck. Gently tuck your chin and allow the weight of your arms to apply gentle traction, pulling your head forward and slightly down. You should feel a deep stretch at the very base of your skull. Hold 30 to 45 seconds. This targets the tiny but powerful suboccipital muscles that are responsible for a huge percentage of tension headaches and upper neck pain. They become hypertonic from screen use because they must work constantly to keep your eyes level when your head is in a forward position.</p>
                  <p className="mt-2 text-sm text-slate-500"><strong>Common mistakes:</strong> Pulling too hard (this area is sensitive), rounding the entire spine instead of just tucking the chin.</p>
                </div>
              </div>
            </div>

            {/* Upper Back & Thoracic Spine */}
            <div>
              <h3 className="text-2xl font-bold text-slate-900 font-heading">Upper Back and Thoracic Spine (5 Stretches)</h3>
              <p className="mt-4">The thoracic spine (mid-back) is designed for rotation and extension, but modern life locks it in flexion. These stretches restore thoracic mobility, which improves breathing, reduces neck and shoulder strain, and prevents lower back compensation.</p>
              <div className="mt-6 space-y-4">
                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <h4 className="text-lg font-bold text-teal-700 font-heading">1. Foam Roller Thoracic Extension</h4>
                  <p className="mt-1 text-sm text-slate-500"><strong>Target:</strong> Thoracic extensors, pectorals, intercostals</p>
                  <p className="mt-2">Place a foam roller horizontally on the floor. Sit in front of it and lie back so the roller is positioned across your mid-back (around the bottom of your shoulder blades). Interlace your fingers behind your head to support your neck. Keeping your hips on the floor, gently extend your upper back over the roller. You should feel a stretch across your chest and a mobilization of your thoracic vertebrae. Hold 10 seconds, then reposition the roller one vertebral segment higher and repeat. Work from your mid-back to your upper back in 5 to 6 positions. For guided foam rolling instruction, check out our <Link href={getServiceUrl(foam)} className="text-teal-600 hover:text-teal-700 underline">foam rolling service</Link>.</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <h4 className="text-lg font-bold text-teal-700 font-heading">2. Thread the Needle</h4>
                  <p className="mt-1 text-sm text-slate-500"><strong>Target:</strong> Thoracic rotators, rhomboids, posterior deltoid</p>
                  <p className="mt-2">On all fours, reach your right arm under your body and past your left hand, placing your right shoulder and temple on the floor. Hold 20 seconds per side. For a deeper rotation, extend the top arm toward the ceiling before threading. See the full instructions in the 30-45 section above.</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <h4 className="text-lg font-bold text-teal-700 font-heading">3. Cat-Cow (Thoracic Focus)</h4>
                  <p className="mt-1 text-sm text-slate-500"><strong>Target:</strong> Thoracic flexors and extensors</p>
                  <p className="mt-2">Perform the standard cat-cow, but focus exclusively on the thoracic spine by minimizing movement in the lower back and neck. This requires more body awareness but produces better targeted results. In Cow, focus on drawing your shoulder blades together and lifting only the chest. In Cat, focus on pushing the space between your shoulder blades toward the ceiling. Hold each position for 5 seconds and perform 8 repetitions.</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <h4 className="text-lg font-bold text-teal-700 font-heading">4. Open Book Stretch</h4>
                  <p className="mt-1 text-sm text-slate-500"><strong>Target:</strong> Thoracic rotators, pectorals, obliques</p>
                  <p className="mt-2">Lie on your left side with knees stacked and bent at 90 degrees. Extend both arms in front of you at chest height, palms together. Slowly lift your right arm and rotate your torso, opening your chest to the ceiling and reaching your right arm toward the floor behind you. Follow your hand with your gaze. Your knees should stay stacked (lock the lower body). Hold 10 seconds at end range, then close back to start. Repeat 8 times per side. This is one of the single best exercises for thoracic rotation.</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <h4 className="text-lg font-bold text-teal-700 font-heading">5. Prone Y-T-W Raises</h4>
                  <p className="mt-1 text-sm text-slate-500"><strong>Target:</strong> Lower trapezius, mid-trapezius, rhomboids, rotator cuff</p>
                  <p className="mt-2">Lie face down on the floor. Raise both arms into a Y position (overhead at 45-degree angles), hold 5 seconds. Lower. Raise into a T position (straight out to the sides), hold 5 seconds. Lower. Raise into a W position (elbows bent at 90 degrees, squeeze shoulder blades together), hold 5 seconds. Repeat the Y-T-W sequence 5 times. This strengthens the posterior shoulder and upper back muscles while stretching the anterior muscles that tighten from desk work. It is technically a strengthening exercise that also functions as a stretch for the opposing muscles.</p>
                </div>
              </div>
            </div>

            {/* Lower Back */}
            <div>
              <h3 className="text-2xl font-bold text-slate-900 font-heading">Lower Back (6 Stretches)</h3>
              <p className="mt-4">Lower back pain affects 80 percent of adults at some point. Most lower back pain is caused by tight muscles elsewhere (hip flexors, hamstrings, piriformis) pulling the pelvis out of alignment. These stretches address both the lower back directly and the muscles that most commonly cause lower back pain. For comprehensive back pain treatment, see our <Link href="/stretching-101/stretching-for-back-pain" className="text-teal-600 hover:text-teal-700 underline">stretching for back pain guide</Link>.</p>
              <div className="mt-6 space-y-4">
                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <h4 className="text-lg font-bold text-teal-700 font-heading">1. Supine Knee-to-Chest</h4>
                  <p className="mt-2">Lie on your back. Pull one knee to your chest, then both. Hold 45 seconds each variation. The supine position eliminates gravity so your back muscles can fully relax. See full instructions in the 45-60 section.</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <h4 className="text-lg font-bold text-teal-700 font-heading">2. Child&apos;s Pose</h4>
                  <p className="mt-2">Kneel with knees wide, big toes touching. Sit back on your heels and walk hands forward, lowering your chest to the floor. Hold 60 seconds. Breathe into your lower back. This gently flexes and decompresses the lumbar spine. For more lat stretch, walk your hands to the right and hold 20 seconds, then to the left.</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <h4 className="text-lg font-bold text-teal-700 font-heading">3. Supine Spinal Twist</h4>
                  <p className="mt-2">Lie on your back, arms in a T. Bend your right knee and cross it over your body to the left. Keep both shoulders on the floor. Turn your head to the right. Hold 45 seconds per side. This stretches the lower back rotators, glutes, and obliques while providing gentle traction to the lumbar spine. The rotation should come from the hips and lower back, not the mid-back.</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <h4 className="text-lg font-bold text-teal-700 font-heading">4. Prone Press-Up (McKenzie Extension)</h4>
                  <p className="mt-2">Lie face down. Press through your hands to lift your chest while keeping hips on the floor. Hold 10 seconds. Repeat 5 to 8 times. This is the go-to exercise for disc-related back pain and reverses the flexed position from sitting. See full instructions in the 30-45 section. If this worsens your pain, stop and consult a professional.</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <h4 className="text-lg font-bold text-teal-700 font-heading">5. Piriformis Stretch (Figure-Four)</h4>
                  <p className="mt-2">Lie on your back. Cross your right ankle over your left knee. Pull your left thigh toward your chest. Hold 45 seconds per side. The piriformis, when tight, can compress the sciatic nerve and cause pain that radiates from the lower back down the leg. This stretch directly addresses that pattern and provides relief for many sciatica sufferers.</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <h4 className="text-lg font-bold text-teal-700 font-heading">6. Cat-Cow</h4>
                  <p className="mt-2">On all fours, alternate between arching and rounding the spine. Perform 10 slow repetitions. This is not a stretch in the traditional sense — it is spinal mobilization that lubricates the facet joints and reduces stiffness. It is safe for almost all types of back pain and is the first exercise most physical therapists prescribe.</p>
                </div>
              </div>
            </div>

            {/* Hips & Hip Flexors */}
            <div>
              <h3 className="text-2xl font-bold text-slate-900 font-heading">Hips and Hip Flexors (6 Stretches)</h3>
              <p className="mt-4">The hips are where most mobility problems originate. Tight hip flexors cause lower back pain, tight glutes cause sciatica, and tight hip rotators limit every movement pattern in the body. If you only have time to stretch one area, stretch your hips.</p>
              <div className="mt-6 space-y-4">
                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <h4 className="text-lg font-bold text-teal-700 font-heading">1. Kneeling Hip Flexor Stretch</h4>
                  <p className="mt-2">Kneel on left knee, right foot flat forward. Tuck pelvis and press hips forward. Add overhead reach for intensification. Hold 45 seconds per side. The most important hip stretch for anyone who sits.</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <h4 className="text-lg font-bold text-teal-700 font-heading">2. Pigeon Pose</h4>
                  <p className="mt-2">From plank, bring right knee forward behind right wrist. Extend left leg back. Lower hips. Fold forward. Hold 60 seconds per side. The deepest hip external rotation stretch available without equipment. If the floor version is too intense, perform it with your front shin on a bed or bench.</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <h4 className="text-lg font-bold text-teal-700 font-heading">3. 90/90 Stretch</h4>
                  <p className="mt-2">Sit with both knees at 90-degree angles as described in the 18-30 section. Lean forward over the front shin for a deeper glute stretch, or lean backward for a deeper hip flexor stretch on the back leg. Hold 45 seconds per side. This is one of the most comprehensive hip stretches because it addresses external rotation, internal rotation, and flexion/extension simultaneously.</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <h4 className="text-lg font-bold text-teal-700 font-heading">4. Butterfly Stretch (Seated)</h4>
                  <p className="mt-2">Sit with the soles of your feet together and knees open to the sides. Hold your feet and sit tall. Gently press your knees toward the floor using your elbows. Lean forward from the hips (not the waist) for a deeper stretch. Hold 45 seconds. This stretches the hip adductors and is particularly important for people whose knees tend to collapse inward during squats or walking.</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <h4 className="text-lg font-bold text-teal-700 font-heading">5. Frog Stretch</h4>
                  <p className="mt-2">Start on all fours. Widen your knees as far as comfortable, keeping your feet in line with your knees (shins parallel). Slowly push your hips back toward your heels. You should feel an intense stretch in your inner thighs and groin. Hold 30 to 45 seconds. This is an advanced adductor stretch — if the butterfly stretch feels easy, the frog stretch is the next progression. Start conservatively and build depth over weeks.</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <h4 className="text-lg font-bold text-teal-700 font-heading">6. Standing IT Band Stretch</h4>
                  <p className="mt-2">Stand tall. Cross your right foot behind your left foot. Raise your right arm overhead and lean to the left, pushing your right hip out to the right. You should feel a stretch along the outside of your right thigh and hip. Hold 30 seconds per side. The IT band itself is fascia and does not stretch much, but this position stretches the TFL and gluteus medius muscles that attach to it and are the actual source of most IT band syndrome symptoms.</p>
                </div>
              </div>
            </div>

            {/* Hamstrings & Glutes */}
            <div>
              <h3 className="text-2xl font-bold text-slate-900 font-heading">Hamstrings and Glutes (5 Stretches)</h3>
              <p className="mt-4">Tight hamstrings and glutes are the leading cause of lower back pain in desk workers and the primary limiters of athletic performance. These five stretches progress from gentle to advanced.</p>
              <div className="mt-6 space-y-4">
                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <h4 className="text-lg font-bold text-teal-700 font-heading">1. Supine Hamstring Stretch with Strap</h4>
                  <p className="mt-2">Lie on your back. Loop a strap around one foot and extend the leg toward the ceiling. Keep the leg straight. Pull gently until you feel moderate tension. Hold 60 seconds per side. The supine position eliminates lower back stress and allows the hamstring to relax fully — making this the most effective self-administered hamstring stretch.</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <h4 className="text-lg font-bold text-teal-700 font-heading">2. Standing Forward Fold</h4>
                  <p className="mt-2">Stand with feet hip-width apart. Exhale and fold forward from the hips. Let your head hang. Bend knees as needed. Hold 45 seconds. Grab opposite elbows and sway. This stretches the entire posterior chain simultaneously and provides gentle spinal traction.</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <h4 className="text-lg font-bold text-teal-700 font-heading">3. Seated Single-Leg Forward Fold</h4>
                  <p className="mt-2">Sit with right leg extended, left foot against right inner thigh. Hinge forward from hips over right leg, keeping back flat. Hold 45 seconds per side. This isolates one hamstring at a time for more targeted stretching.</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <h4 className="text-lg font-bold text-teal-700 font-heading">4. Figure-Four Glute Stretch</h4>
                  <p className="mt-2">Lie on your back, cross right ankle over left knee, pull left thigh toward chest. Hold 45 seconds per side. See full instructions in the 18-30 post-workout section. This is the go-to stretch for piriformis syndrome and glute tightness.</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <h4 className="text-lg font-bold text-teal-700 font-heading">5. Pigeon Pose</h4>
                  <p className="mt-2">The deepest glute and hip rotator stretch. See full instructions above. Hold 60 seconds per side. If you have knee issues, use the supine figure-four variation instead — it provides similar glute stretching without knee stress.</p>
                </div>
              </div>
            </div>

            {/* Calves & Ankles */}
            <div>
              <h3 className="text-2xl font-bold text-slate-900 font-heading">Calves and Ankles (4 Stretches)</h3>
              <p className="mt-4">Calf and ankle flexibility directly impacts squat depth, running mechanics, walking safety, and fall prevention. These four stretches cover every angle.</p>
              <div className="mt-6 space-y-4">
                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <h4 className="text-lg font-bold text-teal-700 font-heading">1. Wall Calf Stretch (Straight Knee)</h4>
                  <p className="mt-2">Stand facing a wall. Step one foot back, keep leg straight, heel down. Lean into wall. Hold 30 seconds per side. Targets the gastrocnemius — the larger, more superficial calf muscle.</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <h4 className="text-lg font-bold text-teal-700 font-heading">2. Wall Calf Stretch (Bent Knee)</h4>
                  <p className="mt-2">Same position but bend the back knee slightly. The stretch shifts to the deeper soleus muscle and the Achilles tendon area. Hold 30 seconds per side. Both the straight-knee and bent-knee versions are important — they target different muscles.</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <h4 className="text-lg font-bold text-teal-700 font-heading">3. Step Drop (Eccentric Calf Stretch)</h4>
                  <p className="mt-2">Stand on a step or curb with the balls of your feet on the edge and your heels hanging off. Slowly lower your heels below the level of the step until you feel a deep stretch in both calves. Hold 30 seconds. Rise back up. Repeat 3 times. This is the most effective calf and Achilles tendon stretch because it allows gravity to assist the stretch below neutral ankle position — a range you cannot access on flat ground.</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <h4 className="text-lg font-bold text-teal-700 font-heading">4. Ankle Dorsiflexion Stretch (Knee-to-Wall)</h4>
                  <p className="mt-2">Face a wall in a half-kneeling position with your front foot about 4 inches from the wall. Keeping your front heel flat on the floor, drive your front knee forward to touch the wall. If it touches easily, move your foot back an inch and repeat. The goal is to find the distance where you can barely touch the wall with your knee while keeping the heel down. Hold the maximum depth for 30 seconds per side. Repeat 3 times. This specifically targets ankle dorsiflexion — the most functionally important ankle movement for squatting, walking, climbing stairs, and fall prevention.</p>
                </div>
              </div>
            </div>

            {/* Wrists & Forearms */}
            <div>
              <h3 className="text-2xl font-bold text-slate-900 font-heading">Wrists and Forearms (4 Stretches)</h3>
              <p className="mt-4">Critical for anyone who types, texts, games, cooks, or plays a musical instrument. Wrist and forearm tightness leads to carpal tunnel symptoms, tennis elbow, golfer&apos;s elbow, and grip weakness.</p>
              <div className="mt-6 space-y-4">
                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <h4 className="text-lg font-bold text-teal-700 font-heading">1. Wrist Flexor Stretch</h4>
                  <p className="mt-2">Extend your right arm in front with palm up and fingers pointing down. Use your left hand to gently pull your right fingers back toward your body. Hold 30 seconds per hand. Stretches the muscles and tendons on the inside of your forearm that tighten from gripping and typing.</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <h4 className="text-lg font-bold text-teal-700 font-heading">2. Wrist Extensor Stretch</h4>
                  <p className="mt-2">Extend your right arm with palm facing down and fingers pointing toward the floor. Use your left hand to press the back of your right hand, pulling fingers toward your body. Hold 30 seconds per hand. Stretches the muscles on the outside of your forearm that tighten from mouse use and lead to tennis elbow.</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <h4 className="text-lg font-bold text-teal-700 font-heading">3. Prayer Stretch</h4>
                  <p className="mt-2">Press your palms together in front of your chest in a prayer position with fingers pointing up. Slowly lower your hands while keeping palms pressed together until you feel a stretch in your wrists and inner forearms. Hold 30 seconds. Then reverse: press the backs of your hands together with fingers pointing down and raise your hands. Hold 30 seconds. This covers both flexion and extension in a single exercise.</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-6">
                  <h4 className="text-lg font-bold text-teal-700 font-heading">4. Tabletop Finger Stretch</h4>
                  <p className="mt-2">Place your palms flat on a table with fingers spread wide. Lean your body weight forward slightly, keeping palms flat. You should feel a stretch through your wrists, palms, and fingers. Hold 20 seconds. Then flip your hands over so the backs of your hands are on the table with fingers pointing toward you and lean back slightly. Hold 20 seconds. This mobilizes the carpal bones and intrinsic hand muscles that become restricted from repetitive gripping and typing positions.</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          SECTION 9 — STRETCHING BY ACTIVITY
      ════════════════════════════════════════════════════════════════ */}
      <section id="by-activity" className="bg-section-white py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 sm:text-4xl font-heading">Stretching by Activity</h2>
          <p className="mt-4 text-center text-base text-slate-600">Different activities create different tightness patterns. Here are sport-specific and activity-specific stretching protocols designed by our certified therapists. For a deep dive into athlete-specific stretching, see our <Link href="/stretching-101/stretching-for-athletes" className="text-teal-600 hover:text-teal-700 underline">stretching for athletes guide</Link>.</p>

          <div className="mt-12 space-y-10 text-base leading-relaxed text-slate-700">
            <div>
              <h3 className="text-2xl font-bold text-slate-900 font-heading">For Runners</h3>
              <p className="mt-4"><strong>Pre-run (dynamic, 5 minutes):</strong> Leg swings forward/back (15 per leg), leg swings side-to-side (15 per leg), walking knee hugs (10 per leg), walking quad pulls (10 per leg), high knees for 30 seconds, butt kicks for 30 seconds. This sequence activates the hip flexors, hamstrings, quads, and calves while elevating heart rate to running readiness.</p>
              <p className="mt-4"><strong>Post-run (static, 10 minutes):</strong> Standing quad stretch (45 seconds per side), standing hamstring stretch with elevated foot (45 seconds per side), standing calf stretch — straight and bent knee (30 seconds each per side), pigeon pose (60 seconds per side), standing IT band stretch (30 seconds per side), standing hip flexor stretch (45 seconds per side). Never skip the post-run stretch — running creates enormous repetitive loading on the same muscle groups, and without regular lengthening, these muscles progressively tighten and eventually cause injury. Our <Link href={getServiceUrl(active)} className="text-teal-600 hover:text-teal-700 underline">active stretch service</Link> is particularly popular with NYC runners who train in Central Park and along the Hudson River Greenway.</p>
            </div>

            <div>
              <h3 className="text-2xl font-bold text-slate-900 font-heading">For Cyclists</h3>
              <p className="mt-4"><strong>Key areas of concern:</strong> Cycling locks your hips in a flexed, internally rotated position for extended periods. This chronically shortens the hip flexors, tightens the quadriceps, rounds the upper back, and compresses the lower back. Cyclists also develop extremely tight piriformis and IT band muscles from the repetitive pedaling motion.</p>
              <p className="mt-4"><strong>Essential cycling stretches:</strong> Kneeling hip flexor stretch with overhead reach (60 seconds per side), pigeon pose (60 seconds per side), standing quad stretch (45 seconds per side), doorway chest opener at all three angles (30 seconds each), thoracic extension over foam roller (6 positions), prone press-ups (8 repetitions). If you cycle more than three times per week, a weekly professional <Link href={getServiceUrl(assisted)} className="text-teal-600 hover:text-teal-700 underline">assisted stretch session</Link> can prevent the chronic tightness patterns that plague serious cyclists.</p>
            </div>

            <div>
              <h3 className="text-2xl font-bold text-slate-900 font-heading">For Basketball and Tennis Players</h3>
              <p className="mt-4"><strong>Key areas of concern:</strong> These sports require explosive lateral movement, overhead reaching, and rapid direction changes. The shoulders, ankles, and hips bear the brunt of the stress. Ankle sprains are the most common basketball injury, and shoulder issues are the most common tennis injury — both are largely preventable with adequate flexibility.</p>
              <p className="mt-4"><strong>Essential stretches:</strong> Ankle dorsiflexion stretch (3 sets of 30 seconds per side), lateral lunges (10 per side), arm circles building to full range (15 each direction), cross-body shoulder stretch (30 seconds per side), behind-the-back shoulder stretch (30 seconds per side), standing hip circles (10 per direction), dynamic calf raises (15 per side). For tennis players, add wrist flexor and extensor stretches (30 seconds each) to protect against tennis elbow.</p>
            </div>

            <div>
              <h3 className="text-2xl font-bold text-slate-900 font-heading">For Swimmers</h3>
              <p className="mt-4"><strong>Key areas of concern:</strong> Swimming is the most shoulder-dependent sport. Swimmer&apos;s shoulder (shoulder impingement from repetitive overhead motion) is the most common swimming injury. The key to prevention is maintaining excellent shoulder internal and external rotation range of motion, thoracic extension, and lat flexibility.</p>
              <p className="mt-4"><strong>Essential stretches:</strong> Doorway chest stretch at all three angles (30 seconds each), cross-body shoulder stretch (30 seconds per side), sleeper stretch (lie on your side with bottom arm at 90 degrees, use top hand to rotate bottom forearm toward the floor — 30 seconds per side), lat stretch (hang from a pull-up bar or kneel and reach forward on an elevated surface — 30 seconds), thoracic extension over foam roller (6 positions), ankle dorsiflexion stretch (for kick mechanics — 30 seconds per side).</p>
            </div>

            <div>
              <h3 className="text-2xl font-bold text-slate-900 font-heading">For CrossFit and Weightlifting</h3>
              <p className="mt-4"><strong>Key areas of concern:</strong> These activities demand full-body mobility, particularly overhead position (snatches, jerks, overhead squats), hip flexion (squats, cleans), and thoracic extension (front rack, overhead positions). Limited mobility in any of these areas leads to compensation and eventual injury.</p>
              <p className="mt-4"><strong>Essential stretches:</strong> Ankle dorsiflexion stretch (essential for squat depth — 3 sets of 30 seconds per side), couch stretch for hip flexors (60 seconds per side), thoracic extension over foam roller, lat stretch (30 seconds), overhead shoulder stretch with band or PVC pipe, wrist stretches (barbell front rack position stresses wrists enormously), pigeon pose (60 seconds per side). A pre-training <Link href={getServiceUrl(dynamic)} className="text-teal-600 hover:text-teal-700 underline">dynamic stretch session</Link> and post-training <Link href={getServiceUrl(staticS)} className="text-teal-600 hover:text-teal-700 underline">static stretch session</Link> are ideal for serious lifters.</p>
            </div>

            <div>
              <h3 className="text-2xl font-bold text-slate-900 font-heading">For Yoga Practitioners</h3>
              <p className="mt-4"><strong>Key areas of concern:</strong> Advanced yoga practitioners sometimes develop hypermobility in certain joints while maintaining restrictions in others. The goal for yogis is balanced flexibility — specifically targeting the areas that limit your practice without overstretching areas that are already mobile.</p>
              <p className="mt-4"><strong>Complementary stretches for yogis:</strong> PNF contract-relax technique for persistent tight areas (requires a partner or therapist), myofascial release for fascial restrictions that static yoga stretches do not address, strengthening exercises for hypermobile joints (the missing component in many yoga practices). If you have been doing yoga for years and still cannot achieve certain positions, the limitation may be fascial rather than muscular — a <Link href={getServiceUrl(myofascial)} className="text-teal-600 hover:text-teal-700 underline">myofascial release session</Link> can break through these plateaus.</p>
            </div>

            <div>
              <h3 className="text-2xl font-bold text-slate-900 font-heading">For Dancers</h3>
              <p className="mt-4"><strong>Key areas of concern:</strong> Dance requires extreme flexibility combined with strength and control. Splits, high extensions, turnout, and backbends all require targeted flexibility work beyond what general stretching provides.</p>
              <p className="mt-4"><strong>Essential stretches:</strong> Progressive split training (front splits and middle splits should be trained separately, with 60-second holds at your maximum depth, performed after a thorough warm-up only), PNF contract-relax for hip flexors and hamstrings (this is where a professional therapist makes the biggest difference for dancers), hip rotation stretches (90/90, pigeon, frog), thoracic extension for backbends, ankle stretches for pointe and relevance. Our <Link href={getServiceUrl(ballistic)} className="text-teal-600 hover:text-teal-700 underline">ballistic stretch service</Link> is available for conditioned dancers who have already built a strong flexibility foundation and need to develop the explosive end-range flexibility that performance demands.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          SECTION 10 — STRETCHING BY TIME OF DAY
      ════════════════════════════════════════════════════════════════ */}
      <section id="by-time-of-day" className="bg-section-teal py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 sm:text-4xl font-heading">Stretching by Time of Day</h2>
          <p className="mt-4 text-center text-base text-slate-600">Different times of day call for different stretching approaches. Your body&apos;s temperature, hormonal state, and nervous system readiness change throughout the day. Here are complete routines optimized for each time window. For our full daily routine guide, see our <Link href="/stretching-101/daily-stretching-routine" className="text-teal-600 hover:text-teal-700 underline">daily stretching routine page</Link>.</p>

          <div className="mt-12 space-y-10 text-base leading-relaxed text-slate-700">
            <div>
              <h3 className="text-2xl font-bold text-slate-900 font-heading">Morning Stretches — Wake Up Your Body (5 Minutes)</h3>
              <p className="mt-4">Your body is coldest and stiffest in the morning. Synovial fluid in your joints has thickened overnight. Discs in your spine are maximally hydrated (which actually increases stiffness). The goal is not deep flexibility work — it is gentle mobilization to wake up your nervous system and prepare your joints for the day.</p>
              <p className="mt-4"><strong>5-Minute Morning Routine:</strong> Start in bed with a full-body stretch (reach and point toes — 10 seconds), then hug knees to chest (15 seconds). Sit up and do 10 gentle neck circles. Stand and perform Cat-Cow (6 cycles). Do 10 arm circles each direction. Finish with standing forward fold with bent knees (30 seconds). Total time: about 5 minutes. This sequence progressively moves from lying to standing, gently raising body temperature and lubricating every major joint system.</p>
              <p className="mt-4">Morning is NOT the time for aggressive static stretching or trying to improve your range of motion. Save that for later in the day when your muscles are warm. Morning stretching is about mobilization and readiness. Think of it as oiling the hinges, not trying to stretch the metal.</p>
            </div>

            <div>
              <h3 className="text-2xl font-bold text-slate-900 font-heading">Midday Stretches — Combat Desk Slump (3 Minutes)</h3>
              <p className="mt-4">By midday, you have been sitting for several hours and your posture has progressively deteriorated. Your hip flexors are shortened, your shoulders are rounded, and your thoracic spine is flexed. This 3-minute routine reverses these patterns and gives your brain a cognitive reset.</p>
              <p className="mt-4"><strong>3-Minute Midday Reset:</strong> Stand up and interlace fingers behind your back, lifting your chest and squeezing your shoulder blades (20 seconds). Do 5 chin tucks (5 seconds each). Seated spinal twist — 20 seconds each side. Standing hip flexor stretch using your desk for balance — 20 seconds per side. 10 shoulder blade squeezes. Standing calf raises — 10 reps. Finish with 3 deep breaths — 4 counts in, 8 counts out. Set a timer to repeat this every 2 hours. The productivity boost from the cognitive reset alone justifies the 3 minutes invested.</p>
            </div>

            <div>
              <h3 className="text-2xl font-bold text-slate-900 font-heading">Pre-Workout Stretches — Dynamic Warm-Up (10 Minutes)</h3>
              <p className="mt-4">Before any exercise, your goal is to prepare your muscles and nervous system for the demands ahead. Dynamic stretching — controlled movements through your full range of motion — is the gold standard pre-workout approach. Static stretching before intense exercise has been shown to temporarily decrease power output by 5 to 8 percent, so save the static holds for after.</p>
              <p className="mt-4"><strong>10-Minute Dynamic Warm-Up:</strong> March in place for 1 minute (gradually increasing knee height). Leg swings forward/back — 15 per leg. Leg swings side to side — 15 per leg. Walking knee hugs — 10 per leg. Walking quad pulls — 10 per leg. Arm circles building from small to large — 15 each direction. World&apos;s Greatest Stretch — 4 per side. Inchworms — 5 reps. Bodyweight squats — 10 reps (focus on full depth). High knees for 30 seconds. This progression systematically prepares every major joint and muscle group while progressively elevating heart rate and core temperature.</p>
            </div>

            <div>
              <h3 className="text-2xl font-bold text-slate-900 font-heading">Post-Workout Stretches — Recovery Cool-Down (10 Minutes)</h3>
              <p className="mt-4">After exercise is the single best time for static stretching. Your muscles are at their warmest, most pliable, and most receptive to lengthening. Post-workout stretching reduces delayed onset muscle soreness (DOMS), helps muscles return to resting length, and produces the biggest long-term flexibility improvements.</p>
              <p className="mt-4"><strong>10-Minute Cool-Down Routine:</strong> Standing forward fold — 60 seconds. Standing quad stretch — 45 seconds per side. Kneeling hip flexor stretch — 45 seconds per side. Pigeon pose — 60 seconds per side. Lying spinal twist — 45 seconds per side. Child&apos;s pose — 60 seconds. Hold each stretch at moderate intensity and breathe deeply. Do not rush. For accelerated recovery after particularly intense sessions, consider booking a professional <Link href={getServiceUrl(recovery)} className="text-teal-600 hover:text-teal-700 underline">recovery stretch service</Link> — our therapists can reduce your recovery time by 40 to 60 percent.</p>
            </div>

            <div>
              <h3 className="text-2xl font-bold text-slate-900 font-heading">Evening Stretches — Prepare for Sleep (10 Minutes)</h3>
              <p className="mt-4">Evening stretching is the most underrated time window. The combination of gentle stretching and slow breathing powerfully activates the parasympathetic nervous system, shifting your body from daytime stress mode into sleep-ready relaxation mode. Studies show that 10 minutes of gentle stretching before bed reduces sleep onset latency by 30 percent and improves subjective sleep quality.</p>
              <p className="mt-4"><strong>10-Minute Evening Routine:</strong> Perform in dim lighting, on a comfortable surface, wearing loose clothing. Supine hamstring stretch with strap — 60 seconds per side. Happy Baby pose — 60 seconds. Supine spinal twist — 45 seconds per side. Reclined butterfly — 90 seconds. Legs up the wall — 2 to 3 minutes. Throughout the entire routine, breathe slowly: 4-second inhale through the nose, 6 to 8-second exhale through the mouth. This breathing pattern directly stimulates the vagus nerve, which is the primary activation pathway for the parasympathetic nervous system. Within minutes of finishing, you should feel noticeably calmer and ready for sleep.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          SECTION 11 — NYC-SPECIFIC STRETCHING TIPS
      ════════════════════════════════════════════════════════════════ */}
      <section id="nyc-tips" className="bg-section-white py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 sm:text-4xl font-heading">NYC-Specific Stretching Tips</h2>
          <p className="mt-4 text-center text-base text-slate-600">New York City creates unique physical demands. Here is how to stretch specifically for the NYC lifestyle — whether you live here, work here, or are visiting.</p>

          <div className="mt-12 space-y-10 text-base leading-relaxed text-slate-700">
            <div>
              <h3 className="text-2xl font-bold text-slate-900 font-heading">Stretches You Can Do on the Subway Platform</h3>
              <p className="mt-4">The average NYC commuter spends 40 minutes per day waiting on subway platforms. That is over 200 hours per year of standing in one place. Use that time productively with these discreet stretches that nobody will notice (this is New York — nobody is looking at you anyway).</p>
              <p className="mt-4"><strong>Standing calf raises:</strong> Rise up on your toes and lower slowly. 15 reps. Nobody can tell. <strong>Weight shifting:</strong> Shift your weight slowly from one foot to the other. Adds ankle mobility. <strong>Standing hip circles:</strong> Small, subtle circles with your hips. Mobilizes the hip joints. <strong>Shoulder blade squeezes:</strong> Squeeze and release. 10 reps. Reverses your backpack or messenger bag posture. <strong>Chin tucks:</strong> Tuck your chin back. Hold 5 seconds. The single best exercise for tech neck. Do it 10 times while you wait.</p>
            </div>

            <div>
              <h3 className="text-2xl font-bold text-slate-900 font-heading">Desk Stretches for NYC Offices</h3>
              <p className="mt-4">NYC office workers sit an average of 10 to 12 hours per day when you combine desk time, commute time, and evening screen time. The desk stretches outlined in the 18-30 and 30-45 sections above are essential. But here is the NYC-specific advice: if you work in a typical Manhattan office with an open floor plan, you can do all of the seated stretches without drawing attention. For the standing stretches, use the stairwell, the bathroom, or simply stand at your desk. Many WeWork and coworking spaces in NYC now have dedicated wellness rooms — use them. For companies looking to implement workplace stretching programs, see our <Link href="/corporate-wellness" className="text-teal-600 hover:text-teal-700 underline">corporate wellness page</Link>.</p>
            </div>

            <div>
              <h3 className="text-2xl font-bold text-slate-900 font-heading">Hotel Room Stretches for Tourists</h3>
              <p className="mt-4">NYC tourists walk an average of 20,000 to 30,000 steps per day — far more than most people are accustomed to. By evening, your feet, calves, lower back, and hips are screaming. Here is the perfect hotel room routine: spend 10 minutes doing the evening wind-down routine from the 18-30 section (supine hamstring stretch, happy baby, legs up the wall, reclined butterfly). Add standing calf stretches using the wall and a seated figure-four for your hips. This routine requires zero equipment and fits in any hotel room. For an even better experience, <Link href="/hotel-stretching" className="text-teal-600 hover:text-teal-700 underline">book a professional hotel stretch session</Link> — we bring everything to your room and stretch you from head to toe while you relax.</p>
            </div>

            <div>
              <h3 className="text-2xl font-bold text-slate-900 font-heading">Park Stretching Tips</h3>
              <p className="mt-4">NYC has some of the best outdoor stretching environments in the world. <Link href="/parks/central-park" className="text-teal-600 hover:text-teal-700 underline">Central Park</Link> offers flat, grassy areas throughout the Great Lawn, Sheep Meadow, and the North Meadow — perfect for a mat-free stretching session. <Link href="/parks/brooklyn-bridge-park" className="text-teal-600 hover:text-teal-700 underline">Brooklyn Bridge Park</Link> has waterfront lawns with Manhattan skyline views. <Link href="/parks/the-high-line" className="text-teal-600 hover:text-teal-700 underline">The High Line</Link> has benches throughout that work well for seated stretches. <Link href="/parks/prospect-park" className="text-teal-600 hover:text-teal-700 underline">Prospect Park</Link> in Brooklyn has Long Meadow — a mile-long grassy field that is perfect for full stretching routines. Pro tip: early morning (before 8 AM) is the best time for park stretching in the summer — cooler temperatures, fewer crowds, and a peaceful atmosphere. We also offer <Link href="/parks" className="text-teal-600 hover:text-teal-700 underline">professional stretch sessions at over 30 NYC parks</Link> — your therapist meets you there with all equipment.</p>
            </div>

            <div>
              <h3 className="text-2xl font-bold text-slate-900 font-heading">Small Apartment Stretching (When Space Is Limited)</h3>
              <p className="mt-4">Most NYC apartments do not have a dedicated stretching area. Here is how to make it work: you need a floor space of approximately 6 feet by 3 feet — the length and width of a yoga mat. If you do not have that much contiguous floor space, use your hallway (most NYC apartment hallways are exactly the right width). Supine stretches (lying on your back) take up the least space — the entire evening wind-down routine can be done in a narrow hallway. For standing stretches, use your doorframes for chest openers and your walls for calf stretches. Your kitchen counter works as a ballet barre for standing balance stretches. Your couch works for the couch stretch hip flexor position. Creativity with space is a quintessentially NYC skill — apply it to your stretching practice.</p>
              <p className="mt-4">For a complete guide to desk worker stretching in NYC, check out our <Link href="/stretching-101/stretching-for-desk-workers" className="text-teal-600 hover:text-teal-700 underline">stretching for desk workers page</Link>. And if you want to see all the NYC locations where we offer mobile stretch service, browse our <Link href="/locations" className="text-teal-600 hover:text-teal-700 underline">locations pages</Link> for all five boroughs.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          SECTION 12 — WHEN SELF-STRETCHING IS NOT ENOUGH
      ════════════════════════════════════════════════════════════════ */}
      <section id="when-professional" className="bg-section-teal py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 sm:text-4xl font-heading">When Self-Stretching Is Not Enough</h2>
          <p className="mt-4 text-center text-base text-slate-600">Self-stretching is a great foundation, but there are clear signs that you need professional help to break through to the next level.</p>

          <div className="mt-12 space-y-10 text-base leading-relaxed text-slate-700">
            <div>
              <h3 className="text-2xl font-bold text-slate-900 font-heading">Signs You Need Professional Stretch Service</h3>
              <p className="mt-4">Here are the seven most common signs that self-stretching is not getting the job done and that professional assisted stretching will make a significant difference in your flexibility, pain levels, and quality of life.</p>
              <ol className="mt-4 list-decimal pl-6 space-y-3">
                <li><strong>You have been stretching consistently for more than four weeks with no improvement.</strong> This usually means you are stretching the wrong muscles, using incorrect technique, or have fascial restrictions that require hands-on intervention.</li>
                <li><strong>You feel tight again within hours of stretching.</strong> When tightness returns this quickly, the issue is usually neurological (your nervous system is guarding the muscle) rather than structural. PNF stretching resets this neurological guarding pattern far more effectively than static stretching.</li>
                <li><strong>You have chronic pain that stretching temporarily relieves but never resolves.</strong> A professional can identify the root cause of the pain pattern — which is often a muscle or fascial restriction far from where you actually feel pain — and address it directly.</li>
                <li><strong>One side of your body is significantly tighter than the other.</strong> Asymmetries indicate compensatory patterns that are very difficult to self-correct. A therapist can target the specific restrictions causing the imbalance.</li>
                <li><strong>You cannot relax while stretching.</strong> Self-stretching requires your muscles to work to hold the stretch position, which limits how deeply they can release. Professional assisted stretching allows complete relaxation for dramatically deeper results.</li>
                <li><strong>You have specific goals that require advanced techniques.</strong> Goals like achieving full splits, improving sport-specific mobility, or recovering from injury require PNF, myofascial release, and other techniques that a trained professional can provide.</li>
                <li><strong>You are over 50 and noticing accelerating stiffness.</strong> Age-related flexibility loss accelerates without intervention, and professional stretch therapy is the most effective way to maintain and improve mobility in the second half of life.</li>
              </ol>
            </div>

            <div>
              <h3 className="text-2xl font-bold text-slate-900 font-heading">PNF vs Self-Stretching: What You Are Missing</h3>
              <p className="mt-4">The research is unambiguous: PNF stretching produces two to three times greater flexibility improvements than static stretching alone. The neuromuscular mechanisms (contract-relax, autogenic inhibition) described in the science section above simply cannot be effectively replicated solo. When you add the benefits of complete muscle relaxation (only possible when someone else controls the stretch), precise external force application, and expert identification of your specific restriction patterns, professional stretching is in a different league from self-stretching. It is the difference between using a manual toothbrush and getting a professional dental cleaning — both are important, but one gets to places the other simply cannot reach.</p>
            </div>

            <div>
              <h3 className="text-2xl font-bold text-slate-900 font-heading">The 4-Session Breakthrough</h3>
              <p className="mt-4">Most of our clients experience a significant breakthrough within their first four professional stretch sessions. Here is why: the first session identifies your specific restriction patterns and begins addressing the most significant ones. The second session builds on the first, going deeper as your nervous system learns to trust the process. By the third session, your body has adapted to the new ranges and begins holding the improvements between sessions. The fourth session typically represents a noticeable jump in overall flexibility that even friends and family comment on. This is not marketing — it is the physiological timeline of neurological adaptation and fascial remodeling.</p>
            </div>

            <div>
              <h3 className="text-2xl font-bold text-slate-900 font-heading">How to Book with Stretch NYC</h3>
              <p className="mt-4">We make it simple. Text or call <a href={SITE_PHONE_LINK} className="text-teal-600 hover:text-teal-700 underline font-semibold">{SITE_PHONE}</a> with your preferred date, time, and location. We come to your home, office, hotel, park, or any NYC location. Single sessions are $99 per hour. Book weekly and save 10% ($89 per hour) with same-therapist continuity and priority scheduling. We are available 7AM to 10PM, seven days a week, across all five boroughs of New York City.</p>
              <p className="mt-4">Explore all 11 of our stretch service types to find the right fit for your goals:</p>
              <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {services.map((s) => (
                  <Link key={s.slug} href={getServiceUrl(s)} className="group rounded-lg border border-slate-200 bg-white p-4 transition-all hover:border-teal-400 hover:shadow-md">
                    <h4 className="text-sm font-bold text-slate-900 group-hover:text-teal-600 font-heading">{s.name}</h4>
                    <p className="mt-1 text-xs text-slate-500">{s.tagline}</p>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          SECTION 13 — FAQ
      ════════════════════════════════════════════════════════════════ */}
      <section id="faq" className="bg-section-white py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 sm:text-4xl font-heading">Frequently Asked Questions About Stretching</h2>
          <p className="mt-4 text-center text-base text-slate-600">Answers to the 25 most common stretching questions, based on what our clients and readers ask most often.</p>

          <div className="mt-10 space-y-4">
            {tipsFaqs.map((faq, i) => (
              <div key={i} className="rounded-xl border border-slate-200 bg-white p-6">
                <h3 className="text-base font-bold text-slate-900 font-heading">{faq.question}</h3>
                <p className="mt-3 text-sm text-slate-600 leading-relaxed">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          SECTION 14 — FINAL CTA
      ════════════════════════════════════════════════════════════════ */}
      <section id="book-now" className="bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 py-16">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <div className="mb-6 flex justify-center">
          </div>
          <h2 className="text-3xl font-bold text-white sm:text-4xl font-heading">
            Ready to Take Your Flexibility to the Next Level?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/80">
            You just read the most comprehensive stretching guide on the internet. Now imagine what a certified stretch therapist could do for you in person — using PNF techniques, myofascial release, and targeted protocols that you cannot replicate alone. Our mobile therapists come to your home, office, hotel, or any NYC location with all equipment.
          </p>
          <div className="mt-6 flex flex-col items-center gap-3">
            <p className="text-2xl font-bold text-white font-heading">$99/hr — 10% Off Weekly Bookings</p>
            <p className="text-sm text-teal-200">Available 7AM-10PM, 7 days a week, all 5 boroughs</p>
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
          </div>
          <div className="mt-8">
            <Link href="/stretching-101" className="text-sm font-semibold text-teal-200 hover:text-white font-cta">
              &larr; Back to Stretching 101
            </Link>
            <span className="mx-3 text-teal-400">|</span>
            <Link href="/pricing" className="text-sm font-semibold text-teal-200 hover:text-white font-cta">
              View Pricing &rarr;
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
