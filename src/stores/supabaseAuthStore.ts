import { create } from 'zustand'
import { supabase } from '@/lib/supabase'

interface User {
  id: string
  login: string
  email: string
  registrationDate: string
  settings: {
    monthYearHandling: 'start' | 'end'
    yearHandling: 'start' | 'end'
  }
}

interface AuthState {
  user: User | null
  token: string | null
  isLoading: boolean
  isInitialized: boolean
  error: string | null
  
  // Actions
  initialize: () => Promise<void>
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  register: (login: string, email: string, password: string) => Promise<void>
  updateProfile: (updates: Partial<User>) => Promise<void>
  clearError: () => void
}

export const useSupabaseAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isLoading: false,
  isInitialized: false,
  error: null,
  
  initialize: async () => {
    console.log('Auth initialize: Starting...')
    
    try {
      // Check for existing session
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        console.error('Auth initialization error:', error)
        set({ error: error.message, isInitialized: true })
        return
      }
      
      if (session) {
        console.log('Auth initialize: Found session')
        set({ 
          user: session.user as User,
          token: session.access_token,
          isInitialized: true 
        })
      } else {
        console.log('Auth initialize: No session found')
        set({ isInitialized: true })
      }
    } catch (error) {
      console.error('Auth initialization error:', error)
      set({ error: error instanceof Error ? error.message : 'Auth initialization failed', isInitialized: true })
    }
  },
  
  login: async (email: string, password: string) => {
    console.log('Auth login: Starting login for:', email)
    set({ isLoading: true, error: null })
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      
      if (error) {
        console.error('Login error:', error)
        set({ error: error.message })
        return
      }
      
      console.log('Auth login: Login successful')
      set({ 
        user: data.user as User,
        token: data.session.access_token,
        isLoading: false 
      })
    } catch (error) {
      console.error('Login error:', error)
      set({ 
        error: error instanceof Error ? error.message : 'Login failed',
        isLoading: false 
      })
    }
  },
  
  logout: async () => {
    console.log('Auth logout: Starting logout')
    set({ isLoading: true })
    
    try {
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        console.error('Logout error:', error)
        set({ error: error.message })
        return
      }
      
      console.log('Auth logout: Logout successful')
      set({ 
        user: null, 
        token: null, 
        isLoading: false 
      })
    } catch (error) {
      console.error('Logout error:', error)
      set({ 
        error: error instanceof Error ? error.message : 'Logout failed',
        isLoading: false 
      })
    }
  },
  
  register: async (login: string, email: string, password: string) => {
    console.log('Auth register: Starting registration for:', email)
    set({ isLoading: true, error: null })
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            login
          }
        }
      })
      
      if (error) {
        console.error('Registration error:', error)
        set({ error: error.message })
        return
      }
      
      console.log('Auth register: Registration successful')
      set({ 
        user: data.user as User,
        token: data.session?.access_token || null,
        isLoading: false 
      })
    } catch (error) {
      console.error('Registration error:', error)
      set({ 
        error: error instanceof Error ? error.message : 'Registration failed',
        isLoading: false 
      })
    }
  },
  
  updateProfile: async (updates: Partial<User>) => {
    if (!get().user) return
    
    set({ isLoading: true, error: null })
    
    try {
      const { error } = await supabase.auth.updateUser({
        data: updates
      })
      
      if (error) {
        set({ error: error.message })
        return
      }
      
      set(state => ({
        user: state.user ? { ...state.user, ...updates } : null,
        isLoading: false
      }))
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Profile update failed',
        isLoading: false 
      })
    }
  },
  
  clearError: () => set({ error: null })
}))

// Export as useAuthStore for compatibility
export const useAuthStore = useSupabaseAuthStore

// Listen for auth changes
supabase.auth.onAuthStateChange((event, session) => {
  console.log('Auth state changed:', event, session ? 'session exists' : 'no session')
  
  if (event === 'SIGNED_IN' && session) {
    useSupabaseAuthStore.setState({
      user: session.user as User,
      token: session.access_token,
      isLoading: false
    })
  } else if (event === 'SIGNED_OUT') {
    useSupabaseAuthStore.setState({
      user: null,
      token: null,
      isLoading: false
    })
  }
})
