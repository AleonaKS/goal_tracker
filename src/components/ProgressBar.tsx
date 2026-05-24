import { cn } from '@/lib/utils'

interface ProgressBarProps {
  progress: number
  className?: string
  barClassName?: string
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
  color?: string
}

// Helper function to get color based on progress percentage
function getProgressColor(progress: number): string {
  if (progress < 25) return 'bg-red-500' // Low progress - red
  if (progress < 50) return 'bg-orange-500' // Below half - orange
  if (progress < 75) return 'bg-yellow-500' // Getting there - yellow
  if (progress < 100) return 'bg-blue-500' // Almost done - blue
  return 'bg-green-500' // Complete - green
}

export function ProgressBar({
  progress,
  className,
  barClassName,
  showLabel = true,
  size = 'md',
  color,
}: ProgressBarProps) {
  const sizeClasses = {
    sm: 'h-1.5',
    md: 'h-2',
    lg: 'h-3',
  }

  // Use provided color or determine based on progress
  const barColor = color || getProgressColor(progress)
  // Check if color is a hex color (starts with #)
  const isHexColor = barColor.startsWith('#')

  return (
    <div className={cn('w-full', className)}>
      <div className={cn('w-full bg-gray-200 rounded-full overflow-hidden', sizeClasses[size])}>
        <div
          className={cn(
            'h-full transition-all duration-300 rounded-full',
            isHexColor ? '' : barColor,
            barClassName
          )}
          style={{
            width: `${Math.min(Math.max(progress, 0), 100)}%`,
            backgroundColor: isHexColor ? barColor : undefined
          }}
        />
      </div>
      {showLabel && (
        <div className="flex justify-between text-sm text-gray-600 mt-1">
          <span>{Math.round(progress)}%</span>
          <span>Выполнено</span>
        </div>
      )}
    </div>
  )
}

interface CircularProgressProps {
  progress: number
  size?: number
  strokeWidth?: number
  className?: string
  color?: string
  showLabel?: boolean
}

export function CircularProgress({
  progress,
  size = 48,
  strokeWidth = 4,
  className,
  color = '#3b82f6',
  showLabel = true,
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (progress / 100) * circumference

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-300"
        />
      </svg>
      {showLabel && (
        <span className="absolute text-xs font-semibold text-gray-700">
          {Math.round(progress)}%
        </span>
      )}
    </div>
  )
}
