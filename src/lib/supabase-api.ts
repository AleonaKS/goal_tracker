import { getClient } from './supabase'
import type { 
  User, 
  Category, 
  Goal, 
  Stage, 
  Task, 
  Metric, 
  MetricEntry, 
  Unit, 
  FavoriteFilter,
  MetricAnalyticsCache,
  DashboardStats,
  UserAchievement,
  Achievement,
  GoalCreateInput,
  TaskCreateInput,
  MetricCreateInput,
  MetricEntryCreateInput,
  CategoryCreateInput,
  UnitCreateInput,
  StageCreateInput,
  Subtask,
  SubtaskCreateInput
} from '@/types'

// Local type matching database schema for favorite_filters
interface FavoriteFilterCreateInput {
  user_id: string
  name: string
  filter_type: string
  filter_value: Record<string, unknown>
  sort_by?: string
  sort_order?: string
}

// Users
export async function getUserById(id: string): Promise<User | null> {
  const { data, error } = await getClient()
    .from('users')
    .select('*')
    .eq('id', id)
    .single()
  
  if (error) throw error
  return data
}

export async function createUser(userData: Omit<User, 'id' | 'registrationDate'>): Promise<User> {
  const { data, error } = await getClient()
    .from('users')
    .insert([userData])
    .select()
    .single()
  
  if (error) throw error
  return data
}

// Categories
export async function getCategories(userId: string): Promise<Category[]> {
  const { data, error } = await getClient()
    .from('categories')
    .select('*')
    .or(`user_id.eq.${userId},is_default.eq.true`)
    .order('is_default', { ascending: false })
    .order('name')
  
  if (error) throw error
  return data || []
}

