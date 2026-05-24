import { useState, useMemo, useRef } from 'react'
import { useDrag, useDrop, DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { format, startOfWeek, addDays, isSameDay } from 'date-fns'
import { ru } from 'date-fns/locale'
import { 
  Plus, Clock, CheckCircle2, Circle, 
  MoreHorizontal, Edit2, Target
} from 'lucide-react'
import { useApiDataStore } from '@/stores/apiDataStore'
import { Modal } from './Modal'
import { TaskForm } from './forms/TaskForm'
import { TaskSelectorModal } from './TaskSelectorModal'
import { cn } from '@/lib/utils'
import type { Task } from '@/types'

// Drag item types
const ItemTypes = {
  TASK: 'task',
}

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

const PRIORITY_COLORS: Record<number, string> = {
  1: '#ef4444',
  2: '#f97316',
  3: '#eab308',
  4: '#22c55e',
  5: '#3b82f6',
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

// Task card component with react-dnd drag
interface TaskCardProps {
  task: KanbanTask
  onToggleComplete: (task: KanbanTask) => void
  onSelect: (task: KanbanTask) => void
  getCategoryColor: (categoryId?: string, goalId?: string) => string
  getGoalName: (goalId?: string) => string | undefined
}

function TaskCard({ task, onToggleComplete, onSelect, getCategoryColor, getGoalName }: TaskCardProps) {
  const ref = useRef<HTMLDivElement>(null)
  
  const [{ isDragging }, drag] = useDrag({
    type: ItemTypes.TASK,
    item: { task },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  })

  drag(ref)

  const getCardStyle = (): React.CSSProperties => {
    const priorityBg = task.priority >= 1 && task.priority <= 5
      ? hexToRgba(PRIORITY_COLORS[task.priority], 0.06)
      : undefined
    return {
      borderLeftColor: getCategoryColor(task.categoryId, task.goalId),
      backgroundColor: priorityBg || '#ffffff',
    }
  }

  return (
    <div
      ref={ref}
      className={cn(
        "group rounded-lg p-2.5 shadow-sm cursor-move hover:shadow-md transition-all border-l-4",
        task.completed && "opacity-60",
        isDragging && "opacity-50 rotate-2 scale-95"
      )}
      style={getCardStyle()}
    >
      <div className="flex items-start gap-2">
        <button
          onClick={() => onToggleComplete(task)}
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
            "text-xs font-medium leading-tight line-clamp-2",
            task.completed && "line-through text-gray-500"
          )}>
            {task.name}
          </p>
          
          <div className="flex items-center gap-1 mt-1.5 flex-wrap">
            {/* Time display */}
            {task.startTime && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                <Clock className="w-2.5 h-2.5" />
                {task.startTime?.substring(0, 5)}
                {task.endTime && ` - ${task.endTime?.substring(0, 5)}`}
              </span>
            )}
            
            {/* Time block badge */}
            {task.timeBlock && (
              <span className={cn(
                "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium",
                TIME_BLOCKS.find(t => t.id === task.timeBlock)?.color
              )}>
                {TIME_BLOCKS.find(t => t.id === task.timeBlock)?.label}
              </span>
            )}
            
            {/* Goal badge if task belongs to goal */}
            {task.goalId && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                <Target className="w-2.5 h-2.5" />
                <span className="truncate max-w-[80px]">{getGoalName(task.goalId)}</span>
              </span>
            )}
          </div>
        </div>

        <button
          onClick={() => onSelect(task)}
          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-100 rounded transition-all"
        >
          <MoreHorizontal className="w-4 h-4 text-gray-400" />
        </button>
      </div>
    </div>
  )
}

// Day column component with react-dnd drop
interface DayColumnProps {
  day: DayColumn
  onDrop: (task: KanbanTask, targetDate: Date) => void
  onToggleComplete: (task: KanbanTask) => void
  onSelect: (task: KanbanTask) => void
  getCategoryColor: (categoryId?: string, goalId?: string) => string
  getGoalName: (goalId?: string) => string | undefined
  onAddTask: (date: Date) => void
}

