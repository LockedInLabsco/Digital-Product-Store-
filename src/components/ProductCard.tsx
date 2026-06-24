import Link from 'next/link'
import Button from './Button'
import ProductPreview from './ProductPreview'
import { PreviewItem } from '@/src/lib/products'

interface ProductCardProps {
  title: string
  description: string
  price: number
  slug: string
  previews: PreviewItem[]
  features?: string[]
}

export default function ProductCard({
  title,
  description,
  price,
  slug,
  previews,
  features = [],
}: ProductCardProps) {
  return (
    <Link href={`/products/${slug}`}>
      <div className="border border-gray-200 rounded-lg overflow-hidden hover:border-gray-300 hover:shadow-md transition-all duration-200 cursor-pointer h-full flex flex-col bg-white">
        {/* Preview Image Area */}
        <ProductPreview previews={previews} productTitle={title} />

        {/* Content */}
        <div className="p-6 flex flex-col flex-1">
          <div className="flex-1 mb-6">
            <h3 className="text-xl font-bold mb-2 line-clamp-2">{title}</h3>
            <p className="text-gray-600 text-sm mb-4 line-clamp-2">
              {description}
            </p>

            {/* Features List */}
            {features.length > 0 && (
              <ul className="space-y-1 mb-4">
                {features.slice(0, 2).map((feature, index) => (
                  <li
                    key={index}
                    className="text-gray-600 text-xs flex items-start gap-2"
                  >
                    <span className="text-gray-400 flex-shrink-0">→</span>
                    <span className="line-clamp-1">{feature}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex justify-between items-center">
            <span className="text-2xl font-bold">${price}</span>
            <Button variant="outline" size="sm">
              View
            </Button>
          </div>
        </div>
      </div>
    </Link>
  )
}
