// MongoDB Document Types (with _id)

export interface MongoUser {
  _id: string
  login: string
  email: string
  registrationDate: Date | string
  settings: {
    monthYearHandling: 'start' | 'end'
    yearHandling: 'start' | 'end'
  }
}

export interface MongoCategory {
  _id: string
  name: string
  description?: string
  icon: string
  color: string
  isDefault: boolean
  createdAt: Date | string
  goalCount: number
  taskCount: number
}

export interface MongoGoal {
  _id: string
  name: string
  categoryId: string
  description?: string
  startDate: Date | string
  deadlineType: 'none' | 'specific_date' | 'month_year' | 'year'
  deadlineValue?: string | Date
  actualCompletionDate?: Date
  status: 'in_progress' | 'completed' | 'overdue' | 'planned' | 'frozen'
  priority: number
  progressCalculation: 'tasks' | 'metric'
  progressMetricId?: string
  createdAt: Date | string
}

export interface MongoStage {
  _id: string
  name: string
  goalId: string
  startDate: Date | string
  endDate: Date | string
}

export interface MongoTask {
  _id: string
  name: string
  description?: string
  goalId: string
  stageId?: string
  dueDate?: Date | string
  completed: boolean
  priority: number
  subtasks: Array<{
    id: string
    name: string
    completed: boolean
  }>
}

export interface MongoMetric {
  _id: string
  name: string
  type: 'habit' | 'counter'
  description?: string
  goalId?: string
  initialValue: number
  targetValue: number
  unit: string
  inputMode: 'fixed_step' | 'manual'
  stepValue?: number
  periodicity: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'every_n_days' | 'weekdays'
  nDays?: number
  weekdays?: number[]
  color: string
  createdAt: Date | string
}

export interface MongoMetricEntry {
  _id: string
  metricId: string
  value: number
  finalValue: number
  note?: string
  timestamp: Date | string
  isAddition: boolean
}

export interface MongoAchievement {
  _id: string
  type: 'habit' | 'counter' | 'task'
  title: string
  description?: string
  value?: number
  date?: Date | string
  createdAt: Date | string
}
