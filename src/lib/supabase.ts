import { createClient } from '@supabase/supabase-js'
import { isDemoMode } from './demo'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Please check your .env file.')
  console.log('Required variables:')
  console.log('- VITE_SUPABASE_URL')
  console.log('- VITE_SUPABASE_PUBLISHABLE_KEY')
}

// Regular client with RLS
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
)
 
// Export appropriate client - demo mode uses regular client with demo user
export const getClient = () => supabase

// Helper function to check if we're in demo mode
export const canBypassRLS = () => false
