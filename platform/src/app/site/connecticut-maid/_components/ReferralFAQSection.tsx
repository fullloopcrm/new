interface BilingualFAQ {
  question: string
  questionEs: string
  answer: string
  answerEs: string
}

export default function ReferralFAQSection({ faqs, title, titleEs }: { faqs: BilingualFAQ[]; title: string; titleEs: string }) {
  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-3xl mx-auto px-4">
        <h2 className="font-[family-name:var(--font-bebas)] text-3xl text-[#1E2A4A] tracking-wide mb-1 text-center">
          {title}
        </h2>
        <p className="text-gray-400 tracking-wide mb-10 text-center italic">
          {titleEs}
        </p>
        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <details key={i} className="group bg-white border border-gray-200 rounded-xl overflow-hidden">
              <summary className="flex items-center justify-between cursor-pointer px-6 py-5 font-medium text-[#1E2A4A] hover:bg-gray-50 transition-colors">
                <span>
                  <span className="block">{faq.question}</span>
                  <span className="block text-gray-400 font-normal italic text-sm mt-0.5">{faq.questionEs}</span>
                </span>
                <span className="text-gray-400 group-open:rotate-45 transition-transform text-xl flex-shrink-0 ml-4">+</span>
              </summary>
              <div className="px-6 pb-5 text-gray-600 leading-relaxed">
                <p>{faq.answer}</p>
                <p className="text-gray-400 italic mt-2">{faq.answerEs}</p>
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
