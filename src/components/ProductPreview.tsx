'use client'

import { useState, useEffect } from 'react'
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

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % previews.length)
    }, 3000)

    return () => clearInterval(interval)
  }, [previews.length])

  const currentPreview = previews[currentIndex]

  if (coverImageUrl && !imageError) {
    return (
      <div
        className="bg-gray-100 aspect-square rounded-t-lg overflow-hidden flex items-center justify-center"
        data-reveal="image"
      >
        <Image
          src={coverImageUrl}
          alt={productTitle}
          width={500}
          height={500}
          className="product-media-image w-full h-full object-cover"
          onError={() => setImageError(true)}
          priority
        />
      </div>
    )
  }

  if (!currentPreview) {
    return (
      <div
        className="bg-gradient-to-br from-gray-100 to-gray-200 aspect-square flex flex-col items-center justify-center rounded-t-lg overflow-hidden"
        data-reveal="fade"
      >
        <div className="text-5xl mb-3" aria-hidden="true">📄</div>
        <h4 className="text-sm font-semibold text-center text-gray-700 px-4">
          {productTitle}
        </h4>
      </div>
    )
  }

  return (
    <div
      className="bg-gradient-to-br from-gray-100 to-gray-200 aspect-square flex flex-col items-center justify-center rounded-t-lg overflow-hidden transition-all duration-500"
      data-reveal="fade"
    >
      <div className="text-5xl mb-3">{currentPreview.icon}</div>
      <h4 className="text-sm font-semibold text-center text-gray-700 px-4">
        {currentPreview.label}
      </h4>
      {previews.length > 1 && (
        <div className="flex gap-1 mt-4">
          {previews.map((_, index) => (
            <div
              key={index}
              className={`h-1 rounded-full transition-all ${
                index === currentIndex
                  ? 'w-4 bg-gray-400'
                  : 'w-2 bg-gray-300'
              }`}
              aria-label={`Preview ${index + 1} of ${previews.length}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
