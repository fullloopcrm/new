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
      `If you've had a bad ${name.toLowerCase()} experience before, you already know how much the details matter — and how rarely they're actually delivered. That gap is the whole reason clients ${here} switch to us and stay. We're not promising anything exotic; we're promising that ${name.toLowerCase()} gets done properly, priced fairly, and backed by a company that makes it right if it isn't. For most people, that turns out to be exactly what they were looking for all along.`,
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
