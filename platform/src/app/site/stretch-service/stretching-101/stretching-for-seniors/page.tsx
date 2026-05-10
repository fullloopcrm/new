// @ts-nocheck
import Link from "next/link";
import type { Metadata } from "next";
import { services, getServiceUrl, SITE_URL, SITE_SMS_LINK, SITE_PHONE, SITE_PHONE_LINK } from "@/app/site/stretch-service/_lib/siteData";
import { JsonLd, webPageSchema, breadcrumbSchema, faqSchema } from "@/app/site/stretch-service/_lib/schema";
import Logo from "@/app/site/stretch-service/_components/Logo";

const PAGE_URL = `${SITE_URL}/stretching-101/stretching-for-seniors`;
const PAGE_TITLE = "Stretching for Seniors NYC | Safe Mobility & Fall Prevention | Stretch Service";
const PAGE_DESC = "Safe stretching routines for seniors 60+: chair stretches, standing exercises, fall prevention, arthritis-friendly techniques. Professional gentle stretch service nationwide — $99/hr.";

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESC,
  alternates: { canonical: PAGE_URL },
};

const breadcrumbs = [
  { name: "Home", url: SITE_URL },
  { name: "Stretching 101", url: `${SITE_URL}/stretching-101` },
  { name: "Stretching for Seniors", url: PAGE_URL },
];

