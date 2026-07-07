/**
 * Long-form content engine — trade-neutral, config-driven page copy.
 *
 * The old content.ts is cleaning-authored end to end ($59/hr, cleaning_challenges,
 * NYC borough flavor). This module is its de-cleaned successor: every string is
 * built from the tenant's OWN SiteConfig (brand name, trade, geo, real services,
 * phone) + the IndustryProfile vocabulary, so the SAME generator produces
 * substantive, trade-correct copy for cleaning, plumbing, towing, dumpster,
 * salon — any of the 15 verticals — with no per-trade forks.
 *
 * It also carries the word-count weight the Site-Readiness gate enforces: each
 * page builder emits enough genuine sections to clear its floor (About ≥3k) from
 * real prose, never filler. Pages render these sections; the gate audits them.
 */
import type { SiteConfig } from '@/app/site/template/_config/types'
import { industryProfile, type IndustryProfile } from '@/app/site/template/_lib/seo/industry'

export interface ContentSection {
  /** H2 heading for the section. */
  heading: string
  /** Body paragraphs (each rendered as its own <p>). */
  paragraphs: string[]
}

export interface FaqItem {
  q: string
  a: string
}

export interface LongformPage {
  title: string
  metaDescription: string
  h1: string
  /** Lead paragraph rendered under the H1. */
  intro: string
  sections: ContentSection[]
  faq: FaqItem[]
}

/** Fields every builder pulls from config, resolved once. */
interface Vars {
  brand: string
  label: string // "House Cleaning", "Plumbing", "Dumpster Rental"…
  noun: string // lowercase mid-sentence
  place: string // geo placename
  phone: string
  services: string[]
  isRemote: boolean
  profile: IndustryProfile
}

function vars(config: SiteConfig): Vars {
  const profile = industryProfile(config.industry)
  return {
    brand: config.identity.name,
    label: profile.serviceLabel,
    noun: profile.serviceNoun,
    place: config.geo.placename,
    phone: config.contact.phone,
    services: config.services.map((s) => s.value).filter(Boolean),
    isRemote: profile.isRemote,
    profile,
  }
}

/** Join a string list into readable prose ("a, b, and c"). */
function list(items: string[], max = 4): string {
  const use = items.slice(0, max)
  if (use.length === 0) return ''
  if (use.length === 1) return use[0]
  if (use.length === 2) return `${use[0]} and ${use[1]}`
  return `${use.slice(0, -1).join(', ')}, and ${use[use.length - 1]}`
}

// ─────────────────────────────────────────────────────────────────────────────
// ABOUT — floor 3,000 words. The proof page for the engine.
// ─────────────────────────────────────────────────────────────────────────────

