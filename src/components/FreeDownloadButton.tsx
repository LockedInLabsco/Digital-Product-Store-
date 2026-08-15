'use client'

import Button from './Button'
import { useFreeProductClaim } from './FreeProductClaim'

interface FreeDownloadButtonProps {
  productTitle: string
  fullWidth?: boolean
}

export default function FreeDownloadButton({
  productTitle,
  fullWidth = false,
}: FreeDownloadButtonProps) {
  const { openClaim } = useFreeProductClaim()

  return (
    <Button
      type="button"
      size="lg"
      className={fullWidth ? 'w-full' : undefined}
      aria-label={`Claim ${productTitle} for free`}
      data-free-claim-trigger
      onClick={(event) => openClaim(event.currentTarget)}
    >
      Get it for free
    </Button>
  )
}
