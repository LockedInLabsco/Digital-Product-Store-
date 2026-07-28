'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Container from './Container'
import BrandMark from './BrandMark'
import { WebsiteMedia } from '@/src/types/settings'

const NAV_LINKS = [
  { href: '/products', label: 'Products' },
  { href: '/#about', label: 'About' },
  { href: '/#manifesto', label: 'Manifesto' },
]

interface NavbarProps {
  media?: WebsiteMedia
}

export default function Navbar({ media }: NavbarProps) {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  const closeMenu = () => setIsOpen(false)

  return (
    <nav className="sticky top-0 z-40 border-b border-ink/10 bg-cream/95 backdrop-blur">
      <Container className="flex h-[76px] items-center justify-between">
        <Link href="/" aria-label="Not4Normal home" onClick={closeMenu}>
          <BrandMark logoUrl={media?.logo_dark_url} />
        </Link>

        <div className="hidden items-center gap-9 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-ink/70 transition-colors hover:text-ink"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/products"
            className="inline-flex items-center justify-center rounded-sm bg-ink px-6 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-cream transition-colors hover:bg-charcoal"
          >
            Explore Products
          </Link>
        </div>

        <button
          type="button"
          className="relative flex h-8 w-8 flex-col items-center justify-center gap-[5px] md:hidden"
          onClick={() => setIsOpen((open) => !open)}
          aria-expanded={isOpen}
          aria-controls="mobile-navigation"
          aria-label={isOpen ? 'Close menu' : 'Open menu'}
        >
          <span
            className={`block h-px w-6 bg-ink transition-transform duration-200 ${
              isOpen ? 'translate-y-[6.5px] rotate-45' : ''
            }`}
          />
          <span
            className={`block h-px w-6 bg-ink transition-transform duration-200 ${
              isOpen ? '-rotate-45' : ''
            }`}
          />
        </button>
      </Container>

      <div
        id="mobile-navigation"
        className={`overflow-hidden border-t border-ink/10 bg-cream transition-[max-height] duration-300 md:hidden ${
          isOpen ? 'max-h-72' : 'max-h-0 border-t-0'
        }`}
      >
        <Container className="flex flex-col gap-1 py-6">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={closeMenu}
              className="py-3 text-sm font-semibold uppercase tracking-[0.1em] text-ink/80"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/products"
            onClick={closeMenu}
            className="mt-3 inline-flex items-center justify-center rounded-sm bg-ink px-6 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-cream"
          >
            Explore Products
          </Link>
        </Container>
      </div>
    </nav>
  )
}
