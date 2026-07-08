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
    // Load Paddle JS SDK
    const script = document.createElement('script')
    script.src = 'https://cdn.paddle.com/paddle/v2/paddle.js'
    script.async = true
    script.onload = () => {
      const clientToken = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN
      const environment = (process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT || 'sandbox') as
        | 'production'
        | 'sandbox'

      if (!clientToken) {
        console.error('❌ NEXT_PUBLIC_PADDLE_CLIENT_TOKEN not configured')
        return
      }

      if (window.Paddle) {
        console.log('✅ Initializing Paddle with environment:', environment)
        window.Paddle.initialize({
          token: clientToken,
          environment: environment,
        })
      }
    }
    document.head.appendChild(script)
  }, [])

  const handleCheckout = async () => {
    if (!window.Paddle) {
      console.error('❌ Paddle not loaded')
      return
    }

    if (!paddlePriceId) {
      console.error('❌ Paddle price ID not configured for this product')
      alert('This product is not configured for purchase. Please contact support.')
      return
    }

    setIsLoading(true)
    console.log(`🛒 Opening Paddle checkout for: ${productTitle}`)
    console.log(`   Price ID: ${paddlePriceId}`)

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
      console.error('❌ Paddle checkout error:', error)
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
