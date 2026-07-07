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
      heading: `${service.shortName} That Grows With You`,
      paragraphs: [
        `One of the best things about delegating ${service.shortName.toLowerCase()} is that it scales with your business. You might start with a few hours a week covering the essentials, and as you grow — more calls, more clients, more volume — you simply add hours or add an assistant, with the same standards and the same knowledge panel carrying over. You are never locked into fixed overhead, and you are never caught short-handed at exactly the moment business picks up.`,
        `This is how a solo operation quietly becomes a real business. The ${service.shortName.toLowerCase()} that once ate your evenings is handled, the quality holds as volume climbs, and your attention stays free for the decisions and relationships that actually move things forward. Delegating it means ${service.benefits.map((b) => b.toLowerCase()).slice(0, 2).join(' and ')} — without adding a salaried headcount or a management headache.`,
      ],
    },
    {
      heading: `The Bottom Line on ${service.name}`,
      paragraphs: [
        `If ${service.shortName.toLowerCase()} is costing you time you cannot spare or leads you cannot afford to lose, a dedicated, English-speaking assistant is the most direct fix available — and at eight dollars an hour, one of the most affordable. You get a real professional who owns the work, tracked transparently through Quo and plugged into your systems, backed by an American-owned company that stands behind the result.`,
        `The businesses that win are rarely the ones that work the most hours; they are the ones that put their hours where they count. Handing off ${service.shortName.toLowerCase()} is one of the clearest, lowest-risk ways to do exactly that. Tell us what you need off your plate, and we will put the right assistant on it — starting this week.`,
      ],
    },
    ...sharedDepthSections(),
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
    ...sharedDepthSections(),
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
    ...sharedDepthSections(),
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

/**
 * Shared deep-content sections spread into every page type to give real
 * editorial depth. Generic (no service/location coupling) so it reads correctly
 * everywhere. Function declaration → hoisted, safe to reference above.
 */
