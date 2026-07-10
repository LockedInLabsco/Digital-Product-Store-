'use client'

import { useEffect, useState } from 'react'
import Button from './Button'

interface PaidProductButtonProps {
  productSlug: string
  productTitle: string
  paddlePriceId: string
  price: number
  variant?: 'primary' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
  buttonText?: string
}

declare global {
  interface Window {
    Paddle?: any
  }
}

const PADDLE_SCRIPT_SRC = 'https://cdn.paddle.com/paddle/v2/paddle.js'

function getPaddleEnvironment(): 'production' | 'sandbox' {
  const configuredEnvironment = process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT || 'sandbox'

  if (configuredEnvironment === 'live') {
    return 'production'
  }

  return configuredEnvironment === 'production' ? 'production' : 'sandbox'
}

export default function PaidProductButton({
  productSlug,
  productTitle,
  paddlePriceId,
  price,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  buttonText,
}: PaidProductButtonProps) {
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const clientToken = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN
    const environment = getPaddleEnvironment()

    const initializePaddle = () => {
      if (!clientToken) {
        console.error('Paddle checkout is not configured: NEXT_PUBLIC_PADDLE_CLIENT_TOKEN is missing')
        return
      }

      if (!window.Paddle) {
        console.error('Paddle checkout is not available: Paddle.js did not load')
        return
      }

      if (window.Paddle.Environment?.set) {
        window.Paddle.Environment.set(environment)
      }

      window.Paddle.Initialize({
        token: clientToken,
      })

      console.log('[Paddle] Initialized checkout', {
        environment,
        clientTokenConfigured: Boolean(clientToken),
      })
    }

    if (window.Paddle) {
      initializePaddle()
      return
    }

    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[src="${PADDLE_SCRIPT_SRC}"]`
    )

    if (existingScript) {
      existingScript.addEventListener('load', initializePaddle, { once: true })
      return () => {
        existingScript.removeEventListener('load', initializePaddle)
      }
    }

    const script = document.createElement('script')
    script.src = PADDLE_SCRIPT_SRC
    script.async = true
    script.onload = initializePaddle
    script.onerror = () => {
      console.error('Paddle checkout is not available: failed to load Paddle.js')
    }
    document.head.appendChild(script)
  }, [])

  const handleCheckout = async () => {
    const environment = getPaddleEnvironment()

    if (!window.Paddle) {
      console.error('Paddle checkout is not available: Paddle.js is not loaded')
      alert('Checkout is still loading. Please try again in a moment.')
      return
    }

    if (!paddlePriceId) {
      console.error('Paddle checkout is not configured: missing paddle_price_id', {
        productSlug,
        productTitle,
      })
      alert('This product is not configured for purchase. Please contact support.')
      return
    }

    if (!paddlePriceId.startsWith('pri_')) {
      console.error('Paddle checkout is not configured: paddle_price_id must start with pri_', {
        productSlug,
        productTitle,
        paddlePriceId,
      })
      alert('This product checkout is not configured correctly. Please contact support.')
      return
    }

    setIsLoading(true)
    console.log('[Paddle] Opening checkout', {
      productSlug,
      productPrice: price,
      paddlePriceId,
      environment,
    })

    try {
      window.Paddle.Checkout.open({
        items: [
          {
            priceId: paddlePriceId,
            quantity: 1,
          },
        ],
      })
    } catch (error) {
      console.error('Paddle checkout error:', error)
      alert('Failed to open checkout. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const displayText = buttonText || `Get Access - $${price.toFixed(2)}`

  return (
    <Button
      onClick={handleCheckout}
      disabled={isLoading}
      variant={variant}
      size={size}
      className={`${fullWidth ? 'w-full' : ''} ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {isLoading ? 'Loading...' : displayText}
    </Button>
  )
}
