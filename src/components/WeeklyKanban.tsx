import { useState, useMemo } from 'react'
import { format, startOfWeek, addDays, isSameDay, parseISO, startOfDay } from 'date-fns'
import { ru } from 'date-fns/locale'
import { 
  Plus, Calendar, Clock, CheckCircle2, Circle, GripVertical, 
  ChevronLeft, ChevronRight, MoreHorizontal, Trash2, Edit2, Target
} from 'lucide-react'
import { useApiDataStore } from '@/stores/apiDataStore'
import { cn } from '@/lib/utils'
import type { Task } from '@/types'

interface KanbanTask extends Task {
  timeBlock?: string
  estimatedDuration?: number // in minutes
}

type WeekDay = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'

interface DayColumn {
  id: WeekDay
  title: string
  date: Date
  tasks: KanbanTask[]
}

const WEEK_DAYS: WeekDay[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

const TIME_BLOCKS = [
  { id: 'morning', label: 'Утро', time: '06:00-12:00', color: 'bg-orange-100 text-orange-700' },
  { id: 'afternoon', label: 'День', time: '12:00-18:00', color: 'bg-blue-100 text-blue-700' },
  { id: 'evening', label: 'Вечер', time: '18:00-22:00', color: 'bg-purple-100 text-purple-700' },
]

interface WeeklyKanbanProps {
  className?: string
}

export function WeeklyKanban({ className }: WeeklyKanbanProps) {
  const { tasks, updateTask, categories } = useApiDataStore()
  const [currentWeekStart, setCurrentWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [draggedTask, setDraggedTask] = useState<KanbanTask | null>(null)
  const [selectedTask, setSelectedTask] = useState<KanbanTask | null>(null)

  // Calculate week days
  const weekDays = useMemo(() => {
    return WEEK_DAYS.map((day, index) => {
      const date = addDays(currentWeekStart, index)
      const dayTasks = tasks.filter(task => {
        if (!task.dueDate) return false
        return isSameDay(parseISO(task.dueDate.toString()), date)
      }).map(task => ({
        ...task,
        timeBlock: task.dueDate ? getTimeBlock(new Date(task.dueDate)) : undefined,
      })) as KanbanTask[]

      return {
        id: day,
        title: format(date, 'EEEE', { locale: ru }),
        date,
        tasks: dayTasks.sort((a, b) => {
          // Sort by time block, then by completion
          const aTime = TIME_BLOCKS.findIndex(t => t.id === a.timeBlock)
          const bTime = TIME_BLOCKS.findIndex(t => t.id === b.timeBlock)
          if (aTime !== bTime) return aTime - bTime
          return (a.completed ? 1 : 0) - (b.completed ? 1 : 0)
        }),
      }
    })
  }, [currentWeekStart, tasks])

  function getTimeBlock(date: Date): string {
    const hour = date.getHours()
    if (hour < 12) return 'morning'
    if (hour < 18) return 'afternoon'
    return 'evening'
  }

  const handleDragStart = (task: KanbanTask) => {
    setDraggedTask(task)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent, dayId: WeekDay) => {
    e.preventDefault()
    if (!draggedTask) return

    const targetDay = weekDays.find(d => d.id === dayId)
    if (!targetDay) return

    // Update task due date to the target day
    const newDueDate = new Date(targetDay.date)
    // Preserve time if exists, otherwise set to default
    if (draggedTask.dueDate) {
      const oldDate = new Date(draggedTask.dueDate)
      newDueDate.setHours(oldDate.getHours(), oldDate.getMinutes())
    } else {
      newDueDate.setHours(9, 0) // Default 9 AM
    }

    updateTask(draggedTask.id, { dueDate: newDueDate })
    setDraggedTask(null)
  }

  const navigateWeek = (direction: 'prev' | 'next') => {
    const days = direction === 'prev' ? -7 : 7
    setCurrentWeekStart(addDays(currentWeekStart, days))
  }

  const toggleTaskComplete = (task: KanbanTask) => {
    updateTask(task.id, { 
      completed: !task.completed,
      completedAt: !task.completed ? new Date() : undefined
    })
  }

  const getCategoryColor = (categoryId?: string) => {
    const category = categories.find(c => c.id === categoryId)
    return category?.color || '#6b7280'
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between bg-white rounded-xl p-4 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Планирование недели</h2>
          <p className="text-sm text-gray-500">
            {format(currentWeekStart, 'd MMMM', { locale: ru })} - {format(addDays(currentWeekStart, 6), 'd MMMM yyyy', { locale: ru })}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigateWeek('prev')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
            className="px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            Сегодня
          </button>
          <button
            onClick={() => navigateWeek('next')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-sm">
        <span className="text-gray-500">Временные блоки:</span>
        {TIME_BLOCKS.map(block => (
          <div key={block.id} className={cn("px-3 py-1 rounded-full text-xs font-medium", block.color)}>
            {block.label} ({block.time})
          </div>
        ))}
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-7 gap-3 min-h-[600px]">
        {weekDays.map((day) => (
          <div
            key={day.id}
            className={cn(
              "bg-gray-50 rounded-xl p-3 flex flex-col min-h-[500px]",
              isSameDay(day.date, new Date()) && "ring-2 ring-blue-500 bg-blue-50/50"
            )}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, day.id)}
          >
            {/* Day Header */}
            <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-200">
              <div>
                <h3 className={cn(
                  "font-semibold capitalize",
                  isSameDay(day.date, new Date()) ? "text-blue-700" : "text-gray-700"
                )}>
                  {day.title}
                </h3>
                <p className="text-xs text-gray-500">
                  {format(day.date, 'd MMM', { locale: ru })}
                </p>
              </div>
              <span className="text-xs font-medium text-gray-400 bg-white px-2 py-1 rounded-full">
                {day.tasks.length}
              </span>
            </div>

            {/* Tasks */}
            <div className="space-y-2 flex-1">
              {day.tasks.map((task) => (
                <div
                  key={task.id}
                  draggable
                  onDragStart={() => handleDragStart(task)}
                  className={cn(
                    "group bg-white rounded-lg p-3 shadow-sm cursor-move hover:shadow-md transition-all border-l-4",
                    task.completed && "opacity-60"
                  )}
                  style={{ borderLeftColor: getCategoryColor(task.categoryId) }}
                >
                  <div className="flex items-start gap-2">
                    <button
                      onClick={() => toggleTaskComplete(task)}
                      className={cn(
                        "mt-0.5 flex-shrink-0",
                        task.completed ? "text-green-500" : "text-gray-400 hover:text-gray-600"
                      )}
                    >
                      {task.completed ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : (
                        <Circle className="w-5 h-5" />
                      )}
                    </button>
                    
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "text-sm font-medium truncate",
                        task.completed && "line-through text-gray-500"
                      )}>
                        {task.name}
                      </p>
                      
                      {/* Time block badge */}
                      {task.timeBlock && (
                        <span className={cn(
                          "inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded text-xs",
                          TIME_BLOCKS.find(t => t.id === task.timeBlock)?.color
                        )}>
                          <Clock className="w-3 h-3" />
                          {TIME_BLOCKS.find(t => t.id === task.timeBlock)?.label}
                        </span>
                      )}
                      
                      {/* Goal badge if task belongs to goal */}
                      {task.goalId && (
                        <span className="inline-flex items-center gap-1 mt-1 ml-1 px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600">
                          <Target className="w-3 h-3" />
                          Цель
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => setSelectedTask(task)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-100 rounded transition-all"
                    >
                      <MoreHorizontal className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                </div>
              ))}

              {/* Empty state */}
              {day.tasks.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  <p className="text-sm">Нет задач</p>
                  <p className="text-xs mt-1">Перетащите сюда</p>
                </div>
              )}
            </div>

            {/* Add task button */}
            <button
              className="mt-3 flex items-center justify-center gap-2 p-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Добавить
            </button>
          </div>
        ))}
      </div>

      {/* Task Detail Modal (simplified) */}
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onUpdate={(updates) => {
            updateTask(selectedTask.id, updates)
            setSelectedTask(null)
          }}
        />
      )}
    </div>
  )
}

