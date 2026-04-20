import { useState, useMemo } from 'react'
import { X, TrendingUp, Calendar, Target, Flame, Award, ChevronLeft, ChevronRight } from 'lucide-react'
import { format, startOfMonth, addMonths, subMonths, eachDayOfInterval, startOfYear, endOfYear } from 'date-fns'
import { ru } from 'date-fns/locale'
import { useApiDataStore } from '@/stores/apiDataStore'
import { 
  CircularProgressChart, 
  LinearProgressBar, 
  BarChart, 
  LineChart,
  HeatmapCalendar,
  ActivityHeatmap,
  StatsCard 
} from '@/components/analytics'
import type { Metric, MetricEntry } from '@/types'

interface MetricDetailAnalyticsProps {
  metric: Metric
  entries: MetricEntry[]
  onClose: () => void
}

export function MetricDetailAnalytics({ metric, entries, onClose }: MetricDetailAnalyticsProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [viewMode, setViewMode] = useState<'charts' | 'history' | 'heatmap'>('charts')
  
  // Calculate statistics
  const stats = useMemo(() => {
    if (entries.length === 0) return null
    
    const sortedEntries = [...entries].sort((a, b) => 
      new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime()
    )
    
    const values = sortedEntries.map(e => e.value)
    const totalValue = values.reduce((sum, v) => sum + v, 0)
    const avgValue = totalValue / values.length
    const maxValue = Math.max(...values)
    const minValue = Math.min(...values)
    
    // Calculate current streak
    let currentStreak = 0
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    for (let i = 0; i < sortedEntries.length; i++) {
      const entryDate = new Date(sortedEntries[i].entryDate)
      entryDate.setHours(0, 0, 0, 0)
      const diffDays = Math.floor((today.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24))
      
      if (diffDays === i || (i === 0 && diffDays <= 1)) {
        currentStreak++
      } else {
        break
      }
    }
    
    // Calculate longest streak
    let longestStreak = 0
    let tempStreak = 1
    for (let i = 1; i < sortedEntries.length; i++) {
      const prevDate = new Date(sortedEntries[i - 1].entryDate)
      const currDate = new Date(sortedEntries[i].entryDate)
      const diff = Math.floor((prevDate.getTime() - currDate.getTime()) / (1000 * 60 * 60 * 24))
      
      if (diff === 1) {
        tempStreak++
        longestStreak = Math.max(longestStreak, tempStreak)
      } else {
        tempStreak = 1
      }
    }
    longestStreak = Math.max(longestStreak, tempStreak, currentStreak)
    
    return {
      totalEntries: entries.length,
      totalValue,
      avgValue: Math.round(avgValue * 100) / 100,
      maxValue,
      minValue,
      currentStreak,
      longestStreak,
      recordDays: values.filter(v => v >= maxValue * 0.9).length
    }
  }, [entries])
  
  // Current value calculation
  const currentValue = useMemo(() => {
    if (entries.length === 0) return metric.startValue || 0
    return entries.reduce((sum, e) => sum + (e.isAddition ? e.value : -e.value), metric.startValue || 0)
  }, [entries, metric.startValue])
  
  // Progress percentage
  const progress = metric.targetValue > 0 
    ? Math.min(100, Math.round((currentValue / metric.targetValue) * 100))
    : 0
  
  // Chart data preparation
  const lineChartData = useMemo(() => {
    const sorted = [...entries].sort((a, b) => 
      new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime()
    )
    let runningTotal = metric.startValue || 0
    
    return sorted.map(e => {
      runningTotal += e.isAddition ? e.value : -e.value
      return {
        date: format(new Date(e.entryDate), 'dd.MM'),
        value: runningTotal
      }
    })
  }, [entries, metric.startValue])
  
  const barChartData = useMemo(() => {
    const daysInMonth = eachDayOfInterval({
      start: startOfMonth(currentMonth),
      end: new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)
    })
    
    return daysInMonth.map(day => {
      const dayEntries = entries.filter(e => 
        new Date(e.entryDate).toDateString() === day.toDateString()
      )
      const dayTotal = dayEntries.reduce((sum, e) => sum + (e.isAddition ? e.value : -e.value), 0)
      
      return {
        day: day.getDate(),
        value: Math.max(0, dayTotal)
      }
    })
  }, [entries, currentMonth])
  
  const heatmapData = useMemo(() => {
    return entries.map(e => ({
      date: new Date(e.entryDate),
      value: e.value
    }))
  }, [entries])
  
  const activityData = useMemo(() => {
    return entries.map(e => ({
      date: new Date(e.entryDate),
      value: e.value
    }))
  }, [entries])
  
  // Calculate daily target
  const dailyTarget = useMemo(() => {
    if (!metric.targetValue || !metric.targetValue) return 0
    
    const target = metric.targetValue - (metric.startValue || 0)
    const start = new Date()
    const end = new Date(metric.targetValue)
    const daysRemaining = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)))
    
    return Math.round((target / daysRemaining) * 100) / 100
  }, [metric])
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{metric.name}</h2>
              <p className="text-sm text-gray-500">
                {metric.targetValue} {metric.customUnit || metric.unitId} к {format(new Date(metric.targetValue || Date.now()), 'd MMM yyyy', { locale: ru })}
              </p>
            </div>
          </div>
          
          {/* View tabs */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            {[
              { key: 'charts', label: 'Диаграммы' },
              { key: 'history', label: 'История' },
              { key: 'heatmap', label: 'Календарь' }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setViewMode(tab.key as any)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  viewMode === tab.key 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        
        <div className="p-6">
          {viewMode === 'charts' && (
            <>
              {/* Main Progress Section */}
              <div className="grid lg:grid-cols-3 gap-6 mb-8">
                {/* Circular Progress */}
                <div className="lg:col-span-1 flex flex-col items-center">
                  <CircularProgressChart
                    current={currentValue}
                    target={metric.targetValue}
                    size={200}
                    color={currentValue > metric.targetValue ? '#ef4444' : '#3b82f6'}
                  />
                  <div className="text-center mt-4">
                    <p className="text-sm text-gray-500">Ежедневная цель</p>
                    <p className="text-2xl font-bold text-gray-900">{dailyTarget}</p>
                    <p className="text-xs text-gray-500">за день</p>
                  </div>
                </div>
                
                {/* Linear Progress & Stats */}
                <div className="lg:col-span-2 space-y-6">
                  {metric.targetValue && (
                    <LinearProgressBar
                      current={currentValue}
                      target={metric.targetValue}
                      startDate={new Date(metric.createdAt)}
                      endDate={new Date(metric.targetValue)}
                      color={currentValue > metric.targetValue ? '#ef4444' : '#10b981'}
                    />
                  )}
                  
                  {/* Stats Cards */}
                  {stats && (
                    <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                      <h3 className="font-semibold text-gray-900 mb-4">Анализ данных</h3>
                      <StatsCard 
                        label="Общее число" 
                        value={stats.totalEntries} 
                        unit="записей"
                        tooltip="Количество записанных значений"
                      />
                      <StatsCard 
                        label="Рекордные дни" 
                        value={stats.recordDays} 
                        unit="дней"
                        color="#22c55e"
                      />
                      <StatsCard 
                        label="Текущая серия" 
                        value={stats.currentStreak} 
                        unit="дня"
                        color="#f97316"
                      />
                      <StatsCard 
                        label="Самая длинная серия" 
                        value={stats.longestStreak} 
                        unit="дней"
                        color="#8b5cf6"
                      />
                    </div>
                  )}
                </div>
              </div>
              
              {/* Charts */}
              <div className="space-y-6">
                {/* Target Progress */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <h3 className="font-semibold text-gray-900 mb-4">Целевой прогресс</h3>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-lg font-bold text-gray-900">
                      {Math.round(currentValue)} / {metric.targetValue}
                    </span>
                    <span className="text-green-600 font-semibold">{progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-4 mb-4">
                    <div 
                      className="bg-green-500 h-4 rounded-full transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  {metric.resetPeriodicity && (
                    <p className="text-sm text-gray-600">
                      Период сброса: <span className="text-green-600">{metric.resetPeriodicity}</span>, 
                      нормальный прогресс: <span className="text-green-600">14%</span>, 
                      опережение на <span className="text-green-600">10%</span>
                    </p>
                  )}
                </div>
                
                {/* Trend Line Chart */}
                {lineChartData.length > 0 && (
                  <div className="bg-gray-50 rounded-xl p-4">
                    <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-blue-500" />
                      Динамика изменений
                    </h3>
                    <LineChart 
                      data={lineChartData}
                      target={metric.targetValue}
                      color={metric.color || '#3b82f6'}
                      height={250}
                    />
                  </div>
                )}
                
                {/* Monthly Bar Chart */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-green-500" />
                      Активность по дням
                    </h3>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                        className="p-1 hover:bg-gray-200 rounded"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <span className="text-sm font-medium">
                        {format(currentMonth, 'MMMM yyyy', { locale: ru })}
                      </span>
                      <button 
                        onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                        className="p-1 hover:bg-gray-200 rounded"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  <BarChart data={barChartData} color={metric.color || '#22c55e'} height={200} />
                </div>
              </div>
            </>
          )}
          
          {viewMode === 'heatmap' && (
            <div className="space-y-8">
              {/* Monthly Heatmap */}
              <div className="bg-gray-50 rounded-xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Flame className="w-5 h-5 text-orange-500" />
                    Календарь активности
                  </h3>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                      className="p-2 hover:bg-gray-200 rounded-lg"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <span className="text-lg font-medium capitalize">
                      {format(currentMonth, 'MMMM yyyy', { locale: ru })}
                    </span>
                    <button 
                      onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                      className="p-2 hover:bg-gray-200 rounded-lg"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                <HeatmapCalendar 
                  data={heatmapData} 
                  month={currentMonth}
                />
              </div>
              
              {/* Yearly Activity Heatmap */}
              <div className="bg-gray-50 rounded-xl p-6">
                <ActivityHeatmap data={activityData} year={currentMonth.getFullYear()} />
              </div>
            </div>
          )}
          
          {viewMode === 'history' && (
            <div className="bg-gray-50 rounded-xl p-4">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Award className="w-5 h-5 text-purple-500" />
                История записей
              </h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {[...entries]
                  .sort((a, b) => new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime())
                  .map((entry, index) => (
                    <div 
                      key={entry.id} 
                      className="bg-white rounded-lg p-3 flex items-center justify-between"
                    >
                      <div>
                        <p className="font-medium text-gray-900">
                          {format(new Date(entry.entryDate), 'dd MMMM yyyy', { locale: ru })}
                        </p>
                        {entry.note && (
                          <p className="text-sm text-gray-500">{entry.note}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`font-bold ${entry.isAddition ? 'text-green-600' : 'text-red-600'}`}>
                          {entry.isAddition ? '+' : '-'}{entry.value}
                        </span>
                        {entry.isOverachievement && (
                          <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full">
                            Перевыполнение!
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
