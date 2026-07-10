import Link from "next/link";
import type { Metadata } from "next";
import { services, getServiceUrl, SITE_URL, SITE_SMS_LINK, SITE_PHONE, SITE_PHONE_LINK } from "@/app/site/stretch-service/_lib/siteData";
import { JsonLd, webPageSchema, breadcrumbSchema, faqSchema } from "@/app/site/stretch-service/_lib/schema";
import Logo from "@/app/site/stretch-service/_components/Logo";

export const metadata: Metadata = {
  title: "Complete Wellness & Stretching Guide | Diet, Fitness, Recovery",
  description:
    "The complete guide to daily wellness for flexibility. Stretching routines, nutrition for flexibility, hydration, sleep, fitness, recovery — everything your body needs. By Stretch Service.",
  alternates: { canonical: `${SITE_URL}/stretching-101/complete-wellness-guide` },
};

const wellnessFaqs = [
  {
    question: "How many times per week should I stretch for maximum flexibility?",
    answer:
      "For optimal results, stretch at minimum 3 times per week, but daily stretching produces the best flexibility gains. Professional stretch service sessions 1-2 times per week combined with daily self-stretching at home is the gold standard. Consistency matters far more than intensity — 15 minutes daily beats one 90-minute session per week.",
  },
  {
    question: "What should I eat before a stretch service session?",
    answer:
      "Eat a light meal 60-90 minutes before your session. Focus on easily digestible carbohydrates and moderate protein — a banana with almond butter, Greek yogurt with berries, or oatmeal with fruit are all excellent choices. Avoid heavy, fatty, or high-fiber meals that can cause discomfort when your therapist applies pressure to your abdomen and hip flexors during the session.",
  },
  {
    question: "Does hydration really affect my flexibility?",
    answer:
      "Absolutely — hydration is one of the single biggest factors in flexibility that most people overlook. Your fascia (the connective tissue surrounding every muscle) is approximately 70% water. When you are dehydrated, fascia becomes stiff and brittle, dramatically reducing your range of motion. Drinking adequate water daily can improve your flexibility by 15-20% without any additional stretching.",
  },
  {
    question: "Can stretching help me sleep better?",
    answer:
      "Yes, and the research is very clear on this. A 2019 study in the Journal of Physiotherapy found that stretching before bed improved sleep quality by 30% in participants with insomnia. Stretching activates the parasympathetic nervous system (your rest-and-digest response), lowers cortisol, and releases physical tension that keeps you awake. Our passive stretch service is particularly effective for evening sessions aimed at improving sleep.",
  },
  {
    question: "How much water should I drink daily for flexibility?",
    answer:
      "The general formula is half your body weight in ounces, plus an additional 16-20 ounces for every hour of physical activity. For a 160-pound person, that means 80 ounces (about 10 cups) as a baseline. In summer or if you exercise intensely, add more. Start your day with 16 ounces of water before coffee or food to rehydrate after sleep.",
  },
  {
    question: "What foods reduce muscle inflammation and stiffness?",
    answer:
      "The top anti-inflammatory foods for flexibility include wild-caught salmon (omega-3 fatty acids), blueberries and tart cherries (anthocyanins), turmeric with black pepper (curcumin), ginger, extra virgin olive oil, leafy greens like spinach and kale, walnuts, and avocado. Eating these foods daily can noticeably reduce morning stiffness and improve your response to stretch service sessions.",
  },
  {
    question: "Is it better to stretch in the morning or evening?",
    answer:
      "Both have distinct benefits. Morning stretching wakes up your nervous system, increases blood flow, and prepares your body for the day — but your muscles are naturally tighter, so go gentle. Evening stretching promotes better sleep, reduces accumulated tension from the day, and allows deeper stretches because your muscles are warmer. The ideal approach is a light morning routine (5-10 minutes) plus a deeper evening session or professional stretch service appointment.",
  },
  {
    question: "How does stress affect my flexibility?",
    answer:
      "Stress is one of the biggest hidden causes of muscle tightness. When you are stressed, your body releases cortisol, which causes muscles to contract and remain in a guarded state. Chronic stress leads to chronically tight muscles — especially in the neck, shoulders, jaw, and hips. This is why many NYC professionals feel tight despite exercising regularly. Professional stretch service combined with stress management techniques breaks this cycle.",
  },
  {
    question: "Can I stretch too much?",
    answer:
      "Yes, overstretching is real and can cause injury. Signs you are overstretching include sharp pain during stretching, increased soreness that lasts more than 24 hours, joint instability, and decreased range of motion (the opposite of what you want). A professional stretch service therapist knows exactly how far to push your body without crossing the line. If you are self-stretching, never push past mild discomfort into pain.",
  },
  {
    question: "What supplements help with flexibility and muscle recovery?",
    answer:
      "The most evidence-backed supplements for flexibility include magnesium glycinate (300-400mg daily for muscle relaxation), omega-3 fish oil (2-3g daily for inflammation), collagen peptides (10-15g daily for connective tissue), vitamin D (2000-5000 IU daily for muscle function), and vitamin C (500-1000mg daily to support collagen synthesis). Always consult your doctor before starting supplements.",
  },
  {
    question: "How does sleep position affect my flexibility and pain?",
    answer:
      "Sleep position has a massive impact on your body. Sleeping on your stomach compresses your spine and rotates your neck for hours, causing chronic neck and back pain. Side sleeping with a pillow between your knees maintains spinal alignment. Back sleeping with a pillow under your knees is ideal for spinal health. If you wake up stiff every morning, your sleep position — not your stretching routine — may be the primary cause.",
  },
  {
    question: "How often should I foam roll?",
    answer:
      "Daily foam rolling for 5-10 minutes produces the best results for maintaining tissue quality between professional stretch service sessions. Focus on major muscle groups: quads, hamstrings, IT band, calves, upper back, and glutes. Roll slowly (about 1 inch per second) and pause on tender spots for 20-30 seconds. Our foam rolling stretch service teaches proper technique so you can maintain your flexibility gains at home.",
  },
  {
    question: "What is the best exercise routine to complement stretching?",
    answer:
      "The ideal complement to a stretch service program is a balanced routine of strength training (2-3 times per week), cardiovascular exercise (150 minutes per week), and daily movement/walking. Strength training builds the muscular support that maintains flexibility gains. Cardio improves blood flow to muscles and fascia. Walking keeps joints lubricated and maintains functional mobility throughout the day.",
  },
  {
    question: "How does sitting all day at work affect my body?",
    answer:
      "Prolonged sitting causes your hip flexors to shorten, your glutes to weaken, your chest muscles to tighten, your upper back to round, and your neck to protrude forward. After just 30 minutes of sitting, your metabolic rate drops and your muscles begin to stiffen. After years of desk work, these postural distortions become structural. Regular stretch service sessions combined with movement breaks every 30 minutes can reverse years of sitting damage.",
  },
  {
    question: "Is yoga the same as professional assisted stretching?",
    answer:
      "No — they are complementary but fundamentally different. Yoga is self-directed: you move your own body through positions using your own strength and flexibility. Assisted stretch service is therapist-directed: a professional moves your body into positions you cannot reach alone, using PNF techniques to override your nervous system's protective reflexes. Most people gain 2-3 times more range of motion from one assisted stretch service session than from a month of solo yoga.",
  },
  {
    question: "Can stretching help with anxiety and depression?",
    answer:
      "Research shows that stretching reduces cortisol (stress hormone) levels by up to 28% and increases serotonin and endorphin production. A 2020 study found that regular stretching was as effective as moderate exercise for reducing symptoms of anxiety. The combination of physical touch, controlled breathing, and parasympathetic activation during a professional stretch service creates a powerful anti-anxiety effect that many of our NYC clients rely on for mental health support.",
  },
  {
    question: "What is the best post-workout recovery routine?",
    answer:
      "Within 30 minutes after exercise: rehydrate with water and electrolytes, consume 20-30g of protein with carbohydrates, and perform 10-15 minutes of light static stretching or book a recovery stretch service. Within 2 hours: eat a full balanced meal. That evening: foam roll for 5-10 minutes, take an Epsom salt bath if possible, and do a gentle pre-bed stretch routine. This protocol accelerates recovery by 40-60% compared to doing nothing.",
  },
  {
    question: "How long does it take to see flexibility improvements?",
    answer:
      "With consistent professional stretch service sessions (1-2 per week) combined with daily self-stretching, most clients notice measurable improvement within 2-3 weeks. Significant flexibility gains typically occur at the 6-8 week mark. Full transformation — where flexibility becomes your new normal — usually takes 3-6 months of consistent work. The key variable is consistency: missing sessions sets you back more than extra sessions push you forward.",
  },
  {
    question: "Should I stretch if I am sore from working out?",
    answer:
      "Light, gentle stretching when sore (delayed onset muscle soreness or DOMS) can help reduce soreness duration and improve blood flow to damaged muscles. However, avoid deep or aggressive stretching on very sore muscles — this can cause further microtears and delay recovery. A professional stretch service therapist adjusts intensity based on your soreness level, making professional sessions ideal for post-workout recovery.",
  },
  {
    question: "What is the connection between gut health and flexibility?",
    answer:
      "Emerging research shows a strong connection between gut health and systemic inflammation, which directly affects muscle and fascia health. An inflamed gut produces inflammatory cytokines that travel through your bloodstream and increase muscle stiffness throughout your body. Eating probiotic-rich foods (yogurt, kimchi, sauerkraut), prebiotic fiber (garlic, onions, bananas), and avoiding processed foods supports gut health, which in turn supports flexibility.",
  },
  {
    question: "How do I maintain flexibility gains between stretch service sessions?",
    answer:
      "Between professional stretch service sessions, maintain your gains with: 10-15 minutes of daily self-stretching focusing on areas your therapist identified, daily foam rolling (5 minutes), staying hydrated (half your body weight in ounces of water), moving every 30 minutes if you sit for work, and following the nutrition guidelines in this guide. Your therapist can give you a personalized take-home routine after each session.",
  },
  {
    question: "Is stretching safe during pregnancy?",
    answer:
      "Gentle stretching during pregnancy is not only safe but highly recommended — it can reduce back pain, improve circulation, decrease swelling, and prepare the body for labor. However, pregnancy hormones (particularly relaxin) make joints more unstable, so it is important to avoid overstretching. Always work with a qualified professional who has experience with prenatal clients. Our stretch service therapists are trained in prenatal modifications.",
  },
];

