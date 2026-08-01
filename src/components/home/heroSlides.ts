export interface HeroSlide {
  src: string
  alt: string
  objectPosition?: string
}

/**
 * Homepage hero slideshow. Add, remove, or reorder entries to change
 * what appears — order here is the order (and, since it loops, the
 * rotation) shown on the homepage.
 *
 * Each `src` is resolved from /public. Upload the matching file to
 * public/images/hero/ (see the README there) and it appears
 * automatically; a slide whose file hasn't been uploaded yet is simply
 * skipped, so it's safe to keep entries here ahead of the images
 * existing.
 */
export const HERO_SLIDES: HeroSlide[] = [
  {
    src: '/images/hero/working-dark-room.webp',
    alt: 'Focused work late at night in a dimly lit room',
    objectPosition: 'center',
  },
  {
    src: '/images/hero/studying.webp',
    alt: 'Studying and writing in a notebook with deep focus',
    objectPosition: 'center',
  },
  {
    src: '/images/hero/workout.webp',
    alt: 'Training alone in the gym',
    objectPosition: 'center',
  },
  {
    src: '/images/hero/running-rain.webp',
    alt: 'Running through heavy rain',
    objectPosition: 'center',
  },
  {
    src: '/images/hero/building.webp',
    alt: 'Building a business and writing code',
    objectPosition: 'center',
  },
  {
    src: '/images/hero/early-morning.webp',
    alt: 'Waking up early to prepare before sunrise',
    objectPosition: 'center',
  },
]
