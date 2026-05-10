// @ts-nocheck
import Link from "next/link";
import type { Metadata } from "next";
import { services, getServiceUrl, SITE_URL, SITE_SMS_LINK, SITE_PHONE, SITE_PHONE_LINK } from "@/app/site/stretch-service/_lib/siteData";
import { JsonLd, webPageSchema, breadcrumbSchema, faqSchema } from "@/app/site/stretch-service/_lib/schema";
import Logo from "@/app/site/stretch-service/_components/Logo";

const PAGE_URL = `${SITE_URL}/stretching-101/daily-stretching-routine`;
const PAGE_TITLE = "Daily Stretching Routine | Must-Do Stretches by Age | Stretch Service NYC";
const PAGE_DESC = "Complete daily stretching routines organized by age: 18-30, 30-45, 45-60, and 60+. Morning, midday, and evening stretch routines with step-by-step instructions. Stretch Service — $99/hr professional stretch service.";

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESC,
  alternates: { canonical: PAGE_URL },
};

const breadcrumbs = [
  { name: "Home", url: SITE_URL },
  { name: "Stretching 101", url: `${SITE_URL}/stretching-101` },
  { name: "Daily Stretching Routine", url: PAGE_URL },
];

const faqs = [
  { question: "What is the best daily stretching routine for beginners?", answer: "The best daily stretching routine for beginners starts with 8-10 gentle stretches held for 30 seconds each, targeting the major muscle groups: neck, shoulders, chest, upper back, lower back, hip flexors, hamstrings, quadriceps, and calves. Begin with your morning routine and add evening stretches as you build consistency. Start with the Ages 18-30 or Ages 30-45 routine on this page, performing each stretch at the easier modification until you build flexibility. A professional stretch service session can accelerate your progress and ensure proper form from the start." },
  { question: "How long should a daily stretching routine take?", answer: "An effective daily stretching routine takes 10-20 minutes. Your morning routine should be 10-15 minutes (8-10 stretches), desk breaks should be 5 minutes every 2 hours, and an evening wind-down should be 10 minutes. Total daily stretching time of 20-30 minutes produces optimal results. Combined with a weekly professional stretch service session at $99/hr (or $89/hr with our weekly discount), this schedule produces 3x better flexibility gains than self-stretching alone." },
  { question: "Should you stretch every single day or take rest days?", answer: "Unlike strength training, stretching does not require rest days. Your muscles and connective tissues benefit from daily gentle stretching. However, you should vary the intensity: light stretching on rest days, dynamic stretching before workouts, and deeper static stretching after workouts or in the evening. If you experience soreness from a professional stretch service session, lighter self-stretching the following day actually speeds recovery." },
  { question: "What is the best time of day to stretch?", answer: "Morning stretching reduces overnight stiffness, increases alertness, and prepares your body for the day. Evening stretching promotes relaxation, reduces stress, and improves sleep quality. The best approach is to stretch at both times. If you can only stretch once, morning is slightly better for preventing injury throughout the day, while evening is better for stress relief and sleep. Our stretch service sessions can be booked 7AM-10PM daily to fit your schedule." },
  { question: "What daily stretches should a 50-year-old do every morning?", answer: "Adults aged 45-60 should focus their morning routine on joint mobility and maintaining range of motion. Key stretches include: neck rotations (30 seconds each side), shoulder rolls and cross-body stretches, cat-cow for spinal mobility, standing hip circles, seated hamstring stretch, quad stretch with support, calf stretch against a wall, and gentle spinal twist. Hold each stretch 30-45 seconds and avoid bouncing. See our Ages 45-60 routine above for complete instructions." },
  { question: "How does a stretching routine change as you get older?", answer: "As you age, stretching routines should gradually shift focus: In your 20s and 30s, emphasis is on performance, flexibility gains, and injury prevention with more intense stretches. In your 40s and 50s, the focus shifts to maintaining mobility, counteracting desk work, and joint health with moderate intensity. After 60, the priority becomes fall prevention, independence, arthritis management, and gentle range of motion work. Our stretch service therapists customize every session to your age and needs." },
  { question: "Can a daily stretching routine replace going to the gym?", answer: "A daily stretching routine complements gym workouts but does not replace them. Stretching improves flexibility, mobility, and recovery, while resistance training builds strength and muscle mass. However, for people who cannot do gym workouts (seniors, post-surgery, chronic pain), a daily stretching routine combined with professional stretch service provides significant health benefits including improved circulation, better balance, pain reduction, and maintained range of motion." },
  { question: "What stretches should I do first thing in the morning?", answer: "The ideal morning stretch sequence starts in bed: knee-to-chest pulls, gentle spinal twist, and full-body reach. Then standing: neck rotations, shoulder rolls, cat-cow on hands and knees, standing forward fold, hip flexor lunge stretch, quad stretch, and calf raises. This sequence takes 10 minutes and addresses the stiffness that accumulates during 7-8 hours of sleep. See the age-specific morning routines above for detailed instructions tailored to your decade." },
  { question: "What is the difference between a morning and evening stretching routine?", answer: "Morning routines emphasize waking up the body: gentle movements that increase blood flow, activate the nervous system, and restore mobility after sleep. They include more dynamic and active stretches. Evening routines emphasize calming the body: sustained holds that activate the parasympathetic nervous system, reduce cortisol, and prepare you for sleep. They include more passive and static stretches with deeper holds. A professional stretch service session can serve as either depending on scheduling." },
  { question: "How quickly will I see results from daily stretching?", answer: "Most people feel noticeably less stiff and more mobile within 3-5 days of consistent daily stretching. Measurable flexibility improvements (increased range of motion) typically appear after 2-3 weeks. Significant flexibility gains and pain reduction develop over 4-8 weeks. Adding a weekly professional stretch service session accelerates these timelines by 2-3x because therapist-assisted techniques access deeper muscle layers and use PNF protocols impossible to perform alone." },
  { question: "Is it okay to stretch with sore muscles?", answer: "Yes, gentle stretching with sore muscles is beneficial — it increases blood flow to the area, helps flush metabolic waste, and reduces recovery time. However, the stretches should be gentle and should not push into pain. Avoid intense or deep stretching on acutely sore muscles. A professional recovery stretch service is specifically designed for post-exercise soreness and uses gentle techniques to accelerate healing without causing further damage." },
  { question: "What daily stretches help with lower back pain?", answer: "The most effective daily stretches for lower back pain are: knee-to-chest pulls (30 seconds each side), cat-cow (10 repetitions), child&apos;s pose (60 seconds), piriformis stretch (30 seconds each side), hip flexor lunge (30 seconds each side), seated spinal twist (30 seconds each side), and hamstring stretch (30 seconds each side). Tight hamstrings and hip flexors are the most common causes of lower back pain nationwide desk workers. See our stretching for back pain guide for complete protocols." },
  { question: "Should I do the same stretching routine every day or switch it up?", answer: "A consistent core routine of 6-8 fundamental stretches should be performed daily for best results. However, you can and should add variety based on your activities: dynamic stretches on workout days, deeper holds on rest days, and targeted stretches for any areas that feel particularly tight. Your professional stretch service therapist will identify areas that need extra attention and can recommend modifications to your daily routine based on your progress." },
  { question: "How much does a professional stretch service cost to complement my daily routine?", answer: "Professional stretch service at Stretch Service costs $99 per 60-minute session. Weekly clients save 10% and pay just $89 per session. We recommend combining your daily self-stretching routine with one weekly professional session for optimal results. Our certified stretch therapists serve all 50 states and come to your home, office, hotel, or park. Text or call (888) 734-7274 to book your first session." },
  { question: "Can I do my daily stretching routine at work?", answer: "Absolutely. We recommend a 5-minute desk stretch break every 2 hours during the workday. Key desk stretches include: neck tilts, shoulder shrugs, seated spinal twist, seated figure-four hip stretch, standing quad stretch, and doorway chest stretch. These can all be done in business attire in a small space. For a more comprehensive office stretching guide, see our stretching for desk workers page. We also offer corporate stretch service programs for NYC offices." },
  { question: "What equipment do I need for a daily stretching routine?", answer: "You need no equipment for a basic daily stretching routine — just comfortable clothing and enough floor space to lie down. Optional helpful items include: a yoga mat for floor comfort, a towel or strap for reaching difficult positions, and a foam roller for self-myofascial release. When you book a professional stretch service session, our therapists bring all equipment including a portable massage table, mats, resistance bands, and stretching straps." },
];

