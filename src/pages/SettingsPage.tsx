import { useState, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Download, Upload, LogOut, User, Calendar, Settings as SettingsIcon, Plus, Edit, Trash2, Trophy, ToggleLeft, ToggleRight } from 'lucide-react'
import { useApiDataStore } from '@/stores/apiDataStore'
import { useAuthStore } from '@/stores/authStore'
import { Modal } from '@/components/Modal'
import { CategoryForm } from '@/components/CategoryForm'
import { UnitsManager } from '@/components/forms/UnitsManager'
import { ConfirmModal } from '@/components/Modal'
import { ImportModal } from '@/components/ImportModal'
import { settingsSchema, type SettingsFormData } from '@/lib/validation'
import { cn, formatDate } from '@/lib/utils'
import type { Category } from '@/types'

export function SettingsPage() {
  const { user } = useAuthStore()
  const { goals, categories, metrics, metricEntries, tasks, createCategory, updateCategory, deleteCategory } = useApiDataStore()
  const { updateProfile: updateSettings, logout } = useAuthStore()
  const [exportData, setExportData] = useState<string>('')
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showUnitsManager, setShowUnitsManager] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  
  // Gamification settings from DB (user.settings.gamification)
  const gamification = useMemo(() => {
    return user?.settings?.gamification || { enabled: true, showPoints: true, showAchievements: true }
  }, [user?.settings?.gamification])
  
  const updateGamification = (updates: Partial<typeof gamification>) => {
    const newSettings = { ...gamification, ...updates }
    updateSettings({ 
      settings: { 
        ...user?.settings, 
        gamification: newSettings 
      } 
    })
  }

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      monthYearHandling: user?.settings?.monthYearHandling || 'end',
      yearHandling: user?.settings?.yearHandling || 'end',
    },
  })

  const handleSettingsSubmit = (data: SettingsFormData) => {
    updateSettings({ 
      settings: { 
        ...user?.settings,
        ...data 
      } 
    })
  }

  const handleExport = () => {
    const data = {
      user,
      categories,
      goals,
      metrics,
      metricEntries,
      tasks,
      exportDate: new Date().toISOString(),
    }
    setExportData(JSON.stringify(data, null, 2))
    const jsonData = exportData
    const blob = new Blob([jsonData], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `goaltracker-export-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleAddCategory = () => {
    setSelectedCategory(null)
    setShowCategoryModal(true)
  }

  const handleEditCategory = (category: Category) => {
    setSelectedCategory(category)
    setShowCategoryModal(true)
  }

  const handleDeleteCategory = (category: Category) => {
    setSelectedCategory(category)
    setShowDeleteModal(true)
  }

  const handleCategorySubmit = (data: any) => {
    if (selectedCategory) {
      updateCategory(selectedCategory.id, data)
    } else {
      createCategory(data)
    }
    setShowCategoryModal(false)
    setSelectedCategory(null)
  }

  const handleCategoryCancel = (): void => {
    setShowCategoryModal(false)
    setSelectedCategory(null)
  }

  const confirmDeleteCategory = () => {
    if (selectedCategory) {
      deleteCategory(selectedCategory.id)
    }
    setShowDeleteModal(false)
    setSelectedCategory(null)
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>

      {/* Profile Section */}
      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <User className="w-5 h-5 text-primary-600" />
          <h2 className="text-lg font-semibold text-gray-900">Profile Information</h2>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Login</label>
            <p className="text-gray-900">{user?.login}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <p className="text-gray-900">{user?.email}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Registration Date</label>
            <p className="text-sm text-gray-500">
            {user?.registrationDate ? (user.registrationDate instanceof Date ? user.registrationDate.toLocaleDateString() : new Date(user.registrationDate).toLocaleDateString()) : 'N/A'}
          </p>
          </div>
        </div>
      </div>

      {/* Date Settings */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Date Settings</h2>
        
        <form onSubmit={handleSubmit(handleSettingsSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Month-Year Handling
            </label>
            <select {...register('monthYearHandling')} className="input">
              <option value="start">Start of month</option>
              <option value="end">End of month</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              How to interpret "month-year" deadlines (e.g., "2024-08")
            </p>
            {errors.monthYearHandling && (
              <p className="mt-1 text-sm text-red-600">{errors.monthYearHandling.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Year Handling
            </label>
            <select {...register('yearHandling')} className="input">
              <option value="start">Start of year</option>
              <option value="end">End of year</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              How to interpret year deadlines (e.g., "2024")
            </p>
            {errors.yearHandling && (
              <p className="mt-1 text-sm text-red-600">{errors.yearHandling.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-primary"
          >
            {isSubmitting ? 'Saving...' : 'Save Settings'}
          </button>
        </form>
      </div>

      {/* Units Management */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Units of Measurement</h2>
          <button
            onClick={() => setShowUnitsManager(true)}
            className="btn-secondary text-sm"
          >
            <SettingsIcon className="w-4 h-4 mr-1" />
            Manage
          </button>
        </div>
        <p className="text-sm text-gray-500">
          Manage custom units for metrics and habits
        </p>
      </div>

      {/* Categories Management */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Categories</h2>
          <button
            onClick={handleAddCategory}
            className="btn-primary text-sm"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Category
          </button>
        </div>
        
        <div className="space-y-2">
          {categories.map((category) => (
            <div
              key={category.id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: category.color }}
                />
                <div>
                  <p className="font-medium text-gray-900">{category.name}</p>
                  {category.description && (
                    <p className="text-sm text-gray-500">{category.description}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!category.isDefault && (
                  <>
                    <button
                      onClick={() => handleEditCategory(category)}
                      className="btn-secondary text-sm p-1.5"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(category)}
                      className="btn-danger text-sm p-1.5"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Gamification Settings */}
      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <Trophy className="w-6 h-6 text-yellow-500" />
          <h2 className="text-lg font-semibold text-gray-900">Геймификация</h2>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium text-gray-900">Включить геймификацию</p>
              <p className="text-sm text-gray-500">Очки, достижения и уровни</p>
            </div>
            <button
              onClick={() => updateGamification({ enabled: !gamification.enabled })}
              className="text-blue-500 hover:text-blue-600"
            >
              {gamification.enabled ? (
                <ToggleRight className="w-10 h-6" />
              ) : (
                <ToggleLeft className="w-10 h-6 text-gray-400" />
              )}
            </button>
          </div>
          
          {gamification.enabled && (
            <>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">Показывать очки</p>
                  <p className="text-sm text-gray-500">Начисление очков за активность</p>
                </div>
                <button
                  onClick={() => updateGamification({ showPoints: !gamification.showPoints })}
                  className="text-blue-500 hover:text-blue-600"
                >
                  {gamification.showPoints ? (
                    <ToggleRight className="w-10 h-6" />
                  ) : (
                    <ToggleLeft className="w-10 h-6 text-gray-400" />
                  )}
                </button>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">Показывать достижения</p>
                  <p className="text-sm text-gray-500">Разблокируйте награды за прогресс</p>
                </div>
                <button
                  onClick={() => updateGamification({ showAchievements: !gamification.showAchievements })}
                  className="text-blue-500 hover:text-blue-600"
                >
                  {gamification.showAchievements ? (
                    <ToggleRight className="w-10 h-6" />
                  ) : (
                    <ToggleLeft className="w-10 h-6 text-gray-400" />
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Data Import/Export */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Data Management</h2>
        
        <div className="space-y-3">
          <button
            onClick={handleExport}
            className="btn-secondary w-full"
          >
            <Download className="w-4 h-4 mr-2" />
            Export All Data
          </button>
          
          <button
            onClick={() => setShowImportModal(true)}
            className="btn-primary w-full"
          >
            <Upload className="w-4 h-4 mr-2" />
            Import Data
          </button>
        </div>
        
        {exportData && (
          <div className="mt-4">
            <textarea
              value={exportData}
              readOnly
              className="w-full h-32 p-2 border border-gray-300 rounded-lg text-xs font-mono"
              placeholder="Export data will appear here..."
            />
          </div>
        )}
      </div>

      {/* Danger Zone */}
      <div className="card border-red-200">
        <h2 className="text-lg font-semibold text-red-900 mb-4">Danger Zone</h2>
        
        <p className="text-gray-600 mb-4">
          Sign out of your account. Your data will remain stored locally in your browser.
        </p>
        
        <button
          onClick={logout}
          className="btn-danger w-full"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </button>
      </div>

      {/* Units Manager Modal */}
      <UnitsManager
        isOpen={showUnitsManager}
        onClose={() => setShowUnitsManager(false)}
      />

      {/* Category Modal */}
      <Modal
        isOpen={showCategoryModal}
        onClose={() => handleCategoryCancel()}
        title={selectedCategory ? 'Edit Category' : 'Create Category'}
      >
        <CategoryForm
          initialData={selectedCategory || undefined}
          onSubmit={() => {
            // Form submission is handled internally by CategoryForm
            setShowCategoryModal(false)
            setSelectedCategory(null)
          }}
          onCancel={() => handleCategoryCancel()}
        />
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmDeleteCategory}
        title="Delete Category?"
        message={`Are you sure you want to delete "${selectedCategory?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />

      {/* Import Modal */}
      <ImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
      />
    </div>
  )
}
