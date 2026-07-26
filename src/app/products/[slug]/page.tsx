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
        <main className="product-missing-page" data-nav-theme="dark">
          <Container>
            <p className="eyebrow page-intro">
              {error ? 'Connection interrupted' : '404 / Product'}
            </p>
            <h1 className="display-type page-intro page-intro-delay-1">
              {error ? 'Temporarily unavailable.' : 'This tool is not here.'}
            </h1>
            <p className="page-intro page-intro-delay-2">
              {error
                ? 'We could not load this product. Please try again in a little while.'
                : 'The product does not exist or is no longer active.'}
            </p>
            <Link
              href="/products"
              className="cinematic-cta cinematic-cta-light page-intro page-intro-delay-3"
              data-cursor="ENTER"
            >
              Back to products
              <span aria-hidden="true">↗</span>
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
      <main className="product-detail-page">
        <section className="product-detail-hero" data-nav-theme="dark">
          <Container>
            <Link
              href="/products"
              className="product-back-link page-intro"
            >
              <span aria-hidden="true">←</span>
              All products
            </Link>

            <div className="product-detail-hero-grid">
              <div>
                <p className="eyebrow page-intro page-intro-delay-1">
                  Digital tool / {product.price === 0 ? 'Free' : 'Paid'}
                </p>
                <h1 className="product-detail-title">
                  <span className="hero-title-mask">
                    <span className="hero-title-line hero-title-line-1">
                      {product.title}
                    </span>
                  </span>
                </h1>
              </div>
              <div className="product-detail-intro page-intro page-intro-delay-3">
                <p>{product.shortDescription}</p>
                <strong>{formatPrice(product.price)}</strong>
              </div>
            </div>
          </Container>
        </section>

        <section className="product-detail-stage" data-nav-theme="light">
          <Container>
            <div className="product-detail-stage-grid">
              <div>
                <div className="product-section-label" data-reveal="left">
                  <span>01</span>
                  <p>What&apos;s inside</p>
                </div>
                <ProductGallery
                  images={galleryImages}
                  productTitle={product.title}
                />
              </div>

              <aside className="purchase-panel" data-reveal="up">
                <p className="eyebrow">
                  {product.price === 0 ? 'Free release' : 'One-time purchase'}
                </p>
                <h2>
                  {product.price === 0
                    ? 'Get the guide.'
                    : 'Get instant access.'}
                </h2>
                <p className="purchase-panel-copy">
                  Enter your details and the next step lands directly in your
                  inbox.
                </p>
                <PurchaseAction fullWidth />
                <div className="purchase-assurances">
                  <p>
                    <span>01</span>
                    Secure delivery
                  </p>
                  <p>
                    <span>02</span>
                    No recurring charge
                  </p>
                  <p>
                    <span>03</span>
                    Keep it forever
                  </p>
                </div>
              </aside>
            </div>
          </Container>
        </section>

        <section className="product-story" data-nav-theme="dark">
          <Container>
            <div className="product-section-label light" data-reveal="left">
              <span>02</span>
              <p>The purpose</p>
            </div>
            <div className="product-story-grid">
              <h2 data-reveal="mask">Built to be used.</h2>
              <p data-reveal="up">{product.description}</p>
            </div>
          </Container>
        </section>

        <section className="product-inclusions" data-nav-theme="light">
          <Container>
            <div className="product-section-label" data-reveal="left">
              <span>03</span>
              <p>What you get</p>
            </div>
            <div className="product-inclusions-grid">
              {productFeatures.map((feature, index) => (
                <article
                  key={index}
                  className="product-inclusion"
                  data-reveal="up"
                  data-reveal-delay={String(index % 3)}
                >
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <p>{feature}</p>
                </article>
              ))}
              <article
                className="product-inclusion"
                data-reveal="up"
                data-reveal-delay="1"
              >
                <span>{String(productFeatures.length + 1).padStart(2, '0')}</span>
                <p>
                  {product.price === 0
                    ? 'Delivered directly to your email.'
                    : 'Delivered securely after checkout.'}
                </p>
              </article>
            </div>
          </Container>
        </section>

        <section className="product-faq" data-nav-theme="dark">
          <Container>
            <div className="product-section-label light" data-reveal="left">
              <span>04</span>
              <p>Before you start</p>
            </div>
            <div className="product-faq-grid">
              <h2 data-reveal="mask">Questions.</h2>
              <div data-reveal="up">
                <FAQAccordion items={faqItems} />
              </div>
            </div>
          </Container>
        </section>

        <section className="product-final-cta" data-nav-theme="light">
          <Container>
            <p className="eyebrow" data-reveal="fade">
              The tool is ready.
            </p>
            <h2 data-reveal="mask">
              {product.price === 0
                ? 'Start without paying.'
                : 'Stop waiting. Start using.'}
            </h2>
            <p data-reveal="up">{product.shortDescription}</p>
            <div className="product-final-action" data-reveal="up">
              <PurchaseAction />
            </div>
          </Container>
        </section>
      </main>
      <Footer />
    </>
  )
}
