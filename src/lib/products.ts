import { Product } from '@/src/types/product'

// Fallback hardcoded products for when Supabase is not configured
const fallbackProducts: Product[] = [
  {
    id: '1',
    title: 'The Simple Habit Reset',
    description:
      'Most people fail at building habits because they try to change everything at once. This guide helps you restart with a different approach—one that is so simple, anyone can do it. No motivation hacks. No complicated systems. Just the essentials.',
    shortDescription: 'A tiny beginner-friendly guide to help you restart your habits one simple step at a time',
    price: 0,
    slug: 'simple-habit-reset',
    format: 'PDF + Printables',
    previews: [
      {
        id: 'beginner-guide',
        label: 'Beginner Guide',
        icon: '📖',
      },
      {
        id: '7-day-plan',
        label: '7-Day Reset Plan',
        icon: '📅',
      },
      {
        id: 'habit-tracker',
        label: 'Printable Tracker',
        icon: '✓',
      },
      {
        id: 'daily-routine',
        label: 'Daily Routine System',
        icon: '⏰',
      },
    ],
    galleryImages: [
      {
        id: 'beginner-guide',
        src: '/images/beginner-guide.pdf',
        label: 'Beginner Guide',
        alt: 'Complete step-by-step guide to restarting your habits',
      },
      {
        id: '7-day-plan',
        src: '/images/7-day-reset.pdf',
        label: '7-Day Reset Plan',
        alt: 'Daily actions and checkpoints for your first week',
      },
      {
        id: 'habit-tracker',
        src: '/images/habit-tracker.pdf',
        label: 'Printable Habit Tracker',
        alt: 'Track your daily progress with this simple printable tracker',
      },
      {
        id: 'daily-routine',
        src: '/images/daily-routine.pdf',
        label: 'Daily Routine System',
        alt: 'Simple daily routine template to build consistency',
      },
      {
        id: 'bonus-tips',
        src: '/images/bonus-tips.pdf',
        label: 'Bonus Tips & Tricks',
        alt: 'Additional strategies to stay on track',
      },
    ],
    features: [
      'Beginner-friendly habit guide (PDF)',
      '7-day reset plan you can start today',
      'Printable habit tracker',
      'Simple daily routine system',
    ],
    isActive: true,
    createdAt: new Date('2024-01-01'),
  },
]

/**
 * Get all products - uses fallback products when Supabase is not configured
 * In the future, this will fetch from Supabase and fall back to hardcoded products
 */
export function getProducts(): Product[] {
  return fallbackProducts
}

export function getProductBySlug(slug: string): Product | undefined {
  return fallbackProducts.find((p) => p.slug === slug)
}

export function getFeaturedProducts(count: number = 3): Product[] {
  return fallbackProducts.slice(0, count)
}

