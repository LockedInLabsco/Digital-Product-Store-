import Container from '@/src/components/Container'
import Navbar from '@/src/components/Navbar'
import Footer from '@/src/components/Footer'
import ProductCard from '@/src/components/ProductCard'
import { getActiveProducts } from '@/src/lib/supabase/queries'
import { getWebsiteMedia } from '@/src/lib/supabase/settings'

export default async function ProductsPage() {
  const { products, error } = await getActiveProducts()
  const media = await getWebsiteMedia()

  return (
    <>
      <Navbar media={media} />
      <main className="bg-ink">
        <section className="border-b border-line/10 py-16 sm:py-20">
          <Container>
            <p className="eyebrow text-gold" data-reveal="up">The Not4Normal system</p>
            <h1 className="mt-4 max-w-2xl font-serif text-4xl text-cream sm:text-5xl" data-reveal="up">
              Tools for the work.
            </h1>
            <p className="mt-4 max-w-xl text-base text-cream/60" data-reveal="up">
              Practical guides for building focus, discipline, and momentum. Own
              them once. Use them for as long as the work takes.
            </p>
          </Container>
        </section>

        <section className="py-16 sm:py-20">
          <Container>
            {error ? (
              <div className="border-y border-line/10 py-16 text-center" data-reveal="up">
                <p className="eyebrow text-cream/40">Connection interrupted</p>
                <h2 className="mt-3 font-serif text-2xl text-cream">
                  Products are temporarily unavailable.
                </h2>
                <p className="mt-2 text-cream/55">Please return in a little while.</p>
              </div>
            ) : products.length > 0 ? (
              <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
                {products.map((product, index) => (
                  <ProductCard
                    key={product.id}
                    id={product.id}
                    title={product.title}
                    description={product.shortDescription}
                    price={product.price}
                    slug={product.slug}
                    previews={product.previews}
                    features={product.features}
                    coverImageUrl={product.coverImageUrl}
                    revealDelay={index % 3}
                    location="products_page"
                  />
                ))}
              </div>
            ) : (
              <div className="border-y border-line/10 py-16 text-center" data-reveal="up">
                <p className="eyebrow text-cream/40">The first release is coming</p>
                <h2 className="mt-3 font-serif text-2xl text-cream">No products are live yet.</h2>
                <p className="mt-2 text-cream/55">
                  The next Not4Normal tool will appear here when it is ready.
                </p>
              </div>
            )}
          </Container>
        </section>
      </main>
      <Footer media={media} />
    </>
  )
}
