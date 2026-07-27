'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'

interface PreviewItem {
  id: string
  label: string
  icon: string
}

interface ProductPreviewProps {
  previews: PreviewItem[]
  productTitle: string
  coverImageUrl?: string
}

export default function ProductPreview({
  previews,
  productTitle,
  coverImageUrl,
}: ProductPreviewProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [imageError, setImageError] = useState(false)

  useEffect(() => {
    if (previews.length <= 1) return

    const interval = window.setInterval(() => {
      setCurrentIndex((previous) => (previous + 1) % previews.length)
    }, 3000)

    return () => window.clearInterval(interval)
  }, [previews.length])

  const currentPreview = previews[currentIndex]

  if (coverImageUrl && !imageError) {
    return (
      <div className="product-media" data-reveal="image">
        <Image
          src={coverImageUrl}
          alt={productTitle}
          width={800}
          height={800}
          quality={95}
          sizes="(max-width: 768px) 100vw, 50vw"
          className="product-media-image"
          onError={() => setImageError(true)}
        />
      </div>
    )
  }

  return (
    <div className="product-media product-media-fallback" data-reveal="image">
      <span className="product-media-watermark" aria-hidden="true">
        N4N
      </span>
      <p>{currentPreview?.label || productTitle}</p>
    </div>
  )
}
