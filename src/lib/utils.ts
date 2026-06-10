import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, isPast, isToday, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns'
import { ru } from 'date-fns/locale'
import type { DeadlineType, GoalStatus, UserSettings, Metric, MetricEntry } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string | undefined): string {
  if (!date) return 'No date'
  
  const d = typeof date === 'string' ? new Date(date) : date
  
  // Check if date is valid
  if (isNaN(d.getTime())) {
    return 'Invalid date'
  }
  
  return format(d, 'dd.MM.yyyy', { locale: ru })
}

export function formatDateRelative(date: Date | string | undefined): string {
  if (!date) return 'No date'
  
  const d = typeof date === 'string' ? new Date(date) : date
  
  // Check if date is valid
  if (isNaN(d.getTime())) {
    return 'Invalid date'
  }
  
  if (isToday(d)) return 'Сегодня'
  return format(d, 'dd MMM', { locale: ru })
}

export function getDeadlineDate(deadlineType: DeadlineType, deadlineValue: string | Date | undefined, settings: UserSettings): Date | null {
  if (!deadlineValue) return null

  switch (deadlineType) {
    case 'specific_date':
      return typeof deadlineValue === 'string' ? new Date(deadlineValue) : deadlineValue
    
    case 'month_year': {
      const [year, month] = (deadlineValue as string).split('-').map(Number)
      const date = new Date(year, month - 1, 1)
      return settings.monthYearHandling === 'start' 
        ? startOfMonth(date) 
        : endOfMonth(date)
    }
    
    case 'year': {
      const year = Number(deadlineValue)
      const date = new Date(year, 0, 1)
      return settings.yearHandling === 'start'
        ? startOfYear(date)
        : endOfYear(date)
    }
    
    case 'none':
    default:
      return null
  }
}

export function calculateGoalStatus(deadline: Date | null, progress: number): GoalStatus {
  if (progress >= 100) return 'completed'
  if (deadline && isPast(deadline) && !isToday(deadline)) return 'overdue'
  return 'in_progress'
}

export function calculateProgress(current: number, target: number): number {
  if (target === 0) return 0
  return Math.min(Math.round((current / target) * 100), 100)
}

export function calculateWeightedProgress(tasks: Array<{ completed: boolean; weight: number }>): number {
  if (tasks.length === 0) return 0
  
  const totalWeight = tasks.reduce((sum, task) => sum + task.weight, 0)
  const completedWeight = tasks
    .filter(task => task.completed)
    .reduce((sum, task) => sum + task.weight, 0)
  
  return Math.min(Math.round((completedWeight / totalWeight) * 100), 100)
}

export function calculateTaskProgress(task: { completed: boolean; subtasks?: Array<{ isCompleted: boolean }> }): number {
  if (task.completed) return 100
  
  if (!task.subtasks || task.subtasks.length === 0) return 0
  
  const completedSubtasks = task.subtasks.filter(st => st.isCompleted).length
  return Math.round((completedSubtasks / task.subtasks.length) * 100)
}

export function getStatusLabel(status: GoalStatus): string {
  const labels: Record<GoalStatus, string> = {
    in_progress: 'В процессе',
    completed: 'Завершено',
    overdue: 'Просрочено',
    planned: 'Запланировано',
    frozen: 'Заморожено',
  }
  return labels[status]
}

export function getStatusColor(status: GoalStatus): string {
  const colors: Record<GoalStatus, string> = {
    in_progress: 'bg-blue-500',
    completed: 'bg-green-500',
    overdue: 'bg-red-500',
    planned: 'bg-gray-400',
    frozen: 'bg-yellow-500',
  }
  return colors[status]
}

export function getPriorityLabel(priority: number): string {
  if (priority >= 5) return 'Высокий'
  if (priority >= 3) return 'Средний'
  return 'Низкий'
}

export function getDeadlineTypeLabel(type: DeadlineType): string {
  const labels: Record<DeadlineType, string> = {
    none: 'Нет срока',
    month_year: 'Месяц-год',
    year: 'Год',
    specific_date: 'Конкретная дата',
  }
  return labels[type]
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

export function groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
  return array.reduce((result, item) => {
    const groupKey = String(item[key])
    result[groupKey] = result[groupKey] || []
    result[groupKey].push(item)
    return result
  }, {} as Record<string, T[]>)
}

