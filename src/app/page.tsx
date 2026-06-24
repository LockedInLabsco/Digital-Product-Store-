'use client'

import Link from 'next/link'
import Container from '@/src/components/Container'
import Navbar from '@/src/components/Navbar'
import Footer from '@/src/components/Footer'
import ProductCard from '@/src/components/ProductCard'
import Button from '@/src/components/Button'
import { products } from '@/src/lib/products'

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        {/* Hero Section */}
        <section className="py-24 sm:py-32">
          <Container>
            <div className="max-w-3xl">
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
                Simple tools for better habits
              </h1>
              <p className="text-lg sm:text-xl text-gray-700 mb-12 leading-relaxed">
                We believe building good habits shouldn't be complicated. Our tools help you focus on what matters: showing up, one day at a time.
              </p>
              <Link href="/products">
                <Button size="lg">
                  See Our Product
                </Button>
              </Link>
            </div>
          </Container>
        </section>

        {/* Why This Matters */}
        <section className="py-20 border-t border-gray-200">
          <Container>
            <div className="max-w-3xl mx-auto text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold mb-6">
                Most people fail at habits for a simple reason
              </h2>
              <p className="text-lg text-gray-700 leading-relaxed">
                They try to change everything at once. New habits are hard. But they don't have to be complicated.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div>
                <h3 className="text-xl font-bold mb-3">Simple</h3>
                <p className="text-gray-700">
                  No complex systems. No motivation hacks. Just straightforward guides that work.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-bold mb-3">Doable</h3>
                <p className="text-gray-700">
                  Start small. Start today. Our guides are designed for real people with real lives.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-bold mb-3">Yours Forever</h3>
                <p className="text-gray-700">
                  Buy once, own forever. No subscriptions. No recurring charges. Just yours.
                </p>
              </div>
            </div>
          </Container>
        </section>

        {/* Featured Product */}
        <section className="py-20 bg-gray-50">
          <Container>
            <h2 className="text-3xl sm:text-4xl font-bold mb-12">Our Product</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
              <div>
                {products.map((product) => (
                  <div key={product.id}>
                    <h3 className="text-3xl sm:text-4xl font-bold mb-4">
                      {product.title}
                    </h3>
                    <p className="text-lg text-gray-700 mb-8 leading-relaxed">
                      {product.description}
                    </p>
                    <p className="text-5xl font-bold mb-8">${product.price}</p>
                    <Link href={`/products/${product.slug}`}>
                      <Button size="lg">
                        Learn More
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-8 sm:p-12">
                <h4 className="text-xl font-bold mb-6">What You Get</h4>
                <ul className="space-y-4">
                  {products[0]?.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <span className="text-2xl text-black">✓</span>
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Container>
        </section>
      </main>
      <Footer />
    </>
  )
}
