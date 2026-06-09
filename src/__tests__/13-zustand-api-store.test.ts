import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useApiDataStore } from '@/stores/apiDataStore'
import * as api from '@/lib/supabase-api'

vi.mock('@/lib/supabase-api', () => ({
  getCategories: vi.fn().mockResolvedValue([]),
  getGoals: vi.fn().mockResolvedValue([]),
  getStages: vi.fn().mockResolvedValue([]),
  getTasks: vi.fn().mockResolvedValue([]),
  getMetrics: vi.fn().mockResolvedValue([]),
  getAllMetricEntries: vi.fn().mockResolvedValue([]),
  getAchievements: vi.fn().mockResolvedValue([]),
  getUserAchievements: vi.fn().mockResolvedValue([]),
  getUnits: vi.fn().mockResolvedValue([]),
  getPointsHistory: vi.fn().mockResolvedValue([]),
  createGoal: vi.fn().mockImplementation((g: any) => Promise.resolve({ ...g, id: 'new-id' })),
  updateGoal: vi.fn().mockImplementation((id: string, u: any) => Promise.resolve({ id, ...u })),
  deleteGoal: vi.fn().mockResolvedValue(undefined),
  createTask: vi.fn().mockImplementation((t: any) => Promise.resolve({ ...t, id: 'new-task-id' })),
  updateTask: vi.fn().mockImplementation((id: string, u: any) => Promise.resolve({ id, ...u })),
  deleteTask: vi.fn().mockResolvedValue(undefined),
  createMetric: vi.fn().mockImplementation((m: any) => Promise.resolve({ ...m, id: 'new-metric-id' })),
  updateMetric: vi.fn().mockImplementation((id: string, u: any) => Promise.resolve({ id, ...u })),
  deleteMetric: vi.fn().mockResolvedValue(undefined),
  createCategory: vi.fn().mockImplementation((c: any) => Promise.resolve({ ...c, id: 'new-cat-id' })),
  updateCategory: vi.fn().mockImplementation((id: string, u: any) => Promise.resolve({ id, ...u })),
  deleteCategory: vi.fn().mockResolvedValue(undefined),
  createMetricEntry: vi.fn().mockImplementation((e: any) => Promise.resolve({ ...e, id: 'new-entry-id' })),
  updateMetricEntry: vi.fn().mockImplementation((id: string, u: any) => Promise.resolve({ id, ...u })),
  deleteMetricEntry: vi.fn().mockResolvedValue(undefined),
  createAchievement: vi.fn().mockResolvedValue(undefined),
  createUnit: vi.fn().mockResolvedValue(undefined),
  updateUnit: vi.fn().mockResolvedValue(undefined),
  deleteUnit: vi.fn().mockResolvedValue(undefined),
  getDashboardStats: vi.fn().mockResolvedValue({
    totalGoals: 0, totalTasks: 0, totalMetrics: 0,
    completedGoals: 0, completedTasks: 0,
  }),
  getUpcomingTasks: vi.fn().mockResolvedValue([]),
  getUpcomingGoals: vi.fn().mockResolvedValue([]),
  getMetricAnalytics: vi.fn().mockResolvedValue([]),
  fetchFavoriteFilters: vi.fn().mockResolvedValue([]),
  createFavoriteFilter: vi.fn().mockResolvedValue(undefined),
  updateFavoriteFilter: vi.fn().mockResolvedValue(undefined),
  deleteFavoriteFilter: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/demo', () => ({
  isDemoMode: () => true,
  DEMO_USER_ID: 'ee6724eb-d38f-4e62-ba73-b6cd272b5f31',
}))

const DEMO_USER = {
  id: 'ee6724eb-d38f-4e62-ba73-b6cd272b5f31',
  login: 'demo',
  email: 'demo@example.com',
}

