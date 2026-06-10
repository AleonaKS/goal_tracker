import { useState, useMemo, useEffect, useRef } from 'react'
import {
  Plus, Minus, FileText, Edit3, History, ChevronLeft, ChevronRight,
  HelpCircle, ArrowUpRight, ArrowDownRight, Trash2, MoreVertical,
  CheckCircle2, X, TrendingUp, BarChart4
} from 'lucide-react'
import { Modal, ConfirmModal } from './Modal'
import { ActivityHeatmap } from './ActivityHeatmap'
import { QuickEntryForm } from './forms/QuickEntryForm'
import { MetricForm } from './forms/MetricForm'
import { useApiDataStore } from '@/stores/apiDataStore'
import useGamificationActions from '@/hooks/useGamificationActions'
import { cn, formatDate } from '@/lib/utils'

function toLocalDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
import { getMetricEntries } from '@/lib/api'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import type { Metric, MetricEntry } from '@/types'

type PeriodType = 'week' | 'month' | 'year'
type ViewType = 'chart' | 'calendar' | 'history'
type ChartType = 'bar' | 'line' | 'cumulative'

interface MetricAnalyticsModalProps {
  isOpen: boolean
  onClose: () => void
  metric: Metric
  onEdit?: (metric: Metric) => void
  onDelete?: (metricId: string) => void
}

