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
      className={`brand-mark ${compact ? 'brand-mark-compact' : ''} ${className}`}
      aria-label="Not4Normal"
    >
      {compact ? 'N4N' : 'NOT4NORMAL'}
    </span>
  )
}
