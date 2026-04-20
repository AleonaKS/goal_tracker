import { BarChart as ReBarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

interface BarChartProps {
  data: { day: number; value: number }[]
  color?: string
  height?: number
}

export function BarChart({ data, color = '#22c55e', height = 200 }: BarChartProps) {
  const maxValue = Math.max(...data.map(d => d.value))
  
  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={height}>
        <ReBarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <XAxis 
            dataKey="day" 
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: '#9ca3af' }}
            interval={2}
          />
          <YAxis 
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: '#9ca3af' }}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#1f2937', 
              border: 'none', 
              borderRadius: '8px',
              color: '#fff'
            }}
            formatter={(value: number) => [value, 'Значение']}
            labelFormatter={(label) => `День ${label}`}
          />
          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={entry.value === maxValue ? '#16a34a' : color}
              />
            ))}
          </Bar>
        </ReBarChart>
      </ResponsiveContainer>
      
      {/* Stats summary */}
      <div className="flex items-center justify-between mt-4 text-sm">
        <div className="text-gray-600">
          <span className="font-medium">Всего:</span>{' '}
          <span className="text-green-600 font-bold">
            {data.reduce((sum, d) => sum + d.value, 0)}
          </span>
          <span className="text-gray-500 ml-1">
            ({data.filter(d => d.value > 0).length} дней)
          </span>
        </div>
        <div className="text-gray-600">
          <span className="font-medium">Среднее:</span>{' '}
          <span className="text-green-600 font-bold">
            {(data.reduce((sum, d) => sum + d.value, 0) / data.filter(d => d.value > 0).length || 1).toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  )
}
