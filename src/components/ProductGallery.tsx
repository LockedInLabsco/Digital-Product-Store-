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
      <div className="product-gallery-empty aspect-square" data-reveal="image">
        <span className="display-type text-7xl" aria-hidden="true">
          N4N
        </span>
        <h3 className="display-type mt-4 text-3xl">Preview not available</h3>
        <p className="mt-3 max-w-sm text-center text-sm text-zinc-500">
          A preview for {productTitle} has not been added yet.
        </p>
      </div>
    )
  }

  const isImageFile = selectedImage.src.match(/\.(jpg|jpeg|png|gif|webp)$/i)

  return (
    <div className="w-full">
      <div className="product-gallery-main mb-6 aspect-square" data-reveal="image">
        {isImageFile ? (
          <Image
            key={selectedImage.id}
            src={selectedImage.src}
            alt={selectedImage.alt}
            width={1000}
            height={1000}
            quality={95}
            sizes="(max-width: 1024px) 100vw, 66vw"
            className="gallery-image-swap h-full w-full object-cover grayscale"
            priority
          />
        ) : (
          <div
            key={selectedImage.id}
            className="gallery-image-swap flex h-full w-full flex-col items-center justify-center bg-zinc-900 p-8 text-white"
          >
            <span className="display-type text-7xl" aria-hidden="true">
              N4N
            </span>
            <h3 className="display-type mt-4 text-3xl text-center">
              {selectedImage.label}
            </h3>
            <p className="mt-3 max-w-md text-center text-sm text-zinc-400">
              {selectedImage.alt}
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5">
        {images.map((image, index) => {
          const isThumbnailImage = image.src.match(
            /\.(jpg|jpeg|png|gif|webp)$/i
          )

          return (
            <button
              key={image.id}
              type="button"
              onClick={() => setSelectedImageIndex(index)}
              className={`motion-thumbnail flex aspect-square flex-col items-center justify-center overflow-hidden border text-center ${
                selectedImageIndex === index
                  ? 'border-black bg-black text-white'
                  : 'border-zinc-300 bg-white hover:border-black'
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
                  className="h-full w-full object-cover grayscale"
                />
              ) : (
                <>
                  <span className="display-type text-2xl" aria-hidden="true">
                    N4N
                  </span>
                  <p className="mt-1 line-clamp-2 px-2 text-xs font-semibold">
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
