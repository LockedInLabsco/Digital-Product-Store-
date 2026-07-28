import Link from 'next/link'
import Container from './Container'
import BrandMark from './BrandMark'

export default function Footer() {
  return (
    <footer className="bg-ink text-cream">
      <Container className="py-16 sm:py-20">
        <div className="grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr_1fr]">
          <div>
            <Link href="/" className="inline-block">
              <BrandMark className="text-cream" />
            </Link>
            <p className="mt-4 max-w-xs text-sm text-cream/60">
              Not made for normal. Tools for people building their way out.
            </p>
          </div>

          <div>
            <p className="eyebrow mb-5 text-cream/45">Navigate</p>
            <ul className="space-y-3 text-sm text-cream/70">
              <li><Link href="/products" className="transition-colors hover:text-cream">Products</Link></li>
              <li><Link href="/#about" className="transition-colors hover:text-cream">About</Link></li>
              <li><Link href="/#manifesto" className="transition-colors hover:text-cream">Manifesto</Link></li>
              <li><Link href="mailto:hello@not4normal.store" className="transition-colors hover:text-cream">Contact</Link></li>
            </ul>
          </div>

          <div>
            <p className="eyebrow mb-5 text-cream/45">Legal</p>
            <ul className="space-y-3 text-sm text-cream/70">
              <li><Link href="/privacy" className="transition-colors hover:text-cream">Privacy</Link></li>
              <li><Link href="/terms" className="transition-colors hover:text-cream">Terms</Link></li>
              <li><Link href="/refunds" className="transition-colors hover:text-cream">Refund Policy</Link></li>
            </ul>
          </div>

          <div>
            <p className="eyebrow mb-5 text-cream/45">Social</p>
            <ul className="space-y-3 text-sm text-cream/50">
              <li>Instagram — Soon</li>
              <li>YouTube — Soon</li>
            </ul>
          </div>
        </div>

        <div className="mt-16 flex flex-col gap-3 border-t border-cream/10 pt-6 text-xs uppercase tracking-[0.1em] text-cream/40 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Not4Normal</p>
          <p>Create your own path.</p>
        </div>
      </Container>
    </footer>
  )
}
