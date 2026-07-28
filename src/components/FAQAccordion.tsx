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
    <div className="border-t border-ink/10">
      {items.map((item, index) => {
        const isOpen = openIndex === index

        return (
          <button
            key={index}
            type="button"
            onClick={() => setOpenIndex(isOpen ? null : index)}
            className="w-full border-b border-ink/10 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2"
            aria-expanded={isOpen}
          >
            <div className="py-5">
              <div className="flex items-start justify-between gap-4">
                <h4 className="font-serif text-lg text-ink">{item.question}</h4>
                <span
                  className="flex-shrink-0 text-xl text-ink/50"
                  aria-hidden="true"
                >
                  {isOpen ? '−' : '+'}
                </span>
              </div>
              <div className={`faq-answer ${isOpen ? 'is-open' : ''}`}>
                <div className="overflow-hidden">
                  <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink/60">
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
