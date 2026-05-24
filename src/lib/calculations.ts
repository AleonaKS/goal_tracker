import type { Goal, Task, Metric, MetricEntry } from '@/types'

/**
 * Calculate goal status based on goal object
 */
export function calculateGoalStatusFromGoal(goal: Goal): Goal['status'] {
  // If frozen, keep frozen
  if (goal.isFrozen) return 'frozen'

  // If completed (by flag or by 100% progress), mark as completed
  if (goal.completedAt || goal.status === 'completed' || goal.progress === 100) return 'completed'

  const today = new Date()
  const startDate = new Date(goal.startDate)

  // Check if planned (future start)
  if (startDate > today) return 'planned'

  // Check deadline
  if (goal.deadlineValue) {
    const deadline = new Date(goal.deadlineValue)
    // Reset time to compare dates only
    deadline.setHours(23, 59, 59, 999)
    today.setHours(0, 0, 0, 0)

    if (deadline < today) return 'overdue'
  }

  return 'in_progress'
}

/**
 * Calculate task contribution to goal progress
 */
export function calculateTaskContribution(tasks: Task[]): Map<string, number> {
  const totalWeight = tasks.reduce((sum, t) => sum + (t.weight || 1), 0)
  const contributions = new Map<string, number>()

  for (const task of tasks) {
    const weight = task.weight || 1
    const percent = totalWeight > 0 ? (weight / totalWeight) * 100 : 0
    contributions.set(task.id, Number(percent.toFixed(2)))
  }

  return contributions
}

/**
 * Calculate goal progress by weighted tasks
 */
export function calculateGoalProgressByTasks(tasks: Task[]): number {
  if (tasks.length === 0) return 0

  const totalWeight = tasks.reduce((sum, t) => sum + (t.weight || 1), 0)
  const completedWeight = tasks
    .filter(t => t.completed)
    .reduce((sum, t) => sum + (t.weight || 1), 0)

  return totalWeight > 0 ? Math.round((completedWeight / totalWeight) * 100) : 0
}

/**
 * Calculate goal progress by metric
 */
export function calculateGoalProgressByMetric(
  metric: Metric,
  entries: MetricEntry[]
): number {
  const totalValue = entries.reduce(
    (sum, e) => sum + (e.isAddition ? e.value : -e.value),
    metric.startValue
  )

  if (metric.targetValue <= 0) return 0
  return Math.min(100, Math.round((totalValue / metric.targetValue) * 100))
}

/**
 * Calculate current streak for a metric
 */
export function calculateCurrentStreak(
  entries: MetricEntry[],
  periodicity: Metric['periodicity']
): number {
  if (entries.length === 0) return 0

  // Sort entries by date descending
  const sortedEntries = [...entries].sort(
    (a, b) => new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime()
  )

  let streak = 0
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Check if there's an entry today or yesterday (depending on periodicity)
  const lastEntry = sortedEntries[0]
  const lastEntryDate = new Date(lastEntry.entryDate)
  lastEntryDate.setHours(0, 0, 0, 0)

  if (periodicity === 'daily') {
    // Check if last entry was today or yesterday
    const diffDays = Math.floor(
      (today.getTime() - lastEntryDate.getTime()) / (1000 * 60 * 60 * 24)
    )
    if (diffDays > 1) return 0 // Streak broken
  }

  // Count consecutive entries
  let currentDate = lastEntryDate
  streak = 1

  for (let i = 1; i < sortedEntries.length; i++) {
    const entryDate = new Date(sortedEntries[i].entryDate)
    entryDate.setHours(0, 0, 0, 0)

    const diffDays = Math.floor(
      (currentDate.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24)
    )

    if (diffDays === 1) {
      streak++
      currentDate = entryDate
    } else if (diffDays === 0) {
      // Same day, skip
      continue
    } else {
      break
    }
  }

  return streak
}

/**
 * Calculate max streak for a metric
 */
export function calculateMaxStreak(entries: MetricEntry[]): number {
  if (entries.length === 0) return 0

  // Sort entries by date ascending
  const sortedEntries = [...entries].sort(
    (a, b) => new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime()
  )

  let maxStreak = 1
  let currentStreak = 1

  for (let i = 1; i < sortedEntries.length; i++) {
    const prevDate = new Date(sortedEntries[i - 1].entryDate)
    prevDate.setHours(0, 0, 0, 0)
    const currDate = new Date(sortedEntries[i].entryDate)
    currDate.setHours(0, 0, 0, 0)

    const diffDays = Math.floor(
      (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)
    )

    if (diffDays === 1) {
      currentStreak++
      maxStreak = Math.max(maxStreak, currentStreak)
    } else if (diffDays > 1) {
      currentStreak = 1
    }
  }

  return maxStreak
}

/**
 * Find record day (date with maximum value)
 */
export function findRecordDay(
  entries: MetricEntry[]
): { date: Date; value: number } | null {
  if (entries.length === 0) return null

  let record = entries[0]
  for (const entry of entries) {
    if (entry.value > record.value) {
      record = entry
    }
  }

  return { date: record.entryDate, value: record.value }
}

/**
 * Get entries for a specific period
 */
export function getEntriesForPeriod(
  entries: MetricEntry[],
  startDate: Date,
  endDate: Date
): MetricEntry[] {
  return entries.filter((e) => {
    const date = new Date(e.entryDate)
    return date >= startDate && date <= endDate
  })
}

/**
 * Calculate heatmap data for calendar
 */
