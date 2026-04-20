import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { api } from '@/lib/supabase-api'
import { isDemoMode } from '@/lib/utils'
import type { 
  User, 
  Goal, 
  Task, 
  Metric, 
  MetricEntry, 
  Category, 
  Stage, 
  Subtask,
  Unit,
  FavoriteFilter,
  Achievement,
  DashboardStats,
  MetricAnalytics
} from '@/types'

interface ApiDataState {
  // Data
  user: User | null
  categories: Category[]
  goals: Goal[]
  stages: Stage[]
  tasks: Task[]
  subtasks: Subtask[]
  metrics: Metric[]
  metricEntries: MetricEntry[]
  achievements: Achievement[]
  units: Unit[]
  favoriteFilters: FavoriteFilter[]
  
  // Loading states
  isLoading: boolean
  error: string | null
  
  // Actions
  fetchCategories: () => Promise<void>
  fetchGoals: () => Promise<void>
  fetchStages: () => Promise<void>
  fetchTasks: () => Promise<void>
  fetchMetrics: () => Promise<void>
  fetchMetricEntries: (metricId: string) => Promise<void>
  fetchAchievements: () => Promise<void>
  fetchUnits: () => Promise<void>
  fetchAll: () => Promise<void>
  
  // CRUD operations
  createCategory: (category: any) => Promise<void>
  updateCategory: (id: string, updates: Partial<Category>) => Promise<void>
  deleteCategory: (id: string) => Promise<void>
  
  createGoal: (goal: any) => Promise<void>
  updateGoal: (id: string, updates: Partial<Goal>) => Promise<void>
  deleteGoal: (id: string) => Promise<void>
  
  createStage: (stage: any) => Promise<void>
  updateStage: (id: string, updates: Partial<Stage>) => Promise<void>
  deleteStage: (id: string) => Promise<void>
  
  createTask: (task: any) => Promise<void>
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>
  deleteTask: (id: string) => Promise<void>
  
  createSubtask: (subtask: any) => Promise<void>
  updateSubtask: (id: string, updates: Partial<Subtask>) => Promise<void>
  deleteSubtask: (id: string) => Promise<void>
  
  createMetric: (metric: any) => Promise<void>
  updateMetric: (id: string, updates: Partial<Metric>) => Promise<void>
  deleteMetric: (id: string) => Promise<void>
  
  createMetricEntry: (entry: any) => Promise<void>
  updateMetricEntry: (id: string, updates: Partial<MetricEntry>) => Promise<void>
  deleteMetricEntry: (id: string) => Promise<void>
  
  createUnit: (unit: any) => Promise<void>
  updateUnit: (id: string, updates: Partial<Unit>) => Promise<void>
  deleteUnit: (id: string) => Promise<void>
  
  createFavoriteFilter: (filter: any) => Promise<void>
  updateFavoriteFilter: (id: string, updates: Partial<FavoriteFilter>) => Promise<void>
  deleteFavoriteFilter: (id: string) => Promise<void>
  
  clearError: () => void
  setUser: (user: User | null) => void
}

