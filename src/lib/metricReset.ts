import type { Metric, Periodicity } from '@/types'

export interface ResetSchedule {
  nextReset: Date
  resetPeriod: string
}

export function calculateNextReset(metric: Metric): Date | null {
  if (!metric.autoResetEnabled || !metric.resetPeriodicity) {
    return null
  }

  const now = new Date()
  const lastReset = metric.lastResetAt ? new Date(metric.lastResetAt) : new Date(0)

  switch (metric.resetPeriodicity) {
    case 'daily':
      return getNextDailyReset(now, lastReset)
    
    case 'weekly':
      return getNextWeeklyReset(now, lastReset, metric.resetWeekdays || [1, 2, 3, 4, 5])
    
    case 'monthly':
      return getNextMonthlyReset(now, lastReset, metric.resetDayOfMonth || 1)
    
    case 'yearly':
      return getNextYearlyReset(now, lastReset)
    
    case 'custom':
      return getNextCustomReset(now, lastReset, metric.resetCustomDays || 7)
    
    default:
      return null
  }
}

function getNextDailyReset(now: Date, lastReset: Date): Date {
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(0, 0, 0, 0)
  
  // If last reset was today, return tomorrow
  if (lastReset.toDateString() === now.toDateString()) {
    return tomorrow
  }
  
  // If last reset was before today, return today at midnight (already passed)
  const todayMidnight = new Date(now)
  todayMidnight.setHours(0, 0, 0, 0)
  return todayMidnight
}

function getNextWeeklyReset(now: Date, lastReset: Date, weekdays: number[]): Date {
  const currentDay = now.getDay() // 0 = Sunday, 1 = Monday, etc.
  const nextReset = new Date(now)
  
  // Convert to 1-7 (Monday-Sunday) format
  const normalizedWeekdays = weekdays.map(day => day === 0 ? 7 : day)
  const normalizedCurrentDay = currentDay === 0 ? 7 : currentDay
  
  // Find next reset day
  let daysUntilReset = 7
  for (const weekday of normalizedWeekdays) {
    const diff = (weekday - normalizedCurrentDay + 7) % 7
    if (diff < daysUntilReset && diff > 0) {
      daysUntilReset = diff
    }
  }
  
  // If today is a reset day and last reset was before today, reset today
  if (normalizedWeekdays.includes(normalizedCurrentDay)) {
    if (lastReset.toDateString() !== now.toDateString()) {
      daysUntilReset = 0
    }
  }
  
  nextReset.setDate(nextReset.getDate() + daysUntilReset)
  nextReset.setHours(0, 0, 0, 0)
  
  return nextReset
}

function getNextMonthlyReset(now: Date, lastReset: Date, dayOfMonth: number): Date {
  const nextReset = new Date(now.getFullYear(), now.getMonth(), dayOfMonth, 0, 0, 0)
  
  // If reset day for this month has passed
  if (nextReset < now) {
    nextReset.setMonth(nextReset.getMonth() + 1)
  }
  
  // Handle invalid dates (e.g., February 31st)
  while (nextReset.getMonth() !== (now.getMonth() + (nextReset < now ? 1 : 0)) % 12) {
    nextReset.setDate(nextReset.getDate() - 1)
  }
  
  return nextReset
}

function getNextYearlyReset(now: Date, lastReset: Date): Date {
  const nextReset = new Date(now.getFullYear(), 0, 1, 0, 0, 0) // January 1st
  
  if (nextReset < now) {
    nextReset.setFullYear(nextReset.getFullYear() + 1)
  }
  
  return nextReset
}

function getNextCustomReset(now: Date, lastReset: Date, customDays: number): Date {
  const daysSinceLastReset = Math.floor((now.getTime() - lastReset.getTime()) / (1000 * 60 * 60 * 24))
  
  if (daysSinceLastReset >= customDays) {
    // Reset today
    const today = new Date(now)
    today.setHours(0, 0, 0, 0)
    return today
  }
  
  // Calculate next reset
  const nextReset = new Date(lastReset)
  nextReset.setDate(nextReset.getDate() + customDays * Math.ceil((daysSinceLastReset + 1) / customDays))
  nextReset.setHours(0, 0, 0, 0)
  
  return nextReset
}

export function shouldResetMetric(metric: Metric): boolean {
  const nextReset = calculateNextReset(metric)
  if (!nextReset) return false
  
  const now = new Date()
  return now >= nextReset
}

export function getResetInfo(metric: Metric): ResetSchedule | null {
  const nextReset = calculateNextReset(metric)
  if (!nextReset) return null
  
  return {
    nextReset,
    resetPeriod: getResetPeriodLabel(metric.resetPeriodicity)
  }
}

function getResetPeriodLabel(periodicity?: string): string {
  const labels: Record<string, string> = {
    daily: 'Daily',
    weekly: 'Weekly',
    monthly: 'Monthly',
    yearly: 'Yearly',
    custom: 'Custom'
  }
  
  return labels[periodicity || ''] || 'Unknown'
}
