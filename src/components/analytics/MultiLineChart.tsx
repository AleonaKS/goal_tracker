import { LineChart as ReLineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'
import { cn } from '@/lib/utils'

interface MultiLineChartProps {
  data: {
    category: string
    [key: string]: string | number
  }[]
  lines: {
    key: string
    name: string
    color: string
  }[]
  className?: string
  height?: number
  showDots?: boolean
}

export function MultiLineChart({ 
  data, 
  lines, 
  className, 
  height = 300,
  showDots = true 
}: MultiLineChartProps) {
  return (
    <div className={cn("w-full", className)}>
      <ResponsiveContainer width="100%" height={height}>
        <ReLineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
          <XAxis 
            dataKey="category" 
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: '#6b7280' }}
          />
          <YAxis 
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: '#6b7280' }}
          />
          <Tooltip
            contentStyle={{ 
              backgroundColor: '#1f2937', 
              border: 'none', 
              borderRadius: '8px',
              color: '#fff'
            }}
            itemStyle={{ color: '#fff' }}
            formatter={(value: number, name: string) => [value, name]}
          />
          <Legend 
            wrapperStyle={{ paddingTop: 20 }}
            iconType="square"
          />
          {lines.map((line) => (
            <Line
              key={line.key}
              type="monotone"
              dataKey={line.key}
              name={line.name}
              stroke={line.color}
              strokeWidth={2}
              dot={showDots ? { r: 4, fill: line.color, strokeWidth: 2, stroke: '#fff' } : false}
              activeDot={{ r: 6, fill: line.color, strokeWidth: 2, stroke: '#fff' }}
            />
          ))}
        </ReLineChart>
      </ResponsiveContainer>
    </div>
  )
}

export default MultiLineChart