// Create stable fetch functions using useCallback pattern
const createFetchFunctions = (set: any, get: any) => {
  const fetchCategories = async () => {
    try {
      set({ isLoading: true, error: null })
      const storeUserId = get().user?.id
      const effectiveUserId = storeUserId || (isDemoMode() ? 'ee6724eb-d38f-4e62-ba73-b6cd272b5f31' : null)
      if (!effectiveUserId) throw new Error('User not authenticated')
      
      const categories = await api.getCategories(effectiveUserId)
      const transformedCategories = categories.map((category: any) => ({
        ...category,
        createdAt: category.created_at,
        updatedAt: category.updated_at,
        userId: category.user_id
      }))
      set({ categories: transformedCategories })
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to fetch categories' })
    } finally {
      set({ isLoading: false })
    }
  }

  const fetchGoals = async () => {
    try {
      set({ isLoading: true, error: null })
      const storeUserId = get().user?.id
      const effectiveUserId = storeUserId || (isDemoMode() ? 'ee6724eb-d38f-4e62-ba73-b6cd272b5f31' : null)
      if (!effectiveUserId) throw new Error('User not authenticated')
      
      console.log('fetchGoals - userId:', effectiveUserId, 'isDemo:', isDemoMode())
      
      const goals = await api.getGoals(effectiveUserId)
      const transformedGoals = goals.map((goal: any) => ({
        ...goal,
        createdAt: goal.created_at,
        updatedAt: goal.updated_at,
        userId: goal.user_id,
        categoryId: goal.category_id,
        parentGoalId: goal.parent_goal_id,
        orderIndex: goal.order_index,
        startDate: goal.start_date,
        dueType: goal.due_type,
        dueDate: goal.due_date,
        dueMonthYear: goal.due_month_year,
        dueYear: goal.due_year,
        progressCalculation: goal.progress_calculation,
        progressMetricId: goal.progress_metric_id,
        completedAt: goal.completed_at,
        expectedCompletionDate: goal.expected_completion_date,
        isFrozen: goal.is_frozen,
        frozenAt: goal.frozen_at,
        autoCalculateStatus: goal.auto_calculate_status
      }))
      set({ goals: transformedGoals })
    } catch (error) {
      console.error('fetchGoals error:', error)
      set({ error: error instanceof Error ? error.message : 'Failed to fetch goals' })
    } finally {
      set({ isLoading: false })
    }
  }

  const fetchStages = async () => {
    try {
      set({ isLoading: true, error: null })
      const storeUserId = get().user?.id
      const effectiveUserId = storeUserId || (isDemoMode() ? 'ee6724eb-d38f-4e62-ba73-b6cd272b5f31' : null)
      if (!effectiveUserId) throw new Error('User not authenticated')
      
      const stages = await api.getStages(effectiveUserId)
      const transformedStages = stages.map((stage: any) => ({
        ...stage,
        createdAt: stage.created_at,
        updatedAt: stage.updated_at,
        userId: stage.user_id,
        goalId: stage.goal_id,
        orderIndex: stage.order_index,
        startDate: stage.start_date,
        dueDate: stage.due_date
      }))
      set({ stages: transformedStages })
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to fetch stages' })
    } finally {
      set({ isLoading: false })
    }
  }

  const fetchTasks = async () => {
    try {
      set({ isLoading: true, error: null })
      const storeUserId = get().user?.id
      const effectiveUserId = storeUserId || (isDemoMode() ? 'ee6724eb-d38f-4e62-ba73-b6cd272b5f31' : null)
      if (!effectiveUserId) throw new Error('User not authenticated')
      
      const tasks = await api.getTasks(effectiveUserId)
      const transformedTasks = tasks.map((task: any) => ({
        ...task,
        createdAt: task.created_at,
        updatedAt: task.updated_at,
        userId: task.user_id,
        categoryId: task.category_id,
        goalId: task.goal_id,
        stageId: task.stage_id,
        parentTaskId: task.parent_task_id,
        orderIndex: task.order_index,
        startDate: task.start_date,
        dueDate: task.due_date,
        isPeriodBased: task.is_period_based,
        completedAt: task.completed_at
      }))
      set({ tasks: transformedTasks })
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to fetch tasks' })
    } finally {
      set({ isLoading: false })
    }
  }

  const fetchMetrics = async () => {
    try {
      set({ isLoading: true, error: null })
      const storeUserId = get().user?.id
      const effectiveUserId = storeUserId || (isDemoMode() ? 'ee6724eb-d38f-4e62-ba73-b6cd272b5f31' : null)
      if (!effectiveUserId) throw new Error('User not authenticated')
      
      const metrics = await api.getMetrics(effectiveUserId)
      const transformedMetrics = metrics.map((metric: any) => ({
        ...metric,
        createdAt: metric.created_at,
        updatedAt: metric.updated_at,
        userId: metric.user_id,
        categoryId: metric.category_id,
        goalId: metric.goal_id,
        unitId: metric.unit_id,
        inputMode: metric.input_mode,
        stepValue: metric.step_value,
        startValue: metric.start_value,
        targetValue: metric.target_value,
        autoResetEnabled: metric.auto_reset_enabled,
        resetPeriodicity: metric.reset_periodicity,
        resetWeekdays: metric.reset_weekdays,
        resetDayOfMonth: metric.reset_day_of_month,
        resetCustomDays: metric.reset_custom_days,
        lastResetAt: metric.last_reset_at,
        targetIncreaseEnabled: metric.target_increase_enabled,
        targetIncreaseValue: metric.target_increase_value,
        targetIncreaseType: metric.target_increase_type,
        targetIncreasePeriodicity: metric.target_increase_periodicity
      }))
      set({ metrics: transformedMetrics })
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to fetch metrics' })
    } finally {
      set({ isLoading: false })
    }
  }

  const fetchMetricEntries = async (metricId: string) => {
    try {
      set({ isLoading: true, error: null })
      const entries = await api.getMetricEntries(metricId)
      const transformedEntries = entries.map((entry: any) => ({
        ...entry,
        createdAt: entry.created_at,
        entryDate: entry.entry_date,
        finalValue: entry.final_value,
        isAddition: entry.is_addition,
        isOverachievement: entry.is_overachievement,
        overachievementValue: entry.overachievement_value
      }))
      set({ metricEntries: transformedEntries })
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to fetch metric entries' })
    } finally {
      set({ isLoading: false })
    }
  }

  const fetchAchievements = async () => {
    try {
      set({ isLoading: true, error: null })
      // TODO: Implement achievements API
      set({ achievements: [] })
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to fetch achievements' })
    } finally {
      set({ isLoading: false })
    }
  }

  const fetchUnits = async () => {
    try {
      set({ isLoading: true, error: null })
      const units = await api.getUnits()
      const transformedUnits = units.map((unit: any) => ({
        ...unit,
        createdAt: unit.created_at
      }))
      set({ units: transformedUnits })
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to fetch units' })
    } finally {
      set({ isLoading: false })
    }
  }

  const fetchAll = async () => {
    await Promise.all([
      fetchCategories(),
      fetchGoals(),
      fetchStages(),
      fetchTasks(),
      fetchMetrics()
    ])
  }

  return {
    fetchCategories,
    fetchGoals,
    fetchStages,
    fetchTasks,
    fetchMetrics,
    fetchMetricEntries,
    fetchAchievements,
    fetchUnits,
    fetchAll
  }
}

