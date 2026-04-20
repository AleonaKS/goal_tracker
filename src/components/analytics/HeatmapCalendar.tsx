import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, getDay, startOfWeek, endOfWeek } from 'date-fns'
import { ru } from 'date-fns/locale'

interface HeatmapCalendarProps {
  data: { date: Date; value: number }[]
  month: Date
  maxValue?: number
}

export function HeatmapCalendar({ data, month, maxValue }: HeatmapCalendarProps) {
  const monthStart = startOfMonth(month)
  const monthEnd = endOfMonth(month)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd })
  
  const max = maxValue || Math.max(...data.map(d => d.value), 1)
  
  const getValueForDate = (date: Date) => {
    const entry = data.find(d => 
      d.date.toDateString() === date.toDateString()
    )
    return entry?.value || 0
  }
  
  const getIntensity = (value: number) => {
    if (value === 0) return 0
    const intensity = Math.min(value / max, 1)
    if (intensity < 0.25) return 1
    if (intensity < 0.5) return 2
    if (intensity < 0.75) return 3
    return 4
  }
  
  const getColor = (intensity: number) => {
    const colors = [
      'bg-gray-100 text-gray-400',
      'bg-green-100 text-green-700',
      'bg-green-200 text-green-800',
      'bg-green-400 text-white',
      'bg-green-600 text-white'
    ]
    return colors[intensity]
  }
  
  const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

  return (
    <div className="w-full">
      {/* Header */}
      <div className="text-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900 capitalize">
          {format(month, 'LLLL yyyy', { locale: ru })}
        </h3>
      </div>
      
      {/* Week day headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map(day => (
          <div key={day} className="text-center text-xs text-gray-500 font-medium">
            {day}
          </div>
        ))}
      </div>
      
      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, index) => {
          const value = getValueForDate(day)
          const intensity = getIntensity(value)
          const isCurrentMonth = isSameMonth(day, month)
          
          return (
            <div
              key={index}
              className={`
                aspect-square rounded-full flex flex-col items-center justify-center text-sm
                ${getColor(intensity)}
                ${!isCurrentMonth ? 'opacity-30' : ''}
                transition-all duration-200 hover:scale-110
              `}
            >
              <span className="font-medium">{format(day, 'd')}</span>
              {value > 0 && (
                <span className="text-xs opacity-80">+{value}</span>
              )}
            </div>
          )
        })}
      </div>
      
      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-4 text-xs text-gray-500">
        <span>меньше</span>
        <div className="flex gap-1">
          {[0, 1, 2, 3, 4].map(i => (
            <div
              key={i}
              className={`w-4 h-4 rounded ${getColor(i).split(' ')[0]}`}
            />
          ))}
        </div>
        <span>больше</span>
      </div>
    </div>
  )
}
