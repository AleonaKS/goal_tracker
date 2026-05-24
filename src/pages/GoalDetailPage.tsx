import { useState, useMemo, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
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
  Circle,
  RotateCcw,
} from 'lucide-react'
import { TimelineItem } from '@/components/TimelineItem'
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
import { cn, formatDate, getEntriesForCurrentPeriod } from '@/lib/utils'
import { calculateGoalStatusFromGoal } from '@/lib/calculations'
import type { Task, Metric } from '@/types'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

// Task Item Component
interface TaskItemProps {
  task: Task
  onToggle: () => void
  onEdit: (task: Task) => void
  onDelete: (taskId: string) => void
}

function TaskItem({ task, onToggle, onEdit, onDelete }: TaskItemProps) { 
  const [optimisticCompleted, setOptimisticCompleted] = useState(task.completed)
  const [isPending, setIsPending] = useState(false)
  const [showError, setShowError] = useState(false)
 
  useEffect(() => {
    setOptimisticCompleted(task.completed)
    setShowError(false)
  }, [task.completed])

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault()
    if (isPending) return

    const newCompleted = !optimisticCompleted
     
    setOptimisticCompleted(newCompleted)
    setIsPending(true)
    setShowError(false)

    try { 
      await onToggle() 
      setIsPending(false)
    } catch (error) {
      console.error('Failed to toggle task:', error) 
      setOptimisticCompleted(!newCompleted)
      setIsPending(false)
      setShowError(true) 
      setTimeout(() => setShowError(false), 3000)
    }
  }

  const handleRollback = (e: React.MouseEvent) => {
    e.stopPropagation()
    setOptimisticCompleted(task.completed)
    setShowError(false)
  }

  const handleEdit = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onEdit(task)
  }

  return (
    <div className={cn(
      "flex items-start gap-3 p-2 hover:bg-gray-50 rounded-lg transition-colors group",
      isPending && "bg-yellow-50/50",
      showError && "bg-red-50/50"
    )}>
      {/* Индикатор ошибки */}
      {showError && (
        <button
          onClick={handleRollback}
          className="absolute -left-2 top-1/2 -translate-y-1/2 p-1 bg-red-100 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          title="Откатить изменение"
        >
          <RotateCcw className="w-3 h-3 text-red-500" />
        </button>
      )}
      <button
        onClick={handleClick}
        type="button"
        disabled={isPending}
        className={cn(
          'mt-0.5 flex-shrink-0 transition-colors',
          optimisticCompleted ? 'text-green-500' : 'text-gray-400 hover:text-gray-600',
          isPending && 'text-yellow-500 animate-pulse'
        )}
      >
        {optimisticCompleted ? (
          <CheckCircle className="w-5 h-5" />
        ) : (
          <Circle className="w-5 h-5" />
        )}
      </button>
      <div className="flex-1 min-w-0">
        <p className={cn(
          'font-medium',
          optimisticCompleted ? 'text-gray-500 line-through' : 'text-gray-900',
          isPending && 'text-yellow-600'
        )}>
          {task.name}
        </p>
        {task.dueDate && (
          <p className="text-xs text-gray-500">{formatDate(task.dueDate)}</p>
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
        <button
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onDelete(task.id)
          }}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-100 rounded"
          title="Delete task"
        >
          <Trash2 className="w-4 h-4 text-red-500" />
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
  const [showDeleteTask, setShowDeleteTask] = useState(false)
  const [showEditStage, setShowEditStage] = useState(false)
  const [showDeleteStage, setShowDeleteStage] = useState(false)
  const [selectedStage, setSelectedStage] = useState<any>(null)
  const [showCreateMetric, setShowCreateMetric] = useState(false)
  const [showMetricAnalytics, setShowMetricAnalytics] = useState(false)
  const [selectedMetric, setSelectedMetric] = useState<Metric | undefined>()
  const [selectedTask, setSelectedTask] = useState<Task | undefined>()
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null)
  const [selectedStageId, setSelectedStageId] = useState<string | undefined>()
  const [expandedStages, setExpandedStages] = useState<Set<string>>(new Set())

  const goals = useApiDataStore(state => state.goals)
  const fetchGoals = useApiDataStore(state => state.fetchGoals)
  const fetchStages = useApiDataStore(state => state.fetchStages)
  const allTasks = useApiDataStore(state => state.tasks)
  const categories = useApiDataStore(state => state.categories)
  const metrics = useApiDataStore(state => state.metrics)
  const stages = useApiDataStore(state => state.stages)
  const metricEntries = useApiDataStore(state => state.metricEntries)
  const updateTask = useApiDataStore(state => state.updateTask)
  const deleteTask = useApiDataStore(state => state.deleteTask)
  const updateStage = useApiDataStore(state => state.updateStage)
  const deleteStage = useApiDataStore(state => state.deleteStage)
  const deleteGoal = useApiDataStore(state => state.deleteGoal)
  const error = useApiDataStore(state => state.error)
  // ИСПРАВЛЕНИЕ: Убрали storeLoading чтобы избежать мигания
  // const storeLoading = useApiDataStore(state => state.isLoading)

  const goalData = goals.find(g => g.id === goalId)
  
  // Get stage IDs for this goal to include tasks with null goalId but matching stage
  const goalStageIds = useMemo(() => 
    stages.filter(s => s.goalId === goalData?.id).map(s => s.id),
    [stages, goalData?.id]
  )
  
  // Calculate weighted progress - include tasks with goalId OR belonging to goal's stages
  const goalTasks = useMemo(() => allTasks.filter(t => 
    t.goalId === goalData?.id || (t.stageId && goalStageIds.includes(t.stageId))
  ), [allTasks, goalData?.id, goalStageIds])
  // Filter tasks without stageId for standalone display
  const standaloneTasks = useMemo(() => goalTasks.filter(t => !t.stageId), [goalTasks])
  const totalWeight = useMemo(() => goalTasks.reduce((sum, t) => sum + (t.weight || 1), 0), [goalTasks])
  const completedWeight = useMemo(() =>
    goalTasks.filter(t => t.completed).reduce((sum, t) => sum + (t.weight || 1), 0),
    [goalTasks]
  )
  const taskProgress = useMemo(() => totalWeight > 0 ? Math.round((completedWeight / totalWeight) * 100) : 0, [completedWeight, totalWeight])
  const completedTasks = useMemo(() => goalTasks.filter(t => t.completed).length, [goalTasks])
  const totalTasks = goalTasks.length
  const category = useMemo(() => categories?.find(c => c.id === goalData?.categoryId), [categories, goalData?.categoryId])
  const goalMetrics = useMemo(() => metrics.filter(m => m.goalId === goalData?.id), [metrics, goalData?.id])
  const goalStages = useMemo(() => stages.filter(s => s.goalId === goalData?.id), [stages, goalData?.id])
  
  // Debug tasks loading
  useEffect(() => {
    if (goalData?.id) {
      const directGoalTasks = allTasks.filter(t => t.goalId === goalData.id)
      const stageTasks = allTasks.filter(t => t.stageId && goalStageIds.includes(t.stageId))
      console.log('GoalDetailPage Debug:', {
        goalId: goalData.id,
        goalStageIds,
        directGoalTasks: directGoalTasks.length,
        stageTasks: stageTasks.length,
        totalCalculated: goalTasks.length,
        taskDetails: goalTasks.map(t => ({ 
          id: t.id, 
          name: t.name, 
          goalId: t.goalId, 
          stageId: t.stageId,
          source: t.goalId === goalData.id ? 'direct' : 'via_stage'
        }))
      })
    }
  }, [allTasks, goalData?.id, goalStageIds, goalTasks])
  
  // Navigate away if no goalId
  useEffect(() => {
    if (!goalId) {
      navigate('/goals')
    }
  }, [goalId, navigate])
  
  const currentMetricValue = useMemo(() => {
    const progressMetric = goalMetrics.find(m => m.id === goalData?.progressMetricId)
    if (!progressMetric) return 0
    const entries = metricEntries.filter(e => e.metricId === progressMetric.id)
    if (entries.length === 0) return 0
    const isHabitWithPeriodicity = (progressMetric.type === 'habit' || progressMetric.type === 'simple_habit') && progressMetric.autoResetEnabled && progressMetric.resetPeriodicity
    if (isHabitWithPeriodicity) {
      const periodEntries = getEntriesForCurrentPeriod(
        entries,
        progressMetric.resetPeriodicity,
        progressMetric.resetCustomDays,
        progressMetric.resetWeekdays
      )
      const periodSum = periodEntries.reduce((sum, e) => sum + e.value, 0)
      return (progressMetric.initialValue || 0) + periodSum
    }
    const entriesSum = entries.reduce((sum, e) => sum + (e.isAddition !== false ? e.value : -e.value), 0)
    return (progressMetric.initialValue || 0) + entriesSum
  }, [goalMetrics, goalData?.progressMetricId, metricEntries])
  // Calculate target metric value if goal uses metric for progress
  const targetMetricValue = useMemo(() => {
    if (goalData?.progressCalculation === 'by_metric' && goalData?.progressMetricId) {
      const targetMetric = goalMetrics.find(m => m.id === goalData.progressMetricId)
      return targetMetric ? targetMetric.targetValue : 0
    }
    return 0
  }, [goalData, goalMetrics])

  // Calculate overall progress based on goal's progress calculation method
  const progress = useMemo(() => {
    if (goalData?.progressCalculation === 'by_metric' && goalData?.progressMetricId) {
      // Calculate progress by metric
      const metric = goalMetrics.find(m => m.id === goalData.progressMetricId)
      if (metric && targetMetricValue > 0) {
        return Math.min(100, Math.round((currentMetricValue / targetMetricValue) * 100))
      }
      return 0
    }
    // Calculate progress by tasks
    return taskProgress
  }, [goalData, goalMetrics, targetMetricValue, currentMetricValue, taskProgress])

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
      const endTime = toTimestamp(goalData.deadlineValue instanceof Date ? goalData.deadlineValue : undefined)
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

  // Calculate effective status based on goal state (BEFORE conditional returns)
  const effectiveStatus = useMemo(() => {
    if (!goalData) return 'in_progress'
    return calculateGoalStatusFromGoal({ ...goalData, progress })
  }, [goalData, progress])

  // Conditional returns after ALL hooks
  // ИСПРАВЛЕНИЕ: Убрали проверку storeLoading чтобы не было мигания
  // при CRUD операциях (updateTask, createMetricEntry и т.д.)
  // if (storeLoading) {
  //   return (
  //     <div className="text-center py-12">
  //       <p className="text-gray-500">Loading...</p>
  //     </div>
  //   )
  // }

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

  // Helper function for deadline display
  const getDeadlineDisplay = () => {
    switch (goal.deadlineType) {
      case 'specific_date': {
        // Handle both Date objects and ISO strings from API
        const date = goal.deadlineValue instanceof Date 
          ? goal.deadlineValue 
          : typeof goal.deadlineValue === 'string' ? new Date(goal.deadlineValue) : null
        return date && !isNaN(date.getTime()) ? formatDate(date) : 'Не установлен'
      }
      case 'month_year':
        return typeof goal.deadlineValue === 'string' ? goal.deadlineValue : 'Не установлен'
      case 'year':
        return goal.deadlineValue ? String(goal.deadlineValue) : 'Не установлен'
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
              <StatusBadge status={effectiveStatus} />
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
            <button
              onClick={() => setShowCreateStage(true)}
              className="btn-secondary text-sm"
            >
              <Plus className="w-4 h-4 mr-1" />
              Добавить этап
            </button>
          </div>
          <div className="space-y-3">
            {goalStages.map((stage) => {
              const isExpanded = expandedStages.has(stage.id)
              const stageTasks = allTasks.filter(t => t.stageId === stage.id)

              return (
                <div key={stage.id} className="border border-gray-200 rounded-lg">
                  <div
                    className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors group"
                  >
                    <button
                      onClick={() => toggleStage(stage.id)}
                      className="flex items-center gap-2 flex-1 text-left"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      )}
                      <span className="font-medium text-gray-900">{stage.name}</span>
                    </button>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">
                        {formatDate(stage.startDate)} - {formatDate(stage.dueDate)}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedStage(stage)
                          setShowEditStage(true)
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-200 rounded"
                        title="Редактировать этап"
                      >
                        <Edit className="w-4 h-4 text-gray-500" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedStage(stage)
                          setShowDeleteStage(true)
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-100 rounded"
                        title="Удалить этап"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  </div>

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
                            onDelete={(taskId) => {
                              setTaskToDelete(taskId)
                              setShowDeleteTask(true)
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
              onDelete={(taskId) => {
                setTaskToDelete(taskId)
                setShowDeleteTask(true)
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
              Добавить
            </button>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {goalMetrics.map((metric) => {
              const entries = metricEntries.filter(e => e.metricId === metric.id)
              const totalValue = entries.reduce((sum, e) => sum + (e.value || 0), 0)
              const isHabitWithPeriodicity = (metric.type === 'habit' || metric.type === 'simple_habit') && metric.autoResetEnabled && metric.resetPeriodicity
              const periodValue = isHabitWithPeriodicity
                ? getEntriesForCurrentPeriod(entries, metric.resetPeriodicity, metric.resetCustomDays, metric.resetWeekdays)
                    .reduce((sum, e) => sum + (e.value || 0), 0)
                : totalValue
              const progress = metric.targetValue > 0 ? Math.min(100, Math.round((periodValue / metric.targetValue) * 100)) : 0
              return (
                <button
                  key={metric.id}
                  onClick={() => {
                    setSelectedMetric(metric)
                    setShowMetricAnalytics(true)
                  }}
                  className="p-4 bg-white rounded-xl border border-gray-200 text-left transition-colors hover:shadow-md hover:border-gray-300"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: metric.color }}
                    />
                    <span className="font-medium text-gray-900">{metric.name}</span>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-gray-900">
                      {periodValue} / {metric.targetValue}
                    </span>
                    <span className="text-sm font-medium text-gray-600">{progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(Math.max(progress, 0), 100)}%`,
                        backgroundColor: metric.color || '#3b82f6'
                      }}
                    />
                  </div>
                </button>
              )
            })}
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
            {validGanttData.data.map((item) => (
              <TimelineItem
                key={item.id}
                item={item}
                categoryColor={item.type === 'goal' ? categories.find(c => c.id === (item as any).categoryId)?.color : undefined}
              />
            ))}
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
            startDate: goal.startDate,
            deadlineType: goal.deadlineType,
            deadlineValue: goal.deadlineValue,
            status: goal.status,
            priority: goal.priority,
            isFrozen: goal.isFrozen,
            autoCalculateStatus: goal.autoCalculateStatus,
            progressCalculation: goal.progressCalculation as 'by_tasks' | 'by_metric',
            progressMetricId: goal.progressMetricId,
          }}
          onSubmit={async () => {
            await Promise.all([fetchGoals(), fetchStages()])
            setShowEditGoal(false)
          }}
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

      {/* Edit Stage Modal */}
      <Modal
        isOpen={showEditStage}
        onClose={() => {
          setShowEditStage(false)
          setSelectedStage(null)
        }}
        title="Редактировать этап"
      >
        <StageForm
          goalId={goal.id}
          initialData={selectedStage || undefined}
          onSubmit={() => {
            setShowEditStage(false)
            setSelectedStage(null)
          }}
          onCancel={() => {
            setShowEditStage(false)
            setSelectedStage(null)
          }}
        />
      </Modal>

      {/* Delete Stage Confirmation */}
      <ConfirmModal
        isOpen={showDeleteStage}
        onClose={() => {
          setShowDeleteStage(false)
          setSelectedStage(null)
        }}
        onConfirm={async () => {
          if (selectedStage?.id) {
            await deleteStage(selectedStage.id)
            setSelectedStage(null)
            setShowDeleteStage(false)
          }
        }}
        title="Удалить этап"
        message={`Вы уверены, что хотите удалить этап "${selectedStage?.name || ''}"? Все задачи этого этапа будут удалены. Это действие нельзя отменить.`}
        confirmText="Удалить"
        variant="danger"
      />

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

      {/* Delete Goal Confirmation */}
      <ConfirmModal
        isOpen={showDeleteGoal}
        onClose={() => setShowDeleteGoal(false)}
        onConfirm={handleDeleteGoal}
        title="Delete Goal"
        message={`Are you sure you want to delete "${goal.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />

      {/* Delete Task Confirmation */}
      <ConfirmModal
        isOpen={showDeleteTask}
        onClose={() => setShowDeleteTask(false)}
        onConfirm={async () => {
          if (taskToDelete) {
            await deleteTask(taskToDelete)
            setTaskToDelete(null)
            setShowDeleteTask(false)
          }
        }}
        title="Удалить задачу"
        message="Вы уверены, что хотите удалить эту задачу? Это действие нельзя отменить."
        confirmText="Удалить"
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
