// User types
export interface User {
  id: string
  login: string
  email: string
  name?: string
  passwordHash?: string
  registrationDate: Date
  settings: UserSettings
  totalPoints?: number
  level?: number
  gamificationEnabled?: boolean
  createdAt: Date
  updatedAt: Date
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
  orderIndex: number
  goalCount: number
  taskCount: number
  createdAt: Date
  updatedAt: Date
}

// Goal types
export type GoalStatus = 'in_progress' | 'completed' | 'overdue' | 'planned' | 'frozen'
export type DeadlineType = 'none' | 'month_year' | 'year' | 'specific_date'

export interface Goal {
  id: string
  userId: string
  parentGoalId?: string
  level: number
  orderIndex: number
  categoryId?: string
  name: string
  description?: string
  startDate?: Date
  dueType: DeadlineType
  dueDate?: Date
  dueMonthYear?: string
  dueYear?: number
  status: GoalStatus
  priority: number
  progress: number  // 0-100
  progressCalculation: 'by_tasks' | 'by_metric'
  progressMetricId?: string
  completedAt?: Date
  expectedCompletionDate?: Date
  isFrozen: boolean
  frozenAt?: Date
  autoCalculateStatus: boolean
  createdAt: Date
  updatedAt: Date
  // Additional fields for UI
  tasks?: Task[]
  stages?: Stage[]
  metrics?: Metric[]
  // Compatibility fields
  deadlineType?: DeadlineType
  deadlineValue?: string | Date
}

// Stage types
export interface Stage {
  id: string
  userId: string
  goalId: string
  name: string
  description?: string
  orderIndex: number
  startDate?: Date
  dueDate?: Date
  duration?: number  // calculated in days
  taskCount: number
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
  parentTaskId?: string
  name: string
  description?: string
  startDate?: Date
  dueDate?: Date
  isPeriodBased: boolean
  priority: number
  complexity: number
  weight: number
  progress: number
  completed: boolean
  completedAt?: Date
  subtasks?: Subtask[]  // Not stored in DB, only for UI
  // Time blocking fields
  duration?: number  // Duration in minutes
  startTime?: string  // Format: "HH:mm" (e.g., "09:00")
  endTime?: string    // Format: "HH:mm" (e.g., "10:30")
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

// Unit types
export interface Unit {
  id: string
  name: string
  symbol: string
  category: string
  isDefault: boolean
  createdAt: Date
}

// Metric/Habit types
export type MetricType = 'habit' | 'counter'
export type Periodicity = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'every_n_days' | 'weekdays' | 'custom'
export type InputMode = 'fixed_step' | 'manual'

export interface Metric {
  id: string
  userId: string
  categoryId: string  // Required - metrics must belong to a category
  goalId?: string     // Optional - can be linked to a goal
  name: string
  type: MetricType
  description?: string
  unitId?: string
  customUnit?: string
  inputMode: InputMode
  stepValue?: number
  startValue: number
  targetValue: number
  accumulative: boolean
  color: string
  scheduleId?: string
  // Time scheduling for habits
  scheduledTime?: string  // HH:mm format for habit execution time
  createdAt: Date
  updatedAt: Date
  // Auto-reset fields
  autoResetEnabled?: boolean
  resetPeriodicity?: Periodicity
  resetWeekdays?: number[]
  resetDayOfMonth?: number
  resetCustomDays?: number
  lastResetAt?: Date
  // Target increase fields
  targetIncreaseEnabled?: boolean
  targetIncreaseValue?: number
  targetIncreaseType?: 'fixed' | 'percentage'
  targetIncreasePeriodicity?: Periodicity
  // UI fields
  progress?: number
  totalValue?: number
  totalEntries?: number
  currentStreak?: number
  maxStreak?: number
  recordValue?: number
  // Compatibility fields
  weekdays?: number[]  // For schedule weekdays
  nDays?: number  // For every_n_days periodicity
  periodicity?: Periodicity  // UI schedule type
}

export interface MetricEntry {
  id: string
  metricId: string
  entryDate: Date
  value: number
  finalValue: number
  note?: string
  isAddition: boolean
  isOverachievement: boolean
  overachievementValue: number
  createdAt: Date
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

export interface FavoriteFilter {
  id: string
  userId: string
  name: string
  filterType: 'category' | 'priority' | 'status' | 'date_range'
  filterValue: Record<string, unknown>
  sortBy?: GoalSortField
  sortOrder: SortOrder
  createdAt: Date
  updatedAt: Date
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
  referenceId: string
  createdAt: Date
}

export interface UserAchievement {
  id: string
  userId: string
  achievementId: string
  unlockedAt: Date
  pointsAwarded: number
}

// Dashboard types
export interface DashboardStats {
  totalGoals: number
  totalTasks: number
  totalMetrics: number
  completedGoals: number
  completedTasks: number
  goals_in_progress: number
  goals_completed: number
  goals_overdue: number
  goals_planned: number
}

// Additional types from database
export interface MetricAnalyticsCache {
  id: string
  metricId: string
  userId: string
  currentStreak: number
  maxStreak: number
  recordValue?: number
  recordDate?: Date
  totalEntries: number
  totalValue: number
  calculatedAt: Date
}

export interface CalendarEvent {
  id: string
  userId: string
  eventDate: Date
  eventType: string
  entityId: string
  title: string
  color?: string
  createdAt: Date
}

export interface Note {
  id: string
  userId: string
  entityId: string
  entityType: string
  content: string
  createdAt: Date
  updatedAt: Date
}

export interface Schedule {
  id: string
  name: string
  periodicity: string
  customDays?: number[]
  weekdays?: number[]
  dayOfMonth?: number
  createdAt: Date
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

// Create Input types
export interface GoalCreateInput {
  userId: string
  name: string
  description?: string
  categoryId?: string
  startDate?: Date
  dueType: DeadlineType
  dueDate?: Date
  dueMonthYear?: string
  dueYear?: number
  deadlineType?: DeadlineType
  deadlineValue?: string | Date
  priority?: number
  progressCalculation?: 'by_tasks' | 'by_metric'
  progressMetricId?: string
  expectedCompletionDate?: Date
  isFrozen?: boolean
  autoCalculateStatus?: boolean
  status?: GoalStatus
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
  priority?: number
  progress?: number
  weight?: number
  complexity?: number
  completed?: boolean
  completedAt?: Date
  isPeriodBased?: boolean
  // Time blocking fields
  duration?: number
  startTime?: string
  endTime?: string
}

export interface StageCreateInput {
  userId: string
  goalId: string
  name: string
  description?: string
  orderIndex?: number
  startDate?: Date
  dueDate?: Date
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
  unitId?: string
  customUnit?: string
  inputMode: InputMode
  stepValue?: number
  startValue: number
  targetValue: number
  accumulative: boolean
  color: string
  scheduleId?: string
  autoResetEnabled?: boolean
  resetPeriodicity?: Periodicity
  resetWeekdays?: number[]
  resetDayOfMonth?: number
  resetCustomDays?: number
  targetIncreaseEnabled?: boolean
  targetIncreaseValue?: number
  targetIncreaseType?: 'fixed' | 'percentage'
  targetIncreasePeriodicity?: Periodicity
}

export interface MetricEntryCreateInput {
  metricId: string
  entryDate: Date
  value: number
  finalValue: number
  note?: string
  isAddition?: boolean
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

export interface UnitCreateInput {
  symbol: string
  category: string
  isDefault: boolean
}

export interface FavoriteFilterCreateInput {
  userId: string
  name: string
  entityType: string
  filters: any
  isDefault: boolean
}
