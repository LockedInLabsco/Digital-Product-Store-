'use client'

import { useEffect, useState } from 'react'
import Button from './Button'

interface PaidProductButtonProps {
  productSlug: string
  productTitle: string
  paddleProductId?: string
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
    __not4normalPaddleInitialized?: boolean
  }
}

const PADDLE_SCRIPT_SRC = 'https://cdn.paddle.com/paddle/v2/paddle.js'

function getPaddleEnvironment(): 'production' | 'sandbox' {
  const configuredEnvironment = (
    process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT || 'sandbox'
  ).trim().toLowerCase()

  if (configuredEnvironment === 'live') {
    return 'production'
  }

  return configuredEnvironment === 'production' ? 'production' : 'sandbox'
}

function getConfiguredPaddleEnvironment(): string {
  return process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT || ''
}

function getPaddleClientToken(): string {
  return process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN || ''
}

function logPaddleEvent(event: any) {
  const eventName = event?.name

  if (
    eventName === 'checkout.error' ||
    eventName === 'checkout.payment.error' ||
    eventName === 'checkout.payment.failed' ||
    eventName === 'checkout.warning'
  ) {
    console.error('[Paddle] Checkout event', eventName, event)
    return
  }

  console.log('[Paddle] Checkout event', eventName || 'unknown', event)
}

function initializePaddle() {
  const clientToken = getPaddleClientToken()
  const configuredEnvironment = getConfiguredPaddleEnvironment()
  const environment = getPaddleEnvironment()

  if (!clientToken) {
    console.error('Paddle checkout is not configured: NEXT_PUBLIC_PADDLE_CLIENT_TOKEN is missing')
    return
  }

  if (!window.Paddle) {
    console.error('Paddle checkout is not available: Paddle.js did not load')
    return
  }

  if (window.__not4normalPaddleInitialized) {
    console.log('[Paddle] Already initialized', {
      NEXT_PUBLIC_PADDLE_ENVIRONMENT: configuredEnvironment,
      environment,
      clientTokenExists: Boolean(clientToken),
    })
    return
  }

  try {
    console.log('[Paddle] Initializing checkout', {
      NEXT_PUBLIC_PADDLE_ENVIRONMENT: configuredEnvironment,
      normalizedEnvironment: environment,
      clientTokenExists: Boolean(clientToken),
      clientTokenPrefix: clientToken.slice(0, 4),
      initializeUsesTokenFrom: 'NEXT_PUBLIC_PADDLE_CLIENT_TOKEN',
      environmentAppliedWith:
        environment === 'sandbox'
          ? 'Paddle.Environment.set("sandbox") before Paddle.Initialize'
          : 'Paddle production default',
    })

    if (environment === 'sandbox') {
      window.Paddle.Environment.set('sandbox')
    }

    window.Paddle.Initialize({
      token: clientToken,
      eventCallback: logPaddleEvent,
    })

    window.__not4normalPaddleInitialized = true

    console.log('[Paddle] Initialized checkout', {
      NEXT_PUBLIC_PADDLE_ENVIRONMENT: configuredEnvironment,
      environment,
      clientTokenExists: Boolean(clientToken),
      tokenPrefix: clientToken.slice(0, 4),
    })
  } catch (error) {
    console.error('[Paddle] Initialize error', error)
  }
}

export default function PaidProductButton({
  productSlug,
  productTitle,
  paddleProductId,
  paddlePriceId,
  price,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  buttonText,
}: PaidProductButtonProps) {
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
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
    script.onerror = (error) => {
      console.error('Paddle checkout is not available: failed to load Paddle.js', error)
    }
    document.head.appendChild(script)
  }, [])

  const handleCheckout = async () => {
    const configuredEnvironment = getConfiguredPaddleEnvironment()
    const environment = getPaddleEnvironment()
    const clientToken = getPaddleClientToken()

    if (!window.Paddle) {
      console.error('Paddle checkout is not available: Paddle.js is not loaded')
      alert('Checkout is still loading. Please try again in a moment.')
      return
    }

    if (!window.__not4normalPaddleInitialized) {
      initializePaddle()
    }

    if (!paddlePriceId) {
      console.error('Paddle checkout is not configured: missing paddle_price_id', {
        productSlug,
        productTitle,
        paddleProductId,
      })
      alert('This product is not configured for purchase. Please contact support.')
      return
    }

    if (!paddlePriceId.startsWith('pri_')) {
      console.error('Paddle checkout is not configured: paddle_price_id must start with pri_', {
        productSlug,
        productTitle,
        paddleProductId,
        paddlePriceId,
      })
      alert('This product checkout is not configured correctly. Please contact support.')
      return
    }

    const checkoutItems = [
      {
        priceId: paddlePriceId,
        quantity: 1,
      },
    ]

    const checkoutOptions = {
      settings: {
        displayMode: 'overlay',
      },
      items: checkoutItems,
    }

    setIsLoading(true)
    console.log('[Paddle] Opening checkout', {
      NEXT_PUBLIC_PADDLE_ENVIRONMENT: configuredEnvironment,
      paddleEnvironment: environment,
      clientTokenExists: Boolean(clientToken),
      productTitle,
      productSlug,
      productPrice: price,
      paddleProductId,
      paddlePriceId,
      checkoutItems,
      checkoutOptions,
    })

    try {
      window.Paddle.Checkout.open(checkoutOptions)
    } catch (error) {
      console.error('[Paddle] Checkout.open threw an error', {
        error,
        checkoutOptions,
        NEXT_PUBLIC_PADDLE_ENVIRONMENT: configuredEnvironment,
        paddleEnvironment: environment,
        clientTokenExists: Boolean(clientToken),
        productTitle,
        productSlug,
        productPrice: price,
        paddleProductId,
        paddlePriceId,
      })
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
