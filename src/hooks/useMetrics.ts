import { useMemo } from 'react'
import { useApiDataStore } from '@/stores/apiDataStore'
import { calculateProgress, calculateStreak, calculateMaxStreak, getMetricTotalValue, getMetricRecordDay } from '@/lib/utils'
import type { Metric, MetricEntry, Periodicity } from '@/types'

export interface MetricWithStats extends Metric {
  totalValue: number
  progress: number
  currentStreak: number
  maxStreak: number
  maxStreakDates: string
  recordDay: { date: Date | null; value: number }
  entries: MetricEntry[]
  lastEntry: MetricEntry | null
}

export function useMetrics() {
  const { metrics, metricEntries } = useApiDataStore()

  const metricsWithStats = useMemo(() => {
    return metrics.map((metric): MetricWithStats => {
      const entries = metricEntries.filter(e => e.metricId === metric.id)
      const totalValue = getMetricTotalValue(entries)
      const progress = calculateProgress(totalValue, metric.targetValue)
      
      const streakEntries = entries.map(e => ({ 
        timestamp: e.entryDate instanceof Date ? e.entryDate : new Date(e.entryDate), 
        value: e.value 
      }))
      const currentStreak = calculateStreak(streakEntries)
      const maxStreakData = calculateMaxStreak(streakEntries)
      const recordDay = getMetricRecordDay(entries)
      
      const sortedEntries = [...entries].sort((a, b) => {
        const aTime = a.entryDate instanceof Date ? a.entryDate.getTime() : new Date(a.entryDate).getTime()
        const bTime = b.entryDate instanceof Date ? b.entryDate.getTime() : new Date(b.entryDate).getTime()
        return bTime - aTime
      })
      const lastEntry = sortedEntries[0] || null

      return {
        ...metric,
        totalValue,
        progress,
        currentStreak,
        maxStreak: maxStreakData.value,
        maxStreakDates: maxStreakData.dates,
        recordDay,
        entries,
        lastEntry,
      }
    })
  }, [metrics, metricEntries])

  const stats = useMemo(() => {
    const habits = metricsWithStats.filter(m => m.type === 'habit')
    const counters = metricsWithStats.filter(m => m.type === 'counter')
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const completedToday = metricsWithStats.filter(m => {
      const lastEntry = m.lastEntry
      if (!lastEntry) return false
      const entryDate = new Date(lastEntry.timestamp)
      entryDate.setHours(0, 0, 0, 0)
      return entryDate.getTime() === today.getTime()
    }).length

    return {
      total: metricsWithStats.length,
      activeHabits: habits.length,
      activeCounters: counters.length,
      completedToday,
    }
  }, [metricsWithStats])

  return {
    metrics: metricsWithStats,
    stats,
  }
}

export function useMetric(metricId: string) {
  const { metrics, metricEntries } = useApiDataStore()

  return useMemo(() => {
    const metric = metrics.find(m => m.id === metricId)
    if (!metric) return null

    const entries = metricEntries.filter(e => e.metricId === metricId)
    const totalValue = getMetricTotalValue(entries)
    const progress = calculateProgress(totalValue, metric.targetValue)
    
    const streakEntries = entries.map(e => ({ timestamp: e.timestamp, value: e.value }))
    const currentStreak = calculateStreak(streakEntries)
    const maxStreakData = calculateMaxStreak(streakEntries)
    const recordDay = getMetricRecordDay(entries)

    return {
      metric,
      entries,
      totalValue,
      progress,
      currentStreak,
      maxStreak: maxStreakData.value,
      maxStreakDates: maxStreakData.dates,
      recordDay,
    }
  }, [metrics, metricEntries, metricId])
}

export function getPeriodicityLabel(periodicity: Periodicity, nDays?: number, weekdays?: number[]): string {
  const labels: Record<Periodicity, string> = {
    daily: 'Ежедневно',
    weekly: 'Еженедельно',
    monthly: 'Ежемесячно',
    yearly: 'Ежегодно',
    every_n_days: `Каждые ${nDays} дней`,
    weekdays: weekdays ? `По дням недели (${weekdays.map(d => ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'][d]).join(', ')})` : 'По дням недели',
  }
  return labels[periodicity]
}

export function getInputModeLabel(mode: 'fixed_step' | 'manual', stepValue?: number): string {
  if (mode === 'fixed_step' && stepValue) {
    return `Шаг: ${stepValue}`
  }
  return 'Ручной ввод'
}
