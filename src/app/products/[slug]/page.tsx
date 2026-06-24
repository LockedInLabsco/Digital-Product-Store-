'use client'

import Link from 'next/link'
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
        <section className="py-16 border-b border-gray-200">
          <Container>
            <Link
              href="/products"
              className="text-gray-600 hover:text-black mb-8 inline-block text-sm"
            >
              ← Back to Products
            </Link>
            <h1 className="text-5xl sm:text-6xl font-bold mb-6">
              {product.title}
            </h1>
            <p className="text-xl text-gray-700 mb-8 max-w-2xl leading-relaxed">
              {product.description}
            </p>
          </Container>
        </section>

        {/* Product Gallery & Sidebar */}
        <section className="py-20">
          <Container>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 mb-20">
              {/* Gallery */}
              <div className="lg:col-span-2">
                <h2 className="text-3xl font-bold mb-8">What's Inside</h2>
                <ProductGallery
                  images={product.galleryImages}
                  productTitle={product.title}
                />
              </div>

              {/* Right: Sidebar */}
              <div>
                <div className="sticky top-24 bg-white border border-gray-200 rounded-lg p-8">
                  <p className="text-5xl font-bold mb-2">${product.price}</p>
                  <p className="text-gray-600 text-sm mb-8">
                    One-time payment. Forever access.
                  </p>

                  <Button size="lg" className="w-full mb-8">
                    Buy Now
                  </Button>

                  <div className="space-y-3 text-sm text-gray-700 mb-8">
                    <p className="flex items-start gap-2">
                      <span>✓</span>
                      <span>Instant download</span>
                    </p>
                    <p className="flex items-start gap-2">
                      <span>✓</span>
                      <span>No recurring charges</span>
                    </p>
                    <p className="flex items-start gap-2">
                      <span>✓</span>
                      <span>Use forever</span>
                    </p>
                    <p className="flex items-start gap-2">
                      <span>✓</span>
                      <span>{product.format}</span>
                    </p>
                  </div>

                  <div className="border-t border-gray-200 pt-8">
                    <h4 className="font-bold mb-4">Money-Back Guarantee</h4>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      If the guide doesn't help, let us know within 30 days for a full refund.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Story Section */}
            <div className="mb-20">
              <div className="mb-12">
                <h2 className="text-3xl font-bold mb-6">Here's the Thing</h2>
                <p className="text-lg text-gray-700 leading-relaxed mb-6">
                  You've probably tried to build good habits before. Maybe you set
                  ambitious goals. Maybe you downloaded 3 apps. Maybe you lasted a few
                  days or weeks, then... nothing.
                </p>
                <p className="text-lg text-gray-700 leading-relaxed mb-6">
                  The problem isn't you. The problem is complexity. Most habit systems
                  are overthought.
                </p>
                <p className="text-lg text-gray-700 leading-relaxed">
                  This guide is different. It strips everything away and focuses on
                  what actually works: starting small and showing up consistently.
                </p>
              </div>

              <div className="border-t border-gray-200 pt-12">
                <h2 className="text-3xl font-bold mb-6">What You're Getting</h2>
                <p className="text-lg text-gray-700 leading-relaxed mb-8">
                  Not another complicated system. Just what you need to restart your
                  habits the right way:
                </p>
                <ul className="space-y-4">
                  {product.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-4">
                      <span className="text-2xl text-gray-400">✓</span>
                      <span className="text-lg text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* How It Works */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 mb-20">
              <h3 className="text-3xl font-bold mb-8">How It Works</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <div className="flex gap-4">
                    <span className="font-bold text-black min-w-8 flex items-start justify-center pt-1">
                      1.
                    </span>
                    <div>
                      <h4 className="font-bold mb-2">Buy & Instant Access</h4>
                      <p className="text-gray-700">
                        Complete your purchase and instantly download everything
                      </p>
                    </div>
                  </div>
                </div>
                <div>
                  <div className="flex gap-4">
                    <span className="font-bold text-black min-w-8 flex items-start justify-center pt-1">
                      2.
                    </span>
                    <div>
                      <h4 className="font-bold mb-2">Download the Files</h4>
                      <p className="text-gray-700">
                        Get the PDF guide, tracker, and daily routine system
                      </p>
                    </div>
                  </div>
                </div>
                <div>
                  <div className="flex gap-4">
                    <span className="font-bold text-black min-w-8 flex items-start justify-center pt-1">
                      3.
                    </span>
                    <div>
                      <h4 className="font-bold mb-2">Start Your Reset</h4>
                      <p className="text-gray-700">
                        Begin your 7-day reset plan whenever you're ready
                      </p>
                    </div>
                  </div>
                </div>
                <div>
                  <div className="flex gap-4">
                    <span className="font-bold text-black min-w-8 flex items-start justify-center pt-1">
                      4.
                    </span>
                    <div>
                      <h4 className="font-bold mb-2">Stay Accountable</h4>
                      <p className="text-gray-700">
                        Use the tracker to log your daily progress and build momentum
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Container>
        </section>

        {/* Final CTA */}
        <section className="py-20 border-t border-gray-200">
          <Container>
            <div className="text-center max-w-2xl mx-auto">
              <h2 className="text-4xl font-bold mb-6">
                Your habits don't have to be complicated
              </h2>
              <p className="text-lg text-gray-700 mb-8">
                Start your reset today. The guide is waiting for you.
              </p>
              <Button size="lg">Buy The Simple Habit Reset - $9</Button>
            </div>
          </Container>
        </section>
      </main>
      <Footer />
    </>
  )
}
