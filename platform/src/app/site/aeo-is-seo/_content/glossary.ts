import type { GlossaryTerm } from './types'

export const glossaryIntro =
  'AI search brought a wave of new vocabulary into marketing overnight, much of it borrowed directly from machine learning research and applied, sometimes loosely, to search and content strategy. This glossary explains every term used across this guide — and the terms you will run into everywhere else discussing this topic — in plain language, specifically in relation to AI, search, and how the two now overlap. Terms are grouped loosely by theme rather than strict alphabetical order, so related concepts sit near each other.'

export const glossaryTerms: GlossaryTerm[] = [
  {
    term: 'SEO (Search Engine Optimization)',
    definition:
      'The practice of structuring a website and its content so that traditional search engines can crawl, index, and rank it highly for relevant queries. The foundational discipline everything else in this guide builds on top of — still necessary, no longer sufficient on its own.',
  },
  {
    term: 'AEO (Answer Engine Optimization)',
    definition:
      'The practice of structuring content so that AI systems — generative search features, chat assistants, and voice assistants — select it as a source when synthesizing an answer to a user\'s question, whether or not that produces a click.',
  },
  {
    term: 'GEO (Generative Engine Optimization)',
    definition:
      'A near-synonym for AEO that emerged from academic and industry research around 2023–2024, specifically emphasizing optimization for generative AI systems that write novel synthesized text rather than simply retrieving and displaying existing documents. In practice, most practitioners now use AEO and GEO interchangeably.',
  },
  {
    term: 'AXO (Agent Experience Optimization)',
    definition:
      'An emerging, not-yet-standardized term for the next layer of optimization beyond AEO: making a business discoverable and transactable by autonomous AI agents acting on a user\'s behalf, not just citable by an AI writing an explanatory answer. Covered in Part Three of this guide.',
  },
  {
    term: 'LLM (Large Language Model)',
    definition:
      'A type of AI model, trained on enormous quantities of text, that generates and understands natural language. ChatGPT, Claude, and Gemini are all products built around large language models. Every AI answer engine discussed in this guide is powered, at its core, by an LLM.',
  },
  {
    term: 'Generative AI',
    definition:
      'AI systems that create new content — text, images, audio, video — rather than simply retrieving or classifying existing content. AI Overviews and chatbot answers are generative because the exact sentences shown to a user are newly written by the model, not copied verbatim from any single source.',
  },
  {
    term: 'RAG (Retrieval-Augmented Generation)',
    definition:
      'The technical architecture behind almost every AI search feature: the system first retrieves a set of relevant documents (via search or a database lookup), then feeds those documents to a language model as context so it can generate an answer grounded in real, current information rather than relying purely on what it memorized during training. Understanding RAG is the single most useful technical concept for grasping how AEO actually works — you are optimizing to be one of the documents that gets retrieved and handed to the model.',
  },
  {
    term: 'Grounding',
    definition:
      'The practice of anchoring an AI-generated answer to specific, real source documents (via RAG) rather than letting the model answer purely from memorized training data. A "grounded" answer is one the model can point to actual retrieved sources for — which is exactly the mechanism that makes AEO possible in the first place.',
  },
  {
    term: 'Hallucination',
    definition:
      'When an AI model generates information that sounds plausible and confident but is factually wrong or entirely fabricated, typically because it is answering from imperfect memorized training data rather than grounded, retrieved sources. One reason well-structured, easily retrievable, unambiguous content matters: it gives the model less reason to fall back on unreliable memory.',
  },
  {
    term: 'Vector Embedding',
    definition:
      'A numerical representation of a piece of text (or an image, or audio) as a list of numbers (a vector) that captures its meaning, positioned in a high-dimensional space where semantically similar content ends up numerically close together. This is the underlying mathematical trick that lets a machine judge that "cost of a cleaning service" and "how much do maids charge" mean roughly the same thing, even though they share almost no words in common.',
  },
  {
    term: 'Vector Database',
    definition:
      'A database purpose-built to store embeddings and quickly find the ones most similar to a given query embedding. Retrieval systems behind AI search features commonly use a vector database as part of finding relevant content to hand to the language model.',
  },
  {
    term: 'Semantic Search',
    definition:
      'Search based on matching the underlying meaning and intent of a query rather than matching its literal words. The opposite of the keyword-matching search of the 1990s described in Part One, and the technical foundation that makes conversational, natural-language search queries work at all.',
  },
  {
    term: 'Entity',
    definition:
      'A specific, identifiable thing — a person, a company, a product, a place, a concept — that a search engine or AI system can recognize, disambiguate from similarly named things, and track facts about consistently. Google\'s Knowledge Graph and every modern AI system\'s internal world model are fundamentally organized around entities and the relationships between them, not just words.',
  },
  {
    term: 'Knowledge Graph',
    definition:
      'A structured database of entities and the relationships between them (this person works at this company; this product is made by this company; this company is located in this city), which search engines use to answer factual questions directly and to disambiguate identically named things. Google introduced its public-facing Knowledge Graph in 2012, and it is the direct ancestor of the entity-based knowledge modern AI systems maintain internally.',
  },
  {
    term: 'Named Entity Recognition (NER)',
    definition:
      'The specific machine learning task of scanning text and identifying which words or phrases refer to real-world entities — recognizing that "Anthropic" is a company and "Claude" is its product, for instance. AI systems use NER-related techniques to understand exactly what a piece of content is actually about.',
  },
  {
    term: 'Structured Data / Schema Markup',
    definition:
      'Code added to a webpage, following a shared vocabulary (most commonly Schema.org), that explicitly and unambiguously labels what different pieces of content mean — this is a price, this is a review rating, this is an FAQ answer — in a format machines can parse directly without having to infer meaning from prose.',
  },
  {
    term: 'JSON-LD',
    definition:
      'The specific, currently preferred technical format for implementing Schema.org structured data — a block of JSON placed in a page\'s HTML that describes the page\'s content in machine-readable form, separate from the human-readable content itself.',
  },
  {
    term: 'FAQPage Schema',
    definition:
      'A specific Schema.org structured data type used to mark up a list of questions and their answers in a machine-readable format, making it straightforward for both classic featured snippets and modern AI answer engines to extract a clean, directly quotable answer to a specific question.',
  },
  {
    term: 'llms.txt',
    definition:
      'A proposed and increasingly adopted plain-text file, placed at a website\'s root domain (alongside the long-standing robots.txt), that gives AI systems a curated summary of a site\'s most important pages and content, specifically formatted for language-model consumption rather than for traditional search crawling.',
  },
  {
    term: 'robots.txt',
    definition:
      'A long-established plain-text file at a website\'s root that tells web crawlers — both traditional search crawlers and, increasingly, AI training and retrieval crawlers — which parts of a site they are and are not permitted to access. Misconfiguring this file can silently make an entire site invisible to both classic search and AI answer engines alike.',
  },
  {
    term: 'Crawler / Bot',
    definition:
      'Automated software that systematically visits web pages to read and catalog their content. Google\'s crawler is called Googlebot; OpenAI, Anthropic, and other AI companies operate their own separate crawlers (GPTBot, ClaudeBot, and others) both for training data collection and, increasingly, for live retrieval at answer time.',
  },
  {
    term: 'Indexing',
    definition:
      'The process by which a search engine or AI retrieval system stores and organizes crawled content so it can be quickly searched and retrieved later. A page can be perfectly written and still be completely invisible to both SEO and AEO if it was never successfully crawled and indexed in the first place.',
  },
  {
    term: 'Crawl Budget',
    definition:
      'The finite amount of time and resources a search engine or AI crawler allocates to crawling any given site. Large or technically inefficient sites can have pages go uncrawled (and therefore unindexed) simply because the crawler ran out of allocated budget before reaching them.',
  },
  {
    term: 'SERP (Search Engine Results Page)',
    definition:
      'The traditional page of ranked links returned for a search query. Still exists and still matters, but is increasingly accompanied — and in many cases visually dominated — by an AI-generated answer positioned above it.',
  },
  {
    term: 'Featured Snippet / Position Zero',
    definition:
      'A highlighted excerpt of content, algorithmically pulled from a webpage, displayed at the very top of a traditional search results page above the numbered listings. The direct, pre-generative-AI precursor to today\'s AI Overviews, and the first widely recognized example of a search engine answering a query directly rather than just linking to where the answer could be found.',
  },
  {
    term: 'Zero-Click Search',
    definition:
      'A search query where the user gets the information they needed directly on the results page or in a generated answer and never clicks through to any website. Industry research has shown zero-click behavior rising steadily for years and accelerating sharply with the arrival of generative AI answers — the central economic challenge AEO exists to address.',
  },
  {
    term: 'AI Overview (Google)',
    definition:
      'Google\'s AI-generated answer summary, synthesized from multiple web sources and displayed at the very top of the search results page, above traditional listings. Rolled out broadly in 2024 following an earlier preview called Search Generative Experience (SGE).',
  },
  {
    term: 'SGE (Search Generative Experience)',
    definition:
      'The original 2023 name for Google\'s experimental generative AI search feature, which was later rebranded and expanded into AI Overviews as it moved from limited preview to broad general availability.',
  },
  {
    term: 'Perplexity',
    definition:
      'An AI-native answer engine, built from the ground up around cited, synthesized answers to questions rather than a traditional ranked list of links, widely credited with popularizing the "answer engine" product category and putting direct competitive pressure on Google to accelerate its own generative search features.',
  },
  {
    term: 'ChatGPT Search',
    definition:
      'OpenAI\'s live web-search capability built into ChatGPT, which lets the assistant retrieve current information from the web and cite sources inline within its conversational answers — effectively making the world\'s most-used AI chat product also function as a search engine.',
  },
  {
    term: 'Copilot',
    definition:
      'Microsoft\'s AI assistant brand, integrated into Bing search, Windows, and the Microsoft 365 productivity suite, providing generative, cited answers within Bing search results in direct competition with Google\'s AI Overviews.',
  },
  {
    term: 'Claude',
    definition:
      'Anthropic\'s family of large language models and the assistant product built on them, capable of live web search and citation when answering questions, and the origin of the Model Context Protocol standard referenced in Part Three of this guide.',
  },
  {
    term: 'Gemini',
    definition:
      'Google\'s family of large language models, which power both the standalone Gemini assistant app and, increasingly, AI Overviews and other generative features inside Google Search itself.',
  },
  {
    term: 'Voice Search',
    definition:
      'Queries spoken aloud to an assistant such as Siri, Alexa, or Google Assistant, which by nature return exactly one spoken answer rather than a scrollable list — an early, pre-chatbot form of the single-answer paradigm that now defines AI search more broadly, and one reason conversational, question-shaped content has mattered for longer than most marketers realize.',
  },
  {
    term: 'Conversational Search',
    definition:
      'Search conducted through natural, multi-turn dialogue — asking a follow-up question that references the previous answer, the way you would talk to a knowledgeable person — rather than through isolated, disconnected keyword queries. The dominant emerging interaction pattern across AI chat and voice assistants.',
  },
  {
    term: 'Query Fan-Out',
    definition:
      'A retrieval technique where an AI system takes a single user question and automatically generates several related sub-queries to search for, then combines the results, in order to build a more complete and accurate answer than a single literal search could produce. Explains why content matching the precise, narrow phrasing of a question can be selected even when a user\'s original query was phrased quite differently.',
  },
  {
    term: 'Reranking',
    definition:
      'A secondary evaluation step in a retrieval pipeline where an initial, broader set of candidate documents gets re-scored and reordered by relevance and quality before being handed to the language model to write an answer from — the "rank" stage described in Part Two\'s four-stage breakdown of how AI search works.',
  },
  {
    term: 'Chunking',
    definition:
      'The process of breaking a long document into smaller, self-contained pieces before it is indexed for retrieval, because a language model typically retrieves and evaluates individual chunks of a page rather than the entire page at once. This is precisely why answer-first, self-contained paragraph structure matters so much for AEO — a chunk needs to make complete sense on its own, out of context.',
  },
  {
    term: 'Context Window',
    definition:
      'The maximum amount of text an AI model can consider at one time when generating a response, measured in tokens. A larger context window lets a model read more retrieved source material — or a longer conversation history — before producing an answer.',
  },
  {
    term: 'Token',
    definition:
      'The basic unit of text a language model processes — roughly, though not exactly, a word or part of a word. Model context windows, pricing, and processing limits are all measured in tokens rather than in words or characters.',
  },
  {
    term: 'Prompt',
    definition:
      'The instruction or question given to an AI model, whether typed by an end user asking a question or written by a developer configuring how a system should behave. The user\'s literal query is the prompt that ultimately triggers retrieval and, if your content is selected, determines whether and how it gets used.',
  },
  {
    term: 'Prompt Engineering',
    definition:
      'The practice of carefully crafting prompts to get more reliable, higher-quality output from an AI model. Adjacent to AEO in spirit — where prompt engineering optimizes the question, AEO optimizes the source material available to answer it.',
  },
  {
    term: 'Training Data',
    definition:
      'The vast body of text (and, for some models, images, audio, and code) a language model learns from before it is deployed. Distinct from the live retrieval sources discussed throughout this guide — training data shapes a model\'s general knowledge and reasoning ability, while retrieval (RAG) supplies current, specific facts at the moment of answering.',
  },
  {
    term: 'Fine-Tuning',
    definition:
      'A further training process applied to an already-trained model to specialize its behavior for a particular task or domain, distinct from the general pretraining process and from live retrieval at answer time.',
  },
  {
    term: 'Multimodal',
    definition:
      'AI systems capable of understanding and generating across more than one type of content — text, images, audio, video — within a single model. Increasingly relevant to search as AI answer engines begin incorporating and citing image and video sources alongside text.',
  },
  {
    term: 'Agentic AI / Autonomous Agent',
    definition:
      'AI systems that do not just answer questions but take multi-step actions in the world on a user\'s behalf — navigating websites, comparing options, and completing transactions with limited human intervention. The central subject of Part Three of this guide, and the widely anticipated next major phase of this entire evolution.',
  },
  {
    term: 'MCP (Model Context Protocol)',
    definition:
      'An open standard, introduced by Anthropic in late 2024 and rapidly adopted across the AI industry through 2025, that defines a common way for AI models and agents to connect to external tools, data sources, and systems in order to take real action rather than just generate text. A foundational piece of infrastructure for the agentic commerce future described in Part Three.',
  },
  {
    term: 'API (Application Programming Interface)',
    definition:
      'A defined, structured way for one piece of software to request data or actions from another, without a human or a browser in the middle. Increasingly important for AEO and especially for the coming agentic layer, because autonomous agents generally prefer to interact with a clean API over parsing a human-designed webpage.',
  },
  {
    term: 'Structured Feed',
    definition:
      'A regularly updated, machine-readable file or endpoint (commonly in formats like XML, JSON, or CSV) listing structured facts about a business\'s inventory, pricing, or availability, built specifically for machine consumption rather than for a human visitor to browse.',
  },
  {
    term: 'E-E-A-T (Experience, Expertise, Authoritativeness, Trustworthiness)',
    definition:
      'Google\'s public framework, used by human quality raters and reflected in ranking systems, for evaluating whether content demonstrates genuine first-hand experience and credible expertise rather than generic or unverifiable claims. Directly relevant to AEO because AI synthesis systems perform a comparable credibility assessment before deciding whether to trust and cite a source.',
  },
  {
    term: 'Backlink',
    definition:
      'A hyperlink from one website pointing to another, historically the core trust and authority signal in classic SEO (see Part One). Still a meaningful signal today, though now one of many rather than the dominant one.',
  },
  {
    term: 'Domain Authority',
    definition:
      'A third-party-calculated (not an official Google or AI-provider) score estimating how likely a website is to rank well, based largely on its backlink profile. Widely used across the SEO industry as a rough, imperfect proxy for a site\'s overall trustworthiness and established presence.',
  },
  {
    term: 'Topical Authority',
    definition:
      'The degree to which a website is recognized, across its full body of content, as a comprehensive and credible source on a specific subject area, rather than having just one or two good pages about it. Increasingly relevant to AEO, since AI systems weight the broader context of a source\'s established expertise, not just the single page being retrieved.',
  },
  {
    term: 'Content Depth',
    definition:
      'How thoroughly a piece of content covers its subject, including context, nuance, and edge cases, rather than skimming the surface. Distinct from length for its own sake — depth means genuinely useful additional substance, which both AEO and classic SEO reward.',
  },
  {
    term: 'Content Velocity',
    definition:
      'The rate at which a site publishes new content over time. A meaningful signal in classic SEO (consistent publishing signals an active, maintained site) that carries over into AEO, though quality and originality matter considerably more than raw volume in both disciplines.',
  },
  {
    term: 'Thin Content',
    definition:
      'Content that is too brief, generic, or low-value to genuinely satisfy a searcher\'s intent — historically penalized by algorithm updates like Panda, and now similarly disfavored by AI retrieval systems, which have little reason to select a shallow source over a more complete one.',
  },
  {
    term: 'Helpful Content Update',
    definition:
      'A major 2023 Google algorithm update that explicitly downranked content assessed as written primarily to game search rankings rather than to genuinely help a reader, including a significant portion of mass-produced, low-effort AI-generated content — discussed in Part One.',
  },
  {
    term: 'PageRank',
    definition:
      'Google\'s original, foundational algorithm, published in 1998, which ranked pages based on the quantity and quality of other pages linking to them, treating each link as a vote of confidence. Covered in depth in Part One.',
  },
  {
    term: 'BERT',
    definition:
      'A transformer-based language model Google incorporated into search ranking in 2019 to better understand the grammatical relationships between words in a query. A direct technical ancestor of the generative AI models powering today\'s answer engines.',
  },
  {
    term: 'MUM (Multitask Unified Model)',
    definition:
      'A more advanced multilingual, multimodal transformer model Google introduced in 2021, extending BERT\'s language understanding across languages and across text and images together.',
  },
  {
    term: 'RankBrain',
    definition:
      'Google\'s first large-scale machine-learning ranking system, confirmed in 2015 as one of the top three ranking signals, specifically designed to interpret queries the system had never encountered before.',
  },
  {
    term: 'Panda Update',
    definition:
      'A major 2011 Google algorithm update targeting thin, low-quality, and duplicated content, discussed in Part One as one of the first large-scale corrections against gaming the content side of search.',
  },
  {
    term: 'Penguin Update',
    definition:
      'A major 2012 Google algorithm update targeting manipulative link-building schemes and over-optimized anchor text, discussed in Part One as the corresponding correction against gaming the link side of search.',
  },
  {
    term: 'Click-Through Rate (CTR)',
    definition:
      'The percentage of people who see a listing (in search results, an ad, or an AI-generated citation) and actually click through to the underlying source. A core classic-SEO metric that is becoming a less complete measure of value as more genuine value gets delivered through zero-click AI answers.',
  },
  {
    term: 'Share of Voice / Share of Answer',
    definition:
      'An emerging AEO measurement concept: across a representative set of real queries in your category, how often does your brand or content get mentioned or cited inside AI-generated answers, regardless of whether that produces a click. Discussed at length in Part Two as the metric increasingly replacing rank position as the primary scoreboard.',
  },
  {
    term: 'Brand Mention',
    definition:
      'Any reference to a business or product by name, whether or not it includes a link. AI synthesis systems can and do incorporate unlinked brand mentions from across the web into their internal understanding of a business\'s reputation and relevance, which is part of why off-site presence matters even without a direct backlink.',
  },
  {
    term: 'Corroboration / Consensus Signal',
    definition:
      'The degree to which the same fact or claim appears independently across multiple separate, credible sources rather than existing on only one page. AI systems weight corroborated claims far more heavily than single-source claims, which is why a genuine multi-platform AEO strategy matters more than perfecting any single page.',
  },
  {
    term: 'Search Intent',
    definition:
      'The underlying goal behind a search query — commonly categorized as informational (seeking to learn something), navigational (trying to reach a specific known site), transactional (ready to buy or take an action), or commercial investigation (comparing options before a purchase). Both SEO and AEO content should be built around a clear, correctly identified intent rather than a keyword in isolation.',
  },
  {
    term: 'Long-Tail Keyword',
    definition:
      'A longer, more specific search phrase with lower individual search volume but typically higher and more specific intent than a short, broad keyword. Conversational AI queries are, almost by definition, long-tail — full natural-language questions rather than clipped keyword fragments — which is part of why question-and-answer content structure matters so much for AEO.',
  },
  {
    term: 'Canonical URL',
    definition:
      'A tag specifying the single, preferred version of a page when duplicate or near-duplicate versions exist at different URLs, preventing search engines and retrieval systems from splitting authority or getting confused across multiple copies of the same content.',
  },
  {
    term: 'Core Web Vitals',
    definition:
      'A set of Google-defined metrics measuring real-world page performance and user experience — loading speed, interactivity, and visual stability. A technical SEO fundamental that remains relevant to AEO because a slow or broken page can fail to be reliably crawled and rendered in the first place.',
  },
  {
    term: 'Sitemap',
    definition:
      'An XML file listing a site\'s pages, submitted to search engines and crawlers to help them discover and prioritize content efficiently, especially useful for large sites where following internal links alone might miss pages.',
  },
]
