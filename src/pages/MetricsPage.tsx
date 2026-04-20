import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Plus, Search, Filter, TrendingUp, Flame, Target, Calendar, ChevronDown, ChevronUp, 
  Edit, Trash2, BarChart3, Activity, CheckCircle, Minus, PlusCircle, MoreVertical,
  FlameIcon, ArrowUp, ArrowDown
} from 'lucide-react'
import { useApiDataStore } from '@/stores/apiDataStore'
import { Modal } from '@/components/Modal'
import { MetricForm } from '@/components/forms/MetricForm'
import { MetricAnalyticsModal } from '@/components/MetricAnalyticsModal'
import { QuickEntryForm } from '@/components/forms/QuickEntryForm'
import { calculateCurrentStreak } from '@/lib/calculations'
import { cn, formatDate } from '@/lib/utils'
import type { Metric, MetricEntry, Category } from '@/types'

type FilterType = 'all' | 'habits' | 'counters'
type ViewMode = 'cards' | 'analytics'

export function MetricsPage() {
  const navigate = useNavigate()
  const { 
    metrics, 
    metricEntries,
    categories,
    createMetric,
    updateMetric,
    deleteMetric,
    createMetricEntry,
    isLoading 
  } = useApiDataStore()

  const [filter, setFilter] = useState<FilterType>('all')
  const [viewMode, setViewMode] = useState<ViewMode>('cards')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  
  // Модальные окна
  const [showMetricModal, setShowMetricModal] = useState(false)
  const [selectedMetric, setSelectedMetric] = useState<Metric | null>(null)
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false)
  const [analyticsMetricId, setAnalyticsMetricId] = useState<string | null>(null)
  const [quickEntryMetric, setQuickEntryMetric] = useState<Metric | null>(null)
  const [entryValue, setEntryValue] = useState('')

  // Фильтрация метрик
  const filteredMetrics = useMemo(() => {
    return metrics.filter((metric) => {
      const matchesType = filter === 'all' || 
    (filter === 'habits' && metric.type === 'habit') || 
    (filter === 'counters' && metric.type === 'counter')
      const matchesSearch = !searchQuery || metric.name.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesCategory = !selectedCategory || metric.categoryId === selectedCategory
      return matchesType && matchesSearch && matchesCategory
    })
  }, [metrics, filter, searchQuery, selectedCategory])

  // Статистика
  const stats = useMemo(() => {
    const habits = metrics.filter(m => m.type === 'habit')
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

  // Получить прогресс метрики
  const getMetricProgress = (metric: Metric) => {
    const entries = metricEntries.filter(e => e.metricId === metric.id)
    
    if (metric.type === 'habit') {
      // Для привычек: текущая серия (по дням, а не по записям)
      const streak = calculateCurrentStreak(entries, metric.periodicity)
      return { 
        current: streak, 
        target: metric.targetValue || 30,
        text: `${streak} дней подряд`
      }
    } else {
      // Для счетчиков: текущее значение
      const totalValue = entries.reduce((sum, e) => sum + (e.value || 0), 0)
      const progress = metric.targetValue > 0 ? Math.round((totalValue / metric.targetValue) * 100) : 0
      return { 
        current: totalValue, 
        target: metric.targetValue,
        progress,
        text: `${totalValue} / ${metric.targetValue} ${metric.customUnit || ''}`
      }
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
    try {
      const today = new Date()
      console.log('Creating habit entry for metric:', metric.id, metric.name)
      await createMetricEntry({
        metricId: metric.id,
        value: 1,
        finalValue: 1,
        entryDate: today,
        isAddition: true,
        note: 'Быстрая отметка'
      })
      console.log('Habit entry created successfully')
    } catch (err) {
      console.error('Failed to create habit entry:', err)
      alert('Ошибка при сохранении: ' + (err instanceof Error ? err.message : 'Неизвестная ошибка'))
    }
  }

  // Быстрый ввод для счетчика
  const handleQuickCounterEntry = async (metric: Metric, isAddition: boolean) => {
    try {
      const value = metric.stepValue || 1
      const today = new Date()
      
      // Calculate current total from existing entries
      const entries = metricEntries.filter(e => e.metricId === metric.id)
      const startValue = metric.startValue || 0
      const currentTotal = entries.reduce((sum, e) => 
        sum + (e.isAddition ? e.value : -e.value), 0
      )
      const previousTotal = startValue + currentTotal
      const newTotal = isAddition ? previousTotal + value : Math.max(0, previousTotal - value)
      
      console.log('Creating counter entry for metric:', metric.id, 'delta:', isAddition ? value : -value, 'new total:', newTotal)
      await createMetricEntry({
        metricId: metric.id,
        value: isAddition ? value : -value,
        finalValue: newTotal,
        entryDate: today,
        isAddition,
        note: 'Быстрое изменение'
      })
      console.log('Counter entry created successfully')
    } catch (err) {
      console.error('Failed to create counter entry:', err)
      alert('Ошибка при сохранении: ' + (err instanceof Error ? err.message : 'Неизвестная ошибка'))
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
      const entryDate = e.entryDate as unknown as string | Date
      const date = typeof entryDate === 'string' 
        ? entryDate.split('T')[0] 
        : new Date(entryDate).toISOString().split('T')[0]
      data[date] = (data[date] || 0) + (e.value || 0)
    })
    
    return data
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Метрики</h1>
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

              {/* Вид */}
              <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
                <button
                  onClick={() => setViewMode('cards')}
                  className={cn(
                    "p-2 transition-colors",
                    viewMode === 'cards' ? "bg-blue-500 text-white" : "hover:bg-gray-100"
                  )}
                >
                  <Activity className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('analytics')}
                  className={cn(
                    "p-2 transition-colors",
                    viewMode === 'analytics' ? "bg-blue-500 text-white" : "hover:bg-gray-100"
                  )}
                >
                  <BarChart3 className="w-4 h-4" />
                </button>
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
        ) : viewMode === 'cards' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMetrics.map(metric => {
              const category = getCategory(metric.categoryId)
              const progress = getMetricProgress(metric)
              const heatmapData = metric.type === 'habit' ? getHeatmapData(metric.id) : null

              return (
                <div
                  key={metric.id}
                  onClick={() => openAnalytics(metric)}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-all group cursor-pointer"
                >
                  <div className="p-5">
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
                          metric.type === 'habit' 
                            ? "bg-orange-100 text-orange-700"
                            : "bg-blue-100 text-blue-700"
                        )}>
                          {metric.type === 'habit' ? (
                            <>
                              <Flame className="w-3 h-3" />
                              Привычка
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
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">
                          {metric.type === 'habit' ? 'Текущая серия' : 'Текущее значение'}
                        </span>
                        <span className="text-sm font-bold text-gray-900">
                          {metric.type === 'habit' 
                            ? `${progress.current} дней`
                            : `${(progress as any).current} / ${(progress as any).target}`
                          }
                        </span>
                      </div>
                      {metric.type === 'counter' && (
                        <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                          <div 
                            className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${(progress as any).progress}%` }}
                          />
                        </div>
                      )}
                      <p className="text-xs text-gray-500">{progress.text}</p>
                    </div>


                    {/* Быстрые действия */}
                    <div className="flex gap-2 pt-3 border-t border-gray-100" onClick={(e) => e.stopPropagation()}>
                      {metric.type === 'habit' ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleQuickHabitEntry(metric)
                          }}
                          className="flex-1 px-3 py-2 bg-orange-50 text-orange-600 rounded-lg hover:bg-orange-100 transition-colors text-sm font-medium flex items-center justify-center gap-1"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Отметить
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleQuickCounterEntry(metric, false)
                            }}
                            className="px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              if (metric.inputMode === 'manual') {
                                openQuickEntry(metric)
                              } else {
                                handleQuickCounterEntry(metric, true)
                              }
                            }}
                            className="flex-1 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium flex items-center justify-center gap-1"
                          >
                            <PlusCircle className="w-4 h-4" />
                            {metric.inputMode === 'manual' ? 'Записать' : '+ Шаг'}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleQuickCounterEntry(metric, true)
                            }}
                            className="px-3 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors text-sm font-medium"
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
        ) : (
          /* Analytics View */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredMetrics.map(metric => {
              const progress = getMetricProgress(metric)
              const entries = metricEntries.filter(e => e.metricId === metric.id)
              
              // Prepare chart data
              const chartData = entries.slice(0, 30).map(entry => ({
                date: new Date(entry.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }),
                value: entry.value
              }))

              return (
                <div 
                  key={metric.id} 
                  onClick={() => openAnalytics(metric)}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 cursor-pointer hover:shadow-md transition-all"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-gray-900">{metric.name}</h3>
                      <p className="text-sm text-gray-500">{metric.type === 'habit' ? 'Привычка' : 'Счётчик'}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-900">
                        {metric.type === 'habit' ? `${progress.current} дней` : `${(progress as any).progress}%`}
                      </div>
                      <p className="text-xs text-gray-500">{progress.text}</p>
                    </div>
                  </div>

                  {/* Simple Bar Chart */}
                  {chartData.length > 0 ? (
                    <div className="h-48">
                      <div className="flex items-end gap-1 h-full">
                        {chartData.map((item, i) => {
                          const maxValue = Math.max(...chartData.map(d => d.value))
                          const height = maxValue > 0 ? (item.value / maxValue) * 100 : 0
                          return (
                            <div
                              key={i}
                              className="flex-1 flex flex-col items-center gap-1"
                            >
                              <div 
                                className="w-full bg-blue-500 rounded-t transition-all duration-300 hover:bg-blue-600"
                                style={{ height: `${Math.max(height, 5)}%` }}
                                title={`${item.date}: ${item.value}`}
                              />
                              <span className="text-xs text-gray-400 rotate-45 origin-bottom-left">
                                {i % 5 === 0 ? item.date : ''}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="h-48 flex items-center justify-center text-gray-400">
                      <p>Нет данных для отображения</p>
                    </div>
                  )}

                  {/* Quick Actions */}
                  <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
                    {metric.type === 'habit' ? (
                      <button
                        onClick={() => handleQuickHabitEntry(metric)}
                        className="flex-1 px-3 py-2 bg-orange-50 text-orange-600 rounded-lg hover:bg-orange-100 transition-colors text-sm font-medium flex items-center justify-center gap-1"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Отметить
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => handleQuickCounterEntry(metric, false)}
                          className="px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleQuickCounterEntry(metric, true)}
                          className="flex-1 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium flex items-center justify-center gap-1"
                        >
                          <PlusCircle className="w-4 h-4" />
                          + Шаг
                        </button>
                      </>
                    )}
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
      {showAnalyticsModal && analyticsMetricId && (
        <MetricAnalyticsModal
          isOpen={showAnalyticsModal}
          onClose={() => {
            setShowAnalyticsModal(false)
            setAnalyticsMetricId(null)
          }}
          metric={metrics.find(m => m.id === analyticsMetricId)!}
        />
      )}

      {/* Улучшенное модальное окно быстрого ввода */}
      {quickEntryMetric && (
        <QuickEntryForm
          isOpen={!!quickEntryMetric}
          onClose={() => {
            setQuickEntryMetric(null)
            setEntryValue('')
          }}
          metric={quickEntryMetric}
          entries={metricEntries.filter(e => e.metricId === quickEntryMetric.id)}
          onSave={async (data) => {
            try {
              console.log('QuickEntryForm onSave called with:', data)
              await createMetricEntry({
                metricId: quickEntryMetric.id,
                value: data.value,
                finalValue: data.finalValue,
                note: data.note,
                entryDate: data.entryDate,
                isAddition: data.isAddition
              })
              console.log('Entry saved successfully via QuickEntryForm')
              setQuickEntryMetric(null)
              setEntryValue('')
            } catch (err) {
              console.error('Failed to save entry from QuickEntryForm:', err)
              alert('Ошибка при сохранении записи: ' + (err instanceof Error ? err.message : 'Неизвестная ошибка'))
            }
          }}
          mode={parseFloat(entryValue) >= 0 ? 'add' : 'subtract'}
        />
      )}
    </div>
  )
}

