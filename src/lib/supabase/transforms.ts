import { DatabaseProduct, Product } from '@/src/types/product'

/**
 * Transform a database product to a frontend product
 * Enriches with preview and gallery data based on product slug
 */
export function transformDatabaseProductToProduct(
  dbProduct: DatabaseProduct
): Product {
  // Map of slug to preview and gallery items
  const productTemplates: Record<string, any> = {
    'simple-habit-reset': {
      previews: [
        { id: 'beginner-guide', label: 'Beginner Guide', icon: '📖' },
        { id: '7-day-plan', label: '7-Day Reset Plan', icon: '📅' },
        { id: 'habit-tracker', label: 'Printable Tracker', icon: '✓' },
        { id: 'daily-routine', label: 'Daily Routine System', icon: '⏰' },
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
      format: 'PDF + Printables',
    },
  }

  // Get template for this product, or use defaults
  const template = productTemplates[dbProduct.slug] || {
    previews: [
      { id: 'default', label: 'Digital Product', icon: '📄' },
    ],
    galleryImages: [
      {
        id: 'default',
        src: '/images/product.pdf',
        label: 'Product',
        alt: dbProduct.short_description,
      },
    ],
    features: [dbProduct.short_description],
    format: 'Digital Product',
  }

  return {
    id: dbProduct.id,
    title: dbProduct.title,
    description: dbProduct.description,
    shortDescription: dbProduct.short_description,
    price: dbProduct.price,
    slug: dbProduct.slug,
    format: template.format,
    previews: template.previews,
    galleryImages: template.galleryImages,
    features: template.features,
    coverImageUrl: dbProduct.cover_image_url,
    filePath: dbProduct.file_path,
    lemonSqueezyVariantId: dbProduct.lemon_squeezy_variant_id,
    isActive: dbProduct.is_active,
    createdAt: new Date(dbProduct.created_at),
  }
}