// Simplified task detail modal
interface TaskDetailModalProps {
  task: KanbanTask
  onClose: () => void
  onUpdate: (updates: Partial<Task>) => void
}

function TaskDetailModal({ task, onClose, onUpdate }: TaskDetailModalProps) {
  const [timeBlock, setTimeBlock] = useState(task.timeBlock || 'morning')

  const handleTimeBlockChange = (blockId: string) => {
    setTimeBlock(blockId)
    // Update task time based on block
    const newDate = task.dueDate ? new Date(task.dueDate) : new Date()
    switch (blockId) {
      case 'morning':
        newDate.setHours(9, 0)
        break
      case 'afternoon':
        newDate.setHours(14, 0)
        break
      case 'evening':
        newDate.setHours(19, 0)
        break
    }
    onUpdate({ dueDate: newDate })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold">{task.name}</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <Edit2 className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Временной блок
            </label>
            <div className="grid grid-cols-3 gap-2">
              {TIME_BLOCKS.map(block => (
                <button
                  key={block.id}
                  onClick={() => handleTimeBlockChange(block.id)}
                  className={cn(
                    "p-3 rounded-xl text-sm font-medium transition-all",
                    timeBlock === block.id
                      ? block.color + " ring-2 ring-offset-2 ring-blue-500"
                      : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                  )}
                >
                  <div className="font-semibold">{block.label}</div>
                  <div className="text-xs opacity-75">{block.time}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={() => onUpdate({ completed: !task.completed })}
              className={cn(
                "flex-1 px-4 py-2 rounded-lg font-medium transition-colors",
                task.completed
                  ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  : "bg-green-500 text-white hover:bg-green-600"
              )}
            >
              {task.completed ? 'Отметить невыполненной' : 'Отметить выполненной'}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-500 hover:text-gray-700 transition-colors"
            >
              Закрыть
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default WeeklyKanban
