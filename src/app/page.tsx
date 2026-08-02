import Link from 'next/link'
import Image from 'next/image'
import Container from '@/src/components/Container'
import Navbar from '@/src/components/Navbar'
import Footer from '@/src/components/Footer'
import ProductCard from '@/src/components/ProductCard'
import NewsletterForm from '@/src/components/NewsletterForm'
import HeroImageSlider from '@/src/components/home/HeroImageSlider'
import { getActiveProducts } from '@/src/lib/supabase/queries'
import { getWebsiteMedia, getHeroSliderImages } from '@/src/lib/supabase/settings'

const CATEGORIES = [
  {
    title: 'Focus & Productivity',
    description: 'Systems to cut distraction and get deep work done on repeat.',
  },
  {
    title: 'Habits & Discipline',
    description: 'Frameworks for building routines that hold up under pressure.',
  },
  {
    title: 'Personal Growth',
    description: 'Practical resources for the long, unglamorous work of change.',
  },
  {
    title: 'Templates & Systems',
    description: 'Ready-to-use structures so you spend your time doing, not designing.',
  },
]

const BENEFITS = [
  'Build stronger daily systems',
  'Improve focus and cut noise',
  'Stay consistent when motivation fades',
  'Make progress with practical tools',
  'Create your own path',
]

