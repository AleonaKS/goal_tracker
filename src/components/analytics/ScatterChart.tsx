import { ScatterChart as ReScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, ZAxis, ReferenceLine } from 'recharts'
import { cn } from '@/lib/utils'

interface ScatterDataPoint {
  x: number
  y: number
  z?: number
  label?: string
}

interface ScatterSeries {
  key: string
  name: string
  color: string
  data: ScatterDataPoint[]
}

interface ScatterChartProps {
  series: ScatterSeries[]
  xAxisLabel?: string
  yAxisLabel?: string
  className?: string
  height?: number
  showTrendLine?: boolean
}

export function ScatterChart({ 
  series, 
  xAxisLabel,
  yAxisLabel,
  className, 
  height = 300,
  showTrendLine = false
}: ScatterChartProps) {
  return (
    <div className={cn("w-full", className)}>
      <ResponsiveContainer width="100%" height={height}>
        <ReScatterChart margin={{ top: 10, right: 10, left: 0, bottom: 30 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis 
            type="number"
            dataKey="x"
            name={xAxisLabel}
            axisLine={true}
            tickLine={false}
            tick={{ fontSize: 12, fill: '#6b7280' }}
            label={{ value: xAxisLabel, position: 'bottom', offset: 0, fill: '#6b7280', fontSize: 12 }}
          />
          <YAxis 
            type="number"
            dataKey="y"
            name={yAxisLabel}
            axisLine={true}
            tickLine={false}
            tick={{ fontSize: 12, fill: '#6b7280' }}
            label={{ value: yAxisLabel, angle: -90, position: 'insideLeft', fill: '#6b7280', fontSize: 12 }}
          />
          <ZAxis type="number" dataKey="z" range={[60, 400]} />
          <Tooltip
            cursor={{ strokeDasharray: '3 3' }}
            contentStyle={{ 
              backgroundColor: '#1f2937', 
              border: 'none', 
              borderRadius: '8px',
              color: '#fff'
            }}
            itemStyle={{ color: '#fff' }}
            formatter={(value: number, name: string, props: any) => {
              if (name === 'x') return [value, xAxisLabel]
              if (name === 'y') return [value, yAxisLabel]
              return [value, name]
            }}
            labelFormatter={(label, payload) => {
              if (payload && payload[0] && payload[0].payload.label) {
                return payload[0].payload.label
              }
              return ''
            }}
          />
          <Legend 
            wrapperStyle={{ paddingTop: 20 }}
            iconType="circle"
          />
          {series.map((s) => (
            <Scatter
              key={s.key}
              name={s.name}
              data={s.data}
              fill={s.color}
              stroke={s.color}
              strokeWidth={2}
            />
          ))}
        </ReScatterChart>
      </ResponsiveContainer>
    </div>
  )
}

export default ScatterChart
