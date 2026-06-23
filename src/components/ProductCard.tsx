interface ProductCardProps {
  title: string
  description: string
  price: number
  slug: string
}

export default function ProductCard({
  title,
  description,
  price,
  slug,
}: ProductCardProps) {
  return (
    <div className="border border-gray-200 rounded p-6 hover:border-gray-300 transition-colors">
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-gray-600 text-sm mb-4">{description}</p>
      <div className="flex justify-between items-center">
        <span className="text-lg font-bold">${price}</span>
        <a
          href={`/products/${slug}`}
          className="text-black underline hover:no-underline"
        >
          View →
        </a>
      </div>
    </div>
  )
}
