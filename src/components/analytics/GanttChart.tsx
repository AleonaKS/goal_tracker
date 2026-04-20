import { BarChart as ReBarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts'
import { format, eachDayOfInterval, differenceInDays, startOfDay, addDays, isAfter, isBefore } from 'date-fns'
import { ru } from 'date-fns/locale'

interface GanttChartProps {
  data: {
    id: string
    name: string
    start: Date
    end: Date
    progress?: number
    status?: string
    dependencies?: string[]
  }[]
  height?: number
  width?: number
}

export function GanttChart({ data, height = 400, width = 800 }: GanttChartProps) {
  // Calculate date range
  const allDates = data.flatMap(item => [item.start, item.end])
  const minDate = new Date(Math.min(...allDates.map(d => d.getTime())))
  const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())))
  
  const totalDays = differenceInDays(maxDate, minDate) + 1
  
  // Generate day columns
  const days = eachDayOfInterval({ start: minDate, end: maxDate })
  
  // Prepare data for chart
  const chartData = days.map(day => {
    const dayStr = format(day, 'yyyy-MM-dd')
    
    const tasksForDay = data.filter(item => {
      const itemStart = startOfDay(item.start)
      const itemEnd = startOfDay(item.end)
      return !isAfter(day, itemStart) && !isBefore(day, itemEnd)
    })
    
    return {
      date: dayStr,
      day: format(day, 'd'),
      weekday: format(day, 'EEEEEE', { locale: ru }),
      tasks: tasksForDay.map((task, index) => ({
        ...task,
        index,
        duration: differenceInDays(task.end, task.start) + 1,
        progress: task.progress || 0
      }))
    }
  })
  
  // Calculate colors based on status
  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'completed': return '#10b981'
      case 'in_progress': return '#3b82f6'
      case 'overdue': return '#ef4444'
      case 'planned': return '#6b7280'
      default: return '#9ca3af'
    }
  }
  
  // Custom bar shape for Gantt
  const CustomBar = (props: any) => {
    const { x, y, width, height, payload } = props
    
    return (
      <g>
        {/* Task bar */}
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          fill={getStatusColor(payload.status)}
          fillOpacity={0.8}
          stroke="#fff"
          strokeWidth={1}
          rx={4}
          ry={4}
        />
        
        {/* Progress indicator */}
        {payload.progress && payload.progress > 0 && (
          <rect
            x={x}
            y={y}
            width={width * (payload.progress / 100)}
            height={height}
            fill={getStatusColor(payload.status)}
            fillOpacity={1}
            stroke="none"
            rx={4}
            ry={4}
          />
        )}
        
        {/* Task name */}
        {width > 30 && (
          <text
            x={x + 8}
            y={y + height / 2}
            fill="#fff"
            fontSize={12}
            fontWeight={500}
            textAnchor="start"
            dominantBaseline="middle"
          >
            {payload.name.length > 15 ? payload.name.substring(0, 15) + '...' : payload.name}
          </text>
        )}
      </g>
    )
  }
  
  return (
    <div className="w-full overflow-x-auto">
      <ResponsiveContainer width={width} height={height}>
        <ReBarChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 100, bottom: 60 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          
          {/* X-axis - Days */}
          <XAxis
            dataKey="day"
            tick={{ fontSize: 11, fill: '#6b7280' }}
            tickFormatter={(value) => {
              const date = new Date(value)
              return format(date, 'd MMM', { locale: ru })
            }}
            interval={Math.ceil(totalDays / 10)}
          />
          
          {/* Y-axis - Tasks */}
          <YAxis
            type="category"
            tick={{ fontSize: 11, fill: '#6b7280' }}
            tickFormatter={(value) => {
              const task = data.find(t => t.name === value)
              return task ? task.name.substring(0, 20) : value
            }}
            width={80}
          />
          
          {/* Custom bars for tasks */}
          <Bar
            dataKey="tasks"
            shape={CustomBar}
            minPointSize={2}
          />
          
          {/* Tooltip */}
          <Tooltip
            contentStyle={{
              backgroundColor: '#1f2937',
              border: 'none',
              borderRadius: '8px',
              color: '#fff'
            }}
            formatter={(value: any, name: string) => {
              if (name === 'tasks') {
                return (
                  <div className="space-y-2">
                    <div className="font-semibold">{value.date}</div>
                    <div className="text-sm opacity-80">{value.weekday}</div>
                    {value.tasks.map((task: any, index: number) => (
                      <div key={index} className="text-sm py-1 border-t border-gray-600 pt-2">
                        <div className="flex items-center justify-between">
                          <span>{task.name}</span>
                          <span className="text-xs">
                            {format(task.start, 'HH:mm')} - {format(task.end, 'HH:mm')}
                          </span>
                        </div>
                        {task.progress && (
                          <div className="text-xs">
                            Прогресс: {task.progress}%
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )
              }
            }}
          />
        </ReBarChart>
      </ResponsiveContainer>
      
      {/* Legend */}
      <div className="mt-4 flex items-center justify-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded-full" />
          <span>Завершено</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-500 rounded-full" />
          <span>В процессе</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-500 rounded-full" />
          <span>Просрочено</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-gray-500 rounded-full" />
          <span>Запланировано</span>
        </div>
      </div>
    </div>
  )
}
