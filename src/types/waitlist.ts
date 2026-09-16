export type WaitlistStatus = 'draft' | 'active' | 'closed'

export interface Waitlist {
  id: string
  name: string
  slug: string
  description: string | null
  headline: string | null
  supporting_text: string | null
  button_text: string | null
  status: WaitlistStatus
  created_at: string
  updated_at: string
}

export interface WaitlistWithCount extends Waitlist {
  entry_count: number
}

export interface WaitlistEntry {
  id: string
  waitlist_id: string
  email: string
  instagram_username: string | null
  first_name: string | null
  source: string
  created_at: string
}
