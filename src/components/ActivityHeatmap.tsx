import { useState, useMemo, useRef, useEffect } from 'react'
import { format } from 'date-fns'
import { Info } from 'lucide-react'

interface HeatmapDataPoint {
  date: Date
  value: number
}

interface ActivityHeatmapProps {
  data: HeatmapDataPoint[]
  year?: number
  showTitle?: boolean
  title?: string
  size?: 'small' | 'medium' | 'large'
  showControls?: boolean
  className?: string
  onDayClick?: (date: Date, value: number) => void
  color?: string // Добавляем цвет для кастомизации
  scrollToCurrentMonth?: boolean
}

type HeatmapSize = 'small' | 'medium' | 'large'

const SIZE_CONFIGS = {
  small: { cell: 10, gap: 2, fontSize: 10 },
  medium: { cell: 12, gap: 3, fontSize: 11 },
  large: { cell: 14, gap: 3, fontSize: 12 }
} as const

const MONTH_LABELS = ['янв.', 'февр.', 'март', 'апр.', 'май', 'июнь', 'июль', 'авг.', 'сен.', 'окт.', 'ноя.', 'дек.']
const WEEK_DAY_LABELS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

// Generate intensity colors based on metric color
const generateIntensityColors = (baseColor: string): string[] => {
  // Convert hex to RGB
  const hex = baseColor.replace('#', '')
  const r = parseInt(hex.substr(0, 2), 16)
  const g = parseInt(hex.substr(2, 2), 16)
  const b = parseInt(hex.substr(4, 2), 16)
  
  // Generate 5 intensity levels from light to dark
  return [
    '#ebedf0', // 0 - no activity (gray background)
    `rgba(${r}, ${g}, ${b}, 0.2)`, // 1 - very light
    `rgba(${r}, ${g}, ${b}, 0.4)`, // 2 - light
    `rgba(${r}, ${g}, ${b}, 0.6)`, // 3 - medium
    `rgba(${r}, ${g}, ${b}, 0.8)`, // 4 - high
    baseColor // 5 - maximum (full color)
  ]
}

