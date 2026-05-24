import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Target, CheckSquare, Activity, Edit, Plus, ChevronDown, CheckCircle, Circle, Clock, CheckCircle2, Flag, Flame, X } from 'lucide-react'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, addMonths, subMonths, eachDayOfInterval, isToday, } from 'date-fns'
import { ru } from 'date-fns/locale'
import { useApiDataStore } from '@/stores/apiDataStore'
import { useGoals } from '@/hooks/useGoals'
import { useTasks } from '@/hooks/useTasks'
import { Modal } from '@/components/Modal'
import { TaskForm } from '@/components/forms/TaskForm'
import { TaskSelectorModal } from '@/components/TaskSelectorModal'
import { DraggableCalendarTask, DroppableDayCell } from '@/components/DraggableCalendarTask'
import { MetricAnalyticsModal } from '@/components/MetricAnalyticsModal'
import { WeeklyKanban } from '@/components/WeeklyKanban'
import { GanttChart } from '@/components/analytics/GanttChart'
import { cn, formatDate } from '@/lib/utils'
import type { Goal, Task, Metric } from '@/types'

type ViewMode = 'month' | 'week' | 'agenda' | 'gantt'

const CALENDAR_VIEW_KEY = 'goaltracker_calendar_view'
const CALENDAR_DATE_KEY = 'goaltracker_calendar_date'
const CALENDAR_HEATMAP_KEY = 'goaltracker_calendar_heatmap'
type ShowType = 'all' | 'goals' | 'tasks' | 'metrics'

