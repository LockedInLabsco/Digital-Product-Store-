import Link from 'next/link'
import ProductPreview from './ProductPreview'
import { PreviewItem } from '@/src/types/product'
import { formatPrice } from '@/src/lib/utils/format'

interface ProductCardProps {
  title: string
  description: string
  price: number
  slug: string
  previews: PreviewItem[]
  features?: string[]
  coverImageUrl?: string
  revealDelay?: number
}

export default function ProductCard({
  title,
  description,
  price,
  slug,
  previews,
  coverImageUrl,
  revealDelay = 0,
}: ProductCardProps) {
  return (
    <Link
      href={`/products/${slug}`}
      className="group block h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-4 focus-visible:ring-offset-cream"
      data-reveal="up"
      data-reveal-delay={String(Math.min(revealDelay, 2))}
    >
      <article className="flex h-full flex-col overflow-hidden rounded-sm border border-ink/10 bg-offwhite transition-shadow duration-300 group-hover:shadow-[0_18px_40px_-16px_rgba(21,19,15,0.25)]">
        <ProductPreview
          previews={previews}
          productTitle={title}
          coverImageUrl={coverImageUrl}
        />

        <div className="flex flex-1 flex-col p-5">
          <p className="eyebrow text-gold">Digital Tool</p>
          <h3 className="mt-2 font-serif text-xl leading-snug text-ink">{title}</h3>
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-ink/60">
            {description}
          </p>

          <div className="mt-5 flex items-center justify-between border-t border-ink/10 pt-4">
            <span className="font-serif text-lg text-ink">{formatPrice(price)}</span>
            <span className="flex items-center gap-1 text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-ink/70">
              {price === 0 ? 'Get the guide' : 'View product'}
              <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">→</span>
            </span>
          </div>
        </div>
      </article>
    </Link>
  )
}