export default function DailyStretchingRoutinePage() {
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
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">Stretching 101 — Daily Routines</p>
          <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl font-heading">
            DAILY STRETCHING<br />
            <span className="gradient-text">ROUTINE</span><br />
            MUST-DO STRETCHES BY AGE
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">
            The complete daily stretching guide organized by age group — 18-30, 30-45, 45-60, and 60+. Morning, midday, and evening routines with step-by-step instructions, hold times, and modifications. <strong className="text-white">$99/hr professional stretch service | 10% off weekly.</strong>
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
            <span className="text-slate-900 font-medium">Daily Stretching Routine</span>
          </nav>
        </div>
      </div>

      {/* ═══ INTRO ═══ */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-3xl font-bold text-slate-900 font-heading">Why You Need a Daily Stretching Routine</h2>
          <div className="mt-6 space-y-5 text-base leading-relaxed text-slate-700">
            <p>
              A daily stretching routine is not optional — it is essential maintenance for your body, as fundamental as brushing your teeth or sleeping. Every hour you spend sitting at a desk, commuting on the subway, or walking on NYC concrete creates muscle tension, fascial adhesions, and joint compression that accumulate over days, weeks, and years. Without a consistent daily stretching practice to counteract these forces, you are guaranteed to develop chronic tightness, pain, and reduced mobility.
            </p>
            <p>
              The routines on this page are organized by age group because your body&apos;s needs change with each decade. A 25-year-old training for a Brooklyn half-marathon has different priorities than a 55-year-old desk worker in Midtown or a 70-year-old in Astoria focused on maintaining independence. However, every routine follows the same core principles: target the major muscle groups, hold each stretch long enough to create real change (minimum 30 seconds), breathe deeply throughout, and never push through sharp pain.
            </p>
            <p>
              These routines are designed for self-practice at home, in your office, or at a park. For faster and deeper results, combine your daily routine with a weekly professional <Link href={getServiceUrl(services[0])} className="text-teal-600 underline hover:text-teal-700">assisted stretch service</Link> session. Our therapists use advanced techniques like <Link href={getServiceUrl(services[1])} className="text-teal-600 underline hover:text-teal-700">PNF stretching</Link> that produce 2-3x greater flexibility gains than self-stretching alone — and they can fine-tune your daily routine based on your specific body and goals.
            </p>
          </div>
        </div>
      </section>

      {/* ═══ AGES 18-30 ═══ */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-3xl font-bold text-slate-900 font-heading">Ages 18-30: Performance, Flexibility Gains, and Injury Prevention</h2>
          <p className="mt-4 text-base text-slate-700">
            In your twenties, your body is at its most resilient — but it is also when bad habits get established. If you sit at a desk, commute on the subway, or train hard at the gym without stretching, you are building a foundation of tightness that will cause serious problems in your 30s and 40s. This decade is your best opportunity to build excellent flexibility that will serve you for life. The focus here is performance optimization, flexibility gains, and bulletproofing your body against injury.
          </p>

          <h3 className="mt-10 text-2xl font-bold text-slate-900 font-heading">Morning Routine (10 Stretches — 12 Minutes)</h3>
          <p className="mt-2 text-sm text-slate-600">Perform immediately after waking. Focus on reversing sleep stiffness and activating your body for the day.</p>

          <div className="mt-6 space-y-6">
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h4 className="text-lg font-bold text-slate-900 font-heading">1. Standing Neck Rolls</h4>
              <p className="text-sm text-teal-600 font-semibold">Target: Cervical spine, upper trapezius, levator scapulae</p>
              <div className="mt-3 text-sm text-slate-700 space-y-2">
                <p><strong>How to do it:</strong> Stand tall with feet hip-width apart. Drop your chin to your chest. Slowly roll your head to the right, bringing your right ear toward your right shoulder. Continue rolling your head back (gently), then to the left ear toward left shoulder, and back to center. Move slowly and deliberately — each full circle should take about 10 seconds.</p>
                <p><strong>Hold time:</strong> 5 full circles in each direction (about 50 seconds each way)</p>
                <p><strong>Common mistakes:</strong> Rolling too fast, crunching the neck backward too aggressively, holding breath. Keep the movement smooth and controlled.</p>
                <p><strong>Modification:</strong> If neck rolls cause dizziness, do half circles only (ear to ear across the front, skipping the backward portion).</p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h4 className="text-lg font-bold text-slate-900 font-heading">2. Standing Side Bend</h4>
              <p className="text-sm text-teal-600 font-semibold">Target: Obliques, latissimus dorsi, intercostals, quadratus lumborum</p>
              <div className="mt-3 text-sm text-slate-700 space-y-2">
                <p><strong>How to do it:</strong> Stand with feet shoulder-width apart. Raise your right arm overhead and lean to the left, reaching your right hand over your head toward the left wall. Keep both feet flat on the floor and your hips square. You should feel a deep stretch along the entire right side of your torso. Return to center and switch sides.</p>
                <p><strong>Hold time:</strong> 30 seconds each side, 2 repetitions</p>
                <p><strong>Common mistakes:</strong> Leaning forward instead of directly to the side, bending at the waist instead of through the whole torso, letting the hip pop out to the opposite side.</p>
                <p><strong>Modification:</strong> Place the non-stretching hand on your hip for support. Reduce the lean angle if needed.</p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h4 className="text-lg font-bold text-slate-900 font-heading">3. Standing Chest Opener</h4>
              <p className="text-sm text-teal-600 font-semibold">Target: Pectoralis major and minor, anterior deltoids, biceps</p>
              <div className="mt-3 text-sm text-slate-700 space-y-2">
                <p><strong>How to do it:</strong> Interlace your fingers behind your back. Straighten your arms and gently lift them away from your body while squeezing your shoulder blades together. Open your chest and look slightly upward. If you cannot interlace your fingers, hold a towel between your hands behind your back.</p>
                <p><strong>Hold time:</strong> 30 seconds, 2 repetitions</p>
                <p><strong>Common mistakes:</strong> Arching the lower back excessively, shrugging the shoulders up toward the ears instead of pulling them down and back.</p>
                <p><strong>Modification:</strong> Use a doorway — place both forearms on the doorframe at shoulder height and lean through the doorway.</p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h4 className="text-lg font-bold text-slate-900 font-heading">4. Cat-Cow Stretch</h4>
              <p className="text-sm text-teal-600 font-semibold">Target: Entire spine, abdominals, erector spinae, hip flexors</p>
              <div className="mt-3 text-sm text-slate-700 space-y-2">
                <p><strong>How to do it:</strong> Start on hands and knees with wrists under shoulders and knees under hips. Inhale and arch your back, dropping your belly toward the floor and lifting your head and tailbone (cow). Exhale and round your back toward the ceiling, tucking your chin and tailbone (cat). Move slowly with your breath.</p>
                <p><strong>Hold time:</strong> 10 repetitions (about 60 seconds total)</p>
                <p><strong>Common mistakes:</strong> Moving too fast, not coordinating with breath, only moving the lower back instead of the entire spine from neck to tailbone.</p>
                <p><strong>Modification:</strong> Perform seated in a chair, placing hands on knees and alternating between arching and rounding the spine.</p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h4 className="text-lg font-bold text-slate-900 font-heading">5. Standing Forward Fold</h4>
              <p className="text-sm text-teal-600 font-semibold">Target: Hamstrings, calves, lower back, glutes</p>
              <div className="mt-3 text-sm text-slate-700 space-y-2">
                <p><strong>How to do it:</strong> Stand with feet hip-width apart. Hinge at the hips and fold forward, letting your upper body hang toward the floor. Bend your knees as much as needed to avoid lower back strain. Let your head and arms hang heavy. Gravity does the work — do not pull yourself down.</p>
                <p><strong>Hold time:</strong> 45 seconds, 2 repetitions</p>
                <p><strong>Common mistakes:</strong> Locking the knees, rounding the upper back to force hands to the floor (focus on hinging at the hips), bouncing.</p>
                <p><strong>Modification:</strong> Bend knees generously and rest hands on your shins or a yoga block.</p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h4 className="text-lg font-bold text-slate-900 font-heading">6. Low Lunge Hip Flexor Stretch</h4>
              <p className="text-sm text-teal-600 font-semibold">Target: Iliopsoas (hip flexors), rectus femoris, tensor fasciae latae</p>
              <div className="mt-3 text-sm text-slate-700 space-y-2">
                <p><strong>How to do it:</strong> Step your right foot forward into a deep lunge. Drop your left knee to the ground (use a mat or towel for padding). Keep your right knee directly over your right ankle. Press your hips forward and down until you feel a deep stretch in the front of your left hip. Raise your arms overhead for a deeper stretch.</p>
                <p><strong>Hold time:</strong> 30 seconds each side, 2 repetitions</p>
                <p><strong>Common mistakes:</strong> Letting the front knee push past the toes, arching the lower back instead of tucking the pelvis slightly, not going deep enough into the lunge.</p>
                <p><strong>Modification:</strong> Keep both hands on the front knee for balance. Place a pillow under the back knee for comfort.</p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h4 className="text-lg font-bold text-slate-900 font-heading">7. Standing Quad Stretch</h4>
              <p className="text-sm text-teal-600 font-semibold">Target: Quadriceps, hip flexors, knee joint</p>
              <div className="mt-3 text-sm text-slate-700 space-y-2">
                <p><strong>How to do it:</strong> Stand on your left leg. Bend your right knee and grab your right ankle or foot with your right hand, pulling your heel toward your glute. Keep your knees together and your standing leg slightly bent. Push your hips slightly forward to increase the stretch. Hold a wall or chair for balance if needed.</p>
                <p><strong>Hold time:</strong> 30 seconds each side, 2 repetitions</p>
                <p><strong>Common mistakes:</strong> Arching the lower back, pulling the foot to the outside of the hip instead of straight back, letting the knees separate.</p>
                <p><strong>Modification:</strong> Use a strap around the ankle if you cannot reach your foot. Perform lying face-down for easier balance.</p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h4 className="text-lg font-bold text-slate-900 font-heading">8. Figure-Four Glute Stretch</h4>
              <p className="text-sm text-teal-600 font-semibold">Target: Piriformis, gluteus medius, hip external rotators</p>
              <div className="mt-3 text-sm text-slate-700 space-y-2">
                <p><strong>How to do it:</strong> Lie on your back. Cross your right ankle over your left knee, creating a figure-four shape. Reach through and grab your left thigh (or left shin) and pull it toward your chest. Press your right knee away from you with your right elbow to deepen the stretch in the right glute.</p>
                <p><strong>Hold time:</strong> 30 seconds each side, 2 repetitions</p>
                <p><strong>Common mistakes:</strong> Lifting the head and shoulders off the floor (keep them relaxed on the ground), not pressing the crossed knee away enough.</p>
                <p><strong>Modification:</strong> Perform seated in a chair — cross one ankle over the opposite knee and lean forward gently.</p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h4 className="text-lg font-bold text-slate-900 font-heading">9. Supine Spinal Twist</h4>
              <p className="text-sm text-teal-600 font-semibold">Target: Thoracic spine, obliques, lower back, glutes, chest</p>
              <div className="mt-3 text-sm text-slate-700 space-y-2">
                <p><strong>How to do it:</strong> Lie on your back with arms extended to the sides in a T position. Bring your right knee up to your chest, then cross it over your body to the left, letting it fall toward the floor on your left side. Keep your right shoulder pressed into the floor. Turn your head to look at your right hand. Let gravity pull the knee down — do not force it.</p>
                <p><strong>Hold time:</strong> 30 seconds each side, 2 repetitions</p>
                <p><strong>Common mistakes:</strong> Forcing the knee to the floor (let gravity work), letting the opposite shoulder lift off the ground, rushing through the hold.</p>
                <p><strong>Modification:</strong> Place a pillow under the crossed knee if it does not reach the floor comfortably.</p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h4 className="text-lg font-bold text-slate-900 font-heading">10. Standing Calf Stretch</h4>
              <p className="text-sm text-teal-600 font-semibold">Target: Gastrocnemius, soleus, Achilles tendon</p>
              <div className="mt-3 text-sm text-slate-700 space-y-2">
                <p><strong>How to do it:</strong> Stand facing a wall with hands on the wall at shoulder height. Step your right foot back about 2-3 feet. Keep your right leg straight and right heel pressed firmly into the floor. Lean into the wall by bending your left knee until you feel a deep stretch in your right calf. For the soleus (deeper calf muscle), slightly bend the back knee while keeping the heel down.</p>
                <p><strong>Hold time:</strong> 30 seconds each side, straight leg and bent leg variations (about 2 minutes total)</p>
                <p><strong>Common mistakes:</strong> Letting the back heel lift off the floor, turning the back foot outward instead of pointing it straight ahead, not stepping far enough back.</p>
                <p><strong>Modification:</strong> Stand on a step with heels hanging off the edge and let the heels drop down for a gravity-assisted stretch.</p>
              </div>
            </div>
          </div>

          <h3 className="mt-12 text-2xl font-bold text-slate-900 font-heading">Pre-Workout Dynamic Stretching (8 Exercises — 8 Minutes)</h3>
          <p className="mt-2 text-sm text-slate-600">Perform before any gym session, run, or sport. These are movement-based — do not hold static positions.</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h4 className="font-bold text-slate-900">1. Leg Swings (Forward/Back)</h4>
              <p className="mt-2 text-sm text-slate-700">Hold a wall for balance. Swing one leg forward and back like a pendulum, gradually increasing range. 15 swings each leg.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h4 className="font-bold text-slate-900">2. Leg Swings (Side to Side)</h4>
              <p className="mt-2 text-sm text-slate-700">Face the wall. Swing one leg across your body and out to the side. Keep torso stable. 15 swings each leg.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h4 className="font-bold text-slate-900">3. Walking Lunges with Twist</h4>
              <p className="mt-2 text-sm text-slate-700">Step forward into a lunge, rotate your torso toward the front leg. Alternate legs. 10 per side.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h4 className="font-bold text-slate-900">4. Arm Circles</h4>
              <p className="mt-2 text-sm text-slate-700">Extend arms to the sides. Make small circles, gradually increasing to large circles. 15 forward, 15 backward.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h4 className="font-bold text-slate-900">5. Hip Circles</h4>
              <p className="mt-2 text-sm text-slate-700">Hands on hips, feet shoulder-width apart. Make large circles with your hips. 10 clockwise, 10 counterclockwise.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h4 className="font-bold text-slate-900">6. High Knees</h4>
              <p className="mt-2 text-sm text-slate-700">March in place, driving knees to hip height. Pump arms naturally. 20 per leg at moderate pace.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h4 className="font-bold text-slate-900">7. Inchworms</h4>
              <p className="mt-2 text-sm text-slate-700">From standing, fold forward, walk hands out to plank, walk feet to hands, stand up. 5 repetitions.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h4 className="font-bold text-slate-900">8. Butt Kicks</h4>
              <p className="mt-2 text-sm text-slate-700">Jog in place, kicking heels toward glutes. Keep a quick, light pace. 20 per leg.</p>
            </div>
          </div>
          <p className="mt-4 text-sm text-slate-600">For guided pre-workout stretching, book a <Link href={getServiceUrl(services[3])} className="text-teal-600 underline hover:text-teal-700">dynamic stretch service</Link> session. Our therapists meet you at Central Park, your gym, or any NYC location.</p>

          <h3 className="mt-12 text-2xl font-bold text-slate-900 font-heading">Post-Workout Static Stretching (8 Stretches — 10 Minutes)</h3>
          <p className="mt-2 text-sm text-slate-600">Perform within 30 minutes of finishing exercise while muscles are warm.</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h4 className="font-bold text-slate-900">1. Standing Hamstring Stretch</h4>
              <p className="mt-2 text-sm text-slate-700">Place heel on a bench or step. Keep leg straight, hinge forward at hips. 45 seconds each side.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h4 className="font-bold text-slate-900">2. Standing Quad Stretch</h4>
              <p className="mt-2 text-sm text-slate-700">Pull heel to glute, press hips forward slightly. Keep knees together. 30 seconds each side.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h4 className="font-bold text-slate-900">3. Pigeon Pose</h4>
              <p className="mt-2 text-sm text-slate-700">From plank, bring right knee behind right wrist, extend left leg back. Fold forward. 45 seconds each side.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h4 className="font-bold text-slate-900">4. Kneeling Hip Flexor Lunge</h4>
              <p className="mt-2 text-sm text-slate-700">Back knee on ground, front foot flat. Press hips forward and down. 30 seconds each side.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h4 className="font-bold text-slate-900">5. Doorway Chest Stretch</h4>
              <p className="mt-2 text-sm text-slate-700">Forearms on doorframe at 90 degrees. Step through with one foot and lean forward. 30 seconds.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h4 className="font-bold text-slate-900">6. Cross-Body Shoulder Stretch</h4>
              <p className="mt-2 text-sm text-slate-700">Bring right arm across chest. Use left hand to pull it closer. Keep shoulder down. 30 seconds each side.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h4 className="font-bold text-slate-900">7. Seated Spinal Twist</h4>
              <p className="mt-2 text-sm text-slate-700">Sit with legs extended. Cross right foot over left leg. Twist torso right. 30 seconds each side.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h4 className="font-bold text-slate-900">8. Child&apos;s Pose</h4>
              <p className="mt-2 text-sm text-slate-700">Knees wide, sit back on heels, reach arms forward. Melt chest toward floor. 60 seconds.</p>
            </div>
          </div>
          <p className="mt-4 text-sm text-slate-600">For professional post-workout recovery, book a <Link href={getServiceUrl(services[8])} className="text-teal-600 underline hover:text-teal-700">recovery stretch service</Link> session — we come to your gym, apartment, or park.</p>
        </div>
      </section>

      {/* ═══ AGES 30-45 ═══ */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-3xl font-bold text-slate-900 font-heading">Ages 30-45: Counteracting Desk Work, Maintaining Mobility, Stress Relief</h2>
          <p className="mt-4 text-base text-slate-700">
            Your thirties and forties are when the consequences of a sedentary lifestyle start making themselves known. The hip flexors you shortened sitting at a desk for the past decade are now causing lower back pain. The rounded shoulders from hunching over a laptop are now creating neck tension and headaches. The stress of managing a career and family nationwide is stored as tension throughout your entire body. This is the decade where a daily stretching routine and regular professional <Link href={getServiceUrl(services[0])} className="text-teal-600 underline hover:text-teal-700">stretch service</Link> sessions become critically important.
          </p>

          <h3 className="mt-10 text-2xl font-bold text-slate-900 font-heading">Morning Routine (10 Stretches — 15 Minutes)</h3>
          <p className="mt-2 text-sm text-slate-600">Focus on spinal mobility, hip opening, and shoulder loosening. These stretches directly counteract sleeping and desk posture.</p>

          <div className="mt-6 space-y-6">
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h4 className="text-lg font-bold text-slate-900 font-heading">1. Bed Stretch — Full Body Reach</h4>
              <p className="text-sm text-teal-600 font-semibold">Target: Full body, shoulders, spine decompression</p>
              <div className="mt-3 text-sm text-slate-700 space-y-2">
                <p><strong>How to do it:</strong> Before getting out of bed, reach your arms overhead and your toes toward the foot of the bed. Stretch as long as possible, pressing your lower back into the mattress. Take 3 deep breaths in this position. Then alternate reaching one arm and the opposite leg to create a diagonal stretch.</p>
                <p><strong>Hold time:</strong> 30 seconds center, 15 seconds each diagonal</p>
                <p><strong>Common mistakes:</strong> Rushing out of bed without this crucial first stretch. Holding breath instead of breathing deeply.</p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h4 className="text-lg font-bold text-slate-900 font-heading">2. Supine Knee-to-Chest</h4>
              <p className="text-sm text-teal-600 font-semibold">Target: Lower back, glutes, hip joint</p>
              <div className="mt-3 text-sm text-slate-700 space-y-2">
                <p><strong>How to do it:</strong> Lying on your back, pull one knee to your chest with both hands. Keep the other leg flat on the bed or floor. Press your lower back into the surface. Gently rock side to side for a mild massage of the lower back.</p>
                <p><strong>Hold time:</strong> 30 seconds each side, then 30 seconds with both knees pulled to chest</p>
                <p><strong>Common mistakes:</strong> Lifting the head and shoulders off the ground, pulling the knee toward the shoulder instead of the chest.</p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h4 className="text-lg font-bold text-slate-900 font-heading">3. Cat-Cow Spinal Mobilization</h4>
              <p className="text-sm text-teal-600 font-semibold">Target: Entire spine, abdominals, back extensors</p>
              <div className="mt-3 text-sm text-slate-700 space-y-2">
                <p><strong>How to do it:</strong> On hands and knees, alternate between arching (cow) and rounding (cat) your spine. Move slowly, initiating the movement from the pelvis and letting it ripple up through your spine to your neck. Inhale on cow, exhale on cat.</p>
                <p><strong>Hold time:</strong> 10 repetitions, about 60 seconds total</p>
                <p><strong>Common mistakes:</strong> Only moving the lower back instead of the entire spine, moving too quickly.</p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h4 className="text-lg font-bold text-slate-900 font-heading">4. Thread the Needle</h4>
              <p className="text-sm text-teal-600 font-semibold">Target: Thoracic spine, shoulders, upper back</p>
              <div className="mt-3 text-sm text-slate-700 space-y-2">
                <p><strong>How to do it:</strong> Start on all fours. Reach your right arm under your body to the left, letting your right shoulder and temple rest on the floor. Extend your left arm overhead or place it on your lower back for a deeper twist. You should feel a deep stretch between your shoulder blades and through your upper back.</p>
                <p><strong>Hold time:</strong> 30 seconds each side, 2 repetitions</p>
                <p><strong>Common mistakes:</strong> Not rotating enough through the thoracic spine, collapsing instead of actively threading the arm through.</p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h4 className="text-lg font-bold text-slate-900 font-heading">5. World&apos;s Greatest Stretch</h4>
              <p className="text-sm text-teal-600 font-semibold">Target: Hip flexors, hamstrings, thoracic spine, groin, shoulders</p>
              <div className="mt-3 text-sm text-slate-700 space-y-2">
                <p><strong>How to do it:</strong> Step your right foot forward into a deep lunge, left knee on the ground. Place your left hand on the floor inside your right foot. Rotate your torso to the right, reaching your right arm to the ceiling. Follow your hand with your eyes. Return and switch sides.</p>
                <p><strong>Hold time:</strong> 30 seconds each side, 2 repetitions</p>
                <p><strong>Common mistakes:</strong> Not dropping the hips low enough, rotating only through the shoulders instead of the thoracic spine.</p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h4 className="text-lg font-bold text-slate-900 font-heading">6. Standing Hip Circles</h4>
              <p className="text-sm text-teal-600 font-semibold">Target: Hip joint, hip flexors, glutes, adductors</p>
              <div className="mt-3 text-sm text-slate-700 space-y-2">
                <p><strong>How to do it:</strong> Stand on your left leg (hold something for balance). Lift your right knee to hip height and make large circles with the knee, rotating from the hip joint. 10 circles forward, 10 backward. Switch legs.</p>
                <p><strong>Hold time:</strong> 10 circles each direction, each leg (about 80 seconds total)</p>
                <p><strong>Common mistakes:</strong> Making circles too small, moving from the knee instead of the hip joint.</p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h4 className="text-lg font-bold text-slate-900 font-heading">7. Seated Forward Fold</h4>
              <p className="text-sm text-teal-600 font-semibold">Target: Hamstrings, calves, lower back, thoracolumbar fascia</p>
              <div className="mt-3 text-sm text-slate-700 space-y-2">
                <p><strong>How to do it:</strong> Sit on the floor with legs extended straight ahead. Hinge at the hips and reach toward your feet. Keep your spine as long as possible rather than rounding your upper back. Use a towel around your feet if you cannot reach comfortably.</p>
                <p><strong>Hold time:</strong> 45 seconds, 2 repetitions</p>
                <p><strong>Common mistakes:</strong> Rounding the upper back to force hands toward feet instead of maintaining a long spine and hinging at the hips.</p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h4 className="text-lg font-bold text-slate-900 font-heading">8. Standing Figure-Four</h4>
              <p className="text-sm text-teal-600 font-semibold">Target: Piriformis, glutes, hip external rotators</p>
              <div className="mt-3 text-sm text-slate-700 space-y-2">
                <p><strong>How to do it:</strong> Stand and cross your right ankle over your left knee. Sit back as if sitting into a chair, keeping your chest upright. Hold a wall or counter for balance. You should feel a deep stretch in the right glute.</p>
                <p><strong>Hold time:</strong> 30 seconds each side, 2 repetitions</p>
                <p><strong>Common mistakes:</strong> Rounding the back, not sitting back far enough, losing balance (use support).</p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h4 className="text-lg font-bold text-slate-900 font-heading">9. Doorway Pec Stretch</h4>
              <p className="text-sm text-teal-600 font-semibold">Target: Pectoralis major and minor, anterior deltoids</p>
              <div className="mt-3 text-sm text-slate-700 space-y-2">
                <p><strong>How to do it:</strong> Stand in a doorway with both forearms on the frame, elbows at 90 degrees. Step one foot through the doorway and lean your body forward until you feel a deep stretch across your chest and front shoulders. Do three angles: arms at shoulder height, above shoulder height, and below shoulder height.</p>
                <p><strong>Hold time:</strong> 30 seconds at each arm position (90 seconds total)</p>
                <p><strong>Common mistakes:</strong> Shrugging shoulders, arching the lower back, not stepping far enough through the doorway.</p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h4 className="text-lg font-bold text-slate-900 font-heading">10. Neck Tilts with Overpressure</h4>
              <p className="text-sm text-teal-600 font-semibold">Target: Upper trapezius, levator scapulae, scalenes</p>
              <div className="mt-3 text-sm text-slate-700 space-y-2">
                <p><strong>How to do it:</strong> Tilt your right ear toward your right shoulder. Place your right hand gently on the left side of your head and apply very light overpressure — just the weight of your hand, no pulling. Reach your left arm toward the floor to deepen the stretch. Repeat on the other side.</p>
                <p><strong>Hold time:</strong> 30 seconds each side, 2 repetitions</p>
                <p><strong>Common mistakes:</strong> Pulling the head aggressively (use only the weight of the hand), lifting the opposite shoulder, holding breath.</p>
              </div>
            </div>
          </div>

          <h3 className="mt-12 text-2xl font-bold text-slate-900 font-heading">Office Stretches (5 Exercises — 5 Minutes Every 2 Hours)</h3>
          <p className="mt-2 text-sm text-slate-600">Perform at your desk without changing clothes. See our complete <Link href="/stretching-101/stretching-for-desk-workers" className="text-teal-600 underline hover:text-teal-700">desk worker stretching guide</Link> for more.</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h4 className="font-bold text-slate-900">1. Seated Neck Tilts</h4>
              <p className="mt-2 text-sm text-slate-700">Tilt ear to shoulder, hold 20 seconds. Each side. Relieves tech neck from screens.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h4 className="font-bold text-slate-900">2. Seated Spinal Twist</h4>
              <p className="mt-2 text-sm text-slate-700">Twist torso left, grabbing chair back. Hold 20 seconds each side. Mobilizes thoracic spine.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h4 className="font-bold text-slate-900">3. Seated Figure-Four</h4>
              <p className="mt-2 text-sm text-slate-700">Cross ankle over knee, lean forward gently. 20 seconds each side. Opens tight hips.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h4 className="font-bold text-slate-900">4. Standing Doorway Chest Stretch</h4>
              <p className="mt-2 text-sm text-slate-700">Forearms on doorframe, lean through. 20 seconds. Counteracts rounded desk posture.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h4 className="font-bold text-slate-900">5. Standing Calf Raises and Stretch</h4>
              <p className="mt-2 text-sm text-slate-700">10 calf raises, then stretch each calf 20 seconds. Improves circulation after sitting.</p>
            </div>
          </div>

          <h3 className="mt-12 text-2xl font-bold text-slate-900 font-heading">Evening Wind-Down (6 Stretches — 10 Minutes)</h3>
          <p className="mt-2 text-sm text-slate-600">Perform 30-60 minutes before bed. Slow, sustained holds that activate the parasympathetic nervous system.</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h4 className="font-bold text-slate-900">1. Child&apos;s Pose</h4>
              <p className="mt-2 text-sm text-slate-700">Knees wide, sit back on heels, arms extended forward. Breathe deeply. 60 seconds.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h4 className="font-bold text-slate-900">2. Supine Spinal Twist</h4>
              <p className="mt-2 text-sm text-slate-700">On back, cross knee over body, arms in T. Let gravity work. 45 seconds each side.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h4 className="font-bold text-slate-900">3. Legs Up the Wall</h4>
              <p className="mt-2 text-sm text-slate-700">Lie on back, swing legs up a wall. Arms by sides, breathe deeply. 2 minutes. Reduces leg swelling.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h4 className="font-bold text-slate-900">4. Supine Figure-Four</h4>
              <p className="mt-2 text-sm text-slate-700">On back, cross ankle over knee, pull thigh toward chest. 45 seconds each side.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h4 className="font-bold text-slate-900">5. Neck and Shoulder Release</h4>
              <p className="mt-2 text-sm text-slate-700">Seated, tilt ear to shoulder with gentle overpressure. 30 seconds each side. Releases day&apos;s tension.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h4 className="font-bold text-slate-900">6. Happy Baby Pose</h4>
              <p className="mt-2 text-sm text-slate-700">On back, grab outside edges of feet, pull knees toward armpits. Rock side to side. 60 seconds.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ AGES 45-60 ═══ */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-3xl font-bold text-slate-900 font-heading">Ages 45-60: Joint Health, Preventing Stiffness, Maintaining Range of Motion</h2>
          <p className="mt-4 text-base text-slate-700">
            In your late forties and fifties, maintaining what you have becomes as important as gaining new range. Joint cartilage is thinner, connective tissue is less elastic, and recovery takes longer. The good news is that consistent stretching can slow and even reverse much of this age-related decline. This is also the decade where professional <Link href={getServiceUrl(services[0])} className="text-teal-600 underline hover:text-teal-700">stretch service</Link> becomes especially valuable — a trained therapist can safely take you deeper than you can go alone and monitor for signs of joint or tissue stress.
          </p>

          <h3 className="mt-10 text-2xl font-bold text-slate-900 font-heading">Morning Routine (8 Stretches — 15 Minutes)</h3>
          <p className="mt-2 text-sm text-slate-600">Gentler pace, longer holds, more emphasis on joint mobility. Start every stretch slowly and let the first 10 seconds be exploratory.</p>

          <div className="mt-6 space-y-6">
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h4 className="text-lg font-bold text-slate-900 font-heading">1. Bed Knee-to-Chest Sequence</h4>
              <p className="text-sm text-teal-600 font-semibold">Target: Lower back, hip joint, glutes</p>
              <div className="mt-3 text-sm text-slate-700 space-y-2">
                <p><strong>How to do it:</strong> Before getting out of bed, pull your right knee to your chest and hold. Then pull your left knee to your chest and hold. Then pull both knees together. This warms up the lower back and hip joints that have been static for 7-8 hours.</p>
                <p><strong>Hold time:</strong> 30 seconds single knee each side, 30 seconds both knees</p>
                <p><strong>Common mistakes:</strong> Jerking the knee up too fast — always move slowly and deliberately in the morning.</p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h4 className="text-lg font-bold text-slate-900 font-heading">2. Gentle Cat-Cow</h4>
              <p className="text-sm text-teal-600 font-semibold">Target: Entire spinal column, core engagement</p>
              <div className="mt-3 text-sm text-slate-700 space-y-2">
                <p><strong>How to do it:</strong> On hands and knees, slowly alternate between arching and rounding the spine. Move at half the speed of the younger routine — spend 5-6 seconds in each position. Focus on mobilizing every vertebra from tailbone to neck.</p>
                <p><strong>Hold time:</strong> 8 repetitions, about 90 seconds total</p>
                <p><strong>Common mistakes:</strong> Moving too quickly, only moving the lumbar spine. Think about moving each vertebra individually.</p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h4 className="text-lg font-bold text-slate-900 font-heading">3. Standing Side Bend with Support</h4>
              <p className="text-sm text-teal-600 font-semibold">Target: Lateral chain — obliques, lats, intercostals, QL</p>
              <div className="mt-3 text-sm text-slate-700 space-y-2">
                <p><strong>How to do it:</strong> Stand with feet shoulder-width apart, one hand on a counter or chair back for balance. Raise the opposite arm overhead and lean gently to the support side. Keep both feet flat. Return to center, switch sides.</p>
                <p><strong>Hold time:</strong> 30 seconds each side, 2 repetitions</p>
                <p><strong>Modification:</strong> Perform seated if balance is a concern.</p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h4 className="text-lg font-bold text-slate-900 font-heading">4. Supported Hip Flexor Stretch</h4>
              <p className="text-sm text-teal-600 font-semibold">Target: Hip flexors, quadriceps, lower abdomen</p>
              <div className="mt-3 text-sm text-slate-700 space-y-2">
                <p><strong>How to do it:</strong> Stand in a split stance with right foot forward and left foot back. Hold a chair or wall for support. Tuck your pelvis (posterior tilt) and gently push your hips forward until you feel a stretch in the front of your left hip. Keep torso upright.</p>
                <p><strong>Hold time:</strong> 30 seconds each side, 2 repetitions</p>
                <p><strong>Common mistakes:</strong> Arching the lower back instead of tucking the pelvis. The stretch should be felt in the hip, not the back.</p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h4 className="text-lg font-bold text-slate-900 font-heading">5. Wall Hamstring Stretch</h4>
              <p className="text-sm text-teal-600 font-semibold">Target: Hamstrings, lower back, calves</p>
              <div className="mt-3 text-sm text-slate-700 space-y-2">
                <p><strong>How to do it:</strong> Lie on your back near a doorway. Extend one leg up the doorframe while the other leg lies flat through the door opening. Scoot closer to the wall for a deeper stretch, farther away for less intensity.</p>
                <p><strong>Hold time:</strong> 45 seconds each side</p>
                <p><strong>Common mistakes:</strong> Bending the knee of the stretching leg, lifting hips off the floor.</p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h4 className="text-lg font-bold text-slate-900 font-heading">6. Seated Spinal Rotation</h4>
              <p className="text-sm text-teal-600 font-semibold">Target: Thoracic spine, obliques, intercostals</p>
              <div className="mt-3 text-sm text-slate-700 space-y-2">
                <p><strong>How to do it:</strong> Sit in a sturdy chair. Cross your arms over your chest. Rotate your torso to the right as far as comfortable, keeping your hips facing forward. Look over your right shoulder. Return to center and rotate left.</p>
                <p><strong>Hold time:</strong> 30 seconds each side, 2 repetitions</p>
                <p><strong>Common mistakes:</strong> Rotating the hips instead of isolating the thoracic spine, leaning to one side.</p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h4 className="text-lg font-bold text-slate-900 font-heading">7. Wall Calf Stretch</h4>
              <p className="text-sm text-teal-600 font-semibold">Target: Gastrocnemius, soleus, Achilles tendon, plantar fascia</p>
              <div className="mt-3 text-sm text-slate-700 space-y-2">
                <p><strong>How to do it:</strong> Hands on wall, step one foot back 2-3 feet. Keep back heel down, lean into wall. Do straight-leg version first (gastrocnemius), then bent-knee version (soleus). Healthy Achilles tendons and calves are essential for safe walking on NYC streets.</p>
                <p><strong>Hold time:</strong> 30 seconds straight leg, 30 seconds bent knee, each side</p>
                <p><strong>Common mistakes:</strong> Letting the back heel lift, pointing the back foot outward.</p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h4 className="text-lg font-bold text-slate-900 font-heading">8. Gentle Neck and Shoulder Release</h4>
              <p className="text-sm text-teal-600 font-semibold">Target: Upper trapezius, levator scapulae, cervical spine</p>
              <div className="mt-3 text-sm text-slate-700 space-y-2">
                <p><strong>How to do it:</strong> Seated or standing, gently tilt right ear toward right shoulder. Place right hand lightly on the left side of your head — just resting, no pressure. Reach left fingertips toward the floor. Breathe deeply and let gravity do the work.</p>
                <p><strong>Hold time:</strong> 30 seconds each side, 2 repetitions</p>
                <p><strong>Common mistakes:</strong> Pulling the head — only use the weight of the hand. Never force a neck stretch.</p>
              </div>
            </div>
          </div>

          <div className="mt-10 rounded-xl border border-teal-300 bg-teal-50 p-6">
            <h3 className="text-lg font-bold text-teal-800 font-heading">Ages 45-60: Why Weekly Stretch Service Matters More Now</h3>
            <p className="mt-2 text-sm text-teal-700">As connective tissue becomes less elastic with age, professional stretch service becomes increasingly valuable. Our therapists use <Link href={getServiceUrl(services[1])} className="text-teal-600 underline">PNF stretching</Link> and <Link href={getServiceUrl(services[6])} className="text-teal-600 underline">myofascial release</Link> to address deep fascial restrictions that self-stretching simply cannot reach. Weekly sessions at $89/session (10% off) help maintain the mobility gains from your daily routine and prevent the gradual stiffening that accelerates in this decade.</p>
          </div>
        </div>
      </section>

      {/* ═══ AGES 60+ ═══ */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-3xl font-bold text-slate-900 font-heading">Ages 60+: Fall Prevention, Independence, and Arthritis Management</h2>
          <p className="mt-4 text-base text-slate-700">
            After 60, the primary goals of stretching shift to maintaining independence, preventing falls (the number one cause of injury-related death in older adults), and managing age-related conditions like arthritis, stenosis, and general stiffness. Every stretch in this routine is designed to support the movements of daily living — reaching for items on shelves, getting in and out of chairs, walking confidently, and maintaining balance. For a more comprehensive guide, see our full <Link href="/stretching-101/stretching-for-seniors" className="text-teal-600 underline hover:text-teal-700">stretching for seniors</Link> page.
          </p>

          <h3 className="mt-10 text-2xl font-bold text-slate-900 font-heading">Morning Routine (8 Stretches — 15 Minutes)</h3>
          <p className="mt-2 text-sm text-slate-600">All stretches can be performed seated in a chair or standing with support. Never rush. Begin each movement gently and increase range only as the body warms up.</p>

          <div className="mt-6 space-y-6">
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h4 className="text-lg font-bold text-slate-900 font-heading">1. Seated Neck Turns</h4>
              <p className="text-sm text-teal-600 font-semibold">Target: Cervical spine, neck rotators, upper trapezius</p>
              <div className="mt-3 text-sm text-slate-700 space-y-2">
                <p><strong>How to do it:</strong> Sit tall in a sturdy chair with feet flat on the floor. Slowly turn your head to look over your right shoulder as far as comfortable. Hold. Return to center. Turn to the left. Then tilt right ear to right shoulder and hold. Tilt left ear to left shoulder and hold.</p>
                <p><strong>Hold time:</strong> 20 seconds each position (turns and tilts both sides — about 80 seconds total)</p>
                <p><strong>Safety note:</strong> Never roll the head backward or in full circles. Move slowly and stop if you feel dizziness.</p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h4 className="text-lg font-bold text-slate-900 font-heading">2. Seated Shoulder Rolls</h4>
              <p className="text-sm text-teal-600 font-semibold">Target: Shoulder joint, upper trapezius, rhomboids</p>
              <div className="mt-3 text-sm text-slate-700 space-y-2">
                <p><strong>How to do it:</strong> Sit tall. Lift both shoulders toward your ears, then roll them backward and down, squeezing shoulder blades together at the back. Make big, slow circles. Then reverse direction — roll shoulders forward and up.</p>
                <p><strong>Hold time:</strong> 10 rolls backward, 10 rolls forward (about 40 seconds)</p>
                <p><strong>Common mistakes:</strong> Making circles too small. Use the full range of the shoulder joint.</p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h4 className="text-lg font-bold text-slate-900 font-heading">3. Seated Chest Opener</h4>
              <p className="text-sm text-teal-600 font-semibold">Target: Pectorals, anterior deltoids, biceps, respiratory muscles</p>
              <div className="mt-3 text-sm text-slate-700 space-y-2">
                <p><strong>How to do it:</strong> Sit near the front edge of a sturdy chair. Reach both arms behind you and grab the chair back (or interlace fingers behind you). Gently squeeze shoulder blades together and lift the chest. Open your chest wide and take 3 deep breaths.</p>
                <p><strong>Hold time:</strong> 30 seconds, 2 repetitions</p>
                <p><strong>Modification:</strong> If you cannot reach behind, simply place hands on the chair seat beside your hips and press down while lifting the chest.</p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h4 className="text-lg font-bold text-slate-900 font-heading">4. Seated Spinal Twist</h4>
              <p className="text-sm text-teal-600 font-semibold">Target: Thoracic and lumbar spine, obliques</p>
              <div className="mt-3 text-sm text-slate-700 space-y-2">
                <p><strong>How to do it:</strong> Sit tall with feet flat on the floor. Place your right hand on the outside of your left knee and your left hand on the chair back behind you. Gently rotate your torso to the left, looking over your left shoulder. Keep your hips facing forward. Return to center and switch sides.</p>
                <p><strong>Hold time:</strong> 30 seconds each side</p>
                <p><strong>Safety note:</strong> Rotate only within a comfortable range. If you have spinal stenosis or disc issues, reduce the rotation range and check with your physician.</p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h4 className="text-lg font-bold text-slate-900 font-heading">5. Seated Hamstring Stretch</h4>
              <p className="text-sm text-teal-600 font-semibold">Target: Hamstrings, lower back, calves</p>
              <div className="mt-3 text-sm text-slate-700 space-y-2">
                <p><strong>How to do it:</strong> Sit near the front edge of the chair. Extend your right leg straight out in front with the heel on the floor and toes pointing up. Keep your left foot flat on the floor. Sit tall and hinge forward from the hips (not by rounding the back) until you feel a stretch in the back of the right leg.</p>
                <p><strong>Hold time:</strong> 30 seconds each side, 2 repetitions</p>
                <p><strong>Common mistakes:</strong> Rounding the back instead of hinging at the hips, locking the knee too aggressively.</p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h4 className="text-lg font-bold text-slate-900 font-heading">6. Seated Figure-Four Hip Stretch</h4>
              <p className="text-sm text-teal-600 font-semibold">Target: Piriformis, gluteus medius, hip external rotators</p>
              <div className="mt-3 text-sm text-slate-700 space-y-2">
                <p><strong>How to do it:</strong> Sit with feet flat on the floor. Cross your right ankle over your left knee. Gently press down on the right knee with your right hand while sitting tall. For more stretch, lean your torso forward slightly, hinging at the hips.</p>
                <p><strong>Hold time:</strong> 30 seconds each side, 2 repetitions</p>
                <p><strong>Safety note:</strong> If you have hip replacement hardware, check with your physician before performing this stretch.</p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h4 className="text-lg font-bold text-slate-900 font-heading">7. Seated Ankle Circles</h4>
              <p className="text-sm text-teal-600 font-semibold">Target: Ankle joint, calf muscles, shin muscles</p>
              <div className="mt-3 text-sm text-slate-700 space-y-2">
                <p><strong>How to do it:</strong> Lift your right foot slightly off the floor. Make large, slow circles with your foot, rotating from the ankle. 10 clockwise, 10 counterclockwise. Then point and flex the foot 10 times. Switch feet. This stretch improves ankle stability — critical for fall prevention.</p>
                <p><strong>Hold time:</strong> 10 circles each direction, 10 point-and-flex, each foot (about 90 seconds total)</p>
                <p><strong>Why it matters:</strong> Ankle stiffness is a leading contributor to falls in older adults. Mobile ankles allow for better balance reactions.</p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h4 className="text-lg font-bold text-slate-900 font-heading">8. Standing Wall Calf Stretch (with Chair Support)</h4>
              <p className="text-sm text-teal-600 font-semibold">Target: Gastrocnemius, soleus, Achilles tendon</p>
              <div className="mt-3 text-sm text-slate-700 space-y-2">
                <p><strong>How to do it:</strong> Stand facing a wall with a sturdy chair beside you for support. Step one foot back 18-24 inches. Keep back heel on the floor and lean gently into the wall. Hold the chair with one hand for stability. Repeat with back knee slightly bent for the deeper soleus muscle.</p>
                <p><strong>Hold time:</strong> 30 seconds straight leg, 30 seconds bent knee, each side</p>
                <p><strong>Safety note:</strong> Always have the chair or wall within reach for balance. Never bounce.</p>
              </div>
            </div>
          </div>

          <div className="mt-10 rounded-xl border border-teal-300 bg-teal-50 p-6">
            <h3 className="text-lg font-bold text-teal-800 font-heading">Professional Gentle Stretch Service for Seniors</h3>
            <p className="mt-2 text-sm text-teal-700">Our <Link href={getServiceUrl(services[9])} className="text-teal-600 underline">gentle stretch service</Link> program is specifically designed for adults 60+ and includes chair-assisted options, arthritis-friendly techniques, and fall prevention exercises. Our therapists are trained in senior-specific care and come directly to your NYC home. $99/hr, 10% off weekly at $89/session. <a href={SITE_SMS_LINK} className="text-teal-600 underline font-semibold">Text {SITE_PHONE}</a> to book.</p>
          </div>
        </div>
      </section>

      {/* ═══ WHEN YOU NEED PROFESSIONAL HELP ═══ */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-3xl font-bold text-slate-900 font-heading">When You Need Professional Stretch Service Help</h2>
          <div className="mt-6 space-y-5 text-base leading-relaxed text-slate-700">
            <p>
              Daily self-stretching is the foundation of flexibility maintenance, and every routine on this page is designed for independent practice. However, there are clear signs that you need professional stretch service support to complement your daily routine:
            </p>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="font-bold text-slate-900 font-heading">Signs You Need Professional Help</h3>
              <ul className="mt-3 space-y-2 text-sm text-slate-700">
                <li>&#8226; Chronic pain that persists despite 2+ weeks of daily stretching</li>
                <li>&#8226; Flexibility plateau — you have not improved in weeks</li>
                <li>&#8226; One side is noticeably tighter than the other (muscle imbalance)</li>
                <li>&#8226; You cannot get into the stretch positions described above</li>
                <li>&#8226; Post-surgery or post-injury and unsure what is safe</li>
                <li>&#8226; You experience sharp pain during any stretch</li>
                <li>&#8226; You are over 60 and want guided, safe progression</li>
              </ul>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="font-bold text-slate-900 font-heading">What Professional Stretch Service Adds</h3>
              <ul className="mt-3 space-y-2 text-sm text-slate-700">
                <li>&#8226; <Link href={getServiceUrl(services[1])} className="text-teal-600 underline">PNF stretching</Link> — 2-3x more effective, requires a trained partner</li>
                <li>&#8226; <Link href={getServiceUrl(services[6])} className="text-teal-600 underline">Myofascial release</Link> — targets deep fascial restrictions</li>
                <li>&#8226; Full-body mobility assessment identifies hidden issues</li>
                <li>&#8226; Personalized routine adjustments based on your body</li>
                <li>&#8226; Reaches muscles and angles impossible alone</li>
                <li>&#8226; Monitors and prevents overstretching</li>
                <li>&#8226; $99/hr or $89/hr weekly — all 50 states</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FAQ ═══ */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-3xl font-bold text-slate-900 font-heading text-center">Daily Stretching Routine — Frequently Asked Questions</h2>
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
            Accelerate Your Daily Routine with Professional Stretch Service
          </h2>
          <p className="mt-4 text-lg text-teal-100">
            Your daily stretching routine gets you 70% of the way there. A weekly professional stretch service session gets you the rest — and then some. Our certified therapists use PNF stretching, myofascial release, and advanced techniques to achieve what self-stretching cannot. <strong className="text-white">$99/hr | 10% off weekly at $89/session.</strong>
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
