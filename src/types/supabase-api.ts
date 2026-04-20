import type { Category, Goal, Stage, Task, Metric, MetricEntry, Subtask, Unit, FavoriteFilter } from './index'

// Types for Supabase API functions
export type CategoryCreateInput = Omit<Category, 'id' | 'createdAt'> & { userId: string }
export type GoalCreateInput = {
  name: string
  description?: string
  categoryId: string
  startDate: Date
  deadlineType: 'none' | 'month_year' | 'year' | 'specific_date'
  deadlineValue?: string | Date
  priority: number
  progressCalculation: 'by_tasks' | 'by_metric'
  progressMetricId?: string
  status?: 'in_progress' | 'completed' | 'overdue' | 'planned' | 'frozen'
  isFrozen?: boolean
  autoCalculateStatus?: boolean
  userId: string
}
export type StageCreateInput = Omit<Stage, 'id' | 'createdAt'> & { userId: string }
export type TaskCreateInput = Omit<Task, 'id' | 'createdAt' | 'subtasks' | 'periodType'> & { userId: string }
export type MetricCreateInput = Omit<Metric, 'id' | 'createdAt' | 'updatedAt' | 'initialValue' | 'periodicity' | 'nDays' | 'weekdays'> & { userId: string }
export type MetricEntryCreateInput = {
  metricId: string
  entryDate: Date
  value: number
  finalValue: number
  note?: string
  isAddition?: boolean
  isOverachievement?: boolean
  overachievementValue?: number
}
export type SubtaskCreateInput = Omit<Subtask, 'id' | 'createdAt'>
export type UnitCreateInput = Omit<Unit, 'id' | 'createdAt'>
export type FavoriteFilterCreateInput = Omit<FavoriteFilter, 'id' | 'createdAt' | 'updatedAt'>
