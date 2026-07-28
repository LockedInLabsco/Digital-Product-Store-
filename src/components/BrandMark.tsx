interface BrandMarkProps {
  compact?: boolean
  className?: string
}

export default function BrandMark({
  compact = false,
  className = '',
}: BrandMarkProps) {
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