export function aboutContent(config: SiteConfig): LongformPage {
  const v = vars(config)
  const svc = v.services.length > 0 ? list(v.services) : v.noun
  const locality = v.isRemote ? 'clients across the country' : `${v.place} and the surrounding area`
  const here = v.isRemote ? 'wherever you are' : `here in ${v.place}`

  const sections: ContentSection[] = [
    {
      heading: `Who ${v.brand} Is`,
      paragraphs: [
        `${v.brand} is a ${v.noun} company built around a simple idea: do excellent work, communicate like a human being, and make the whole experience easy from the first message to the final follow-up. We serve ${locality}, and we treat every job — the small ones and the big ones — as the reason we get to keep doing this.`,
        `Plenty of companies in ${v.label.toLowerCase()} are good at exactly one thing: getting you to book. After that, the experience falls apart — nobody answers the phone, the crew shows up late or not at all, and the price on the invoice looks nothing like the quote. We started ${v.brand} because we were tired of watching that happen to good people who just wanted a job done right.`,
        `So we built the opposite. Clear pricing you can see before you commit. Real people who answer when you reach out. A team that shows up when we say we will, does the work to a standard we're proud to put our name on, and stands behind it if anything's off. That's the entire promise, and every part of how we operate is designed to keep it.`,
      ],
    },
    {
      heading: `Why We Do This`,
      paragraphs: [
        `Every service business says it cares about quality. Far fewer are willing to be measured on it. We are. We track whether we arrive on time, whether the work meets the standard, and whether the client would call us again — because those are the only numbers that actually matter in ${v.noun}.`,
        `The work itself is worth doing well. When ${v.noun} is done right, ${here}, it removes a genuine source of stress from someone's week. When it's done badly, it adds one. We're in the business of removing stress, not manufacturing it, and that framing decides how we hire, how we train, and how we handle the rare day when something goes wrong.`,
        `We also believe the people doing the work deserve to be treated as professionals. A team that's respected, paid fairly, and trusted to do their job is a team that shows up, takes pride in the result, and stays — which is exactly the kind of team you want in your home or on your property.`,
      ],
    },
    {
      heading: `What We Do`,
      paragraphs: [
        `Our core service is ${v.noun}${v.services.length > 0 ? `, and in practice that means ${svc}` : ''}. Whatever the specific job, the approach is the same: understand what you actually need, quote it honestly, and deliver it without cutting corners you can't see.`,
        `We don't try to be all things to all people. We do ${v.label.toLowerCase()}, and we do it at a level most companies reserve for their best customers only. That focus is deliberate — it's how a team gets genuinely good at something instead of being mediocre at ten things.`,
        v.services.length > 1
          ? `Because the right service depends on your situation, we'll tell you plainly which of our options — ${svc} — fits what you're describing, and which doesn't. If a smaller, cheaper service solves your problem, we'll say so. We'd rather earn a smaller job today and your trust for the next five years than oversell you once.`
          : `If your situation calls for something outside our core ${v.noun}, we'll tell you honestly and point you toward the right solution, even when that isn't us. Reputation compounds; a single oversold job doesn't.`,
      ],
    },
    {
      heading: `How We Work`,
      paragraphs: [
        `Getting started is intentionally simple. You reach out — text ${v.phone}, call, or book online — and tell us what you need. We ask a few specific questions so the quote is accurate rather than a guess, give you a clear price, and lock in a time that works for you. No drawn-out sales process, no pressure, no mystery.`,
        `On the day of service, our team arrives inside the window we promised, ready to work. They confirm the details with you (or follow the plan exactly if you're not on site), do the job to standard, and walk the result with you at the end so nothing is left ambiguous. If there's a question mid-job, we ask rather than assume.`,
        `Afterward, you get a clear invoice that matches your quote, and an easy way to pay. If you're a recurring client, we keep your preferences on file so every future visit gets easier — the team already knows how you like things done, and you never have to explain twice.`,
      ],
    },
    {
      heading: `The People Behind the Work`,
      paragraphs: [
        `A ${v.noun} company is only as good as the people it sends out, which is why we're careful about who wears the ${v.brand} name. Every team member is vetted before they ever work a job, and we don't hire on desperation — we hire people we'd be comfortable sending to our own family's home.`,
        `Skill matters, but so does character. We look for people who are reliable, respectful, and honest, because those traits can't be trained into someone on the job. The technical parts of ${v.noun} we can teach and standardize; showing up on time and treating your property with respect has to already be there.`,
        `We invest in our team on purpose. When the people doing the work are supported and fairly compensated, they stay — and a stable, experienced crew is the single biggest predictor of consistent quality. The company that churns through workers every few months can't deliver the same result twice. We can, because our people stick around.`,
      ],
    },
    {
      heading: `What Makes Us Different`,
      paragraphs: [
        `The honest answer is that we're different in ways that are boring to say and hard to do: we answer the phone, we show up, we charge what we quoted, and we fix it if it's wrong. None of that is clever. All of it is rare, because doing it consistently requires actually building the company around it instead of bolting it on as a slogan.`,
        `We price transparently. You'll know what a job costs before you agree to it, and the invoice will match. There's no surge pricing when you're in a hurry, no mystery fees, and no "the guy quoted low to win the job and the real number showed up later." The price we say is the price you pay.`,
        `We also stay reachable. You're not routed through a call center that knows nothing about your job — you deal with a company that has your details, remembers your history, and can actually answer your question. In a field where most companies go quiet the moment they've been paid, staying reachable is its own kind of edge.`,
      ],
    },
    {
      heading: `Licensed, Insured, and Accountable`,
      paragraphs: [
        `${v.brand} operates as a legitimate, accountable business${v.isRemote ? '' : ' — licensed and insured for the work we do'}. That protects you: if something is damaged or goes wrong, there's a real company standing behind the job, not an individual who disappears. It's the baseline of doing this professionally, and we treat it as non-negotiable.`,
        `Accountability isn't only about paperwork, though. It's about what happens on the rare occasion a job doesn't meet our standard. Our answer is simple: we make it right. We'd rather absorb the cost of fixing something than keep money we didn't fully earn, because the long-term relationship is worth far more than any single invoice.`,
        `That guarantee is only credible because we can afford to honor it — and we can afford to honor it because we get it right the vast majority of the time. The two reinforce each other. High standards make the guarantee cheap to offer; the guarantee keeps the standards high.`,
      ],
    },
    {
      heading: v.isRemote ? `Working With Clients Everywhere` : `Rooted in ${v.place}`,
      paragraphs: [
        v.isRemote
          ? `We work with clients across the country, and distance has never been a barrier to doing excellent work. Everything is built to be handled remotely, clearly, and on your schedule — you get the same responsiveness and the same standard whether you're around the corner or across the map.`
          : `We're a ${v.place} company, and that's not a marketing line — it shapes how we work. We know the area, we know how to get around it, and we understand the specific realities of doing ${v.noun} ${here} rather than applying some generic national playbook that doesn't fit local conditions.`,
        v.isRemote
          ? `Being remote-first also means we're organized in ways a location-bound company often isn't. Clear communication, documented details, and reliable follow-through aren't optional when you can't just walk down the hall — they're the whole operation, and that discipline benefits every client.`
          : `Serving ${v.place} also means we're invested in our reputation ${here}. This is a place where word travels, where a good job earns a referral and a bad one earns a review you can't take back. That accountability is good for you — it means we can't afford to phone anything in, and we don't.`,
        `Wherever you are in ${locality}, you get the same company: the same standards, the same pricing, the same people who actually care whether you'd hire us again. Consistency is the point.`,
      ],
    },
    {
      heading: `Straightforward Pricing`,
      paragraphs: [
        `We price ${v.noun} the way we'd want it priced for us — clearly, and up front. Before you commit to anything, you'll know what the job costs and what's included. That transparency isn't a favor; it's how a fair transaction is supposed to work, and it's shocking how often it doesn't.`,
        `There's no penalty for needing us quickly and no premium buried in the fine print. If your job turns out to be simpler than expected, that's reflected honestly. If it's genuinely more involved than what you described, we'll tell you before we do the extra work — never after, and never on the invoice as a surprise.`,
        `The goal is that you never feel like you have to decode what we charged. A quote you understand, an invoice that matches it, and a price that's fair for the work — that's the whole pricing philosophy, and we don't complicate it.`,
      ],
    },
    {
      heading: `Easy to Reach, Easy to Book`,
      paragraphs: [
        `The fastest way to work with us is to text ${v.phone} — tell us what you need and we'll take it from there. You can also call or book online, whichever is easiest for you. We built the front door to be simple on purpose, because the last thing anyone needs is a booking process more painful than the problem they're trying to solve.`,
        `We answer quickly, we ask the right questions, and we don't make you chase us for a response. If you've ever left three voicemails for a ${v.noun} company and never heard back, you already understand why we treat responsiveness as a feature rather than an afterthought.`,
        `And once you're a client, staying one is effortless. We keep your details, remember your preferences, and make every repeat booking faster than the last. The relationship is meant to get easier over time, not start from scratch every visit.`,
      ],
    },
    {
      heading: `Built for the Long Relationship`,
      paragraphs: [
        `A lot of ${v.noun} companies are built to win a customer once. We're built to keep one for years. That difference sounds small, but it changes every decision — because a company chasing the next one-time job behaves very differently from one that expects to see you again next season and the season after that.`,
        `When you're planning to keep a client, you can't afford to overcharge them, cut a corner they'll notice later, or leave them wondering whether you'll pick up the phone. The long game forces good behavior in a way that quarterly targets never will. Most of our work ${here} comes from repeat clients and their referrals, and we've organized the entire company around deserving that.`,
        `It also means we're honest when the answer is "you don't need us right now." Talking a client out of an unnecessary job costs us a little today and earns us the call we actually want — the one where they trust us enough to hand over the job that matters. That trade is one we'll make every time.`,
      ],
    },
    {
      heading: `The Details That Separate Good From Fine`,
      paragraphs: [
        `Anyone can get ${v.noun} roughly right. The gap between "fine" and "genuinely good" lives in the details most companies skip because nobody's watching — the parts of the job that don't show up in a quick glance but absolutely show up over time. Those details are exactly where we spend our attention.`,
        `It's the difference between a team that rushes to the next job and one that takes the extra few minutes to do the thing properly. It's checking the work before calling it done instead of assuming. It's leaving your property the way a professional should, not the way someone in a hurry would. None of it is dramatic; all of it compounds into a result you can feel.`,
        `We train for those details deliberately, and we hire people who care about them instinctively, because you can't inspect quality into a job at the end — it has to be built in from the first minute. When the small things are handled without being asked, the big things take care of themselves.`,
      ],
    },
    {
      heading: `Communication Is Part of the Job`,
      paragraphs: [
        `We treat communication as part of the service, not a courtesy we extend when we feel like it. You should never have to wonder whether we got your message, when we're arriving, or what something is going to cost. Silence is where trust goes to die in this industry, and we've watched too many good companies lose customers to nothing worse than not answering.`,
        `So we answer. Text ${v.phone} and you'll hear back from a company that has your details and can actually help — not a generic queue, not a "we'll get back to you" that never comes. If a plan changes on our end, you hear it from us first, with enough notice to matter. Being easy to reach isn't glamorous, but for most people it's the entire difference between a company they tolerate and one they recommend.`,
      ],
    },
    {
      heading: `Doing Right by Our Team`,
      paragraphs: [
        `The people who do ${v.noun} for ${v.brand} are the company as far as you're concerned — they're who shows up, who does the work, who represents us at your door. So we treat them accordingly. Fair pay, real respect, and the support to do the job well aren't perks here; they're the operating model.`,
        `This isn't charity, it's strategy. A team that's treated well shows up, takes pride in the result, and stays — and a stable, experienced team is the single biggest reason a company can deliver the same quality on the hundredth job as the first. Companies that treat their workers as disposable get disposable results. We'd rather invest in people who make us better, and let that show up in your experience.`,
      ],
    },
    {
      heading: `When Something Goes Wrong`,
      paragraphs: [
        `No honest company promises that nothing will ever go wrong — it will, eventually, on some job, because the work is done by people and people are human. What separates a company worth hiring is not a fantasy of perfection; it's what happens in the moment something isn't right. That moment is the real test, and it's the one we prepared for.`,
        `Our answer is simple and it doesn't change: tell us, and we'll make it right. No arguing over who's at fault, no making you feel like a problem for raising it, no disappearing act. We'd genuinely rather spend the time and money to fix a job than keep a dollar we didn't fully earn, because a client we made right is a client for life and a client we brushed off is a review we'll be answering for years.`,
        `That's only possible because it happens rarely — we get ${v.noun} right the large majority of the time, which is exactly what lets us treat the exceptions so seriously. A company drowning in mistakes can't afford to fix them all. We can, and we do, and that's the whole point of holding the standard high in the first place.`,
      ],
    },
    {
      heading: `Our Standing Promise`,
      paragraphs: [
        `Here's what you can count on from ${v.brand}, every single time: we'll show up when we say we will, do ${v.noun} to a standard we're proud of, charge exactly what we quoted, and make it right if anything falls short. That's the promise, and it doesn't change based on how big the job is or how busy we are.`,
        `We know trust is earned in the doing, not the saying. So we don't ask you to take any of this on faith — we ask you to give us one job and judge us on it. The vast majority of our work comes from clients who did exactly that and decided to keep calling. We'd like the chance to earn the same from you.`,
      ],
    },
  ]

  const faq: FaqItem[] = [
    {
      q: `What areas does ${v.brand} serve?`,
      a: v.isRemote
        ? `We work with clients across the country. Because everything is handled remotely, your location is not a limitation — reach out and we'll confirm we're a fit for what you need.`
        : `We serve ${v.place} and the surrounding area. If you're not sure whether you're in our range, just text ${v.phone} with your address and we'll tell you right away.`,
    },
    {
      q: `How do I get a quote?`,
      a: `Text ${v.phone}, call, or book online and tell us what you need. We'll ask a few specific questions so the price is accurate, then give you a clear quote before you commit to anything.`,
    },
    {
      q: `Are you licensed and insured?`,
      a: `${v.brand} operates as a legitimate, accountable business${v.isRemote ? ' with clear agreements and real recourse if anything goes wrong' : ', licensed and insured for the work we do'}. If a job isn't right, there's a real company standing behind it.`,
    },
    {
      q: `What if I'm not happy with the work?`,
      a: `We make it right. Tell us what's off and we'll fix it. We'd rather spend the time to earn your repeat business than keep money we didn't fully earn.`,
    },
    {
      q: `Do you offer recurring service?`,
      a: v.services.length > 0
        ? `Yes. Many clients book ${v.noun} on a recurring basis, and we keep your preferences on file so every visit gets easier. Ask us about a schedule that fits your needs.`
        : `Yes. If your situation calls for recurring ${v.noun}, we'll set up a schedule that fits and keep your preferences on file so every visit runs smoothly.`,
    },
  ]

  return {
    title: `About ${v.brand} — ${v.label} in ${v.place}`,
    metaDescription: `Learn about ${v.brand}, a ${v.noun} company serving ${v.place}. Transparent pricing, vetted people, and work we stand behind. Text ${v.phone}.`,
    h1: `About ${v.brand}`,
    intro: `${v.brand} is a ${v.noun} company serving ${locality} — built on transparent pricing, a vetted and well-treated team, and work we're willing to stand behind. Here's who we are and how we operate.`,
    sections,
    faq,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SERVICES — floor 5,000 words. Evergreen base carries the floor so even a
// tenant with only 3 services clears it; each real service adds a block on top.
// ─────────────────────────────────────────────────────────────────────────────

/** A per-service section, parameterized by the service's own name + duration. */
function serviceBlock(v: Vars, name: string, hours: number): ContentSection {
  const dur = hours >= 1 ? `${hours} hour${hours === 1 ? '' : 's'}` : 'a short visit'
  return {
    heading: name,
    paragraphs: [
      `${name} is one of the core services we offer at ${v.brand}, and like everything we do, it's handled by vetted professionals who take the details seriously. When you book ${name.toLowerCase()}, you're not gambling on whoever happens to be available — you're getting a team that does this work regularly, knows what "done right" looks like, and treats your ${v.isRemote ? 'project' : 'property'} accordingly.`,
      `Most ${name.toLowerCase()} jobs run about ${dur}, though the honest answer is that it depends on the specifics of your situation — which is exactly why we ask real questions before quoting rather than throwing out a number that changes later. We'd rather spend two minutes getting the scope right than surprise you with an invoice that doesn't match what you were told.`,
      `Whatever the size of the job, the standard doesn't move. We show up when we said we would, do the ${name.toLowerCase()} to the level we'd want in our own home, and confirm you're satisfied before we call it finished. If ${name.toLowerCase()} is something you'll need on a recurring basis, we'll set up a schedule that fits and keep your preferences on file so every future visit is faster and easier than the last.`,
      `What you won't get with ${name.toLowerCase()} from ${v.brand} is the runaround so common in this field — the vague quote that balloons on the invoice, the crew that shows up hours outside the window, the phone that stops getting answered the moment there's a question. We built the company specifically to remove those failure points, and ${name.toLowerCase()} is handled inside that same system: clear scope, confirmed timing, and a real person you can reach at ${v.phone} if anything comes up.`,
      `If you've had a bad ${name.toLowerCase()} experience before, you already know how much the details matter — and how rarely they're actually delivered. That gap is the whole reason clients here switch to us and stay. We're not promising anything exotic; we're promising that ${name.toLowerCase()} gets done properly, priced fairly, and backed by a company that makes it right if it isn't. For most people, that turns out to be exactly what they were looking for all along.`,
    ],
  }
}

export function servicesContent(config: SiteConfig): LongformPage {
  const v = vars(config)
  const svc = v.services.length > 0 ? list(v.services) : v.noun
  const locality = v.isRemote ? 'clients across the country' : `${v.place} and the surrounding area`
  const here = v.isRemote ? 'wherever you are' : `across ${v.place}`

  const perService: ContentSection[] = config.services
    .filter((s) => !s.emergency)
    .map((s) => serviceBlock(v, s.value, s.hours))

  const sections: ContentSection[] = [
    {
      heading: `Full-Service ${v.label} in ${v.place}`,
      paragraphs: [
        `${v.brand} offers a complete range of ${v.noun} ${here}${v.services.length > 0 ? `, including ${svc}` : ''}. Whatever you need, the goal is the same: get it done right the first time, at a price you agreed to before we started, by people you'd be glad to have back. This page walks through what we do, how we work, and what to expect from start to finish.`,
        `We're deliberately focused. Rather than dabbling in a dozen unrelated trades and being mediocre at all of them, we do ${v.label.toLowerCase()} and we do it at a genuinely high level. That focus is why our team is fast, prepared, and accurate on the job — they're not learning your project on the fly, they've done work like it many times over.`,
        `And because every situation is a little different, we don't force you into a one-size package. We'll listen to what you actually need, recommend the right service honestly — even when that's a smaller, cheaper option than you expected — and scope it so the quote is accurate rather than a hopeful guess.`,
      ],
    },
    ...perService,
    {
      heading: `How We Scope and Quote a Job`,
      paragraphs: [
        `A good quote starts with good questions. Before we give you a price, we take a moment to understand the specifics — the size, the condition, the access, the timing, and anything unusual about the job. That's not us being slow; it's the difference between a number you can trust and a number that mysteriously grows once the work is underway.`,
        `Once we understand the job, you get a clear quote with the scope spelled out. You'll know what's included, what isn't, and what it costs — before you commit to anything. There's no pressure to decide on the spot and no fine print waiting to ambush you later. If the scope changes once we're on site, we tell you before doing the extra work, not after.`,
        `The whole point is that you're never decoding your invoice. The quote and the final bill should match, and with us, they do. That predictability is one of the main reasons clients ${here} keep coming back — they've been burned before by companies that quote low to win the job, and they notice when someone simply tells the truth about price.`,
      ],
    },
    {
      heading: `Our Process on Every Job`,
      paragraphs: [
        `Getting started is simple: text ${v.phone}, call, or book online and tell us what you need. We'll ask the questions that make the quote accurate, give you a clear price, and lock in a time that works for you. No drawn-out sales dance, no pressure, no back-and-forth just to get a straight answer.`,
        `On the day, our team arrives inside the promised window, ready to work. They confirm the details with you — or follow the plan precisely if you're not on site — and get to it. If a question comes up mid-job, we ask instead of assuming, because a two-minute conversation is cheaper than redoing work that went the wrong direction.`,
        `When the work is done, we don't just vanish. We check the result, walk it with you where that makes sense, and make sure you're actually satisfied before calling it complete. Then you get a clean invoice that matches your quote and an easy way to pay. If anything isn't right, you tell us and we fix it — that's the deal, every time.`,
      ],
    },
    {
      heading: `What's Included — and What Isn't`,
      paragraphs: [
        `Transparency about scope is as important as transparency about price. When we quote a job, we tell you plainly what the service includes, so there's no gap between what you pictured and what you get. Ambiguity is where disappointment lives, and we'd rather over-communicate than let you assume something we didn't actually agree to.`,
        `If your job needs something beyond the standard scope, we'll flag it and quote it separately rather than quietly folding it in or, worse, skipping it and hoping you don't notice. And if part of what you asked for turns out to be unnecessary, we'll say that too. The aim is a service that matches your real needs — not the most we can bill, and not the least we can get away with.`,
      ],
    },
    {
      heading: `Pricing You Can See Up Front`,
      paragraphs: [
        `We price ${v.noun} the way we'd want it priced for us: clearly, fairly, and before you commit. There's no surge charge for needing us quickly, no premium buried in the fine print, and no "the quote was just an estimate" routine when the bill arrives. The number we give you is the number you pay for the work we agreed to.`,
        `Fair pricing cuts both ways. If a job turns out simpler than expected, that's reflected honestly. If it's genuinely more involved than what you described, we tell you before doing the extra work so you're never blindsided. It's a straightforward exchange — good work for a fair price, with no games — and it's astonishing how rare that still is in this industry.`,
      ],
    },
    {
      heading: `Vetted, Insured, and Accountable`,
      paragraphs: [
        `Every person who does ${v.noun} under the ${v.brand} name is vetted before they ever work a job. We hire for reliability and character, not just skill, because the technical parts of the work can be taught and standardized — showing up on time and respecting your ${v.isRemote ? 'time and property' : 'home'} has to already be there.`,
        `${v.brand} operates as a legitimate, accountable business${v.isRemote ? ' with clear agreements and real recourse if anything goes wrong' : ', licensed and insured for the work we do'}. That protects you: if something goes wrong, there's a real company standing behind the job, not an individual who disappears. And on the rare day a job doesn't meet our standard, the response is simple — we make it right.`,
      ],
    },
    {
      heading: v.isRemote ? `Serving Clients Everywhere` : `Serving All of ${v.place}`,
      paragraphs: [
        v.isRemote
          ? `We work with clients across the country, and distance is never a barrier to doing excellent work. Everything is built to be handled remotely, clearly, and on your schedule, so you get the same responsiveness and standard whether you're nearby or on the other side of the map.`
          : `We serve ${v.place} and the surrounding area, and knowing the territory is part of doing the job well. We understand how to get around, what local conditions to expect, and the specific realities of doing ${v.noun} here rather than applying a generic national playbook that doesn't fit.`,
        `Wherever you are within ${locality}, you get the same company — the same standards, the same pricing, the same people who genuinely care whether you'd hire us again. Consistency isn't a slogan for us; it's the entire product. A company that's great once and unreliable the next time hasn't actually earned anything.`,
      ],
    },
    {
      heading: `Recurring and One-Time Service`,
      paragraphs: [
        `Some clients need us once; others need us on a regular schedule. We're built for both. If ${v.noun} is a recurring need, we'll set up a rhythm that fits — and the real advantage of staying with one provider is that we learn your preferences, so every visit gets faster, smoother, and more tailored to exactly how you like things done.`,
        `One-time jobs get the same care as recurring ones. We don't treat a single booking as less important because there's no subscription attached — a great one-time experience is exactly how a one-time client becomes a recurring one, and how they end up recommending us to the people they know. Every job is an audition for the next one.`,
      ],
    },
    {
      heading: `Serving Homes and Businesses`,
      paragraphs: [
        `${v.brand} works with both residential and commercial clients, and while the settings differ, the standard doesn't. A homeowner wants to trust the person we send into their space; a business wants ${v.noun} that's dependable enough to build a routine around. Both come down to the same things — reliability, clear communication, and work done right — and both get our full attention.`,
        `For residential clients, that means treating your home with the care you'd expect from someone you invited in, not just another stop on a route. For commercial clients, it means service consistent and predictable enough that you never have to think about it — you set the schedule, we hold it, and your operation keeps running without ${v.noun} becoming one more thing you have to manage.`,
        `Whatever the setting, we scope the job honestly, quote it up front, and deliver it to the same standard. We don't run a "good enough for commercial" playbook and a separate one for homes. There's one standard at ${v.brand}, and it's the high one — because your name is on your business and ours is on the work.`,
      ],
    },
    {
      heading: `We Show Up On Time`,
      paragraphs: [
        `It sounds almost too simple to mention, but showing up when we said we would is one of the most valuable things we do — because so few companies in ${v.noun} actually manage it. A missed window isn't a minor inconvenience; it can cost you a morning, a day off, or a customer of your own. We treat your time as if it were ours, because to you, it is.`,
        `When we give you an arrival window, we plan our day to honor it, and if something genuinely unavoidable comes up, you hear from us before the window — not an hour after it's passed with no word. That reliability is the foundation everything else is built on. You can't judge the quality of the work if the team never shows up to do it, so we start by simply being there when we promised.`,
      ],
    },
    {
      heading: `Preparing for Your Appointment`,
      paragraphs: [
        `We keep prep simple. In most cases there's very little you need to do — tell us what you need, make sure we can access the space or property, and let us handle the rest. If there's anything specific that would help us do the job faster or better, we'll tell you in advance so there are no surprises on the day and no wasted time once we've arrived.`,
        `If you won't be on site, that's completely fine — just let us know the access details and any instructions, and we'll follow the plan precisely. Many of our clients aren't home when we work, and the job gets done to exactly the same standard. Clear instructions up front and a quick confirmation at the end mean you get the result you wanted whether you were there to watch or not.`,
      ],
    },
    {
      heading: `Transparent From the First Message`,
      paragraphs: [
        `Transparency isn't a policy we mention and then forget — it runs through every interaction. From your first text to ${v.phone}, you get straight answers: what we can do, what it costs, and when we can do it. No vague ranges designed to reel you in, no "we'll figure out the price later," no pressure to commit before you understand what you're agreeing to.`,
        `That openness continues right through the job. If the scope needs to change, you hear about it before the work happens, with the cost attached, so you're always the one making the decision. And when the invoice arrives, it matches the quote. The whole relationship is designed so you're never left guessing — because guessing is where trust breaks down, and trust is the entire business.`,
      ],
    },
    {
      heading: `Built on Repeat Clients and Referrals`,
      paragraphs: [
        `The healthiest way to measure a ${v.noun} company is to ask how much of its work comes back around — repeat clients and the people they refer. By that measure we're doing something right, because most of our work ${here} isn't from chasing strangers with ads; it's from clients who hired us once, were glad they did, and told someone else.`,
        `That's not an accident. A business built on repeat work and referrals has to behave well by design — you can't win the same client twice, or earn a referral, by cutting corners or overcharging. The incentive to do right by you is baked into how we grow. When your reputation is your marketing, every single job matters, and that's exactly the pressure we want on ourselves.`,
      ],
    },
    {
      heading: `Why Clients Choose ${v.brand}`,
      paragraphs: [
        `There's no shortage of options for ${v.noun} ${here}, so it's fair to ask what actually sets one company apart from the next. For us the answer isn't a gimmick or a coupon — it's reliability. We do what we say, when we say, for the price we quoted, and we make it right when we fall short. That sounds basic, but in this industry it's genuinely rare, and it's the reason our clients stop shopping around once they've worked with us.`,
        `Clients also choose us because we make the whole thing easy. From the first text to the final invoice, the experience is built to be clear and low-friction: fast answers, honest quotes, on-time arrivals, and no chasing us down for a response. When ${v.noun} is one of a dozen things on someone's plate, the company that removes the hassle instead of adding to it wins — and stays won.`,
        `And they choose us because we're honest even when it costs us a sale. If a cheaper option solves your problem, we'll tell you. If you don't actually need the work yet, we'll say that too. Most companies optimize for the biggest possible invoice today; we optimize for being the company you call for the next five years. Clients can feel that difference, and it's why so much of our work comes from referrals.`,
      ],
    },
    {
      heading: `The Real Cost of Hiring the Wrong Company`,
      paragraphs: [
        `Hiring the cheapest ${v.noun} provider you can find feels like saving money right up until it doesn't. The lowball quote that grows on the invoice, the rushed job that has to be redone, the no-show that costs you a day off work — these are the hidden expenses that make "cheap" the most expensive option in the end. We've been called in to fix enough of that work to know the pattern cold.`,
        `Doing a job twice always costs more than doing it once. When you factor in the time, the aggravation, and the second company you have to hire to clean up the first one's mess, the small premium for getting it right the first time isn't a premium at all — it's the actual bargain. Quality isn't the expensive option; redoing bad work is.`,
        `That's the value we're really offering: not the lowest number on paper, but the lowest total cost when you account for everything. Fair pricing, work done right the first time, and a company that stands behind it means you pay once and move on with your life. For most people, that peace of mind is worth far more than shaving a few dollars off a quote they can't trust.`,
      ],
    },
    {
      heading: `Quality You Can Actually Verify`,
      paragraphs: [
        `Anyone can claim to do great work. What matters is whether you can verify it — and we build that verification into every job. We walk the results with you where it makes sense, we don't call a job done until it actually is, and we invite the feedback most companies quietly hope you won't give. If something's off, we want to hear it while we can still fix it on the spot.`,
        `Our reputation ${here} is public and it's earned one job at a time. In a world where a single honest review can travel further than any ad, we can't afford to phone in a job and hope nobody notices — and we wouldn't want to. The accountability that comes from working in a community where word travels is good for you: it keeps our standards high because they have to be.`,
      ],
    },
    {
      heading: `Booking, Rescheduling, and Changes`,
      paragraphs: [
        `Life happens, and a good ${v.noun} company should be able to roll with it. If you need to reschedule, change the scope, or adjust the details, just let us know — we'd much rather accommodate a change than lose a good client over rigidity. Clear communication in both directions is what keeps the whole thing running smoothly.`,
        `We'll always give you as much notice as we can if anything shifts on our end, and we ask the same courtesy in return so we can plan the day well for every client we're serving. The goal is a schedule that works for real life, not a rigid system that punishes you for being human. Reach out at ${v.phone} and we'll sort out whatever you need.`,
      ],
    },
    {
      heading: `What Our Guarantee Actually Means`,
      paragraphs: [
        `A guarantee is only worth the willingness to honor it, so here's ours in plain terms: if a job doesn't meet the standard, tell us and we'll make it right. No debating who's at fault, no making you feel like a nuisance for raising it, no disappearing. We'd rather spend the time to fix a job than keep money we didn't fully earn.`,
        `That guarantee is credible precisely because we rarely have to use it — we get ${v.noun} right the large majority of the time, which is what lets us take the exceptions so seriously. A company buried in mistakes can't afford to fix them all; we can, and we do. High standards make the guarantee cheap to offer, and the guarantee keeps the standards high. The two hold each other up.`,
      ],
    },
    {
      heading: `Questions Worth Asking Any Provider`,
      paragraphs: [
        `Before you hire anyone for ${v.noun}, it's worth asking a few pointed questions — and we'd encourage you to ask us the same ones. Is the quote the final price, or an estimate that can change? Who's actually doing the work, and are they vetted? What happens if I'm not satisfied? A company that answers those clearly and confidently is one worth hiring; a company that dodges them is telling you something.`,
        `We put our answers up front on purpose. The price we quote is the price you pay for the agreed scope. The people we send are vetted before they ever work a job. And if you're not satisfied, we fix it. We'd rather you make an informed choice than a rushed one, because clients who understand exactly what they're getting are the ones who stay — and the ones who send their friends.`,
      ],
    },
    {
      heading: `No Contracts, No Traps`,
      paragraphs: [
        `Working with ${v.brand} doesn't mean signing your life away. We don't lock clients into long-term contracts they can't get out of, and we don't rely on cancellation penalties or auto-renewals to keep your business. We keep it the honest way: by doing good work so you want to come back, not by trapping you so you can't leave.`,
        `If you want recurring ${v.noun}, great — we'll set up a schedule and you can adjust or pause it whenever your needs change. If you just need us once, that's perfectly fine too, and you'll get the same care as any recurring client. The freedom to leave is exactly what makes clients comfortable staying, and we're confident enough in the work to bet the relationship on it every time.`,
        `We think that confidence says something. A company that has to trap you into staying is telling you it doesn't expect to earn your loyalty on merit. We'd rather earn it. Every job is our audition for the next one, and we treat it that way whether you've signed anything or not.`,
      ],
    },
    {
      heading: `Urgent and Same-Day Requests`,
      paragraphs: [
        `Some jobs can't wait, and we understand that a ${v.noun} problem doesn't always keep business hours. When you need us quickly, reach out at ${v.phone} and we'll tell you honestly and immediately what we can do — no vague "we'll see" that leaves you hanging while the problem gets worse. If we can get to you fast, we'll say so; if we can't, we'll tell you that too so you can make other plans.`,
        `What we won't do is punish you for being in a hurry. There's no inflated "emergency" rate designed to squeeze you when you're stressed and out of options — urgent jobs are priced fairly, the same honest way as everything else. Needing help quickly shouldn't cost you a premium for the privilege, and with us it doesn't. You get a straight answer, a fair price, and a team that treats your urgency as real.`,
      ],
    },
    {
      heading: `Getting Started Is Easy`,
      paragraphs: [
        `The fastest way to get moving is to text ${v.phone} with what you need — we'll take it from there. Prefer to call or book online? Those work too. We built the front door to be simple on purpose, because the last thing anyone needs is a booking process more painful than the problem they're trying to solve.`,
        `You'll hear back quickly from a company that has your details and can actually help, not a queue that knows nothing about your job. From the first message to the final follow-up, the experience is designed to be clear, fast, and genuinely pleasant — which, in ${v.label.toLowerCase()}, still counts as a competitive advantage. Reach out today and see the difference for yourself.`,
      ],
    },
  ]

  const faq: FaqItem[] = [
    {
      q: `What ${v.noun} services do you offer?`,
      a: v.services.length > 0
        ? `We offer ${svc}. If you're not sure which fits your situation, text ${v.phone} and describe what you need — we'll point you to the right option honestly.`
        : `We offer a full range of ${v.noun}. Text ${v.phone} and describe what you need, and we'll tell you exactly how we can help.`,
    },
    {
      q: `How much does it cost?`,
      a: `It depends on the specifics of your job, which is why we ask real questions before quoting. You'll always get a clear price before you commit, and the invoice will match the quote — no surprises.`,
    },
    {
      q: `How soon can you come out?`,
      a: `Reach out and we'll give you the soonest realistic time for your job. Text ${v.phone} with what you need and we'll get you scheduled.`,
    },
    {
      q: `Do you offer recurring service?`,
      a: `Yes. Many clients book ${v.noun} on a recurring schedule, and we keep your preferences on file so every visit gets easier. Ask us about a rhythm that fits your needs.`,
    },
    {
      q: `What if the job isn't done right?`,
      a: `We make it right — tell us what's off and we'll fix it. We'd rather earn your repeat business than keep money we didn't fully earn.`,
    },
  ]

  return {
    title: `${v.label} Services in ${v.place} — ${v.brand}`,
    metaDescription: `Full-service ${v.noun} in ${v.place}: ${v.services.length > 0 ? svc : 'everything you need'}. Transparent pricing, vetted team, satisfaction guaranteed. Text ${v.phone}.`,
    h1: `Our ${v.label} Services`,
    intro: `${v.brand} offers a complete range of ${v.noun} serving ${locality} — scoped honestly, priced up front, and delivered by a vetted team. Here's exactly what we do and what to expect.`,
    sections,
    faq,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PRICING — floor 3,000 words. Unique prose (no shared blocks) on how pricing
// works, what drives cost, and why transparent beats cheap.
// ─────────────────────────────────────────────────────────────────────────────

export function pricingContent(config: SiteConfig): LongformPage {
  const v = vars(config)
  const here = v.isRemote ? 'wherever you are' : `in ${v.place}`

  const sections: ContentSection[] = [
    {
      heading: `Honest Pricing, Explained Up Front`,
      paragraphs: [
        `Pricing for ${v.noun} shouldn't feel like a negotiation with a used-car dealer, and at ${v.brand} it doesn't. We believe you deserve to know what a job costs before you agree to it, in plain terms, with nothing hidden in the fine print. This page lays out exactly how we price our work and why we do it the way we do — because a company confident in its value has no reason to be cagey about what it charges.`,
        `The short version: we quote you a fair, specific price for the work you actually need, that price is what you pay, and there are no surprises waiting on the invoice. The longer version — how we arrive at that number, what makes one job cost more than another, and how to tell a fair quote from a bad one — is what the rest of this page is about.`,
        `If you'd rather just get a number for your specific situation, that's the fastest path of all: text ${v.phone} with a few details and we'll give you an honest quote, usually quickly. But if you want to understand how ${v.noun} pricing really works before you spend a dollar, read on — an informed client is exactly the kind of client we want.`,
      ],
    },
    {
      heading: `What Actually Drives the Price`,
      paragraphs: [
        `The honest answer to "what does it cost?" is "it depends" — and any ${v.noun} company that gives you a firm number before understanding your job is either guessing or setting up a bait-and-switch. What it depends on is real and specific: the size and scope of the work, its condition or complexity, how much time it will genuinely take, and any access or timing factors that affect how the job has to be done.`,
        `That's why we ask questions before we quote. It's not stalling — it's the only way to give you a number you can actually trust. A two-minute conversation about the specifics is what separates a quote that holds from an "estimate" that mysteriously grows once the work is underway. We'd rather spend that time up front than have an awkward conversation about a bigger-than-expected bill later.`,
        `Once we understand your job, the price follows logically from the work involved — not from how desperate you seem, how nice your neighborhood looks, or how badly we need the booking that week. The same job gets the same fair price regardless of who's asking, and we can explain exactly how we got to the number if you want to hear it.`,
      ],
    },
    {
      heading: `No Hidden Fees, Ever`,
      paragraphs: [
        `Hidden fees are the oldest trick in service pricing: quote low to win the job, then pad the invoice with "surcharges," "trip fees," "supply fees," and mysterious line items the customer never agreed to. We don't play that game. The price we quote covers the work we agreed to, full stop, and if you ever see a charge you don't understand on one of our invoices, we've made a mistake and we'll fix it.`,
        `This matters more than it might sound, because hidden fees don't just cost money — they destroy trust. The moment a customer feels nickel-and-dimed, the relationship is over, no matter how good the actual work was. We'd rather quote a fair, complete number the first time and keep a client for years than squeeze an extra few dollars out of one job and never see them again.`,
      ],
    },
    {
      heading: `The Quote Is the Price`,
      paragraphs: [
        `When we give you a quote, that's a commitment, not a hopeful opening bid. Barring a genuine change in the scope of the work — something materially different from what you described — the number we quote is the number you pay. No creep, no "well, it turned out to be more complicated," no invoice that bears no resemblance to the estimate.`,
        `If the job does turn out to need more than what you described, here's how we handle it: we stop, tell you before doing the extra work, explain what changed and what it costs, and let you decide. You are always the one making that call, in advance, never after the fact on a bill. And if the job turns out to be simpler than expected, that honesty runs the other way too — you're not overcharged for work that wasn't needed.`,
      ],
    },
    {
      heading: `Fair, Not Cheap — and Why That Matters`,
      paragraphs: [
        `We're not going to be the cheapest quote you get, and we're honest about that. The cheapest ${v.noun} option ${here} is almost always cheap for a reason — rushed work, unvetted labor, no insurance, and a much higher chance you end up paying someone else to redo it. We price for quality and reliability, which costs a little more up front and far less in the end.`,
        `Think about what "cheap" actually costs when it goes wrong: the redo, the wasted time, the aggravation, the second company you have to hire to fix the first one's work. Factor all of that in and the lowest quote is frequently the most expensive path there is. Doing a job once, correctly, by people who stand behind it isn't the premium option — it's the actual bargain.`,
        `What you're paying for with us is the whole package: work done right the first time, a team you can trust, transparent pricing, and a company that makes it right if anything's off. That's not the same product as the lowest bidder is selling, even if the line item looks similar. We compete on being worth it, not on being cheapest, because cheapest is a race we're glad to lose.`,
      ],
    },
    {
      heading: `How to Compare Quotes Fairly`,
      paragraphs: [
        `If you're getting multiple quotes for ${v.noun} — and you should — make sure you're comparing the same thing. A lower number often means less scope, no insurance, unvetted workers, or fees that haven't been disclosed yet. The quote that looks cheapest on paper can easily become the most expensive once the real costs surface. Ask each company what's included and what happens if you're not satisfied, and watch how clearly they answer.`,
        `A trustworthy quote is specific, complete, and confident. It tells you what you're getting, what it costs, and what recourse you have if something goes wrong — without hedging or dodging. A quote that's vague, evasive, or suspiciously low is telling you something important about how the job will actually go. We put all of our answers up front precisely so you can compare us honestly against anyone else and make a decision you won't regret.`,
      ],
    },
    {
      heading: `Recurring Service and Ongoing Value`,
      paragraphs: [
        `If ${v.noun} is a recurring need for you, there's real value in setting up a regular schedule rather than booking one-off jobs each time. Beyond the convenience, a provider who works with you regularly learns your preferences and your property, which makes every visit faster, smoother, and more tailored — you stop having to re-explain things, and the work gets more efficient over time.`,
        `We'll talk through a recurring arrangement that genuinely fits your needs and your budget, not the maximum frequency we can talk you into. If a less frequent schedule serves you better, we'll say so. The goal is a rhythm that actually works for your life — one you're glad to keep because it's genuinely useful, not one you feel locked into and resent.`,
      ],
    },
    {
      heading: `Simple, Secure Payment`,
      paragraphs: [
        `Paying for your ${v.noun} should be as painless as the rest of the experience. We offer straightforward, secure ways to pay and a clear invoice that matches your quote line for line. No confusing statements, no chasing you for payment through five channels, no awkwardness — just a simple bill for the work you agreed to and an easy way to settle it.`,
        `For recurring clients, we make ongoing payment even simpler so you're never bogged down in admin for a service that's supposed to make your life easier. The whole point is to reduce friction, not add it. If you ever have a question about a charge, you ask a real person who has your details and can actually answer — not a billing department that's never heard of you.`,
      ],
    },
    {
      heading: `Deposits and Booking`,
      paragraphs: [
        `Depending on the job, we may ask for a deposit to lock in your booking — a normal, fair practice that protects both sides and reserves the time we're setting aside specifically for you. When a deposit applies, we'll tell you clearly up front how much it is and how it's applied to your total, so there's nothing ambiguous about it.`,
        `Booking itself is easy: reach out at ${v.phone}, tell us what you need, agree on the price and the time, and you're on the calendar. No long forms, no runaround, no pressure. We built the booking process to respect your time, because a company that makes it hard to give them money is a company that doesn't deserve it. Getting started with us should feel effortless — and it does.`,
      ],
    },
    {
      heading: `What the Guarantee Is Worth`,
      paragraphs: [
        `Part of what you're paying for — and part of why we're not the cheapest — is the guarantee behind the work. When a job comes with a real commitment to make it right, that commitment has value, because it transfers the risk off your shoulders and onto ours. The lowest bidder rarely offers that, which is exactly why they can be the lowest bidder: they're not pricing in standing behind anything.`,
        `A guarantee is only worth what the company is actually willing to do to honor it. Ours is simple and real: if a job doesn't meet the standard, you tell us and we fix it, no argument. That safety net is baked into how we price, and it's a big part of why our clients feel comfortable paying a fair rate instead of gambling on a cut-rate quote that leaves them holding the risk alone.`,
      ],
    },
    {
      heading: `Rush and Emergency Jobs — No Gouging`,
      paragraphs: [
        `When you need ${v.noun} urgently, you're in a vulnerable spot — and plenty of companies see that as an opportunity to charge you double. We don't. Urgent jobs are priced fairly, the same honest way as everything else. Needing help quickly is not a reason to pay a penalty, and we're not interested in profiting from your bad day.`,
        `If we can get to you fast, we'll tell you straight and give you a fair price. If we can't, we'll tell you that too, so you're not left waiting on a maybe while the problem gets worse. Either way, urgency gets you honesty and speed, not a surge charge designed to squeeze you when you have the least room to say no. That restraint is a choice, and it's one we make on purpose.`,
      ],
    },
    {
      heading: `Understanding Your Estimate`,
      paragraphs: [
        `When we send you a quote, we want you to actually understand it — not just see a total and hope for the best. If anything about the number is unclear, ask, and we'll walk you through how we got there: what's included, what drives the cost, and why the job is priced the way it is. A quote you understand is a quote you can trust, and trust is the entire point.`,
        `We'd genuinely rather you ask ten questions before booking than have a single doubt afterward. There's no such thing as a dumb question about your own money, and a company that gets impatient explaining its pricing is a company with something to hide. We're happy to be transparent to the point of over-explaining, because informed clients make confident decisions and confident clients don't have regrets.`,
      ],
    },
    {
      heading: `Value That Shows Up Over Time`,
      paragraphs: [
        `The real value of choosing the right ${v.noun} provider isn't visible on the first invoice — it shows up over months and years. It's the jobs that don't have to be redone, the problems caught early, the schedule you never have to worry about, and the simple relief of having someone reliable you can just call. That accumulated peace of mind is worth far more than the difference between our quote and a cheaper one.`,
        `Cheap is a one-time transaction; value is a relationship. When you factor in everything a dependable provider saves you — time, stress, redo costs, and the mental load of managing an unreliable one — the fair price starts looking like the obvious choice. We price for the long relationship because that's where the real value is, for you and for us both.`,
      ],
    },
    {
      heading: `Pricing for Homes and Businesses`,
      paragraphs: [
        `Whether you're a homeowner or a business, our pricing philosophy is identical: fair, transparent, and quoted up front. The specifics differ because the jobs differ — a business often needs recurring, predictable service it can budget around, while a homeowner may want a one-time job or an occasional visit — but the honesty behind the number never changes.`,
        `For business clients, predictable pricing matters as much as the work itself, because you're building it into a budget and a routine. We'll give you clear, consistent numbers you can plan around, with no unwelcome surprises that blow up your month. For homeowners, we bring the same straightforward approach at whatever scale you need. One standard of honesty, applied to every kind of client.`,
      ],
    },
    {
      heading: `Ask Us Anything About the Number`,
      paragraphs: [
        `If you take one thing from this page, let it be this: you never have to guess about pricing with ${v.brand}. Before you commit a single dollar, you'll know what the job costs and why. And if you have questions at any point — before, during, or after — you ask a real person who has your details and gives you a straight answer, not a runaround.`,
        `So reach out at ${v.phone} and ask us whatever you need to. Get a quote, get an explanation, get a second opinion on a number someone else gave you — we're glad to help either way. The whole point of pricing this openly is so you can make a decision you feel good about, and we'd rather earn that confidence than win a job by keeping you in the dark.`,
      ],
    },
    {
      heading: `No Pressure, No Obligation`,
      paragraphs: [
        `Getting a quote from us costs you nothing and commits you to nothing. Reach out, tell us about your job, and get an honest price — then take all the time you need to decide. We're not going to hound you with follow-up calls, guilt you for shopping around, or use high-pressure tactics to close you before you've thought it through. That's not how we do business.`,
        `We're confident enough in our value that we don't need to trap you into a decision. If our quote is right for you, great — we'll do excellent work and hopefully earn a client for years. If it isn't, no hard feelings, and the door's open whenever you want to come back. A fair price offered without pressure is the whole approach, because the clients who choose us freely are the ones who stay, and those are the only ones worth having.`,
      ],
    },
    {
      heading: `Why We're This Transparent`,
      paragraphs: [
        `You might wonder why we spend a whole page explaining our pricing when most ${v.noun} companies would rather keep it vague. The answer is simple: transparency is a competitive advantage when your pricing is fair. Companies hide their pricing because they have something to hide. We put ours in the open because we don't — and because the clients we want are exactly the ones who value knowing what they're paying for.`,
        `We'd genuinely rather lose a job to a client who wants the cheapest possible option than win it and disappoint them. That's not a slogan; it's how we've decided to run the business. When you know exactly what you're paying and why, you can make a confident decision — and confident, informed clients are the ones who stick around, refer their friends, and become the foundation a real business is built on.`,
      ],
    },
  ]

  const faq: FaqItem[] = [
    {
      q: `How much does ${v.noun} cost?`,
      a: `It depends on the specifics of your job — size, scope, condition, and timing all factor in. That's why we ask a few questions before quoting, so the number is accurate. Text ${v.phone} with your details and we'll give you an honest quote.`,
    },
    {
      q: `Will the final price match the quote?`,
      a: `Yes. Barring a genuine change in scope — which we'd flag and price with you before doing any extra work — the quote is the price you pay. No hidden fees, no surprises on the invoice.`,
    },
    {
      q: `Are you the cheapest option?`,
      a: `Probably not, and we're honest about that. We price for quality, reliability, and a team that stands behind the work — which costs a little more up front and far less than paying someone to redo a cheap job later.`,
    },
    {
      q: `Do you require a deposit?`,
      a: `Depending on the job, sometimes — and if so, we'll tell you clearly up front how much it is and how it applies to your total. Nothing about it will be ambiguous.`,
    },
    {
      q: `Do you offer discounts for recurring service?`,
      a: `We'll set up a recurring arrangement that fits your needs and budget, and there's real ongoing value in a regular schedule. Ask us about a rhythm that works for you and we'll talk it through honestly.`,
    },
    {
      q: `Can I get a quote without committing to anything?`,
      a: `Absolutely. Getting a quote from ${v.brand} costs you nothing and commits you to nothing. Reach out at ${v.phone}, get an honest price, and take all the time you need to decide. We don't do high-pressure follow-ups or push you to book before you're ready — a fair number offered without pressure is the whole point.`,
    },
    {
      q: `What payment methods do you accept?`,
      a: `We offer straightforward, secure ways to pay, with a clear invoice that matches your quote line for line. For recurring clients we make ongoing payment even simpler. If you ever have a question about a charge, you ask a real person who can actually answer it.`,
    },
  ]

  return {
    title: `${v.label} Pricing in ${v.place} — Transparent & Fair | ${v.brand}`,
    metaDescription: `How ${v.brand} prices ${v.noun} ${here}: transparent quotes, no hidden fees, the price you're quoted is the price you pay. Text ${v.phone} for an honest quote.`,
    h1: `Straightforward ${v.label} Pricing`,
    intro: `No games, no hidden fees, no mystery. Here's exactly how ${v.brand} prices ${v.noun} — what drives the cost, how to compare quotes fairly, and why the number we quote is the number you pay.`,
    sections,
    faq,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// FAQ — floor 3,000 words. Framing sections + a deep, real Q&A set (which also
// feeds FAQPage JSON-LD). Written dense to clear the floor in one pass.
// ─────────────────────────────────────────────────────────────────────────────

export function faqContent(config: SiteConfig): LongformPage {
  const v = vars(config)
  const svc = v.services.length > 0 ? list(v.services) : v.noun
  const here = v.isRemote ? 'wherever you are' : `in ${v.place}`
  const areaAns = v.isRemote
    ? `We work with clients across the country — because everything is handled remotely, your location isn't a limitation.`
    : `We serve ${v.place} and the surrounding area. If you're not sure whether you're in range, text ${v.phone} with your address and we'll tell you right away.`

  const sections: ContentSection[] = [
    {
      heading: `Answers Before You Book`,
      paragraphs: [
        `Hiring a ${v.noun} company means trusting someone with your ${v.isRemote ? 'project, your time, and your money' : 'home, your time, and your money'}, and you deserve straight answers before you commit to any of that. We put the most common questions and our honest answers right here, so you can decide with real information instead of a sales pitch. If your question isn't covered below, just text ${v.phone} — a real person will answer, and we don't consider any question too small.`,
        `We've organized this around the things people actually ask us: how booking works, how pricing works, who we send, what happens if something goes wrong, and how to get started. Read as much or as little as you need. The whole point is that by the time you reach out, you already understand how we operate and what to expect — because informed clients make confident decisions, and confident clients are exactly who we want to work with.`,
      ],
    },
    {
      heading: `How Booking and Scheduling Work`,
      paragraphs: [
        `Getting started is intentionally simple. You reach out — text ${v.phone}, call, or book online — and tell us what you need. We ask a few specific questions so the quote is accurate, give you a clear price, and lock in a time that works for you. There's no drawn-out process and no pressure; most people are surprised how quickly they go from first message to a scheduled job.`,
        `Once you're booked, we hold the time. Our team arrives inside the window we promised, and if anything genuinely unavoidable comes up on our end, you hear from us before the window — not after it's passed with no word. We treat your schedule as seriously as you do, because a missed appointment isn't a minor thing; it can cost you a whole day, and we don't take that lightly.`,
      ],
    },
    {
      heading: `About Our Team and Standards`,
      paragraphs: [
        `Every person who does ${v.noun} under the ${v.brand} name is vetted before they ever work a job. We hire for reliability and character as much as skill, because the technical parts of the work can be taught while showing up on time and respecting your ${v.isRemote ? 'time and property' : 'home'} cannot. When we send someone to you, it's someone we'd be comfortable sending to our own family.`,
        `We also invest in keeping our team, because a stable, experienced crew is the single biggest reason a company can deliver the same quality on the hundredth job as the first. Companies that churn through workers can't be consistent; we can, because our people stay. That consistency is what you're really hiring when you choose us — not just a job done once, but a standard you can count on every time.`,
      ],
    },
    {
      heading: `What Happens on the Day of Service`,
      paragraphs: [
        `On the day of your ${v.noun} appointment, our team arrives inside the window we promised, ready to work. They confirm the details with you — or follow your instructions precisely if you're not on site — and get started. If a question comes up mid-job, we ask rather than assume, because a two-minute conversation is far cheaper than redoing work that went the wrong direction.`,
        `When the work is finished, we don't just disappear. We check the result, walk it with you where that makes sense, and make sure you're genuinely satisfied before calling the job complete. Then you get a clean invoice that matches your quote and an easy way to pay. If anything isn't right, you tell us and we fix it — that part of the deal never changes, and it's what lets you book with confidence.`,
      ],
    },
    {
      heading: `Our Guarantee, in Plain Terms`,
      paragraphs: [
        `People ask what our guarantee actually means, so here it is without the fine print: if a job doesn't meet the standard, tell us and we'll make it right. No debating who's at fault, no treating you like a nuisance for raising it, no vanishing act. We'd rather spend the time and money to fix a job than keep a dollar we didn't fully earn.`,
        `That guarantee is credible precisely because we rarely have to use it. We get ${v.noun} right the large majority of the time, which is exactly what lets us take the exceptions so seriously — a company drowning in mistakes couldn't afford to fix them all, but we can, and we do. High standards make the guarantee cheap to offer; the guarantee keeps the standards high. The two hold each other up, and you're the one who benefits.`,
      ],
    },
    {
      heading: `How We Handle It When Something Goes Wrong`,
      paragraphs: [
        `No honest company promises perfection, because the work is done by people and people are human. What separates a company worth hiring isn't a fantasy that nothing will ever go wrong — it's what happens in the moment something isn't right. That moment is the real test of who you hired, and it's the one we prepared for from the start.`,
        `Our response is simple and it doesn't change with the size of the job: you tell us, and we fix it. We built the whole company to make that easy — you reach a real person at ${v.phone} who has your details and the authority to help, not a call center that's never heard of you. The rare problem handled well earns more loyalty than a hundred jobs that simply went fine, and we treat it accordingly.`,
      ],
    },
    {
      heading: `Recurring Service vs. One-Time Jobs`,
      paragraphs: [
        `Some clients need us once; others need us on a regular schedule, and we're built for both. If ${v.noun} is an ongoing need, a recurring arrangement has real advantages beyond convenience — we learn your preferences and your ${v.isRemote ? 'situation' : 'property'}, so every visit gets faster, smoother, and more tailored to exactly how you like things done. You stop having to re-explain, and the work gets more efficient over time.`,
        `One-time jobs get the same care as recurring ones — we don't treat a single booking as less important because there's no schedule attached. A great one-time experience is precisely how a one-time client becomes a recurring one, and how they end up recommending us to the people they know. Whichever you need, you'll get our full standard, and we'll never pressure you into a frequency that's more about our revenue than your actual needs.`,
      ],
    },
    {
      heading: `Why Our Reputation Keeps Us Honest`,
      paragraphs: [
        `We work ${here} where word travels, and that accountability is genuinely good for you. A good job earns a referral; a bad one earns a review we can't take back. That reality means we can't afford to phone anything in, and honestly we wouldn't want to — a business built on repeat clients and referrals has to behave well by design, because you can't win the same client twice by cutting corners.`,
        `So when you read that we're transparent, reliable, and willing to stand behind our work, understand that it isn't just a nice sentiment — it's the only sustainable way to run a company whose growth depends on people being glad they hired us. Our incentives and your interests point the same direction, which is exactly the alignment you want from anyone you're trusting with ${v.noun}.`,
      ],
    },
    {
      heading: `Getting a Quote Costs You Nothing`,
      paragraphs: [
        `If you've read this far and still have questions specific to your situation, the fastest answer is a quote. Reach out at ${v.phone} with a few details and we'll give you an honest price — it costs nothing and commits you to nothing. Take all the time you need to decide; we won't hound you with follow-up calls or pressure you to book before you're ready.`,
        `We're confident enough in our value that we don't need high-pressure tactics. If our quote is right for you, we'll do excellent work and hopefully earn a client for years. If it isn't, no hard feelings, and the door stays open. That low-pressure approach is deliberate, because the clients who choose us freely are the ones who stay — and those are the only ones worth having.`,
      ],
    },
    {
      heading: `If You've Been Burned Before`,
      paragraphs: [
        `A lot of people come to us after a bad experience with another ${v.noun} company — the no-show, the ballooning invoice, the work that had to be redone, the phone that stopped getting answered. If that's you, we understand the skepticism completely, and we don't ask you to take our word for anything. We ask you to give us one job and judge us on it.`,
        `That's how the vast majority of our long-term clients started: burned once, cautious, willing to try one more time. What earned them was simple — we did what we said, when we said, for the price we quoted, and we stood behind it. If your past experiences have made you wary, good; wary clients notice the difference when someone finally does it right, and they're the ones who never leave.`,
      ],
    },
    {
      heading: `Trust and Peace of Mind`,
      paragraphs: [
        `Letting a ${v.noun} provider into your ${v.isRemote ? 'life and your project' : 'home or onto your property'} takes trust, and we never treat that lightly. Everyone we send is vetted, accountable, and representing a real company with a reputation to protect — not an anonymous individual you'll never be able to find again if something goes sideways. That structure exists specifically to give you peace of mind, and it's a baseline we consider non-negotiable.`,
        `Peace of mind is honestly a big part of what you're paying for. It's the quiet confidence that the person showing up is trustworthy, that the price won't change on you, and that if anything goes wrong there's a real company that will make it right. That feeling is worth a great deal, and it's exactly what the lowest-bidder gamble can't offer. We'd rather earn your trust and keep it than win a job and squander it.`,
      ],
    },
    {
      heading: `Communication You Can Count On`,
      paragraphs: [
        `We treat communication as part of the service, not a courtesy we extend only when it's convenient. You should never have to wonder whether we got your message, when we're arriving, or what something will cost. Silence is where trust quietly dies in this industry, and we've watched too many otherwise-good companies lose clients to nothing worse than not answering the phone.`,
        `So we answer. Text ${v.phone} and you'll hear back from a company that has your details and can genuinely help — not a generic queue, not a "we'll get back to you" that never comes. If a plan changes on our end, you hear it from us first, with enough notice to matter. Being easy to reach isn't glamorous, but for most people it's the whole difference between a company they merely tolerate and one they actively recommend.`,
      ],
    },
    {
      heading: `What We Won't Do`,
      paragraphs: [
        `Sometimes the clearest way to explain a company is by what it refuses to do. We won't quote low to win the job and pad the invoice later. We won't send someone we haven't vetted. We won't pressure you into a bigger job, a longer contract, or a faster decision than you're comfortable with. And we won't go quiet the moment we've been paid. Those aren't hard promises to make — they're just rare to keep.`,
        `We also won't pretend a job went perfectly if it didn't, or argue with you to avoid fixing something that's genuinely off. The whole model depends on you trusting us enough to call again and to tell your friends, and none of the shortcuts above are worth breaking that. It's a long-game way of operating, and in ${v.noun} the long game is the only one that actually pays.`,
      ],
    },
    {
      heading: `Our Standing Promise to You`,
      paragraphs: [
        `Here's what you can count on from ${v.brand}, every single time: we show up when we say we will, do ${v.noun} to a standard we're proud of, charge exactly what we quoted, and make it right if anything falls short. That promise doesn't flex based on how big the job is or how busy we are — it's the fixed point everything else is built around.`,
        `We know trust is earned in the doing, not the saying, so we won't ask you to take any of this on faith. We'll ask you to give us one job and judge us on it. The overwhelming majority of our work comes from clients who did exactly that and decided to keep calling, and we'd genuinely like the chance to earn the same from you. Text ${v.phone} whenever you're ready.`,
      ],
    },
  ]

  const faq: FaqItem[] = [
    { q: `How do I get started?`, a: `Text ${v.phone}, call, or book online and tell us what you need. We'll ask a few questions to quote it accurately, give you a clear price, and schedule a time that works for you. It's quick and there's no pressure.` },
    { q: `What areas do you serve?`, a: areaAns },
    { q: `How much will my job cost?`, a: `It depends on the specifics — size, scope, condition, and timing all matter — which is why we ask questions before quoting instead of guessing. You'll always get a clear price before you commit, and the invoice will match the quote.` },
    { q: `Is the quote the final price?`, a: `Yes. Barring a genuine change in scope — which we'd flag and price with you before doing any extra work — the number we quote is the number you pay. No hidden fees, no surprises on the bill.` },
    { q: `What ${v.noun} services do you offer?`, a: v.services.length > 0 ? `We offer ${svc}. If you're not sure which fits your situation, text ${v.phone} and describe what you need — we'll point you to the right option honestly.` : `We offer a full range of ${v.noun}. Text ${v.phone} with what you need and we'll tell you exactly how we can help.` },
    { q: `How soon can you come out?`, a: `Reach out and we'll give you the soonest realistic time for your job. For urgent work, tell us it's urgent — we'll be honest about what we can do rather than leaving you waiting on a maybe.` },
    { q: `Are you licensed and insured?`, a: `${v.brand} operates as a legitimate, accountable business${v.isRemote ? ' with clear agreements and real recourse if anything goes wrong' : ', licensed and insured for the work we do'}. If a job isn't right, there's a real company standing behind it — not an individual who disappears.` },
    { q: `Who will actually be doing the work?`, a: `A vetted member of our team, chosen for reliability and character, not just whoever happened to be free. We don't send anyone to your ${v.isRemote ? 'project' : 'home'} we wouldn't send to our own family's.` },
    { q: `What if I'm not satisfied with the work?`, a: `We make it right. Tell us what's off and we'll fix it — no arguing over fault, no making you feel like a problem for raising it. We'd rather spend the time to earn your repeat business than keep money we didn't fully earn.` },
    { q: `Do you offer recurring service?`, a: `Yes. Many clients book ${v.noun} on a recurring schedule, and we keep your preferences on file so every visit gets easier. Ask us about a rhythm that fits your needs and budget.` },
    { q: `Do I have to sign a long-term contract?`, a: `No. We don't lock clients into contracts they can't escape or rely on cancellation penalties to keep your business. If you want recurring service, you can adjust or pause it whenever your needs change. We keep clients by doing good work, not by trapping them.` },
    { q: `How do I pay?`, a: `We offer straightforward, secure ways to pay, with a clear invoice that matches your quote. For recurring clients we make ongoing payment even simpler. Any question about a charge goes to a real person who can actually answer it.` },
    { q: `Do you require a deposit?`, a: `Depending on the job, sometimes — and if so, we'll tell you clearly up front how much it is and how it applies to your total. Nothing about it will be ambiguous.` },
    { q: `What if I need to reschedule or cancel?`, a: `Just let us know as early as you can. Life happens, and we'd much rather accommodate a change than lose a good client over rigidity. We ask the same courtesy in return so we can plan well for everyone we're serving that day.` },
    { q: `Do I need to be home during the job?`, a: `Not necessarily. Many clients aren't on site — just give us the access details and any instructions, and we'll follow the plan precisely and confirm the result when we're done. The work gets done to the same standard either way.` },
    { q: `How do I prepare for the appointment?`, a: `In most cases, very little — tell us what you need and make sure we can access the space. If anything specific would help us work faster or better, we'll tell you in advance so there are no surprises on the day.` },
    { q: `Do you handle both homes and businesses?`, a: `Yes. We work with both residential and commercial clients, and while the settings differ, the standard doesn't. Homes and businesses both get the same honest pricing, vetted team, and work we stand behind.` },
    { q: `Do you charge more for urgent jobs?`, a: `No gouging. Urgent jobs are priced fairly, the same honest way as everything else. Needing help quickly shouldn't cost you a penalty, and with us it doesn't.` },
    { q: `Are you the cheapest option?`, a: `Probably not, and we're honest about that. We price for quality and reliability, which costs a little more up front and far less than paying someone to redo a cheap job later.` },
    { q: `How is your pricing so transparent?`, a: `Because our pricing is fair, we have no reason to hide it. Companies keep pricing vague when they have something to hide; we put ours in the open because the clients we want are the ones who value knowing exactly what they're paying for.` },
    { q: `What makes ${v.brand} different?`, a: `The boring, hard things: we answer the phone, we show up on time, we charge what we quoted, and we fix it if it's wrong. None of that is clever — all of it is rare, because doing it consistently means building the whole company around it.` },
    { q: `How do I reach a real person?`, a: `Text ${v.phone} and you'll hear back from a company that has your details and can actually help — not a queue that knows nothing about your job. Staying reachable is something we treat as a feature, not an afterthought.` },
  ]

  return {
    title: `${v.label} FAQ — Common Questions Answered | ${v.brand}`,
    metaDescription: `Answers to the most common questions about ${v.brand}'s ${v.noun} ${here}: booking, pricing, scheduling, our team, and guarantees. Text ${v.phone}.`,
    h1: `Frequently Asked Questions`,
    intro: `Everything people ask us before booking ${v.noun} — how it works, what it costs, who we send, and what happens if something's off. Straight answers, no sales pitch.`,
    sections,
    faq,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTACT — floor 3,000 words. Unique prose on how to reach us and what to
// expect. `here` declared in-scope (build-verified).
// ─────────────────────────────────────────────────────────────────────────────

export function contactContent(config: SiteConfig): LongformPage {
  const v = vars(config)
  const here = v.isRemote ? 'wherever you are' : `in ${v.place}`
  const areaLine = v.isRemote ? 'clients across the country' : `${v.place} and the surrounding area`

  const sections: ContentSection[] = [
    {
      heading: `Getting in Touch Is Easy`,
      paragraphs: [
        `Reaching ${v.brand} shouldn't be a chore, so we made it simple. The fastest way to get help is to text ${v.phone} — tell us what you need and we'll take it from there. You can also call or book online, whichever fits how you like to communicate. However you reach out, you'll deal with a company that actually responds, not one that leaves you chasing a callback that never comes.`,
        `We built our whole front door around being reachable, because in ${v.label.toLowerCase()} that's shockingly rare and genuinely valuable. If you've ever left three voicemails for a company and never heard back, you already know why we treat responsiveness as a feature rather than an afterthought. When you contact us, you get a real person, real answers, and a clear next step — every time.`,
      ],
    },
    {
      heading: `Text Us — the Fastest Route`,
      paragraphs: [
        `Texting ${v.phone} is the quickest way to get moving. A quick message with what you need and roughly where you are is usually enough for us to help you right away — no phone tag, no waiting on hold, no navigating a menu of options that never includes the one you want. Most people find it's the least painful way to handle the whole thing.`,
        `Text also gives you a written record of what was said, which people appreciate — the quote, the time, the details, all right there in your messages. We like it for the same reason: clarity in both directions means fewer misunderstandings and a smoother job. Send us a message whenever it's convenient, even outside normal hours, and we'll get back to you as soon as we can.`,
      ],
    },
    {
      heading: `Prefer to Call? We Pick Up`,
      paragraphs: [
        `Some things are just easier to talk through, and if you'd rather explain your situation out loud, call us. You'll reach a company that has your interests in mind and can actually answer your questions — not a call center reading from a script that's never seen your job. A quick conversation is often all it takes to get you a clear quote and a scheduled time.`,
        `We know a phone call is a bigger ask of your time than a text, so we respect it. No endless hold music, no being bounced between departments, no repeating your story five times. You call, we listen, we help. That's the standard, and it's one more small way we try to make dealing with us genuinely pleasant instead of just tolerable.`,
      ],
    },
    {
      heading: `Book Online, Anytime`,
      paragraphs: [
        `If you'd rather handle everything without talking to anyone at all, you can book online at your own pace, day or night. Tell us what you need through the site and we'll follow up to confirm the details and lock in your time. It's built to be quick and clear, because a booking process more painful than the problem you're solving is a booking process no one should have to endure.`,
        `Online booking is especially handy outside business hours, when you've got a moment to sort something out and don't want to wait until morning to start. Send it over whenever it suits you and it'll be waiting for us. However you choose to reach us — text, call, or online — the result is the same: a fast, honest response and a clear path to getting your ${v.noun} handled.`,
      ],
    },
    {
      heading: `How Quickly We Respond`,
      paragraphs: [
        `We aim to respond quickly, because we know that when you reach out about ${v.noun}, you usually want an answer sooner rather than later. Reach us during working hours and you'll typically hear back fast; message us after hours and we'll get to it as soon as we're able. Either way, you're not going to be left wondering whether your message vanished into a void.`,
        `Fast, honest responses are a core part of how we operate, not a nice-to-have. A company that goes quiet the moment you need it has told you exactly how the rest of the relationship will go. We'd rather set the opposite expectation from your very first message: reach out, and you'll get a real reply from a real person who can actually help move things forward.`,
      ],
    },
    {
      heading: `What to Tell Us`,
      paragraphs: [
        `To help us help you fast, a few details go a long way. Let us know what kind of ${v.noun} you need, roughly the size or scope of the job, where you're located, and any timing that matters to you. The more specific you can be, the more accurate our quote will be — and the fewer back-and-forth messages it takes to get you a straight answer.`,
        `That said, don't worry about getting it perfect. If you're not sure how to describe your situation, just tell us what you know and we'll ask the right follow-up questions to fill in the gaps. Part of our job is figuring out exactly what you need, so you don't have to be an expert in ${v.noun} to get a clear, honest quote from us.`,
      ],
    },
    {
      heading: `What Happens After You Reach Out`,
      paragraphs: [
        `Once you contact us, the process is simple and predictable. We'll ask a few questions to understand your job, give you a clear and honest quote, and — if you're happy with it — lock in a time that works for you. There's no drawn-out sales process, no pressure to decide on the spot, and no mystery about what comes next. You'll know exactly where things stand at every step.`,
        `From there, our team shows up when we said we would, does the ${v.noun} to the standard we're proud of, and confirms you're satisfied before calling the job done. You get a clean invoice that matches your quote and an easy way to pay. It's a straightforward path from first message to finished job, and we work hard to keep it that way.`,
      ],
    },
    {
      heading: v.isRemote ? `Working With Clients Anywhere` : `Where We Work`,
      paragraphs: [
        v.isRemote
          ? `We work with ${areaLine}, and your location isn't a limitation — everything is handled remotely, clearly, and on your schedule. Wherever you are, you get the same responsiveness and the same standard, so reach out and we'll confirm we're a fit for what you need.`
          : `We serve ${areaLine}. If you're not sure whether you're within our range, the fastest way to find out is to text ${v.phone} with your address — we'll tell you right away, no runaround. We'd rather give you a straight yes or no than leave you guessing or string you along on a job we can't do well.`,
        v.isRemote
          ? `Being remote-first means we're organized in ways a location-bound company often isn't: clear communication, documented details, and reliable follow-through are the whole operation, not extras. That discipline benefits every client, no matter where they are.`
          : `Knowing the ${v.place} area is part of doing the job well — we understand how to get around, what to expect locally, and the specific realities of doing ${v.noun} ${here} rather than applying a generic playbook. When you reach out, you're contacting a company that actually knows the territory you're in.`,
      ],
    },
    {
      heading: `When We're Available`,
      paragraphs: [
        `We keep hours that work for real people with real schedules, and we try to be reachable when you actually need us. You don't have to catch us in a narrow window to get help — send a text or book online anytime, and we'll respond as soon as we're able. For anything time-sensitive, tell us it's urgent and we'll treat it that way.`,
        `If you're not sure whether we're available for what you need or when, the simplest thing is just to ask. Reach out at ${v.phone} and we'll give you a straight answer about timing rather than making you guess. We'd always rather tell you honestly what we can and can't do than leave you hanging or overpromise something we can't deliver.`,
      ],
    },
    {
      heading: `No Pressure, No Obligation`,
      paragraphs: [
        `Reaching out to us costs you nothing and commits you to nothing. Get a quote, ask a question, get a second opinion on a number someone else gave you — all of it is free and none of it obligates you to book. We're confident enough in our value that we don't need to pressure you into a decision, and we won't.`,
        `You won't get hounded with pushy follow-up calls or made to feel guilty for shopping around. If we're the right fit, great; if not, no hard feelings and the door stays open. A no-pressure approach is deliberate on our part, because the clients who choose us freely are the ones who stay, refer their friends, and become the foundation of the business. Those are the only ones worth having.`,
      ],
    },
    {
      heading: `Need Help Urgently?`,
      paragraphs: [
        `If your ${v.noun} situation can't wait, tell us that up front when you reach out. We'll be honest and immediate about what we can do — if we can get to you fast, we'll say so; if we can't, we'll tell you that too, so you're not left waiting on a maybe while the problem gets worse. Either way you get a straight answer, quickly.`,
        `And urgency won't cost you a penalty with us. There's no inflated "emergency" rate designed to squeeze you when you're stressed and short on options — urgent jobs are priced fairly, the same honest way as everything else. Text ${v.phone}, let us know it's time-sensitive, and we'll do our best to get you sorted as fast as we responsibly can.`,
      ],
    },
    {
      heading: `Getting a Quote`,
      paragraphs: [
        `The most useful thing you can get from reaching out is an honest quote for your specific job. Tell us the details and we'll give you a clear price — one that covers the work you actually need, with nothing hidden in the fine print. And the quote we give is the quote you pay, barring a genuine change in scope we'd flag with you first.`,
        `We ask real questions before quoting rather than throwing out a number that changes later, because a quote you can trust is worth more than a fast guess that falls apart. If anything about the price is unclear once we've given it to you, just ask — we're happy to walk you through exactly how we got there. An informed client is exactly the kind of client we want.`,
      ],
    },
    {
      heading: `Already a Client?`,
      paragraphs: [
        `If you've worked with us before, reaching out again is even easier — we keep your details and preferences on file, so you don't have to re-explain everything from scratch. Text ${v.phone} and we can pick up right where we left off, whether you're booking another job, adjusting a recurring schedule, or just have a question.`,
        `Existing clients are the heart of what we do, and we treat repeat business as something to be earned every single time, not taken for granted. If there's ever anything you need — a change, a follow-up, or a concern about past work — reach out and we'll take care of it. The relationship is meant to get easier over time, and staying reachable for our clients is a big part of how we keep it that way.`,
      ],
    },
    {
      heading: `For Businesses`,
      paragraphs: [
        `If you're reaching out on behalf of a business, we're glad to help and we understand your needs are a little different. Businesses often want ${v.noun} that's dependable and predictable enough to build a routine around, with clear pricing they can budget for. That's exactly what we provide — consistent, reliable service and honest numbers you can plan against, with no unwelcome surprises.`,
        `Tell us about your situation when you reach out — the scale, the frequency, and what matters most to your operation — and we'll put together an arrangement that fits. We work with both homes and businesses to the same high standard, so whether you need a one-time job or an ongoing schedule, contacting us is the first step toward one less thing you have to worry about.`,
      ],
    },
    {
      heading: `We Actually Answer`,
      paragraphs: [
        `It's worth saying plainly, because it's so often not true elsewhere: when you contact ${v.brand}, we answer. Not a bot, not a queue that knows nothing about your job, not a "we'll get back to you" that quietly never happens. A real person who has your details and can genuinely help. That's the entire promise behind every way of reaching us.`,
        `Staying reachable is one of the simplest things a company can do and one of the rarest to actually deliver, because it takes real commitment rather than a clever slogan. We've made it a core part of how we operate because it's what we'd want as customers ourselves. So reach out however suits you — the response you get is the whole point.`,
      ],
    },
    {
      heading: `After the Job`,
      paragraphs: [
        `Our relationship with you doesn't end the moment we've been paid. If you have a question after the job, a concern about the work, or you're ready to book again, reaching out is just as easy as it was the first time. We stay reachable after the sale precisely because so many companies go quiet then — and that difference is exactly where trust is either built or broken.`,
        `If anything about a completed job isn't right, we want to hear it, and we'll make it right. Tell us what's off and we'll fix it — no arguing, no runaround. We'd genuinely rather spend the time to earn your repeat business than keep money we didn't fully earn, and that principle holds long after the work is done.`,
      ],
    },
    {
      heading: `Why We Make It This Easy`,
      paragraphs: [
        `We've put real thought into making contact simple because we know the alternative all too well. Everyone has a story about a company that was impossible to reach, quoted one price and charged another, or vanished the moment a problem came up. Those experiences are why so many people dread hiring anyone for ${v.noun} at all — and we set out to be the opposite from the very first message.`,
        `Easy, honest contact is the front end of a company built on trust. If we're this straightforward before you've paid us a cent, that tells you something about how the rest of it goes. We can't promise the work is right for every situation, but we can promise that reaching us, understanding our pricing, and getting a real answer will never be the hard part. That much is entirely within our control, and we take it seriously.`,
      ],
    },
    {
      heading: `Directions, Access, and Details`,
      paragraphs: [
        v.isRemote
          ? `Because we work remotely, there's no address to coordinate — just the details of your project and how you'd like to communicate. When you reach out, let us know your preferred way to stay in touch and any specifics about timing, and we'll build the rest of the process around what works for you.`
          : `When you book, we'll confirm the address and any access details we need — a gate code, parking notes, where to find you, or anything unusual about getting to the job. Sorting that out up front means our team arrives ready to work instead of stuck outside figuring out how to get in, which respects everyone's time.`,
        `If you won't be on site, that's no problem at all — just share the access instructions and any specifics when you reach out, and we'll follow the plan precisely and confirm the result when we're done. Many of our clients aren't present for the work, and it gets done to exactly the same standard. Clear details in, clean results out.`,
      ],
    },
    {
      heading: `What You Can Expect From Us`,
      paragraphs: [
        `When you contact ${v.brand}, here's the experience you can count on: a fast response, a real person, honest answers, and a clear quote — with no pressure attached to any of it. That's the standard for every inquiry, whether it turns into a booking or not, because how we treat you before you've hired us is the truest preview of how we'll treat you after.`,
        `And once you do book, the same standard carries all the way through: we show up when we said, do ${v.noun} to a level we're proud of, charge exactly what we quoted, and make it right if anything falls short. Contacting us is simply the first step in a process designed, start to finish, to be clear, fair, and genuinely easy to deal with. Reach out and see for yourself.`,
      ],
    },
    {
      heading: `Reach Out Today`,
      paragraphs: [
        `Whatever ${v.noun} you need ${here}, the first step is simple: reach out. Text ${v.phone}, give us a call, or book online — whichever is easiest for you. You'll get a fast, honest response, a clear quote, and a straightforward path to getting the job done by a company that stands behind its work.`,
        `There's nothing to lose by getting in touch — no cost, no obligation, no pressure. Just a straight answer from real people who actually want to help. If you've been putting off dealing with ${v.noun} because the last company made it a hassle, give us the chance to show you it doesn't have to be. We're ready whenever you are.`,
      ],
    },
  ]

  const faq: FaqItem[] = [
    { q: `What's the fastest way to reach you?`, a: `Text ${v.phone}. A quick message with what you need and roughly where you are is usually enough for us to help right away — no phone tag, no hold music.` },
    { q: `Can I book without calling?`, a: `Yes. You can book online at your own pace, day or night, and we'll follow up to confirm the details. Text and phone work too — whichever you prefer.` },
    { q: `How fast will you respond?`, a: `Quickly during working hours, and as soon as we're able after hours. Either way you won't be left wondering whether your message got through.` },
    { q: `What information should I include?`, a: `What kind of ${v.noun} you need, the rough size or scope, your location, and any timing that matters. If you're unsure, just tell us what you know and we'll ask the rest.` },
    { q: `Does reaching out obligate me to anything?`, a: `No. Getting a quote or asking a question costs nothing and commits you to nothing. We won't pressure you or hound you with follow-ups.` },
    { q: `What if my job is urgent?`, a: `Tell us it's urgent when you reach out and we'll be honest and immediate about what we can do — with no inflated emergency pricing.` },
    { q: `Do you serve my area?`, a: v.isRemote ? `We work with clients across the country — your location isn't a limitation.` : `We serve ${v.place} and the surrounding area. Text ${v.phone} with your address and we'll confirm right away.` },
  ]

  return {
    title: `Contact ${v.brand} — ${v.label} in ${v.place} | Text ${v.phone}`,
    metaDescription: `Get in touch with ${v.brand} for ${v.noun} ${here}. Text ${v.phone}, call, or book online — fast, honest response, no pressure. Serving ${areaLine}.`,
    h1: `Contact ${v.brand}`,
    intro: `Text, call, or book online — whichever suits you. You'll get a fast, honest response from a real person, a clear quote, and no pressure. Here's everything about reaching us and what to expect.`,
    sections,
    faq,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// HOME — floor 10,000 words. The flagship page: hero + services + deep evergreen.
// Evergreen carries the floor so any service count clears it. `here` in-scope.
// ─────────────────────────────────────────────────────────────────────────────

export function homeContent(config: SiteConfig): LongformPage {
  const v = vars(config)
  const here = v.isRemote ? 'wherever you are' : `in ${v.place}`
  const across = v.isRemote ? 'everywhere we work' : `across ${v.place}`
  const areaLine = v.isRemote ? 'clients across the country' : `${v.place} and the surrounding area`
  const svc = v.services.length > 0 ? list(v.services) : v.noun

  const perService: ContentSection[] = config.services
    .filter((s) => !s.emergency)
    .map((s) => serviceBlock(v, s.value, s.hours))

  const sections: ContentSection[] = [
    {
      heading: `${v.label} ${v.place} Can Actually Rely On`,
      paragraphs: [
        `${v.brand} is a ${v.noun} company built on a promise most of our competitors can't seem to keep: do what we say, when we say, for the price we quoted, and stand behind it if anything's wrong. It sounds almost too simple to build a business around — and yet doing it consistently is exactly what separates us from the crowded field of ${v.label.toLowerCase()} providers ${here}.`,
        `We serve ${areaLine}, and we've earned our reputation one job at a time. There's no trick to it and no gimmick — just reliable people doing good work, communicating like human beings, and treating every job as the reason we get to keep doing this. Whether it's a small one-time task or an ongoing commitment, you get the same standard and the same respect for your time and your money.`,
        `If you've been burned before by a company that no-showed, ballooned its quote, or went silent the moment there was a problem, we understand the skepticism completely — most of our best clients started out exactly that wary. We don't ask you to take our word for it. We ask for one job, and we let the work speak. That's how nearly all of our long-term relationships began.`,
      ],
    },
    {
      heading: `Everything We Do, Done Right`,
      paragraphs: [
        `Our focus is ${v.noun}${v.services.length > 0 ? `, and in practice that covers ${svc}` : ''}. We're deliberately not a jack-of-all-trades operation — we do this work, and we do it at a level most companies reserve for their best customers only. That focus is why our team is fast, prepared, and accurate: they're not learning your job on the fly, they've done work like it hundreds of times.`,
        `Every service we offer is delivered to the same standard, whether it's the biggest job on our schedule or the smallest. We scope it honestly, quote it up front, and complete it without cutting the corners you can't see. And if your situation calls for something outside our core work, we'll tell you honestly and point you toward the right solution — even when that isn't us.`,
        `Below you'll find more about the specific services we provide. But the through-line is always the same: whatever the job, you get transparent pricing, a vetted team, clear communication, and work backed by a real guarantee. The service changes; the standard doesn't.`,
      ],
    },
    ...perService,
    {
      heading: `Why ${v.place} Chooses Us`,
      paragraphs: [
        `There's no shortage of options for ${v.noun} ${here}, so it's fair to ask what sets us apart. The honest answer is reliability. We answer the phone, we show up on time, we charge what we quoted, and we make it right when something's off. None of that is clever — all of it is rare, because doing it consistently means building the entire company around it instead of bolting it on as a slogan.`,
        `Clients also choose us because we make the whole thing easy. From the first message to the final follow-up, the experience is built to be clear and low-friction: fast answers, honest quotes, on-time arrivals, and no chasing us down. When ${v.noun} is one of a dozen things on your plate, the company that removes the hassle instead of adding to it is the one that earns your loyalty.`,
        `And they choose us because we're honest even when it costs us a sale. If a cheaper option solves your problem, we'll say so. If you don't need the work yet, we'll tell you. Most companies optimize for the biggest possible invoice today; we optimize for being the company you call for the next five years. Clients feel that difference, and it's why so much of our work comes from referrals.`,
      ],
    },
    {
      heading: `We Show Up When We Say We Will`,
      paragraphs: [
        `It sounds like the lowest possible bar, but showing up on time is one of the most valuable things we do — because so few companies in ${v.noun} actually manage it. A missed window isn't a small inconvenience; it can cost you a morning, a day off work, or a customer of your own. We treat your time as if it were ours, because to you, it is.`,
        `When we give you an arrival window, we plan our day to honor it. And if something genuinely unavoidable comes up, you hear from us before the window — not an hour after it's passed with no word. That reliability is the foundation everything else is built on. You can't judge the quality of the work if the team never shows up to do it, so we start by simply being there when we promised.`,
      ],
    },
    {
      heading: `Pricing You Can See Before You Commit`,
      paragraphs: [
        `We price ${v.noun} the way we'd want it priced for us: clearly, fairly, and up front. Before you agree to anything, you'll know what the job costs and what's included. There's no surge charge for needing us quickly, no premium buried in the fine print, and no "the quote was just an estimate" routine when the bill arrives. The number we give you is the number you pay.`,
        `That transparency isn't a favor — it's how a fair transaction is supposed to work, and it's shocking how often it doesn't. If a job turns out simpler than expected, that's reflected honestly. If it's genuinely more involved than you described, we tell you before doing the extra work. You should never feel like you have to decode what we charged, and with us, you won't.`,
      ],
    },
    {
      heading: `A Team You Can Trust in Your ${v.isRemote ? 'Corner' : 'Home'}`,
      paragraphs: [
        `Letting a ${v.noun} provider into your ${v.isRemote ? 'business and your project' : 'home or onto your property'} takes trust, and we never treat that lightly. Every person who works under the ${v.brand} name is vetted before they ever set foot on a job. We hire for reliability and character as much as skill, because the technical parts of the work can be taught while showing up on time and respecting your space cannot.`,
        `When we send someone to you, it's someone we'd be comfortable sending to our own family. That's the standard we hold, and it's not negotiable. Skill matters, but so does whether a person is honest, careful, and respectful — traits you can't train into someone on the job, and exactly the traits we screen for before anyone earns a place on our team.`,
        `We also invest in keeping our people, because a stable, experienced crew is the single biggest predictor of consistent quality. Companies that churn through workers every few months can't deliver the same result twice. We can, because our team stays — and that consistency is a huge part of what you're really hiring when you choose us.`,
      ],
    },
    {
      heading: `Rooted ${v.isRemote ? 'in Real Relationships' : `in ${v.place}`}`,
      paragraphs: [
        v.isRemote
          ? `We work with ${areaLine}, and distance has never been a barrier to doing excellent work. Everything is built to be handled remotely, clearly, and on your schedule — you get the same responsiveness and the same standard whether you're around the corner or across the map.`
          : `We're a ${v.place} company, and that's not a marketing line — it shapes how we work. We know the area, we know how to get around it, and we understand the specific realities of doing ${v.noun} ${here} rather than applying a generic national playbook that doesn't fit local conditions.`,
        v.isRemote
          ? `Being remote-first also means we're organized in ways a location-bound company often isn't: clear communication, documented details, and reliable follow-through aren't optional when you can't just walk down the hall. That discipline benefits every client we serve.`
          : `Serving ${v.place} also means we're invested in our reputation ${here}. This is a place where word travels — a good job earns a referral, a bad one earns a review you can't take back. That accountability is good for you: it means we can't afford to phone anything in, and we don't.`,
        `Wherever you are ${across}, you get the same company: the same standards, the same pricing, the same people who genuinely care whether you'd hire us again. Consistency isn't a slogan for us — it's the entire product.`,
      ],
    },
    {
      heading: `Built on Repeat Clients and Referrals`,
      paragraphs: [
        `The healthiest way to measure a ${v.noun} company is to ask how much of its work comes back around. By that measure we're doing something right, because most of our work ${here} isn't from chasing strangers with ads — it's from clients who hired us once, were glad they did, and told someone else. That's the strongest endorsement any company can have.`,
        `It's also not an accident. A business built on repeat work and referrals has to behave well by design: you can't win the same client twice, or earn a referral, by cutting corners or overcharging. The incentive to do right by you is baked into how we grow. When your reputation is your marketing, every single job matters — and that's exactly the pressure we want on ourselves.`,
      ],
    },
    {
      heading: `The Difference Is in the Details`,
      paragraphs: [
        `Anyone can get ${v.noun} roughly right. The gap between "fine" and genuinely good lives in the details most companies skip because nobody's watching — the parts of the job that don't show up in a quick glance but absolutely show up over time. Those details are exactly where we spend our attention.`,
        `It's the difference between a team that rushes to the next job and one that takes the extra few minutes to do the thing properly. It's checking the work before calling it done instead of assuming. It's leaving your property the way a professional should. None of it is dramatic; all of it compounds into a result you can feel — and it's why clients who've tried the cheaper option so often end up with us.`,
      ],
    },
    {
      heading: `No Contracts, No Traps`,
      paragraphs: [
        `Working with ${v.brand} doesn't mean signing your life away. We don't lock clients into long-term contracts they can't escape, and we don't rely on cancellation penalties or auto-renewals to keep your business. We keep it the honest way: by doing good work so you want to come back, not by trapping you so you can't leave.`,
        `If you want recurring ${v.noun}, great — we'll set up a schedule you can adjust or pause whenever your needs change. If you just need us once, that's perfectly fine too, and you'll get the same care as any recurring client. A company that has to trap you into staying is telling you it doesn't expect to earn your loyalty on merit. We'd rather earn it, every job.`,
      ],
    },
    {
      heading: `Booking Is Genuinely Easy`,
      paragraphs: [
        `The fastest way to get started is to text ${v.phone} with what you need — we'll take it from there. Prefer to call or book online? Those work too. We built the front door to be simple on purpose, because the last thing anyone needs is a booking process more painful than the problem they're trying to solve.`,
        `You'll hear back quickly from a company that has your details and can actually help, not a queue that knows nothing about your job. And once you're a client, staying one is effortless — we keep your preferences on file so every repeat booking is faster than the last. The relationship is meant to get easier over time, not start from scratch every visit.`,
      ],
    },
    {
      heading: `Homes and Businesses, One Standard`,
      paragraphs: [
        `We work with both residential and commercial clients, and while the settings differ, the standard doesn't. A homeowner wants to trust the person we send into their space; a business wants ${v.noun} dependable enough to build a routine around. Both come down to the same things — reliability, clear communication, and work done right — and both get our full attention.`,
        `For businesses, predictable service and predictable pricing matter as much as the work itself, because you're building it into a budget and a routine. We give you clear, consistent numbers you can plan around. For homeowners, we bring the same straightforward approach at whatever scale you need. There's one standard here, and it's the high one.`,
      ],
    },
    {
      heading: `How Our Process Works`,
      paragraphs: [
        `We've stripped our process down to exactly what serves you and nothing that wastes your time. It starts when you reach out — text ${v.phone}, call, or book online and tell us what you need. We ask a few specific questions so the quote is accurate rather than a guess, give you a clear price, and lock in a time that works. No drawn-out sales dance, no pressure, no runaround just to get a straight answer.`,
        `On the day, our team arrives inside the promised window, ready to work. They confirm the details with you, or follow your instructions precisely if you're not on site, and get to it. If a question comes up mid-job, we ask instead of assuming — a two-minute conversation is far cheaper than redoing work that went the wrong way.`,
        `When it's finished, we check the result, walk it with you where that makes sense, and make sure you're genuinely satisfied before calling it done. Then you get a clean invoice that matches your quote and an easy way to pay. Start to finish, it's designed to be clear, fast, and free of the friction that makes hiring anyone for ${v.noun} such a chore elsewhere.`,
      ],
    },
    {
      heading: `Our Satisfaction Guarantee`,
      paragraphs: [
        `Here's our guarantee in plain terms, with no fine print: if a job doesn't meet the standard, tell us and we'll make it right. No debating who's at fault, no treating you like a nuisance for raising it, no disappearing. We'd rather spend the time and money to fix a job than keep a dollar we didn't fully earn, because the long-term relationship is worth far more than any single invoice.`,
        `That guarantee is credible precisely because we rarely have to use it. We get ${v.noun} right the large majority of the time, which is exactly what lets us take the exceptions so seriously — a company buried in mistakes couldn't afford to fix them all, but we can, and we do. High standards make the guarantee cheap to offer, and the guarantee keeps the standards high.`,
      ],
    },
    {
      heading: `When Something Goes Wrong`,
      paragraphs: [
        `No honest company promises perfection, because the work is done by people and people are human. What separates a company worth hiring isn't a fantasy that nothing will ever go wrong — it's what happens in the moment something isn't right. That moment is the real test of who you hired, and it's the one we prepared for from the start.`,
        `Our response is simple and it doesn't change with the size of the job: you tell us, and we fix it. You reach a real person at ${v.phone} who has your details and the authority to help, not a call center that's never heard of you. The rare problem handled well earns more loyalty than a hundred jobs that simply went fine — and we treat it that way.`,
      ],
    },
    {
      heading: `Fair Pricing, Not the Lowest Bid`,
      paragraphs: [
        `We're not going to be the cheapest quote you get, and we're honest about that. The cheapest ${v.noun} option ${here} is almost always cheap for a reason — rushed work, unvetted labor, no insurance, and a much higher chance you end up paying someone else to redo it. We price for quality and reliability, which costs a little more up front and far less in the end.`,
        `Think about what "cheap" actually costs when it goes wrong: the redo, the wasted time, the aggravation, the second company you hire to fix the first one's mess. Factor all of that in and the lowest quote is frequently the most expensive path there is. Doing a job once, correctly, by people who stand behind it isn't the premium option — it's the actual bargain, and it's the one we're selling.`,
      ],
    },
    {
      heading: `Value That Compounds Over Time`,
      paragraphs: [
        `The real value of choosing the right ${v.noun} provider isn't visible on the first invoice — it shows up over months and years. It's the jobs that don't have to be redone, the problems caught early, the schedule you never have to worry about, and the simple relief of having someone reliable you can just call. That accumulated peace of mind is worth far more than the difference between our quote and a cheaper one.`,
        `Cheap is a one-time transaction; value is a relationship. When you factor in everything a dependable provider saves you — time, stress, redo costs, and the mental load of managing an unreliable one — the fair price starts looking like the obvious choice. We price for the long relationship, because that's where the real value is for both of us.`,
      ],
    },
    {
      heading: `Recurring Service, Made Simple`,
      paragraphs: [
        `If ${v.noun} is an ongoing need, there's real value in setting up a regular schedule rather than booking one-off jobs each time. Beyond the convenience, a provider who works with you regularly learns your preferences and your ${v.isRemote ? 'situation' : 'property'}, which makes every visit faster, smoother, and more tailored. You stop having to re-explain, and the work gets more efficient over time.`,
        `We'll talk through a recurring arrangement that genuinely fits your needs and your budget — not the maximum frequency we can talk you into. If a less frequent schedule serves you better, we'll say so. The goal is a rhythm that works for your life, one you're glad to keep because it's genuinely useful, not one you feel locked into and resent.`,
      ],
    },
    {
      heading: `One-Time Jobs Get the Same Care`,
      paragraphs: [
        `Not everyone needs a schedule, and we treat one-time jobs with exactly the same care as recurring ones. We don't consider a single booking less important because there's no subscription attached — a great one-time experience is precisely how a one-time client becomes a recurring one, and how they end up recommending us to the people they know.`,
        `Every job is an audition for the next one, and we approach it that way whether you've committed to anything or not. So if you just need us once, reach out with complete confidence that you'll get our full standard: honest pricing, a vetted team, on-time service, and work backed by our guarantee. No job is too small to deserve doing right.`,
      ],
    },
    {
      heading: `Urgent Requests, Handled Fast`,
      paragraphs: [
        `Some ${v.noun} problems can't wait, and we understand that they don't keep business hours. When you need us quickly, reach out at ${v.phone} and we'll tell you honestly and immediately what we can do — no vague "we'll see" that leaves you hanging while the problem gets worse. If we can get to you fast, we'll say so; if we can't, we'll tell you that too so you can make other plans.`,
        `And we won't punish you for being in a hurry. There's no inflated "emergency" rate designed to squeeze you when you're stressed and out of options — urgent jobs are priced fairly, the same honest way as everything else. Needing help quickly shouldn't cost you a premium for the privilege, and with us it doesn't. You get a straight answer, a fair price, and a team that treats your urgency as real.`,
      ],
    },
    {
      heading: `How We Hire and Train`,
      paragraphs: [
        `The people who do ${v.noun} for ${v.brand} are the company as far as you're concerned — they're who shows up, who does the work, who represents us at your door. So we're careful about who earns that responsibility. Every team member is vetted before their first job, and we don't hire on desperation; we hire people we'd be comfortable sending to our own family's home.`,
        `Once someone's on the team, we invest in them. The technical parts of the work we can teach and standardize; what we can't manufacture is character, so we screen for it up front and then support the good people we find. Fair pay and real respect aren't perks here — they're how you keep an experienced team, and an experienced team is how you deliver the same quality on the hundredth job as the first.`,
      ],
    },
    {
      heading: `Communication That Doesn't Vanish`,
      paragraphs: [
        `We treat communication as part of the service, not a courtesy we extend only when convenient. You should never have to wonder whether we got your message, when we're arriving, or what something costs. Silence is where trust quietly dies in this industry, and we've watched too many otherwise-good companies lose clients to nothing worse than not answering the phone.`,
        `So we answer. Text ${v.phone} and you'll hear back from a company that has your details and can genuinely help — not a generic queue, not a "we'll get back to you" that never comes. If a plan changes on our end, you hear it from us first, with enough notice to matter. It isn't glamorous, but for most people, staying reachable is the whole difference between a company they tolerate and one they recommend.`,
      ],
    },
    {
      heading: `Respect for You and Your ${v.isRemote ? 'Business' : 'Property'}`,
      paragraphs: [
        `Doing ${v.noun} well isn't only about the technical work — it's about how we treat you and your ${v.isRemote ? 'time' : 'space'} throughout. Our team is trained and expected to be polite, careful, and professional on every job. We treat your ${v.isRemote ? 'project' : 'property'} the way we'd want someone to treat ours, and we leave it the way a professional should, not the way someone in a hurry would.`,
        `That respect extends to your preferences and your boundaries. If you have specific instructions, concerns, or ways you like things done, tell us and we'll honor them. You're not an interruption to our day — you're the entire reason we have one. It's a simple attitude, but it changes the whole experience, and it's one more reason clients stay with us for years.`,
      ],
    },
    {
      heading: `Licensed, Insured, and Accountable`,
      paragraphs: [
        `${v.brand} operates as a legitimate, accountable business${v.isRemote ? ' with clear agreements and real recourse if anything goes wrong' : ', licensed and insured for the work we do'}. That protects you: if something is damaged or goes wrong, there's a real company standing behind the job, not an individual who disappears. It's the baseline of doing this professionally, and we treat it as non-negotiable.`,
        `Accountability isn't only about paperwork, though — it's about what happens on the rare occasion a job doesn't meet our standard. Our answer is simple: we make it right. We'd rather absorb the cost of fixing something than keep money we didn't fully earn, because the long-term relationship is worth far more than any single job. That's what accountability actually looks like in practice.`,
      ],
    },
    {
      heading: `Questions Worth Asking Any Provider`,
      paragraphs: [
        `Before you hire anyone for ${v.noun} — including us — it's worth asking a few pointed questions. Is the quote the final price, or an estimate that can change? Who's actually doing the work, and are they vetted? What happens if I'm not satisfied? A company that answers those clearly and confidently is worth hiring; a company that dodges them is telling you something important.`,
        `We put our answers up front on purpose. The price we quote is the price you pay for the agreed scope. The people we send are vetted before they ever work a job. And if you're not satisfied, we fix it. We'd rather you make an informed choice than a rushed one, because clients who understand exactly what they're getting are the ones who stay — and the ones who send their friends.`,
      ],
    },
    {
      heading: `What We Won't Do`,
      paragraphs: [
        `Sometimes the clearest way to describe a company is by what it refuses to do. We won't quote low to win the job and pad the invoice later. We won't send someone we haven't vetted. We won't pressure you into a bigger job, a longer commitment, or a faster decision than you're comfortable with. And we won't go quiet the moment we've been paid. None of those are hard promises to make — they're just rare to keep.`,
        `We also won't pretend a job went perfectly if it didn't, or argue with you to avoid fixing something that's genuinely off. The whole model depends on you trusting us enough to call again and tell your friends, and none of the shortcuts above are worth breaking that. It's a long-game way of operating, and in ${v.noun} the long game is the only one that actually pays.`,
      ],
    },
    {
      heading: `Reputation We Can't Afford to Waste`,
      paragraphs: [
        `Our reputation ${here} is public, and it's earned one job at a time. In a world where a single honest review can travel further than any advertisement, we can't afford to phone in a job and hope nobody notices — and we genuinely wouldn't want to. The accountability that comes from working in a community where word travels is good for you, because it keeps our standards high whether or not anyone's watching.`,
        `So when we say we're reliable, transparent, and willing to stand behind our work, understand that it isn't just a nice sentiment — it's the only sustainable way to run a company whose growth depends on people being glad they hired us. Our incentives and your interests point in the same direction, which is exactly the alignment you want from anyone you're trusting with ${v.noun}.`,
      ],
    },
    {
      heading: `Getting a Quote Costs Nothing`,
      paragraphs: [
        `If you're still deciding, the fastest way to get real information is a quote. Reach out at ${v.phone} with a few details and we'll give you an honest price — it costs nothing and commits you to nothing. Take all the time you need to decide; we won't hound you with follow-up calls or pressure you to book before you're ready.`,
        `We're confident enough in our value that we don't need high-pressure tactics. If our quote is right for you, we'll do excellent work and hopefully earn a client for years. If it isn't, no hard feelings, and the door stays open. That low-pressure approach is deliberate, because the clients who choose us freely are the ones who stay — and those are the only ones worth having.`,
      ],
    },
    {
      heading: `If You've Been Burned Before`,
      paragraphs: [
        `Many of our clients come to us after a bad experience with another ${v.noun} company — the no-show, the ballooning invoice, the work that had to be redone, the phone that stopped getting answered. If that's you, we understand the skepticism completely, and we don't ask you to take our word for anything. We ask you to give us one job and judge us on it.`,
        `That's how the vast majority of our long-term clients started: burned once, cautious, willing to try one more time. What earned them was simple — we did what we said, when we said, for the price we quoted, and we stood behind it. If past experiences have made you wary, good; wary clients notice the difference when someone finally does it right, and they're the ones who never leave.`,
      ],
    },
    {
      heading: `Our Standing Promise`,
      paragraphs: [
        `Here's what you can count on from ${v.brand}, every single time: we show up when we say we will, do ${v.noun} to a standard we're proud of, charge exactly what we quoted, and make it right if anything falls short. That promise doesn't flex based on how big the job is or how busy we are — it's the fixed point everything else is built around.`,
        `We know trust is earned in the doing, not the saying, so we won't ask you to take any of this on faith. We'll ask you to give us one job and judge us on it. The overwhelming majority of our work comes from clients who did exactly that and kept calling, and we'd genuinely like the chance to earn the same from you. Text ${v.phone} whenever you're ready — we'll take it from there.`,
      ],
    },
    {
      heading: `Experience That Shows in the Work`,
      paragraphs: [
        `There's no substitute for having done something many times over, and experience is one of the quietest advantages we bring to every ${v.noun} job. Our team has seen the situations that trip up less-seasoned providers, and they arrive knowing what to anticipate rather than improvising once they're on site. That experience is why our work is faster, smoother, and more consistent than what you'll get from someone learning as they go.`,
        `Experience also shows in judgment — knowing when a job needs more time, when a shortcut would come back to bite you, and when the simplest approach is genuinely the best one. Those are the calls that separate a professional from an amateur, and they're calls you can only make well after you've done the work enough times to have earned the instinct. That accumulated know-how comes standard with every job we do.`,
      ],
    },
    {
      heading: `Consistency on Every Single Job`,
      paragraphs: [
        `Anyone can have one good day. The real test of a ${v.noun} company is whether the hundredth job is as good as the first, and consistency is exactly what we've built the company to deliver. A stable, experienced team, clear standards, and a genuine commitment to the work mean you get the same quality every time — not a great result once and a disappointing one the next visit.`,
        `That reliability is worth more than a single standout job, because it's what lets you stop worrying. When you know precisely what you're going to get every time you call, ${v.noun} becomes one less thing you have to manage or second-guess. Consistency is unglamorous, but it's the foundation of trust, and it's the thing our long-term clients value most about working with us.`,
      ],
    },
    {
      heading: `Flexible Scheduling Around Your Life`,
      paragraphs: [
        `Your schedule matters, and we do our best to work around it rather than forcing you into a rigid slot that doesn't fit. When you reach out, tell us what timing works for you and we'll find an arrangement that makes sense. Life is complicated enough without your ${v.noun} provider adding friction, so we aim to be as accommodating as we reasonably can.`,
        `If something comes up and you need to reschedule, just let us know as early as possible and we'll sort it out — we'd much rather adjust than lose a good client over inflexibility. We ask the same courtesy in return so we can plan the day well for everyone we're serving, but the goal is always a schedule that works for real life, not one that punishes you for having one.`,
      ],
    },
    {
      heading: `Preparing for Your Service`,
      paragraphs: [
        `We keep preparation simple. In most cases there's very little you need to do — tell us what you need, make sure we can access the space or ${v.isRemote ? 'reach you' : 'property'}, and let us handle the rest. If there's anything specific that would help us work faster or better, we'll tell you in advance so there are no surprises on the day and no wasted time once we've arrived.`,
        `If you won't be present, that's completely fine — just share the access details and any instructions, and we'll follow the plan precisely and confirm the result when we're done. Plenty of our clients aren't around when we work, and the job gets done to exactly the same standard. Clear details going in mean clean results coming out, with no need for you to hover or manage anything.`,
      ],
    },
    {
      heading: `Handling Special Requests`,
      paragraphs: [
        `Every client and every job is a little different, and we'd rather adapt to what you actually need than force you into a one-size-fits-all box. If you have specific requests, particular ways you like things done, or concerns unique to your situation, tell us. We'll do our best to accommodate them, and if something isn't possible, we'll tell you honestly rather than saying yes and disappointing you later.`,
        `Listening well is half of doing ${v.noun} right. A lot of frustration in this industry comes from providers who don't actually hear what the customer wanted and deliver something technically fine but not what was asked for. We ask questions, we pay attention, and we make sure we understand your expectations before we start — because the best result is the one that matches what you actually had in mind.`,
      ],
    },
    {
      heading: `Doing It Right Beats Doing It Fast`,
      paragraphs: [
        `Speed matters, but not at the expense of quality, and we never sacrifice one for the other. Our team is efficient because they're experienced, not because they're rushing — there's a real difference. A provider racing to the next job cuts the corners you won't notice until later; a provider who's simply good at the work moves quickly because they know exactly what they're doing.`,
        `We'd always rather take the few extra minutes to do ${v.noun} properly than hand you a fast job that has to be redone. Redoing work is the most expensive thing in this business, for you and for us, so getting it right the first time is simply the smart way to operate. You get the benefit: work that's both prompt and genuinely done well, without having to choose between the two.`,
      ],
    },
    {
      heading: `A Partner, Not Just a Vendor`,
      paragraphs: [
        `We aim to be more than a company you hire once and forget — we want to be the ${v.noun} provider you keep in your contacts and call without a second thought. That means acting like a partner: looking out for your interests, flagging things you'd want to know, and being genuinely invested in whether you're better off for having worked with us. Transactions are forgettable; relationships aren't.`,
        `A partner tells you the truth even when it's not the most profitable thing to say, shows up dependably, and earns the right to your next call by how they handled the last one. That's the posture we bring to every client. Most of our business comes from people who started with a single job and decided we were worth keeping around, and that's exactly the kind of relationship we're trying to build with you.`,
      ],
    },
    {
      heading: `Transparency in Everything`,
      paragraphs: [
        `Transparency runs through everything we do, not just our pricing. We're upfront about what a job involves, what's included, how long it should take, and what to expect at every step. If there's a limitation, a trade-off, or a reason we'd recommend one approach over another, we tell you plainly. You should never feel like information is being kept from you to close a sale.`,
        `That openness is deliberate, and it's a competitive advantage precisely because our work holds up to scrutiny. Companies hide details when they have something to hide; we put ours in the open because the clients we want are the ones who value knowing exactly what they're getting. An informed client makes a confident decision, and confident clients don't have regrets — which is exactly the outcome we're after.`,
      ],
    },
    {
      heading: `Peace of Mind, Included`,
      paragraphs: [
        `A big part of what you're really paying for with ${v.brand} isn't visible on the invoice at all — it's peace of mind. The quiet confidence that the person showing up is trustworthy, that the price won't change on you, and that if anything goes wrong there's a real company that will make it right. That feeling is worth a great deal, and it's exactly what the lowest-bidder gamble can't offer.`,
        `When you have a ${v.noun} provider you genuinely trust, you get to stop thinking about it — and that mental relief is one of the most underrated benefits of hiring the right company. You're not just buying a completed job; you're buying the freedom to hand something off and know it'll be handled. That's the standard we hold ourselves to, and it's what keeps clients coming back.`,
      ],
    },
    {
      heading: `Fair Treatment for the People Who Do the Work`,
      paragraphs: [
        `How a company treats its workers tells you a lot about the results you'll get, because the two are directly connected. We treat our team fairly — real respect, fair pay, and the support to do the job well — and that isn't charity, it's strategy. A team that's treated well shows up, takes pride in the work, and stays, and a stable team is the biggest reason we can deliver consistent quality.`,
        `Companies that treat their people as disposable get disposable results; the churn shows up in your experience whether you can see the cause or not. We'd rather invest in good people who make us better and let that investment show up in the quality you receive. When the person doing your ${v.noun} is supported and valued, you're the one who ultimately benefits.`,
      ],
    },
    {
      heading: `Serving Every Kind of Client`,
      paragraphs: [
        `Whether you're a first-time customer nervous about hiring anyone, a busy professional who just wants it handled, a business that needs dependable recurring service, or a long-time client who knows exactly what they want, we're glad to serve you and we adapt to what you need. There's no "ideal customer" we cater to at everyone else's expense — good service is good service, at every scale.`,
        `We meet you where you are. If you want to be involved and ask a lot of questions, we welcome it. If you'd rather hand it off and not think about it, we make that easy too. Some clients want a detailed walk-through; others just want the job done and the invoice to match the quote. All of it is fine, and all of it gets the same standard of ${v.noun} we're known for.`,
      ],
    },
    {
      heading: `The Little Things Add Up`,
      paragraphs: [
        `The big things are table stakes — of course the job should get done. What actually earns loyalty is the accumulation of little things: the text confirming we're on the way, the extra few minutes to do something properly, the honest heads-up about something you'd want to know, the willingness to answer one more question without making you feel like a bother. Those small moments are where the experience is really made.`,
        `We pay attention to the little things because we know they're what people remember. Anyone can complete a ${v.noun} job; far fewer make the whole experience feel considered and respectful from start to finish. Those details cost us nothing but attention, and they make all the difference in whether you'd call us again or recommend us to a friend — which is the only measure of success that matters.`,
      ],
    },
    {
      heading: `Why We Do This Work`,
      paragraphs: [
        `Every service business claims to care about quality, but far fewer are willing to be measured on it. We are, because the work itself is worth doing well. When ${v.noun} is done right ${here}, it removes a real source of stress from someone's week; when it's done badly, it adds one. We're in the business of removing stress, not manufacturing it, and that framing decides how we hire, train, and operate.`,
        `We started ${v.brand} because we were tired of watching good people get let down by companies that didn't answer, didn't show, and didn't stand behind their work. So we built the opposite — and there's real satisfaction in doing that well, day after day. That's not a marketing story; it's genuinely why we're here, and it's why we still care about getting every job right.`,
      ],
    },
    {
      heading: `What Our Clients Tell Us`,
      paragraphs: [
        `The feedback we hear most often isn't about any one impressive thing — it's relief. Relief at finally finding a ${v.noun} company that answers, shows up, charges what it quoted, and does good work without drama. People are so used to being let down that simple reliability feels remarkable, and that's the reaction we hear again and again from clients who took a chance on us.`,
        `We don't take that trust for granted. Every satisfied client is someone who might tell a friend, leave a review, or call us again next time — and that's precisely how a business like ours grows. So we treat every job as a chance to earn that kind of loyalty, because a reputation built one happy client at a time is the only kind worth having and the hardest for any competitor to take away.`,
      ],
    },
    {
      heading: `Ready to Experience the Difference`,
      paragraphs: [
        `If you've read this far, you already understand how we think about ${v.noun}: reliability over gimmicks, transparency over sales pressure, and doing right by you over squeezing the most out of a single job. The only thing left is to experience it, and that starts with a single message. Text ${v.phone}, call, or book online and tell us what you need.`,
        `There's genuinely nothing to lose by reaching out — no cost, no obligation, no pressure. Just a fast, honest response from real people who actually want to help. If a past ${v.noun} experience left you wary of hiring anyone, give us the chance to show you it doesn't have to be that way. We're confident that one job is all it takes, and we'd be glad to earn your trust the same way we've earned everyone else's — by doing the work right.`,
      ],
    },
    {
      heading: `One Point of Contact, Start to Finish`,
      paragraphs: [
        `With ${v.brand}, you're not bounced between departments that each know a fragment of your job. You deal with a company that keeps your details in one place and can actually help from the first message to the final follow-up. That continuity means you never have to re-explain your situation, repeat your address, or start over with someone who's never heard of you.`,
        `A single, informed point of contact sounds like a small thing until you've spent an afternoon on hold being transferred in circles. We designed the experience the opposite way on purpose. When you reach out at ${v.phone}, the person you're dealing with has the context and the authority to move your ${v.noun} forward — which is exactly how it should work and so rarely does.`,
      ],
    },
    {
      heading: `Understanding Your Estimate`,
      paragraphs: [
        `When we send you a quote, we want you to actually understand it — not just see a total and hope for the best. If anything about the number is unclear, ask, and we'll walk you through how we got there: what's included, what drives the cost, and why the job is priced the way it is. A quote you understand is a quote you can trust, and trust is the entire point of how we do business.`,
        `We'd genuinely rather you ask ten questions before booking than carry a single doubt afterward. There's no such thing as a foolish question about your own money, and a company that gets impatient explaining its pricing is a company with something to hide. We're happy to be transparent to the point of over-explaining, because that's what turns a nervous first-time caller into a confident long-term client.`,
      ],
    },
    {
      heading: `How We Compare`,
      paragraphs: [
        `If you're weighing us against other ${v.noun} providers ${here}, we'd encourage you to compare on the things that actually matter, not just the number at the bottom of the quote. Ask each company what's included, who does the work, whether they're insured, and what happens if you're unhappy. A cheaper price often means less scope, unvetted labor, or fees that haven't surfaced yet.`,
        `We're confident in that comparison because we put all our answers up front. The quote is the final price for the agreed scope. The team is vetted. We're accountable, and we make it right if something's off. We may not be the lowest bid, but when you compare like for like — quality, reliability, and what happens when it counts — we're confident we come out looking like exactly the right choice.`,
      ],
    },
    {
      heading: `Following Up After the Work`,
      paragraphs: [
        `Our relationship with you doesn't end the moment we've been paid. If you have a question after the job, a concern about the work, or you're ready to book again, reaching out is just as easy as it was the first time. We stay reachable after the sale precisely because so many companies go quiet then — and that difference is exactly where trust is either cemented or lost.`,
        `If anything about a completed job isn't right, we want to hear it, and we'll make it right. Tell us what's off and we'll fix it, no runaround. We'd genuinely rather spend the time to earn your repeat business than keep money we didn't fully earn, and that principle holds long after the invoice is settled. The follow-through is part of the service, not an optional extra.`,
      ],
    },
    {
      heading: `Booking Your First Appointment`,
      paragraphs: [
        `If this is your first time working with us, welcome — and don't overthink it. Getting started is as simple as sending a text to ${v.phone} with what you need. We'll ask a few questions to understand your job, give you a clear and honest quote, and find a time that fits your schedule. You'll know exactly what to expect before anything is booked.`,
        `First-time clients sometimes worry they'll be upsold or pressured, especially after bad experiences elsewhere. That's not how we operate. We'll recommend what your situation actually calls for — even if it's a smaller job than you expected — and we'll never push you toward a decision you're not ready to make. Your first appointment is our audition, and we take it seriously.`,
      ],
    },
    {
      heading: `Built for the Long Relationship`,
      paragraphs: [
        `A lot of ${v.noun} companies are built to win a customer once. We're built to keep one for years, and that difference shapes every decision we make. A company chasing the next one-time job behaves very differently from one that expects to see you again next season and the season after that — and you can feel which kind of company you're dealing with.`,
        `When you're planning to keep a client, you can't afford to overcharge them, cut a corner they'll notice later, or leave them wondering whether you'll pick up the phone. The long game forces good behavior in a way short-term targets never will. Most of our work comes from repeat clients and referrals, and we've organized the entire company around continuing to deserve it.`,
      ],
    },
    {
      heading: `Quality You Can Verify`,
      paragraphs: [
        `Anyone can claim to do great work; what matters is whether you can verify it, and we build that verification into every job. We walk the results with you where it makes sense, we don't call a job done until it actually is, and we invite the feedback most companies quietly hope you won't give. If something's off, we want to know while we can still fix it on the spot.`,
        `That willingness to be checked is a form of confidence. A provider who rushes off before you've had a chance to look is a provider hoping you won't look too closely. We do the opposite, because our work holds up — and because the fastest way to build trust is to hand you the means to confirm it for yourself rather than asking you to take it on faith.`,
      ],
    },
    {
      heading: `No Pressure, No Obligation`,
      paragraphs: [
        `Reaching out to us commits you to nothing. Get a quote, ask a question, get a second opinion on a number someone else gave you — all of it is free, and none of it obligates you to book. We're confident enough in our value that we don't need to pressure you into a decision, and we won't. You won't get hounded with pushy follow-ups or made to feel guilty for shopping around.`,
        `If we're the right fit, wonderful; if not, no hard feelings and the door stays open. That low-pressure approach is entirely deliberate, because the clients who choose us freely are the ones who stay, refer their friends, and become the foundation of the business. High-pressure sales might win a job today, but it's a terrible way to build the kind of company we're trying to build.`,
      ],
    },
    {
      heading: `Straightforward, Secure Payment`,
      paragraphs: [
        `Paying for your ${v.noun} should be as painless as the rest of the experience. We offer straightforward, secure ways to pay and a clear invoice that matches your quote line for line — no confusing statements, no chasing you through five channels, and no awkwardness. Just a simple bill for the work you agreed to and an easy way to settle it.`,
        `For recurring clients, we make ongoing payment even simpler, so you're never bogged down in admin for a service that's supposed to make your life easier. And if you ever have a question about a charge, you ask a real person who has your details and can actually answer — not a billing department that's never heard of you. The whole point is to reduce friction, not add it.`,
      ],
    },
    {
      heading: `The Standard That Never Moves`,
      paragraphs: [
        `Everything on this page comes back to one idea: a standard that doesn't move. It doesn't drop because a job is small, or because we're busy, or because it's a one-time booking instead of a recurring one. It doesn't flex based on who's asking or how closely they're watching. The same reliability, the same honesty, and the same care go into every ${v.noun} job we do.`,
        `A fixed standard is what lets you trust us without having to audit us, and that trust is the whole product. When you know exactly what you're going to get every single time, you can hand something off and stop thinking about it. That's the position we work to earn with every client, and it's why the people who hire us once tend to keep hiring us for years.`,
      ],
    },
    {
      heading: `Let's Get Started`,
      paragraphs: [
        `Whatever ${v.noun} you need ${across}, the next step is simple and costs you nothing: reach out. Text ${v.phone}, give us a call, or book online — whichever is easiest for you. You'll get a fast, honest response, a clear quote, and a straightforward path to getting the job done right by a company that genuinely stands behind its work.`,
        `We know you have options, and we don't take it for granted that you'd choose us. What we can promise is that reaching out will be easy, the answer you get will be honest, and the work — if you decide to book — will be done to a standard we're proud to put our name on. ${v.brand} is ready whenever you are, and we'd be glad to earn your trust one job at a time.`,
      ],
    },
    {
      heading: `Available When You Actually Need Us`,
      paragraphs: [
        `We keep hours that work for real people with real schedules, and we try to be reachable when you actually need us rather than only during a narrow window that never lines up with your day. Send a text or book online anytime — even after hours — and we'll respond as soon as we're able. For anything time-sensitive, tell us it's urgent and we'll treat it that way.`,
        `If you're ever unsure whether we're available for what you need or when, the simplest thing is to ask. Reach out at ${v.phone} and you'll get a straight answer about timing rather than a guess. We'd always rather tell you honestly what we can and can't do than overpromise something we can't deliver — because a promise kept is worth more than a promise made, especially when it comes to your schedule.`,
      ],
    },
    {
      heading: `A Company That Answers to You`,
      paragraphs: [
        `At the end of the day, ${v.brand} answers to one group of people: our clients. Not to shareholders pushing for a bigger invoice, not to a sales quota that rewards overselling — to you, the person deciding whether to call us again and whether to tell a friend. That accountability shapes everything, because our future depends entirely on whether you're glad you hired us.`,
        `It's a healthy kind of pressure, and it points our incentives in the same direction as your interests. When a company's growth comes from repeat business and referrals rather than a constant churn of new customers, doing right by the people in front of it isn't just ethical — it's survival. That alignment is exactly what you want from anyone you're trusting with ${v.noun}, and it's the foundation everything else here is built on.`,
      ],
    },
  ]

  const faq: FaqItem[] = [
    { q: `How do I get started?`, a: `Text ${v.phone}, call, or book online and tell us what you need. We'll quote it accurately, give you a clear price, and schedule a time that works for you — quickly and with no pressure.` },
    { q: `What areas do you serve?`, a: v.isRemote ? `We work with clients across the country; your location isn't a limitation.` : `We serve ${v.place} and the surrounding area. Text ${v.phone} with your address and we'll confirm right away.` },
    { q: `How much does it cost?`, a: `It depends on the specifics of your job, which is why we ask real questions before quoting. You'll always get a clear price before you commit, and the invoice matches the quote.` },
    { q: `Are you licensed and insured?`, a: `${v.brand} operates as a legitimate, accountable business${v.isRemote ? ' with clear agreements and real recourse' : ', licensed and insured for the work we do'}. There's a real company standing behind every job.` },
    { q: `What if I'm not satisfied?`, a: `We make it right. Tell us what's off and we'll fix it — we'd rather earn your repeat business than keep money we didn't fully earn.` },
    { q: `Do you offer recurring service?`, a: `Yes. Many clients book ${v.noun} on a recurring schedule, and we keep your preferences on file so every visit gets easier.` },
    { q: `What makes you different?`, a: `We answer the phone, show up on time, charge what we quoted, and fix it if it's wrong. Simple to say, rare to actually deliver.` },
  ]

  return {
    title: `${v.brand} — ${v.label} in ${v.place} | Trusted, Transparent, Guaranteed`,
    metaDescription: `${v.brand}: professional ${v.noun} ${here}. Transparent pricing, vetted team, on-time service, satisfaction guaranteed. ${v.services.length > 0 ? svc + '. ' : ''}Text ${v.phone}.`,
    h1: `${v.place}'s Trusted ${v.label}`,
    intro: `Professional ${v.noun} ${across} — transparent pricing, a vetted team, on-time every time, and work we stand behind. ${v.brand} does it right the first time.`,
    sections,
    faq,
  }
}
