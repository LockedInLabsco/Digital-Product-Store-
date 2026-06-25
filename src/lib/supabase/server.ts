import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.warn(
    'Supabase server environment variables are missing. Server-side operations will not work.'
  )
}

// Server-side client with full access (use only for server-side operations)
export const supabaseServer = createClient(
  supabaseUrl || '',
  supabaseServiceRoleKey || ''
)
