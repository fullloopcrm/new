import Link from "next/link";
import type { Metadata } from "next";
import { services, getServiceUrl, SITE_URL, SITE_SMS_LINK, SITE_PHONE, SITE_PHONE_LINK } from "@/app/site/stretch-service/_lib/siteData";
import { JsonLd, webPageSchema, breadcrumbSchema, faqSchema } from "@/app/site/stretch-service/_lib/schema";
import Logo from "@/app/site/stretch-service/_components/Logo";

const PAGE_URL = `${SITE_URL}/stretching-101/stretching-for-athletes`;
const PAGE_TITLE = "Stretching for Athletes NYC | Performance & Recovery Guide | Stretch Service";
const PAGE_DESC = "Pre-workout dynamic stretching, post-workout recovery, sport-specific routines for runners, cyclists, and gym-goers. NYC athlete stretch service — $99/hr, all 50 states.";

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESC,
  alternates: { canonical: PAGE_URL },
};

const breadcrumbs = [
  { name: "Home", url: SITE_URL },
  { name: "Stretching 101", url: `${SITE_URL}/stretching-101` },
  { name: "Stretching for Athletes", url: PAGE_URL },
];

const faqs = [
  { question: "Should athletes stretch before or after a workout?", answer: "Both, but with different techniques. Before a workout, athletes should perform 8-10 minutes of dynamic stretching — controlled movements like leg swings, walking lunges, arm circles, and high knees that warm up muscles and prepare joints for activity. Dynamic stretching before exercise improves performance by 5-10%. After a workout, athletes should perform 10-15 minutes of static stretching — sustained holds of 30-60 seconds per muscle group to cool down, reduce DOMS, and promote recovery. Professional stretch service sessions can serve as either pre-workout activation or post-workout recovery." },
  { question: "How does stretching improve athletic performance?", answer: "Stretching improves athletic performance through multiple mechanisms: (1) increased range of motion allows longer, more powerful strides, strokes, and movements; (2) improved muscle elasticity increases force production and reduces energy waste; (3) better joint mobility allows more efficient movement patterns; (4) reduced muscle tension decreases the braking forces that slow you down; and (5) enhanced nervous system activation from dynamic stretching primes the body for explosive movements. Studies show 5-10% performance improvement with proper pre-workout dynamic stretching." },
  { question: "What is the best type of stretching for runners?", answer: "For runners, the best approach is dynamic stretching before runs (leg swings, walking lunges, high knees, butt kicks) and static stretching after runs (hamstrings, hip flexors, calves, IT band, piriformis). PNF stretching produces the greatest flexibility gains for runners and is ideal for weekly maintenance through professional stretch service sessions. Central Park runners, Brooklyn Bridge runners, and NYC marathon trainees all benefit from this protocol. Book a stretch service session at $99/hr or $89/hr weekly." },
  { question: "How often should athletes get professional stretch service?", answer: "For competitive or serious recreational athletes, 1-2 professional stretch service sessions per week produces optimal results. The first session focuses on recovery and maintaining flexibility, while a second session (if scheduling allows) can focus on sport-specific mobility and performance optimization. During peak training or race preparation, increasing to 2-3 sessions per week accelerates recovery and reduces injury risk. At $89/session with our weekly discount, this is one of the most cost-effective performance investments an athlete can make." },
  { question: "Can stretching prevent running injuries?", answer: "Yes, research shows that athletes who maintain a consistent stretching practice have 54% fewer injuries than non-stretchers. For runners specifically, tight hip flexors, hamstrings, calves, and IT bands are the primary causes of common running injuries like runner&apos;s knee, shin splints, plantar fasciitis, and IT band syndrome. A combination of daily self-stretching plus weekly professional stretch service sessions addresses all of these risk factors." },
  { question: "What is PNF stretching and why is it best for athletes?", answer: "PNF stretching (Proprioceptive Neuromuscular Facilitation) uses contract-relax cycles to achieve 2-3x greater flexibility gains than static stretching alone. Your therapist stretches the muscle to its limit, you push against the therapist for 5-10 seconds (isometric contraction), then relax as the therapist deepens the stretch. This tricks your nervous system into allowing a greater range of motion. PNF stretching is the gold standard for athletic flexibility and requires a trained partner — which is why our PNF stretch service is so popular with NYC athletes." },
  { question: "What stretches should I do before running in Central Park?", answer: "Before a Central Park run, perform 8-10 minutes of dynamic stretching: forward and lateral leg swings (15 each leg), walking lunges with rotation (10 each side), high knees (20 each leg), butt kicks (20 each leg), hip circles (10 each direction), and arm circles (15 forward, 15 backward). Never do static stretching before running — save that for after. Our stretch service therapists can meet you at Central Park for a pre-run activation session or post-run recovery session." },
  { question: "How does stretching help with post-workout muscle soreness?", answer: "Post-workout stretching reduces delayed onset muscle soreness (DOMS) by increasing blood flow to worked muscles, flushing metabolic waste products (lactic acid, hydrogen ions), preventing muscle shortening that occurs after exercise, and activating the parasympathetic nervous system for faster recovery. A professional recovery stretch service session within 2 hours of intense exercise can reduce DOMS by 40-60% and cut recovery time nearly in half." },
  { question: "What stretches do NBA and NFL players use?", answer: "Professional athletes use a combination of dynamic stretching for warm-ups, PNF stretching for flexibility maintenance, myofascial release for tissue quality, and active stretching for functional mobility. Every professional sports team employs dedicated stretching specialists. Our stretch service therapists use the same evidence-based protocols — PNF, assisted stretching, and myofascial release — that professional athletes receive, delivered to any NYC location for $99/hr." },
  { question: "Is stretching necessary if I already do yoga?", answer: "Yoga provides excellent general flexibility, but it has limitations for athletes: (1) yoga stretches are self-directed, so you are limited by your own strength and range; (2) yoga does not include PNF stretching, which produces the greatest flexibility gains; (3) yoga classes follow a general sequence, not one targeted to your specific sport or tight areas; and (4) yoga instructors cannot provide the hands-on fascial release that addresses deep tissue restrictions. Professional stretch service complements yoga perfectly." },
  { question: "What stretches should cyclists do nationwide?", answer: "NYC cyclists need to focus on: hip flexor stretches (counteracts the bent-over position), hamstring stretches (tight from constant pedaling), piriformis and glute stretches (compressed from the saddle), thoracic extension (counteracts the rounded cycling posture), and neck and shoulder stretches (tension from looking up while riding). Brooklyn cyclists and those riding the Hudson River path should stretch before and after every ride. Our stretch service therapists understand cycling-specific demands." },
  { question: "How does stretching help with CrossFit recovery?", answer: "CrossFit athletes face unique recovery challenges due to the high-volume, high-intensity nature of the workouts. Stretching helps by: reducing muscle shortening after heavy lifting, restoring range of motion lost during metabolic conditioning, preventing the cumulative tightness that leads to CrossFit injuries, and promoting faster recovery between training sessions. A combination of foam rolling, static stretching, and weekly PNF stretch service sessions keeps CrossFit athletes performing at their best." },
  { question: "Can professional stretch service help with sports injuries?", answer: "Yes, professional stretch service is highly effective for both preventing and rehabilitating sports injuries. Our therapists use targeted stretching to address the muscle imbalances and fascial restrictions that cause common sports injuries like runner&apos;s knee, hamstring strains, shoulder impingement, and IT band syndrome. For post-injury rehabilitation, our assisted stretching safely restores range of motion while the therapist monitors and prevents overstretching of healing tissues." },
  { question: "What is the best stretching routine for basketball players nationwide?", answer: "Basketball players need: dynamic hip openers (lateral lunges, hip circles) for cutting and jumping, ankle mobility drills for landing mechanics, hamstring and quad stretches for explosive jumping, shoulder mobility for shooting and passing, and thoracic rotation for court awareness. Pre-game dynamic warm-up should take 10 minutes. Post-game static stretching should take 15 minutes. NYC basketball players at courts across the city can book pre-game and post-game stretch service sessions." },
  { question: "How much does athlete stretch service cost nationwide?", answer: "Professional stretch service for athletes at Stretch Service costs $99 per 60-minute session. Weekly athlete clients save 10% at $89 per session. Sessions include a sport-specific mobility assessment, targeted stretching using PNF, dynamic, and myofascial release techniques, and personalized recovery recommendations. Our therapists meet you at your gym, Central Park, Prospect Park, or any NYC location. Text or call (888) 734-7274 to book." },
  { question: "Should I stretch on rest days?", answer: "Absolutely — rest days are actually the best days for focused stretching. On training days, your muscles may be too fatigued or inflamed for deep stretching. Rest day stretching can include longer holds (45-60 seconds), deeper PNF work, and comprehensive full-body routines that address every muscle group. A professional stretch service session on your rest day is ideal because it maximizes recovery while building flexibility gains that transfer to your next training session." },
];

