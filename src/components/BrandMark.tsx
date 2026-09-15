import Image from 'next/image'

interface BrandMarkProps {
  compact?: boolean
  className?: string
  logoUrl?: string
  symbolUrl?: string
  alt?: string
}

export default function BrandMark({
  compact = false,
  className = '',
  logoUrl,
  symbolUrl,
  alt = 'Not4Normal',
}: BrandMarkProps) {
  const imageUrl = compact ? symbolUrl : logoUrl

  if (imageUrl) {
    return (
      <span
        className={`relative inline-block ${compact ? 'h-8 w-8' : 'h-8 w-32'} ${className}`}
      >
        <Image
          src={imageUrl}
          alt={alt}
          fill
          sizes={compact ? '32px' : '160px'}
          className="object-contain"
          priority={false}
        />
      </span>
    )
  }

  return (
    <span
      className={`inline-block font-serif font-semibold tracking-tight ${
        compact ? 'text-xl' : 'text-2xl'
      } ${className}`}
      aria-label="Not4Normal"
    >
      {compact ? 'N4N' : 'Not4Normal'}
    </span>
  )
}
