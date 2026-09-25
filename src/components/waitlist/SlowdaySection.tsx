import type { CSSProperties, ReactNode } from 'react'
import Container from '@/src/components/Container'

interface SlowdaySectionProps {
  children: ReactNode
  id?: string
  className?: string
  style?: CSSProperties
  /** Wider readable measure for text-only editorial sections vs. the default 2xl. */
  maxWidth?: 'xl' | '2xl' | '4xl' | '5xl'
}

const MAX_WIDTH_CLASS: Record<NonNullable<SlowdaySectionProps['maxWidth']>, string> = {
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '4xl': 'max-w-4xl',
  '5xl': 'max-w-5xl',
}

/** Consistent vertical rhythm + measure for every standalone SlowDay
 * section, so each Slowday*.tsx component only has to describe its own
 * content. Deliberately plain — no card chrome of its own. */
export default function SlowdaySection({
  children,
  id,
  className = '',
  style,
  maxWidth = '2xl',
}: SlowdaySectionProps) {
  return (
    <section id={id} className={`py-16 sm:py-24 ${className}`} style={style}>
      <Container className={`mx-auto ${MAX_WIDTH_CLASS[maxWidth]}`}>{children}</Container>
    </section>
  )
}
