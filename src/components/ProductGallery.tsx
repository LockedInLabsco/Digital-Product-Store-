'use client'

import { useState } from 'react'
import Image from 'next/image'
import PathIllustration from './PathIllustration'

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
      <div className="flex aspect-square flex-col items-center justify-center rounded-md border border-line bg-offwhite">
        <PathIllustration variant="focus" className="w-2/3 max-w-[280px] text-cream" />
        <span className="text-sm font-bold text-cream" aria-hidden="true">N4N</span>
        <h3 className="mt-4 font-sans font-bold tracking-tight text-xl text-cream">Preview not available</h3>
        <p className="mt-3 max-w-sm text-center text-sm text-beige">
          A preview for {productTitle} has not been added yet.
        </p>
      </div>
    )
  }

  const isImageFile = selectedImage.src.match(/\.(jpg|jpeg|png|gif|webp)$/i)

  return (
    <div className="w-full">
      <div className="mb-5 aspect-square overflow-hidden rounded-md border border-line bg-offwhite">
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
            <span className="font-sans font-bold tracking-tight text-3xl text-beige" aria-hidden="true">N4N</span>
            <h3 className="mt-4 font-sans font-bold tracking-tight text-xl">{selectedImage.label}</h3>
            <p className="mt-3 max-w-md text-sm text-beige">{selectedImage.alt}</p>
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
              className={`flex aspect-square flex-col items-center justify-center overflow-hidden rounded-md border text-center transition-colors ${
                selectedImageIndex === index
                  ? 'border-cream ring-1 ring-cream'
                  : 'border-neutral-500 hover:border-cream'
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
                  <span className="font-sans font-bold tracking-tight text-lg text-beige" aria-hidden="true">N4N</span>
                  <p className="mt-1 line-clamp-2 px-2 text-[0.65rem] font-semibold text-beige">
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
