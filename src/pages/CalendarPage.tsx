import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Target, CheckSquare, Activity, Edit, Plus, ChevronDown, CheckCircle, Circle, Clock } from 'lucide-react'
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  eachDayOfInterval,
  isToday,
} from 'date-fns'
import { ru } from 'date-fns/locale'
import { useApiDataStore } from '@/stores/apiDataStore'
import { useGoals } from '@/hooks/useGoals'
import { useTasks } from '@/hooks/useTasks'
import { Modal } from '@/components/Modal'
import { TaskForm } from '@/components/forms/TaskForm'
import { MetricAnalyticsModal } from '@/components/MetricAnalyticsModal'
import { WeeklyTimelineView } from '@/components/WeeklyTimelineView'
import { GanttChart } from '@/components/analytics/GanttChart'
import { cn, formatDate } from '@/lib/utils'
import type { Goal, Task, Metric } from '@/types'

type ViewMode = 'month' | 'week' | 'day' | 'agenda' | 'gantt'
type ShowType = 'all' | 'goals' | 'tasks' | 'metrics'

export function CalendarPage() {
  const navigate = useNavigate()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<ViewMode>('month')
  const [showType, setShowType] = useState<ShowType>('all')
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [showCreateTask, setShowCreateTask] = useState(false)
  const [createTaskDate, setCreateTaskDate] = useState<Date | null>(null)
  const [selectedMetricForModal, setSelectedMetricForModal] = useState<Metric | null>(null)

  const { goals, categories, metrics, metricEntries, updateTask } = useApiDataStore()
  const { allGoals } = useGoals()
  const allTasks = useTasks()

  const handleEditTask = (task: Task) => {
    setSelectedTask(task)
    setShowTaskModal(true)
  }

  const handleCreateTask = (date: Date) => {
    setCreateTaskDate(date)
    setShowCreateTask(true)
  }

  const handleTaskSubmit = () => {
    setShowTaskModal(false)
    setShowCreateTask(false)
    setSelectedTask(null)
    setCreateTaskDate(null)
  }

  // Smart navigation based on view mode
  const navigatePeriod = (direction: 'prev' | 'next') => {
    const multiplier = direction === 'prev' ? -1 : 1
    switch (viewMode) {
      case 'month':
        setCurrentDate(direction === 'prev' ? subMonths(currentDate, 1) : addMonths(currentDate, 1))
        break
      case 'week':
        setCurrentDate(addDays(currentDate, multiplier * 7))
        break
      case 'day':
      case 'agenda':
        setCurrentDate(addDays(currentDate, multiplier))
        break
      case 'gantt':
        setCurrentDate(direction === 'prev' ? subMonths(currentDate, 1) : addMonths(currentDate, 1))
        break
    }
  }

  const getNavigationLabel = () => {
    switch (viewMode) {
      case 'month':
        return format(currentDate, 'LLLL yyyy', { locale: ru })
      case 'week':
        const weekStart = startOfWeek(currentDate, { locale: ru })
        const weekEnd = addDays(weekStart, 6)
        return `${format(weekStart, 'd MMM', { locale: ru })} - ${format(weekEnd, 'd MMM yyyy', { locale: ru })}`
      case 'day':
      case 'agenda':
        return format(currentDate, 'EEEE, d MMMM yyyy', { locale: ru })
      case 'gantt':
        return format(currentDate, 'LLLL yyyy', { locale: ru })
    }
  }

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(monthStart)
    const calendarStart = startOfWeek(monthStart, { locale: ru })
    const calendarEnd = endOfWeek(monthEnd, { locale: ru })
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd })
  }, [currentDate])

  const getItemsForDate = (date: Date) => {
    const items: Array<{ type: 'goal' | 'task' | 'metric'; item: Goal | Task | Metric; color?: string }> = []

    if (showType === 'all' || showType === 'goals') {
      goals.forEach((goal) => {
        const goalData = allGoals.find(g => g.id === goal.id)
        if (goalData?.deadlineDate && isSameDay(new Date(goalData.deadlineDate), date)) {
          items.push({ type: 'goal', item: goal, color: goalData.categoryId ? categories.find(c => c.id === goalData.categoryId)?.color : '#gray' })
        }
      })
    }

    if (showType === 'all' || showType === 'tasks') {
      allTasks.forEach((task) => {
        if (task.dueDate && isSameDay(new Date(task.dueDate), date)) {
          items.push({ type: 'task', item: task })
        }
      })
    }

    if (showType === 'all' || showType === 'metrics') {
      metrics.forEach((metric) => {
        const hasEntry = metricEntries.some(
          (e) => e.metricId === metric.id && isSameDay(new Date(e.createdAt), date)
        )
        if (hasEntry) {
          items.push({ type: 'metric', item: metric, color: metric.color })
        }
      })
    }

    return items
  }

  // Get tasks with time for day view
  const getTasksWithTimeForDay = (date: Date): Array<Task & { startHour: number; endHour: number }> => {
    return allTasks
      .filter(task => {
        if (!task.dueDate || !isSameDay(new Date(task.dueDate), date)) return false
        if (!task.startTime || !task.endTime) return false
        return true
      })
      .map(task => {
        const [startH] = task.startTime!.split(':').map(Number)
        const [endH] = task.endTime!.split(':').map(Number)
        return {
          ...task,
          startHour: startH,
          endHour: endH,
        }
      })
      .sort((a, b) => a.startHour - b.startHour)
  }

  // Generate hours for day view
  const hours = Array.from({ length: 24 }, (_, i) => i)

  const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Календарь</h1>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Period navigation */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigatePeriod('prev')}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-semibold text-gray-900 capitalize">
            {getNavigationLabel()}
          </h2>
          <button
            onClick={() => navigatePeriod('next')}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* View mode */}
        <div className="flex gap-2">
          {[
            { key: 'month', label: 'Месяц' },
            { key: 'week', label: 'Неделя' },
            { key: 'day', label: 'День' },
            { key: 'agenda', label: 'Список' },
            { key: 'gantt', label: 'Гант' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setViewMode(key as ViewMode)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                viewMode === key
                  ? 'bg-primary-100 text-primary-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Type filter */}
      <div className="flex flex-wrap gap-2">
        {[
          { key: 'all', label: 'Все', icon: CalendarIcon },
          { key: 'goals', label: 'Цели', icon: Target },
          { key: 'tasks', label: 'Задачи', icon: CheckSquare },
          { key: 'metrics', label: 'Метрики', icon: Activity },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setShowType(key as ShowType)}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              showType === key
                ? 'bg-primary-100 text-primary-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Calendar */}
      {viewMode === 'month' && (
        <div className="card overflow-hidden">
          {/* Week headers */}
          <div className="grid grid-cols-7 border-b">
            {weekDays.map((day) => (
              <div key={day} className="p-3 text-center text-sm font-medium text-gray-500">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7">
            {calendarDays.map((day, index) => {
              const items = getItemsForDate(day)
              const isCurrentMonth = isSameMonth(day, currentDate)
              const isTodayDate = isToday(day)

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedDate(day)}
                  className={cn(
                    'min-h-[100px] p-2 border-b border-r text-left transition-colors hover:bg-gray-50',
                    !isCurrentMonth && 'bg-gray-50 text-gray-400',
                    isTodayDate && 'bg-primary-50'
                  )}
                >
                  <span
                    className={cn(
                      'text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full',
                      isTodayDate && 'bg-primary-600 text-white'
                    )}
                  >
                    {format(day, 'd')}
                  </span>
                  <div className="mt-1 space-y-1">
                    {items.slice(0, 3).map((item, i) => (
                      <div
                        key={i}
                        onClick={(e) => {
                          e.stopPropagation()
                          if (item.type === 'metric') {
                            setSelectedMetricForModal(item.item as Metric)
                          }
                        }}
                        className={cn(
                          'text-xs truncate px-1.5 py-0.5 rounded cursor-pointer',
                          item.type === 'goal' && 'bg-blue-100 text-blue-700',
                          item.type === 'task' && 'bg-green-100 text-green-700',
                          item.type === 'metric' && 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                        )}
                        style={item.color ? { backgroundColor: item.color + '20', color: item.color } : undefined}
                      >
                        {(item.item as Goal | Task | Metric).name}
                      </div>
                    ))}
                    {items.length > 3 && (
                      <div className="text-xs text-gray-500">+{items.length - 3} ещё</div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {viewMode === 'week' && (
        <WeeklyTimelineView />
      )}

      {/* Day/Timeline View */}
      {viewMode === 'day' && (
        <div className="card overflow-hidden">
          <div className="p-4 border-b bg-gray-50">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                {format(currentDate, 'EEEE, d MMMM yyyy', { locale: ru })}
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentDate(addDays(currentDate, -1))}
                  className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setCurrentDate(new Date())}
                  className="px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                >
                  Сегодня
                </button>
                <button
                  onClick={() => setCurrentDate(addDays(currentDate, 1))}
                  className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
          
          <div className="overflow-y-auto max-h-[600px]">
            <div className="relative">
              {/* Time grid */}
              {hours.map(hour => (
                <div key={hour} className="flex border-b border-gray-100 min-h-[60px]">
                  {/* Hour label */}
                  <div className="w-16 py-2 px-3 text-right text-sm text-gray-500 border-r border-gray-100 bg-gray-50 sticky left-0">
                    {String(hour).padStart(2, '0')}:00
                  </div>
                  {/* Hour content */}
                  <div className="flex-1 p-1 relative">
                    {/* Tasks in this hour */}
                    {getTasksWithTimeForDay(currentDate)
                      .filter(task => task.startHour <= hour && task.endHour > hour)
                      .map(task => (
                        <div
                          key={task.id}
                          onClick={() => handleEditTask(task)}
                          className={cn(
                            'mb-1 px-2 py-1 rounded text-xs cursor-pointer transition-all hover:shadow-md',
                            task.completed ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                          )}
                          style={{
                            height: task.endHour - task.startHour === 1 ? '100%' : `${(task.endHour - task.startHour) * 60 - 4}px`,
                            marginTop: task.startHour === hour ? '0' : undefined,
                            zIndex: 10,
                          }}
                        >
                          <div className="flex items-center gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                updateTask(task.id, { completed: !task.completed })
                              }}
                              className="flex-shrink-0"
                            >
                              {task.completed ? (
                                <CheckCircle className="w-3 h-3" />
                              ) : (
                                <Circle className="w-3 h-3" />
                              )}
                            </button>
                            <span className="font-medium truncate">{task.name}</span>
                          </div>
                          <div className="text-[10px] opacity-75 ml-4">
                            {task.startTime} - {task.endTime}
                            {task.duration && ` (${task.duration} мин)`}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
              
              {/* Current time indicator */}
              {isSameDay(currentDate, new Date()) && (
                <div
                  className="absolute left-16 right-0 border-t-2 border-red-400 z-20 pointer-events-none"
                  style={{
                    top: `${(new Date().getHours() + new Date().getMinutes() / 60) * 60 + 49}px`,
                  }}
                >
                  <div className="absolute -left-2 -top-1.5 w-3 h-3 bg-red-400 rounded-full" />
                </div>
              )}
            </div>
          </div>
          
          {/* Tasks without time */}
          {allTasks.filter(t => 
            t.dueDate && 
            isSameDay(new Date(t.dueDate), currentDate) && 
            (!t.startTime || !t.endTime)
          ).length > 0 && (
            <div className="p-4 border-t bg-gray-50">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Задачи без времени</h4>
              <div className="flex flex-wrap gap-2">
                {allTasks
                  .filter(t => 
                    t.dueDate && 
                    isSameDay(new Date(t.dueDate), currentDate) && 
                    (!t.startTime || !t.endTime)
                  )
                  .map(task => (
                    <button
                      key={task.id}
                      onClick={() => handleEditTask(task)}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-sm border transition-all hover:shadow-sm',
                        task.completed 
                          ? 'bg-green-50 border-green-200 text-green-700' 
                          : 'bg-white border-gray-200 text-gray-700'
                      )}
                    >
                      <span className="flex items-center gap-1">
                        {task.completed ? <CheckCircle className="w-3 h-3" /> : <Circle className="w-3 h-3" />}
                        {task.name}
                      </span>
                    </button>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Gantt Chart View */}
      {viewMode === 'gantt' && (
        <div className="card">
          <div className="p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Диаграмма Ганта</h3>
            
            {/* Prepare data for Gantt chart */}
            {(() => {
              const ganttData = []
              
              // Add goals
              if (showType === 'all' || showType === 'goals') {
                goals.forEach(goal => {
                  if (goal.startDate) {
                    ganttData.push({
                      id: goal.id,
                      name: `🎯 ${goal.name}`,
                      start: new Date(goal.startDate),
                      end: goal.dueDate ? new Date(goal.dueDate) : addDays(new Date(goal.startDate), 30),
                      progress: goal.progress || 0,
                      status: goal.status
                    })
                  }
                })
              }
              
              // Add tasks
              if (showType === 'all' || showType === 'tasks') {
                allTasks.filter(task => task.dueDate).forEach(task => {
                  ganttData.push({
                    id: task.id,
                    name: `📋 ${task.name}`,
                    start: new Date(task.startDate || task.dueDate!),
                    end: new Date(task.dueDate!),
                    progress: task.completed ? 100 : task.progress || 0,
                    status: task.completed ? 'completed' : 'in_progress'
                  })
                })
              }
              
              return ganttData.length > 0 ? (
                <GanttChart 
                  data={ganttData} 
                  height={Math.max(400, ganttData.length * 60)}
                  width={1200}
                />
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <Target className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Нет данных для диаграммы Ганта</h3>
                  <p className="text-sm">
                    {showType === 'goals' && 'Нет целей с датами начала'}
                    {showType === 'tasks' && 'Нет задач с датами выполнения'}
                    {showType === 'all' && 'Нет целей или задач с датами'}
                  </p>
                </div>
              )
            })()}
          </div>
        </div>
      )}

      {viewMode === 'agenda' && (
        <div className="card space-y-4">
          {calendarDays
            .filter((day) => isSameMonth(day, currentDate))
            .map((day) => {
              const items = getItemsForDate(day)
              if (items.length === 0) return null

              return (
                <div key={day.toISOString()} className="border-b last:border-0 pb-4 last:pb-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={cn(
                        'text-sm font-medium w-8 h-8 flex items-center justify-center rounded-full',
                        isToday(day) ? 'bg-primary-600 text-white' : 'bg-gray-100'
                      )}
                    >
                      {format(day, 'd')}
                    </span>
                    <span className="text-sm text-gray-500 capitalize">
                      {format(day, 'EEEE', { locale: ru })}
                    </span>
                  </div>
                  <div className="space-y-2 ml-10">
                    {items.map((item, i) => (
                      <div
                        key={i}
                        onClick={() => {
                          if (item.type === 'metric') {
                            setSelectedMetricForModal(item.item as Metric)
                          }
                        }}
                        className={cn(
                          'flex items-center gap-2 p-2 rounded-lg cursor-pointer',
                          item.type === 'goal' && 'bg-blue-50',
                          item.type === 'task' && 'bg-green-50',
                          item.type === 'metric' && 'bg-purple-50 hover:bg-purple-100'
                        )}
                      >
                        {item.type === 'task' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              const task = item.item as Task
                              updateTask(task.id, { completed: !task.completed })
                            }}
                            className="flex-shrink-0"
                          >
                            {(item.item as Task).completed ? (
                              <CheckCircle className="w-5 h-5 text-green-600" />
                            ) : (
                              <Circle className="w-5 h-5 text-gray-400" />
                            )}
                          </button>
                        )}
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: item.color || '#9ca3af' }}
                        />
                        <span className="text-sm font-medium text-gray-900">
                          {(item.item as Goal | Task | Metric).name}
                        </span>
                        <span className={cn(
                          'text-xs px-2 py-0.5 rounded-full ml-auto',
                          item.type === 'goal' && 'bg-blue-100 text-blue-700',
                          item.type === 'task' && 'bg-green-100 text-green-700',
                          item.type === 'metric' && 'bg-purple-100 text-purple-700'
                        )}>
                          {item.type === 'goal' && 'Цель'}
                          {item.type === 'task' && 'Задача'}
                          {item.type === 'metric' && 'Метрика'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
        </div>
      )}

      {/* Selected date modal */}
      <Modal
        isOpen={!!selectedDate}
        onClose={() => setSelectedDate(null)}
        title={selectedDate ? formatDate(selectedDate) : ''}
      >
        {selectedDate && (
          <div className="space-y-3">
            {getItemsForDate(selectedDate).length === 0 ? (
              <p className="text-gray-500 text-center py-4">Нет событий на этот день</p>
            ) : (
              getItemsForDate(selectedDate).map((item, i) => (
                <div
                  key={i}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors hover:shadow-md',
                    item.type === 'goal' && 'border-blue-200 bg-blue-50 hover:bg-blue-100',
                    item.type === 'task' && 'border-green-200 bg-green-50 hover:bg-green-100',
                    item.type === 'metric' && 'border-purple-200 bg-purple-50 hover:bg-purple-100'
                  )}
                  onClick={() => {
                    if (item.type === 'goal') {
                      navigate(`/goals/${(item.item as Goal).id}`)
                    } else if (item.type === 'task') {
                      handleEditTask(item.item as Task)
                    } else if (item.type === 'metric') {
                      setSelectedMetricForModal(item.item as Metric)
                      setSelectedDate(null)
                    }
                  }}
                >
                  {item.type === 'task' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        const task = item.item as Task
                        updateTask(task.id, { completed: !task.completed })
                      }}
                      className="flex-shrink-0"
                    >
                      {(item.item as Task).completed ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <Circle className="w-5 h-5 text-gray-400" />
                      )}
                    </button>
                  )}
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: item.color || '#9ca3af' }}
                  />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">
                      {(item.item as Goal | Task | Metric).name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {item.type === 'goal' && 'Цель'}
                      {item.type === 'task' && 'Задача'}
                      {item.type === 'metric' && 'Метрика'}
                    </p>
                  </div>
                  {(item.type === 'goal' || item.type === 'task') && (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </Modal>

      {/* Task Edit Modal */}
      <Modal
        isOpen={showTaskModal}
        onClose={handleTaskSubmit}
        title={selectedTask ? "Редактировать задачу" : "Создать задачу"}
      >
        <TaskForm
          goalId={selectedTask?.goalId || ''}
          onCancel={handleTaskSubmit}
          initialData={selectedTask ? {
            id: selectedTask.id,
            name: selectedTask.name,
            description: selectedTask.description,
            categoryId: selectedTask.categoryId,
            goalId: selectedTask.goalId,
            stageId: selectedTask.stageId,
            priority: selectedTask.priority,
            complexity: selectedTask.complexity,
            weight: selectedTask.weight,
            startDate: selectedTask.startDate ? new Date(selectedTask.startDate) : undefined,
            dueDate: selectedTask.dueDate ? new Date(selectedTask.dueDate) : undefined,
            isPeriodBased: selectedTask.isPeriodBased,
          } : createTaskDate ? {
            startDate: createTaskDate,
            dueDate: createTaskDate,
          } : undefined}
          onSubmit={handleTaskSubmit}
        />
      </Modal>

      {/* Metric Analytics Modal */}
      {selectedMetricForModal && (
        <MetricAnalyticsModal
          isOpen={true}
          onClose={() => setSelectedMetricForModal(null)}
          metric={selectedMetricForModal}
        />
      )}
    </div>
  )
}
