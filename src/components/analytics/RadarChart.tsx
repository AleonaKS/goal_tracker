import { Radar, RadarChart as ReRadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend, Tooltip } from 'recharts'

interface RadarChartProps {
  data: {
    skill: string
    value: number
    fullMark: number
  }[]
  height?: number
  width?: number
}

export function RadarChart({ data, height = 300, width = 400 }: RadarChartProps) {
  // Подготовка данных для recharts
  const radarData = data.map(item => ({
    skill: item.skill,
    A: item.value,
    fullMark: item.fullMark
  }))

  return (
    <ResponsiveContainer width={width} height={height}>
      <ReRadarChart data={radarData}>
        <PolarGrid 
          gridType="polygon" 
          radialLines={true}
          stroke="#e5e7eb"
          strokeWidth={1}
        />
        <PolarAngleAxis 
          dataKey="skill"
          tick={{ fill: '#666', fontSize: 12 }}
          axisLine={true}
          stroke="#666"
        />
        <PolarRadiusAxis
          angle={90}
          domain={[0, 100]}
          tick={{ fill: '#666', fontSize: 10 }}
          axisLine={true}
          stroke="#666"
        />
        <Radar
          name="Прогресс"
          dataKey="A"
          stroke="#3b82f6"
          fill="#3b82f6"
          fillOpacity={0.6}
          strokeWidth={2}
        />
        <Radar
          name="Максимум"
          dataKey="fullMark"
          stroke="#ef4444"
          fill="#ef4444"
          fillOpacity={0.1}
          strokeWidth={1}
          strokeDasharray="5 5"
        />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: '#1f2937',
            border: 'none',
            borderRadius: '8px',
            color: '#fff'
          }}
          formatter={(value: any, name: string) => [
            <strong>{name}:</strong>,
            `${value}%`
          ]}
        />
        <Legend 
          wrapperStyle={{
            paddingTop: '20px'
          }}
        />
      </ReRadarChart>
    </ResponsiveContainer>
  )
}