export async function createCategory(category: CategoryCreateInput): Promise<Category> {
  const { data, error } = await getClient()
    .from('categories')
    .insert([category])
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function updateCategory(id: string, updates: Partial<Category>): Promise<Category> {
  const { data, error } = await getClient()
    .from('categories')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function deleteCategory(id: string): Promise<void> {
  const { error } = await getClient()
    .from('categories')
    .delete()
    .eq('id', id)
  
  if (error) throw error
}

// Goals
export async function getGoals(userId: string): Promise<Goal[]> {
  console.log('getGoals called with userId:', userId)
  
  const { data, error } = await getClient()
    .from('goals')
    .select(`
      *,
      category:categories(*),
      stages:stages(*),
      metrics:metrics(*),
      tasks:tasks(*)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  
  if (error) {
    console.error('getGoals error:', error)
    throw error
  }
  
  console.log('getGoals returned', data?.length || 0, 'goals')
  return data || []
}

export async function getGoalById(id: string): Promise<Goal | null> {
  const { data, error } = await getClient()
    .from('goals')
    .select(`
      *,
      category:categories(*),
      stages:stages(*),
      metrics:metrics(*),
      tasks:tasks(*)
    `)
    .eq('id', id)
    .single()
  
  if (error) throw error
  return data
}

export async function createGoal(goal: GoalCreateInput): Promise<Goal> {
  // Validate required fields
  if (!goal.name) {
    throw new Error('name is required to create a goal')
  }
  if (!goal.categoryId) {
    throw new Error('categoryId is required to create a goal')
  }
  // userId is optional - if not provided, will use RLS or auth context
  
  // Transform camelCase to snake_case for database
  const dbGoal: any = {
    name: goal.name,
    category_id: goal.categoryId,
    due_type: goal.deadlineType || 'none',
    priority: goal.priority || 3,
    progress_calculation: goal.progressCalculation || 'by_tasks',
    status: goal.status || 'in_progress'
  }
  
  // Add user_id only if provided
  if (goal.userId) dbGoal.user_id = goal.userId
  
  // Only add other optional fields if they have values
  if (goal.description) dbGoal.description = goal.description

  // Handle Date conversion for startDate
  if (goal.startDate !== undefined) {
    dbGoal.start_date = goal.startDate instanceof Date
      ? goal.startDate.toISOString().split('T')[0]
      : goal.startDate
  }

  if (goal.progressMetricId) dbGoal.progress_metric_id = goal.progressMetricId
  if (goal.isFrozen !== undefined) dbGoal.is_frozen = goal.isFrozen
  if (goal.autoCalculateStatus !== undefined) dbGoal.auto_calculate_status = goal.autoCalculateStatus
  
  // Handle deadline value based on type
  if (goal.deadlineValue && goal.deadlineType !== 'none') {
    if (goal.deadlineType === 'specific_date') {
      // Convert Date to YYYY-MM-DD string
      const dateValue = goal.deadlineValue instanceof Date
        ? goal.deadlineValue.toISOString().split('T')[0]
        : goal.deadlineValue
      dbGoal.due_date = dateValue
    } else if (goal.deadlineType === 'month_year') {
      // Handle month_year - can be Date object or string (YYYY-MM format)
      if (goal.deadlineValue instanceof Date) {
        const year = goal.deadlineValue.getFullYear()
        const month = String(goal.deadlineValue.getMonth() + 1).padStart(2, '0')
        dbGoal.due_month_year = `${year}-${month}`
      } else {
        dbGoal.due_month_year = goal.deadlineValue
      }
    } else if (goal.deadlineType === 'year') {
      // Handle year - can be Date object, string, or number
      if (goal.deadlineValue instanceof Date) {
        dbGoal.due_year = goal.deadlineValue.getFullYear()
      } else if (typeof goal.deadlineValue === 'string') {
        dbGoal.due_year = parseInt(goal.deadlineValue)
      } else if (typeof goal.deadlineValue === 'number') {
        dbGoal.due_year = goal.deadlineValue
      }
    }
  }
  
  console.log('Creating goal:', dbGoal)
  
  const { data, error } = await getClient()
    .from('goals')
    .insert([dbGoal])
    .select(`
      *,
      category:categories(*)
    `)
    .single()
  
  if (error) {
    console.error('createGoal error:', error)
    console.error('createGoal data sent:', dbGoal)
    throw error
  }
  
  console.log('createGoal success:', data)
  return data
}

export async function updateGoal(id: string, updates: Partial<Goal>): Promise<Goal> {
  // Transform camelCase to snake_case for database
  const dbUpdates: any = {}
  if (updates.name) dbUpdates.name = updates.name
  if (updates.description !== undefined) dbUpdates.description = updates.description
  if (updates.categoryId) dbUpdates.category_id = updates.categoryId

  // Handle Date conversion for startDate
  if (updates.startDate !== undefined) {
    dbUpdates.start_date = updates.startDate instanceof Date
      ? updates.startDate.toISOString().split('T')[0]
      : updates.startDate
  }

  if (updates.dueType) dbUpdates.due_type = updates.dueType

  // Handle Date conversion for dueDate
  if (updates.dueDate !== undefined) {
    dbUpdates.due_date = updates.dueDate instanceof Date
      ? updates.dueDate.toISOString().split('T')[0]
      : updates.dueDate
  }

  if (updates.dueMonthYear) dbUpdates.due_month_year = updates.dueMonthYear
  if (updates.dueYear) dbUpdates.due_year = updates.dueYear
  if (updates.status) dbUpdates.status = updates.status
  if (updates.priority !== undefined) dbUpdates.priority = updates.priority
  if (updates.progress !== undefined) dbUpdates.progress = updates.progress
  if (updates.progressCalculation) dbUpdates.progress_calculation = updates.progressCalculation
  if (updates.progressMetricId) dbUpdates.progress_metric_id = updates.progressMetricId
  if (updates.isFrozen !== undefined) dbUpdates.is_frozen = updates.isFrozen
  if (updates.autoCalculateStatus !== undefined) dbUpdates.auto_calculate_status = updates.autoCalculateStatus

  // Handle deadlineValue based on deadlineType (from GoalForm)
  if (updates.deadlineValue !== undefined && updates.deadlineType && updates.deadlineType !== 'none') {
    // Set the due_type field
    dbUpdates.due_type = updates.deadlineType

    if (updates.deadlineType === 'specific_date') {
      // Handle Date object or string
      const dateValue = updates.deadlineValue instanceof Date
        ? updates.deadlineValue
        : new Date(updates.deadlineValue as string)
      dbUpdates.due_date = dateValue.toISOString().split('T')[0]
    } else if (updates.deadlineType === 'month_year') {
      // Handle month_year - can be Date object or string (YYYY-MM format)
      if (updates.deadlineValue instanceof Date) {
        const year = updates.deadlineValue.getFullYear()
        const month = String(updates.deadlineValue.getMonth() + 1).padStart(2, '0')
        dbUpdates.due_month_year = `${year}-${month}`
      } else {
        dbUpdates.due_month_year = updates.deadlineValue as string
      }
    } else if (updates.deadlineType === 'year') {
      // Handle year - can be Date object, string, or number
      if (updates.deadlineValue instanceof Date) {
        dbUpdates.due_year = updates.deadlineValue.getFullYear()
      } else if (typeof updates.deadlineValue === 'string') {
        dbUpdates.due_year = parseInt(updates.deadlineValue)
      } else if (typeof updates.deadlineValue === 'number') {
        dbUpdates.due_year = updates.deadlineValue
      }
    }
  }

  console.log('updateGoal - dbUpdates:', dbUpdates)

  const { data, error } = await getClient()
    .from('goals')
    .update(dbUpdates)
    .eq('id', id)
    .select(`
      *,
      category:categories(*)
    `)
    .single()

  if (error) {
    console.error('updateGoal error:', error)
    throw error
  }
  return data
}

export async function deleteGoal(id: string): Promise<void> {
  const { error } = await getClient()
    .from('goals')
    .delete()
    .eq('id', id)
  
  if (error) throw error
}

// Tasks
export async function getTasks(userId: string): Promise<Task[]> {
  const { data, error } = await getClient()
    .from('tasks')
    .select(`
      *,
      goal:goals(*),
      stage:stages(*)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data || []
}

export async function createTask(task: TaskCreateInput): Promise<Task> {
  // Transform camelCase to snake_case for database
  const dbTask: any = {
    name: task.name,
    description: task.description,
    priority: task.priority,
    complexity: task.complexity,
    weight: task.weight,
    completed: task.completed ?? false,
    is_period_based: task.isPeriodBased ?? false,
    user_id: task.userId
  }

  // Handle Date conversion for dueDate
  if (task.dueDate !== undefined) {
    dbTask.due_date = task.dueDate instanceof Date
      ? task.dueDate.toISOString().split('T')[0]
      : task.dueDate
  }

  // Handle Date conversion for startDate
  if (task.startDate !== undefined) {
    dbTask.start_date = task.startDate instanceof Date
      ? task.startDate.toISOString().split('T')[0]
      : task.startDate
  }

  // Only include goal_id/stage_id if they have valid values (not empty strings)
  if (task.goalId && task.goalId !== '') dbTask.goal_id = task.goalId
  if (task.stageId && task.stageId !== '') dbTask.stage_id = task.stageId
  
  // Time blocking fields
  if (task.duration !== undefined) dbTask.duration = task.duration
  if (task.startTime !== undefined) dbTask.start_time = task.startTime
  if (task.endTime !== undefined) dbTask.end_time = task.endTime

  console.log('createTask - dbTask:', dbTask)

  const { data, error } = await getClient()
    .from('tasks')
    .insert([dbTask])
    .select(`
      *,
      goal:goals(*),
      stage:stages(*)
    `)
    .single()

  if (error) {
    console.error('createTask error:', error)
    throw error
  }
  console.log('createTask success:', data)
  return data
}

export async function updateTask(id: string, updates: Partial<Task>): Promise<Task> {
  // Transform camelCase to snake_case for database
  const dbUpdates: any = {}

  // Only include fields that exist in database
  if (updates.name !== undefined) dbUpdates.name = updates.name
  if (updates.description !== undefined) dbUpdates.description = updates.description
  // Only include goal_id/stage_id if they have valid values (not empty strings)
  if (updates.goalId !== undefined && updates.goalId !== '') dbUpdates.goal_id = updates.goalId
  if (updates.stageId !== undefined && updates.stageId !== '') dbUpdates.stage_id = updates.stageId
  if (updates.priority !== undefined) dbUpdates.priority = updates.priority
  if (updates.complexity !== undefined) dbUpdates.complexity = updates.complexity
  if (updates.weight !== undefined) dbUpdates.weight = updates.weight
  if (updates.completed !== undefined) dbUpdates.completed = updates.completed
  // Handle Date conversion for dueDate
  if (updates.dueDate !== undefined) {
    dbUpdates.due_date = updates.dueDate instanceof Date
      ? updates.dueDate.toISOString().split('T')[0]
      : updates.dueDate
  }
  if (updates.isPeriodBased !== undefined) dbUpdates.is_period_based = updates.isPeriodBased
  // Handle Date conversion for startDate
  if (updates.startDate !== undefined) {
    dbUpdates.start_date = updates.startDate instanceof Date
      ? updates.startDate.toISOString().split('T')[0]
      : updates.startDate
  }
  if (updates.completedAt !== undefined) dbUpdates.completed_at = updates.completedAt

  // Add progress field if present
  if (updates.progress !== undefined) dbUpdates.progress = updates.progress

  // Time blocking fields
  if (updates.duration !== undefined) dbUpdates.duration = updates.duration
  if (updates.startTime !== undefined) dbUpdates.start_time = updates.startTime
  if (updates.endTime !== undefined) dbUpdates.end_time = updates.endTime

  console.log('updateTask - id:', id, 'dbUpdates:', dbUpdates)

  const { data, error } = await getClient()
    .from('tasks')
    .update(dbUpdates)
    .eq('id', id)
    .select(`
      *,
      goal:goals(*),
      stage:stages(*)
    `)
    .single()

  if (error) {
    console.error('updateTask error:', error)
    throw error
  }
  console.log('updateTask success:', data)
  return data
}

export async function deleteTask(id: string): Promise<void> {
  const { error } = await getClient()
    .from('tasks')
    .delete()
    .eq('id', id)
  
  if (error) throw error
}

// Stages
export async function getStages(userId: string): Promise<Stage[]> {
  const { data, error } = await getClient()
    .from('stages')
    .select(`
      *,
      goal:goals(*)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data || []
}

export async function createStage(stage: StageCreateInput): Promise<Stage> {
  // Transform camelCase to snake_case for database
  const dbStage: any = {
    name: stage.name,
    description: stage.description,
    order_index: stage.orderIndex ?? 0,
    goal_id: stage.goalId,
    user_id: stage.userId
  }

  // Handle Date conversion for startDate
  if (stage.startDate !== undefined) {
    dbStage.start_date = stage.startDate instanceof Date
      ? stage.startDate.toISOString().split('T')[0]
      : stage.startDate
  }

  // Handle Date conversion for dueDate (endDate in input)
  if (stage.dueDate !== undefined) {
    dbStage.due_date = stage.dueDate instanceof Date
      ? stage.dueDate.toISOString().split('T')[0]
      : stage.dueDate
  }

  console.log('createStage - dbStage:', dbStage)

  const { data, error } = await getClient()
    .from('stages')
    .insert([dbStage])
    .select('*')
    .single()

  if (error) {
    console.error('createStage error:', error)
    throw error
  }
  console.log('createStage success:', data)
  return data
}

export async function updateStage(id: string, updates: Partial<Stage>): Promise<Stage> {
  // Transform camelCase to snake_case for database
  const dbUpdates: any = {}

  if (updates.name !== undefined) dbUpdates.name = updates.name
  if (updates.description !== undefined) dbUpdates.description = updates.description
  if (updates.orderIndex !== undefined) dbUpdates.order_index = updates.orderIndex
  if (updates.goalId !== undefined) dbUpdates.goal_id = updates.goalId

  // Handle Date conversion for startDate
  if (updates.startDate !== undefined) {
    dbUpdates.start_date = updates.startDate instanceof Date
      ? updates.startDate.toISOString().split('T')[0]
      : updates.startDate
  }

  // Handle Date conversion for dueDate
  if (updates.dueDate !== undefined) {
    dbUpdates.due_date = updates.dueDate instanceof Date
      ? updates.dueDate.toISOString().split('T')[0]
      : updates.dueDate
  }

  console.log('updateStage - id:', id, 'dbUpdates:', dbUpdates)

  const { data, error } = await getClient()
    .from('stages')
    .update(dbUpdates)
    .eq('id', id)
    .select('*')
    .single()

  if (error) {
    console.error('updateStage error:', error)
    throw error
  }
  console.log('updateStage success:', data)
  return data
}

export async function deleteStage(id: string): Promise<void> {
  const { error } = await getClient()
    .from('stages')
    .delete()
    .eq('id', id)
  
  if (error) throw error
}

// Metrics
export async function getMetrics(userId: string): Promise<Metric[]> {
  const { data, error } = await getClient()
    .from('metrics')
    .select(`
      *,
      goal:goals(*)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data || []
}

export async function createMetric(metric: MetricCreateInput): Promise<Metric> {
  // Transform camelCase to snake_case for database
  // Ensure targetValue has a default value since DB requires it
  const targetValue = metric.targetValue ?? 100

  const dbMetric = {
    name: metric.name,
    type: metric.type,
    description: metric.description,
    goal_id: metric.goalId,
    category_id: metric.categoryId,
    start_value: metric.startValue ?? 0,
    target_value: targetValue,
    unit_id: metric.unitId,
    custom_unit: metric.customUnit,
    input_mode: metric.inputMode,
    step_value: metric.stepValue,
    accumulative: metric.accumulative ?? true,
    color: metric.color,
    schedule_id: metric.scheduleId,
    auto_reset_enabled: metric.autoResetEnabled,
    reset_periodicity: metric.resetPeriodicity,
    reset_weekdays: metric.resetWeekdays,
    reset_day_of_month: metric.resetDayOfMonth,
    reset_custom_days: metric.resetCustomDays,
    target_increase_enabled: metric.targetIncreaseEnabled,
    target_increase_value: metric.targetIncreaseValue,
    target_increase_type: metric.targetIncreaseType,
    target_increase_periodicity: metric.targetIncreasePeriodicity,
    user_id: metric.userId
  }

  console.log('createMetric - dbMetric:', dbMetric)

  const { data, error } = await getClient()
    .from('metrics')
    .insert([dbMetric])
    .select(`
      *,
      goal:goals(*)
    `)
    .single()

  if (error) {
    console.error('createMetric error:', error)
    throw error
  }
  console.log('createMetric success:', data)
  return data
}

export async function updateMetric(id: string, updates: Partial<Metric>): Promise<Metric> {
  // Transform camelCase to snake_case for database
  const dbUpdates: any = {}
  if (updates.name !== undefined) dbUpdates.name = updates.name
  if (updates.type !== undefined) dbUpdates.type = updates.type
  if (updates.description !== undefined) dbUpdates.description = updates.description
  if (updates.goalId !== undefined) dbUpdates.goal_id = updates.goalId
  if (updates.categoryId !== undefined) dbUpdates.category_id = updates.categoryId
  if (updates.startValue !== undefined) dbUpdates.start_value = updates.startValue
  if (updates.targetValue !== undefined) dbUpdates.target_value = updates.targetValue
  if (updates.unitId !== undefined) dbUpdates.unit_id = updates.unitId
  if (updates.customUnit !== undefined) dbUpdates.custom_unit = updates.customUnit
  if (updates.inputMode !== undefined) dbUpdates.input_mode = updates.inputMode
  if (updates.stepValue !== undefined) dbUpdates.step_value = updates.stepValue
  if (updates.accumulative !== undefined) dbUpdates.accumulative = updates.accumulative
  if (updates.color !== undefined) dbUpdates.color = updates.color
  if (updates.scheduleId !== undefined) dbUpdates.schedule_id = updates.scheduleId
  if (updates.autoResetEnabled !== undefined) dbUpdates.auto_reset_enabled = updates.autoResetEnabled
  if (updates.resetPeriodicity !== undefined) dbUpdates.reset_periodicity = updates.resetPeriodicity
  if (updates.resetWeekdays !== undefined) dbUpdates.reset_weekdays = updates.resetWeekdays
  if (updates.resetDayOfMonth !== undefined) dbUpdates.reset_day_of_month = updates.resetDayOfMonth
  if (updates.resetCustomDays !== undefined) dbUpdates.reset_custom_days = updates.resetCustomDays
  if (updates.targetIncreaseEnabled !== undefined) dbUpdates.target_increase_enabled = updates.targetIncreaseEnabled
  if (updates.targetIncreaseValue !== undefined) dbUpdates.target_increase_value = updates.targetIncreaseValue
  if (updates.targetIncreaseType !== undefined) dbUpdates.target_increase_type = updates.targetIncreaseType
  if (updates.targetIncreasePeriodicity !== undefined) dbUpdates.target_increase_periodicity = updates.targetIncreasePeriodicity

  console.log('updateMetric - id:', id, 'dbUpdates:', dbUpdates)

  const { data, error } = await getClient()
    .from('metrics')
    .update(dbUpdates)
    .eq('id', id)
    .select(`
      *,
      goal:goals(*)
    `)
    .single()

  if (error) {
    console.error('updateMetric error:', error)
    throw error
  }
  console.log('updateMetric success:', data)
  return data
}

export async function deleteMetric(id: string): Promise<void> {
  const { error } = await getClient()
    .from('metrics')
    .delete()
    .eq('id', id)
  
  if (error) throw error
}

// Subtasks
export async function getSubtasks(taskId: string): Promise<Subtask[]> {
  const { data, error } = await getClient()
    .from('subtasks')
    .select('*')
    .eq('task_id', taskId)
    .order('order_index', { ascending: true })
  
  if (error) throw error
  return data || []
}

export async function createSubtask(subtask: Omit<Subtask, 'id' | 'createdAt'>): Promise<Subtask> {
  const { data, error } = await getClient()
    .from('subtasks')
    .insert([subtask])
    .select('*')
    .single()
  
  if (error) throw error
  return data
}

export async function updateSubtask(id: string, updates: Partial<Subtask>): Promise<Subtask> {
  const { data, error } = await getClient()
    .from('subtasks')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single()
  
  if (error) throw error
  return data
}

export async function deleteSubtask(id: string): Promise<void> {
  const { error } = await getClient()
    .from('subtasks')
    .delete()
    .eq('id', id)
  
  if (error) throw error
}

// Auto-reset metrics
export async function resetMetric(metricId: string): Promise<void> {
  // First get current metric data
  const { data: metricData, error: fetchError } = await getClient()
    .from('metrics')
    .select('*')
    .eq('id', metricId)
    .single()
  
  if (fetchError) throw fetchError
  
  let newTargetValue = metricData.target_value
  
  // Calculate new target if increase is enabled
  if (metricData.target_increase_enabled) {
    const increaseValue = metricData.target_increase_value || 0
    const increaseType = metricData.target_increase_type || 'fixed'
    
    if (increaseType === 'percentage') {
      newTargetValue = newTargetValue + (newTargetValue * increaseValue / 100)
    } else {
      newTargetValue = newTargetValue + increaseValue
    }
  }
  
  // Update metric with new reset info
  const { error: updateError } = await getClient()
    .from('metrics')
    .update({ 
      last_reset_at: new Date().toISOString(),
      target_value: newTargetValue
    })
    .eq('id', metricId)
  
  if (updateError) throw updateError
}

export async function checkAndResetMetrics(userId: string): Promise<string[]> {
  const { data: metrics, error: fetchError } = await getClient()
    .from('metrics')
    .select('*')
    .eq('user_id', userId)
    .eq('auto_reset_enabled', true)
  
  if (fetchError) throw fetchError
  
  const resetMetrics: string[] = []
  
  for (const metric of metrics) {
    const shouldReset = await shouldResetMetricDB(metric)
    if (shouldReset) {
      await resetMetric(metric.id)
      resetMetrics.push(metric.id)
    }
  }
  
  return resetMetrics
}

async function shouldResetMetricDB(metric: any): Promise<boolean> {
  if (!metric.auto_reset_enabled || !metric.reset_periodicity) {
    return false
  }

  const now = new Date()
  const lastReset = metric.last_reset_at ? new Date(metric.last_reset_at) : new Date(0)

  switch (metric.reset_periodicity) {
    case 'daily':
      return lastReset.toDateString() !== now.toDateString()
    
    case 'weekly':
      const daysSinceReset = Math.floor((now.getTime() - lastReset.getTime()) / (1000 * 60 * 60 * 24))
      return daysSinceReset >= 7
    
    case 'monthly':
      return lastReset.getMonth() !== now.getMonth() || lastReset.getFullYear() !== now.getFullYear()
    
    case 'yearly':
      return lastReset.getFullYear() !== now.getFullYear()
    
    case 'custom':
      const customDays = metric.reset_custom_days || 7
      const daysSinceLastReset = Math.floor((now.getTime() - lastReset.getTime()) / (1000 * 60 * 60 * 24))
      return daysSinceLastReset >= customDays
    
    default:
      return false
  }
}

// Dashboard and analytics functions
export async function getDashboardStats(userId: string): Promise<DashboardStats> {
  const [goalsCount, tasksCount, metricsCount, completedGoals, completedTasks, goalsInProgress, goalsOverdue, goalsPlanned] = await Promise.all([
    getClient().from('goals').select('id').eq('user_id', userId),
    getClient().from('tasks').select('id').eq('user_id', userId),
    getClient().from('metrics').select('id').eq('user_id', userId),
    getClient().from('goals').select('id').eq('user_id', userId).eq('status', 'completed'),
    getClient().from('tasks').select('id').eq('user_id', userId).eq('completed', true),
    getClient().from('goals').select('id').eq('user_id', userId).eq('status', 'in_progress'),
    getClient().from('goals').select('id').eq('user_id', userId).eq('status', 'overdue'),
    getClient().from('goals').select('id').eq('user_id', userId).eq('status', 'planned')
  ])

  return {
    totalGoals: goalsCount.data?.length || 0,
    totalTasks: tasksCount.data?.length || 0,
    totalMetrics: metricsCount.data?.length || 0,
    completedGoals: completedGoals.data?.length || 0,
    completedTasks: completedTasks.data?.length || 0,
    goals_in_progress: goalsInProgress.data?.length || 0,
    goals_completed: completedGoals.data?.length || 0,
    goals_overdue: goalsOverdue.data?.length || 0,
    goals_planned: goalsPlanned.data?.length || 0
  }
}

export async function getUpcomingTasks(userId: string, days: number = 7) {
  const { data, error } = await getClient()
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .eq('completed', false)
    .gte('due_date', new Date().toISOString())
    .lte('due_date', new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString())
    .order('due_date', { ascending: true })
  
  if (error) throw error
  return data || []
}

export async function getUpcomingGoals(userId: string, days: number = 30) {
  const { data, error } = await getClient()
    .from('goals')
    .select('*')
    .eq('user_id', userId)
    .neq('status', 'completed')
    .gte('due_date', new Date().toISOString())
    .lte('due_date', new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString())
    .order('due_date', { ascending: true })
  
  if (error) throw error
  return data || []
}

export async function getMetricAnalytics(userId: string) {
  const { data, error } = await getClient()
    .from('metric_analytics_cache')
    .select('*')
    .eq('user_id', userId)
    .order('calculated_at', { ascending: false })
  
  if (error) throw error
  return data || []
}

// Units
export async function getUnits(): Promise<Unit[]> {
  const { data, error } = await getClient()
    .from('units')
    .select('*')
    .order('category', { ascending: true })
  
  if (error) throw error
  return data || []
}

export async function createUnit(unit: UnitCreateInput): Promise<Unit> {
  const { data, error } = await getClient()
    .from('units')
    .insert([unit])
    .select('*')
    .single()
  
  if (error) throw error
  return data
}

export async function updateUnit(id: string, updates: Partial<Unit>): Promise<Unit> {
  const { data, error } = await getClient()
    .from('units')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single()
  
  if (error) throw error
  return data
}

export async function deleteUnit(id: string): Promise<void> {
  const { error } = await getClient()
    .from('units')
    .delete()
    .eq('id', id)
  
  if (error) throw error
}

// Favorite Filters
export async function getFavoriteFilters(userId: string): Promise<FavoriteFilter[]> {
  const { data, error } = await getClient()
    .from('favorite_filters')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data || []
}

export async function createFavoriteFilter(filter: FavoriteFilterCreateInput): Promise<FavoriteFilter> {
  const { data, error } = await getClient()
    .from('favorite_filters')
    .insert([filter])
    .select('*')
    .single()
  
  if (error) throw error
  
  // Transform snake_case to camelCase
  return {
    id: data.id,
    userId: data.user_id,
    name: data.name,
    filterType: data.filter_type,
    filterValue: data.filter_value,
    sortBy: data.sort_by,
    sortOrder: data.sort_order,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at)
  }
}

export async function updateFavoriteFilter(id: string, updates: Partial<FavoriteFilter>): Promise<FavoriteFilter> {
  const { data, error } = await getClient()
    .from('favorite_filters')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single()
  
  if (error) throw error
  return data
}

export async function deleteFavoriteFilter(id: string): Promise<void> {
  const { error } = await getClient()
    .from('favorite_filters')
    .delete()
    .eq('id', id)
  
  if (error) throw error
}

// Metric Entries
export async function getAllMetricEntries(userId: string): Promise<MetricEntry[]> {
  // First get user's metrics, then get all entries for those metrics
  const { data: metrics, error: metricsError } = await getClient()
    .from('metrics')
    .select('id')
    .eq('user_id', userId)
  
  if (metricsError) throw metricsError
  if (!metrics || metrics.length === 0) return []
  
  const metricIds = metrics.map(m => m.id)
  
  const { data, error } = await getClient()
    .from('metric_entries')
    .select('*')
    .in('metric_id', metricIds)
    .order('entry_date', { ascending: false })
  
  if (error) throw error
  
  return data.map(entry => ({
    id: entry.id,
    metricId: entry.metric_id,
    entryDate: entry.entry_date,
    value: entry.value,
    finalValue: entry.final_value,
    note: entry.note,
    isAddition: entry.is_addition,
    isOverachievement: entry.is_overachievement,
    overachievementValue: entry.overachievement_value,
    createdAt: new Date(entry.created_at)
  }))
}

export async function getMetricEntries(metricId: string): Promise<MetricEntry[]> {
  const { data, error } = await getClient()
    .from('metric_entries')
    .select('*')
    .eq('metric_id', metricId)
    .order('entry_date', { ascending: false })
  
  if (error) throw error
  
  // Transform snake_case to camelCase
  return (data || []).map((item: any) => ({
    id: item.id,
    metricId: item.metric_id,
    entryDate: new Date(item.entry_date),
    value: parseFloat(item.value),
    finalValue: parseFloat(item.final_value),
    note: item.note,
    isAddition: item.is_addition,
    isOverachievement: item.is_overachievement,
    overachievementValue: parseFloat(item.overachievement_value || 0),
    createdAt: new Date(item.created_at)
  }))
}

export async function createMetricEntry(entry: MetricEntryCreateInput): Promise<MetricEntry> {
  console.log('createMetricEntry called with:', entry)

  const entryDate = entry.entryDate.toISOString().split('T')[0]

  // Transform field names to match database schema
  const dbEntry = {
    metric_id: entry.metricId,
    entry_date: entryDate,
    value: entry.value,
    final_value: entry.finalValue,
    note: entry.note,
    is_addition: entry.isAddition ?? true,
    is_overachievement: entry.isOverachievement ?? false,
    overachievement_value: entry.overachievementValue ?? 0
  }

  console.log('Inserting metric entry:', dbEntry)

  // Simple insert - table is now clean without problematic constraints
  const { data, error } = await getClient()
    .from('metric_entries')
    .insert([dbEntry])
    .select()
    .single()

  if (error) {
    console.error('createMetricEntry error:', error)
    throw error
  }

  console.log('Insert result:', data)

  // Transform snake_case to camelCase
  return {
    id: data.id,
    metricId: data.metric_id,
    entryDate: new Date(data.entry_date),
    value: parseFloat(data.value),
    finalValue: parseFloat(data.final_value),
    note: data.note,
    isAddition: data.is_addition,
    isOverachievement: data.is_overachievement,
    overachievementValue: parseFloat(data.overachievement_value || 0),
    createdAt: new Date(data.created_at)
  }
}

export async function updateMetricEntry(id: string, updates: Partial<MetricEntry>): Promise<MetricEntry> {
  // Transform field names to match database schema
  const dbUpdates: any = {}
  if (updates.metricId) dbUpdates.metric_id = updates.metricId
  if (updates.entryDate) dbUpdates.entry_date = updates.entryDate.toISOString().split('T')[0]
  if (updates.value !== undefined) dbUpdates.value = updates.value
  if (updates.finalValue !== undefined) dbUpdates.final_value = updates.finalValue
  if (updates.note !== undefined) dbUpdates.note = updates.note
  if (updates.isAddition !== undefined) dbUpdates.is_addition = updates.isAddition
  if (updates.isOverachievement !== undefined) dbUpdates.is_overachievement = updates.isOverachievement
  if (updates.overachievementValue !== undefined) dbUpdates.overachievement_value = updates.overachievementValue

  const { data, error } = await getClient()
    .from('metric_entries')
    .update(dbUpdates)
    .eq('id', id)
    .select('*')
    .single()
  
  if (error) throw error
  return data
}

export async function deleteMetricEntry(id: string): Promise<void> {
  const { error } = await getClient()
    .from('metric_entries')
    .delete()
    .eq('id', id)
  
  if (error) throw error
}

// Subtasks are now stored as JSONB in tasks table
// Use updateTask to modify subtasks

// Achievements (System Definitions)
export async function getAchievements(userId: string): Promise<Achievement[]> {
  const { data, error } = await getClient()
    .from('achievements')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  
  if (error) throw error
  
  return (data || []).map((item: any) => ({
    id: item.id,
    userId: item.user_id,
    type: item.type,
    title: item.title,
    description: item.description,
    value: item.value,
    referenceId: item.reference_id,
    createdAt: new Date(item.created_at)
  }))
}

export async function createAchievement(
  achievement: Omit<Achievement, 'id' | 'createdAt'>
): Promise<Achievement> {
  const dbAchievement = {
    user_id: achievement.userId,
    type: achievement.type,
    title: achievement.title,
    description: achievement.description,
    value: achievement.value,
    reference_id: achievement.referenceId
  }
  
  const { data, error } = await getClient()
    .from('achievements')
    .insert([dbAchievement])
    .select('*')
    .single()
  
  if (error) throw error
  
  return {
    id: data.id,
    userId: data.user_id,
    type: data.type,
    title: data.title,
    description: data.description,
    value: data.value,
    referenceId: data.reference_id,
    createdAt: new Date(data.created_at)
  }
}

export async function deleteAchievement(achievementId: string): Promise<void> {
  const { error } = await getClient()
    .from('achievements')
    .delete()
    .eq('id', achievementId)
  
  if (error) throw error
}

// User Achievements (Gamification)
export async function getUserAchievements(userId: string): Promise<UserAchievement[]> {
  const { data, error } = await getClient()
    .from('user_achievements')
    .select('*')
    .eq('user_id', userId)
    .order('unlocked_at', { ascending: false })
  
  if (error) throw error
  
  return (data || []).map((item: any) => ({
    id: item.id,
    userId: item.user_id,
    achievementId: item.achievement_id,
    unlockedAt: new Date(item.unlocked_at),
    pointsAwarded: item.points_awarded
  }))
}

export async function createUserAchievement(
  achievement: Omit<UserAchievement, 'id' | 'unlockedAt'>
): Promise<UserAchievement> {
  const dbAchievement = {
    user_id: achievement.userId,
    achievement_id: achievement.achievementId,
    points_awarded: achievement.pointsAwarded
  }
  
  const { data, error } = await getClient()
    .from('user_achievements')
    .insert([dbAchievement])
    .select('*')
    .single()
  
  if (error) throw error
  
  return {
    id: data.id,
    userId: data.user_id,
    achievementId: data.achievement_id,
    unlockedAt: new Date(data.unlocked_at),
    pointsAwarded: data.points_awarded
  }
}

export async function updateUserGamificationStats(
  userId: string, 
  updates: { totalPoints?: number; level?: number; gamificationEnabled?: boolean }
): Promise<void> {
  const dbUpdates: any = {}
  if (updates.totalPoints !== undefined) dbUpdates.total_points = updates.totalPoints
  if (updates.level !== undefined) dbUpdates.level = updates.level
  if (updates.gamificationEnabled !== undefined) dbUpdates.gamification_enabled = updates.gamificationEnabled
  
  const { error } = await getClient()
    .from('users')
    .update(dbUpdates)
    .eq('id', userId)
  
  if (error) throw error
}

// ============================================================================
// Calendar Events API
// ============================================================================

export interface CalendarEvent {
  id: string
  userId: string
  eventDate: Date
  eventType: 'countdown' | 'reminder' | 'milestone' | 'deadline'
  entityId?: string
  title: string
  color?: string
  createdAt: Date
}

export async function getCalendarEvents(userId: string): Promise<CalendarEvent[]> {
  const { data, error } = await getClient()
    .from('calendar_events')
    .select('*')
    .eq('user_id', userId)
    .order('event_date', { ascending: true })
  
  if (error) throw error
  
  return (data || []).map((item: any) => ({
    id: item.id,
    userId: item.user_id,
    eventDate: new Date(item.event_date),
    eventType: item.event_type,
    entityId: item.entity_id,
    title: item.title,
    color: item.color,
    createdAt: new Date(item.created_at)
  }))
}

export async function getUpcomingEvents(userId: string, days: number = 30): Promise<CalendarEvent[]> {
  const futureDate = new Date()
  futureDate.setDate(futureDate.getDate() + days)
  
  const { data, error } = await getClient()
    .from('calendar_events')
    .select('*')
    .eq('user_id', userId)
    .gte('event_date', new Date().toISOString())
    .lte('event_date', futureDate.toISOString())
    .order('event_date', { ascending: true })
  
  if (error) throw error
  
  return (data || []).map((item: any) => ({
    id: item.id,
    userId: item.user_id,
    eventDate: new Date(item.event_date),
    eventType: item.event_type,
    entityId: item.entity_id,
    title: item.title,
    color: item.color,
    createdAt: new Date(item.created_at)
  }))
}

export async function createCalendarEvent(
  event: Omit<CalendarEvent, 'id' | 'createdAt'>
): Promise<CalendarEvent> {
  const dbEvent = {
    user_id: event.userId,
    event_date: event.eventDate.toISOString(),
    event_type: event.eventType,
    entity_id: event.entityId,
    title: event.title,
    color: event.color
  }
  
  const { data, error } = await getClient()
    .from('calendar_events')
    .insert([dbEvent])
    .select('*')
    .single()
  
  if (error) throw error
  
  return {
    id: data.id,
    userId: data.user_id,
    eventDate: new Date(data.event_date),
    eventType: data.event_type,
    entityId: data.entity_id,
    title: data.title,
    color: data.color,
    createdAt: new Date(data.created_at)
  }
}

export async function updateCalendarEvent(
  id: string,
  updates: Partial<Omit<CalendarEvent, 'id' | 'userId' | 'createdAt'>>
): Promise<CalendarEvent> {
  const dbUpdates: any = {}
  if (updates.eventDate !== undefined) dbUpdates.event_date = updates.eventDate.toISOString()
  if (updates.eventType !== undefined) dbUpdates.event_type = updates.eventType
  if (updates.title !== undefined) dbUpdates.title = updates.title
  if (updates.color !== undefined) dbUpdates.color = updates.color
  
  const { data, error } = await getClient()
    .from('calendar_events')
    .update(dbUpdates)
    .eq('id', id)
    .select('*')
    .single()
  
  if (error) throw error
  
  return {
    id: data.id,
    userId: data.user_id,
    eventDate: new Date(data.event_date),
    eventType: data.event_type,
    entityId: data.entity_id,
    title: data.title,
    color: data.color,
    createdAt: new Date(data.created_at)
  }
}

export async function deleteCalendarEvent(id: string): Promise<void> {
  const { error } = await getClient()
    .from('calendar_events')
    .delete()
    .eq('id', id)
  
  if (error) throw error
}
