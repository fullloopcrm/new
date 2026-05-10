// @ts-nocheck
import Link from "next/link";
import type { Metadata } from "next";
import { services, getServiceUrl, SITE_URL, SITE_SMS_LINK, SITE_PHONE, SITE_PHONE_LINK } from "@/app/site/stretch-service/_lib/siteData";
import { JsonLd, webPageSchema, breadcrumbSchema, faqSchema } from "@/app/site/stretch-service/_lib/schema";
import Logo from "@/app/site/stretch-service/_components/Logo";

const PAGE_URL = `${SITE_URL}/stretching-101/stretching-for-desk-workers`;
const PAGE_TITLE = "Stretching for Desk Workers NYC | Office Stretch Guide | Stretch Service";
const PAGE_DESC = "Tech neck fixes, hip flexor openers, 5-minute desk routines, and lunch break stretches for NYC office workers. Professional stretch service for desk workers — $99/hr across all 50 states.";

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESC,
  alternates: { canonical: PAGE_URL },
};

const breadcrumbs = [
  { name: "Home", url: SITE_URL },
  { name: "Stretching 101", url: `${SITE_URL}/stretching-101` },
  { name: "Stretching for Desk Workers", url: PAGE_URL },
];

const faqs = [
  { question: "What is the best stretch for tech neck from working at a computer?", answer: "The best stretch for tech neck is the chin tuck: sit tall, pull your chin straight back (as if making a double chin), hold for 5 seconds, release, and repeat 10 times. This retrains the deep neck flexors that become elongated from forward head posture. Combine with neck tilts (ear to shoulder, 30 seconds each side) and doorway chest stretches (30 seconds). For persistent tech neck, a professional stretch service session targeting the cervical spine, upper trapezius, and chest produces immediate and lasting relief." },
  { question: "How often should desk workers take stretch breaks?", answer: "Desk workers should take a 5-minute stretch break every 2 hours at minimum. Set a timer on your phone or computer. Research shows that taking breaks every 90 minutes produces the best balance of productivity and physical health. Each break should include neck tilts, shoulder shrugs, seated spinal twist, standing hip flexor stretch, and a chest opener. For comprehensive desk worker support, add a weekly professional stretch service session at $99/hr ($89/hr weekly) to address the deeper issues that desk breaks cannot fix." },
  { question: "Can stretching fix rounded shoulders from desk work?", answer: "Yes, stretching combined with strengthening can significantly correct rounded shoulders. The key is a two-part approach: (1) stretch the tight muscles pulling your shoulders forward — pectoralis major and minor, anterior deltoids, and biceps — using doorway chest stretches and cross-body stretches; and (2) strengthen the weak muscles in the upper back — rhomboids, middle trapezius, and rear deltoids — using Y-T-W raises and band pull-aparts. Professional stretch service sessions include both components and produce faster results because the therapist can access the deep pectoral fascia." },
  { question: "What stretches help with lower back pain from sitting all day?", answer: "The four most effective stretches for sitting-related lower back pain are: (1) hip flexor lunge stretch — 30 seconds each side (addresses the primary cause — shortened hip flexors); (2) hamstring stretch — 45 seconds each side (tight hamstrings pull on the pelvis); (3) cat-cow — 10 reps (mobilizes the compressed spine); and (4) seated piriformis stretch — 30 seconds each side (releases compressed glutes). Do all four every 2 hours at your desk. For chronic sitting-related back pain, see our stretching for back pain guide." },
  { question: "How can I stretch at my desk without my coworkers noticing?", answer: "Several effective stretches are nearly invisible to coworkers: chin tucks (looks like you are thinking), seated spinal rotation (looks like you are reaching for something), ankle circles under the desk, isometric neck exercises (press your hand against your head in various directions — no visible movement), seated pelvic tilts (small rocking of the pelvis), and toe/heel raises under the desk. For more visible stretches, use the trip to the bathroom as an opportunity for a quick doorway chest stretch and standing hip flexor lunge." },
  { question: "What is the best office chair setup to prevent back pain?", answer: "While stretching is essential, proper ergonomics reduces the damage in the first place: monitor at eye level (not below — this causes tech neck), keyboard at elbow height, feet flat on the floor, lower back supported by a lumbar cushion, chair reclined slightly past 90 degrees (100-110 degrees reduces disc pressure), and armrests at elbow height. However, even perfect ergonomics cannot prevent the muscle shortening and fascial adhesions from prolonged sitting — only stretching (and regular stretch service sessions) can address that." },
  { question: "Can stretching at work improve productivity?", answer: "Yes, multiple studies demonstrate that workplace stretching programs improve productivity. A 2019 study found that employees who took regular stretch breaks had 25% higher productivity scores, 15% fewer errors, and reported 30% less work-related pain. Stretching increases blood flow to the brain, reduces the cortisol (stress hormone) levels that impair cognitive function, and breaks the sustained attention fatigue that accumulates over hours. Our corporate stretch service programs are designed specifically to boost workplace productivity." },
  { question: "What stretches help with wrist pain from typing?", answer: "The four best stretches for typing-related wrist pain are: (1) wrist flexor stretch — extend arm, palm up, and use other hand to pull fingers back toward you, 30 seconds each side; (2) wrist extensor stretch — extend arm, palm down, and use other hand to press fingers downward, 30 seconds each side; (3) prayer stretch — palms together in front of chest, elbows out, lower hands until you feel a stretch in the wrists, 30 seconds; (4) fist rotations — make a fist and rotate in circles, 10 each direction. Do this set every 2 hours." },
  { question: "How does stretching help with tension headaches at work?", answer: "Tension headaches are caused by chronic contraction of the muscles in the neck, shoulders, and scalp — a direct result of desk posture and stress. Stretching relieves these headaches by: releasing the upper trapezius (the muscle connecting your neck to your shoulders), mobilizing the cervical spine, opening the chest to improve breathing, and activating the parasympathetic nervous system. Neck tilts, chin tucks, and upper trap stretches can relieve a tension headache in 5-10 minutes. Regular stretch service sessions prevent them from occurring." },
  { question: "Should I use a standing desk instead of stretching?", answer: "Standing desks help but do not replace stretching. Standing all day creates its own problems: calf fatigue, lower back compression from prolonged standing, and knee stress. The best approach is alternating between sitting and standing (30 minutes sitting, 30 minutes standing) AND taking regular stretch breaks every 2 hours. Standing desks address the hip flexor shortening from sitting but do nothing for the shoulder, chest, and thoracic restrictions that develop from computer work. Only stretching — and professional stretch service — addresses those." },
  { question: "What is the 5-minute desk stretch routine I should do every 2 hours?", answer: "The ideal 5-minute desk stretch routine: (1) chin tucks — 10 reps, 3 seconds each (30 seconds); (2) neck tilts — 20 seconds each side (40 seconds); (3) seated spinal twist — 20 seconds each side (40 seconds); (4) seated figure-four hip stretch — 20 seconds each side (40 seconds); (5) doorway chest stretch — 30 seconds; (6) standing calf raises — 10 reps (20 seconds); (7) standing hip flexor stretch — 20 seconds each side (40 seconds). Total: approximately 5 minutes. Set a recurring timer." },
  { question: "Does our company need a corporate stretch service program?", answer: "If your employees sit at desks for 6+ hours daily, yes. Corporate stretch service programs reduce workplace injuries, decrease employee absenteeism, lower healthcare costs, boost productivity, and improve team morale. We provide on-site stretch service at NYC offices in Midtown, FiDi, DUMBO, Williamsburg, and all 50 states. Programs include individual stretch sessions, group stretch breaks, and ergonomic assessments. Visit our corporate wellness page for details or text (888) 734-7274." },
  { question: "Can stretching help with hip pain from sitting?", answer: "Yes, hip pain from sitting is almost always caused by tight hip flexors (iliopsoas) and compressed gluteal muscles. When you sit, the hip flexors are in a shortened position for hours. Over time, they become chronically tight and pull the pelvis into an anterior tilt, compressing the hip joint and straining the lower back. Hip flexor lunges (30 seconds each side), figure-four piriformis stretches (30 seconds each side), and hip circles (10 each direction) directly address this. Professional stretch service sessions use PNF stretching on the hip flexors for 2-3x greater release." },
  { question: "What is the best lunch break stretching routine for office workers?", answer: "The 15-minute lunch break routine should include: (1) 5-minute walk to increase blood flow; (2) doorway chest stretch at three angles (90 seconds); (3) standing hip flexor lunge (30 seconds each side); (4) standing hamstring stretch (30 seconds each side); (5) wall calf stretch (30 seconds each side); (6) world&apos;s greatest stretch (30 seconds each side); (7) standing spinal twist (30 seconds each side); (8) neck and shoulder release (30 seconds each side). This comprehensive routine counteracts the morning&apos;s sitting damage and sets you up for a productive afternoon." },
  { question: "How much does desk worker stretch service cost?", answer: "Professional stretch service for desk workers at Stretch Service costs $99 per 60-minute session. Weekly clients save 10% at $89 per session. For corporate programs, we offer customized pricing for on-site office sessions. Our therapists come to your Midtown office, FiDi workspace, DUMBO studio, or any NYC location. Every session addresses the specific muscle imbalances created by desk work — shortened hip flexors, tight chest, restricted thoracic spine, and compressed lower back. Text or call (888) 734-7274 to book." },
  { question: "Can I do my stretch service session at the office?", answer: "Absolutely. Many of our clients book stretch service sessions at their office. We bring a portable massage table and all equipment, and only need a 6-by-8-foot clear area — a conference room, private office, or even a quiet corner works perfectly. Lunchtime sessions are our most popular office bookings. Some companies book recurring weekly sessions for their employees as part of their corporate wellness program. Contact us for corporate pricing." },
];

