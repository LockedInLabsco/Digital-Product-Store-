import Link from 'next/link'
import Button from './Button'

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
    <Link href={`/products/${slug}`}>
      <div className="border border-gray-200 rounded-lg p-6 hover:border-gray-300 hover:shadow-md transition-all duration-200 cursor-pointer h-full flex flex-col">
        <div className="flex-1">
          <h3 className="text-xl font-bold mb-2 line-clamp-2">{title}</h3>
          <p className="text-gray-600 text-sm mb-6 line-clamp-2">{description}</p>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-2xl font-bold">${price}</span>
          <span className="text-black text-lg">→</span>
        </div>
      </div>
    </Link>
  )
}