export function ActivityHeatmap({ 
  data, 
  year = new Date().getFullYear(),
  showTitle = true,
  title = 'Activity Chart',
  size = 'medium',
  showControls = false,
  className = '',
  onDayClick,
  color = '#22c55e', // Default green color
  scrollToCurrentMonth = false
}: ActivityHeatmapProps) {
  const [hoveredDay, setHoveredDay] = useState<{date: Date, value: number} | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  
  const config = SIZE_CONFIGS[size]
  
  // Generate intensity colors based on the metric color
  const INTENSITY_COLORS = useMemo(() => generateIntensityColors(color), [color])

  // Generate last 52 weeks of data (GitHub style) - right to left
  const heatmapData = useMemo(() => {
    const today = new Date()
    // Find the start of current week (Monday)
    const currentDay = today.getDay()
    const daysFromMonday = currentDay === 0 ? 6 : currentDay - 1
    const thisWeekStart = new Date(today)
    thisWeekStart.setDate(today.getDate() - daysFromMonday)
    
    // Create a map of data for quick lookup (aggregate by date)
    const dataMap = new Map<string, number>()
    data.forEach(d => {
      const dateStr = format(d.date, 'yyyy-MM-dd')
      dataMap.set(dateStr, (dataMap.get(dateStr) || 0) + d.value)
    })

    // Find max value for intensity calculation (use aggregated daily values)
    const dailyValues = Array.from(dataMap.values())
    const maxValue = dailyValues.length > 0 ? Math.max(...dailyValues, 1) : 1
    
    // Generate weeks from oldest (left) to newest (right) - 53 weeks total
    const weeks: Array<Array<{date: Date, value: number, intensity: number}>> = []
    const allMonths: Array<{label: string, weekIndex: number}> = []
    
    // Start from 52 weeks ago
    const startDate = new Date(thisWeekStart)
    startDate.setDate(thisWeekStart.getDate() - (52 * 7))
    
    let lastMonth = -1
    
    for (let weekIndex = 0; weekIndex < 53; weekIndex++) {
      const weekStart = new Date(startDate)
      weekStart.setDate(startDate.getDate() + (weekIndex * 7))
      
      const weekDays: Array<{date: Date, value: number, intensity: number}> = []
      
      for (let day = 0; day < 7; day++) {
        const date = new Date(weekStart)
        date.setDate(weekStart.getDate() + day)
        
        const dateStr = format(date, 'yyyy-MM-dd')
        const value = dataMap.get(dateStr) || 0
        
        // Calculate intensity (0-5) based on value relative to max
        let intensity = 0
        if (value > 0) {
          // For small max values, use direct thresholds
          if (maxValue <= 3) {
            if (value === 1) intensity = 1
            else if (value === 2) intensity = 3
            else intensity = 5
          } else {
            // For larger max values, use percentage-based thresholds
            const ratio = value / maxValue
            if (ratio <= 0.16) intensity = 1
            else if (ratio <= 0.33) intensity = 2
            else if (ratio <= 0.50) intensity = 3
            else if (ratio <= 0.75) intensity = 4
            else intensity = 5
          }
        }
        
        weekDays.push({ date, value, intensity })
      }
      
      weeks.push(weekDays)
      
      // Track all months for later filtering
      const firstDayOfWeek = weekDays[0].date
      const month = firstDayOfWeek.getMonth()
      
      if (month !== lastMonth) {
        lastMonth = month
        allMonths.push({
          label: MONTH_LABELS[month],
          weekIndex
        })
      }
    }
    
    // Show all 12 months
    const monthLabels: Array<{label: string, position: number}> = []
    
    // Use all unique months from the data
    allMonths.forEach(month => {
      if (!monthLabels.find(m => m.label === month.label)) {
        monthLabels.push({
          label: month.label,
          position: month.weekIndex * (config.cell + config.gap)
        })
      }
    })
    
    return { weeks, monthLabels, maxValue }
  }, [data, config])

  const totalDays = useMemo(() => {
    return heatmapData.weeks.flat().filter(d => d.value > 0).length
  }, [heatmapData])
  
  const totalValue = useMemo(() => {
    return heatmapData.weeks.flat().reduce((sum, d) => sum + d.value, 0)
  }, [heatmapData])

  // Scroll to current month on mount
  useEffect(() => {
    if (!scrollToCurrentMonth || !scrollRef.current) return
    const lastMonth = heatmapData.monthLabels[heatmapData.monthLabels.length - 1]
    if (lastMonth) {
      scrollRef.current.scrollLeft = Math.max(0, lastMonth.position - 20)
    }
  }, [scrollToCurrentMonth, heatmapData.monthLabels])

  return (
    <div className={`w-full ${className}`}>
      {showTitle && (
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        </div>
      )}
      
      <div className="flex">
        {/* Day Labels - Fixed Position */}
        <div className="flex flex-col mr-2" style={{ gap: `${config.gap}px` }}>
          {/* Month Labels placeholder for alignment */}
          <div style={{ height: `${config.fontSize + 4}px` }}></div>
          {WEEK_DAY_LABELS.map((day, i) => (
            <div
              key={day}
              className="text-gray-500 flex items-center justify-end"
              style={{ 
                height: `${config.cell}px`,
                fontSize: `${config.fontSize}px`
              }}
            >
              {day}
            </div>
          ))}
        </div>
        
        {/* Scrollable Content with Month Labels */}
        <div ref={scrollRef} className="overflow-x-auto flex-1">
          <div className="min-w-max">
            {/* Month Labels Row - Scrollable */}
            <div 
              className="flex mb-1 relative" 
              style={{ 
                fontSize: `${config.fontSize}px`,
                height: `${config.fontSize + 4}px`,
                minWidth: `${heatmapData.weeks.length * (config.cell + config.gap)}px`
              }}
            >
              {heatmapData.monthLabels.map((month, i) => (
                <span
                  key={i}
                  className="text-gray-500 whitespace-nowrap absolute"
                  style={{
                    left: `${month.position}px`,
                  }}
                >
                  {month.label}
                </span>
              ))}
            </div>
            
            {/* Contribution Grid */}
            <div className="flex" style={{ gap: `${config.gap}px` }}>
              {heatmapData.weeks.map((week, weekIndex) => (
                <div key={weekIndex} className="flex flex-col" style={{ gap: `${config.gap}px` }}>
                  {week.map((day, dayIndex) => (
                    <div
                      key={`${weekIndex}-${dayIndex}`}
                      className="rounded-sm cursor-pointer transition-all hover:ring-2 hover:ring-gray-400"
                      style={{
                        width: `${config.cell}px`,
                        height: `${config.cell}px`,
                        backgroundColor: INTENSITY_COLORS[day.intensity]
                      }}
                      title={`${format(day.date, 'MMM d, yyyy')}: ${day.value}`}
                      onClick={() => onDayClick?.(day.date, day.value)}
                      onMouseEnter={() => setHoveredDay(day)}
                      onMouseLeave={() => setHoveredDay(null)}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* Stats & Legend */}
      <div className="flex items-center justify-between mt-4">
        <div className="text-sm text-gray-600">
          <span className="font-medium">{totalDays}</span> активных дней • Всего: <span className="font-medium">{totalValue}</span>
        </div>

        <div className="flex items-center gap-2" style={{ fontSize: `${config.fontSize}px` }}>
          <span className="text-gray-500">Меньше</span>
          <div className="flex" style={{ gap: '3px' }}>
            {INTENSITY_COLORS.map((color, i) => (
              <div
                key={i}
                className="rounded-sm"
                style={{
                  width: `${config.cell}px`,
                  height: `${config.cell}px`,
                  backgroundColor: color
                }}
              />
            ))}
          </div>
          <span className="text-gray-500">Больше</span>
        </div>
      </div>
      
      {/* Hover info */}
      {hoveredDay && (
        <div className="mt-2 text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded inline-flex items-center gap-1">
          <Info className="w-3 h-3" />
          {format(hoveredDay.date, 'MMM d, yyyy')}: {hoveredDay.value}
        </div>
      )}
    </div>
  )
}

// Compact version for small spaces
export function CompactActivityHeatmap({ data }: ActivityHeatmapProps) {
  return (
    <ActivityHeatmap
      data={data}
      showTitle={false}
      size="small"
    />
  )
}

// Full version with controls
export function FullActivityHeatmap({ data }: ActivityHeatmapProps) {
  return (
    <ActivityHeatmap
      data={data}
      title="Activity Chart"
      size="large"
      showControls={true}
    />
  )
}
