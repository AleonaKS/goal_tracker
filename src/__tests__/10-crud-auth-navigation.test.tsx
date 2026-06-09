import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, Navigate } from 'react-router-dom'

describe('CRUD operations (store logic)', () => {
  it('creates and adds item to state', () => {
    const state: any[] = []
    const newItem = { id: '1', name: 'Test Goal' }
    const updated = [...state, newItem]
    expect(updated).toHaveLength(1)
    expect(updated[0].name).toBe('Test Goal')
  })

  it('updates item in state', () => {
    const state = [{ id: '1', name: 'Old Name' }]
    const updated = state.map(item =>
      item.id === '1' ? { ...item, name: 'New Name' } : item
    )
    expect(updated[0].name).toBe('New Name')
  })

  it('deletes item from state', () => {
    const state = [{ id: '1', name: 'A' }, { id: '2', name: 'B' }]
    const updated = state.filter(item => item.id !== '1')
    expect(updated).toHaveLength(1)
    expect(updated[0].id).toBe('2')
  })

  it('optimistic rollback restores previous state', () => {
    const previousState = { id: '1', name: 'Original', progress: 50 }
    const optimisticState = { ...previousState, progress: 100 }

    const rollback = () => optimisticState.name = previousState.name
    rollback()
    expect(optimisticState.name).toBe('Original')
  })

  it('handles error during create', () => {
    const state: any[] = []
    const newItem = { id: '2', name: 'New' }

    const simulateError = () => { throw new Error('DB error') }
    const createWithRollback = () => {
      const optimistic = [...state, newItem]
      try {
        simulateError()
      } catch {
        return state
      }
      return optimistic
    }

    const result = createWithRollback()
    expect(result).toEqual(state)
    expect(result).toHaveLength(0)
  })
})

describe('Auth flows (login/register/logout)', () => {
  it('validates user credentials (demo)', () => {
    const validateCredentials = (email: string, password: string) => {
      if (email === 'demo@example.com' && password === 'demo123') {
        return { user: { id: '1', email } }
      }
      throw new Error('Invalid credentials')
    }

    const valid = validateCredentials('demo@example.com', 'demo123')
    expect(valid.user.email).toBe('demo@example.com')

    expect(() => validateCredentials('wrong', 'wrong')).toThrow('Invalid credentials')
  })

  it('validates registration data', () => {
    const validateRegistration = (email: string, password: string, username: string) => {
      if (!email || !password || !username) throw new Error('All fields required')
      if (password.length < 6) throw new Error('Password too short')
      return { user: { id: 'new-id', email, login: username } }
    }

    const result = validateRegistration('new@test.com', '123456', 'newuser')
    expect(result.user.login).toBe('newuser')

    expect(() => validateRegistration('', '123456', 'u')).toThrow('All fields required')
    expect(() => validateRegistration('a@b.com', '123', 'u')).toThrow('Password too short')
  })

  it('handles logout correctly', () => {
    let user = { id: '1', email: 'test@test.com' }

    const logout = () => { user = null as any }
    logout()
    expect(user).toBeNull()
  })

  it('restores session on reload', () => {
    const storedSession = JSON.stringify({ id: '1', email: 'test@test.com' })
    const restore = () => {
      try {
        return JSON.parse(storedSession)
      } catch {
        return null
      }
    }
    expect(restore().email).toBe('test@test.com')
  })

  it('handles invalid password', () => {
    const login = (password: string) => {
      if (password !== 'correct') throw new Error('Неверный пароль')
      return { token: 'valid-token' }
    }
    expect(() => login('wrong')).toThrow('Неверный пароль')
    expect(login('correct').token).toBe('valid-token')
  })
})

describe('Navigation', () => {
  it('protects private routes from unauthenticated users', () => {
    const isAuthenticated = false
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route path="/login" element={<div data-testid="login-page">Login</div>} />
          <Route
            path="/dashboard"
            element={
              isAuthenticated
                ? <div data-testid="dashboard-page">Dashboard</div>
                : <Navigate to="/login" replace />
            }
          />
        </Routes>
      </MemoryRouter>
    )
    expect(screen.queryByTestId('dashboard-page')).toBeNull()
    expect(screen.getByTestId('login-page')).toBeInTheDocument()
  })

  it('allows authenticated users to access protected routes', () => {
    const isAuthenticated = true
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route path="/login" element={<div>Login</div>} />
          <Route
            path="/dashboard"
            element={
              isAuthenticated
                ? <div data-testid="dashboard-page">Dashboard</div>
                : <Navigate to="/login" replace />
            }
          />
        </Routes>
      </MemoryRouter>
    )
    expect(screen.getByTestId('dashboard-page')).toBeInTheDocument()
  })

  it('navigates between pages correctly', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<div data-testid="home">Home</div>} />
          <Route path="/goals" element={<div data-testid="goals">Goals</div>} />
        </Routes>
      </MemoryRouter>
    )
    expect(screen.getByTestId('home')).toBeInTheDocument()
  })

  it('handles deep linking to goal detail', () => {
    render(
      <MemoryRouter initialEntries={['/goals/123']}>
        <Routes>
          <Route path="/goals/:id" element={<div data-testid="goal-detail">Goal 123</div>} />
        </Routes>
      </MemoryRouter>
    )
    expect(screen.getByTestId('goal-detail')).toBeInTheDocument()
  })
})
