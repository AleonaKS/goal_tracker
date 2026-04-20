import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'

interface CircularProgressChartProps {
  current: number
  target: number
  size?: number
  strokeWidth?: number
  color?: string
  bgColor?: string
}

export function CircularProgressChart({
  current,
  target,
  size = 200,
  strokeWidth = 12,
  color = '#3b82f6',
  bgColor = '#e5e7eb'
}: CircularProgressChartProps) {
  const progress = Math.min((current / target) * 100, 100)
  const remaining = 100 - progress

  const data = [
    { name: 'progress', value: progress },
    { name: 'remaining', value: remaining }
  ]

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            startAngle={90}
            endAngle={-270}
            innerRadius={(size / 2) - strokeWidth - 10}
            outerRadius={(size / 2) - 10}
            stroke="none"
            dataKey="value"
          >
            <Cell fill={color} />
            <Cell fill={bgColor} />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      
      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold" style={{ color }}>
          {current.toFixed(1)}
        </span>
        {current < target && (
          <span className="text-sm text-gray-500">
            Еще {(target - current).toFixed(1)}
          </span>
        )}
      </div>
    </div>
  )
}
