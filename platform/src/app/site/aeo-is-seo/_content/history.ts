import type { Block } from './types'

export const historyBlocks: Block[] = [
  { type: 'h2', text: 'Part One: What SEO Was, and What It Became' },
  {
    type: 'p',
    text: 'Search Engine Optimization has never been one static discipline. It is easy to talk about "SEO" as though it were a fixed set of rules invented once and followed ever since, but that is not what happened. SEO has gone through at least six distinct eras over roughly twenty-five years, and in every era the underlying goal was the same even as the tactics changed completely: be the thing a search engine decides to show a person who is looking for something. What changed, era after era, is what "being shown" actually meant, and how much the search engine itself did on the user\'s behalf before handing off to a website. That second variable — how much work the intermediary does before the click — is the single thread that connects the earliest keyword-stuffed pages of 1998 to the AI-generated answers of today, and it is the thread that explains why AEO is not a rejection of SEO but its next chapter.',
  },
  {
    type: 'p',
    text: 'Understanding that arc matters more than memorizing any individual algorithm update, because the arc tells you where things are going next. Every era of search ended the same way: the previous era\'s winning tactic got mechanized, gamed, and then corrected for, and the correction pushed the discipline one step closer to genuinely answering the question rather than gaming the mechanism that surfaced the answer. AEO is simply the point on that curve we have reached in the mid-2020s. It will not be the last point.',
  },

  { type: 'h3', text: 'Era One (1994–2003): Keywords, Directories, and the Birth of Ranking' },
  {
    type: 'p',
    text: 'In the earliest years of the commercial web, search was a matching problem, not a ranking problem. Engines like AltaVista, Excite, Lycos, and Infoseek indexed the words on a page and returned documents that contained the words in your query, sorted crudely by how often those words appeared. This created the first and most primitive SEO tactic: keyword stuffing. If repeating a phrase twenty times made a page rank higher than repeating it five times, site owners repeated it fifty times, often in white text on a white background, invisible to a human visitor but fully readable by the crawler. Meta keyword tags, a field in a page\'s HTML head meant to describe its topic, were routinely stuffed with hundreds of unrelated terms in the hope of matching more queries.',
  },
  {
    type: 'p',
    text: 'Alongside pure text matching, the web also organized itself through human-curated directories. Yahoo! Directory and the Open Directory Project (DMOZ) employed actual editors who reviewed and categorized submitted sites by hand. Getting listed in these directories was a legitimate, high-value tactic because it produced both direct traffic and a credibility signal that early engines valued. This is worth remembering: the earliest form of what we would now call an "authority signal" was not algorithmic at all. It was a human editor deciding a site was worth including. AEO\'s current emphasis on being cited by trusted, independently curated sources is, in a real sense, a return to that first principle after two and a half decades of increasingly automated substitutes for it.',
  },
  {
    type: 'p',
    text: 'The era ended because pure keyword matching was trivially gameable and produced terrible results. A search for "best running shoes" could return a page that mentioned "running shoes" five hundred times and said nothing useful about any actual shoe. The web needed a way to measure something closer to genuine importance rather than just word frequency, and in 1998 two Stanford PhD students supplied one.',
  },

  { type: 'h3', text: 'Era Two (1998–2010): PageRank and the Link Economy' },
  {
    type: 'p',
    text: 'Larry Page and Sergey Brin\'s core insight, published as the PageRank algorithm and commercialized as Google, was that a link from one page to another functions like a citation in academic literature: it is a vote of confidence, and votes from already-important pages should count for more than votes from unimportant ones. This was a genuine breakthrough because it introduced a signal that was much harder to fake than keyword density — you could stuff your own page with text, but you could not unilaterally force other, independent website owners to link to you.',
  },
  {
    type: 'p',
    text: 'For roughly a decade, the link graph was the closest thing the web had to a trust layer, and an entire economy grew up around acquiring links. Some of that economy was legitimate: publishing genuinely useful research, tools, and journalism that other sites wanted to reference. A great deal of it was not. Link farms, reciprocal link exchanges ("link to me and I\'ll link to you"), paid link networks, blog comment spam, and guest-post mills all existed for one purpose — to manufacture the appearance of the citation signal PageRank was designed to measure honestly. Google spent the back half of this era in a running battle against exactly this kind of manipulation, culminating in the Panda update (2011), which targeted low-quality, thin, and duplicated content, and the Penguin update (2012), which specifically targeted manipulative link schemes and over-optimized anchor text.',
  },
  {
    type: 'p',
    text: 'The lesson from this era that carries forward directly into AEO is this: any authority signal, once it becomes known and valuable, will be gamed until the system that relies on it either evolves or degrades. Backlinks are still a meaningful signal today, but they are one signal among many precisely because Google spent a decade learning that a single, well-understood signal is a target, not a moat. Anyone telling you AEO is won with one trick — a single schema tag, a single file, a single format — is repeating the same mistake the SEO industry already made twice.',
  },

  {
    type: 'note',
    side: 'right',
    label: 'Insight',
    text: 'Every authority signal that has ever mattered — keywords, links, entities, citations — has followed the same arc: it works, it gets gamed, it gets corrected. AEO is not exempt from this. Nothing that works forever stays a secret for long.',
  },

  { type: 'h3', text: 'Era Three (2010–2015): Content Marketing, On-Page Semantics, and Panda/Penguin' },
  {
    type: 'p',
    text: 'As link manipulation got punished more severely, the industry pivoted toward content marketing: the theory that if you produce genuinely useful, comprehensive material, links and rankings will follow naturally because people actually want to reference it. This is the era that produced the "content is king" mantra, the rise of long-form "ultimate guides," and the early formalization of on-page SEO — title tags, header structure, keyword placement in the first hundred words, internal linking, image alt text — as a discipline in its own right, separate from link building.',
  },
  {
    type: 'p',
    text: 'This period also marks the point where search engines started to move from matching words to understanding concepts. Google\'s 2012 introduction of the Knowledge Graph was the first large-scale public signal that the company was building a structured model of entities — people, places, organizations, products — and the relationships between them, rather than treating a search purely as a string-matching exercise. A search for "Barack Obama" started returning a structured info panel with birthdate, spouse, and office held, pulled from a graph of known facts, not just a ranked list of ten blue links. This is the direct ancestor of every AI answer box you see today, and it is also the direct ancestor of the entity-based thinking that underlies modern AEO: search engines were already moving toward representing the world as facts about things, not just documents containing words, more than a decade before generative AI made that shift obvious to everyone.',
  },
  {
    type: 'p',
    text: 'Mobile-first behavior also began reshaping priorities in this window. As mobile search volume overtook desktop, page speed, responsive design, and Google\'s eventual move to mobile-first indexing (evaluating the mobile version of a page as the primary version, formalized through the mid-2010s) became core ranking factors rather than nice-to-haves.',
  },

  { type: 'h3', text: 'Era Four (2015–2019): Machine Learning Enters the Ranking Algorithm' },
  {
    type: 'p',
    text: 'In 2015, Google confirmed that RankBrain — a machine-learning system — had become one of the top three signals in its ranking algorithm. RankBrain\'s job was specifically to handle the roughly fifteen percent of daily queries Google had never seen before, by mapping unfamiliar phrasings to concepts it already understood. This was a quiet but enormous shift: for the first time, a meaningful part of how a query got matched to results was not a hand-written rule at all, but a model trained on patterns. Every era before this one had search engineers writing explicit logic ("if a page has X, boost it by Y"). From RankBrain onward, an increasing share of ranking behavior was learned rather than authored, which made classic reverse-engineering of "the algorithm" progressively less possible and pushed the industry toward optimizing for demonstrated quality and relevance rather than for guessed mechanics.',
  },
  {
    type: 'p',
    text: 'This is also the era that introduced E-A-T — Expertise, Authoritativeness, Trustworthiness — as an explicit evaluative framework in Google\'s publicly released Search Quality Rater Guidelines (2018), particularly for "Your Money or Your Life" topics like health, finance, and legal advice, where bad information carries real-world harm. E-A-T was not a ranking algorithm itself; it was a lens human quality raters used to score result quality, which in turn trained and validated the machine-learned ranking systems. It mattered because it made explicit, for the first time in a widely read public document, that Google cared about who was saying something and how qualified they were to say it — not just what was said or how many links pointed at it.',
  },
  {
    type: 'p',
    text: 'Voice search and the "position zero" featured snippet also became central battlegrounds in this era. As Siri, Alexa, and Google Assistant normalized spoken queries, and as more searches on the results page itself were answered directly by a highlighted snippet at the very top — pulled algorithmically from a page\'s content and displayed above the traditional ten blue links — the industry got its first real taste of what "winning without the click" looked like. Position zero could satisfy a user\'s query so completely that they never scrolled further, and voice assistants read out exactly one answer, not a ranked list. SEO professionals who had spent fifteen years optimizing to be clicked suddenly had to reckon with optimizing to be read aloud by a machine and never clicked on at all. This was AEO\'s true starting point, years before the term existed.',
  },

  { type: 'h3', text: 'Era Five (2019–2023): BERT, MUM, E-E-A-T, and the Slow Death of the Click' },
  {
    type: 'p',
    text: 'Google\'s 2019 rollout of BERT (Bidirectional Encoder Representations from Transformers) brought transformer-based language understanding into core search ranking for the first time, improving the engine\'s ability to parse the actual grammatical relationship between words in a query rather than treating it as a loose bag of keywords. Google called it, at the time, one of the biggest leaps forward in the history of search. Two years later, MUM (Multitask Unified Model) extended that further, adding multilingual and multimodal understanding — the ability to reason across text and images together, and across languages, for a single complex query. Both systems were transformer architectures: the same family of neural network design that, scaled up dramatically, became the engine behind ChatGPT a year after MUM\'s announcement. The infrastructure for generative AI search was being built inside Google\'s ranking systems years before the public-facing chat products existed.',
  },
  {
    type: 'p',
    text: 'In late 2022, Google added a second E to its quality framework, making it E-E-A-T: Experience, Expertise, Authoritativeness, Trustworthiness. The addition of "Experience" mattered specifically because it targeted a growing problem — content that was technically expert-sounding and well-cited but written by someone (or something) with no actual first-hand experience of the thing being described. A product review written by someone who never touched the product. A travel guide written by someone who never visited the place. This update landed just as AI-generated content tools were becoming widely available, and while Google has never framed E-E-A-T purely as an anti-AI-content measure, the timing was not a coincidence: as it became trivial to generate expert-sounding text about anything, evidence of genuine first-hand experience became one of the few remaining signals that was still expensive to fake.',
  },
  {
    type: 'p',
    text: 'The 2023 Helpful Content Update formalized this further, explicitly downranking content assessed as written primarily to rank in search rather than to genuinely help a reader — including, though Google was careful in its language, content mass-produced with AI assistance and no real editorial value added. Meanwhile, industry research throughout this period (SparkToro, SimilarWeb, and others published widely cited studies on the topic) documented a steady rise in "zero-click searches" — queries where the user got what they needed directly on the results page and never visited any website at all. By 2023, credible estimates put the zero-click share of all Google searches above fifty percent. The click, which had been the entire currency of the web since the mid-1990s, was already becoming a minority outcome before a single generative AI answer engine had shipped to the public at scale.',
  },

  {
    type: 'note',
    side: 'left',
    label: 'Data Point',
    text: 'By 2023 — before AI Overviews had even shipped broadly — more than half of all Google searches were already ending with no click to any website. The click was already a minority outcome before generative AI search existed.',
  },

  { type: 'h3', text: 'Era Six (2023–Present): Generative Answers Become the Default' },
  {
    type: 'p',
    text: 'ChatGPT\'s public release in late November 2022 did not immediately change search behavior — but it changed what was possible, and the search industry spent the next three years racing to catch up. Google previewed its Search Generative Experience (SGE) in 2023 and shipped it broadly as "AI Overviews" in 2024: an AI-written synthesis, generated live from multiple sources, placed directly at the top of the results page, above every traditional listing. Microsoft integrated a comparable experience into Bing through its Copilot partnership. Perplexity AI built an entire product around exactly this behavior — cited, synthesized answers instead of a link list — and grew quickly enough to draw direct competitive attention from Google itself. By 2025, ChatGPT had added live web search as a default capability, meaning the single most-used AI chat product in the world was also, functionally, a search engine that answered in prose and cited sources inline rather than returning a ranked list.',
  },
  {
    type: 'p',
    text: 'The practical effect on publishers and businesses has been significant and well documented across the industry through 2024 and 2025: multiple studies and firsthand publisher reports describe double-digit percentage declines in organic click-through rates specifically on queries where an AI Overview or equivalent generative answer appears above the fold, even when the publisher\'s own content is one of the sources the AI drew from and cites. This is the uncomfortable, central fact of the current era: your content can be the source of the answer, and you can still get zero traffic from it, because the person asking the question got what they needed without ever needing to click through to see where it came from.',
  },
  {
    type: 'p',
    text: 'That single fact is the entire reason AEO exists as a distinct discipline rather than just being "SEO, but for a slightly different results page." When the intermediary between a question and an answer stops being a list of links and starts being a synthesized paragraph of prose, the unit you are optimizing for is no longer "rank in position one" — it is "be one of the handful of sources an AI system chooses to read, trust, and quote when it writes that paragraph." That is a different target, it rewards different qualities in your content, and it is the subject of the rest of this guide.',
  },

  { type: 'h3', text: 'The Pattern of Succession, Named Plainly' },
  {
    type: 'p',
    text: 'Lay the six eras next to each other and a single, repeating pattern of succession emerges, and naming it plainly is more useful than memorizing any individual algorithm update. Step one, in every era: a new signal or format emerges that genuinely improves how well a question gets matched to a good answer — word matching, then link-based trust, then semantic and entity understanding, then generative synthesis. Step two: the SEO industry, entirely rationally, works out how to produce that signal artificially, faster and cheaper than the signal was originally meant to be earned. Step three: the search engine, faced with degrading result quality, corrects for the manipulation, usually by adding a new, harder-to-fake layer on top of the old one rather than discarding it outright. Step four: the frontier of the discipline moves to that new layer, and the cycle repeats one level up.',
  },
  {
    type: 'p',
    text: 'Notice what does not happen anywhere in that pattern: the old layer never actually disappears. Keyword relevance still matters — pages that never mention the topic they claim to cover still fail every era\'s test. Links still matter, just as one of many signals instead of the dominant one. Entity clarity and semantic structure still matter, and now sit underneath generative synthesis rather than being replaced by it. Each era is additive, not substitutive, which is precisely why the framing of "SEO versus AEO" in Part Two is a false choice: AEO is simply era six\'s new top layer, sitting on top of five previous layers that all still function and all still matter. Understanding this pattern is the actual value of studying SEO history — not nostalgia, but a reliable predictive model for what era seven will probably look like, covered directly in Part Four.',
  },
]
