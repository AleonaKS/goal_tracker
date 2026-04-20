import * as api from './supabase-api'
import { 
  User, 
  Category, 
  Goal, 
  Stage, 
  Task, 
  Metric, 
  MetricEntry, 
  DashboardStats,
  MetricAnalytics,
  MetricAnalyticsCache,
  Unit,
  FavoriteFilter
} from '@/types'
import type {
  CategoryCreateInput,
  GoalCreateInput,
  StageCreateInput,
  TaskCreateInput,
  MetricCreateInput,
  MetricEntryCreateInput
} from '@/types/supabase-api'

// Categories
export async function getCategories(userId: string): Promise<Category[]> {
  return api.getCategories(userId)
}

export async function createCategory(category: CategoryCreateInput): Promise<Category> {
  return api.createCategory(category)
}

export async function updateCategory(id: string, updates: Partial<Category>): Promise<Category> {
  return api.updateCategory(id, updates)
}

export async function deleteCategory(id: string): Promise<void> {
  return api.deleteCategory(id)
}

// Goals
export async function getGoals(userId: string): Promise<Goal[]> {
  return api.getGoals(userId)
}

export async function getGoalById(id: string): Promise<Goal | null> {
  return api.getGoalById(id)
}

export async function createGoal(goal: GoalCreateInput): Promise<Goal> {
  return api.createGoal(goal)
}

export async function updateGoal(id: string, updates: Partial<Goal>): Promise<Goal> {
  return api.updateGoal(id, updates)
}

export async function deleteGoal(id: string): Promise<void> {
  return api.deleteGoal(id)
}

// Tasks
export async function getTasks(userId: string): Promise<Task[]> {
  return api.getTasks(userId)
}

export async function createTask(task: TaskCreateInput): Promise<Task> {
  return api.createTask(task)
}

export async function updateTask(id: string, updates: Partial<Task>): Promise<Task> {
  return api.updateTask(id, updates)
}

export async function deleteTask(id: string): Promise<void> {
  return api.deleteTask(id)
}

// Stages
export async function getStages(userId: string): Promise<Stage[]> {
  return api.getStages(userId)
}

export async function createStage(stage: StageCreateInput): Promise<Stage> {
  return api.createStage(stage)
}

export async function updateStage(id: string, updates: Partial<Stage>): Promise<Stage> {
  return api.updateStage(id, updates)
}

export async function deleteStage(id: string): Promise<void> {
  return api.deleteStage(id)
}

// Metrics
export async function getMetrics(userId: string): Promise<Metric[]> {
  return api.getMetrics(userId)
}

export async function createMetric(metric: MetricCreateInput): Promise<Metric> {
  return api.createMetric(metric)
}

export async function updateMetric(id: string, updates: Partial<Metric>): Promise<Metric> {
  return api.updateMetric(id, updates)
}

export async function deleteMetric(id: string): Promise<void> {
  return api.deleteMetric(id)
}

// Metric Entries
export async function getMetricEntries(metricId: string): Promise<MetricEntry[]> {
  return api.getMetricEntries(metricId)
}

export async function createMetricEntry(entry: MetricEntryCreateInput): Promise<MetricEntry> {
  return api.createMetricEntry(entry)
}

export async function updateMetricEntry(id: string, updates: Partial<MetricEntry>): Promise<MetricEntry> {
  return api.updateMetricEntry(id, updates)
}

export async function deleteMetricEntry(id: string): Promise<void> {
  return api.deleteMetricEntry(id)
}

// Dashboard Stats
export async function getDashboardStats(userId: string): Promise<DashboardStats> {
  const goals = await api.getGoals(userId)
  const tasks = await api.getTasks(userId)
  
  const stats: DashboardStats = {
    goals_in_progress: goals.filter(g => g.status === 'in_progress').length,
    goals_completed: goals.filter(g => g.status === 'completed').length,
    goals_overdue: goals.filter(g => g.status === 'overdue').length,
    goals_planned: goals.filter(g => g.status === 'planned').length
  }
  
  return stats
}

// Upcoming items
export async function getUpcomingTasks(userId: string, days: number = 7): Promise<Task[]> {
  const tasks = await api.getTasks(userId)
  const now = new Date()
  const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000)
  
  return tasks
    .filter(task => !task.completed && task.dueDate)
    .filter(task => {
      const dueDate = new Date(task.dueDate!)
      return dueDate >= now && dueDate <= futureDate
    })
    .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
}

export async function getUpcomingGoals(userId: string, days: number = 30): Promise<Goal[]> {
  const goals = await api.getGoals(userId)
  const now = new Date()
  const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000)
  
  return goals
    .filter(goal => goal.status !== 'completed' && goal.deadlineValue)
    .filter(goal => {
      const deadlineDate = new Date(goal.deadlineValue!)
      return deadlineDate >= now && deadlineDate <= futureDate
    })
    .sort((a, b) => new Date(a.deadlineValue!).getTime() - new Date(b.deadlineValue!).getTime())
}

// Units
export async function getUnits(): Promise<Unit[]> {
  return api.getUnits()
}

export async function createUnit(unit: Omit<Unit, 'id' | 'createdAt'>): Promise<Unit> {
  return api.createUnit(unit)
}

export async function updateUnit(id: string, updates: Partial<Unit>): Promise<Unit> {
  return api.updateUnit(id, updates)
}

export async function deleteUnit(id: string): Promise<void> {
  return api.deleteUnit(id)
}

// Metric Analytics
export async function getMetricAnalytics(userId: string): Promise<MetricAnalytics[]> {
  const metrics = await api.getMetrics(userId)
  const analytics: MetricAnalytics[] = []
  
  for (const metric of metrics) {
    const entries = await api.getMetricEntries(metric.id)
    const totalValue = entries.reduce((sum, entry) => sum + entry.value, 0)
    const progress = metric.targetValue > 0 ? (totalValue / metric.targetValue) * 100 : 0
    
    analytics.push({
      metricId: metric.id,
      metricTitle: metric.name,
      currentValue: totalValue,
      targetValue: metric.targetValue,
      progress: Math.min(progress, 100),
      entriesCount: entries.length,
      lastEntry: entries[0]?.timestamp || null
    })
  }
  
  return analytics
}

export async function upsertMetricAnalytics(analytics: {
  metricId: string
  userId: string
  currentStreak?: number
  maxStreak?: number
  recordValue?: number
  totalEntries?: number
  totalValue?: number
}): Promise<MetricAnalyticsCache> {
  return api.upsertMetricAnalytics(analytics)
}

// Favorite Filters
export async function getFavoriteFilters(userId: string): Promise<FavoriteFilter[]> {
  return api.getFavoriteFilters(userId)
}

export async function createFavoriteFilter(filter: {
  user_id: string
  name: string
  filter_type: string
  filter_value: Record<string, unknown>
  sort_by?: string
  sort_order?: string
}): Promise<FavoriteFilter> {
  return api.createFavoriteFilter(filter)
}

export async function updateFavoriteFilter(id: string, updates: Partial<FavoriteFilter>): Promise<FavoriteFilter> {
  return api.updateFavoriteFilter(id, updates)
}

export async function deleteFavoriteFilter(id: string): Promise<void> {
  return api.deleteFavoriteFilter(id)
}
