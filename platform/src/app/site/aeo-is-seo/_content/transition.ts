import type { Block } from './types'

export const transitionBlocks: Block[] = [
  { type: 'h2', text: 'Part Two: The Transition to AEO' },
  {
    type: 'p',
    text: 'Answer Engine Optimization is the practice of structuring, writing, and technically packaging content so that an AI system — a search engine\'s generative answer layer, a standalone AI chat product, a voice assistant, or an autonomous agent — selects it as a source when synthesizing a response to a user\'s question. That is the whole definition. Everything else in this section is an explanation of what that definition actually requires in practice, because the mechanics of "get selected by a language model" are genuinely different from the mechanics of "get ranked by a search index," even though the two disciplines share a great deal of overlapping DNA.',
  },
  {
    type: 'p',
    text: 'It helps to be precise about what is actually happening, computationally, when someone asks ChatGPT, Perplexity, Google\'s AI Overviews, or Claude a question that triggers a live search. In broad strokes, four things happen in sequence: the system interprets the user\'s question and often rewrites or expands it into one or more retrieval queries; it retrieves a set of candidate documents from an index (sometimes a live web index, sometimes a cached one, sometimes a hybrid); it evaluates and reranks those candidates for relevance, trustworthiness, and how well they actually answer the question; and finally it synthesizes a natural-language answer from a handful of the highest-ranked candidates, typically citing three to ten sources rather than the traditional ten-plus links of a classic results page. AEO is the discipline of making your content win at every one of those four stages — not just the first one, which is where most of classic SEO still lives.',
  },

  { type: 'h3', text: 'SEO and AEO Are Not Rivals — They Are Layers' },
  {
    type: 'p',
    text: 'The most common and most damaging misconception circulating in marketing right now is that AEO replaces SEO, or that businesses need to choose one discipline over the other. This is false, and it is worth being direct about why. Every AI answer engine currently in production — Google\'s AI Overviews, Bing Copilot, Perplexity, ChatGPT Search, Claude\'s web search — still depends on an underlying crawl-and-index infrastructure to find your content in the first place. If a page is not crawlable, not indexed, blocked by a misconfigured robots.txt file, buried behind a login wall, loading its core content via client-side JavaScript that a crawler cannot execute, or simply too slow and broken to render reliably, it does not matter how perfectly "answer-shaped" the content is — the retrieval stage never finds it, and none of the later stages get a chance to evaluate it. Classic technical SEO is not obsolete. It is the floor. AEO is what you build on top of that floor.',
  },
  {
    type: 'p',
    text: 'Put differently: SEO gets you into the room. AEO determines whether you get to speak once you are in it. A site with flawless technical SEO and generic, thin, un-citable content will be crawlable and indexable but will lose the synthesis stage every time to a competitor whose content is more clearly structured, more directly answers the actual question, and is corroborated by more independent sources. A site with brilliant, deeply original content but broken technical fundamentals never even reaches the stage where that quality could matter. You need both, and for the foreseeable future you will continue to need both, because no major AI provider has announced — or has any evident interest in building — a retrieval system that bypasses the open web\'s existing crawl-and-index infrastructure entirely.',
  },

  {
    type: 'note',
    side: 'right',
    label: 'Tip',
    text: 'Stop asking "SEO or AEO?" SEO gets you into the room. AEO decides whether you get to speak once you\'re in it. You need both, and you always will.',
  },

  { type: 'h3', text: 'What Actually Changes: From Ranking Signals to Retrieval and Synthesis Signals' },
  {
    type: 'p',
    text: 'Classic SEO optimizes primarily for two audiences: a ranking algorithm, and a human being scanning a list of blue links and deciding which one to click based on a title, a URL, and a two-line snippet. AEO optimizes for a third audience that did not meaningfully exist before: a language model that is going to read your content in full (or in large chunks), assess whether it directly and confidently answers a specific question, decide whether it is trustworthy enough to lean on, and then paraphrase or quote it into a synthesized response — usually without ever showing your title, your URL, or your carefully written meta description to the end user until after the answer is already delivered, if at all.',
  },
  {
    type: 'p',
    text: 'This changes what "good content" means in several concrete, practical ways. First, extractability matters more than persuasive flow. A human reader will tolerate — sometimes even enjoy — a long, winding introduction before you get to the point. A language model performing retrieval is scanning for a chunk of text that cleanly and self-containedly answers a specific question, and it heavily favors content where the answer is stated plainly near the top of a section, in a sentence or two that would still make complete sense if it were lifted out of the page entirely and shown with no other context. Second, structure becomes a first-class ranking signal in a way it never fully was before. Clear headings that match the actual phrasing of real questions, explicit question-and-answer formatting, numbered steps, and well-marked-up tables are not just nice for human skimmers anymore — they are what allow a retrieval system to chunk your page correctly and match a chunk to a query with confidence. Third, corroboration matters more than any single page\'s individual authority. Language models are trained to be skeptical of any single, isolated claim; they weight information more heavily when the same fact, described independently, appears across multiple credible sources — your own site, third-party coverage, review platforms, forums, and reference sites. One perfectly optimized page saying something is far less powerful, in an AEO sense, than the same core fact being independently corroborated in five places you do not control.',
  },

  { type: 'h3', text: 'The Concrete Mechanics of AEO' },
  {
    type: 'p',
    text: 'Below is what actually implementing AEO looks like in practice, organized by what each tactic accomplishes and at which stage of the retrieve-rank-synthesize pipeline it helps.',
  },
  {
    type: 'p',
    text: 'Answer-first paragraph structure. Lead every section with a direct, complete, self-contained answer to the question implied by its heading, typically in the first one to three sentences, before you add nuance, caveats, or supporting detail. This is sometimes called the inverted pyramid, borrowed directly from journalism, and it exists for the same reason a news lede does: the reader (or in this case, the retrieval system) may only ever consume the first sentence, so that sentence has to carry the whole answer on its own.',
  },
  {
    type: 'p',
    text: 'Explicit question-and-answer formatting. Structuring sections around the literal phrasing of real questions people ask — "What is Answer Engine Optimization?" as an actual heading, not a clever euphemism for the same idea — makes it dramatically easier for a retrieval system to match your content to a user\'s conversational query, because increasingly, users are not typing three-word keyword phrases into a search box; they are asking full, natural questions to a chat interface, and the system is matching against the semantic and literal shape of that question.',
  },
  {
    type: 'p',
    text: 'Structured data and schema markup. Schema.org vocabulary, implemented as JSON-LD in a page\'s head, gives machines an explicit, unambiguous, non-natural-language description of what a page contains: this is an Article, written by this Person, who has this stated expertise, published on this date, about this Organization, containing these FAQ entries with these exact answers, describing this Product with this price and these reviews. Structured data does not replace well-written prose — language models still read and evaluate the prose — but it removes ambiguity at the parsing stage and gives retrieval systems a fast, reliable, machine-native shortcut to the same facts a human would have to read the whole page to extract. FAQPage, HowTo, Article, Organization, Person, and Product schema are the highest-leverage types for most AEO work today.',
  },
  {
    type: 'p',
    text: 'The llms.txt file. Proposed in 2024 and adopted by a growing number of sites through 2025, llms.txt is a plain-text file placed at a site\'s root (alongside the long-established robots.txt) that gives AI systems a curated, machine-readable summary of a site\'s most important content, in a format explicitly designed for language-model consumption rather than for search-crawler indexing. It is not yet universally supported by every major AI provider, and it is not a substitute for a genuinely well-structured site — but it costs almost nothing to implement, it is an explicit, direct signal of AEO intent, and as adoption grows among the AI systems that do honor it, being an early, correct implementer costs nothing and has clear asymmetric upside.',
  },
  {
    type: 'p',
    text: 'Named-entity clarity. Language models build an internal representation of the world as entities and the relationships between them — people, organizations, products, places, concepts — much like Google\'s Knowledge Graph does explicitly. Content that clearly, consistently, and unambiguously names the entities it is discussing (using full, consistent names rather than vague pronouns or shifting shorthand, and explicitly stating relationships — "Full Loop CRM, a home-service business management platform, was founded by...") gives a retrieval system far more confidence in what a piece of content is actually about and who or what it should be associated with, which directly affects whether it gets pulled into an answer about that entity in the future.',
  },
  {
    type: 'p',
    text: 'Original data and first-hand experience. Because large language models are trained on enormous quantities of already-existing web text, content that merely restates common knowledge is, almost by definition, redundant with things the model already "knows" from training and therefore has less unique value to retrieve at inference time. Content built on original research, proprietary data, first-hand case studies, real numbers from a real business, and genuine direct experience is disproportionately valuable in an AEO context, precisely because it cannot be found duplicated anywhere else in the model\'s training data or in a competitor\'s retrieval index. This is the single highest-leverage form of content in the entire discipline, and it is also the hardest to fake, which is exactly why it is being rewarded.',
  },
  {
    type: 'p',
    text: 'Freshness and maintenance signals. AI answer engines, like their SEO predecessors, weight recency, particularly for topics where facts change over time — pricing, availability, best-practices in a fast-moving field, statistics. A visible last-updated date, and content that is genuinely revisited and corrected rather than published once and abandoned, functions as a trust signal at the ranking and synthesis stages, the same way it always has in classic SEO, just now evaluated by a model instead of a rules-based algorithm.',
  },
  {
    type: 'p',
    text: 'Presence across independent, corroborating platforms. Because synthesis systems weight multi-source corroboration heavily, a genuine off-site AEO strategy extends beyond your own domain: getting your business, your data, and your expertise genuinely and independently discussed on forums like Reddit, on review platforms, in third-party press coverage, in Wikipedia and Wikipedia-adjacent reference sources where appropriate and factually warranted, and on video platforms like YouTube (which is itself an enormous and growing source that generative answer engines draw from) all raise the odds that when a language model looks for corroboration of a claim about you, it finds it in multiple independent places rather than only on the one page you control and therefore have an obvious incentive to describe favorably.',
  },
  {
    type: 'p',
    text: 'Author expertise and transparent authorship. E-E-A-T did not disappear when generative answers arrived — if anything, it became more directly load-bearing, because a language model evaluating whether to trust and cite a claim is doing a version of the same credibility assessment a human quality rater was trained to do. Clear author bylines, stated credentials, a real and verifiable identity behind the content, and demonstrable first-hand experience with the subject matter all feed directly into whether a synthesis system treats a source as citation-worthy versus treating it as an anonymous, unverifiable claim to be weighted down or ignored.',
  },

  {
    type: 'note',
    side: 'left',
    label: 'Tip',
    text: 'Put the direct, complete answer in the first one to three sentences of every section — before nuance, before caveats. An AI system may only ever read that first sentence. Make it count on its own.',
  },

  { type: 'h3', text: 'The New Scoreboard: Share of Answer, Not Just Rank' },
  {
    type: 'p',
    text: 'Classic SEO measured success primarily through keyword rank position and organic click-through traffic. Those metrics have not become meaningless, but they have become incomplete, and businesses that measure only those two things are now flying partially blind. The emerging metric — variously called "share of answer," "share of voice in AI," or "AI visibility" across the small but fast-growing category of tools built specifically to measure it — asks a different question entirely: across a representative sample of real queries in your category, how often does your brand, your product, or your content get mentioned or cited inside the generated answer, regardless of whether that produces a click? This is a genuinely new form of marketing measurement, closer in spirit to old-media brand-awareness tracking than to a rank-tracking spreadsheet, and it exists because a huge and growing share of the value you get from being found now happens without a visit to your site at all — a mention inside an AI Overview, a citation inside a ChatGPT answer, a name-check inside a Perplexity summary, each of which shapes a purchase decision or a brand impression even when zero traffic is recorded in your analytics.',
  },
  {
    type: 'p',
    text: 'This is the single hardest adjustment for businesses and marketers trained on a decade and a half of "traffic is the proof of value" thinking: the click was never actually the goal. The click was always a proxy for a different goal — being the trusted source someone relied on to make a decision. For twenty-five years, the proxy and the real goal were close enough together that nobody needed to separate them. AEO is what happens once the proxy and the real goal come apart, and the discipline of AEO is, at its core, the discipline of optimizing directly for the real goal again, even when it no longer shows up cleanly in a web-traffic report.',
  },

  { type: 'h3', text: 'What This Means in Practice, Right Now' },
  {
    type: 'p',
    text: 'If you run a business or manage content for one, the practical transition from SEO to AEO does not require throwing away what you have already built. It requires auditing your existing content against a new question in addition to the old ones. The old question was: "Does this rank?" The new, additional question is: "If I were a language model trying to answer the question this page is about, would I be confident enough in this specific page — its clarity, its structure, its corroboration elsewhere, its evidence of real expertise — to quote it directly in front of a user, with my own credibility on the line?" Content that survives both questions is built for the world as it actually exists today. Content that only survives the first question is running on borrowed time, because the second question is the one an increasing share of your future audience is now asking on your behalf, automatically, every time they type into a chat box instead of a search box.',
  },
]
