import { useMemo } from 'react'
import { useApiDataStore } from '@/stores/apiDataStore'
import { format, startOfWeek, endOfWeek, isWithinInterval, parseISO, eachWeekOfInterval, subMonths } from 'date-fns'
import { ru } from 'date-fns/locale'
import { StackedBarChart } from './StackedBarChart'
import { MultiLineChart } from './MultiLineChart'
import { AreaChart } from './AreaChart'
import { ScatterChart } from './ScatterChart'
import { BarChart3, TrendingUp, Activity, Target } from 'lucide-react'

export function ChartsShowcase() {
  const { tasks, goals, metrics, metricEntries } = useApiDataStore()

  // 1. StackedBarChart: Tasks by Category (Completed vs Pending vs Overdue)
  const categoryTaskData = useMemo(() => {
    const categories = [...new Set(tasks.map(t => t.categoryId).filter(Boolean))]
    
    return categories.map(catId => {
      const catTasks = tasks.filter(t => t.categoryId === catId)
      const completed = catTasks.filter(t => t.completed).length
      const pending = catTasks.filter(t => !t.completed && (!t.dueDate || new Date(t.dueDate) > new Date())).length
      const overdue = catTasks.filter(t => !t.completed && t.dueDate && new Date(t.dueDate) < new Date()).length
      
      return {
        category: catId.slice(0, 8), // Shortened ID as label
        completed,
        pending,
        overdue
      }
    }).slice(0, 6) // Limit to 6 categories
  }, [tasks])

  // 2. MultiLineChart: Weekly Activity Trends
  const weeklyActivityData = useMemo(() => {
    const weeks = eachWeekOfInterval({
      start: subMonths(new Date(), 3),
      end: new Date()
    }, { weekStartsOn: 1 }).slice(-12)

    return weeks.map(week => {
      const weekStart = startOfWeek(week, { weekStartsOn: 1 })
      const weekEnd = endOfWeek(week, { weekStartsOn: 1 })
      
      const tasksCompleted = tasks.filter(t => 
        t.completed && t.completedAt && 
        isWithinInterval(parseISO(t.completedAt.toString()), { start: weekStart, end: weekEnd })
      ).length
      
      const goalsCompleted = goals.filter(g => 
        g.status === 'completed' && g.completedAt &&
        isWithinInterval(parseISO(g.completedAt.toString()), { start: weekStart, end: weekEnd })
      ).length
      
      const metricEntriesCount = metricEntries.filter(e => 
        isWithinInterval(parseISO(e.entryDate.toString()), { start: weekStart, end: weekEnd })
      ).length

      return {
        category: format(week, 'd MMM', { locale: ru }),
        tasks: tasksCompleted,
        goals: goalsCompleted,
        metrics: metricEntriesCount
      }
    })
  }, [tasks, goals, metricEntries])

  // 3. AreaChart: Cumulative Progress Over Time
  const cumulativeProgressData = useMemo(() => {
    const weeks = eachWeekOfInterval({
      start: subMonths(new Date(), 3),
      end: new Date()
    }, { weekStartsOn: 1 }).slice(-12)

    let cumulativeTasks = 0
    let cumulativeGoals = 0
    let cumulativeMetrics = 0

    return weeks.map(week => {
      const weekStart = startOfWeek(week, { weekStartsOn: 1 })
      const weekEnd = endOfWeek(week, { weekStartsOn: 1 })
      
      cumulativeTasks += tasks.filter(t => 
        t.completed && t.completedAt && 
        isWithinInterval(parseISO(t.completedAt.toString()), { start: weekStart, end: weekEnd })
      ).length
      
      cumulativeGoals += goals.filter(g => 
        g.status === 'completed' && g.completedAt &&
        isWithinInterval(parseISO(g.completedAt.toString()), { start: weekStart, end: weekEnd })
      ).length
      
      cumulativeMetrics += metricEntries.filter(e => 
        isWithinInterval(parseISO(e.entryDate.toString()), { start: weekStart, end: weekEnd })
      ).length

      return {
        category: format(week, 'd MMM', { locale: ru }),
        tasks: cumulativeTasks,
        goals: cumulativeGoals,
        metrics: cumulativeMetrics
      }
    })
  }, [tasks, goals, metricEntries])

  // 4. ScatterChart: Task Complexity vs Completion Time
  const taskComplexityData = useMemo(() => {
    const completedTasks = tasks.filter(t => 
      t.completed && t.complexity && t.createdAt && t.completedAt
    )

    const lowComplexity = completedTasks
      .filter(t => t.complexity <= 2)
      .map(t => ({
        x: t.complexity,
        y: Math.round((new Date(t.completedAt!).getTime() - new Date(t.createdAt).getTime()) / (1000 * 60 * 60)), // hours
        label: t.name.slice(0, 20)
      }))

    const mediumComplexity = completedTasks
      .filter(t => t.complexity > 2 && t.complexity <= 4)
      .map(t => ({
        x: t.complexity,
        y: Math.round((new Date(t.completedAt!).getTime() - new Date(t.createdAt).getTime()) / (1000 * 60 * 60)),
        label: t.name.slice(0, 20)
      }))

    const highComplexity = completedTasks
      .filter(t => t.complexity > 4)
      .map(t => ({
        x: t.complexity,
        y: Math.round((new Date(t.completedAt!).getTime() - new Date(t.createdAt).getTime()) / (1000 * 60 * 60)),
        label: t.name.slice(0, 20)
      }))

    return [
      { key: 'low', name: 'Низкая сложность (1-2)', color: '#22c55e', data: lowComplexity },
      { key: 'medium', name: 'Средняя сложность (3-4)', color: '#f59e0b', data: mediumComplexity },
      { key: 'high', name: 'Высокая сложность (5)', color: '#ef4444', data: highComplexity }
    ]
  }, [tasks])

  return (
    <div className="space-y-8">
      {/* Stacked Bar Chart */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-6">
          <BarChart3 className="w-5 h-5 text-blue-500" />
          <h3 className="text-lg font-semibold text-gray-900">Задачи по категориям</h3>
        </div>
        {categoryTaskData.length > 0 ? (
          <StackedBarChart
            data={categoryTaskData}
            stacks={[
              { key: 'completed', name: 'Выполнено', color: '#22c55e' },
              { key: 'pending', name: 'В процессе', color: '#3b82f6' },
              { key: 'overdue', name: 'Просрочено', color: '#ef4444' }
            ]}
            height={300}
          />
        ) : (
          <div className="h-64 flex items-center justify-center text-gray-400">
            <p>Недостаточно данных</p>
          </div>
        )}
      </div>

      {/* Multi Line Chart */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-6">
          <TrendingUp className="w-5 h-5 text-green-500" />
          <h3 className="text-lg font-semibold text-gray-900">Активность по неделям</h3>
        </div>
        {weeklyActivityData.length > 0 ? (
          <MultiLineChart
            data={weeklyActivityData}
            lines={[
              { key: 'tasks', name: 'Задачи', color: '#3b82f6' },
              { key: 'goals', name: 'Цели', color: '#22c55e' },
              { key: 'metrics', name: 'Метрики', color: '#f59e0b' }
            ]}
            height={300}
          />
        ) : (
          <div className="h-64 flex items-center justify-center text-gray-400">
            <p>Недостаточно данных</p>
          </div>
        )}
      </div>

      {/* Area Chart */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-6">
          <Activity className="w-5 h-5 text-purple-500" />
          <h3 className="text-lg font-semibold text-gray-900">Накопительный прогресс</h3>
        </div>
        {cumulativeProgressData.length > 0 ? (
          <AreaChart
            data={cumulativeProgressData}
            areas={[
              { key: 'tasks', name: 'Задачи', color: '#3b82f6' },
              { key: 'goals', name: 'Цели', color: '#22c55e' },
              { key: 'metrics', name: 'Метрики', color: '#f59e0b' }
            ]}
            height={300}
            stacked={true}
          />
        ) : (
          <div className="h-64 flex items-center justify-center text-gray-400">
            <p>Недостаточно данных</p>
          </div>
        )}
      </div>

      {/* Scatter Chart */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-6">
          <Target className="w-5 h-5 text-orange-500" />
          <h3 className="text-lg font-semibold text-gray-900">Сложность vs Время выполнения</h3>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Корреляция между сложностью задачи и временем на её выполнение (в часах)
        </p>
        {taskComplexityData.some(s => s.data.length > 0) ? (
          <ScatterChart
            series={taskComplexityData}
            xAxisLabel="Сложность задачи (1-5)"
            yAxisLabel="Время выполнения (часы)"
            height={350}
          />
        ) : (
          <div className="h-64 flex items-center justify-center text-gray-400">
            <p>Недостаточно выполненных задач с указанной сложностью</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default ChartsShowcase
