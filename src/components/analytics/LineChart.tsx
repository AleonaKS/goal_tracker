import { LineChart as ReLineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'

interface LineChartProps {
  data: { date: string; value: number }[]
  target?: number
  color?: string
  height?: number
  showTrend?: boolean
}

export function LineChart({ 
  data, 
  target, 
  color = '#3b82f6', 
  height = 200,
  showTrend = true 
}: LineChartProps) {
  // Расчёт линии тренда
  const calculateTrend = () => {
    if (data.length < 2) return data
    
    const n = data.length
    const sumX = data.reduce((sum, _, i) => sum + i, 0)
    const sumY = data.reduce((sum, d) => sum + d.value, 0)
    const sumXY = data.reduce((sum, d, i) => sum + i * d.value, 0)
    const sumXX = data.reduce((sum, _, i) => sum + i * i, 0)
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
    const intercept = (sumY - slope * sumX) / n
    
    return data.map((_, i) => ({
      date: data[i].date,
      value: data[i].value,
      trend: slope * i + intercept
    }))
  }
  
  const chartData = showTrend ? calculateTrend() : data.map(d => ({ ...d, trend: d.value }))

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={height}>
        <ReLineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <XAxis 
            dataKey="date" 
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            interval="preserveStartEnd"
          />
          <YAxis 
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            domain={['auto', 'auto']}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#1f2937', 
              border: 'none', 
              borderRadius: '8px',
              color: '#fff'
            }}
            formatter={(value: number) => [value.toFixed(2), 'Значение']}
          />
          
          {/* Target line */}
          {target && (
            <ReferenceLine 
              y={target} 
              stroke="#ef4444" 
              strokeDasharray="5 5"
              label={{ value: 'Цель', fill: '#ef4444', fontSize: 12, position: 'right' }}
            />
          )}
          
          {/* Trend line */}
          {showTrend && (
            <Line 
              type="monotone" 
              dataKey="trend" 
              stroke="#9ca3af" 
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
            />
          )}
          
          {/* Actual data line */}
          <Line 
            type="monotone" 
            dataKey="value" 
            stroke={color} 
            strokeWidth={3}
            dot={{ fill: color, strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, stroke: color, strokeWidth: 2 }}
          />
        </ReLineChart>
      </ResponsiveContainer>
    </div>
  )
}