const faqs = [
  { question: "Is stretching safe for seniors over 65?", answer: "Yes, stretching is not only safe for seniors over 65 — it is one of the most important health practices for older adults. Gentle, appropriate stretching improves joint mobility, reduces fall risk by up to 36%, manages arthritis symptoms, improves circulation, and helps maintain the independence needed for daily living. The key is using age-appropriate techniques: slow controlled movements, chair-assisted positions when needed, and never pushing through sharp pain. Our gentle stretch service program is specifically designed for adults 60+ with extra safety precautions." },
  { question: "How often should seniors stretch?", answer: "Seniors should stretch daily for 15-20 minutes, ideally in the morning to counteract overnight stiffness and again in the evening before bed. The American College of Sports Medicine recommends stretching at least 2-3 times per week for older adults, but daily practice produces significantly better results for fall prevention and mobility maintenance. Adding a weekly professional gentle stretch service session at $99/hr ($89/hr weekly) provides deeper flexibility work that self-stretching cannot achieve." },
  { question: "What are the best chair stretches for seniors?", answer: "The best chair stretches for seniors include: seated neck turns (20 seconds each side), seated shoulder rolls (10 each direction), seated chest opener (30 seconds), seated spinal twist (30 seconds each side), seated hamstring stretch (30 seconds each side), seated figure-four hip stretch (30 seconds each side), seated ankle circles (10 each direction), and seated marching (20 steps). All of these stretches are detailed with full instructions on this page and can be performed in any sturdy chair." },
  { question: "Can stretching help prevent falls in older adults?", answer: "Absolutely. Falls are the leading cause of injury-related death in adults over 65, and research shows that regular stretching reduces fall risk by up to 36%. Stretching prevents falls by improving ankle mobility (allowing faster balance reactions), maintaining hip and knee range of motion (enabling confident walking), improving proprioception (body awareness in space), and building confidence in movement. Our gentle stretch service program includes specific fall prevention exercises in every session." },
  { question: "Is stretching good for arthritis?", answer: "Yes, gentle stretching is one of the most effective non-medication treatments for arthritis. Regular stretching maintains joint range of motion that arthritis tries to steal, reduces joint stiffness (especially morning stiffness), improves circulation to joint tissues, decreases pain through the gate control mechanism, and strengthens the muscles that support arthritic joints. Our stretch service therapists use arthritis-friendly techniques with extra-gentle movements and careful attention to joint inflammation levels." },
  { question: "What stretches should seniors avoid?", answer: "Seniors should avoid: (1) full neck circles (can compress cervical arteries); (2) unsupported deep forward folds (fall risk and excessive spinal flexion); (3) bouncing or ballistic stretching; (4) any stretch that causes sharp pain; (5) deep twists if you have spinal stenosis or disc issues (without medical clearance); and (6) standing on one leg without support nearby. Our professional gentle stretch service therapists know exactly which stretches are safe for each individual&apos;s condition." },
  { question: "How does aging affect flexibility?", answer: "Aging affects flexibility through several mechanisms: collagen fibers in connective tissue become stiffer and less elastic, joints produce less synovial fluid (natural lubricant), muscle mass decreases (sarcopenia), fascia becomes dehydrated and less pliable, and reduced activity levels cause muscles to shorten. However, research consistently shows that regular stretching can significantly slow and even partially reverse these changes at any age. Seniors who stretch regularly maintain 80-90% of their mid-life flexibility." },
  { question: "What is the best time of day for seniors to stretch?", answer: "Morning is the most important time for seniors to stretch because overnight immobility causes significant joint stiffness and muscle tightness. A 15-minute morning routine before any other activity reduces stiffness, improves balance for the day ahead, and reduces fall risk during morning activities (when falls are most common). An evening routine before bed promotes better sleep and reduces nighttime muscle cramps. Our stretch service sessions can be booked at any time from 7AM-10PM." },
  { question: "Can stretching help with balance problems?", answer: "Yes, stretching directly improves balance through multiple mechanisms: (1) improved ankle mobility allows faster and more effective balance corrections; (2) flexible hip muscles enable a wider base of support; (3) stretching improves proprioception — the body&apos;s sense of its position in space; (4) gentle balance challenges during stretching (like standing on one leg while holding support) build neuromuscular control. Our gentle stretch service program incorporates balance training into every session." },
  { question: "How does professional stretch service differ for seniors vs. younger adults?", answer: "Our gentle stretch service for seniors differs in several important ways: (1) slower pace — every movement is performed at half the speed; (2) longer warm-up period before deeper stretches; (3) chair-assisted options for every exercise; (4) extra attention to joint health and avoiding compression; (5) focus on functional movements that support daily living (reaching, bending, standing); (6) arthritis-friendly modifications; (7) fall prevention exercises built into every session; (8) therapists trained specifically in senior care. Sessions are $99/hr or $89/hr weekly." },
  { question: "Can seniors stretch with a hip or knee replacement?", answer: "Yes, but with specific precautions. After a hip replacement, avoid deep flexion (pulling the knee too close to the chest), internal rotation, and crossing the legs — especially in the first 6-12 months. After knee replacement, focus on regaining full extension and functional flexion. Our stretch service therapists are trained in post-surgical protocols and will design a session around your specific surgical restrictions and recovery timeline. Always get clearance from your surgeon first." },
  { question: "What stretches help with morning stiffness?", answer: "The best stretches for morning stiffness (in bed before standing): full-body reach (arms overhead, toes pointed), knee-to-chest pulls (30 seconds each side, then both), gentle supine twist (20 seconds each side). After standing: seated neck turns, shoulder rolls, standing side bends with support, seated hamstring stretch, ankle circles. This 10-minute routine addresses the overnight stiffness that makes mornings difficult for many seniors. It is detailed in full on this page." },
  { question: "Is it too late to start stretching at 70 or 80?", answer: "It is never too late to start stretching. Research shows that even adults in their 80s and 90s can improve flexibility, balance, and mobility with consistent gentle stretching. A 2020 study in the Journal of Aging and Physical Activity found measurable flexibility improvements in adults aged 65-85 after just 4 weeks of regular stretching. Start gently, progress slowly, and consider professional gentle stretch service to ensure safe, effective technique from the beginning." },
  { question: "How much does gentle stretch service for seniors cost?", answer: "Our gentle stretch service for seniors costs $99 per 60-minute session. Weekly clients save 10% at $89 per session. Every session includes a gentle mobility assessment, chair-assisted and standing stretches appropriate for your fitness level, balance exercises, arthritis-friendly techniques, and personalized take-home recommendations. Our therapists come to your NYC home with all equipment — no need to travel. Text or call (888) 734-7274 to book." },
  { question: "Can stretching help with neuropathy in the feet?", answer: "While stretching cannot reverse nerve damage from neuropathy, it can significantly improve the functional impacts: maintaining ankle and foot flexibility preserves walking ability, gentle calf and foot stretches improve circulation to the affected area, and balance exercises compensate for reduced sensation by strengthening proprioceptive pathways in the hips and knees. Our stretch service therapists work safely with clients who have neuropathy, using extra care around areas with reduced sensation." },
  { question: "What NYC resources are available for senior stretching programs?", answer: "NYC offers several resources for seniors seeking stretching and mobility programs: NYC Department for the Aging senior centers offer group exercise classes, many NYC parks have senior fitness areas, YMCA and JCC locations offer senior-specific group classes, and hospital-based wellness programs at NYU Langone, Mount Sinai, and others. For personalized one-on-one attention, our mobile gentle stretch service comes directly to your home anywhere in the five boroughs at $99/hr." },
];

