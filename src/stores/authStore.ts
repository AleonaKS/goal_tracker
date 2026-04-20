import { create } from 'zustand'
import { 
  signIn, 
  signUp, 
  signOut, 
  getCurrentUser, 
  getUserProfile,
  onAuthStateChange 
} from '@/lib/auth'
import type { User } from '@/types'

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

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isLoading: false,
  isInitialized: false,
  error: null,
  
  initialize: async () => {
    console.log('Auth initialize: Starting...')
    
    try {
      // Get current user
      const user = await getCurrentUser()
      
      if (user) {
        console.log('Auth initialize: Found user:', user.email)
        set({ 
          user: user as User,
          token: 'demo-token', // In real app, this would come from session
          isInitialized: true 
        })
      } else {
        console.log('Auth initialize: No user found')
        set({ isInitialized: true })
      }
      
      // Listen for auth changes
      onAuthStateChange((user) => {
        set({ 
          user: user as User,
          token: user ? 'demo-token' : null
        })
      })
    } catch (error) {
      console.error('Auth initialization error:', error)
      set({ error: error instanceof Error ? error.message : 'Auth initialization failed', isInitialized: true })
    }
  },
  
  login: async (email: string, password: string) => {
    console.log('Auth login: Starting login for:', email)
    set({ isLoading: true, error: null })
    
    try {
      const data = await signIn(email, password)
      
      console.log('Auth login: Login successful')
      set({ 
        user: data.user as User,
        token: 'demo-token', // In real app, this would come from session
        isLoading: false 
      })
    } catch (error) {
      console.error('Auth login: Login failed:', error)
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
      await signOut()
      
      console.log('Auth logout: Logout successful')
      set({ 
        user: null, 
        token: null, 
        isLoading: false 
      })
    } catch (error) {
      console.error('Auth logout error:', error)
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
      const data = await signUp(email, password, login)
      
      console.log('Auth register: Registration successful')
      set({ 
        user: data.user as User,
        token: 'demo-token', // In real app, this would come from session
        isLoading: false 
      })
    } catch (error) {
      console.error('Auth register: Registration failed:', error)
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
      // In a real app, this would update the user profile in the database
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
