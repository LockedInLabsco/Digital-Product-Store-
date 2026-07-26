'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Container from './Container'
import BrandMark from './BrandMark'

type NavTheme = 'dark' | 'light'

export default function Navbar() {
  const pathname = usePathname()
  const [isScrolled, setIsScrolled] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const isLegalPage = ['/terms', '/privacy', '/refunds'].includes(pathname)
  const [theme, setTheme] = useState<NavTheme>(
    isLegalPage ? 'light' : 'dark'
  )

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    setTheme(isLegalPage ? 'light' : 'dark')

    const sections = Array.from(
      document.querySelectorAll<HTMLElement>('[data-nav-theme]')
    )

    if (sections.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        const activeEntry = entries.find((entry) => entry.isIntersecting)
        const nextTheme = activeEntry?.target.getAttribute('data-nav-theme')
        if (nextTheme === 'dark' || nextTheme === 'light') {
          setTheme(nextTheme)
        }
      },
      {
        rootMargin: '-10% 0px -82% 0px',
        threshold: 0,
      }
    )

    sections.forEach((section) => observer.observe(section))
    return () => observer.disconnect()
  }, [isLegalPage, pathname])

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  const closeMenu = () => setIsOpen(false)
  const isLight = theme === 'light' && !isOpen

  return (
    <>
      <nav
        className={`site-nav cinematic-nav ${
          isScrolled ? 'is-scrolled' : ''
        } ${isLight ? 'is-light' : 'is-dark'} ${isOpen ? 'is-menu-open' : ''}`}
      >
        <Container className="cinematic-nav-inner flex items-center justify-between">
          <Link
            href="/"
            className="nav-brand"
            aria-label="Not4Normal home"
            data-cursor="ENTER"
            onClick={closeMenu}
          >
            <BrandMark />
          </Link>

          <div className="hidden items-center gap-8 md:flex">
            <Link href="/products" className="nav-link" data-cursor="ENTER">
              Products
            </Link>
            <Link href="/#manifesto" className="nav-link">
              Manifesto
            </Link>
            <Link
              href="/products"
              className="nav-cta"
              data-cursor="ENTER"
            >
              Explore products
              <span aria-hidden="true">↗</span>
            </Link>
          </div>

          <button
            type="button"
            className="mobile-menu-trigger md:hidden"
            onClick={() => setIsOpen((open) => !open)}
            aria-expanded={isOpen}
            aria-controls="mobile-navigation"
            aria-label={isOpen ? 'Close menu' : 'Open menu'}
          >
            <span />
            <span />
          </button>
        </Container>
      </nav>

      <div
        id="mobile-navigation"
        className={`mobile-menu ${isOpen ? 'is-open' : ''}`}
        aria-hidden={!isOpen}
      >
        <div className="mobile-menu-watermark" aria-hidden="true">
          N4N
        </div>
        <div className="mobile-menu-links">
          <Link href="/" onClick={closeMenu}>
            <span>01</span>
            Home
          </Link>
          <Link href="/products" onClick={closeMenu} data-cursor="VIEW">
            <span>02</span>
            Products
          </Link>
          <Link href="/#manifesto" onClick={closeMenu}>
            <span>03</span>
            Manifesto
          </Link>
        </div>
        <p className="mobile-menu-tagline">Create your own path.</p>
      </div>

      {pathname !== '/' && <div className="nav-spacer" aria-hidden="true" />}
    </>
  )
}
