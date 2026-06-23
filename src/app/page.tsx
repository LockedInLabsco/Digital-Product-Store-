'use client'

import Link from 'next/link'
import Container from '@/src/components/Container'
import Navbar from '@/src/components/Navbar'
import Footer from '@/src/components/Footer'
import ProductCard from '@/src/components/ProductCard'
import Button from '@/src/components/Button'

const featuredProducts = [
  {
    id: '1',
    title: 'Email Marketing Guide',
    description: 'Master modern email strategies that convert',
    price: 29,
    slug: 'email-marketing-guide',
  },
  {
    id: '2',
    title: 'Content Calendar Template',
    description: 'Plan your content for an entire year',
    price: 19,
    slug: 'content-calendar-template',
  },
  {
    id: '3',
    title: 'Social Media Playbook',
    description: 'Proven strategies for growing your audience',
    price: 39,
    slug: 'social-media-playbook',
  },
]

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        {/* Hero Section */}
        <section className="py-20 sm:py-32">
          <Container>
            <div className="max-w-2xl">
              <h1 className="text-5xl sm:text-6xl font-bold mb-6 leading-tight">
                Digital Products Built for You
              </h1>
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                Download premium resources instantly. No subscriptions. No recurring charges. Own it forever.
              </p>
              <Link href="/products">
                <Button className="text-lg px-8 py-4">
                  Browse Products
                </Button>
              </Link>
            </div>
          </Container>
        </section>

        {/* Featured Products */}
        <section className="py-20 bg-gray-50">
          <Container>
            <h2 className="text-4xl font-bold mb-4">Featured Products</h2>
            <p className="text-gray-600 mb-12 text-lg">
              Start with our most popular digital products
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  title={product.title}
                  description={product.description}
                  price={product.price}
                  slug={product.slug}
                />
              ))}
            </div>
          </Container>
        </section>

        {/* CTA Section */}
        <section className="py-20">
          <Container>
            <div className="bg-black text-white rounded-lg p-12 text-center">
              <h2 className="text-4xl font-bold mb-4">Ready to Get Started?</h2>
              <p className="text-gray-300 mb-8 text-lg">
                Browse our complete collection of digital products
              </p>
              <Link href="/products">
                <Button className="bg-white text-black hover:bg-gray-200">
                  View All Products
                </Button>
              </Link>
            </div>
          </Container>
        </section>
      </main>
      <Footer />
    </>
  )
}
