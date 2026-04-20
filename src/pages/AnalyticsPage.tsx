import { useState, useMemo } from 'react'
import { useApiDataStore } from '@/stores/apiDataStore'
import {
  Target, CheckCircle, Clock,
  Activity, Layers, Zap
} from 'lucide-react'
import { MetricAnalyticsModal } from '@/components/MetricAnalyticsModal'
import { SkillsRadarChart, MetricRadarChart, AnalysisRadarChart } from '@/components/RadarChart'
import { CategoryDetailModal } from '@/components/CategoryDetailModal'
import type { Metric, Category } from '@/types'

export function AnalyticsPage() {
  const { goals, tasks, metrics, categories, metricEntries } = useApiDataStore()
  const [selectedMetric, setSelectedMetric] = useState<Metric | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)

  const analyticsData = useMemo(() => {
    const completedGoals = goals.filter(g => g.status === 'completed')
    const inProgressGoals = goals.filter(g => g.status === 'in_progress')
    const completedTasks = tasks.filter(t => t.completed)

    const goalsByCategory = categories.map(category => {
      const categoryGoals = goals.filter(g => g.categoryId === category.id)
      const completed = categoryGoals.filter(g => g.status === 'completed').length
      const inProgress = categoryGoals.filter(g => g.status === 'in_progress').length
      const totalProgress = categoryGoals.reduce((acc, g) => acc + (g.progress || 0), 0) / Math.max(1, categoryGoals.length)

      return {
        category,
        total: categoryGoals.length,
        completed,
        inProgress,
        progress: Math.round(totalProgress),
        color: category.color || '#6b7280'
      }
    }).filter(c => c.total > 0)

    return {
      completedGoals: completedGoals.length,
      inProgressGoals: inProgressGoals.length,
      completedTasks: completedTasks.length,
      totalGoals: goals.length,
      totalTasks: tasks.length,
      goalsByCategory,
      productivityScore: Math.round((completedGoals.length / Math.max(1, goals.length)) * 100)
    }
  }, [goals, tasks, categories])

  const handleEditMetric = (metric: Metric) => {
    window.location.hash = `/metrics?edit=${metric.id}`
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Category Details */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
          <Layers className="w-5 h-5 text-purple-600" />
          Детализация по категориям
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {analyticsData.goalsByCategory.map((cat) => (
            <button
              key={cat.category.id}
              onClick={() => setSelectedCategory(cat.category)}
              className="border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow text-left"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: cat.color }}
                  >
                    {cat.category.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">{cat.category.name}</h4>
                    <p className="text-sm text-gray-500">{cat.total} целей</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Прогресс</span>
                  <span className="font-medium text-gray-900">{cat.progress}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${cat.progress}%`,
                      backgroundColor: cat.color
                    }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-gray-600">{cat.completed} выполнено</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-500" />
                    <span className="text-gray-600">{cat.inProgress} в работе</span>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Radar Charts */}
      <div className="space-y-6">
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-600" />
            Skills Analysis by Categories
          </h3>
          <SkillsRadarChart className="w-full" />
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <Zap className="w-5 h-5 text-purple-600" />
            Multi-Dimensional Performance Analysis
          </h3>
          <AnalysisRadarChart className="w-full" />
        </div>

        {metrics.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <Activity className="w-5 h-5 text-green-600" />
              Metrics Progress Overview
            </h3>
            <MetricRadarChart className="w-full" />
          </div>
        )}
      </div>

      {selectedMetric && (
        <MetricAnalyticsModal
          isOpen={true}
          onClose={() => setSelectedMetric(null)}
          metric={selectedMetric}
          onEdit={handleEditMetric}
        />
      )}

      {selectedCategory && (
        <CategoryDetailModal
          isOpen={!!selectedCategory}
          onClose={() => setSelectedCategory(null)}
          initialCategory={selectedCategory}
        />
      )}
    </div>
  )
}
