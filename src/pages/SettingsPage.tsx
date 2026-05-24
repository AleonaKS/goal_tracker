import { useState, useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Download, Upload, LogOut, User, Calendar, Plus, Edit, Trash2, Settings as SettingsIcon, ToggleLeft, ToggleRight, ChevronDown, ChevronUp } from 'lucide-react'
import { useApiDataStore } from '@/stores/apiDataStore'
import { useAuthStore } from '@/stores/authStore'
import { Modal } from '@/components/Modal'
import { CategoryForm } from '@/components/CategoryForm'
import { UnitsManager } from '@/components/forms/UnitsManager'
import { ConfirmModal } from '@/components/Modal'
import { ImportModal } from '@/components/ImportModal'
import { settingsSchema, type SettingsFormData } from '@/lib/validation'
import type { Category } from '@/types'
import { useFieldErrorModal } from '@/hooks/useFieldErrorModal'
import { FieldErrorModal } from '@/components/FieldErrorModal'

export function SettingsPage() {
  const { user, updateProfile: updateSettings, logout } = useAuthStore()
  const { categories, goals, tasks, metrics, metricEntries, createCategory, updateCategory, deleteCategory, fetchCategories, fetchGoals, fetchTasks, fetchMetrics, fetchAllMetricEntries } = useApiDataStore()
  
  // Fetch categories on component mount
  useEffect(() => {
    fetchCategories()
    fetchGoals()
    fetchTasks()
    fetchMetrics()
    fetchAllMetricEntries()
  }, [])
  
  const [exportData, setExportData] = useState<string>('')
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showUnitsManager, setShowUnitsManager] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [showCategories, setShowCategories] = useState(false)

  const gamification = useMemo(() => {
    return user?.settings?.gamification?.enabled ?? true
  }, [user?.settings?.gamification])

  const updateGamification = (enabled: boolean) => {
    updateSettings({ 
      settings: { 
        ...user?.settings, 
        gamification: { enabled }
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

  const { errorMessage, clearError } = useFieldErrorModal(errors)

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
    const jsonData = JSON.stringify(data, null, 2)
    setExportData(jsonData)
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
      <h1 className="text-2xl font-bold text-gray-900">Настройки</h1>

      {/* Profile Section */}
      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <User className="w-5 h-5 text-primary-600" />
          <h2 className="text-lg font-semibold text-gray-900">Информация профиля</h2>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Логин</label>
            <p className="text-gray-900">{user?.login}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <p className="text-gray-900">{user?.email}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Дата регистрации</label>
            <p className="text-sm text-gray-500">
            {user?.createdAt ? (user.createdAt instanceof Date ? user.createdAt.toLocaleDateString() : new Date(user.createdAt).toLocaleDateString()) : 'Н/Д'}
          </p>
          </div>
        </div>
      </div>

      {/* Date Settings */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Настройки дат</h2>
        
        <form onSubmit={handleSubmit(handleSettingsSubmit)} className="space-y-4" noValidate>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Обработка месяца и года
            </label>
            <select {...register('monthYearHandling')} className="input">
              <option value="start">Начало месяца</option>
              <option value="end">Конец месяца</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Как интерпретировать сроки вида «месяц-год» (например, «2024-08»)
            </p>
            {errors.monthYearHandling && (
              <p className="mt-1 text-sm text-red-600">{errors.monthYearHandling.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Обработка года
            </label>
            <select {...register('yearHandling')} className="input">
              <option value="start">Начало года</option>
              <option value="end">Конец года</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Как интерпретировать сроки вида «год» (например, «2024»)
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
            {isSubmitting ? 'Сохранение...' : 'Сохранить настройки'}
          </button>
          <FieldErrorModal isOpen={!!errorMessage} message={errorMessage || ''} onClose={clearError} />
        </form>
      </div>

      {/* Units Management */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Единицы измерения</h2>
          <button
            onClick={() => setShowUnitsManager(true)}
            className="btn-secondary text-sm"
          >
            <SettingsIcon className="w-4 h-4 mr-1" />
            Управлять
          </button>
        </div>
        <p className="text-sm text-gray-500">
          Управление пользовательскими единицами для метрик и привычек
        </p>
      </div>

      {/* Categories Management */}
      <div className="card">
        <button
          onClick={() => setShowCategories(!showCategories)}
          className="flex items-center justify-between w-full text-left"
        >
          <h2 className="text-lg font-semibold text-gray-900">Категории</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); handleAddCategory(); }}
              className="btn-primary text-sm"
            >
              <Plus className="w-4 h-4 mr-1" />
              Добавить категорию
            </button>
            {showCategories ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
          </div>
        </button>
        
        {showCategories && (
          <div className="space-y-2 mt-4">
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
                  <button
                    onClick={() => handleEditCategory(category)}
                    className="btn-secondary text-sm p-1.5"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteCategory(category)}
                    className="btn-danger text-sm p-1.5"
                    title={category.isDefault ? "Категория по умолчанию - будет удалена навсегда" : "Удалить категорию"}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Gamification Settings */}
      <div className="card">
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div>
            <p className="font-medium text-gray-900">Включить геймификацию</p>
            <p className="text-sm text-gray-500">Очки, достижения и уровни</p>
          </div>
          <button
            onClick={() => updateGamification(!gamification)}
            className="text-blue-500 hover:text-blue-600"
          >
            {gamification ? (
              <ToggleRight className="w-10 h-6" />
            ) : (
              <ToggleLeft className="w-10 h-6 text-gray-400" />
            )}
          </button>
        </div>
      </div>

      {/* Data Import/Export */}
      <div className="card space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleExport}
            className="btn-secondary"
          >
            <Download className="w-4 h-4 mr-2" />
            Экспортировать все данные
          </button>
          
          <button
            onClick={() => setShowImportModal(true)}
            className="btn-primary"
          >
            <Upload className="w-4 h-4 mr-2" />
            Импортировать данные
          </button>
        </div>
        
        {exportData && (
          <textarea
            value={exportData}
            readOnly
            className="w-full h-32 p-2 border border-gray-300 rounded-lg text-xs font-mono"
            placeholder="Данные экспорта появятся здесь..."
          />
        )}

        <button
          onClick={logout}
          className="btn-danger w-full"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Выйти
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
        title={selectedCategory ? 'Редактирование категории' : 'Создание категории'}
        size="large"
        className="min-h-[500px]"
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
        title="Удалить категорию?"
        message={`Вы уверены, что хотите удалить "${selectedCategory?.name}"? Это действие нельзя отменить.`}
        confirmText="Удалить"
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
