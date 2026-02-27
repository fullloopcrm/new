'use client'

import { useState } from 'react'
import { faqs } from '@/lib/marketing/faqs'

export default function FaqAccordion() {
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const toggleFaq = (i: number) => setOpenFaq(openFaq === i ? null : i)

  return (
    <div className="faq-list">
      {faqs.map((faq, i) => (
        <div key={i} className={`faq-item ${openFaq === i ? 'open' : ''}`}>
          <button className="faq-q" onClick={() => toggleFaq(i)}>{faq.q}</button>
          <div className="faq-a">{faq.a}</div>
        </div>
      ))}
    </div>
  )
}
