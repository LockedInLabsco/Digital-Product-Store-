'use client'

import { useRef } from 'react'
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
  const cardRef = useRef<HTMLAnchorElement>(null)

  const handlePointerMove = (event: React.PointerEvent<HTMLAnchorElement>) => {
    if (event.pointerType !== 'mouse' || !cardRef.current) return

    const rect = cardRef.current.getBoundingClientRect()
    const x = (event.clientX - rect.left) / rect.width - 0.5
    const y = (event.clientY - rect.top) / rect.height - 0.5

    cardRef.current.style.setProperty('--card-x', `${x * 8}px`)
    cardRef.current.style.setProperty('--card-y', `${y * 8}px`)
  }

  const resetPointer = () => {
    cardRef.current?.style.setProperty('--card-x', '0px')
    cardRef.current?.style.setProperty('--card-y', '0px')
  }

  return (
    <Link
      ref={cardRef}
      href={`/products/${slug}`}
      className="product-card block h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-4"
      data-reveal="up"
      data-reveal-delay={String(Math.min(revealDelay, 3))}
      data-cursor="VIEW"
      onPointerMove={handlePointerMove}
      onPointerLeave={resetPointer}
    >
      <article className="product-card-surface h-full">
        <ProductPreview
          previews={previews}
          productTitle={title}
          coverImageUrl={coverImageUrl}
        />

        <div className="product-card-copy">
          <p className="eyebrow">Digital tool</p>
          <h3 className="product-card-title">{title}</h3>
          <p className="product-card-description">{description}</p>

          <div className="product-card-footer">
            <span className="product-card-price">{formatPrice(price)}</span>
            <span className="product-card-link">
              {price === 0 ? 'Get the guide' : 'View product'}
              <span aria-hidden="true">↗</span>
            </span>
          </div>
        </div>
      </article>
    </Link>
  )
}
