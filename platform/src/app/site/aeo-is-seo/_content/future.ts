import type { Block } from './types'

export const futureBlocks: Block[] = [
  { type: 'h2', text: 'Part Four: What Comes After AEO — The Next Five Years' },
  {
    type: 'p',
    text: 'Every era of search described in Part One ended the same way: the winning behavior of the previous era got absorbed as table stakes, and the frontier moved one layer closer to actually completing the task the user originally wanted done, rather than merely informing them about it. Keyword matching gave way to link-based trust. Link-based trust gave way to entity understanding. Entity understanding gave way to conversational, generative answers. The honest, non-hype answer to "what comes after AEO" is not a mystery — it is the next and entirely predictable step on the same curve: from answering questions to completing tasks. The industry is already starting to call the discipline that will govern this next layer Agent Experience Optimization, sometimes shortened to AXO, though the terminology is still settling and will likely keep shifting for a few more years. What will not keep shifting is the underlying mechanic, because it is already visible today in early form.',
  },

  { type: 'h3', text: 'From Answer Engines to Agentic Engines' },
  {
    type: 'p',
    text: 'An answer engine, in the sense this guide has used the term throughout, does one thing: it tells you something. An agentic engine does a second thing on top of that: it acts on your behalf, inside a real system, with real consequences — booking an appointment, comparing and purchasing a product, filing a form, negotiating a price, rescheduling a service. This is not speculative science fiction; it is already shipping in early, imperfect form. AI browser agents can navigate live websites and complete multi-step tasks. AI shopping assistants inside major consumer platforms can compare products, check availability, and initiate purchases with a user\'s approval. Developer-facing standards for connecting AI agents to real tools, real data, and real transactional systems, most notably Anthropic\'s Model Context Protocol (released in late 2024 and rapidly adopted industry-wide through 2025), are explicitly built to let an AI system reach past a static web page and act directly against a structured, authenticated system on a user\'s behalf.',
  },
  {
    type: 'p',
    text: 'This changes the optimization target again, in a way that is worth stating plainly: it will not be enough, in the next five years, to be the source an AI system cites when it explains something to a person. Businesses will increasingly need to be the option an AI agent selects and successfully transacts with when it is acting on a person\'s behalf, often without that person ever seeing a list of alternatives at all. If an agent is told "book me the best-rated cleaning service in my area under my budget," the businesses that get considered will need to expose the same information — pricing, availability, service area, reviews, booking mechanics — in a form an autonomous system can reliably parse and act on, not just in a form a human can read on a webpage. A beautiful, human-optimized website with no clean underlying data layer will simply be invisible to an agent doing this kind of task, the same way a page blocked by robots.txt is invisible to a crawler today.',
  },

  {
    type: 'note',
    side: 'right',
    label: 'Forecast',
    text: 'The next fight isn\'t just to be cited when an AI explains something. It\'s to be the option an autonomous agent actually selects and transacts with — often without the person ever seeing an alternative.',
  },

  { type: 'h3', text: 'The Unit of Discovery Is Shifting From the Page to the Data' },
  {
    type: 'p',
    text: 'For thirty years, the fundamental unit the web was built and indexed around was the page: a URL, a document, something with a title and a layout meant primarily for a human eye. Search engines indexed pages. SEO optimized pages. AEO, as described in Part Two, still largely optimizes pages, even though the audience reading them has partially shifted from human to machine. The next shift is more structural: as agents increasingly need to query, compare, and transact against businesses programmatically, the page starts to matter less than the clean, structured, machine-native data behind it — a product feed, a real-time availability API, a verified reviews feed, a structured pricing table — because an agent completing a task at scale, across dozens or hundreds of candidate businesses in a fraction of a second, cannot afford to visually parse a beautifully designed webpage the way a human does. It needs the underlying facts, in a predictable, queryable format.',
  },
  {
    type: 'p',
    text: 'This does not mean websites disappear in the next five years — human beings will keep browsing, reading, and buying directly for a very long time, and a well-designed site remains a real trust and conversion asset for the humans who do still arrive on it directly. What it means is that a growing and increasingly important second audience — autonomous software acting on a human\'s behalf — needs a parallel, machine-native path into the same information, and businesses that only ever built for the human-facing page will find themselves structurally excluded from an increasing share of demand that never touches a browser at all. The practical implication for any business today is to start treating structured data, APIs, and machine-readable feeds not as a technical afterthought bolted onto a website, but as a first-class product surface in their own right, maintained with the same seriousness as the website itself.',
  },

  { type: 'h3', text: 'Trust, Verification, and the New Fraud Surface' },
  {
    type: 'p',
    text: 'Every new layer of automation in this history has created a corresponding new layer of manipulation, and there is no reason to expect agentic search and agentic commerce to be the exception. If an autonomous agent is going to select a vendor, compare prices, and complete a transaction with limited or no human review of each individual decision, the incentive to feed that agent false or manipulated information — fake reviews engineered specifically to read as trustworthy to a model rather than to a person, fabricated availability data, manipulated pricing feeds, adversarial content designed to exploit how a specific model weighs evidence — becomes enormous, and the potential damage from a successful manipulation becomes larger, because the decision is happening at machine speed with a human one step further removed from the moment of choice than they were even in the AI-Overview era.',
  },
  {
    type: 'p',
    text: 'Expect the next five years to bring real, mainstream infrastructure aimed specifically at this problem: verifiable, cryptographically signed business data feeds; third-party attestation services whose entire function is vouching for the authenticity of a listing, a review, or a claim in a form an agent can programmatically check without a human being reviewing it manually; and increasingly aggressive penalties, both algorithmic and eventually regulatory, for businesses caught gaming agentic trust signals the way businesses gamed backlinks and reviews before them. Businesses that build a genuine, well-documented, verifiable trust layer early — real reviews from real verified customers, transparent and consistent pricing, accurately maintained availability data — are positioning themselves for a future where that verifiability itself becomes a ranking and selection signal, not just a nice-to-have.',
  },

  { type: 'h3', text: 'Personal AI Agents and the Death of the Shared Results Page' },
  {
    type: 'p',
    text: 'Search has always shown, roughly, the same result to everyone who typed the same query — personalization existed at the margins (location, search history) but the fundamental architecture was one engine serving a shared, broadly similar answer to a broad population. The direction of travel over the next five years is toward personal AI agents — assistants that persist across a person\'s entire digital life, carry deep context about that specific person\'s preferences, history, budget, and constraints, and mediate an increasing share of that person\'s information gathering and decision-making individually, rather than through a single shared public interface. This is a much bigger structural change than it sounds, because it means the "results page" a given business is competing to appear on may increasingly be invisible, personalized, and unique to a single user\'s agent, rather than a single, auditable, publicly rankable page anyone can check.',
  },
  {
    type: 'p',
    text: 'For a marketer or business owner, this raises a real and currently unsolved problem: if there is no shared, checkable results page, how do you even know whether you are being surfaced, and to whom? The honest answer is that the industry does not yet have a mature solution to this, and the small set of "AI visibility tracking" tools that exist today are early, imperfect proxies rather than a settled discipline the way rank-tracking became for classic SEO. Expect meaningful investment and genuine competition in this specific measurement problem over the next several years, because every business that spends money on visibility will eventually demand a way to verify what they are getting for it, exactly as happened with web analytics twenty-five years ago and rank tracking fifteen years ago.',
  },

  { type: 'h3', text: 'Platform Concentration Risk Is Bigger Than It Ever Was With Google' },
  {
    type: 'p',
    text: 'It is worth being candid about a real structural risk in this transition, because a genuinely useful guide does not just describe the upside. For roughly two decades, Google\'s dominance of search created real dependency risk for any business relying on organic visibility — but that risk existed inside a system with public, auditable rankings, a large and mature third-party tooling ecosystem built to monitor it, decades of case law and regulatory scrutiny, and a comparatively well-understood, if imperfect, set of rules. The emerging agentic and answer-engine landscape is more fragmented across a handful of major AI providers, each running fundamentally different, less transparent, and far less externally auditable selection and synthesis processes, several of which are still actively changing their underlying models and ranking logic on a monthly or even weekly basis. A business\'s visibility can shift meaningfully overnight based on a foundation-model update it had no visibility into and no ability to prepare for, from a company it may have no direct relationship with at all.',
  },
  {
    type: 'p',
    text: 'The practical response to this risk is the same response that has always worked against platform dependency in every era of digital marketing: diversify deliberately, rather than betting everything on being favored by any single system. Own your first-party audience relationships — an email list, a direct customer relationship, a community — that no algorithm change can take away from you. Maintain genuine strength across multiple discovery surfaces (traditional search, social platforms, direct referral, and the emerging AI layer) rather than concentrating entirely on any one of them. This was sound advice in the PageRank era and it remains sound advice in the agentic era, for exactly the same underlying reason: any channel you do not own is a channel someone else can change the rules of without asking you first.',
  },

  { type: 'h3', text: 'The Open Question of Compensation and Attribution' },
  {
    type: 'p',
    text: 'One genuinely unresolved tension will likely define much of the next five years of industry and, plausibly, regulatory activity: as AI systems derive an increasing share of their commercial and consumer value from synthesizing and answering questions using content that publishers, businesses, and creators spent real money and real effort producing — often while sending that same content dramatically less direct traffic and therefore less direct revenue than it received in the pre-AI-answer era — the question of fair compensation and attribution has moved from an academic debate to a live commercial and legal one. Licensing deals between major publishers and AI companies, ongoing litigation over training-data use, and early experiments in content-licensing marketplaces built specifically for AI consumption all reflect an industry actively negotiating, in real time, what the economics of this new relationship should look like. There is no settled answer as of today, and any guide claiming otherwise is overselling its own certainty. What is reasonably certain is that businesses and creators who can demonstrate clear, original, high-value contribution to the answers AI systems generate will be in a materially stronger negotiating position — commercially, legally, and reputationally — than those producing generic, easily substitutable content, regardless of how that broader compensation question eventually gets resolved.',
  },

  {
    type: 'note',
    side: 'left',
    label: 'Forecast',
    text: 'Expect a real, public trust failure in AI-agent-driven commerce — fabricated reviews or manipulated data exploited at scale — within the next three years. Every prior trust layer in this history got tested this way before it matured.',
  },

  { type: 'h3', text: 'Five Predictions, Stated Plainly' },
  {
    type: 'p',
    text: 'Everything above is analysis of forces already visibly in motion. It is worth closing this part with a small set of direct, falsifiable predictions rather than only trend description, held to the same honesty standard as the rest of this guide: these are genuine forecasts, not certainties, and some will likely be wrong in their specifics even if the broader direction holds.',
  },
  {
    type: 'p',
    text: 'First, within the next two to three years, expect at least one major AI platform to ship a consumer-facing "agent checkout" feature broadly enough that completing a real purchase — not just researching one — inside a chat interface becomes a normal, unremarkable consumer behavior rather than a novelty, the same way completing a purchase inside a social media app went from a curiosity to routine within a similar window a decade earlier.',
  },
  {
    type: 'p',
    text: 'Second, expect "AI visibility" measurement to consolidate from today\'s scattered, early-stage tools into a small number of dominant platforms within roughly three years, following the same maturation path rank-tracking tools took in the 2000s and web analytics took in the late 1990s — every new discovery channel eventually produces a settled measurement layer once enough money depends on proving its value.',
  },
  {
    type: 'p',
    text: 'Third, expect at least one significant, public trust failure — a case of AI-agent-driven commerce being manipulated at scale through fabricated data or reviews, serious enough to draw mainstream press coverage — within the same three-year window, simply because every prior new trust layer in this industry\'s history has been tested this way before the corresponding defenses matured, and there is no reason agentic commerce will be the first exception.',
  },
  {
    type: 'p',
    text: 'Fourth, expect the terminology itself to keep shifting for at least another two years before anything like "AEO" or "AXO" settles as a stable, board-meeting-ready industry term the way "SEO" eventually did — new interfaces reliably produce new vocabulary faster than that vocabulary can standardize, and this transition has been unusually fast even by the standards of previous eras.',
  },
  {
    type: 'p',
    text: 'Fifth, and with the most confidence of the five: whichever businesses are still generating strong organic lead volume five years from now will be the ones who spent this transition building genuine trust, genuine original expertise, and genuine direct customer relationships, rather than the ones chasing the specific tactical trick of the month. This is the one prediction this entire guide has effectively been building toward from Part One onward, and it is the one built on the strongest evidence — twenty-five years of a pattern that has not broken once.',
  },

  { type: 'h3', text: 'The Constant Underneath All of It' },
  {
    type: 'p',
    text: 'Strip away the terminology — SEO, AEO, GEO, AXO, whatever the industry lands on next — and one thing has been true across every single era covered in this guide, without a single exception: the businesses, publishers, and creators who did the actual, hard, unglamorous work of producing genuinely original, accurate, well-organized, trustworthy information consistently outperformed the ones trying to find a shortcut around producing it, in every era, under every algorithm, on every platform. Keyword stuffing lost to real content. Link farms lost to real authority. Thin AI-generated filler is already losing to real expertise and real first-hand experience. Whatever the interface looks like five years from now — a search box, a chat window, a voice assistant, an autonomous agent silently comparing you against nine competitors in a fraction of a second — that same underlying rule is not going anywhere, because it was never really a rule about search engines in the first place. It is a rule about how trust gets built, and no algorithm has ever fully escaped it, no matter how much the interface around it changes.',
  },
]
