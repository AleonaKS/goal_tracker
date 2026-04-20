import { Trophy, TrendingUp, Target } from 'lucide-react'
import { useApiDataStore } from '@/stores/apiDataStore'
import { calculateGoalProgressByMetric } from '@/lib/calculations'
import type { Metric, MetricEntry } from '@/types'

interface OverachievementTrackerProps {
  metric: Metric
  entries: MetricEntry[]
}

export function OverachievementTracker({ metric, entries }: OverachievementTrackerProps) {
  const { updateMetricEntry } = useApiDataStore()
  
  // Calculate current progress including overachievement
  const calculateProgressWithOverachievement = () => {
    const totalValue = entries.reduce(
      (sum, e) => sum + (e.isAddition ? e.value : -e.value),
      metric.startValue
    )
    
    const overachievementTotal = entries.reduce(
      (sum, e) => sum + (e.isOverachievement ? e.overachievementValue || 0 : 0),
      0
    )
    
    const adjustedTotal = totalValue + overachievementTotal
    const progress = metric.targetValue > 0 
      ? Math.min(100, Math.round((adjustedTotal / metric.targetValue) * 100))
      : 0
      
    return { progress, totalValue, overachievementTotal, adjustedTotal }
  }
  
  const { progress, totalValue, overachievementTotal, adjustedTotal } = calculateProgressWithOverachievement()
  
  // Calculate overachievement percentage
  const overachievementPercentage = metric.targetValue > 0 
    ? Math.round((overachievementTotal / metric.targetValue) * 100)
    : 0
  
  const handleToggleOverachievement = async (entryId: string, isOverachievement: boolean) => {
    const entry = entries.find(e => e.id === entryId)
    if (!entry) return
    
    await updateMetricEntry(entryId, {
      isOverachievement,
      overachievementValue: isOverachievement ? Math.abs(entry.value * 0.1) : 0 // 10% of entry value
    })
  }
  
  return (
    <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl p-6 border border-yellow-200">
      <div className="flex items-center gap-3 mb-4">
        <Trophy className="w-6 h-6 text-yellow-600" />
        <h3 className="text-lg font-semibold text-gray-900">Учет перевыполнения</h3>
      </div>
      
      {/* Progress Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-blue-500" />
            <span className="text-sm text-gray-600">Базовый прогресс</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{totalValue.toFixed(1)}</p>
          <p className="text-sm text-gray-500">из {metric.targetValue}</p>
        </div>
        
        <div className="bg-white rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="w-4 h-4 text-yellow-500" />
            <span className="text-sm text-gray-600">Перевыполнение</span>
          </div>
          <p className="text-2xl font-bold text-yellow-600">+{overachievementTotal.toFixed(1)}</p>
          <p className="text-sm text-gray-500">дополнительно</p>
        </div>
        
        <div className="bg-white rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-green-500" />
            <span className="text-sm text-gray-600">Общий прогресс</span>
          </div>
          <p className="text-2xl font-bold text-green-600">{adjustedTotal.toFixed(1)}</p>
          <p className="text-sm text-gray-500">{progress}% завершено</p>
        </div>
      </div>
      
      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Общий прогресс с учетом перевыполнения</span>
          <span className="text-lg font-bold text-green-600">{progress}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-4 relative overflow-hidden">
          <div 
            className="bg-gradient-to-r from-green-500 to-green-600 h-4 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
          {/* Overachievement indicator */}
          {overachievementPercentage > 0 && (
            <div 
              className="absolute top-0 bottom-0 bg-yellow-400 transition-all duration-500"
              style={{ 
                left: `${Math.min(progress, 100)}%`,
                width: `${Math.min(overachievementPercentage, 100 - progress)}%`
              }}
            />
          )}
        </div>
      </div>
      
      {/* Recent Entries with Overachievement Toggle */}
      <div>
        <h4 className="font-semibold text-gray-900 mb-3">Последние записи</h4>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {entries
            .filter(e => e.isOverachievement || e.value > 0)
            .slice(0, 5)
            .map(entry => (
              <div 
                key={entry.id}
                className="flex items-center justify-between bg-white rounded-lg p-3"
              >
                <div className="flex-1">
                  <p className="font-medium text-gray-900">
                    {new Date(entry.entryDate).toLocaleDateString('ru-RU')}
                  </p>
                  <p className="text-sm text-gray-600">
                    {entry.isAddition ? '+' : '-'}{entry.value} {metric.customUnit || metric.unitId}
                  </p>
                  {entry.note && (
                    <p className="text-xs text-gray-500">{entry.note}</p>
                  )}
                </div>
                
                <div className="flex items-center gap-3">
                  {entry.isOverachievement && (
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full">
                      +{entry.overachievementValue || 0}
                    </span>
                  )}
                  
                  <button
                    onClick={() => handleToggleOverachievement(entry.id, !entry.isOverachievement)}
                    className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                      entry.isOverachievement
                        ? 'bg-yellow-500 text-white hover:bg-yellow-600'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {entry.isOverachievement ? 'Перевыполнение' : 'Обычное'}
                  </button>
                </div>
              </div>
            ))}
        </div>
      </div>
      
      {/* Summary */}
      <div className="mt-4 p-4 bg-yellow-100 rounded-lg">
        <p className="text-sm text-yellow-800">
          <strong>Совет:</strong> Отмечайте записи как перевыполнение, если они превышают плановые показатели. 
          Это поможет более точно отслеживать реальный прогресс и мотивировать на лучшие результаты.
        </p>
      </div>
    </div>
  )
}
