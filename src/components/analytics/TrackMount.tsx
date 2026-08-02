'use client'

import { useEffect } from 'react'
import { track, AnalyticsEventName, AnalyticsEventMap } from '@/src/lib/analytics/events'

/** Fires a single analytics event when this component mounts — for
 * pages that are Server Components and can't call track() themselves. */
export default function TrackMount<Name extends AnalyticsEventName>({
  event,
  properties,
}: {
  event: Name
  properties: AnalyticsEventMap[Name]
}) {
  useEffect(() => {
    track(event, properties)
    // Fire once per mount only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}
