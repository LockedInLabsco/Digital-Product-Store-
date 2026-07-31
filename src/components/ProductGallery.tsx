'use client'

import { useState } from 'react'
import Image from 'next/image'

interface GalleryImage {
  id: string
  src: string
  label: string
  alt: string
}

interface ProductGalleryProps {
  images: GalleryImage[]
  productTitle: string
}

export default function ProductGallery({
  images,
  productTitle,
}: ProductGalleryProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const selectedImage = images[selectedImageIndex]

  if (!selectedImage) {
    return (
      <div className="flex aspect-square flex-col items-center justify-center rounded-sm border border-cream/10 bg-offwhite">
        <span className="font-serif text-3xl text-cream/25" aria-hidden="true">N4N</span>
        <h3 className="mt-4 font-serif text-xl text-cream">Preview not available</h3>
        <p className="mt-3 max-w-sm text-center text-sm text-cream/50">
          A preview for {productTitle} has not been added yet.
        </p>
      </div>
    )
  }

  const isImageFile = selectedImage.src.match(/\.(jpg|jpeg|png|gif|webp)$/i)

  return (
    <div className="w-full">
      <div className="mb-5 aspect-square overflow-hidden rounded-sm border border-cream/10 bg-offwhite">
        {isImageFile ? (
          <Image
            key={selectedImage.id}
            src={selectedImage.src}
            alt={selectedImage.alt}
            width={1000}
            height={1000}
            quality={95}
            sizes="(max-width: 1024px) 100vw, 55vw"
            className="h-full w-full object-cover"
            priority
          />
        ) : (
          <div
            key={selectedImage.id}
            className="flex h-full w-full flex-col items-center justify-center bg-charcoal p-8 text-center text-cream"
          >
            <span className="font-serif text-3xl text-cream/30" aria-hidden="true">N4N</span>
            <h3 className="mt-4 font-serif text-xl">{selectedImage.label}</h3>
            <p className="mt-3 max-w-md text-sm text-cream/55">{selectedImage.alt}</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-4 gap-3 sm:grid-cols-5">
        {images.map((image, index) => {
          const isThumbnailImage = image.src.match(
            /\.(jpg|jpeg|png|gif|webp)$/i
          )

          return (
            <button
              key={image.id}
              type="button"
              onClick={() => setSelectedImageIndex(index)}
              className={`flex aspect-square flex-col items-center justify-center overflow-hidden rounded-sm border text-center transition-colors ${
                selectedImageIndex === index
                  ? 'border-gold'
                  : 'border-cream/15 hover:border-cream/40'
              }`}
              aria-label={`View ${image.label}`}
            >
              {isThumbnailImage ? (
                <Image
                  src={image.src}
                  alt={image.label}
                  width={160}
                  height={160}
                  quality={90}
                  className="h-full w-full object-cover"
                />
              ) : (
                <>
                  <span className="font-serif text-lg text-cream/30" aria-hidden="true">N4N</span>
                  <p className="mt-1 line-clamp-2 px-2 text-[0.65rem] font-semibold text-cream/60">
                    {image.label}
                  </p>
                </>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
