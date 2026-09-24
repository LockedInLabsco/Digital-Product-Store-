'use client'

import Link from 'next/link'
import Container from './Container'
import BrandMark from './BrandMark'
import { WebsiteMedia } from '@/src/types/settings'
import { track } from '@/src/lib/analytics/events'

interface FooterProps {
  media?: WebsiteMedia
}

function trackFooterClick(destination: string, label: string) {
  track('navigation_clicked', { button_location: 'footer', destination, label })
}

export default function Footer({ media }: FooterProps) {
  return (
    <footer className="bg-ink text-cream">
      <Container className="py-16 sm:py-20">
        <div className="grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr_1fr]">
          <div>
            <Link href="/" className="inline-block">
              <BrandMark className="text-cream" logoUrl={media?.logo_light_url} />
            </Link>
            <p className="mt-4 max-w-xs text-sm text-cream/60">
              Not made for normal. Tools for people building their way out.
            </p>
          </div>

          <div>
            <p className="eyebrow mb-5 text-gold/80">Navigate</p>
            <ul className="space-y-3 text-sm text-cream/70">
              <li><Link href="/products" onClick={() => trackFooterClick('/products', 'Products')} className="transition-colors hover:text-gold">Products</Link></li>
              <li><Link href="/#about" onClick={() => trackFooterClick('/#about', 'About')} className="transition-colors hover:text-gold">About</Link></li>
              <li><Link href="/#manifesto" onClick={() => trackFooterClick('/#manifesto', 'Manifesto')} className="transition-colors hover:text-gold">Manifesto</Link></li>
              <li><Link href="mailto:hello@not4normal.store" onClick={() => trackFooterClick('mailto:hello@not4normal.store', 'Contact')} className="transition-colors hover:text-gold">Contact</Link></li>
            </ul>
          </div>

          <div>
            <p className="eyebrow mb-5 text-gold/80">Legal</p>
            <ul className="space-y-3 text-sm text-cream/70">
              <li><Link href="/privacy" onClick={() => trackFooterClick('/privacy', 'Privacy')} className="transition-colors hover:text-gold">Privacy</Link></li>
              <li><Link href="/terms" onClick={() => trackFooterClick('/terms', 'Terms')} className="transition-colors hover:text-gold">Terms</Link></li>
              <li><Link href="/refunds" onClick={() => trackFooterClick('/refunds', 'Refund Policy')} className="transition-colors hover:text-gold">Refund Policy</Link></li>
            </ul>
          </div>

          <div>
            <p className="eyebrow mb-5 text-gold/80">Social</p>
            <ul className="space-y-3 text-sm text-cream/50">
              <li>Instagram — Soon</li>
              <li>YouTube — Soon</li>
            </ul>
          </div>
        </div>

        <div className="mt-16 flex flex-col gap-3 border-t border-line/10 pt-6 text-xs uppercase tracking-[0.1em] text-cream/40 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Not4Normal</p>
          <p>Create your own path.</p>
        </div>
      </Container>
    </footer>
  )
}
