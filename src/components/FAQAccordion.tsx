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
    <div className="faq-list">
      {items.map((item, index) => {
        const isOpen = openIndex === index

        return (
          <button
            key={index}
            type="button"
            onClick={() => setOpenIndex(isOpen ? null : index)}
            className="w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current focus-visible:ring-offset-2"
            aria-expanded={isOpen}
          >
            <div className="faq-panel">
              <div className="flex items-start justify-between gap-4">
                <h4 className="text-base font-semibold sm:text-lg">
                  {item.question}
                </h4>
                <span
                  className={`faq-icon flex-shrink-0 text-xl ${
                    isOpen ? 'is-open' : ''
                  }`}
                  aria-hidden="true"
                >
                  {isOpen ? '−' : '+'}
                </span>
              </div>
              <div className={`faq-answer ${isOpen ? 'is-open' : ''}`}>
                <div className="overflow-hidden">
                  <p className="mt-5 max-w-2xl text-sm leading-relaxed opacity-70 sm:text-base">
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
