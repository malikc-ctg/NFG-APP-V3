// NFG One — Supabase Client Initialization
// Reads env vars from window.ENV (injected by each page)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const { SUPABASE_URL, SUPABASE_ANON_KEY } = window.ENV || {}

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_ANON_KEY in window.ENV')
}

export const supabase = createClient(
  SUPABASE_URL || 'https://zqcbldgheimqrnqmbbed.supabase.co',
  SUPABASE_ANON_KEY || ''
)

console.log('✅ Supabase client initialized')
