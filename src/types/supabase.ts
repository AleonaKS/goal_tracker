import type { 
  User, 
  Category, 
  Goal, 
  Stage, 
  Task, 
  Metric, 
  MetricEntry, 
  Achievement,
  GoalStatus,
  DeadlineType
} from './index'

// Extended types with userId for Supabase
export interface CategoryWithUserId extends Omit<Category, 'goalCount' | 'taskCount'> {
  userId: string
  createdAt: Date
  updatedAt: Date
}

export interface GoalWithUserId extends Omit<Goal, 'deadlineValue'> {
  userId: string
  deadlineValue: string | Date
  updatedAt: Date
}

export interface StageWithUserId extends Stage {
  userId: string
  createdAt: Date
  updatedAt: Date
}

export interface TaskWithUserId extends Omit<Task, 'dueDate'> {
  userId: string
  categoryId: string
  description?: string
  dueDate?: Date | string
  periodType?: string
  periodValue?: number
  createdAt: Date
  updatedAt: Date
}

export interface MetricWithUserId extends Metric {
  userId: string
  createdAt: Date
  updatedAt: Date
}

export interface MetricEntryWithUserId extends MetricEntry {
  userId: string
  createdAt: Date
  updatedAt: Date
}

export interface AchievementWithUserId extends Achievement {
  userId: string
  icon?: string
  createdAt: Date
  updatedAt: Date
}

// Create types for Supabase operations
export type CategoryInput = Omit<CategoryWithUserId, 'id' | 'createdAt' | 'updatedAt'> & {
  userId: string
}

export type GoalInput = Omit<GoalWithUserId, 'id' | 'createdAt' | 'updatedAt'> & {
  userId: string
}

export type TaskInput = Omit<TaskWithUserId, 'id' | 'createdAt' | 'updatedAt'> & {
  userId: string
}

export type MetricInput = Omit<MetricWithUserId, 'id' | 'createdAt' | 'updatedAt'> & {
  userId: string
}

export type MetricEntryInput = Omit<MetricEntryWithUserId, 'id' | 'createdAt' | 'updatedAt'> & {
  userId: string
}

export type AchievementInput = Omit<AchievementWithUserId, 'id' | 'createdAt' | 'updatedAt'> & {
  userId: string
}

// Extended types for update operations
export type TaskUpdate = Partial<Omit<Task, 'id' | 'createdAt' | 'updatedAt'>> & {
  description?: string
  periodType?: string
  periodValue?: number
  categoryId?: string
  dueDate?: Date | string
}
