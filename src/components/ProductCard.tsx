import Link from 'next/link'
import Button from './Button'
import ProductPreview from './ProductPreview'
import { PreviewItem } from '@/src/types/product'
import { formatPrice, getPriceLabel } from '@/src/lib/utils/format'

interface ProductCardProps {
  title: string
  description: string
  price: number
  slug: string
  previews: PreviewItem[]
  features?: string[]
  coverImageUrl?: string
}

export default function ProductCard({
  title,
  description,
  price,
  slug,
  previews,
  features = [],
  coverImageUrl,
}: ProductCardProps) {
  return (
    <Link
      href={`/products/${slug}`}
      className="block h-full product-card rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
      data-reveal="up"
    >
      <div className="border border-gray-200 rounded-lg overflow-hidden h-full flex flex-col bg-white">
        {/* Preview Image Area */}
        <ProductPreview previews={previews} productTitle={title} coverImageUrl={coverImageUrl} />

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
            <span className="text-2xl font-bold">{formatPrice(price)}</span>
            <Button variant="outline" size="sm">
              {price === 0 ? 'Get Free Guide' : 'Get Access'}
            </Button>
          </div>
        </div>
      </div>
    </Link>
  )
}
