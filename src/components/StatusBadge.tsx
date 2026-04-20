import { cn, getStatusLabel, getStatusColor } from '@/lib/utils'
import type { GoalStatus } from '@/types'

interface StatusBadgeProps {
  status: GoalStatus
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const label = getStatusLabel(status)
  const colorClass = getStatusColor(status)

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white',
        colorClass,
        className
      )}
    >
      {label}
    </span>
  )
}

interface PriorityBadgeProps {
  priority: number
  className?: string
}

export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  const getColor = () => {
    if (priority >= 5) return 'bg-red-100 text-red-800'
    if (priority >= 3) return 'bg-yellow-100 text-yellow-800'
    return 'bg-green-100 text-green-800'
  }

  const getLabel = () => {
    if (priority >= 5) return 'Высокий'
    if (priority >= 3) return 'Средний'
    return 'Низкий'
  }

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        getColor(),
        className
      )}
    >
      {getLabel()}
    </span>
  )
}
