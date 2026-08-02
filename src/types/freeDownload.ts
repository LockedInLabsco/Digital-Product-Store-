export interface FreeDownload {
  id: string
  product_id: string | null
  product_slug: string
  product_title: string
  email: string
  download_status: 'pending' | 'delivered' | 'failed'
  email_delivery_status: 'pending' | 'sent' | 'failed'
  error_message: string | null
  first_touch_source: string | null
  first_touch_medium: string | null
  first_touch_campaign: string | null
  first_touch_content: string | null
  last_touch_source: string | null
  last_touch_medium: string | null
  last_touch_campaign: string | null
  referrer_domain: string | null
  landing_page: string | null
  device_category: string | null
  country_code: string | null
  created_at: string
  updated_at: string
}
