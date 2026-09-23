import Link from 'next/link'
import Container from '@/src/components/Container'
import type { WaitlistThemeColors } from '@/src/lib/waitlist/theme'

interface SlowdayFooterProps {
  theme: WaitlistThemeColors
}

/**
 * SlowDay's own quiet footer — legal links only, no store navigation or
 * product grid. The NOT4NORMAL relationship is a single subdued line,
 * not a full brand block.
 */
export default function SlowdayFooter({ theme }: SlowdayFooterProps) {
  return (
    <footer className="border-t py-10" style={{ borderColor: theme.border }}>
      <Container className="flex flex-col items-center gap-4 text-center sm:flex-row sm:justify-between sm:text-left">
        <p className="text-xs" style={{ color: theme.secondaryText, opacity: 0.8 }}>
          SlowDay by{' '}
          <Link href="/" className="underline decoration-transparent transition-colors hover:decoration-current">
            NOT4NORMAL
          </Link>
        </p>

        <ul className="flex items-center gap-5 text-xs" style={{ color: theme.secondaryText }}>
          <li>
            <Link href="/privacy" className="transition-opacity hover:opacity-70">
              Privacy
            </Link>
          </li>
          <li>
            <Link href="/terms" className="transition-opacity hover:opacity-70">
              Terms
            </Link>
          </li>
          <li>
            <Link href="/refunds" className="transition-opacity hover:opacity-70">
              Refund Policy
            </Link>
          </li>
        </ul>
      </Container>
    </footer>
  )
}
