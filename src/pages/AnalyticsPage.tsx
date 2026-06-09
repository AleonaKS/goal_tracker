import { useState, useMemo } from 'react'
import { useApiDataStore } from '@/stores/apiDataStore'
import { useAuthStore } from '@/stores/authStore'
import {
  Info, Target, CheckCircle, Clock,
  Activity, Layers, Zap, Trophy, Star, Award, History
} from 'lucide-react'
import { MetricAnalyticsModal } from '@/components/MetricAnalyticsModal'
import { SkillsRadarChart, MetricRadarChart, AnalysisRadarChart } from '@/components/RadarChart'
import { CategoryDetailModal } from '@/components/CategoryDetailModal'
// import { GamificationAnalytics } from '@/components/GamificationAnalytics'
import { cn } from '@/lib/utils'
import { DEFAULT_ACHIEVEMENTS, calculateLevel } from '@/lib/gamification'
import type { Metric, Category } from '@/types'

export function AnalyticsPage() {
  const { goals, tasks, metrics, categories, metricEntries, userAchievements, pointsHistory } = useApiDataStore()
  const { user } = useAuthStore()
  const [selectedMetric, setSelectedMetric] = useState<Metric | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)

  const achievements = DEFAULT_ACHIEVEMENTS

  const gamification = useMemo(() => {
    const g = user?.settings?.gamification
    return typeof g === 'boolean' ? g : (g?.enabled ?? true)
  }, [user?.settings?.gamification])

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
      <div className="grid grid-cols-1 min-[1680px]:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Target className="w-4 h-4 text-blue-600" />
            Прогресс по категориям
          </h3>
          <SkillsRadarChart className="w-full" />
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Zap className="w-4 h-4 text-purple-600" />
            Многомерный анализ
          </h3>
          <AnalysisRadarChart className="w-full" />
        </div>

        {metrics.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-green-600" />
              Обзор метрик
            </h3>
            <MetricRadarChart className="w-full" />
          </div>
        )}
      </div>

      {/* Gamification Stats */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex items-center gap-3 mb-6">
          <Trophy className="w-6 h-6 text-yellow-500" />
          <h2 className="text-lg font-semibold text-gray-900">Ваш прогресс</h2>
        </div>
        
        {gamification ? (
          <><div className="space-y-6">
            {/* Points Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-yellow-50 to-amber-50 p-4 rounded-xl border border-yellow-200">
                <div className="flex items-center gap-2 mb-2">
                  <Star className="w-5 h-5 text-yellow-600" />
                  <span className="text-sm font-medium text-gray-600">Очки</span>
                  <div className="relative group">
                    <Info className="w-4 h-4 text-yellow-600/60 hover:text-yellow-600 cursor-help" />
                    <div className="absolute left-0 top-full mt-2 z-50 w-[28rem] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none">
                      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-5 border border-blue-100 shadow-xl">
                        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                          <Clock className="w-4 h-4 text-blue-500" />
                          Формула начисления очков
                        </h3>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                          <div className="bg-white/70 rounded-xl p-3">
                            <p className="font-semibold text-gray-900 mb-1 text-xs">База</p>
                            <p className="text-lg font-bold text-blue-600">10 очков</p>
                            <p className="text-xs text-gray-600 mt-0.5">За выполнение задачи</p>
                          </div>
                          <div className="bg-white/70 rounded-xl p-3">
                            <p className="font-semibold text-gray-900 mb-1 text-xs">Сложность</p>
                            <p className="text-lg font-bold text-orange-600">× 2</p>
                            <p className="text-xs text-gray-600 mt-0.5">complexity × 2 очка</p>
                          </div>
                          <div className="bg-white/70 rounded-xl p-3">
                            <p className="font-semibold text-gray-900 mb-1 text-xs">Вес</p>
                            <p className="text-lg font-bold text-green-600">× 1.5</p>
                            <p className="text-xs text-gray-600 mt-0.5">weight × 1.5 очка</p>
                          </div>
                          <div className="bg-white/70 rounded-xl p-3">
                            <p className="font-semibold text-gray-900 mb-1 text-xs">Приоритет</p>
                            <p className="text-lg font-bold text-red-600">(6-p) × 3</p>
                            <p className="text-xs text-gray-600 mt-0.5">Обратный приоритет</p>
                          </div>
                        </div>
                        <div className="mt-3 pt-3 border-t border-white/50">
                          <p className="font-semibold text-gray-900 mb-2 text-xs">Бонус/штраф за сроки:</p>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                            <span className="text-green-600">✓ Досрочно: +20% за день (макс +100%)</span>
                            <span className="text-gray-600">○ Вовремя: без изменений</span>
                            <span className="text-red-600">✗ Просрочено: −10% за день (макс −50%)</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <p className="text-2xl font-bold text-gray-900">{user?.totalPoints || 0}</p>
              </div>
              
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-xl border border-purple-200">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-5 h-5 text-purple-600" />
                  <span className="text-sm font-medium text-gray-600">Уровень</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{calculateLevel(user?.totalPoints || 0).level}</p>
              </div>
              
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-xl border border-green-200">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-medium text-gray-600">Целей</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{goals.filter(g => g.status === 'completed').length}/{goals.length}</p>
              </div>
              
              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-4 rounded-xl border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-blue-600" />
                  <span className="text-sm font-medium text-gray-600">Задач</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{tasks.filter(t => t.completed).length}/{tasks.length}</p>
              </div>
            </div>
            
            {/* Points History */}
            <div className="border-t pt-4">
              <div className="flex items-center gap-2 mb-3">
                <History className="w-5 h-5 text-gray-500" />
                <h3 className="font-medium text-gray-900">История начисления очков</h3>
              </div>
              
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {pointsHistory && pointsHistory.filter(item => item.points > 0).length > 0 ? (
                  pointsHistory
                    .filter(item => item.points > 0)
                    .map((item, i) => {
                      let actionName = item.action
                      if (actionName.includes('HABIT_ENTRY:')) {
                        actionName = 'Выполнена привычка'
                      } else if (actionName.includes('METRIC_ENTRY:')) {
                        actionName = 'Запись в метрике'
                      } else if (actionName.includes('ACHIEVEMENT_UNLOCKED')) {
                        actionName = 'Разблокировано достижение'
                      }
                      
                      return (
                        <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-white rounded-lg shadow-sm">
                              <Star className="w-4 h-4 text-yellow-600" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{actionName}</p>
                              <p className="text-xs text-gray-500">{item.date}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 text-sm font-medium text-yellow-700">
                            <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                            +{item.points}
                          </div>
                        </div>
                      )
                    })
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4">
                    История очков пока пуста. Выполняйте задачи и достигайте цели!
                  </p>
                )}
              </div>
            </div>
            
            {/* Achievements */}
            <div className="border-t pt-4">
              <div className="flex items-center gap-2 mb-3">
                <Award className="w-5 h-5 text-amber-500" />
                <h3 className="font-medium text-gray-900">Достижения</h3>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {achievements.length > 0 ? (
                  achievements.map((ach) => {
                    const isUnlocked = userAchievements.some(ua => ua.achievementId === ach.id)
                    return (
                      <div 
                        key={ach.id} 
                        title={ach.description}
                        className={`p-3 rounded-xl border text-center cursor-help transition-all ${
                          isUnlocked 
                            ? 'bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-300 shadow-md' 
                            : 'bg-gray-50 border-gray-200 opacity-60 hover:opacity-80'
                        }`}
                      >
                        <span className="text-3xl">{ach.icon}</span>
                        <p className="text-sm font-medium text-gray-900 mt-1">{ach.title}</p>
                        <p className="text-xs text-gray-500">{ach.points} очков</p>
                        {isUnlocked ? (
                          <p className="text-xs text-green-600 mt-1 font-medium">✓ Получено</p>
                        ) : (
                          <p className="text-xs text-gray-400 mt-1">{ach.description}</p>
                        )}
                      </div>
                    )
                  })
                ) : (
                  <p className="text-sm text-gray-500 text-center col-span-4 py-4">
                    Достижения появятся по мере прогресса в приложении
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* <GamificationAnalytics /> */}
        </>) : (
          <p className="text-gray-500 text-center py-4">
            Геймификация отключена. Включите её в настройках.
          </p>
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
