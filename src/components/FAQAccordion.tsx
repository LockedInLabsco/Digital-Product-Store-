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
    <div className="space-y-3">
      {items.map((item, index) => (
        <button
          key={index}
          onClick={() => setOpenIndex(openIndex === index ? null : index)}
          className="w-full text-left"
        >
          <div className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-all">
            <div className="flex justify-between items-start gap-4">
              <h4 className="font-bold text-gray-900 text-sm sm:text-base">
                {item.question}
              </h4>
              <span className="text-lg font-bold text-gray-400 flex-shrink-0">
                {openIndex === index ? '−' : '+'}
              </span>
            </div>
            {openIndex === index && (
              <p className="text-gray-700 text-sm sm:text-base mt-4 leading-relaxed">
                {item.answer}
              </p>
            )}
          </div>
        </button>
      ))}
    </div>
  )
}
