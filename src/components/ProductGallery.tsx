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

  const isImageFile = selectedImage.src.match(/\.(jpg|jpeg|png|gif|webp)$/i)

  return (
    <div className="w-full">
      {/* Main Image */}
      <div className="bg-gray-100 border border-gray-200 rounded-lg overflow-hidden mb-6 aspect-square flex items-center justify-center">
        {isImageFile ? (
          <Image
            src={selectedImage.src}
            alt={selectedImage.alt}
            width={500}
            height={500}
            className="w-full h-full object-cover"
            priority
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex flex-col items-center justify-center p-8">
            <div className="text-6xl mb-4">📄</div>
            <h3 className="text-2xl font-bold text-center mb-2">
              {selectedImage.label}
            </h3>
            <p className="text-gray-600 text-center text-sm">
              {selectedImage.alt}
            </p>
          </div>
        )}
      </div>

      {/* Thumbnail Images */}
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3">
        {images.map((image, index) => {
          const isThumbnailImage = image.src.match(/\.(jpg|jpeg|png|gif|webp)$/i)
          return (
            <button
              key={image.id}
              onClick={() => setSelectedImageIndex(index)}
              className={`aspect-square rounded-lg border-2 transition-all overflow-hidden flex flex-col items-center justify-center text-center p-2 ${
                selectedImageIndex === index
                  ? 'border-black bg-gray-50'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
              aria-label={`View ${image.label}`}
            >
              {isThumbnailImage ? (
                <Image
                  src={image.src}
                  alt={image.label}
                  width={100}
                  height={100}
                  className="w-full h-full object-cover"
                />
              ) : (
                <>
                  <div className="text-3xl mb-1">📄</div>
                  <p className="text-xs font-semibold line-clamp-2 leading-tight">
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
