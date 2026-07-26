import Link from 'next/link'
import Container from '@/src/components/Container'
import Navbar from '@/src/components/Navbar'
import Footer from '@/src/components/Footer'
import ProductCard from '@/src/components/ProductCard'
import { getActiveProducts } from '@/src/lib/supabase/queries'

export default async function ProductsPage() {
  const { products, error } = await getActiveProducts()

  return (
    <>
      <Navbar />
      <main className="products-page">
        <section className="products-hero" data-nav-theme="dark">
          <div className="products-hero-watermark" aria-hidden="true">
            TOOLS
          </div>
          <Container className="relative z-10">
            <p className="eyebrow page-intro">The Not4Normal system</p>
            <h1 className="products-page-title">
              <span className="hero-title-mask">
                <span className="hero-title-line hero-title-line-1">Tools for</span>
              </span>
              <span className="hero-title-mask">
                <span className="hero-title-line hero-title-line-2">the work.</span>
              </span>
            </h1>
            <div className="products-hero-bottom page-intro page-intro-delay-3">
              <p>
                Practical guides for building focus, discipline, and momentum.
                Own them once. Use them for as long as the work takes.
              </p>
              <span>{String(products.length).padStart(2, '0')} releases</span>
            </div>
          </Container>
        </section>

        <section className="products-index" data-nav-theme="light">
          <Container>
            <div className="products-index-header">
              <p className="eyebrow" data-reveal="left">
                Current releases
              </p>
              <p data-reveal="up">
                No endless library. Only tools with a clear job.
              </p>
            </div>

            {error ? (
              <div className="cinematic-empty-state" data-reveal="up">
                <p className="eyebrow">Connection interrupted</p>
                <h2>Products are temporarily unavailable.</h2>
                <p>Please return in a little while.</p>
              </div>
            ) : products.length > 0 ? (
              <div className="products-index-grid">
                {products.map((product, index) => (
                  <ProductCard
                    key={product.id}
                    title={product.title}
                    description={product.shortDescription}
                    price={product.price}
                    slug={product.slug}
                    previews={product.previews}
                    features={product.features}
                    coverImageUrl={product.coverImageUrl}
                    revealDelay={index % 3}
                  />
                ))}
              </div>
            ) : (
              <div className="cinematic-empty-state" data-reveal="up">
                <p className="eyebrow">The first release is coming</p>
                <h2>No products are live yet.</h2>
                <p>The next Not4Normal tool will appear here when it is ready.</p>
              </div>
            )}
          </Container>
        </section>

        <section className="products-closer" data-nav-theme="dark">
          <Container>
            <p className="eyebrow" data-reveal="fade">
              Don&apos;t collect information.
            </p>
            <h2 data-reveal="mask">Use it.</h2>
            <Link href="/#manifesto" className="cinematic-text-link light" data-cursor="ENTER">
              Read the manifesto
              <span aria-hidden="true">↗</span>
            </Link>
          </Container>
        </section>
      </main>
      <Footer />
    </>
  )
}
