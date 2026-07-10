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
      heading: `Attention to the Details That Last`,
      paragraphs: [
        `The difference between adequate ${v.noun} and genuinely excellent ${v.noun} lives in the details — the parts of the job that don't jump out at first glance but reveal themselves over time. We pay attention to those precisely because most companies skip them when no one's watching. Doing the small things properly is what separates work that merely looks finished from work that actually holds up.`,
        `That focus on detail is deliberate and trained, not accidental. Our team is taught to check their work before calling it done, to handle the parts of a job that are easy to overlook, and to leave your ${v.isRemote ? 'project in a state you can rely on' : 'property the way a professional should'}. It rarely costs more than a few extra minutes of care, and it makes all the difference in a result you can genuinely count on.`,
      ],
    },
    {
      heading: `Experience That Prevents Problems`,
      paragraphs: [
        `One of the quiet advantages of hiring experienced people for ${v.noun} is everything that doesn't go wrong. Our team has seen the situations that catch less-seasoned providers off guard, and they arrive knowing what to anticipate rather than improvising once they're on site. That foresight prevents the mistakes, delays, and do-overs that turn a simple job into an ordeal.`,
        `Experience also brings judgment — knowing when a job needs more time, when a shortcut would come back to bite you, and when the straightforward approach is genuinely the best one. Those calls are invisible when they go right and painfully obvious when they go wrong. With us, the experience that makes them go right comes standard on every job, whatever its size.`,
      ],
    },
    {
      heading: `Clear Communication at Every Step`,
      paragraphs: [
        `Good ${v.noun} isn't only about the work itself — it's about never leaving you in the dark. From your first message to ${v.phone} through the finished job, you'll know what's happening, what it costs, and when to expect us. We treat clear communication as part of the service, because a job done well means little if you spent the whole time wondering what was going on.`,
        `If anything changes or a question comes up, you hear about it from us promptly rather than discovering it after the fact. That openness runs in both directions: the more clearly you tell us what you need, the more precisely we can deliver it. Communication is where trust is built or broken in this work, and we've chosen to make it a strength rather than an afterthought.`,
      ],
    },
    {
      heading: `Respect for Your Space and Time`,
      paragraphs: [
        `Every job is handled with respect for your ${v.isRemote ? 'time and your priorities' : 'home, your property, and your time'}. Our team is expected to be courteous, careful, and professional throughout — to treat your ${v.isRemote ? 'project' : 'space'} the way they'd want their own treated. That respect isn't a nice-to-have; it's a basic standard, and it shapes every interaction you'll have with us.`,
        `Respecting your time means showing up when we said we would and not dragging a job out unnecessarily. Respecting your space means leaving it in a state you're happy with. These sound obvious, yet they're exactly where so many providers fall short. We hold to them on every job because you're not an interruption to our day — you're the entire reason we have one.`,
      ],
    },
    {
      heading: `Our Guarantee, Applied to Every Job`,
      paragraphs: [
        `The guarantee behind our ${v.noun} isn't reserved for big jobs or special cases — it applies to every single one. If the work doesn't meet the standard, you tell us and we make it right. No arguing, no fine print, no making you feel like a problem for raising it. That commitment holds whether the job was large or small, one-time or recurring.`,
        `We can offer that guarantee freely because we rarely have to use it, and we take it seriously precisely because it's rare. Getting ${v.noun} right the vast majority of the time is what lets us stand behind every job without hesitation. High standards and a real guarantee reinforce each other — and you get the benefit of both on everything we do.`,
      ],
    },
    {
      heading: `Flexible to Whatever You Need`,
      paragraphs: [
        `No two ${v.noun} jobs are identical, and we'd rather adapt to what you actually need than force you into a rigid, one-size-fits-all box. Whether your situation is straightforward or has some wrinkles to it, we'll listen, adjust, and find an approach that fits. Flexibility is part of treating you like a person rather than a ticket number.`,
        `That flexibility extends to scheduling, scope, and the specific ways you like things done. If you have particular requests or constraints, tell us and we'll do our best to accommodate them honestly — and if something isn't possible, we'll say so plainly rather than promising and disappointing. The goal is ${v.noun} that genuinely fits your needs, not a template applied without regard for them.`,
      ],
    },
    {
      heading: `Built Around Doing It Right`,
      paragraphs: [
        `Everything about how we deliver ${v.noun} traces back to a single priority: doing it right. Not fastest, not cheapest at any cost, but right — done to a standard we're proud to put our name on, by people who care, backed by a company that stands behind it. Every other feature of our service flows from that core commitment.`,
        `That's ultimately what you're hiring when you choose ${v.brand}: not just a task completed, but a job done properly and honestly, with none of the games that make hiring anyone for ${v.noun} such a gamble elsewhere. It's a simple promise, but keeping it consistently is genuinely rare — and it's exactly what we've built the whole company to deliver, on every job, every time.`,
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

// ─────────────────────────────────────────────────────────────────────────────
// REVIEWS — floor 3,000 words. Long-form context that sits alongside the real
// per-tenant review list. About reputation, feedback, and earning trust.
// ─────────────────────────────────────────────────────────────────────────────

export function reviewsContent(config: SiteConfig): LongformPage {
  const v = vars(config)
  const here = v.isRemote ? 'wherever we work' : `in ${v.place}`

  const sections: ContentSection[] = [
    {
      heading: `Why Reviews Matter to Us`,
      paragraphs: [
        `Reviews aren't a vanity metric for ${v.brand} — they're the scoreboard. In ${v.noun}, a company lives or dies on whether the people it served would recommend it, and there's nowhere to hide from that anymore. A single honest review, good or bad, travels further than any advertisement we could buy. That reality keeps us honest, and we wouldn't have it any other way.`,
        `We pay attention to what clients say because it's the truest measure of whether we're actually doing our job. Anyone can claim to be reliable, fair, and skilled; only the people who've hired you can confirm it. When you read reviews of our work, you're getting exactly that — unfiltered accounts from people with no reason to flatter us, which is worth far more than anything we could say about ourselves.`,
      ],
    },
    {
      heading: `Real Reviews From Real Clients`,
      paragraphs: [
        `The reviews you'll find here come from actual clients who hired us for ${v.noun} ${here}. We don't fabricate reviews, we don't cherry-pick only the glowing ones, and we don't bury the ones that point out where we could do better. That kind of manipulation might dress up a profile in the short term, but it poisons the one thing reviews are supposed to provide: honest information you can actually trust.`,
        `Authenticity is the entire value of a review. A page full of suspiciously perfect five-star blurbs tells you nothing; a genuine mix of real experiences tells you everything. We'd rather you read honest feedback and make an informed decision than be lured in by a manufactured wall of praise. Trust built on a lie doesn't survive the first real job, and we're playing a much longer game than that.`,
      ],
    },
    {
      heading: `How We Earn Good Reviews`,
      paragraphs: [
        `There's no trick to earning good reviews — you earn them by doing good work, consistently, and treating people well. We show up when we said we would, do ${v.noun} to a standard we're proud of, charge exactly what we quoted, and make it right when something's off. Do that reliably and the reviews take care of themselves; skip any part of it and no amount of asking will produce them.`,
        `We never pressure clients for reviews or dangle incentives to inflate our rating. If someone had a great experience and wants to share it, we're grateful, and we make it easy. But a review should reflect genuine satisfaction, not a transaction. The reviews that mean the most — and the ones potential clients can actually trust — are the ones people leave freely because the work genuinely earned them.`,
      ],
    },
    {
      heading: `What Clients Tell Us Most`,
      paragraphs: [
        `The theme we hear over and over isn't about any single impressive feat — it's relief. Relief at finally finding a ${v.noun} company that answers the phone, shows up on time, charges what it quoted, and does solid work without drama. People are so accustomed to being let down that plain reliability strikes them as remarkable, and that reaction comes up again and again.`,
        `Clients also tell us they appreciate being treated like people rather than transactions — that we listened, communicated clearly, and didn't make them chase us for answers. Those aren't flashy compliments, but they're the ones that matter, because they describe exactly the experience we set out to create. When the feedback keeps circling back to reliability and respect, we know we're building the right kind of company.`,
      ],
    },
    {
      heading: `We Read Every Review`,
      paragraphs: [
        `Feedback only helps if you actually listen to it, so we read every review that comes in — the enthusiastic ones and the critical ones alike. The praise tells us what to keep doing; the criticism tells us where to get better. Both are gifts, even when the second kind stings, because a company that only wants to hear applause never improves.`,
        `When a client points out something we could have done better, we take it seriously rather than getting defensive. Often it's a chance to make an individual situation right; always it's information we can use to raise the standard for everyone. The companies that dismiss criticism are the ones that keep making the same mistakes. We'd rather hear it, learn from it, and be better on the next job.`,
      ],
    },
    {
      heading: `How We Respond to Criticism`,
      paragraphs: [
        `No company gets everything right every time, and when a client isn't happy, how we respond is the real test. Our approach is simple: we listen, we take responsibility where it's ours, and we make it right. We don't argue in public, we don't blame the customer, and we don't pretend a legitimate concern isn't legitimate. That's not just good manners — it's how you keep the trust that took years to build.`,
        `A thoughtful response to criticism often earns more respect than a flawless job would have, because it shows people who you are when things get hard. Anyone can be gracious when everything goes perfectly. The companies worth hiring are the ones that stay accountable when they've fallen short — and that's exactly the standard we hold ourselves to, whether the conversation is public or private.`,
      ],
    },
    {
      heading: `Reputation Is Accountability`,
      paragraphs: [
        `Working ${here}, our reputation is public and permanent in a way that keeps us accountable every single day. We can't afford to phone in a job and hope nobody notices, because in a connected world, people notice. That pressure is genuinely good for you: it means the quality of your job is protected by the same force that protects everyone else's — our need to keep earning the trust our reviews represent.`,
        `Reputation is the one asset a service company can't fake and can't buy. It's earned slowly, one honest job at a time, and it can be damaged quickly by cutting a single corner. Knowing that shapes how we operate. Every job is a deposit into or a withdrawal from a reputation we've worked hard to build, and we treat it with exactly that level of care.`,
      ],
    },
    {
      heading: `The Power of Word of Mouth`,
      paragraphs: [
        `Most of our best clients didn't find us through an ad — they found us because someone they trusted said "call these people." Word of mouth is the highest compliment a ${v.noun} company can receive, because people don't stake their own reputation on a recommendation unless they genuinely mean it. Every referral is someone vouching for us personally, and we don't take that lightly.`,
        `That's why we treat every job as an opportunity to earn the next recommendation. A happy client isn't the end of a transaction; they're the beginning of a relationship that might bring us their neighbor, their coworker, their family. Reviews and referrals are two sides of the same coin — both are people telling the truth about their experience — and both are the engine that lets a business like ours grow the honest way.`,
      ],
    },
    {
      heading: `Verified, Not Manufactured`,
      paragraphs: [
        `In an era where fake reviews are a genuine problem, the authenticity of ours matters. The feedback you see reflects real clients and real jobs, not purchased praise or invented testimonials. We'd rather have a smaller number of honest reviews than a mountain of fabricated ones, because the whole point is to give you information you can rely on when you're deciding who to trust with your ${v.noun}.`,
        `You can usually spot the difference. Manufactured reviews are vague, interchangeable, and relentlessly perfect; real ones mention specifics, describe actual experiences, and occasionally note something that could have gone better. We're comfortable with that honesty because our work holds up to it. A real, verifiable track record is worth infinitely more than a polished illusion, and it's the only kind we're interested in building.`,
      ],
    },
    {
      heading: `Leaving Your Own Review`,
      paragraphs: [
        `If we've done ${v.noun} for you and you're willing to share your experience, we're genuinely grateful — honest reviews from real clients are the lifeblood of a company like ours. It helps the next person deciding whether to trust us, and it helps us by telling us what we're getting right and where we can improve. Either way, your candid feedback is valuable.`,
        `And if your experience fell short in any way, we especially want to hear it — ideally directly, so we can make it right, but honestly however you're comfortable sharing it. We're not looking for only the good; we're looking for the truth, because the truth is what makes us better. However you choose to share your feedback, know that it's read, appreciated, and taken seriously.`,
      ],
    },
    {
      heading: `Consistency Across the Reviews`,
      paragraphs: [
        `One review is an anecdote; a pattern is evidence. What we're proudest of isn't any single glowing comment but the consistency across what clients say — the same themes of reliability, honesty, and quality coming up again and again from different people who never spoke to each other. That kind of consistency is very hard to fake and very telling when it's real.`,
        `When you read through feedback and notice the same strengths mentioned repeatedly, you're seeing something dependable rather than a lucky one-off. That's exactly what you want to know before hiring a ${v.noun} company: not whether they can have one good day, but whether they deliver the same experience over and over. We work hard to make sure the answer is yes, and the reviews are where that shows.`,
      ],
    },
    {
      heading: `What a Good Review Actually Reveals`,
      paragraphs: [
        `A genuinely useful review does more than assign a star rating — it describes an experience. It tells you whether the company communicated well, showed up on time, charged fairly, and handled the unexpected with grace. Those details are what let you picture how your own job would go, which is worth far more than a number floating free of any context.`,
        `We value detailed, specific feedback for exactly that reason, and we think you should too. When a client explains what we did and how it felt to work with us, the next person gets real information they can use. That's the whole purpose of reviews — not to inflate an ego or pad a profile, but to help people make good decisions about who to trust with their ${v.noun}.`,
      ],
    },
    {
      heading: `Reviews Are a Promise We Have to Keep`,
      paragraphs: [
        `Every positive review raises the bar for us, because it becomes a promise to the next client. When someone reads that we're reliable and then hires us, they're expecting exactly what the reviews described — and we have to deliver it. That's a healthy kind of pressure, and it's part of why our standard doesn't slip: our own track record won't let it.`,
        `We'd rather carry that weight than coast on past praise. A reputation is only as good as your last job, and resting on old reviews is the fastest way to lose the trust that earned them. So we treat every booking as a chance to live up to what people already say about us — and, ideally, to give the next client a reason to say it too.`,
      ],
    },
    {
      heading: `Why We Don't Hide Criticism`,
      paragraphs: [
        `It might seem safer to bury any less-than-perfect feedback, but we think that's exactly backward. A profile with nothing but flawless reviews reads as suspicious to anyone paying attention, and rightly so — no real company pleases everyone every time. Honest feedback, including the occasional critical note, is what makes the positive reviews believable in the first place.`,
        `We're comfortable letting our full record speak because we stand behind our work and behind how we handle the rare miss. If a piece of criticism is fair, it's information we can use; if we've addressed it, that response is part of the story too. Transparency about the whole picture builds more trust than a manicured illusion ever could, and trust is the only thing we're actually trying to build here.`,
      ],
    },
    {
      heading: `Ratings Versus Real Feedback`,
      paragraphs: [
        `A star rating is a useful shorthand, but it's the written feedback that carries the real signal. Two companies can share the same average score and offer completely different experiences — one consistently solid, the other wildly hit-or-miss. The words behind the number are where you learn which is which, and we encourage you to read them rather than stopping at the rating.`,
        `We care more about the substance of what clients say than about chasing a perfect score, because the substance is what actually helps people. A high rating built on genuine, detailed, satisfied feedback means something; a high rating built on thin or manufactured praise means nothing. We'd rather earn the former slowly than fake the latter quickly, and our reviews reflect that choice.`,
      ],
    },
    {
      heading: `Our Commitment to Getting Better`,
      paragraphs: [
        `Reviews aren't just a report card — they're a roadmap for improvement, and we use them that way. When we notice a recurring suggestion or a repeated frustration, we treat it as a signal to change something on our end. The goal isn't to be defensive about where we are; it's to keep getting better at ${v.noun} so that future reviews are even stronger than the ones already here.`,
        `A company that stops listening stops improving, and in a competitive field that's the beginning of the end. We'd rather stay a little uncomfortable — always asking how we could have done better — than get complacent because the reviews are already good. That commitment to improvement is itself something clients notice and appreciate, and it's a big part of why the relationships we build tend to last.`,
      ],
    },
    {
      heading: `The Long Game of Reputation`,
      paragraphs: [
        `Building a reputation the honest way is slow. It means doing good work, job after job, and letting the trust accumulate one satisfied client at a time. There's no shortcut, and frankly we're glad there isn't — because a reputation that takes years to build is one that competitors can't easily copy or buy, and one we have every incentive to protect.`,
        `We're playing that long game on purpose. The reviews you see aren't the product of a clever campaign; they're the residue of years of showing up and doing right by people. That's exactly why they're worth reading, and exactly why we guard them carefully. Every job either strengthens that reputation or chips away at it, and we'd never trade the long-term trust for a short-term shortcut.`,
      ],
    },
    {
      heading: `Trust Built One Job at a Time`,
      paragraphs: [
        `No one hands out trust automatically, and we've never expected them to. It's earned in the doing — in a job done well, a promise kept, a problem handled gracefully. Every review here represents one more instance of that trust being earned, and stacked together they tell the story of a company that has done it consistently enough for people to keep vouching for us.`,
        `That's the foundation we build every new relationship on. Whether you found us through a review, a referral, or a search, you're starting where thousands of clients started: cautiously, on the strength of what others have said. Our job is to prove them right all over again with your ${v.noun}, and to give you your own reason to become one more voice in the record.`,
      ],
    },
    {
      heading: `Judge Us for Yourself`,
      paragraphs: [
        `At the end of the day, we'd rather you judge us on evidence than take our word for anything. That's exactly what reviews are for. Read what real clients have said, weigh it honestly, and decide whether we sound like the kind of ${v.noun} company you want to work with. We're confident in what you'll find, because we've worked hard to earn it.`,
        `And when you're ready, the best way to form your own opinion is to give us a job and see for yourself. Nearly all of our long-term clients started exactly there — cautiously, on the strength of a review or a referral — and stayed because the experience matched the promise. Text ${v.phone} whenever you'd like to find out firsthand why people ${here} keep recommending us.`,
      ],
    },
  ]

  const faq: FaqItem[] = [
    { q: `Are these reviews real?`, a: `Yes. They come from actual clients who hired us for ${v.noun} ${here}. We don't fabricate reviews or cherry-pick only the perfect ones — authenticity is the whole point.` },
    { q: `How do you get so many good reviews?`, a: `By doing good work consistently and treating people well — showing up on time, charging what we quoted, and making it right when something's off. We never pressure clients or offer incentives for reviews.` },
    { q: `What do you do about negative feedback?`, a: `We read it, take responsibility where it's ours, and make it right. Criticism tells us where to improve, and how we respond to it says more about us than a flawless job would.` },
    { q: `Can I leave a review?`, a: `Please do — honest feedback from real clients is invaluable to us and to the next person deciding whether to trust us. And if anything fell short, tell us directly so we can make it right.` },
    { q: `Why should I trust your reviews over a competitor's?`, a: `Because ours are verified and honest, not manufactured. Read them, weigh them, and judge for yourself — we're confident in what you'll find. Then give us one job and see firsthand.` },
    { q: `Do you show negative reviews too?`, a: `We don't hide honest criticism. A profile of nothing but flawless reviews reads as suspicious, and rightly so — no real company pleases everyone every time. Honest feedback is what makes the positive reviews believable, and we stand behind how we handle the rare miss.` },
    { q: `Do you offer anything in exchange for a review?`, a: `No. We never pay for reviews or dangle incentives to inflate our rating. A review should reflect genuine satisfaction, not a transaction — those are the only reviews worth having and the only ones potential clients can actually trust.` },
  ]

  return {
    title: `${v.brand} Reviews — Real Client Feedback | ${v.label} in ${v.place}`,
    metaDescription: `Real, verified reviews from ${v.brand} clients for ${v.noun} ${here}. Honest feedback, no fakes, no cherry-picking. See why clients keep recommending us. Text ${v.phone}.`,
    h1: `${v.brand} Reviews`,
    intro: `Real, verified feedback from clients who hired us for ${v.noun} — no fakes, no cherry-picking. Read what people say, then judge us for yourself.`,
    sections,
    faq,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CAREERS — floor 3,000 words. Recruiting content: why work here, culture, what
// we look for, how to apply. `here` in-scope.
// ─────────────────────────────────────────────────────────────────────────────

export function careersContent(config: SiteConfig): LongformPage {
  const v = vars(config)
  const here = v.isRemote ? 'wherever you are' : `in ${v.place}`

  const sections: ContentSection[] = [
    {
      heading: `Build a Career With ${v.brand}`,
      paragraphs: [
        `${v.brand} is always interested in hearing from good people who take pride in their work. We're a ${v.noun} company that treats its team the way a company should — with fair pay, real respect, and the support to do the job well — because we know that the people doing the work are the entire business as far as our clients are concerned. If that sounds like the kind of place you'd want to work, we'd like to meet you.`,
        `This isn't a pitch full of empty perks and buzzwords. It's a straightforward description of what it's actually like to work here and what we're looking for. We believe in being honest with our team the same way we're honest with our clients, so everything on this page is written to give you a real picture of the opportunity — not to dress it up into something it isn't.`,
        `Whether you're experienced in ${v.noun} or looking for a solid place to build a career, we're worth a conversation. Good, reliable people are the hardest thing to find and the most valuable thing we have, and we treat them accordingly. Read on to understand who we are as an employer, and if it resonates, reach out — we're genuinely glad to hear from people who care about doing things right.`,
      ],
    },
    {
      heading: `Why People Like Working Here`,
      paragraphs: [
        `The thing our team members mention most is that we do what we say — for them, not just for clients. When we set a schedule, we honor it. When we promise pay, it arrives on time and correct. When someone needs support, they get it rather than being left to figure it out alone. Those basics sound simple, but plenty of employers in this field don't manage them, and our people notice the difference.`,
        `We also keep the drama low and the respect high. Nobody here is treated as disposable or talked down to, and good work gets recognized rather than taken for granted. We'd rather build a stable, experienced team that wants to stay than churn through people chasing the cheapest possible labor — because a team that's treated well does better work, and everyone benefits from that, our clients most of all.`,
      ],
    },
    {
      heading: `How We Treat Our Team`,
      paragraphs: [
        `Fair treatment isn't a perk we advertise — it's the foundation of how we operate. We pay fairly for the work, we're clear about expectations, and we back our people up when they need it. We understand that the person doing a great job for a client is only able to do that when they're supported, respected, and not stretched to the breaking point, so we build the company around making that possible.`,
        `This isn't charity, and we won't pretend it is — it's how you run a business that lasts. A team that's treated well shows up, takes pride in the result, and stays, and a stable, experienced team is the single biggest reason we can deliver consistent quality. Companies that treat their workers as interchangeable get interchangeable results. We'd rather invest in good people who make us better.`,
      ],
    },
    {
      heading: `Fair Pay for Honest Work`,
      paragraphs: [
        `We believe good work deserves fair pay, and we don't try to squeeze our team to pad our margins. Compensation is one of the clearest signals of how a company actually values its people, and we'd rather pay well and keep great workers than cut corners on pay and constantly be hiring replacements. The math works out better for everyone that way, including our clients.`,
        `We're upfront about pay from the start — no vague promises, no bait-and-switch, no surprises after you've started. You'll know what you're earning and how it works before you commit to anything. That transparency is the same principle we apply to our clients' quotes, and it comes from the same place: we think people deserve to know exactly what they're getting into, whether they're hiring us or working for us.`,
      ],
    },
    {
      heading: `What We Look For`,
      paragraphs: [
        `Skill matters, but character matters more, because skill can be taught and character can't. We look for people who are reliable, honest, and respectful — the kind of person who shows up when they said they would, does the job properly even when no one's watching, and treats a client's ${v.isRemote ? 'time and trust' : 'home and property'} with genuine care. Those traits are the foundation everything else is built on.`,
        `We can teach the technical side of ${v.noun} to someone with the right attitude far more easily than we can instill a good attitude in someone who's technically skilled but unreliable. So while relevant experience is always welcome, what we're really screening for is whether you're someone we'd trust to represent us — because when you're on a job, you are the company in the client's eyes, and that's a responsibility we take seriously.`,
      ],
    },
    {
      heading: `The Kind of Person Who Thrives Here`,
      paragraphs: [
        `People do well here when they take pride in their work and genuinely want to do a good job — not just get through the day. If you're the kind of person who's bothered by sloppy work, who'd rather do something right than fast, and who treats other people the way you'd want to be treated, you'll fit right in. Those are the values the whole company runs on.`,
        `You'll also do well if you value reliability and honesty, because those are non-negotiable here. We're building something based on trust — our clients' trust in us, and our trust in each other — and that only works when everyone holds up their end. If that sounds like how you already operate, this is the kind of place where that approach is recognized and rewarded rather than taken advantage of.`,
      ],
    },
    {
      heading: `What the Work Involves`,
      paragraphs: [
        `The work is ${v.noun}, done to a high standard for real clients who are counting on us. It's honest, tangible work with a clear result you can be proud of at the end of the day. Depending on the role, you'll be handling jobs ${here}, representing ${v.brand} to clients, and delivering the quality and reliability our reputation is built on.`,
        `It's not always easy — good work rarely is — but it's genuinely satisfying to do something well and see the difference it makes for the people you're serving. We'll make sure you have what you need to succeed: clear expectations, the support to meet them, and a team that has your back. What we ask in return is that you bring your best to every job, the same way we bring ours.`,
      ],
    },
    {
      heading: `Reliability Is Everything`,
      paragraphs: [
        `If there's one thing that matters most in this work, it's reliability. Our entire reputation rests on showing up when we said we would and doing what we promised, so we need people who take that as seriously as we do. Being dependable — showing up on time, ready to work, every time — is the single most important quality we look for, and it's the one that earns the most trust and the most opportunity here.`,
        `That reliability cuts both ways. We ask our team to be dependable, and in return we're dependable for them: consistent work, on-time pay, and clear communication. It's a two-way street built on mutual respect, and it's a big part of why people who join us tend to stay. We honor our commitments to our team the same way we expect them to honor theirs to our clients.`,
      ],
    },
    {
      heading: `Room to Grow`,
      paragraphs: [
        `We'd rather promote and develop the good people we already have than constantly hire from outside, so there's real room to grow here for those who earn it. People who prove themselves reliable and skilled find that more responsibility, better opportunities, and greater trust come their way over time. We notice who's carrying their weight and then some, and we reward it.`,
        `Growth here isn't about empty titles — it's about earning genuine trust and the opportunities that come with it. If you show up, do excellent work, and treat people right, you'll find a company that recognizes it and invests in your future. We're building something for the long term, and we want the people who help build it to grow right along with it.`,
      ],
    },
    {
      heading: `How We're Different as an Employer`,
      paragraphs: [
        `A lot of ${v.noun} companies treat their workers as a cost to be minimized — the cheapest labor they can get away with, churned through and replaced. We think that's both wrong and short-sighted, and we've built the opposite kind of company on purpose. Our people are an investment, not an expense, and we treat them like the valuable, hard-to-replace professionals they are.`,
        `That difference shows up in everything: how we pay, how we communicate, how we handle problems, and how we back our team up when a situation gets difficult. We're not perfect, and we won't pretend to be, but we genuinely try to be the kind of employer we'd want to work for. If you've been treated as disposable elsewhere, we think you'll notice the difference here from day one.`,
      ],
    },
    {
      heading: `The Satisfaction of Doing It Well`,
      paragraphs: [
        `There's a real satisfaction in honest work done well — in finishing a ${v.noun} job and knowing you did it right, that the client is genuinely better off for it, and that you can stand behind the result. That sense of pride is something we try to protect, because it's what makes the work worth doing beyond just the paycheck. We'd rather have people who feel that pride than people just clocking in.`,
        `When you're supported instead of stretched thin, given the time and tools to do the job properly, and trusted to take pride in the outcome, the work becomes something you can actually feel good about. That's the environment we work to create. It isn't always easy and it isn't always glamorous, but at the end of the day you've done something real and done it well, and that counts for a lot.`,
      ],
    },
    {
      heading: `We Don't Cut Corners — and Neither Will You`,
      paragraphs: [
        `Our whole reputation is built on doing the job right, which means we don't ask our team to cut corners to save time or money, and we don't reward the people who do. That's actually a relief for good workers, who so often find themselves pressured elsewhere to rush jobs and compromise quality. Here, doing it properly isn't just allowed — it's expected and supported.`,
        `If you take pride in thorough, careful work, you'll never be told to hurry past the standard just to squeeze in one more job. We'd rather do fewer jobs well than more jobs badly, and we back that up in how we schedule and support our team. Good workers thrive in that environment because it lets them do what they already want to do: excellent work they can put their name behind.`,
      ],
    },
    {
      heading: `Part of Something That Matters`,
      paragraphs: [
        `Working here means being part of a company that's genuinely trying to do right by its clients and its people — not a faceless operation chasing the lowest cost at everyone's expense. There's a shared sense that what we do matters and that how we do it matters even more, and being part of that is a different experience from just having a job somewhere.`,
        `Every team member contributes to a reputation we've all worked to build, and that shared ownership creates a kind of pride and accountability you don't find everywhere. When the whole team is pulling in the same direction — toward quality, honesty, and treating people right — the work is better and the days are better. That's the culture we protect, and we look for people who want to be part of it.`,
      ],
    },
    {
      heading: `Support When You Need It`,
      paragraphs: [
        `Nobody here is left to sink or swim alone. When a job gets complicated, when a situation is tricky, or when you simply have a question, there's real support to lean on. We'd rather you ask and get it right than guess and get it wrong, so we make sure help is available and that asking for it is never held against you.`,
        `That support is part of how we get consistent results: a team that knows it has backup handles difficult situations better than a team that feels abandoned. We invest in setting our people up to succeed because their success is our success, and because it's simply how a decent employer should operate. You'll never be sent into a job unprepared or left to face a problem on your own.`,
      ],
    },
    {
      heading: `Honesty Goes Both Ways`,
      paragraphs: [
        `We're honest with our clients, and we're honest with our team — even when the truth isn't the easiest thing to say. You'll always know where you stand, what's expected, and how you're doing. We don't play games, we don't keep people guessing, and we don't dress up bad news as good. That directness is something our best people genuinely appreciate once they experience it.`,
        `In return, we ask for the same honesty from you. If something's wrong, tell us. If you made a mistake, own it — we care far more about how you handle it than about the fact that it happened. A culture of honesty in both directions is what makes a team you can actually trust, and trust is the thing everything else here is built on, for clients and team members alike.`,
      ],
    },
    {
      heading: `A Stable Place to Build`,
      paragraphs: [
        `In an industry full of here-today-gone-tomorrow operations, we're building something meant to last. That stability matters for our team: it means steady work, a company that isn't going to vanish, and the chance to build a real career rather than bounce between short-term gigs. We're playing a long game, and we want people who want to play it with us.`,
        `Stability comes from doing things the right way — treating clients well so they come back, treating our team well so they stay, and running a business that's built to endure rather than to cash out. If you're looking for a solid place to plant yourself and grow ${here}, that's exactly what we're trying to offer. The people who join us and commit tend to find it's worth it.`,
      ],
    },
    {
      heading: `What We Ask of You`,
      paragraphs: [
        `In fairness, here's what we expect in return for all of the above: show up reliably, do the work to our standard, treat clients and teammates with respect, and be honest. That's it. None of it is complicated, but all of it matters, and we hold everyone to it — because the whole thing only works when each person carries their weight.`,
        `We're not looking for perfection; we're looking for people who genuinely try, who take the work seriously, and who care about doing right by the people we serve. If you bring that, we'll bring everything on our side of the bargain — fair pay, real support, respect, and room to grow. It's a straightforward deal, and it's one that's worked well for the people who've taken us up on it.`,
      ],
    },
    {
      heading: `How to Apply`,
      paragraphs: [
        `If this sounds like the kind of place you'd want to work, we'd love to hear from you. Getting in touch is simple — reach out at ${v.phone} or through our application, tell us a little about yourself and your experience, and we'll take it from there. You don't need a perfect résumé or a long list of credentials; we're most interested in who you are and how you work.`,
        `We try to make the process straightforward and respectful of your time, because how a company treats you as an applicant is a preview of how it'll treat you as an employee. We'll be honest with you about the opportunity, answer your questions directly, and let you know where things stand. Whether or not it's the right fit, you'll be treated the way we'd want to be treated ourselves.`,
      ],
    },
  ]

  const faq: FaqItem[] = [
    { q: `What kind of positions are available?`, a: `We're always interested in reliable, hardworking people for our ${v.noun} team. Reach out at ${v.phone} or through our application and we'll tell you about current opportunities.` },
    { q: `Do I need experience?`, a: `Relevant experience is welcome, but character matters more — we can teach the technical side to someone reliable and honest. If you take pride in your work, we want to hear from you.` },
    { q: `How does pay work?`, a: `We pay fairly for good work and we're upfront about it from the start — no vague promises or surprises. You'll know what you're earning and how it works before you commit to anything.` },
    { q: `What are you looking for in a team member?`, a: `Reliability, honesty, and respect above all. Someone who shows up when they said they would, does the job properly even when no one's watching, and treats clients with genuine care.` },
    { q: `How do I apply?`, a: `Reach out at ${v.phone} or through our application, tell us about yourself, and we'll take it from there. The process is straightforward and respectful of your time.` },
    { q: `What's the company culture like?`, a: `Low drama, high respect. We do what we say for our team the way we do for clients — honor schedules, pay on time and correctly, and support people instead of leaving them to figure it out alone. We'd rather build a stable team that wants to stay than churn through people.` },
    { q: `Is there room to grow?`, a: `Yes. We'd rather promote and develop the good people we already have than hire from outside. Show up, do excellent work, and treat people right, and more responsibility and opportunity come your way over time.` },
    { q: `Will I be supported on the job?`, a: `Always. Nobody here is left to sink or swim alone — when a job gets complicated or you have a question, there's real support to lean on, and asking for it is never held against you. We set our people up to succeed because their success is ours.` },
  ]

  return {
    title: `Careers at ${v.brand} — Join Our ${v.label} Team in ${v.place}`,
    metaDescription: `Work with ${v.brand}, a ${v.noun} company that treats its team right: fair pay, real respect, room to grow. We hire for reliability and character. Apply — text ${v.phone}.`,
    h1: `Careers at ${v.brand}`,
    intro: `We're always interested in good people who take pride in their work. Fair pay, real respect, and room to grow — here's what it's like to work at ${v.brand} and what we look for.`,
    sections,
    faq,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// REFERRAL PROGRAM — floor 3,000 words. Marketing/explainer page. Generic (no
// hardcoded reward amounts — those vary per tenant); points to the /referral
// portal to actually participate. `here` in-scope.
// ─────────────────────────────────────────────────────────────────────────────

export function referralContent(config: SiteConfig): LongformPage {
  const v = vars(config)
  const here = v.isRemote ? 'wherever you are' : `in ${v.place}`

  const sections: ContentSection[] = [
    {
      heading: `Refer a Friend, Everyone Wins`,
      paragraphs: [
        `Some of the best relationships we have started with a simple recommendation — one happy client telling someone they know to give us a call. Our referral program exists to say thank you for exactly that. When you refer someone to ${v.brand} for ${v.noun}, you're doing us the single biggest favor a client can, and we believe that deserves genuine appreciation.`,
        `The idea is simple: if you've had a good experience with us and you know someone who could use ${v.noun}, send them our way. They get a ${v.noun} company they can actually trust, we get the chance to earn a new long-term client, and you get our thanks for making the connection. It's the kind of arrangement where everyone genuinely comes out ahead.`,
        `Word of mouth is how good companies are supposed to grow, and it's how we prefer to grow. Rather than pour money into ads shouting at strangers, we'd rather earn recommendations from clients who mean them and reward the people who make them. This page explains how it all works and why we care so much about referrals in the first place.`,
      ],
    },
    {
      heading: `Why We Run a Referral Program`,
      paragraphs: [
        `A referral is the highest compliment a client can pay us, because you're putting your own reputation on the line when you recommend someone. People don't tell their friends and family to call a company unless they genuinely believe in it — the risk of a bad recommendation is too personal. So when you refer us, you're vouching for us in a way no advertisement ever could, and we don't take that lightly.`,
        `Running a referral program is our way of recognizing that. We'd much rather invest in thanking the clients who spread the word than spend that same money trying to buy attention from strangers who don't know us. It aligns everyone's interests: it rewards the people who've supported us, it brings us clients who arrive already trusting us, and it keeps us honest, because you'd only refer us if we keep earning it.`,
      ],
    },
    {
      heading: `How It Works`,
      paragraphs: [
        `The mechanics are straightforward. When you refer someone to ${v.brand}, we track that connection so we can properly thank you once they become a client. There's no complicated hoop-jumping and no fine-print maze designed to make sure you never actually qualify — we want the process to be as simple and honest as everything else we do.`,
        `To get started, just reach out or sign up through our referral page so we can set you up and give you what you need to make referrals. From there, whenever someone you send our way books ${v.noun} with us, the connection is recorded and your thanks follows. If you ever have a question about how it works or where a referral stands, you can simply ask — a real person will give you a straight answer.`,
      ],
    },
    {
      heading: `Who You Can Refer`,
      paragraphs: [
        `Anyone who could genuinely use ${v.noun} ${here} is a great person to refer — friends, family, neighbors, coworkers, or anyone you know who's been frustrated trying to find a company they can rely on. If you know someone who's mentioned needing this kind of work, or complained about a bad experience with someone else, that's exactly the person to send our way.`,
        `The best referrals are the ones where you're genuinely doing your friend a favor by connecting them with someone trustworthy. That's the spirit of the program: it's not about spamming everyone you know, it's about making a real, useful connection when you know someone who'd benefit. When it's a good match, everyone's glad you made the introduction — including the person you referred.`,
      ],
    },
    {
      heading: `Thanking You for the Trust`,
      paragraphs: [
        `We believe a referral deserves real appreciation, not a token gesture. When you send someone our way and they become a client, we make a point of thanking you meaningfully for it, because we understand exactly how valuable that introduction is to a business like ours. The details are something we're always happy to walk you through — just reach out and ask.`,
        `More than any specific reward, though, what we're really offering is a relationship where your support is genuinely recognized. Plenty of companies happily take referrals and never so much as say thank you. We think that's both ungracious and short-sighted. The people who go out of their way to recommend us are among our most valuable clients, and we treat them that way.`,
      ],
    },
    {
      heading: `Good for the Friend You Refer`,
      paragraphs: [
        `The referral program isn't just good for you and for us — it's genuinely good for the person you refer. They get connected with a ${v.noun} company that's already been vetted by someone they trust, which is worth a great deal when the alternative is rolling the dice on a stranger found through a random search. A personal recommendation takes the risk out of hiring.`,
        `So when you refer a friend, you're not doing us a favor at their expense — you're doing them a favor too. They skip the anxiety of wondering whether they've hired someone reliable, because you've already answered that question for them. That's why referrals feel good to make: you're helping someone you care about avoid exactly the kind of bad experience that sent so many of our clients looking for a better option in the first place.`,
      ],
    },
    {
      heading: `The Power of a Personal Recommendation`,
      paragraphs: [
        `In a world full of advertising nobody trusts and reviews people aren't always sure are real, a personal recommendation from someone you know still cuts through everything. When a friend says "call these people, they're great," it carries a weight that no marketing campaign can match. That's the entire reason word of mouth remains the most powerful way for a company like ours to grow.`,
        `We've built ${v.brand} to earn those recommendations, and the referral program is how we honor them. Every time a client vouches for us, it reinforces the standard we hold ourselves to, because we know we have to keep deserving it. A recommendation isn't a one-time thing — it's a continuing trust that we have to keep earning, job after job, and that's exactly the pressure we want on ourselves.`,
      ],
    },
    {
      heading: `No Catch, No Pressure`,
      paragraphs: [
        `We keep the referral program honest and simple, with no catch buried in the details. You're never obligated to refer anyone, there's no pressure, and there's no penalty for not participating. It's simply there as a way to say thank you if and when you feel like recommending us — entirely on your terms, whenever it feels natural to you.`,
        `And we'd never want you to refer someone you're not genuinely comfortable recommending. The whole thing only works if the referrals are real, which means we'd rather you send someone our way because you truly believe we'll take good care of them than because you're chasing a reward. Refer us when you mean it, and we'll make sure both you and your friend are glad you did.`,
      ],
    },
    {
      heading: `Referrals Keep Us Independent`,
      paragraphs: [
        `There's a bigger reason we lean on referrals rather than heavy advertising, and it's worth being honest about: it keeps us independent and lets us stay focused on the work instead of the marketing. A company that has to spend enormous sums buying attention is a company under pressure to cut corners elsewhere to pay for it. Growing through referrals lets us put our energy and money where it belongs — into doing ${v.noun} well.`,
        `When our growth comes from clients who are genuinely glad they hired us, our incentives stay clean. We don't have to chase volume at the expense of quality or oversell to fund an ad budget. We just have to keep doing right by the people in front of us so they keep sending their friends. That's a healthier way to run a business, and the referral program is a big part of what makes it possible.`,
      ],
    },
    {
      heading: `Referring Us to Businesses`,
      paragraphs: [
        `Referrals aren't only about friends and neighbors — if you know a business that could use dependable ${v.noun}, that's a valuable connection too. Businesses often need reliable, recurring service they can build a routine around, and they struggle to find a provider they can count on just as much as homeowners do. Connecting us with a business that needs us can be a genuine help to everyone involved.`,
        `Whether it's a company you work with, a property manager, an office, or any operation that could use what we do, a personal introduction carries the same weight in the business world as it does anywhere else. If you know decision-makers who've been frustrated with unreliable providers, sending them our way is exactly the kind of referral we're grateful for — and exactly the kind that tends to turn into a long, steady relationship.`,
      ],
    },
    {
      heading: `Refer as Often as You Like`,
      paragraphs: [
        `There's no cap on how many people you can refer. If you know several people who could use ${v.noun}, send them all our way — each connection is genuinely appreciated, and there's no point at which we stop being grateful for them. Some of our most valued clients have referred us many times over the years, and that ongoing support means the world to a business built on trust.`,
        `Every referral, whether it's your first or your tenth, gets the same appreciation and the same careful attention to the person you sent. We're never going to treat a repeat referrer as if they've done enough already — quite the opposite. The people who keep vouching for us are the backbone of how we grow, and we do our best to make sure they always feel that their trust in us is well placed.`,
      ],
    },
    {
      heading: `We Take Care of the People You Send`,
      paragraphs: [
        `When you refer someone to us, you're trusting us with your own reputation, and we treat that trust with real seriousness. The last thing we'd ever want is for someone you recommended to have a bad experience that reflects poorly on you. So we make a point of taking especially good care of referred clients — because letting them down would be letting you down too.`,
        `That's part of why the referral relationship works so well: our interests and yours are perfectly aligned. You want your friend to be well taken care of; so do we. Every referred client is a chance to prove your recommendation right and to strengthen the relationship with the person who made it. We treat it as exactly that, and we work to make sure you never regret sending someone our way.`,
      ],
    },
    {
      heading: `Simple, Honest Tracking`,
      paragraphs: [
        `We keep track of referrals so we can properly credit and thank you, and we do it in a way that's simple and transparent. You won't have to jump through hoops or worry that a legitimate referral will somehow go unrecognized. When you send someone our way and they become a client, the connection is recorded, and you get what you're owed — no games, no runaround.`,
        `If you ever want to know where a referral stands or have any question about how the tracking works, just ask — a real person will give you a straight answer, the same as with everything else we do. We built the program to be as honest as the rest of the company, because a referral program riddled with fine print and technicalities would undermine the very trust it's supposed to reward.`,
      ],
    },
    {
      heading: `A Thank You That Means Something`,
      paragraphs: [
        `We want the thanks you receive for a referral to feel genuine, not like a perfunctory gesture a company makes because it's expected. The details are something we're always glad to walk you through directly, but the spirit behind it is what matters most: real gratitude for a real favor. You've helped us grow the honest way, and we want you to feel that it was worth doing.`,
        `Beyond any specific token of appreciation, we hope the biggest reward is simply knowing you connected someone you care about with a company that took great care of them. That's the kind of good deed that comes back around, and being the person who made a genuinely helpful introduction feels good in its own right. We're just glad to be the company worth recommending in the first place.`,
      ],
    },
    {
      heading: `Growing the Right Way`,
      paragraphs: [
        `Every business has to grow somehow, and the way a company chooses to grow tells you a lot about it. Some grow by outspending everyone on advertising; some grow by cutting prices to the bone and hoping to make it up on volume. We grow by earning recommendations from people who genuinely mean them — which is slower, but far more solid, and far better for everyone involved.`,
        `Growing through referrals means our reputation has to stay spotless, because it's doing the work an ad budget would otherwise do. That keeps us sharp and keeps our clients' interests front and center, since one disappointed client is one fewer person recommending us. It's growth that has to be earned continuously rather than bought, and we wouldn't trade it for the fastest ad-fueled expansion in the world.`,
      ],
    },
    {
      heading: `Trust You Can Pass Along`,
      paragraphs: [
        `One of the nicest things about a company you can genuinely rely on is that it becomes something you can share. When you've found a ${v.noun} provider you trust, passing that along to someone who needs it is a small but real kindness — you're saving them the frustration, the risk, and the wasted time of finding a good one on their own. Trust, once earned, is worth spreading.`,
        `That's really what the referral program comes down to: making it easy and rewarding to share something good. We've worked hard to be the kind of company people are glad to recommend, and the program simply honors the clients who do. Every time you pass that trust along, you're extending the same relief you felt when you found us to someone else who needs it — and we're grateful to be worth passing along.`,
      ],
    },
    {
      heading: `Built on Relationships, Not Transactions`,
      paragraphs: [
        `A referral only makes sense in a business built on relationships rather than one-off transactions, and that's exactly what we've set out to build. We're not interested in churning through customers and never seeing them again; we want clients who stay, who trust us, and who feel comfortable sending the people they care about our way. The referral program is a natural extension of that whole philosophy.`,
        `When your business is about relationships, every referral is a sign you're doing it right — proof that people don't just tolerate you, they believe in you enough to attach their own name to a recommendation. We treat that as the meaningful vote of confidence it is. Reward or not, a referral tells us we've built the kind of relationship worth having, and that's the thing we're really after with every client we serve.`,
      ],
    },
    {
      heading: `Every Referral Is Personal`,
      paragraphs: [
        `We never think of referrals as just a number going up. Behind every one is a real person who trusted us enough to put their name on a recommendation, and another real person on the receiving end who's now counting on us to live up to it. We hold both of those relationships in mind on every referred job, because both of them matter, and both of them are the reason the program exists.`,
        `That personal weight is exactly why we're so grateful for referrals and so careful with them. It's not an abstract marketing channel to us — it's individual people vouching for us to individual people they care about. Honoring that chain of trust, one connection at a time, is one of the most meaningful parts of building a business the way we're trying to build ${v.brand}.`,
      ],
    },
    {
      heading: `Sign Up to Start Referring`,
      paragraphs: [
        `Ready to start referring? Head to our referral page to sign up and get set up, or reach out at ${v.phone} and we'll help you get started. Once you're in, making referrals is easy, and we'll take care of tracking the connections and thanking you properly when someone you sent becomes a client. It only takes a moment to get going.`,
        `Whether you refer one person or many, we're grateful for every single introduction. Each one is a vote of confidence in the work we do and a genuine help to a business built on trust and reputation. If you've had a good experience with ${v.brand} and know someone who'd benefit from ${v.noun}, there's no better way to help them — and us — than a simple recommendation.`,
      ],
    },
  ]

  const faq: FaqItem[] = [
    { q: `How does the referral program work?`, a: `When you refer someone to ${v.brand} and they become a client, we track the connection and thank you for it. Sign up through our referral page or text ${v.phone} to get started — it's simple and honest, with no fine-print maze.` },
    { q: `Who can I refer?`, a: `Anyone who could genuinely use ${v.noun} ${here} — friends, family, neighbors, coworkers. The best referrals are ones where you're doing your friend a favor by connecting them with a company they can trust.` },
    { q: `Do I have to participate?`, a: `Not at all. There's no obligation, no pressure, and no penalty for not participating. It's simply there to say thank you if and when you feel like recommending us, entirely on your terms.` },
    { q: `Is it good for the person I refer?`, a: `Yes. They get connected with a vetted ${v.noun} company on the strength of someone they trust, which takes the risk out of hiring. You're doing them a favor as much as us.` },
    { q: `How do I sign up?`, a: `Head to our referral page to sign up, or reach out at ${v.phone} and we'll help you get started. Once you're set up, making referrals and tracking them is easy.` },
    { q: `Is there a limit on how many people I can refer?`, a: `No cap at all. If you know several people who could use ${v.noun}, send them all our way — each connection is genuinely appreciated, whether it's your first referral or your tenth.` },
    { q: `How are referrals tracked?`, a: `Simply and transparently. When you send someone our way and they become a client, the connection is recorded so we can credit and thank you — no hoops, no fine print. Ask us anytime where a referral stands and you'll get a straight answer.` },
  ]

  return {
    title: `${v.brand} Referral Program — Refer a Friend for ${v.label}`,
    metaDescription: `Refer a friend to ${v.brand} for ${v.noun} ${here} and we'll thank you for it. Word of mouth done right — good for you, your friend, and us. Sign up: text ${v.phone}.`,
    h1: `${v.brand} Referral Program`,
    intro: `Know someone who could use ${v.noun}? Refer them to ${v.brand} and everyone wins — they get a company they can trust, and you get our genuine thanks. Here's how it works.`,
    sections,
    faq,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// BLOG — 6 trade-parameterized posts, each ≥1,500 words. Static slugs (same for
// every tenant); content is config-driven. `here` in-scope per post.
// ─────────────────────────────────────────────────────────────────────────────

export interface BlogPost {
  slug: string
  excerpt: string
  page: LongformPage
}

export function blogPosts(config: SiteConfig): BlogPost[] {
  const v = vars(config)
  const here = v.isRemote ? 'wherever you are' : `in ${v.place}`
  const Label = v.label

  return [
    {
      slug: 'how-to-choose-a-company-you-can-trust',
      excerpt: `Hiring ${v.noun} shouldn't be a gamble. Here's how to tell a company you can trust from one that'll let you down.`,
      page: {
        title: `How to Choose a ${Label} Company You Can Trust — ${v.brand}`,
        metaDescription: `A practical guide to hiring ${v.noun} ${here}: what to look for, what to avoid, and how to tell a trustworthy company from a risky one before you commit.`,
        h1: `How to Choose a ${Label} Company You Can Trust`,
        intro: `Hiring the wrong ${v.noun} company costs you time, money, and peace of mind. Here's a practical guide to choosing one you can actually rely on — the things that matter and the red flags that don't get talked about enough.`,
        sections: [
          { heading: `Why the Choice Matters So Much`, paragraphs: [
            `Choosing a ${v.noun} company isn't like buying a product you can return if it disappoints you. You're trusting a company with your ${v.isRemote ? 'project, your money, and your time' : 'home, your money, and your time'}, often before you've seen a shred of their work. That's why the decision deserves more thought than most people give it, and why knowing what to look for genuinely pays off.`,
            `The gap between a great ${v.noun} company and a bad one is enormous, even though their ads and quotes can look nearly identical. One leaves you relieved and relaxed; the other leaves you paying twice, chasing callbacks, and wishing you'd chosen differently. Learning to tell them apart before you hire is the single most valuable thing you can do.`,
          ]},
          { heading: `Start With How They Communicate`, paragraphs: [
            `The very first signal is how a company communicates before you've given them a dollar. Do they respond quickly? Do they answer your questions clearly, or dodge them? A company that's hard to reach or evasive during the sales stage — when they're supposed to be on their best behavior — will not magically become responsive after they have your money. Early communication is a preview of the whole experience.`,
            `Pay attention to whether they actually listen. A good ${v.noun} company asks about your specific situation before quoting, because the details matter. One that throws out a number without understanding your job is either guessing or setting up a change order later. Thoughtful questions up front are a green flag; a rushed, generic pitch is a warning.`,
          ]},
          { heading: `Look at How They Quote`, paragraphs: [
            `A trustworthy quote is specific and complete. It tells you what's included, what it costs, and what happens if the scope changes. A quote that's vague, suspiciously low, or padded with fees you don't understand is telling you something important. The cheapest number on paper is frequently the most expensive once the real costs surface.`,
            `Ask directly: is this the final price, or an estimate that can change? How a company answers reveals a lot. The good ones commit to their number and explain how they'd handle a genuine change in scope — before doing any extra work. The risky ones hedge, because the low quote was bait and the real bill comes later. Clarity here protects you.`,
          ]},
          { heading: `Check for Real Accountability`, paragraphs: [
            `Ask what happens if you're not satisfied. A company that stands behind its work will tell you plainly that they'll make it right, without hesitation. One that gets vague, defensive, or points to fine print is warning you about exactly the situation you most need protection in. The answer to "what if something goes wrong" matters more than any promise about things going right.`,
            `Accountability also means being a real, reachable business rather than an individual who can vanish. ${v.isRemote ? 'Clear agreements and a company that stands behind them' : 'Being licensed and insured'} means there's genuine recourse if something goes wrong — not just a phone number that stops working. That baseline of legitimacy is non-negotiable when you're trusting someone with a job that matters.`,
          ]},
          { heading: `Read the Reviews the Right Way`, paragraphs: [
            `Reviews are useful, but only if you read them well. Don't just glance at the star rating — read the words. Two companies with the same score can offer completely different experiences, and the written feedback is where you learn which is which. Look for specifics: real experiences, real details, and how the company responded to any criticism.`,
            `Be skeptical of profiles that are suspiciously perfect. No real company pleases everyone every time, and a wall of identical five-star blurbs can be a sign of manufactured reviews. A genuine mix — mostly positive, with the occasional honest critique handled gracefully — is far more trustworthy than an impossible record of perfection. Authenticity is the signal you're looking for.`,
          ]},
          { heading: `Weigh Price Against Value`, paragraphs: [
            `The cheapest quote is tempting, but cheap ${v.noun} is usually cheap for a reason — rushed work, unvetted labor, no insurance, and a much higher chance you end up paying someone else to redo it. When you factor in the cost of a job done twice, the lowest bid is often the most expensive path there is. Price matters, but value matters more.`,
            `That doesn't mean the most expensive option is automatically best either. What you're looking for is fair pricing attached to genuine quality and accountability — a company that charges a reasonable rate and actually delivers. Judge the whole package, not just the number, and remember that the real cost of a job includes everything that happens after the invoice is paid.`,
          ]},
          { heading: `Trust Your Read on the People`, paragraphs: [
            `Beyond all the checklists, pay attention to how a company makes you feel during the process. Do they seem honest and straightforward, or slick and evasive? Are they patient with your questions, or pushy about closing? Your instinct, informed by the signals above, is worth listening to. A company that pressures you before you're ready rarely improves once you've committed.`,
            `The best ${v.noun} companies don't need high-pressure tactics because they're confident in their value. They give you the information, answer your questions, and let you decide — because they know that clients who choose freely are the ones who stay. If a company is comfortable letting you take your time, that comfort usually reflects a business that's earned it.`,
          ]},
          { heading: `Put It All Together`, paragraphs: [
            `Choosing a ${v.noun} company you can trust comes down to paying attention: to how they communicate, how they quote, how they handle accountability, what their reviews really say, and how they treat you before you've paid. None of it requires special expertise — just a willingness to look past the ad and notice the signals that are usually right there.`,
            `Do that, and you'll dramatically improve your odds of hiring someone who does the job right the first time and stands behind it. It's worth the small amount of effort up front, because the alternative — learning the hard way — costs far more. When you find a company that checks these boxes, hold onto them; a ${v.noun} provider you genuinely trust is worth a great deal.`,
          ]},
          { heading: `Beware the Pressure Close`, paragraphs: [
            `One of the clearest warning signs is pressure. If a company pushes you to sign today, warns that the price will jump tomorrow, or makes you feel rushed into a decision, be cautious. High-pressure tactics are a tool companies reach for when they're worried you'll change your mind once you've had time to think — which is rarely a good sign about the offer itself.`,
            `Good ${v.noun} companies don't operate that way, because they don't have to. They're confident enough in their value to give you the information and let you decide on your own timeline. A company comfortable with you taking your time is usually one that has earned that comfort. Pressure is about their needs; patience is a sign they're focused on yours.`,
          ]},
          { heading: `Who's Actually Doing the Work`, paragraphs: [
            `It's worth asking who will actually show up to do your ${v.noun} job. Is it vetted, trained people, or whoever the company could find that week? A good company screens the people it sends and can tell you so plainly. The person at your ${v.isRemote ? 'project' : 'door'} represents the whole company, and the good ones take that seriously.`,
            `Be wary of companies that get vague about this. If they can't or won't tell you whether their people are vetted, that silence is an answer. You're trusting someone with access to your ${v.isRemote ? 'business and information' : 'home and belongings'}, and you deserve to know they've been properly checked. A company proud of its team is happy to talk about them.`,
          ]},
          { heading: `Local Knowledge and Reputation`, paragraphs: [
            `${v.isRemote ? 'Even for remote work, a company invested in its reputation behaves differently from one just chasing the next sale.' : `A company that actually knows the ${v.place} area brings an advantage — they understand local conditions and what your specific situation is likely to involve, rather than applying a generic playbook.`} Reputation ${here} is public and hard-won, which is exactly why an established company can't afford to phone in a job.`,
            `That accountability works in your favor. A company whose reputation depends on word of mouth ${here} has every incentive to do right by you, because one disappointed client costs them far more than any single job is worth. When a company has real skin in the local game, you're protected by the same force that protects everyone else they serve.`,
          ]},
          { heading: `How We Measure Up`, paragraphs: [
            `We wrote this guide the way we'd want it written for us, and we're comfortable being judged by it. At ${v.brand}, we answer quickly, quote transparently, stand behind our work, and let our real reviews speak for themselves. We put our answers up front precisely so you can hold us to the same standard you'd hold anyone else.`,
            `If you're weighing your options for ${v.noun} ${here}, we'd welcome the scrutiny. Text ${v.phone} with your questions and see how we measure up against everything above. We're confident in what you'll find, because we built the company to pass exactly this kind of test — and we'd be glad to earn your trust the honest way.`,
          ]},
        ],
        faq: [],
      },
    },
    {
      slug: 'what-to-expect-when-you-hire-a-pro',
      excerpt: `Not sure how the process works? Here's exactly what to expect from start to finish when you hire ${v.brand} for ${v.noun}.`,
      page: {
        title: `What to Expect When You Hire a ${Label} Pro — ${v.brand}`,
        metaDescription: `A step-by-step look at what happens when you hire ${v.noun} ${here}: from first contact to finished job, so there are no surprises along the way.`,
        h1: `What to Expect When You Hire a ${Label} Pro`,
        intro: `Hiring someone for ${v.noun} is a lot less stressful when you know exactly how it's going to go. Here's the whole process from first message to finished job — what to expect at each step, and what a good company does that a bad one doesn't.`,
        sections: [
          { heading: `Step One: Reaching Out`, paragraphs: [
            `It all starts with a simple message. You reach out — a text, a call, or an online booking — and describe what you need. A good ${v.noun} company makes this easy and responds quickly, because they know a slow or confusing first contact is where a lot of people give up. You shouldn't have to work hard just to get someone to take your money.`,
            `At this stage, expect a few questions. A company that quotes without understanding your job is guessing, so the good ones ask about the specifics — the size, the scope, the timing, anything unusual. It's not stalling; it's how they give you a number you can actually trust. Thoughtful questions up front are a sign you're dealing with a real professional.`,
          ]},
          { heading: `Step Two: Getting Your Quote`, paragraphs: [
            `Once they understand your job, you should get a clear quote — one that spells out what's included and what it costs, before you commit to anything. This is a moment to pay attention: a trustworthy quote is specific and complete, while a vague or suspiciously low one is a warning sign that the real cost will show up later.`,
            `Expect the quote to be the price you'll actually pay. A good company commits to its number, and if a genuine change in scope comes up, they tell you before doing any extra work rather than surprising you on the invoice. If a quote comes with pressure to decide immediately, that's a red flag — you should have time to consider it without being rushed.`,
          ]},
          { heading: `Step Three: Scheduling`, paragraphs: [
            `With the quote agreed, you'll settle on a time. A good ${v.noun} company works around your schedule as much as they reasonably can, rather than forcing you into a slot that doesn't fit. You should leave this step knowing exactly when to expect them — a specific window, not a vague "sometime next week."`,
            `This is also where reliability starts to matter. The company should confirm the appointment clearly and, ideally, remind you as it approaches. How organized and communicative they are about scheduling is a preview of how the actual job will go. Disorganization here often signals disorganization everywhere.`,
          ]},
          { heading: `Step Four: The Day of Service`, paragraphs: [
            `On the day, expect the team to arrive within the promised window, ready to work. If something genuinely unavoidable comes up on their end, a good company tells you before the window, not after it's passed in silence. Punctuality is one of the clearest signs of a professional operation, and its absence is one of the most common complaints about bad ones.`,
            `The team should confirm the details with you — or follow your instructions precisely if you're not on site — and get to work. Expect them to treat your ${v.isRemote ? 'project and your time' : 'home and property'} with respect throughout. If a question comes up mid-job, a good company asks rather than assuming, because getting it right matters more than avoiding a two-minute conversation.`,
          ]},
          { heading: `Step Five: Finishing Up`, paragraphs: [
            `When the work is done, a good company doesn't just vanish. They check the result, walk it with you where that makes sense, and make sure you're genuinely satisfied before calling the job complete. This final check is your chance to raise anything that isn't right while it can still be handled on the spot.`,
            `Then comes the invoice, which should match your quote. No surprise charges, no mystery fees, no "it turned out to be more complicated" that wasn't discussed with you first. A clean, expected bill at the end is the final sign of a company that does business honestly — and it's exactly what you should insist on.`,
          ]},
          { heading: `Step Six: After the Job`, paragraphs: [
            `A good ${v.noun} relationship doesn't end when the invoice is paid. If you have a question afterward, a concern about the work, or you're ready to book again, reaching out should be just as easy as it was the first time. Companies that go quiet the moment they've been paid are telling you how much they actually value you.`,
            `And if something isn't right after the fact, expect a good company to make it right — no arguing, no runaround. This is where the guarantee you were promised gets tested, and where the difference between a company that stands behind its work and one that doesn't becomes crystal clear. The follow-through is part of the service, not an optional extra.`,
          ]},
          { heading: `What Good Looks Like`, paragraphs: [
            `Put it all together and a good experience feels calm and predictable from start to finish: easy to reach, clear about pricing, on time, respectful, and accountable. You should never feel confused about what's happening, anxious about the bill, or unsure whether the company will stand behind its work. When it's done right, ${v.noun} is one less thing to worry about — not one more.`,
            `If any step along the way feels off — evasive answers, a quote that shifts, a missed appointment with no explanation — trust that signal. The process is supposed to be smooth, and a company that stumbles through the easy parts will likely stumble through the hard ones too. Knowing what good looks like is how you recognize it, and how you spot the opposite.`,
          ]},
          { heading: `What You Can Do to Help It Go Smoothly`, paragraphs: [
            `While a good company handles the hard parts, there are small things you can do to make your ${v.noun} job go smoothly. Be clear about what you need and any specifics that matter to you. Make sure the team can access the space or reach you. And if there's anything unusual about your situation, mention it up front so there are no surprises on the day.`,
            `Clear communication in both directions is what keeps a job on track. You don't need to do much — a good company will tell you if there's anything specific that would help — but a little clarity from your side means the work gets done faster and more accurately. It's a partnership, and the best results come when both sides are straightforward with each other.`,
          ]},
          { heading: `Red Flags to Watch for Along the Way`, paragraphs: [
            `As the process unfolds, stay alert to warning signs. A quote that shifts without explanation, an appointment missed with no communication, evasiveness about pricing or accountability, or pressure to pay in ways that feel off — any of these is a reason to pause. The early steps are a preview of the whole experience, and problems in the easy parts tend to predict problems in the hard ones.`,
            `Trust your read. If something feels wrong during what should be a straightforward process, that instinct is worth listening to. A good ${v.noun} company makes each step feel calm and predictable; a bad one leaves you anxious and guessing. You're allowed to walk away at any point if the experience isn't matching what a professional operation should feel like.`,
          ]},
          { heading: `Why Knowing the Process Matters`, paragraphs: [
            `Understanding how the whole thing is supposed to go puts you in control. When you know what good looks like at each step, you can recognize it when you see it — and spot the moment something veers off course. That knowledge turns hiring ${v.noun} from an anxious gamble into a manageable, even easy, decision.`,
            `Most of the stress people feel about hiring someone comes from uncertainty: not knowing what to expect, whether they're being treated fairly, or whether it'll all work out. Take away the uncertainty and the stress goes with it. That's why we laid the whole process out — so that whoever you hire ${here}, you'll know exactly how it should feel.`,
          ]},
          { heading: `Our Process, Start to Finish`, paragraphs: [
            `This is exactly how we've built the experience at ${v.brand}. From your first text to ${v.phone} through the final follow-up, every step is designed to be clear, fast, and free of the friction that makes hiring anyone for ${v.noun} such a chore elsewhere. We ask real questions, quote honestly, show up on time, and stand behind the work.`,
            `If you'd like to see it firsthand, reaching out is the whole first step. We'll walk you through your specific situation, give you a clear quote, and take it from there — no pressure, no surprises. The process above isn't a wish list; it's simply how we operate, and we'd be glad to show you.`,
          ]},
        ],
        faq: [],
      },
    },
    {
      slug: 'how-pricing-works',
      excerpt: `Confused about what ${v.noun} should cost? Here's how pricing actually works — and how to avoid getting overcharged.`,
      page: {
        title: `How ${Label} Pricing Works (and How to Avoid Overpaying) — ${v.brand}`,
        metaDescription: `Understand how ${v.noun} pricing works ${here}: what drives the cost, why quotes vary so much, and how to avoid hidden fees and getting overcharged.`,
        h1: `How ${Label} Pricing Works — and How to Avoid Overpaying`,
        intro: `Few things are more confusing than trying to figure out what ${v.noun} should cost. Quotes vary wildly, fees appear from nowhere, and it's hard to know if you're being treated fairly. Here's a plain-English guide to how pricing actually works and how to protect yourself.`,
        sections: [
          { heading: `Why Quotes Vary So Much`, paragraphs: [
            `If you've gotten a few quotes for the same ${v.noun} job and been shocked at how different they are, you're not alone. The variation comes from real differences — scope, quality, whether the company is insured, whether they use vetted labor — and from less honest ones, like lowball quotes designed to win the job and grow on the invoice later. Learning to tell those apart is half the battle.`,
            `A wide spread in quotes usually means the companies aren't actually offering the same thing, even if it looks that way on paper. The lowest bid often quietly excludes things, cuts corners you can't see, or leaves out fees that surface later. Comparing prices only makes sense when you're comparing the same scope and the same standard — otherwise you're comparing apples to something that just looks like an apple.`,
          ]},
          { heading: `What Actually Drives the Price`, paragraphs: [
            `The honest answer to "what does it cost?" is "it depends" — and any company that gives you a firm number before understanding your job is guessing. The real drivers are specific: the size and scope of the work, its condition or complexity, how much time it genuinely takes, and any access or timing factors. A good company asks about these before quoting for exactly this reason.`,
            `Understanding these drivers helps you spot a fair quote. When a company can explain how they arrived at their number — this much for that, adjusted for these factors — you're dealing with someone transparent. When the number seems plucked from thin air with no explanation, be cautious. Pricing should follow logically from the work involved, not from how much they think they can get.`,
          ]},
          { heading: `The Hidden-Fee Trap`, paragraphs: [
            `Hidden fees are the oldest trick in service pricing: quote low to win the job, then pad the final bill with "surcharges," "trip fees," "supply fees," and mystery line items you never agreed to. The quote looks great; the invoice tells a different story. This is one of the most common ways people get overcharged, and it's entirely avoidable if you know to watch for it.`,
            `Protect yourself by asking directly, up front: is this the total price, or are there additional fees I should know about? Get the answer clearly before you commit. A company that quotes a complete, honest number the first time has nothing to hide; one that stays vague about fees is telling you exactly how the final bill will go. Insist on clarity, and walk away from anyone who won't give it.`,
          ]},
          { heading: `Why Cheapest Usually Costs More`, paragraphs: [
            `The lowest quote feels like saving money right up until it doesn't. Cheap ${v.noun} is usually cheap for a reason — rushed work, unvetted labor, no insurance, and a much higher chance you end up hiring someone else to redo it. Factor in the cost of a job done twice, plus the wasted time and aggravation, and the bargain often turns out to be the most expensive option available.`,
            `This doesn't mean you should always pay top dollar — it means you should judge value, not just price. The goal is fair pricing attached to real quality and accountability. A reasonable rate for work done right the first time, by a company that stands behind it, is the actual bargain. Chasing the rock-bottom number is how people end up paying for the same job twice.`,
          ]},
          { heading: `How to Compare Quotes Fairly`, paragraphs: [
            `To compare quotes honestly, make sure you're comparing the same thing. Ask each company what's included, who does the work, whether they're insured, and what happens if you're not satisfied. A lower number often means less scope or undisclosed fees, so the quote that looks cheapest can easily become the most expensive once everything surfaces.`,
            `Watch how each company answers your questions, too. Clear, confident, specific answers are a good sign; vague or evasive ones are a warning. The quote itself is only part of the picture — how transparent a company is about it tells you nearly as much as the number does. Fair comparison is about the whole package, not just the bottom line.`,
          ]},
          { heading: `Questions That Protect You`, paragraphs: [
            `A few direct questions can save you a lot of money and frustration. Is the quote the final price, or an estimate that can change? Are there any additional fees? What happens if the job turns out to be different than expected? What's your policy if I'm not satisfied? The answers — and how readily they're given — tell you whether you're dealing with a straight shooter.`,
            `Don't be shy about asking. It's your money, and a reputable company expects and welcomes these questions. Any company that gets impatient or cagey when you ask about pricing is showing you something important. The few minutes it takes to ask are among the best-spent minutes in the whole process, because they surface the problems before they cost you.`,
          ]},
          { heading: `Fair Pricing Is a Two-Way Street`, paragraphs: [
            `Fair pricing cuts both ways, and a good company applies it in both directions. If a job turns out simpler than expected, that should be reflected honestly. If it's genuinely more involved than you described, they should tell you before doing the extra work — never spring it on you afterward. Fairness means the number tracks the actual work, in your favor as well as theirs.`,
            `That kind of honesty is what you're really looking for. It's not about finding the company that will do the most work for the least money; it's about finding the one that charges fairly for good work and never makes you feel like you have to decode the bill. When you find that, the price stops being a source of anxiety and becomes just another part of a transaction you can trust.`,
          ]},
          { heading: `Deposits and Payment Terms`, paragraphs: [
            `Depending on the job, a company may ask for a deposit to reserve your booking — that's a normal, fair practice that protects both sides. What matters is transparency: a good company tells you clearly up front how much any deposit is and how it applies to your total. A deposit request isn't a red flag; a vague or evasive one is.`,
            `Pay attention to payment terms in general. How and when you're expected to pay, what methods are accepted, and whether the invoice will be clear are all worth knowing before you commit. Straightforward, secure payment with a clear bill is what you should expect. Anything convoluted or high-pressure around payment is worth questioning before money changes hands.`,
          ]},
          { heading: `Recurring Service and Ongoing Value`, paragraphs: [
            `If your ${v.noun} need is ongoing, there's often real value in a recurring arrangement rather than one-off bookings. Beyond convenience, a provider who works with you regularly learns your preferences and situation, which makes each visit more efficient over time. That said, a good company recommends a frequency that fits your actual needs — not the maximum they can talk you into.`,
            `Be wary of anyone pushing you toward an aggressive recurring schedule that seems more about their revenue than your needs. The right arrangement is one that genuinely serves you and that you're glad to keep because it's useful, not one you feel locked into. Recurring service should save you money and hassle over time, not become a subscription you resent.`,
          ]},
          { heading: `The Real Cost Is the Total Cost`, paragraphs: [
            `The single most important shift in thinking about ${v.noun} pricing is this: the real cost isn't the number on the quote, it's the total cost once everything is accounted for. A cheap job that has to be redone, a low quote that balloons with fees, a provider you have to chase — those hidden costs are where "cheap" becomes expensive. Judge the total, not the sticker.`,
            `When you think in terms of total cost, fair pricing from a reliable company almost always wins. You pay once, the job is done right, and you're not spending time, money, and stress cleaning up afterward. That's the frame that protects you from the false economy of the lowest bid, and it's the one worth carrying into any hiring decision you make.`,
          ]},
          { heading: `How We Price ${Label}`, paragraphs: [
            `At ${v.brand}, we price the way this guide recommends because it's simply the honest way to do it. You get a clear, complete quote up front, the number you're quoted is the number you pay, and there are no hidden fees waiting on the invoice. If the scope genuinely changes, we tell you first and let you decide.`,
            `If you want an honest number for your specific ${v.noun} job ${here}, the fastest way is to ask. Text ${v.phone} with a few details and we'll give you a straight quote — no games, no pressure. We're happy to explain exactly how we got to the number, because transparent pricing is only a real advantage when your pricing is fair, and ours is.`,
          ]},
        ],
        faq: [],
      },
    },
    {
      slug: 'diy-vs-hiring-a-professional',
      excerpt: `Should you handle it yourself or hire a pro? Here's an honest look at when ${v.noun} is worth doing yourself and when it isn't.`,
      page: {
        title: `DIY vs. Hiring a Pro for ${Label}: When Each Makes Sense — ${v.brand}`,
        metaDescription: `An honest guide to deciding between DIY and hiring a professional for ${v.noun}: the real costs, risks, and trade-offs, so you can make the right call.`,
        h1: `DIY vs. Hiring a Pro: When Each Makes Sense`,
        intro: `Not every ${v.noun} job needs a professional — but plenty of them do, and getting that call wrong can be costly. Here's an honest look at when doing it yourself makes sense and when hiring a pro is the smarter move, from a company that would honestly rather you make the right choice.`,
        sections: [
          { heading: `The Honest Starting Point`, paragraphs: [
            `We'll be straight with you: not every job is worth hiring out, and a company that tells you otherwise is more interested in your money than your best interest. Some ${v.noun} tasks are genuinely doable yourself with a little time and effort, and if that's your situation, we'd rather tell you than oversell you. Knowing the difference is what this guide is about.`,
            `That said, plenty of jobs really are better left to someone who does them for a living — not because you couldn't figure it out, but because the time, risk, and likelihood of a redo make DIY a false economy. The goal here isn't to talk you into or out of anything; it's to help you weigh the trade-offs honestly and make the call that's actually right for you.`,
          ]},
          { heading: `When DIY Makes Sense`, paragraphs: [
            `Doing it yourself can be the right choice when the job is small, low-risk, and within your comfort zone. If the task is straightforward, the stakes of getting it slightly wrong are low, and you have the time and tools, there's nothing wrong with handling it yourself. Not every ${v.noun} situation calls for a professional, and we'd never pretend otherwise.`,
            `DIY also makes sense when it's genuinely a learning experience you want, or when the cost of hiring out clearly exceeds the value for a minor job. If you enjoy the work, have the time, and the downside of a mistake is small, going it alone can be satisfying and economical. The key is being honest with yourself about the job's real difficulty and your own capacity to do it well.`,
          ]},
          { heading: `When to Call a Professional`, paragraphs: [
            `Hiring a pro is the smarter move when the job is complex, when getting it wrong is costly or risky, or when the time and effort simply aren't worth it to you. If a mistake could cause real damage, if the work requires experience or equipment you don't have, or if the job is large enough that DIY would consume your weekends for weeks, a professional almost always comes out ahead.`,
            `It's also worth hiring out when your time is genuinely more valuable spent elsewhere. There's no prize for doing everything yourself, and the hours you'd pour into a difficult ${v.noun} job might be better spent on work, family, or rest. A pro who does this daily will usually do it faster and better, and that efficiency has real value even before you factor in the risk.`,
          ]},
          { heading: `The Hidden Costs of DIY`, paragraphs: [
            `DIY looks free, but it rarely is. There's the cost of tools and materials, which can add up fast for a one-time job. There's the value of your time, which is real even if no one's invoicing you for it. And there's the risk of mistakes — a botched job that has to be redone, or worse, one that causes damage costing far more than hiring a professional would have.`,
            `These hidden costs are exactly what people underestimate when a project seems cheaper to handle themselves. Factor in the tools you had to buy, the weekend you lost, and the do-over when it didn't go as planned, and the "savings" often evaporate. An honest accounting of DIY includes all of it, not just the absence of a labor charge.`,
          ]},
          { heading: `What a Professional Actually Brings`, paragraphs: [
            `When you hire a good ${v.noun} pro, you're paying for more than labor. You're paying for experience — the judgment that comes from having done the job many times and knowing what to anticipate. You're paying for the right tools and materials, already on hand. And you're paying for accountability: if something goes wrong, a real company stands behind it, which is something DIY can never offer.`,
            `That combination is why professionals are worth it for the right jobs. They're faster because they're experienced, they're less likely to make costly mistakes, and they carry the risk that would otherwise fall entirely on you. For a complex or high-stakes job, that value far outweighs the cost — which is precisely why "just do it yourself" is bad advice for anything beyond the simple stuff.`,
          ]},
          { heading: `The Risk Factor`, paragraphs: [
            `Risk is often the deciding factor. Some ${v.noun} jobs, done wrong, cause damage that dwarfs the cost of hiring out — and once that happens, you're paying a professional anyway, on top of the repair. When the downside of a mistake is significant, the math shifts decisively toward hiring someone who'll get it right the first time.`,
            `Be honest about the stakes before you pick up a tool. If a mistake would be a minor inconvenience, DIY is low-risk. If a mistake could be expensive, dangerous, or hard to undo, that's exactly the kind of job where a professional earns their fee many times over. The riskier the job, the stronger the case for hiring a pro who carries that risk for you.`,
          ]},
          { heading: `Be Realistic About Your Time`, paragraphs: [
            `A job that takes a pro a couple of hours might take you a full day or more, especially the first time. That's not a knock on you — it's just the reality of experience. Before committing to DIY, be honest about how long it'll actually take and whether you have that time to spare. Projects that drag on half-finished are their own kind of cost.`,
            `Your time has value even when it isn't billed. The hours you'd spend on a difficult ${v.noun} job are hours not spent on the things you'd rather be doing. For some jobs that trade is worth it; for others, paying someone to handle it in a fraction of the time is one of the better deals available. Factor your time in honestly, and the right choice often becomes obvious.`,
          ]},
          { heading: `When You've Started and It's Not Going Well`, paragraphs: [
            `Sometimes the right call becomes clear only after you've started — the job turned out harder than expected, or it's not coming together the way you hoped. There's no shame in calling a professional at that point. In fact, stopping before you make things worse is the smart move, and a good company won't judge you for it.`,
            `If you find yourself in over your head on a ${v.noun} project, reaching out sooner rather than later usually saves money. The longer a struggling DIY job goes, the more there often is to fix. A pro can step in, sort it out, and get you to the result you wanted — and you'll have learned exactly where the line is between what's worth doing yourself and what isn't.`,
          ]},
          { heading: `Making the Right Call for You`, paragraphs: [
            `There's no universal answer to DIY versus hiring a pro — it depends on the job, the risk, your skills, and your time. The right approach is to weigh those honestly rather than defaulting to "always do it myself to save money" or "always hire it out." Some jobs genuinely call for one, some for the other, and knowing which is which is the whole skill.`,
            `The good news is that a trustworthy company will help you make that call honestly, even when the honest answer is "you can handle this one yourself." That's exactly the kind of company worth building a relationship with — one that tells you the truth about when you need them and when you don't, because they're playing the long game rather than chasing every possible invoice.`,
          ]},
          { heading: `How We Approach It`, paragraphs: [
            `At ${v.brand}, we'd genuinely rather tell you a job is within your reach than talk you into hiring us for something you don't need. It costs us a little today and earns us your trust for the long haul, and that's a trade we'll make every time. When you do need a professional for ${v.noun} ${here}, we want to be the company you call — and honesty about when that is builds exactly that kind of relationship.`,
            `So if you're on the fence about a job, feel free to ask us. Text ${v.phone} and describe what you're facing, and we'll give you a straight answer about whether it's worth hiring out. If it is, we'd be glad to help; if it isn't, we'll tell you that too. Either way, you get honest guidance rather than a sales pitch.`,
          ]},
        ],
        faq: [],
      },
    },
    {
      slug: 'questions-to-ask-before-you-hire',
      excerpt: `The right questions before you hire ${v.noun} can save you money and headaches. Here are the ones that actually matter.`,
      page: {
        title: `Questions to Ask Before You Hire Any ${Label} Company — ${v.brand}`,
        metaDescription: `The essential questions to ask before hiring ${v.noun} ${here} — the ones that reveal whether a company is trustworthy before you commit a single dollar.`,
        h1: `Questions to Ask Before You Hire Any ${Label} Company`,
        intro: `The right questions, asked before you commit, will tell you almost everything you need to know about a ${v.noun} company. Here are the ones that actually matter — and, just as importantly, what the answers should sound like.`,
        sections: [
          { heading: `Why the Questions Matter`, paragraphs: [
            `Most bad ${v.noun} experiences could have been avoided with a few pointed questions up front. Companies are on their best behavior before you hire them, so the sales stage is your best chance to learn who you're really dealing with. How readily and clearly a company answers is often more revealing than the answers themselves.`,
            `None of these questions require expertise to ask, and a reputable company will welcome them. In fact, watch how a company reacts: a straight shooter answers plainly and confidently, while an evasive or impatient response is itself a warning. The questions below are simple, but together they paint a clear picture of whether you can trust the company in front of you.`,
          ]},
          { heading: `"Is the Quote the Final Price?"`, paragraphs: [
            `This might be the single most important question you can ask. Is the number you're being quoted the final price, or an estimate that can change? A trustworthy company commits to its quote and explains how it would handle a genuine change in scope — before doing any extra work. A vague or hedging answer is a warning that the low quote might be bait.`,
            `Follow up by asking what would cause the price to change and how you'd be notified. The right answer is that any change would be discussed with you in advance, never sprung on the invoice. If a company can't give you that assurance clearly, you've learned something important about how the final bill is likely to go.`,
          ]},
          { heading: `"Are There Any Additional Fees?"`, paragraphs: [
            `Hidden fees are one of the most common ways people get overcharged, so ask directly: are there any additional fees, surcharges, or costs beyond the quote? Get the answer clearly, before you commit. A company that quotes a complete, honest number has nothing to hide; one that stays vague about fees is telling you exactly how the final bill will surprise you.`,
            `Don't accept a hand-wave here. "It depends" or "we'll see" about fees is not an acceptable answer for a company that wants your trust. The good ones can tell you plainly what's included and what, if anything, could cost extra. Insisting on that clarity up front is one of the simplest ways to protect yourself from an inflated invoice.`,
          ]},
          { heading: `"Who Will Actually Do the Work?"`, paragraphs: [
            `Ask who will actually show up to do your ${v.noun} job, and whether they're vetted. You're trusting someone with access to your ${v.isRemote ? 'business and information' : 'home and belongings'}, so you deserve to know they've been properly screened. A company proud of its team answers this happily; one that gets vague is telling you something by its silence.`,
            `A good answer describes vetted, trained people the company stands behind — not "whoever's available." The person who arrives represents the entire company, and the trustworthy ones take real care about who wears their name. If a company can't or won't speak clearly about who they send, treat that as a meaningful red flag.`,
          ]},
          { heading: `"Are You Licensed and Insured?"`, paragraphs: [
            `${v.isRemote ? 'Even for remote work, ask what agreements are in place and what recourse you have if something goes wrong.' : 'Ask whether the company is licensed and insured for the work they do.'} This is the baseline of legitimacy, and it protects you: if something is damaged or goes wrong, there needs to be a real company standing behind the job, not an individual who can vanish without consequences.`,
            `A legitimate company answers this without hesitation, because it's a normal and reasonable thing to ask. Evasiveness here is a serious warning sign. The whole point of accountability is that it kicks in exactly when things go wrong — which is precisely the situation you most need protection in — so never skip this question, however smoothly everything else is going.`,
          ]},
          { heading: `"What Happens If I'm Not Satisfied?"`, paragraphs: [
            `Ask directly what the company does if you're not happy with the work. The answer reveals whether they truly stand behind what they do. A trustworthy company tells you plainly that they'll make it right, without hedging. One that gets defensive, vague, or points you to fine print is warning you about the exact situation you most need protection in.`,
            `This question matters more than any promise about things going well, because anyone can be gracious when everything's perfect. What separates the good companies is how they respond when something falls short. A clear, confident commitment to make it right is one of the strongest signals you can get that you're dealing with a company worth hiring.`,
          ]},
          { heading: `"How Do You Handle Scheduling and Timing?"`, paragraphs: [
            `Ask how scheduling works and what happens if timing needs to change. A good company gives you a specific window rather than a vague "sometime," communicates clearly, and lets you know promptly if anything shifts. How organized and communicative they are about scheduling is a reliable preview of how the actual job will go.`,
            `Reliability around timing is one of the most common pain points in ${v.noun}, so it's worth probing. A company that treats your schedule as seriously as its own — showing up when promised and giving notice if plans change — is demonstrating exactly the respect you want. Disorganization or vagueness at this stage often signals it everywhere.`,
          ]},
          { heading: `"Can You Explain How You Got to This Price?"`, paragraphs: [
            `A fair, transparent company can walk you through how it arrived at your quote — this much for that, adjusted for these factors. Asking for that explanation is entirely reasonable, and the response tells you a lot. Clarity and confidence are good signs; impatience or a number that seems plucked from nowhere are not.`,
            `You're not being difficult by asking to understand your own quote — you're being a smart consumer. A company with fair pricing has no reason to keep it mysterious, and the good ones are happy to explain to the point of over-explaining. If understanding the number makes a company uncomfortable, that discomfort is telling you something worth knowing.`,
          ]},
          { heading: `Listen to How They Answer`, paragraphs: [
            `Across all of these questions, pay as much attention to how a company answers as to what they say. Clear, patient, confident responses are the hallmark of a business that operates honestly. Evasiveness, impatience, or pressure in response to reasonable questions is a warning that outweighs any smooth sales pitch. The tone is often the real answer.`,
            `A reputable company treats your questions as normal and welcome, because it has nothing to hide and genuinely wants an informed client. If asking basic questions gets you a cold or cagey reaction, imagine how you'll be treated once there's a problem to sort out. The way a company handles your curiosity is a preview of how it'll handle your concerns.`,
          ]},
          { heading: `"How Long Have You Been Doing This?"`, paragraphs: [
            `Experience matters in ${v.noun}, so it's fair to ask how long a company has been doing the work. Experience brings judgment — the ability to anticipate problems and handle the unexpected — that a brand-new operation simply hasn't developed yet. It's not that newer companies can't be good, but a real track record is reassuring, and an established company should be glad to share it.`,
            `The answer also tells you something about stability. A company that's been around and plans to stay is one you can build a relationship with, and one that has a reputation to protect. Fly-by-night operations come and go; an established company ${here} has every incentive to keep doing right by clients. Longevity isn't everything, but it's a meaningful data point worth asking about.`,
          ]},
          { heading: `"Can You Walk Me Through It?"`, paragraphs: [
            `Ask a company to walk you through how the job will actually go — what they'll do, roughly how long it'll take, and what you should expect at each step. A company that knows its work can explain the process clearly and confidently. Fumbling or vagueness here can signal inexperience or a lack of real organization behind the pitch.`,
            `A clear walk-through also sets accurate expectations, which prevents misunderstandings later. When you both understand what's going to happen, there's far less room for the job to go sideways or for surprises to crop up. A company happy to explain the process is one that operates with a plan — exactly the kind you want handling your ${v.noun}.`,
          ]},
          { heading: `Ask Us Anything`, paragraphs: [
            `We wrote this list because we're comfortable answering every question on it, and we'd encourage you to ask us all of them. At ${v.brand}, the quote is the price, there are no hidden fees, our people are vetted, we're accountable, and if you're not satisfied, we make it right. We put our answers up front precisely so you can hold us to the same standard as anyone else.`,
            `So put us to the test. Text ${v.phone} with whatever you want to know about ${v.noun} ${here}, and see how we answer. We think you'll find exactly the clarity and confidence this guide says to look for — because we built the company to pass this kind of scrutiny, and we'd rather earn your trust by answering honestly than win a job by dodging.`,
          ]},
        ],
        faq: [],
      },
    },
    {
      slug: 'red-flags-to-watch-for',
      excerpt: `Some warning signs are easy to miss until it's too late. Here are the red flags that separate a risky ${v.noun} company from a reliable one.`,
      page: {
        title: `Red Flags to Watch for When Hiring ${Label} — ${v.brand}`,
        metaDescription: `The warning signs that a ${v.noun} company will let you down — learn to spot the red flags ${here} before you hire, not after.`,
        h1: `Red Flags to Watch for When Hiring ${Label}`,
        intro: `Most bad ${v.noun} experiences come with warning signs you could have spotted beforehand — if you knew what to look for. Here are the red flags that separate a risky company from a reliable one, so you can walk away before it costs you.`,
        sections: [
          { heading: `Why Red Flags Get Missed`, paragraphs: [
            `The frustrating thing about most bad experiences is that the warning signs were usually there all along. People miss them because they don't know what to watch for, or because a smooth sales pitch talks them past their instincts. Learning to recognize the red flags in advance is how you avoid the experience entirely rather than learning the hard way.`,
            `None of these signs requires expertise to spot — just attention. A company reveals a lot about itself before you ever hire it, in how it communicates, quotes, and handles your questions. The signs below are the ones that most reliably predict trouble, and noticing even one of them is a reason to slow down and look more carefully.`,
          ]},
          { heading: `Red Flag: Hard to Reach`, paragraphs: [
            `If a company is hard to reach, slow to respond, or evasive during the sales stage — when they should be on their best behavior — take it seriously. Communication only gets worse after they have your money, not better. A business that can't be bothered to respond promptly when it's trying to win your job is showing you exactly how it'll treat you once it has it.`,
            `Responsiveness is one of the clearest early signals of how the whole experience will go. The good companies answer quickly and clearly because they've built their operation around being reachable. If you're already chasing a company for a reply before you've paid them a cent, that's a preview you should believe.`,
          ]},
          { heading: `Red Flag: A Quote That's Suspiciously Low`, paragraphs: [
            `A quote dramatically lower than the others is tempting, but it's often a warning rather than a bargain. Lowball quotes are a classic tactic: win the job with a great number, then pad the invoice with fees and change orders once you're committed. If a price seems too good to be true, it usually is — and the difference tends to reappear on the final bill.`,
            `A suspiciously low quote can also mean the company is cutting corners you can't see — unvetted labor, no insurance, or a scope that quietly excludes things you assumed were included. Either way, the cheapest number deserves scrutiny, not automatic trust. Ask what's included and what could change, and watch closely for a straight answer.`,
          ]},
          { heading: `Red Flag: Vagueness About Fees`, paragraphs: [
            `If a company gets vague when you ask about fees or the final price, treat it as a serious warning. Hidden fees are one of the most common ways people get overcharged, and evasiveness about them up front is telling you exactly how the invoice will go. A trustworthy company gives you a complete, honest number and can tell you plainly what, if anything, could cost extra.`,
            `"It depends" or "we'll figure it out later" about pricing is not acceptable from a company that wants your trust. You're entitled to know what you'll pay before you commit, and a business that won't give you that clarity is choosing to keep you in the dark. That choice, on its own, is reason enough to look elsewhere.`,
          ]},
          { heading: `Red Flag: High-Pressure Sales`, paragraphs: [
            `Pressure is a major warning sign. If a company pushes you to decide today, warns that the price will jump tomorrow, or makes you feel rushed, be cautious. High-pressure tactics are what companies reach for when they're worried you'll change your mind once you've had time to think — which says a lot about the offer.`,
            `Good ${v.noun} companies don't need to pressure you, because they're confident in their value and expect to earn your business honestly. A company comfortable with you taking your time is usually one that has earned that comfort. If you feel rushed or cornered during what should be a straightforward decision, trust that feeling and step back.`,
          ]},
          { heading: `Red Flag: Evasiveness About Accountability`, paragraphs: [
            `When you ask what happens if you're not satisfied, or whether they're ${v.isRemote ? 'accountable if something goes wrong' : 'licensed and insured'}, the answer should be clear and confident. If a company gets defensive, vague, or dodges the question, that's a serious red flag. Accountability matters most exactly when something goes wrong, and evasiveness here leaves you exposed at the worst possible moment.`,
            `A company that stands behind its work says so plainly, because it's the truth and they're proud of it. Hesitation or fine-print hedging around accountability is a warning that when a problem arises, you'll be on your own. Never skip these questions, and never ignore a shaky answer to them, however smooth everything else seems.`,
          ]},
          { heading: `Red Flag: No Real Track Record`, paragraphs: [
            `Be cautious of a company with no verifiable track record — no real reviews, no references, nothing to show for itself. Everyone starts somewhere, but an established company should have evidence of satisfied clients you can actually check. An absence of any track record, or reviews that seem manufactured, is a reason to dig deeper before trusting them with your job.`,
            `Just as telling is a track record that's suspiciously perfect. A wall of identical five-star reviews with no specifics can signal fakery, since no real company pleases everyone every time. What you want is a genuine, verifiable history — mostly positive, with the occasional honest critique handled well. Real evidence beats polished claims every time.`,
          ]},
          { heading: `Red Flag: They Won't Put It in Writing`, paragraphs: [
            `If a company resists putting the important details — the scope, the price, the terms — in writing, be wary. A verbal promise is easy to forget or deny later, and a company that wants everything kept casual and undocumented may be leaving itself room to change the story. Clear, written terms protect both sides, and the good companies have no problem providing them.`,
            `You don't need a stack of legal paperwork for every job, but the key facts should be clear and confirmable. A quote you can point to, terms you both understand, and a bill that matches — these are basic protections. Reluctance to document the essentials is a subtle but real warning that the details might get slippery when it matters.`,
          ]},
          { heading: `Trust Your Instincts`, paragraphs: [
            `Beyond any specific sign, pay attention to how a company makes you feel. If something seems off — the answers don't add up, the pressure is high, the vibe is slick rather than straight — that instinct is worth listening to. It's usually your subconscious noticing the smaller signals before you've consciously named them. You're always allowed to walk away.`,
            `No single red flag is necessarily fatal, but a cluster of them is a clear signal to look elsewhere. There are good ${v.noun} companies out there, and you don't have to settle for one that's giving you warning signs before you've even hired them. Trust the pattern you're seeing, and hold out for a company that gives you confidence instead of doubts.`,
          ]},
          { heading: `Red Flag: Unusual Payment Demands`, paragraphs: [
            `Be cautious of a company that demands full payment upfront before any work is done, insists on cash only, or pushes payment methods that leave you with no recourse. While a reasonable deposit is normal and fair, an insistence on paying everything in advance — especially in ways that can't be traced or disputed — is a classic warning sign worth taking seriously.`,
            `Legitimate companies use straightforward, secure payment and are transparent about their terms. If the payment arrangement feels designed to protect the company at your total expense, or to make it hard for you to push back if something goes wrong, that's a red flag. How a company handles money is a window into how it handles everything else.`,
          ]},
          { heading: `Red Flag: Overpromising`, paragraphs: [
            `Watch out for a company that promises the impossible — the lowest price and the highest quality and the fastest turnaround, all at once. Those things involve real trade-offs, and a company claiming to defy all of them is usually overpromising to win the job, then underdelivering once you've committed. Honest companies are realistic about what they can and can't do.`,
            `The same goes for guarantees that sound too good to be true or claims that seem exaggerated. A trustworthy ${v.noun} company sets accurate expectations rather than telling you whatever it thinks you want to hear. If the pitch sounds too perfect, be skeptical — reality has trade-offs, and a company that pretends otherwise is setting you up to be disappointed.`,
          ]},
          { heading: `The Opposite of a Red Flag`, paragraphs: [
            `It's worth knowing what the good signs look like too, because they're the mirror image of the warnings above. A company that's easy to reach, quotes clearly and completely, answers your questions patiently, is upfront about accountability, and lets you decide without pressure is showing you green flags at every turn. That's exactly the profile you're looking for.`,
            `At ${v.brand}, we've worked to be the opposite of every red flag on this list — reachable, transparent, accountable, and honest, with real reviews and no pressure. If you're hiring for ${v.noun} ${here}, text ${v.phone} and put us up against everything above. We're confident you'll find green flags where the risky companies show red, because we built the company precisely to be the one worth trusting.`,
          ]},
        ],
        faq: [],
      },
    },
  ]
}
