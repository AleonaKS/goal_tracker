interface LinearProgressBarProps {
  current: number
  target: number
  startDate: Date
  endDate: Date
  color?: string
  height?: number
}

export function LinearProgressBar({
  current,
  target,
  startDate,
  endDate,
  color = '#10b981',
  height = 60
}: LinearProgressBarProps) {
  const progress = Math.min((current / target) * 100, 100)
  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
  const elapsedDays = Math.ceil((Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24))
  const expectedProgress = Math.min((elapsedDays / totalDays) * 100, 100)
  
  // Форматирование дат
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
  }

  return (
    <div className="w-full">
      {/* Progress info */}
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-medium text-gray-700">
          Прогресс
        </div>
        <div className="text-right">
          <span className="text-lg font-bold" style={{ color }}>
            {current.toFixed(1)}
          </span>
          <span className="text-gray-500">/</span>
          <span className="text-gray-500">{target.toFixed(1)}</span>
        </div>
      </div>
      
      {/* Linear bar */}
      <div 
        className="relative rounded-lg overflow-hidden"
        style={{ height, backgroundColor: '#374151' }}
      >
        {/* Background segments */}
        <div className="absolute inset-0 flex">
          {/* Completed portion */}
          <div 
            className="h-full transition-all duration-500"
            style={{ 
              width: `${progress}%`,
              background: `linear-gradient(90deg, ${color}80, ${color})`
            }}
          />
          {/* Expected progress line */}
          <div 
            className="absolute top-0 bottom-0 w-0.5 bg-white"
            style={{ left: `${expectedProgress}%` }}
          />
        </div>
        
        {/* Date markers */}
        <div className="absolute bottom-1 left-0 right-0 flex justify-between px-2 text-xs text-gray-400">
          <span>{formatDate(startDate)}</span>
          <span>{formatDate(endDate)}</span>
        </div>
      </div>
      
      {/* Stats */}
      <div className="flex items-center justify-between mt-2 text-sm">
        <span className="text-gray-500">Темп: {((current - target * 0.1) / elapsedDays * totalDays).toFixed(1)}</span>
        <span className="text-gray-400">
          {progress.toFixed(0)}% завершено
        </span>
      </div>
    </div>
  )
}
