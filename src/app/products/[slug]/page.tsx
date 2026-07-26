import Link from 'next/link'
import Container from '@/src/components/Container'
import Navbar from '@/src/components/Navbar'
import Footer from '@/src/components/Footer'
import Button from '@/src/components/Button'
import ProductGallery from '@/src/components/ProductGallery'
import FAQAccordion from '@/src/components/FAQAccordion'
import FreeDownloadButton from '@/src/components/FreeDownloadButton'
import PaidProductButton from '@/src/components/PaidProductButton'
import { getActiveProductBySlug } from '@/src/lib/supabase/queries'
import { formatPrice } from '@/src/lib/utils/format'

interface ProductPageProps {
  params: {
    slug: string
  }
}

const faqItems = [
  {
    question: 'How do I receive my download?',
    answer:
      'Free products are delivered by email. Paid products are delivered after checkout using the email provided during purchase.',
  },
  {
    question: 'Do I need an account?',
    answer:
      'No. You can download your product without creating a Not4Normal account.',
  },
  {
    question: 'Can I share the files?',
    answer:
      'Digital products are licensed for personal use unless the product description says otherwise.',
  },
]

export default async function ProductPage({ params }: ProductPageProps) {
  const { product, error } = await getActiveProductBySlug(params.slug)

  if (!product) {
    return (
      <>
        <Navbar />
        <main>
          <Container>
            <div className="py-20 text-center">
              <h1 className="text-4xl font-bold mb-4">
                {error ? 'Product Temporarily Unavailable' : 'Product Not Found'}
              </h1>
              <p className="text-gray-600 mb-8">
                {error
                  ? 'We could not load this product. Please try again in a little while.'
                  : 'The product you\u2019re looking for doesn\u2019t exist or is no longer available.'}
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

  const galleryImages = product.coverImageUrl
    ? [
        {
          id: 'cover',
          src: product.coverImageUrl,
          label: 'Product Cover',
          alt: product.title,
        },
        ...product.galleryImages,
      ]
    : product.galleryImages

  return (
    <>
      <Navbar />
      <main>
        {/* Hero Section */}
        <section className="py-12 sm:py-16">
          <Container>
            <Link
              href="/products"
              className="page-intro text-gray-600 hover:text-black mb-6 sm:mb-8 inline-block text-sm transition-colors"
            >
              ← Back to Products
            </Link>
            <div className="max-w-3xl">
              <h1 className="page-intro page-intro-delay-1 text-5xl sm:text-6xl lg:text-7xl font-bold mb-4 sm:mb-6 leading-tight">
                {product.title}
              </h1>
              <p className="page-intro page-intro-delay-2 text-xl sm:text-2xl text-gray-700 mb-8 leading-relaxed">
                {product.shortDescription}
              </p>
              <div className="page-intro page-intro-delay-3 flex items-center gap-4 sm:gap-6">
                <span className="text-4xl sm:text-5xl font-bold">{formatPrice(product.price)}</span>
                {product.price > 0 && (
                  <span className="text-gray-600 text-sm sm:text-base">One-time payment</span>
                )}
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
                <h2
                  className="text-3xl sm:text-4xl font-bold mb-8 sm:mb-12"
                  data-reveal="up"
                >
                  What&apos;s Inside
                </h2>
                <ProductGallery
                  images={galleryImages}
                  productTitle={product.title}
                />
              </div>

              {/* Sidebar */}
              <div
                className="lg:col-span-1"
                data-reveal="up"
                data-reveal-delay="1"
              >
                <div className="bg-white border border-gray-200 rounded-lg p-6 sm:p-8">
                  <h3 className="text-2xl font-bold mb-6">
                    {product.price === 0 ? 'Get Free Guide' : 'Get Instant Access'}
                  </h3>

                  <div className="mb-8">
                    {product.price === 0 ? (
                      <FreeDownloadButton
                        productSlug={product.slug}
                        productTitle={product.title}
                      />
                    ) : product.paddlePriceId ? (
                      <PaidProductButton
                        productId={product.id}
                        productSlug={product.slug}
                        productTitle={product.title}
                        paddleProductId={product.paddleProductId}
                        paddlePriceId={product.paddlePriceId}
                        price={product.price}
                        variant="primary"
                        size="lg"
                        fullWidth={true}
                        buttonText={`Get Instant Access - ${formatPrice(product.price)}`}
                      />
                    ) : (
                      <div>
                        <Button size="lg" className="w-full bg-gray-300 text-gray-500 cursor-not-allowed" disabled>
                          Checkout Not Configured
                        </Button>
                        <p className="mt-3 text-sm text-red-600">
                          This product is missing its Paddle price ID.
                        </p>
                      </div>
                    )}
                  </div>

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
                  </div>

                  <div className="border-t border-gray-200 pt-8">
                    <p className="text-xs text-gray-600 mb-4 font-semibold">
                      SATISFACTION GUARANTEED
                    </p>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      30-day money-back guarantee. If this doesn&apos;t help, we&apos;ll refund you.
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
            <h2
              className="text-3xl sm:text-4xl font-bold mb-8 sm:mb-12 max-w-2xl"
              data-reveal="up"
            >
              What You&apos;re Getting
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
              {(product.features.length > 0
                ? product.features
                : [product.shortDescription]
              ).map((feature, index) => (
                <div
                  key={index}
                  className="border border-gray-200 rounded-lg p-6 sm:p-8 hover:border-gray-300 transition-colors"
                  data-reveal="up"
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

        {/* About This Product */}
        <section className="py-16 sm:py-20 border-t border-gray-200">
          <Container>
            <div className="max-w-3xl" data-reveal="up">
              <h2 className="text-3xl sm:text-4xl font-bold mb-8">
                About This Product
              </h2>
              <p className="text-lg text-gray-700 leading-relaxed">
                {product.description}
              </p>
            </div>
          </Container>
        </section>

        {/* Product Details */}
        <section className="py-16 sm:py-20 border-t border-gray-200 bg-gray-50">
          <Container>
            <h2
              className="text-3xl sm:text-4xl font-bold mb-8 sm:mb-12"
              data-reveal="up"
            >
              Product Details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div data-reveal="up">
                <h3 className="text-xl font-bold mb-3">What You&apos;ll Get</h3>
                <p className="text-gray-700">
                  {product.shortDescription}
                </p>
              </div>
              <div data-reveal="up" data-reveal-delay="1">
                <h3 className="text-xl font-bold mb-3">Delivery</h3>
                <p className="text-gray-700">
                  {product.price === 0
                    ? 'Enter your email to receive the download link.'
                    : 'Complete checkout to receive access to your download.'}
                </p>
              </div>
            </div>
          </Container>
        </section>

        {/* FAQ */}
        <section className="py-16 sm:py-20 border-t border-gray-200">
          <Container>
            <h2
              className="text-3xl sm:text-4xl font-bold mb-8 sm:mb-12"
              data-reveal="up"
            >
              Common Questions
            </h2>
            <div className="max-w-2xl" data-reveal="up" data-reveal-delay="1">
              <FAQAccordion items={faqItems} />
            </div>
          </Container>
        </section>

        {/* Final CTA */}
        <section className="py-16 sm:py-20 border-t border-gray-200">
          <Container>
            <div className="text-center max-w-2xl mx-auto" data-reveal="up">
              <h2 className="text-4xl sm:text-5xl font-bold mb-6">
                {product.price === 0
                  ? `Get ${product.title} free`
                  : `Get ${product.title}`}
              </h2>
              <p className="text-lg text-gray-700 mb-8">
                {product.price === 0
                  ? 'Enter your email to receive the download link.'
                  : `Get instant access for ${formatPrice(product.price)}.`}
              </p>
              {product.price === 0 ? (
                <FreeDownloadButton
                  productSlug={product.slug}
                  productTitle={product.title}
                />
              ) : product.paddlePriceId ? (
                <PaidProductButton
                  productId={product.id}
                  productSlug={product.slug}
                  productTitle={product.title}
                  paddleProductId={product.paddleProductId}
                  paddlePriceId={product.paddlePriceId}
                  price={product.price}
                  variant="primary"
                  size="lg"
                  buttonText={`Get Instant Access - ${formatPrice(product.price)}`}
                />
              ) : (
                <div>
                  <Button size="lg" className="bg-gray-300 text-gray-500 cursor-not-allowed" disabled>
                    Checkout Not Configured
                  </Button>
                  <p className="mt-3 text-sm text-red-600">
                    This product is missing its Paddle price ID.
                  </p>
                </div>
              )}
              {product.price > 0 && (
                <p className="text-sm text-gray-600 mt-6">
                  30-day money-back guarantee. You&apos;ve got nothing to lose.
                </p>
              )}
            </div>
          </Container>
        </section>
      </main>
      <Footer />
    </>
  )
}