function DayColumn({ day, onDrop, onToggleComplete, onSelect, getCategoryColor, getGoalName, onAddTask }: DayColumnProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: ItemTypes.TASK,
    drop: (item: { task: KanbanTask }) => {
      onDrop(item.task, day.date)
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  })

  drop(ref)

  return (
    <div
      ref={ref}
      className={cn(
        "transition-all",
        isSameDay(day.date, new Date()) && "ring-2 ring-blue-500",
        isOver && canDrop && "ring-2 ring-blue-400 bg-blue-50",
        isOver && !canDrop && "ring-2 ring-red-400 bg-red-50"
      )}
    >
      {/* Day Header */}
      <div className="flex items-center justify-between p-4 bg-gray-50 border-b">
        <div className="min-w-0">
          <h3 className={cn(
            "text-base font-semibold capitalize",
            isSameDay(day.date, new Date()) ? "text-blue-700" : "text-gray-700"
          )}>
            {day.title}
          </h3>
          <p className="text-sm text-gray-500">
            {format(day.date, 'd MMMM yyyy', { locale: ru })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onAddTask(day.date)}
            className="flex items-center justify-center w-7 h-7 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-600 hover:text-gray-800 transition-all hover:shadow-sm active:scale-90"
            title="Добавить задачу"
          >
            <Plus className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium text-gray-400 bg-white px-2 py-1 rounded-full">
            {day.tasks.length}
          </span>
        </div>
      </div>

      {/* Tasks */}
      <div className="p-4">
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {day.tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onToggleComplete={onToggleComplete}
              onSelect={onSelect}
              getCategoryColor={getCategoryColor}
              getGoalName={getGoalName}
            />
          ))}

          {/* Empty state */}
          {day.tasks.length === 0 && (
            <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
              <p className="text-sm">Нет задач</p>
              <p className="text-xs mt-1">Перетащите сюда</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

interface WeeklyKanbanProps {
  className?: string
  weekStart?: Date
}

export function WeeklyKanban({ className, weekStart }: WeeklyKanbanProps) {
  const { tasks, updateTask, categories, goals } = useApiDataStore()
  const [internalWeekStart, setInternalWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [selectedTask, setSelectedTask] = useState<KanbanTask | null>(null)
  const [editingTask, setEditingTask] = useState<KanbanTask | null>(null)
  const [taskSelectorDate, setTaskSelectorDate] = useState<Date | null>(null)

  const currentWeekStart = weekStart || internalWeekStart

  // Calculate week days
  const weekDays = useMemo(() => {
    return WEEK_DAYS.map((day, index) => {
      const date = addDays(currentWeekStart, index)
      const dayTasks = tasks.filter(task => {
        const taskStart = task.startDate ? new Date(task.startDate) : null
        const taskDue = task.dueDate ? new Date(task.dueDate) : null
        return (taskDue && isSameDay(taskDue, date)) || (taskStart && isSameDay(taskStart, date))
      }).map(task => ({
        ...task,
        timeBlock: task.startTime ? getTimeBlock(task.startTime) : undefined,
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

  function getTimeBlock(time: string): string {
    const hour = parseInt(time.split(':')[0], 10)
    if (hour < 12) return 'morning'
    if (hour < 18) return 'afternoon'
    return 'evening'
  }

  // Handle task drop with time-blocking preservation
  const handleDrop = (task: KanbanTask, targetDate: Date) => {
    // Update task due date to the target day
    const newDueDate = new Date(targetDate)
    
    // Build updates object
    const updates: Partial<Task> = {
      dueDate: newDueDate,
    }

    // If task has startTime, adjust it to the new date
    if (task.startTime) {
      const [hours, minutes] = task.startTime.split(':').map(Number)
      newDueDate.setHours(hours, minutes)
      
      // If task has duration, calculate new endTime
      if (task.duration) {
        const endDate = new Date(newDueDate.getTime() + task.duration * 60000)
        updates.endTime = format(endDate, 'HH:mm')
      }
    } else if (task.dueDate) {
      // Preserve time from original date
      const oldDate = new Date(task.dueDate)
      newDueDate.setHours(oldDate.getHours(), oldDate.getMinutes())
    } else {
      // Default time based on timeBlock or 9 AM
      newDueDate.setHours(9, 0)
    }

    updateTask(task.id, updates)
  }

  const toggleTaskComplete = (task: KanbanTask) => {
    updateTask(task.id, { 
      completed: !task.completed,
      completedAt: !task.completed ? new Date() : undefined
    })
  }

  const getCategoryColor = (categoryId?: string, goalId?: string) => {
    if (categoryId) {
      const category = categories.find(c => c.id === categoryId)
      if (category?.color) return category.color
    }
    if (goalId) {
      const goal = goals.find(g => g.id === goalId)
      if (goal?.categoryId) {
        const category = categories.find(c => c.id === goal.categoryId)
        if (category?.color) return category.color
      }
    }
    return '#6b7280'
  }

  const getGoalName = (goalId?: string) => {
    const goal = goals.find(g => g.id === goalId)
    return goal?.name
  }

  const handleAddTask = (date: Date) => {
    setTaskSelectorDate(date)
  }

  const handleSelectTask = (task: Task) => {
    if (taskSelectorDate) {
      updateTask(task.id, { dueDate: taskSelectorDate })
    }
    setTaskSelectorDate(null)
  }

  const handleCreateNewTask = () => {
    if (taskSelectorDate) {
      const event = new CustomEvent('createTask', { detail: taskSelectorDate })
      window.dispatchEvent(event)
    }
    setTaskSelectorDate(null)
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className={cn("space-y-4", className)}>
        {/* Legend */}
        <div className="flex items-center gap-4 text-sm">
          <span className="text-gray-500">Временные блоки:</span>
          {TIME_BLOCKS.map(block => (
            <div key={block.id} className={cn("px-3 py-1 rounded-full text-xs font-medium", block.color)}>
              {block.label} ({block.time})
            </div>
          ))}
        </div>

        {/* Kanban Board - Vertical Layout */}
        <div className="space-y-4 min-h-[500px]">
          {weekDays.map((day) => (
            <div key={day.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
              <DayColumn
                day={day}
                onDrop={handleDrop}
                onToggleComplete={toggleTaskComplete}
                onSelect={setSelectedTask}
                getCategoryColor={getCategoryColor}
                getGoalName={getGoalName}
                onAddTask={handleAddTask}
              />
            </div>
          ))}
        </div>

        {/* Task Detail Modal */}
        {selectedTask && (
            <TaskDetailModal
              task={selectedTask}
              onClose={() => setSelectedTask(null)}
              onUpdate={(updates) => {
                console.log('[WeeklyKanban] Updating task:', selectedTask.id, updates)
                updateTask(selectedTask.id, updates)
                setSelectedTask(null)
              }}
              onEdit={() => {
                setEditingTask(selectedTask)
                setSelectedTask(null)
              }}
            />
        )}

        {/* Edit Task Modal */}
        {editingTask && (
          <Modal
            isOpen={true}
            onClose={() => setEditingTask(null)}
            title="Редактировать задачу"
          >
            <TaskForm
              initialData={editingTask}
              onCancel={() => setEditingTask(null)}
              onSubmit={() => setEditingTask(null)}
            />
          </Modal>
        )}

        {/* Task Selector Modal */}
        <TaskSelectorModal
          isOpen={!!taskSelectorDate}
          onClose={() => setTaskSelectorDate(null)}
          onSelectTask={handleSelectTask}
          onCreateNewTask={handleCreateNewTask}
          selectedDate={taskSelectorDate || undefined}
        />
      </div>
    </DndProvider>
  )
}

// Task detail modal with time block selection
interface TaskDetailModalProps {
  task: KanbanTask
  onClose: () => void
  onUpdate: (updates: Partial<Task>) => void
  onEdit: () => void
}

function TaskDetailModal({ task, onClose, onUpdate, onEdit }: TaskDetailModalProps) {
  const [timeBlock, setTimeBlock] = useState(task.timeBlock || 'morning')

  const handleTimeBlockChange = (blockId: string) => {
    setTimeBlock(blockId)
    // Update task time based on block
    const newDate = task.dueDate ? new Date(task.dueDate) : new Date()
    let startHour = 9
    switch (blockId) {
      case 'morning':
        startHour = 9
        break
      case 'afternoon':
        startHour = 14
        break
      case 'evening':
        startHour = 19
        break
    }
    newDate.setHours(startHour, 0)
    
    // Calculate end time based on duration
    const updates: Partial<Task> = { dueDate: newDate }
    if (task.duration) {
      const endDate = new Date(newDate.getTime() + task.duration * 60000)
      updates.endTime = format(endDate, 'HH:mm')
      updates.startTime = format(newDate, 'HH:mm')
    }
    
    onUpdate(updates)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold">{task.name}</h3>
          <button onClick={onEdit} className="p-2 hover:bg-gray-100 rounded-lg">
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

          {task.startTime && (
            <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
              <p><strong>Время:</strong> {task.startTime?.substring(0, 5)} {task.endTime && `- ${task.endTime?.substring(0, 5)}`}</p>
              {task.duration && <p><strong>Длительность:</strong> {task.duration} мин</p>}
            </div>
          )}

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
