'use client'

import Link from 'next/link'
import { useState } from 'react'
import Container from '@/src/components/Container'
import Navbar from '@/src/components/Navbar'
import Footer from '@/src/components/Footer'
import Button from '@/src/components/Button'
import ProductGallery from '@/src/components/ProductGallery'
import { getProductBySlug } from '@/src/lib/products'

interface ProductPageProps {
  params: {
    slug: string
  }
}

const faqItems = [
  {
    question: 'What file formats do I get?',
    answer:
      'You get everything as PDFs and printables. Download them to your computer, print if you want, and use them forever.',
  },
  {
    question: 'How long does it take?',
    answer:
      'The 7-day reset plan takes about 10-15 minutes per day. The full guide can be read in under an hour.',
  },
  {
    question: 'Will this actually work for me?',
    answer:
      'This guide works if you're willing to start small and show up. It's not a magic solution, but a practical system that has helped many people restart their habits.',
  },
  {
    question: 'What if I don't like it?',
    answer:
      'We offer a 30-day money-back guarantee. No questions asked. If it doesn't help, you get your money back.',
  },
  {
    question: 'Can I share this with friends?',
    answer:
      'The guide is for personal use. If your friends want to use it, they can buy their own copy for $9.',
  },
  {
    question: 'Do I need an account?',
    answer:
      'Nope. You buy it once, download it, and it's yours forever. No login, no subscription, no hassle.',
  },
]

interface FAQItem {
  question: string
  answer: string
}

function FAQAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <div className="space-y-3">
      {faqItems.map((item: FAQItem, index: number) => (
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

export default function ProductPage({ params }: ProductPageProps) {
  const product = getProductBySlug(params.slug)

  if (!product) {
    return (
      <>
        <Navbar />
        <main>
          <Container>
            <div className="py-20 text-center">
              <h1 className="text-4xl font-bold mb-4">Product Not Found</h1>
              <p className="text-gray-600 mb-8">
                The product you're looking for doesn't exist.
              </p>
              <Link href="/products">
                <Button>Back to Products</Button>
              </Link>
            </div>
          </Container>
        </main>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Navbar />
      <main>
        {/* Hero Section */}
        <section className="py-12 sm:py-16">
          <Container>
            <Link
              href="/products"
              className="text-gray-600 hover:text-black mb-6 sm:mb-8 inline-block text-sm"
            >
              ← Back to Products
            </Link>
            <div className="max-w-3xl">
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-4 sm:mb-6 leading-tight">
                {product.title}
              </h1>
              <p className="text-xl sm:text-2xl text-gray-700 mb-8 leading-relaxed">
                {product.description}
              </p>
              <div className="flex items-center gap-4 sm:gap-6">
                <span className="text-4xl sm:text-5xl font-bold">${product.price}</span>
                <span className="text-gray-600 text-sm sm:text-base">One-time payment</span>
              </div>
            </div>
          </Container>
        </section>

        {/* Product Gallery & Sidebar */}
        <section className="py-16 sm:py-20 border-t border-gray-200">
          <Container>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
              {/* Gallery */}
              <div className="lg:col-span-2">
                <h2 className="text-3xl sm:text-4xl font-bold mb-8 sm:mb-12">
                  What's Inside
                </h2>
                <ProductGallery
                  images={product.galleryImages}
                  productTitle={product.title}
                />
              </div>

              {/* Sidebar */}
              <div className="lg:col-span-1">
                <div className="bg-white border border-gray-200 rounded-lg p-6 sm:p-8">
                  <h3 className="text-2xl font-bold mb-6">Get Instant Access</h3>

                  <Button size="lg" className="w-full mb-8 bg-black text-white hover:bg-gray-900">
                    Get Instant Access - $9
                  </Button>

                  <div className="space-y-3 mb-8 text-sm">
                    <p className="flex items-start gap-3">
                      <span className="text-xl mt-0.5">✓</span>
                      <span className="text-gray-700">Instant download</span>
                    </p>
                    <p className="flex items-start gap-3">
                      <span className="text-xl mt-0.5">✓</span>
                      <span className="text-gray-700">No recurring charges</span>
                    </p>
                    <p className="flex items-start gap-3">
                      <span className="text-xl mt-0.5">✓</span>
                      <span className="text-gray-700">Use forever</span>
                    </p>
                    <p className="flex items-start gap-3">
                      <span className="text-xl mt-0.5">✓</span>
                      <span className="text-gray-700">{product.format}</span>
                    </p>
                  </div>

                  <div className="border-t border-gray-200 pt-8">
                    <p className="text-xs text-gray-600 mb-4 font-semibold">
                      SATISFACTION GUARANTEED
                    </p>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      30-day money-back guarantee. If this doesn't help, we'll refund you.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Container>
        </section>

        {/* What You Get */}
        <section className="py-16 sm:py-20 border-t border-gray-200">
          <Container>
            <h2 className="text-3xl sm:text-4xl font-bold mb-8 sm:mb-12 max-w-2xl">
              What You're Getting
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
              {product.features.map((feature, index) => (
                <div
                  key={index}
                  className="border border-gray-200 rounded-lg p-6 sm:p-8 hover:border-gray-300 transition-colors"
                >
                  <div className="flex gap-4">
                    <div className="text-3xl">📄</div>
                    <div>
                      <p className="text-gray-800 leading-relaxed">{feature}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Container>
        </section>

        {/* Who This Is For */}
        <section className="py-16 sm:py-20 border-t border-gray-200">
          <Container>
            <div className="max-w-3xl">
              <h2 className="text-3xl sm:text-4xl font-bold mb-8">
                Who This Is For
              </h2>
              <div className="space-y-4 text-lg text-gray-700">
                <p>
                  This guide is for anyone who has tried to build good habits and
                  struggled. If you've ever:
                </p>
                <ul className="space-y-3 ml-4">
                  <li className="flex gap-3">
                    <span>•</span>
                    <span>Started strong but quit after a few weeks</span>
                  </li>
                  <li className="flex gap-3">
                    <span>•</span>
                    <span>Felt overwhelmed by complicated habit systems</span>
                  </li>
                  <li className="flex gap-3">
                    <span>•</span>
                    <span>Wanted to build habits but didn't know where to start</span>
                  </li>
                  <li className="flex gap-3">
                    <span>•</span>
                    <span>Struggled with consistency and motivation</span>
                  </li>
                </ul>
                <p className="pt-2">
                  Then this guide is for you. It's designed to be simple, doable, and
                  actually helpful.
                </p>
              </div>
            </div>
          </Container>
        </section>

        {/* How It Helps */}
        <section className="py-16 sm:py-20 border-t border-gray-200 bg-gray-50">
          <Container>
            <h2 className="text-3xl sm:text-4xl font-bold mb-8 sm:mb-12">
              How This Helps
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xl font-bold mb-3">You'll Learn</h3>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex gap-2">
                    <span>→</span>
                    <span>Why most habits fail (and how to avoid it)</span>
                  </li>
                  <li className="flex gap-2">
                    <span>→</span>
                    <span>How to start small so you actually stick</span>
                  </li>
                  <li className="flex gap-2">
                    <span>→</span>
                    <span>The simple daily actions that build momentum</span>
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="text-xl font-bold mb-3">You'll Get</h3>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex gap-2">
                    <span>→</span>
                    <span>A step-by-step 7-day plan to start</span>
                  </li>
                  <li className="flex gap-2">
                    <span>→</span>
                    <span>A printable tracker to stay accountable</span>
                  </li>
                  <li className="flex gap-2">
                    <span>→</span>
                    <span>A simple daily routine you can use forever</span>
                  </li>
                </ul>
              </div>
            </div>
          </Container>
        </section>

        {/* FAQ */}
        <section className="py-16 sm:py-20 border-t border-gray-200">
          <Container>
            <h2 className="text-3xl sm:text-4xl font-bold mb-8 sm:mb-12">
              Common Questions
            </h2>
            <div className="max-w-2xl">
              <FAQAccordion />
            </div>
          </Container>
        </section>

        {/* Final CTA */}
        <section className="py-16 sm:py-20 border-t border-gray-200">
          <Container>
            <div className="text-center max-w-2xl mx-auto">
              <h2 className="text-4xl sm:text-5xl font-bold mb-6">
                Ready to reset?
              </h2>
              <p className="text-lg text-gray-700 mb-8">
                Your habits can be simple. Start your reset today—just $9.
              </p>
              <Button size="lg" className="bg-black text-white hover:bg-gray-900">
                Get Instant Access - $9
              </Button>
              <p className="text-sm text-gray-600 mt-6">
                30-day money-back guarantee. You've got nothing to lose.
              </p>
            </div>
          </Container>
        </section>
      </main>
      <Footer />
    </>
  )
}