export function sortByDate<T extends { createdAt: Date }>(items: T[], order: 'asc' | 'desc' = 'desc'): T[] {
  return [...items].sort((a, b) => {
    const diff = a.createdAt.getTime() - b.createdAt.getTime()
    return order === 'asc' ? diff : -diff
  })
}

export function calculateStreak(entries: { entryDate: Date | string; value: number }[]): number {
  if (entries.length === 0) return 0
  
  const sorted = [...entries].sort((a, b) => {
    const aTime = new Date(a.entryDate).getTime()
    const bTime = new Date(b.entryDate).getTime()
    return bTime - aTime
  })
  let streak = 0
  let currentDate = new Date()
  
  for (const entry of sorted) {
    const entryDate = new Date(entry.entryDate)
    const diffDays = Math.floor((currentDate.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diffDays <= 1 && entry.value > 0) {
      streak++
      currentDate = entryDate
    } else {
      break
    }
  }
  
  return streak
}

export function calculateMaxStreak(entries: { entryDate: Date | string; value: number }[]): { value: number; dates: string } {
  if (entries.length === 0) return { value: 0, dates: '' }
  
  const sorted = [...entries].sort((a, b) => {
    const aTime = new Date(a.entryDate).getTime()
    const bTime = new Date(b.entryDate).getTime()
    return aTime - bTime
  })
  let maxStreak = 0
  let currentStreak = 0
  let streakStart: Date | null = null
  let maxStreakStart: Date | null = null
  let maxStreakEnd: Date | null = null
  let prevDate: Date | null = null
  
  for (const entry of sorted) {
    if (entry.value > 0) {
      const entryDate = new Date(entry.entryDate)
      
      if (prevDate) {
        const diffDays = Math.floor((entryDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24))
        if (diffDays <= 1) {
          currentStreak++
        } else {
          if (currentStreak > maxStreak) {
            maxStreak = currentStreak
            maxStreakStart = streakStart
            maxStreakEnd = prevDate
          }
          currentStreak = 1
          streakStart = entryDate
        }
      } else {
        currentStreak = 1
        streakStart = entryDate
      }
      prevDate = entryDate
    }
  }
  
  if (currentStreak > maxStreak) {
    maxStreak = currentStreak
    maxStreakStart = streakStart
    maxStreakEnd = prevDate
  }
  
  const dates = maxStreakStart && maxStreakEnd
    ? `${formatDate(maxStreakStart)} - ${formatDate(maxStreakEnd)}`
    : ''
  
  return { value: maxStreak, dates }
}

export function getMetricTotalValue(entries: { value: number }[]): number {
  return entries.reduce((sum, entry) => sum + entry.value, 0)
}

export interface MetricProgressValues {
  totalValue: number
  periodValue: number
  progress: number
  periodEntries: MetricEntry[]
  isPeriodBased: boolean
}

function getPeriodStartEnd(metric: Metric): { start: Date; end: Date } | null {
  const periodicity = metric.resetPeriodicity
  if (!periodicity || periodicity === 'none') return null

  const now = new Date()

  if (periodicity === 'daily') {
    const start = new Date(now)
    start.setHours(0, 0, 0, 0)
    const end = new Date(start)
    end.setDate(end.getDate() + 1)
    return { start, end }
  }

  if (periodicity === 'weekly' || periodicity === 'weekdays') {
    const dayOfWeek = now.getDay()
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    const start = new Date(now)
    start.setDate(now.getDate() + diffToMonday)
    start.setHours(0, 0, 0, 0)
    const end = new Date(start)
    end.setDate(end.getDate() + 7)
    return { start, end }
  }

  if (periodicity === 'monthly') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    return { start, end }
  }

  if (periodicity === 'yearly') {
    const start = new Date(now.getFullYear(), 0, 1)
    const end = new Date(now.getFullYear() + 1, 0, 1)
    return { start, end }
  }

  if (periodicity === 'every_n_days' || periodicity === 'custom') {
    const nDays = metric.resetCustomDays || 7
    const refDate = new Date(now.getFullYear(), 0, 0)
    const dayOfYear = Math.floor((Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) - refDate.getTime()) / 86400000)
    const periodIndex = Math.floor(dayOfYear / nDays)
    const periodStartDay = periodIndex * nDays
    const start = new Date(now.getFullYear(), 0, periodStartDay + 1)
    const end = new Date(now.getFullYear(), 0, periodStartDay + 1 + nDays)
    return { start, end }
  }

  return null
}

