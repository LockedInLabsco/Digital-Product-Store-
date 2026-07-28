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
        <main className="flex min-h-[60vh] items-center bg-cream">
          <Container className="max-w-2xl text-center">
            <p className="eyebrow text-gold">
              {error ? 'Connection interrupted' : '404 / Product'}
            </p>
            <h1 className="mt-4 font-serif text-4xl text-ink sm:text-5xl">
              {error ? 'Temporarily unavailable.' : 'This tool is not here.'}
            </h1>
            <p className="mt-4 text-ink/60">
              {error
                ? 'We could not load this product. Please try again in a little while.'
                : 'The product does not exist or is no longer active.'}
            </p>
            <Link
              href="/products"
              className="mt-8 inline-flex items-center justify-center rounded-sm bg-ink px-7 py-4 text-xs font-semibold uppercase tracking-[0.12em] text-cream transition-colors hover:bg-charcoal"
            >
              Back to products
            </Link>
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
          label: 'Product cover',
          alt: product.title,
        },
        ...product.galleryImages,
      ]
    : product.galleryImages

  const productFeatures =
    product.features.length > 0
      ? product.features
      : [product.shortDescription]

  const PurchaseAction = ({ fullWidth = false }: { fullWidth?: boolean }) =>
    product.price === 0 ? (
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
        fullWidth={fullWidth}
        buttonText={`Get Instant Access — ${formatPrice(product.price)}`}
      />
    ) : (
      <div>
        <Button
          size="lg"
          className={fullWidth ? 'w-full cursor-not-allowed opacity-50' : 'cursor-not-allowed opacity-50'}
          disabled
        >
          Checkout not configured
        </Button>
        <p className="mt-3 text-sm text-red-700">
          This product is missing its Paddle price ID.
        </p>
      </div>
    )

  return (
    <>
      <Navbar />
      <main className="bg-cream">
        <section className="py-12 sm:py-16">
          <Container>
            <Link
              href="/products"
              className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-ink/60 transition-colors hover:text-ink"
            >
              <span aria-hidden="true">←</span>
              All products
            </Link>

            <div className="mt-8 lg:grid lg:grid-cols-[1.15fr_0.85fr] lg:items-start lg:gap-x-16 lg:gap-y-8">
              {/* 1. Title */}
              <div>
                <p className="eyebrow text-gold">
                  Digital Tool / {product.price === 0 ? 'Free' : 'Paid'}
                </p>
                <h1 className="mt-3 font-serif text-4xl text-ink sm:text-5xl">
                  {product.title}
                </h1>
              </div>

              {/* 2. Short promise */}
              <p className="mt-4 max-w-xl text-lg text-ink/65 lg:mt-4">
                {product.shortDescription}
              </p>

              {/* 3. Price */}
              <p className="mt-4 font-serif text-3xl text-ink lg:mt-4">
                {formatPrice(product.price)}
              </p>

              {/* Gallery — desktop left column, spans the text rows */}
              <div className="mt-8 lg:col-start-1 lg:row-start-1 lg:row-end-8 lg:mt-0">
                <ProductGallery
                  images={galleryImages}
                  productTitle={product.title}
                />
              </div>

              {/* 5. CTA */}
              <div className="mt-8 lg:mt-4">
                <PurchaseAction fullWidth />
                <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 border-t border-ink/10 pt-5 text-xs font-semibold uppercase tracking-[0.08em] text-ink/45">
                  <span>Secure delivery</span>
                  <span>No recurring charge</span>
                  <span>Keep it forever</span>
                </div>
              </div>

              {/* 6. Description */}
              <div className="mt-10 lg:mt-8">
                <p className="eyebrow text-ink/40">The purpose</p>
                <p className="mt-3 max-w-2xl text-base leading-relaxed text-ink/70">
                  {product.description}
                </p>
              </div>

              {/* 7. What's inside */}
              <div className="mt-10 lg:mt-8">
                <p className="eyebrow text-ink/40">What you get</p>
                <ul className="mt-4 space-y-3">
                  {productFeatures.map((feature, index) => (
                    <li
                      key={index}
                      className="flex items-start gap-3 text-sm text-ink/70"
                    >
                      <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-gold" aria-hidden="true" />
                      {feature}
                    </li>
                  ))}
                  <li className="flex items-start gap-3 text-sm text-ink/70">
                    <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-gold" aria-hidden="true" />
                    {product.price === 0
                      ? 'Delivered directly to your email.'
                      : 'Delivered securely after checkout.'}
                  </li>
                </ul>
              </div>
            </div>
          </Container>
        </section>

        <section className="border-t border-ink/10 py-16 sm:py-20">
          <Container className="max-w-3xl">
            <p className="eyebrow text-gold">Before you start</p>
            <h2 className="mt-3 font-serif text-3xl text-ink">Questions.</h2>
            <div className="mt-8">
              <FAQAccordion items={faqItems} />
            </div>
          </Container>
        </section>

        <section className="border-t border-ink/10 bg-offwhite py-16 sm:py-20">
          <Container className="flex flex-col items-center gap-5 text-center">
            <h2 className="font-serif text-3xl text-ink sm:text-4xl">
              {product.price === 0
                ? 'Start without paying.'
                : 'Stop waiting. Start using.'}
            </h2>
            <p className="max-w-md text-ink/60">{product.shortDescription}</p>
            <div className="mt-2 w-full max-w-sm">
              <PurchaseAction />
            </div>
          </Container>
        </section>
      </main>
      <Footer />
    </>
  )
}