export default function StretchingForDeskWorkersPage() {
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
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">Stretching 101 — Office Workers</p>
          <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl font-heading">
            STRETCHING FOR<br />
            <span className="gradient-text">DESK WORKERS NYC</span><br />
            OFFICE STRETCH GUIDE
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">
            Tech neck fixes, lower back stretches for sitting, hip flexor openers, 5-minute desk routines, and 15-minute lunch break stretches for NYC office workers in Midtown, FiDi, DUMBO, and beyond. <strong className="text-white">$99/hr professional stretch service | 10% off weekly.</strong>
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
            <Link href="/stretching-101" className="hover:text-teal-600">Stretching 101</Link>
            <span className="mx-2">/</span>
            <span className="text-slate-900 font-medium">Stretching for Desk Workers</span>
          </nav>
        </div>
      </div>

      {/* ═══ INTRO ═══ */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-3xl font-bold text-slate-900 font-heading">The Desk Worker Body: Why NYC Office Workers Need Stretching More Than Anyone</h2>
          <div className="mt-6 space-y-5 text-base leading-relaxed text-slate-700">
            <p>
              If you work at a desk in New York City, your body is under siege. The average NYC desk worker sits for 8-10 hours per day — at their desk, on the subway, at restaurants, and on the couch at home. That is 8-10 hours of hip flexor shortening, lower back compression, chest tightening, shoulder rounding, and neck straining. Add the stress of NYC work culture, the rigid subway seats, and the 6,000+ steps of concrete walking, and you have a formula for chronic pain that no ergonomic chair or standing desk can fully counteract.
            </p>
            <p>
              The medical community has coined the term &quot;sitting disease&quot; to describe the cascade of health problems associated with prolonged sitting: chronic lower back pain, tech neck, rounded shoulders, tight hip flexors, compressed lumbar discs, weakened glutes, restricted thoracic spine, carpal tunnel risk, and tension headaches. Studies show that NYC desk workers report chronic pain at rates 40% higher than the national average — a direct consequence of our desk-intensive, commute-heavy, high-stress work culture.
            </p>
            <p>
              The solution is not to quit your job — it is to systematically counteract the damage with targeted stretching. This guide provides everything you need: the anatomy of desk worker pain, stretch-by-stretch remedies for every problem area, 5-minute desk routines you can do every 2 hours, a 15-minute lunch break routine, and guidance on when professional <Link href={getServiceUrl(services[0])} className="text-teal-600 underline hover:text-teal-700">stretch service</Link> is needed for deeper issues that self-stretching cannot resolve.
            </p>
          </div>
        </div>
      </section>

      {/* ═══ TECH NECK ═══ */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-3xl font-bold text-slate-900 font-heading">Tech Neck: Causes, Stretches, and Prevention</h2>
          <div className="mt-6 space-y-5 text-base leading-relaxed text-slate-700">
            <p>
              Tech neck (also called text neck or forward head posture) is the most common musculoskeletal complaint among NYC desk workers. It occurs when the head migrates forward of the shoulders from staring at screens, creating enormous strain on the cervical spine. For every inch your head moves forward, the effective weight on your neck increases by 10 pounds. The average desk worker&apos;s head sits 2-3 inches forward — that is 20-30 extra pounds of force on your neck muscles and cervical discs, eight hours a day, five days a week.
            </p>
            <p>
              The result is chronic neck pain, tension headaches, shoulder tension, upper back pain, and in severe cases, cervical disc degeneration. Tech neck also compresses the nerves that run from the neck into the arms, contributing to tingling, numbness, and carpal-tunnel-like symptoms in the hands.
            </p>
          </div>

          <h3 className="mt-8 text-xl font-bold text-slate-900 font-heading">5 Stretches to Fix Tech Neck</h3>
          <div className="mt-6 space-y-6">
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h4 className="text-lg font-bold text-slate-900 font-heading">1. Chin Tucks</h4>
              <p className="text-sm text-teal-600 font-semibold">Target: Deep neck flexors, cervical spine alignment | The #1 tech neck exercise</p>
              <div className="mt-3 text-sm text-slate-700 space-y-2">
                <p><strong>How to do it:</strong> Sit tall with your back against the chair. Without tilting your head up or down, pull your chin straight backward — as if trying to make a double chin. You should feel a gentle stretch at the base of your skull and a contraction in the front of your neck. Hold for 5 seconds, release, and repeat.</p>
                <p><strong>Reps:</strong> 10 repetitions, every 2 hours</p>
                <p><strong>Why it works:</strong> Chin tucks retrain the deep cervical flexors — the small muscles at the front of the neck that hold your head over your shoulders. These muscles become elongated and weak from forward head posture. Chin tucks are the single most evidence-based exercise for correcting tech neck.</p>
                <p><strong>Tip:</strong> Do these against a wall to ensure proper alignment. The back of your head should touch the wall during the tuck.</p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h4 className="text-lg font-bold text-slate-900 font-heading">2. Neck Tilts with Overpressure</h4>
              <p className="text-sm text-teal-600 font-semibold">Target: Upper trapezius, levator scapulae, scalenes</p>
              <div className="mt-3 text-sm text-slate-700 space-y-2">
                <p><strong>How to do it:</strong> Tilt your right ear toward your right shoulder. Place your right hand gently on the left side of your head — use only the weight of your hand, no pulling. Reach your left hand toward the floor to anchor the left shoulder down. Hold for 30 seconds. Switch sides.</p>
                <p><strong>Hold time:</strong> 30 seconds each side, 2 repetitions</p>
                <p><strong>Why it works:</strong> The upper trapezius is the muscle that gets chronically tight from desk work and stress. It is responsible for most tension headaches and the &quot;knots&quot; you feel between your neck and shoulders. This stretch provides immediate relief.</p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h4 className="text-lg font-bold text-slate-900 font-heading">3. Levator Scapulae Stretch</h4>
              <p className="text-sm text-teal-600 font-semibold">Target: Levator scapulae — the muscle from neck to shoulder blade that causes deep neck pain</p>
              <div className="mt-3 text-sm text-slate-700 space-y-2">
                <p><strong>How to do it:</strong> Turn your head 45 degrees to the right (looking toward your right armpit). Then tilt your head forward, bringing your chin toward your chest. Use your right hand to gently press the back of your head, adding a small amount of overpressure. You should feel a stretch on the left side of the back of your neck, from skull to shoulder blade.</p>
                <p><strong>Hold time:</strong> 30 seconds each side, 2 repetitions</p>
                <p><strong>Why it works:</strong> The levator scapulae is the most commonly overlooked cause of chronic neck pain. It runs from the upper cervical spine to the top of the shoulder blade, and it is under constant tension when the head is in a forward position.</p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h4 className="text-lg font-bold text-slate-900 font-heading">4. Doorway Chest Stretch</h4>
              <p className="text-sm text-teal-600 font-semibold">Target: Pectoralis major and minor, anterior deltoids — the muscles pulling your shoulders forward</p>
              <div className="mt-3 text-sm text-slate-700 space-y-2">
                <p><strong>How to do it:</strong> Stand in a doorway with both forearms on the frame at shoulder height, elbows at 90 degrees. Step one foot through the doorway and lean your body forward until you feel a deep stretch across your chest and front shoulders. Hold 30 seconds. Then move arms above shoulder height and hold 30 seconds. Then below shoulder height and hold 30 seconds.</p>
                <p><strong>Hold time:</strong> 30 seconds at each of 3 arm positions (90 seconds total)</p>
                <p><strong>Why it works:</strong> Tight pectoral muscles pull the shoulders forward and contribute directly to the rounded posture that creates tech neck. Opening the chest allows the upper back to extend and the head to return to its neutral position over the shoulders.</p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h4 className="text-lg font-bold text-slate-900 font-heading">5. Thoracic Extension Over Chair Back</h4>
              <p className="text-sm text-teal-600 font-semibold">Target: Thoracic spine, chest, respiratory muscles</p>
              <div className="mt-3 text-sm text-slate-700 space-y-2">
                <p><strong>How to do it:</strong> Sit in your desk chair. Interlace your fingers behind your head. Lean backward over the chair back, extending your thoracic spine (mid-back). The top of the chair back should contact your mid-back, not your lower back. Open your elbows wide and take a deep breath at the extended position.</p>
                <p><strong>Reps:</strong> 5 extensions, holding the top for 3 seconds each</p>
                <p><strong>Why it works:</strong> The thoracic spine is designed for extension and rotation, but desk work locks it into flexion. This stretch reverses the rounded posture, decompresses the thoracic discs, and improves breathing capacity. It can be done at your desk without anyone noticing.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ LOWER BACK ═══ */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-3xl font-bold text-slate-900 font-heading">Lower Back Pain from Sitting: Stretches and Solutions</h2>
          <div className="mt-6 space-y-5 text-base leading-relaxed text-slate-700">
            <p>
              Lower back pain is the second most common complaint from NYC desk workers (after neck pain). When you sit, your hip flexors are in a shortened, contracted position. Over 8-10 hours of sitting daily, they become chronically short and tight. Short hip flexors pull the lumbar spine into an excessive anterior tilt (arching), compressing the posterior disc surfaces and straining the erector spinae muscles. Simultaneously, your glutes become elongated and weakened (a condition called &quot;gluteal amnesia&quot;), removing the pelvic stability that protects the lower back.
            </p>
            <p>
              The solution is a two-pronged approach: (1) stretch the hip flexors, hamstrings, and piriformis that are pulling on the pelvis, and (2) strengthen the glutes and core that should be stabilizing it. For a complete lower back pain guide with 10 detailed stretches, see our <Link href="/stretching-101/stretching-for-back-pain" className="text-teal-600 underline hover:text-teal-700">stretching for back pain</Link> page.
            </p>
          </div>

          <h3 className="mt-8 text-xl font-bold text-slate-900 font-heading">4 Essential Desk Worker Lower Back Stretches</h3>
          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h4 className="font-bold text-slate-900 font-heading">Standing Hip Flexor Lunge</h4>
              <p className="mt-2 text-sm text-slate-700">Step one foot forward, drop the back knee (pad it if needed). Tuck your pelvis and press hips forward. Keep torso upright. 30 seconds each side. <strong>The single most important stretch for desk workers.</strong> Short hip flexors are the primary cause of sitting-related lower back pain. Do this every 2 hours.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h4 className="font-bold text-slate-900 font-heading">Seated Piriformis Stretch (Figure-Four)</h4>
              <p className="mt-2 text-sm text-slate-700">Cross one ankle over the opposite knee. Lean forward gently, hinging at the hips. 30 seconds each side. <strong>Sitting compresses the piriformis, which can irritate the sciatic nerve and cause buttock and leg pain.</strong> This stretch provides immediate relief and can be done right at your desk.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h4 className="font-bold text-slate-900 font-heading">Standing Hamstring Stretch</h4>
              <p className="mt-2 text-sm text-slate-700">Place heel on a low surface (step, box, desk leg). Keep the leg straight and hinge forward at the hips. 30 seconds each side. <strong>Tight hamstrings pull the pelvis into a posterior tilt, flattening the lumbar curve and compressing discs.</strong> Maintaining hamstring flexibility is essential for lower back health.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h4 className="font-bold text-slate-900 font-heading">Cat-Cow (Standing or Seated)</h4>
              <p className="mt-2 text-sm text-slate-700">Hands on knees (seated) or on all fours (floor). Alternate between arching and rounding the spine. 10 repetitions. <strong>Mobilizes the lumbar and thoracic spine, hydrates compressed discs, and relieves muscle spasm.</strong> The best immediate relief exercise for a stiff lower back after sitting for hours.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ HIP FLEXOR TIGHTNESS ═══ */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-3xl font-bold text-slate-900 font-heading">Hip Flexor Tightness: The Hidden Cause of Desk Worker Pain</h2>
          <div className="mt-6 space-y-5 text-base leading-relaxed text-slate-700">
            <p>
              If there is one muscle group that defines the desk worker&apos;s body, it is the hip flexors — specifically the iliopsoas. This powerful muscle runs from the front of the lumbar spine, through the pelvis, to the top of the thigh bone. When you sit, it is in a shortened, contracted position. After years of 8-10 hour sitting days, the iliopsoas becomes chronically shortened and tight, creating a cascade of problems that radiates throughout your body.
            </p>
            <p>
              Tight hip flexors pull the pelvis into an anterior tilt, increasing the lumbar curve and compressing the facet joints and posterior discs — causing lower back pain. They inhibit the glutes (your body&apos;s most powerful muscles), leading to weakness and compensatory patterns. They restrict hip extension, shortening your walking stride and making your gait less efficient. And they pull on the thoracolumbar fascia, creating tension that can radiate into the mid and upper back.
            </p>
            <p>
              This is why the hip flexor stretch is the single most important stretch for desk workers — and why professional <Link href={getServiceUrl(services[0])} className="text-teal-600 underline hover:text-teal-700">stretch service</Link> sessions that include <Link href={getServiceUrl(services[1])} className="text-teal-600 underline hover:text-teal-700">PNF stretching</Link> of the hip flexors produce dramatic improvements in back pain, mobility, and comfort for desk workers. PNF stretching produces 2-3x greater hip flexor release than static stretching alone because it overrides the nervous system&apos;s protective guarding of this deeply rooted muscle.
            </p>
          </div>
          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="font-bold text-slate-900 font-heading">Kneeling Hip Flexor Lunge</h3>
              <p className="mt-2 text-sm text-slate-700">Back knee on the ground, front foot flat. Tuck pelvis and press hips forward. Keep torso upright. Add overhead reach on the back-leg side for deeper stretch through the entire anterior chain. <strong>30-45 seconds each side, 2-3 sets. The gold standard desk worker stretch.</strong></p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="font-bold text-slate-900 font-heading">Standing Split Stance Stretch</h3>
              <p className="mt-2 text-sm text-slate-700">Stand in a split stance (one foot forward, one back). Tuck pelvis and press hips forward. Hold a wall or desk for balance. <strong>30 seconds each side. Can be done in business attire. Perfect for office environments where kneeling on the floor is impractical.</strong></p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="font-bold text-slate-900 font-heading">Couch Stretch (Advanced)</h3>
              <p className="mt-2 text-sm text-slate-700">Kneel with your back foot elevated on a couch, chair seat, or wall behind you. Front foot flat on the floor in a lunge. Press hips forward. <strong>30-45 seconds each side. The deepest hip flexor stretch available. Only attempt after building up with the standard lunge version.</strong></p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ SHOULDER AND CHEST ═══ */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-3xl font-bold text-slate-900 font-heading">Shoulder and Chest Opening Stretches for Desk Workers</h2>
          <p className="mt-4 text-base text-slate-700">
            Desk work creates a predictable pattern: the chest (pectoralis) muscles shorten, the front shoulders (anterior deltoids) tighten, and the upper back muscles (rhomboids, middle trapezius) elongate and weaken. This creates the &quot;desk worker posture&quot; — rounded shoulders, protruding head, and a hunched upper back. These stretches reverse the pattern.
          </p>
          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="font-bold text-slate-900 font-heading">Doorway Pec Stretch (3 Positions)</h3>
              <p className="mt-2 text-sm text-slate-700">Forearms on doorframe. Three positions: arms below shoulder height (targets lower pec), at shoulder height (mid pec), above shoulder height (upper pec and pec minor). 30 seconds each position. <strong>The most effective chest opener for desk workers. Do at least twice during the workday.</strong></p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="font-bold text-slate-900 font-heading">Behind-Back Interlaced Fingers</h3>
              <p className="mt-2 text-sm text-slate-700">Interlace fingers behind your back. Straighten arms and lift them away from your body while squeezing shoulder blades together. Open chest and look slightly upward. 30 seconds, 2 sets. <strong>Can be done standing at your desk. If you cannot interlace, hold a towel between your hands.</strong></p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="font-bold text-slate-900 font-heading">Cross-Body Shoulder Stretch</h3>
              <p className="mt-2 text-sm text-slate-700">Bring one arm across your chest. Use the opposite hand to pull it closer, keeping the shoulder down (not shrugged). 30 seconds each side. <strong>Targets the posterior deltoid and rotator cuff muscles that become tight from the sustained arm-forward desk position.</strong></p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="font-bold text-slate-900 font-heading">Wall Slides</h3>
              <p className="mt-2 text-sm text-slate-700">Stand with your back against a wall. Place the backs of your hands and forearms on the wall at shoulder height (like a cactus shape). Slowly slide your arms up the wall, maintaining contact with the wall, then slide back down. 10 reps. <strong>This both stretches the chest and strengthens the upper back muscles that hold your shoulders in proper position.</strong></p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ WRIST AND FOREARM ═══ */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-3xl font-bold text-slate-900 font-heading">Wrist and Forearm Stretches for Typing</h2>
          <p className="mt-4 text-base text-slate-700">
            Hours of typing creates chronic tension in the wrist flexors and extensors, contributing to carpal tunnel risk, wrist pain, and reduced grip strength. These stretches maintain wrist health and should be done every 2 hours during desk work.
          </p>
          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="font-bold text-slate-900 font-heading">Wrist Flexor Stretch</h3>
              <p className="mt-2 text-sm text-slate-700">Extend your right arm straight out, palm facing up. Use your left hand to gently pull the right fingers back toward you until you feel a stretch on the inner forearm. <strong>30 seconds each side.</strong> Targets the muscles that flex the wrist and fingers — chronically shortened by typing and mouse use.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="font-bold text-slate-900 font-heading">Wrist Extensor Stretch</h3>
              <p className="mt-2 text-sm text-slate-700">Extend your right arm straight out, palm facing down. Use your left hand to press the right fingers downward and toward your body until you feel a stretch on the top of the forearm. <strong>30 seconds each side.</strong> Targets the muscles along the top of the forearm that become tight from keyboard use.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="font-bold text-slate-900 font-heading">Prayer Stretch</h3>
              <p className="mt-2 text-sm text-slate-700">Place palms together in front of your chest (prayer position). Keeping palms together, slowly lower your hands until you feel a stretch in the wrists and forearms. Hold with elbows pointing outward. <strong>30 seconds.</strong> Stretches both the flexors and extensors simultaneously.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="font-bold text-slate-900 font-heading">Fist Rotations and Finger Spreads</h3>
              <p className="mt-2 text-sm text-slate-700">Make a fist and rotate slowly in circles — 10 clockwise, 10 counterclockwise. Then spread your fingers as wide as possible, hold 5 seconds, make a fist, and repeat 10 times. <strong>Takes 60 seconds total.</strong> Maintains wrist joint mobility and finger dexterity.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ 5-MINUTE DESK ROUTINE ═══ */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-3xl font-bold text-slate-900 font-heading">5-Minute Desk Stretch Routine (Do Every 2 Hours)</h2>
          <p className="mt-4 text-base text-slate-700">
            This is the minimum effective dose for desk worker stretching. Set a timer on your phone for every 2 hours and run through this sequence. Most of these can be done in business attire without leaving your desk area. Total time: approximately 5 minutes.
          </p>
          <div className="mt-8">
            <div className="rounded-xl border border-teal-200 bg-teal-50 p-6">
              <ol className="space-y-4 text-sm text-slate-700">
                <li className="flex gap-3"><span className="font-bold text-teal-700 shrink-0">0:00</span> <span><strong>Chin Tucks</strong> — 10 reps, hold 3 seconds each. Resets cervical spine alignment. (30 seconds)</span></li>
                <li className="flex gap-3"><span className="font-bold text-teal-700 shrink-0">0:30</span> <span><strong>Neck Tilts</strong> — Right ear to right shoulder, 20 seconds. Left ear to left shoulder, 20 seconds. Releases upper trapezius. (40 seconds)</span></li>
                <li className="flex gap-3"><span className="font-bold text-teal-700 shrink-0">1:10</span> <span><strong>Seated Spinal Twist</strong> — Twist right with left hand on right knee, 20 seconds. Twist left, 20 seconds. Mobilizes thoracic spine. (40 seconds)</span></li>
                <li className="flex gap-3"><span className="font-bold text-teal-700 shrink-0">1:50</span> <span><strong>Seated Figure-Four</strong> — Cross right ankle over left knee, lean forward, 20 seconds. Switch sides, 20 seconds. Opens hips and piriformis. (40 seconds)</span></li>
                <li className="flex gap-3"><span className="font-bold text-teal-700 shrink-0">2:30</span> <span><strong>Doorway Chest Stretch</strong> — Step to nearest doorway. Forearms on frame at shoulder height. Lean through. 30 seconds. Opens chest, counteracts rounding. (30 seconds)</span></li>
                <li className="flex gap-3"><span className="font-bold text-teal-700 shrink-0">3:00</span> <span><strong>Standing Hip Flexor Stretch</strong> — Split stance, tuck pelvis, press hips forward. 20 seconds each side. The most important desk worker stretch. (40 seconds)</span></li>
                <li className="flex gap-3"><span className="font-bold text-teal-700 shrink-0">3:40</span> <span><strong>Standing Calf Raises</strong> — 10 slow reps. Rise onto toes, lower slowly. Improves circulation after sitting. (20 seconds)</span></li>
                <li className="flex gap-3"><span className="font-bold text-teal-700 shrink-0">4:00</span> <span><strong>Wrist Stretches</strong> — Flexor stretch 15 seconds each side, extensor stretch 15 seconds each side. Protects against carpal tunnel. (60 seconds)</span></li>
              </ol>
              <p className="mt-4 text-xs font-semibold text-teal-700">Total time: ~5 minutes. Set a recurring timer for every 2 hours during your workday.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ 15-MINUTE LUNCH ROUTINE ═══ */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-3xl font-bold text-slate-900 font-heading">15-Minute Lunch Break Stretch Routine</h2>
          <p className="mt-4 text-base text-slate-700">
            Your lunch break is the best opportunity to do a more comprehensive stretching session. This routine undoes the damage from the morning&apos;s sitting and prepares your body for the afternoon. Find a conference room, hallway, stairwell, or even step outside to a nearby park.
          </p>
          <div className="mt-8 space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="font-bold text-slate-900 font-heading">Minutes 0-3: Walk and Mobilize</h3>
              <p className="mt-2 text-sm text-slate-700">Walk briskly for 3 minutes to increase blood flow and raise body temperature. Swing your arms naturally. Take the stairs if possible. This warm-up makes all subsequent stretches more effective and reduces injury risk.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="font-bold text-slate-900 font-heading">Minutes 3-5: Chest and Shoulders</h3>
              <p className="mt-2 text-sm text-slate-700">Doorway chest stretch at 3 angles (30 seconds each = 90 seconds). Behind-back interlaced fingers chest opener (30 seconds). This sequence undoes the morning&apos;s chest tightening and shoulder rounding.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="font-bold text-slate-900 font-heading">Minutes 5-8: Hips and Lower Back</h3>
              <p className="mt-2 text-sm text-slate-700">Standing hip flexor lunge (30 seconds each side). Standing hamstring stretch (30 seconds each side). Standing figure-four piriformis stretch (30 seconds each side). These three stretches address the primary causes of sitting-related lower back pain.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="font-bold text-slate-900 font-heading">Minutes 8-10: Spine Mobility</h3>
              <p className="mt-2 text-sm text-slate-700">Standing spinal twist (30 seconds each side). Standing side bend (30 seconds each side). These stretches restore the spinal rotation and lateral flexion that sitting locks down.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="font-bold text-slate-900 font-heading">Minutes 10-12: Calves and Ankles</h3>
              <p className="mt-2 text-sm text-slate-700">Wall calf stretch — straight leg version (30 seconds each side). Wall calf stretch — bent knee version (30 seconds each side). Ankle circles (10 each direction per foot). Restores blood flow to the lower legs after hours of sitting.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="font-bold text-slate-900 font-heading">Minutes 12-15: Neck, Wrists, and Deep Breathing</h3>
              <p className="mt-2 text-sm text-slate-700">Neck tilts with overpressure (30 seconds each side). Wrist flexor and extensor stretches (15 seconds each, both sides). Finish with 5 deep breaths — inhale for 4 counts, hold for 4, exhale for 6. This resets your nervous system for a productive afternoon.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ CORPORATE WELLNESS ═══ */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-3xl font-bold text-slate-900 font-heading">Corporate Wellness Stretch Service Programs for NYC Offices</h2>
          <div className="mt-6 space-y-5 text-base leading-relaxed text-slate-700">
            <p>
              If you manage a team of desk workers in New York City, a corporate stretch service program is one of the highest-ROI wellness investments you can make. Studies show that workplace stretching programs reduce injury-related absenteeism by 25-35%, increase self-reported productivity by 15-25%, decrease workers&apos; compensation claims by 20-30%, and improve employee satisfaction and retention scores significantly.
            </p>
            <p>
              Our corporate stretch service programs are customized for NYC offices in <Link href="/locations/manhattan" className="text-teal-600 underline hover:text-teal-700">Midtown Manhattan</Link>, the Financial District, <Link href="/locations/brooklyn" className="text-teal-600 underline hover:text-teal-700">DUMBO and Williamsburg in Brooklyn</Link>, Long Island City in <Link href="/locations/queens" className="text-teal-600 underline hover:text-teal-700">Queens</Link>, and across all 50 states. We offer individual stretch service sessions for employees, group stretch breaks led by our therapists, and ergonomic desk assessments. Contact us for custom corporate pricing.
            </p>
          </div>
          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-6 text-center">
              <p className="text-2xl font-bold text-teal-600 font-heading">25-35%</p>
              <p className="mt-2 text-sm text-slate-700">Reduction in injury-related absenteeism</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6 text-center">
              <p className="text-2xl font-bold text-teal-600 font-heading">15-25%</p>
              <p className="mt-2 text-sm text-slate-700">Increase in employee productivity</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6 text-center">
              <p className="text-2xl font-bold text-teal-600 font-heading">20-30%</p>
              <p className="mt-2 text-sm text-slate-700">Decrease in workers&apos; comp claims</p>
            </div>
          </div>
          <div className="mt-6 text-center">
            <Link href="/corporate-wellness" className="text-sm font-semibold text-teal-600 hover:text-teal-700 font-cta">Learn more about corporate wellness stretch service programs &rarr;</Link>
          </div>
        </div>
      </section>

      {/* ═══ FAQ ═══ */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-3xl font-bold text-slate-900 font-heading text-center">Desk Worker Stretching — Frequently Asked Questions</h2>
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
            Your Desk Is Destroying Your Body — Professional Stretch Service Can Fix It
          </h2>
          <p className="mt-4 text-lg text-teal-100">
            Our certified stretch therapists specialize in desk worker pain: tech neck, lower back compression, hip flexor tightness, and rounded shoulders. We come to your NYC office, apartment, or hotel with all equipment. One session and you will feel the difference. <strong className="text-white">$99/hr | 10% off weekly at $89/session.</strong>
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
          <p className="mt-4 text-sm text-teal-200">Midtown | FiDi | DUMBO | All five boroughs | 7AM-10PM daily | No contracts</p>
        </div>
      </section>
    </>
  );
}
