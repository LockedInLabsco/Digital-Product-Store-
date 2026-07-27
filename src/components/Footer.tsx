import Link from 'next/link'
import Container from './Container'
import BrandMark from './BrandMark'

export default function Footer() {
  return (
    <footer className="cinematic-footer" data-nav-theme="dark">
      <div className="footer-watermark" aria-hidden="true">
        NOT4NORMAL
      </div>
      <Container className="relative z-10 py-16 sm:py-24">
        <div className="footer-grid" data-reveal="up">
          <div>
            <Link href="/" className="inline-block">
              <BrandMark className="footer-brand" />
            </Link>
            <p className="footer-manifesto">Create your own path.</p>
          </div>

          <div className="footer-links">
            <div>
              <p className="eyebrow mb-5">Navigate</p>
              <Link href="/products">Products</Link>
              <Link href="/#manifesto">Manifesto</Link>
              <Link href="mailto:hello@not4normal.store">Email</Link>
            </div>
            <div>
              <p className="eyebrow mb-5">Legal</p>
              <Link href="/terms">Terms</Link>
              <Link href="/privacy">Privacy</Link>
              <Link href="/refunds">Refunds</Link>
            </div>
            <div>
              <p className="eyebrow mb-5">Social</p>
              <span>Instagram — Soon</span>
              <span>YouTube — Soon</span>
            </div>
          </div>
        </div>

        <div className="footer-bottom" data-reveal="fade">
          <p>© {new Date().getFullYear()} Not4Normal</p>
          <p>Built for the ones who refuse the default.</p>
        </div>
      </Container>
    </footer>
  )
}
