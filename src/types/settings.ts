export interface WebsiteMedia {
  logo_dark_url: string
  logo_light_url: string
  symbol_dark_url: string
  symbol_light_url: string
  favicon_url: string
  hero_image_url: string
  hero_image_alt: string
  about_image_url: string
  about_image_alt: string
  manifesto_image_url: string
  manifesto_image_alt: string
  newsletter_image_url: string
  newsletter_image_alt: string
  final_cta_image_url: string
  final_cta_image_alt: string
  social_share_image_url: string
}

export const WEBSITE_MEDIA_DEFAULTS: WebsiteMedia = {
  logo_dark_url: '',
  logo_light_url: '',
  symbol_dark_url: '',
  symbol_light_url: '',
  favicon_url: '',
  hero_image_url: '',
  hero_image_alt: '',
  about_image_url: '',
  about_image_alt: '',
  manifesto_image_url: '',
  manifesto_image_alt: '',
  newsletter_image_url: '',
  newsletter_image_alt: '',
  final_cta_image_url: '',
  final_cta_image_alt: '',
  social_share_image_url: '',
}

export const WEBSITE_MEDIA_SETTING_KEY = 'website_media'

export interface HeroSliderImage {
  id: string
  url: string
  storagePath?: string
  alt: string
  objectPosition?: string
  enabled: boolean
}

export const HERO_SLIDER_SETTING_KEY = 'hero_slider_images'
export const HERO_SLIDER_MAX_IMAGES = 8
