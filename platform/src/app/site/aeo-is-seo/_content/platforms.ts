import type { Block } from './types'

export const platformsBlocks: Block[] = [
  { type: 'h2', text: 'Part Three: Under the Hood — How Different AI Platforms Actually Source Their Answers' },
  {
    type: 'p',
    text: 'Everything in Part Two describes the retrieve-rank-synthesize pattern that every AI answer engine shares in broad strokes. What it does not tell you is that "retrieve" means something meaningfully different at each company, because each major AI platform is drawing on a different mix of its own crawled index, licensed or partnered third-party search data, and structured local-business data providers. This matters for AEO in a very practical way: being well optimized for one platform\'s retrieval layer does not automatically make you well optimized for another\'s, because the underlying pool of candidate sources each one is drawing from is not identical.',
  },
  {
    type: 'p',
    text: 'A genuine caveat belongs at the top of this section, in the spirit of not overstating certainty about a fast-moving industry: these backend sourcing relationships are not always fully disclosed by the companies involved, they change without public announcement, and any specific technical claim here reflects what has been publicly reported and is generally understood as of this guide\'s writing — not a confirmed, unchanging architecture diagram from any of these companies. Treat the specific pairings below as the current, best-available picture, and treat the broader pattern underneath them — which is far more stable than any single partnership — as the more durable takeaway.',
  },

  { type: 'h3', text: 'Google: AI Overviews Run on Google\'s Own Index' },
  {
    type: 'p',
    text: 'Google AI Overviews draw on Google\'s own web index — the same enormous, proprietary crawl-and-index infrastructure that has powered classic Google Search for over two decades — rather than on any third-party or partnered data source. This is Google\'s single biggest structural advantage in the AI-search transition: it does not need to license or partner for retrieval data the way most of its competitors do, because it already owns the largest and most comprehensive index of the web. For AEO purposes, this means the same classic technical-SEO fundamentals that have always governed whether Google can crawl and index you — covered throughout Part Two — remain the direct gateway to AI Overview visibility as well. There is no separate "Google AI crawler" you need to satisfy in addition to the standard one; get indexed well by Google, and you are in the same candidate pool AI Overviews draws its citations from.',
  },

  { type: 'h3', text: 'Microsoft: Bing and Copilot Share the Same Backbone' },
  {
    type: 'p',
    text: 'Microsoft\'s Copilot experience inside Bing search draws directly on the Bing index, Microsoft\'s own long-standing, independently maintained web index — the second-largest general web index after Google\'s. Because Microsoft has also licensed elements of the Bing index and API to a range of third-party products over the years, being well indexed by Bing has historically had a multiplier effect beyond Bing\'s own market share. Bing Webmaster Tools, referenced in this guide\'s resource list, is the direct, first-party way to monitor and influence how well your content is being crawled and understood by this specific index.',
  },

  {
    type: 'note',
    side: 'right',
    label: 'Explainer',
    text: 'Google doesn\'t need a data-sourcing partner for AI Overviews — it already owns the largest web index on Earth. That single fact is its biggest structural advantage in this entire transition.',
  },

  { type: 'h3', text: 'OpenAI: A Reported Shift From Bing Dependency Toward Its Own Infrastructure' },
  {
    type: 'p',
    text: 'When ChatGPT Search launched, it was widely reported to lean on Bing\'s search index and API as its underlying retrieval source, a sensible early choice given how mature and complete Bing\'s existing infrastructure already was. Through 2025, OpenAI has been reported to be investing in its own web-crawling and indexing capability — the GPTBot crawler referenced in this guide\'s glossary is part of that broader infrastructure build-out — reducing reliance on any single third-party provider over time. The practical, durable takeaway for AEO purposes is not the exact current mix, which is genuinely difficult to verify precisely from outside the company and likely continues to shift, but the direction of travel: OpenAI, like every major AI platform, is moving toward owning more of its own retrieval infrastructure rather than remaining permanently dependent on a competitor\'s index. Making sure your content is well indexed by both Google and Bing today, and remains crawlable by OpenAI\'s own bots directly, is the safest hedge against not knowing the exact current blend.',
  },

  { type: 'h3', text: 'Anthropic: Claude\'s Web Search Layer' },
  {
    type: 'p',
    text: 'Claude\'s web search capability, introduced through 2025, was reported at launch to draw on a licensed third-party search provider rather than an internally built web index — a sensible choice for a company whose core focus has been model capability and safety research rather than building and maintaining an independent web crawl at Google or Bing\'s scale. As with OpenAI above, the specific licensing relationship is the kind of commercial detail that can change with little public notice, and this guide treats it as a snapshot rather than a permanent fact. What is more durable is the general pattern it illustrates: not every AI lab needs or wants to build its own web index from scratch, and several of the smaller and mid-sized players in this space are more likely to continue licensing established search infrastructure than to build a competing one, which means being well indexed by the two or three largest underlying web indexes has outsized, compounding value across multiple downstream AI products at once.',
  },

  { type: 'h3', text: 'Perplexity: Its Own Crawler, Blended With Broader Retrieval' },
  {
    type: 'p',
    text: 'Perplexity operates its own dedicated web crawler (PerplexityBot, referenced in this guide\'s robots.txt discussion) and has built retrieval infrastructure specifically designed around its core answer-engine product, rather than starting from a general-purpose search product the way Google and Bing did. Because Perplexity was built AEO-first — cited synthesis was never a feature bolted onto an existing ten-blue-links product, it was the entire premise from day one — it is generally regarded across the SEO and AEO industry publications referenced in this guide\'s resource list as one of the more transparent and directly optimizable platforms: clean crawlability, clear structured content, and genuine citation-worthy authority tend to translate fairly directly into Perplexity visibility, without as many of the legacy layers that classic search engines carry.',
  },

  { type: 'h3', text: 'Local and Commercial Data: Where Yelp, Google Business Profile, and Others Fit In' },
  {
    type: 'p',
    text: 'This is the part of the picture most AEO discussion outside this guide skips entirely, and it matters enormously for any local, service-area business. For queries with clear local or commercial intent — "best cleaning service near me," "is this exterminator licensed," "how many reviews does this business have" — general-purpose web crawling and indexing is often not the primary data source at all. Structured, verified local-business data providers are: Google Business Profile (covered in this guide\'s glossary) feeds Google\'s own local results and Knowledge Panels directly; Yelp maintains one of the most comprehensive independently verified local-business and review datasets in the United States, and its data has historically been licensed to and referenced by multiple other platforms beyond its own app and website, making a complete, accurate, actively managed Yelp profile a genuine AEO asset even for a business that does not think of Yelp as its primary marketing channel; Apple\'s Business Connect similarly feeds Apple Maps and Siri\'s local answers directly. As AI assistants increasingly handle local, transactional queries — the kind Part Four\'s discussion of agentic commerce describes accelerating over the next five years — the businesses whose structured data is accurate, complete, and consistent across all of these local-data providers, not just on their own website, are positioned to be found regardless of which specific AI system or local-data partnership a given assistant happens to be drawing from at the time.',
  },

  {
    type: 'note',
    side: 'left',
    label: 'Tip',
    text: 'Your Yelp profile and your Google Business Profile now matter almost as much as your own website for local, transactional AI answers. Keep them accurate and complete, not just your homepage.',
  },

  { type: 'h3', text: 'Reality Right Now, Versus Where This Is Actually Going' },
  {
    type: 'p',
    text: 'It is worth separating, plainly, what is genuinely true today from what is a reasonable projection forward, because a lot of AEO commentary blurs the two together in ways that either understate how much has already changed or overstate how settled the future already is.',
  },
  {
    type: 'p',
    text: 'The reality right now: search has fragmented, not consolidated. A person researching a purchase today might get an initial answer from Google\'s AI Overview, cross-check it against a direct ChatGPT conversation, glance at a Perplexity summary a friend shared, and still end up reading actual human reviews on Reddit or Yelp before making a final decision — often within the same single research session. No one platform has become the sole gatekeeper the way Google alone effectively was for most of the 2010s. Most businesses, even sophisticated ones, still have no deliberate AEO strategy at all and are winning or losing AI-answer visibility purely as an accidental byproduct of decisions made for classic SEO reasons years ago. Measurement is genuinely immature — most businesses today cannot tell you with any confidence how often they are being mentioned or recommended inside AI-generated answers, because the tooling to reliably answer that question is still being built. And despite everything covered in this guide, direct and branded search, referrals, and repeat business still make up the majority of real revenue for most local and service-area businesses — the AI-answer layer is currently additive and influential rather than dominant for the large majority of transactional local categories, even as it dominates certain broad informational categories already.',
  },
  {
    type: 'p',
    text: 'Where this is actually going, based on everything traced through this guide: fragmentation across multiple AI platforms will likely persist rather than resolve into a single winner, which argues strongly for the platform-agnostic, cover-every-major-source strategy described earlier in this section rather than betting on any one system. Measurement will mature quickly, following the exact same path web analytics and rank-tracking each took after their own respective new-channel period of confusion, and the businesses that start tracking their own AI-answer visibility early, even with today\'s imperfect manual methods, will have a multi-year head start once better tooling arrives and competitors start paying attention. The line between "answer" and "transaction" will keep blurring, following the agentic trajectory described earlier in Part Four, which means the businesses treating this purely as a content and citation exercise today will need to extend that same thinking to structured, transactable data sooner rather than later. And the fundamental, unglamorous drivers of long-term organic lead generation — genuine trust, genuine expertise, genuine direct customer relationships — will keep mattering exactly as much as they always have, because nothing in this entire five-part history has ever actually displaced them, only changed which technical layer they need to be expressed through.',
  },

  { type: 'h3', text: 'The Pattern Underneath the Specifics' },
  {
    type: 'p',
    text: 'Strip away the individual company names and a clear, durable pattern emerges, and it is more useful than any single fact above: every major AI platform is drawing from some blend of three source types — a general-purpose web index (either its own or a licensed one), its own or a partnered crawler for live, current information, and structured commercial or local-data feeds for anything with a transactional or geographic component. No platform draws from only one of these three, and the specific blend each company uses today is actively shifting toward owning more of it directly rather than depending on a competitor. The practical implication for any business is that no single-platform optimization strategy is sufficient. Being well indexed on Google and Bing, actively crawlable by the major AI bots, and completely and accurately represented across the major structured local-data providers is not redundant effort — it is coverage across the actual, current diversity of how these systems really source what they tell people, and it is the closest thing to a platform-agnostic AEO strategy that exists today.',
  },
]
