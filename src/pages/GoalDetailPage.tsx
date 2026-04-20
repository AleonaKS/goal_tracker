import { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  ArrowLeft, 
  Calendar, 
  Target, 
  Flag, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  BarChart3, 
  Plus,
  Edit,
  Trash2,
  ChevronDown,
  ChevronRight,
  Users,
  FileText,
  TrendingUp,
  CalendarDays,
  Circle
} from 'lucide-react'
import { useApiDataStore } from '@/stores/apiDataStore'
import { Modal, ConfirmModal } from '@/components/Modal'
import { EditModal } from '@/components/EditModal'
import { ProgressBar } from '@/components/ProgressBar'
import { StatusBadge, PriorityBadge } from '@/components/StatusBadge'
import { GoalForm } from '@/components/forms/GoalForm'
import { StageForm } from '@/components/forms/StageForm'
import { TaskForm } from '@/components/forms/TaskForm'
import { MetricForm } from '@/components/forms/MetricForm'
import { MetricAnalyticsModal } from '@/components/MetricAnalyticsModal'
import { cn, formatDate } from '@/lib/utils'
import type { Task, Metric } from '@/types'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

// Task Item Component
interface TaskItemProps {
  task: Task
  onToggle: () => void
  onEdit: (task: Task) => void
}