// Вспомогательная функция для форматирования числа с пробелами
const formatNumber = (num: number): string => {
  return Math.round(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

// Вспомогательная функция для получения названия дня недели
const getWeekDayName = (index: number): string => {
  const days = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
  return days[index]
}

// Вспомогательная функция для получения названия месяца (родительный падеж)
const getMonthNameGenitive = (monthIndex: number): string => {
  const months = ['янв.', 'февр.', 'марта', 'апр.', 'мая', 'июня', 'июля', 'авг.', 'сен.', 'окт.', 'нояб.', 'дек.']
  return months[monthIndex]
}

// Вспомогательная функция для получения названия месяца (именительный падеж)
const getMonthNameNominative = (monthIndex: number): string => {
  const months = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря']
  return months[monthIndex]
}

// Вспомогательная функция для форматирования даты (ДД.ММ.ГГГГ)
const formatDateShort = (date: Date): string => {
  return `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.${date.getFullYear()}`
}

export function MetricAnalyticsModal({ isOpen, onClose, metric, onEdit, onDelete }: MetricAnalyticsModalProps) {
  const { metricEntries, fetchMetricEntries, deleteMetric, deleteMetricEntry, categories } = useApiDataStore()
  const { createMetricEntry } = useGamificationActions()
  const entries = useMemo(
    () => metricEntries.filter(e => e.metricId === metric.id),
    [metricEntries, metric.id]
  )
  const category = metric?.categoryId ? categories.find(c => c.id === metric.categoryId) : null
  
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('week')

  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  const [viewType, setViewType] = useState<ViewType>('chart')
  const [chartType, setChartType] = useState<ChartType>('bar')
  const [showMenu, setShowMenu] = useState(false)
  const [showEntryModal, setShowEntryModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [entryMode, setEntryMode] = useState<'add' | 'subtract'>('add')
  const [optimisticMetric, setOptimisticMetric] = useState<Metric | null>(null)
  const [deleteEntryId, setDeleteEntryId] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return
    // Проверяем, есть ли уже записи для этой метрики в store
    const hasEntriesForMetric = metricEntries.some(e => e.metricId === metric.id)
    if (!hasEntriesForMetric) {
      fetchMetricEntries(metric.id).catch(error => {
        console.error('Failed to load metric entries for analytics modal:', error)
      })
    }
    // Сбрасываем оптимистичное состояние при закрытии
    setOptimisticMetric(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, metric.id])
  // Расчёт всей статистики
  const stats = useMemo(() => {
    // Используем оптимистичное значение если есть, иначе считаем из entries
    const totalValue = optimisticMetric?.totalValue !== undefined
      ? optimisticMetric.totalValue
      : entries.filter(e => !e.id.startsWith('temp-')).reduce((sum, e) => sum + e.value, 0)

    // Для привычек с периодичностью рассчитывать значение за текущий период
    const hasPeriodicity = (metric.type === 'habit' || metric.type === 'simple_habit') && metric.resetPeriodicity && metric.resetPeriodicity !== 'none'
    let periodValue = totalValue

    if (hasPeriodicity) {
      const now = new Date()
      const dailyTotals = new Map<string, number>()
      entries.forEach(e => {
        const dateStr = toLocalDateStr(new Date(e.entryDate))
        dailyTotals.set(dateStr, (dailyTotals.get(dateStr) || 0) + e.value)
      })

      // Расчёт границ периода на основе resetPeriodicity
      let periodStart = new Date()
      let periodEnd = new Date()

      if (metric.resetPeriodicity === 'daily') {
        periodStart = new Date(now)
        periodStart.setHours(0, 0, 0, 0)
        periodEnd = new Date(now)
        periodEnd.setHours(23, 59, 59, 999)
      } else if (metric.resetPeriodicity === 'weekly') {
        const dayOfWeek = now.getDay() || 7
        periodStart = new Date(now)
        periodStart.setDate(now.getDate() - dayOfWeek + 1)
        periodStart.setHours(0, 0, 0, 0)
        periodEnd = new Date(periodStart)
        periodEnd.setDate(periodStart.getDate() + 6)
        periodEnd.setHours(23, 59, 59, 999)
      } else if (metric.resetPeriodicity === 'monthly') {
        periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
        periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
      } else if (metric.resetPeriodicity === 'yearly') {
        periodStart = new Date(now.getFullYear(), 0, 1)
        periodEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999)
      } else if (metric.resetPeriodicity === 'every_n_days' && metric.resetCustomDays) {
        const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24))
        const periodIndex = Math.floor(dayOfYear / metric.resetCustomDays)
        periodStart = new Date(now.getFullYear(), 0, periodIndex * metric.resetCustomDays + 1)
        periodStart.setHours(0, 0, 0, 0)
        periodEnd = new Date(periodStart)
        periodEnd.setDate(periodStart.getDate() + metric.resetCustomDays - 1)
        periodEnd.setHours(23, 59, 59, 999)
      } else if (metric.resetPeriodicity === 'weekdays') {
        const dayOfWeek = now.getDay() || 7
        periodStart = new Date(now)
        periodStart.setDate(now.getDate() - dayOfWeek + 1)
        periodStart.setHours(0, 0, 0, 0)
        periodEnd = new Date(periodStart)
        periodEnd.setDate(periodStart.getDate() + 6)
        periodEnd.setHours(23, 59, 59, 999)
      }

      // Суммирование значений только в пределах периода
      periodValue = 0
      dailyTotals.forEach((value, dateStr) => {
        const entryDate = new Date(dateStr)
        if (entryDate >= periodStart && entryDate <= periodEnd) {
          periodValue += value
        }
      })
    }

    // Ежедневные итоги для расчёта рекордов
    const dailyTotals = new Map<string, number>()
    entries.forEach(e => {
      if (!e.entryDate) return
      const entryDate = new Date(e.entryDate)
      if (isNaN(entryDate.getTime())) return
      const dateStr = toLocalDateStr(entryDate)
      dailyTotals.set(dateStr, (dailyTotals.get(dateStr) || 0) + e.value)
    })
    
    // Поиск максимального дневного значения и количества дней-рекордов
    let maxDayValue = 0
    let recordDays = 0
    dailyTotals.forEach((value) => {
      if (value > maxDayValue) {
        maxDayValue = value
        recordDays = 1
      } else if (value === maxDayValue && value > 0) {
        recordDays++
      }
    })

    // Расчёт среднего интервала
    const sortedDates = [...entries]
      .filter(e => e.entryDate)
      .map(e => new Date(e.entryDate))
      .filter(date => !isNaN(date.getTime()))
      .sort((a, b) => a.getTime() - b.getTime())
    
    let totalInterval = 0
    let intervalCount = 0
    for (let i = 1; i < sortedDates.length; i++) {
      const diff = (sortedDates[i].getTime() - sortedDates[i - 1].getTime()) / (1000 * 60 * 60)
      if (diff > 0) {
        totalInterval += diff
        intervalCount++
      }
    }
    const avgInterval = intervalCount > 0 ? Math.round(totalInterval / intervalCount) : 0

    // Расчёт серии
    const uniqueDates = Array.from(dailyTotals.keys()).sort()
    let currentStreak = 0
    let maxStreak = 0
    let tempStreak = 0
    let lastDate: Date | null = null

    const today = toLocalDateStr(new Date())
    const yesterday = toLocalDateStr(new Date(Date.now() - 86400000))
    
    for (let i = 0; i < uniqueDates.length; i++) {
      const dateStr = uniqueDates[i]
      if (lastDate) {
        const diffDays = Math.floor((new Date(dateStr).getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))
        if (diffDays <= 1) {
          tempStreak++
        } else {
          maxStreak = Math.max(maxStreak, tempStreak)
          tempStreak = 1
        }
      } else {
        tempStreak = 1
      }
      lastDate = new Date(dateStr)
    }
    maxStreak = Math.max(maxStreak, tempStreak)
    
    // Проверка, является ли серия текущей (последняя запись сегодня или вчера)
    if (uniqueDates.length > 0) {
      const lastEntryDate = uniqueDates[uniqueDates.length - 1]
      if (lastEntryDate === today || lastEntryDate === yesterday) {
        currentStreak = tempStreak
      } else {
        currentStreak = 0
      }
    }

    return {
      totalValue,
      periodValue,
      recordDays,
      maxDayValue,
      avgInterval,
      currentStreak,
      maxStreak,
      totalEntries: entries.length
    }
  }, [entries, metric])

  // Расчёт прогресса
  const progress = useMemo(() => {
    const hasPeriodicity = (metric.type === 'habit' || metric.type === 'simple_habit') && metric.resetPeriodicity && metric.resetPeriodicity !== 'none'
    const sourceValue = hasPeriodicity ? stats.periodValue : stats.totalValue
    const current = sourceValue + (metric.startValue || 0)
    const target = metric.targetValue || 100
    const percent = Math.round(Math.min((current / target) * 100, 100))
    const remaining = Math.max(0, target - current)

    // Расчёт ожидаемого прогресса на основе периодичности сброса
    const now = new Date()
    let daysInPeriod = 7 // default weekly
    let daysElapsed = now.getDay() || 7

    const periodType = metric.resetPeriodicity

    if (periodType === 'monthly') {
      daysInPeriod = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
      daysElapsed = now.getDate()
    } else if (periodType === 'yearly') {
      daysInPeriod = 365
      const startOfYear = new Date(now.getFullYear(), 0, 1)
      daysElapsed = Math.floor((now.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24))
    } else if (periodType === 'daily') {
      daysInPeriod = 1
      daysElapsed = 1
    } else if (periodType === 'weekdays') {
      const dayOfWeek = now.getDay() || 7
      daysElapsed = dayOfWeek
      daysInPeriod = 7
    } else if (periodType === 'every_n_days' && metric.resetCustomDays) {
      daysInPeriod = metric.resetCustomDays
      const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24))
      daysElapsed = (dayOfYear % metric.resetCustomDays) + 1
    }

    const expectedProgress = Math.round((daysElapsed / daysInPeriod) * 100)
    const aheadBy = Math.max(0, percent - expectedProgress)
    const daysRemaining = Math.max(0, daysInPeriod - daysElapsed)

    // Расчёт дат начала и окончания периода
    let startDate = new Date()
    let endDate = new Date()

    if (periodType === 'daily') {
      startDate = new Date(now)
      startDate.setHours(0, 0, 0, 0)
      endDate = new Date(now)
      endDate.setHours(23, 59, 59, 999)
    } else if (periodType === 'monthly') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    } else if (periodType === 'yearly') {
      startDate = new Date(now.getFullYear(), 0, 1)
      endDate = new Date(now.getFullYear(), 11, 31)
    } else if (periodType === 'every_n_days' && metric.resetCustomDays) {
      const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24))
      const periodIndex = Math.floor(dayOfYear / metric.resetCustomDays)
      startDate = new Date(now.getFullYear(), 0, periodIndex * metric.resetCustomDays + 1)
      endDate = new Date(startDate)
      endDate.setDate(startDate.getDate() + metric.resetCustomDays - 1)
    } else {
      // Weekly / weekdays (default) — Monday to Sunday
      const dayOfWeek = now.getDay() || 7
      startDate = new Date(now)
      startDate.setDate(now.getDate() - dayOfWeek + 1)
      endDate = new Date(startDate)
      endDate.setDate(startDate.getDate() + 6)
    }
    
    return { 
      current, 
      target, 
      percent, 
      remaining, 
      expectedProgress, 
      aheadBy, 
      daysRemaining,
      daysInPeriod,
      daysElapsed,
      startDate,
      endDate
    }
  }, [stats, metric])

  // Получение диапазона дат для графика
  const getDateRange = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    
    switch (selectedPeriod) {
      case 'week': {
        // Получение представления недели (текущая неделя)
        const dayOfWeek = currentDate.getDay() || 7
        const start = new Date(currentDate)
        start.setDate(currentDate.getDate() - dayOfWeek + 1)
        start.setHours(0, 0, 0, 0)
        const end = new Date(start)
        end.setDate(start.getDate() + 6)
        end.setHours(23, 59, 59, 999)
        return { start, end }
      }
      case 'month': {
        const start = new Date(year, month, 1, 0, 0, 0, 0)
        const end = new Date(year, month + 1, 0, 23, 59, 59, 999)
        return { start, end }
      }
      case 'year': {
        const start = new Date(year, 0, 1, 0, 0, 0, 0)
        const end = new Date(year, 11, 31, 23, 59, 59, 999)
        return { start, end }
      }
      default: {
        const start = new Date(year, month, 1)
        const end = new Date(year, month + 1, 0, 23, 59, 59, 999)
        return { start, end }
      }
    }
  }

  const { start: periodStart, end: periodEnd } = getDateRange()

  // Генерация данных графика
  const chartData = useMemo(() => {
    const dailyTotals = new Map<string, number>()
    entries.forEach(e => {
      if (!e.entryDate) return
      const entryDate = new Date(e.entryDate)
      if (isNaN(entryDate.getTime())) return
      const dateStr = toLocalDateStr(entryDate)
      dailyTotals.set(dateStr, (dailyTotals.get(dateStr) || 0) + e.value)
    })

    if (selectedPeriod === 'week') {
      // Представление недели: по дням для текущей недели
      const data = []
      for (let i = 0; i < 7; i++) {
        const date = new Date(periodStart)
        date.setDate(periodStart.getDate() + i)
        const dateStr = toLocalDateStr(date)
        const value = dailyTotals.get(dateStr) || 0
        data.push({
          label: getWeekDayName(i),
          value,
          date: dateStr
        })
      }
      return data
    } else if (selectedPeriod === 'month') {
      // Представление месяца: по дням с правильными подписями
      const data = []
      for (let d = new Date(periodStart); d <= periodEnd; d.setDate(d.getDate() + 1)) {
        const dateStr = toLocalDateStr(d)
        const value = dailyTotals.get(dateStr) || 0
        data.push({
          label: `${d.getDate()}`,
          value,
          date: dateStr,
          sortKey: d.getTime()
        })
      }
      // Сортировка по хронологии
      return data.sort((a, b) => a.sortKey - b.sortKey)
    } else {
      // Представление года: агрегация по месяцам
      const monthNames = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек']
      const data = []
      const year = periodStart.getFullYear()
      for (let month = 0; month < 12; month++) {
        const monthStart = new Date(year, month, 1)
        const monthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999)
        let monthTotal = 0
        for (let d = new Date(monthStart); d <= monthEnd; d.setDate(d.getDate() + 1)) {
          const dateStr = toLocalDateStr(d)
          monthTotal += dailyTotals.get(dateStr) || 0
        }
        data.push({
          label: monthNames[month],
          value: monthTotal,
          date: `${year}-${String(month + 1).padStart(2, '0')}`,
          sortKey: month
        })
      }
      // Сортировка по хронологии
      return data.sort((a, b) => a.sortKey - b.sortKey)
    }
  }, [entries, periodStart, periodEnd, selectedPeriod])

  // Накопительные данные графика для счётчиков
  const cumulativeChartData = useMemo(() => {
    if (metric.type === 'simple_habit') return []

    // Получение всех записей, отсортированных по дате
    const sortedEntries = [...entries]
      .filter(e => e.entryDate)
      .map(e => ({ ...e, entryDate: new Date(e.entryDate) }))
      .filter(e => !isNaN(e.entryDate.getTime()))
      .sort((a, b) => a.entryDate.getTime() - b.entryDate.getTime())

    // Расчёт накопительного значения ДО начала периода
    let cumulative = 0
    const periodStartTime = periodStart.getTime()

    for (const entry of sortedEntries) {
      if (entry.entryDate.getTime() < periodStartTime) {
        cumulative += entry.value
      } else {
        break // Stop once we reach period start (entries are sorted)
      }
    }

    // Сохранение начального накопления (все записи до этого периода)
    const initialCumulative = cumulative

    // Фильтрация записей в пределах текущего периода
    const periodEntries = sortedEntries.filter(e => {
      if (!e.entryDate) return false
      const entryDate = new Date(e.entryDate)
      return !isNaN(entryDate.getTime()) && entryDate >= periodStart && entryDate <= periodEnd
    })

    // Создание накопительных данных, начиная с суммы до периода
    const dailyCumulative = new Map<string, number>()

    // Обработка записей в пределах периода
    periodEntries.forEach(entry => {
      if (!entry.entryDate) return
      const entryDate = new Date(entry.entryDate)
      if (isNaN(entryDate.getTime())) return
      const dateStr = toLocalDateStr(entryDate)
      cumulative += entry.value
      dailyCumulative.set(dateStr, cumulative)
    })
    
    // Генерация данных графика на основе периода
    const data = []
    // Инициализация с накоплением до периода (все предыдущие записи)
    let lastCumulative = initialCumulative
    if (selectedPeriod === 'week') {
      for (let i = 0; i < 7; i++) {
        const date = new Date(periodStart)
        date.setDate(periodStart.getDate() + i)
        const dateStr = toLocalDateStr(date)
        // Перенос последнего накопленного значения, если нет записи за этот день
        const dayValue = dailyCumulative.get(dateStr)
        if (dayValue !== undefined) {
          lastCumulative = dayValue
        }
        data.push({
          label: getWeekDayName(i),
          value: lastCumulative,
          date: dateStr
        })
      }
    } else if (selectedPeriod === 'month') {
      for (let d = new Date(periodStart); d <= periodEnd; d.setDate(d.getDate() + 1)) {
        const dateStr = toLocalDateStr(d)
        // Перенос последнего накопленного значения, если нет записи за этот день
        const dayValue = dailyCumulative.get(dateStr)
        if (dayValue !== undefined) {
          lastCumulative = dayValue
        }
        data.push({
          label: `${d.getDate()}`,
          value: lastCumulative,
          date: dateStr,
          sortKey: d.getTime()
        })
      }
      data.sort((a, b) => a.sortKey - b.sortKey)
    } else {
      // Представление года - накопление по месяцам
      const monthNames = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек']
      const year = periodStart.getFullYear()
      
      for (let month = 0; month < 12; month++) {
        const monthStart = new Date(year, month, 1)
        const monthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999)
        
        // Получение накопленного значения на конец месяца (включая предыдущие периоды)
        let monthCumulative = initialCumulative
        for (const entry of periodEntries) {
          if (!entry.entryDate) continue
          const entryDate = new Date(entry.entryDate)
          if (isNaN(entryDate.getTime())) continue
          if (entryDate <= monthEnd) {
            monthCumulative += entry.value
          }
        }
        
        data.push({
          label: monthNames[month],
          value: monthCumulative,
          date: `${year}-${String(month + 1).padStart(2, '0')}`,
          sortKey: month
        })
      }
      data.sort((a, b) => a.sortKey - b.sortKey)
    }
    
    return data
  }, [entries, periodStart, periodEnd, selectedPeriod, metric.type])

  // Расчёт статистики графика
  const chartStats = useMemo(() => {
    const values = chartData.map(d => d.value)
    const total = values.reduce((sum, v) => sum + v, 0)
    const activeDays = values.filter(v => v !== 0).length
    const average = activeDays > 0 ? (total / activeDays).toFixed(2).replace('.', ',') : '0'
    
    // Расчёт тренда (сравнение с предыдущим периодом)
    const { start: prevStart, end: prevEnd } = getPreviousPeriodRange()
    const prevDailyTotals = new Map<string, number>()
    entries.forEach(e => {
      if (!e.entryDate) return
      const entryDate = new Date(e.entryDate)
      if (isNaN(entryDate.getTime())) return
      if (entryDate >= prevStart && entryDate <= prevEnd) {
        const dateStr = toLocalDateStr(entryDate)
        prevDailyTotals.set(dateStr, (prevDailyTotals.get(dateStr) || 0) + e.value)
      }
    })
    const prevTotal = Array.from(prevDailyTotals.values()).reduce((sum, v) => sum + v, 0)
    const prevActiveDays = Array.from(prevDailyTotals.values()).filter(v => v !== 0).length
    const prevAverage = prevActiveDays > 0 ? prevTotal / prevActiveDays : 0
    const currentAvg = activeDays > 0 ? total / activeDays : 0
    
    let trendPercent = 0
    let trendDirection: 'up' | 'down' | 'neutral' = 'neutral'
    if (prevAverage > 0) {
      trendPercent = ((currentAvg - prevAverage) / prevAverage) * 100
      trendDirection = trendPercent > 0 ? 'up' : trendPercent < 0 ? 'down' : 'neutral'
    }

    return { total, activeDays, average, trendPercent: Math.abs(trendPercent).toFixed(2).replace('.', ','), trendDirection }
  }, [chartData, entries, selectedPeriod, currentDate])

  // Вспомогательная функция для получения диапазона предыдущего периода
  function getPreviousPeriodRange() {
    const duration = periodEnd.getTime() - periodStart.getTime()
    const prevEnd = new Date(periodStart.getTime() - 1)
    const prevStart = new Date(prevEnd.getTime() - duration)
    return { start: prevStart, end: prevEnd }
  }

  // Данные календаря
  const calendarData = useMemo(() => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startWeekday = firstDay.getDay() || 7 // 1=Monday, 7=Sunday

    const days: Array<{ date: number; value: number; hasEntry: boolean; isToday: boolean } | null> = []
    
    // Пустые ячейки перед первым днём (начало с понедельника)
    for (let i = 1; i < startWeekday; i++) {
      days.push(null)
    }

    // Расчёт ежедневных значений
    const dailyTotals = new Map<number, number>()
    entries.forEach(e => {
      if (!e.entryDate) return
      const d = new Date(e.entryDate)
      if (isNaN(d.getTime())) return
      if (d.getMonth() === month && d.getFullYear() === year) {
        const day = d.getDate()
        dailyTotals.set(day, (dailyTotals.get(day) || 0) + e.value)
      }
    })

    const today = new Date()
    
    for (let i = 1; i <= daysInMonth; i++) {
      const value = dailyTotals.get(i) || 0
      days.push({
        date: i,
        value,
        hasEntry: value > 0,
        isToday: today.getDate() === i && today.getMonth() === month && today.getFullYear() === year
      })
    }

    // Расчёт ежемесячной статистики
    const monthTotal = Array.from(dailyTotals.values()).reduce((sum, v) => sum + v, 0)
    const goalAchievedDays = Array.from(dailyTotals.values()).filter(v => v >= (metric.targetValue || 1)).length

    return { days, monthTotal, goalAchievedDays }
  }, [entries, currentDate, metric.targetValue])

  // Навигация по периодам
  const navigatePeriod = (direction: number) => {
    const newDate = new Date(currentDate)
    if (selectedPeriod === 'week') {
      newDate.setDate(newDate.getDate() + direction * 7)
    } else if (selectedPeriod === 'month') {
      newDate.setMonth(newDate.getMonth() + direction)
    } else if (selectedPeriod === 'year') {
      newDate.setFullYear(newDate.getFullYear() + direction)
    }
    setCurrentDate(newDate)
  }

  // Форматирование диапазона дат для отображения
  const formatDateRange = () => {
    if (selectedPeriod === 'week') {
      const end = new Date(periodStart)
      end.setDate(periodStart.getDate() + 6)
      return `${periodStart.getDate()} ${getMonthNameGenitive(periodStart.getMonth())}. ${periodStart.getFullYear()} г. - ${end.getDate()} ${getMonthNameGenitive(end.getMonth())}. ${end.getFullYear()} г.`
    } else if (selectedPeriod === 'month') {
      const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()
      return `1 ${getMonthNameGenitive(currentDate.getMonth())}. ${currentDate.getFullYear()} г. - ${lastDay} ${getMonthNameGenitive(currentDate.getMonth())}. ${currentDate.getFullYear()}г.`
    } else if (selectedPeriod === 'year') {
      return `${currentDate.getFullYear()} г.`
    }
    return ''
  }

  // Обработка добавления записи
  const handleAddEntry = () => {
    setEntryMode('add')
    setShowEntryModal(true)
  }

  const handleSubtractEntry = () => {
    setEntryMode('subtract')
    setShowEntryModal(true)
  }

  // Обработка быстрого добавления/вычитания с фиксированным значением
  const handleQuickAdd = async () => {
    const stepValue = metric.stepValue ?? 1
    const currentTotal = stats.totalValue
    const newTotal = currentTotal + stepValue
    const newProgress = metric.targetValue 
      ? Math.min(100, Math.max(0, (newTotal / metric.targetValue) * 100))
      : 0

    // Оптимистичное обновление
    setOptimisticMetric({
      ...metric,
      totalValue: newTotal,
      progress: Math.round(newProgress)
    })

    try {
      await createMetricEntry(metric.id, stepValue, 'Быстрое добавление')
      setOptimisticMetric(null)
    } catch (error) {
      console.error('Failed to create metric entry:', error)
      setOptimisticMetric(null)
    }
  }

  const handleQuickSubtract = async () => {
    const stepValue = metric.stepValue ?? 1
    const currentTotal = stats.totalValue
    const newTotal = Math.max(0, currentTotal - stepValue)
    const newProgress = metric.targetValue 
      ? Math.min(100, Math.max(0, (newTotal / metric.targetValue) * 100))
      : 0

    // Оптимистичное обновление
    setOptimisticMetric({
      ...metric,
      totalValue: newTotal,
      progress: Math.round(newProgress)
    })

    try {
      await createMetricEntry(metric.id, -stepValue, 'Быстрое вычитание')
      setOptimisticMetric(null)
    } catch (error) {
      console.error('Failed to create metric entry:', error)
      setOptimisticMetric(null)
    }
  }

  // Проверка, является ли это простой привычкой (в стиле чекбокса)
  const isSimpleHabit = metric.type === 'simple_habit'

  // Обработка переключения простой привычки (отметка/снятие на сегодня)
  const handleSimpleHabitToggle = async () => {
    const today = new Date()
    const todayStr = toLocalDateStr(today)
    
    // Проверка, уже выполнено ли сегодня
    const todayEntry = entries.find(e => {
      if (!e.entryDate) return false
      const entryDate = new Date(e.entryDate)
      return !isNaN(entryDate.getTime()) && toLocalDateStr(entryDate) === todayStr
    })
    
    if (todayEntry) {
      // Уже выполнено - ничего не делать или снять отметку
      // Пока просто закрыть модальное окно
      onClose()
    } else {
      // Создание простой записи
      await createMetricEntry(metric.id, 1, 'Выполнено')
    }
  }

  // Кнопки верхнего действия
  const actionButtons = [
    { id: 'minus', icon: Minus, label: `${metric.stepValue ?? 1}`, onClick: handleQuickSubtract, color: 'text-red-600' },
    { id: 'record', icon: FileText, label: 'Запись', onClick: () => setShowEntryModal(true), color: 'text-gray-600' },
    { id: 'plus', icon: Plus, label: `${metric.stepValue ?? 1}`, onClick: handleQuickAdd, color: 'text-blue-600' },
    { id: 'editor', icon: Edit3, label: 'Редактировать', onClick: () => setShowEditModal(true), color: 'text-gray-600' },
    { id: 'history', icon: History, label: 'История', onClick: () => setViewType('history'), color: 'text-gray-600' },
  ]

  // Компонент просмотра простой привычки
  const SimpleHabitView = () => {
    const today = new Date()
    const todayStr = toLocalDateStr(today)
    const isCompletedToday = entries.some(e => {
      if (!e.entryDate) return false
      const entryDate = new Date(e.entryDate)
      return !isNaN(entryDate.getTime()) && toLocalDateStr(entryDate) === todayStr
    })
    
    // Расчёт серии
    const sortedDates = [...entries]
      .filter(e => e.entryDate)
      .map(e => new Date(e.entryDate))
      .filter(date => !isNaN(date.getTime()))
      .sort((a, b) => b.getTime() - a.getTime())
      .map(date => toLocalDateStr(date))
    
    let currentStreak = 0
    let lastDate: string | null = null
    
    for (const dateStr of sortedDates) {
      if (!lastDate) {
        // Первая запись - проверка, сегодня или вчера
        const entryDate = new Date(dateStr)
        const daysDiff = Math.floor((today.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24))
        if (daysDiff <= 1) {
          currentStreak = 1
          lastDate = dateStr
        }
      } else {
        // Проверка на последовательность
        const last = new Date(lastDate)
        const current = new Date(dateStr)
        const diffDays = Math.floor((last.getTime() - current.getTime()) / (1000 * 60 * 60 * 24))
        if (diffDays === 1) {
          currentStreak++
          lastDate = dateStr
        } else {
          break
        }
      }
    }
    
    return (
      <div className="flex flex-col items-center justify-center py-8 space-y-6">
        {/* Big Check Button */}
        <button
          onClick={handleSimpleHabitToggle}
          className={cn(
            "w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg",
            isCompletedToday 
              ? "bg-green-500 hover:bg-green-600 text-white"
              : "bg-gray-100 hover:bg-gray-200 text-gray-400 hover:text-green-500"
          )}
        >
          <CheckCircle2 className="w-16 h-16" />
        </button>
        
        <p className="text-lg font-medium text-gray-700">
          {isCompletedToday ? 'Отметить выполнение' : 'Отметить выполнение'}
        </p>
      </div>
    )
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div 
        className="bg-white rounded-2xl w-full flex flex-col shadow-2xl overflow-hidden max-w-4xl max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modern Light Header */}
        <div className="bg-gray-50 border-b p-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-lg transition-colors text-gray-600">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="text-center flex-1 px-4">
              <h2 className="text-lg font-semibold text-gray-900 truncate">{metric.name}</h2>
              {category && (
                <span className="text-xs text-gray-500">{category.name}</span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button 
                onClick={() => {
                  if (confirm('Вы уверены, что хотите удалить эту метрику?')) {
                    onDelete ? onDelete(metric.id) : deleteMetric(metric.id)
                    onClose()
                  }
                }}
                className="p-2 hover:bg-red-100 rounded-lg transition-colors text-gray-600 hover:text-red-600"
                title="Удалить"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Action Buttons Row - Modern Style */}
          {actionButtons.length > 0 && (
            <div className="flex justify-center gap-3 mt-4">
              {actionButtons.map(btn => (
                <button
                  key={btn.id}
                  onClick={btn.onClick}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
                >
                  <btn.icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{btn.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
          
            <>
        {/* Data Analysis Section - Compact */}
        <div className="bg-white rounded-xl p-3 mb-3 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Анализ данных</h3>
          
          <div className="space-y-1.5 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Общее число</span>
              <span className="text-blue-600 font-semibold">
                {formatNumber(stats.totalValue)}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Рекордные дни</span>
              <span className="text-blue-600 font-semibold">{stats.recordDays} дня</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Средний интервал</span>
              <span className="text-blue-600 font-semibold">{stats.avgInterval} ч</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Текущая серия</span>
              <span className="text-blue-600 font-semibold">{stats.currentStreak} дней</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Самая длинная серия</span>
              <span className="text-blue-600 font-semibold">{stats.maxStreak} дней</span>
            </div>
          </div>
        </div>

        {/* Target Progress */}
        <div className="bg-white rounded-xl p-4 mb-4 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Целевой прогресс</h3>

          <div className="mb-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-gray-900">
                {(() => {
                  const isPeriodBased = (metric.type === 'habit' || metric.type === 'simple_habit' || metric.type === 'counter') && metric.resetPeriodicity && metric.resetPeriodicity !== 'none'
                  const displayVal = isPeriodBased ? stats.periodValue : stats.totalValue
                  return <>{formatNumber(displayVal + (metric.startValue || 0))} / {formatNumber(metric.targetValue || 0)}</>
                })()}
              </span>
              <span className="text-sm font-medium text-gray-600">{progress.percent}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(progress.percent, 100)}%`, backgroundColor: metric.color }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>{formatDateShort(progress.startDate)} — {formatDateShort(progress.endDate)}</span>
            {progress.daysRemaining > 0 && (
              <span>Осталось: {progress.daysRemaining} {progress.daysRemaining === 1 ? 'день' : progress.daysRemaining < 5 ? 'дня' : 'дней'}</span>
            )}
          </div>
        </div>

        {/* Activity Heatmap */}
        <div className="bg-white rounded-xl p-4 mb-4 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900">Активность</h3>
          </div>
          {entries.length > 0 ? (
            <ActivityHeatmap
              data={(() => {
                const dailyTotals = new Map<string, number>()
                entries.forEach(e => {
                  if (!e.entryDate) return
                  const date = new Date(e.entryDate)
                  if (isNaN(date.getTime())) return
                  const key = toLocalDateStr(date)
                  dailyTotals.set(key, (dailyTotals.get(key) || 0) + e.value)
                })
                return Array.from(dailyTotals.entries())
                  .filter(([_, v]) => v !== 0)
                  .map(([key, value]) => ({ date: new Date(key), value }))
              })()}
              size="large"
              showTitle={false}
              className="bg-transparent"
              color={metric.color}
              scrollToCurrentMonth={true}
            />
          ) : (
            <div className="h-24 flex items-center justify-center text-gray-400 text-sm">
              <p>Нет данных для отображения</p>
            </div>
          )}
        </div>

        {/* View Toggle */}
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => setViewType('chart')}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              viewType === 'chart' ? 'bg-blue-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'
            )}
          >
            График
          </button>
          <button
            onClick={() => setViewType('calendar')}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              viewType === 'calendar' ? 'bg-blue-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'
            )}
          >
            Календарь
          </button>
          <button
            onClick={() => setViewType('history')}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              viewType === 'history' ? 'bg-blue-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'
            )}
          >
            История
          </button>
        </div>

        {viewType === 'chart' ? (
          <>
            {/* Period Tabs */}
            <div className="bg-gray-100 rounded-lg p-1 mb-4">
              <div className="flex">
                {[
                  { id: 'week', label: 'Неделя' },
                  { id: 'month', label: 'Месяц' },
                  { id: 'year', label: 'Год' },
                ].map(period => (
                  <button
                    key={period.id}
                    onClick={() => setSelectedPeriod(period.id as PeriodType)}
                    className={cn(
                      'flex-1 py-2 text-sm font-medium rounded-md transition-colors',
                      selectedPeriod === period.id
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    )}
                  >
                    {period.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Chart Type Toggle - three buttons */}
            {metric.type !== 'simple_habit' && (
              <div className="flex items-center justify-center mb-4">
                <div className="flex bg-gray-100 rounded-lg p-1 gap-1">
                  <button
                    onClick={() => setChartType('bar')}
                    className={cn(
                      'px-3 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-1.5',
                      chartType === 'bar'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    )}
                  >
                    <BarChart4 className="w-4 h-4" />
                    Столбцы
                  </button>
                  <button
                    onClick={() => setChartType('line')}
                    className={cn(
                      'px-3 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-1.5',
                      chartType === 'line'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    )}
                  >
                    <TrendingUp className="w-4 h-4" />
                    Линия
                  </button>
                  <button
                    onClick={() => setChartType('cumulative')}
                    className={cn(
                      'px-3 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-1.5',
                      chartType === 'cumulative'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    )}
                  >
                    <TrendingUp className="w-4 h-4" />
                    Накопление
                  </button>
                </div>
              </div>
            )}

            {/* Date Navigation */}
            <div className="flex items-center justify-center gap-4 mb-4">
              <button 
                onClick={() => navigatePeriod(-1)}
                className="p-2 hover:bg-gray-200 rounded-full transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
              <span className="text-sm font-medium text-gray-700">
                {formatDateRange()}
              </span>
              <button 
                onClick={() => navigatePeriod(1)}
                className="p-2 hover:bg-gray-200 rounded-full transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {/* Chart */}
            <div className="bg-white rounded-xl p-4 mb-4 shadow-sm">
              {(chartType === 'cumulative' ? cumulativeChartData : chartData).length > 0 ? (
                <>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      {chartType === 'bar' ? (
                        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                          <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                          <Tooltip
                            contentStyle={{ backgroundColor: 'white', border: '2px solid ' + metric.color, borderRadius: '12px', fontSize: '14px', fontWeight: 600, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', padding: '12px 16px' }}
                            labelStyle={{ fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}
                            formatter={(value: number) => [<span className="text-lg font-bold text-gray-900">{value} {metric.customUnit || ''}</span>, null]}
                          />
                          <Bar dataKey="value" fill={metric.color} radius={[4, 4, 0, 0]} maxBarSize={40} />
                        </BarChart>
                      ) : chartType === 'line' ? (
                        <LineChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                          <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                          <Tooltip
                            contentStyle={{ backgroundColor: 'white', border: '2px solid ' + metric.color, borderRadius: '12px', fontSize: '14px', fontWeight: 600, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', padding: '12px 16px' }}
                            labelStyle={{ fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}
                            formatter={(value: number) => [<span className="text-lg font-bold text-gray-900">{value} {metric.customUnit || ''}</span>, null]}
                          />
                          <Line type="monotone" dataKey="value" stroke={metric.color} strokeWidth={2} dot={{ fill: metric.color, r: 3 }} activeDot={{ r: 5 }} />
                        </LineChart>
                      ) : (
                        <LineChart data={cumulativeChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                          <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                          <Tooltip
                            contentStyle={{ backgroundColor: 'white', border: '2px solid ' + metric.color, borderRadius: '12px', fontSize: '14px', fontWeight: 600, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', padding: '12px 16px' }}
                            labelStyle={{ fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}
                            formatter={(value: number, name: string, props: any) => {
                              const dataIndex = props?.payload?.index || 0
                              const prevValue = dataIndex > 0 ? cumulativeChartData[dataIndex - 1]?.value : 0
                              const delta = value - prevValue
                              return [
                                <span className="text-lg font-bold text-gray-900">{value} {metric.customUnit || ''}</span>,
                                <span className="text-sm text-gray-600">
                                  Накопительно {delta > 0 && <span className="text-green-600">+{delta}</span>}
                                </span>
                              ]
                            }}
                          />
                          <Line
                            type="monotone"
                            dataKey="value"
                            stroke={metric.color}
                            strokeWidth={3}
                            dot={{ fill: metric.color, r: 4, stroke: 'white', strokeWidth: 2 }}
                            activeDot={{ r: 6, stroke: metric.color, strokeWidth: 2 }}
                          />
                          {metric.targetValue && <ReferenceLine y={metric.targetValue} stroke="#10b981" strokeDasharray="5 5" label={{ value: "Цель", position: "right" }} />}
                        </LineChart>
                      )}
                    </ResponsiveContainer>
                  </div>

                  {/* Chart Stats */}
                  <div className="flex items-center justify-center gap-4 text-sm text-gray-600 mt-4 pt-4 border-t">
                    <span>
                      всего: <strong className="text-blue-600">{chartStats.total}</strong> ({chartStats.activeDays} активных дн) |
                    </span>
                    <span className="flex items-center gap-1">
                      Среднее: <strong className="text-blue-600">{chartStats.average}</strong>
                      {chartStats.trendDirection === 'up' && <span className="text-green-600 flex items-center"><ArrowUpRight className="w-4 h-4" />{chartStats.trendPercent}%</span>}
                      {chartStats.trendDirection === 'down' && <span className="text-red-600 flex items-center"><ArrowDownRight className="w-4 h-4" />{chartStats.trendPercent}%</span>}
                    </span>
                  </div>
                </>
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-400">
                  <p>Нет данных для отображения</p>
                </div>
              )}
            </div>
          </>
        ) : viewType === 'calendar' ? (
          /* Calendar View */
          <div className="bg-white rounded-xl p-4 mb-4 shadow-sm">
            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-4">
              <button 
                onClick={() => navigatePeriod(-1)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
              <h3 className="text-lg font-semibold text-gray-900">
                {getMonthNameNominative(currentDate.getMonth())} {currentDate.getFullYear()}
              </h3>
              <button 
                onClick={() => navigatePeriod(1)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {/* Weekday Headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'].map(day => (
                <div key={day} className="text-center text-xs text-gray-400 font-medium py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1">
              {calendarData.days.map((day, i) => (
                <div key={i} className="aspect-square flex flex-col items-center justify-center p-1">
                  {day ? (
                    <div
                      className={cn(
                        'w-10 h-10 rounded-full flex flex-col items-center justify-center text-sm relative',
                        day.isToday && 'ring-2'
                      )}
                      style={{
                        backgroundColor: day.hasEntry ? `${metric.color}20` : undefined,
                        color: day.hasEntry ? metric.color : undefined,
                        borderColor: day.isToday ? metric.color : undefined,
                      }}
                    >
                      <span className="font-medium">{day.date}</span>
                    </div>
                  ) : (
                    <div className="w-10 h-10" />
                  )}
                  {day && day.value > 0 && (
                    <span className="text-xs mt-1 font-medium" style={{ color: metric.color }}>+{day.value}</span>
                  )}
                </div>
              ))}
            </div>

            {/* Calendar Stats */}
            <div className="mt-4 pt-4 border-t space-y-2">
               
              <div className="flex items-center justify-between">
                <span className="text-gray-600 font-medium">Итого за месяц:</span>
                <div className="flex items-center gap-4">
                  <span style={{ color: metric.color }} className="font-bold text-lg">{calendarData.monthTotal}</span>
                  <button 
                    onClick={() => setShowEntryModal(true)}
                    className="flex items-center gap-1 font-medium"
                    style={{ color: metric.color }}
                  >
                    Добавить запись <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Цели достигнуты в этом месяце</span>
                <span style={{ color: metric.color }} className="font-semibold">{calendarData.goalAchievedDays} дня</span>
              </div>
            </div>
          </div>
        ) : (
          /* History View */
          <div className="bg-white rounded-xl p-4 mb-4 shadow-sm">
            <h3 className="text-lg font-semibold mb-4">История записей</h3>
            {entries.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Нет записей</p>
            ) : (
              <div className="space-y-2">
                {[...entries]
                  .sort((a, b) => {
                    const aTime = a.entryDate instanceof Date ? a.entryDate.getTime() : new Date(a.entryDate).getTime()
                    const bTime = b.entryDate instanceof Date ? b.entryDate.getTime() : new Date(b.entryDate).getTime()
                    return bTime - aTime
                  })
                  .map(entry => (
                    <div key={entry.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg group">
                      <div>
                        <p className="font-medium">
                          {entry.value > 0 ? '+' : '-'}{Math.abs(entry.value)} {metric.customUnit || ''}
                        </p>
                        {entry.note && <p className="text-sm text-gray-500">{entry.note}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-gray-500">
                          {formatDate(entry.entryDate)}
                        </p>
                        <button
                          onClick={() => setDeleteEntryId(entry.id)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}
            </>
          
        </div>

      {/* Entry Modal - Quick Entry Form */}
      <QuickEntryForm
        isOpen={showEntryModal}
        onClose={() => setShowEntryModal(false)}
        metric={metric}
        entries={entries}
        mode={entryMode}
        onSave={async (data) => {
          try {
            const signedValue = data.isAddition
              ? Math.abs(data.value)
              : -Math.abs(data.value)

            await createMetricEntry(metric.id, signedValue, data.note, data.entryDate)
            setShowEntryModal(false)
          } catch (err) {
            console.error('Failed to save entry:', err)
            alert('Ошибка при сохранении записи: ' + (err instanceof Error ? err.message : 'Неизвестная ошибка'))
          }
        }}
      />

      {/* Edit Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Редактировать метрику"
        size="large"
      >
        <MetricForm
          initialData={metric}
          onSubmit={() => {
            setShowEditModal(false)
            onEdit?.(metric)
          }}
          onCancel={() => setShowEditModal(false)}
        />
      </Modal>

      {/* Delete Entry Confirmation */}
      <ConfirmModal
        isOpen={!!deleteEntryId}
        onClose={() => setDeleteEntryId(null)}
        onConfirm={async () => {
          if (deleteEntryId) {
            await deleteMetricEntry(deleteEntryId)
            setDeleteEntryId(null)
          }
        }}
        title="Удалить запись?"
        message="Вы уверены, что хотите удалить эту запись? Это действие нельзя отменить."
        confirmText="Удалить"
        variant="danger"
      />
      </div>
    </div>
  )
}
