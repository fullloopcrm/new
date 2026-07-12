import { safeJsonLd } from '@/lib/escape-html'
import Link from "next/link";
import type { Metadata } from "next";
import { getAllTips, getTipCategories } from "@/app/site/the-nyc-exterminator/_data/tips";
import {
  PHONE,
  SITE_URL,
  SITE_NAME,
  ADDRESS,
  getFAQPageSchema,
} from "@/app/site/the-nyc-exterminator/_lib/seo";
import CTAGroup from "@/app/site/the-nyc-exterminator/_components/CTAGroup";

const phonePlain = PHONE.replace(/-/g, "");

export const metadata: Metadata = {
  title: "NYC Pest Control Tips & Guide | Expert Advice from Licensed Exterminators",
  description:
    "Free expert pest control tips from licensed NYC exterminators. Cockroach prevention, bed bug detection, mouse-proofing, tenant rights, seasonal guides & more. Real advice that actually works — not generic fluff.",
  keywords:
    "pest control tips NYC, cockroach prevention tips, bed bug detection, mouse proof apartment, NYC tenant rights pest control, seasonal pest prevention, DIY pest control, natural pest control, restaurant pest control NYC",
  openGraph: {
    title: "NYC Pest Control Tips & Expert Guide | The NYC Exterminator",
    description:
      "Free expert pest control tips from licensed NYC exterminators. Real, actionable advice for cockroach prevention, bed bug detection, mouse-proofing, tenant rights, and more.",
    url: `${SITE_URL}/pest-control-tips`,
    siteName: SITE_NAME,
    type: "website",
    locale: "en_US",
  },
  alternates: {
    canonical: `${SITE_URL}/pest-control-tips`,
  },
};

