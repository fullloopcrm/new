/**
 * Content generator for the national VA SEO matrix. Expands a (service, location)
 * pair into long-form, seeded-variable prose so service pages and geo×service
 * pages read differently instead of being one template with the city swapped.
 *
 * HONEST CAVEAT: programmatic near-duplicate pages at national scale are the
 * classic "doorway page" pattern. Seeded variation (below) reduces near-dup, but
 * the durable fix is genuinely unique local signal (real reviews, local data).
 * Treat generated depth as a floor, not a substitute for that.
 */
import type { VAService } from '@/app/site/template/_data/va-services'
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

/** Deterministically pick n distinct items, seeded. */
function pickN<T>(arr: T[], seed: string, n: number): T[] {
  const out: T[] = []
  const used = new Set<number>()
  let i = 0
  while (out.length < Math.min(n, arr.length)) {
    const idx = (hashCode(seed + i) ) % arr.length
    if (!used.has(idx)) { used.add(idx); out.push(arr[idx]) }
    i++
  }
  return out
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

function localIntro(service: VAService, loc: USLocation): string {
  const where = loc.type === 'state' ? loc.name : `${loc.shortName}, ${loc.stateCode}`
  const openers = [
    `Businesses across ${where} are done choosing between missing work and burning out. ${service.name.toLowerCase()} from a dedicated virtual assistant gives ${loc.shortName} owners a third option: hand it off to a real professional and get your time back.`,
    `In ${where}, the cost of doing everything yourself is the growth you never get to. A ${service.shortName.toLowerCase()} virtual assistant lets ${loc.shortName} businesses offload the work that does not need you — without the overhead of a local hire.`,
    `${loc.shortName} runs fast, and the businesses that keep up are the ones that stop doing everything themselves. Remote ${service.shortName.toLowerCase()} support puts a trained assistant on your team at a fraction of what a ${where} employee costs.`,
  ]
  return pick(openers, service.slug + loc.slug)
}

function whyLocal(service: VAService, loc: USLocation): string {
  const where = loc.type === 'state' ? loc.name : `${loc.shortName}`
  return pick(REMOTE_TRUST, service.slug + loc.slug + 'trust') +
    ` For ${where} businesses, that means the same quality a big-city firm gets, at a price that works whether you are in a major metro or a small main-street shop.`
}

/** Expand a service's task list into prose. */
function tasksProse(service: VAService, seed: string): string {
  const lead = pick([
    `A ${service.shortName.toLowerCase()} assistant handles the full scope, not just the easy parts.`,
    `Here is what actually comes off your plate when you delegate ${service.shortName.toLowerCase()}.`,
    `The day-to-day of ${service.shortName.toLowerCase()} covers more than most owners expect.`,
  ], seed)
  return `${lead} That includes ${service.tasks.slice(0, -1).map(t => t.toLowerCase()).join(', ')}, and ${service.tasks[service.tasks.length - 1].toLowerCase()} — consistently, and tracked so you can see it.`
}

/** Service page sections (target: long-form, ~service pillar page). */
export function serviceSections(service: VAService, businessName: string): Section[] {
  const seed = service.slug
  return [
    {
      heading: `What Is ${service.name}?`,
      paragraphs: [
        service.definition,
        tasksProse(service, seed),
        pick(REMOTE_TRUST, seed),
      ],
    },
    {
      heading: 'What Your Assistant Handles',
      paragraphs: [
        `${businessName} assistants take on the recurring work so you stop being the bottleneck. The most common ${service.shortName.toLowerCase()} tasks we cover:`,
        ...service.tasks.map(t => `• ${t}.`),
      ],
    },
    {
      heading: `Why Businesses Delegate ${service.shortName}`,
      paragraphs: [
        pick(service.painPoints, seed) + ' That is the quiet cost of holding onto work that does not need you.',
        `Delegating changes the math. ${service.benefits.map(b => b.toLowerCase()).join('; ')} — all for a starting rate of $8/hour.`,
        pick(service.painPoints, seed, 1),
      ],
    },
    {
      heading: 'How It Works',
      paragraphs: [
        `Getting started is simple. You tell us what you need off your plate, we match you with a fluent, English-speaking assistant, and we build an AI knowledge panel on your business so they ramp fast.`,
        `From there, your assistant works your hours in your tools. Every hour is tracked through Quo, and the work runs straight into your systems — including FullLoop CRM — so nothing gets lost.`,
        `Start pay-as-you-go at $8/hour with a $50/week minimum, or lock in a monthly plan: Starter (10 hrs/week, $320/mo), Part-Time (20 hrs/week, $640/mo), or Full-Time (40 hrs/week, $1,280/mo).`,
      ],
    },
    {
      heading: `Who ${service.name} Is For`,
      paragraphs: [
        `${service.shortName} support fits ${service.idealFor.map(i => i.toLowerCase()).join(', ')}, and any owner who would rather grow the business than run its back office.`,
        `If ${pick(service.painPoints, seed, 2).toLowerCase()}, this is the fix.`,
      ],
    },
    {
      heading: 'American-Owned, Real People, Not AI Voices',
      paragraphs: [
        `${businessName} is an American-owned and American-managed company based in New York City — you deal with a U.S. business held to U.S. standards. The assistants doing the work are real, fluent-English professionals from the Philippines, not AI voice bots and not a rotating call center. American customers can tell the difference in the first three seconds of a call, and so can you.`,
        `That combination — American ownership and accountability, world-class remote talent, transparent Quo tracking, and a knowledge panel on your business — is why ${businessName} serves over 100 businesses across the United States.`,
      ],
    },
  ]
}

/** Geo×service page sections (target: localized, ~3k pillar). */
export function geoSections(service: VAService, loc: USLocation, businessName: string): Section[] {
  const where = loc.type === 'state' ? loc.name : `${loc.shortName}, ${loc.stateCode}`
  const seed = service.slug + loc.slug
  return [
    {
      heading: `${service.name} in ${where}`,
      paragraphs: [
        localIntro(service, loc),
        service.definition,
      ],
    },
    {
      heading: `Why ${where} Businesses Choose a Remote Assistant`,
      paragraphs: [
        whyLocal(service, loc),
        `Hiring in ${where} means a salary, benefits, payroll tax, and a desk. A remote ${service.shortName.toLowerCase()} assistant at $8/hour delivers the same work — often more consistently — without any of that overhead.`,
        tasksProse(service, seed),
      ],
    },
    {
      heading: 'What Your Assistant Handles',
      paragraphs: [
        `For ${loc.shortName} businesses, that covers:`,
        ...pickN(service.tasks, seed, service.tasks.length).map(t => `• ${t}.`),
      ],
    },
    {
      heading: `The Cost of Doing It Yourself in ${where}`,
      paragraphs: [
        pick(service.painPoints, seed) + ` For a ${loc.shortName} owner wearing every hat, that adds up fast.`,
        `Delegating ${service.shortName.toLowerCase()} means ${service.benefits.map(b => b.toLowerCase()).join('; ')} — starting at $8/hour with a $50/week minimum.`,
      ],
    },
    {
      heading: 'Simple, Honest Pricing',
      paragraphs: [
        `Whether you are in ${where} or anywhere else in the country, the rate is the same: $8/hour. Start pay-as-you-go ($50/week minimum) or pick a monthly plan — Starter $320/mo, Part-Time $640/mo, or Full-Time $1,280/mo.`,
        `No contracts, no local premium, no games. English-speaking assistants, 24/7 coverage available, every hour tracked in Quo.`,
      ],
    },
  ]
}
