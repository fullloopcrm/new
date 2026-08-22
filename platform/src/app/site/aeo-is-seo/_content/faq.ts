export interface FaqItem {
  question: string
  answer: string
}

export const faqItems: FaqItem[] = [
  {
    question: 'What is AEO (Answer Engine Optimization)?',
    answer:
      'Answer Engine Optimization is the practice of structuring, writing, and technically packaging content so that an AI system — a search engine\'s generative answer layer, a standalone AI chat product, or a voice assistant — selects it as a source when synthesizing a response to a user\'s question.',
  },
  {
    question: 'Is SEO dead now that AEO exists?',
    answer:
      'No. SEO is not dead, and AEO is not its replacement — it is the next layer built on top of it. Every AI answer engine still depends on the same crawl-and-index infrastructure classic SEO has always required to find your content in the first place.',
  },
  {
    question: 'What is the difference between SEO and AEO?',
    answer:
      'SEO optimizes for a ranking algorithm and a human scanning a list of links. AEO optimizes for a language model that reads your content, decides whether it directly answers a question, and paraphrases or quotes it into a synthesized response. SEO gets you into the room; AEO decides whether you get to speak once you\'re in it.',
  },
  {
    question: 'What is RAG (retrieval-augmented generation)?',
    answer:
      'RAG is the technical architecture behind almost every AI search feature: the system retrieves a set of relevant documents, then feeds them to a language model as context so it can generate an answer grounded in real, current information instead of relying purely on what it memorized during training.',
  },
  {
    question: 'What is GEO (Generative Engine Optimization)?',
    answer:
      'GEO is a near-synonym for AEO that emerged from academic and industry research, specifically emphasizing optimization for generative AI systems that write novel synthesized text rather than simply retrieving and displaying existing documents. Most practitioners now use AEO and GEO interchangeably.',
  },
  {
    question: 'What comes after AEO?',
    answer:
      'The next layer shifts from answering questions to completing tasks — AI agents that don\'t just cite a source but act on a user\'s behalf: booking, comparing, and purchasing. The industry is starting to call this Agent Experience Optimization, or AXO, though the terminology is still settling.',
  },
  {
    question: 'How does Google AI Overviews source its answers?',
    answer:
      'Google AI Overviews draw on Google\'s own web index — the same proprietary crawl-and-index infrastructure that has powered classic Google Search for over two decades — rather than any third-party or partnered data source.',
  },
  {
    question: 'What is llms.txt?',
    answer:
      'llms.txt is a plain-text file placed at a website\'s root, alongside the long-standing robots.txt, that gives AI systems a curated, machine-readable summary of a site\'s most important content, formatted specifically for language-model consumption.',
  },
  {
    question: 'How do I generate organic leads in the AI-search era?',
    answer:
      'Fix your technical foundation so machines can find you, write directly to the real questions your customers ask, build trust signals that show up consistently across platforms you don\'t control, and publish original data only your business has. Those four things have not gone out of style across six eras of search.',
  },
  {
    question: 'Should I do SEO or AEO first?',
    answer:
      'Neither — they are not competing budgets. Technical SEO is the floor that makes your content crawlable and indexable in the first place; AEO is what you build on top of it to be selected and cited once an AI system reaches you. You need both, and you always will.',
  },
]