export default function PestControlTipsPage() {
  const tips = getAllTips();
  const categories = getTipCategories();

  const masterFaqs = [
    {
      q: "Are these pest control tips from actual exterminators?",
      a: "Yes. Every tip, guide, and recommendation on this page comes from our team of NYS DEC-licensed pest control technicians with years of hands-on experience in NYC apartments, homes, and commercial properties. We see thousands of pest situations every year — this is what actually works.",
    },
    {
      q: "Will DIY pest control work for my situation?",
      a: "It depends on the pest and the severity. For prevention and minor issues (a few ants, drain flies, a single mouse sighting), DIY methods can be very effective. For established infestations of cockroaches, bed bugs, or significant rodent populations, professional treatment is almost always necessary. Our guides are honest about when DIY works and when you need to call a pro.",
    },
    {
      q: "Is natural pest control effective in NYC apartments?",
      a: "Some natural methods work well for prevention — sealing entry points, eliminating food and water sources, using diatomaceous earth in wall voids. But many popular 'natural remedies' (peppermint oil for mice, bay leaves for cockroaches, ultrasonic devices) have been scientifically debunked. Our natural pest control guide separates fact from fiction.",
    },
    {
      q: "How do I know if I need professional pest control or can handle it myself?",
      a: "If you've tried DIY methods for two weeks without improvement, if you're seeing pests during the day (indicating large populations), if you have bed bugs (DIY doesn't work for bed bugs — period), or if the problem involves building infrastructure (shared walls, plumbing), it's time for professional help. Our individual guides include specific 'when to call a pro' guidance for each situation.",
    },
    {
      q: "Can my landlord charge me for pest control in NYC?",
      a: "No. Under the NYC Housing Maintenance Code, your landlord is legally required to provide pest control and keep your apartment free of vermin at no additional cost to you. Read our complete NYC tenant rights guide for details on how to enforce this right, file complaints, and take action if your landlord refuses.",
    },
    {
      q: "What's the most important thing I can do to prevent pests in my NYC apartment?",
      a: "Three things make the biggest impact: (1) Fix every water leak — pests need water more than food, (2) Seal entry points around pipes under sinks with copper mesh and caulk, and (3) Store all food in sealed hard containers. Do these three things consistently and you'll prevent 80% of common NYC pest problems.",
    },
  ];

  return (
    <div className="text-white">
      {/* JSON-LD (LocalBusiness emitted globally in layout.tsx) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: safeJsonLd(getFAQPageSchema(masterFaqs)),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: safeJsonLd({
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: "NYC Pest Control Tips & Expert Guide",
            description:
              "Comprehensive pest control knowledge base from licensed NYC exterminators. Expert tips, DIY guides, prevention strategies, and tenant rights information.",
            url: `${SITE_URL}/pest-control-tips`,
            publisher: {
              "@type": "Organization",
              name: SITE_NAME,
              url: SITE_URL,
            },
            breadcrumb: {
              "@type": "BreadcrumbList",
              itemListElement: [
                {
                  "@type": "ListItem",
                  position: 1,
                  name: "Home",
                  item: SITE_URL,
                },
                {
                  "@type": "ListItem",
                  position: 2,
                  name: "Pest Control Tips",
                  item: `${SITE_URL}/pest-control-tips`,
                },
              ],
            },
          }),
        }}
      />

      {/* ── HERO ── */}
      <section className="bg-[#0A0A0A] pb-16 pt-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-green-500">
            Free Expert Knowledge &middot; From Licensed NYC Exterminators
          </p>
          <h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl">
            NYC Pest Control{" "}
            <span className="bg-gradient-to-r from-green-400 to-emerald-300 bg-clip-text text-transparent">
              Tips &amp; Expert Guide
            </span>
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-zinc-300">
            Real pest control advice from exterminators who work inside NYC apartments every single day. Not the generic &quot;keep your kitchen clean&quot; stuff you&apos;ve already read 50 times. Actual, specific, experience-tested tips that help you prevent, identify, and deal with every pest that calls New York City home.
          </p>
          <p className="mt-4 max-w-3xl text-zinc-400 leading-7">
            We built this guide because we believe in helping first. Most pest problems CAN be prevented with the right knowledge. And when prevention isn&apos;t enough? We&apos;re here. But let&apos;s try the free advice first.
          </p>
        </div>
      </section>

      {/* ── TRUST BAR ── */}
      <section className="border-y border-zinc-800 bg-zinc-900/80 py-5">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-8 px-4 text-center text-sm text-zinc-400 sm:px-6 lg:px-8">
          <span><strong className="text-white">{tips.length}</strong> Expert Guides</span>
          <span className="hidden text-zinc-700 sm:inline">&bull;</span>
          <span><strong className="text-white">Written by</strong> Licensed Exterminators</span>
          <span className="hidden text-zinc-700 sm:inline">&bull;</span>
          <span><strong className="text-white">NYC-Specific</strong> Advice</span>
          <span className="hidden text-zinc-700 sm:inline">&bull;</span>
          <span><strong className="text-white">100% Free</strong> No Strings Attached</span>
        </div>
      </section>

      {/* ── QUICK NAV ── */}
      <section className="bg-[#0A0A0A] py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">Jump to a Topic</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {categories.map((cat) => (
              <a
                key={cat}
                href={`#${cat.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:border-green-500/50 hover:text-green-400"
              >
                {cat}
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ── THE BIG PICTURE: WHAT EVERY NYC RESIDENT NEEDS TO KNOW ── */}
      <section className="bg-[#0A0A0A] py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-green-500">Start Here</p>
          <h2 className="mt-2 text-3xl font-bold sm:text-4xl">
            The <span className="text-green-500">Honest Truth</span> About Pest Control in NYC
          </h2>
          <div className="mt-8 grid gap-8 lg:grid-cols-2">
            <div className="space-y-5 text-zinc-300 leading-7">
              <p>
                Living in New York City means sharing space with pests. It&apos;s not a question of IF, it&apos;s a question of WHEN. The dense housing, aging infrastructure, massive food industry, and constant movement of people and goods make NYC one of the most pest-challenged environments in North America.
              </p>
              <p>
                But here&apos;s what most pest control websites won&apos;t tell you: <strong className="text-white">a huge percentage of common pest problems can be prevented or solved without calling an exterminator</strong>. A mouse that wandered in through a gap under your sink pipe? You can seal that yourself with $5 worth of copper mesh. Drain flies in the bathroom? Clean the drain with a brush and boiling water. Ants marching across the kitchen counter? Find their entry point and seal it.
              </p>
              <p>
                We&apos;re not saying this to talk ourselves out of business. We&apos;re saying it because it&apos;s true, and because we&apos;d rather you trust us for honest advice than for a hard sell. When you DO need professional help &mdash; bed bugs, established cockroach colonies, building-wide rodent problems &mdash; we want you to come to us because you trust us, not because we scared you into it.
              </p>
            </div>
            <div className="space-y-5 text-zinc-300 leading-7">
              <p>
                Every guide in this knowledge base follows the same philosophy: <strong className="text-white">help first</strong>. We tell you what actually works, what doesn&apos;t (even if it&apos;s popular on Pinterest), and exactly when DIY crosses the line into &quot;you need a professional.&quot; We include the specific products, techniques, and methods our own licensed exterminators recommend &mdash; the same ones we&apos;d tell a friend.
              </p>
              <p>
                These guides are written by technicians who are inside NYC apartments every single day. Not content writers in another state Googling &quot;pest control tips.&quot; When we say &quot;the most common cockroach entry point in NYC apartments is the gap around kitchen sink pipes,&quot; we know that because we see it 10 times a week, not because we read it somewhere.
              </p>
              <p>
                <strong className="text-white">The three pillars of NYC pest prevention:</strong>
              </p>
              <ol className="list-inside list-decimal space-y-2 text-sm">
                <li><strong className="text-white">Seal entry points</strong> &mdash; copper mesh, caulk, door sweeps, escutcheon plates</li>
                <li><strong className="text-white">Eliminate water sources</strong> &mdash; fix leaks, wipe sinks, drain standing water</li>
                <li><strong className="text-white">Store food properly</strong> &mdash; sealed hard containers, not bags and boxes</li>
              </ol>
              <p className="text-sm text-zinc-400">
                Do these three things consistently and you&apos;ll prevent 80% of common NYC pest problems. The guides below show you exactly how.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── PRO TIP ── */}
      <div className="border-y border-red-500/30 bg-[#2a0e0e] px-4 py-5 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl items-start gap-3">
          <span className="shrink-0 rounded-md bg-green-500/10 px-2 py-1 text-xs font-bold uppercase tracking-wider text-green-400">Pro Tip</span>
          <p className="text-sm leading-6 text-zinc-300">
            <strong className="text-white">Bookmark this page.</strong> We add new guides regularly based on the questions NYC residents ask us most. Every guide is written by the same licensed exterminators who treat {">"}25,000 NYC properties per year. This is the free advice we give our friends and family.
          </p>
        </div>
      </div>

      {/* ── ALL GUIDES BY CATEGORY ── */}
      <section className="bg-[#0A0A0A] py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-green-500">Deep Dive Guides</p>
          <h2 className="mt-2 text-3xl font-bold sm:text-4xl">
            Expert <span className="text-green-500">Pest Control Guides</span> by Topic
          </h2>
          <p className="mt-4 max-w-3xl text-zinc-300 leading-7">
            Each guide is a complete deep-dive written by our licensed exterminators. Real techniques, real product recommendations, and honest assessments of what works and what doesn&apos;t. Click any guide to read the full article.
          </p>

          <div className="mt-12 space-y-14">
            {categories.map((category) => {
              const categoryTips = tips.filter((t) => t.category === category);
              return (
                <div key={category} id={category.toLowerCase().replace(/[^a-z0-9]+/g, "-")}>
                  <h3 className="text-2xl font-bold text-white">{category}</h3>
                  <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {categoryTips.map((tip) => (
                      <Link
                        key={tip.slug}
                        href={`/pest-control-tips/${tip.slug}`}
                        className="group rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 transition-all hover:border-green-500/50 hover:-translate-y-0.5"
                      >
                        <span className="text-xs font-semibold uppercase tracking-wider text-green-500">{tip.category}</span>
                        <h4 className="mt-2 text-lg font-semibold text-white group-hover:text-green-400">{tip.title}</h4>
                        <p className="mt-3 text-sm leading-6 text-zinc-400 line-clamp-3">{tip.intro}</p>
                        <span className="mt-4 inline-flex items-center text-sm font-semibold text-green-500 group-hover:text-green-400">
                          Read full guide &rarr;
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── MID CTA ── */}
      <CTAGroup
        variant="mid"
        title="Tried the Tips and Still Have Pests?"
        subtitle="No judgment. Some pest problems need professional tools and expertise. Text us a photo of what you're dealing with — we'll give you an honest assessment for free."
      />

      {/* ── THE 10 RULES ── */}
      <section className="bg-[#0A0A0A] py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-green-500">The Essentials</p>
          <h2 className="mt-2 text-3xl font-bold sm:text-4xl">
            10 Rules of <span className="text-green-500">NYC Pest Prevention</span>
          </h2>
          <p className="mt-4 max-w-3xl text-zinc-300 leading-7">
            If you read nothing else on this entire page, read these ten rules. Follow them and you&apos;ll have fewer pest problems than 90% of NYC apartments.
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {[
              {
                num: "01",
                rule: "Fix Every Leak",
                detail: "Cockroaches survive a month without food but die in a week without water. That dripping faucet is a pest oasis. Fix it today.",
              },
              {
                num: "02",
                rule: "Seal Under Every Sink",
                detail: "The gap around pipes under your kitchen and bathroom sinks is the #1 pest entry point in NYC apartments. Copper mesh + caulk. Five minutes. Done.",
              },
              {
                num: "03",
                rule: "Store Food in Hard Containers",
                detail: "Cardboard boxes, plastic bags, and twist-tied bags are NOT sealed. Glass jars and hard plastic containers with snap-on lids. Everything.",
              },
              {
                num: "04",
                rule: "Take Trash Out Daily",
                detail: "Not when it's full. Daily. A bag of garbage sitting overnight in a warm NYC apartment is an open invitation to every pest in your building.",
              },
              {
                num: "05",
                rule: "Wipe Kitchen Surfaces Before Bed",
                detail: "Cockroach peak activity is midnight to 4 AM. A clean, dry kitchen at bedtime means nothing to eat and nothing to drink. They'll go elsewhere.",
              },
              {
                num: "06",
                rule: "Install a Door Sweep",
                detail: "The gap under your apartment door fits a mouse. A $12 door sweep from the hardware store closes that highway permanently.",
              },
              {
                num: "07",
                rule: "Never Use Bug Bombs in an Apartment",
                detail: "Foggers scatter pests into your neighbors' units, contaminate surfaces, trigger fire alarms, and don't reach where pests actually hide. Professional gel baits are 10x more effective.",
              },
              {
                num: "08",
                rule: "Inspect Before You Move In",
                detail: "Check for cockroach droppings, mouse droppings, and bed bug evidence before your furniture goes in. Treating an empty apartment is dramatically easier and cheaper.",
              },
              {
                num: "09",
                rule: "Report Problems in Writing",
                detail: "Text or email your landlord, not a phone call. You need a dated paper trail if you ever need to file an HPD complaint or go to Housing Court.",
              },
              {
                num: "10",
                rule: "Don't Wait",
                detail: "Every pest problem gets worse with time. One mouse becomes ten. Ten cockroaches become a thousand. Address it this week, not next month.",
              },
            ].map((item) => (
              <div key={item.num} className="flex gap-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-600 text-sm font-bold text-white">
                  {item.num}
                </span>
                <div>
                  <h3 className="font-semibold text-white">{item.rule}</h3>
                  <p className="mt-1 text-sm leading-6 text-zinc-400">{item.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── DID YOU KNOW ── */}
      <div className="border-y border-red-500/30 bg-[#2a0e0e] px-4 py-5 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl items-start gap-3">
          <span className="shrink-0 rounded-md bg-green-500/10 px-2 py-1 text-xs font-bold uppercase tracking-wider text-green-400">Did You Know?</span>
          <p className="text-sm leading-6 text-zinc-300">
            <strong className="text-white">German cockroaches are the fastest-reproducing common pest in NYC.</strong> A single female produces an egg case every 28 days containing 30-48 eggs. In ideal conditions (your warm apartment), one cockroach can lead to 30,000 offspring in a year. That&apos;s why &quot;I&apos;ll deal with it later&quot; is the most expensive pest control decision you can make.
          </p>
        </div>
      </div>

      {/* ── PEST QUICK REFERENCE ── */}
      <section className="bg-[#2A2A2A] py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-green-500">Quick Reference</p>
          <h2 className="mt-2 text-3xl font-bold sm:text-4xl">
            NYC Pest <span className="text-green-500">Cheat Sheet</span>
          </h2>
          <p className="mt-4 max-w-3xl text-zinc-300 leading-7">
            Quick-hit guidance for the most common pest situations in NYC. For the full deep-dive, click through to the relevant guide.
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                pest: "Cockroaches (small, tan)",
                diy: "Deep-clean behind stove and fridge. Fix leaks. Seal pipe gaps under sinks. Store food in hard containers.",
                pro: "Seeing them during the day? Multiple sightings? You need professional gel bait treatment.",
                link: "/pest-control-tips/how-to-identify-cockroaches-in-nyc-apartment",
              },
              {
                pest: "Mice",
                diy: "Seal every gap with copper mesh + caulk. Set snap traps with peanut butter along walls. Remove food sources.",
                pro: "Catching mice for 2+ weeks despite sealing? Major entry point you can't find, or building-level issue.",
                link: "/pest-control-tips/how-to-mouse-proof-your-nyc-apartment",
              },
              {
                pest: "Bed Bugs",
                diy: "Don't DIY. Inspect to confirm (check mattress seams, box spring, headboard). Don't throw out mattress. Don't sleep in different room.",
                pro: "Any confirmed evidence = call a pro immediately. DIY does not work for bed bugs. Period.",
                link: "/pest-control-tips/bed-bug-signs-how-to-check-your-nyc-apartment",
              },
              {
                pest: "Drain Flies",
                diy: "Clean drain with a brush. Pour boiling water daily for a week. Use enzyme drain cleaner. Keep all drains flowing.",
                pro: "Still have them after 3 weeks of cleaning? Broken pipe or hidden moisture source needs investigation.",
                link: "/pest-control-tips/how-to-get-rid-of-drain-flies-in-nyc-bathroom",
              },
              {
                pest: "Ants",
                diy: "Find entry point and seal with caulk. Clean ant trail with vinegar. Remove food sources. Bait with gel bait near trail.",
                pro: "Carpenter ants (large, black, found near wood) need professional treatment to prevent structural damage.",
                link: "/pest-control-tips/what-attracts-cockroaches-to-nyc-apartments",
              },
              {
                pest: "Rats (outdoor)",
                diy: "Report to 311. Talk to building management about trash containerization. Seal foundation gaps.",
                pro: "Rats INSIDE the building? Professional exclusion and baiting needed immediately.",
                link: "/pest-control-tips/how-to-deal-with-rats-outside-your-nyc-building",
              },
            ].map((item) => (
              <div key={item.pest} className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-6">
                <h3 className="font-semibold text-white">{item.pest}</h3>
                <div className="mt-3 space-y-3 text-sm">
                  <div>
                    <span className="font-semibold text-green-400">Try first: </span>
                    <span className="text-zinc-400">{item.diy}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-yellow-400">Call a pro when: </span>
                    <span className="text-zinc-400">{item.pro}</span>
                  </div>
                </div>
                <Link
                  href={item.link}
                  className="mt-4 inline-flex items-center text-sm font-semibold text-green-500 hover:text-green-400"
                >
                  Full guide &rarr;
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── COMMON MYTHS ── */}
      <section className="bg-[#0A0A0A] py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-green-500">Myth vs. Reality</p>
          <h2 className="mt-2 text-3xl font-bold sm:text-4xl">
            Pest Control <span className="text-green-500">Myths</span> That Cost NYC Residents Money
          </h2>

          <div className="mt-10 space-y-4">
            {[
              {
                myth: "Peppermint oil keeps mice away.",
                reality: "Multiple university studies have debunked this. Mice may briefly avoid concentrated peppermint oil but habituate within hours. If peppermint repelled mice, every candy shop would be mouse-free. Seal entry points with copper mesh instead — it actually works.",
              },
              {
                myth: "If you keep your apartment clean, you won't get pests.",
                reality: "Cleanliness helps, but it's not the whole picture. German cockroaches travel through shared walls and plumbing regardless of how clean your apartment is. Mice enter through structural gaps. Bed bugs hitchhike on luggage and furniture. Prevention requires sealing entry points, not just cleaning.",
              },
              {
                myth: "Bug bombs (foggers) are an effective way to treat your apartment.",
                reality: "Bug bombs are one of the WORST things you can do. They scatter cockroaches to new areas (including your neighbors' apartments through shared walls), contaminate every surface in your kitchen, can trigger building fire alarms, and don't reach into the cracks where pests actually live. Professional gel baits are dramatically more effective.",
              },
              {
                myth: "If you see one cockroach, it doesn't mean you have an infestation.",
                reality: "Depends on the species. One large American cockroach near a drain might be a stray. But one German cockroach (small, tan, with stripes) almost certainly means hundreds are hiding in your walls. German cockroaches don't wander in from outside — they live and breed indoors.",
              },
              {
                myth: "You should throw out your mattress if you have bed bugs.",
                reality: "A professionally treated mattress is perfectly safe. Throwing it out wastes hundreds of dollars, spreads bugs through your hallway during removal, and doesn't solve the problem — bed bugs live in the bed frame, baseboards, outlet covers, and wall voids, not just the mattress.",
              },
              {
                myth: "Ultrasonic pest repellers work.",
                reality: "They don't. This has been tested exhaustively by university entomology departments. Pests may briefly react to the sound, then completely ignore it. The FTC has taken legal action against some manufacturers for false advertising. Save your $30.",
              },
            ].map((item, i) => (
              <div key={i} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 shrink-0 rounded-md bg-red-500/10 px-2 py-1 text-xs font-bold uppercase tracking-wider text-red-400">Myth</span>
                  <div>
                    <p className="font-semibold text-white">&quot;{item.myth}&quot;</p>
                    <p className="mt-2 text-sm leading-6 text-zinc-400"><strong className="text-green-400">Reality: </strong>{item.reality}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRE-FAQ CTA ── */}
      <CTAGroup variant="preFaq" />

      {/* ── FAQ ── */}
      <section className="bg-[#0A0A0A] py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-green-500">Common Questions</p>
          <h2 className="mt-2 text-3xl font-bold sm:text-4xl">
            Pest Control Tips <span className="text-green-500">FAQ</span>
          </h2>

          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {masterFaqs.map((faq, i) => (
              <div key={i} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
                <h3 className="font-semibold text-white">{faq.q}</h3>
                <p className="mt-3 text-sm leading-6 text-zinc-400">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ABOUT OUR EXPERTISE ── */}
      <section className="bg-[#2A2A2A] py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-green-500">Who Wrote This</p>
              <h2 className="mt-2 text-3xl font-bold sm:text-4xl">
                Advice from <span className="text-green-500">Real NYC Exterminators</span>
              </h2>
              <p className="mt-4 text-zinc-300 leading-7">
                Every guide in this knowledge base is written by our team of NYS DEC-licensed pest control technicians who work inside NYC apartments and commercial properties every day. We&apos;re not content writers Googling pest facts &mdash; we&apos;re the people pulling refrigerators away from walls, sealing pipe gaps with copper mesh, and placing gel bait in the exact crevices where cockroaches hide.
              </p>
              <p className="mt-4 text-zinc-300 leading-7">
                We&apos;ve treated over 25,000 NYC properties. We know what works, what doesn&apos;t, and &mdash; most importantly &mdash; when DIY crosses the line into &quot;you really need to call someone.&quot; These guides reflect that experience honestly.
              </p>
              <div className="mt-6 flex flex-wrap gap-4">
                <a
                  href={`sms:${phonePlain}`}
                  className="inline-flex items-center rounded-lg bg-green-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-500"
                >
                  Text Us a Question
                </a>
                <Link
                  href="/about"
                  className="inline-flex items-center text-sm font-semibold text-green-500 hover:text-green-400"
                >
                  About our team &rarr;
                </Link>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { stat: "25K+", label: "Properties Treated" },
                { stat: "4.9", label: "Average Rating" },
                { stat: "NYS DEC", label: "Licensed & Insured" },
                { stat: "24/7", label: "Available Year-Round" },
              ].map((item) => (
                <div key={item.label} className="rounded-xl border border-zinc-700 bg-zinc-800/50 px-4 py-6 text-center">
                  <div className="text-2xl font-extrabold text-green-500">{item.stat}</div>
                  <div className="mt-1 text-xs font-medium text-zinc-400">{item.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <CTAGroup
        variant="final"
        title="Can't Solve It Yourself? We're Here."
        subtitle="No pressure, no hard sell. Text us a photo of your pest problem and we'll tell you honestly what you're dealing with and whether you need professional help. Free assessment, always."
      />
    </div>
  );
}
