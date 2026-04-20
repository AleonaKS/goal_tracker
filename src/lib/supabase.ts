import { createClient } from '@supabase/supabase-js'
import { isDemoMode } from './demo'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
const serviceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY || 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhzaHVmbWFqdXJ0dHZ1ZXdxaXdhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTgxOTI2MywiZXhwIjoyMDkxMzk1MjYzfQ.UzuwBWSZSoIAzTNPEYtXn75roovpCrHeAkNFwK_Z4Rs'  

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Please check your .env file.')
  console.log('Required variables:')
  console.log('- VITE_SUPABASE_URL')
  console.log('- VITE_SUPABASE_PUBLISHABLE_KEY')
}

if (!serviceRoleKey) {
  console.warn('Service role key not found. Demo mode will use regular client.')
  console.log('Add SUPABASE_SERVICE_ROLE_KEY to .env.local for full demo functionality.')
}

// Regular client with RLS
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
)
 
// Demo mode client with service role key (completely bypasses RLS)
let supabaseDemo: ReturnType<typeof createClient> | null = null

// Export appropriate client based on mode
export const getClient = () => {
  if (isDemoMode() && serviceRoleKey) {
    if (!supabaseDemo) {
      supabaseDemo = createClient(
        supabaseUrl || 'https://placeholder.supabase.co',
        serviceRoleKey,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        }
      )
    }
    return supabaseDemo
  }
  return supabase
}

// Helper function to check if we're in demo mode and can bypass RLS
export const canBypassRLS = () => isDemoMode()
