import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Configure Supabase client with extended session timeout (6 hours)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Set session to persist for 6 hours (21600 seconds)
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
  global: {
    headers: {
      'X-Client-Info': 'stock-futures-dashboard'
    }
  }
})

export interface UserProfile {
  id: string
  email: string
  full_name?: string
  trial_end_date: string
  created_at: string
}