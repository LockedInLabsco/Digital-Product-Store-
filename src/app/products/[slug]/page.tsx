interface ProductPageProps {
  params: {
    slug: string
  }
}

export default function ProductPage({ params }: ProductPageProps) {
  return (
    <main>
      <h1>Product: {params.slug}</h1>
      <p>Product details page.</p>
    </main>
  )
}
