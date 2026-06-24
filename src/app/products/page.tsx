'use client'

import Link from 'next/link'
import Container from '@/src/components/Container'
import Navbar from '@/src/components/Navbar'
import Footer from '@/src/components/Footer'
import Button from '@/src/components/Button'
import { products } from '@/src/lib/products'

export default function ProductsPage() {
  return (
    <>
      <Navbar />
      <main>
        <section className="py-20">
          <Container>
            <h1 className="text-5xl sm:text-6xl font-bold mb-4">Our Tools</h1>
            <p className="text-lg text-gray-700 mb-16 max-w-2xl">
              Simple, practical guides to help you build better habits and stay focused on what matters.
            </p>

            <div className="space-y-8">
              {products.map((product) => (
                <Link key={product.id} href={`/products/${product.slug}`}>
                  <div className="border border-gray-200 rounded-lg p-8 hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-6">
                      <div className="flex-1">
                        <h2 className="text-2xl sm:text-3xl font-bold mb-2">
                          {product.title}
                        </h2>
                        <p className="text-lg text-gray-700 mb-4">
                          {product.description}
                        </p>
                        <ul className="space-y-2 mb-6">
                          {product.features.map((feature, index) => (
                            <li key={index} className="text-gray-600 flex items-start gap-2">
                              <span className="text-gray-400">→</span>
                              <span>{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="flex flex-col items-end justify-between">
                        <p className="text-4xl font-bold mb-6">${product.price}</p>
                        <Button>View Details</Button>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </Container>
        </section>
      </main>
      <Footer />
    </>
  )
}