export function CalendarPage() {
  const navigate = useNavigate()
  
  const [currentDate, setCurrentDate] = useState(() => {
    const savedDate = localStorage.getItem(CALENDAR_DATE_KEY)
    return savedDate ? new Date(savedDate) : new Date()
  })
  
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const savedView = localStorage.getItem(CALENDAR_VIEW_KEY) as ViewMode
    return savedView || 'month'
  })
  const [showType, setShowType] = useState<ShowType>('all')
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [showCreateTask, setShowCreateTask] = useState(false)
  const [createTaskDate, setCreateTaskDate] = useState<Date | null>(null)
  const [showTaskSelector, setShowTaskSelector] = useState(false)
  const [selectedMetricForModal, setSelectedMetricForModal] = useState<Metric | null>(null)

  const [showPriority, setShowPriority] = useState(() => {
    const saved = localStorage.getItem('goaltracker_calendar_show_priority')
    return saved !== null ? JSON.parse(saved) : true
  })

  const [showHeatmap, setShowHeatmap] = useState(() => {
    const saved = localStorage.getItem(CALENDAR_HEATMAP_KEY)
    return saved !== null ? JSON.parse(saved) : false
  })

  const [showFabMenu, setShowFabMenu] = useState(false)

  const [metricViewMode, setMetricViewMode] = useState<'planned' | 'recorded'>(() => {
    const saved = localStorage.getItem('goaltracker_metric_view')
    return (saved as 'planned' | 'recorded') || 'planned'
  })

  // Slide animation for month switching
  const [slideDir, setSlideDir] = useState<'left' | 'right' | null>(null)
  const calendarRef = useRef<HTMLDivElement>(null)

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

  const handleTaskDrop = (task: Task, targetDate: Date) => {
    const newDueDate = new Date(targetDate)
    
    if (task.startTime) {
      const [hours, minutes] = task.startTime.split(':').map(Number)
      newDueDate.setHours(hours, minutes)
      
      if (task.duration) {
        const endDate = new Date(newDueDate.getTime() + task.duration * 60000)
        updateTask(task.id, { 
          dueDate: newDueDate,
          endTime: format(endDate, 'HH:mm')
        })
      } else {
        updateTask(task.id, { dueDate: newDueDate })
      }
    } else {
      newDueDate.setHours(9, 0)
      updateTask(task.id, { dueDate: newDueDate })
    }
  }

  const getCategoryColor = (categoryId?: string, goalId?: string) => {
    if (categoryId) {
      const category = categories.find(c => c.id === categoryId)
      if (category?.color) return category.color
    }
    if (goalId) {
      const goal = allGoals.find(g => g.id === goalId)
      if (goal?.categoryId) {
        const category = categories.find(c => c.id === goal.categoryId)
        if (category?.color) return category.color
      }
    }
    return '#6b7280'
  }

  const getGoalName = (goalId?: string) => {
    const goal = allGoals.find(g => g.id === goalId)
    return goal?.name
  }

  const handleTaskSubmit = () => {
    setShowTaskModal(false)
    setShowCreateTask(false)
    setSelectedTask(null)
    setCreateTaskDate(null)
  }
  useEffect(() => {
    const handleCreateTaskEvent = (e: any) => {
      handleCreateTask(e.detail)
    }
    
    window.addEventListener('createTask', handleCreateTaskEvent)
    
    return () => {
      window.removeEventListener('createTask', handleCreateTaskEvent)
    }
  }, [])

  const navigatePeriod = (direction: 'prev' | 'next') => {
    setSlideDir(direction === 'next' ? 'left' : 'right')
    const multiplier = direction === 'prev' ? -1 : 1
    switch (viewMode) {
      case 'month':
        setCurrentDate(direction === 'prev' ? subMonths(currentDate, 1) : addMonths(currentDate, 1))
        break
      case 'week':
        setCurrentDate(addDays(currentDate, multiplier * 7))
        break
      case 'agenda':
        setCurrentDate(direction === 'prev' ? subMonths(currentDate, 1) : addMonths(currentDate, 1))
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
      case 'agenda':
        return format(currentDate, 'LLLL yyyy', { locale: ru })
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
        const taskStart = task.startDate ? new Date(task.startDate) : null
        const taskDue = task.dueDate ? new Date(task.dueDate) : null
        const isStart = taskStart && isSameDay(taskStart, date)
        const isDue = taskDue && isSameDay(taskDue, date)
        
        if (isStart || isDue) {
          items.push({ 
            type: 'task', 
            item: task,
            color: isStart && isDue ? 'both' : isStart ? 'start' : 'due'
          })
        }
      })
    }

    // Daily/simple_habit metrics: planned mode shows on every day, recorded mode shows only with entries
    if (metricViewMode === 'planned') {
      metrics.filter(m => m.periodicity === 'daily' || m.resetPeriodicity === 'daily' || m.type === 'simple_habit').forEach((metric) => {
        items.push({ type: 'metric', item: metric, color: metric.color })
      })
    }

    // Recorded mode: show metrics only on days with actual entries
    if (metricViewMode === 'recorded') {
      const relevantMetrics = showType === 'all' || showType === 'metrics'
        ? metrics
        : metrics.filter(m => m.periodicity === 'daily' || m.resetPeriodicity === 'daily' || m.type === 'simple_habit')

      relevantMetrics.forEach((metric) => {
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

  // Mini-stats for the month
  const monthStats = useMemo(() => {
    const monthDays = calendarDays.filter(d => isSameMonth(d, currentDate))
    const tasksInMonth = allTasks.filter(task => {
      if (!task.dueDate) return false
      return monthDays.some(d => isSameDay(d, new Date(task.dueDate)))
    })
    const completedInMonth = tasksInMonth.filter(t => t.completed)
    const goalsInMonth = goals.filter(goal => {
      const g = allGoals.find(gg => gg.id === goal.id)
      if (!g?.deadlineDate) return false
      return monthDays.some(d => isSameDay(d, new Date(g.deadlineDate)))
    })
    const metricsInMonth = metrics.filter(m => {
      return metricEntries.some(e =>
        e.metricId === m.id && monthDays.some(d => isSameDay(d, new Date(e.createdAt)))
      )
    })
    return {
      totalTasks: tasksInMonth.length,
      completedTasks: completedInMonth.length,
      totalGoals: goalsInMonth.length,
      totalMetrics: metricsInMonth.length,
    }
  }, [calendarDays, allTasks, goals, allGoals, metrics, metricEntries, currentDate])

  // Count high-priority tasks for the button
  const highPriorityCount = useMemo(() => {
    return allTasks.filter(t => t.priority <= 2 && !t.completed).length
  }, [allTasks])

  const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="space-y-6 pb-20">
      <h1 className="text-2xl font-bold text-gray-900">Календарь</h1>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Period navigation */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigatePeriod('prev')}
            className="p-2 rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-semibold text-gray-900 capitalize min-w-[160px] text-center">
            {getNavigationLabel()}
          </h2>
          <button
            onClick={() => navigatePeriod('next')}
            className="p-2 rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors ml-2"
          >
            Сегодня
          </button>
        </div>

        {/* View mode - segmented control style */}
        <div className="inline-flex rounded-lg bg-gray-100 p-0.5 gap-0.5">
          {[
            { key: 'month', label: 'Месяц' },
            { key: 'week', label: 'Неделя' }, 
            { key: 'agenda', label: 'Список' },
            { key: 'gantt', label: 'Гант' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setViewMode(key as ViewMode)}
              className={cn(
                'px-3 py-1.5 rounded-md text-sm font-medium transition-all',
                viewMode === key
                  ? 'bg-white text-primary-700 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Type filter + actions */}
      <div className="flex flex-wrap items-center gap-2">
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
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
              showType === key
                ? 'bg-primary-100 text-primary-700 shadow-sm'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700'
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
        
        {/* Heatmap toggle */}
        <button
          onClick={() => {
            setShowHeatmap(!showHeatmap)
            localStorage.setItem(CALENDAR_HEATMAP_KEY, JSON.stringify(!showHeatmap))
          }}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all',
            showHeatmap
              ? 'border-primary-200 bg-primary-50 text-primary-600'
              : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50 hover:border-gray-300'
          )}
        >
          <Flame className={cn('w-4 h-4', showHeatmap && 'fill-primary-500')} />
          Нагрузка
        </button>

        {/* Priority button - outline style */}
        <button
          onClick={() => {
            setShowPriority(!showPriority)
            localStorage.setItem('goaltracker_calendar_show_priority', JSON.stringify(!showPriority))
          }}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all',
            showPriority
              ? 'border-orange-200 bg-orange-50 text-orange-600'
              : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50 hover:border-gray-300'
          )}
        >
          <Flag className={cn('w-4 h-4', showPriority && 'fill-orange-500 text-orange-500')} />
          Приоритет
          {showPriority && highPriorityCount > 0 && (
            <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold rounded-full bg-orange-500 text-white">
              {highPriorityCount}
            </span>
          )}
        </button>

        {/* Metric view mode toggle */}
        <div className="inline-flex rounded-lg bg-gray-100 p-0.5 gap-0.5">
          <button
            onClick={() => {
              setMetricViewMode('planned')
              localStorage.setItem('goaltracker_metric_view', 'planned')
            }}
            className={cn(
              'px-2 py-1 rounded text-[11px] font-medium transition-all',
              metricViewMode === 'planned'
                ? 'bg-white text-primary-700 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            )}
          >
            Запланировано
          </button>
          <button
            onClick={() => {
              setMetricViewMode('recorded')
              localStorage.setItem('goaltracker_metric_view', 'recorded')
            }}
            className={cn(
              'px-2 py-1 rounded text-[11px] font-medium transition-all',
              metricViewMode === 'recorded'
                ? 'bg-white text-primary-700 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            )}
          >
            Записи
          </button>
        </div>

        <div className="flex-1" />

        {/* Desktop Add button */}
        <button
          onClick={() => setShowTaskSelector(true)}
          className="hidden sm:flex items-center gap-2 px-4 py-1.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg text-sm font-medium transition-all hover:shadow-md active:scale-95"
        >
          <Plus className="w-4 h-4" />
          Добавить задачу
        </button>
      </div>

      {/* Mini-stats bar */}
      {viewMode === 'month' && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500 animate-fade-in-up">
          <span className="inline-flex items-center gap-1.5">
            <CheckSquare className="w-3.5 h-3.5 text-blue-500" />
            Задач: <strong className="text-gray-700">{monthStats.totalTasks}</strong>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5 text-green-500" />
            Выполнено: <strong className="text-green-600">{monthStats.completedTasks}</strong>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5 text-purple-500" />
            Целей: <strong className="text-gray-700">{monthStats.totalGoals}</strong>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-orange-500" />
            Метрик: <strong className="text-gray-700">{monthStats.totalMetrics}</strong>
          </span>
          {monthStats.totalTasks > 0 && (
            <div className="flex items-center gap-2 ml-auto">
              <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-400 to-green-500 rounded-full transition-all duration-500"
                  style={{ width: `${(monthStats.completedTasks / monthStats.totalTasks) * 100}%` }}
                />
              </div>
              <span className="text-xs text-gray-400">
                {Math.round((monthStats.completedTasks / monthStats.totalTasks) * 100)}%
              </span>
            </div>
          )}
        </div>
      )}

      {/* Calendar */}
      {viewMode === 'month' && (
        <div
          ref={calendarRef}
          className={cn(
            'card overflow-hidden',
            slideDir === 'left' && 'animate-slide-left',
            slideDir === 'right' && 'animate-slide-right'
          )}
          onAnimationEnd={() => setSlideDir(null)}
        >
          {/* Week headers */}
          <div className="grid grid-cols-7 border-b">
            {weekDays.map((day, i) => (
              <div
                key={day}
                className={cn(
                  'p-3 text-center text-sm font-medium',
                  i >= 5 ? 'text-gray-400' : 'text-gray-500'
                )}
              >
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
              const taskItems = items.filter(item => item.type === 'task')
              const tasksForDay = taskItems.map(item => item.item as Task)
              const taskDateTypes = new Map<string, 'start' | 'due' | 'both'>()
              taskItems.forEach(item => {
                const task = item.item as Task
                taskDateTypes.set(task.id, item.color as 'start' | 'due' | 'both')
              })
              const dayOfWeek = day.getDay()
              const isWeekend = dayOfWeek === 0 || dayOfWeek === 6

              return (
                <DroppableDayCell
                  key={day.toISOString()}
                  date={day}
                  onDrop={handleTaskDrop}
                  isCurrentMonth={isCurrentMonth}
                  isToday={isTodayDate}
                  showHeatmap={showHeatmap}
                  taskCount={items.length}
                  isWeekend={isWeekend}
                >
                  <div
                    onClick={() => setSelectedDate(day)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelectedDate(day) }}
                    className="w-full h-full text-left flex flex-col cursor-pointer"
                  >
                    <div className="flex justify-between items-start mb-1 px-0.5">
                      <span
                        className={cn(
                          'text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full transition-colors',
                          isTodayDate && 'bg-primary-600 text-white shadow-sm',
                          !isTodayDate && isCurrentMonth && 'hover:bg-gray-100'
                        )}
                      >
                        {format(day, 'd')}
                      </span>
                      {isTodayDate && (
                        <span className="text-[10px] text-primary-600 font-semibold bg-primary-50 px-1.5 py-0.5 rounded-full">
                          Сегодня
                        </span>
                      )}
                    </div>
                    <div className="flex-1 space-y-0.5 overflow-hidden">
                      {/* Non-task items */}
                      {items.filter(item => item.type !== 'task').slice(0, 2).map((item, i) => (
                        <div
                          key={i}
                          onClick={(e) => {
                            e.stopPropagation()
                            if (item.type === 'metric') {
                              setSelectedMetricForModal(item.item as Metric)
                            }
                          }}
                          className={cn(
                            'text-xs truncate px-1.5 py-0.5 rounded cursor-pointer transition-colors',
                            item.type === 'goal' && 'bg-blue-100/80 text-blue-700 hover:bg-blue-200',
                            item.type === 'metric' && 'bg-purple-100/80 text-purple-700 hover:bg-purple-200'
                          )}
                          style={item.color ? { backgroundColor: item.color + '20', color: item.color } : undefined}
                        >
                          {(item.item as Goal | Metric).name}
                        </div>
                      ))}
                      
                      {/* Tasks */}
                      {tasksForDay.slice(0, 3).map((task) => (
                        <DraggableCalendarTask
                          key={task.id}
                          task={task}
                          currentDate={day}
                          dateType={taskDateTypes.get(task.id)}
                          onDrop={handleTaskDrop}
                          onToggleComplete={(task) => updateTask(task.id, { completed: !task.completed })}
                          onEdit={handleEditTask}
                          getCategoryColor={getCategoryColor}
                          getGoalName={getGoalName}
                        />
                      ))}
                      
                      {/* Show more */}
                      {items.length > 4 && (
                        <div className="text-[10px] text-gray-400 font-medium px-1">
                          +{items.length - 4} ещё
                        </div>
                      )}
                    </div>
                  </div>
                </DroppableDayCell>
              )
            })}
          </div>
        </div>
      )}

      {viewMode === 'week' && (
        <div className={cn(slideDir === 'left' && 'animate-slide-left', slideDir === 'right' && 'animate-slide-right')}
          onAnimationEnd={() => setSlideDir(null)}>
          <WeeklyKanban weekStart={startOfWeek(currentDate, { weekStartsOn: 1 })} />
        </div>
      )}

      {/* Gantt Chart View */}
      {viewMode === 'gantt' && (
        <div className={cn(slideDir === 'left' && 'animate-slide-left', slideDir === 'right' && 'animate-slide-right')}
          onAnimationEnd={() => setSlideDir(null)}>
          {(() => {
            const ganttData = []
            
            if (showType === 'all' || showType === 'goals') {
              allGoals.forEach(goal => {
                if (goal.isArchived) return
                const start = goal.startDate ? new Date(goal.startDate) : null
                const end = goal.deadlineDate ? new Date(goal.deadlineDate) : null
                if (!start || !end) return
                const category = goal.categoryId ? categories.find(c => c.id === goal.categoryId) : null
                ganttData.push({
                  id: goal.id,
                  name: goal.name,
                  start,
                  end,
                  progress: goal.progress || 0,
                  status: goal.status,
                  categoryColor: category?.color || '#3b82f6',
                  goalName: goal.name,
                  type: 'goal',
                })
              })
            }
            
            if (showType === 'all' || showType === 'tasks') {
              allTasks.filter(task => task.dueDate).forEach(task => {
                const taskGoal = task.goalId ? allGoals.find(g => g.id === task.goalId) : null
                const taskCategory = task.categoryId ? categories.find(c => c.id === task.categoryId) : null
                ganttData.push({
                  id: task.id,
                  name: task.name,
                  start: new Date(task.startDate || task.dueDate!),
                  end: new Date(task.dueDate!),
                  progress: task.completed ? 100 : task.progress || 0,
                  status: task.completed ? 'completed' : (task.status || 'in_progress'),
                  categoryColor: taskCategory?.color || (taskGoal ? '#3b82f6' : '#9ca3af'),
                  goalName: taskGoal?.name,
                  type: 'task',
                })
              })
            }
            
            return (
              <GanttChart
                data={ganttData}
                height={Math.max(400, ganttData.length * 52 + 200)}
                onItemClick={(item) => {
                  if (item.type === 'goal') {
                    navigate(`/goals/${item.id}`)
                  } else {
                    const task = allTasks.find(t => t.id === item.id)
                    if (task) handleEditTask(task)
                  }
                }}
              />
            )
          })()}
        </div>
      )}

      {/* Agenda/Timeline View */}
      {viewMode === 'agenda' && (
        <div className={cn(slideDir === 'left' && 'animate-slide-left', slideDir === 'right' && 'animate-slide-right')}
          onAnimationEnd={() => setSlideDir(null)}>
          <div className="card space-y-0">
            {/* Status tabs */}
            {(() => {
              const allDaysWithItems = calendarDays
                .filter((day) => isSameMonth(day, currentDate))
                .map((day) => ({ day, items: getItemsForDate(day) }))
                .filter(({ items }) => items.length > 0)

              if (allDaysWithItems.length === 0) {
                return (
                  <div className="text-center py-12 text-gray-400">
                    <CalendarIcon className="w-12 h-12 mx-auto mb-3 text-gray-200" />
                    <p className="text-sm">Нет событий на этот месяц</p>
                  </div>
                )
              }

              // Group by day
              const today = new Date()
              return (
                <div className="relative">
                  {/* Timeline vertical line */}
                  <div className="absolute left-[23px] top-0 bottom-0 w-0.5 bg-gray-100" />

                  {allDaysWithItems.map(({ day, items }, idx) => {
                    const completedTasks = items.filter(
                      i => i.type === 'task' && (i.item as Task).completed
                    ).length
                    const totalTasks = items.filter(i => i.type === 'task').length
                    const isPast = day < today && !isToday(day)

                    return (
                      <div
                        key={day.toISOString()}
                        className={cn(
                          'relative flex gap-4 py-3 px-4 transition-colors hover:bg-gray-50/50',
                          idx !== allDaysWithItems.length - 1 && 'border-b border-gray-50'
                        )}
                      >
                        {/* Timeline dot */}
                        <div className="relative flex-shrink-0 mt-0.5">
                          <div
                            className={cn(
                              'w-[10px] h-[10px] rounded-full border-2 border-white shadow-sm',
                              isToday(day) ? 'bg-primary-500 animate-pulse-dot' : isPast ? 'bg-gray-300' : 'bg-blue-400'
                            )}
                          />
                        </div>

                        {/* Date column */}
                        <div className="flex-shrink-0 w-12 text-right">
                          <div className={cn(
                            'text-sm font-semibold',
                            isToday(day) ? 'text-primary-600' : 'text-gray-800'
                          )}>
                            {format(day, 'd')}
                          </div>
                          <div className="text-[10px] text-gray-400 uppercase tracking-wider">
                            {format(day, 'EEE', { locale: ru })}
                          </div>
                        </div>

                        {/* Items */}
                        <div className="flex-1 min-w-0 space-y-1.5">
                          {items.map((item, i) => (
                            <div
                              key={i}
                              onClick={() => {
                                if (item.type === 'goal') {
                                  navigate(`/goals/${(item.item as Goal).id}`)
                                } else if (item.type === 'task') {
                                  handleEditTask(item.item as Task)
                                } else if (item.type === 'metric') {
                                  setSelectedMetricForModal(item.item as Metric)
                                }
                              }}
                              className={cn(
                                'flex items-center gap-2.5 p-2 rounded-lg cursor-pointer transition-all group',
                                item.type === 'goal' && 'hover:bg-blue-50',
                                item.type === 'task' && 'hover:bg-green-50',
                                item.type === 'metric' && 'hover:bg-purple-50'
                              )}
                            >
                              {/* Type icon */}
                              <div className={cn(
                                'w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0',
                                item.type === 'goal' && 'bg-blue-100 text-blue-600',
                                item.type === 'task' && (item.item as Task).completed ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500',
                                item.type === 'metric' && 'bg-purple-100 text-purple-600'
                              )}>
                                {item.type === 'task' ? (
                                  (item.item as Task).completed ? (
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                  ) : (
                                    <Circle className="w-3.5 h-3.5" />
                                  )
                                ) : item.type === 'goal' ? (
                                  <Target className="w-3.5 h-3.5" />
                                ) : (
                                  <Activity className="w-3.5 h-3.5" />
                                )}
                              </div>

                              {/* Content */}
                              <div className="flex-1 min-w-0">
                                <p className={cn(
                                  'text-sm font-medium leading-tight',
                                  item.type === 'task' && (item.item as Task).completed && 'line-through text-gray-400'
                                )}>
                                  {(item.item as Goal | Task | Metric).name}
                                </p>
                                {(item.type === 'task' && (item.item as Task).startTime) && (
                                  <p className="text-[10px] text-gray-400 mt-0.5">
                                    <Clock className="w-3 h-3 inline mr-0.5" />
                                    {(item.item as Task).startTime?.substring(0, 5)}
                                  </p>
                                )}
                              </div>

                              {/* Type badge */}
                              <span className={cn(
                                'text-[10px] px-2 py-0.5 rounded-full font-medium opacity-0 group-hover:opacity-100 transition-opacity',
                                item.type === 'goal' && 'bg-blue-100 text-blue-600',
                                item.type === 'task' && 'bg-green-100 text-green-600',
                                item.type === 'metric' && 'bg-purple-100 text-purple-600'
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
              )
            })()}
          </div>
        </div>
      )}

      {/* FAB + Menu */}
      <div className="fixed bottom-6 right-6 flex flex-col items-end gap-3 z-50">
        {showFabMenu && (
          <>
            <button
              onClick={() => {
                setShowFabMenu(false)
                navigate('/goals')
              }}
              className="flex items-center gap-3 bg-white shadow-lg rounded-full px-5 py-3 text-gray-700 hover:bg-gray-50 transition-all border border-gray-200"
            >
              <Target className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium whitespace-nowrap">Добавить цель</span>
            </button>
            <button
              onClick={() => {
                setShowFabMenu(false)
                setShowTaskSelector(true)
              }}
              className="flex items-center gap-3 bg-white shadow-lg rounded-full px-5 py-3 text-gray-700 hover:bg-gray-50 transition-all border border-gray-200"
            >
              <CheckCircle className="w-5 h-5 text-purple-600" />
              <span className="text-sm font-medium whitespace-nowrap">Добавить задачу</span>
            </button>
            <button
              onClick={() => {
                setShowFabMenu(false)
                navigate('/metrics')
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

      {/* Selected date modal */}
      <Modal
        isOpen={!!selectedDate}
        onClose={() => setSelectedDate(null)}
        title={selectedDate ? formatDate(selectedDate) : ''}
      >
        {selectedDate && (
          <div className="space-y-3">
            {getItemsForDate(selectedDate).length === 0 && (
              <p className="text-gray-500 text-center py-4">Нет событий на этот день</p>
            )}
            {getItemsForDate(selectedDate).map((item, i) => (
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
            ))}
            <button
              onClick={() => {
                setSelectedDate(null)
                setShowTaskSelector(true)
              }}
              className="w-full flex items-center justify-center gap-2 p-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors font-medium"
            >
              <Plus className="w-5 h-5" />
              Создать задачу
            </button>
          </div>
        )}
      </Modal>

      {/* Task Edit/Create Modal */}
      <Modal
        isOpen={showTaskModal}
        onClose={handleTaskSubmit}
        title={selectedTask ? "Редактировать задачу" : "Создать задачу"}
      >
        <TaskForm
          goalId={selectedTask?.goalId}
          onCancel={handleTaskSubmit}
          allowGoalSelection={!selectedTask}
          goals={allGoals}
          initialData={selectedTask ? {
            id: selectedTask.id,
            name: selectedTask.name,
            description: selectedTask.description,
            categoryId: selectedTask.categoryId,
            goalId: selectedTask.goalId,
            stageId: selectedTask.stageId,
            priority: selectedTask.priority,
            weight: selectedTask.weight,
            startDate: selectedTask.startDate ? new Date(selectedTask.startDate) : undefined,
            dueDate: selectedTask.dueDate ? new Date(selectedTask.dueDate) : undefined,
            startTime: selectedTask.startTime,
            endTime: selectedTask.endTime,
            duration: selectedTask.duration,
          } : createTaskDate ? {
            startDate: format(createTaskDate, 'yyyy-MM-dd'),
            dueDate: format(createTaskDate, 'yyyy-MM-dd'),
          } : undefined}
          onSubmit={handleTaskSubmit}
        />
      </Modal>

      <Modal
        isOpen={showCreateTask}
        onClose={handleTaskSubmit}
        title="Создать задачу"
      >
        <TaskForm
          onCancel={handleTaskSubmit}
          allowGoalSelection={true}
          goals={allGoals}
          initialData={createTaskDate ? {
            startDate: format(createTaskDate, 'yyyy-MM-dd'),
            dueDate: format(createTaskDate, 'yyyy-MM-dd'),
          } : undefined}
          onSubmit={handleTaskSubmit}
        />
      </Modal>

      <TaskSelectorModal
        isOpen={showTaskSelector}
        onClose={() => setShowTaskSelector(false)}
        onSelectTask={(task) => {
          if (selectedDate) {
            updateTask(task.id, { dueDate: selectedDate })
          } else {
            handleEditTask(task)
          }
        }}
        onCreateNewTask={() => {
          setShowCreateTask(true)
          setCreateTaskDate(selectedDate)
        }}
        selectedDate={selectedDate || undefined}
      />

      {selectedMetricForModal && (
        <MetricAnalyticsModal
          isOpen={true}
          onClose={() => setSelectedMetricForModal(null)}
          metric={selectedMetricForModal}
        />
      )}
      </div>
    </DndProvider>
  )
}
