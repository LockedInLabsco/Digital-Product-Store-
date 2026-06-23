'use client'

import Container from '@/src/components/Container'
import Navbar from '@/src/components/Navbar'
import Footer from '@/src/components/Footer'
import ProductCard from '@/src/components/ProductCard'

const allProducts = [
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
  {
    id: '4',
    title: 'LinkedIn Growth Course',
    description: 'Build your professional brand on LinkedIn',
    price: 49,
    slug: 'linkedin-growth-course',
  },
  {
    id: '5',
    title: 'Personal Brand Workbook',
    description: 'Define and communicate your unique value',
    price: 24,
    slug: 'personal-brand-workbook',
  },
  {
    id: '6',
    title: 'Sales Email Templates',
    description: 'Ready-to-use email templates that sell',
    price: 34,
    slug: 'sales-email-templates',
  },
]

export default function ProductsPage() {
  return (
    <>
      <Navbar />
      <main>
        <section className="py-20">
          <Container>
            <h1 className="text-5xl font-bold mb-4">All Products</h1>
            <p className="text-xl text-gray-600 mb-12">
              Browse our entire collection of digital products
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {allProducts.map((product) => (
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
      </main>
      <Footer />
    </>
  )
}
