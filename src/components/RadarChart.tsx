import { useMemo } from 'react'
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { useApiDataStore } from '@/stores/apiDataStore'
import { cn } from '@/lib/utils'

interface RadarDataPoint {
  category: string
  progress: number
  goals: number
  completed: number
  tasks: number
  fullMark: number
}

interface RadarChartProps {
  className?: string
  showTasks?: boolean
  showGoals?: boolean
}

export function SkillsRadarChart({ className, showTasks = true, showGoals = true }: RadarChartProps) {
  const { goals, tasks, categories } = useApiDataStore()

  const data = useMemo(() => {
    const categoryData = new Map<string, RadarDataPoint>()

    // Initialize with all categories
    categories.forEach(category => {
      categoryData.set(category.name, {
        category: category.name,
        progress: 0,
        goals: 0,
        completed: 0,
        tasks: 0,
        fullMark: 100
      })
    })

    // Calculate goal stats by category
    goals.forEach(goal => {
      const category = categories.find(c => c.id === goal.categoryId)
      if (!category) return

      const existing = categoryData.get(category.name) || {
        category: category.name,
        progress: 0,
        goals: 0,
        completed: 0,
        tasks: 0,
        fullMark: 100
      }

      existing.goals++
      if (goal.status === 'completed') {
        existing.completed++
      }
      existing.progress = Math.round((existing.completed / existing.goals) * 100)

      categoryData.set(category.name, existing)
    })

    // Add task stats
    tasks.forEach(task => {
      const category = categories.find(c => c.id === task.categoryId)
      if (!category) return

      const existing = categoryData.get(category.name) || {
        category: category.name,
        progress: 0,
        goals: 0,
        completed: 0,
        tasks: 0,
        fullMark: 100
      }

      existing.tasks++
    })

    return Array.from(categoryData.values()).filter(item => item.goals > 0 || item.tasks > 0)
  }, [goals, tasks, categories])

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 mb-2">{data.category}</p>
          {showGoals && (
            <div className="text-sm space-y-1">
              <p className="text-gray-600">
                Goals: {data.completed}/{data.goals} ({data.progress}%)
              </p>
            </div>
          )}
          {showTasks && (
            <p className="text-sm text-gray-600">
              Tasks: {data.tasks}
            </p>
          )}
        </div>
      )
    }
    return null
  }

  if (data.length === 0) {
    return (
      <div className={cn("flex items-center justify-center h-64 text-gray-500", className)}>
        No data available for radar chart
      </div>
    )
  }

  return (
    <div className={cn("w-full h-80", className)}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data}>
          <PolarGrid 
            gridType="polygon"
            radialLines={true}
            stroke="#e5e7eb"
          />
          <PolarAngleAxis 
            dataKey="category"
            tick={{ fontSize: 12, fill: '#6b7280' }}
            className="font-medium"
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={{ fontSize: 10, fill: '#9ca3af' }}
            tickCount={5}
          />
          
          {showGoals && (
            <Radar
              name="Goal Progress"
              dataKey="progress"
              stroke="#3b82f6"
              fill="#3b82f6"
              fillOpacity={0.6}
              strokeWidth={2}
            />
          )}
          
          <Tooltip content={<CustomTooltip />} />
          
          {showGoals && showTasks && (
            <Legend />
          )}
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}

// Advanced Multi-Metric Radar Chart
interface MetricRadarDataPoint {
  metric: string
  value: number
  target: number
  progress: number
  fullMark: number
}

interface MetricRadarChartProps {
  metricIds?: string[]
  className?: string
}

export function MetricRadarChart({ metricIds, className }: MetricRadarChartProps) {
  const { metrics, metricEntries } = useApiDataStore()

  const data = useMemo(() => {
    const selectedMetrics = metricIds 
      ? metrics.filter(m => metricIds.includes(m.id))
      : metrics.slice(0, 6) // Limit to 6 metrics for readability

    return selectedMetrics.map(metric => {
      const entries = metricEntries.filter(e => e.metricId === metric.id)
      const currentValue = entries.reduce((sum, e) => sum + e.value, metric.startValue || 0)
      const progress = metric.targetValue > 0 ? Math.min(100, Math.round((currentValue / metric.targetValue) * 100)) : 0

      return {
        metric: metric.name,
        value: currentValue,
        target: metric.targetValue,
        progress,
        fullMark: 100
      }
    })
  }, [metrics, metricEntries, metricIds])

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 mb-2">{data.metric}</p>
          <div className="text-sm space-y-1">
            <p className="text-gray-600">
              Current: {data.value} / Target: {data.target}
            </p>
            <p className="text-gray-600">
              Progress: {data.progress}%
            </p>
          </div>
        </div>
      )
    }
    return null
  }

  if (data.length === 0) {
    return (
      <div className={cn("flex items-center justify-center h-64 text-gray-500", className)}>
        No metrics available for radar chart
      </div>
    )
  }

  return (
    <div className={cn("w-full h-80", className)}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data}>
          <PolarGrid 
            gridType="polygon"
            radialLines={true}
            stroke="#e5e7eb"
          />
          <PolarAngleAxis 
            dataKey="metric"
            tick={{ fontSize: 11, fill: '#6b7280' }}
            className="font-medium"
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={{ fontSize: 10, fill: '#9ca3af' }}
            tickCount={5}
          />
          
          <Radar
            name="Progress"
            dataKey="progress"
            stroke="#10b981"
            fill="#10b981"
            fillOpacity={0.6}
            strokeWidth={2}
          />
          
          <Tooltip content={<CustomTooltip />} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}

