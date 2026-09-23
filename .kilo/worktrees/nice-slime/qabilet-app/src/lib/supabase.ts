import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jtubizlrigutrhwcdmqd.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_7dqSoSESHxrNLtCK1EckNg_-NTkecI9'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