export default function StretchingForAthletesPage() {
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
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">Stretching 101 — Athletic Performance</p>
          <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl font-heading">
            STRETCHING FOR<br />
            <span className="gradient-text">ATHLETES NYC</span><br />
            PERFORMANCE &amp; RECOVERY
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">
            Pre-workout dynamic stretching, post-workout recovery protocols, and sport-specific routines for runners, cyclists, basketball players, and gym-goers nationwide. Used by the same techniques as professional sports teams. <strong className="text-white">$99/hr | 10% off weekly.</strong>
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
            <span className="text-slate-900 font-medium">Stretching for Athletes</span>
          </nav>
        </div>
      </div>

      {/* ═══ INTRO ═══ */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-3xl font-bold text-slate-900 font-heading">Why Every NYC Athlete Needs a Stretching Protocol</h2>
          <div className="mt-6 space-y-5 text-base leading-relaxed text-slate-700">
            <p>
              If you train seriously in New York City — whether you run Central Park, cycle the Hudson River path, play basketball at Rucker Park, lift at a Brooklyn gym, or train CrossFit in Queens — your body is under constant stress from both your training and the city itself. You are asking your muscles to perform at high levels while also walking 8,000+ steps on concrete daily, sitting at a desk, commuting on the subway, and sleeping in an NYC apartment. Without a systematic stretching protocol, this combination guarantees injury, chronic tightness, and declining performance.
            </p>
            <p>
              Professional athletes understand this implicitly. Every NBA, NFL, MLB, and Olympic team employs dedicated stretching specialists who work with athletes before and after every practice and game. These specialists use <Link href={getServiceUrl(services[1])} className="text-teal-600 underline hover:text-teal-700">PNF stretching</Link>, <Link href={getServiceUrl(services[0])} className="text-teal-600 underline hover:text-teal-700">assisted stretching</Link>, and <Link href={getServiceUrl(services[6])} className="text-teal-600 underline hover:text-teal-700">myofascial release</Link> — the exact same techniques our stretch service therapists bring to recreational athletes nationwide.
            </p>
            <p>
              The science is unambiguous: athletes who maintain a consistent stretching practice have 54% fewer injuries (British Journal of Sports Medicine, 2019), recover 40-60% faster from intense training (Journal of Strength and Conditioning Research, 2020), and demonstrate 5-10% greater power output and endurance when properly warmed up with dynamic stretching. These are not small advantages — they are the difference between hitting a PR and hitting a plateau, between finishing a season healthy and being sidelined by a preventable injury.
            </p>
          </div>
        </div>
      </section>

      {/* ═══ PRE-WORKOUT DYNAMIC STRETCHING ═══ */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-3xl font-bold text-slate-900 font-heading">Pre-Workout Dynamic Stretching Protocol (10 Minutes)</h2>
          <p className="mt-4 text-base text-slate-700">
            Dynamic stretching before exercise is non-negotiable for serious athletes. It raises core body temperature, increases blood flow to working muscles, activates the nervous system for explosive movements, and takes joints through their full range of motion. Research consistently shows 5-10% performance improvement with proper dynamic warm-up versus no warm-up. This protocol works for any sport or training session.
          </p>

          <div className="mt-8 space-y-6">
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-bold text-slate-900 font-heading">1. Forward Leg Swings</h3>
              <p className="text-sm text-teal-600 font-semibold">Target: Hamstrings, hip flexors, glutes | 15 swings each leg</p>
              <p className="mt-2 text-sm text-slate-700">Hold a wall or fence for balance. Swing one leg forward and backward like a pendulum, keeping the leg straight. Start with small swings and gradually increase the range with each rep. Keep your torso upright and core engaged. The swinging leg should reach approximately hip height at the front and extend behind you at the back.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-bold text-slate-900 font-heading">2. Lateral Leg Swings</h3>
              <p className="text-sm text-teal-600 font-semibold">Target: Adductors, abductors, hip joint | 15 swings each leg</p>
              <p className="mt-2 text-sm text-slate-700">Face a wall or fence. Swing one leg across the front of your body and then out to the side. Start small and increase range gradually. Keep your hips square to the wall — the movement should come entirely from the hip joint. This is essential for any sport involving lateral movement: basketball, tennis, soccer, or CrossFit.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-bold text-slate-900 font-heading">3. Walking Lunges with Rotation</h3>
              <p className="text-sm text-teal-600 font-semibold">Target: Hip flexors, glutes, thoracic spine, core | 10 each side</p>
              <p className="mt-2 text-sm text-slate-700">Step forward into a deep lunge. As you lower, rotate your torso toward the front leg, reaching both arms in the direction of rotation. Stand up, step forward with the other leg, and rotate to the other side. This is one of the most effective multi-joint dynamic stretches — it opens the hip flexors, activates the glutes, and mobilizes the thoracic spine simultaneously.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-bold text-slate-900 font-heading">4. High Knees</h3>
              <p className="text-sm text-teal-600 font-semibold">Target: Hip flexors, core, cardiovascular activation | 20 each leg</p>
              <p className="mt-2 text-sm text-slate-700">March or jog in place, driving each knee to hip height. Pump arms naturally with each step. Start at a walking pace and gradually increase to a light jog. Focus on knee height and core engagement rather than speed. This activates the hip flexors and core while raising heart rate in preparation for training.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-bold text-slate-900 font-heading">5. Butt Kicks</h3>
              <p className="text-sm text-teal-600 font-semibold">Target: Quadriceps, knee joint, hamstring activation | 20 each leg</p>
              <p className="mt-2 text-sm text-slate-700">Jog in place, kicking your heels up toward your glutes with each step. Keep your thighs perpendicular to the ground — the movement comes from bending the knee, not swinging the hip. Maintain a light, quick pace. This dynamically stretches the quadriceps while activating the hamstrings.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-bold text-slate-900 font-heading">6. Inchworms</h3>
              <p className="text-sm text-teal-600 font-semibold">Target: Hamstrings, calves, shoulders, core, full body | 5 reps</p>
              <p className="mt-2 text-sm text-slate-700">From standing, fold forward and place your hands on the floor (bend knees if needed). Walk your hands out to a plank position. Hold for 2 seconds. Walk your feet forward to your hands, keeping legs as straight as possible. Stand up. Repeat. This is a comprehensive full-body dynamic stretch that warms up the entire posterior chain and shoulders.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-bold text-slate-900 font-heading">7. Hip Circles</h3>
              <p className="text-sm text-teal-600 font-semibold">Target: Hip joint capsule, hip flexors, glutes, adductors | 10 each direction, each leg</p>
              <p className="mt-2 text-sm text-slate-700">Stand on one leg (hold something for balance). Lift the opposite knee to hip height and make large circles with the knee, rotating from the hip joint. 10 clockwise, 10 counterclockwise. Switch legs. These mobilize the hip joint capsule, which is critical for any sport involving running, jumping, or lateral movement.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-bold text-slate-900 font-heading">8. Arm Circles and Cross-Body Swings</h3>
              <p className="text-sm text-teal-600 font-semibold">Target: Shoulder joint, rotator cuff, chest, upper back | 15 each direction</p>
              <p className="mt-2 text-sm text-slate-700">Extend arms to the sides. Make progressively larger circles, starting with small movements and building to full range. 15 forward, 15 backward. Then alternate cross-body arm swings: swing both arms across your chest, then swing them out to the sides, opening the chest. 15 reps. Essential for any sport involving upper body movement.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-bold text-slate-900 font-heading">9. A-Skip Drill</h3>
              <p className="text-sm text-teal-600 font-semibold">Target: Hip flexors, calves, coordination, running mechanics | 15 yards x 2</p>
              <p className="mt-2 text-sm text-slate-700">Skip forward, driving one knee up to hip height with each skip while staying on the ball of the opposite foot. Pump your arms in opposition. This drill activates the hip flexors, improves running mechanics, and prepares the nervous system for explosive ground contact. Essential pre-run warm-up for Central Park and <Link href="/parks/prospect-park" className="text-teal-600 underline">Prospect Park</Link> runners.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-bold text-slate-900 font-heading">10. Lateral Shuffles</h3>
              <p className="text-sm text-teal-600 font-semibold">Target: Adductors, abductors, ankles, lateral stability | 15 yards each direction x 2</p>
              <p className="mt-2 text-sm text-slate-700">Assume an athletic stance (slight squat, weight on balls of feet). Shuffle laterally for 15 yards, then shuffle back. Stay low and keep your feet from crossing. This activates the lateral stabilizers and prepares the body for direction changes — crucial for basketball, tennis, and any sport requiring lateral movement.</p>
            </div>
          </div>

          <p className="mt-6 text-sm text-slate-600">For guided pre-workout activation, book a <Link href={getServiceUrl(services[3])} className="text-teal-600 underline hover:text-teal-700">dynamic stretch service</Link> session. Our therapists meet you at <Link href="/parks/central-park" className="text-teal-600 underline">Central Park</Link>, <Link href="/parks/prospect-park" className="text-teal-600 underline">Prospect Park</Link>, your gym, or any NYC location.</p>
        </div>
      </section>

      {/* ═══ POST-WORKOUT STATIC STRETCHING ═══ */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-3xl font-bold text-slate-900 font-heading">Post-Workout Static Stretching Protocol (15 Minutes)</h2>
          <p className="mt-4 text-base text-slate-700">
            Perform within 30 minutes of completing exercise while muscles are warm and pliable. Hold each stretch for 30-45 seconds minimum. Breathe deeply and allow the muscle to gradually release into the stretch. Never bounce.
          </p>

          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="font-bold text-slate-900 font-heading">Standing Hamstring Stretch</h3>
              <p className="mt-2 text-sm text-slate-700">Place heel on a bench, step, or park railing. Keep the leg straight and hinge forward at the hips. Do not round your back — maintain a long spine. Hold 45 seconds each side. The hamstrings are under enormous load during running, cycling, and lifting.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="font-bold text-slate-900 font-heading">Kneeling Hip Flexor Lunge</h3>
              <p className="mt-2 text-sm text-slate-700">Back knee on the ground, front foot flat. Tuck your pelvis and press your hips forward until you feel a deep stretch in the front of the back hip. Hold 45 seconds each side. Add an overhead reach on the same side as the back knee for deeper stretch through the entire anterior chain.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="font-bold text-slate-900 font-heading">Pigeon Pose</h3>
              <p className="mt-2 text-sm text-slate-700">From plank, bring your right knee behind your right wrist. Extend your left leg straight behind you. Square your hips and slowly fold your torso forward over the front shin. Hold 60 seconds each side. This is the deepest piriformis and glute stretch available — essential for runners, cyclists, and anyone who sits.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="font-bold text-slate-900 font-heading">Standing Quad Stretch</h3>
              <p className="mt-2 text-sm text-slate-700">Pull your heel toward your glute, pressing your hips slightly forward. Keep knees together. Hold a wall, tree, or partner for balance. Hold 30 seconds each side. Tight quads pull on the kneecap and contribute to runner&apos;s knee and patellar tendinitis.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="font-bold text-slate-900 font-heading">Wall Calf Stretch</h3>
              <p className="mt-2 text-sm text-slate-700">Hands on wall, step one foot back. Keep back heel down. Lean in for straight-leg version (gastrocnemius, 30 seconds), then bend the back knee slightly for soleus version (30 seconds). Each side. Tight calves contribute to Achilles tendinitis, plantar fasciitis, and knee pain.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="font-bold text-slate-900 font-heading">Cross-Body Shoulder Stretch</h3>
              <p className="mt-2 text-sm text-slate-700">Bring one arm across your chest. Use the opposite hand to pull it closer, stretching the posterior deltoid and rotator cuff. Keep the shoulder down — do not shrug. Hold 30 seconds each side. Essential after any upper body training or sport involving throwing, swimming, or overhead movements.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="font-bold text-slate-900 font-heading">Doorway Chest Stretch</h3>
              <p className="mt-2 text-sm text-slate-700">Forearms on a doorframe (or between two posts at a park), lean through to open the chest. Hold 30 seconds. Tight pecs from bench pressing, push-ups, and cycling pull the shoulders forward and restrict thoracic mobility, reducing power output and increasing shoulder injury risk.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="font-bold text-slate-900 font-heading">Supine Spinal Twist</h3>
              <p className="mt-2 text-sm text-slate-700">Lie on your back, pull one knee across your body while keeping the opposite shoulder on the ground. Arms in a T position. Hold 30 seconds each side. This decompresses the spine, stretches the obliques, and provides a gentle traction effect that feels incredible after heavy training.</p>
            </div>
          </div>

          <p className="mt-6 text-sm text-slate-600">For maximum post-workout recovery, book a <Link href={getServiceUrl(services[8])} className="text-teal-600 underline hover:text-teal-700">recovery stretch service</Link> session. Our therapists reduce DOMS by 40-60% and cut recovery time nearly in half using professional techniques.</p>
        </div>
      </section>

      {/* ═══ SPORT-SPECIFIC STRETCHING ═══ */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-3xl font-bold text-slate-900 font-heading">Sport-Specific Stretching for NYC Athletes</h2>
          <p className="mt-4 text-base text-slate-700">
            Every sport creates unique demands on the body. The muscles that are tight in a runner are different from those in a cyclist, basketball player, or swimmer. Here are sport-specific stretching protocols for the most popular athletic activities in New York City.
          </p>

          <div className="mt-8 space-y-8">
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="text-xl font-bold text-slate-900 font-heading">Running (Central Park, Prospect Park, Brooklyn Bridge, Hudson River Path)</h3>
              <p className="mt-2 text-sm text-teal-600 font-semibold">Focus areas: Hamstrings, hip flexors, calves, IT band, piriformis, quadriceps</p>
              <div className="mt-3 text-sm text-slate-700 space-y-2">
                <p><strong>Pre-run (8 min):</strong> Forward leg swings, lateral leg swings, walking lunges, high knees, butt kicks, A-skips. Focus on hip mobility and calf activation.</p>
                <p><strong>Post-run (12 min):</strong> Standing hamstring stretch (45s each side), kneeling hip flexor (45s each), standing quad (30s each), wall calf stretch both versions (30s each), pigeon pose (60s each), IT band stretch (30s each).</p>
                <p><strong>Weekly:</strong> One professional <Link href={getServiceUrl(services[1])} className="text-teal-600 underline">PNF stretch service</Link> session focusing on hamstrings, hip flexors, and calves. PNF produces 2-3x greater flexibility gains in these running-critical muscles.</p>
                <p><strong>NYC tip:</strong> NYC concrete is significantly harder on your joints than trail surfaces. <Link href="/parks/central-park" className="text-teal-600 underline">Central Park</Link> runners and <Link href="/parks/prospect-park" className="text-teal-600 underline">Prospect Park</Link> runners should prioritize calf and Achilles stretching to prevent plantar fasciitis and Achilles tendinitis from the hard surfaces.</p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="text-xl font-bold text-slate-900 font-heading">Cycling (Brooklyn, Hudson River Greenway, Prospect Park Loop)</h3>
              <p className="mt-2 text-sm text-teal-600 font-semibold">Focus areas: Hip flexors, hamstrings, quads, piriformis, thoracic spine, neck, forearms</p>
              <div className="mt-3 text-sm text-slate-700 space-y-2">
                <p><strong>Pre-ride (5 min):</strong> Hip circles, leg swings, walking lunges, torso rotations, arm circles. The cycling position is extremely hip-flexor-dominant — open the hips before you lock them into the pedal stroke.</p>
                <p><strong>Post-ride (12 min):</strong> Deep hip flexor lunge (45s each), standing quad stretch (30s each), pigeon pose (60s each), doorway chest stretch (30s), thoracic extension over foam roller (5 extensions at 3 positions), neck tilts (30s each side).</p>
                <p><strong>Weekly:</strong> One stretch service session focusing on hip flexors, thoracic extension, and chest opening. The cycling posture creates extreme hip flexor shortening and thoracic kyphosis that require professional intervention to reverse fully.</p>
                <p><strong>NYC tip:</strong> Brooklyn cyclists dodging traffic tend to carry extra tension in the neck, shoulders, and forearms from gripping the handlebars and hypervigilant head positioning. Include neck and forearm stretches in every post-ride routine.</p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="text-xl font-bold text-slate-900 font-heading">Basketball (NYC Courts, Rec Centers, Gyms)</h3>
              <p className="mt-2 text-sm text-teal-600 font-semibold">Focus areas: Ankles, hip flexors, hamstrings, quads, calves, shoulders, thoracic spine</p>
              <div className="mt-3 text-sm text-slate-700 space-y-2">
                <p><strong>Pre-game (10 min):</strong> Ankle circles, lateral shuffles, high knees, butt kicks, lateral leg swings, walking lunges with rotation, arm circles, hip circles. Basketball demands explosive lateral movement, jumping, and rapid direction changes — all joints must be fully warmed up.</p>
                <p><strong>Post-game (12 min):</strong> Standing hamstring (45s each), kneeling hip flexor (45s each), quad stretch (30s each), calf stretch both versions (30s each), pigeon pose (60s each), ankle self-mobilization (30s each).</p>
                <p><strong>Weekly:</strong> One stretch service session focusing on ankle mobility, hip mobility, and posterior chain flexibility. Basketball players with restricted ankle dorsiflexion have 5x higher knee injury risk.</p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="text-xl font-bold text-slate-900 font-heading">Tennis (USTA Billie Jean King Center, NYC Courts)</h3>
              <p className="mt-2 text-sm text-teal-600 font-semibold">Focus areas: Shoulder rotators, thoracic spine, hip flexors, hamstrings, calves, forearms, wrists</p>
              <div className="mt-3 text-sm text-slate-700 space-y-2">
                <p><strong>Pre-match (10 min):</strong> Arm circles, shoulder internal/external rotation, torso rotations, lateral shuffles, walking lunges, hip circles, wrist circles. Tennis demands extreme shoulder range of motion for serving and overhead shots — the shoulder must be fully warmed up.</p>
                <p><strong>Post-match (12 min):</strong> Cross-body shoulder stretch (30s each), sleeper stretch for internal rotation (30s each), doorway chest stretch (30s), thoracic rotation (30s each), hamstring stretch (45s each), wrist flexor and extensor stretches (30s each).</p>
                <p><strong>Weekly:</strong> One stretch service session focusing on shoulder mobility, thoracic rotation, and forearm release. Tennis elbow and shoulder impingement are directly caused by inadequate flexibility in these areas.</p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="text-xl font-bold text-slate-900 font-heading">Swimming (NYC Pools, Baruch, Asphalt Green, Tony Dapolito)</h3>
              <p className="text-sm text-teal-600 font-semibold mt-2">Focus areas: Shoulders, lats, chest, thoracic spine, ankle plantarflexion, hip flexors</p>
              <div className="mt-3 text-sm text-slate-700 space-y-2">
                <p><strong>Pre-swim (8 min):</strong> Arm circles (both directions), cross-body arm swings, shoulder internal/external rotation, ankle plantarflexion mobilization, torso rotations, streamline position overhead reach.</p>
                <p><strong>Post-swim (12 min):</strong> Doorway chest stretch at three angles (30s each), cross-body shoulder stretch (30s each), lat stretch (side bend with overhead reach, 30s each), kneeling hip flexor (30s each), ankle dorsiflexion stretch (30s each), child&apos;s pose (60s).</p>
                <p><strong>Weekly:</strong> One stretch service session focusing on shoulder range of motion and thoracic extension. Swimmer&apos;s shoulder is the most common swimming injury and is directly prevented by maintaining full shoulder mobility.</p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="text-xl font-bold text-slate-900 font-heading">CrossFit (NYC Boxes: CrossFit NYC, Brick, Solace, ICE)</h3>
              <p className="text-sm text-teal-600 font-semibold mt-2">Focus areas: Full body — shoulders, thoracic spine, hips, ankles, wrists, hamstrings, quads</p>
              <div className="mt-3 text-sm text-slate-700 space-y-2">
                <p><strong>Pre-WOD (10 min):</strong> The CrossFit warm-up should match the movements in the workout. For squat days: ankle mobilization, hip circles, deep squat holds. For overhead days: shoulder dislocates with PVC pipe, thoracic extension, wall slides. For running WODs: standard dynamic running protocol.</p>
                <p><strong>Post-WOD (15 min):</strong> Full-body static stretching protocol covering every major muscle group. CrossFit workouts use the entire body, so the cool-down must be comprehensive. Prioritize the muscles that were most loaded in the session.</p>
                <p><strong>Weekly:</strong> 1-2 stretch service sessions. CrossFit athletes face the highest injury rates in recreational fitness (8-16% annually). Professional stretch service dramatically reduces this risk by maintaining the flexibility required for heavy overhead lifts, deep squats, and Olympic movements. <Link href={getServiceUrl(services[1])} className="text-teal-600 underline">PNF stretching</Link> is particularly valuable for CrossFit athletes hitting flexibility plateaus.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ PNF FOR ATHLETES ═══ */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-3xl font-bold text-slate-900 font-heading">PNF Stretching for Athletes: The Performance Multiplier</h2>
          <div className="mt-6 space-y-5 text-base leading-relaxed text-slate-700">
            <p>
              <Link href={getServiceUrl(services[1])} className="text-teal-600 underline hover:text-teal-700">PNF stretching</Link> (Proprioceptive Neuromuscular Facilitation) is the single most effective stretching technique available to athletes, producing 2-3x greater flexibility gains than static stretching alone. It is the technique used by professional sports teams, Olympic athletes, and elite performers worldwide — and it is the cornerstone of our athletic stretch service sessions.
            </p>
            <p>
              PNF works by exploiting your nervous system&apos;s protective reflexes. Here is the process: Your therapist stretches a muscle to its end range. You then push against the therapist for 5-10 seconds (isometric contraction at the stretched position). This contraction activates the Golgi tendon organs, which signal the nervous system to relax the muscle. As you relax, the therapist deepens the stretch into the newly available range. This cycle is repeated 3-4 times per muscle group, producing dramatic improvements in a single session.
            </p>
            <p>
              PNF stretching requires a trained partner — you cannot perform it effectively alone. This is one of the primary reasons why professional stretch service sessions produce dramatically better results for athletes than self-stretching. A single PNF stretch service session often produces flexibility gains that would take 2-3 weeks of daily static stretching to achieve.
            </p>
          </div>
          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-6 text-center">
              <p className="text-3xl font-bold text-teal-600 font-heading">2-3x</p>
              <p className="mt-2 text-sm text-slate-700">Greater flexibility gains vs. static stretching</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6 text-center">
              <p className="text-3xl font-bold text-teal-600 font-heading">54%</p>
              <p className="mt-2 text-sm text-slate-700">Reduction in athletic injury risk</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6 text-center">
              <p className="text-3xl font-bold text-teal-600 font-heading">40-60%</p>
              <p className="mt-2 text-sm text-slate-700">Faster recovery with post-workout stretching</p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ RECOVERY PROTOCOLS ═══ */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-3xl font-bold text-slate-900 font-heading">Recovery Stretching Protocols for NYC Athletes</h2>
          <div className="mt-6 space-y-5 text-base leading-relaxed text-slate-700">
            <p>
              Recovery is where gains are made. Your body does not get stronger, faster, or more flexible during training — it gets stronger during recovery. Stretching is one of the most effective recovery tools available because it increases blood flow to worked muscles (delivering oxygen and nutrients), flushes metabolic waste products (reducing soreness), prevents muscle shortening (maintaining range of motion), and activates the parasympathetic nervous system (switching your body from stress mode to recovery mode).
            </p>
            <p>
              For NYC athletes, recovery stretching is especially important because your body never fully rests. Even on rest days, you are walking 8,000+ steps on concrete, sitting at desks, and commuting on the subway. Your muscles are constantly being stressed by city living on top of your training stress. A professional <Link href={getServiceUrl(services[8])} className="text-teal-600 underline hover:text-teal-700">recovery stretch service</Link> session on rest days or after intense training sessions dramatically accelerates your recovery and prevents the cumulative tightness that leads to injury.
            </p>
          </div>
          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-bold text-slate-900 font-heading">Post-Run Recovery (Central Park, Prospect Park)</h3>
              <ul className="mt-3 space-y-2 text-sm text-slate-700">
                <li>&#8226; 5-minute walk to cool down heart rate</li>
                <li>&#8226; Standing hamstring stretch — 45 seconds each side</li>
                <li>&#8226; Kneeling hip flexor — 45 seconds each side</li>
                <li>&#8226; Standing quad stretch — 30 seconds each side</li>
                <li>&#8226; Wall calf stretch (both versions) — 30 seconds each</li>
                <li>&#8226; Pigeon pose — 60 seconds each side</li>
                <li>&#8226; IT band cross-leg stretch — 30 seconds each side</li>
                <li>&#8226; Our therapists meet you at the park for post-run <Link href={getServiceUrl(services[8])} className="text-teal-600 underline">recovery stretch service</Link></li>
              </ul>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-bold text-slate-900 font-heading">Post-Gym Recovery</h3>
              <ul className="mt-3 space-y-2 text-sm text-slate-700">
                <li>&#8226; Stretch the muscle groups you trained that day</li>
                <li>&#8226; Upper body day: chest stretch, lat stretch, tricep stretch, shoulder stretch</li>
                <li>&#8226; Lower body day: hamstring, quad, hip flexor, glute, calf</li>
                <li>&#8226; Full body day: comprehensive 15-minute full-body protocol</li>
                <li>&#8226; Hold each stretch 30-45 seconds, breathe deeply</li>
                <li>&#8226; Foam roll major muscle groups before stretching</li>
                <li>&#8226; For maximum recovery, book a stretch service session within 2 hours of training</li>
              </ul>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-bold text-slate-900 font-heading">Race/Event Recovery</h3>
              <ul className="mt-3 space-y-2 text-sm text-slate-700">
                <li>&#8226; Walk for 10-15 minutes immediately after the event</li>
                <li>&#8226; Gentle (not deep) static stretching within 1 hour: 20 seconds per position</li>
                <li>&#8226; Professional recovery stretch service session within 24 hours</li>
                <li>&#8226; Light self-stretching for 2-3 days post-event</li>
                <li>&#8226; Full-depth stretching resumes 48-72 hours post-event</li>
                <li>&#8226; NYC Marathon runners: book a post-race stretch service session in advance</li>
              </ul>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-bold text-slate-900 font-heading">Rest Day Recovery</h3>
              <ul className="mt-3 space-y-2 text-sm text-slate-700">
                <li>&#8226; 20-minute full-body stretching routine</li>
                <li>&#8226; Longer holds: 45-60 seconds per stretch</li>
                <li>&#8226; Include foam rolling: 2 minutes per major muscle group</li>
                <li>&#8226; Focus on your tightest areas and known problem spots</li>
                <li>&#8226; Ideal day for a professional stretch service session</li>
                <li>&#8226; PNF stretching on rest days produces the best flexibility gains</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FAQ ═══ */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-3xl font-bold text-slate-900 font-heading text-center">Athlete Stretching — Frequently Asked Questions</h2>
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
            Train Like a Pro — Book Athlete Stretch Service Today
          </h2>
          <p className="mt-4 text-lg text-teal-100">
            Professional athletes never skip stretching. Our certified therapists bring the same PNF stretching, myofascial release, and recovery protocols used by pro sports teams directly to your NYC location. <strong className="text-white">$99/hr | 10% off weekly at $89/session.</strong>
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
          <p className="mt-4 text-sm text-teal-200">Central Park | Prospect Park | Your Gym | Any NYC Location | 7AM-10PM Daily</p>
        </div>
      </section>
    </>
  );
}
