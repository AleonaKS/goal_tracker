import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useAuthStore } from '@/stores/authStore'

vi.mock('@/lib/auth', () => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
  getCurrentUser: vi.fn(),
  getUserProfile: vi.fn(),
  onAuthStateChange: vi.fn((cb: any) => {
    setTimeout(() => cb(null), 0)
    return { data: { subscription: { unsubscribe: () => {} } } }
  }),
}))

vi.mock('@/lib/demo', () => ({
  isDemoMode: () => false,
  demoUser: null,
}))

describe('7. Zustand stores', () => {
  describe('authStore', () => {
    beforeEach(() => {
      useAuthStore.setState({
        user: null,
        token: null,
        isLoading: false,
        isInitialized: false,
        error: null,
      })
    })

    it('starts with null user', () => {
      const state = useAuthStore.getState()
      expect(state.user).toBeNull()
      expect(state.isInitialized).toBe(false)
    })

    it('clears error on clearError', () => {
      useAuthStore.setState({ error: 'Some error' })
      useAuthStore.getState().clearError()
      expect(useAuthStore.getState().error).toBeNull()
    })

    it('initialize sets isInitialized after completion', async () => {
      const { initialize } = useAuthStore.getState()
      await initialize()
      expect(useAuthStore.getState().isInitialized).toBe(true)
      expect(useAuthStore.getState().isLoading).toBe(false)
    })
  })
})