function TaskItem({ task, onToggle, onEdit }: TaskItemProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    onToggle()
  }

  const handleEdit = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onEdit(task)
  }

  return (
    <div className="flex items-start gap-3 p-2 hover:bg-gray-50 rounded-lg transition-colors group">
      <button
        onClick={handleClick}
        type="button"
        className={cn(
          'mt-0.5 flex-shrink-0',
          task.completed ? 'text-green-500' : 'text-gray-400 hover:text-gray-600'
        )}
      >
        {task.completed ? (
          <CheckCircle className="w-5 h-5" />
        ) : (
          <Circle className="w-5 h-5" />
        )}
      </button>
      <div className="flex-1 min-w-0">
        <p className={cn(
          'font-medium',
          task.completed ? 'text-gray-500 line-through' : 'text-gray-900'
        )}>
          {task.name}
        </p>
        {task.dueDate && (
          <p className="text-xs text-gray-500">
            Due: {formatDate(task.dueDate)}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <PriorityBadge priority={task.priority} />
        <button
          onClick={handleEdit}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-200 rounded"
          title="Edit task"
        >
          <Edit className="w-4 h-4 text-gray-500" />
        </button>
      </div>
    </div>
  )
}

export function GoalDetailPage() {
  const params = useParams()
  const goalId = useMemo(() => params.id, [params.id]) // Stabilize goalId
  const navigate = useNavigate()
  
  // All hooks must be declared BEFORE any conditional returns
  const [showEditGoal, setShowEditGoal] = useState(false)
  const [showDeleteGoal, setShowDeleteGoal] = useState(false)
  const [showCreateStage, setShowCreateStage] = useState(false)
  const [showCreateTask, setShowCreateTask] = useState(false)
  const [showEditTask, setShowEditTask] = useState(false)
  const [showCreateMetric, setShowCreateMetric] = useState(false)
  const [showMetricAnalytics, setShowMetricAnalytics] = useState(false)
  const [selectedMetric, setSelectedMetric] = useState<Metric | undefined>()
  const [selectedTask, setSelectedTask] = useState<Task | undefined>()
  const [selectedStageId, setSelectedStageId] = useState<string | undefined>()
  const [expandedStages, setExpandedStages] = useState<Set<string>>(new Set())

  const goals = useApiDataStore(state => state.goals)
  const allTasks = useApiDataStore(state => state.tasks)
  const categories = useApiDataStore(state => state.categories)
  const metrics = useApiDataStore(state => state.metrics)
  const stages = useApiDataStore(state => state.stages)
  const metricEntries = useApiDataStore(state => state.metricEntries)
  const updateTask = useApiDataStore(state => state.updateTask)
  const deleteGoal = useApiDataStore(state => state.deleteGoal)
  const error = useApiDataStore(state => state.error)
  const storeLoading = useApiDataStore(state => state.isLoading)

  const goalData = goals.find(g => g.id === goalId)
  
  // Calculate weighted progress like GoalsPage - use safe values when goalData is undefined
  const goalTasks = useMemo(() => allTasks.filter(t => t.goalId === goalData?.id), [allTasks, goalData?.id])
  // Filter tasks without stageId for standalone display
  const standaloneTasks = useMemo(() => goalTasks.filter(t => !t.stageId), [goalTasks])
  const totalWeight = useMemo(() => goalTasks.reduce((sum, t) => sum + (t.weight || 1), 0), [goalTasks])
  const completedWeight = useMemo(() => 
    goalTasks.filter(t => t.completed).reduce((sum, t) => sum + (t.weight || 1), 0),
    [goalTasks]
  )
  const progress = useMemo(() => totalWeight > 0 ? Math.round((completedWeight / totalWeight) * 100) : 0, [completedWeight, totalWeight])
  const completedTasks = useMemo(() => goalTasks.filter(t => t.completed).length, [goalTasks])
  const totalTasks = goalTasks.length
  const category = useMemo(() => categories?.find(c => c.id === goalData?.categoryId), [categories, goalData?.categoryId])
  const goalMetrics = useMemo(() => metrics.filter(m => m.goalId === goalData?.id), [metrics, goalData?.id])
  const goalStages = useMemo(() => stages.filter(s => s.goalId === goalData?.id), [stages, goalData?.id])
  
  // Debug tasks loading
  useEffect(() => {
    console.log('GoalDetailPage - allTasks count:', allTasks.length)
    console.log('GoalDetailPage - goal.id:', goalData?.id)
  }, [allTasks.length, goalData?.id])
  
  // Navigate away if no goalId
  useEffect(() => {
    if (!goalId) {
      navigate('/goals')
    }
  }, [goalId, navigate])
  
  const currentMetricValue = useMemo(() => {
    if (!goalMetrics || goalMetrics.length === 0) return 0
    return goalMetrics.reduce((total, metric) => {
      const entries = metricEntries.filter(e => e.metricId === metric.id)
      if (entries.length === 0) return total
      const latestEntry = entries[0]
      return total + (latestEntry.finalValue || metric.startValue || 0)
    }, 0)
  }, [goalMetrics, metricEntries])
  const targetMetricValue = 0 // TODO: Implement target metric calculation

  // Prepare Gantt chart data - safe version that works even without goalData
  const ganttData = useMemo(() => {
    if (!goalData) return []
    
    const data: Array<{
      id: string
      name: string
      type: string
      start: number
      end: number
      progress: number
      color: string
    }> = []
    
    const toTimestamp = (date: Date | string | undefined): number => {
      if (!date) return Date.now()
      const d = new Date(date)
      return isNaN(d.getTime()) ? Date.now() : d.getTime()
    }
    
    // Add goal timeline
    if (goalData.startDate) {
      const startTime = toTimestamp(goalData.startDate)
      const endTime = toTimestamp(goalData.dueDate)
      data.push({
        id: goalData.id,
        name: goalData.name,
        type: 'goal',
        start: startTime,
        end: endTime,
        progress: typeof goalData.progress === 'number' ? goalData.progress : 0,
        color: '#3b82f6'
      })
    }

    // Add stages
    goalStages.forEach(stage => {
      if (stage.startDate && stage.dueDate) {
        const startTime = toTimestamp(stage.startDate)
        const endTime = toTimestamp(stage.dueDate)
        if (!isNaN(startTime) && !isNaN(endTime)) {
          data.push({
            id: stage.id,
            name: stage.name,
            type: 'stage',
            start: startTime,
            end: endTime,
            progress: 0,
            color: '#8b5cf6'
          })
        }
      }
    })

    // Add tasks
    goalTasks.forEach(task => {
      const startTime = toTimestamp(task.startDate)
      const endTime = toTimestamp(task.dueDate)
      data.push({
        id: task.id,
        name: task.name,
        type: 'task',
        start: startTime,
        end: endTime,
        progress: task.completed ? 100 : 0,
        color: task.completed ? '#10b981' : '#f59e0b'
      })
    })

    return data.sort((a, b) => a.start - b.start)
  }, [goalData, goalStages, goalTasks])

  // Filter valid Gantt data for rendering
  const validGanttData = useMemo(() => {
    const valid = ganttData.filter(d => 
      typeof d.start === 'number' && 
      typeof d.end === 'number' && 
      !isNaN(d.start) && 
      !isNaN(d.end) && 
      d.start > 0 && 
      d.end > 0 &&
      isFinite(d.start) &&
      isFinite(d.end)
    )
    if (valid.length === 0) return null
    const minStart = Math.min(...valid.map(d => d.start))
    const maxEnd = Math.max(...valid.map(d => d.end))
    if (!isFinite(minStart) || !isFinite(maxEnd)) return null
    return { data: valid, minStart, maxEnd }
  }, [ganttData])

  // Conditional returns after ALL hooks
  if (storeLoading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Loading...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">Error loading: {error}</p>
        <button onClick={() => navigate('/goals')} className="btn-primary mt-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to goals
        </button>
      </div>
    )
  }

  if (!goalData) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Цель не найдена (всего целей: {goals.length})</p>
        <p className="text-xs text-gray-400 mt-2">
          Ищем: {goalId}<br/>
          Доступные: {goals.map(g => g.id).join(', ')}
        </p>
        <button onClick={() => navigate('/goals')} className="btn-primary mt-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Назад к целям
        </button>
      </div>
    )
  }

  const goal = goalData

  // Helper function for deadline display based on dueType
  const getDeadlineDisplay = () => {
    switch (goal.dueType) {
      case 'specific_date':
        return goal.dueDate ? formatDate(goal.dueDate) : 'Не установлен'
      case 'month_year':
        return goal.dueMonthYear || 'Не установлен'
      case 'year':
        return goal.dueYear ? String(goal.dueYear) : 'Не установлен'
      case 'none':
      default:
        return 'Не установлен'
    }
  }

  const toggleStage = (stageId: string) => {
    const newExpanded = new Set(expandedStages)
    if (newExpanded.has(stageId)) {
      newExpanded.delete(stageId)
    } else {
      newExpanded.add(stageId)
    }
    setExpandedStages(newExpanded)
  }

  const handleDeleteGoal = () => {
    deleteGoal(goal.id)
    navigate('/goals')
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <button
        onClick={() => navigate('/goals')}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Назад к целям
      </button>

      {/* Goal Header */}
      <div className="card">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              {category && (
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: category.color }}
                />
              )}
              <span className="text-sm text-gray-500">{category?.name}</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{goal.name}</h1>
            {goal.description && (
              <p className="text-gray-600">{goal.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowEditGoal(true)}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Edit className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowDeleteGoal(true)}
              className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Progress */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-lg font-semibold text-gray-900">{progress}%</span>
            <span className="text-sm text-gray-500">
              {goal.progressCalculation === 'by_tasks'
                ? `${completedTasks} из ${totalTasks} задач`
                : `${currentMetricValue} из ${targetMetricValue}`}
            </span>
          </div>
          <ProgressBar progress={progress} color={category?.color} />
        </div>

        {/* Info grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t">
          <div>
            <p className="text-sm text-gray-500">Статус</p>
            <div className="mt-1">
              <StatusBadge status={goal.status} />
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-500">Приоритет</p>
            <div className="mt-1">
              <PriorityBadge priority={goal.priority} />
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-500">Начало</p>
            <p className="font-medium text-gray-900">{formatDate(goal.startDate)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Срок</p>
            <p className="font-medium text-gray-900">
              {getDeadlineDisplay()}
            </p>
          </div>
        </div>
      </div>

      {/* Stages */}
      {goalStages.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Этапы</h2>
          </div>
          <div className="space-y-3">
            {goalStages.map((stage) => {
              const isExpanded = expandedStages.has(stage.id)
              const stageTasks = allTasks.filter(t => t.stageId === stage.id)

              return (
                <div key={stage.id} className="border border-gray-200 rounded-lg">
                  <button
                    onClick={() => toggleStage(stage.id)}
                    className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      )}
                      <span className="font-medium text-gray-900">{stage.name}</span>
                    </div>
                    <div className="text-sm text-gray-500">
                      {formatDate(stage.startDate)} - {formatDate(stage.dueDate)}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="p-3 pt-0 border-t border-gray-100">
                      {/* Stage tasks */}
                      <div className="mt-3 space-y-2">
                        {stageTasks.map((task) => (
                          <TaskItem 
                            key={task.id} 
                            task={task} 
                            onToggle={async () => {
                              console.log('Toggling task:', task.id, 'from', task.completed, 'to', !task.completed)
                              try {
                                await updateTask(task.id, { completed: !task.completed })
                                console.log('Task updated successfully')
                              } catch (error) {
                                console.error('Failed to update task:', error)
                              }
                            }}
                            onEdit={(task) => {
                              setSelectedTask(task)
                              setShowEditTask(true)
                            }}
                          />
                        ))}
                        {stageTasks.length === 0 && (
                          <p className="text-sm text-gray-500 italic">Нет задач в этом этапе</p>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          setSelectedStageId(stage.id)
                          setShowCreateTask(true)
                        }}
                        className="mt-3 flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700"
                      >
                        <Plus className="w-4 h-4" />
                        Добавить задачу
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Tasks without stage - only show if no stages exist or if there are standalone tasks */}
      {(goalStages.length === 0 || standaloneTasks.length > 0) && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              {goalStages.length > 0 ? 'Задачи без этапа' : 'Задачи'}
            </h2>
            <button
              onClick={() => {
                setSelectedStageId(undefined)
                setShowCreateTask(true)
              }}
              className="btn-secondary text-sm"
            >
              <Plus className="w-4 h-4 mr-1" />
              Добавить
            </button>
          </div>
          <div className="space-y-2">
            {standaloneTasks.map((task) => (
              <TaskItem 
                key={task.id} 
                task={task} 
                onToggle={async () => {
                  try {
                    await updateTask(task.id, { completed: !task.completed })
                } catch (error) {
                  // Removed console.error
                }
              }}
              onEdit={(task) => {
                setSelectedTask(task)
                setShowEditTask(true)
              }}
            />
          ))}
          {standaloneTasks.length === 0 && (
            <p className="text-gray-500 text-center py-4">Нет задач</p>
          )}
        </div>
      </div>
      )}

      {/* Metrics */}
      {goalMetrics.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Метрики</h2>
            <button
              onClick={() => setShowCreateMetric(true)}
              className="btn-secondary text-sm"
            >
              Add
            </button>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {goalMetrics.map((metric) => (
              <button
                key={metric.id}
                onClick={() => {
                  setSelectedMetric(metric)
                  setShowMetricAnalytics(true)
                }}
                className="p-3 bg-gray-50 rounded-lg border border-gray-200 text-left transition-colors hover:shadow-sm hover:bg-gray-100"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: metric.color }}
                  />
                  <span className="font-medium text-gray-900">{metric.name}</span>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Цель: {metric.targetValue} {metric.unitId || ''}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Professional Gantt Chart */}
      {validGanttData && validGanttData.data.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900">Временная шкала проекта</h2>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Clock className="w-4 h-4" />
              <span>{formatDate(new Date())}</span>
            </div>
          </div>

          {/* Timeline Header */}
          <div className="mb-4">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
              <span>Начало проекта</span>
              <span>Текущая дата</span>
              <span>Завершение</span>
            </div>
            <div className="relative h-2 bg-gradient-to-r from-blue-200 via-gray-200 to-green-200 rounded-full">
              <div 
                className="absolute top-0 h-full w-1 bg-red-500 rounded-full shadow-sm"
                style={{ 
                  left: `${Math.min(100, Math.max(0, ((Date.now() - validGanttData.minStart) / (validGanttData.maxEnd - validGanttData.minStart)) * 100))}%`,
                  transform: 'translateX(-50%)'
                }}
              />
            </div>
          </div>

          {/* Timeline Items */}
          <div className="space-y-3">
            {validGanttData.data.map((item, index) => {
              const progress = item.progress || 0
              const duration = item.end - item.start
              const elapsed = Date.now() - item.start
              const itemProgress = Math.min(100, Math.max(0, (elapsed / duration) * 100))
              
              return (
                <div key={item.id} className="group">
                  <div className="flex items-center gap-4">
                    {/* Item Type Icon */}
                    <div className="flex-shrink-0 w-10 flex justify-center">
                      {item.type === 'goal' && <Target className={`w-5 h-5 ${progress === 100 ? 'text-green-600' : 'text-blue-600'}`} />}
                      {item.type === 'stage' && <Flag className={`w-5 h-5 ${progress === 100 ? 'text-green-600' : 'text-purple-600'}`} />}
                      {item.type === 'task' && <CheckCircle className={`w-5 h-5 ${progress === 100 ? 'text-green-600' : 'text-amber-600'}`} />}
                    </div>

                    {/* Item Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-medium text-gray-900 truncate pr-2">{item.name}</h3>
                        <div className="flex items-center gap-2 text-xs text-gray-500 flex-shrink-0">
                          <CalendarDays className="w-3 h-3" />
                          <span>{Math.ceil(duration / (1000 * 60 * 60 * 24))} дней</span>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="relative">
                        <div className="h-6 bg-gray-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${
                              item.type === 'goal' ? 'bg-blue-500' :
                              item.type === 'stage' ? 'bg-purple-500' :
                              progress === 100 ? 'bg-green-500' : 'bg-amber-500'
                            }`}
                            style={{ width: `${progress}%` }}
                          >
                            <div className="h-full bg-white/20 flex items-center justify-end pr-2">
                              {progress > 10 && (
                                <span className="text-xs font-medium text-white">
                                  {Math.round(progress)}%
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {/* Date Labels */}
                        <div className="flex justify-between mt-1 text-xs text-gray-500">
                          <span>{new Date(item.start).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}</span>
                          <span>{new Date(item.end).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}</span>
                        </div>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="flex-shrink-0">
                      {progress === 100 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                          <CheckCircle className="w-3 h-3" />
                          Выполнено
                        </span>
                      ) : Date.now() > item.end ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                          <AlertCircle className="w-3 h-3" />
                          Просрочено
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                          <Clock className="w-3 h-3" />
                          В работе
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Hover Details */}
                  <div className="mt-2 pl-14 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="text-xs text-gray-600 bg-gray-50 rounded p-2">
                      <div>Начало: {new Date(item.start).toLocaleString('ru-RU')}</div>
                      <div>Конец: {new Date(item.end).toLocaleString('ru-RU')}</div>
                      <div>Прогресс: {Math.round(progress)}%</div>
                      {item.type === 'task' && (
                        <div>Статус: {progress === 100 ? 'Завершена' : 'Активна'}</div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Statistics Summary */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {validGanttData.data.filter(d => d.type === 'goal').length}
                </div>
                <div className="text-xs text-gray-500">Целей</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {validGanttData.data.filter(d => d.type === 'stage').length}
                </div>
                <div className="text-xs text-gray-500">Этапов</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {validGanttData.data.filter(d => d.progress === 100).length}
                </div>
                <div className="text-xs text-gray-500">Завершено</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-amber-600">
                  {Math.round(validGanttData.data.reduce((acc, d) => acc + (d.progress || 0), 0) / validGanttData.data.length)}%
                </div>
                <div className="text-xs text-gray-500">Общий прогресс</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Goal Modal */}
      <Modal
        isOpen={showEditGoal}
        onClose={() => setShowEditGoal(false)}
        title="Редактировать цель"
      >
        <GoalForm
          initialData={{
            _id: goal.id,
            name: goal.name,
            categoryId: goal.categoryId,
            description: goal.description,
            startDate: goal.startDate ? new Date(goal.startDate) : undefined,
            // Map Goal type fields (dueType, dueDate, etc.) to GoalForm fields (deadlineType, deadlineValue)
            deadlineType: goal.dueType,
            deadlineValue: goal.dueType === 'specific_date' && goal.dueDate
              ? new Date(goal.dueDate)
              : goal.dueType === 'month_year'
                ? goal.dueMonthYear
                : goal.dueType === 'year' && goal.dueYear
                  ? String(goal.dueYear)
                  : undefined,
            status: goal.status,
            priority: goal.priority,
            progressCalculation: goal.progressCalculation as 'by_tasks' | 'by_metric',
            progressMetricId: goal.progressMetricId,
            isFrozen: goal.isFrozen,
            autoCalculateStatus: goal.autoCalculateStatus,
          }}
          onSubmit={() => setShowEditGoal(false)}
          onCancel={() => setShowEditGoal(false)}
        />
      </Modal>

      {/* Create Stage Modal */}
      <Modal
        isOpen={showCreateStage}
        onClose={() => setShowCreateStage(false)}
        title="Создать этап"
      >
        <StageForm
          goalId={goal.id}
          onSubmit={() => setShowCreateStage(false)}
          onCancel={() => setShowCreateStage(false)}
        />
      </Modal>

      {/* Create Task Modal */}
      <Modal
        isOpen={showCreateTask}
        onClose={() => setShowCreateTask(false)}
        title="Создать задачу"
      >
        <TaskForm
          goalId={goal.id}
          stageId={selectedStageId}
          onSubmit={() => {
            setShowCreateTask(false)
            setSelectedStageId(undefined)
          }}
          onCancel={() => {
            setShowCreateTask(false)
            setSelectedStageId(undefined)
          }}
        />
      </Modal>

      {/* Edit Task Modal */}
      <Modal
        isOpen={showEditTask}
        onClose={() => setShowEditTask(false)}
        title="Редактировать задачу"
      >
        <TaskForm
          goalId={selectedTask?.goalId || goal.id}
          stageId={selectedTask?.stageId}
          initialData={selectedTask || undefined}
          onSubmit={() => setShowEditTask(false)}
          onCancel={() => setShowEditTask(false)}
        />
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={showDeleteGoal}
        onClose={() => setShowDeleteGoal(false)}
        onConfirm={handleDeleteGoal}
        title="Delete Goal"
        message={`Are you sure you want to delete "${goal.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />

      {/* Metric Creation Modal */}
      <Modal
        isOpen={showCreateMetric}
        onClose={() => setShowCreateMetric(false)}
        title="Create Metric"
        size="large"
      >
        <MetricForm
          initialData={{ goalId: goal.id }}
          onSubmit={() => setShowCreateMetric(false)}
          onCancel={() => setShowCreateMetric(false)}
        />
      </Modal>

      {/* Metric Analytics Modal */}
      {selectedMetric && (
        <MetricAnalyticsModal
          isOpen={showMetricAnalytics}
          onClose={() => {
            setShowMetricAnalytics(false)
            setSelectedMetric(undefined)
          }}
          metric={selectedMetric}
        />
      )}
    </div>
  )
}