export function calculateMetricProgress(
  metric: Pick<Metric, 'type' | 'targetValue' | 'startValue' | 'autoResetEnabled' | 'resetPeriodicity' | 'resetCustomDays' | 'resetWeekdays'>,
  allEntries: MetricEntry[]
): MetricProgressValues {
  const totalValue = allEntries.reduce((sum, e) => sum + e.value, 0) + (metric.startValue || 0)

  let isPeriodBased = false
  if (metric.type === 'simple_habit') {
    isPeriodBased = true
  } else if ((metric.type === 'habit' || metric.type === 'counter') && metric.resetPeriodicity && metric.resetPeriodicity !== 'none') {
    isPeriodBased = true
  }

  if (!isPeriodBased || !metric.targetValue) {
    const progress = metric.targetValue && metric.targetValue > 0
      ? Math.min(100, Math.max(0, Math.round((totalValue / metric.targetValue) * 100)))
      : 0
    return { totalValue, periodValue: totalValue, progress, periodEntries: allEntries, isPeriodBased: false }
  }

  if (metric.type === 'simple_habit') {
    const today = new Date().toISOString().split('T')[0]
    const doneToday = allEntries.some(e => {
      const d = e.entryDate instanceof Date ? e.entryDate : new Date(e.entryDate)
      return d.toISOString().split('T')[0] === today
    })
    return {
      totalValue,
      periodValue: doneToday ? 1 : 0,
      progress: doneToday ? 100 : 0,
      periodEntries: allEntries,
      isPeriodBased: true
    }
  }

  const period = getPeriodStartEnd(metric as Metric)
  if (!period) {
    const progress = metric.targetValue && metric.targetValue > 0
      ? Math.min(100, Math.max(0, Math.round((totalValue / metric.targetValue) * 100)))
      : 0
    return { totalValue, periodValue: totalValue, progress, periodEntries: allEntries, isPeriodBased: false }
  }

  const periodEntries = allEntries.filter(e => {
    const d = e.entryDate instanceof Date ? e.entryDate : new Date(e.entryDate)
    return d >= period.start && d < period.end
  })

  const periodValue = periodEntries.reduce((sum, e) => sum + e.value, 0)
  const progress = metric.targetValue && metric.targetValue > 0
    ? Math.min(100, Math.max(0, Math.round((periodValue / metric.targetValue) * 100)))
    : 0

  return { totalValue, periodValue, progress, periodEntries, isPeriodBased: true }
}

