import type { User, Goal, Task, Metric, MetricEntry, Category, Stage, Subtask } from '@/types'

export interface ExportData {
  user: Omit<User, 'passwordHash'>
  categories: Category[]
  goals: Goal[]
  stages: Stage[]
  tasks: Task[]
  subtasks: Subtask[]
  metrics: Metric[]
  metricEntries: MetricEntry[]
  exportedAt: string
  version: string
}

export interface ImportResult {
  success: boolean
  message: string
  imported: {
    categories: number
    goals: number
    stages: number
    tasks: number
    subtasks: number
    metrics: number
    metricEntries: number
  }
  errors?: string[]
  warnings?: string[]
}

export function exportToJSON(
  user: User,
  categories: Category[],
  goals: Goal[],
  stages: Stage[],
  tasks: Task[],
  subtasks: Subtask[],
  metrics: Metric[],
  metricEntries: MetricEntry[]
): string {
  const exportData: ExportData = {
    user: {
      id: user.id,
      login: user.login,
      email: user.email,
      name: user.name,
      registrationDate: user.registrationDate,
      settings: user.settings,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    },
    categories,
    goals,
    stages,
    tasks,
    subtasks,
    metrics,
    metricEntries,
    exportedAt: new Date().toISOString(),
    version: '1.0.0'
  }

  return JSON.stringify(exportData, null, 2)
}