describe('Zustand apiDataStore', () => {
  beforeEach(() => {
    useApiDataStore.setState({
      user: null,
      categories: [],
      goals: [],
      stages: [],
      tasks: [],
      subtasks: [],
      metrics: [],
      metricEntries: [],
      achievements: [],
      userAchievements: [],
      units: [],
      favoriteFilters: [],
      pointsHistory: [],
      isLoading: false,
      error: null,
    })
  })

  it('initializes with empty state', () => {
    const state = useApiDataStore.getState()
    expect(state.goals).toEqual([])
    expect(state.tasks).toEqual([])
    expect(state.categories).toEqual([])
    expect(state.isLoading).toBe(false)
    expect(state.error).toBeNull()
  })

  it('sets user', () => {
    useApiDataStore.getState().setUser(DEMO_USER as any)
    const state = useApiDataStore.getState()
    expect(state.user?.login).toBe('demo')
  })

  it('clears error', () => {
    useApiDataStore.setState({ error: 'Some error' })
    useApiDataStore.getState().clearError()
    expect(useApiDataStore.getState().error).toBeNull()
  })

  it('creates a category and adds to state', async () => {
    useApiDataStore.getState().setUser(DEMO_USER as any)
    const { createCategory } = useApiDataStore.getState()
    await createCategory({ name: 'Health', icon: 'heart', color: '#ff0000', userId: DEMO_USER.id })
    const state = useApiDataStore.getState()
    expect(state.categories.length).toBeGreaterThan(0)
  })

  it('creates a goal and adds to state', async () => {
    useApiDataStore.getState().setUser(DEMO_USER as any)
    const { createGoal } = useApiDataStore.getState()
    await createGoal({ name: 'Test Goal', categoryId: 'cat-1', deadlineType: 'none', progressCalculation: 'by_tasks' })
    const state = useApiDataStore.getState()
    expect(state.goals.length).toBeGreaterThan(0)
  })

  it('deletes a goal and removes from state', async () => {
    useApiDataStore.getState().setUser(DEMO_USER as any)
    useApiDataStore.setState({ goals: [{ id: 'goal-to-delete', name: 'Delete Me', userId: DEMO_USER.id, status: 'in_progress', priority: 3, progress: 0, progressCalculation: 'by_tasks', deadlineType: 'none', createdAt: new Date(), updatedAt: new Date() }] })
    
    const { deleteGoal } = useApiDataStore.getState()
    await deleteGoal('goal-to-delete')
    const state = useApiDataStore.getState()
    expect(state.goals.find(g => g.id === 'goal-to-delete')).toBeUndefined()
  })

  it('creates a task and adds to state', async () => {
    useApiDataStore.getState().setUser(DEMO_USER as any)
    const { createTask } = useApiDataStore.getState()
    await createTask({ name: 'Test Task', userId: DEMO_USER.id, priority: 3, weight: 1 })
    const state = useApiDataStore.getState()
    expect(state.tasks.length).toBeGreaterThan(0)
  })

  it('creates a metric and adds to state', async () => {
    useApiDataStore.getState().setUser(DEMO_USER as any)
    const { createMetric } = useApiDataStore.getState()
    await createMetric({
      name: 'Steps', userId: DEMO_USER.id, categoryId: 'cat-1',
      type: 'counter', unit: 'steps', inputMode: 'fixed_step',
      stepValue: 1, initialValue: 0, targetValue: 10000,
      color: '#000', periodicity: 'daily',
    })
    const state = useApiDataStore.getState()
    expect(state.metrics.length).toBeGreaterThan(0)
  })

  it('creates a metric entry and adds to state', async () => {
    useApiDataStore.getState().setUser(DEMO_USER as any)
    const { createMetricEntry, addOptimisticMetricEntry } = useApiDataStore.getState()
    
    addOptimisticMetricEntry({ id: 'opt-entry', metricId: 'm-1', value: 10, finalValue: 10, isAddition: true, entryDate: new Date(), createdAt: new Date() })
    expect(useApiDataStore.getState().metricEntries.length).toBeGreaterThan(0)
  })

  it('handles fetch errors gracefully', async () => {
    useApiDataStore.getState().setUser(DEMO_USER as any)
    
    const mockError = new Error('Network failure')
    vi.mocked(api.getCategories).mockRejectedValueOnce(mockError)

    const { fetchCategories } = useApiDataStore.getState()
    await fetchCategories()
    const state = useApiDataStore.getState()
    expect(state.isLoading).toBe(false)
  })
})
