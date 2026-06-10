// User types
export interface User {
  id: string
  login: string
  email: string
  name?: string
  passwordHash?: string
  settings: UserSettings
  totalPoints?: number
  level?: number
  pointsHistory?: PointsHistoryEntry[]
  createdAt: Date
  updatedAt: Date
}

export interface PointsHistoryEntry {
  action: string
  points: number
  date: string
  icon?: string
}

export interface UserSettings {
  theme: 'light' | 'dark'
  language: string
  monthYearHandling: 'start' | 'end'
  yearHandling: 'start' | 'end'
  gamification?: {
    enabled: boolean
    showPoints: boolean
    showAchievements: boolean
  }
}

// Category types
export interface Category {
  id: string
  userId: string
  name: string
  description?: string
  icon: string
  color: string
  isDefault: boolean
  createdAt: Date
  updatedAt: Date
}

// Goal types
export type GoalStatus = 'in_progress' | 'completed' | 'overdue' | 'planned' | 'frozen'
export type DeadlineType = 'none' | 'month_year' | 'year' | 'specific_date'

export interface Goal {
  id: string
  userId: string
  categoryId?: string
  name: string
  description?: string
  startDate?: Date
  status: GoalStatus
  priority: number
  progress: number  // 0-100
  progressCalculation: 'by_tasks' | 'by_metric'
  progressMetricId?: string
  completedAt?: Date
  createdAt: Date
  updatedAt: Date
  // Status control fields
  isFrozen?: boolean
  autoCalculateStatus?: boolean
  // Additional fields for UI
  tasks?: Task[]
  stages?: Stage[]
  metrics?: Metric[]
  // Deadline fields - simplified
  deadlineType: DeadlineType
  deadlineValue?: string | Date
}

// Stage types
export interface Stage {
  id: string
  userId: string
  goalId: string
  name: string
  description?: string
  startDate?: Date
  dueDate?: Date  // Kept for compatibility, maps to endDate
  endDate?: Date
  createdAt: Date
  updatedAt: Date
}

// Task types
export interface Task {
  id: string
  userId: string
  categoryId?: string
  goalId?: string
  stageId?: string
  name: string
  description?: string
  startDate?: Date
  dueDate?: Date
  // Time-blocking fields
  duration?: number  // in minutes
  startTime?: string // HH:MM format
  endTime?: string   // HH:MM format
  priority: number
  complexity: number
  weight: number
  progress: number
  completed: boolean
  completedAt?: Date
  subtasks?: Subtask[]  // Embedded in MongoDB
  createdAt: Date
  updatedAt: Date
}

export interface Subtask {
  id: string
  taskId: string
  userId: string
  title: string
  isCompleted: boolean
  orderIndex: number
  createdAt: Date
}

// Metric/Habit types
export type MetricType = 'habit' | 'counter' | 'simple_habit'
export type Periodicity = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'every_n_days' | 'weekdays' | 'custom'
export type InputMode = 'fixed_step' | 'manual'

export interface Metric {
  id: string
  userId: string
  categoryId: string
  goalId?: string
  name: string
  type: MetricType
  description?: string
  unit: string  // Unit symbol (from predefined or custom)
  customUnit?: string  // Matches Supabase schema
  inputMode: InputMode
  stepValue?: number
  startValue?: number  // Matches Supabase schema (default: 0)
  initialValue: number
  targetValue?: number  // Optional for simple_habit (always 1)
  scheduledTime?: string  // Time for scheduling (HH:MM format)
  color: string
  createdAt: Date
  updatedAt: Date
  // Schedule fields
  periodicity?: Periodicity
  weekdays?: number[]
  nDays?: number
  // Auto-reset fields (for habits like "read 30 pages daily")
  autoResetEnabled?: boolean
  resetPeriodicity?: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'every_n_days' | 'weekdays' | 'custom'
  resetWeekdays?: number[]  // [1,2,3,4,5] for Mon-Fri
  resetDayOfMonth?: number  // 1-31
  resetCustomDays?: number // every N days
  lastResetAt?: Date
  // UI computed fields
  progress?: number
  totalValue?: number
  periodValue?: number  // Value for current period (for habits with periodicity)
  totalEntries?: number
  currentStreak?: number
  maxStreak?: number
  recordValue?: number
}

export interface MetricEntry {
  id: string
  metricId: string
  value: number
  finalValue: number
  note?: string
  isAddition: boolean
  entryDate: Date  // Matches Supabase schema (was 'timestamp')
  createdAt: Date
  // Optional fields for overachievement tracking
  isOverachievement?: boolean
  overachievementValue?: number
}

