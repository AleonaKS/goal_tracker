import { create } from 'zustand'
import * as api from '@/lib/supabase-api'
import { isDemoMode } from '@/lib/demo'
import type { 
  Category, 
  Goal, 
  Stage, 
  Task, 
  Metric, 
  MetricEntry, 
  Achievement,
  UserAchievement,
  Unit,
  FavoriteFilter,
  Subtask,
  DashboardStats,
  MetricAnalytics,
  User
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
  userAchievements: UserAchievement[]
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
  fetchAllMetricEntries: () => Promise<void>
  fetchMetricEntries: (metricId: string) => Promise<void>
  fetchAchievements: () => Promise<void>
  fetchUserAchievements: () => Promise<void>
  fetchUnits: () => Promise<void>
  fetchAll: () => Promise<void>
  
  // CRUD operations
  createCategory: (category: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>
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
  
  createMetricEntry: (entry: any) => Promise<MetricEntry>
  updateMetricEntry: (id: string, updates: Partial<MetricEntry>) => Promise<void>
  deleteMetricEntry: (id: string) => Promise<void>
  
  createAchievement: (achievement: Omit<Achievement, 'id' | 'createdAt'>) => Promise<void>
  createUnit: (unit: Omit<Unit, 'id' | 'createdAt'>) => Promise<void>
  updateUnit: (id: string, updates: Partial<Unit>) => Promise<void>
  deleteUnit: (id: string) => Promise<void>
  
  // Dashboard
  getDashboardStats: () => Promise<DashboardStats>
  getUpcomingTasks: (days?: number) => Promise<Task[]>
  getUpcomingGoals: (days?: number) => Promise<Goal[]>
  getMetricAnalytics: () => Promise<MetricAnalytics[]>
  
  // Favorite Filters
  fetchFavoriteFilters: () => Promise<void>
  createFavoriteFilter: (filter: Omit<FavoriteFilter, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>
  updateFavoriteFilter: (id: string, updates: Partial<FavoriteFilter>) => Promise<void>
  deleteFavoriteFilter: (id: string) => Promise<void>
  
  clearError: () => void
  setUser: (user: User | null) => void
}

export const useApiDataStore = create<ApiDataState>((set, get) => ({
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
  userAchievements: [],
  units: [],
  favoriteFilters: [],
  isLoading: false,
  error: null,
  
  // Fetch methods
  fetchCategories: async () => {
    try {
      set({ isLoading: true, error: null })
      const storeUserId = get().user?.id
      const effectiveUserId = storeUserId || (isDemoMode() ? 'ee6724eb-d38f-4e62-ba73-b6cd272b5f31' : null)
      if (!effectiveUserId) throw new Error('User not authenticated')
      
      const categories = await api.getCategories(effectiveUserId)
      // Transform Supabase snake_case to camelCase
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
  },
  
  fetchGoals: async () => {
    try {
      set({ isLoading: true, error: null })
      const storeUserId = get().user?.id
      const effectiveUserId = storeUserId || (isDemoMode() ? 'ee6724eb-d38f-4e62-ba73-b6cd272b5f31' : null)
      if (!effectiveUserId) throw new Error('User not authenticated')
      
      console.log('fetchGoals - userId:', effectiveUserId, 'isDemo:', isDemoMode())
      
      const goals = await api.getGoals(effectiveUserId)
      // Transform Supabase snake_case to camelCase
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
  },
  
  fetchStages: async () => {
    try {
      set({ isLoading: true, error: null })
      const storeUserId = get().user?.id
      const effectiveUserId = storeUserId || (isDemoMode() ? 'ee6724eb-d38f-4e62-ba73-b6cd272b5f31' : null)
      if (!effectiveUserId) throw new Error('User not authenticated')
      
      const stages = await api.getStages(effectiveUserId)
      // Transform Supabase snake_case to camelCase
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
  },
  
  fetchTasks: async () => {
    try {
      set({ isLoading: true, error: null })
      const storeUserId = get().user?.id
      const effectiveUserId = storeUserId || (isDemoMode() ? 'ee6724eb-d38f-4e62-ba73-b6cd272b5f31' : null)
      if (!effectiveUserId) throw new Error('User not authenticated')
      
      console.log('fetchTasks - fetching for userId:', effectiveUserId)
      const tasks = await api.getTasks(effectiveUserId)
      console.log('fetchTasks - returned', tasks.length, 'tasks')
      // Transform Supabase snake_case to camelCase
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
      console.log('fetchTasks - transformed tasks, sample goalId:', transformedTasks[0]?.goalId)
      set({ tasks: transformedTasks })
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to fetch tasks' })
    } finally {
      set({ isLoading: false })
    }
  },
  
  fetchMetrics: async () => {
    try {
      set({ isLoading: true, error: null })
      const storeUserId = get().user?.id
      const effectiveUserId = storeUserId || (isDemoMode() ? 'ee6724eb-d38f-4e62-ba73-b6cd272b5f31' : null)
      if (!effectiveUserId) throw new Error('User not authenticated')
      
      const metrics = await api.getMetrics(effectiveUserId)
      // Transform Supabase snake_case to camelCase
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
  },
  
  fetchAllMetricEntries: async () => {
    try {
      set({ isLoading: true, error: null })
      const storeUserId = get().user?.id
      const effectiveUserId = storeUserId || (isDemoMode() ? 'ee6724eb-d38f-4e62-ba73-b6cd272b5f31' : null)
      if (!effectiveUserId) throw new Error('User not authenticated')
      
      const entries = await api.getAllMetricEntries(effectiveUserId)
      set({ metricEntries: entries })
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to fetch metric entries' })
    } finally {
      set({ isLoading: false })
    }
  },

  fetchMetricEntries: async (metricId: string) => {
    try {
      set({ isLoading: true, error: null })
      const entries = await api.getMetricEntries(metricId)
      // Transform Supabase snake_case to camelCase
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
  },
  
  fetchAchievements: async () => {
    try {
      set({ isLoading: true, error: null })
      const storeUserId = get().user?.id
      const effectiveUserId = storeUserId || (isDemoMode() ? 'ee6724eb-d38f-4e62-ba73-b6cd272b5f31' : null)
      if (!effectiveUserId) throw new Error('User not authenticated')
      
      const achievements = await api.getAchievements(effectiveUserId)
      set({ achievements })
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to fetch achievements' })
    } finally {
      set({ isLoading: false })
    }
  },
  
  fetchUserAchievements: async () => {
    try {
      set({ isLoading: true, error: null })
      const storeUserId = get().user?.id
      const effectiveUserId = storeUserId || (isDemoMode() ? 'ee6724eb-d38f-4e62-ba73-b6cd272b5f31' : null)
      if (!effectiveUserId) throw new Error('User not authenticated')
      
      const achievements = await api.getUserAchievements(effectiveUserId)
      set({ userAchievements: achievements })
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to fetch user achievements' })
    } finally {
      set({ isLoading: false })
    }
  },
  
  fetchUnits: async () => {
    try {
      set({ isLoading: true, error: null })
      const units = await api.getUnits()
      // Transform Supabase snake_case to camelCase
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
  },
  
  fetchAll: async () => {
    console.log('fetchAll - starting')
    const { 
      fetchCategories, 
      fetchGoals, 
      fetchStages, 
      fetchTasks, 
      fetchMetrics,
      fetchAllMetricEntries
    } = get()
    
    await Promise.all([
      fetchCategories(),
      fetchGoals(),
      fetchStages(),
      fetchTasks(),
      fetchMetrics(),
      fetchAllMetricEntries()
    ])
    console.log('fetchAll - completed')
  },
  
  // CRUD operations
  createCategory: async (category: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>) => {
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
      // Transform snake_case to camelCase (API returns snake_case from DB)
      const rawCategory = updatedCategory as any
      const transformedCategory: Category = {
        ...rawCategory,
        createdAt: rawCategory.created_at ? new Date(rawCategory.created_at) : rawCategory.createdAt,
        updatedAt: rawCategory.updated_at ? new Date(rawCategory.updated_at) : rawCategory.updatedAt,
        userId: rawCategory.user_id || rawCategory.userId,
        isDefault: rawCategory.is_default ?? rawCategory.isDefault ?? false,
        orderIndex: rawCategory.order_index ?? rawCategory.orderIndex ?? 0,
        goalCount: rawCategory.goal_count ?? rawCategory.goalCount ?? 0,
        taskCount: rawCategory.task_count ?? rawCategory.taskCount ?? 0,
      }
      set(state => ({
        categories: state.categories.map(cat => cat.id === id ? transformedCategory : cat)
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
  
  createGoal: async (goal: any) => {
    try {
      set({ isLoading: true, error: null })
      const newGoal = await api.createGoal(goal)
      set(state => ({
        goals: [...state.goals, newGoal]
      }))
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to create goal' })
    } finally {
      set({ isLoading: false })
    }
  },
  
  updateGoal: async (id: string, updates: Partial<Goal>) => {
    try {
      set({ isLoading: true, error: null })
      const updatedGoal = await api.updateGoal(id, updates)
      // Transform snake_case to camelCase (API returns snake_case from DB)
      const rawGoal = updatedGoal as any
      const transformedGoal: Goal = {
        ...rawGoal,
        createdAt: rawGoal.created_at ? new Date(rawGoal.created_at) : rawGoal.createdAt,
        updatedAt: rawGoal.updated_at ? new Date(rawGoal.updated_at) : rawGoal.updatedAt,
        userId: rawGoal.user_id || rawGoal.userId,
        categoryId: rawGoal.category_id || rawGoal.categoryId,
        parentGoalId: rawGoal.parent_goal_id || rawGoal.parentGoalId,
        orderIndex: rawGoal.order_index ?? rawGoal.orderIndex ?? 0,
        startDate: rawGoal.start_date ? new Date(rawGoal.start_date) : rawGoal.startDate,
        dueType: rawGoal.due_type || rawGoal.dueType,
        dueDate: rawGoal.due_date ? new Date(rawGoal.due_date) : rawGoal.dueDate,
        dueMonthYear: rawGoal.due_month_year || rawGoal.dueMonthYear,
        dueYear: rawGoal.due_year || rawGoal.dueYear,
        progressCalculation: rawGoal.progress_calculation || rawGoal.progressCalculation,
        progressMetricId: rawGoal.progress_metric_id || rawGoal.progressMetricId,
        completedAt: rawGoal.completed_at ? new Date(rawGoal.completed_at) : rawGoal.completedAt,
        expectedCompletionDate: rawGoal.expected_completion_date ? new Date(rawGoal.expected_completion_date) : rawGoal.expectedCompletionDate,
        isFrozen: rawGoal.is_frozen ?? rawGoal.isFrozen ?? false,
        frozenAt: rawGoal.frozen_at ? new Date(rawGoal.frozen_at) : rawGoal.frozenAt,
        autoCalculateStatus: rawGoal.auto_calculate_status ?? rawGoal.autoCalculateStatus ?? true,
        // Explicitly map fields that could be lost in transformation
        priority: rawGoal.priority ?? rawGoal.priority ?? 3,
        progress: rawGoal.progress ?? rawGoal.progress ?? 0,
        status: rawGoal.status || rawGoal.status || 'in_progress',
      }
      set(state => ({
        goals: state.goals.map(goal => goal.id === id ? transformedGoal : goal)
      }))
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to update goal' })
    } finally {
      set({ isLoading: false })
    }
  },
  
  deleteGoal: async (id: string) => {
    try {
      set({ isLoading: true, error: null })
      await api.deleteGoal(id)
      set(state => ({
        goals: state.goals.filter(goal => goal.id !== id)
      }))
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to delete goal' })
    } finally {
      set({ isLoading: false })
    }
  },
  
  createTask: async (task: any) => {
    try {
      set({ isLoading: true, error: null })
      const newTask = await api.createTask(task)
      set(state => ({
        tasks: [...state.tasks, newTask]
      }))
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to create task' })
    } finally {
      set({ isLoading: false })
    }
  },
  
  updateTask: async (id: string, updates: Partial<Task>) => {
    try {
      set({ isLoading: true, error: null })
      const updatedTask = await api.updateTask(id, updates)
      // Transform snake_case to camelCase (API returns snake_case from DB)
      const rawTask = updatedTask as any
      const transformedTask: Task = {
        ...rawTask,
        createdAt: rawTask.created_at ? new Date(rawTask.created_at) : rawTask.createdAt,
        updatedAt: rawTask.updated_at ? new Date(rawTask.updated_at) : rawTask.updatedAt,
        userId: rawTask.user_id || rawTask.userId,
        categoryId: rawTask.category_id || rawTask.categoryId,
        goalId: rawTask.goal_id || rawTask.goalId,
        stageId: rawTask.stage_id || rawTask.stageId,
        parentTaskId: rawTask.parent_task_id || rawTask.parentTaskId,
        orderIndex: rawTask.order_index ?? rawTask.orderIndex ?? 0,
        startDate: rawTask.start_date ? new Date(rawTask.start_date) : rawTask.startDate,
        dueDate: rawTask.due_date ? new Date(rawTask.due_date) : rawTask.dueDate,
        isPeriodBased: rawTask.is_period_based ?? rawTask.isPeriodBased ?? false,
        completedAt: rawTask.completed_at ? new Date(rawTask.completed_at) : rawTask.completedAt,
        // Explicitly map fields that could be lost in transformation
        complexity: rawTask.complexity ?? rawTask.complexity ?? 3,
        weight: rawTask.weight ?? rawTask.weight ?? 1,
        priority: rawTask.priority ?? rawTask.priority ?? 3,
        progress: rawTask.progress ?? rawTask.progress ?? 0,
        completed: rawTask.completed ?? rawTask.completed ?? false,
      }
      set(state => ({
        tasks: state.tasks.map(task => task.id === id ? transformedTask : task)
      }))
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to update task' })
    } finally {
      set({ isLoading: false })
    }
  },
  
  deleteTask: async (id: string) => {
    try {
      set({ isLoading: true, error: null })
      await api.deleteTask(id)
      set(state => ({
        tasks: state.tasks.filter(task => task.id !== id)
      }))
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to delete task' })
    } finally {
      set({ isLoading: false })
    }
  },
  
  createStage: async (stage: any) => {
    try {
      set({ isLoading: true, error: null })
      const newStage = await api.createStage(stage)
      set(state => ({
        stages: [...state.stages, newStage]
      }))
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to create stage' })
    } finally {
      set({ isLoading: false })
    }
  },
  
  updateStage: async (id: string, updates: Partial<Stage>) => {
    try {
      set({ isLoading: true, error: null })
      const updatedStage = await api.updateStage(id, updates)
      // Transform snake_case to camelCase (API returns snake_case from DB)
      const rawStage = updatedStage as any
      const transformedStage: Stage = {
        ...rawStage,
        createdAt: rawStage.created_at ? new Date(rawStage.created_at) : rawStage.createdAt,
        updatedAt: rawStage.updated_at ? new Date(rawStage.updated_at) : rawStage.updatedAt,
        userId: rawStage.user_id || rawStage.userId,
        goalId: rawStage.goal_id || rawStage.goalId,
        orderIndex: rawStage.order_index ?? rawStage.orderIndex ?? 0,
        startDate: rawStage.start_date ? new Date(rawStage.start_date) : rawStage.startDate,
        dueDate: rawStage.due_date ? new Date(rawStage.due_date) : rawStage.dueDate,
      }
      set(state => ({
        stages: state.stages.map(stage => stage.id === id ? transformedStage : stage)
      }))
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to update stage' })
    } finally {
      set({ isLoading: false })
    }
  },
  
  deleteStage: async (id: string) => {
    try {
      set({ isLoading: true, error: null })
      await api.deleteStage(id)
      set(state => ({
        stages: state.stages.filter(stage => stage.id !== id)
      }))
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to delete stage' })
    } finally {
      set({ isLoading: false })
    }
  },
  
  createMetric: async (metric: any) => {
    try {
      set({ isLoading: true, error: null })
      const newMetric = await api.createMetric(metric)
      set(state => ({
        metrics: [...state.metrics, newMetric]
      }))
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to create metric' })
    } finally {
      set({ isLoading: false })
    }
  },
  
  updateMetric: async (id: string, updates: Partial<Metric>) => {
    try {
      set({ isLoading: true, error: null })
      const updatedMetric = await api.updateMetric(id, updates)
      // Transform snake_case to camelCase (API returns snake_case from DB)
      const rawMetric = updatedMetric as any
      const transformedMetric: Metric = {
        ...rawMetric,
        createdAt: rawMetric.created_at ? new Date(rawMetric.created_at) : rawMetric.createdAt,
        updatedAt: rawMetric.updated_at ? new Date(rawMetric.updated_at) : rawMetric.updatedAt,
        userId: rawMetric.user_id || rawMetric.userId,
        categoryId: rawMetric.category_id || rawMetric.categoryId,
        goalId: rawMetric.goal_id || rawMetric.goalId,
        unitId: rawMetric.unit_id || rawMetric.unitId,
        inputMode: rawMetric.input_mode || rawMetric.inputMode,
        stepValue: rawMetric.step_value ?? rawMetric.stepValue,
        startValue: rawMetric.start_value ?? rawMetric.startValue ?? 0,
        targetValue: rawMetric.target_value ?? rawMetric.targetValue ?? 0,
        autoResetEnabled: rawMetric.auto_reset_enabled ?? rawMetric.autoResetEnabled ?? false,
        resetPeriodicity: rawMetric.reset_periodicity || rawMetric.resetPeriodicity,
        resetWeekdays: rawMetric.reset_weekdays || rawMetric.resetWeekdays,
        resetDayOfMonth: rawMetric.reset_day_of_month ?? rawMetric.resetDayOfMonth,
        resetCustomDays: rawMetric.reset_custom_days ?? rawMetric.resetCustomDays,
        lastResetAt: rawMetric.last_reset_at ? new Date(rawMetric.last_reset_at) : rawMetric.lastResetAt,
        targetIncreaseEnabled: rawMetric.target_increase_enabled ?? rawMetric.targetIncreaseEnabled ?? false,
        targetIncreaseValue: rawMetric.target_increase_value ?? rawMetric.targetIncreaseValue,
        targetIncreaseType: rawMetric.target_increase_type || rawMetric.targetIncreaseType,
        targetIncreasePeriodicity: rawMetric.target_increase_periodicity || rawMetric.targetIncreasePeriodicity,
      }
      set(state => ({
        metrics: state.metrics.map(metric => metric.id === id ? transformedMetric : metric)
      }))
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to update metric' })
    } finally {
      set({ isLoading: false })
    }
  },
  
  deleteMetric: async (id: string) => {
    try {
      set({ isLoading: true, error: null })
      await api.deleteMetric(id)
      set(state => ({
        metrics: state.metrics.filter(metric => metric.id !== id)
      }))
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to delete metric' })
    } finally {
      set({ isLoading: false })
    }
  },
  
  createMetricEntry: async (entry: any) => {
    try {
      set({ isLoading: true, error: null })
      const newEntry = await api.createMetricEntry(entry)
      // Add the new entry to state immediately
      set(state => ({
        metricEntries: [...state.metricEntries, newEntry]
      }))
      return newEntry
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create metric entry'
      set({ error: errorMessage })
      throw error  // Re-throw so caller can handle it
    } finally {
      set({ isLoading: false })
    }
  },
  
  updateMetricEntry: async (id: string, updates: Partial<MetricEntry>) => {
    try {
      set({ isLoading: true, error: null })
      const updatedEntry = await api.updateMetricEntry(id, updates)
      set(state => ({
        metricEntries: state.metricEntries.map(entry => entry.id === id ? updatedEntry : entry)
      }))
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to update metric entry' })
    } finally {
      set({ isLoading: false })
    }
  },
  
  deleteMetricEntry: async (id: string) => {
    try {
      set({ isLoading: true, error: null })
      await api.deleteMetricEntry(id)
      set(state => ({
        metricEntries: state.metricEntries.filter(entry => entry.id !== id)
      }))
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to delete metric entry' })
    } finally {
      set({ isLoading: false })
    }
  },

  createAchievement: async (achievement: Omit<Achievement, 'id' | 'createdAt'>) => {
    try {
      set({ isLoading: true, error: null })
      const newAchievement = await api.createAchievement(achievement)
      set(state => ({
        achievements: [...state.achievements, newAchievement]
      }))
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to create achievement' })
    } finally {
      set({ isLoading: false })
    }
  },
  
  fetchSubtasks: async () => {
    try {
      set({ isLoading: true, error: null })
      const storeUserId = get().user?.id
      const effectiveUserId = storeUserId || (isDemoMode() ? 'ee6724eb-d38f-4e62-ba73-b6cd272b5f31' : null)
      if (!effectiveUserId) throw new Error('User not authenticated')
      
      const subtasks = await api.getSubtasks(effectiveUserId)
      // Transform Supabase snake_case to camelCase
      const transformedSubtasks = subtasks.map((subtask: any) => ({
        ...subtask,
        createdAt: subtask.created_at,
        updatedAt: subtask.updated_at,
        userId: subtask.user_id,
        taskId: subtask.task_id,
        orderIndex: subtask.order_index,
        isCompleted: subtask.is_completed
      }))
      set({ subtasks: transformedSubtasks })
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to fetch subtasks' })
    } finally {
      set({ isLoading: false })
    }
  },
  
  createSubtask: async (subtask: any) => {
    try {
      set({ isLoading: true, error: null })
      const storeUserId = get().user?.id
      const effectiveUserId = storeUserId || (isDemoMode() ? 'ee6724eb-d38f-4e62-ba73-b6cd272b5f31' : null)
      if (!effectiveUserId) throw new Error('User not authenticated')
      
      const newSubtask = await api.createSubtask({
        ...subtask,
        userId: effectiveUserId
      })
      set(state => ({
        subtasks: [...state.subtasks, newSubtask]
      }))
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to create subtask' })
    } finally {
      set({ isLoading: false })
    }
  },
  
  updateSubtask: async (id: string, updates: Partial<Subtask>) => {
    try {
      set({ isLoading: true, error: null })
      const updatedSubtask = await api.updateSubtask(id, updates)
      set(state => ({
        subtasks: state.subtasks.map(subtask => subtask.id === id ? updatedSubtask : subtask)
      }))
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to update subtask' })
    } finally {
      set({ isLoading: false })
    }
  },
  
  deleteSubtask: async (id: string) => {
    try {
      set({ isLoading: true, error: null })
      await api.deleteSubtask(id)
      set(state => ({
        subtasks: state.subtasks.filter(subtask => subtask.id !== id)
      }))
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to delete subtask' })
    } finally {
      set({ isLoading: false })
    }
  },
  
  getDashboardStats: async () => {
    try {
      const storeUserId = get().user?.id
      const effectiveUserId = storeUserId || (isDemoMode() ? 'ee6724eb-d38f-4e62-ba73-b6cd272b5f31' : null)
      if (!effectiveUserId) throw new Error('User not authenticated')

      const goals = await api.getGoals(effectiveUserId)
      const tasks = await api.getTasks(effectiveUserId)
      const metrics = await api.getMetrics(effectiveUserId)

      const stats: DashboardStats = {
        totalGoals: goals.length,
        totalTasks: tasks.length,
        totalMetrics: metrics.length,
        completedGoals: goals.filter(g => g.status === 'completed').length,
        completedTasks: tasks.filter(t => t.completed).length,
        goals_in_progress: goals.filter(g => g.status === 'in_progress').length,
        goals_completed: goals.filter(g => g.status === 'completed').length,
        goals_overdue: goals.filter(g => g.status === 'overdue').length,
        goals_planned: goals.filter(g => g.status === 'planned').length,
      }
      return stats
    } catch (error) {
      console.error('getDashboardStats error:', error)
      return {
        totalGoals: 0, totalTasks: 0, totalMetrics: 0,
        completedGoals: 0, completedTasks: 0,
        goals_in_progress: 0, goals_completed: 0, goals_overdue: 0, goals_planned: 0
      } as DashboardStats
    }
  },
  
  getUpcomingTasks: async (days = 7) => {
    try {
      const storeUserId = get().user?.id
      const effectiveUserId = storeUserId || (isDemoMode() ? 'ee6724eb-d38f-4e62-ba73-b6cd272b5f31' : null)
      if (!effectiveUserId) return [] as Task[]

      const tasks = await api.getUpcomingTasks(effectiveUserId, days)
      // Transform snake_case to camelCase
      return tasks.map((task: any) => ({
        ...task,
        createdAt: task.created_at ? new Date(task.created_at) : task.createdAt,
        updatedAt: task.updated_at ? new Date(task.updated_at) : task.updatedAt,
        userId: task.user_id || task.userId,
        categoryId: task.category_id || task.categoryId,
        goalId: task.goal_id || task.goalId,
        stageId: task.stage_id || task.stageId,
        parentTaskId: task.parent_task_id || task.parentTaskId,
        orderIndex: task.order_index ?? task.orderIndex ?? 0,
        startDate: task.start_date ? new Date(task.start_date) : task.startDate,
        dueDate: task.due_date ? new Date(task.due_date) : task.dueDate,
        isPeriodBased: task.is_period_based ?? task.isPeriodBased ?? false,
        completedAt: task.completed_at ? new Date(task.completed_at) : task.completedAt,
      })) as Task[]
    } catch (error) {
      console.error('getUpcomingTasks error:', error)
      return [] as Task[]
    }
  },
  
  getUpcomingGoals: async (days = 30) => {
    try {
      const storeUserId = get().user?.id
      const effectiveUserId = storeUserId || (isDemoMode() ? 'ee6724eb-d38f-4e62-ba73-b6cd272b5f31' : null)
      if (!effectiveUserId) return [] as Goal[]

      const goals = await api.getUpcomingGoals(effectiveUserId, days)
      // Transform snake_case to camelCase
      return goals.map((goal: any) => ({
        ...goal,
        createdAt: goal.created_at ? new Date(goal.created_at) : goal.createdAt,
        updatedAt: goal.updated_at ? new Date(goal.updated_at) : goal.updatedAt,
        userId: goal.user_id || goal.userId,
        categoryId: goal.category_id || goal.categoryId,
        parentGoalId: goal.parent_goal_id || goal.parentGoalId,
        orderIndex: goal.order_index ?? goal.orderIndex ?? 0,
        startDate: goal.start_date ? new Date(goal.start_date) : goal.startDate,
        dueType: goal.due_type || goal.dueType,
        dueDate: goal.due_date ? new Date(goal.due_date) : goal.dueDate,
        dueMonthYear: goal.due_month_year || goal.dueMonthYear,
        dueYear: goal.due_year || goal.dueYear,
        progressCalculation: goal.progress_calculation || goal.progressCalculation,
        progressMetricId: goal.progress_metric_id || goal.progressMetricId,
        completedAt: goal.completed_at ? new Date(goal.completed_at) : goal.completedAt,
        expectedCompletionDate: goal.expected_completion_date ? new Date(goal.expected_completion_date) : goal.expectedCompletionDate,
        isFrozen: goal.is_frozen ?? goal.isFrozen ?? false,
        frozenAt: goal.frozen_at ? new Date(goal.frozen_at) : goal.frozenAt,
        autoCalculateStatus: goal.auto_calculate_status ?? goal.autoCalculateStatus ?? true,
      })) as Goal[]
    } catch (error) {
      console.error('getUpcomingGoals error:', error)
      return [] as Goal[]
    }
  },
  
  getMetricAnalytics: async () => {
    const { metrics, metricEntries } = get()
    
    return metrics.map(metric => {
      const entries = metricEntries.filter(e => e.metricId === metric.id)
      
      // Calculate current value
      const currentValue = entries.reduce(
        (sum, e) => sum + (e.isAddition ? e.value : -e.value),
        metric.startValue || 0
      )
      
      // Calculate progress
      const progress = metric.targetValue > 0 
        ? Math.min(100, Math.round((currentValue / metric.targetValue) * 100))
        : 0
      
      // Get last entry date
      const lastEntry = entries.length > 0 
        ? new Date(entries.sort((a, b) => 
            new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime()
          )[0].entryDate)
        : null
      
      // Calculate streaks
      const sortedEntries = [...entries].sort(
        (a, b) => new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime()
      )
      
      // Current streak
      let currentStreak = 0
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      for (let i = 0; i < sortedEntries.length; i++) {
        const entryDate = new Date(sortedEntries[i].entryDate)
        entryDate.setHours(0, 0, 0, 0)
        const diffDays = Math.floor((today.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24))
        
        if (diffDays === i || (i === 0 && diffDays <= 1)) {
          currentStreak++
        } else {
          break
        }
      }
      
      // Max streak
      let maxStreak = 0
      let tempStreak = 1
      const ascEntries = [...entries].sort(
        (a, b) => new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime()
      )
      
      for (let i = 1; i < ascEntries.length; i++) {
        const prevDate = new Date(ascEntries[i - 1].entryDate)
        const currDate = new Date(ascEntries[i].entryDate)
        const diff = Math.floor((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24))
        
        if (diff === 1) {
          tempStreak++
          maxStreak = Math.max(maxStreak, tempStreak)
        } else if (diff > 1) {
          tempStreak = 1
        }
      }
      maxStreak = Math.max(maxStreak, tempStreak, currentStreak)
      
      // Record value
      const recordValue = entries.length > 0 
        ? Math.max(...entries.map(e => e.value))
        : undefined
      
      return {
        metricId: metric.id,
        metricTitle: metric.name,
        currentValue,
        targetValue: metric.targetValue,
        progress,
        entriesCount: entries.length,
        lastEntry,
        currentStreak: currentStreak > 0 ? currentStreak : undefined,
        maxStreak: maxStreak > 0 ? maxStreak : undefined,
        recordValue
      }
    })
  },
  
  fetchFavoriteFilters: async () => {
    try {
      set({ isLoading: true, error: null })
      const storeUserId = get().user?.id
      const effectiveUserId = storeUserId || (isDemoMode() ? 'ee6724eb-d38f-4e62-ba73-b6cd272b5f31' : null)
      if (!effectiveUserId) throw new Error('User not authenticated')
      
      const filters = await api.getFavoriteFilters(effectiveUserId)
      // Transform Supabase snake_case to camelCase
      const transformedFilters = filters.map((filter: any) => ({
        ...filter,
        createdAt: filter.created_at,
        updatedAt: filter.updated_at,
        userId: filter.user_id,
        filterType: filter.filter_type,
        filterValue: filter.filter_value,
        sortBy: filter.sort_by,
        sortOrder: filter.sort_order
      }))
      set({ favoriteFilters: transformedFilters })
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to fetch favorite filters' })
    } finally {
      set({ isLoading: false })
    }
  },
  
  createFavoriteFilter: async (filter: Omit<FavoriteFilter, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    try {
      set({ isLoading: true, error: null })
      const storeUserId = get().user?.id
      const effectiveUserId = storeUserId || (isDemoMode() ? 'ee6724eb-d38f-4e62-ba73-b6cd272b5f31' : null)
      if (!effectiveUserId) throw new Error('User not authenticated')
      
      // Transform to match database schema (snake_case)
      const dbFilter = {
        user_id: effectiveUserId,
        name: filter.name,
        filter_type: filter.filterType,
        filter_value: filter.filterValue,
        sort_by: filter.sortBy,
        sort_order: filter.sortOrder
      }
      
      const newFilter = await api.createFavoriteFilter(dbFilter as any)
      set(state => ({
        favoriteFilters: [...state.favoriteFilters, newFilter]
      }))
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to create favorite filter' })
    } finally {
      set({ isLoading: false })
    }
  },
  
  updateFavoriteFilter: async (id: string, updates: Partial<FavoriteFilter>) => {
    try {
      set({ isLoading: true, error: null })
      const updatedFilter = await api.updateFavoriteFilter(id, updates)
      set(state => ({
        favoriteFilters: state.favoriteFilters.map(filter => filter.id === id ? updatedFilter : filter)
      }))
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to update favorite filter' })
    } finally {
      set({ isLoading: false })
    }
  },
  
  deleteFavoriteFilter: async (id: string) => {
    try {
      set({ isLoading: true, error: null })
      await api.deleteFavoriteFilter(id)
      set(state => ({
        favoriteFilters: state.favoriteFilters.filter(filter => filter.id !== id)
      }))
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to delete favorite filter' })
    } finally {
      set({ isLoading: false })
    }
  },
  
  createUnit: async (unit: Omit<Unit, 'id' | 'createdAt'>) => {
    try {
      set({ isLoading: true, error: null })
      const newUnit = await api.createUnit(unit)
      set(state => ({
        units: [...state.units, newUnit]
      }))
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to create unit' })
    } finally {
      set({ isLoading: false })
    }
  },
  
  updateUnit: async (id: string, updates: Partial<Unit>) => {
    try {
      set({ isLoading: true, error: null })
      const updatedUnit = await api.updateUnit(id, updates)
      set(state => ({
        units: state.units.map(unit => unit.id === id ? updatedUnit : unit)
      }))
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to update unit' })
    } finally {
      set({ isLoading: false })
    }
  },
  
  deleteUnit: async (id: string) => {
    try {
      set({ isLoading: true, error: null })
      await api.deleteUnit(id)
      set(state => ({
        units: state.units.filter(unit => unit.id !== id)
      }))
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to delete unit' })
    } finally {
      set({ isLoading: false })
    }
  },
  
  clearError: () => set({ error: null }),
  setUser: (user: User | null) => set({ user })
}))
