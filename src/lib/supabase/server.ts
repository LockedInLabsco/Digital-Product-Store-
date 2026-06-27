import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn(
    'Supabase environment variables are missing. Download functionality may not work.'
  )
}

export const supabaseServer = createClient(
  supabaseUrl || '',
  supabaseServiceKey || ''
)
