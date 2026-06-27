import Container from '@/src/components/Container'
import Navbar from '@/src/components/Navbar'
import Footer from '@/src/components/Footer'
import ProductCard from '@/src/components/ProductCard'
import { getProductsWithFallback } from '@/src/lib/supabase/queries'

export default async function ProductsPage() {
  const products = await getProductsWithFallback()

  return (
    <>
      <Navbar />
      <main>
        <section className="py-20">
          <Container>
            <h1 className="text-5xl sm:text-6xl font-bold mb-4">Our Tools</h1>
            <p className="text-lg text-gray-700 mb-16 max-w-2xl">
              Simple, practical guides to help you build better habits and stay
              focused on what matters.
            </p>

            {/* Products Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  title={product.title}
                  description={product.description}
                  price={product.price}
                  slug={product.slug}
                  previews={product.previews}
                  features={product.features}
                  coverImageUrl={product.coverImageUrl}
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