export default function StretchingForSeniorsPage() {
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
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">Stretching 101 — Senior Mobility</p>
          <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl font-heading">
            STRETCHING FOR<br />
            <span className="gradient-text">SENIORS NYC</span><br />
            SAFE MOBILITY &amp; FALL PREVENTION
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">
            Complete stretching guide for adults 60+: chair stretching routines, standing exercises with support, balance exercises, fall prevention, and arthritis-friendly techniques. Professional gentle stretch service across all 50 states. <strong className="text-white">$99/hr | 10% off weekly.</strong>
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
            <span className="text-slate-900 font-medium">Stretching for Seniors</span>
          </nav>
        </div>
      </div>

      {/* ═══ WHY STRETCHING MATTERS MORE AFTER 60 ═══ */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-3xl font-bold text-slate-900 font-heading">Why Stretching Matters More After 60</h2>
          <div className="mt-6 space-y-5 text-base leading-relaxed text-slate-700">
            <p>
              After age 60, your body undergoes changes that make stretching not just beneficial but essential for quality of life. Collagen fibers in your connective tissue become stiffer and less elastic. Joint cartilage thins, and synovial fluid (your body&apos;s natural joint lubricant) decreases. Muscles lose mass through a process called sarcopenia — approximately 3-8% per decade after 30, accelerating after 60. Fascia becomes dehydrated and adhesions form more easily. Without intervention, these changes lead to progressively restricted movement, increased pain, higher fall risk, and loss of independence.
            </p>
            <p>
              The good news is overwhelming: regular stretching can significantly slow, halt, and even partially reverse these changes at any age. A landmark 2020 study in the Journal of Aging and Physical Activity found that seniors who stretched 3+ times per week had 36% fewer falls than non-stretchers. Another study found measurable flexibility improvements in adults aged 65-85 after just 4 weeks of consistent stretching. And a 2019 meta-analysis showed that stretching programs reduce chronic pain in older adults by 30-45%.
            </p>
            <p>
              For NYC seniors specifically, stretching addresses unique challenges: navigating stairs in walk-up apartments, maintaining balance on uneven sidewalks, stepping on and off subway platforms, carrying groceries up flights of stairs, and reaching items on high shelves. Every one of these daily activities requires adequate flexibility, balance, and range of motion — all of which stretching maintains and improves. Our <Link href={getServiceUrl(services[9])} className="text-teal-600 underline hover:text-teal-700">gentle stretch service</Link> is specifically designed for adults 60+ and addresses every one of these functional movement needs.
            </p>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
              <p className="text-2xl font-bold text-teal-600 font-heading">36%</p>
              <p className="mt-1 text-xs text-slate-600">Fewer falls with regular stretching</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
              <p className="text-2xl font-bold text-teal-600 font-heading">4 wks</p>
              <p className="mt-1 text-xs text-slate-600">To measurable flexibility gains</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
              <p className="text-2xl font-bold text-teal-600 font-heading">30-45%</p>
              <p className="mt-1 text-xs text-slate-600">Chronic pain reduction</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
              <p className="text-2xl font-bold text-teal-600 font-heading">15 min</p>
              <p className="mt-1 text-xs text-slate-600">Daily for meaningful results</p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ CHAIR STRETCHING ROUTINE ═══ */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-3xl font-bold text-slate-900 font-heading">Chair Stretching Routine (10 Stretches — 15 Minutes)</h2>
          <p className="mt-4 text-base text-slate-700">
            This complete seated routine can be performed in any sturdy, armless chair (a dining chair works perfectly). It is safe for people with balance concerns, limited mobility, joint replacements, and arthritis. Move slowly, breathe deeply, and never push through sharp pain.
          </p>

          <div className="mt-8 space-y-6">
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-bold text-slate-900 font-heading">1. Seated Neck Turns</h3>
              <p className="text-sm text-teal-600 font-semibold">Target: Cervical spine rotators, upper trapezius, sternocleidomastoid</p>
              <div className="mt-3 text-sm text-slate-700 space-y-2">
                <p><strong>How to do it:</strong> Sit tall in your chair with feet flat on the floor and hands resting on your thighs. Slowly turn your head to look over your right shoulder as far as comfortable. Hold for 20 seconds. Return to center. Turn to look over your left shoulder and hold for 20 seconds. Then tilt your right ear toward your right shoulder (without lifting the shoulder) and hold 20 seconds. Repeat to the left.</p>
                <p><strong>Hold time:</strong> 20 seconds each position (turns and tilts — about 80 seconds total)</p>
                <p><strong>Safety:</strong> Never roll the head backward or in full circles. Move slowly and stop immediately if you feel dizziness. These movements support the ability to check for traffic when crossing NYC streets — a critical safety function.</p>
                <p><strong>Arthritis modification:</strong> If neck arthritis limits range, go only to the point of mild tension, never pain. Reduce hold time to 10-15 seconds.</p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-bold text-slate-900 font-heading">2. Seated Shoulder Rolls and Shrugs</h3>
              <p className="text-sm text-teal-600 font-semibold">Target: Shoulder joint, trapezius, rhomboids, levator scapulae</p>
              <div className="mt-3 text-sm text-slate-700 space-y-2">
                <p><strong>How to do it:</strong> Sit tall. Lift both shoulders up toward your ears as high as comfortable (shrug). Hold for 3 seconds. Roll them backward and down, squeezing your shoulder blades together. Hold the squeezed position for 3 seconds. Relax. Repeat 10 times. Then reverse: roll shoulders forward and up 10 times.</p>
                <p><strong>Reps:</strong> 10 backward rolls, 10 forward rolls, 5 shrug-and-hold</p>
                <p><strong>Why it helps:</strong> Shoulder mobility is essential for reaching overhead (cabinets, closets), putting on coats, and personal care. This stretch maintains full shoulder range of motion and relieves the tension that accumulates in the upper trapezius throughout the day.</p>
                <p><strong>Arthritis modification:</strong> Reduce the circle size if shoulder arthritis causes discomfort. Focus on the squeeze-and-release component.</p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-bold text-slate-900 font-heading">3. Seated Chest Opener</h3>
              <p className="text-sm text-teal-600 font-semibold">Target: Pectoralis major and minor, anterior deltoids, respiratory muscles</p>
              <div className="mt-3 text-sm text-slate-700 space-y-2">
                <p><strong>How to do it:</strong> Sit near the front edge of the chair. Reach both hands behind you and grasp the chair back (or seat edges). Gently squeeze your shoulder blades together, lift your chest, and open your shoulders wide. Take 3-4 deep breaths in this position, feeling your chest expand fully with each inhale.</p>
                <p><strong>Hold time:</strong> 30 seconds, 2 repetitions</p>
                <p><strong>Why it helps:</strong> Age-related postural changes tend to round the upper back (kyphosis), which compresses the chest cavity and reduces lung capacity. This stretch counteracts that rounding, improves breathing capacity, and helps maintain an upright posture. Better breathing means more energy and better sleep.</p>
                <p><strong>Modification:</strong> If you cannot reach behind, simply place hands on the chair seat beside your hips, press down, and lift the chest while squeezing shoulder blades together.</p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-bold text-slate-900 font-heading">4. Seated Spinal Twist</h3>
              <p className="text-sm text-teal-600 font-semibold">Target: Thoracic and lumbar spine, obliques, intercostals</p>
              <div className="mt-3 text-sm text-slate-700 space-y-2">
                <p><strong>How to do it:</strong> Sit tall with feet flat on the floor. Place your right hand on the outside of your left knee and your left hand on the chair back behind you. Gently rotate your torso to the left, looking over your left shoulder. Keep your hips facing forward. Hold, breathe deeply, and let each exhale take you slightly deeper. Return to center and switch sides.</p>
                <p><strong>Hold time:</strong> 30 seconds each side, 2 repetitions</p>
                <p><strong>Why it helps:</strong> Spinal rotation is one of the first movements lost with aging, yet it is essential for tasks like backing up a car, reaching for objects, and turning to speak with someone. This stretch maintains rotational mobility throughout the thoracic and lumbar spine.</p>
                <p><strong>Safety:</strong> If you have spinal stenosis or disc issues, reduce the rotation range to a comfortable level and consult your physician.</p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-bold text-slate-900 font-heading">5. Seated Side Bend</h3>
              <p className="text-sm text-teal-600 font-semibold">Target: Obliques, latissimus dorsi, intercostals, quadratus lumborum</p>
              <div className="mt-3 text-sm text-slate-700 space-y-2">
                <p><strong>How to do it:</strong> Sit tall. Place your left hand on the chair seat for support. Raise your right arm overhead and lean gently to the left, reaching your right hand over your head. Keep both hips firmly on the chair. You should feel a stretch along your entire right side. Return to center and switch sides.</p>
                <p><strong>Hold time:</strong> 20-30 seconds each side, 2 repetitions</p>
                <p><strong>Why it helps:</strong> Lateral flexibility is essential for reaching to the side (grabbing items, opening doors, putting on seatbelts) and maintaining balance when the body shifts to one side. This stretch keeps the lateral chain supple and responsive.</p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-bold text-slate-900 font-heading">6. Seated Hamstring Stretch</h3>
              <p className="text-sm text-teal-600 font-semibold">Target: Hamstrings, lower back, calves</p>
              <div className="mt-3 text-sm text-slate-700 space-y-2">
                <p><strong>How to do it:</strong> Sit near the front edge of the chair. Extend your right leg straight out in front with the heel on the floor and toes pointing up. Keep your left foot flat on the floor. Sit tall and gently hinge forward from the hips (not by rounding the back) until you feel a stretch in the back of the right leg. Reach toward your toes but do not force it.</p>
                <p><strong>Hold time:</strong> 30 seconds each side, 2 repetitions</p>
                <p><strong>Why it helps:</strong> Tight hamstrings are a major contributor to lower back pain and difficulty bending forward (picking up items from the floor, tying shoes, getting in and out of cars). Maintaining hamstring flexibility preserves these essential daily functions.</p>
                <p><strong>Modification:</strong> If the stretch is too intense, keep a slight bend in the extended knee.</p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-bold text-slate-900 font-heading">7. Seated Figure-Four Hip Stretch</h3>
              <p className="text-sm text-teal-600 font-semibold">Target: Piriformis, gluteus medius, hip external rotators</p>
              <div className="mt-3 text-sm text-slate-700 space-y-2">
                <p><strong>How to do it:</strong> Sit with feet flat on the floor. Cross your right ankle over your left knee. Gently press down on the right knee with your right hand. For more stretch, lean your torso forward slightly, hinging at the hips. You should feel a deep stretch in the right buttock and outer hip.</p>
                <p><strong>Hold time:</strong> 30 seconds each side, 2 repetitions</p>
                <p><strong>Why it helps:</strong> Hip external rotation is needed for stepping into a bathtub, getting in and out of cars, and crossing the legs. The piriformis and deep hip rotators become chronically tight from sitting and walking, contributing to lower back pain and sciatica.</p>
                <p><strong>Safety:</strong> If you have a hip replacement, check with your surgeon before crossing the leg in this position.</p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-bold text-slate-900 font-heading">8. Seated Ankle Circles and Pumps</h3>
              <p className="text-sm text-teal-600 font-semibold">Target: Ankle joint, calf muscles, shin muscles, foot intrinsics</p>
              <div className="mt-3 text-sm text-slate-700 space-y-2">
                <p><strong>How to do it:</strong> Lift your right foot slightly off the floor. Make 10 large, slow circles clockwise, then 10 counterclockwise. Then point your toes down and pull them back up (ankle pumps) 10 times. Spread your toes wide and hold for 5 seconds, 5 times. Switch to the left foot.</p>
                <p><strong>Hold time:</strong> 10 circles each direction, 10 pumps, 5 toe spreads per foot (about 2 minutes total)</p>
                <p><strong>Why it helps:</strong> Ankle mobility is the single most important factor in fall prevention for seniors. Stiff ankles cannot make quick corrections when balance is challenged — leading to falls. Mobile ankles also improve walking gait, reduce tripping on NYC&apos;s uneven sidewalks, and prevent the shuffling gait pattern that increases fall risk.</p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-bold text-slate-900 font-heading">9. Seated Marching</h3>
              <p className="text-sm text-teal-600 font-semibold">Target: Hip flexors, core, circulation, coordination</p>
              <div className="mt-3 text-sm text-slate-700 space-y-2">
                <p><strong>How to do it:</strong> Sit tall. Alternately lift each knee toward the ceiling as if marching in place. Swing your arms naturally with each step. Start slowly and gradually increase the pace and knee height. Aim for 20 marches per leg.</p>
                <p><strong>Reps:</strong> 20 per leg (about 40 seconds)</p>
                <p><strong>Why it helps:</strong> Seated marching activates the hip flexors (needed for climbing stairs and stepping over obstacles), improves circulation in the legs (reducing swelling), and maintains the coordination between upper and lower body that walking requires.</p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-bold text-slate-900 font-heading">10. Seated Overhead Reach</h3>
              <p className="text-sm text-teal-600 font-semibold">Target: Shoulders, lats, thoracic spine, respiratory muscles</p>
              <div className="mt-3 text-sm text-slate-700 space-y-2">
                <p><strong>How to do it:</strong> Sit tall. Interlace your fingers and press your palms toward the ceiling, straightening your arms as much as comfortable. Reach up and slightly back, feeling a stretch through your arms, shoulders, and sides. Take 3 deep breaths at the top position. Release and repeat.</p>
                <p><strong>Hold time:</strong> 20 seconds, 3 repetitions</p>
                <p><strong>Why it helps:</strong> Overhead reaching is needed for accessing cabinets, closets, and shelves. Many seniors gradually lose this ability without realizing it, leading to dependence on others for daily tasks. This stretch maintains the shoulder and thoracic mobility needed for independent living.</p>
                <p><strong>Modification:</strong> If interlacing fingers is difficult, reach each arm up individually. If shoulder range is limited, reach only as high as comfortable.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ STANDING STRETCHES WITH SUPPORT ═══ */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-3xl font-bold text-slate-900 font-heading">Standing Stretches with Support (8 Exercises)</h2>
          <p className="mt-4 text-base text-slate-700">
            These stretches are performed standing while holding a sturdy support — a kitchen counter, heavy chair back, or wall. Always have the support within arm&apos;s reach. Standing stretches improve balance, leg strength, and the functional mobility needed for walking, climbing stairs, and navigating NYC.
          </p>

          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="font-bold text-slate-900 font-heading">1. Supported Calf Stretch</h3>
              <p className="mt-2 text-sm text-slate-700">Face a wall, hands at shoulder height. Step one foot back 18 inches. Keep the back heel down and lean gently into the wall. Hold 30 seconds. Then bend the back knee slightly while keeping the heel down for the soleus stretch. 30 seconds. Each side. <strong>Essential for ankle mobility and fall prevention.</strong></p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="font-bold text-slate-900 font-heading">2. Supported Hip Flexor Stretch</h3>
              <p className="mt-2 text-sm text-slate-700">Hold a counter with one hand. Stand in a split stance. Tuck your pelvis and press your hips gently forward until you feel a stretch in the front of the back hip. Hold 30 seconds each side. <strong>Counteracts the hip tightening that happens from sitting and contributes to back pain and shuffling gait.</strong></p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="font-bold text-slate-900 font-heading">3. Supported Quad Stretch</h3>
              <p className="mt-2 text-sm text-slate-700">Hold a counter or chair. Bend one knee and grab the ankle (or use a towel looped around the ankle). Gently pull the heel toward the buttock while keeping knees together. Press hips slightly forward. Hold 30 seconds each side. <strong>Maintains the quad flexibility needed for stairs and sitting down safely.</strong></p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="font-bold text-slate-900 font-heading">4. Supported Side Bend</h3>
              <p className="mt-2 text-sm text-slate-700">Hold a counter with one hand. Raise the other arm overhead and lean away from the counter. Keep both feet flat on the floor. Hold 20 seconds each side, 2 sets. <strong>Maintains the lateral flexibility needed for reaching, balance recovery, and torso rotation.</strong></p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="font-bold text-slate-900 font-heading">5. Supported Standing Hamstring Stretch</h3>
              <p className="mt-2 text-sm text-slate-700">Place one heel on a low step or stool (4-8 inches high). Keep the leg straight but not locked. Hinge forward at the hips, keeping your back straight. Hold 30 seconds each side. <strong>Maintains the ability to bend forward, tie shoes, and pick up items from the floor.</strong></p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="font-bold text-slate-900 font-heading">6. Supported Heel-Toe Raises</h3>
              <p className="mt-2 text-sm text-slate-700">Hold a counter. Rise onto your toes (hold 3 seconds), then rock back onto your heels (toes up, hold 3 seconds). 10 repetitions. <strong>Strengthens calves and shin muscles that are critical for balance and stepping safely off curbs.</strong></p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="font-bold text-slate-900 font-heading">7. Supported Single-Leg Stand</h3>
              <p className="mt-2 text-sm text-slate-700">Hold a counter lightly. Lift one foot 2-3 inches off the floor. Stand on the other leg for 15-30 seconds. Switch. As balance improves, reduce to fingertip contact with the counter. <strong>One of the single best exercises for fall prevention. Builds the balance reactions your body needs.</strong></p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="font-bold text-slate-900 font-heading">8. Supported March in Place</h3>
              <p className="mt-2 text-sm text-slate-700">Hold a counter with one hand. March in place, lifting knees to a comfortable height. 20 steps per leg. Gradually reduce counter support as confidence builds. <strong>Maintains the hip flexor strength and coordination needed for safe walking and stair climbing.</strong></p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FALL PREVENTION ═══ */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-3xl font-bold text-slate-900 font-heading">Fall Prevention Through Flexibility</h2>
          <div className="mt-6 space-y-5 text-base leading-relaxed text-slate-700">
            <p>
              Falls are the leading cause of injury-related death in adults over 65 and the number one cause of traumatic brain injury in seniors. In New York City, fall risk is amplified by uneven sidewalks, subway stairs, wet surfaces, crowded streets, and the fast pace of the city. The good news is that stretching and balance training are among the most effective fall prevention interventions available — reducing fall risk by 36% in multiple studies.
            </p>
            <p>
              Falls happen when the body cannot make a fast enough correction to a balance disturbance. This correction requires three things: (1) ankle mobility — stiff ankles cannot tilt quickly enough to correct a stumble; (2) hip mobility — restricted hips cannot take a recovery step quickly enough; and (3) neuromuscular reaction time — the nervous system must detect the imbalance and activate the right muscles fast enough. All three of these are directly improved by regular stretching and balance training.
            </p>
            <p>
              Our <Link href={getServiceUrl(services[9])} className="text-teal-600 underline hover:text-teal-700">gentle stretch service</Link> program incorporates fall prevention exercises into every session. Our therapists assess your balance, ankle mobility, and hip range of motion, then design a program that addresses your specific risk factors. We come directly to your NYC home, so there is no fall risk associated with traveling to an appointment.
            </p>
          </div>
          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-bold text-slate-900 font-heading">Key Fall Prevention Exercises</h3>
              <ul className="mt-3 space-y-2 text-sm text-slate-700">
                <li>&#8226; Ankle circles — 10 each direction, daily (maintains ankle mobility for balance corrections)</li>
                <li>&#8226; Single-leg stand with support — 15-30 seconds each side (builds balance reactions)</li>
                <li>&#8226; Heel-toe walks along a hallway — 10 steps (improves gait stability)</li>
                <li>&#8226; Heel-toe raises at counter — 10 reps (strengthens calf and shin muscles)</li>
                <li>&#8226; Side stepping along a counter — 10 steps each way (improves lateral stability)</li>
                <li>&#8226; Sit-to-stand from chair without hands — 5 reps (builds leg strength for recovery from stumbles)</li>
              </ul>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-bold text-slate-900 font-heading">NYC-Specific Fall Risks for Seniors</h3>
              <ul className="mt-3 space-y-2 text-sm text-slate-700">
                <li>&#8226; Uneven sidewalks and broken concrete — requires good ankle mobility</li>
                <li>&#8226; Subway stairs and platform gaps — requires hip flexor strength and balance</li>
                <li>&#8226; Wet surfaces from rain and snow — requires fast balance reactions</li>
                <li>&#8226; Crowded streets with sudden stops — requires core stability</li>
                <li>&#8226; Walk-up apartment stairs — requires calf, quad, and hip flexor strength</li>
                <li>&#8226; Stepping off curbs — requires ankle dorsiflexion and depth perception</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ ARTHRITIS-FRIENDLY STRETCHING ═══ */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-3xl font-bold text-slate-900 font-heading">Arthritis-Friendly Stretching Techniques</h2>
          <div className="mt-6 space-y-5 text-base leading-relaxed text-slate-700">
            <p>
              Arthritis affects over 54 million American adults, and the prevalence increases significantly after age 60. While it may seem counterintuitive to move joints that hurt, gentle stretching is one of the most effective non-medication treatments for both osteoarthritis and rheumatoid arthritis. Regular gentle stretching maintains the range of motion that arthritis tries to steal, reduces joint stiffness (especially the morning stiffness that makes the first hour of the day so difficult), improves circulation to joint tissues, and strengthens the muscles that support and protect arthritic joints.
            </p>
          </div>
          <div className="mt-8 space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="font-bold text-slate-900 font-heading">Arthritis Stretching Guidelines</h3>
              <ul className="mt-3 space-y-2 text-sm text-slate-700">
                <li><strong>Warm up first:</strong> Apply a warm towel or heating pad to stiff joints for 10 minutes before stretching. Warm tissue is more pliable and responsive.</li>
                <li><strong>Move slowly:</strong> Take twice as long to get into each position as you would without arthritis. Avoid jerky or sudden movements.</li>
                <li><strong>Stay in the comfort zone:</strong> Stretch to the point of mild tension, never pain. If a joint is acutely inflamed (hot, red, swollen), skip stretching that joint until inflammation subsides.</li>
                <li><strong>Use the 2-hour rule:</strong> If a stretch causes pain that lasts more than 2 hours after the session, you went too far. Reduce intensity next time.</li>
                <li><strong>Morning is key:</strong> The most beneficial time to stretch arthritic joints is within the first hour of waking, when stiffness is most pronounced.</li>
                <li><strong>Consistency beats intensity:</strong> Gentle daily stretching produces much better results than aggressive weekly sessions. 15 minutes daily is ideal.</li>
              </ul>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="font-bold text-slate-900 font-heading">Best Stretches for Arthritic Joints</h3>
              <div className="mt-3 text-sm text-slate-700 space-y-2">
                <p><strong>Arthritic hands:</strong> Finger spreads (5 seconds, 10 reps), gentle fist-to-open (10 reps), finger walks on table surface, thumb circles (10 each direction).</p>
                <p><strong>Arthritic knees:</strong> Seated knee extension (straighten leg, hold 10 seconds, 10 reps), gentle rocking from flat foot to toes and back, heel slides lying on back.</p>
                <p><strong>Arthritic hips:</strong> Seated hip circles (small, gentle circles with the knee, 10 each direction), seated figure-four (gentle — only as far as comfortable), seated knee lifts.</p>
                <p><strong>Arthritic shoulders:</strong> Pendulum swings (lean forward, let arm hang and swing gently), wall walks (walk fingers up a wall to shoulder height), gentle shoulder rolls.</p>
                <p><strong>Arthritic spine:</strong> Seated cat-cow (hands on knees, gently arch and round), gentle seated rotation (20% of maximum range), side bends with support.</p>
              </div>
            </div>
          </div>
          <div className="mt-8 rounded-xl border border-teal-300 bg-teal-50 p-6">
            <h3 className="text-lg font-bold text-teal-800 font-heading">Professional Gentle Stretch Service for Arthritis</h3>
            <p className="mt-2 text-sm text-teal-700">Our <Link href={getServiceUrl(services[9])} className="text-teal-600 underline">gentle stretch service</Link> therapists are trained in arthritis-specific techniques. They assess your inflammation levels, joint restrictions, and pain patterns before every session, then design a gentle, effective routine that maintains your mobility without aggravating your condition. We come to your NYC home — no need to navigate stairs, sidewalks, or transit with painful joints. $99/hr, 10% off weekly at $89/session.</p>
          </div>
        </div>
      </section>

      {/* ═══ NYC SENIOR RESOURCES ═══ */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-3xl font-bold text-slate-900 font-heading">NYC Senior Stretching and Wellness Resources</h2>
          <p className="mt-4 text-base text-slate-700">
            New York City offers several resources for seniors seeking stretching, mobility, and wellness programs. These complement professional stretch service sessions with group activities and community engagement.
          </p>
          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="font-bold text-slate-900 font-heading">Community Resources</h3>
              <ul className="mt-3 space-y-2 text-sm text-slate-700">
                <li>&#8226; <strong>NYC Department for the Aging:</strong> Senior centers across all 50 states offer free or low-cost group exercise classes</li>
                <li>&#8226; <strong>NYC Parks Senior Fitness:</strong> Free outdoor fitness programs in parks throughout the city</li>
                <li>&#8226; <strong>YMCA / JCC locations:</strong> Senior-specific group exercise and stretching classes</li>
                <li>&#8226; <strong>Hospital wellness programs:</strong> NYU Langone, Mount Sinai, and HSS offer arthritis and mobility programs</li>
              </ul>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="font-bold text-slate-900 font-heading">Why Add Professional Stretch Service</h3>
              <ul className="mt-3 space-y-2 text-sm text-slate-700">
                <li>&#8226; One-on-one attention vs. group class — your session is 100% about your body</li>
                <li>&#8226; Therapist monitors your specific conditions (arthritis, replacements, pain)</li>
                <li>&#8226; No travel required — we come to your home with all equipment</li>
                <li>&#8226; Techniques like <Link href={getServiceUrl(services[4])} className="text-teal-600 underline">passive stretching</Link> require a trained partner</li>
                <li>&#8226; Personalized progress tracking and routine adjustment</li>
                <li>&#8226; Flexible scheduling 7AM-10PM, any day of the week</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FAQ ═══ */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-3xl font-bold text-slate-900 font-heading text-center">Senior Stretching — Frequently Asked Questions</h2>
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
            Stay Mobile, Stay Independent — Book Gentle Stretch Service
          </h2>
          <p className="mt-4 text-lg text-teal-100">
            Our certified therapists specialize in gentle stretching for seniors. Chair-assisted options, arthritis-friendly techniques, fall prevention exercises — all delivered to your NYC home. No stairs, no travel, no hassle. <strong className="text-white">$99/hr | 10% off weekly at $89/session.</strong>
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
          <p className="mt-4 text-sm text-teal-200">All five boroughs | 7AM-10PM daily | We come to your home | No contracts</p>
        </div>
      </section>
    </>
  );
}
