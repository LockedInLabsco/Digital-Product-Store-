'use client'

import Link, { LinkProps } from 'next/link'
import { AnchorHTMLAttributes, ReactNode } from 'react'
import { track, AnalyticsEventName, AnalyticsEventMap } from '@/src/lib/analytics/events'

interface TrackedLinkProps<Name extends AnalyticsEventName>
  extends LinkProps,
    Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps | 'onClick'> {
  children: ReactNode
  event: Name
  eventProperties: AnalyticsEventMap[Name]
}

/**
 * A Next.js Link that fires a typed analytics event on click. Takes
 * plain (serializable) event name + properties rather than a function
 * prop, since this is rendered from Server Component pages — a
 * function prop can't cross that boundary, but a string/object can.
 */
export default function TrackedLink<Name extends AnalyticsEventName>({
  event,
  eventProperties,
  children,
  ...linkProps
}: TrackedLinkProps<Name>) {
  return (
    <Link {...linkProps} onClick={() => track(event, eventProperties)}>
      {children}
    </Link>
  )
}
