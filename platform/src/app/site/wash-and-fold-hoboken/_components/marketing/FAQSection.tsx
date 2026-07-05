interface FAQ {
  question: string
  answer: string
}

export default function FAQSection({ faqs, title, columns }: { faqs: FAQ[]; title?: string; columns?: 2 }) {
  const mid = columns === 2 ? Math.ceil(faqs.length / 2) : faqs.length
  const left = faqs.slice(0, mid)
  const right = columns === 2 ? faqs.slice(mid) : []

  const renderFaq = (faq: FAQ, i: number) => (
    <details key={i} className="group bg-white border border-gray-200 rounded-xl overflow-hidden">
      <summary className="flex items-center justify-between cursor-pointer px-6 py-5 font-medium text-[#1E2A4A] hover:bg-gray-50 transition-colors">
        {faq.question}
        <span className="text-gray-400 group-open:rotate-45 transition-transform text-xl flex-shrink-0 ml-4">+</span>
      </summary>
      <div className="px-6 pb-5 text-gray-600 leading-relaxed">
        {faq.answer}
      </div>
    </details>
  )

  return (
    <section className="py-20 bg-gray-50">
      <div className={columns === 2 ? 'max-w-7xl mx-auto px-4' : 'max-w-3xl mx-auto px-4'}>
        <h2 className="font-[family-name:var(--font-bebas)] text-3xl text-[#1E2A4A] tracking-wide mb-10 text-center">
          {title || 'Frequently Asked Questions'}
        </h2>
        {columns === 2 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-3">
              {left.map((faq, i) => renderFaq(faq, i))}
            </div>
            <div className="space-y-3">
              {right.map((faq, i) => renderFaq(faq, i + mid))}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {faqs.map((faq, i) => renderFaq(faq, i))}
          </div>
        )}
      </div>
    </section>
  )
}
