export interface Order {
  id: string
  product_id: string | null
  product_title: string
  product_slug: string
  customer_email: string
  paddle_transaction_id: string
  paddle_customer_id: string | null
  paddle_price_id: string | null
  amount: string | null
  currency: string | null
  status: string
  delivery_status: 'pending' | 'sent' | 'failed'
  download_url_sent: boolean
  error_message: string | null
  created_at: string
  updated_at?: string
  first_touch_source?: string | null
  first_touch_medium?: string | null
  first_touch_campaign?: string | null
  first_touch_content?: string | null
  last_touch_source?: string | null
  last_touch_medium?: string | null
  last_touch_campaign?: string | null
  referrer_domain?: string | null
  landing_page?: string | null
  device_category?: string | null
  country_code?: string | null
}
