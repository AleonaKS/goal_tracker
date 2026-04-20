import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Filter, TrendingUp, Flame, Target, Calendar, ChevronDown, ChevronUp, Edit, Trash2, BarChart3, Activity, Minus, PlusCircle } from 'lucide-react'
import { useApiDataStore } from '@/stores/apiDataStore'
import { Modal } from '@/components/Modal'
import { MetricForm } from '@/components/forms/MetricForm'
import { cn, formatDate } from '@/lib/utils'
import type { Metric, Category } from '@/types'

export function MetricsPage() {
  const navigate = useNavigate()
  const { 
    metrics, 
    metricEntries,
    categories, 
    createMetric, 
    updateMetric, 
    deleteMetric,
    createMetricEntry,
    updateMetricEntry,
    deleteMetricEntry,
    isLoading 
  } = useApiDataStore()

  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [filterType, setFilterType] = useState<'all' | 'habit' | 'counter'>('all')
  const [sortBy, setSortBy] = useState<'name' | 'progress' | 'streak'>('progress')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [showFilters, setShowFilters] = useState(false)
  const [showAnalytics, setShowAnalytics] = useState(false)
  
  // Modal states
  const [showMetricModal, setShowMetricModal] = useState(false)
  const [selectedMetric, setSelectedMetric] = useState<Metric | null>(null)
  const [selectedMetricForAnalytics, setSelectedMetricForAnalytics] = useState<Metric | null>(null)
  const [showEntryModal, setShowEntryModal] = useState(false)
  const [entryMode, setEntryMode] = useState<'add' | 'subtract'>('add')
  const [entryValue, setEntryValue] = useState<number>(0)
  const [entryNote, setEntryNote] = useState('')
  const [entryDate, setEntryDate] = useState(new Date())

  // Calculate metrics with stats
  const metricsWithStats = metrics.map(metric => {
    const entries = metricEntries.filter(e => e.metricId === metric.id)
    const totalValue = entries.reduce((sum, entry) => sum + entry.value, 0)
    const progress = metric.targetValue > 0 ? Math.round((totalValue / metric.targetValue) * 100) : 0
    const sortedEntries = entries.sort((a, b) => new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime())
    const latestEntry = sortedEntries[0]
    
    // Calculate streak (simplified)
    let currentStreak = 0
    let maxStreak = 0
    if (metric.type === 'habit' && entries.length > 0) {
      currentStreak = 1 // Simplified - should calculate actual streak
      maxStreak = Math.max(...entries.map(() => 1)) // Simplified
    }
    
    return {
      ...metric,
      totalValue,
      progress,
      currentStreak,
      maxStreak,
      recordValue: Math.max(...entries.map(e => e.value), 0),
      latestEntry
    } as Metric & { totalValue: number; progress: number; currentStreak: number; maxStreak: number; recordValue: number; latestEntry: any }
  })

  // Filter metrics
  const filteredMetrics = metricsWithStats
    .filter(metric => {
      const matchesSearch = metric.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (metric.description && metric.description.toLowerCase().includes(searchTerm.toLowerCase()))
      const matchesCategory = selectedCategory === 'all' || metric.categoryId === selectedCategory
      const matchesType = filterType === 'all' || metric.type === filterType
      return matchesSearch && matchesCategory && matchesType
    })
    .sort((a, b) => {
      let comparison = 0
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name)
          break
        case 'progress':
          comparison = (b.progress || 0) - (a.progress || 0)
          break
        case 'streak':
          comparison = (b.currentStreak || 0) - (a.currentStreak || 0)
          break
      }
      return sortOrder === 'asc' ? comparison : -comparison
    })

  const handleCreateMetric = () => {
    setSelectedMetric(null)
    setShowMetricModal(true)
  }

  const handleEditMetric = (metric: Metric) => {
    setSelectedMetric(metric)
    setShowMetricModal(true)
  }

  const handleDeleteMetric = async (metricId: string) => {
    if (confirm('Are you sure you want to delete this metric?')) {
      await deleteMetric(metricId)
    }
  }

  const handleViewAnalytics = (metric: Metric) => {
    setSelectedMetricForAnalytics(metric)
    setShowAnalytics(true)
  }

  const handleRecordEntry = (metric: Metric, mode: 'add' | 'subtract' = 'add') => {
    setSelectedMetric(metric)
    setEntryMode(mode)
    setEntryValue(metric.stepValue || 1)
    setEntryNote('')
    setEntryDate(new Date())
    setShowEntryModal(true)
  }

  const handleSubmitEntry = async () => {
    if (!selectedMetric) return
    
    // Get the latest entry for this metric
    const entries = metricEntries.filter(e => e.metricId === selectedMetric.id)
    const latestEntry = entries.sort((a, b) => new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime())[0]
    
    const finalValue = entryMode === 'add' 
      ? (latestEntry?.finalValue || 0) + entryValue
      : (latestEntry?.finalValue || 0) - entryValue
    
    await createMetricEntry({
      metricId: selectedMetric.id,
      entryDate: entryDate,
      value: entryValue,
      finalValue: finalValue,
      note: entryNote,
      isAddition: entryMode === 'add'
    })
    
    setShowEntryModal(false)
    setEntryValue(0)
    setEntryNote('')
  }

  const getMetricCategory = (categoryId?: string) => {
    return categories.find(cat => cat.id === categoryId)
  }

  const getTypeIcon = (type: string) => {
    return type === 'habit' ? Flame : BarChart3
  }

  const getTypeLabel = (type: string) => {
    return type === 'habit' ? 'Habit' : 'Counter'
  }

  const getProgressColor = (progress: number) => {
    if (progress >= 100) return 'text-green-600 bg-green-100'
    if (progress >= 75) return 'text-blue-600 bg-blue-100'
    if (progress >= 50) return 'text-yellow-600 bg-yellow-100'
    return 'text-gray-600 bg-gray-100'
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Metrics</h1>
          <button
            onClick={handleCreateMetric}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors"
          >
            <Plus className="w-5 h-5" />
            New Metric
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gradient-to-br from-blue-400 to-blue-500 rounded-2xl p-6 text-white shadow-lg">
            <div className="flex items-center gap-3 mb-2">
              <BarChart3 className="h-6 w-6 opacity-80" />
            </div>
            <div className="text-3xl font-bold">{metrics.length}</div>
            <div className="text-sm opacity-90">Total Metrics</div>
          </div>
          
          <div className="bg-gradient-to-br from-orange-400 to-orange-500 rounded-2xl p-6 text-white shadow-lg">
            <div className="flex items-center gap-3 mb-2">
              <Flame className="h-6 w-6 opacity-80" />
            </div>
            <div className="text-3xl font-bold">
              {metrics.filter(m => m.type === 'habit').length}
            </div>
            <div className="text-sm opacity-90">Active Habits</div>
          </div>
          
          <div className="bg-gradient-to-br from-green-400 to-green-500 rounded-2xl p-6 text-white shadow-lg">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="h-6 w-6 opacity-80" />
            </div>
            <div className="text-3xl font-bold">
              {metrics.filter(m => m.type === 'counter').length}
            </div>
            <div className="text-sm opacity-90">Active Counters</div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search metrics..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Category Filter */}
            <div className="relative">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <Filter className="w-4 h-4" />
                <span>
                  {selectedCategory === 'all' ? 'All Categories' : getMetricCategory(selectedCategory)?.name || 'Category'}
                </span>
                <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
              </button>
              
              {showFilters && (
                <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                  <button
                    onClick={() => {
                      setSelectedCategory('all')
                      setShowFilters(false)
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 first:rounded-t-lg"
                  >
                    All Categories
                  </button>
                  {categories.map(category => (
                    <button
                      key={category.id}
                      onClick={() => {
                        setSelectedCategory(category.id)
                        setShowFilters(false)
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: category.color }}
                      />
                      {category.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Type Filter */}
            <div className="flex gap-2">
              <button
                onClick={() => setFilterType('all')}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  filterType === 'all' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All Types
              </button>
              <button
                onClick={() => setFilterType('habit')}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  filterType === 'habit' 
                    ? 'bg-orange-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Habits
              </button>
              <button
                onClick={() => setFilterType('counter')}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  filterType === 'counter' 
                    ? 'bg-green-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Counters
              </button>
            </div>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="name">Name</option>
              <option value="progress">Progress</option>
              <option value="streak">Streak</option>
            </select>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredMetrics.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <BarChart3 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No metrics found</h3>
            <p className="text-gray-500">
              {searchTerm ? 'Try adjusting your search terms' : 'Create your first metric to get started'}
            </p>
          </div>
        ) : (
          filteredMetrics.map(metric => {
            const category = getMetricCategory(metric.categoryId)
            const TypeIcon = getTypeIcon(metric.type)
            
            return (
              <div key={metric.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      {/* Category indicator */}
                      {category && (
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-4 h-4 rounded-full" 
                            style={{ backgroundColor: category.color }}
                          />
                          <span className="text-sm text-gray-500">{category.name}</span>
                        </div>
                      )}
                      
                      {/* Type indicator */}
                      <div className="flex items-center gap-2">
                        <TypeIcon className={`w-4 h-4 ${metric.type === 'habit' ? 'text-orange-500' : 'text-blue-500'}`} />
                        <span className="text-sm text-gray-500">{getTypeLabel(metric.type)}</span>
                      </div>
                    </div>
                    
                    <h3 className="text-lg font-semibold text-gray-900 mb-2 truncate">{metric.name}</h3>
                    {metric.description && (
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">{metric.description}</p>
                    )}
                  </div>
                  
                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleViewAnalytics(metric)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Activity className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleEditMetric(metric)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteMetric(metric.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                {/* Progress and Stats */}
                <div className="space-y-3">
                  {/* Progress Bar */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Progress</span>
                      <span className="text-sm font-bold text-gray-900">{metric.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-300"
                        style={{ width: `${metric.progress}%` }}
                      />
                    </div>
                  </div>
                  
                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Current Value</span>
                      <span className="font-bold text-gray-900">{metric.totalValue}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Target Value</span>
                      <span className="font-bold text-gray-900">{metric.targetValue}</span>
                    </div>
                    {metric.type === 'habit' && (
                      <>
                        <div>
                          <span className="text-gray-500">Current Streak</span>
                          <span className="font-bold text-orange-600">{metric.currentStreak} days</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Record</span>
                          <span className="font-bold text-green-600">{metric.maxStreak} days</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                
                {/* Quick Actions */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <span>Unit: {metric.customUnit || 'units'}</span>
                      <span>•</span>
                      <span>Periodicity: {metric.scheduleId || 'Daily'}</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleRecordEntry(metric, 'add')}
                        className="flex items-center gap-1 px-3 py-1 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600 transition-colors"
                      >
                        <PlusCircle className="w-4 h-4" />
                        Add Entry
                      </button>
                      <button
                        onClick={() => handleRecordEntry(metric, 'subtract')}
                        className="flex items-center gap-1 px-3 py-1 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition-colors"
                      >
                        <Minus className="w-4 h-4" />
                        Subtract Entry
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Metric Creation Modal */}
      <Modal
        isOpen={showMetricModal}
        onClose={() => setShowMetricModal(false)}
        title={selectedMetric ? 'Edit Metric' : 'Create Metric'}
        size="large"
      >
        <MetricForm
          initialData={selectedMetric || undefined}
          onSubmit={() => setShowMetricModal(false)}
          onCancel={() => setShowMetricModal(false)}
        />
      </Modal>

      {/* Entry Recording Modal */}
      <Modal
        isOpen={showEntryModal}
        onClose={() => setShowEntryModal(false)}
        title={`${entryMode === 'add' ? 'Add' : 'Subtract'} Entry - ${selectedMetric?.name}`}
        size="medium"
      >
        {selectedMetric && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {entryMode === 'add' ? 'Value to Add' : 'Value to Subtract'}
              </label>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setEntryValue(Math.max(1, entryValue - 1))}
                  className="p-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <input
                  type="number"
                  value={entryValue}
                  onChange={(e) => setEntryValue(parseInt(e.target.value) || 0)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="1"
                />
                <button
                  onClick={() => setEntryValue(entryValue + 1)}
                  className="p-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Note (optional)
              </label>
              <textarea
                value={entryNote}
                onChange={(e) => setEntryNote(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
                placeholder="Add a note..."
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date & Time
              </label>
              <input
                type="datetime-local"
                value={entryDate.toISOString().slice(0, 16)}
                onChange={(e) => setEntryDate(new Date(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowEntryModal(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitEntry}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                {entryMode === 'add' ? 'Add Entry' : 'Subtract Entry'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Analytics Modal */}
      <Modal
        isOpen={showAnalytics}
        onClose={() => setShowAnalytics(false)}
        title="Metric Analytics"
        size="large"
      >
        {selectedMetricForAnalytics && (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-xl font-bold text-gray-900 mb-2">{selectedMetricForAnalytics.name}</h3>
              <p className="text-gray-600">{selectedMetricForAnalytics.description}</p>
            </div>
            
            {/* Stats Overview */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">{selectedMetricForAnalytics.totalValue}</div>
                <div className="text-sm text-gray-600">Total Value</div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">{selectedMetricForAnalytics.progress}%</div>
                <div className="text-sm text-gray-600">Progress</div>
              </div>
              {selectedMetricForAnalytics.type === 'habit' && (
                <>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">{selectedMetricForAnalytics.currentStreak}</div>
                    <div className="text-sm text-gray-600">Current Streak</div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{selectedMetricForAnalytics.maxStreak}</div>
                    <div className="text-sm text-gray-600">Record Streak</div>
                  </div>
                </>
              )}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{selectedMetricForAnalytics.recordValue}</div>
                <div className="text-sm text-gray-600">Record Value</div>
              </div>
            </div>
            
            {/* Progress Chart */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold text-gray-900 mb-3">Target Progress</h4>
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-blue-600 h-4 rounded-full transition-all duration-300"
                  style={{ width: `${selectedMetricForAnalytics.progress}%` }}
                />
              </div>
              <div className="text-center mt-2">
                <span className="text-lg font-bold text-gray-900">{selectedMetricForAnalytics.totalValue}</span>
                <span className="text-gray-600"> of {selectedMetricForAnalytics.targetValue}</span>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowAnalytics(false)
                  handleEditMetric(selectedMetricForAnalytics)
                }}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Edit Metric
              </button>
              <button
                onClick={() => setShowAnalytics(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
