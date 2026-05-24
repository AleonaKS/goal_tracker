import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Search, Filter, Plus, MoreVertical, Calendar, Target, CheckCircle, AlertCircle, 
  Clock, ChevronDown, ChevronUp, Edit, Trash2, Flag, ArrowUpDown, TrendingUp,
  LayoutGrid, List, Bookmark, X, Snowflake, Activity
} from 'lucide-react'
import { useApiDataStore } from '@/stores/apiDataStore'
import { Modal } from '@/components/Modal'
import { GoalForm } from '@/components/forms/GoalForm'
import { TaskForm } from '@/components/forms/TaskForm'
import { MetricForm } from '@/components/forms/MetricForm'
import { cn, formatDate, getEntriesForCurrentPeriod } from '@/lib/utils'
import { calculateGoalStatusFromGoal } from '@/lib/calculations'
import type { Goal, Task, Metric, Category } from '@/types'

type GoalStatus = 'planned' | 'in_progress' | 'completed' | 'overdue' | 'frozen'
type GoalSortField = 'name' | 'deadline' | 'priority' | 'progress' | 'createdAt'
type SortOrder = 'asc' | 'desc'

export function GoalsPage() {
  const navigate = useNavigate()
  const { 
    goals, 
    categories, 
    tasks, 
    stages,
    metrics,
    metricEntries,
    favoriteFilters,
    createGoal, 
    updateGoal, 
    deleteGoal,
    createTask,
    updateTask,
    deleteTask,
    createMetric,
    updateMetric,
    deleteMetric,
    createFavoriteFilter,
    deleteFavoriteFilter 
  } = useApiDataStore()

  // Поиск и фильтры
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [selectedStatus, setSelectedStatus] = useState<GoalStatus | ''>('')
  const [selectedPriority, setSelectedPriority] = useState<number | ''>('')
  
  // Сортировка
  const [sortField, setSortField] = useState<GoalSortField>('deadline')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')
  
  // Вид отображения
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [expandedFilters, setExpandedFilters] = useState(false)

  // FAB меню
  const [showFabMenu, setShowFabMenu] = useState(false)

  // Модальные окна
  const [showGoalModal, setShowGoalModal] = useState(false)
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [showMetricModal, setShowMetricModal] = useState(false)
  const [showFilterModal, setShowFilterModal] = useState(false)
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [selectedMetric, setSelectedMetric] = useState<Metric | null>(null)
  const [selectedGoalId, setSelectedGoalId] = useState<string>('')

  // Получить прогресс цели
  const getGoalProgress = (goal: Goal): { percent: number; text: string } => {
    if (goal.progressCalculation === 'by_metric' && goal.progressMetricId) {
      // Прогресс по счетчику
      const metric = metrics.find(m => m.id === goal.progressMetricId)
      if (metric) {
        const entries = metricEntries.filter(e => e.metricId === metric.id)
        const isHabitWithPeriodicity = (metric.type === 'habit' || metric.type === 'simple_habit') && metric.autoResetEnabled && metric.resetPeriodicity
        let displayValue = entries.reduce((sum, e) => sum + (e.value || 0), 0)
        if (isHabitWithPeriodicity) {
          const periodEntries = getEntriesForCurrentPeriod(
            entries,
            metric.resetPeriodicity,
            metric.resetCustomDays,
            metric.resetWeekdays
          )
          displayValue = periodEntries.reduce((sum, e) => sum + (e.value || 0), 0)
        }
        const percent = metric.targetValue > 0 ? Math.min(100, Math.round((displayValue / metric.targetValue) * 100)) : 0
        return {
          percent,
          text: `${displayValue} из ${metric.targetValue} ${metric.unit || ''}`
        }
      }
    } else {
      // Прогресс по задачам - include tasks via stages
      const goalStageIds = stages.filter(s => s.goalId === goal.id).map(s => s.id)
      const goalTasks = tasks.filter(t => 
        t.goalId === goal.id || (t.stageId && goalStageIds.includes(t.stageId))
      )
      const totalWeight = goalTasks.reduce((sum, t) => sum + (t.weight || 1), 0)
      const completedWeight = goalTasks
        .filter(t => t.completed)
        .reduce((sum, t) => sum + (t.weight || 1), 0)
      const percent = totalWeight > 0 ? Math.round((completedWeight / totalWeight) * 100) : 0
      const completedCount = goalTasks.filter(t => t.completed).length
      return {
        percent,
        text: `${completedCount} из ${goalTasks.length} задач`
      }
    }
    return { percent: goal.progress || 0, text: `${goal.progress || 0}%` }
  }

  // Получить эффективный статус цели
  const getEffectiveStatus = (goal: Goal): GoalStatus => {
    const progress = getGoalProgress(goal).percent
    return calculateGoalStatusFromGoal({ ...goal, progress })
  }

  // Статистика
  const stats = useMemo(() => ({
    total: goals.length,
    in_progress: goals.filter(g => getEffectiveStatus(g) === 'in_progress').length,
    completed: goals.filter(g => getEffectiveStatus(g) === 'completed').length,
    overdue: goals.filter(g => getEffectiveStatus(g) === 'overdue').length,
    planned: goals.filter(g => getEffectiveStatus(g) === 'planned').length,
    frozen: goals.filter(g => getEffectiveStatus(g) === 'frozen').length,
  }), [goals])

  // Фильтрация и сортировка целей
  const filteredGoals = useMemo(() => {
    let result = goals.filter(goal => {
      const matchesSearch = !searchQuery || goal.name.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesCategory = !selectedCategory || goal.categoryId === selectedCategory
      const matchesStatus = !selectedStatus || getEffectiveStatus(goal) === selectedStatus
      const matchesPriority = !selectedPriority || goal.priority === selectedPriority
      return matchesSearch && matchesCategory && matchesStatus && matchesPriority
    })

    // Сортировка
    result = [...result].sort((a, b) => {
      let comparison = 0
      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name)
          break
        case 'priority':
          comparison = (b.priority || 0) - (a.priority || 0)
          break
        case 'deadline':
          const getDeadlineTime = (goal: Goal) => {
            if (goal.deadlineType === 'specific_date' && goal.deadlineValue) {
              return new Date(goal.deadlineValue).getTime()
            }
            return Infinity
          }
          comparison = getDeadlineTime(a) - getDeadlineTime(b)
          break
        case 'progress':
          comparison = (b.progress || 0) - (a.progress || 0)
          break
        case 'createdAt':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          break
      }
      return sortOrder === 'asc' ? comparison : -comparison
    })

    return result
  }, [goals, searchQuery, selectedCategory, selectedStatus, selectedPriority, sortField, sortOrder])

  // Получить категорию
  const getCategory = (categoryId?: string): Category | undefined => {
    return categories.find(c => c.id === categoryId)
  }

  // Получить цвет статуса
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'in_progress': return 'bg-blue-100 text-blue-700'
      case 'completed': return 'bg-green-100 text-green-700'
      case 'overdue': return 'bg-red-100 text-red-700'
      case 'planned': return 'bg-gray-100 text-gray-700'
      case 'frozen': return 'bg-cyan-100 text-cyan-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  // Получить иконку статуса
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'in_progress': return Clock
      case 'completed': return CheckCircle
      case 'overdue': return AlertCircle
      case 'planned': return Calendar
      case 'frozen': return Snowflake
      default: return Target
    }
  }

  // Цвет флажка приоритета
  const getPriorityColor = (priority: number): string => {
    switch (priority) {
      case 1: return 'text-blue-500'
      case 2: return 'text-yellow-500'
      case 3: return 'text-red-500'
      default: return 'text-gray-300'
    }
  }

  // Обработчики
  const handleCreateGoal = () => {
    setSelectedGoal(null)
    setShowGoalModal(true)
  }

  const handleEditGoal = (goal: Goal) => {
    setSelectedGoal(goal)
    setShowGoalModal(true)
  }

  const handleDeleteGoal = async (goalId: string) => {
    if (confirm('Вы уверены, что хотите удалить эту цель?')) {
      await deleteGoal(goalId)
    }
  }

  const handleCreateTask = (goalId: string) => {
    setSelectedGoalId(goalId)
    setSelectedTask(null)
    setShowTaskModal(true)
  }

  const handleEditTask = (task: Task) => {
    setSelectedGoalId(task.goalId || '')
    setSelectedTask(task)
    setShowTaskModal(true)
  }

  const handleCreateMetric = (goalId: string) => {
    setSelectedGoalId(goalId)
    setSelectedMetric(null)
    setShowMetricModal(true)
  }

  const handleEditMetric = (metric: Metric) => {
    setSelectedGoalId(metric.goalId || '')
    setSelectedMetric(metric)
    setShowMetricModal(true)
  }

  const handleToggleSort = (field: GoalSortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  const hasActiveFilters = searchQuery || selectedCategory || selectedStatus || selectedPriority

  const clearFilters = () => {
    setSearchQuery('')
    setSelectedCategory('')
    setSelectedStatus('')
    setSelectedPriority('')
  }

  const handleSaveCustomFilter = async () => {
    const filterName = prompt('Введите название для пользовательского фильтра:')
    if (!filterName) return

    const currentFilters = {
      searchQuery,
      categoryId: selectedCategory,
      status: selectedStatus,
      priority: selectedPriority,
      sortField,
      sortOrder
    }

    // Only save non-empty filters
    const filterValue = Object.fromEntries(
      Object.entries(currentFilters).filter(([_, value]) => value !== '' && value !== undefined)
    )

    if (Object.keys(filterValue).length === 0) {
      alert('Нет активных фильтров для сохранения')
      return
    }

    await createFavoriteFilter({
      name: filterName,
      filterType: 'goals',
      filterValue,
      sortBy: sortField,
      sortOrder
    })
  }

  const handleApplyCustomFilter = (filter: any) => {
    const filters = filter.filterValue as Record<string, string>
    
    // Apply all saved filters
    if (filters.searchQuery) setSearchQuery(filters.searchQuery)
    if (filters.categoryId) setSelectedCategory(filters.categoryId)
    if (filters.status) setSelectedStatus(filters.status as GoalStatus)
    if (filters.priority) setSelectedPriority(filters.priority ? Number(filters.priority) : '')
    if (filters.sortField) setSortField(filters.sortField as GoalSortField)
    if (filters.sortOrder) setSortOrder(filters.sortOrder as SortOrder)
  }

  // ИСПРАВЛЕНИЕ: Убрали проверку isLoading чтобы не было мигания
  // при CRUD операциях (createGoal, updateGoal и т.д.)
  // if (isLoading) {
  //   return (
  //     <div className="flex items-center justify-center h-64">
  //       <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
  //     </div>
  //   )
  // }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        {/* Статистика */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 text-center">
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-sm text-gray-500">Всего</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.in_progress}</div>
            <div className="text-sm text-gray-500">В процессе</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
            <div className="text-sm text-gray-500">Завершено</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 text-center">
            <div className="text-2xl font-bold text-red-600">{stats.overdue}</div>
            <div className="text-sm text-gray-500">Просрочено</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 text-center">
            <div className="text-2xl font-bold text-cyan-600">{stats.frozen}</div>
            <div className="text-sm text-gray-500">Заморожено</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 text-center">
            <div className="text-2xl font-bold text-gray-600">{stats.planned}</div>
            <div className="text-sm text-gray-500">Запланировано</div>
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
                placeholder="Поиск целей..."
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

              {/* Статус */}
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as GoalStatus | '')}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                <option value="">Все статусы</option>
                <option value="planned">Запланировано</option>
                <option value="in_progress">В процессе</option>
                <option value="completed">Завершено</option>
                <option value="overdue">Просрочено</option>
              </select>

              {/* Приоритет */}
              <select
                value={selectedPriority}
                onChange={(e) => setSelectedPriority(e.target.value ? Number(e.target.value) : '')}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                <option value="">Все приоритеты</option>
                <option value={1}>Критический</option>
                <option value={2}>Высокий</option>
                <option value={3}>Средний</option>
                <option value={4}>Низкий</option>
                <option value={5}>Минимальный</option>
              </select>

              {/* Сортировка */}
              <div className="flex items-center gap-1 border border-gray-300 rounded-lg px-2">
                <ArrowUpDown className="w-4 h-4 text-gray-500" />
                <select
                  value={`${sortField}-${sortOrder}`}
                  onChange={(e) => {
                    const [field, order] = e.target.value.split('-') as [GoalSortField, SortOrder]
                    setSortField(field)
                    setSortOrder(order)
                  }}
                  className="py-2 focus:outline-none text-sm bg-transparent"
                >
                  <option value="deadline-asc">Срок ↑</option>
                  <option value="deadline-desc">Срок ↓</option>
                  <option value="priority-asc">Приоритет ↑</option>
                  <option value="priority-desc">Приоритет ↓</option>
                  <option value="progress-asc">Прогресс ↑</option>
                  <option value="progress-desc">Прогресс ↓</option>
                  <option value="name-asc">Название А-Я</option>
                  <option value="name-desc">Название Я-А</option>
                </select>
              </div>

              {/* Вид */}
              <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
                <button
                  onClick={() => setViewMode('grid')}
                  className={cn(
                    "p-2 transition-colors",
                    viewMode === 'grid' ? "bg-blue-500 text-white" : "hover:bg-gray-100"
                  )}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={cn(
                    "p-2 transition-colors",
                    viewMode === 'list' ? "bg-blue-500 text-white" : "hover:bg-gray-100"
                  )}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>

              {/* Сохранить фильтр */}
              {hasActiveFilters && (
                <button
                  onClick={handleSaveCustomFilter}
                  className="px-3 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors text-sm flex items-center gap-1"
                  title="Сохранить текущий фильтр"
                >
                  <Bookmark className="w-4 h-4" />
                  Сохранить
                </button>
              )}

              {/* Очистить фильтры */}
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Пользовательские фильтры */}
          {favoriteFilters.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-200">
              <span className="text-sm text-gray-500 py-1">Мои фильтры:</span>
              {favoriteFilters.map(filter => (
                <div
                  key={filter.id}
                  className="flex items-center gap-1 px-3 py-1 bg-yellow-50 text-yellow-700 rounded-lg text-sm hover:bg-yellow-100 transition-colors group"
                >
                  <button
                    onClick={() => handleApplyCustomFilter(filter)}
                    className="flex items-center gap-1 flex-1"
                  >
                    <Bookmark className="w-3 h-3" />
                    {filter.name}
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Удалить фильтр "${filter.name}"?`)) {
                        deleteFavoriteFilter(filter.id)
                      }
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-yellow-200 rounded"
                    title="Удалить фильтр"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Список целей */}
      <div className="max-w-7xl mx-auto">
        {filteredGoals.length === 0 ? (
          <div className="text-center py-12">
            <Target className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Нет целей</h3>
            <p className="text-gray-500 mb-4">
              {hasActiveFilters ? 'Попробуйте изменить фильтры' : 'Создайте первую цель'}
            </p>
            {!hasActiveFilters && (
              <button
                onClick={handleCreateGoal}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Создать цель
              </button>
            )}
          </div>
        ) : (
          <div className={cn(
            "grid gap-4",
            viewMode === 'grid' 
              ? "grid-cols-1 md:grid-cols-2 xl:grid-cols-3" 
              : "grid-cols-1"
          )}>
            {filteredGoals.map(goal => {
              const category = getCategory(goal.categoryId)
              const progress = getGoalProgress(goal)
              const effectiveStatus = getEffectiveStatus(goal)
              const StatusIcon = getStatusIcon(effectiveStatus)

              return (
                <div
                  key={goal.id}
                  className={cn(
                    "bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-all cursor-pointer group",
                    viewMode === 'list' && "flex items-center gap-4 p-4"
                  )}
                  onClick={() => navigate(`/goals/${goal.id}`)}
                >
                  {/* Карточка цели */}
                  <div className={cn(
                    "p-5",
                    viewMode === 'list' && "flex-1 p-0"
                  )}>
                    {/* Верхняя часть: категория и статус */}
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
                          getStatusColor(effectiveStatus)
                        )}>
                          <StatusIcon className="w-3 h-3" />
                          {effectiveStatus === 'in_progress' && 'В процессе'}
                          {effectiveStatus === 'completed' && 'Завершено'}
                          {effectiveStatus === 'overdue' && 'Просрочено'}
                          {effectiveStatus === 'planned' && 'Запланировано'}
                          {effectiveStatus === 'frozen' && 'Заморожено'}
                        </div>
                        <Flag className={cn("w-4 h-4", getPriorityColor(goal.priority))} />
                      </div>
                      
                      {/* Действия */}
                      <div 
                        className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => handleEditGoal(goal)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteGoal(goal.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Название и описание */}
                    <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">{goal.name}</h3>
                    <div className="min-h-[2.5rem] mb-3">
                      {goal.description ? (
                        <p className="text-sm text-gray-500 line-clamp-2">{goal.description}</p>
                      ) : (
                        <p className="text-sm text-transparent select-none">&nbsp;</p>
                      )}
                    </div>

                    {/* Прогресс */}
                    <div className="mb-2">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">Прогресс</span>
                        <span className="text-sm font-bold text-gray-900">{progress.percent}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                        <div
                          className="h-2 rounded-full transition-all duration-300"
                          style={{
                            width: `${Math.min(Math.max(progress.percent, 0), 100)}%`,
                            backgroundColor: category?.color || '#3b82f6'
                          }}
                        />
                      </div>
                      <p className="text-xs text-gray-500">{progress.text}</p>
                    </div>

                    {/* Дата дедлайна — справа внизу */}
                    <div className="flex items-center justify-end gap-3 text-sm text-gray-400 mb-4">
                      {goal.deadlineType === 'specific_date' && goal.deadlineValue && (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{formatDate(goal.deadlineValue)}</span>
                        </div>
                      )}
                      {goal.deadlineType === 'month_year' && goal.deadlineValue && (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{String(goal.deadlineValue)}</span>
                        </div>
                      )}
                      {goal.deadlineType === 'year' && goal.deadlineValue && (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{String(goal.deadlineValue)}</span>
                        </div>
                      )}
                    </div>

                    {/* Быстрые действия */}
                    <div 
                      className="flex gap-2 pt-3 border-t border-gray-100"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => handleCreateTask(goal.id)}
                        className="flex-1 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
                      >
                        + Задача
                      </button>
                      <button
                        onClick={() => handleCreateMetric(goal.id)}
                        className="flex-1 px-3 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors text-sm font-medium"
                      >
                        + Метрика
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Модальное окно цели */}
      <Modal
        isOpen={showGoalModal}
        onClose={() => setShowGoalModal(false)}
        title={selectedGoal ? 'Редактировать цель' : 'Создать цель'}
        size="large"
      >
        <GoalForm
          initialData={selectedGoal || undefined}
          onSubmit={() => {
            setShowGoalModal(false)
            setSelectedGoal(null)
          }}
          onCancel={() => {
            setShowGoalModal(false)
            setSelectedGoal(null)
          }}
        />
      </Modal>

      {/* Модальное окно задачи */}
      <Modal
        isOpen={showTaskModal}
        onClose={() => setShowTaskModal(false)}
        title={selectedTask ? 'Редактировать задачу' : 'Создать задачу'}
        size="large"
      >
        <TaskForm
          initialData={selectedTask || undefined}
          goalId={selectedGoalId}
          onSubmit={() => {
            setShowTaskModal(false)
            setSelectedTask(null)
          }}
          onCancel={() => {
            setShowTaskModal(false)
            setSelectedTask(null)
          }}
        />
      </Modal>

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

      {/* FAB + Menu */}
      <div className="fixed bottom-6 right-6 flex flex-col items-end gap-3 z-50">
        {showFabMenu && (
          <>
            <button
              onClick={() => {
                setShowFabMenu(false)
                setSelectedGoal(null)
                setShowGoalModal(true)
              }}
              className="flex items-center gap-3 bg-white shadow-lg rounded-full px-5 py-3 text-gray-700 hover:bg-gray-50 transition-all border border-gray-200"
            >
              <Target className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium whitespace-nowrap">Добавить цель</span>
            </button>
            <button
              onClick={() => {
                setShowFabMenu(false)
                setSelectedGoalId('')
                setSelectedTask(null)
                setShowTaskModal(true)
              }}
              className="flex items-center gap-3 bg-white shadow-lg rounded-full px-5 py-3 text-gray-700 hover:bg-gray-50 transition-all border border-gray-200"
            >
              <CheckCircle className="w-5 h-5 text-purple-600" />
              <span className="text-sm font-medium whitespace-nowrap">Добавить задачу</span>
            </button>
            <button
              onClick={() => {
                setShowFabMenu(false)
                setSelectedGoalId('')
                setSelectedMetric(null)
                setShowMetricModal(true)
              }}
              className="flex items-center gap-3 bg-white shadow-lg rounded-full px-5 py-3 text-gray-700 hover:bg-gray-50 transition-all border border-gray-200"
            >
              <Activity className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium whitespace-nowrap">Добавить метрику</span>
            </button>
          </>
        )}
        <button
          onClick={() => setShowFabMenu(!showFabMenu)}
          className="w-14 h-14 bg-blue-500 text-white rounded-full shadow-lg hover:bg-blue-600 transition-all flex items-center justify-center"
        >
          {showFabMenu ? <X className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
        </button>
      </div>
    </div>
  )
}

