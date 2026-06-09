import { create } from 'zustand'
import * as api from '@/lib/supabase-api'
import { isDemoMode } from '@/lib/demo'
import { calculateMetricProgress } from '@/lib/utils'
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
  pointsHistory: any[]
  
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
  fetchPointsHistory: () => Promise<void>
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
  
  // Optimistic updates
  addOptimisticMetricEntry: (entry: MetricEntry) => void
  removeOptimisticMetricEntry: (entryId: string) => void
  
  // Оптимистичные обновления
  optimisticUpdateTask: (id: string, updates: Partial<Task>) => Promise<void>
  optimisticUpdateMetric: (id: string, updates: Partial<Metric>) => Promise<void>
  optimisticUpdateGoal: (id: string, updates: Partial<Goal>) => Promise<void>
  
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

const DEMO_USER_ID = 'ee6724eb-d38f-4e62-ba73-b6cd272b5f31'

function getUserId(state: ApiDataState): string {
  const id = state.user?.id || (isDemoMode() ? DEMO_USER_ID : null)
  if (!id) throw new Error('User not authenticated')
  return id
}

async function withAsync<T>(
  set: (partial: Partial<ApiDataState> | ((state: ApiDataState) => Partial<ApiDataState>)) => void,
  get: () => ApiDataState,
  action: (userId: string) => Promise<T>,
  onSuccess: (result: T) => void,
  errorMsg: string
): Promise<void> {
  set({ isLoading: true, error: null })
  try {
    const uid = getUserId(get())
    const result = await action(uid)
    onSuccess(result)
  } catch (error) {
    set({ error: error instanceof Error ? error.message : errorMsg })
  } finally {
    set({ isLoading: false })
  }
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
  pointsHistory: [],
  isLoading: false,
  error: null,
  
  // Fetch methods
  fetchCategories: () => withAsync(set, get, (uid) => api.getCategories(uid), (data) => set({ categories: data.map((c: any) => ({ ...c, createdAt: c.created_at, updatedAt: c.updated_at, userId: c.user_id })) }), 'Failed to fetch categories'),
  
  fetchGoals: () => withAsync(set, get, (uid) => api.getGoals(uid), (data) => set({ goals: data.map((g: any) => ({
    ...g,
    createdAt: g.created_at, updatedAt: g.updated_at, userId: g.user_id,
    categoryId: g.category_id, orderIndex: g.order_index, startDate: g.start_date,
    dueType: g.due_type, dueDate: g.due_date, dueMonthYear: g.due_month_year, dueYear: g.due_year,
    progressCalculation: g.progress_calculation, progressMetricId: g.progress_metric_id,
    completedAt: g.completed_at, expectedCompletionDate: g.expected_completion_date,
    isFrozen: g.is_frozen, frozenAt: g.frozen_at, autoCalculateStatus: g.auto_calculate_status,
    deadlineType: g.due_type || 'none',
    deadlineValue: g.due_type === 'specific_date' ? g.due_date : g.due_type === 'month_year' ? g.due_month_year : g.due_type === 'year' ? g.due_year : undefined,
  })) }), 'Failed to fetch goals'),
  
  fetchStages: () => withAsync(set, get, (uid) => api.getStages(uid), (data) => set({ stages: data.map((s: any) => ({
    ...s, createdAt: s.created_at, updatedAt: s.updated_at, userId: s.user_id,
    goalId: s.goal_id, orderIndex: s.order_index, startDate: s.start_date, dueDate: s.due_date,
  })) }), 'Failed to fetch stages'),
  
  fetchTasks: () => withAsync(set, get, (uid) => api.getTasks(uid), (data) => set({ tasks: data.map((t: any) => ({
    ...t, createdAt: t.created_at, updatedAt: t.updated_at, userId: t.user_id,
    categoryId: t.category_id, goalId: t.goal_id, stageId: t.stage_id,
    parentTaskId: t.parent_task_id, orderIndex: t.order_index,
    startDate: t.start_date, dueDate: t.due_date,
    isPeriodBased: t.is_period_based, completedAt: t.completed_at,
    startTime: t.start_time, endTime: t.end_time,
  })) }), 'Failed to fetch tasks'),
  
  fetchMetrics: () => withAsync(set, get, (uid) => api.getMetrics(uid), (data) => set({ metrics: data.map((m: any) => ({
    ...m, createdAt: m.created_at, updatedAt: m.updated_at, userId: m.user_id,
    categoryId: m.category_id, goalId: m.goal_id, unitId: m.unit_id,
    inputMode: m.input_mode, stepValue: m.step_value,
    startValue: m.start_value, targetValue: m.target_value,
    totalValue: m.total_value, periodValue: m.period_value,
    autoResetEnabled: m.auto_reset_enabled, resetPeriodicity: m.reset_periodicity,
    resetWeekdays: m.reset_weekdays, resetDayOfMonth: m.reset_day_of_month,
    resetCustomDays: m.reset_custom_days, lastResetAt: m.last_reset_at,
    targetIncreaseEnabled: m.target_increase_enabled, targetIncreaseValue: m.target_increase_value,
    targetIncreaseType: m.target_increase_type, targetIncreasePeriodicity: m.target_increase_periodicity,
  })) }), 'Failed to fetch metrics'),
  
  fetchAllMetricEntries: () => withAsync(set, get, (uid) => api.getAllMetricEntries(uid), (data) => set({ metricEntries: data }), 'Failed to fetch metric entries'),

  fetchMetricEntries: (metricId) => withAsync(set, get, () => api.getMetricEntries(metricId), (data) => {
    const transformed = data.map((e: any) => ({ ...e, createdAt: e.created_at, finalValue: e.final_value, isAddition: e.is_addition, isOverachievement: e.is_overachievement, overachievementValue: e.overachievement_value }))
    set(state => ({ metricEntries: [...state.metricEntries.filter(e => e.metricId !== metricId), ...transformed] }))
  }, 'Failed to fetch metric entries'),
  
  fetchAchievements: () => withAsync(set, get, () => api.getAchievements(), (data) => set({ achievements: data }), 'Failed to fetch achievements'),
  
  fetchUserAchievements: () => withAsync(set, get, (uid) => api.getUserAchievements(uid), (data) => set({ userAchievements: data }), 'Failed to fetch user achievements'),
  
  fetchPointsHistory: () => withAsync(set, get, (uid) => api.getPointsHistory(uid), (data) => set({ pointsHistory: data }), 'Failed to fetch points history'),
  
  fetchUnits: () => withAsync(set, get, () => api.getUnits(), (data) => set({ units: data.map((u: any) => ({ ...u, createdAt: u.created_at })) }), 'Failed to fetch units'),
  
  fetchAll: async () => {
    const { fetchCategories, fetchGoals, fetchStages, fetchTasks, fetchMetrics, fetchAllMetricEntries, fetchUserAchievements, fetchAchievements, fetchPointsHistory } = get()
    await Promise.all([fetchCategories(), fetchGoals(), fetchStages(), fetchTasks(), fetchMetrics(), fetchAllMetricEntries(), fetchUserAchievements(), fetchAchievements(), fetchPointsHistory()])
  },
  
  // CRUD operations
  createCategory: (category) => withAsync(set, get, () => api.createCategory(category), (newCat) => set(state => ({ categories: [...state.categories, newCat] })), 'Failed to create category'),
  
  updateCategory: (id, updates) => withAsync(set, get, () => api.updateCategory(id, updates), (data) => {
    const raw = data as any
    set(state => ({
      categories: state.categories.map(cat => cat.id === id ? {
        ...raw, createdAt: raw.created_at ? new Date(raw.created_at) : raw.createdAt,
        updatedAt: raw.updated_at ? new Date(raw.updated_at) : raw.updatedAt,
        userId: raw.user_id || raw.userId, isDefault: raw.is_default ?? raw.isDefault ?? false,
        orderIndex: raw.order_index ?? raw.orderIndex ?? 0,
        goalCount: raw.goal_count ?? raw.goalCount ?? 0, taskCount: raw.task_count ?? raw.taskCount ?? 0,
      } : cat)
    }))
  }, 'Failed to update category'),
  
  deleteCategory: (id) => withAsync(set, get, () => api.deleteCategory(id), () => set(state => ({ categories: state.categories.filter(cat => cat.id !== id) })), 'Failed to delete category'),
  
  createGoal: (goal) => withAsync(set, get, () => api.createGoal(goal), (newGoal) => set(state => ({ goals: [...state.goals, newGoal] })), 'Failed to create goal'),
  
  updateGoal: (id, updates) => withAsync(set, get, () => api.updateGoal(id, updates), (data) => {
    const raw = data as any
    set(state => ({
      goals: state.goals.map(goal => goal.id === id ? {
        ...raw, createdAt: raw.created_at ? new Date(raw.created_at) : raw.createdAt,
        updatedAt: raw.updated_at ? new Date(raw.updated_at) : raw.updatedAt,
        userId: raw.user_id || raw.userId, categoryId: raw.category_id || raw.categoryId,
        orderIndex: raw.order_index ?? raw.orderIndex ?? 0,
        startDate: raw.start_date ? new Date(raw.start_date) : raw.startDate,
        dueType: raw.due_type || raw.dueType, dueDate: raw.due_date ? new Date(raw.due_date) : raw.dueDate,
        dueMonthYear: raw.due_month_year || raw.dueMonthYear, dueYear: raw.due_year || raw.dueYear,
        progressCalculation: raw.progress_calculation || raw.progressCalculation,
        progressMetricId: raw.progress_metric_id || raw.progressMetricId,
        completedAt: raw.completed_at ? new Date(raw.completed_at) : raw.completedAt,
        expectedCompletionDate: raw.expected_completion_date ? new Date(raw.expected_completion_date) : raw.expectedCompletionDate,
        isFrozen: raw.is_frozen ?? raw.isFrozen ?? false, frozenAt: raw.frozen_at ? new Date(raw.frozen_at) : raw.frozenAt,
        autoCalculateStatus: raw.auto_calculate_status ?? raw.autoCalculateStatus ?? true,
        priority: raw.priority ?? raw.priority ?? 3, progress: raw.progress ?? raw.progress ?? 0,
        status: raw.status || raw.status || 'in_progress',
        deadlineType: raw.due_type || raw.deadlineType || 'none',
        deadlineValue: raw.due_type === 'specific_date' ? raw.due_date : raw.due_type === 'month_year' ? raw.due_month_year : raw.due_type === 'year' ? raw.due_year : raw.deadlineValue,
      } : goal)
    }))
  }, 'Failed to update goal'),
  
  deleteGoal: (id) => withAsync(set, get, () => api.deleteGoal(id), () => set(state => ({ goals: state.goals.filter(goal => goal.id !== id) })), 'Failed to delete goal'),
  
  createTask: (task) => withAsync(set, get, () => api.createTask(task), (newTask) => set(state => ({ tasks: [...state.tasks, newTask] })), 'Failed to create task'),
  
  updateTask: (id, updates) => withAsync(set, get, () => api.updateTask(id, updates), (data) => {
    const raw = data as any
    set(state => ({
      tasks: state.tasks.map(task => task.id === id ? {
        ...raw, createdAt: raw.created_at ? new Date(raw.created_at) : raw.createdAt,
        updatedAt: raw.updated_at ? new Date(raw.updated_at) : raw.updatedAt,
        userId: raw.user_id || raw.userId, categoryId: raw.category_id || raw.categoryId,
        goalId: raw.goal_id || raw.goalId, stageId: raw.stage_id || raw.stageId,
        parentTaskId: raw.parent_task_id || raw.parentTaskId,
        orderIndex: raw.order_index ?? raw.orderIndex ?? 0,
        startDate: raw.start_date ? new Date(raw.start_date) : raw.startDate,
        dueDate: raw.due_date ? new Date(raw.due_date) : raw.dueDate,
        isPeriodBased: raw.is_period_based ?? raw.isPeriodBased ?? false,
        completedAt: raw.completed_at ? new Date(raw.completed_at) : raw.completedAt,
        complexity: raw.complexity ?? raw.complexity ?? 3, weight: raw.weight ?? raw.weight ?? 1,
        priority: raw.priority ?? raw.priority ?? 3, progress: raw.progress ?? raw.progress ?? 0,
        completed: raw.completed ?? raw.completed ?? false,
        startTime: raw.start_time || raw.startTime, endTime: raw.end_time || raw.endTime,
        duration: raw.duration ?? raw.duration, description: raw.description ?? raw.description,
      } : task)
    }))
  }, 'Failed to update task'),
  
  deleteTask: (id) => withAsync(set, get, () => api.deleteTask(id), () => set(state => ({ tasks: state.tasks.filter(task => task.id !== id) })), 'Failed to delete task'),
  
  createStage: (stage) => withAsync(set, get, () => api.createStage(stage), (newStage) => set(state => ({ stages: [...state.stages, newStage] })), 'Failed to create stage'),
  
  updateStage: (id, updates) => withAsync(set, get, () => api.updateStage(id, updates), (data) => {
    const raw = data as any
    set(state => ({
      stages: state.stages.map(stage => stage.id === id ? {
        ...raw, createdAt: raw.created_at ? new Date(raw.created_at) : raw.createdAt,
        updatedAt: raw.updated_at ? new Date(raw.updated_at) : raw.updatedAt,
        userId: raw.user_id || raw.userId, goalId: raw.goal_id || raw.goalId,
        orderIndex: raw.order_index ?? raw.orderIndex ?? 0,
        startDate: raw.start_date ? new Date(raw.start_date) : raw.startDate,
        dueDate: raw.due_date ? new Date(raw.due_date) : raw.dueDate,
      } : stage)
    }))
  }, 'Failed to update stage'),
  
  deleteStage: (id) => withAsync(set, get, () => api.deleteStage(id), () => set(state => ({ stages: state.stages.filter(stage => stage.id !== id) })), 'Failed to delete stage'),
  
  createMetric: (metric) => withAsync(set, get, () => api.createMetric(metric), (newMetric) => set(state => ({ metrics: [...state.metrics, newMetric] })), 'Failed to create metric'),
  
  updateMetric: (id, updates) => withAsync(set, get, () => api.updateMetric(id, updates), (data) => {
    const raw = data as any
    set(state => ({
      metrics: state.metrics.map(metric => metric.id === id ? {
        ...raw, createdAt: raw.created_at ? new Date(raw.created_at) : raw.createdAt,
        updatedAt: raw.updated_at ? new Date(raw.updated_at) : raw.updatedAt,
        userId: raw.user_id || raw.userId, categoryId: raw.category_id || raw.categoryId,
        goalId: raw.goal_id || raw.goalId, unitId: raw.unit_id || raw.unitId,
        inputMode: raw.input_mode || raw.inputMode, stepValue: raw.step_value ?? raw.stepValue,
        startValue: raw.start_value ?? raw.startValue ?? 0,
        targetValue: raw.target_value ?? raw.targetValue ?? 0,
        totalValue: raw.total_value ?? raw.totalValue,
        periodValue: raw.period_value ?? raw.periodValue,
        customUnit: raw.custom_unit || raw.customUnit,
        autoResetEnabled: raw.auto_reset_enabled ?? raw.autoResetEnabled ?? false,
        resetPeriodicity: raw.reset_periodicity || raw.resetPeriodicity,
        resetWeekdays: raw.reset_weekdays || raw.resetWeekdays,
        resetDayOfMonth: raw.reset_day_of_month ?? raw.resetDayOfMonth,
        resetCustomDays: raw.reset_custom_days ?? raw.resetCustomDays,
        lastResetAt: raw.last_reset_at ? new Date(raw.last_reset_at) : raw.lastResetAt,
        targetIncreaseEnabled: raw.target_increase_enabled ?? raw.targetIncreaseEnabled ?? false,
        targetIncreaseValue: raw.target_increase_value ?? raw.targetIncreaseValue,
        targetIncreaseType: raw.target_increase_type || raw.targetIncreaseType,
        targetIncreasePeriodicity: raw.target_increase_periodicity || raw.targetIncreasePeriodicity,
      } : metric)
    }))
  }, 'Failed to update metric'),
  
  deleteMetric: (id) => withAsync(set, get, () => api.deleteMetric(id), () => set(state => ({ metrics: state.metrics.filter(metric => metric.id !== id) })), 'Failed to delete metric'),
  
  createMetricEntry: async (entry: any) => {
    try {
      set({ isLoading: true, error: null })
      const newEntry = await api.createMetricEntry(entry)
      // Add the new entry to state immediately
      set(state => {
        const updatedEntries = [...state.metricEntries, newEntry]

        const metric = state.metrics.find(m => m.id === entry.metricId)
        if (!metric) {
          return { metricEntries: updatedEntries }
        }

        const metricEntries = updatedEntries.filter(e => e.metricId === entry.metricId && !e.id.startsWith('temp-'))
        const values = calculateMetricProgress(metric, metricEntries)

        return {
          metricEntries: updatedEntries,
          metrics: state.metrics.map(m =>
            m.id === entry.metricId
              ? {
                  ...m,
                  totalValue: values.totalValue,
                  periodValue: values.isPeriodBased ? values.periodValue : undefined,
                  progress: values.progress
                }
              : m
          )
        }
      })

      return newEntry
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create metric entry'
      set({ error: errorMessage })
      throw error  // Re-throw so caller can handle it
    } finally {
      set({ isLoading: false })
    }
  },
  
  // Optimistic updates
  addOptimisticMetricEntry: (entry: MetricEntry) => {
    // Добавляем запись в локальное состояние и пересчитываем значения метрики
    set(state => {
      const updatedEntries = [...state.metricEntries, entry]

      const metric = state.metrics.find(m => m.id === entry.metricId)
      if (!metric) {
        return { metricEntries: updatedEntries }
      }

      const metricEntries = updatedEntries.filter(e => e.metricId === entry.metricId)
      const values = calculateMetricProgress(metric, metricEntries)

      return {
        metricEntries: updatedEntries,
        metrics: state.metrics.map(m =>
          m.id === entry.metricId
            ? {
                ...m,
                totalValue: values.totalValue,
                periodValue: values.isPeriodBased ? values.periodValue : undefined,
                progress: values.progress
              }
            : m
        )
      }
    })
  },
  
  removeOptimisticMetricEntry: (entryId: string) => {
    // Удаляем оптимистичную запись из локального состояния
    set(state => {
      const entryToRemove = state.metricEntries.find(e => e.id === entryId)
      if (!entryToRemove) return state

      const updatedEntries = state.metricEntries.filter(e => e.id !== entryId)

      // Пересчитываем значения метрики на основе оставшихся записей
      const metric = state.metrics.find(m => m.id === entryToRemove.metricId)
      if (!metric) {
        return { metricEntries: updatedEntries }
      }

      const metricEntries = updatedEntries.filter(e => e.metricId === entryToRemove.metricId && !e.id.startsWith('temp-'))
      const values = calculateMetricProgress(metric, metricEntries)

      return {
        metricEntries: updatedEntries,
        metrics: state.metrics.map(m =>
          m.id === entryToRemove.metricId
            ? {
                ...m,
                totalValue: values.totalValue,
                periodValue: values.isPeriodBased ? values.periodValue : undefined,
                progress: values.progress
              }
            : m
        )
      }
    })
  },

  updateMetricEntry: async (id: string, updates: Partial<MetricEntry>) => {
    try {
      set({ isLoading: true, error: null })

      const oldEntry = get().metricEntries.find(e => e.id === id)
      const updatedEntry = await api.updateMetricEntry(id, updates)

      set(state => {
        const updatedEntries = state.metricEntries.map(entry => entry.id === id ? updatedEntry : entry)

        if (oldEntry && updates.value !== undefined && updates.value !== oldEntry.value) {
          const metric = state.metrics.find(m => m.id === oldEntry.metricId)
          if (!metric) {
            return { metricEntries: updatedEntries }
          }

          const metricEntries = updatedEntries.filter(e => e.metricId === oldEntry.metricId && !e.id.startsWith('temp-'))
          const values = calculateMetricProgress(metric, metricEntries)

          return {
            metricEntries: updatedEntries,
            metrics: state.metrics.map(m =>
              m.id === oldEntry.metricId
                ? {
                    ...m,
                    totalValue: values.totalValue,
                    periodValue: values.isPeriodBased ? values.periodValue : undefined,
                    progress: values.progress
                  }
                : m
            )
          }
        }

        return { metricEntries: updatedEntries }
      })
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to update metric entry' })
    } finally {
      set({ isLoading: false })
    }
  },

  deleteMetricEntry: async (id: string) => {
    try {
      set({ isLoading: true, error: null })

      const entryToRemove = get().metricEntries.find(e => e.id === id)
      if (!entryToRemove) {
        await api.deleteMetricEntry(id)
        return
      }

      await api.deleteMetricEntry(id)

      set(state => {
        const updatedEntries = state.metricEntries.filter(entry => entry.id !== id)

        const metric = state.metrics.find(m => m.id === entryToRemove.metricId)
        if (!metric) {
          return { metricEntries: updatedEntries }
        }

        const metricEntries = updatedEntries.filter(e => e.metricId === entryToRemove.metricId && !e.id.startsWith('temp-'))
        const values = calculateMetricProgress(metric, metricEntries)

        return {
          metricEntries: updatedEntries,
          metrics: state.metrics.map(m =>
            m.id === entryToRemove.metricId
              ? {
                  ...m,
                  totalValue: values.totalValue,
                  periodValue: values.isPeriodBased ? values.periodValue : undefined,
                  progress: values.progress
                }
              : m
          )
        }
      })
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to delete metric entry' })
    } finally {
      set({ isLoading: false })
    }
  },

  createAchievement: (achievement) => withAsync(set, get, () => api.createAchievement(achievement), (newAchievement) => set(state => ({ achievements: [...state.achievements, newAchievement] })), 'Failed to create achievement'),
  
  fetchSubtasks: () => withAsync(set, get, (uid) => api.getSubtasks(uid), (data) => set({ subtasks: data.map((s: any) => ({ ...s, createdAt: s.created_at, updatedAt: s.updated_at, userId: s.user_id, taskId: s.task_id, orderIndex: s.order_index, isCompleted: s.is_completed })) }), 'Failed to fetch subtasks'),
  
  createSubtask: (subtask) => withAsync(set, get, (uid) => api.createSubtask({ ...subtask, userId: uid }), (newSubtask) => set(state => ({ subtasks: [...state.subtasks, newSubtask] })), 'Failed to create subtask'),
  
  updateSubtask: (id, updates) => withAsync(set, get, () => api.updateSubtask(id, updates), (data) => set(state => ({ subtasks: state.subtasks.map(s => s.id === id ? data : s) })), 'Failed to update subtask'),
  
  deleteSubtask: (id) => withAsync(set, get, () => api.deleteSubtask(id), () => set(state => ({ subtasks: state.subtasks.filter(subtask => subtask.id !== id) })), 'Failed to delete subtask'),
  
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
  
  fetchFavoriteFilters: () => withAsync(set, get, (uid) => api.getFavoriteFilters(uid), (data) => set({ favoriteFilters: data.map((f: any) => ({ ...f, createdAt: f.created_at, updatedAt: f.updated_at, userId: f.user_id, filterType: f.filter_type, filterValue: f.filter_value, sortBy: f.sort_by, sortOrder: f.sort_order })) }), 'Failed to fetch favorite filters'),
  
  createFavoriteFilter: (filter) => withAsync(set, get, (uid) => api.createFavoriteFilter({ user_id: uid, name: filter.name, filter_type: filter.filterType, filter_value: filter.filterValue, sort_by: filter.sortBy, sort_order: filter.sortOrder } as any), (newFilter) => set(state => ({ favoriteFilters: [...state.favoriteFilters, newFilter] })), 'Failed to create favorite filter'),
  
  updateFavoriteFilter: (id, updates) => withAsync(set, get, () => api.updateFavoriteFilter(id, updates), (data) => set(state => ({ favoriteFilters: state.favoriteFilters.map(f => f.id === id ? data : f) })), 'Failed to update favorite filter'),
  
  deleteFavoriteFilter: (id) => withAsync(set, get, () => api.deleteFavoriteFilter(id), () => set(state => ({ favoriteFilters: state.favoriteFilters.filter(f => f.id !== id) })), 'Failed to delete favorite filter'),
  
  createUnit: (unit) => withAsync(set, get, () => api.createUnit(unit), (newUnit) => set(state => ({ units: [...state.units, newUnit] })), 'Failed to create unit'),
  
  updateUnit: (id, updates) => withAsync(set, get, () => api.updateUnit(id, updates), (data) => set(state => ({ units: state.units.map(u => u.id === id ? data : u) })), 'Failed to update unit'),
  
  deleteUnit: (id) => withAsync(set, get, () => api.deleteUnit(id), () => set(state => ({ units: state.units.filter(u => u.id !== id) })), 'Failed to delete unit'),
  
  // Оптимистичные обновления
  optimisticUpdateTask: async (id: string, updates: Partial<Task>) => {
    const task = get().tasks.find(t => t.id === id)
    if (!task) return
    
    // Сохраняем старое состояние для отката
    const oldTask = { ...task }
    
    // Оптимистичное обновление
    set(state => ({
      tasks: state.tasks.map(t => 
        t.id === id ? { ...t, ...updates } : t
      )
    }))
    
    try {
      await api.updateTask(id, updates)
    } catch (error) {
      // Откат при ошибке
      set(state => ({
        tasks: state.tasks.map(t => 
          t.id === id ? oldTask : t
        )
      }))
      throw error
    }
  },

  optimisticUpdateMetric: async (id: string, updates: Partial<Metric>) => {
    const metric = get().metrics.find(m => m.id === id)
    if (!metric) return
    
    const oldMetric = { ...metric }
    
    set(state => ({
      metrics: state.metrics.map(m => 
        m.id === id ? { ...m, ...updates } : m
      )
    }))
    
    try {
      await api.updateMetric(id, updates)
    } catch (error) {
      set(state => ({
        metrics: state.metrics.map(m => 
          m.id === id ? oldMetric : m
        )
      }))
      throw error
    }
  },

  optimisticUpdateGoal: async (id: string, updates: Partial<Goal>) => {
    const goal = get().goals.find(g => g.id === id)
    if (!goal) return
    
    const oldGoal = { ...goal }
    
    set(state => ({
      goals: state.goals.map(g => 
        g.id === id ? { ...g, ...updates } : g
      )
    }))
    
    try {
      await api.updateGoal(id, updates)
    } catch (error) {
      set(state => ({
        goals: state.goals.map(g => 
          g.id === id ? oldGoal : g
        )
      }))
      throw error
    }
  },
  
  clearError: () => set({ error: null }),
  setUser: (user: User | null) => set({ user })
}))