export function downloadJSON(data: string, filename: string): void {
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function exportUserData(
  user: User,
  categories: Category[],
  goals: Goal[],
  stages: Stage[],
  tasks: Task[],
  subtasks: Subtask[],
  metrics: Metric[],
  metricEntries: MetricEntry[]
): void {
  const jsonData = exportToJSON(user, categories, goals, stages, tasks, subtasks, metrics, metricEntries)
  const timestamp = new Date().toISOString().split('T')[0]
  const filename = `goaltracker_export_${user.login}_${timestamp}.json`
  
  downloadJSON(jsonData, filename)
}

export function exportFilteredData(
  user: User,
  categories: Category[],
  goals: Goal[],
  stages: Stage[],
  tasks: Task[],
  subtasks: Subtask[],
  metrics: Metric[],
  metricEntries: MetricEntry[],
  options: {
    categoryId?: string
    dateFrom?: Date
    dateTo?: Date
    includeCompleted?: boolean
    includeMetrics?: boolean
  }
): void {
  let filteredGoals = goals
  let filteredTasks = tasks
  let filteredMetrics = metrics
  let filteredMetricEntries = metricEntries

  // Фильтрация по категории
  if (options.categoryId) {
    filteredGoals = filteredGoals.filter(goal => goal.categoryId === options.categoryId)
    filteredTasks = filteredTasks.filter(task => task.categoryId === options.categoryId)
    filteredMetrics = filteredMetrics.filter(metric => metric.categoryId === options.categoryId)
  }

  // Фильтрация по диапазону дат
  if (options.dateFrom) {
    filteredGoals = filteredGoals.filter(goal => 
      goal.createdAt && new Date(goal.createdAt) >= options.dateFrom!
    )
    filteredTasks = filteredTasks.filter(task => 
      task.createdAt && new Date(task.createdAt) >= options.dateFrom!
    )
    filteredMetrics = filteredMetrics.filter(metric => 
      metric.createdAt && new Date(metric.createdAt) >= options.dateFrom!
    )
    filteredMetricEntries = filteredMetricEntries.filter(entry => 
      new Date(entry.entryDate) >= options.dateFrom!
    )
  }

  if (options.dateTo) {
    filteredGoals = filteredGoals.filter(goal => 
      goal.createdAt && new Date(goal.createdAt) <= options.dateTo!
    )
    filteredTasks = filteredTasks.filter(task => 
      task.createdAt && new Date(task.createdAt) <= options.dateTo!
    )
    filteredMetrics = filteredMetrics.filter(metric => 
      metric.createdAt && new Date(metric.createdAt) <= options.dateTo!
    )
    filteredMetricEntries = filteredMetricEntries.filter(entry => 
      new Date(entry.entryDate) <= options.dateTo!
    )
  }

  // Фильтрация выполненных элементов
  if (!options.includeCompleted) {
    filteredGoals = filteredGoals.filter(goal => goal.status !== 'completed')
    filteredTasks = filteredTasks.filter(task => !task.completed)
  }

  // Фильтрация метрик
  if (!options.includeMetrics) {
    filteredMetrics = []
    filteredMetricEntries = []
  }

  // Получение связанных элементов для отфильтрованных целей
  const filteredGoalIds = new Set(filteredGoals.map(g => g.id))
  const filteredTaskIds = new Set(filteredTasks.map(t => t.id))
  const filteredMetricIds = new Set(filteredMetrics.map(m => m.id))

  const filteredStages = stages.filter(stage => filteredGoalIds.has(stage.goalId))
  const filteredSubtasks = subtasks.filter(subtask => filteredTaskIds.has(subtask.taskId))
  filteredMetricEntries = filteredMetricEntries.filter(entry => filteredMetricIds.has(entry.metricId))

  // Получение категорий для отфильтрованных элементов
  const filteredCategoryIds = new Set([
    ...filteredGoals.map(g => g.categoryId).filter(Boolean),
    ...filteredTasks.map(t => t.categoryId).filter(Boolean),
    ...filteredMetrics.map(m => m.categoryId).filter(Boolean)
  ])
  const filteredCategories = categories.filter(cat => filteredCategoryIds.has(cat.id))

  const jsonData = exportToJSON(
    user,
    filteredCategories,
    filteredGoals,
    filteredStages,
    filteredTasks,
    filteredSubtasks,
    filteredMetrics,
    filteredMetricEntries
  )
  
  const timestamp = new Date().toISOString().split('T')[0]
  const filename = `goaltracker_filtered_export_${user.login}_${timestamp}.json`
  
  downloadJSON(jsonData, filename)
}

// Функции импорта
export function parseImportData(jsonString: string): { data: ExportData | null; errors: string[] } {
  const errors: string[] = []
  
  try {
    const data = JSON.parse(jsonString)
    
    // Валидация структуры
    if (!data.user || !data.categories || !data.goals || !data.tasks || !data.metrics) {
      errors.push('Invalid file structure: missing required fields')
      return { data: null, errors }
    }
    
    // Валидация версии
    if (!data.version) {
      errors.push('Warning: No version information found')
    }
    
    return { data, errors }
  } catch (error) {
    errors.push(`Failed to parse JSON: ${error instanceof Error ? error.message : 'Unknown error'}`)
    return { data: null, errors }
  }
}

export function validateImportData(data: ExportData): { isValid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = []
  const warnings: string[] = []
  
  // Валидация данных пользователя
  if (!data.user.id || !data.user.email) {
    errors.push('Invalid user data: missing required fields')
  }
  
  // Валидация категорий
  data.categories.forEach((cat, index) => {
    if (!cat.id || !cat.name) {
      errors.push(`Invalid category at index ${index}: missing required fields`)
    }
  })
  
  // Валидация целей
  data.goals.forEach((goal, index) => {
    if (!goal.id || !goal.name) {
      errors.push(`Invalid goal at index ${index}: missing required fields`)
    }
    if (goal.categoryId && !data.categories.find(c => c.id === goal.categoryId)) {
      warnings.push(`Goal "${goal.name}" references non-existent category`)
    }
  })
  
  // Валидация задач
  data.tasks.forEach((task, index) => {
    if (!task.id || !task.name) {
      errors.push(`Invalid task at index ${index}: missing required fields`)
    }
    if (task.goalId && !data.goals.find(g => g.id === task.goalId)) {
      warnings.push(`Task "${task.name}" references non-existent goal`)
    }
  })
  
  // Валидация метрик
  data.metrics.forEach((metric, index) => {
    if (!metric.id || !metric.name || !metric.type) {
      errors.push(`Invalid metric at index ${index}: missing required fields`)
    }
    if (!data.categories.find(c => c.id === metric.categoryId)) {
      warnings.push(`Metric "${metric.name}" references non-existent category`)
    }
  })
  
  // Валидация записей метрик
  data.metricEntries.forEach((entry, index) => {
    if (!entry.id || !entry.metricId) {
      errors.push(`Invalid metric entry at index ${index}: missing required fields`)
    }
    if (!data.metrics.find(m => m.id === entry.metricId)) {
      warnings.push(`Metric entry references non-existent metric`)
    }
  })
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

export function prepareImportData(data: ExportData, currentUserId: string): ExportData {
  // Генерация новых ID для всех сущностей во избежание конфликтов
  const idMap = new Map<string, string>()
  const generateNewId = (oldId: string) => {
    if (idMap.has(oldId)) {
      return idMap.get(oldId)!
    }
    const newId = crypto.randomUUID()
    idMap.set(oldId, newId)
    return newId
  }
  
  // Обновление ID пользователя
  const updatedData = { ...data }
  updatedData.user = {
    ...data.user,
    id: currentUserId
  }
  
  // Обновление категорий
  updatedData.categories = data.categories.map(cat => ({
    ...cat,
    id: generateNewId(cat.id),
    userId: currentUserId
  }))
  
  // Обновление целей
  updatedData.goals = data.goals.map(goal => ({
    ...goal,
    id: generateNewId(goal.id),
    userId: currentUserId,
    categoryId: goal.categoryId ? generateNewId(goal.categoryId) : undefined
  }))
  
  // Обновление этапов
  updatedData.stages = data.stages.map(stage => ({
    ...stage,
    id: generateNewId(stage.id),
    userId: currentUserId,
    goalId: generateNewId(stage.goalId)
  }))
  
  // Обновление задач
  updatedData.tasks = data.tasks.map(task => ({
    ...task,
    id: generateNewId(task.id),
    userId: currentUserId,
    categoryId: task.categoryId ? generateNewId(task.categoryId) : undefined,
    goalId: task.goalId ? generateNewId(task.goalId) : undefined,
    stageId: task.stageId ? generateNewId(task.stageId) : undefined,
    parentTaskId: task.parentTaskId ? generateNewId(task.parentTaskId) : undefined
  }))
  
  // Обновление подзадач
  updatedData.subtasks = data.subtasks.map(subtask => ({
    ...subtask,
    id: generateNewId(subtask.id),
    userId: currentUserId,
    taskId: generateNewId(subtask.taskId)
  }))
  
  // Обновление метрик
  updatedData.metrics = data.metrics.map(metric => ({
    ...metric,
    id: generateNewId(metric.id),
    userId: currentUserId,
    categoryId: generateNewId(metric.categoryId),
    goalId: metric.goalId ? generateNewId(metric.goalId) : undefined
  }))
  
  // Обновление записей метрик
  updatedData.metricEntries = data.metricEntries.map(entry => ({
    ...entry,
    id: generateNewId(entry.id),
    metricId: generateNewId(entry.metricId)
  }))
  
  return updatedData
}
