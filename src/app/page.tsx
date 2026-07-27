import Image from 'next/image'
import Link from 'next/link'
import Container from '@/src/components/Container'
import Navbar from '@/src/components/Navbar'
import Footer from '@/src/components/Footer'
import ProductCard from '@/src/components/ProductCard'
import BrandMark from '@/src/components/BrandMark'
import { getActiveProducts } from '@/src/lib/supabase/queries'

export default async function Home() {
  const { products, error } = await getActiveProducts()

  return (
    <>
      <Navbar />
      <main className="cinematic-home">
        <section className="cinematic-hero" data-nav-theme="dark">
          <div className="hero-background" aria-hidden="true">
            <Image
              src="/campaign/hero-athlete.jpg"
              alt=""
              fill
              priority
              quality={95}
              sizes="100vw"
              className="hero-background-image"
            />
          </div>
          <div className="hero-overlay" aria-hidden="true" />

          <Container className="hero-content">
            <div className="hero-brand page-intro">
              <BrandMark />
              <span>Est. 2026</span>
            </div>

            <div className="hero-copy">
              <p className="eyebrow page-intro">For the ones who refuse the default</p>
              <h1 className="hero-title" aria-label="Not made for normal">
                <span className="hero-title-mask">
                  <span className="hero-title-line hero-title-line-1">Not made</span>
                </span>
                <span className="hero-title-mask">
                  <span className="hero-title-line hero-title-line-2">for normal</span>
                </span>
              </h1>
              <p className="hero-description page-intro page-intro-delay-2">
                Tools for people building their way out.
              </p>
              <div className="hero-actions page-intro page-intro-delay-3">
                <Link
                  href="/products"
                  className="cinematic-cta cinematic-cta-light"
                  data-cursor="ENTER"
                >
                  Explore products
                  <span aria-hidden="true">↗</span>
                </Link>
                <span className="hero-brand-line">Create your own path</span>
              </div>
            </div>

            <div className="hero-scroll-cue" aria-hidden="true">
              <span>Scroll to begin</span>
              <div />
            </div>
          </Container>
        </section>

        <section
          id="manifesto"
          className="manifesto-section"
          data-nav-theme="light"
        >
          <div className="manifesto-watermark" aria-hidden="true">
            N4N
          </div>
          <div className="manifesto-sticky">
            <Container>
              <div className="manifesto-header">
                <p className="eyebrow" data-reveal="left">
                  01 — Manifesto
                </p>
                <p className="manifesto-note" data-reveal="up">
                  Normal is a script. Discipline is how you write your own.
                </p>
              </div>

              <h2 className="manifesto-title">
                <span data-reveal="mask">You were not built</span>
                <span data-reveal="mask" data-reveal-delay="1">
                  to follow the
                </span>
                <span data-reveal="mask" data-reveal-delay="2">
                  normal path.
                </span>
              </h2>
            </Container>
          </div>
        </section>

        <section className="kinetic-strip" data-nav-theme="dark" aria-label="Brand statement">
          <div className="kinetic-track">
            <span>CREATE YOUR OWN PATH</span>
            <span aria-hidden="true">CREATE YOUR OWN PATH</span>
            <span aria-hidden="true">CREATE YOUR OWN PATH</span>
          </div>
        </section>

        <section className="discipline-section" data-nav-theme="dark">
          <Container className="discipline-grid">
            <div className="discipline-image-frame" data-reveal="image">
              <Image
                src="/campaign/discipline-athlete.jpg"
                alt="Athlete recovering after an intense stair workout in the rain"
                fill
                quality={95}
                sizes="(max-width: 1024px) 100vw, 52vw"
                className="discipline-image"
              />
              <div className="discipline-image-index">02 / Discipline</div>
            </div>

            <div className="discipline-copy">
              <p className="eyebrow" data-reveal="left">
                The work starts after the excuse
              </p>
              <h2 className="discipline-title">
                <span data-reveal="mask">When your mind</span>
                <span data-reveal="mask" data-reveal-delay="1">
                  tells you to stop,
                </span>
                <span data-reveal="mask" data-reveal-delay="2">
                  you are only
                </span>
                <span data-reveal="mask" data-reveal-delay="3">
                  getting started.
                </span>
              </h2>
              <p className="discipline-body" data-reveal="up">
                No borrowed motivation. No performance for the crowd. Just
                practical systems for the work nobody else can do for you.
              </p>
            </div>
          </Container>
        </section>

        <section className="product-showcase" data-nav-theme="light">
          <Container>
            <div className="section-heading">
              <div>
                <p className="eyebrow" data-reveal="left">
                  03 — The tools
                </p>
                <h2 className="section-display-title" data-reveal="mask">
                  Built for action.
                </h2>
              </div>
              <p className="section-heading-copy" data-reveal="up">
                Focused digital tools. No noise, no subscriptions, no
                complicated systems.
              </p>
            </div>

            {error ? (
              <div className="cinematic-empty-state" data-reveal="up">
                <p className="eyebrow">Connection interrupted</p>
                <h3>Products are temporarily unavailable.</h3>
                <p>Please return in a little while.</p>
              </div>
            ) : products.length > 0 ? (
              <div className="product-showcase-grid">
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
                <h3>No products are live yet.</h3>
                <p>The next Not4Normal tool will appear here when it is ready.</p>
              </div>
            )}

            <div className="product-showcase-footer" data-reveal="up">
              <Link
                href="/products"
                className="cinematic-text-link"
                data-cursor="VIEW"
              >
                View all products
                <span aria-hidden="true">↗</span>
              </Link>
            </div>
          </Container>
        </section>

        <section className="closing-statement" data-nav-theme="dark">
          <Container>
            <p className="eyebrow" data-reveal="fade">
              This is your move.
            </p>
            <h2 className="closing-title">
              <span data-reveal="mask">Nobody is coming.</span>
              <span data-reveal="mask" data-reveal-delay="1">
                Build your way out.
              </span>
            </h2>
            <Link
              href="/products"
              className="cinematic-cta cinematic-cta-light"
              data-cursor="ENTER"
              data-reveal="up"
            >
              Start with a tool
              <span aria-hidden="true">↗</span>
            </Link>
          </Container>
        </section>
      </main>
      <Footer />
    </>
  )
}