export function calculateHeatmapData(
  entries: MetricEntry[],
  year: number,
  month?: number // undefined = full year
): Map<string, number> {
  const heatmap = new Map<string, number>()

  const filteredEntries = entries.filter((e) => {
    const date = new Date(e.entryDate)
    if (month !== undefined) {
      return date.getFullYear() === year && date.getMonth() === month
    }
    return date.getFullYear() === year
  })

  // Group by date
  const byDate = new Map<string, number>()
  for (const entry of filteredEntries) {
    const dateKey = entry.entryDate.toISOString().split('T')[0]
    const current = byDate.get(dateKey) || 0
    byDate.set(dateKey, current + entry.value)
  }

  // Normalize values 0-4 for heat levels
  const maxValue = Math.max(...byDate.values(), 1)
  for (const [date, value] of byDate) {
    const level = Math.min(4, Math.floor((value / maxValue) * 4))
    heatmap.set(date, level)
  }

  return heatmap
}

export function shouldResetMetric(metric: Metric): boolean {
  if (!metric.autoResetEnabled || !metric.lastResetAt) return false

  const now = new Date()
  const lastReset = new Date(metric.lastResetAt)

  switch (metric.resetPeriodicity) {
    case 'daily':
      return lastReset.toDateString() !== now.toDateString()

    case 'weekly':
      if (!metric.resetWeekdays) return false
      const currentDay = now.getDay()
      return (
        metric.resetWeekdays.includes(currentDay) &&
        lastReset.toDateString() !== now.toDateString()
      )

    case 'monthly':
      const resetDay = metric.resetDayOfMonth || 1
      return now.getDate() === resetDay && lastReset.getMonth() !== now.getMonth()

    case 'yearly':
      return now.getDate() === 1 && now.getMonth() === 0 && lastReset.getFullYear() !== now.getFullYear()

    case 'custom':
      if (!metric.resetCustomDays) return false
      const daysSinceReset = Math.floor(
        (now.getTime() - lastReset.getTime()) / (1000 * 60 * 60 * 24)
      )
      return daysSinceReset >= metric.resetCustomDays

    default:
      return false
  }
}


export function calculateExpectedCompletionDate(
  goal: Goal,
  entries: MetricEntry[],
  metric?: Metric
): Date | null {
  if (!goal.startDate || goal.progress === 0) return null
  
  const now = new Date()
  const startDate = new Date(goal.startDate)
  
  // If goal uses metric for progress calculation
  if (goal.progressCalculation === 'by_metric' && metric && entries.length > 0) {
    return calculateExpectedCompletionDateByMetric(goal, metric, entries)
  }
  
  // Default calculation by progress rate
  const daysElapsed = Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
  
  if (daysElapsed === 0) return null
  
  // Calculate progress rate (progress per day)
  const progressRate = goal.progress / daysElapsed
  
  if (progressRate === 0) return null
  
  // Calculate remaining progress
  const remainingProgress = 100 - goal.progress
  
  // Calculate estimated days to completion
  const estimatedDaysToCompletion = Math.ceil(remainingProgress / progressRate)
  
  // Calculate expected completion date
  const expectedDate = new Date(now.getTime() + (estimatedDaysToCompletion * 24 * 60 * 60 * 1000))
  
  return expectedDate
}

/**
 * Calculate expected completion date based on metric pace (weighted average)
 */
function calculateExpectedCompletionDateByMetric(
  goal: Goal,
  metric: Metric,
  entries: MetricEntry[]
): Date | null {
  if (entries.length < 2) return null
  
  const now = new Date()
  const sortedEntries = [...entries].sort((a, b) => 
    new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime()
  )
  
  // Calculate current value
  const currentValue = sortedEntries.reduce(
    (sum, e) => sum + (e.isAddition ? e.value : -e.value),
    metric.startValue
  )
  
  // Calculate remaining value needed
  const remainingValue = metric.targetValue - currentValue
  if (remainingValue <= 0) return null // Already achieved
  
  // Calculate weighted average pace (more recent entries have more weight)
  let weightedSum = 0
  let totalWeight = 0
  
  for (let i = 1; i < sortedEntries.length; i++) {
    const prevEntry = sortedEntries[i - 1]
    const currEntry = sortedEntries[i]
    
    const daysDiff = Math.ceil(
      (new Date(currEntry.entryDate).getTime() - new Date(prevEntry.entryDate).getTime()) / 
      (1000 * 60 * 60 * 24)
    )
    
    if (daysDiff > 0) {
      const valueDiff = Math.abs(currEntry.value - prevEntry.value)
      const pace = valueDiff / daysDiff
      
      // Weight: more recent entries have higher weight
      const weight = i / sortedEntries.length
      weightedSum += pace * weight
      totalWeight += weight
    }
  }
  
  if (totalWeight === 0) return null
  
  const averagePace = weightedSum / totalWeight
  if (averagePace === 0) return null
  
  // Calculate estimated days to completion
  const estimatedDaysToCompletion = Math.ceil(remainingValue / averagePace)
  
  // Calculate expected completion date
  const expectedDate = new Date(now.getTime() + (estimatedDaysToCompletion * 24 * 60 * 60 * 1000))
  
  return expectedDate
}

/**
 * Generate heatmap data for metric entries
 */
export function generateHeatmapData(
  entries: MetricEntry[],
  days: number = 90
): { date: string; value: number }[] {
  const result: { date: string; value: number }[] = []
  const now = new Date()
  
  for (let i = 0; i < days; i++) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)
    date.setHours(0, 0, 0, 0)
    
    const nextDate = new Date(date)
    nextDate.setDate(nextDate.getDate() + 1)
    
    const dayEntries = entries.filter(e => {
      const entryDate = new Date(e.entryDate)
      return entryDate >= date && entryDate < nextDate
    })
    
    result.unshift({
      date: date.toISOString().split('T')[0],
      value: dayEntries.reduce((sum, e) => sum + e.value, 0)
    })
  }
  
  return result
}
