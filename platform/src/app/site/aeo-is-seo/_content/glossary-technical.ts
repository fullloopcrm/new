import type { GlossaryTerm } from './types'

export const glossaryTechnicalIntro =
  'The terms above cover search and AEO strategy directly. The terms below go one layer deeper, into the underlying AI and machine learning concepts that make all of it possible — useful for anyone who wants to understand not just what to do, but why it works the way it does.'

export const glossaryTechnicalTerms: GlossaryTerm[] = [
  {
    term: 'Machine Learning',
    definition:
      'A branch of computer science where systems improve at a task by learning patterns from data, rather than following explicit, hand-written rules. Every ranking system and every AI model discussed in this guide is a form of machine learning.',
  },
  {
    term: 'Deep Learning',
    definition:
      'A subset of machine learning using multi-layered neural networks, capable of learning much more complex patterns than earlier, simpler machine learning techniques. The technique underlying every modern large language model.',
  },
  {
    term: 'Neural Network',
    definition:
      'A machine learning architecture loosely modeled on the structure of the brain, made of layers of interconnected nodes that transform input data into output predictions. The basic computational building block of every LLM discussed in this guide.',
  },
  {
    term: 'Transformer',
    definition:
      'The neural network architecture, introduced in a landmark 2017 research paper, that underlies virtually every modern large language model, including GPT, Claude, and Gemini. Its key innovation, the attention mechanism, allowed models to weigh the relevance of every word in a passage against every other word simultaneously, which is what made today\'s scale of language understanding possible.',
  },
  {
    term: 'Attention Mechanism',
    definition:
      'The specific technical innovation inside a transformer model that allows it to weigh how relevant every other word in a passage is to understanding any given word, rather than processing text strictly left to right. This is what lets a model correctly connect a pronoun to the right noun several sentences earlier, or connect a question to the right answer buried deep in a retrieved document.',
  },
  {
    term: 'Foundation Model',
    definition:
      'A large, general-purpose AI model, trained on broad data, that serves as the base for many different downstream applications, often through fine-tuning or prompting rather than training from scratch. GPT, Claude, and Gemini are all foundation models.',
  },
  {
    term: 'Frontier Model',
    definition:
      'Industry shorthand for the most advanced, highest-capability AI models available at any given time — the models pushing the current edge of what is technically possible, as opposed to smaller or older models still in wide use.',
  },
  {
    term: 'Open-Weight Model',
    definition:
      'An AI model whose trained parameters are published publicly, allowing anyone to download, run, and modify it, as opposed to a closed model only accessible through a paid API. Meta\'s Llama and Mistral\'s models are prominent examples relevant to the broader AI-search ecosystem.',
  },
  {
    term: 'Inference',
    definition:
      'The process of actually running a trained AI model to produce an output — generating an answer, for instance — as distinct from training, which is the earlier process of teaching the model in the first place. Every time an AI answer engine responds to a query, that is inference happening in real time.',
  },
  {
    term: 'Parameters / Model Weights',
    definition:
      'The internal numerical values a neural network learns during training, which collectively determine how it processes input and produces output. Model size is often described in terms of parameter count (billions or trillions), though raw parameter count alone is an incomplete measure of real-world capability.',
  },
  {
    term: 'Supervised Learning',
    definition:
      'A machine learning approach where a model is trained on labeled examples (an input paired with the correct output) so it can learn to predict the output for new, unseen inputs.',
  },
  {
    term: 'Reinforcement Learning',
    definition:
      'A machine learning approach where a model learns through trial and feedback, receiving a reward signal for good outcomes and adjusting its behavior to maximize that reward over time.',
  },
  {
    term: 'RLHF (Reinforcement Learning from Human Feedback)',
    definition:
      'A training technique where human evaluators rate a model\'s outputs, and that feedback is used to further train the model to produce responses people find more helpful, accurate, and well-aligned with their intent. A core part of how models like ChatGPT and Claude were refined from raw base models into genuinely useful assistants.',
  },
  {
    term: 'Zero-Shot / Few-Shot Learning',
    definition:
      'The ability of a language model to perform a task it was never explicitly trained on, either with no examples given (zero-shot) or with just a small handful of examples provided directly in the prompt (few-shot). This flexibility is part of why modern AI systems can handle such an enormous range of unanticipated user questions.',
  },
  {
    term: 'Chain of Thought',
    definition:
      'A technique, and an increasingly built-in model behavior, where an AI system works through a problem in explicit, visible intermediate reasoning steps before producing a final answer, generally improving accuracy on complex questions compared to jumping straight to a conclusion.',
  },
  {
    term: 'System Prompt',
    definition:
      'A set of instructions given to an AI model, invisible to the end user, that shapes its overall behavior, tone, and constraints for a given product or conversation — distinct from the user\'s own visible prompt or question.',
  },
  {
    term: 'Natural Language Processing (NLP)',
    definition:
      'The broad field of AI concerned with enabling computers to understand, interpret, and generate human language. Search engines and AI answer systems are, at their core, applied NLP systems.',
  },
  {
    term: 'Natural Language Understanding (NLU)',
    definition:
      'The specific subset of NLP focused on interpreting the meaning and intent behind human language input, as opposed to generating language as output.',
  },
  {
    term: 'Natural Language Generation (NLG)',
    definition:
      'The subset of NLP focused on producing coherent, human-readable language as output — the specific capability that lets AI Overviews and chat assistants write a synthesized paragraph rather than just returning a list of links.',
  },
  {
    term: 'Sentiment Analysis',
    definition:
      'An NLP technique for algorithmically determining whether a piece of text expresses a positive, negative, or neutral opinion. Relevant to AEO because AI systems can incorporate sentiment found in reviews and third-party mentions into how favorably they characterize a business in a generated answer.',
  },
  {
    term: 'Query Rewriting',
    definition:
      'The process, performed automatically by a retrieval system, of reformulating a user\'s original query into a clearer or more effective search query before retrieval — for instance, expanding "cost to fix a leaky faucet" into more specific related searches. Closely related to query fan-out, described in the strategy glossary above.',
  },
  {
    term: 'Intent Classification',
    definition:
      'The automated process of categorizing a query by the type of goal behind it — informational, transactional, navigational — so a search or AI system can decide how to best respond, described in the strategy glossary above under search intent.',
  },
  {
    term: 'Rendering (Server-Side vs. Client-Side)',
    definition:
      'How a webpage\'s final content gets assembled: server-side rendering builds the complete page on the server before sending it to the browser (or crawler), while client-side rendering sends a mostly empty page and assembles the real content in the visitor\'s browser using JavaScript. Content that relies heavily on client-side rendering can be missed or delayed by crawlers that do not fully execute JavaScript, making it a genuine, common cause of invisible-to-AI content.',
  },
  {
    term: 'Headless CMS',
    definition:
      'A content management system that stores and delivers content through an API, separate from how that content is visually presented — often used specifically because it makes it easier to expose the same content cleanly to both a human-facing website and a machine-facing feed or API, which is increasingly valuable for AEO.',
  },
  {
    term: 'Meta Description',
    definition:
      'An HTML tag providing a short summary of a page\'s content, historically used by search engines to generate the snippet text shown under a search result, and still a useful place to state a page\'s core answer concisely for both humans and machines.',
  },
  {
    term: 'Title Tag',
    definition:
      'The HTML element defining a page\'s title, shown as the clickable headline in search results and browser tabs, and one of the strongest on-page relevance signals in both classic SEO and AEO retrieval.',
  },
  {
    term: 'Alt Text',
    definition:
      'A written description attached to an image, originally for accessibility (screen readers) and classic image search, now increasingly read by multimodal AI systems to understand what an image depicts when it cannot directly interpret pixels the way a human eye does.',
  },
  {
    term: 'Anchor Text',
    definition:
      'The clickable, visible text of a hyperlink, historically an important relevance signal because the words used to describe a link often described the destination page\'s topic. Still parsed and weighted by both classic search and AI retrieval systems today.',
  },
  {
    term: 'Duplicate Content',
    definition:
      'Identical or near-identical content appearing at multiple URLs, which can confuse both search indexing and AI retrieval about which version is authoritative, and is generally treated as a negative signal by both.',
  },
  {
    term: 'Local SEO',
    definition:
      'The practice of optimizing a business\'s online presence to appear in geographically relevant searches — for a "cleaning service near me" style query, for instance. Google Business Profile listings, local citations, and location-specific content all feed into this, and increasingly feed AI answer engines\' understanding of a local business\'s legitimacy and service area too.',
  },
  {
    term: 'Google Business Profile',
    definition:
      'Google\'s free tool letting businesses manage how they appear across Google Search and Maps, including hours, reviews, and photos. A significant source of the structured, verified local business data that both classic local search and AI answer engines draw from.',
  },
  {
    term: 'Local Pack',
    definition:
      'The map-based cluster of local business listings, typically showing three results, displayed prominently for local-intent searches — one of the most valuable, high-visibility placements in local search, and a strong signal of verified local relevance that AI systems can also draw on.',
  },
  {
    term: 'Knowledge Panel',
    definition:
      'The structured information box, often shown to the right of Google search results, summarizing key facts about a recognized entity — a person, business, or organization — pulled directly from the Knowledge Graph described in the strategy glossary above.',
  },
  {
    term: 'People Also Ask',
    definition:
      'A search results feature showing a list of related questions that expand into direct answers when clicked, functioning as an early, interactive precursor to today\'s conversational AI answer format, and a useful research source for identifying the exact question phrasing worth writing AEO content around.',
  },
  {
    term: 'Organic Traffic',
    definition:
      'Website visits that arrive through unpaid search results, as opposed to paid advertising. The metric classic SEO has always optimized for directly, and the metric increasingly incomplete as a measure of value in the zero-click AI-answer era described in Part Two.',
  },
  {
    term: 'Paid Search / SEM',
    definition:
      'Search Engine Marketing — paying for placement in search results, typically through a pay-per-click auction system like Google Ads, as distinct from earning placement organically through SEO or AEO.',
  },
  {
    term: 'Impression Share',
    definition:
      'The percentage of eligible times your content or ad actually appeared, out of every time it was eligible to appear. A useful concept borrowed into the emerging "share of answer" AEO metric described in Part Two.',
  },
  {
    term: 'Attribution',
    definition:
      'The practice of determining which marketing touchpoint deserves credit for a resulting conversion or sale. Increasingly difficult in the AI-answer era, since a brand mention inside a synthesized answer can influence a decision without ever registering as a trackable click or visit.',
  },
  {
    term: 'Dark Social / Dark Funnel',
    definition:
      'Marketing influence that happens through channels analytics tools cannot directly track — a private message, a word-of-mouth mention, or increasingly, a conversational AI answer a user never screenshots or clicks through from. A useful frame for thinking honestly about AEO\'s real but hard-to-measure influence.',
  },
  {
    term: 'Branded Search',
    definition:
      'Search queries that already include a specific business or product name, as opposed to generic, non-branded queries about a category. A rise in branded search volume is a commonly used proxy for growing brand awareness, including awareness generated indirectly through AI-answer mentions.',
  },
  {
    term: 'Keyword Cannibalization',
    definition:
      'When multiple pages on the same site compete for the same query, diluting relevance signals and confusing both search rankings and AI retrieval about which page is the authoritative answer.',
  },
  {
    term: 'Content Gap Analysis',
    definition:
      'The practice of identifying questions and topics your competitors or the broader information landscape cover well that your own content does not yet address, used to prioritize what to create next.',
  },
  {
    term: 'User-Generated Content (UGC)',
    definition:
      'Content created by customers or community members rather than a business itself — reviews, forum posts, social comments. A major source of the independent corroboration signal described in Part Two, since it exists outside a business\'s own direct control and therefore carries more inherent credibility to both human readers and AI evaluators.',
  },
  {
    term: 'Trust Signal',
    definition:
      'Any piece of evidence — a verified review, a cited credential, a secure website, transparent authorship — that gives a search engine, an AI system, or a human reader confidence that a source is reliable and legitimate.',
  },
  {
    term: 'Digital Provenance / C2PA',
    definition:
      'Emerging technical standards (the Coalition for Content Provenance and Authenticity, C2PA, is the leading initiative) for cryptographically verifying the origin and edit history of digital content, developed partly in response to the growing difficulty of distinguishing authentic content and images from AI-generated or manipulated ones — a trend directly relevant to the trust and verification challenges described in Part Three.',
  },
  {
    term: 'Synthetic Content',
    definition:
      'Content generated by AI rather than written directly by a human, whether text, images, audio, or video. Search engines and AI platforms are developing increasingly explicit policies distinguishing acceptable, disclosed AI-assisted content from mass-produced, low-value synthetic content designed purely to manipulate rankings.',
  },
  {
    term: 'Agent-to-Agent Commerce',
    definition:
      'Transactions initiated, negotiated, or completed by autonomous AI agents acting on behalf of a buyer and a seller, with limited or no human involvement in the individual transaction itself — the commercial end-state described in Part Four\'s discussion of agentic engines.',
  },
  {
    term: 'Structured Product Feed',
    definition:
      'A machine-readable file listing a business\'s products or services with consistent, structured fields — price, availability, description, category — built specifically so shopping engines, comparison tools, and increasingly AI shopping agents can parse and compare offerings programmatically.',
  },
  {
    term: 'Verified Business Data',
    definition:
      'Business information (hours, pricing, service area, licensing, reviews) that has been confirmed accurate by an independent third party rather than simply self-reported, an increasingly important trust category as autonomous agents make purchasing decisions with less direct human review of each individual claim.',
  },
  {
    term: 'Machine-Readable Content',
    definition:
      'Content structured and formatted specifically to be reliably parsed by software rather than requiring human visual interpretation — the general category that structured data, APIs, and feeds all belong to, as opposed to a page designed purely for a human eye to scan.',
  },
  {
    term: 'Context Engineering',
    definition:
      'The practice of deliberately curating and structuring the information an AI agent has available when performing a task — closely related to but broader than prompt engineering, since it includes not just instructions but the underlying data, tools, and retrieved documents an agent draws on.',
  },
  {
    term: 'Tool Use / Function Calling',
    definition:
      'The capability of a modern AI model to recognize when a task requires an external action — checking a live price, booking an appointment, running a calculation — and to call a defined external tool or API to perform it, rather than trying to answer purely from its own generated text. The core mechanism that turns a purely conversational model into an agent capable of actually acting in the world.',
  },
  {
    term: 'Autonomous Browsing Agent',
    definition:
      'An AI agent capable of navigating a live website itself — clicking, scrolling, filling in forms — to complete a task, as opposed to only reading static content through an API or a search index. An early, imperfect but rapidly improving category directly relevant to the agentic future described in Part Four.',
  },
  {
    term: 'Data Provenance',
    definition:
      'A verifiable record of where a piece of data originated and how it has been modified since, increasingly important as AI systems need a way to distinguish authentic, original claims from manipulated or fabricated ones at scale — see also Digital Provenance / C2PA above.',
  },
  {
    term: 'AI Visibility Tracking',
    definition:
      'The still-early, rapidly evolving category of tools built specifically to measure how often and how favorably a business or brand appears inside AI-generated answers — the practical tooling layer underneath the "share of answer" metric described in Part Two.',
  },
  {
    term: 'Platform Concentration Risk',
    definition:
      'The business risk of depending too heavily on a small number of external platforms for discovery or revenue, discussed at length in Part Four in relation to the emerging, still-fragmented AI answer-engine landscape — a risk with a long history in digital marketing, going back to concerns about Google, Facebook, and Amazon dependency well before generative AI existed.',
  },
  {
    term: 'Compensation / Content Licensing Deals',
    definition:
      'Commercial agreements, an increasingly common structure since 2023, where an AI company pays a publisher or content owner directly for the right to use their content in training or in live retrieval and citation — part of the still-unresolved broader question of fair compensation discussed in Part Four.',
  },
  {
    term: 'GPTBot',
    definition:
      'OpenAI\'s web crawler, used both for gathering training data and, increasingly, for live retrieval to support ChatGPT\'s search capability. Site owners can allow or block it specifically through robots.txt, distinct from blocking Googlebot or Bingbot.',
  },
  {
    term: 'ClaudeBot',
    definition:
      'Anthropic\'s web crawler, used for research and training-data collection. Like GPTBot, it can be individually permitted or blocked in a site\'s robots.txt file, separate from other search and AI crawlers.',
  },
  {
    term: 'PerplexityBot',
    definition:
      'Perplexity\'s dedicated web crawler, used to support its live, cited-answer retrieval product described in Part Three\'s platform-by-platform breakdown.',
  },
]
