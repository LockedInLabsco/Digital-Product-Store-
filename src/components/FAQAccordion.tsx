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
            className="group w-full border-b border-line/10 text-left transition-colors duration-200 hover:border-line/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
            aria-expanded={isOpen}
          >
            <div className="py-5">
              <div className="flex items-start justify-between gap-4">
                <h4 className="font-serif text-lg text-cream transition-transform duration-200 group-hover:translate-x-1">{item.question}</h4>
                <span
                  className={`flex-shrink-0 text-xl text-cream/50 transition-transform duration-300 ease-out ${isOpen ? 'rotate-45' : ''}`}
                  aria-hidden="true"
                >
                  +
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
