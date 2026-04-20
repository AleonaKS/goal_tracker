import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Target, Calendar, CheckCircle, Circle, AlertCircle, Clock, TrendingUp, Flame, ChevronDown, ChevronUp, Edit2, Trash2 } from 'lucide-react'
import { useApiDataStore } from '@/stores/apiDataStore'
import { Modal } from '@/components/Modal'
import { GoalForm } from '@/components/forms/GoalForm'
import { TaskForm } from '@/components/forms/TaskForm'
import { MetricForm } from '@/components/forms/MetricForm'
import { MetricAnalyticsModal } from '@/components/MetricAnalyticsModal'
import { cn, formatDate, getStatusLabel, getStatusColor } from '@/lib/utils'
import type { Goal, Task, Metric, Achievement, Category } from '@/types'

export function DashboardPage() {
  const navigate = useNavigate()
  const { 
    goals, 
    tasks, 
    metrics, 
    categories,
    metricEntries,
    createGoal,
    updateGoal,
    deleteGoal,
    createTask,
    updateTask,
    deleteTask,
    createMetric,
    updateMetric,
    deleteMetric,
    isLoading 
  } = useApiDataStore()
  
  const [showGoalModal, setShowGoalModal] = useState(false)
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [showMetricModal, setShowMetricModal] = useState(false)
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [selectedMetric, setSelectedMetric] = useState<Metric | null>(null)
  const [expandedGoals, setExpandedGoals] = useState(false)
  const [expandedTasks, setExpandedTasks] = useState(false)
  const [achievementFilter, setAchievementFilter] = useState<'all' | 'habits' | 'counters' | 'tasks'>('all')
  const [showMetricAnalytics, setShowMetricAnalytics] = useState(false)
  const [analyticsMetricId, setAnalyticsMetricId] = useState<string | null>(null)

  // Статистика целей
  const goalStats = useMemo(() => ({
    in_progress: goals.filter(g => g.status === 'in_progress').length,
    completed: goals.filter(g => g.status === 'completed').length,
    overdue: goals.filter(g => g.status === 'overdue').length,
    planned: goals.filter(g => g.status === 'planned').length,
  }), [goals])

  // Helper для конвертации Date в строку
  const toISOString = (date: Date | string | undefined): string => {
    if (!date) return new Date().toISOString()
    if (typeof date === 'string') return date
    return date.toISOString()
  }

  // Ближайшие цели
  const upcomingGoals = useMemo(() => {
    const goalDeadlines: Array<{
      id: string
      title: string
      date: string
      item: Goal
      priority?: number
    }> = []

    goals.forEach(goal => {
      if (goal.dueDate || goal.dueMonthYear || goal.dueYear) {
        goalDeadlines.push({
          id: goal.id,
          title: goal.name,
          date: toISOString(goal.dueDate),
          item: goal,
          priority: goal.priority
        })
      }
    })

    // Сортируем: сначала просроченные, потом по дате
    const now = new Date().getTime()
    return goalDeadlines.sort((a, b) => {
      const dateA = new Date(a.date).getTime()
      const dateB = new Date(b.date).getTime()
      const aOverdue = dateA < now
      const bOverdue = dateB < now
      
      if (aOverdue && !bOverdue) return -1
      if (!aOverdue && bOverdue) return 1
      return dateA - dateB
    })
  }, [goals])

  // Ближайшие задачи
  const upcomingTasks = useMemo(() => {
    const taskDeadlines: Array<{
      id: string
      title: string
      date: string
      item: Task
      priority?: number
    }> = []

    tasks.filter(t => !t.completed).forEach(task => {
      if (task.dueDate) {
        taskDeadlines.push({
          id: task.id,
          title: task.name,
          date: toISOString(task.dueDate),
          item: task,
          priority: task.priority
        })
      }
    })

    // Сортируем: сначала просроченные, потом по дате
    const now = new Date().getTime()
    return taskDeadlines.sort((a, b) => {
      const dateA = new Date(a.date).getTime()
      const dateB = new Date(b.date).getTime()
      const aOverdue = dateA < now
      const bOverdue = dateB < now
      
      if (aOverdue && !bOverdue) return -1
      if (!aOverdue && bOverdue) return 1
      return dateA - dateB
    })
  }, [tasks])

  // Достижения
  const achievements = useMemo(() => {
    const result: Achievement[] = []

    // Привычки с сериями кратными 10
    metrics.filter(m => m.type === 'habit').forEach(habit => {
      const entries = metricEntries.filter(e => e.metricId === habit.id)
      const streak = entries.length // Упрощенный расчет
      
      if (streak > 0 && streak % 10 === 0) {
        result.push({
          id: habit.id,
          userId: habit.userId,
          type: 'habit_streak',
          title: `${streak} выполнений подряд`,
          description: habit.name,
          value: streak,
          referenceId: habit.id,
          createdAt: new Date()
        })
      }
    })

    // Прогресс счетчиков (показываем только если есть прогресс)
    metrics.filter(m => m.type === 'counter').forEach(counter => {
      const entries = metricEntries.filter(e => e.metricId === counter.id)
      const totalValue = entries.reduce((sum, e) => sum + (e.value || 0), 0)
      const progress = counter.targetValue > 0 ? Math.round((totalValue / counter.targetValue) * 100) : 0
      
      // Показываем только если есть записи
      if (entries.length > 0) {
        result.push({
          id: counter.id,
          userId: counter.userId,
          type: 'counter_progress',
          title: `${progress}%`,
          description: counter.name,
          value: progress,
          referenceId: counter.id,
          createdAt: new Date()
        })
      }
    })

    // Последние выполненные задачи (или этапы)
    tasks
      .filter(t => t.completed)
      .sort((a, b) => new Date(b.completedAt || 0).getTime() - new Date(a.completedAt || 0).getTime())
      .slice(0, 10)
      .forEach(task => {
        result.push({
          id: task.id,
          userId: task.userId,
          type: 'completed_task',
          title: task.name,
          description: 'Задача выполнена',
          value: 1,
          referenceId: task.id,
          createdAt: new Date(task.completedAt || new Date())
        })
      })

    // Сортируем по дате (сначала новые)
    return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [metrics, metricEntries, tasks])

  const filteredAchievements = achievements.filter(a => {
    if (achievementFilter === 'all') return true
    if (achievementFilter === 'habits') return a.type === 'habit_streak'
    if (achievementFilter === 'counters') return a.type === 'counter_progress'
    if (achievementFilter === 'tasks') return a.type === 'completed_task'
    return false
  })

  const displayedGoals = expandedGoals ? upcomingGoals : upcomingGoals.slice(0, 3)
  const displayedTasks = expandedTasks ? upcomingTasks : upcomingTasks.slice(0, 3)

  // Получить категорию
  const getCategory = (categoryId?: string): Category | undefined => {
    return categories.find(c => c.id === categoryId)
  }

  // Модальные окна для редактирования
  const handleEditGoal = (goal: Goal) => {
    setSelectedGoal(goal)
    setShowGoalModal(true)
  }

  const handleEditTask = (task: Task) => {
    setSelectedTask(task)
    setShowTaskModal(true)
  }

  const handleEditMetric = (metric: Metric) => {
    setSelectedMetric(metric)
    setShowMetricModal(true)
  }

  const handleCreateGoal = () => {
    setSelectedGoal(null)
    setShowGoalModal(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <button
            onClick={() => {
              setSelectedGoal(null)
              setShowGoalModal(true)
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Новая цель
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-8">
        {/* ВИДЖЕТ 1: Статистика целей */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              <div className="min-w-0">
                <div className="text-xl font-bold text-gray-900">{goalStats.in_progress}</div>
                <div className="text-xs text-gray-500 truncate">В процессе</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-green-100 rounded-lg flex-shrink-0">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div className="min-w-0">
                <div className="text-xl font-bold text-gray-900">{goalStats.completed}</div>
                <div className="text-xs text-gray-500 truncate">Завершено</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-red-100 rounded-lg flex-shrink-0">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <div className="min-w-0">
                <div className="text-xl font-bold text-gray-900">{goalStats.overdue}</div>
                <div className="text-xs text-gray-500 truncate">Просрочено</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-gray-100 rounded-lg flex-shrink-0">
                <Calendar className="w-5 h-5 text-gray-600" />
              </div>
              <div className="min-w-0">
                <div className="text-xl font-bold text-gray-900">{goalStats.planned}</div>
                <div className="text-xs text-gray-500 truncate">Запланировано</div>
              </div>
            </div>
          </div>
        </div>

        {/* ВИДЖЕТ 2: Ближайшие цели */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Target className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Ближайшие цели</h2>
                <p className="text-sm text-gray-500">Цели по срочности</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {displayedGoals.map((goal) => {
              const isOverdue = new Date(goal.date) < new Date()
              const category = getCategory(goal.item.categoryId)

              return (
                <div
                  key={goal.id}
                  onClick={() => navigate(`/goals/${goal.id}`)}
                  className={cn(
                    "p-4 border rounded-xl cursor-pointer transition-all hover:shadow-md",
                    isOverdue ? "border-red-200 bg-red-50" : "border-gray-200 hover:bg-gray-50"
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {category && (
                            <div className="flex items-center gap-1">
                              <div 
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: category.color }}
                              />
                              <span className="text-xs text-gray-500">{category.name}</span>
                            </div>
                          )}
                          {goal.priority && goal.priority <= 2 && (
                            <span className="px-2 py-1 bg-red-100 text-red-600 text-xs rounded-full font-medium">
                              Высокий приоритет
                            </span>
                          )}
                        </div>
                        <h3 className="font-semibold text-gray-900 mb-1">{goal.title}</h3>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Calendar className="w-4 h-4" />
                          <span>{formatDate(goal.date)}</span>
                          {isOverdue && (
                            <span className="text-red-600 font-medium">(Просрочено)</span>
                          )}
                        </div>
                        
                        {/* Progress bar */}
                        <div className="mt-3">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${goal.item.progress || 0}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-xs text-gray-500 mt-1">
                            <span>Прогресс</span>
                            <span>{goal.item.progress || 0}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Edit button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleEditGoal(goal.item)
                      }}
                      className="ml-3 p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {upcomingGoals.length > 3 && (
            <button
              onClick={() => setExpandedGoals(!expandedGoals)}
              className="w-full mt-4 py-3 flex items-center justify-center gap-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              {expandedGoals ? (
                <>
                  <ChevronUp className="w-4 h-4" />
                  Свернуть
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" />
                  Показать все ({upcomingGoals.length})
                </>
              )}
            </button>
          )}
        </div>

        {/* ВИДЖЕТ 3: Ближайшие задачи */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Ближайшие задачи</h2>
                <p className="text-sm text-gray-500">Задачи по срочности</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {displayedTasks.map((task) => {
              const isOverdue = new Date(task.date) < new Date()
              const category = getCategory(task.item.categoryId)

              return (
                <div
                  key={task.id}
                  className={cn(
                    "p-4 border rounded-xl cursor-pointer transition-all hover:shadow-md",
                    isOverdue ? "border-red-200 bg-red-50" : "border-gray-200 hover:bg-gray-50"
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      {/* Quick completion toggle */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          updateTask(task.item.id, { completed: !task.item.completed })
                        }}
                        className="flex-shrink-0"
                      >
                        {task.item.completed ? (
                          <CheckCircle className="w-6 h-6 text-green-600" />
                        ) : (
                          <Circle className="w-6 h-6 text-gray-400" />
                        )}
                      </button>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {category && (
                            <div className="flex items-center gap-1">
                              <div 
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: category.color }}
                              />
                              <span className="text-xs text-gray-500">{category.name}</span>
                            </div>
                          )}
                          {task.priority && task.priority <= 2 && (
                            <span className="px-2 py-1 bg-red-100 text-red-600 text-xs rounded-full font-medium">
                              Высокий приоритет
                            </span>
                          )}
                        </div>
                        <h3 className="font-semibold text-gray-900 mb-1">{task.title}</h3>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Calendar className="w-4 h-4" />
                          <span>{formatDate(task.date)}</span>
                          {isOverdue && (
                            <span className="text-red-600 font-medium">(Просрочено)</span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Edit button */}
                    <button
                      onClick={() => handleEditTask(task.item)}
                      className="ml-3 p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {upcomingTasks.length > 3 && (
            <button
              onClick={() => setExpandedTasks(!expandedTasks)}
              className="w-full mt-4 py-3 flex items-center justify-center gap-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              {expandedTasks ? (
                <>
                  <ChevronUp className="w-4 h-4" />
                  Свернуть
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" />
                  Показать все ({upcomingTasks.length})
                </>
              )}
            </button>
          )}
        </div>

        {/* ВИДЖЕТ 4: Достижения */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Flame className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Достижения</h2>
                <p className="text-sm text-gray-500">Ваши успехи и прогресс</p>
              </div>
            </div>
          </div>

          {/* Фильтры */}
          <div className="flex flex-wrap gap-2 mb-6">
            {[
              { key: 'all', label: 'Все' },
              { key: 'habits', label: 'Привычки' },
              { key: 'counters', label: 'Счётчики' },
              { key: 'tasks', label: 'Задачи' }
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setAchievementFilter(key as typeof achievementFilter)}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                  achievementFilter === key
                    ? "bg-blue-500 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAchievements.slice(0, 9).map((achievement) => (
              <div
                key={achievement.id}
                className="p-4 border border-gray-200 rounded-xl hover:shadow-md transition-all cursor-pointer"
                onClick={() => {
                  if (achievement.type === 'habit_streak' || achievement.type === 'counter_progress') {
                    const metric = metrics.find(m => m.id === achievement.referenceId)
                    if (metric) {
                      setAnalyticsMetricId(metric.id)
                      setShowMetricAnalytics(true)
                    }
                  } else if (achievement.type === 'completed_task') {
                    const task = tasks.find(t => t.id === achievement.referenceId)
                    if (task) handleEditTask(task)
                  }
                }}
              >
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0",
                    achievement.type === 'habit_streak' && "bg-orange-100",
                    achievement.type === 'counter_progress' && "bg-green-100",
                    achievement.type === 'completed_task' && "bg-blue-100"
                  )}>
                    {achievement.type === 'habit_streak' && (
                      <Flame className="w-6 h-6 text-orange-600" />
                    )}
                    {achievement.type === 'counter_progress' && (
                      <TrendingUp className="w-6 h-6 text-green-600" />
                    )}
                    {achievement.type === 'completed_task' && (
                      <CheckCircle className="w-6 h-6 text-blue-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    {achievement.type === 'habit_streak' ? (
                      <>
                        <div className="text-2xl font-bold text-gray-900 mb-1">
                          {achievement.value} <span className="text-sm font-normal text-gray-500">дней подряд</span>
                        </div>
                        <p className="text-sm text-gray-700 font-medium mb-1">{achievement.description}</p>
                        <p className="text-xs text-orange-600">Серия привычки</p>
                      </>
                    ) : achievement.type === 'counter_progress' ? (
                      <>
                        <div className="text-2xl font-bold text-gray-900 mb-1">
                          {achievement.value}%
                        </div>
                        <p className="text-sm text-gray-700 font-medium mb-1">{achievement.description}</p>
                        <p className="text-xs text-green-600">Прогресс счетчика</p>
                      </>
                    ) : (
                      <>
                        <h3 className="font-semibold text-gray-900 mb-1">{achievement.title}</h3>
                        <p className="text-sm text-gray-500">{achievement.description}</p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredAchievements.length === 0 && (
            <div className="text-center py-12">
              <Flame className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Нет достижений</h3>
              <p className="text-gray-500">Продолжайте работать над целями, чтобы получить достижения</p>
            </div>
          )}
        </div>
      </div>

      {/* Модальное окно создания/редактирования цели */}
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

      {/* Модальное окно редактирования задачи */}
      <Modal
        isOpen={showTaskModal}
        onClose={() => setShowTaskModal(false)}
        title={selectedTask ? 'Редактировать задачу' : 'Создать задачу'}
        size="large"
      >
        <TaskForm
          initialData={selectedTask || undefined}
          goalId={selectedTask?.goalId || ''}
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

      {/* Модальное окно редактирования метрики */}
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

      {/* Модальное окно аналитики метрики */}
      {showMetricAnalytics && analyticsMetricId && (
        <MetricAnalyticsModal
          isOpen={showMetricAnalytics}
          onClose={() => {
            setShowMetricAnalytics(false)
            setAnalyticsMetricId(null)
          }}
          metric={metrics.find(m => m.id === analyticsMetricId)!}
        />
      )}
    </div>
  )
}