// Get entries filtered by current period based on periodicity
export function getEntriesForCurrentPeriod(
  entries: { entryDate: Date | string; value: number }[],
  periodicity?: string,
  nDays?: number,
  weekdays?: number[]
): { entryDate: Date | string; value: number }[] {
  if (!periodicity || periodicity === 'none') {
    return entries
  }

  const toUTCDateStr = (d: Date | string): string => {
    const date = d instanceof Date ? d : new Date(d)
    return date.toISOString().split('T')[0]
  }

  const toDateOnly = (str: string): Date => {
    return new Date(str + 'T00:00:00.000Z')
  }

  if (periodicity === 'daily') {
    const todayStr = new Date().toISOString().split('T')[0]
    return entries.filter(entry => toUTCDateStr(entry.entryDate) === todayStr)
  }

  if (periodicity === 'weekly') {
    const now = new Date()
    const dayOfWeek = now.getUTCDay()
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    const weekStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + diffToMonday))
    const weekEnd = new Date(weekStart)
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 7)

    return entries.filter(entry => {
      const d = entry.entryDate instanceof Date ? entry.entryDate : new Date(entry.entryDate)
      return d >= weekStart && d < weekEnd
    })
  }

  if (periodicity === 'monthly') {
    const now = new Date()
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))

    return entries.filter(entry => {
      const d = entry.entryDate instanceof Date ? entry.entryDate : new Date(entry.entryDate)
      return d >= monthStart && d < monthEnd
    })
  }

  if (periodicity === 'yearly') {
    const now = new Date()
    const yearStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1))
    const yearEnd = new Date(Date.UTC(now.getUTCFullYear() + 1, 0, 1))

    return entries.filter(entry => {
      const d = entry.entryDate instanceof Date ? entry.entryDate : new Date(entry.entryDate)
      return d >= yearStart && d < yearEnd
    })
  }

  if (periodicity === 'every_n_days' && nDays) {
    const now = new Date()
    const refDate = new Date(Date.UTC(now.getUTCFullYear(), 0, 0))
    const dayOfYear = Math.floor((Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - refDate.getTime()) / 86400000)
    const periodIndex = Math.floor(dayOfYear / nDays)
    const periodStartDay = periodIndex * nDays
    const periodStart = new Date(Date.UTC(now.getUTCFullYear(), 0, periodStartDay + 1))
    const periodEnd = new Date(Date.UTC(now.getUTCFullYear(), 0, periodStartDay + 1 + nDays))

    return entries.filter(entry => {
      const d = entry.entryDate instanceof Date ? entry.entryDate : new Date(entry.entryDate)
      return d >= periodStart && d < periodEnd
    })
  }

  if (periodicity === 'weekdays') {
    const now = new Date()
    const currentDayOfWeek = now.getUTCDay()
    const diffToMonday = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek
    const weekStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + diffToMonday))
    const weekEnd = new Date(weekStart)
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 7)

    return entries.filter(entry => {
      const d = entry.entryDate instanceof Date ? entry.entryDate : new Date(entry.entryDate)
      if (!(d >= weekStart && d < weekEnd)) return false
      if (weekdays && weekdays.length > 0) {
        const entryDayOfWeek = d.getUTCDay()
        const normalizedDay = entryDayOfWeek === 0 ? 7 : entryDayOfWeek
        return weekdays.includes(normalizedDay)
      }
      return true
    })
  }

  return entries
}

export function getMetricRecordDay(entries: { entryDate: Date | string; value: number }[]): { date: Date | null; value: number } {
  if (entries.length === 0) return { date: null, value: 0 }
  
  const maxEntry = entries.reduce((max, entry) => entry.value > max.value ? entry : max)
  return { 
    date: maxEntry.entryDate instanceof Date ? maxEntry.entryDate : new Date(maxEntry.entryDate), 
    value: maxEntry.value 
  }
}

export const predefinedUnits = [
  { name: 'Минуты', symbol: 'мин', category: 'time', isDefault: true },
  { name: 'Часы', symbol: 'ч', category: 'time', isDefault: true },
  { name: 'Дни', symbol: 'дн', category: 'time', isDefault: true },
  { name: 'Раз', symbol: 'x', category: 'count', isDefault: true },
  { name: 'Штуки', symbol: 'шт', category: 'count', isDefault: true },
  { name: 'Страницы', symbol: 'стр', category: 'count', isDefault: true },
  { name: 'Километры', symbol: 'км', category: 'distance', isDefault: true },
  { name: 'Метры', symbol: 'м', category: 'distance', isDefault: true },
  { name: 'Килограммы', symbol: 'кг', category: 'weight', isDefault: true },
  { name: 'Граммы', symbol: 'г', category: 'weight', isDefault: true },
  { name: 'Литры', symbol: 'л', category: 'volume', isDefault: true },
  { name: 'Миллилитры', symbol: 'мл', category: 'volume', isDefault: true },
  { name: 'Калории', symbol: 'ккал', category: 'nutrition', isDefault: true },
  { name: 'Шаги', symbol: 'шаг', category: 'activity', isDefault: true },
  { name: 'Проценты', symbol: '%', category: 'general', isDefault: true },
]
