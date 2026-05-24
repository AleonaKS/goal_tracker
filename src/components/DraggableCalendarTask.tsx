import { useRef } from 'react'
import { useDrag, useDrop } from 'react-dnd'
import { format, isSameDay } from 'date-fns'
import { Clock, Target, Circle, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Task } from '@/types'

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

const ItemTypes = {
  TASK: 'task',
}

interface DraggableCalendarTaskProps {
  task: Task
  onDrop: (task: Task, targetDate: Date) => void
  onToggleComplete: (task: Task) => void
  onEdit: (task: Task) => void
  getCategoryColor: (categoryId?: string, goalId?: string) => string
  getGoalName: (goalId?: string) => string | undefined
  currentDate: Date
  dateType?: 'start' | 'due' | 'both'
}

export function DraggableCalendarTask({ 
  task, 
  onDrop, 
  onToggleComplete, 
  onEdit, 
  getCategoryColor, 
  getGoalName,
  currentDate,
  dateType,
}: DraggableCalendarTaskProps) {
  const ref = useRef<HTMLDivElement>(null)
  
  const [{ isDragging }, drag] = useDrag({
    type: ItemTypes.TASK,
    item: { task },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  })

  drag(ref)

  const categoryColor = getCategoryColor(task.categoryId, task.goalId)

  const getCardStyle = (): React.CSSProperties => {
    const priorityBg = task.priority >= 1 && task.priority <= 5
      ? hexToRgba(PRIORITY_COLORS[task.priority], 0.06)
      : undefined

    const borders = (() => {
      switch (dateType) {
        case 'start':
          return { borderLeft: `3px solid ${categoryColor}`, borderRight: 'none' }
        case 'due':
          return { borderLeft: 'none', borderRight: `3px solid ${categoryColor}` }
        case 'both':
          return { borderLeft: `3px solid ${categoryColor}`, borderRight: `3px solid ${categoryColor}` }
        default:
          return { borderLeft: `3px solid ${categoryColor}`, borderRight: 'none' }
      }
    })()

    return {
      backgroundColor: priorityBg || '#ffffff',
      ...borders,
    }
  }

  return (
    <div
      ref={ref}
      className={cn(
        "group rounded-lg shadow-sm cursor-move transition-all duration-150",
        task.completed && "opacity-60",
        isDragging && "opacity-50 rotate-2 scale-95 shadow-xl ring-2 ring-primary-400 ring-offset-2",
        !isDragging && "hover:shadow-md hover:-translate-y-0.5"
      )}
      style={getCardStyle()}
    >
      <div className="p-1.5 flex items-start gap-1.5">
        {/* Checkbox */}
        <button
          onClick={(e) => { e.stopPropagation(); onToggleComplete(task) }}
          className="flex-shrink-0 mt-0.5"
        >
          {task.completed ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
          ) : (
            <Circle className="w-3.5 h-3.5 text-gray-300 hover:text-gray-500 transition-colors" />
          )}
        </button>

        <div className="flex-1 min-w-0">
          <p
            className={cn(
              "text-xs font-medium leading-tight truncate cursor-pointer",
              task.completed && "line-through text-gray-400"
            )}
            onClick={() => onEdit(task)}
          >
            {task.name}
          </p>

          <div className="flex items-center gap-1 mt-0.5 flex-wrap">
            {task.startTime && (
              <span className="inline-flex items-center gap-0.5 px-1 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px] font-medium">
                <Clock className="w-2 h-2" />
                {task.startTime?.substring(0, 5)}
              </span>
            )}
            {task.goalId && (
              <span
                className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[10px] font-medium"
                style={{ backgroundColor: categoryColor + '18', color: categoryColor }}
              >
                <Target className="w-2 h-2" style={{ color: categoryColor }} />
                <span className="truncate max-w-[60px]">{getGoalName(task.goalId)}</span>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Droppable day cell component
interface DroppableDayCellProps {
  date: Date
  children: React.ReactNode
  onDrop: (task: Task, targetDate: Date) => void
  isCurrentMonth: boolean
  isToday: boolean
  showHeatmap?: boolean
  taskCount?: number
  isWeekend?: boolean
}

export function DroppableDayCell({ 
  date, 
  children, 
  onDrop, 
  isCurrentMonth, 
  isToday,
  showHeatmap = false,
  taskCount = 0,
  isWeekend = false
}: DroppableDayCellProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: ItemTypes.TASK,
    drop: (item: { task: Task }) => {
      onDrop(item.task, date)
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  })

  drop(ref)

  const heatmapIntensity = showHeatmap && taskCount > 0
    ? Math.min(1, taskCount / 5)
    : 0

  return (
    <div
      ref={ref}
      className={cn(
        'min-h-[100px] p-2 border-b border-r text-left transition-all duration-150',
        !isCurrentMonth && 'bg-gray-50/50 text-gray-400',
        isToday && 'bg-primary-50',
        isWeekend && isCurrentMonth && !isToday && 'bg-gray-50/30',
        isOver && canDrop && 'bg-blue-50 shadow-inner ring-2 ring-primary-300 ring-inset scale-[1.02] z-10',
        isOver && !canDrop && 'bg-red-50 ring-2 ring-red-300 ring-inset'
      )}
      style={heatmapIntensity > 0 ? {
        background: isToday
          ? undefined
          : `linear-gradient(135deg, rgba(59,130,246,${heatmapIntensity * 0.12}) 0%, rgba(59,130,246,${heatmapIntensity * 0.06}) 100%)`
      } : undefined}
    >
      {children}
    </div>
  )
}
