import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ChevronDown, ChevronUp, Plus } from 'lucide-react'
import { categorySchema } from '@/lib/validation'
import { useApiDataStore } from '@/stores/apiDataStore'
import { cn } from '@/lib/utils'
import type { Category } from '@/types'
import { useFieldErrorModal } from '@/hooks/useFieldErrorModal'
import { FieldErrorModal } from '@/components/FieldErrorModal'

interface CategoryFormProps {
  initialData?: Category
  onSubmit: () => void
  onCancel: () => void
}

// Icon mapping for Lucide React icons
const iconMap: Record<string, string> = {
  'folder': '📁',
  'briefcase': '💼',
  'heart': '❤️',
  'star': '⭐',
  'target': '🎯',
  'book': '📚',
  'code': '💻',
  'music': '🎵',
  'camera': '📷',
  'gamepad': '🎮',
  'plane': '✈️',
  'home': '🏠',
  'car': '🚗',
  'shopping-bag': '🛍️',
  'dumbbell': '🏋️'
}

export function CategoryForm({ initialData, onSubmit, onCancel }: CategoryFormProps) {
  const { createCategory, updateCategory, user } = useApiDataStore()
  const [isIconSectionOpen, setIsIconSectionOpen] = useState(false)
  const [isColorSectionOpen, setIsColorSectionOpen] = useState(false)
  const [customColor, setCustomColor] = useState('#6366f1')
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm({
    resolver: zodResolver(categorySchema),
    defaultValues: initialData || {
      name: '',
      description: '',
      icon: 'folder',
      color: '#3b82f6',
      isDefault: false,
    },
  })

  const { errorMessage, clearError } = useFieldErrorModal(errors)

  const selectedIcon = watch('icon')
  const selectedColor = watch('color')

  const predefinedColors = [
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
    '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16'
  ]

  const icons = [
    'folder', 'briefcase', 'heart', 'star', 'target', 'book', 'code', 'music',
    'camera', 'gamepad', 'plane', 'home', 'car', 'shopping-bag', 'dumbbell'
  ]

  const onFormSubmit = (data: z.infer<typeof categorySchema>) => {
    if (initialData) {
      updateCategory(initialData.id, data)
    } else {
      createCategory({
        ...data,
        userId: user?.id || '',
        isDefault: false
      } as Omit<Category, 'id' | 'createdAt' | 'updatedAt'>)
    }
    onSubmit()
  }

  const handleIconSelect = (icon: string) => {
    setValue('icon', icon)
  }

  const handleColorSelect = (color: string) => {
    setValue('color', color)
  }

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} noValidate className="space-y-6">
      {/* Basic Info Section */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-800 mb-2">
            Название категории
          </label>
          <input
            {...register('name')}
            type="text"
            className="w-full px-4 py-3 text-base border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
            placeholder="Введите название категории"
          />
          {errors.name && (
            <p className="text-red-500 text-sm mt-2 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
              {errors.name.message}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-800 mb-2">
            Описание
          </label>
          <textarea
            {...register('description')}
            className="w-full px-4 py-3 text-base border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all resize-none"
            rows={3}
            placeholder="Необязательное описание категории"
          />
          {errors.description && (
            <p className="text-red-500 text-sm mt-2 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
              {errors.description.message}
            </p>
          )}
        </div>
      </div>

      {/* Icon Selection - Collapsible */}
      <div className="border-2 border-gray-200 rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => setIsIconSectionOpen(!isIconSectionOpen)}
          className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between"
        >
          <span className="text-sm font-semibold text-gray-800 flex items-center gap-2">
            <span className="text-xl">{iconMap[selectedIcon]}</span>
            Выбрать иконку
          </span>
          {isIconSectionOpen ? (
            <ChevronUp className="w-4 h-4 text-gray-600" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-600" />
          )}
        </button>
        
        {isIconSectionOpen && (
          <div className="p-4 bg-white border-t-2 border-gray-200">
            <div className="grid grid-cols-6 gap-3">
              {icons.map(icon => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => handleIconSelect(icon)}
                  className={cn(
                    'p-3 rounded-xl border-2 transition-all hover:scale-105',
                    selectedIcon === icon 
                      ? 'border-blue-500 bg-blue-50 shadow-md' 
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  )}
                >
                  <span className="text-2xl">{iconMap[icon]}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Color Selection - Collapsible */}
      <div className="border-2 border-gray-200 rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => setIsColorSectionOpen(!isColorSectionOpen)}
          className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between"
        >
          <span className="text-sm font-semibold text-gray-800 flex items-center gap-2">
            <div 
              className="w-6 h-6 rounded-lg border-2 border-gray-300"
              style={{ backgroundColor: selectedColor }}
            />
            Выбрать цвет
          </span>
          {isColorSectionOpen ? (
            <ChevronUp className="w-4 h-4 text-gray-600" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-600" />
          )}
        </button>
        
        {isColorSectionOpen && (
          <div className="p-4 bg-white border-t-2 border-gray-200 space-y-4">
            {/* Predefined Colors */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-3">Стандартные цвета</p>
              <div className="grid grid-cols-8 gap-2">
                {predefinedColors.map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => handleColorSelect(color)}
                    className={cn(
                      'w-10 h-10 rounded-xl border-2 transition-all hover:scale-110',
                      selectedColor === color 
                        ? 'border-gray-800 shadow-lg scale-105' 
                        : 'border-gray-300 hover:border-gray-400'
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            {/* Custom Color */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-3">Свой цвет</p>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={customColor}
                  onChange={(e) => {
                    setCustomColor(e.target.value)
                    handleColorSelect(e.target.value)
                  }}
                  className="w-16 h-10 rounded-lg border-2 border-gray-300 cursor-pointer"
                />
                <input
                  type="text"
                  value={customColor}
                  onChange={(e) => {
                    setCustomColor(e.target.value)
                    handleColorSelect(e.target.value)
                  }}
                  className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg text-sm font-mono"
                  placeholder="#000000"
                />
                <button
                  type="button"
                  onClick={() => handleColorSelect(customColor)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  Применить
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4 pt-6 border-t border-gray-200">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-6 py-3 text-base font-semibold text-gray-700 bg-gray-100 border-2 border-gray-200 rounded-xl hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-300 transition-all"
        >
          Отмена
        </button>
        <button
          type="submit"
          className="flex-1 px-6 py-3 text-base font-semibold text-white bg-blue-600 border-2 border-blue-600 rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300 transition-all"
        >
          {initialData ? 'Обновить' : 'Создать'}
        </button>
      </div>
      <FieldErrorModal isOpen={!!errorMessage} message={errorMessage || ''} onClose={clearError} />
    </form>
  )
}
