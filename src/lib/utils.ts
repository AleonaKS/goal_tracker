import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, isPast, isToday, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns'
import { ru } from 'date-fns/locale'
import type { DeadlineType, GoalStatus, UserSettings } from '@/types'

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

export function calculateStreak(entries: { timestamp: Date | string; value: number }[]): number {
  if (entries.length === 0) return 0
  
  const sorted = [...entries].sort((a, b) => {
    const aTime = new Date(a.timestamp).getTime()
    const bTime = new Date(b.timestamp).getTime()
    return bTime - aTime
  })
  let streak = 0
  let currentDate = new Date()
  
  for (const entry of sorted) {
    const entryDate = new Date(entry.timestamp)
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

export function calculateMaxStreak(entries: { timestamp: Date | string; value: number }[]): { value: number; dates: string } {
  if (entries.length === 0) return { value: 0, dates: '' }
  
  const sorted = [...entries].sort((a, b) => {
    const aTime = new Date(a.timestamp).getTime()
    const bTime = new Date(b.timestamp).getTime()
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
      const entryDate = new Date(entry.timestamp)
      
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

export function getMetricRecordDay(entries: { timestamp: Date | string; value: number }[]): { date: Date | null; value: number } {
  if (entries.length === 0) return { date: null, value: 0 }
  
  const maxEntry = entries.reduce((max, entry) => entry.value > max.value ? entry : max)
  return { 
    date: maxEntry.timestamp instanceof Date ? maxEntry.timestamp : new Date(maxEntry.timestamp), 
    value: maxEntry.value 
  }
}

export const predefinedUnits = [
  { value: 'шт', label: 'Штуки' },
  { value: 'стр', label: 'Страницы' },
  { value: 'min', label: 'Минуты' },
  { value: 'ч', label: 'Часы' },
  { value: 'км', label: 'Километры' },
  { value: 'м', label: 'Метры' },
  { value: 'кг', label: 'Килограммы' },
  { value: 'г', label: 'Граммы' },
  { value: 'л', label: 'Литры' },
  { value: 'стак', label: 'Стаканы' },
  { value: 'раз', label: 'Раз' },
  { value: '₽', label: 'Рубли' },
  { value: '$', label: 'Доллары' },
  { value: '€', label: 'Евро' },
  { value: 'кал', label: 'Калории' },
]
