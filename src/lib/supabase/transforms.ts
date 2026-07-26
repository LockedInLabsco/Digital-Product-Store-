import { DatabaseProduct, Product } from '@/src/types/product'

export function transformDatabaseProductToProduct(
  dbProduct: DatabaseProduct
): Product {
  return {
    id: dbProduct.id,
    title: dbProduct.title,
    description: dbProduct.description,
    shortDescription: dbProduct.short_description,
    price: dbProduct.price,
    slug: dbProduct.slug,
    previews: [],
    galleryImages: [],
    features: [],
    coverImageUrl: dbProduct.cover_image_url,
    filePath: dbProduct.file_path,
    lemonSqueezyVariantId: dbProduct.lemon_squeezy_variant_id,
    paddleProductId: dbProduct.paddle_product_id,
    paddlePriceId: dbProduct.paddle_price_id,
    isActive: dbProduct.is_active,
    createdAt: new Date(dbProduct.created_at),
  }
}