function sharedDepthSections(): Section[] {
  return [
    {
      heading: 'The Real Cost of Doing It Yourself',
      paragraphs: [
        'The most expensive way to get administrative work done is to do it yourself, because your time is the scarcest and most valuable resource your business has. Every hour you spend answering the phone, entering data, or chasing an invoice is an hour you did not spend selling, serving clients, or building the parts of the business only you can build. That trade almost never makes sense once you put real numbers on it.',
        'Consider what an hour of your time is actually worth. If your work generates even fifty or a hundred dollars an hour of value — and for most owners it is far more — then handing an eight-dollar-an-hour task to an assistant is one of the most lopsided trades available to you. Reclaim ten hours a week and put them toward higher-value work, and the assistant does not just pay for themselves; they become one of the highest-return line items in your entire budget.',
        'The hidden cost is even larger than the visible one. The busywork you keep doing yourself is not just expensive in hours — it is expensive in focus, in energy, and in the growth you never get to because you were buried. Owners who delegate consistently describe the same thing: the business grows not because they worked more, but because they finally stopped doing the work that anyone could do and started doing the work that only they could.',
      ],
    },
    {
      heading: 'Virtual Assistant vs. AI Bots vs. Answering Services',
      paragraphs: [
        'The market is crowded with things that sound similar to a virtual assistant and perform very differently, so it is worth being clear about the alternatives. AI voice bots are the loudest trend and the weakest option for anything customer-facing. The technology keeps improving, but American customers can tell within seconds that they are talking to a robot, and a large share of them simply hang up. For narrow internal automation an AI tool can help; for answering a real customer with a real problem, a robot is a fast way to lose the relationship.',
        'Traditional answering services solve the "someone picks up" problem but rarely the "someone helps" problem. The person answering is usually juggling dozens of unrelated businesses, reading a thin script, with no knowledge of yours and no ability to actually book the job, work the CRM, or follow up. They take a message and stop there. A cheap freelancer off a marketplace takes the task but not the ownership — high turnover, no knowledge of your business, and you become the manager, trainer, and backup plan all at once.',
        'A dedicated, English-speaking virtual assistant from a managed service is the option that combines the best of all worlds: the human warmth customers want, the depth of knowledge a real team member has, the continuity of a company that handles coverage, and the cost efficiency of a remote model. It is not a robot, and it is not a stranger reading a script. It is your person — one who learns your business and gets better every week.',
      ],
    },
    {
      heading: 'Keeping Customers and Winning New Ones',
      paragraphs: [
        'Once the phones and the back office are handled, most owners discover an appetite for handing off more, and two areas tend to come next: keeping the customers they have, and finding new ones. On the support side, an assistant handles your live chat, email, and tickets — answering quickly, solving common problems, processing returns and orders, and following through until issues are actually closed. Speed matters more than owners realize: a fast, human response turns a frustrated customer into a loyal one, while a slow reply quietly trains people to look elsewhere.',
        'On the growth side, an assistant can build targeted prospect lists, run cold outreach, follow up persistently, and book qualified appointments onto your calendar — the disciplined, repetitive activity that reliably fills a pipeline but almost never gets done consistently when the owner is doing everything. The same is true of social media, where an assistant keeps your channels active and maintains the consistent presence that builds trust over time.',
        'None of this is magic. It is simply the steady execution of work that matters but keeps getting pushed to the bottom of the list. A dedicated assistant is how it finally gets done — and how a business stops leaking customers on one end while starving for new ones on the other.',
      ],
    },
    {
      heading: 'Scaling From One Assistant to a Team',
      paragraphs: [
        'Many businesses start with a single part-time assistant handling one painful task and, over time, grow into something much larger — a small, dedicated remote team handling the phones, the admin, the support, and the pipeline. That growth is one of the quiet advantages of the model: you can scale help up in exact proportion to your needs, without any of the friction of traditional hiring.',
        'Because you are working with a managed service rather than juggling individual freelancers, adding capacity is simple. When one assistant is fully utilized and you still have work to hand off, you add hours or add a second assistant, and the same standards, tracking, and knowledge-panel approach carry over. There is no new recruiting process, no new payroll setup, and no new office to make room in — just more of the help that is already working for you.',
      ],
    },
    {
      heading: 'Common Myths About Virtual Assistants',
      paragraphs: [
        'A few persistent myths keep owners from making a decision that would obviously help them. The first is "the quality will not be there." In reality, quality is a function of hiring and management, not geography — a managed company that selects for fluent English and a service ethic, then backs every assistant with a knowledge panel and a real manager, delivers work that stands next to any in-house hire.',
        'The second myth is "I will spend more time managing than I save." That is only true before you document your process into the knowledge panel; once you do, the management burden nearly disappears and a good assistant runs with minimal oversight. The third is "remote means I lose control." The opposite is true: with transparent time tracking and work flowing through your own systems, you often have more visibility into what is being done than you would with someone sitting in your office. The myths dissolve the moment you actually try it.',
      ],
    },
    {
      heading: 'How to Delegate Well',
      paragraphs: [
        'A virtual assistant is only ever as effective as the delegation behind them, and the good news is that delegating well is a quick skill to build. Start with the painful, repeatable work first — the tasks that drain you and happen over and over are the easiest to hand off and the fastest to pay you back. Resist the urge to start with the rare, complicated task; build the muscle on the everyday work first.',
        'Document once and benefit forever. Anything you explain to your assistant goes into the knowledge panel, which means you explain it a single time rather than repeatedly. Give feedback early and specifically in the first couple of weeks, and your assistant learns your standards and then holds them without being asked. Then expand deliberately: once a task is running smoothly, add the next one. The owners who get the most from a virtual assistant are simply the ones who keep asking what else does not actually need them — and then hand it over.',
      ],
    },
    {
      heading: 'What a Typical Week Looks Like',
      paragraphs: [
        'The abstract idea of "a remote assistant" becomes a lot more concrete once you picture a normal week. It starts with a handoff, not a hire: you point at the one or two things eating your time, we build a knowledge panel capturing how you want them handled, and we match you with an assistant suited to the work. Within days, the phone is being answered live in your business name, appointments are landing on your calendar, and your inbox is being triaged so you open it to a short list of what actually matters.',
        'Then it compounds. Once your assistant has proven themselves on the first tasks, you start noticing other things you could hand over — following up on quotes, keeping the CRM current, chasing unpaid invoices, posting to social. Piece by piece, what began as "answer my phone" becomes "run my back office," and you get back the hours to do the work that actually grows the business. That is the whole point: not to add a tool, but to clone the parts of yourself that were never the highest use of your time.',
      ],
    },
    {
      heading: 'Why English Fluency Matters So Much',
      paragraphs: [
        'For anything that touches a customer, fluent and natural English is not a nice-to-have — it is the whole ballgame. Your customers need to understand your assistant, connect with them, and trust them, and that only happens when the person on the other end is genuinely comfortable in the language. It is why we staff from the Philippines, where professional English fluency is the norm rather than the exception, and why we select for communication above almost everything else.',
        'The Philippines pairs deep English fluency with a service culture American businesses recognize instantly — warm, conscientious, and genuinely invested in doing the job well. That combination is what separates an assistant who reads a script from one who represents your brand like they own a piece of it. You get a professional who sounds great on the phone, writes clean and warm emails, and treats your customers with care, all at a rate that simply is not available domestically.',
      ],
    },
    {
      heading: 'Security, Trust, and Continuity',
      paragraphs: [
        'Handing parts of your business to someone who works remotely naturally raises questions about security and trust, and they deserve honest answers. Your assistant works within your systems under your access controls, exactly the way an in-house employee would; you decide what they can see and do, and you can change it at any time. Because every hour is tracked through Quo, there is always a clear record of what was worked on — accountability is built in rather than left to trust alone.',
        'The deeper reassurance is continuity. A lone freelancer can vanish, get sick, or move on, and suddenly your front desk goes dark. A managed, American-owned service is built so that never happens: coverage is handled, standards are maintained, and the knowledge panel means your business context is documented rather than living only in one person’s head. You get the benefits of a dedicated assistant without the fragility of depending on a single individual you found on the internet.',
      ],
    },
    {
      heading: 'Getting Started Is Simple',
      paragraphs: [
        'There is no long procurement process and no complicated onboarding, because the entire design is to get work off your plate quickly. It begins with a short conversation about what is costing you the most time or the most leads right now. From there we build a knowledge panel on your business and match you with a fluent, English-speaking assistant suited to the work, and within days they are working inside your existing tools.',
        'You can start small — pay-as-you-go at eight dollars an hour with a fifty-dollar-per-week minimum — and grow into a monthly plan as the value becomes obvious. There is no long-term contract and no risk in trying it. The best time to hire a virtual assistant is the moment you realize you are the bottleneck in your own business; if that moment is now, a real, English-speaking assistant is closer than you think.',
      ],
    },
  ]
}