// Record modal data for metrics
export interface MetricRecordData {
  isAddition: boolean
  finalValue: number
  note?: string
  timestamp: Date
}

// Filter and Sort types
export interface GoalFilter {
  categoryId?: string
  status?: GoalStatus
  priority?: number
  deadlineFrom?: Date
  deadlineTo?: Date
  searchQuery?: string
}

export type GoalSortField = 'name' | 'deadline' | 'priority' | 'progress' | 'createdAt'
export type SortOrder = 'asc' | 'desc'

export interface GoalSort {
  field: GoalSortField
  order: SortOrder
}

// Achievement types
export interface Achievement {
  id: string
  userId: string
  type: 'goal_completed' | 'habit_streak' | 'counter_progress' | 'completed_task' | 'milestone'
  title: string
  description: string
  value: number
  referenceId?: string  // Matches Supabase schema
  achievedAt?: Date     // Matches Supabase schema
  createdAt: Date
}

// User Achievement (gamification tracking)
export interface UserAchievement {
  id: string
  userId: string
  achievementId: string
  unlockedAt: Date
  pointsAwarded: number
}

// Dashboard types
export interface DashboardStats {
  totalGoals?: number
  totalTasks?: number
  totalMetrics?: number
  completedGoals?: number
  completedTasks?: number
  goals_in_progress?: number
  goals_completed?: number
  goals_overdue?: number
  goals_planned?: number
  tasks_in_progress?: number
  tasks_completed?: number
  tasks_overdue?: number
  tasks_planned?: number
}

export interface MetricAnalytics {
  metricId: string
  metricTitle: string
  currentValue: number
  targetValue: number
  progress: number
  entriesCount: number
  lastEntry: Date | null
  currentStreak?: number
  maxStreak?: number
  recordValue?: number
}

// Metric Analytics Cache (for database storage)
export interface MetricAnalyticsCache {
  id?: string
  metricId: string
  userId: string
  currentStreak?: number
  maxStreak?: number
  recordValue?: number
  recordDate?: Date
  totalEntries?: number
  totalValue?: number
  calculatedAt?: Date
}

// Unit type
export interface Unit {
  id: string
  name: string
  symbol: string
  category: string
  isDefault?: boolean
  createdAt?: Date
}

// Favorite Filter type
export interface FavoriteFilter {
  id: string
  userId: string
  name: string
  filterType: string
  filterValue: Record<string, unknown>
  sortBy?: string
  sortOrder?: string
  createdAt?: Date
  updatedAt?: Date
}

// Create Input types
export interface GoalCreateInput {
  userId: string
  name: string
  description?: string
  categoryId?: string
  startDate?: Date
  deadlineType: DeadlineType
  deadlineValue?: string | Date
  priority?: number
  progressCalculation?: 'by_tasks' | 'by_metric'
  progressMetricId?: string
  status?: GoalStatus
  autoCalculateStatus?: boolean
  progress?: number
  isFrozen?: boolean
}

export interface TaskCreateInput {
  userId: string
  goalId?: string
  stageId?: string
  categoryId?: string
  name: string
  description?: string
  startDate?: Date
  dueDate?: Date
  // Time-blocking fields
  duration?: number
  startTime?: string
  endTime?: string
  priority?: number
  weight?: number
  completed?: boolean
  completedAt?: Date
}

export interface StageCreateInput {
  userId: string
  goalId: string
  name: string
  startDate?: Date
  dueDate?: Date
  endDate?: Date
}

export interface SubtaskCreateInput {
  userId: string
  taskId: string
  title: string
  isCompleted?: boolean
  orderIndex?: number
}

export interface MetricCreateInput {
  userId: string
  categoryId?: string
  goalId?: string
  name: string
  type: MetricType
  description?: string
  unit: string
  inputMode: InputMode
  stepValue?: number
  initialValue: number
  targetValue?: number  // Optional for simple_habit
  color: string
  periodicity?: Periodicity
  weekdays?: number[]
  nDays?: number
  // Auto-reset fields
  autoResetEnabled?: boolean
  resetPeriodicity?: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'every_n_days' | 'weekdays' | 'custom'
  resetWeekdays?: number[]
  resetDayOfMonth?: number
  resetCustomDays?: number
  lastResetAt?: Date
}

export interface MetricEntryCreateInput {
  metricId: string
  value: number
  finalValue: number
  note?: string
  isAddition?: boolean
  entryDate?: Date
  isOverachievement?: boolean
  overachievementValue?: number
}

export interface CategoryCreateInput {
  userId: string
  name: string
  description?: string
  color: string
  icon?: string
  parentId?: string
}

