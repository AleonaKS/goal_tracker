import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Plus, Search, Filter, TrendingUp, Flame, Target, Calendar, ChevronDown, ChevronUp, 
  Edit, Trash2, BarChart3, Activity, CheckCircle, Minus, PlusCircle, MoreVertical,
  FlameIcon, ArrowUp, ArrowDown
} from 'lucide-react'
import { useApiDataStore } from '@/stores/apiDataStore'
import useGamificationActions from '@/hooks/useGamificationActions'
import { Modal } from '@/components/Modal'
import { MetricForm } from '@/components/forms/MetricForm'
import { MetricAnalyticsModal } from '@/components/MetricAnalyticsModal'
import { QuickEntryForm } from '@/components/forms/QuickEntryForm'
import { calculateCurrentStreak } from '@/lib/calculations'
import { cn, formatDate, calculateMetricProgress } from '@/lib/utils'
import type { Metric, MetricEntry, Category } from '@/types'

type FilterType = 'all' | 'habits' | 'counters'

export function MetricsPage() {
  const navigate = useNavigate()
  const { createMetricEntry } = useGamificationActions()
  const { 
    metrics, 
    metricEntries,
    categories,
    createMetric,
    updateMetric,
    deleteMetric,
    fetchPointsHistory
  } = useApiDataStore()

  const [filter, setFilter] = useState<FilterType>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('')

  // Модальные окна
  const [showMetricModal, setShowMetricModal] = useState(false)
  const [selectedMetric, setSelectedMetric] = useState<Metric | null>(null)
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false)
  const [analyticsMetricId, setAnalyticsMetricId] = useState<string | null>(null)
  const [quickEntryMetric, setQuickEntryMetric] = useState<Metric | null>(null)
  const [entryValue, setEntryValue] = useState('')

  // Защита от двойного нажатия
  const [isProcessing, setIsProcessing] = useState<Record<string, boolean>>({})

  // Найти метрику для аналитики (кэшировать чтобы избежать бесконечного цикла)
  const analyticsMetric = useMemo(() => 
    analyticsMetricId ? metrics.find(m => m.id === analyticsMetricId) : null,
    [analyticsMetricId, metrics]
  )

  // Фильтрация метрик
  const filteredMetrics = useMemo(() => {
    return metrics.filter((metric) => {
      const matchesType = filter === 'all' || 
    (filter === 'habits' && (metric.type === 'habit' || metric.type === 'simple_habit')) || 
    (filter === 'counters' && metric.type === 'counter')
      const matchesSearch = !searchQuery || metric.name.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesCategory = !selectedCategory || metric.categoryId === selectedCategory
      return matchesType && matchesSearch && matchesCategory
    })
  }, [metrics, filter, searchQuery, selectedCategory])

  // Статистика
  const stats = useMemo(() => {
    const habits = metrics.filter(m => m.type === 'habit' || m.type === 'simple_habit')
    const counters = metrics.filter(m => m.type === 'counter')
    
    // Подсчет выполненных сегодня
    const today = new Date().toISOString().split('T')[0]
    const completedToday = metricEntries.filter(e => {
      if (!e.entryDate) return false
      try {
        const date = e.entryDate as string | Date
        let entryDateStr: string
        if (typeof date === 'string') {
          entryDateStr = date.split('T')[0]
        } else if (date instanceof Date && !isNaN(date.getTime())) {
          entryDateStr = date.toISOString().split('T')[0]
        } else {
          return false
        }
        return entryDateStr === today
      } catch {
        return false
      }
    }).length

    return {
      total: metrics.length,
      habits: habits.length,
      counters: counters.length,
      completedToday
    }
  }, [metrics, metricEntries])

  const getMetricProgress = (metric: Metric) => {
    const entries = metricEntries.filter(e => e.metricId === metric.id)
    const values = calculateMetricProgress(metric, entries)

    if (metric.type === 'simple_habit') {
      return {
        current: values.periodValue,
        completedToday: values.periodValue > 0,
        target: 1,
        streak: values.periodValue,
      }
    }

    return {
      current: values.isPeriodBased ? values.periodValue : values.totalValue,
      totalValue: values.totalValue,
      target: metric.targetValue || 1,
      progress: values.progress,
      text: `${values.isPeriodBased ? values.periodValue : values.totalValue} / ${metric.targetValue} ${metric.customUnit || ''}`
    }
  }

  // Получить категорию
  const getCategory = (categoryId?: string): Category | undefined => {
    return categories.find(c => c.id === categoryId)
  }

  // Обработчики
  const handleCreateMetric = () => {
    setSelectedMetric(null)
    setShowMetricModal(true)
  }

  const handleEditMetric = (metric: Metric) => {
    setSelectedMetric(metric)
    setShowMetricModal(true)
  }

  const handleDeleteMetric = async (metricId: string) => {
    if (confirm('Вы уверены, что хотите удалить эту метрику?')) {
      await deleteMetric(metricId)
    }
  }

  // Быстрый ввод для привычки
  const handleQuickHabitEntry = async (metric: Metric) => {
    // Защита от двойного нажатия
    if (isProcessing[metric.id]) {
      return
    }

    setIsProcessing(prev => ({ ...prev, [metric.id]: true }))

    const metricEntries = useApiDataStore.getState().metricEntries
    const today = new Date().toISOString().split('T')[0]
    const existingEntry = metricEntries.find(e => {
      if (!e.entryDate) return false
      const entryDate = new Date(e.entryDate)
      return !isNaN(entryDate.getTime()) && e.metricId === metric.id && entryDate.toISOString().split('T')[0] === today
    })

    try {
      if (existingEntry) {
        // Удаляем существующую запись
        await useApiDataStore.getState().deleteMetricEntry(existingEntry.id)
      } else {
        // Создаем новую запись
        await createMetricEntry(metric.id, 1, 'Быстрая отметка')
      }
    } catch (error) {
      console.error('Failed to handle habit entry:', error)
      alert('Ошибка при сохранении: ' + (error instanceof Error ? error.message : 'Неизвестная ошибка'))
    } finally {
      setIsProcessing(prev => ({ ...prev, [metric.id]: false }))
    }
  }

  // Быстрый ввод для счетчика
  const handleQuickCounterEntry = async (metric: Metric, isAddition: boolean) => {
    // Защита от двойного нажатия
    if (isProcessing[metric.id]) {
      return
    }

    setIsProcessing(prev => ({ ...prev, [metric.id]: true }))

    const value = metric.stepValue ?? 1
    const entryValue = isAddition ? value : -value

    try {
      // Сохраняем на сервере, локальное обновление происходит в apiDataStore
      await createMetricEntry(metric.id, entryValue, isAddition ? 'Быстрое добавление' : 'Быстрое вычитание')
    } catch (error) {
      console.error('Failed to save counter entry:', error)
      alert('Ошибка при сохранении: ' + (error instanceof Error ? error.message : 'Неизвестная ошибка'))
    } finally {
      setIsProcessing(prev => ({ ...prev, [metric.id]: false }))
    }
  }

  // Открыть модальное окно ввода значения
  const openQuickEntry = (metric: Metric) => {
    setQuickEntryMetric(metric)
    setEntryValue('')
  }

  // Открыть аналитику метрики
  const openAnalytics = (metric: Metric) => {
    setAnalyticsMetricId(metric.id)
    setShowAnalyticsModal(true)
  }

  // Тепловая карта для привычки
  const getHeatmapData = (metricId: string) => {
    const entries = metricEntries.filter(e => e.metricId === metricId)
    const data: Record<string, number> = {}
    
    entries.forEach(e => {
      if (!e.entryDate) return
      const entryDate = e.entryDate as unknown as string | Date
      let date: string
      if (typeof entryDate === 'string') {
        date = entryDate.split('T')[0]
      } else {
        const parsedDate = new Date(entryDate)
        if (isNaN(parsedDate.getTime())) return
        date = parsedDate.toISOString().split('T')[0]
      }
      data[date] = (data[date] || 0) + (e.value || 0)
    })
    
    return data
  }
 
  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900"> </h1>
          <button
            onClick={handleCreateMetric}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Новая метрика
          </button>
        </div>

        {/* Статистика */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 text-center">
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-sm text-gray-500">Всего метрик</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 text-center">
            <div className="text-2xl font-bold text-orange-600">{stats.habits}</div>
            <div className="text-sm text-gray-500">Привычки</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.counters}</div>
            <div className="text-sm text-gray-500">Счётчики</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.completedToday}</div>
            <div className="text-sm text-gray-500">Сегодня</div>
          </div>
        </div>

        {/* Панель поиска и фильтров */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Поиск */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Поиск метрик..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Фильтры */}
            <div className="flex flex-wrap gap-2">
              {/* Категория */}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                <option value="">Все категории</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>

              {/* Тип */}
              <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
                {[
                  { key: 'all', label: 'Все' },
                  { key: 'habits', label: 'Привычки' },
                  { key: 'counters', label: 'Счётчики' }
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setFilter(key as FilterType)}
                    className={cn(
                      "px-3 py-2 text-sm font-medium transition-colors",
                      filter === key
                        ? "bg-blue-500 text-white"
                        : "hover:bg-gray-100"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* Список метрик */}
      <div className="max-w-7xl mx-auto">
        {filteredMetrics.length === 0 ? (
          <div className="text-center py-12">
            <Target className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Нет метрик</h3>
            <p className="text-gray-500 mb-4">Создайте первую метрику</p>
            <button
              onClick={handleCreateMetric}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Создать метрику
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(400px,1fr))] gap-4">
            {filteredMetrics.map(metric => {
              const category = getCategory(metric.categoryId)
              const progress = getMetricProgress(metric)
              const heatmapData = metric.type === 'habit' ? getHeatmapData(metric.id) : null
              const currentStreak = calculateCurrentStreak(
                metricEntries.filter(e => e.metricId === metric.id),
                metric.periodicity || 'daily'
              )

              return (
                <div
                  key={metric.id}
                  onClick={() => openAnalytics(metric)}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-all group cursor-pointer flex flex-col h-full"
                >
                  <div className="p-5 flex flex-col flex-1">
                    {/* Верхняя часть: категория и тип */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {category && (
                          <div 
                            className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium"
                            style={{ 
                              backgroundColor: `${category.color}20`,
                              color: category.color 
                            }}
                          >
                            <div 
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: category.color }}
                            />
                            {category.name}
                          </div>
                        )}
                        <div className={cn(
                          "flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium",
                          metric.type === 'simple_habit'
                            ? "bg-green-100 text-green-700"
                            : metric.type === 'habit'
                            ? "bg-orange-100 text-orange-700"
                            : "bg-blue-100 text-blue-700"
                        )}>
                          {metric.type === 'simple_habit' ? (
                            <>
                              <CheckCircle className="w-3 h-3" />
                              Простая привычка
                            </>
                          ) : metric.type === 'habit' ? (
                            <>
                              <Flame className="w-3 h-3" />
                              Сложная привычка
                            </>
                          ) : (
                            <>
                              <TrendingUp className="w-3 h-3" />
                              Счётчик
                            </>
                          )}
                        </div>
                      </div>
                      
                      {/* Действия */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleEditMetric(metric)
                          }}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteMetric(metric.id)
                          }}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Название и описание */}
                    <h3 className="font-semibold text-gray-900 mb-1">{metric.name}</h3>
                    {metric.description && (
                      <p className="text-sm text-gray-500 mb-3 line-clamp-2">{metric.description}</p>
                    )}

                    {/* Прогресс */}
                    <div className="mb-4">
                      {metric.type === 'simple_habit' ? (
                        // Simple habit - week dots visualization
                        <div>
                          <div className="flex items-center justify-center gap-1.5 mb-2">
                            {(() => {
                              const dots: React.ReactNode[] = []
                  const today = new Date()
                  today.setHours(0, 0, 0, 0)
                  const toLocalDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
                  for (let i = 9; i >= 0; i--) {
                    const day = new Date(today)
                    day.setDate(today.getDate() - i)
                    const dayStr = toLocalDate(day)
                    const hasEntry = metricEntries.some(e => {
                      if (e.metricId !== metric.id) return false
                      const d = e.entryDate instanceof Date ? e.entryDate : new Date(e.entryDate)
                      return toLocalDate(d) === dayStr
                    })
                                const isToday = i === 0
                                dots.push(
                                  <div
                                    key={i}
                                    className={cn(
                                      'w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium border-2 transition-all',
                                      hasEntry
                                        ? 'bg-green-500 text-white border-green-500'
                                        : 'bg-white text-gray-400 border-gray-300',
                                      isToday && !hasEntry && 'ring-2 ring-offset-1 ring-green-500',
                                      isToday && hasEntry && 'ring-2 ring-offset-1 ring-green-500'
                                    )}
                                    title={day.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric' })}
                                  >
                                    {day.getDate()}
                                  </div>
                                )
                              }
                              return dots
                            })()}
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-500">
                              {(progress as any).current > 0
                                ? `🔥 Серия ${(progress as any).current} дн`
                                : 'Нет активности'}
                            </span>
                            <span className="text-gray-400">
                              Всего: {metricEntries.filter(e => e.metricId === metric.id).length} дн
                            </span>
                          </div>
                        </div>
                      ) : (
                        // Habit and counter - progress bar display
                        <>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-bold text-gray-900">
                              {(progress as any).current} / {(progress as any).target} {metric.customUnit || ''}
                            </span>
                            <span className="text-sm font-medium text-gray-600">
                              {(progress as any).progress ?? Math.round(((progress as any).current / (progress as any).target) * 100)}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="h-2 rounded-full transition-all duration-300"
                              style={{ 
                                width: `${Math.min(Math.max(((progress as any).current / (progress as any).target) * 100, 0), 100)}%`,
                                backgroundColor: category?.color || metric.color || '#3b82f6'
                              }}
                            />
                          </div>
                        </>
                      )}
                    </div>
              
                    {/* Быстрые действия */}
                    <div className="flex gap-2 pt-3 border-t border-gray-100 mt-auto" onClick={(e) => e.stopPropagation()}>
                      {metric.type === 'simple_habit' ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleQuickHabitEntry(metric)
                          }}
                          disabled={isProcessing[metric.id]}
                          className="flex-1 px-3 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors text-sm font-medium flex items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <CheckCircle className="w-4 h-4" />
                          {progress.current > 0 ? 'Отменить' : 'Выполнить'}
                        </button>
                      ) : metric.type === 'habit' ? (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleQuickCounterEntry(metric, false)
                            }}
                            disabled={isProcessing[metric.id]}
                            className="px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              openQuickEntry(metric)
                            }}
                            disabled={isProcessing[metric.id]}
                            className="flex-1 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium flex items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <PlusCircle className="w-4 h-4" />
                            Запись
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleQuickCounterEntry(metric, true)
                            }}
                            disabled={isProcessing[metric.id]}
                            className="px-3 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleQuickCounterEntry(metric, false)
                            }}
                            disabled={isProcessing[metric.id]}
                            className="px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              openQuickEntry(metric)
                            }}
                            disabled={isProcessing[metric.id]}
                            className="flex-1 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium flex items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <PlusCircle className="w-4 h-4" />
                            Запись
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleQuickCounterEntry(metric, true)
                            }}
                            disabled={isProcessing[metric.id]}
                            className="px-3 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Модальное окно метрики */}
      <Modal
        isOpen={showMetricModal}
        onClose={() => setShowMetricModal(false)}
        title={selectedMetric ? 'Редактировать метрику' : 'Создать метрику'}
        size="large"
      >
        <MetricForm
          initialData={selectedMetric || undefined}
          onSubmit={() => {
            setShowMetricModal(false)
            setSelectedMetric(null)
          }}
          onCancel={() => {
            setShowMetricModal(false)
            setSelectedMetric(null)
          }}
        />
      </Modal>

      {/* Модальное окно быстрого ввода */}
      {/* Metric Analytics Modal */}
      {showAnalyticsModal && analyticsMetric && (
        <MetricAnalyticsModal
          isOpen={showAnalyticsModal}
          onClose={() => {
            setShowAnalyticsModal(false)
            setAnalyticsMetricId(null)
          }}
          metric={analyticsMetric}
        />
      )}

      {/* Улучшенное модальное окно быстрого ввода */}
      {quickEntryMetric && (
        <QuickEntryForm
          metric={quickEntryMetric}
          entries={metricEntries.filter(e => e.metricId === quickEntryMetric.id)}
          isOpen={!!quickEntryMetric}
          onClose={() => {
            setQuickEntryMetric(null)
            setEntryValue('')
          }}
          onSave={async (data) => {
            const metricFromStore = useApiDataStore.getState().metrics.find(m => m.id === quickEntryMetric.id)
            try {
              const signedValue = data.isAddition
                ? Math.abs(data.value)
                : -Math.abs(data.value)
              if (metricFromStore) {
                const allEntries = useApiDataStore.getState().metricEntries.filter(e => e.metricId === quickEntryMetric.id)
                const tempEntry: MetricEntry = {
                  id: 'temp-' + Date.now(),
                  metricId: quickEntryMetric.id,
                  value: signedValue,
                  finalValue: 0,
                  isAddition: signedValue > 0,
                  entryDate: data.entryDate,
                  createdAt: new Date(),
                }
                const optimisticEntries = [...allEntries, tempEntry]
                const optimisticValues = calculateMetricProgress(metricFromStore, optimisticEntries)

                useApiDataStore.setState(state => ({
                  metrics: state.metrics.map(m =>
                    m.id === quickEntryMetric.id
                      ? {
                          ...m,
                          totalValue: optimisticValues.totalValue,
                          periodValue: optimisticValues.isPeriodBased ? optimisticValues.periodValue : undefined,
                          progress: optimisticValues.progress
                        }
                      : m
                  )
                }))
              }

              console.log('[MetricsPage] Saving entry with date:', data.entryDate, 'type:', typeof data.entryDate)
              await createMetricEntry(quickEntryMetric.id, signedValue, data.note || 'Запись', data.entryDate)

              setQuickEntryMetric(null)
              setEntryValue('')
            } catch (err) {
              console.error('Failed to save entry from QuickEntryForm:', err)
              // Откатываем оптимистичное обновление при ошибке
              if (metricFromStore) {
                const allEntries = useApiDataStore.getState().metricEntries.filter(e => e.metricId === quickEntryMetric.id)
                const values = calculateMetricProgress(metricFromStore, allEntries)
                useApiDataStore.setState(state => ({
                  metrics: state.metrics.map(m =>
                    m.id === quickEntryMetric.id
                      ? {
                          ...m,
                          totalValue: values.totalValue,
                          periodValue: values.isPeriodBased ? values.periodValue : undefined,
                          progress: values.progress
                        }
                      : m
                  )
                }))
              }
              alert('Ошибка при сохранении записи: ' + (err instanceof Error ? err.message : 'Неизвестная ошибка'))
            }
          }}
          mode={parseFloat(entryValue) >= 0 ? 'add' : 'subtract'}
        />
      )}
    </div>
  )
}
