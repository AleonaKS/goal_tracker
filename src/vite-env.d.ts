/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly GOAL_SUPABASE_URL: string
  readonly NEXT_PUBLIC_GOAL_SUPABASE_URL: string
  readonly NEXT_PUBLIC_GOAL_SUPABASE_PUBLISHABLE_KEY: string
  readonly NEXT_PUBLIC_GOAL_SUPABASE_ANON_KEY: string
  readonly GOAL_SUPABASE_SERVICE_ROLE_KEY: string
  readonly VITE_DEMO_MODE: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
