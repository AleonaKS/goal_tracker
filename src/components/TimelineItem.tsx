import { Target, Flag, CheckCircle, AlertCircle, Clock, CalendarDays } from 'lucide-react'
import { ProgressBar } from './ProgressBar'
import { cn } from '@/lib/utils'

interface TimelineItemProps {
  item: {
    id: string
    name: string
    type: string
    start: number
    end: number
    progress: number
    categoryId?: string
  }
  categoryColor?: string
}

export function TimelineItem({ item, categoryColor }: TimelineItemProps) {
  const progress = item.progress || 0
  const duration = item.end - item.start
  const days = Math.ceil(duration / (1000 * 60 * 60 * 24))

  // Получение иконки и цвета на основе типа
  const getIcon = () => {
    const colorClass = progress === 100 ? 'text-green-600' : 
      item.type === 'goal' ? 'text-blue-600' :
      item.type === 'stage' ? 'text-purple-600' : 'text-amber-600'
    
    switch (item.type) {
      case 'goal':
        return <Target className={cn('w-5 h-5', colorClass)} />
      case 'stage':
        return <Flag className={cn('w-5 h-5', colorClass)} />
      case 'task':
        return <CheckCircle className={cn('w-5 h-5', colorClass)} />
    }
  }

  // Получение цвета полосы прогресса
  const getProgressColor = () => {
    if (item.type === 'goal') return categoryColor || '#3b82f6'
    if (item.type === 'stage') return '#8b5cf6'
    return progress === 100 ? '#10b981' : '#f59e0b'
  }

  // Получение значка статуса
  const getStatusBadge = () => {
    if (progress === 100) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
          <CheckCircle className="w-3 h-3" />
          Выполнено
        </span>
      )
    }
    if (Date.now() > item.end) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
          <AlertCircle className="w-3 h-3" />
          Просрочено
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
        <Clock className="w-3 h-3" />
        В работе
      </span>
    )
  }

  return (
    <div className="group">
      <div className="flex items-center gap-4">
        {/* Icon */}
        <div className="flex-shrink-0 w-10 flex justify-center">
          {getIcon()}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-medium text-gray-900 truncate pr-2">{item.name}</h3>
            <div className="flex items-center gap-2 text-xs text-gray-500 flex-shrink-0">
              <CalendarDays className="w-3 h-3" />
              <span>{days} дней</span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="relative">
            <div className="h-6 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className="h-full rounded-full transition-all duration-500"
                style={{ 
                  width: `${Math.min(progress, 100)}%`,
                  backgroundColor: getProgressColor()
                }}
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
          {getStatusBadge()}
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
}