export default async function Home() {
  const { products, error } = await getActiveProducts()
  const media = await getWebsiteMedia()
  const heroSliderImages = await getHeroSliderImages()
  const featuredProducts = products.slice(0, 6)

  return (
    <>
      <Navbar media={media} />
      <main>
        {/* Hero */}
        <section className="glow-top border-b border-line/10 bg-ink">
          <Container className="grid grid-cols-1 items-center gap-12 py-20 sm:py-24 lg:grid-cols-2 lg:gap-16 lg:py-28">
            <div data-reveal="up">
              <p className="eyebrow text-gold">For the ones who refuse the default</p>
              <h1 className="mt-5 font-serif text-5xl leading-[1.08] text-cream sm:text-6xl lg:text-[3.75rem]">
                Not made for normal.
              </h1>
              <p className="mt-5 max-w-md text-lg text-cream/70">
                Build better systems. Create your own path.
              </p>
              <p className="mt-3 max-w-md text-base text-cream/55">
                Premium digital tools for focus, discipline, habits, and personal
                growth.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link
                  href="/products"
                  className="inline-flex items-center justify-center rounded-sm bg-gold px-7 py-4 text-xs font-semibold uppercase tracking-[0.12em] text-cream transition-colors hover:bg-gold-hover"
                >
                  Explore Products
                </Link>
                <Link
                  href="/#about"
                  className="inline-flex items-center justify-center rounded-sm border border-line/25 px-7 py-4 text-xs font-semibold uppercase tracking-[0.12em] text-cream transition-colors hover:border-line hover:bg-gold/10"
                >
                  Discover the Brand
                </Link>
              </div>
            </div>

            <HeroImageSlider
              images={heroSliderImages}
              fallbackImageUrl={media.hero_image_url}
              fallbackImageAlt={media.hero_image_alt}
            />
          </Container>
        </section>

        {/* About / brand introduction */}
        <section id="about" className="scroll-mt-20 bg-offwhite py-20 sm:py-24">
          <Container
            className={
              media.about_image_url
                ? 'grid grid-cols-1 gap-10 lg:grid-cols-2 lg:items-center lg:gap-16'
                : 'grid grid-cols-1 gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16'
            }
          >
            {media.about_image_url ? (
              <div className="relative aspect-[4/5] w-full overflow-hidden rounded-sm" data-reveal="fade">
                <Image
                  src={media.about_image_url}
                  alt={media.about_image_alt || 'Not4Normal'}
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover"
                />
              </div>
            ) : (
              <p className="eyebrow text-gold" data-reveal="up">About Not4Normal</p>
            )}
            <div data-reveal="up">
              {media.about_image_url && (
                <p className="eyebrow text-gold mb-4">About Not4Normal</p>
              )}
              <p className="font-serif text-2xl leading-relaxed text-cream sm:text-3xl">
                Not4Normal creates practical digital tools for people who refuse to
                settle for average.
              </p>
              <p className="mt-5 max-w-2xl text-base leading-relaxed text-cream/65">
                The products help users improve focus, build discipline, develop
                better habits, and create their own path — no noise, no
                subscriptions, no complicated systems.
              </p>
            </div>
          </Container>
        </section>

        {/* Featured products */}
        <section className="bg-ink py-20 sm:py-24">
          <Container>
            <div className="mb-12 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
              <div data-reveal="up">
                <p className="eyebrow text-gold">Featured</p>
                <h2 className="mt-3 font-serif text-3xl text-cream sm:text-4xl">
                  Tools for the work.
                </h2>
              </div>
              <Link
                href="/products"
                className="text-xs font-semibold uppercase tracking-[0.1em] text-cream/70 underline underline-offset-4 transition-colors hover:text-gold"
              >
                View all products
              </Link>
            </div>

            {error ? (
              <div className="border-y border-line/10 py-16 text-center" data-reveal="up">
                <p className="eyebrow text-cream/40">Connection interrupted</p>
                <h3 className="mt-3 font-serif text-2xl text-cream">
                  Products are temporarily unavailable.
                </h3>
                <p className="mt-2 text-cream/55">Please return in a little while.</p>
              </div>
            ) : featuredProducts.length > 0 ? (
              <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
                {featuredProducts.map((product, index) => (
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
              <div className="border-y border-line/10 py-16 text-center" data-reveal="up">
                <p className="eyebrow text-cream/40">The first release is coming</p>
                <h3 className="mt-3 font-serif text-2xl text-cream">No products are live yet.</h3>
                <p className="mt-2 text-cream/55">
                  The next Not4Normal tool will appear here when it is ready.
                </p>
              </div>
            )}
          </Container>
        </section>

        {/* Product categories */}
        <section className="bg-offwhite py-20 sm:py-24">
          <Container>
            <div className="mb-12" data-reveal="up">
              <p className="eyebrow text-gold">What we create</p>
              <h2 className="mt-3 font-serif text-3xl text-cream sm:text-4xl">
                Built with a clear job.
              </h2>
            </div>
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {CATEGORIES.map((category, index) => (
                <div
                  key={category.title}
                  className="border-t border-gold/50 pt-5"
                  data-reveal="up"
                  data-reveal-delay={String(index % 2)}
                >
                  <h3 className="font-serif text-lg text-cream">{category.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-cream/60">
                    {category.description}
                  </p>
                </div>
              ))}
            </div>
          </Container>
        </section>

        {/* Benefits */}
        <section className="bg-ink py-20 sm:py-24">
          <Container className="grid grid-cols-1 gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
            <div data-reveal="up">
              <p className="eyebrow text-gold">Why Not4Normal</p>
              <h2 className="mt-3 font-serif text-3xl text-cream sm:text-4xl">
                Practical progress, not noise.
              </h2>
            </div>
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2" data-reveal="up">
              {BENEFITS.map((benefit) => (
                <li
                  key={benefit}
                  className="flex items-start gap-3 border-b border-line/10 pb-4 text-cream/75"
                >
                  <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-gold" aria-hidden="true" />
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
          </Container>
        </section>

        {/* Manifesto */}
        <section id="manifesto" className="relative scroll-mt-20 overflow-hidden bg-ink py-20 text-cream sm:py-24">
          {media.manifesto_image_url && (
            <>
              <Image
                src={media.manifesto_image_url}
                alt={media.manifesto_image_alt || ''}
                fill
                sizes="100vw"
                className="object-cover"
                aria-hidden="true"
              />
              <div className="absolute inset-0 bg-ink/70" aria-hidden="true" />
            </>
          )}
          <Container className="relative max-w-3xl text-center">
            <p className="eyebrow text-gold" data-reveal="fade">This is your move</p>
            <h2 className="mt-5 font-serif text-3xl leading-snug sm:text-4xl" data-reveal="up">
              Normal is the default.
              <br />
              Your path does not have to be.
            </h2>
            <p className="mt-5 text-cream/60" data-reveal="up">
              You were not made to repeat someone else&apos;s path.
            </p>
          </Container>
        </section>

        {/* Newsletter */}
        <section className="relative overflow-hidden bg-charcoal py-16 text-cream sm:py-20">
          {media.newsletter_image_url && (
            <>
              <Image
                src={media.newsletter_image_url}
                alt={media.newsletter_image_alt || ''}
                fill
                sizes="100vw"
                className="object-cover"
                aria-hidden="true"
              />
              <div className="absolute inset-0 bg-charcoal/75" aria-hidden="true" />
            </>
          )}
          <Container className="relative flex flex-col items-center gap-6 text-center">
            <div data-reveal="up">
              <h2 className="font-serif text-2xl sm:text-3xl">Join the Not4Normal Community</h2>
              <p className="mt-3 max-w-md text-sm text-cream/60">
                Get new tools, ideas, and product releases directly in your inbox.
              </p>
            </div>
            <div data-reveal="up">
              <NewsletterForm />
            </div>
          </Container>
        </section>

        {/* Final CTA */}
        <section className="relative overflow-hidden bg-ink py-16 sm:py-20">
          {media.final_cta_image_url && (
            <>
              <Image
                src={media.final_cta_image_url}
                alt={media.final_cta_image_alt || ''}
                fill
                sizes="100vw"
                className="object-cover"
                aria-hidden="true"
              />
              <div className="absolute inset-0 bg-ink/80" aria-hidden="true" />
            </>
          )}
          <Container className="relative flex flex-col items-center gap-6 text-center">
            <h2 className="font-serif text-3xl text-cream sm:text-4xl" data-reveal="up">
              Create Your Own Path.
            </h2>
            <Link
              href="/products"
              className="inline-flex items-center justify-center rounded-sm bg-gold px-8 py-4 text-xs font-semibold uppercase tracking-[0.12em] text-cream transition-colors hover:bg-gold-hover"
              data-reveal="up"
            >
              Explore Products
            </Link>
          </Container>
        </section>
      </main>
      <Footer media={media} />
    </>
  )
}
