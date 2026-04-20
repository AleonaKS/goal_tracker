import { useState, useMemo } from 'react'
import { format, startOfWeek, addDays, isSameDay, parseISO, setHours, setMinutes } from 'date-fns'
import { ru } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Clock, CheckCircle2, Circle, Plus, GripVertical } from 'lucide-react'
import { useApiDataStore } from '@/stores/apiDataStore'
import { cn } from '@/lib/utils'
import { Modal } from '@/components/Modal'
import { TaskForm } from '@/components/forms/TaskForm'
import type { Task, Metric } from '@/types'

interface WeeklyTimelineViewProps {
  className?: string
}

const HOURS = Array.from({ length: 24 }, (_, i) => i)
const DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

export function WeeklyTimelineView({ className }: WeeklyTimelineViewProps) {
  const { tasks, updateTask, updateMetric, metrics, metricEntries } = useApiDataStore()
  const [currentWeekStart, setCurrentWeekStart] = useState(() => 
    startOfWeek(new Date(), { weekStartsOn: 1 })
  )
  const [selectedSlot, setSelectedSlot] = useState<{ day: number; hour: number } | null>(null)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [editingMetric, setEditingMetric] = useState<Metric | null>(null)
  const [metricTime, setMetricTime] = useState('09:00')
  const [draggedTask, setDraggedTask] = useState<Task | null>(null)
  const [dragOverSlot, setDragOverSlot] = useState<{ day: number; hour: number } | null>(null)

  // Calculate week days
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i))
  }, [currentWeekStart])

  // Get tasks with time for a specific day
  const getTimedItemsForDay = (date: Date): Array<(Task | Metric) & { 
    type: 'task' | 'habit'
    startHour: number
    endHour: number
    startTime: string
    endTime: string
  }> => {
    const items: Array<(Task | Metric) & { 
      type: 'task' | 'habit'
      startHour: number
      endHour: number
      startTime: string
      endTime: string
    }> = []

    // Tasks with time
    tasks.forEach(task => {
      if (task.dueDate && isSameDay(parseISO(task.dueDate.toString()), date)) {
        if (task.startTime && task.endTime) {
          const [startH, startM] = task.startTime.split(':').map(Number)
          const [endH, endM] = task.endTime.split(':').map(Number)
          items.push({
            ...task,
            type: 'task' as const,
            startHour: startH + startM / 60,
            endHour: endH + endM / 60,
            startTime: task.startTime,
            endTime: task.endTime,
          })
        }
      }
    })

    // Habits (metrics) with scheduled time
    metrics.forEach(metric => {
      if (metric.type === 'habit') {
        // Check if habit has scheduled time and should appear on this date
        const todayEntry = metricEntries.find(e => {
          const entryDate = e.entryDate instanceof Date ? e.entryDate : new Date(e.entryDate)
          return e.metricId === metric.id && isSameDay(entryDate, date)
        })
        
        // Show habit if it has scheduled time for this day or has entry today
        if (metric.scheduledTime || todayEntry) {
          const [hourStr, minuteStr] = (metric.scheduledTime || '09:00').split(':')
          const hour = parseInt(hourStr, 10)
          const minute = parseInt(minuteStr, 10) || 0
          const duration = 30 // Default 30 min for habits
          
          items.push({
            ...metric,
            type: 'habit' as const,
            startHour: hour + minute / 60,
            endHour: hour + minute / 60 + duration / 60,
            startTime: metric.scheduledTime || '09:00',
            endTime: `${String(hour).padStart(2, '0')}:${String(minute + duration).padStart(2, '0')}`,
          })
        }
      }
    })

    return items.sort((a, b) => a.startHour - b.startHour)
  }

  const navigateWeek = (direction: 'prev' | 'next') => {
    const days = direction === 'prev' ? -7 : 7
    setCurrentWeekStart(addDays(currentWeekStart, days))
  }

  const toggleTaskComplete = (taskId: string, completed: boolean) => {
    updateTask(taskId, { 
      completed: !completed,
      completedAt: !completed ? new Date() : undefined
    })
  }

  // Drag and drop handlers
  const handleDragStart = (task: Task) => {
    setDraggedTask(task)
  }

  const handleDragOver = (e: React.DragEvent, dayIndex: number, hour: number) => {
    e.preventDefault()
    setDragOverSlot({ day: dayIndex, hour })
  }

  const handleDragLeave = () => {
    setDragOverSlot(null)
  }

  const handleDrop = (e: React.DragEvent, dayIndex: number, hour: number) => {
    e.preventDefault()
    if (!draggedTask) return

    const targetDate = weekDays[dayIndex]
    if (!targetDate) return

    // Calculate new times based on drop position
    const duration = draggedTask.duration || 60 // default 1 hour
    const newStartTime = `${String(hour).padStart(2, '0')}:00`
    const endHour = hour + Math.floor(duration / 60)
    const endMinutes = duration % 60
    const newEndTime = `${String(endHour).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`

    // Update task with new date and time
    const newDueDate = setMinutes(setHours(targetDate, hour), 0)
    
    updateTask(draggedTask.id, { 
      dueDate: newDueDate,
      startTime: newStartTime,
      endTime: newEndTime,
    })
    
    setDraggedTask(null)
    setDragOverSlot(null)
  }

  // Calculate position for an item
  const getItemStyle = (item: { startHour: number; endHour: number }) => {
    const hourHeight = 60 // pixels per hour
    const top = item.startHour * hourHeight
    const height = (item.endHour - item.startHour) * hourHeight
    return { top: `${top}px`, height: `${height - 2}px` }
  }

  // Today's date for highlighting
  const today = useMemo(() => new Date(), [])

  // Get current time position
  const currentTimePosition = useMemo(() => {
    const currentDayIndex = weekDays.findIndex(d => isSameDay(d, today))
    if (currentDayIndex === -1) return null
    
    const hourHeight = 60
    const minutes = today.getHours() * 60 + today.getMinutes()
    return {
      dayIndex: currentDayIndex,
      top: (minutes / 60) * hourHeight,
    }
  }, [weekDays, today])

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between bg-white rounded-xl p-4 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Недельное планирование</h2>
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

      {/* Timeline Grid */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {/* Day Headers */}
        <div className="flex border-b">
          <div className="w-16 bg-gray-50 border-r" /> {/* Time column */}
          {weekDays.map((day, index) => (
            <div 
              key={index} 
              className={cn(
                "flex-1 py-3 text-center border-r last:border-r-0",
                isSameDay(day, today) && "bg-blue-50"
              )}
            >
              <div className={cn(
                "text-sm font-medium",
                isSameDay(day, today) ? "text-blue-700" : "text-gray-700"
              )}>
                {DAYS[index]}
              </div>
              <div className={cn(
                "text-lg font-bold",
                isSameDay(day, today) ? "text-blue-600" : "text-gray-900"
              )}>
                {format(day, 'd')}
              </div>
            </div>
          ))}
        </div>

        {/* Time Grid */}
        <div className="relative overflow-y-auto max-h-[600px]">
          <div className="flex">
            {/* Time labels */}
            <div className="w-16 bg-gray-50 flex-shrink-0">
              {HOURS.map(hour => (
                <div 
                  key={hour} 
                  className="h-[60px] border-b border-gray-100 flex items-start justify-end pr-2 pt-1"
                >
                  <span className="text-xs text-gray-500">
                    {String(hour).padStart(2, '0')}:00
                  </span>
                </div>
              ))}
            </div>

            {/* Days columns */}
            {weekDays.map((day, dayIndex) => {
              const timedItems = getTimedItemsForDay(day)
              
              return (
                <div 
                  key={dayIndex} 
                  className={cn(
                    "flex-1 relative border-r last:border-r-0",
                    isSameDay(day, today) && "bg-blue-50/30"
                  )}
                >
                  {/* Hour grid lines with drag support */}
                  {HOURS.map(hour => (
                    <div 
                      key={hour}
                      className={cn(
                        "h-[60px] border-b border-gray-100 transition-colors",
                        dragOverSlot?.day === dayIndex && dragOverSlot?.hour === hour
                          ? "bg-blue-100 border-blue-300"
                          : "hover:bg-gray-50/50 cursor-pointer"
                      )}
                      onDragOver={(e) => handleDragOver(e, dayIndex, hour)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, dayIndex, hour)}
                      onClick={() => setSelectedSlot({ day: dayIndex, hour })}
                    >
                      {/* Half-hour line */}
                      <div className="h-[30px] border-b border-gray-50" />
                    </div>
                  ))}

                  {/* Timed items */}
                  {timedItems.map((item, i) => (
                    <div
                      key={`${item.id}-${i}`}
                      draggable={item.type === 'task'}
                      onDragStart={() => item.type === 'task' && handleDragStart(item as Task)}
                      className={cn(
                        "absolute left-1 right-1 rounded-lg p-2 text-xs cursor-pointer transition-all hover:shadow-md overflow-hidden group",
                        item.type === 'task' 
                          ? item.completed 
                            ? 'bg-green-100 text-green-800 border border-green-200'
                            : 'bg-blue-100 text-blue-800 border border-blue-200'
                          : 'bg-purple-100 text-purple-800 border border-purple-200',
                        draggedTask?.id === item.id && "opacity-50"
                      )}
                      style={getItemStyle(item)}
                      onClick={(e) => {
                        // Prevent edit when clicking checkbox
                        if ((e.target as HTMLElement).closest('button')) return
                        if (item.type === 'task') {
                          setEditingTask(item as Task)
                        } else if (item.type === 'habit') {
                          const metric = item as unknown as Metric
                          setEditingMetric(metric)
                          setMetricTime(metric.scheduledTime || '09:00')
                        }
                      }}
                    >
                      <div className="flex items-center gap-1">
                        {item.type === 'task' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleTaskComplete(item.id, item.completed)
                            }}
                            className="flex-shrink-0 hover:scale-110 transition-transform"
                          >
                            {item.completed ? (
                              <CheckCircle2 className="w-3 h-3" />
                            ) : (
                              <Circle className="w-3 h-3" />
                            )}
                          </button>
                        )}
                        {item.type === 'habit' && (
                          <Clock className="w-3 h-3 flex-shrink-0" />
                        )}
                        {/* Drag handle for tasks */}
                        {item.type === 'task' && (
                          <GripVertical className="w-3 h-3 flex-shrink-0 opacity-0 group-hover:opacity-50 cursor-grab active:cursor-grabbing" />
                        )}
                        <span className="font-medium truncate flex-1">{item.name}</span>
                      </div>
                      <div className="text-[10px] opacity-75 ml-4">
                        {item.startTime} - {item.endTime}
                      </div>
                    </div>
                  ))}

                  {/* Current time indicator */}
                  {currentTimePosition?.dayIndex === dayIndex && (
                    <div
                      className="absolute left-0 right-0 border-t-2 border-red-400 z-20 pointer-events-none"
                      style={{ top: `${currentTimePosition.top}px` }}
                    >
                      <div className="absolute -left-1 -top-1 w-2 h-2 bg-red-400 rounded-full" />
                    </div>
                  )}

                  {/* Empty slot hint */}
                  {selectedSlot?.day === dayIndex && timedItems.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xs text-gray-400">Нажмите чтобы добавить</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-sm bg-white rounded-xl p-3 shadow-sm">
        <span className="text-gray-500">Легенда:</span>
        <div className="flex items-center gap-2">
          <span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-800 border border-blue-200">
            Задача
          </span>
          <span className="px-2 py-1 rounded text-xs bg-green-100 text-green-800 border border-green-200">
            Выполнено
          </span>
          <span className="px-2 py-1 rounded text-xs bg-purple-100 text-purple-800 border border-purple-200">
            Привычка
          </span>
        </div>
      </div>

      {/* Task Edit Modal */}
      {editingTask && (
        <Modal
          isOpen={true}
          onClose={() => setEditingTask(null)}
          title="Редактировать задачу"
        >
          <TaskForm
            goalId={editingTask.goalId}
            stageId={editingTask.stageId}
            initialData={{
              id: editingTask.id,
              name: editingTask.name,
              description: editingTask.description,
              goalId: editingTask.goalId,
              stageId: editingTask.stageId,
              priority: editingTask.priority,
              complexity: editingTask.complexity,
              weight: editingTask.weight,
              startDate: editingTask.startDate ? new Date(editingTask.startDate) : undefined,
              dueDate: editingTask.dueDate ? new Date(editingTask.dueDate) : undefined,
              isPeriodBased: editingTask.isPeriodBased,
              duration: editingTask.duration,
              startTime: editingTask.startTime,
              endTime: editingTask.endTime,
            }}
            onSubmit={() => setEditingTask(null)}
            onCancel={() => setEditingTask(null)}
          />
        </Modal>
      )}

      {/* Metric Time Edit Modal */}
      {editingMetric && (
        <Modal
          isOpen={true}
          onClose={() => setEditingMetric(null)}
          title={`Время выполнения: ${editingMetric.name}`}
        >
          <div className="space-y-4 p-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Время выполнения привычки
              </label>
              <input
                type="time"
                value={metricTime}
                onChange={(e) => setMetricTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Установите время, когда вы обычно выполняете эту привычку
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={async () => {
                  await updateMetric(editingMetric.id, { scheduledTime: metricTime })
                  setEditingMetric(null)
                }}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Сохранить
              </button>
              <button
                onClick={() => setEditingMetric(null)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Отмена
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

export default WeeklyTimelineView
