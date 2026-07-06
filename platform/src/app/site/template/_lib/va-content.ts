/**
 * Content generator for the national VA SEO matrix. Expands a (service, location)
 * pair into long-form, seeded-variable prose so service pages (~5k words) and
 * geo×service pages (~3k words) read with real depth instead of one template with
 * the city swapped.
 *
 * HONEST CAVEAT: programmatic near-duplicate pages at national scale are the
 * classic "doorway page" pattern. Seeded variation (below) reduces near-dup, but
 * the durable fix is genuinely unique local signal (real reviews, local data).
 * Treat generated depth as a floor, not a substitute for that.
 */
import type { VAService } from '@/app/site/template/_data/va-services'
import { VA_SERVICES } from '@/app/site/template/_data/va-services'
import type { USLocation } from '@/app/site/template/_data/us-locations'

function hashCode(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

/** Deterministically pick one of arr, seeded by a string (stable per page). */
function pick<T>(arr: T[], seed: string, offset = 0): T {
  return arr[(hashCode(seed) + offset) % arr.length]
}

/** Deterministically order arr, seeded — so lists differ per page without RNG. */
function shuffle<T>(arr: T[], seed: string): T[] {
  return arr
    .map((v, i) => ({ v, k: hashCode(seed + i) }))
    .sort((a, b) => a.k - b.k)
    .map((x) => x.v)
}

export interface Section {
  heading: string
  paragraphs: string[]
}

const REMOTE_TRUST = [
  'Because the work is remote, none of it depends on where you are — only on the person doing it. Ours are fluent, professional English speakers based in the Philippines, matched to your business and backed by an AI knowledge panel built on how you operate.',
  'Remote does not mean distant. Your assistant works your hours, in your systems, under your name — the only difference from an in-house hire is that you skip the payroll tax, the desk, and the four-figure monthly cost.',
  'A great virtual assistant closes the distance completely. Every hour is tracked through Quo so you see exactly what got done, and the work flows straight into your tools — including FullLoop CRM — so nothing lives in a silo.',
]

const PRICING_PROSE = [
  'The rate is eight dollars an hour, with a fifty-dollar-per-week minimum. Prefer a set plan? Starter is ten hours a week (about $320/mo), Part-Time is twenty hours (about $640/mo), and Full-Time is forty hours (about $1,280/mo). Every plan is the same eight-dollar rate — you are only choosing how many hours you want each week.',
  'Compare that to hiring in-house. A U.S. administrative employee costs far more than their salary once you add payroll tax, benefits, paid time off, equipment, software, office space, and the overhead of managing them — routinely north of forty or fifty thousand dollars a year. A full-time virtual assistant delivers comparable work for roughly fifteen thousand, with none of the fixed commitment.',
  'You pay only for the hours you actually use, and you can scale up or down as your business changes — no severance, no awkward layoffs, no fixed cost hanging over a slow month. Start with ten hours a week, and if it is working, grow it.',
]

const HUMAN_PROSE = [
  'Every assistant is a real, fluent-English professional from the Philippines — not an AI voice bot and not a rotating call center reading a script. American customers can tell the difference within the first few seconds of a call, and so can you. People want to talk to people, especially when they are reaching out because something matters.',
  'That human quality is the whole point. A robot answers and loses the relationship; a stranger reading a script takes a message and stops there. A dedicated assistant who knows your business carries the task through to done — and represents your brand like a member of your team, because that is exactly what they are.',
]

const AMERICAN_PROSE = [
  'You are working with an American-owned and American-managed company headquartered in New York City and serving over 100 businesses across the United States. That means American accountability: a U.S. company held to U.S. standards, a manager who owns the relationship, and a bench of talent so a sick day or a departure never darks your front desk.',
  'It also keeps the story you tell your own customers honest. You can truthfully say you work with a U.S. company — local roots, nationwide reach — delivering its service through a carefully selected, fluent, remote team. World-class talent with American oversight, at a price that actually works.',
]

const KNOWLEDGE_PROSE = [
  'Before your assistant starts, we build an AI-powered knowledge panel on your business — documenting your services, your pricing, your process, your tone, and your preferences. Instead of spending weeks getting up to speed and asking you the same questions over and over, your assistant answers like an insider from day one and stays consistent as the work grows.',
  'From there, the work runs through the tools you already use. Every hour is tracked transparently through Quo, and tasks flow straight into your calendar, your inbox, and your CRM — including FullLoop CRM — so nothing has to be re-entered and nothing gets lost. The point of an assistant is to remove friction, not add a place you have to check.',
]

const REMOTE_CASE = [
  'A decade ago, hiring someone you would never meet in person felt like a leap. Today it is simply how modern businesses operate. The tools for working together remotely are mature and everywhere, and an entire generation of professionals has spent their whole careers delivering excellent work from wherever they are. The question is no longer whether remote work works — it is why you would pay a premium for a desk in your office when the same work, done just as well, is available without it.',
  'For a small business the logic is even sharper. You are not trying to build a campus; you are trying to get work done without drowning. A remote assistant gives you exactly that: capacity on demand, without the fixed cost and long commitment of a local hire. You are not renting square footage or buying another computer or navigating another set of benefits — you are buying hours of skilled help, and only the hours you actually need.',
]

const GREAT_VA = [
  'Fluent, natural English is the foundation for anything customer-facing. It is not enough to be understood; a great assistant is a pleasure to talk to, writes clean and warm emails, and represents your brand in a way that makes your customers feel taken care of. That is exactly why we staff from the Philippines, where professional English fluency is the norm, and select for communication above almost everything else.',
  'Reliability is the quality owners come to value most. A great assistant shows up, follows through, and does not need to be chased — the work gets done whether or not you are watching, which is the entire point of delegating. Transparent tracking through Quo exists precisely so that reliability is visible rather than assumed, and a genuine service ethic is what turns a task-doer into a real team member who notices what needs doing and cares about the outcome.',
]

const SECURITY_PROSE = [
  'Your assistant works within your systems under your access controls, exactly the way an in-house employee would. You decide what they can see and do, and you can adjust it at any time. Because every hour is tracked through Quo, there is always a clear record of what was worked on — accountability is built into the arrangement rather than left to trust alone.',
  'The deeper peace of mind comes from continuity. A lone freelancer can vanish, get sick, or move on, and suddenly your work goes dark. A managed, American-owned service is built so that never happens: coverage is handled, standards are maintained, and the knowledge panel means your business context is documented rather than living only in one person’s head.',
]

const FIRST_WEEK = [
  'Getting started is deliberately simple, because the whole point is to remove work from your plate rather than add a project. It begins with a short conversation about what is costing you the most time right now, then a knowledge panel capturing how you want that work handled, and a match with an assistant suited to it. Within days they are working inside your tools.',
  'The early days are where a little investment pays off. Give clear, specific feedback in the first week or two, and your assistant learns your standards and then holds them without being asked. Check Quo when you want to see exactly what is being done. As the first tasks settle into a routine, start noticing what else does not actually need you — and hand it over.',
]

function tasksProse(service: VAService, seed: string): string {
  const lead = pick([
    `A ${service.shortName.toLowerCase()} assistant handles the full scope, not just the easy parts.`,
    `Here is what actually comes off your plate when you delegate ${service.shortName.toLowerCase()}.`,
    `The day-to-day of ${service.shortName.toLowerCase()} covers more than most owners expect.`,
  ], seed)
  return `${lead} That includes ${service.tasks.slice(0, -1).map((t) => t.toLowerCase()).join(', ')}, and ${service.tasks[service.tasks.length - 1].toLowerCase()} — consistently, and tracked so you can see it.`
}

function idealForProse(service: VAService): string {
  return `${service.shortName} support fits ${service.idealFor.map((i) => i.toLowerCase()).join(', ')}, and any owner who would rather grow the business than run its back office. If you find yourself doing this work late at night or dropping it entirely when things get busy, it is a sign the task has outgrown you — and that is exactly when delegating pays for itself.`
}

/** Service page sections — long-form pillar (~5k words). */
export function serviceSections(service: VAService, businessName: string): Section[] {
  const seed = service.slug
  const tasksOrdered = shuffle(service.tasks, seed)
  return [
    {
      heading: `What Is ${service.name}?`,
      paragraphs: [
        service.definition,
        tasksProse(service, seed),
        pick(REMOTE_TRUST, seed),
        `In short, ${service.shortName.toLowerCase()} from a virtual assistant means a trained professional owns this part of your business remotely — reliably, transparently, and for a fraction of what an in-house hire would cost.`,
      ],
    },
    {
      heading: `Why ${service.shortName} Matters More Than Owners Think`,
      paragraphs: [
        pick(service.painPoints, seed) + ' That is the quiet cost of holding onto work that does not need you — it does not show up as a line item, but it shows up in the growth you never get to.',
        pick(service.painPoints, seed, 1) + ' Multiply that across a busy week and the real price of doing it yourself becomes obvious.',
        `Delegating changes the math. When ${service.shortName.toLowerCase()} is handled well, you get ${service.benefits.map((b) => b.toLowerCase()).join('; ')} — without adding a salaried headcount.`,
      ],
    },
    {
      heading: 'Everything Your Assistant Handles',
      paragraphs: [
        `${businessName} assistants take on the recurring work end to end so you stop being the bottleneck. The most common ${service.shortName.toLowerCase()} tasks we cover:`,
        ...tasksOrdered.map((t) => `• ${t}.`),
        `And because your assistant is a real person rather than a rigid tool, the list flexes to your business. If there is a version of this work specific to how you operate, it goes in the knowledge panel and becomes part of the routine.`,
      ],
    },
    {
      heading: 'How It Works, Step by Step',
      paragraphs: [
        `Getting started is deliberately simple. First, you tell us what you need off your plate — for ${service.shortName.toLowerCase()}, that usually means the specific tasks costing you the most time or the most leads right now.`,
        `Next, we match you with a fluent, English-speaking assistant suited to the work and build an AI knowledge panel on your business so they ramp fast. Then they get to work inside your existing tools, with every hour tracked through Quo.`,
        pick(KNOWLEDGE_PROSE, seed),
        `From there it compounds. As your assistant proves themselves on ${service.shortName.toLowerCase()}, most owners hand over more adjacent work until a meaningful share of the back office runs without them.`,
      ],
    },
    {
      heading: `${service.shortName} in Depth`,
      paragraphs: [
        `For many businesses, ${service.shortName.toLowerCase()} is the difference between a smooth operation and a constant scramble. ${pick(service.painPoints, seed)} When a trained professional owns it end to end, that pressure simply lifts.`,
        `A dedicated assistant does not just cover the task; they raise the standard of how it is done — consistently, on time, and documented so it stays consistent as your business grows. ${tasksProse(service, seed + 'depth')}`,
        `And because the work runs through your real tools and is tracked transparently through Quo, you get the benefit without losing visibility. You always know what is happening; you simply no longer have to be the one doing it. That combination — the work handled and the oversight retained — is what makes delegating ${service.shortName.toLowerCase()} feel less like giving something up and more like finally getting it under control.`,
      ],
    },
    {
      heading: 'Common Scenarios',
      paragraphs: [
        `The businesses that benefit most from ${service.shortName.toLowerCase()} tend to share a pattern: the owner is capable of doing the work but is far too valuable to be spending time on it, and the work is important enough that letting it slide is not an option. ${idealForProse(service)}`,
        `Picture the typical week. ${pick(service.painPoints, seed, 1)} With an assistant handling ${service.shortName.toLowerCase()}, that scenario simply stops happening — the work is covered, the standard is held, and your attention stays on the parts of the business that only you can move forward.`,
      ],
    },
    {
      heading: 'The Case for Remote Work',
      paragraphs: [...REMOTE_CASE],
    },
    {
      heading: 'What Makes a Great Assistant',
      paragraphs: [...GREAT_VA],
    },
    {
      heading: 'Security, Trust, and Peace of Mind',
      paragraphs: [...SECURITY_PROSE],
    },
    {
      heading: 'Your First Week',
      paragraphs: [...FIRST_WEEK],
    },
    {
      heading: 'Getting the Most From Your Assistant',
      paragraphs: [
        `A virtual assistant is only ever as effective as the delegation behind them, and the good news is that delegating well is a quick skill to build. Start with the painful, repeatable parts of ${service.shortName.toLowerCase()} — those are the easiest to hand off and the fastest to pay you back. Document each thing once, into the knowledge panel, and you never have to explain it again.`,
        `Give feedback early and specifically in the first couple of weeks, and your assistant learns your standards and then holds them on their own. Then expand deliberately: once ${service.shortName.toLowerCase()} is running smoothly, look for the next task that does not actually need you, and hand that over too. The owners who get the most from a virtual assistant are simply the ones who keep asking what else can come off their plate.`,
      ],
    },
    {
      heading: `Who ${service.name} Is For`,
      paragraphs: [
        idealForProse(service),
        `If ${pick(service.painPoints, seed, 2).toLowerCase()}, this is the fix — and it costs less than most owners assume.`,
      ],
    },
    {
      heading: 'Real People, Not AI Voices',
      paragraphs: [...HUMAN_PROSE],
    },
    {
      heading: 'American-Owned, Globally Staffed',
      paragraphs: [...AMERICAN_PROSE],
    },
    {
      heading: `What ${service.shortName} Costs`,
      paragraphs: [...PRICING_PROSE],
    },
    {
      heading: `${service.shortName} vs. AI Bots vs. Doing It Yourself`,
      paragraphs: [
        `The alternatives to a dedicated assistant each fall short in a predictable way. An AI tool can handle narrow, repetitive automation, but for anything that touches a customer it reads as a robot and costs you the relationship. A cheap, anonymous outsourcing pool takes the task but not the ownership — high turnover, no knowledge of your business, no follow-through.`,
        `And doing it yourself is the most expensive option of all, because your time is the scarcest resource you have. Every hour you spend on ${service.shortName.toLowerCase()} is an hour not spent on the work only you can do. A dedicated, English-speaking assistant is the option that combines human quality, real knowledge of your business, and honest pricing.`,
      ],
    },
    {
      heading: 'Frequently Asked Questions',
      paragraphs: [
        ...service.faqs.flatMap((f) => [f.q, f.a]),
        'How quickly can my assistant start?',
        'Most businesses are up and running within days. The knowledge panel is built up front, so ramp time is short and your assistant is productive almost immediately.',
        'What if I need to change the work or the hours?',
        'Just tell us. Plans are flexible with no long-term contract, so you can shift tasks or scale hours up and down as your business changes.',
      ],
    },
    {
      heading: 'Get Started',
      paragraphs: [
        `The best time to hand off ${service.shortName.toLowerCase()} is the moment you realize you are the bottleneck for it. Starting at eight dollars an hour with a fifty-dollar-per-week minimum, a real, English-speaking assistant is closer than you think.`,
        `Tell ${businessName} what you need off your plate, and we will take it from there.`,
      ],
    },
  ]
}

function localIntro(service: VAService, loc: USLocation): string {
  const where = loc.type === 'state' ? loc.name : `${loc.shortName}, ${loc.stateCode}`
  const openers = [
    `Businesses across ${where} are done choosing between missing work and burning out. ${service.name} from a dedicated virtual assistant gives ${loc.shortName} owners a third option: hand it off to a real professional and get your time back.`,
    `In ${where}, the cost of doing everything yourself is the growth you never get to. A ${service.shortName.toLowerCase()} virtual assistant lets ${loc.shortName} businesses offload the work that does not need them — without the overhead of a local hire.`,
    `${loc.shortName} runs fast, and the businesses that keep up are the ones that stop doing everything themselves. Remote ${service.shortName.toLowerCase()} support puts a trained assistant on your team at a fraction of what a ${where} employee costs.`,
  ]
  return pick(openers, service.slug + loc.slug)
}

/** Geo×service page sections — localized pillar (~3k words). */
export function geoSections(service: VAService, loc: USLocation, businessName: string): Section[] {
  const where = loc.type === 'state' ? loc.name : `${loc.shortName}, ${loc.stateCode}`
  const seed = service.slug + loc.slug
  const tasksOrdered = shuffle(service.tasks, seed)
  return [
    {
      heading: `${service.name} in ${where}`,
      paragraphs: [
        localIntro(service, loc),
        service.definition,
        pick(REMOTE_TRUST, seed) + ` For ${loc.shortName} businesses, that means the same quality a big-city firm gets, whether you are in a major metro or a small main-street shop.`,
      ],
    },
    {
      heading: `Why ${where} Businesses Choose a Remote Assistant`,
      paragraphs: [
        `Hiring in ${where} means a salary, benefits, payroll tax, and a desk. A remote ${service.shortName.toLowerCase()} assistant at eight dollars an hour delivers the same work — often more consistently — without any of that overhead.`,
        tasksProse(service, seed),
        pick(service.painPoints, seed) + ` For a ${loc.shortName} owner wearing every hat, that adds up fast.`,
      ],
    },
    {
      heading: 'What Your Assistant Handles',
      paragraphs: [
        `For ${loc.shortName} businesses, ${service.shortName.toLowerCase()} covers:`,
        ...tasksOrdered.map((t) => `• ${t}.`),
      ],
    },
    {
      heading: 'Real People, American-Owned',
      paragraphs: [pick(HUMAN_PROSE, seed), pick(AMERICAN_PROSE, seed)],
    },
    {
      heading: 'How It Works',
      paragraphs: [pick(KNOWLEDGE_PROSE, seed)],
    },
    {
      heading: `Simple, Honest Pricing in ${where}`,
      paragraphs: [
        `Whether you are in ${where} or anywhere else in the country, the rate is the same: eight dollars an hour, with a fifty-dollar-per-week minimum. Prefer a plan? Starter (10 hrs/wk, ~$320/mo), Part-Time (20 hrs/wk, ~$640/mo), or Full-Time (40 hrs/wk, ~$1,280/mo).`,
        `No contracts, no local premium, no games. English-speaking assistants, 24/7 coverage available, every hour tracked in Quo.`,
      ],
    },
    {
      heading: 'Remote Work, Proven',
      paragraphs: [...REMOTE_CASE],
    },
    {
      heading: 'What Makes a Great Assistant',
      paragraphs: [...GREAT_VA],
    },
    {
      heading: 'Security and Peace of Mind',
      paragraphs: [...SECURITY_PROSE],
    },
    {
      heading: 'Your First Week',
      paragraphs: [...FIRST_WEEK],
    },
    {
      heading: 'Frequently Asked Questions',
      paragraphs: [
        ...service.faqs.flatMap((f) => [f.q, f.a]),
        `Do you really serve ${loc.shortName}?`,
        `Yes. Because the work is remote, we serve businesses everywhere in ${loc.type === 'state' ? loc.name : 'the ' + loc.stateCode + ' area'} and across the entire United States — same rate, same quality, no travel fees.`,
      ],
    },
    {
      heading: `Get a ${service.shortName} Assistant in ${where}`,
      paragraphs: [
        `${service.tagline} Starting at eight dollars an hour, ${businessName} puts a real, English-speaking assistant on your ${loc.shortName} team. Tell us what you need off your plate.`,
      ],
    },
  ]
}

/** Location hub sections — one page per city/state covering all services (~3k words). */
export function locationHubSections(loc: USLocation, businessName: string): Section[] {
  const where = loc.type === 'state' ? loc.name : `${loc.shortName}, ${loc.stateCode}`
  const seed = loc.slug
  return [
    {
      heading: `Virtual Assistant Services in ${where}`,
      paragraphs: [
        `${businessName} gives businesses in ${where} a dedicated, English-speaking virtual assistant starting at eight dollars an hour — a real professional who answers your calls, runs your admin, manages your CRM, and takes the busywork off your plate. Because the work is remote, ${loc.shortName} businesses get the same quality a big-city firm gets, without the cost of a local hire.`,
        `We are an American-owned and American-managed company headquartered in New York City, serving over 100 businesses across the United States. You get a U.S. company held to U.S. standards, with world-class remote talent from the Philippines doing the work — every hour tracked transparently through Quo and flowing straight into the tools you already use, including FullLoop CRM.`,
      ],
    },
    {
      heading: `Why ${where} Businesses Hire a Remote Assistant`,
      paragraphs: [
        `Hiring in ${where} means a salary, benefits, payroll tax, equipment, and a desk. A remote assistant at eight dollars an hour delivers the same work — often more consistently — without any of that overhead. You pay only for the hours you use, and you can scale up or down as your business changes, with no severance and no long-term contract.`,
        `For a ${loc.shortName} owner wearing every hat, the real cost of doing everything yourself is the growth you never get to. Every hour spent answering the phone, chasing invoices, or cleaning up the CRM is an hour not spent serving clients or winning new business. A dedicated assistant hands those hours back.`,
      ],
    },
    {
      heading: 'What Your Assistant Can Do',
      paragraphs: [
        `From the front desk to the back office, ${loc.shortName} businesses delegate the full range of work to their assistant:`,
        ...VA_SERVICES.map((s) => `• ${s.name} — ${s.tagline}`),
        `And because your assistant is a real person rather than a rigid tool, the list flexes to your business. If there is a task specific to how you operate, it goes in the knowledge panel and becomes part of the routine.`,
      ],
    },
    {
      heading: 'Real People, Not AI Voices',
      paragraphs: [...HUMAN_PROSE],
    },
    {
      heading: 'American-Owned, Globally Staffed',
      paragraphs: [...AMERICAN_PROSE],
    },
    {
      heading: 'How It Works',
      paragraphs: [...KNOWLEDGE_PROSE],
    },
    {
      heading: 'The Case for Remote Work',
      paragraphs: [...REMOTE_CASE],
    },
    {
      heading: 'What Makes a Great Assistant',
      paragraphs: [...GREAT_VA],
    },
    {
      heading: 'Security, Trust, and Peace of Mind',
      paragraphs: [...SECURITY_PROSE],
    },
    {
      heading: 'Your First Week',
      paragraphs: [...FIRST_WEEK],
    },
    {
      heading: `Simple, Honest Pricing in ${where}`,
      paragraphs: [...PRICING_PROSE],
    },
    {
      heading: 'Frequently Asked Questions',
      paragraphs: [
        'Are the assistants real people or AI?',
        'Real people — 100%. Every assistant is a fluent, professional English speaker based in the Philippines. No AI voice bots and no scripts read by a robot. Your customers talk to a real human who represents your business.',
        'How much does it cost?',
        'It starts at eight dollars an hour with a fifty-dollar-per-week minimum. Monthly plans run from about $320/mo (10 hrs/week) up to about $1,280/mo for a full-time, 40-hour-a-week assistant.',
        `Do you really serve ${loc.shortName}?`,
        `Yes. Because the work is remote, we serve businesses everywhere in ${where} and across the entire United States — same rate, same quality, no travel fees.`,
        'How does my assistant learn my business?',
        'Each assistant is given an AI knowledge panel built specifically on your business — your services, pricing, and process — so they ramp fast and stay consistent from day one.',
      ],
    },
    {
      heading: `Get an Assistant in ${where}`,
      paragraphs: [
        `Starting at eight dollars an hour, ${businessName} puts a real, English-speaking assistant on your ${loc.shortName} team — answering calls, running admin, and managing your pipeline, 24/7. Tell us what you need off your plate.`,
      ],
    },
  ]
}
