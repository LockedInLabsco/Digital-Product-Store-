export const products = [
  {
    id: '1',
    title: 'The Simple Habit Reset',
    description: 'A tiny beginner-friendly guide to help you restart your habits one simple step at a time',
    price: 9,
    slug: 'simple-habit-reset',
    longDescription:
      'Most people fail at building habits because they try to change everything at once. This guide helps you restart with a different approach—one that is so simple, anyone can do it. No motivation hacks. No complicated systems. Just the essentials.',
    features: [
      'Beginner-friendly habit guide (PDF)',
      '7-day reset plan you can start today',
      'Printable habit tracker',
      'Simple daily routine system',
    ],
    format: 'PDF + Printables',
  },
]

export function getProductBySlug(slug: string) {
  return products.find((p) => p.slug === slug)
}

export function getFeaturedProducts(count: number = 3) {
  return products.slice(0, count)
}