// Complex Multi-Dimensional Analysis Chart
interface AnalysisDataPoint {
  dimension: string
  planning: number
  execution: number
  consistency: number
  efficiency: number
  fullMark: 100
}

interface AnalysisRadarChartProps {
  className?: string
}

export function AnalysisRadarChart({ className }: AnalysisRadarChartProps) {
  const { goals, tasks, metrics, metricEntries } = useApiDataStore()

  const data = useMemo((): AnalysisDataPoint[] => {
    // Calculate planning score (goal setting quality)
    const planningScore = goals.length > 0 ? 
      Math.round((goals.filter(g => g.description && g.dueDate).length / goals.length) * 100) : 0

    // Calculate execution score (task completion rate)
    const executionScore = tasks.length > 0 ?
      Math.round((tasks.filter(t => t.completed).length / tasks.length) * 100) : 0

    // Calculate consistency score (metric regularity)
    const consistencyScore = metrics.length > 0 ? 
      Math.round((metrics.filter(m => {
        const entries = metricEntries.filter(e => e.metricId === m.id)
        return entries.length > 0
      }).length / metrics.length) * 100) : 0

    // Calculate efficiency score (overall progress)
    const efficiencyScore = goals.length > 0 ?
      Math.round((goals.reduce((sum, g) => sum + g.progress, 0) / goals.length)) : 0

    return [
      {
        dimension: 'Planning',
        planning: planningScore,
        execution: 0,
        consistency: 0,
        efficiency: 0,
        fullMark: 100
      },
      {
        dimension: 'Execution',
        planning: 0,
        execution: executionScore,
        consistency: 0,
        efficiency: 0,
        fullMark: 100
      },
      {
        dimension: 'Consistency',
        planning: 0,
        execution: 0,
        consistency: consistencyScore,
        efficiency: 0,
        fullMark: 100
      },
      {
        dimension: 'Efficiency',
        planning: 0,
        execution: 0,
        consistency: 0,
        efficiency: efficiencyScore,
        fullMark: 100
      }
    ]
  }, [goals, tasks, metrics, metricEntries])

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 mb-2">{data.dimension}</p>
          <div className="text-sm space-y-1">
            {data.planning > 0 && <p className="text-blue-600">Planning: {data.planning}%</p>}
            {data.execution > 0 && <p className="text-green-600">Execution: {data.execution}%</p>}
            {data.consistency > 0 && <p className="text-purple-600">Consistency: {data.consistency}%</p>}
            {data.efficiency > 0 && <p className="text-orange-600">Efficiency: {data.efficiency}%</p>}
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <div className={cn("w-full h-80", className)}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data}>
          <PolarGrid 
            gridType="polygon"
            radialLines={true}
            stroke="#e5e7eb"
          />
          <PolarAngleAxis 
            dataKey="dimension"
            tick={{ fontSize: 12, fill: '#6b7280' }}
            className="font-medium"
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={{ fontSize: 10, fill: '#9ca3af' }}
            tickCount={5}
          />
          
          <Radar
            name="Planning"
            dataKey="planning"
            stroke="#3b82f6"
            fill="#3b82f6"
            fillOpacity={0.3}
            strokeWidth={2}
          />
          
          <Radar
            name="Execution"
            dataKey="execution"
            stroke="#10b981"
            fill="#10b981"
            fillOpacity={0.3}
            strokeWidth={2}
          />
          
          <Radar
            name="Consistency"
            dataKey="consistency"
            stroke="#8b5cf6"
            fill="#8b5cf6"
            fillOpacity={0.3}
            strokeWidth={2}
          />
          
          <Radar
            name="Efficiency"
            dataKey="efficiency"
            stroke="#f97316"
            fill="#f97316"
            fillOpacity={0.3}
            strokeWidth={2}
          />
          
          <Tooltip content={<CustomTooltip />} />
          <Legend />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}
