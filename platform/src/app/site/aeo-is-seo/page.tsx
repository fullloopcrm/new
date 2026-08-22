import type { Block } from './_content/types'
import { introBlocks } from './_content/intro'
import { historyBlocks } from './_content/history'
import { transitionBlocks } from './_content/transition'
import { platformsBlocks } from './_content/platforms'
import { futureBlocks } from './_content/future'
import { leadgenBlocks } from './_content/leadgen'
import { glossaryIntro, glossaryTerms } from './_content/glossary'
import { glossaryTechnicalIntro, glossaryTechnicalTerms } from './_content/glossary-technical'
import { resourcesIntro, resources } from './_content/resources'
import { faqItems } from './_content/faq'
import { closingBlocks } from './_content/closing'

// Page-level <title>/canonical are inherited from layout.tsx metadata — kept
// there as the single source of truth so the meta tags and the JSON-LD in
// _lib/schema.ts can never drift apart.

function Note({ side, label, text }: { side: 'left' | 'right'; label: string; text: string }) {
  return (
    <aside className={`aeo-note aeo-note-${side}`}>
      <span className="aeo-note-label">{label}</span>
      <p className="aeo-note-text">{text}</p>
    </aside>
  )
}

function BlockList({ blocks }: { blocks: Block[] }) {
  return (
    <>
      {blocks.map((block, i) => {
        if (block.type === 'h2') return <h2 key={i} className="aeo-h2">{block.text}</h2>
        if (block.type === 'h3') return <h3 key={i} className="aeo-h3">{block.text}</h3>
        if (block.type === 'quote') return <p key={i} className="aeo-quote">{block.text}</p>
        if (block.type === 'note') return <Note key={i} side={block.side} label={block.label} text={block.text} />
        return <p key={i} className="aeo-p">{block.text}</p>
      })}
    </>
  )
}

export default function AeoIsSeoPage() {
  return (
    <main className="aeo-page">
      <h1 className="aeo-title">AEO Is SEO</h1>
      <p className="aeo-dek">
        The complete story of how search became AI, what Answer Engine Optimization actually means,
        how each AI platform really sources its answers, where organic lead generation is headed
        over the next five years — and every term involved, explained plainly.
      </p>
      <p className="aeo-meta">A field guide to search, answers, and agents · 20,000 words</p>

      <BlockList blocks={introBlocks} />

      <h2 className="aeo-h2">Quick Answers</h2>
      <dl className="aeo-faq-list">
        {faqItems.map((faq) => (
          <div key={faq.question} className="aeo-faq-item">
            <dt className="aeo-faq-q">{faq.question}</dt>
            <dd className="aeo-faq-a">{faq.answer}</dd>
          </div>
        ))}
      </dl>

      <BlockList blocks={historyBlocks} />
      <BlockList blocks={transitionBlocks} />
      <BlockList blocks={platformsBlocks} />
      <BlockList blocks={futureBlocks} />
      <BlockList blocks={leadgenBlocks} />

      <h2 className="aeo-h2">Glossary: Every Term, Explained</h2>
      <Note
        side="right"
        label="Explainer"
        text="If you only learn one term from this glossary, make it RAG. Retrieval-augmented generation is the actual mechanism behind every AI answer engine in this guide — understand it, and the rest of the vocabulary falls into place around it."
      />
      <p className="aeo-glossary-intro">{glossaryIntro}</p>
      <ul className="aeo-glossary-list">
        {glossaryTerms.map((g) => (
          <li key={g.term} className="aeo-glossary-item">
            <span className="aeo-term">{g.term}</span>
            <p className="aeo-definition">{g.definition}</p>
          </li>
        ))}
      </ul>

      <h3 className="aeo-h3">The Technical Layer Underneath</h3>
      <p className="aeo-glossary-intro">{glossaryTechnicalIntro}</p>
      <ul className="aeo-glossary-list">
        {glossaryTechnicalTerms.map((g) => (
          <li key={g.term} className="aeo-glossary-item">
            <span className="aeo-term">{g.term}</span>
            <p className="aeo-definition">{g.definition}</p>
          </li>
        ))}
      </ul>

      <h2 className="aeo-h2">100 Resources on AEO, Agentic AI, and the Future of Search</h2>
      <Note
        side="left"
        label="Tip"
        text="Bookmark the labs' own blogs, not just the news coverage of them. You'll see real capability changes weeks before the trade press writes about them — and this whole guide is proof that the trade press is always a step behind."
      />
      <p className="aeo-resources-intro">{resourcesIntro}</p>
      {resources.map((group) => (
        <div key={group.category}>
          <h3 className="aeo-resource-category">{group.category}</h3>
          <p className="aeo-resource-category-intro">{group.intro}</p>
          <ul className="aeo-resource-list">
            {group.items.map((item) => (
              <li key={item.url} className="aeo-resource-item">
                <a className="aeo-resource-name" href={item.url} target="_blank" rel="noopener noreferrer">
                  {item.name}
                </a>
                <p className="aeo-resource-desc">{item.description}</p>
              </li>
            ))}
          </ul>
        </div>
      ))}

      <BlockList blocks={closingBlocks} />

      <footer className="aeo-footer">
        <p className="aeo-footer-contact">
          hi@fullloopcrm.com &nbsp;·&nbsp; 844-LOOPCRM
        </p>
        <p className="aeo-footer-copyright">
          &copy; {new Date().getFullYear()} Full Loop CRM. All rights reserved.
        </p>
      </footer>
    </main>
  )
}
