import { AreaChart as ReAreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'
import { cn } from '@/lib/utils'

interface AreaChartProps {
  data: {
    category: string
    [key: string]: string | number
  }[]
  areas: {
    key: string
    name: string
    color: string
  }[]
  className?: string
  height?: number
  stacked?: boolean
}

export function AreaChart({ data, areas, className, height = 300, stacked = true }: AreaChartProps) {
  return (
    <div className={cn("w-full", className)}>
      <ResponsiveContainer width="100%" height={height}>
        <ReAreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
          {areas.map((area, index) => (
            <Area
              key={area.key}
              type="monotone"
              dataKey={area.key}
              name={area.name}
              stackId={stacked ? "total" : undefined}
              stroke={area.color}
              strokeWidth={2}
              fill={area.color}
              fillOpacity={0.3}
            />
          ))}
        </ReAreaChart>
      </ResponsiveContainer>
    </div>
  )
}

export default AreaChart