export default function CompleteWellnessGuidePage() {
  return (
    <>
      <JsonLd
        data={webPageSchema(
          "Complete Wellness & Stretching Guide — Diet, Fitness, Recovery",
          "The complete guide to daily wellness for flexibility. Stretching routines, nutrition, hydration, sleep, fitness, recovery — everything your body needs.",
          `${SITE_URL}/stretching-101/complete-wellness-guide`
        )}
      />
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", url: SITE_URL },
          { name: "Stretching 101", url: `${SITE_URL}/stretching-101` },
          { name: "Complete Wellness Guide", url: `${SITE_URL}/stretching-101/complete-wellness-guide` },
        ])}
      />
      <JsonLd data={faqSchema(wellnessFaqs)} />

      {/* ══════════════════════════════════════════════
          SECTION 1 — HERO + INTRO
      ══════════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 pt-36 pb-16 sm:pt-44 sm:pb-24">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">
            THE COMPLETE WELLNESS GUIDE
          </p>
          <div className="mb-6 flex justify-center">
          </div>
          <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl font-heading">
            The Complete Daily Wellness Guide for{" "}
            <span className="text-teal-200">Maximum Flexibility &amp; Body Health</span>
          </h1>
          <p className="mx-auto mt-6 max-w-3xl text-lg text-white/80">
            Stretching does not happen in a vacuum. Your flexibility, recovery speed, and pain levels are directly
            affected by what you eat, how you sleep, how much water you drink, and how you move throughout the day. This
            is the guide that covers EVERYTHING — nutrition, hydration, fitness, sleep, stress management, recovery, and
            how professional stretch service ties it all together.
          </p>
          <p className="mx-auto mt-4 max-w-2xl text-base text-white/70">
            Built by the stretch therapists at Stretch Service who work with hundreds of bodies every month across all five
            boroughs. This is not theory — this is what actually works for real New Yorkers living real lives.
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

      {/* Intro text block */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-3xl font-bold text-slate-900 font-heading">
            Why This Guide Exists
          </h2>
          <div className="mt-6 space-y-4 text-base leading-relaxed text-slate-700">
            <p>
              After thousands of professional stretch service sessions across New York City, we have noticed something
              that changed the way we think about flexibility forever: the clients who see the fastest, most dramatic
              results are not the ones who stretch the most. They are the ones who take care of their entire body.
            </p>
            <p>
              We have had clients who booked{" "}
              <Link href={getServiceUrl(services[0])} className="text-teal-600 underline hover:text-teal-700">
                assisted stretch service
              </Link>{" "}
              sessions three times a week but still felt stiff because they were dehydrated, eating inflammatory foods,
              sleeping four hours a night, and running on cortisol and caffeine. And we have had clients who came once a
              week but saw incredible results because they were hydrated, well-nourished, sleeping properly, and managing
              their stress.
            </p>
            <p>
              The difference was not the stretching. The difference was everything else.
            </p>
            <p>
              This guide is our attempt to give you everything — every piece of the puzzle. We are going to cover the
              perfect morning routine, what to eat for maximum flexibility, how much water you actually need, which
              exercises complement a stretch service program, how sleep affects your muscles, how stress makes you tight,
              how to move throughout the day, recovery protocols, and how to build a personalized daily wellness plan
              that fits your life in New York City.
            </p>
            <p>
              Whether you are a 25-year-old tech worker in Manhattan, a 45-year-old parent in Brooklyn, a 65-year-old
              retiree in Queens, or a tourist visiting NYC for the first time, this guide will show you exactly what your
              body needs to feel its absolute best. Let us get into it.
            </p>
          </div>
          <div className="mt-8 rounded-xl border border-teal-200 bg-teal-50/50 p-6">
            <h3 className="text-lg font-bold text-teal-800 font-heading">What This Guide Covers</h3>
            <ul className="mt-3 grid grid-cols-1 gap-2 text-sm text-teal-700 sm:grid-cols-2">
              <li>Morning routine for flexibility</li>
              <li>Nutrition and anti-inflammatory diet</li>
              <li>Hydration and fascia health</li>
              <li>Fitness and exercise programming</li>
              <li>Sleep and overnight recovery</li>
              <li>Stress management and mental wellness</li>
              <li>Daily movement and activity</li>
              <li>Recovery protocols beyond stretching</li>
              <li>Personalized daily wellness plans</li>
              <li>22 frequently asked wellness questions</li>
            </ul>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          SECTION 2 — THE PERFECT MORNING ROUTINE
      ══════════════════════════════════════════════ */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-3xl font-bold text-slate-900 font-heading">
            The Perfect Morning Routine for Flexibility
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-700">
            How you start your morning sets the tone for how your body feels all day. Most New Yorkers wake up, grab
            coffee, check their phone, rush through getting ready, and run out the door already feeling stiff and
            stressed. That approach guarantees tight muscles, low energy, and a body that fights you all day long. Here
            is a better way.
          </p>

          <h3 className="mt-10 text-2xl font-bold text-slate-900 font-heading">
            Step 1: The Wake-Up Hydration Protocol
          </h3>
          <div className="mt-4 space-y-4 text-base leading-relaxed text-slate-700">
            <p>
              Before you do anything else — before coffee, before food, before checking your phone — drink 16 ounces
              of room-temperature water. This is non-negotiable and it is the single highest-impact habit you can adopt
              for flexibility.
            </p>
            <p>
              Here is why: during 7-8 hours of sleep, your body loses approximately 1-2 pounds of water through
              breathing and perspiration. Your fascia — the connective tissue that wraps every muscle in your body — is
              roughly 70% water. When you wake up dehydrated (which you always are), your fascia is stiff, your muscles
              are tight, and your joints feel creaky. That morning stiffness that makes you groan when you get out of
              bed? That is dehydration more than anything else.
            </p>
            <p>
              Sixteen ounces of water first thing rehydrates your fascia, kickstarts your metabolism, flushes toxins
              that accumulated overnight, and primes your body for movement. Add a squeeze of fresh lemon for vitamin C
              (which supports collagen synthesis) and a pinch of sea salt for electrolytes. Your body will respond to
              stretching dramatically better when it is properly hydrated — our stretch service therapists see the
              difference immediately in clients who hydrate versus those who do not.
            </p>
          </div>

          <h3 className="mt-10 text-2xl font-bold text-slate-900 font-heading">
            Step 2: The 5-Minute Morning Stretch Routine
          </h3>
          <p className="mt-4 text-base leading-relaxed text-slate-700">
            After hydrating, spend just 5 minutes moving through these six stretches. Do not push hard — your muscles
            are still warming up. The goal is gentle activation, not deep flexibility work. Save the deep stretching
            for your professional stretch service sessions or evening routine.
          </p>

          <div className="mt-6 space-y-4">
            <div className="rounded-xl border border-teal-200/60 bg-white p-5">
              <h4 className="text-base font-bold text-teal-700 font-heading">1. Cat-Cow Spinal Mobilization (45 seconds)</h4>
              <p className="mt-2 text-sm text-slate-600">
                Start on your hands and knees. Inhale as you drop your belly toward the floor and lift your head (cow
                position). Exhale as you round your spine toward the ceiling and tuck your chin (cat position). Flow
                between these two positions slowly and rhythmically. This wakes up your entire spine, lubricates the
                vertebral discs with synovial fluid, and activates the muscles that support your posture all day. Do
                8-10 cycles, matching your breath to each movement. Focus on initiating the movement from your pelvis
                and letting the wave travel up through each segment of your spine.
              </p>
            </div>
            <div className="rounded-xl border border-teal-200/60 bg-white p-5">
              <h4 className="text-base font-bold text-teal-700 font-heading">2. Standing Forward Fold with Bent Knees (45 seconds)</h4>
              <p className="mt-2 text-sm text-slate-600">
                Stand with feet hip-width apart. Bend your knees generously and fold forward from your hips, letting
                your head and arms hang heavy. Grab opposite elbows and gently sway side to side. This decompresses
                your spine after a night of lying down, stretches your hamstrings and lower back gently, and allows
                blood to flow to your brain. The bent knees are critical in the morning — straight-leg forward folds
                on cold muscles can strain your hamstrings. Let gravity do the work. Breathe deeply and feel your spine
                lengthening with each exhale.
              </p>
            </div>
            <div className="rounded-xl border border-teal-200/60 bg-white p-5">
              <h4 className="text-base font-bold text-teal-700 font-heading">3. Hip Flexor Lunge Stretch (45 seconds each side)</h4>
              <p className="mt-2 text-sm text-slate-600">
                Step your right foot forward into a lunge position with your left knee on the floor (use a pillow or
                towel under your knee). Keep your torso upright and gently press your hips forward until you feel a
                stretch in the front of your left hip. This is the most important morning stretch for anyone who sits
                during the day. Your hip flexors shorten during sleep (especially if you sleep in the fetal position)
                and remain shortened while sitting. Tight hip flexors are the number one cause of lower back pain in
                desk workers. Hold 20-25 seconds each side, breathing deeply.
              </p>
            </div>
            <div className="rounded-xl border border-teal-200/60 bg-white p-5">
              <h4 className="text-base font-bold text-teal-700 font-heading">4. Chest Opener and Shoulder Stretch (30 seconds)</h4>
              <p className="mt-2 text-sm text-slate-600">
                Stand in a doorway with your arms bent at 90 degrees, forearms pressing against the door frame. Step
                one foot forward through the doorway and lean your chest through until you feel a stretch across your
                chest and the front of your shoulders. This counteracts the forward-rounded posture that develops from
                sleeping on your side, looking at your phone, and working at a computer. Hold for 30 seconds, breathing
                into the stretch. You should feel your chest opening and your shoulder blades drawing together.
              </p>
            </div>
            <div className="rounded-xl border border-teal-200/60 bg-white p-5">
              <h4 className="text-base font-bold text-teal-700 font-heading">5. Neck Circles and Side Tilts (30 seconds)</h4>
              <p className="mt-2 text-sm text-slate-600">
                Sit or stand tall. Slowly tilt your right ear toward your right shoulder, hold for 10 seconds, then
                switch sides. Follow with 3 slow, gentle neck circles in each direction. This releases the tension
                that accumulates in your neck and upper trapezius muscles during sleep — especially if you sleep on a
                pillow that is too high or too flat. Do not force any position. Neck muscles are small and respond to
                gentle, sustained stretches, not aggressive pulling. If you hear crunching, slow down and reduce the
                range of motion.
              </p>
            </div>
            <div className="rounded-xl border border-teal-200/60 bg-white p-5">
              <h4 className="text-base font-bold text-teal-700 font-heading">6. Deep Squat Hold (30 seconds)</h4>
              <p className="mt-2 text-sm text-slate-600">
                Stand with feet slightly wider than shoulder-width, toes pointed slightly outward. Squat down as low as
                you comfortably can, keeping your heels on the floor (hold onto a doorframe or sturdy furniture if
                needed). This is one of the most natural human positions — cultures around the world squat daily, but
                most Americans have lost this ability. The deep squat opens your hips, stretches your ankles, mobilizes
                your lower back, and activates your core. If you cannot get very deep at first, that is completely
                normal. Work your way down over weeks.
              </p>
            </div>
          </div>

          <h3 className="mt-10 text-2xl font-bold text-slate-900 font-heading">
            Step 3: Breakfast for Flexibility
          </h3>
          <div className="mt-4 space-y-4 text-base leading-relaxed text-slate-700">
            <p>
              What you eat for breakfast directly affects how flexible you feel for the rest of the day. An
              anti-inflammatory breakfast reduces muscle stiffness, supports connective tissue health, and provides
              sustained energy for movement. A pro-inflammatory breakfast (sugary cereal, pastries, bagels with cream
              cheese) spikes your blood sugar, increases systemic inflammation, and makes your muscles tighter.
            </p>
            <p>
              <strong>The ideal flexibility breakfast includes:</strong> a quality protein source (eggs, Greek yogurt,
              or a protein shake), healthy fats (avocado, nuts, olive oil, or nut butter), complex carbohydrates
              (oatmeal, sweet potato, or whole grain toast), and anti-inflammatory additions (berries, turmeric,
              ginger, or leafy greens). Example: two scrambled eggs with spinach and avocado on whole grain toast with a
              side of blueberries. Or: overnight oats made with almond milk, chia seeds, walnuts, and mixed berries.
              Both options provide the building blocks your muscles and fascia need to stay supple and responsive to
              stretching.
            </p>
          </div>

          <h3 className="mt-10 text-2xl font-bold text-slate-900 font-heading">
            Step 4: Morning Mobility Check — What Your Body Is Telling You
          </h3>
          <div className="mt-4 space-y-4 text-base leading-relaxed text-slate-700">
            <p>
              As you move through your morning stretches, pay attention to what your body is saying. This daily
              self-assessment takes 30 seconds but provides invaluable information. Where do you feel tight? Is it the
              same areas as yesterday, or different? Is the tightness improving or getting worse? Any sharp pain versus
              general stiffness?
            </p>
            <p>
              Your body communicates through sensation, and learning to listen to it is one of the most important
              wellness skills you can develop. If you notice the same areas feeling tight every morning — say, your
              right hip and left shoulder — that pattern tells you something about your posture, sleep position, or
              movement habits that needs to be addressed. Share this information with your stretch service therapist so
              they can tailor your sessions to target the root cause rather than just treating symptoms.
            </p>
            <p>
              If any area feels significantly more restricted or painful than usual, that is your body asking you to
              back off. Do not push through sharp pain during morning stretches. Gentle, consistent stretching improves
              flexibility. Aggressive, painful stretching causes injury and setbacks.
            </p>
          </div>

          <h3 className="mt-10 text-2xl font-bold text-slate-900 font-heading">
            When to Stretch vs. When to Move First
          </h3>
          <div className="mt-4 space-y-4 text-base leading-relaxed text-slate-700">
            <p>
              There is an ongoing debate about whether you should stretch first thing in the morning or warm up with
              movement first. Here is the practical answer: gentle, dynamic stretching (like the routine above) is safe
              and beneficial first thing in the morning. Deep static stretching or aggressive flexibility work should
              wait until your muscles are warm — either later in the day or after 5-10 minutes of light movement like
              walking.
            </p>
            <p>
              If you are someone who exercises in the morning, do your gentle morning stretch routine, eat breakfast,
              then do a{" "}
              <Link href={getServiceUrl(services[3])} className="text-teal-600 underline hover:text-teal-700">
                dynamic stretch
              </Link>{" "}
              warm-up before your workout. Save deep stretching for after your workout when your muscles are fully warm
              and pliable. If you schedule your professional stretch service in the morning, your therapist will begin
              with gentle mobilization and gradually increase depth as your muscles warm up — one of the many advantages
              of having a professional guide your stretching.
            </p>
          </div>

          <h3 className="mt-10 text-2xl font-bold text-slate-900 font-heading">
            Morning Routine by Age
          </h3>
          <div className="mt-4 space-y-4 text-base leading-relaxed text-slate-700">
            <p>
              <strong>In your 20s:</strong> Your body is forgiving but not invincible. Focus on maintaining the
              flexibility you have rather than taking it for granted. The morning routine above is perfect as-is. Add 5
              minutes of core activation (planks, dead bugs) to protect your spine during the decade when most people
              develop the bad habits that haunt them later.
            </p>
            <p>
              <strong>In your 30s:</strong> This is when most people first notice declining flexibility. Your morning
              routine becomes critical. Add extra hip flexor work and thoracic spine mobility (the mid-back area that
              starts rounding). This is the ideal decade to establish a regular professional{" "}
              <Link href={getServiceUrl(services[0])} className="text-teal-600 underline hover:text-teal-700">
                assisted stretch service
              </Link>{" "}
              routine — the investment pays dividends for decades.
            </p>
            <p>
              <strong>In your 40s:</strong> Recovery takes longer and injuries take more out of you. Extend your morning
              routine to 8-10 minutes and add balance work (single-leg stands while brushing your teeth). Hydration
              becomes even more critical as your body holds less water. Consider booking stretch service sessions
              weekly rather than bi-weekly.
            </p>
            <p>
              <strong>In your 50s:</strong> Joint health is now a priority. Add gentle joint circles (ankles, wrists,
              shoulders) to your morning routine. Reduce impact activities and increase mobility work. A{" "}
              <Link href={getServiceUrl(services[4])} className="text-teal-600 underline hover:text-teal-700">
                passive stretch service
              </Link>{" "}
              session becomes particularly valuable because your therapist can move your body through ranges your muscles
              may resist on their own.
            </p>
            <p>
              <strong>In your 60s and beyond:</strong> Your morning routine is the most important part of your day for
              maintaining independence and preventing falls. Take extra time warming up, use support (chair, wall, door
              frame) for balance, and never push into pain. Our{" "}
              <Link href={getServiceUrl(services[9])} className="text-teal-600 underline hover:text-teal-700">
                gentle stretch service for seniors
              </Link>{" "}
              is specifically designed for this stage of life — safe, effective, and focused on the movements that keep
              you independent.
            </p>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          SECTION 3 — NUTRITION FOR FLEXIBILITY
      ══════════════════════════════════════════════ */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-3xl font-bold text-slate-900 font-heading">
            Nutrition for Flexibility &amp; Muscle Recovery
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-700">
            Nutrition is the foundation that everything else is built on. You cannot out-stretch a bad diet. If your
            body is chronically inflamed from poor food choices, every stretch service session, every morning routine,
            every hour at the gym is fighting an uphill battle. Here is exactly what to eat, what to avoid, and when to
            eat it for maximum flexibility and recovery.
          </p>

          <h3 className="mt-10 text-2xl font-bold text-slate-900 font-heading">
            The Anti-Inflammatory Diet for Flexibility
          </h3>
          <div className="mt-4 space-y-4 text-base leading-relaxed text-slate-700">
            <p>
              Inflammation is the enemy of flexibility. When your body is inflamed, your muscles are tighter, your
              joints are stiffer, your recovery is slower, and your pain tolerance is lower. Chronic low-grade
              inflammation — the kind caused by poor diet, stress, and lack of sleep — keeps your body in a constant
              state of defensive tension. An anti-inflammatory diet reduces this baseline inflammation and creates an
              internal environment where flexibility can actually improve.
            </p>
            <p>
              <strong>Wild-caught salmon:</strong> The single best food for flexibility. Salmon is loaded with omega-3
              fatty acids (EPA and DHA) that directly reduce inflammation in muscles and connective tissue. Omega-3s
              also improve the fluidity of cell membranes, which makes your muscle fibers more pliable and responsive to
              stretching. Aim for 2-3 servings of fatty fish per week. Other options include sardines, mackerel, and
              herring. If you cannot eat fish, supplement with 2-3 grams of high-quality fish oil daily.
            </p>
            <p>
              <strong>Berries (blueberries, strawberries, tart cherries):</strong> Berries are packed with
              anthocyanins, powerful antioxidants that reduce exercise-induced muscle damage and inflammation. Tart
              cherry juice has been shown in studies to reduce muscle soreness by 48% after intense exercise. Add a cup
              of mixed berries to your morning routine — in oatmeal, yogurt, or smoothies. For recovery after intense
              stretch service sessions, 8 ounces of tart cherry juice works remarkably well.
            </p>
            <p>
              <strong>Leafy greens (spinach, kale, Swiss chard, arugula):</strong> These vegetables are rich in
              magnesium (critical for muscle relaxation), nitrates (which improve blood flow to muscles), and
              antioxidants that reduce systemic inflammation. The magnesium content alone makes leafy greens essential
              for flexibility — magnesium deficiency causes muscle cramps, spasms, and chronic tightness. Most
              Americans are deficient. Aim for 2-3 cups of dark leafy greens daily.
            </p>
            <p>
              <strong>Turmeric with black pepper:</strong> Curcumin, the active compound in turmeric, is one of the
              most potent natural anti-inflammatories available. Studies show it is as effective as ibuprofen for
              reducing inflammation, without the gut damage. Black pepper contains piperine, which increases curcumin
              absorption by 2,000%. Add turmeric and black pepper to scrambled eggs, smoothies, soups, or golden milk.
              For therapeutic doses, consider a curcumin supplement (500-1000mg with piperine).
            </p>
            <p>
              <strong>Ginger:</strong> Ginger contains gingerols and shogaols, compounds that reduce muscle pain and
              soreness. A University of Georgia study found that daily ginger consumption reduced exercise-induced
              muscle pain by 25%. Fresh ginger in tea, smoothies, or stir-fries is ideal. Ginger also improves
              circulation, which means more blood flow to your muscles during stretch service sessions and faster
              recovery afterward.
            </p>
            <p>
              <strong>Extra virgin olive oil:</strong> High-quality olive oil contains oleocanthal, a compound with
              anti-inflammatory properties similar to ibuprofen. Use it liberally on salads, vegetables, and for
              cooking at moderate temperatures. The Mediterranean diet — which is centered around olive oil, fish,
              vegetables, and whole grains — is associated with lower rates of chronic pain and better joint health.
            </p>
            <p>
              <strong>Nuts and seeds (walnuts, almonds, pumpkin seeds, flaxseeds):</strong> Walnuts are particularly
              rich in omega-3s. Pumpkin seeds are one of the best food sources of magnesium. Almonds provide vitamin E,
              which protects muscle cells from oxidative damage. Flaxseeds provide additional omega-3s and fiber. A
              handful of mixed nuts daily provides a concentrated dose of anti-inflammatory nutrients.
            </p>
            <p>
              <strong>Avocado:</strong> Rich in monounsaturated fats that reduce inflammation, potassium that prevents
              muscle cramps, and vitamin E that protects cell membranes. Avocado also provides healthy fats that help
              your body absorb fat-soluble vitamins (A, D, E, K) from other foods — all of which support muscle and
              connective tissue health.
            </p>
          </div>

          <h3 className="mt-10 text-2xl font-bold text-slate-900 font-heading">
            Foods That Cause Inflammation and Make You Stiffer
          </h3>
          <div className="mt-4 space-y-4 text-base leading-relaxed text-slate-700">
            <p>
              Just as certain foods reduce inflammation, others actively promote it. If you are eating these foods
              regularly and wondering why you are stiff despite stretching, here is your answer.
            </p>
            <p>
              <strong>Processed foods and refined carbohydrates:</strong> White bread, pastries, chips, crackers, and
              anything with a long ingredient list triggers inflammatory responses in your body. These foods spike blood
              sugar, which causes your body to produce inflammatory cytokines. The result: stiffer muscles, more pain,
              slower recovery. The typical NYC deli breakfast — bagel with cream cheese, or a muffin and orange juice —
              is essentially an inflammation bomb that makes your body fight against your stretch service session later
              that day.
            </p>
            <p>
              <strong>Sugar:</strong> Excess sugar (more than 25g per day for women, 36g for men) is one of the most
              inflammatory substances you can consume. Sugar triggers the release of inflammatory messengers called
              cytokines and also promotes glycation — a process where sugar molecules attach to collagen and elastin
              fibers, making them stiff and brittle. This directly reduces the elasticity of your connective tissue.
              Check labels: sugar hides in sauces, dressings, bread, yogurt, and nearly every processed food.
            </p>
            <p>
              <strong>Alcohol:</strong> Alcohol is both dehydrating and inflammatory — a double hit to flexibility.
              Even moderate drinking (2-3 drinks) causes measurable dehydration that persists for 24-48 hours, stiffening
              your fascia and reducing your range of motion. Alcohol also disrupts sleep quality (even when it helps you
              fall asleep, it prevents deep restorative sleep stages), which impairs overnight muscle recovery. If you
              have a stretch service session the next day, limit alcohol the night before for noticeably better results.
            </p>
            <p>
              <strong>Refined seed oils (soybean, corn, canola, sunflower):</strong> These oils are extremely high in
              omega-6 fatty acids, which promote inflammation when consumed in excess. The modern American diet has an
              omega-6 to omega-3 ratio of approximately 20:1 — it should be closer to 2:1. This massive imbalance is a
              major driver of chronic inflammation and muscle stiffness. Cook with olive oil, avocado oil, or coconut
              oil instead. Avoid fried foods at restaurants, which are almost always cooked in refined seed oils.
            </p>
          </div>

          <h3 className="mt-10 text-2xl font-bold text-slate-900 font-heading">
            Protein for Muscle Repair
          </h3>
          <div className="mt-4 space-y-4 text-base leading-relaxed text-slate-700">
            <p>
              When you stretch — especially during a professional{" "}
              <Link href={getServiceUrl(services[1])} className="text-teal-600 underline hover:text-teal-700">
                PNF stretch service
              </Link>{" "}
              session — you are creating microscopic changes in your muscle fibers and fascia. Your body repairs and
              adapts to these changes using amino acids from protein. Without adequate protein, your body cannot build
              the structural changes that lead to lasting flexibility improvements.
            </p>
            <p>
              <strong>How much protein do you need?</strong> For active adults doing regular stretch service and exercise,
              aim for 0.7-1.0 grams of protein per pound of body weight daily. A 150-pound person needs 105-150 grams of
              protein per day. Spread this across 3-4 meals rather than consuming it all at once — your body can only
              absorb approximately 30-40 grams of protein per meal efficiently.
            </p>
            <p>
              <strong>Protein timing matters.</strong> Consume 20-30 grams of protein within 30-60 minutes after a stretch
              service session or workout. This window is when your muscles are most receptive to repair and adaptation.
              A protein shake with banana, a chicken breast with rice, or Greek yogurt with nuts and berries all work
              well. The post-session protein is not optional if you want maximum flexibility gains — it is the building
              material your body uses to make the structural changes your therapist just initiated.
            </p>
          </div>

          <h3 className="mt-10 text-2xl font-bold text-slate-900 font-heading">
            Collagen for Connective Tissue
          </h3>
          <div className="mt-4 space-y-4 text-base leading-relaxed text-slate-700">
            <p>
              Collagen is the most abundant protein in your body — it is the primary structural component of your
              tendons, ligaments, fascia, and skin. After age 25, your body produces approximately 1% less collagen per
              year. By age 50, you have lost a quarter of your collagen production. This decline is a major reason why
              flexibility decreases with age and why connective tissue injuries become more common.
            </p>
            <p>
              <strong>Bone broth</strong> is the gold standard food source of collagen. A cup of quality bone broth
              (simmered for 12-24 hours) provides 10-15 grams of collagen along with glucosamine, chondroitin, and
              hyaluronic acid — all of which support joint and connective tissue health. Drink a cup daily, use it as
              a base for soups, or cook rice in bone broth instead of water.
            </p>
            <p>
              <strong>Collagen peptide supplements</strong> (10-15 grams daily) are a convenient alternative. Research
              shows that collagen supplements increase skin elasticity, reduce joint pain, and support tendon health.
              Mix collagen powder into coffee, smoothies, or oatmeal — it dissolves easily and is virtually tasteless.
            </p>
            <p>
              <strong>Vitamin C is essential</strong> for collagen synthesis. Without adequate vitamin C, your body
              cannot produce collagen regardless of how much collagen or protein you consume. Pair your collagen intake
              with vitamin C-rich foods (citrus fruits, bell peppers, strawberries, broccoli) or a 500mg vitamin C
              supplement. This pairing maximizes the benefit of your collagen for better flexibility and faster recovery
              from stretch service sessions.
            </p>
          </div>

          <h3 className="mt-10 text-2xl font-bold text-slate-900 font-heading">
            Magnesium — The Flexibility Mineral
          </h3>
          <div className="mt-4 space-y-4 text-base leading-relaxed text-slate-700">
            <p>
              Magnesium is arguably the single most important mineral for flexibility. It is required for muscle
              relaxation (calcium makes muscles contract, magnesium makes them relax), nerve function, and over 300
              enzymatic reactions in the body. An estimated 50-80% of Americans are deficient in magnesium, which
              contributes to muscle cramps, spasms, chronic tightness, poor sleep, and anxiety — all of which reduce
              flexibility.
            </p>
            <p>
              <strong>Best food sources of magnesium:</strong> dark chocolate (1 ounce provides 65mg), spinach (1 cup
              cooked provides 157mg), pumpkin seeds (1 ounce provides 150mg), almonds (1 ounce provides 80mg), black
              beans (1 cup provides 120mg), and avocado (1 medium provides 58mg). For supplementation, magnesium
              glycinate (300-400mg before bed) is the best-absorbed form and also promotes better sleep quality.
            </p>
          </div>

          <h3 className="mt-10 text-2xl font-bold text-slate-900 font-heading">
            Omega-3 Fatty Acids and Fascia Health
          </h3>
          <div className="mt-4 space-y-4 text-base leading-relaxed text-slate-700">
            <p>
              Your fascia — the web of connective tissue that your{" "}
              <Link href={getServiceUrl(services[6])} className="text-teal-600 underline hover:text-teal-700">
                myofascial release stretch service
              </Link>{" "}
              therapist works on — requires omega-3 fatty acids to maintain its fluidity and pliability. Omega-3s are
              incorporated into the cell membranes of fascial cells (fibroblasts), making them more responsive to
              mechanical stimulation like stretching and myofascial work. Omega-3s also reduce the production of
              inflammatory prostaglandins that cause fascial adhesions and restrict movement.
            </p>
            <p>
              Aim for 2-3 grams of combined EPA and DHA daily from fatty fish or a quality fish oil supplement. If you
              are plant-based, algae-based omega-3 supplements provide DHA directly. Flaxseeds and chia seeds provide
              ALA (an omega-3 precursor) but the conversion rate to EPA and DHA is low (less than 10%), so
              supplementation is recommended for plant-based individuals.
            </p>
          </div>

          <h3 className="mt-10 text-2xl font-bold text-slate-900 font-heading">
            Pre-Stretch and Post-Stretch Nutrition Timing
          </h3>
          <div className="mt-4 space-y-4 text-base leading-relaxed text-slate-700">
            <p>
              <strong>60-90 minutes before your stretch service session:</strong> Eat a light meal with easily
              digestible carbohydrates and moderate protein. Banana with almond butter, Greek yogurt with berries, or a
              small bowl of oatmeal with honey. Avoid heavy, fatty meals that divert blood to your digestive system
              instead of your muscles. Drink 16-20 ounces of water in the hour leading up to your session.
            </p>
            <p>
              <strong>Within 30-60 minutes after your session:</strong> This is your recovery window. Consume 20-30g of
              protein to support the tissue remodeling your therapist just initiated, plus carbohydrates to replenish
              glycogen. A protein smoothie with fruit, a turkey and avocado wrap, or eggs with sweet potato are all
              excellent post-stretch meals. Add an anti-inflammatory food (berries, turmeric, ginger) to accelerate
              recovery.
            </p>
          </div>

          <h3 className="mt-10 text-2xl font-bold text-slate-900 font-heading">
            Sample Daily Meal Plan for Maximum Flexibility
          </h3>
          <div className="mt-4 rounded-xl border border-slate-200 bg-white p-6">
            <div className="space-y-4 text-sm text-slate-700">
              <div>
                <p className="font-bold text-teal-700">Upon Waking (6:30 AM)</p>
                <p>16 oz water with lemon and a pinch of sea salt</p>
              </div>
              <div>
                <p className="font-bold text-teal-700">Breakfast (7:30 AM)</p>
                <p>
                  2 scrambled eggs with spinach and turmeric, half an avocado on whole grain toast, 1 cup blueberries,
                  green tea or black coffee
                </p>
              </div>
              <div>
                <p className="font-bold text-teal-700">Mid-Morning Snack (10:00 AM)</p>
                <p>Handful of walnuts and pumpkin seeds, 1 apple, 16 oz water</p>
              </div>
              <div>
                <p className="font-bold text-teal-700">Lunch (12:30 PM)</p>
                <p>
                  Grilled salmon over mixed greens with olive oil dressing, quinoa, roasted sweet potato, ginger tea
                </p>
              </div>
              <div>
                <p className="font-bold text-teal-700">Pre-Stretch Service Snack (3:00 PM)</p>
                <p>Greek yogurt with mixed berries and a drizzle of honey, 16 oz water</p>
              </div>
              <div>
                <p className="font-bold text-teal-700">Post-Stretch Service Recovery (5:00 PM)</p>
                <p>Protein shake with banana, almond milk, collagen peptides, and tart cherry juice</p>
              </div>
              <div>
                <p className="font-bold text-teal-700">Dinner (7:00 PM)</p>
                <p>
                  Grilled chicken with roasted vegetables (broccoli, bell peppers, zucchini) drizzled with olive oil,
                  brown rice, side salad with mixed greens
                </p>
              </div>
              <div>
                <p className="font-bold text-teal-700">Evening (9:00 PM)</p>
                <p>
                  Golden milk (warm almond milk with turmeric, cinnamon, ginger, and black pepper), 1 ounce dark
                  chocolate, magnesium glycinate supplement (300mg)
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          SECTION 4 — HYDRATION
      ══════════════════════════════════════════════ */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-3xl font-bold text-slate-900 font-heading">
            Hydration — The Most Overlooked Flexibility Factor
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-700">
            If there is one thing our stretch service therapists wish every client understood, it is this: hydration
            affects your flexibility more than almost anything else, and almost everyone is underhydrated. We can tell
            within the first 30 seconds of a session whether a client is well-hydrated. Their fascia feels different.
            Their muscles respond differently. Their range of motion is measurably greater.
          </p>

          <h3 className="mt-10 text-2xl font-bold text-slate-900 font-heading">
            How Dehydration Makes Fascia Stiff
          </h3>
          <div className="mt-4 space-y-4 text-base leading-relaxed text-slate-700">
            <p>
              Your fascia — the web of connective tissue that surrounds every muscle, bone, organ, and nerve in your
              body — is approximately 70% water. When properly hydrated, fascia is supple, slippery, and allows muscles
              to glide smoothly over each other during movement. When dehydrated, fascia becomes sticky, matted, and
              rigid. Think of the difference between a fresh sponge (hydrated fascia) and a dried-out sponge (dehydrated
              fascia). The dried sponge is stiff, inflexible, and cracks under pressure. The fresh sponge is soft,
              pliable, and bounces back.
            </p>
            <p>
              This is not a metaphor — it is literally what happens at the cellular level. Dehydrated fascia develops
              adhesions (places where layers stick together), trigger points (knots where fascia has become tangled),
              and restrictions that limit your range of motion regardless of how much you stretch. This is why your
              stretch service therapist focuses so much on fascial work — and why that work is dramatically more effective
              when you arrive hydrated.
            </p>
            <p>
              Chronic dehydration also reduces the volume of synovial fluid in your joints (the lubricant that allows
              smooth joint movement), making your joints feel creaky and stiff. It reduces blood flow to your muscles
              (blood is over 90% water), slowing nutrient delivery and waste removal. And it impairs nerve conduction,
              which can make your muscles less responsive to stretch signals from your nervous system.
            </p>
          </div>

          <h3 className="mt-10 text-2xl font-bold text-slate-900 font-heading">
            Your Daily Water Intake Formula
          </h3>
          <div className="mt-4 space-y-4 text-base leading-relaxed text-slate-700">
            <p>
              The generic recommendation of eight 8-ounce glasses (64 ounces) is a good starting point but wildly
              insufficient for active people, larger individuals, or anyone living in a city where you walk everywhere
              (hello, New York). Here is the formula we recommend to our stretch service clients:
            </p>
            <p>
              <strong>Baseline:</strong> Half your body weight in ounces. A 180-pound person needs 90 ounces (about 11
              cups) as a minimum daily intake.
            </p>
            <p>
              <strong>Activity adjustment:</strong> Add 16-20 ounces for every hour of physical activity. This includes
              exercise, walking (and New Yorkers walk a LOT), and your stretch service sessions.
            </p>
            <p>
              <strong>Environment adjustment:</strong> Add 8-16 ounces on hot days, dry winter days (indoor heating
              dries you out), or days with excessive caffeine or alcohol intake.
            </p>
            <p>
              <strong>For most active NYC adults, the target is 80-120 ounces per day</strong> (2.5-3.5 liters). Carry
              a 32-ounce water bottle and aim to refill it 3-4 times throughout the day. Drink consistently rather than
              chugging large amounts — your body absorbs water better in smaller, frequent amounts.
            </p>
          </div>

          <h3 className="mt-10 text-2xl font-bold text-slate-900 font-heading">
            Electrolytes and Their Role in Muscle Function
          </h3>
          <div className="mt-4 space-y-4 text-base leading-relaxed text-slate-700">
            <p>
              Water alone is not enough. Your muscles require electrolytes — sodium, potassium, magnesium, and calcium —
              to contract and relax properly. An electrolyte imbalance can cause muscle cramps, spasms, weakness, and
              chronic tightness even when you are drinking plenty of water.
            </p>
            <p>
              Most active people do not get enough potassium (target: 4,700mg daily from foods like bananas, potatoes,
              spinach, and avocados) or magnesium (target: 400-420mg for men, 310-320mg for women). Sodium is usually
              adequate in the American diet, but if you eat very clean and exercise heavily, you may need to add a pinch
              of sea salt to your water.
            </p>
            <p>
              Consider adding an electrolyte supplement (without sugar) to your water bottle 1-2 times per day,
              especially on days when you have a stretch service session scheduled. Your therapist will notice the
              difference in how your muscles respond.
            </p>
          </div>

          <h3 className="mt-10 text-2xl font-bold text-slate-900 font-heading">
            Signs of Dehydration That Mimic Muscle Tightness
          </h3>
          <div className="mt-4 space-y-4 text-base leading-relaxed text-slate-700">
            <p>
              Many people think they have a stretching problem when they actually have a hydration problem. Here are
              signs of dehydration that are commonly mistaken for muscle tightness or injury:
            </p>
            <ul className="ml-4 list-disc space-y-2 text-base text-slate-700">
              <li>Morning stiffness that takes a long time to loosen up</li>
              <li>General whole-body tightness rather than one specific area</li>
              <li>Muscles that feel stiff but not sore to the touch</li>
              <li>Cracking and popping joints without pain</li>
              <li>Headaches combined with muscle tension (especially in the neck and shoulders)</li>
              <li>Fatigue and low energy alongside stiffness</li>
              <li>Reduced range of motion that fluctuates day to day</li>
              <li>Muscles that feel tight during a stretch service session but loosen dramatically once warmed up</li>
            </ul>
            <p>
              If multiple items on this list resonate with you, try increasing your water intake for two weeks before
              assuming you need more stretching. Many of our clients have reported dramatic flexibility improvements
              simply from increasing hydration to proper levels — without changing anything else about their routine.
            </p>
          </div>

          <h3 className="mt-10 text-2xl font-bold text-slate-900 font-heading">
            Hydration Timing Around Stretch Service Sessions
          </h3>
          <div className="mt-4 space-y-4 text-base leading-relaxed text-slate-700">
            <p>
              <strong>The day before:</strong> Ensure you drink your full daily water intake. Hydration is cumulative —
              chugging water right before a session does not hydrate your fascia overnight. Think of it as marinating
              your tissues.
            </p>
            <p>
              <strong>2 hours before:</strong> Drink 16-20 ounces of water. This ensures your body is fully hydrated
              without making you uncomfortable during the session.
            </p>
            <p>
              <strong>During the session:</strong> Small sips only if needed. Your therapist will have you in various
              positions, and a full bladder is distracting.
            </p>
            <p>
              <strong>After the session:</strong> Drink 16-24 ounces within the first hour. Stretching and myofascial
              work release metabolic waste from your tissues — water helps flush these byproducts out of your system.
              This is why some clients feel slightly fatigued or experience mild detox symptoms after an intense session.
              Proper hydration afterward minimizes these effects.
            </p>
          </div>

          <h3 className="mt-10 text-2xl font-bold text-slate-900 font-heading">
            Best Hydration Practices for NYC Seasons
          </h3>
          <div className="mt-4 space-y-4 text-base leading-relaxed text-slate-700">
            <p>
              <strong>NYC summers:</strong> Heat and humidity cause significant fluid loss through sweating. Add 20-30%
              more water to your baseline during June through September. Carry water everywhere — NYC has drinking
              fountains in most parks (including the parks where we offer outdoor{" "}
              <Link href="/parks" className="text-teal-600 underline hover:text-teal-700">
                stretch service sessions
              </Link>
              ). Electrolytes become critical during summer — you lose sodium and potassium through sweat.
            </p>
            <p>
              <strong>NYC winters:</strong> Indoor heating (especially the aggressive steam heat in older NYC buildings)
              dries you out more than most people realize. You may not feel thirsty because it is cold outside, but your
              body is losing moisture to dry indoor air all day and all night. Add a humidifier to your bedroom and
              increase your water intake by 10-20% during winter months. Hot herbal teas count toward your daily intake
              and provide the added benefit of warmth.
            </p>
          </div>

          <h3 className="mt-10 text-2xl font-bold text-slate-900 font-heading">
            Coffee, Alcohol, and Their Effects on Flexibility
          </h3>
          <div className="mt-4 space-y-4 text-base leading-relaxed text-slate-700">
            <p>
              <strong>Coffee:</strong> Moderate caffeine intake (1-3 cups per day) is mildly diuretic but does not cause
              significant dehydration in regular coffee drinkers — your body adapts. Coffee actually has
              anti-inflammatory properties and contains antioxidants. However, excessive caffeine increases cortisol
              production, which can cause muscle tension. Our recommendation: enjoy your coffee but match every cup with
              an additional 8 ounces of water, and avoid caffeine within 6 hours of bedtime (sleep quality affects
              flexibility more than coffee intake).
            </p>
            <p>
              <strong>Alcohol:</strong> Unlike coffee, alcohol is significantly dehydrating and there is no adaptation
              effect. Every alcoholic drink causes your body to excrete more water than the drink contains. Even
              moderate drinking (2-3 drinks) measurably reduces your range of motion the next day. If you enjoy alcohol,
              match every drink with a full glass of water, and schedule your stretch service sessions for at least 24
              hours after your last drink for maximum benefit.
            </p>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          SECTION 5 — FITNESS & EXERCISE
      ══════════════════════════════════════════════ */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-3xl font-bold text-slate-900 font-heading">
            Fitness &amp; Exercise That Supports Flexibility
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-700">
            There is a persistent myth that strong people are inflexible and flexible people are weak. This is
            completely wrong. Strength and flexibility are not opposites — they are partners. The strongest, most
            functional bodies are also the most flexible. Here is how to build a fitness routine that enhances rather
            than hinders your flexibility and gets the most out of your stretch service sessions.
          </p>

          <h3 className="mt-10 text-2xl font-bold text-slate-900 font-heading">
            Strength Training for Flexibility
          </h3>
          <div className="mt-4 space-y-4 text-base leading-relaxed text-slate-700">
            <p>
              Strength training through a full range of motion is one of the best things you can do for flexibility.
              When you perform exercises like deep squats, Romanian deadlifts, overhead presses, and rows through their
              complete range, you are simultaneously strengthening and lengthening your muscles. This builds what is
              called active flexibility — the ability to not only reach a position but to control it with strength.
            </p>
            <p>
              Research published in the Journal of Strength and Conditioning found that full range-of-motion resistance
              training improved flexibility as effectively as static stretching programs. The key is full range of
              motion — half reps and partial movements do the opposite, training your muscles to be strong only in a
              limited range.
            </p>
            <p>
              Strong muscles also protect your joints and stabilize the flexibility gains from your stretch service
              sessions. Without adequate strength, hypermobility (too much flexibility without control) becomes a risk
              — particularly in the shoulders and lower back. This is why our therapists often recommend that clients
              pair their stretch service sessions with a strength training program. The two together produce better
              results than either alone.
            </p>
            <p>
              <strong>Recommended strength training frequency:</strong> 2-3 sessions per week, focusing on compound
              movements (squat, hinge, push, pull, carry) through full range of motion. Allow 48 hours between sessions
              for the same muscle groups to recover. Schedule your stretch service sessions on separate days from heavy
              strength training, or at least 4-6 hours apart.
            </p>
          </div>

          <h3 className="mt-10 text-2xl font-bold text-slate-900 font-heading">
            Yoga vs. Stretch Service: Complementary Practices
          </h3>
          <div className="mt-4 space-y-4 text-base leading-relaxed text-slate-700">
            <p>
              Many of our NYC clients do yoga and wonder whether they still need a professional stretch service. The
              answer is yes — and here is why they are fundamentally different but beautifully complementary.
            </p>
            <p>
              <strong>Yoga</strong> is self-directed. You move your own body using your own muscles and flexibility.
              You are limited by your own strength and range of motion. Yoga is excellent for mindfulness, body
              awareness, core strength, and maintaining flexibility — but it cannot take you beyond what your nervous
              system currently allows.
            </p>
            <p>
              <strong>Professional stretch service</strong> is therapist-directed. Your therapist uses{" "}
              <Link href={getServiceUrl(services[1])} className="text-teal-600 underline hover:text-teal-700">
                PNF techniques
              </Link>{" "}
              to override your nervous system&apos;s protective reflexes (the stretch reflex that stops you from going
              deeper). They can access angles and positions impossible to achieve alone. One assisted stretch service
              session typically produces 2-3 times more range of motion improvement than a month of solo yoga in the
              same area.
            </p>
            <p>
              <strong>The ideal combination:</strong> 1-2 professional stretch service sessions per week for deep
              flexibility work, plus 2-3 yoga sessions per week for maintenance, mindfulness, and strength. Use yoga to
              maintain the gains your therapist achieves. Use your therapist to break through plateaus that yoga alone
              cannot touch.
            </p>
          </div>

          <h3 className="mt-10 text-2xl font-bold text-slate-900 font-heading">
            Cardio and Flexibility
          </h3>
          <div className="mt-4 space-y-4 text-base leading-relaxed text-slate-700">
            <p>
              Cardiovascular exercise has a complex relationship with flexibility. On one hand, cardio increases blood
              flow to muscles and connective tissue, delivers oxygen and nutrients, and raises body temperature — all of
              which promote flexibility. On the other hand, repetitive cardio activities like running and cycling can
              tighten specific muscle groups if you are not counteracting them with stretching.
            </p>
            <p>
              <strong>Running:</strong> Tightens hip flexors, hamstrings, calves, and IT band. NYC runners (and there
              are millions of you, especially in Central Park, Prospect Park, and along the Hudson River Greenway) need
              targeted stretching for these areas. A{" "}
              <Link href={getServiceUrl(services[8])} className="text-teal-600 underline hover:text-teal-700">
                recovery stretch service
              </Link>{" "}
              session after a long run can reduce next-day soreness by 40-60% and prevent the chronic tightness that
              leads to runner&apos;s knee, IT band syndrome, and plantar fasciitis.
            </p>
            <p>
              <strong>Cycling:</strong> Creates extremely tight hip flexors and quadriceps from the repetitive bent-hip
              position, and rounds the upper back from the riding posture. If you are a NYC cyclist (Citi Bike riders
              included), prioritize hip flexor stretching, chest opening, and thoracic spine mobility.
            </p>
            <p>
              <strong>Swimming:</strong> The most flexibility-friendly cardio activity. The resistance of water combined
              with full range-of-motion movements maintains and can even improve flexibility while providing excellent
              cardiovascular conditioning.
            </p>
            <p>
              <strong>Walking:</strong> NYC&apos;s built-in cardio. Walking is gentle enough to promote flexibility while
              providing moderate cardiovascular benefits. The average New Yorker walks 2-3 miles more per day than the
              average American — this is one reason why New Yorkers tend to be healthier and more mobile than the
              national average. Walking maintains joint lubrication, promotes blood flow, and keeps your lower body
              muscles active throughout the day.
            </p>
          </div>

          <h3 className="mt-10 text-2xl font-bold text-slate-900 font-heading">
            The 5 Exercises Every New Yorker Should Do Daily
          </h3>
          <div className="mt-6 space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h4 className="text-base font-bold text-teal-700 font-heading">1. Dead Hang (30-60 seconds)</h4>
              <p className="mt-2 text-sm text-slate-600">
                Hang from a pull-up bar or door frame pull-up bar with relaxed shoulders. This decompresses your entire
                spine (the opposite of what sitting and gravity do all day), stretches your lats, opens your chest, and
                strengthens your grip. It is the single most effective spinal decompression exercise you can do. If you
                cannot hang for 30 seconds, start with 10-second holds and build up. Many NYC gyms, playgrounds, and
                outdoor fitness areas have pull-up bars available. The dead hang is so effective that many of our stretch
                service clients report that adding daily dead hangs was the biggest game-changer for their back pain
                after starting professional stretching.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h4 className="text-base font-bold text-teal-700 font-heading">2. Deep Squat Hold (1-2 minutes)</h4>
              <p className="mt-2 text-sm text-slate-600">
                Squat as low as you can with feet slightly wider than shoulders, toes pointed out. Hold the bottom
                position. This opens your hips, stretches your ankles, mobilizes your lower back, and strengthens your
                legs in a position that humans evolved to use daily but modern life has stolen from us. Use a door frame
                or sturdy furniture for support until you can hold it freely. Accumulate 5-10 minutes of deep squat
                time throughout the day. Many cultures around the world spend hours in this position daily and have
                dramatically lower rates of hip and knee problems.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h4 className="text-base font-bold text-teal-700 font-heading">3. Hip Flexor Lunge (30 seconds each side)</h4>
              <p className="mt-2 text-sm text-slate-600">
                Half-kneeling position with your front foot flat and back knee on the ground. Squeeze your back-side
                glute and gently press your hips forward. This directly counteracts the hip flexor shortening that
                occurs from sitting — which is the number one structural problem we see nationwide desk workers. If you sit
                for more than 4 hours a day (which nearly every office worker does), this exercise is not optional. Do
                it multiple times throughout the day: once in the morning, once at lunch, once in the evening. Your{" "}
                <Link href={getServiceUrl(services[2])} className="text-teal-600 underline hover:text-teal-700">
                  active stretch service
                </Link>{" "}
                therapist will target the same area with professional techniques.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h4 className="text-base font-bold text-teal-700 font-heading">4. Thoracic Rotation (30 seconds each side)</h4>
              <p className="mt-2 text-sm text-slate-600">
                Start on all fours (quadruped position). Place one hand behind your head. Rotate your upper body,
                bringing your elbow down toward the opposite hand, then rotating up toward the ceiling. This mobilizes
                your thoracic spine (mid-back), which is where most people are stiffest. A stiff thoracic spine causes
                compensatory problems in your neck, shoulders, and lower back. This exercise fights the kyphosis
                (upper back rounding) that develops from phone use, computer work, and the hunched posture of riding
                the subway. Do 8-10 repetitions per side.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h4 className="text-base font-bold text-teal-700 font-heading">5. Farmer&apos;s Walk (2-3 minutes)</h4>
              <p className="mt-2 text-sm text-slate-600">
                Pick up two heavy objects (dumbbells, heavy bags, jugs of water) and walk with them, maintaining upright
                posture with shoulders back and core braced. This is a total-body functional exercise that strengthens
                your grip, core, shoulders, and legs while training the upright posture that keeps your spine healthy.
                It also mimics something every New Yorker already does — carrying groceries home from the store. The
                difference is doing it mindfully with good form. Farmer&apos;s walks build the structural strength that
                makes flexibility gains from your stretch service sessions last longer.
              </p>
            </div>
          </div>

          <h3 className="mt-10 text-2xl font-bold text-slate-900 font-heading">
            Exercise by Age Group
          </h3>
          <div className="mt-4 space-y-4 text-base leading-relaxed text-slate-700">
            <p>
              <strong>20s:</strong> Build your foundation. This is the decade to develop strength, establish movement
              patterns, and create habits that will protect you for life. You can tolerate higher intensity and volume.
              Focus on: heavy compound lifting, sport-specific training, building aerobic capacity, and regular{" "}
              <Link href={getServiceUrl(services[3])} className="text-teal-600 underline hover:text-teal-700">
                dynamic stretch service
              </Link>{" "}
              to maintain the flexibility you currently take for granted.
            </p>
            <p>
              <strong>30s:</strong> Maintain and refine. Recovery begins to slow. Prioritize: full range-of-motion
              strength training, mobility work, consistent cardio (150+ minutes per week), and weekly professional
              stretch service sessions to counteract the sitting that accumulates during peak career years.
            </p>
            <p>
              <strong>40s:</strong> Protect your joints. Reduce impact, increase recovery time. Prioritize: moderate
              strength training 2-3x per week, swimming or cycling for cardio, daily mobility work, and bi-weekly
              stretch service sessions with emphasis on hip, shoulder, and thoracic mobility.
            </p>
            <p>
              <strong>50s:</strong> Joint health, balance, and functional movement become paramount. Prioritize:
              lighter weights with higher reps, balance training, walking, swimming, daily gentle stretching, and weekly{" "}
              <Link href={getServiceUrl(services[4])} className="text-teal-600 underline hover:text-teal-700">
                passive stretch service
              </Link>{" "}
              sessions for safe, deep flexibility work.
            </p>
            <p>
              <strong>60s and beyond:</strong> Movement is medicine. Prioritize: daily walking (30+ minutes), bodyweight
              exercises (modified as needed), balance exercises, chair-based stretching, and regular{" "}
              <Link href={getServiceUrl(services[9])} className="text-teal-600 underline hover:text-teal-700">
                gentle stretch service
              </Link>{" "}
              sessions focused on maintaining independence, preventing falls, and preserving the ability to perform daily
              activities.
            </p>
          </div>

          <h3 className="mt-10 text-2xl font-bold text-slate-900 font-heading">
            How Much Exercise Per Week
          </h3>
          <div className="mt-4 space-y-4 text-base leading-relaxed text-slate-700">
            <p>
              The CDC recommends 150 minutes of moderate-intensity aerobic activity (or 75 minutes of vigorous activity)
              plus 2 strength training sessions per week for adults. For flexibility specifically, we recommend adding:
            </p>
            <ul className="ml-4 list-disc space-y-2 text-base text-slate-700">
              <li>5-10 minutes of daily self-stretching (morning or evening routine)</li>
              <li>1-2 professional stretch service sessions per week for optimal results</li>
              <li>5-10 minutes of foam rolling daily (we teach technique in our{" "}
                <Link href={getServiceUrl(services[7])} className="text-teal-600 underline hover:text-teal-700">
                  foam rolling stretch service
                </Link>)
              </li>
              <li>Movement breaks every 30 minutes if you work at a desk</li>
            </ul>
            <p>
              The total weekly investment for a comprehensive wellness program: approximately 5-7 hours, including
              cardio, strength, stretching, and professional sessions. For most New Yorkers, that is achievable with
              planning. Walk to work instead of taking the subway (cardio check). Stretch for 10 minutes morning and
              night (flexibility check). Lift weights 2-3 times per week (strength check). Book one stretch service
              session per week (professional care check). Done.
            </p>
          </div>

          <h3 className="mt-10 text-2xl font-bold text-slate-900 font-heading">
            Central Park Workout Routine
          </h3>
          <div className="mt-4 space-y-4 text-base leading-relaxed text-slate-700">
            <p>
              Central Park is one of the greatest outdoor fitness facilities in the world — and it is free. Combine a
              Central Park workout with a professional{" "}
              <Link href="/parks/central-park" className="text-teal-600 underline hover:text-teal-700">
                stretch service session in Central Park
              </Link>{" "}
              for the ultimate NYC wellness experience. Here is a sample routine:
            </p>
            <p>
              Start with a 10-minute warm-up walk or light jog on the lower loop. Hit the pull-up bars near the North
              Meadow fitness area for dead hangs and pull-ups. Run the Reservoir loop (1.58 miles) for cardio. Find a
              bench for step-ups, tricep dips, and elevated push-ups. Cool down with walking and self-stretching on the
              Great Lawn. Then meet your Stretch Service therapist for a 60-minute assisted stretch session right there in
              the park. We bring all equipment — you just bring yourself.
            </p>
          </div>

          <h3 className="mt-10 text-2xl font-bold text-slate-900 font-heading">
            Gym + Stretch Service Combo: The Ideal Weekly Schedule
          </h3>
          <div className="mt-4 rounded-xl border border-slate-200 bg-white p-6">
            <div className="space-y-3 text-sm text-slate-700">
              <div className="flex gap-3">
                <span className="w-28 shrink-0 font-bold text-teal-700">Monday</span>
                <span>Strength training (upper body) + 10-min post-workout stretch</span>
              </div>
              <div className="flex gap-3">
                <span className="w-28 shrink-0 font-bold text-teal-700">Tuesday</span>
                <span>Professional stretch service session (60 min) — full body</span>
              </div>
              <div className="flex gap-3">
                <span className="w-28 shrink-0 font-bold text-teal-700">Wednesday</span>
                <span>Strength training (lower body) + 10-min post-workout stretch</span>
              </div>
              <div className="flex gap-3">
                <span className="w-28 shrink-0 font-bold text-teal-700">Thursday</span>
                <span>Cardio (run, bike, swim) + foam rolling</span>
              </div>
              <div className="flex gap-3">
                <span className="w-28 shrink-0 font-bold text-teal-700">Friday</span>
                <span>Strength training (full body) + 10-min post-workout stretch</span>
              </div>
              <div className="flex gap-3">
                <span className="w-28 shrink-0 font-bold text-teal-700">Saturday</span>
                <span>Professional stretch service session or yoga class</span>
              </div>
              <div className="flex gap-3">
                <span className="w-28 shrink-0 font-bold text-teal-700">Sunday</span>
                <span>Active recovery: long walk + gentle self-stretching + foam rolling</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          SECTION 6 — SLEEP & RECOVERY
      ══════════════════════════════════════════════ */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-3xl font-bold text-slate-900 font-heading">
            Sleep &amp; Recovery — When Flexibility Actually Happens
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-700">
            Here is something most people do not realize: flexibility improvements do not happen during stretching. They
            happen during sleep. When you stretch — whether on your own or during a professional stretch service session —
            you create a stimulus. You signal to your body that you need more range of motion in specific areas. But the
            actual structural adaptation — the lengthening of muscle fibers, the remodeling of fascia, the neural
            reprogramming that allows greater range — happens during deep sleep when your body is repairing itself.
          </p>

          <h3 className="mt-10 text-2xl font-bold text-slate-900 font-heading">
            How Muscles Repair and Lengthen During Sleep
          </h3>
          <div className="mt-4 space-y-4 text-base leading-relaxed text-slate-700">
            <p>
              During deep sleep (stages 3 and 4), your body releases human growth hormone (HGH), which drives muscle
              repair, tissue regeneration, and collagen synthesis. This is when the microdamage from stretching and
              exercise is repaired and your body adapts by building more flexible, resilient tissue. Without adequate
              deep sleep, this repair process is severely compromised — you are putting in the work during the day but
              not getting the returns at night.
            </p>
            <p>
              Your nervous system also resets during sleep. One of the biggest barriers to flexibility is your nervous
              system&apos;s protective mechanisms — the stretch reflex and muscle guarding that prevent you from reaching your
              full range. During sleep, these protective patterns are downregulated, allowing your neural system to
              recalibrate to the new ranges you achieved during your stretch service session. This is why you often feel
              more flexible in the morning after a session than you did immediately after — your nervous system caught up
              overnight.
            </p>
          </div>

          <h3 className="mt-10 text-2xl font-bold text-slate-900 font-heading">
            Sleep Positions for Flexibility
          </h3>
          <div className="mt-4 space-y-4 text-base leading-relaxed text-slate-700">
            <p>
              You spend 6-8 hours in your sleep position every night. Over a year, that is 2,000-3,000 hours in one
              position. If that position is structurally poor, it can undo everything you achieve during waking hours.
            </p>
            <p>
              <strong>Best position — back sleeping:</strong> Place a pillow under your knees to maintain the natural
              curve of your lower back. Use a cervical pillow or rolled towel under your neck to maintain cervical
              alignment. This position distributes weight evenly, minimizes pressure points, and keeps your spine in
              neutral alignment. It is particularly beneficial for people with lower back pain — and for maintaining the
              gains from your stretch service sessions.
            </p>
            <p>
              <strong>Good position — side sleeping:</strong> Place a firm pillow between your knees to keep your hips
              aligned and prevent your top leg from pulling your pelvis out of alignment. Your pillow should be thick
              enough to keep your head level with your spine (not tilted up or down). Hug a pillow to prevent your top
              shoulder from rolling forward. Side sleeping is the most common position and is perfectly fine when done
              with proper pillow support.
            </p>
            <p>
              <strong>Worst position — stomach sleeping:</strong> Avoid this if at all possible. Stomach sleeping forces
              your neck to rotate 90 degrees for hours, compresses your lower back, and rounds your shoulders forward.
              It is the number one sleep position contributor to chronic neck pain, headaches, and morning stiffness. If
              you are a stomach sleeper, transitioning to side sleeping with a body pillow is one of the best changes you
              can make for your flexibility and pain levels.
            </p>
          </div>

          <h3 className="mt-10 text-2xl font-bold text-slate-900 font-heading">
            Evening Stretch Routine for Better Sleep
          </h3>
          <p className="mt-4 text-base leading-relaxed text-slate-700">
            A pre-bed stretching routine activates your parasympathetic nervous system (the rest-and-digest response),
            lowers cortisol, reduces heart rate, and releases physical tension from the day. Research shows that
            stretching before bed improves sleep quality by 30%. Here are eight stretches to do in the 15-20 minutes
            before bed:
          </p>

          <div className="mt-6 space-y-4">
            <div className="rounded-xl border border-teal-200/60 bg-white p-5">
              <h4 className="text-base font-bold text-teal-700 font-heading">1. Child&apos;s Pose (60 seconds)</h4>
              <p className="mt-2 text-sm text-slate-600">
                Kneel on the floor, sit your hips back toward your heels, and reach your arms forward on the floor.
                Rest your forehead on the ground. Breathe slowly and deeply. This gently stretches your lower back,
                hips, thighs, and ankles while activating the parasympathetic nervous system through the forehead
                pressure and folded position. Focus on exhaling fully and feeling your body sink deeper with each breath.
                This is the most calming stretch you can do before bed.
              </p>
            </div>
            <div className="rounded-xl border border-teal-200/60 bg-white p-5">
              <h4 className="text-base font-bold text-teal-700 font-heading">2. Supine Figure-4 Stretch (45 seconds each side)</h4>
              <p className="mt-2 text-sm text-slate-600">
                Lie on your back, cross your right ankle over your left knee, and gently pull your left thigh toward
                your chest. This stretches the piriformis and deep hip rotators — muscles that tighten from sitting and
                walking all day. For NYC commuters who spend hours on subway seats and walk miles daily, this stretch
                provides immediate relief. Hold each side for 45 seconds, breathing deeply and relaxing into the
                stretch. This is also a key stretch that your stretch service therapist will likely include in your
                sessions.
              </p>
            </div>
            <div className="rounded-xl border border-teal-200/60 bg-white p-5">
              <h4 className="text-base font-bold text-teal-700 font-heading">3. Reclined Spinal Twist (45 seconds each side)</h4>
              <p className="mt-2 text-sm text-slate-600">
                Lie on your back, bring your knees to your chest, then drop both knees to the right while keeping your
                left shoulder on the ground. Extend your left arm out to the side. This rotation decompresses your
                spine, stretches your obliques and lower back, and creates a gentle opening across your chest. The
                twisting action also stimulates your vagus nerve, which triggers a relaxation response. Switch sides
                after 45 seconds. Many clients report that this stretch alone significantly improves their ability to
                fall asleep.
              </p>
            </div>
            <div className="rounded-xl border border-teal-200/60 bg-white p-5">
              <h4 className="text-base font-bold text-teal-700 font-heading">4. Legs Up the Wall (2-3 minutes)</h4>
              <p className="mt-2 text-sm text-slate-600">
                Lie on your back with your legs extended vertically up a wall, your buttocks touching or close to the
                wall. This inverted position uses gravity to drain pooled blood and lymphatic fluid from your legs,
                reducing swelling and heaviness. For anyone who walks, stands, or sits all day (every New Yorker), this
                is transformative. It also passively stretches your hamstrings and calves, calms the nervous system,
                and can reduce blood pressure. Stay for 2-3 minutes with slow, deep breathing. This pairs beautifully
                with the flexibility gains from a{" "}
                <Link href={getServiceUrl(services[5])} className="text-teal-600 underline hover:text-teal-700">
                  static stretch service
                </Link>{" "}
                session earlier in the day.
              </p>
            </div>
            <div className="rounded-xl border border-teal-200/60 bg-white p-5">
              <h4 className="text-base font-bold text-teal-700 font-heading">5. Seated Forward Fold (60 seconds)</h4>
              <p className="mt-2 text-sm text-slate-600">
                Sit on the floor with legs extended straight in front of you. Hinge forward from your hips (not your
                waist), reaching toward your toes. Bend your knees slightly if needed. This stretches the entire
                posterior chain — hamstrings, calves, lower back, and thoracolumbar fascia. The forward fold position
                also has a calming effect on the nervous system, similar to Child&apos;s Pose. Hold for 60 seconds, breathing
                deeply, and let gravity pull you slightly deeper with each exhale. Do not bounce or force the stretch.
              </p>
            </div>
            <div className="rounded-xl border border-teal-200/60 bg-white p-5">
              <h4 className="text-base font-bold text-teal-700 font-heading">6. Neck and Shoulder Release (60 seconds)</h4>
              <p className="mt-2 text-sm text-slate-600">
                Sit comfortably and drop your right ear toward your right shoulder. Place your right hand gently on your
                head (do not pull) and let the weight of your hand deepen the stretch. Hold 20 seconds, then switch
                sides. Follow with gentle shoulder rolls — 5 forward, 5 backward. This releases the tension that
                accumulates in the upper trapezius, levator scapulae, and scalene muscles from phone use, computer
                work, and the general stress of NYC life. Tight neck and shoulders are the number one complaint our
                stretch service therapists hear.
              </p>
            </div>
            <div className="rounded-xl border border-teal-200/60 bg-white p-5">
              <h4 className="text-base font-bold text-teal-700 font-heading">7. Happy Baby Pose (60 seconds)</h4>
              <p className="mt-2 text-sm text-slate-600">
                Lie on your back, grab the outside edges of your feet, and gently pull your knees toward your armpits.
                Rock gently side to side. This deeply stretches the inner groin and hip flexors, decompresses the lower
                back, and has a profoundly calming effect on the body. The gentle rocking stimulates the vestibular
                system (your balance center), which triggers a relaxation response similar to being rocked to sleep as
                a child. This is one of the most effective pre-sleep stretches for anyone with hip or lower back
                tightness.
              </p>
            </div>
            <div className="rounded-xl border border-teal-200/60 bg-white p-5">
              <h4 className="text-base font-bold text-teal-700 font-heading">8. Diaphragmatic Breathing in Constructive Rest (2 minutes)</h4>
              <p className="mt-2 text-sm text-slate-600">
                Lie on your back with your knees bent, feet flat on the floor. Place one hand on your chest and one on
                your belly. Breathe slowly into your belly (the bottom hand should rise, the top hand should barely
                move). Inhale for 4 counts, hold for 2 counts, exhale for 6 counts. This breathing pattern directly
                activates the parasympathetic nervous system, lowering cortisol, heart rate, and blood pressure. After
                completing the stretch routine, 2 minutes of diaphragmatic breathing transitions your body from waking
                state to sleep-ready state. Many of our stretch service clients report that learning this breathing
                technique was one of the most valuable takeaways from their sessions.
              </p>
            </div>
          </div>

          <h3 className="mt-10 text-2xl font-bold text-slate-900 font-heading">
            Sleep Duration by Age for Optimal Recovery
          </h3>
          <div className="mt-4 space-y-4 text-base leading-relaxed text-slate-700">
            <p>
              <strong>18-25 years:</strong> 7-9 hours. Your body recovers fastest, but sleep debt accumulates quickly
              in this age group due to lifestyle factors. Prioritize sleep consistency (same bed/wake time) over total
              hours.
            </p>
            <p>
              <strong>26-45 years:</strong> 7-8 hours minimum. Recovery slows during these decades, making sleep even
              more critical. Sleep deprivation in this age range directly correlates with accelerated muscle and fascia
              stiffening. If you are getting 6 hours or less and wondering why your stretch service sessions do not seem
              to be producing lasting results, sleep is likely the bottleneck.
            </p>
            <p>
              <strong>46-65 years:</strong> 7-8 hours. Sleep architecture changes — you spend less time in deep sleep
              stages, which means the sleep you do get needs to be higher quality. Sleep hygiene becomes critical:
              cool room (65-68 degrees), dark environment, no screens before bed, consistent schedule.
            </p>
            <p>
              <strong>65+:</strong> 7-8 hours, but often fragmented. Napping is fine and can supplement nighttime sleep.
              Focus on sleep quality over quantity. Evening stretch service sessions at this age can dramatically improve
              both sleep quality and flexibility simultaneously.
            </p>
          </div>

          <h3 className="mt-10 text-2xl font-bold text-slate-900 font-heading">
            NYC Sleep Challenges
          </h3>
          <div className="mt-4 space-y-4 text-base leading-relaxed text-slate-700">
            <p>
              Living in New York City presents unique sleep challenges that directly impact your flexibility and recovery.
              Here is how to address the most common ones:
            </p>
            <p>
              <strong>Noise:</strong> NYC never sleeps, and neither will you without proper protection. Invest in a
              quality white noise machine or use a fan. Earplugs rated NRR 33 (the highest available) block most city
              noise. Many NYC apartments are near subway lines, fire stations, or late-night bars — if your sleep is
              consistently disrupted, your muscles are not getting the recovery time they need.
            </p>
            <p>
              <strong>Light:</strong> Street lights, building lights, and early sunrise can all disrupt melatonin
              production. Blackout curtains are essential nationwide apartments. They are inexpensive, easy to install, and
              the single best sleep investment you can make in a NYC apartment.
            </p>
            <p>
              <strong>Stress:</strong> The pace and intensity of NYC life keeps cortisol elevated well into the evening.
              An evening stretch routine (see above) combined with the breathing techniques in our stress management
              section provides a powerful natural cortisol-lowering protocol. Regular{" "}
              <Link href={getServiceUrl(services[4])} className="text-teal-600 underline hover:text-teal-700">
                passive stretch service
              </Link>{" "}
              sessions in the evening are particularly effective for resetting the nervous system before bed.
            </p>
            <p>
              <strong>Small apartments:</strong> Limited space does not have to limit your sleep quality. Even in a
              studio apartment, you can do the evening stretch routine in this guide — it requires only a body-length
              space on the floor and a wall for legs-up-the-wall. When you book a stretch service session, your therapist
              brings a portable table that fits in any NYC apartment.
            </p>
          </div>

          <h3 className="mt-10 text-2xl font-bold text-slate-900 font-heading">
            The Stretch Service, Better Sleep, Better Flexibility Cycle
          </h3>
          <div className="mt-4 space-y-4 text-base leading-relaxed text-slate-700">
            <p>
              This is the positive feedback loop we see in our most successful clients: professional stretch service
              reduces muscle tension and activates the parasympathetic nervous system, which leads to better sleep
              quality. Better sleep quality leads to more complete muscle recovery and adaptation, which leads to greater
              flexibility gains. Greater flexibility gains mean less pain and tension, which leads to even better sleep.
              And the cycle continues. The clients who see the most dramatic long-term results are the ones who leverage
              this cycle by combining stretch service with proper sleep hygiene. It is a compounding effect where each
              element amplifies the others.
            </p>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          SECTION 7 — STRESS MANAGEMENT & MENTAL WELLNESS
      ══════════════════════════════════════════════ */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-3xl font-bold text-slate-900 font-heading">
            Stress Management &amp; Mental Wellness for Flexibility
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-700">
            If you have ever noticed that your body is tighter during stressful periods of your life — even when you are
            stretching regularly — you have experienced the mind-body connection firsthand. Stress is not just a mental
            phenomenon. It has direct, measurable physical effects on your muscles, fascia, and connective tissue. And
            in New York City, stress is arguably the number one obstacle to flexibility for many of our clients.
          </p>

          <h3 className="mt-10 text-2xl font-bold text-slate-900 font-heading">
            How Cortisol Causes Muscle Tension
          </h3>
          <div className="mt-4 space-y-4 text-base leading-relaxed text-slate-700">
            <p>
              When you experience stress — whether physical (overtraining, injury) or psychological (work pressure,
              financial anxiety, relationship problems, NYC commute rage) — your body releases cortisol and adrenaline.
              These hormones trigger a cascade of physical responses: your muscles contract and enter a guarded state
              (preparing to fight or flee), blood flow redirects away from your digestive system and skin toward your
              large muscle groups, your fascia tightens, and your pain sensitivity increases.
            </p>
            <p>
              This is the stress-tightness feedback loop: stress causes muscle tension, muscle tension causes pain and
              restricted movement, pain and restricted movement cause more stress, and more stress causes more tension.
              Without intervention, this cycle perpetuates itself indefinitely. Many people have been stuck in this loop
              for years without realizing it. They think they are naturally inflexible. They are not — they are
              chronically stressed.
            </p>
            <p>
              Chronic cortisol elevation also impairs collagen synthesis (slowing tissue repair), disrupts sleep (reducing
              overnight recovery), promotes inflammation (stiffening fascia), and increases muscle protein breakdown
              (weakening the muscles that support flexibility). In other words, chronic stress attacks your flexibility
              from every angle simultaneously.
            </p>
          </div>

          <h3 className="mt-10 text-2xl font-bold text-slate-900 font-heading">
            Breathing Techniques for Immediate Tension Relief
          </h3>
          <div className="mt-4 space-y-4 text-base leading-relaxed text-slate-700">
            <p>
              Breathing is the fastest, most accessible tool for breaking the stress-tension cycle. You can do these
              techniques anywhere — in your apartment, at your desk, on the subway, or during your stretch service
              session.
            </p>
            <p>
              <strong>Box Breathing (4-4-4-4):</strong> Inhale for 4 counts, hold for 4 counts, exhale for 4 counts,
              hold empty for 4 counts. Repeat for 4 rounds. This technique is used by Navy SEALs for stress management
              and has been shown to lower cortisol levels within 2 minutes. It works by regulating the autonomic nervous
              system and breaking the stress response pattern.
            </p>
            <p>
              <strong>4-7-8 Breathing:</strong> Inhale through your nose for 4 counts, hold for 7 counts, exhale
              through your mouth for 8 counts. Repeat for 3-4 rounds. The extended exhale activates the vagus nerve
              and triggers a strong parasympathetic response. This is particularly effective before bed or before a
              stretch service session to help your body enter a state where deeper stretching is possible.
            </p>
            <p>
              <strong>Diaphragmatic Breathing:</strong> Place one hand on your chest and one on your belly. Breathe
              slowly into your belly so that only the bottom hand moves. Most stressed individuals are chest breathers —
              they use their neck and shoulder muscles to breathe, which creates chronic tension in those areas. Learning
              to breathe with your diaphragm alone can reduce neck and shoulder tightness by 30-50% in many cases. Your
              stretch service therapist may incorporate breathing cues during sessions to help you develop this habit.
            </p>
          </div>

          <h3 className="mt-10 text-2xl font-bold text-slate-900 font-heading">
            Meditation and the Mind-Muscle Connection
          </h3>
          <div className="mt-4 space-y-4 text-base leading-relaxed text-slate-700">
            <p>
              Meditation is not just a mental exercise — it has direct physical effects on your flexibility. Regular
              meditation practice (even 10 minutes daily) has been shown to lower baseline cortisol levels, reduce
              resting muscle tension, improve body awareness, and increase pain tolerance. All of these factors
              contribute to better flexibility outcomes and more productive stretch service sessions.
            </p>
            <p>
              The mind-muscle connection is particularly relevant during stretching. When you can direct your conscious
              attention to a specific muscle and consciously relax it, you can achieve deeper stretches than when you are
              distracted or mentally elsewhere. Meditation strengthens this connection. Experienced meditators
              consistently demonstrate greater ability to relax into stretches, override the stretch reflex, and achieve
              deeper ranges of motion during professional stretch service sessions.
            </p>
            <p>
              Start with 5 minutes of daily meditation (guided apps like Headspace or Calm work well for beginners)
              and build to 10-20 minutes. Body scan meditation is particularly relevant for flexibility — it trains you
              to systematically direct attention to each body part and consciously release tension, which is exactly
              what you need to do during a stretch.
            </p>
          </div>

          <h3 className="mt-10 text-2xl font-bold text-slate-900 font-heading">
            NYC Stress Factors and Their Physical Manifestations
          </h3>
          <div className="mt-4 space-y-4 text-base leading-relaxed text-slate-700">
            <p>
              New York City is one of the most stimulating, demanding, and stressful environments in the world. Here is
              how common NYC stressors manifest physically in the bodies our stretch service therapists work on daily:
            </p>
            <ul className="ml-4 list-disc space-y-2 text-base text-slate-700">
              <li><strong>Commute stress (subway delays, crowding):</strong> Manifests as jaw clenching (TMJ), neck and shoulder tension, elevated resting heart rate, and shallow breathing patterns</li>
              <li><strong>Work pressure (long hours, high expectations):</strong> Manifests as upper trap tightness, tension headaches, lower back pain from prolonged sitting, and chronically elevated cortisol</li>
              <li><strong>Financial stress (NYC cost of living):</strong> Manifests as generalized muscle tension, disrupted sleep, digestive issues, and global stiffness that does not respond to stretching alone</li>
              <li><strong>Social overstimulation (noise, crowds, constant stimulation):</strong> Manifests as nervous system hypervigilance, startle responses, inability to relax during stretching, and facial tension</li>
              <li><strong>Apartment living stress (small spaces, roommates, noise):</strong> Manifests as poor sleep quality, inability to establish a home wellness routine, and frustration-based tension patterns</li>
            </ul>
            <p>
              Recognizing which stressors are affecting YOUR body is the first step toward addressing them. Share your
              stress patterns with your stretch service therapist — they can focus on the physical manifestations of your
              specific stressors and teach you targeted relief techniques.
            </p>
          </div>

          <h3 className="mt-10 text-2xl font-bold text-slate-900 font-heading">
            Progressive Muscle Relaxation Technique
          </h3>
          <div className="mt-4 space-y-4 text-base leading-relaxed text-slate-700">
            <p>
              Progressive muscle relaxation (PMR) is a technique where you systematically tense and then release each
              muscle group in your body, teaching your nervous system the difference between tension and relaxation.
              Here is the full walkthrough:
            </p>
            <p>
              Lie down or sit comfortably. Close your eyes. Starting with your feet, tense all the muscles in your feet
              as hard as you can for 5 seconds, then completely release and notice the sensation of relaxation for 10
              seconds. Move to your calves — tense for 5 seconds, release for 10. Continue upward through your thighs,
              glutes, abdomen, chest, hands, forearms, upper arms, shoulders, neck, and face. By the time you reach your
              face, your entire body should be in a state of deep relaxation.
            </p>
            <p>
              PMR takes about 10-15 minutes and is one of the most effective stress management techniques available. It
              is particularly useful before a stretch service session (it primes your muscles to accept deeper stretches)
              and before bed (it transitions your body from waking tension to sleep-ready relaxation). After practicing
              for a few weeks, you will develop the ability to consciously release muscle tension on demand — a skill
              that benefits you during stretch service sessions and throughout daily life.
            </p>
          </div>

          <h3 className="mt-10 text-2xl font-bold text-slate-900 font-heading">
            How Professional Stretch Service Reduces Cortisol
          </h3>
          <div className="mt-4 space-y-4 text-base leading-relaxed text-slate-700">
            <p>
              Research on assisted stretching and therapeutic touch shows significant cortisol reduction after sessions.
              The combination of gentle physical manipulation, controlled breathing, and the parasympathetic activation
              that occurs during professional stretching creates a powerful stress-reduction effect. Many of our NYC
              clients book stretch service sessions specifically for the mental health benefits — the flexibility gains
              are a bonus.
            </p>
            <p>
              There are several mechanisms at work. Physical touch activates oxytocin release (the bonding and
              relaxation hormone). The passive nature of assisted stretching (someone else doing the work while you
              relax) shifts your nervous system from sympathetic (fight-or-flight) to parasympathetic (rest-and-digest).
              The slow, rhythmic nature of the stretching mimics the cadence that triggers relaxation responses. And the
              physical release of muscle tension provides immediate feedback to your brain that the threat is gone and
              it is safe to relax.
            </p>
          </div>

          <h3 className="mt-10 text-2xl font-bold text-slate-900 font-heading">
            Mindful Stretching vs. Mechanical Stretching
          </h3>
          <div className="mt-4 space-y-4 text-base leading-relaxed text-slate-700">
            <p>
              There is a significant difference between stretching while scrolling your phone and stretching with full
              mental engagement. Mindful stretching — where you direct your conscious attention to the sensation in the
              muscle being stretched, synchronize your breathing with the stretch, and consciously relax into each
              position — produces measurably better results than mechanical stretching (going through the motions while
              thinking about something else).
            </p>
            <p>
              Your nervous system responds to attention. When you focus on a muscle, blood flow to that area increases,
              nerve conduction improves, and your brain&apos;s ability to relax that specific muscle is enhanced. This is why
              professional stretch service sessions produce such dramatic results — your therapist directs your attention
              to the target muscle, cues your breathing, and creates an environment of focused relaxation that is nearly
              impossible to replicate alone while distracted by the hundred other things on your mind.
            </p>
          </div>

          <h3 className="mt-10 text-2xl font-bold text-slate-900 font-heading">
            Daily Stress Management Routine for New Yorkers
          </h3>
          <div className="mt-4 rounded-xl border border-slate-200 bg-white p-6">
            <div className="space-y-4 text-sm text-slate-700">
              <div>
                <p className="font-bold text-teal-700">Morning (5 minutes)</p>
                <p>
                  5-minute morning stretch routine (from Section 2), practiced mindfully with attention on breathing
                  and body sensations. Set an intention for the day.
                </p>
              </div>
              <div>
                <p className="font-bold text-teal-700">Commute (as needed)</p>
                <p>
                  Box breathing (4-4-4-4) when the subway is delayed or crowded. Conscious jaw relaxation — unclench
                  your jaw, place your tongue on the roof of your mouth, and let your lower jaw hang slightly open.
                </p>
              </div>
              <div>
                <p className="font-bold text-teal-700">Work Breaks (every 2 hours)</p>
                <p>
                  2-minute movement break: stand, stretch your hip flexors, roll your shoulders, do 5 deep
                  diaphragmatic breaths. This prevents the accumulation of tension throughout the workday.
                </p>
              </div>
              <div>
                <p className="font-bold text-teal-700">Lunch (10 minutes)</p>
                <p>
                  Walk outside. Natural light and movement during lunch reset your circadian rhythm and lower cortisol.
                  Even a walk around the block helps. In Manhattan, step into{" "}
                  <Link href="/parks/bryant-park" className="text-teal-600 underline hover:text-teal-700">
                    Bryant Park
                  </Link>
                  ,{" "}
                  <Link href="/parks/madison-square-park" className="text-teal-600 underline hover:text-teal-700">
                    Madison Square Park
                  </Link>
                  , or{" "}
                  <Link href="/parks/the-high-line" className="text-teal-600 underline hover:text-teal-700">
                    The High Line
                  </Link>{" "}
                  for a green space reset.
                </p>
              </div>
              <div>
                <p className="font-bold text-teal-700">Evening (15-20 minutes)</p>
                <p>
                  Evening stretch routine (from Section 6) followed by 5 minutes of progressive muscle relaxation or
                  body scan meditation. This is your daily stress discharge — do not skip it.
                </p>
              </div>
              <div>
                <p className="font-bold text-teal-700">Weekly</p>
                <p>
                  1-2 professional stretch service sessions. Think of these as your weekly nervous system reset and
                  deep tension release that daily self-care maintains but cannot fully replicate.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          SECTION 8 — ACTIVITY & MOVEMENT THROUGHOUT THE DAY
      ══════════════════════════════════════════════ */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-3xl font-bold text-slate-900 font-heading">
            Activity &amp; Movement Throughout the Day
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-700">
            Your body was designed to move constantly — not to sit in one position for 8-12 hours a day. The way you
            move (or do not move) between your morning stretch routine and your evening stretch routine has a massive
            impact on your flexibility, pain levels, and how much benefit you get from your professional stretch service
            sessions. Here is how to keep your body active and mobile throughout the day, even with a desk job and a
            busy NYC lifestyle.
          </p>

          <h3 className="mt-10 text-2xl font-bold text-slate-900 font-heading">
            Sitting Is the New Smoking: The Research
          </h3>
          <div className="mt-4 space-y-4 text-base leading-relaxed text-slate-700">
            <p>
              The phrase is dramatic but the science backs it up. Prolonged sitting is associated with increased risk of
              cardiovascular disease, type 2 diabetes, certain cancers, and all-cause mortality — independent of exercise.
              That last part is critical: even if you work out for an hour every day, sitting for the remaining 10-12
              hours still causes significant health damage. Exercise does not cancel out prolonged sitting — you need to
              address the sitting directly.
            </p>
            <p>
              For flexibility specifically, prolonged sitting causes: hip flexor shortening (they are stuck in a
              shortened position for hours), hamstring tightening, glute deactivation (gluteal amnesia — your glutes
              literally forget how to fire properly), thoracic spine rounding, cervical spine protraction (forward head
              posture), and fascial adhesion formation throughout the posterior chain. After years of prolonged sitting,
              these adaptations become structural and require significant intervention — professional stretch service,
              strength training, and daily mobility work — to reverse.
            </p>
          </div>

          <h3 className="mt-10 text-2xl font-bold text-slate-900 font-heading">
            Movement Snacks: 2-Minute Breaks Every 30 Minutes
          </h3>
          <div className="mt-4 space-y-4 text-base leading-relaxed text-slate-700">
            <p>
              The concept of movement snacks has emerged as one of the most practical solutions for the sitting problem.
              Every 30 minutes, take a 2-minute movement break. Set a timer on your phone or computer. When it goes off,
              stand up and do one or more of the following:
            </p>
            <ul className="ml-4 list-disc space-y-2 text-base text-slate-700">
              <li>Stand and do 10 bodyweight squats</li>
              <li>Walk to the water cooler and back (bonus: hydration)</li>
              <li>Do a standing hip flexor stretch (30 seconds each side)</li>
              <li>Roll your shoulders 10 times forward and 10 times backward</li>
              <li>Do 10 standing calf raises</li>
              <li>Walk up and down one flight of stairs</li>
              <li>Do a doorway chest stretch for 30 seconds</li>
              <li>Touch your toes (or as close as you can get) 5 times</li>
            </ul>
            <p>
              These micro-doses of movement prevent fascial adhesions from forming, maintain blood flow to your muscles,
              keep your joints lubricated, and counteract the postural distortions caused by sitting. They take two
              minutes and cost nothing. Over the course of a workday, 16 movement snacks (one every 30 minutes over 8
              hours) add up to 32 minutes of movement that your body desperately needs. Your stretch service therapist
              will notice the difference within 2-3 weeks.
            </p>
          </div>

          <h3 className="mt-10 text-2xl font-bold text-slate-900 font-heading">
            Walking: NYC&apos;s Built-In Fitness Advantage
          </h3>
          <div className="mt-4 space-y-4 text-base leading-relaxed text-slate-700">
            <p>
              New York City is a walking city, and that is one of the biggest health advantages New Yorkers have over
              the rest of the country. The average New Yorker walks 2-3 miles more per day than the average American.
              In car-dependent cities, people walk to their car and back — maybe 2,000-3,000 steps a day. In NYC, you
              walk to the subway, walk through the station, walk from the subway to your destination, walk to lunch,
              walk to the grocery store, and walk home. Most New Yorkers hit 8,000-12,000 steps daily without trying.
            </p>
            <p>
              Walking is one of the best activities for maintaining flexibility. It keeps your hip joints mobile, your
              ankles flexible, your calves active, and your spine moving. It promotes blood flow to every muscle in your
              body. It lubricates your joints with synovial fluid. And it provides low-impact cardiovascular exercise
              that supports recovery from more intense activities and stretch service sessions.
            </p>
            <p>
              <strong>How to maximize the flexibility benefits of walking:</strong> Walk with good posture (head up,
              shoulders back, core gently engaged), take full strides (do not shuffle), push off with your back foot
              (engaging your glutes and calves), and vary your terrain when possible (hills, stairs, different surfaces).
              Walking across the{" "}
              <Link href="/parks/brooklyn-bridge-park" className="text-teal-600 underline hover:text-teal-700">
                Brooklyn Bridge
              </Link>{" "}
              or through{" "}
              <Link href="/parks/prospect-park" className="text-teal-600 underline hover:text-teal-700">
                Prospect Park
              </Link>{" "}
              provides varied terrain that challenges your body in different ways than flat sidewalks.
            </p>
          </div>

          <h3 className="mt-10 text-2xl font-bold text-slate-900 font-heading">
            Standing Desk Protocols
          </h3>
          <div className="mt-4 space-y-4 text-base leading-relaxed text-slate-700">
            <p>
              Standing desks are popular nationwide offices, but standing all day is not the answer either. Prolonged
              standing causes its own problems: lower back compression, foot pain, varicose veins, and fatigue. The
              research is clear that alternating between sitting and standing is far better than either one alone.
            </p>
            <p>
              <strong>The ideal protocol:</strong> Sit for 25 minutes, stand for 25 minutes, move for 5 minutes.
              Repeat throughout the workday. When standing, shift your weight from foot to foot, stand on a cushioned
              mat, and keep one foot slightly elevated on a small box or step (this reduces lower back strain). When
              sitting, use good posture with your feet flat on the floor, hips slightly above knees, and monitor at
              eye level. During your 5-minute movement break, walk, stretch, or do any of the movement snacks listed
              above.
            </p>
          </div>

          <h3 className="mt-10 text-2xl font-bold text-slate-900 font-heading">
            Subway Movement: Stretches You Can Do on the Platform
          </h3>
          <div className="mt-4 space-y-4 text-base leading-relaxed text-slate-700">
            <p>
              New Yorkers spend an average of 40 minutes per day waiting for or riding the subway. That is nearly 250
              hours per year of standing and sitting in positions that contribute to stiffness. Here are subtle
              stretches you can do on the platform or in the train without looking strange:
            </p>
            <ul className="ml-4 list-disc space-y-2 text-base text-slate-700">
              <li><strong>Calf raises:</strong> Rise up on your toes and lower back down slowly. Do 15-20 reps. This strengthens your calves, improves ankle mobility, and promotes blood flow to your lower legs.</li>
              <li><strong>Neck side tilts:</strong> Gently tilt your ear toward your shoulder, hold 10 seconds, switch. This can be done while holding a pole or sitting in a seat without drawing attention.</li>
              <li><strong>Standing spinal twist:</strong> Hold the pole with both hands and gently rotate your torso to one side, then the other. This mobilizes your thoracic spine.</li>
              <li><strong>Hip circles:</strong> While standing, make small circles with your hips (like a subtle hula hoop motion). This keeps your hip joints lubricated and active.</li>
              <li><strong>Ankle circles:</strong> While sitting, lift one foot slightly and rotate your ankle 10 times in each direction. Switch feet. This prevents ankle stiffness from standing on hard surfaces.</li>
            </ul>
          </div>

          <h3 className="mt-10 text-2xl font-bold text-slate-900 font-heading">
            Stair Climbing: NYC Walkups as Fitness
          </h3>
          <div className="mt-4 space-y-4 text-base leading-relaxed text-slate-700">
            <p>
              If you live in a walkup building (and millions of New Yorkers do), you have a built-in stair climbing gym.
              Stair climbing is excellent for hip mobility, glute activation, and cardiovascular fitness. Take the stairs
              instead of the elevator whenever possible — at your building, at subway stations, at your office. Walking
              up stairs engages your hip flexors, glutes, quads, and calves through their full range of motion, making
              it both a strength exercise and a functional mobility drill. For an added flexibility benefit, take two
              stairs at a time occasionally, which deepens your hip flexor stretch with each step.
            </p>
          </div>

          <h3 className="mt-10 text-2xl font-bold text-slate-900 font-heading">
            10,000 Steps: Is It Enough for Flexibility?
          </h3>
          <div className="mt-4 space-y-4 text-base leading-relaxed text-slate-700">
            <p>
              The 10,000-step goal is a good baseline for general health, and most active New Yorkers hit it naturally.
              However, steps alone are not enough for optimal flexibility. Steps provide low-level movement that
              maintains baseline mobility, but they do not provide the deep range-of-motion work, the strength training,
              or the professional assisted stretching that creates real flexibility improvements. Think of walking as the
              foundation — it keeps you from getting worse. Stretch service, strength training, and targeted mobility
              work are what make you better.
            </p>
          </div>

          <h3 className="mt-10 text-2xl font-bold text-slate-900 font-heading">
            Active Commuting Tips
          </h3>
          <div className="mt-4 space-y-4 text-base leading-relaxed text-slate-700">
            <p>
              Turn your NYC commute into a wellness activity. Walk part of your commute — get off the subway one stop
              early and walk the rest. Use Citi Bike for short trips (great cardio, though stretch your hip flexors
              afterward). Take stairs at every subway station instead of the escalator. If your commute involves a bus,
              stand instead of sitting. Carry your bag on alternate shoulders (or use a backpack with both straps) to
              prevent one-sided postural imbalance. These small choices accumulate into significant physical benefits
              over weeks and months and make your stretch service sessions more productive because your body enters the
              session already partially warmed up and mobile.
            </p>
          </div>

          <h3 className="mt-10 text-2xl font-bold text-slate-900 font-heading">
            Weekend Activity Guidelines
          </h3>
          <div className="mt-4 space-y-4 text-base leading-relaxed text-slate-700">
            <p>
              Weekends nationwide offer incredible opportunities for active movement. Explore the city&apos;s parks — Central
              Park, Prospect Park, Flushing Meadows, Van Cortlandt Park,{" "}
              <Link href="/parks/riverside-park" className="text-teal-600 underline hover:text-teal-700">
                Riverside Park
              </Link>
              , and dozens more offer trails, open spaces, and outdoor fitness areas. Walk the{" "}
              <Link href="/parks/the-high-line" className="text-teal-600 underline hover:text-teal-700">
                High Line
              </Link>{" "}
              or the Hudson River Greenway. Explore a new neighborhood on foot. Join a pickup sports game. The key is
              to avoid the weekend warrior pattern — sitting all week, then going hard on Saturday. That pattern leads
              to injury. Instead, maintain your daily movement habits throughout the week so your weekends can include
              more intense activity safely. And book a stretch service session for Sunday afternoon to recover and reset
              for the week ahead.
            </p>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          SECTION 9 — RECOVERY PROTOCOLS BEYOND STRETCHING
      ══════════════════════════════════════════════ */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-3xl font-bold text-slate-900 font-heading">
            Recovery Protocols Beyond Stretching
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-700">
            Stretching is the cornerstone of flexibility, but it is not the only recovery tool available. A
            comprehensive recovery protocol combines multiple modalities to address your body from different angles. Here
            are the most effective recovery practices to complement your professional stretch service sessions and daily
            stretching routine.
          </p>

          <h3 className="mt-10 text-2xl font-bold text-slate-900 font-heading">
            Hot/Cold Therapy (Contrast Therapy)
          </h3>
          <div className="mt-4 space-y-4 text-base leading-relaxed text-slate-700">
            <p>
              Alternating between hot and cold exposure creates a pumping effect in your circulatory system that flushes
              metabolic waste, reduces inflammation, and speeds recovery. The simplest version: end your shower with 30
              seconds of cold water after your normal warm shower. The cold exposure causes blood vessels to constrict,
              pushing blood away from your extremities. When you warm up again, blood vessels dilate and fresh,
              oxygen-rich blood rushes back in.
            </p>
            <p>
              <strong>Contrast showers:</strong> Alternate 2 minutes warm and 30 seconds cold for 3-4 rounds, ending
              on cold. This is the most accessible form of contrast therapy for NYC apartment dwellers.
            </p>
            <p>
              <strong>Ice baths:</strong> Full cold immersion (50-60 degrees F) for 2-5 minutes post-exercise reduces
              delayed onset muscle soreness and inflammation. Several NYC facilities offer cold plunge pools, or you can
              fill your bathtub with cold water and ice. Cold exposure after intense stretch service sessions can reduce
              next-day soreness significantly.
            </p>
            <p>
              <strong>Heat therapy:</strong> Applying heat (heating pad, warm bath, hot towel) before stretching
              increases tissue temperature, improves fascial pliability, and allows deeper stretches. Heat dilates blood
              vessels and increases blood flow to the target area. A warm bath or hot towel applied for 10-15 minutes
              before your evening stretch routine primes your muscles for deeper flexibility work.
            </p>
          </div>

          <h3 className="mt-10 text-2xl font-bold text-slate-900 font-heading">
            Foam Rolling as Daily Practice
          </h3>
          <div className="mt-4 space-y-4 text-base leading-relaxed text-slate-700">
            <p>
              Foam rolling is self-myofascial release — you use your body weight and a foam roller to apply pressure to
              tight muscles and fascial adhesions. It complements professional{" "}
              <Link href={getServiceUrl(services[6])} className="text-teal-600 underline hover:text-teal-700">
                myofascial release stretch service
              </Link>{" "}
              by maintaining tissue quality between sessions. Five to ten minutes of daily foam rolling can significantly
              improve your flexibility, reduce muscle soreness, and enhance recovery.
            </p>
            <p>
              <strong>Key technique tips:</strong> Roll slowly (about 1 inch per second). When you find a tender spot,
              pause and hold pressure for 20-30 seconds until the tenderness decreases. Never roll directly on joints or
              bones. Breathe deeply and relax into the roller rather than tensing against it. Focus on major muscle
              groups: quads, hamstrings, IT band, calves, upper back (thoracic spine), and glutes.
            </p>
            <p>
              Most people who own a foam roller use it incorrectly — rolling too fast, avoiding tender areas, or missing
              key spots. Our{" "}
              <Link href={getServiceUrl(services[7])} className="text-teal-600 underline hover:text-teal-700">
                foam rolling stretch service
              </Link>{" "}
              teaches you proper technique and provides a customized rolling routine for your specific body. This is an
              investment that pays off every single day because once you know the technique, you can maintain your
              flexibility gains at home between professional sessions.
            </p>
          </div>

          <h3 className="mt-10 text-2xl font-bold text-slate-900 font-heading">
            Compression Garments
          </h3>
          <div className="mt-4 space-y-4 text-base leading-relaxed text-slate-700">
            <p>
              Compression socks, sleeves, and garments apply graduated pressure to your muscles, improving blood flow
              and reducing swelling. They are particularly useful for recovery after long periods of standing or walking
              (a daily reality nationwide) and after intense exercise. Wearing compression socks on long flights, after long
              walks, or during post-stretch service recovery can reduce leg fatigue and swelling by 15-25%.
            </p>
          </div>

          <h3 className="mt-10 text-2xl font-bold text-slate-900 font-heading">
            Epsom Salt Baths
          </h3>
          <div className="mt-4 space-y-4 text-base leading-relaxed text-slate-700">
            <p>
              Epsom salt (magnesium sulfate) dissolved in warm bath water provides transdermal magnesium absorption.
              While the research on skin absorption of magnesium is still developing, the practical evidence from
              thousands of athletes and wellness practitioners is overwhelmingly positive. A 20-minute Epsom salt bath
              (2 cups of Epsom salt in a warm bath) after an intense stretch service session or workout promotes muscle
              relaxation, reduces soreness, and improves sleep quality.
            </p>
            <p>
              If your NYC apartment does not have a bathtub (many do not), an Epsom salt foot soak provides similar
              benefits for your feet and lower legs — the areas that take the biggest beating from NYC walking. Fill a
              basin with warm water and 1 cup of Epsom salt, soak your feet for 15-20 minutes, and combine with the
              evening stretch routine for maximum recovery.
            </p>
          </div>

          <h3 className="mt-10 text-2xl font-bold text-slate-900 font-heading">
            Active Recovery Days
          </h3>
          <div className="mt-4 space-y-4 text-base leading-relaxed text-slate-700">
            <p>
              Active recovery means moving your body gently on rest days rather than being completely sedentary. Light
              walking, gentle swimming, easy cycling, yoga, or a{" "}
              <Link href={getServiceUrl(services[4])} className="text-teal-600 underline hover:text-teal-700">
                passive stretch service
              </Link>{" "}
              session are all excellent active recovery options. The goal is to promote blood flow and lymphatic drainage
              without adding stress to your muscles. Research consistently shows that active recovery reduces soreness
              faster than complete rest. Your body recovers through movement, not through inactivity.
            </p>
          </div>

          <h3 className="mt-10 text-2xl font-bold text-slate-900 font-heading">
            Professional Recovery Stretch Service
          </h3>
          <div className="mt-4 space-y-4 text-base leading-relaxed text-slate-700">
            <p>
              Our{" "}
              <Link href={getServiceUrl(services[8])} className="text-teal-600 underline hover:text-teal-700">
                recovery stretch service
              </Link>{" "}
              is specifically designed for post-activity recovery. Whether you just finished a marathon, spent a day
              walking 20,000 steps as a tourist, completed a heavy gym session, or survived a stressful work week, a
              recovery stretch session combines gentle stretching, light myofascial work, and PNF techniques calibrated
              for your post-activity state. The result: 40-60% faster recovery, significantly reduced next-day soreness,
              and maintained range of motion that would otherwise decrease after intense activity.
            </p>
          </div>

          <h3 className="mt-10 text-2xl font-bold text-slate-900 font-heading">
            When to Rest vs. When to Move
          </h3>
          <div className="mt-4 space-y-4 text-base leading-relaxed text-slate-700">
            <p>
              <strong>Rest (do not stretch or exercise) when:</strong> You have acute pain (sharp, stabbing, or burning
              sensations), a fresh injury (first 48-72 hours), fever or illness, severe muscle soreness that affects
              your walking pattern, or your healthcare provider has advised rest.
            </p>
            <p>
              <strong>Move gently (light stretching, walking) when:</strong> You have general muscle soreness from
              activity, mild stiffness from sitting or sleeping, moderate tightness that improves with movement, or you
              are on a rest day from intense exercise.
            </p>
            <p>
              <strong>Stretch normally when:</strong> You feel general tightness without pain, your body is warm and
              responsive, you are not injured or ill, and you have been cleared for activity by your healthcare
              provider if you have any medical concerns. If you are unsure, start with gentle movement and see how your
              body responds. Your stretch service therapist can assess your readiness at the beginning of any session and
              adjust the intensity accordingly.
            </p>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          SECTION 10 — BUILDING YOUR PERSONALIZED DAILY WELLNESS PLAN
      ══════════════════════════════════════════════ */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-3xl font-bold text-slate-900 font-heading">
            Building Your Personalized Daily Wellness Plan
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-700">
            All of the information in this guide means nothing if you cannot apply it to your actual life. New York City
            is a demanding place, and your wellness plan needs to fit YOUR schedule, YOUR lifestyle, and YOUR body. Here
            are five sample daily schedules for different NYC life situations, followed by a framework for building your
            own personalized plan.
          </p>

          <h3 className="mt-10 text-2xl font-bold text-slate-900 font-heading">
            Sample Schedule: 20-Something NYC Professional
          </h3>
          <div className="mt-4 rounded-xl border border-teal-200/60 bg-white p-6">
            <p className="mb-3 text-sm italic text-slate-500">
              Tech worker in Manhattan, works 9-6, lives in a walkup in the East Village, goes to the gym 3-4x per week
            </p>
            <div className="space-y-3 text-sm text-slate-700">
              <div className="flex gap-3">
                <span className="w-20 shrink-0 font-bold text-teal-700">6:30 AM</span>
                <span>Wake up, drink 16 oz water with lemon</span>
              </div>
              <div className="flex gap-3">
                <span className="w-20 shrink-0 font-bold text-teal-700">6:35 AM</span>
                <span>5-minute morning stretch routine</span>
              </div>
              <div className="flex gap-3">
                <span className="w-20 shrink-0 font-bold text-teal-700">7:00 AM</span>
                <span>Anti-inflammatory breakfast (eggs, avocado, berries)</span>
              </div>
              <div className="flex gap-3">
                <span className="w-20 shrink-0 font-bold text-teal-700">7:30 AM</span>
                <span>Gym session: strength training with full range of motion + 10-min post-workout stretch</span>
              </div>
              <div className="flex gap-3">
                <span className="w-20 shrink-0 font-bold text-teal-700">8:30 AM</span>
                <span>Post-workout protein shake with collagen, walk to work (active commute)</span>
              </div>
              <div className="flex gap-3">
                <span className="w-20 shrink-0 font-bold text-teal-700">9:00-6:00</span>
                <span>Work — movement snacks every 30 min, sit-stand alternation, hydrate throughout</span>
              </div>
              <div className="flex gap-3">
                <span className="w-20 shrink-0 font-bold text-teal-700">12:30 PM</span>
                <span>Anti-inflammatory lunch (salmon, greens), 10-minute walk outside</span>
              </div>
              <div className="flex gap-3">
                <span className="w-20 shrink-0 font-bold text-teal-700">6:30 PM</span>
                <span>Walk home (active commute), dinner (grilled chicken, vegetables, brown rice)</span>
              </div>
              <div className="flex gap-3">
                <span className="w-20 shrink-0 font-bold text-teal-700">9:30 PM</span>
                <span>15-minute evening stretch routine + 5-min diaphragmatic breathing</span>
              </div>
              <div className="flex gap-3">
                <span className="w-20 shrink-0 font-bold text-teal-700">10:30 PM</span>
                <span>Magnesium supplement, blackout curtains, sleep by 11:00 PM</span>
              </div>
              <div className="flex gap-3">
                <span className="w-20 shrink-0 font-bold text-teal-700">Weekly</span>
                <span>1 professional stretch service session (Tuesday or Thursday evening)</span>
              </div>
            </div>
          </div>

          <h3 className="mt-10 text-2xl font-bold text-slate-900 font-heading">
            Sample Schedule: 40-Something Parent in Brooklyn
          </h3>
          <div className="mt-4 rounded-xl border border-teal-200/60 bg-white p-6">
            <p className="mb-3 text-sm italic text-slate-500">
              Remote worker, two kids in school, lives in Park Slope, limited gym time, chronic lower back pain from years
              of desk work
            </p>
            <div className="space-y-3 text-sm text-slate-700">
              <div className="flex gap-3">
                <span className="w-20 shrink-0 font-bold text-teal-700">6:00 AM</span>
                <span>Wake before kids, 16 oz water, 8-minute morning stretch routine (extended for hip flexors and back)</span>
              </div>
              <div className="flex gap-3">
                <span className="w-20 shrink-0 font-bold text-teal-700">6:30 AM</span>
                <span>Anti-inflammatory breakfast with family, morning supplements (fish oil, vitamin D, magnesium)</span>
              </div>
              <div className="flex gap-3">
                <span className="w-20 shrink-0 font-bold text-teal-700">7:30 AM</span>
                <span>Walk kids to school through Prospect Park (active commute, fresh air, 30-min walk)</span>
              </div>
              <div className="flex gap-3">
                <span className="w-20 shrink-0 font-bold text-teal-700">8:30-3:00</span>
                <span>Remote work — sit-stand desk alternation, movement breaks every 30 min, hydrate</span>
              </div>
              <div className="flex gap-3">
                <span className="w-20 shrink-0 font-bold text-teal-700">12:00 PM</span>
                <span>Walk around the block during lunch, anti-inflammatory meal</span>
              </div>
              <div className="flex gap-3">
                <span className="w-20 shrink-0 font-bold text-teal-700">3:00 PM</span>
                <span>Pick up kids, walk home through Prospect Park</span>
              </div>
              <div className="flex gap-3">
                <span className="w-20 shrink-0 font-bold text-teal-700">4:00 PM</span>
                <span>Home bodyweight workout (20 min: squats, lunges, push-ups, dead hangs, planks)</span>
              </div>
              <div className="flex gap-3">
                <span className="w-20 shrink-0 font-bold text-teal-700">7:00 PM</span>
                <span>Family dinner (salmon, vegetables, sweet potatoes)</span>
              </div>
              <div className="flex gap-3">
                <span className="w-20 shrink-0 font-bold text-teal-700">9:00 PM</span>
                <span>Evening stretch routine + foam rolling (15 min) + Epsom salt foot soak</span>
              </div>
              <div className="flex gap-3">
                <span className="w-20 shrink-0 font-bold text-teal-700">10:00 PM</span>
                <span>Magnesium, lights out</span>
              </div>
              <div className="flex gap-3">
                <span className="w-20 shrink-0 font-bold text-teal-700">Weekly</span>
                <span>1 stretch service session while kids are at school (Wednesday 10:00 AM, at-home session)</span>
              </div>
            </div>
          </div>

          <h3 className="mt-10 text-2xl font-bold text-slate-900 font-heading">
            Sample Schedule: 60+ Senior in Queens
          </h3>
          <div className="mt-4 rounded-xl border border-teal-200/60 bg-white p-6">
            <p className="mb-3 text-sm italic text-slate-500">
              Retired, lives in Astoria, deals with arthritis in knees and shoulders, focused on maintaining independence
              and preventing falls
            </p>
            <div className="space-y-3 text-sm text-slate-700">
              <div className="flex gap-3">
                <span className="w-20 shrink-0 font-bold text-teal-700">7:00 AM</span>
                <span>Wake up, 16 oz warm water with lemon, morning supplements (vitamin D, magnesium, fish oil, collagen)</span>
              </div>
              <div className="flex gap-3">
                <span className="w-20 shrink-0 font-bold text-teal-700">7:15 AM</span>
                <span>10-minute gentle morning stretch (chair-assisted), including joint circles and balance work</span>
              </div>
              <div className="flex gap-3">
                <span className="w-20 shrink-0 font-bold text-teal-700">8:00 AM</span>
                <span>Anti-inflammatory breakfast (oatmeal with walnuts, blueberries, and cinnamon)</span>
              </div>
              <div className="flex gap-3">
                <span className="w-20 shrink-0 font-bold text-teal-700">9:00 AM</span>
                <span>Morning walk in Astoria Park (30-45 minutes, at a comfortable pace)</span>
              </div>
              <div className="flex gap-3">
                <span className="w-20 shrink-0 font-bold text-teal-700">10:30 AM</span>
                <span>Light activities, errands, social time — stay active, avoid prolonged sitting</span>
              </div>
              <div className="flex gap-3">
                <span className="w-20 shrink-0 font-bold text-teal-700">12:30 PM</span>
                <span>Lunch (bone broth soup with vegetables, whole grain bread)</span>
              </div>
              <div className="flex gap-3">
                <span className="w-20 shrink-0 font-bold text-teal-700">2:00 PM</span>
                <span>Gentle swim at local pool or tai chi class (20-30 minutes)</span>
              </div>
              <div className="flex gap-3">
                <span className="w-20 shrink-0 font-bold text-teal-700">4:00 PM</span>
                <span>Afternoon tea with turmeric, light snack (nuts, fruit)</span>
              </div>
              <div className="flex gap-3">
                <span className="w-20 shrink-0 font-bold text-teal-700">6:00 PM</span>
                <span>Dinner (grilled fish, steamed vegetables, quinoa)</span>
              </div>
              <div className="flex gap-3">
                <span className="w-20 shrink-0 font-bold text-teal-700">8:00 PM</span>
                <span>Evening gentle stretch (10 min, chair-assisted) + warm Epsom salt bath</span>
              </div>
              <div className="flex gap-3">
                <span className="w-20 shrink-0 font-bold text-teal-700">9:30 PM</span>
                <span>Magnesium supplement, lights out</span>
              </div>
              <div className="flex gap-3">
                <span className="w-20 shrink-0 font-bold text-teal-700">Weekly</span>
                <span>2 gentle stretch service sessions (Monday and Thursday, at home in Queens)</span>
              </div>
            </div>
          </div>

          <h3 className="mt-10 text-2xl font-bold text-slate-900 font-heading">
            Sample Schedule: Tourist Visiting NYC for a Week
          </h3>
          <div className="mt-4 rounded-xl border border-teal-200/60 bg-white p-6">
            <p className="mb-3 text-sm italic text-slate-500">
              Visiting from out of state, staying at a hotel in Midtown, walking 20,000+ steps per day sightseeing,
              dealing with post-flight stiffness and tourist fatigue
            </p>
            <div className="space-y-3 text-sm text-slate-700">
              <div className="flex gap-3">
                <span className="w-20 shrink-0 font-bold text-teal-700">7:00 AM</span>
                <span>16 oz water (combat hotel room dehydration), 5-minute morning stretch in your hotel room</span>
              </div>
              <div className="flex gap-3">
                <span className="w-20 shrink-0 font-bold text-teal-700">7:30 AM</span>
                <span>Protein-rich hotel breakfast (eggs, fruit, yogurt — skip the pastries and orange juice)</span>
              </div>
              <div className="flex gap-3">
                <span className="w-20 shrink-0 font-bold text-teal-700">8:00-5:00</span>
                <span>Sightseeing — carry water, take stretch breaks every 2 hours (calf raises, hip flexor stretch against a wall, shoulder rolls), wear comfortable supportive shoes</span>
              </div>
              <div className="flex gap-3">
                <span className="w-20 shrink-0 font-bold text-teal-700">12:00 PM</span>
                <span>Anti-inflammatory lunch (fish, salad, vegetables — NYC has incredible food options)</span>
              </div>
              <div className="flex gap-3">
                <span className="w-20 shrink-0 font-bold text-teal-700">5:00 PM</span>
                <span>Return to hotel, legs-up-the-wall for 5 minutes, rehydrate</span>
              </div>
              <div className="flex gap-3">
                <span className="w-20 shrink-0 font-bold text-teal-700">6:00 PM</span>
                <span>
                  Stretch service session — either in your{" "}
                  <Link href="/hotel-stretching" className="text-teal-600 underline hover:text-teal-700">
                    hotel room
                  </Link>{" "}
                  or at an iconic location like Central Park
                </span>
              </div>
              <div className="flex gap-3">
                <span className="w-20 shrink-0 font-bold text-teal-700">7:30 PM</span>
                <span>Dinner out (NYC restaurant scene is world-class — choose wisely from an anti-inflammatory perspective)</span>
              </div>
              <div className="flex gap-3">
                <span className="w-20 shrink-0 font-bold text-teal-700">10:00 PM</span>
                <span>10-minute evening stretch in hotel room, Epsom salt foot soak in hotel sink or bathtub</span>
              </div>
              <div className="flex gap-3">
                <span className="w-20 shrink-0 font-bold text-teal-700">Trip Plan</span>
                <span>Book 2-3 stretch service sessions during a week-long trip: one on arrival day (to undo flight stiffness), one mid-trip (to keep you mobile), one before departure (to prepare for the flight home)</span>
              </div>
            </div>
          </div>

          <h3 className="mt-10 text-2xl font-bold text-slate-900 font-heading">
            Sample Schedule: NYC Athlete Training for a Marathon
          </h3>
          <div className="mt-4 rounded-xl border border-teal-200/60 bg-white p-6">
            <p className="mb-3 text-sm italic text-slate-500">
              Training for the NYC Marathon, runs 4-5 days per week, lives in the Upper West Side near Central Park,
              history of IT band and calf tightness
            </p>
            <div className="space-y-3 text-sm text-slate-700">
              <div className="flex gap-3">
                <span className="w-20 shrink-0 font-bold text-teal-700">5:30 AM</span>
                <span>Wake up, 16 oz water with electrolytes, pre-run snack (banana, toast with honey)</span>
              </div>
              <div className="flex gap-3">
                <span className="w-20 shrink-0 font-bold text-teal-700">5:45 AM</span>
                <span>Dynamic warm-up: leg swings, hip circles, high knees, butt kicks (10 min)</span>
              </div>
              <div className="flex gap-3">
                <span className="w-20 shrink-0 font-bold text-teal-700">6:00 AM</span>
                <span>Training run in Central Park (distance varies by training plan)</span>
              </div>
              <div className="flex gap-3">
                <span className="w-20 shrink-0 font-bold text-teal-700">7:30 AM</span>
                <span>Post-run: 10-min static stretch (hamstrings, calves, IT band, hip flexors, quads) + foam rolling</span>
              </div>
              <div className="flex gap-3">
                <span className="w-20 shrink-0 font-bold text-teal-700">8:00 AM</span>
                <span>Recovery breakfast: protein shake with banana, blueberries, collagen, and tart cherry juice</span>
              </div>
              <div className="flex gap-3">
                <span className="w-20 shrink-0 font-bold text-teal-700">8:30 AM</span>
                <span>Full breakfast: eggs, sweet potato, avocado, spinach</span>
              </div>
              <div className="flex gap-3">
                <span className="w-20 shrink-0 font-bold text-teal-700">Day</span>
                <span>Work + movement breaks, hydrate aggressively (100-120 oz water throughout the day), anti-inflammatory meals</span>
              </div>
              <div className="flex gap-3">
                <span className="w-20 shrink-0 font-bold text-teal-700">6:00 PM</span>
                <span>Cross-training on non-run days (swimming, cycling, strength training with focus on glutes and core)</span>
              </div>
              <div className="flex gap-3">
                <span className="w-20 shrink-0 font-bold text-teal-700">9:00 PM</span>
                <span>Evening stretch routine (15 min) + 5-min ice bath or contrast shower on hard training days</span>
              </div>
              <div className="flex gap-3">
                <span className="w-20 shrink-0 font-bold text-teal-700">10:00 PM</span>
                <span>Magnesium, collagen supplement, sleep by 10:30 (8+ hours critical during training)</span>
              </div>
              <div className="flex gap-3">
                <span className="w-20 shrink-0 font-bold text-teal-700">Weekly</span>
                <span>2 professional stretch service sessions: 1 recovery stretch after the long run, 1 PNF/active stretch mid-week to maintain range</span>
              </div>
            </div>
          </div>

          <h3 className="mt-10 text-2xl font-bold text-slate-900 font-heading">
            Combining All Elements
          </h3>
          <div className="mt-4 space-y-4 text-base leading-relaxed text-slate-700">
            <p>
              The power of this guide is not in any single element — it is in the combination. Stretching + nutrition +
              hydration + sleep + activity + stress management creates a synergistic effect where each element amplifies
              the others. Good nutrition reduces inflammation, which makes stretching more effective. Good hydration
              keeps fascia pliable, which makes your stretch service sessions produce better results. Good sleep allows
              your body to adapt to the stretching stimulus, which creates lasting flexibility gains. Stress management
              reduces the muscle tension that counteracts your stretching efforts. Daily movement maintains the gains
              between professional sessions.
            </p>
            <p>
              You do not need to be perfect at every element. Start with the two or three that are easiest for you and
              build from there. If hydration is easy, start there. If you already have good nutrition, focus on adding
              a morning stretch routine. If you have never tried professional stretching, book your first{" "}
              <Link href={getServiceUrl(services[0])} className="text-teal-600 underline hover:text-teal-700">
                assisted stretch service
              </Link>{" "}
              session and experience the difference that a professional can make. Every step you add to your wellness
              routine compounds over time.
            </p>
          </div>

          <h3 className="mt-10 text-2xl font-bold text-slate-900 font-heading">
            Weekly Schedule Template with Stretch Service Sessions
          </h3>
          <div className="mt-4 rounded-xl border border-teal-200/60 bg-white p-6">
            <div className="space-y-3 text-sm text-slate-700">
              <p className="font-bold text-teal-700 mb-2">Every Day:</p>
              <ul className="ml-4 list-disc space-y-1">
                <li>16 oz water upon waking</li>
                <li>5-10 min morning stretch routine</li>
                <li>Anti-inflammatory meals and snacks</li>
                <li>80-120 oz water throughout the day</li>
                <li>Movement breaks every 30 minutes if sitting</li>
                <li>10-15 min evening stretch routine</li>
                <li>7-8 hours quality sleep</li>
              </ul>
              <p className="font-bold text-teal-700 mt-4 mb-2">Weekly Additions:</p>
              <ul className="ml-4 list-disc space-y-1">
                <li>1-2 professional stretch service sessions ($99/hr or $89/hr weekly)</li>
                <li>2-3 strength training sessions (full range of motion)</li>
                <li>150 minutes moderate cardio (walking, running, swimming, cycling)</li>
                <li>5-10 min daily foam rolling</li>
                <li>1 active recovery day (walking + gentle stretching only)</li>
              </ul>
            </div>
          </div>

          <h3 className="mt-10 text-2xl font-bold text-slate-900 font-heading">
            Monthly Progression Plan
          </h3>
          <div className="mt-4 space-y-4 text-base leading-relaxed text-slate-700">
            <p>
              <strong>Weeks 1-4 (Foundation Phase):</strong> Establish the daily habits — morning hydration, morning
              stretch routine, anti-inflammatory eating, movement breaks, and evening stretch routine. Book your first
              stretch service session and establish a weekly rhythm. Expect: reduced morning stiffness, better sleep
              quality, and initial flexibility improvements within 2-3 weeks.
            </p>
            <p>
              <strong>Months 2-3 (Building Phase):</strong> Add strength training, increase stretching depth and
              duration, refine nutrition (eliminate inflammatory foods, increase anti-inflammatory foods), and build
              consistency with your stretch service schedule. Expect: noticeable flexibility gains, reduced chronic pain,
              improved exercise performance, and better stress management.
            </p>
            <p>
              <strong>Months 4-6 (Transformation Phase):</strong> By this point, your daily wellness habits are
              automatic. Your body has adapted. Flexibility improvements are compounding. Your stretch service therapist
              is working at deeper levels because your body allows it. Expect: significant range of motion improvements
              that friends and family notice, dramatic reduction in chronic pain, improved posture, better athletic
              performance, and a general feeling of ease in your body that may be entirely new to you.
            </p>
            <p>
              <strong>Beyond 6 months (Maintenance Phase):</strong> The foundation is set. Maintain your daily habits,
              continue weekly or bi-weekly stretch service sessions, and enjoy the compounding benefits. This is where
              the investment truly pays off — you have built a body that moves well, feels good, and responds to life in
              New York City with resilience rather than resistance.
            </p>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          SECTION 11 — FAQ
      ══════════════════════════════════════════════ */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">
            Wellness &amp; Flexibility FAQ
          </h2>
          <p className="mt-3 text-center text-base text-slate-600">
            Answers to the most common questions about nutrition, fitness, stretching, sleep, and recovery for
            flexibility.
          </p>
          <div className="mt-8 space-y-3">
            {wellnessFaqs.map((faq) => (
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

      {/* ══════════════════════════════════════════════
          SECTION 12 — EXPLORE SERVICES + INTERNAL LINKS
      ══════════════════════════════════════════════ */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">
            Explore Our Stretch Services
          </h2>
          <p className="mt-3 text-center text-base text-slate-600">
            Every service type referenced in this guide — available at your home, office, hotel, or any NYC location.
          </p>
          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((s) => (
              <Link key={s.slug} href={getServiceUrl(s)}>
                <div className="group rounded-xl border border-teal-200/60 bg-white p-5 transition-all hover:border-teal-400 hover:shadow-md">
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-teal-600 font-heading">
                    {s.name}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">{s.tagline}</p>
                </div>
              </Link>
            ))}
          </div>
          <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <Link href="/hotel-stretching" className="rounded-lg border border-teal-200/60 bg-white px-4 py-3 text-center text-sm font-semibold text-teal-700 transition-colors hover:bg-teal-50 font-cta">
              Hotel Stretching
            </Link>
            <Link href="/corporate-wellness" className="rounded-lg border border-teal-200/60 bg-white px-4 py-3 text-center text-sm font-semibold text-teal-700 transition-colors hover:bg-teal-50 font-cta">
              Corporate Wellness
            </Link>
            <Link href="/pricing" className="rounded-lg border border-teal-200/60 bg-white px-4 py-3 text-center text-sm font-semibold text-teal-700 transition-colors hover:bg-teal-50 font-cta">
              Pricing
            </Link>
            <Link href="/stretching-101" className="rounded-lg border border-teal-200/60 bg-white px-4 py-3 text-center text-sm font-semibold text-teal-700 transition-colors hover:bg-teal-50 font-cta">
              Stretching 101
            </Link>
            <Link href="/locations/manhattan" className="rounded-lg border border-teal-200/60 bg-white px-4 py-3 text-center text-sm font-semibold text-teal-700 transition-colors hover:bg-teal-50 font-cta">
              Manhattan
            </Link>
            <Link href="/locations/brooklyn" className="rounded-lg border border-teal-200/60 bg-white px-4 py-3 text-center text-sm font-semibold text-teal-700 transition-colors hover:bg-teal-50 font-cta">
              Brooklyn
            </Link>
            <Link href="/locations/queens" className="rounded-lg border border-teal-200/60 bg-white px-4 py-3 text-center text-sm font-semibold text-teal-700 transition-colors hover:bg-teal-50 font-cta">
              Queens
            </Link>
            <Link href="/locations/bronx" className="rounded-lg border border-teal-200/60 bg-white px-4 py-3 text-center text-sm font-semibold text-teal-700 transition-colors hover:bg-teal-50 font-cta">
              Bronx
            </Link>
            <Link href="/locations/staten-island" className="rounded-lg border border-teal-200/60 bg-white px-4 py-3 text-center text-sm font-semibold text-teal-700 transition-colors hover:bg-teal-50 font-cta">
              Staten Island
            </Link>
            <Link href="/parks" className="rounded-lg border border-teal-200/60 bg-white px-4 py-3 text-center text-sm font-semibold text-teal-700 transition-colors hover:bg-teal-50 font-cta">
              Parks
            </Link>
            <Link href="/parks/central-park" className="rounded-lg border border-teal-200/60 bg-white px-4 py-3 text-center text-sm font-semibold text-teal-700 transition-colors hover:bg-teal-50 font-cta">
              Central Park
            </Link>
            <Link href="/parks/prospect-park" className="rounded-lg border border-teal-200/60 bg-white px-4 py-3 text-center text-sm font-semibold text-teal-700 transition-colors hover:bg-teal-50 font-cta">
              Prospect Park
            </Link>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          SECTION 12 — FINAL CTA
      ══════════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 py-16">
        <div className="absolute inset-0 grid-bg opacity-20" />
        <div className="relative mx-auto max-w-3xl px-6 text-center">
          <div className="mb-6 flex justify-center">
          </div>
          <h2 className="text-3xl font-bold text-white font-heading">
            Ready to Transform Your Body?
          </h2>
          <p className="mt-4 text-lg text-white/80">
            You now have the complete playbook — morning routine, nutrition, hydration, fitness, sleep, stress
            management, recovery, and daily wellness planning. The one piece that ties it all together is professional
            stretch service. Our certified therapists come to your home, office, hotel, or any NYC location with
            everything needed for a transformative session.
          </p>
          <p className="mt-4 text-2xl font-bold text-teal-200 font-heading">
            $99/hour &middot; 10% off weekly sessions
          </p>
          <p className="mt-2 text-base text-white/70">
            7 days a week &middot; 7AM-10PM &middot; All five boroughs &middot; Same-day available
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
          <div className="mt-8">
            <Link
              href="/stretching-101"
              className="text-sm font-semibold text-teal-200 hover:text-white font-cta"
            >
              &larr; Back to Stretching 101
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
