'use client'

import { useEffect, useState } from 'react'
import Button from './Button'
import { track, productEventProps } from '@/src/lib/analytics/events'
import { getAttributionSnapshot, getDeviceCategory } from '@/src/lib/analytics/attribution'
import { toAttributionPayload } from '@/src/types/attribution'

interface PaidProductButtonProps {
  productId: string
  productSlug: string
  productTitle: string
  paddleProductId?: string
  paddlePriceId: string
  price: number
  variant?: 'primary' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
  buttonText?: string
  /** Where this button renders, e.g. "product_page_cta", "product_page_sticky". */
  buttonLocation?: string
}

declare global {
  interface Window {
    Paddle?: any
    __not4normalPaddleInitialized?: boolean
  }
}

const PADDLE_SCRIPT_SRC = 'https://cdn.paddle.com/paddle/v2/paddle.js'

type ProductEventProps = ReturnType<typeof productEventProps>

// Paddle.Initialize() only accepts one global eventCallback, but this
// page can mount more than one PaidProductButton at once (e.g. a hero
// CTA and a bottom CTA for the same product). Only one checkout can be
// open at a time, so the button that opened it stashes its event
// properties here for the shared callback to read.
let activeCheckoutContext: { eventProps: ProductEventProps; completed: boolean } | null = null

function handleGlobalPaddleEvent(event: any) {
  const eventName = event?.name
  console.log('[Paddle] Checkout event', eventName || 'unknown', event)

  if (!activeCheckoutContext) return
  const { eventProps } = activeCheckoutContext

  if (
    eventName === 'checkout.error' ||
    eventName === 'checkout.payment.error' ||
    eventName === 'checkout.payment.failed'
  ) {
    console.error('[Paddle] Checkout event', eventName, event)
    track('purchase_failed', { ...eventProps, reason: eventName })
    return
  }

  if (eventName === 'checkout.warning') {
    console.warn('[Paddle] Checkout warning', event)
    return
  }

  if (eventName === 'checkout.opened') {
    activeCheckoutContext.completed = false
    track('paid_checkout_opened', eventProps)
  } else if (eventName === 'checkout.completed') {
    activeCheckoutContext.completed = true
    // Behavioral signal only — the Paddle webhook (server-side,
    // signature-verified) is the source of truth for confirmed revenue.
    track('purchase_completed', eventProps)
  } else if (eventName === 'checkout.closed') {
    if (!activeCheckoutContext.completed) {
      track('paid_checkout_abandoned', eventProps)
    }
    activeCheckoutContext = null
  }
}

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
      eventCallback: handleGlobalPaddleEvent,
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
  productId,
  productSlug,
  productTitle,
  paddleProductId,
  paddlePriceId,
  price,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  buttonText,
  buttonLocation = 'product_page',
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

    const eventProps = productEventProps({
      id: productId,
      slug: productSlug,
      title: productTitle,
      price,
    })

    track('paid_checkout_started', { ...eventProps, button_location: buttonLocation })
    activeCheckoutContext = { eventProps, completed: false }

    const checkoutItems = [
      {
        priceId: paddlePriceId,
        quantity: 1,
      },
    ]

    // Small, safe attribution snapshot only — no personal data — so the
    // Paddle webhook can attribute the transaction once it's confirmed.
    const attribution = toAttributionPayload(getAttributionSnapshot())

    const checkoutOptions = {
      settings: {
        displayMode: 'overlay',
      },
      items: checkoutItems,
      customData: {
        product_id: productId,
        product_slug: productSlug,
        paddle_price_id: paddlePriceId,
        attribution,
        device_category: getDeviceCategory(),
      },
    }

    setIsLoading(true)
    console.log('[Paddle] Opening checkout', {
      NEXT_PUBLIC_PADDLE_ENVIRONMENT: configuredEnvironment,
      paddleEnvironment: environment,
      clientTokenExists: Boolean(clientToken),
      productId,
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
        productId,
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
