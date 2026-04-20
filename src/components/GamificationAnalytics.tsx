import { useMemo } from 'react'
import { useApiDataStore } from '@/stores/apiDataStore'
import { calculateGamificationAnalytics, calculateLevel, LEVEL_THRESHOLDS } from '@/lib/gamification'
import { cn } from '@/lib/utils'
import { format, subDays } from 'date-fns'
import { ru } from 'date-fns/locale'
import {
  Trophy, Target, Zap, TrendingUp, TrendingDown, Clock,
  CheckCircle, AlertCircle, Calendar, BarChart3, Award,
  ChevronRight, Star, Flame, Activity
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid
} from 'recharts'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

export function GamificationAnalytics() {
  const { tasks, user } = useApiDataStore()

  const analytics = useMemo(() => {
    const taskData = tasks.map(t => ({
      completed: t.completed,
      completedAt: t.completedAt,
      dueDate: t.dueDate,
      complexity: t.complexity || 2,
      weight: t.weight || 1,
      priority: t.priority || 3,
      createdAt: t.createdAt
    }))

    return calculateGamificationAnalytics(
      taskData,
      user?.totalPoints || 0,
      [] // Recent actions would come from a separate store/table
    )
  }, [tasks, user?.totalPoints])

  const level = useMemo(() => 
    calculateLevel(user?.totalPoints || 0),
    [user?.totalPoints]
  )

  // Prepare chart data
  const sourceData = [
    { name: 'Задачи', value: analytics.pointsBySource.tasks, color: '#3b82f6' },
    { name: 'Цели', value: analytics.pointsBySource.goals, color: '#10b981' },
    { name: 'Привычки', value: analytics.pointsBySource.habits, color: '#f59e0b' },
    { name: 'Достижения', value: analytics.pointsBySource.achievements, color: '#ef4444' },
    { name: 'Другое', value: analytics.pointsBySource.other, color: '#8b5cf6' },
  ].filter(d => d.value > 0)

  const completionData = [
    { name: 'Досрочно', value: analytics.taskStats.earlyCompletions, color: '#10b981' },
    { name: 'Вовремя', value: analytics.taskStats.onTimeCompletions, color: '#3b82f6' },
    { name: 'С опозданием', value: analytics.taskStats.lateCompletions, color: '#ef4444' },
  ]

  const trendData = analytics.dailyPointsTrend.map(d => ({
    date: format(new Date(d.date), 'dd MMM', { locale: ru }),
    points: d.points
  }))

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Total Points Card */}
        <div className="bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl p-5 text-white">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Trophy className="w-5 h-5" />
            </div>
            <span className="text-sm font-medium text-white/80">Всего очков</span>
          </div>
          <div className="text-3xl font-bold">{analytics.totalPoints.toLocaleString()}</div>
          <div className="mt-2 text-sm text-white/80">
            Уровень {analytics.currentLevel}: {analytics.levelTitle}
          </div>
        </div>

        {/* Weekly Points */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <Zap className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-sm font-medium text-gray-600">На этой неделе</span>
          </div>
          <div className="text-3xl font-bold text-gray-900">
            +{analytics.pointsThisWeek.toLocaleString()}
          </div>
          <div className={cn(
            "mt-2 text-sm flex items-center gap-1",
            analytics.weeklyComparison.change >= 0 ? "text-green-600" : "text-red-600"
          )}>
            {analytics.weeklyComparison.change >= 0 ? (
              <TrendingUp className="w-4 h-4" />
            ) : (
              <TrendingDown className="w-4 h-4" />
            )}
            {analytics.weeklyComparison.changePercent > 0 ? '+' : ''}
            {analytics.weeklyComparison.changePercent.toFixed(0)}% к прошлой неделе
          </div>
        </div>

        {/* Monthly Points */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
              <Calendar className="w-5 h-5 text-purple-600" />
            </div>
            <span className="text-sm font-medium text-gray-600">В этом месяце</span>
          </div>
          <div className="text-3xl font-bold text-gray-900">
            +{analytics.pointsThisMonth.toLocaleString()}
          </div>
          <div className="mt-2 text-sm text-gray-500">
            Средне {Math.round(analytics.pointsThisMonth / 30)} в день
          </div>
        </div>

        {/* Completion Rate */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <span className="text-sm font-medium text-gray-600">Вовремя</span>
          </div>
          <div className="text-3xl font-bold text-gray-900">
            {Math.round(analytics.completionRate * 100)}%
          </div>
          <div className="mt-2 text-sm text-gray-500">
            {analytics.taskStats.earlyCompletions} досрочно
          </div>
        </div>
      </div>

      {/* Level Progress */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-xl">
              {analytics.currentLevel}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{analytics.levelTitle}</h3>
              <p className="text-sm text-gray-500">
                До следующего уровня: {analytics.pointsToNextLevel} очков
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-gray-900">
              {Math.round(((LEVEL_THRESHOLDS.find(l => l.level === analytics.currentLevel + 1)?.points || analytics.totalPoints + 1000) - analytics.pointsToNextLevel) / (LEVEL_THRESHOLDS.find(l => l.level === analytics.currentLevel + 1)?.points || 1000) * 100)}%
            </p>
            <p className="text-sm text-gray-500">прогресс</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="relative h-4 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full transition-all duration-500"
            style={{
              width: `${Math.min(100, ((user?.totalPoints || 0) - (LEVEL_THRESHOLDS.find(l => l.level === analytics.currentLevel)?.points || 0)) / (analytics.pointsToNextLevel + ((user?.totalPoints || 0) - (LEVEL_THRESHOLDS.find(l => l.level === analytics.currentLevel)?.points || 0))) * 100)}%`
            }}
          />
        </div>

        {/* Level Preview */}
        <div className="flex items-center justify-between mt-4 text-sm">
          {LEVEL_THRESHOLDS.slice(0, 6).map((l) => (
            <div
              key={l.level}
              className={cn(
                "flex flex-col items-center gap-1",
                l.level <= analytics.currentLevel ? "text-blue-600" : "text-gray-400"
              )}
            >
              <div
                className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold",
                  l.level <= analytics.currentLevel
                    ? "bg-blue-100 text-blue-600"
                    : "bg-gray-100 text-gray-400"
                )}
              >
                {l.level}
              </div>
              <span className="text-xs hidden md:block">{l.title}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Points Trend */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-500" />
            Динамика очков
          </h3>
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                />
                <Bar dataKey="points" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Нет данных за последние 30 дней</p>
              </div>
            </div>
          )}
        </div>

        {/* Points by Source */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <PieChart className="w-5 h-5 text-purple-500" />
            Источники очков
          </h3>
          {sourceData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={sourceData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {sourceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                  formatter={(value: number) => [`${value} очков`, '']}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <Award className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Начните выполнять задачи для получения очков</p>
              </div>
            </div>
          )}
          
          {/* Legend */}
          <div className="flex flex-wrap gap-3 mt-4 justify-center">
            {sourceData.map((item) => (
              <div key={item.name} className="flex items-center gap-2 text-sm">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-gray-600">{item.name}</span>
                <span className="font-medium text-gray-900">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Task Performance Stats */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Target className="w-5 h-5 text-green-500" />
          Статистика выполнения задач
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="p-4 bg-gray-50 rounded-xl">
            <p className="text-2xl font-bold text-gray-900">{analytics.taskStats.totalCompleted}</p>
            <p className="text-sm text-gray-600">Всего выполнено</p>
          </div>
          <div className="p-4 bg-green-50 rounded-xl">
            <p className="text-2xl font-bold text-green-600">{analytics.taskStats.earlyCompletions}</p>
            <p className="text-sm text-gray-600">Досрочно</p>
          </div>
          <div className="p-4 bg-blue-50 rounded-xl">
            <p className="text-2xl font-bold text-blue-600">{analytics.taskStats.onTimeCompletions}</p>
            <p className="text-sm text-gray-600">Вовремя</p>
          </div>
          <div className="p-4 bg-red-50 rounded-xl">
            <p className="text-2xl font-bold text-red-600">{analytics.taskStats.lateCompletions}</p>
            <p className="text-sm text-gray-600">С опозданием</p>
          </div>
        </div>

        {/* Average Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-4 p-4 border rounded-xl">
            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
              <Flame className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {analytics.taskStats.averageComplexity.toFixed(1)}
              </p>
              <p className="text-sm text-gray-600">Средняя сложность</p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-4 border rounded-xl">
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {analytics.taskStats.averagePriority.toFixed(1)}
              </p>
              <p className="text-sm text-gray-600">Средний приоритет</p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-4 border rounded-xl">
            <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
              <Star className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {analytics.taskStats.averagePointsPerTask.toFixed(1)}
              </p>
              <p className="text-sm text-gray-600">Очков за задачу</p>
            </div>
          </div>
        </div>
      </div>

      {/* Scoring Formula Explanation */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-6 border border-blue-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-500" />
          Формула начисления очков
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white/70 rounded-xl p-4">
            <p className="font-semibold text-gray-900 mb-1">База</p>
            <p className="text-2xl font-bold text-blue-600">10 очков</p>
            <p className="text-sm text-gray-600 mt-1">За выполнение задачи</p>
          </div>
          <div className="bg-white/70 rounded-xl p-4">
            <p className="font-semibold text-gray-900 mb-1">Сложность</p>
            <p className="text-2xl font-bold text-orange-600">× 2</p>
            <p className="text-sm text-gray-600 mt-1"> complexity × 2 очка</p>
          </div>
          <div className="bg-white/70 rounded-xl p-4">
            <p className="font-semibold text-gray-900 mb-1">Вес</p>
            <p className="text-2xl font-bold text-green-600">× 1.5</p>
            <p className="text-sm text-gray-600 mt-1">weight × 1.5 очка</p>
          </div>
          <div className="bg-white/70 rounded-xl p-4">
            <p className="font-semibold text-gray-900 mb-1">Приоритет</p>
            <p className="text-2xl font-bold text-red-600">(6-p) × 3</p>
            <p className="text-sm text-gray-600 mt-1">Обратный приоритет</p>
          </div>
        </div>
        <div className="mt-4 p-4 bg-white/70 rounded-xl">
          <p className="font-semibold text-gray-900 mb-2">Бонус/штраф за сроки:</p>
          <div className="flex gap-6 text-sm">
            <span className="text-green-600">✓ Досрочно: +20% за день (макс +100%)</span>
            <span className="text-gray-600">○ Вовремя: без изменений</span>
            <span className="text-red-600">✗ Просрочено: −10% за день (макс −50%)</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default GamificationAnalytics