export const useApiDataStoreOptimized = create<ApiDataState>((set, get) => {
  // Create stable fetch functions
  const fetchFunctions = createFetchFunctions(set, get)
  
  return {
    // Initial state
    user: null,
    categories: [],
    goals: [],
    stages: [],
    tasks: [],
    subtasks: [],
    metrics: [],
    metricEntries: [],
    achievements: [],
    units: [],
    favoriteFilters: [],
    isLoading: false,
    error: null,
    
    // Fetch methods (stable references)
    ...fetchFunctions,
    
    // CRUD operations
    createCategory: async (category: any) => {
      try {
        set({ isLoading: true, error: null })
        const newCategory = await api.createCategory(category)
        set(state => ({
          categories: [...state.categories, newCategory]
        }))
      } catch (error) {
        set({ error: error instanceof Error ? error.message : 'Failed to create category' })
      } finally {
        set({ isLoading: false })
      }
    },
    
    updateCategory: async (id: string, updates: Partial<Category>) => {
      try {
        set({ isLoading: true, error: null })
        const updatedCategory = await api.updateCategory(id, updates)
        set(state => ({
          categories: state.categories.map(cat => cat.id === id ? updatedCategory : cat)
        }))
      } catch (error) {
        set({ error: error instanceof Error ? error.message : 'Failed to update category' })
      } finally {
        set({ isLoading: false })
      }
    },
    
    deleteCategory: async (id: string) => {
      try {
        set({ isLoading: true, error: null })
        await api.deleteCategory(id)
        set(state => ({
          categories: state.categories.filter(cat => cat.id !== id)
        }))
      } catch (error) {
        set({ error: error instanceof Error ? error.message : 'Failed to delete category' })
      } finally {
        set({ isLoading: false })
      }
    },
    
    // Add other CRUD operations as needed...
    
    clearError: () => set({ error: null }),
    setUser: (user: User | null) => set({ user })
  }
}, {
  name: 'api-data-store',
  version: 1
})
