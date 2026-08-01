'use client'

import { useState } from 'react'

interface FAQItem {
  question: string
  answer: string
}

interface FAQAccordionProps {
  items: FAQItem[]
}

export default function FAQAccordion({ items }: FAQAccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <div className="border-t border-line/10">
      {items.map((item, index) => {
        const isOpen = openIndex === index

        return (
          <button
            key={index}
            type="button"
            onClick={() => setOpenIndex(isOpen ? null : index)}
            className="w-full border-b border-line/10 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
            aria-expanded={isOpen}
          >
            <div className="py-5">
              <div className="flex items-start justify-between gap-4">
                <h4 className="font-serif text-lg text-cream">{item.question}</h4>
                <span
                  className="flex-shrink-0 text-xl text-cream/50"
                  aria-hidden="true"
                >
                  {isOpen ? '−' : '+'}
                </span>
              </div>
              <div className={`faq-answer ${isOpen ? 'is-open' : ''}`}>
                <div className="overflow-hidden">
                  <p className="mt-4 max-w-2xl text-sm leading-relaxed text-cream/60">
                    {item.answer}
                  </p>
                </div>
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}
