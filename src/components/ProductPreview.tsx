'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import PathIllustration from './PathIllustration'

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
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-charcoal">
        <Image
          src={coverImageUrl}
          alt={productTitle}
          width={800}
          height={600}
          quality={95}
          sizes="(max-width: 768px) 100vw, 33vw"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          onError={() => setImageError(true)}
        />
      </div>
    )
  }

  return (
    <div className="flex aspect-[4/3] w-full flex-col items-center justify-center bg-charcoal p-6 text-center">
      <PathIllustration variant="focus" className="w-3/4 max-w-[240px] text-cream" />
      <span className="text-sm font-bold tracking-tight text-cream">N4N</span>
      <p className="mt-2 text-sm font-medium text-beige">{currentPreview?.label || productTitle}</p>
    </div>
  )
}
