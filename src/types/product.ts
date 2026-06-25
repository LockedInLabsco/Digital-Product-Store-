export interface DatabaseProduct {
  id: string
  title: string
  slug: string
  short_description: string
  description: string
  price: number
  currency: string
  cover_image_url?: string
  file_path?: string
  lemon_squeezy_variant_id?: string
  is_active: boolean
  created_at: string
}

export interface Product {
  id: string
  title: string
  description: string
  shortDescription: string
  price: number
  slug: string
  format: string
  previews: PreviewItem[]
  galleryImages: GalleryImage[]
  features: string[]
  coverImageUrl?: string
  filePath?: string
  lemmonSqueezyVariantId?: string
  isActive: boolean
  createdAt: Date
}

export interface PreviewItem {
  id: string
  label: string
  icon: string
}

export interface GalleryImage {
  id: string
  src: string
  label: string
  alt: string
}
