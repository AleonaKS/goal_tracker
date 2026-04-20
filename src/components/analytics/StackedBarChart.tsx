import { BarChart as ReBarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'
import { cn } from '@/lib/utils'

interface StackedBarChartProps {
  data: {
    category: string
    [key: string]: string | number
  }[]
  stacks: {
    key: string
    name: string
    color: string
  }[]
  className?: string
  height?: number
}

export function StackedBarChart({ data, stacks, className, height = 300 }: StackedBarChartProps) {
  return (
    <div className={cn("w-full", className)}>
      <ResponsiveContainer width="100%" height={height}>
        <ReBarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
          {stacks.map((stack) => (
            <Bar
              key={stack.key}
              dataKey={stack.key}
              name={stack.name}
              stackId="total"
              fill={stack.color}
              radius={[stack.key === stacks[stacks.length - 1].key ? 4 : 0, stack.key === stacks[stacks.length - 1].key ? 4 : 0, 0, 0]}
            />
          ))}
        </ReBarChart>
      </ResponsiveContainer>
    </div>
  )
}

export default StackedBarChart
